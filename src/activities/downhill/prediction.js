/**
 * Downhill Mayhem client prediction
 * (integrate-multiplayer-downhill-mayhem-arcade 10.1).
 *
 * Runs the same shared fixed-step rules as the authority and reconciles to
 * authoritative snapshots. Server snapshots are never rendered directly for
 * the local rider; the predicted state is, and it converges to the server.
 */

import { stepRider, normalizeControls, neutralControls, DT, TICK_HZ } from '../../../shared/downhill/rules.js';

export const PREDICTION_TUNING = Object.freeze({
  historySteps: 60,
  catchUpSteps: 4,
  freezeMs: 250,
  reconnectingDisplayMs: 1000,
  smoothCorrectionMeters: 0.5,
  smoothCorrectionMs: 100,
  hardResetMeters: 3,
});

function clone(r) {
  return {
    ...r,
    def: { ...r.def },
    pendingNames: Array.isArray(r.pendingNames) ? [...r.pendingNames] : r.pendingNames,
    inp: { ...r.inp },
  };
}

function dist(a, b) {
  return Math.hypot(a.s - b.s, a.lat - b.lat, a.y - b.y);
}

/** The authoritative/predicted rider state uses snake_case wire field names. */
export function createPredictor(course, tuning = {}) {
  const t = { ...PREDICTION_TUNING, ...tuning };
  let state = null;
  let tick = 0;
  let held = neutralControls();
  let appliedSeq = 0;
  let resetSeq = null;
  let samples = [];
  let accumulator = 0;
  let lastNow = 0;
  let frozenSince = null;
  let visualOffset = { s: 0, lat: 0, y: 0 };

  function seedFrom(stateArg, tickArg, heldArg, appliedSeqArg, resetSeqArg) {
    state = stateArg ? clone(stateArg) : null;
    tick = tickArg ?? 0;
    held = normalizeControls(heldArg ?? neutralControls());
    appliedSeq = appliedSeqArg ?? appliedSeq;
    resetSeq = resetSeqArg ?? resetSeq;
  }

  return {
    reset(serverState, serverTick, heldControls, appliedSeqArg, resetSeqArg) {
      seedFrom(serverState, serverTick, heldControls, appliedSeqArg, resetSeqArg);
      samples = [];
      accumulator = 0;
      frozenSince = null;
      visualOffset = { s: 0, lat: 0, y: 0 };
    },

    submit(seq, controls) {
      samples.push({ seq, controls: normalizeControls(controls) });
      if (samples.length > t.historySteps) samples.splice(0, samples.length - t.historySteps);
    },

    /** Advance the predicted simulation by wall time. */
    update(nowMs, dtMs) {
      if (!state) return { frozen: true, state: null, tick, events: [] };
      const dt = Math.min(dtMs, 100) / 1000;
      accumulator += dt;
      let steps = 0;
      const events = [];
      while (accumulator >= DT && steps < t.catchUpSteps) {
        const c = samples.length ? samples[samples.length - 1].controls : held;
        held = c;
        state.inp = c;
        accumulator -= DT;
        steps++;
        tick++;
        stepRider(course, state, DT, { finishS: course.finishS, elapsed: tick * DT }, events);
      }
      if (steps === t.catchUpSteps) accumulator = 0; // drop the backlog
      if (nowMs - lastNow > 1000 && lastNow !== 0) { /* clock jump guard (caller re-seeds) */ }
      lastNow = nowMs;

      const frozen = steps === 0;
      frozenSince = frozen ? (frozenSince ?? nowMs) : null;
      const frozenMs = frozenSince == null ? 0 : nowMs - frozenSince;
      return {
        frozen: frozenMs >= t.freezeMs,
        reconnecting: frozenMs >= t.reconnectingDisplayMs,
        state,
        tick,
        events,
      };
    },

    /** Reset to authoritative state and replay controls newer than appliedSeq. */
    reconcile(serverState, serverTick, heldControls, appliedSeqArg, resetSeqArg) {
      const before = state ? clone(state) : null;
      const seq = appliedSeqArg ?? appliedSeq;
      seedFrom(serverState, serverTick, heldControls, seq, resetSeqArg);
      accumulator = 0;
      frozenSince = null;
      if (resetSeqArg != null && resetSeqArg !== resetSeq) resetSeq = resetSeqArg;
      samples = samples.filter((s) => s.seq > seq);
      for (const s of samples) { state.inp = s.controls; stepRider(course, state, DT, { finishS: course.finishS, elapsed: tick * DT }, []); }
      const drift = before && state ? dist(before, state) : 0;
      const hardReset = !before || drift > t.hardResetMeters ||
        before.crashed !== state.crashed || before.grounded !== state.grounded ||
        before.trick !== state.trick || before.finished !== state.finished;
      // Small errors are absorbed visually (the render pose starts at the old
      // prediction and decays to the authoritative one); large or state-class
      // mismatches snap.
      visualOffset = (!hardReset && before)
        ? { s: before.s - state.s, lat: before.lat - state.lat, y: before.y - state.y }
        : { s: 0, lat: 0, y: 0 };
      return { corrected: drift > 0, hardReset, meters: drift };
    },

    /** Render position: predicted state plus a decaying correction offset. */
    visualState(dtMs) {
      if (!state) return null;
      const decay = Math.min(1, dtMs / t.smoothCorrectionMs);
      visualOffset.s *= (1 - decay);
      visualOffset.lat *= (1 - decay);
      visualOffset.y *= (1 - decay);
      return { ...state, s: state.s + visualOffset.s, lat: state.lat + visualOffset.lat, y: state.y + visualOffset.y };
    },

    get state() { return state; },
    get tick() { return tick; },
    get appliedSeq() { return appliedSeq; },
    get frozen() { return frozenSince != null; },
    get bufferedSamples() { return samples.length; },
  };
}
