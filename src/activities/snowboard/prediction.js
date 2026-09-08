/**
 * Summit Run client prediction and reconciliation
 * (add-multiplayer-snowboard-arcade 5.4, design D8).
 *
 * The predictor runs the SAME versioned fixed 30Hz rules as the authority
 * (shared/snowboard/rules.js) for immediate local response, then
 * reconciles against authoritative snapshots:
 *   - per-tick history (2 s / 60 steps) of {tick, state, controls};
 *   - `appliedSeq` from the private attachment (never lastAcceptedSeqs)
 *     decides which buffered control samples are already simulated;
 *   - on snapshot: reset to the server state/tick, drop history the server
 *     has consumed, replay the rest with controls newer than appliedSeq
 *     layered over the canonical held state;
 *   - visual corrections ≤0.5 m converge over 100 ms; larger errors or any
 *     checkpoint/grounded/terminal mismatch hard-reset;
 *   - prediction freezes after 250 ms without snapshots (display shows
 *     reconnecting after 1 s) — no invented kilometers offline.
 *
 * Pure and testable: `now`/`dtMs` are parameters, never clocks.
 */

import { DT, step as rulesStep, normalizeControls } from '../../../shared/snowboard/rules.js';

export const PREDICTION_TUNING = Object.freeze({
  historySteps: 60, // 2 s at 30 Hz
  catchUpSteps: 4,
  freezeMs: 250,
  reconnectingDisplayMs: 1000,
  smoothCorrectionMeters: 0.5,
  smoothCorrectionMs: 100,
  hardResetMeters: 3,
});

/** Metrics used by the HUD: distance between two rider states. */
function positionDelta(a, b) {
  return Math.hypot(
    (a.s ?? 0) - (b.s ?? 0),
    (a.u ?? 0) - (b.u ?? 0),
    (a.y ?? 0) - (b.y ?? 0),
  );
}

function stateMismatch(a, b) {
  return (
    a.grounded !== b.grounded ||
    a.nextCheckpoint !== b.nextCheckpoint ||
    (a.recoveryTicks ?? 0) !== (b.recoveryTicks ?? 0) ||
    (a.dnfReason ?? null) !== (b.dnfReason ?? null)
  );
}

/**
 * @param {object} course   sampler object from loadCourse()
 * @param {object} [tuning] overrides for tests
 */
