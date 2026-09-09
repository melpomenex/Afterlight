/**
 * Authoritative Foundry Hammer Strike timing and bell scoring.
 *
 * Part of the Place Activities Program (Phase 5, Task 9.1).
 *
 * Specifications:
 * - openspec/changes/add-place-activities-program/specs/signature-place-activities/spec.md
 *   (Requirement: Foundry and marsh activities)
 * - design.md (D5, D6, D7)
 *
 * Guarantees:
 * - Solo timing strike: player commits a phase 0..1 sample or millisecond error.
 * - Server scores against a fixed target window; identical samples score identically.
 * - Bell pitch and amplitude are a pure function of that score.
 * - No economy, gather, or machine-shop writes.
 */

export const HAMMER_RULES_VERSION = 1;
export const HAMMER_MAX_STRIKES = 5;
export const HAMMER_DT = 1 / 60;
export const HAMMER_CYCLE_PERIOD_MS = 1200;
export const HAMMER_TARGET_PHASE = 0.5;
export const HAMMER_WINDOW_PHASE = 0.08;
export const HAMMER_BELL_MIN_HZ = 196;
export const HAMMER_BELL_MAX_HZ = 784;

function round4(n) {
  return Math.round(Number(n) * 10000) / 10000;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Wrap a numeric phase onto [0, 1).
 * @param {any} phase
 * @returns {number | null}
 */
export function wrapPhase(phase) {
  const n = Number(phase);
  if (!Number.isFinite(n)) return null;
  let p = n % 1;
  if (p < 0) p += 1;
  return round4(p);
}

/**
 * Absolute timing error in phase units against the target.
 * @param {number} phase
 * @param {number} [targetPhase=HAMMER_TARGET_PHASE]
 * @returns {number}
 */
export function timingError(phase, targetPhase = HAMMER_TARGET_PHASE) {
  const p = wrapPhase(phase);
  if (p == null) return 1;
  return round4(Math.abs(p - targetPhase));
}

/**
 * Convert a millisecond error into a phase-unit error (capped at 0.5).
 * @param {any} errorMs
 * @returns {number | null}
 */
export function phaseErrorFromMs(errorMs) {
  const ms = Number(errorMs);
  if (!Number.isFinite(ms)) return null;
  return round4(Math.min(0.5, Math.abs(ms) / HAMMER_CYCLE_PERIOD_MS));
}

/**
 * Deterministic score and bell parameters from a committed timing sample.
 * Phase wins when both phase and errorMs are present.
 *
 * @param {{ phase?: any, errorMs?: any }} sample
 * @returns {{
 *   valid: boolean,
 *   error?: number,
 *   score?: number,
 *   perfect?: boolean,
 *   bellHz?: number,
 *   bellAmp?: number,
 *   phase?: number,
 *   error?: string
 * }}
 */
export function scoreTimingSample(sample = {}) {
  if (!sample || typeof sample !== 'object' || Array.isArray(sample)) {
    return { valid: false, error: 'timing sample must be an object' };
  }

  let phase = wrapPhase(sample.phase);
  let error = phase != null ? timingError(phase) : null;

  if (error == null) {
    const fromMs = phaseErrorFromMs(sample.errorMs);
    if (fromMs == null) {
      return { valid: false, error: 'phase or errorMs is required' };
    }
    error = fromMs;
    phase = wrapPhase(HAMMER_TARGET_PHASE + (Number(sample.errorMs) >= 0 ? fromMs : -fromMs));
  }

  const score = round4(clamp(1 - error / (HAMMER_WINDOW_PHASE * 4), 0, 1));
  const perfect = error <= HAMMER_WINDOW_PHASE;
  const bellHz = round4(HAMMER_BELL_MIN_HZ + score * (HAMMER_BELL_MAX_HZ - HAMMER_BELL_MIN_HZ));
  const bellAmp = round4(0.06 + score * 0.24);

  return {
    valid: true,
    phase,
    error,
    score,
    perfect,
    bellHz,
    bellAmp,
  };
}

/**
 * Validate a player control payload.
 * @param {any} controls
 * @returns {{ valid: boolean, sanitized?: object, error?: string }}
 */
export function validateHammerControls(controls) {
  if (!controls || typeof controls !== 'object' || Array.isArray(controls)) {
    return { valid: false, error: 'controls must be an object' };
  }

  const kind = typeof controls.kind === 'string' ? controls.kind.toLowerCase() : 'strike';
  if (kind === 'neutral' || kind === 'ready') {
    return { valid: true, sanitized: { kind } };
  }
  if (kind !== 'strike') {
    return { valid: false, error: 'unknown kind' };
  }

  const commitRaw = Number(controls.commitId);
  const commitId = Number.isFinite(commitRaw) ? Math.trunc(commitRaw) : null;

  const scored = scoreTimingSample(controls);
  if (!scored.valid) return { valid: false, error: scored.error };

  return {
    valid: true,
    sanitized: {
      kind: 'strike',
      phase: scored.phase,
      commitId,
      score: scored.score,
      error: scored.error,
      perfect: scored.perfect,
      bellHz: scored.bellHz,
      bellAmp: scored.bellAmp,
    },
  };
}

/**
 * @param {object} [opts]
 * @param {number[]} [opts.activeSlots=[0]]
 * @returns {object}
 */
export function initHammerSimState({ activeSlots = [0] } = {}) {
  return {
    rulesVersion: HAMMER_RULES_VERSION,
    status: 'swinging',
    cyclePeriodMs: HAMMER_CYCLE_PERIOD_MS,
    targetPhase: HAMMER_TARGET_PHASE,
    windowPhase: HAMMER_WINDOW_PHASE,
    phase: 0,
    elapsedMs: 0,
    tickCount: 0,
    maxStrikes: HAMMER_MAX_STRIKES,
    remaining: HAMMER_MAX_STRIKES,
    strikes: [],
    lastStrike: null,
    lastCommitId: null,
    bestScore: 0,
    totalScore: 0,
    winner: null,
    resultEmitted: false,
    activeSlots: [...activeSlots],
  };
}

function cloneState(simState) {
  return JSON.parse(JSON.stringify(simState));
}

/**
 * Apply one committed input. Same sample always yields the same strike record.
 *
 * @param {object} simState
 * @param {number} slot
 * @param {object} controls
 * @returns {{ simState: object, event: object|null }}
 */
export function applyHammerInput(simState, slot, controls) {
  if (!simState || simState.status === 'complete') {
    return { simState, event: null };
  }

  const valid = validateHammerControls(controls);
  if (!valid.valid || valid.sanitized.kind !== 'strike') {
    return { simState, event: null };
  }

  const strike = valid.sanitized;
  if (strike.commitId != null && strike.commitId === simState.lastCommitId) {
    return { simState, event: null };
  }

  const state = cloneState(simState);
  const record = {
    slot,
    phase: strike.phase,
    error: strike.error,
    score: strike.score,
    perfect: strike.perfect,
    bellHz: strike.bellHz,
    bellAmp: strike.bellAmp,
    commitId: strike.commitId,
    index: state.strikes.length + 1,
  };

  state.strikes.push(record);
  state.lastStrike = record;
  state.lastCommitId = strike.commitId;
  state.remaining = Math.max(0, state.maxStrikes - state.strikes.length);
  state.bestScore = Math.max(state.bestScore, record.score);
  state.totalScore = round4(state.totalScore + record.score);

  if (state.strikes.length >= state.maxStrikes) {
    state.status = 'complete';
    state.winner = slot;
  }

  return {
    simState: state,
    event: {
      type: 'hammer_struck',
      slot,
      payload: record,
    },
  };
}

function playerInput(players, slot) {
  if (!players) return null;
  const entry = players[slot] ?? players[String(slot)];
  if (!entry) return null;
  return entry.input_state || entry.inputState || entry.controls || entry;
}

/**
 * Advance the metronome and consume a newly committed strike from player inputs.
 *
 * @param {object} simState
 * @param {object} [players]
 * @param {number} [steps=1]
 * @returns {{ simState: object, event: object|null }}
 */
export function stepHammerSimulation(simState, players = {}, steps = 1) {
  if (!simState) return { simState, event: null };

  const state = cloneState(simState);
  const n = Math.max(0, Math.trunc(Number(steps) || 0));

  if (state.status !== 'complete') {
    state.tickCount += n;
    state.elapsedMs = round4(state.tickCount * HAMMER_DT * 1000);
    const cycle = HAMMER_CYCLE_PERIOD_MS;
    state.phase = wrapPhase(state.elapsedMs / cycle) ?? 0;
  }

  let event = null;
  if (state.status !== 'complete') {
    const slots = state.activeSlots?.length ? state.activeSlots : [0];
    for (const slot of slots) {
      const input = playerInput(players, slot);
      if (!input || typeof input !== 'object') continue;
      const applied = applyHammerInput(state, slot, input);
      if (applied.event) {
        Object.assign(state, applied.simState);
        event = applied.event;
        break;
      }
    }
  }

  if (state.status === 'complete' && !state.resultEmitted) {
    state.resultEmitted = true;
    event = {
      type: 'match_ended',
      slot: state.winner,
      payload: {
        winnerSlot: state.winner,
        bestScore: state.bestScore,
        totalScore: state.totalScore,
        strikes: state.strikes.map((s) => s.score),
        reason: 'strikes_complete',
      },
    };
  }

  return { simState: state, event };
}