export function createPredictor(course, tuning = {}) {
  const t = { ...PREDICTION_TUNING, ...tuning };

  let predicted = null; // current predicted rider state
  let predictedTick = 0;
  // Buffer of per-tick control samples: { seq, controls } where seq is the
  // wire sequence the sample was submitted with (0 = canonical held state).
  let pendingControls = [];
  let appliedSeq = 0;
  let heldControls = { kind: 'neutral' };
  let history = []; // [{ tick, state }]
  let lastSnapshotAt = -Infinity;
  let correction = null; // { meters, startedAtMs }
  let lastResetSeq = 0;
  let frozen = false;
  let stepAccMs = 0;

  function discardHistoryUpTo(tick) {
    history = history.filter((entry) => entry.tick > tick);
  }

  function replayFrom(tick, startState) {
    // Replay buffered per-tick history. Controls newer than appliedSeq are
    // layered per tick over the canonical held state; older ticks reuse the
    // last known pre-snapshot sample.
    let state = startState;
    const remaining = history.filter((entry) => entry.tick > tick);

    for (const entry of remaining) {
      const sample = pendingControls.find((c) => c.tick === entry.tick - 1);
      const controls = sample && sample.seq > appliedSeq ? sample.controls : heldControls;
      const result = rulesStep(course, state, controls, state, entry.tick);
      state = result.state;
    }

    predicted = state;
    predictedTick = tick + remaining.length;

    // Rebuild history with the replayed states for the next reconciliation.
    history = [];
    let replay = startState;
    for (let index = 0; index <= remaining.length; index++) {
      const tickIndex = tick + index;
      if (index > 0) {
        const entry = remaining[index - 1];
        const sample = pendingControls.find((c) => c.tick === entry.tick - 1);
        const controls = sample && sample.seq > appliedSeq ? sample.controls : heldControls;
        replay = rulesStep(course, replay, controls, replay, tickIndex).state;
      }
      history.push({ tick: tickIndex, state: replay });
    }

    pendingControls = pendingControls.filter((c) => c.tick > predictedTick);
  }

  return {
    /** Seed the predictor from the authoritative baseline (join/reconnect). */
    reset(serverState, serverTick, held, appliedSeqValue, resetSeq = 0) {
      predicted = { ...serverState };
      predictedTick = serverTick;
      heldControls = held ? normalizeControls(held) : { steer: 0, tuck: false, brake: true, jumpHeld: false };
      appliedSeq = appliedSeqValue ?? 0;
      history = [{ tick: serverTick, state: { ...serverState } }];
      pendingControls = [];
      lastSnapshotAt = 0; // reconciles/updates anchor absolute nowMs against this
      lastResetSeq = resetSeq;
      correction = null;
      stepAccMs = 0;
    },

    /** Local input for the current tick; seq comes from the network layer. */
    submit(seq, controls, nowMs) {
      const tick = predictedTick;
      pendingControls.push({ seq, tick, controls, nowMs });
      // Bound the buffer: drop samples older than the history window.
      pendingControls = pendingControls.filter((c) => tick - c.tick <= t.historySteps);
      if (pendingControls.length > t.historySteps * 2) {
        pendingControls = pendingControls.slice(-t.historySteps);
      }
    },

    /** Advance prediction by real elapsed time, bounded catch-up. */
    update(nowMs, dtMs) {
      if (predicted === null) return null;

      if (nowMs - lastSnapshotAt > t.freezeMs) {
        frozen = true;
        return { frozen: true };
      }
      frozen = false;

      // Frame-rate independent fixed stepping: accumulate real time, run at
      // most catchUpSteps ticks per update (30 Hz simulation at any FPS).
      stepAccMs = Math.min(stepAccMs + dtMs, (t.catchUpSteps + 1) * DT * 1000);
      let steps = Math.min(Math.floor(stepAccMs / (DT * 1000)), t.catchUpSteps);
      stepAccMs -= steps * DT * 1000;

      for (let index = 0; index < steps; index++) {
        const sample = pendingControls.find((c) => c.tick === predictedTick);
        const controls = sample && sample.seq > appliedSeq ? sample.controls : heldControls;
        const result = rulesStep(course, predicted, controls, predicted, predictedTick + 1);
        predicted = result.state;
        predictedTick += 1;
        history.push({ tick: predictedTick, state: predicted });
        if (history.length > t.historySteps) history = history.slice(-t.historySteps);
      }
      pendingControls = pendingControls.filter((c) => c.tick > predictedTick - t.historySteps);

      // Correction convergence: decay active smooth corrections by age.
      if (correction && nowMs - correction.startedAtMs >= t.smoothCorrectionMs) correction = null;

      return { frozen: false, state: predicted, tick: predictedTick, correction };
    },

    /**
     * Reconcile with an authoritative snapshot. Returns
     * `{ corrected, hardReset, meters }` describing the visual response.
     */
    reconcile(serverState, serverTick, held, appliedSeqValue, resetSeq = 0, nowMs = 0) {
      if (predicted === null) {
        this.reset(serverState, serverTick, held, appliedSeqValue, resetSeq);
        lastSnapshotAt = nowMs;
        return { corrected: false, hardReset: false, meters: 0 };
      }

      // Session resets (crash recovery teleports) always clear prediction.
      if (resetSeq !== lastResetSeq) {
        this.reset(serverState, serverTick, held, appliedSeqValue, resetSeq);
        lastSnapshotAt = nowMs;
        return { corrected: false, hardReset: true, meters: 0 };
      }

      const before = predicted;
      const meters = positionDelta(before, serverState);
      const mismatch = stateMismatch(before, serverState);
      const hard = mismatch || meters > t.hardResetMeters;

      appliedSeq = appliedSeqValue ?? appliedSeq;
      heldControls = held ? normalizeControls(held) : heldControls;
      lastSnapshotAt = nowMs;
      discardHistoryUpTo(serverTick);
      pendingControls = pendingControls.filter((c) => c.tick > serverTick);
      replayFrom(serverTick, { ...serverState });

      if (hard) {
        correction = null;
        return { corrected: true, hardReset: true, meters };
      }

      if (meters > 0.001) {
        correction = { meters: Math.min(meters, t.smoothCorrectionMeters), startedAtMs: nowMs };
      }
      return { corrected: meters > 0.001, hardReset: false, meters };
    },

    /** True while snapshots have stopped arriving (HUD shows reconnecting). */
    get frozen() {
      return frozen;
    },

    get appliedSeq() {
      return appliedSeq;
    },

    get tick() {
      return predictedTick;
    },
  };
}
