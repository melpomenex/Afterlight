/**
 * Authoritative Foundry Forge Challenge deformation and scoring.
 *
 * Part of the Place Activities Program (Phase 5, Task 9.2).
 *
 * Specifications:
 * - openspec/changes/add-place-activities-program/specs/signature-place-activities/spec.md
 *   (Requirement: Foundry and marsh activities — Forge scenario)
 * - design.md (D5, D6, D7)
 *
 * Guarantees:
 * - Shared target profile (seeded, default seed 1).
 * - Bounded strikes deform a 1D height profile with a Gaussian dent.
 * - Identical strike sequences produce identical profiles and error scores.
 * - Heat is stepped deterministically so spectators see the same cooling metal.
 * - No economy, gather, or machine-shop writes.
 */

export const FORGE_RULES_VERSION = 1;
export const FORGE_BINS = 16;
export const FORGE_MAX_STRIKES = 8;
export const FORGE_DT = 1 / 60;
export const FORGE_STRIKE_STRENGTH = 0.35;
export const FORGE_SIGMA = 0.12;
export const FORGE_HEAT_STRIKE = 0.55;
export const FORGE_HEAT_COOL_PER_SEC = 0.18;
export const FORGE_DEFAULT_SEED = 1;

function round4(n) {
  return Math.round(Number(n) * 10000) / 10000;
}

function clamp01(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

/**
 * Shared target height profile. Same seed always yields the same bins.
 * @param {number} [seed=FORGE_DEFAULT_SEED]
 * @returns {number[]}
 */
export function targetProfile(seed = FORGE_DEFAULT_SEED) {
  const s = Number.isFinite(Number(seed)) ? Number(seed) : FORGE_DEFAULT_SEED;
  const bins = [];
  for (let i = 0; i < FORGE_BINS; i++) {
    const t = i / (FORGE_BINS - 1);
    const height =
      0.38 +
      0.22 * Math.sin((t + s * 0.17) * Math.PI) +
      0.1 * Math.sin(t * Math.PI * 2 + s) +
      0.08 * (1 - t);
    bins.push(round4(Math.max(0.15, Math.min(0.95, height))));
  }
  return bins;
}

/**
 * Thick stock the player hammers toward the target.
 * @returns {number[]}
 */
export function initialProfile() {
  return Array.from({ length: FORGE_BINS }, () => 1);
}

/**
 * Apply one Gaussian dent. Pure: same (profile, position, force) => same result.
 *
 * @param {number[]} profile
 * @param {number} position 0..1 along the bar
 * @param {number} force 0..1
 * @returns {number[]}
 */
export function deformProfile(profile, position, force) {
  const pos = clamp01(position);
  const f = clamp01(force);
  const src = Array.isArray(profile) ? profile : initialProfile();
  const next = [];
  const twoSigmaSq = 2 * FORGE_SIGMA * FORGE_SIGMA;
  for (let i = 0; i < FORGE_BINS; i++) {
    const t = i / (FORGE_BINS - 1);
    const dist = t - pos;
    const dent = f * FORGE_STRIKE_STRENGTH * Math.exp(-(dist * dist) / twoSigmaSq);
    const current = Number.isFinite(src[i]) ? src[i] : 1;
    next.push(round4(Math.max(0, Math.min(1, current - dent))));
  }
  return next;
}

/**
 * Add strike heat in the same Gaussian used for deformation.
 * @param {number[]} heat
 * @param {number} position
 * @param {number} force
 * @returns {number[]}
 */
export function addStrikeHeat(heat, position, force) {
  const pos = clamp01(position);
  const f = clamp01(force);
  const src = Array.isArray(heat) ? heat : Array.from({ length: FORGE_BINS }, () => 0);
  const next = [];
  const twoSigmaSq = 2 * FORGE_SIGMA * FORGE_SIGMA;
  for (let i = 0; i < FORGE_BINS; i++) {
    const t = i / (FORGE_BINS - 1);
    const dist = t - pos;
    const add = f * FORGE_HEAT_STRIKE * Math.exp(-(dist * dist) / twoSigmaSq);
    const current = Number.isFinite(src[i]) ? src[i] : 0;
    next.push(round4(Math.max(0, Math.min(1, current + add))));
  }
  return next;
}

/**
 * RMSE between current and target profiles.
 * @param {number[]} profile
 * @param {number[]} target
 * @returns {number}
 */
export function profileError(profile, target) {
  const a = Array.isArray(profile) ? profile : [];
  const b = Array.isArray(target) ? target : [];
  let sum = 0;
  for (let i = 0; i < FORGE_BINS; i++) {
    const d = (Number(a[i]) || 0) - (Number(b[i]) || 0);
    sum += d * d;
  }
  return round4(Math.sqrt(sum / FORGE_BINS));
}

/**
 * Accuracy in 0..1 from RMSE (1 = exact match).
 * @param {number} error
 * @returns {number}
 */
export function accuracyFromError(error) {
  const e = Number.isFinite(Number(error)) ? Number(error) : 1;
  return round4(Math.max(0, Math.min(1, 1 - e)));
}

/**
 * Cool every bin by a fixed per-second rate. Deterministic in tick space.
 * @param {number[]} heat
 * @param {number} dtSeconds
 * @returns {number[]}
 */
export function coolHeat(heat, dtSeconds) {
  const dt = Number.isFinite(Number(dtSeconds)) ? Math.max(0, Number(dtSeconds)) : 0;
  const drop = FORGE_HEAT_COOL_PER_SEC * dt;
  const src = Array.isArray(heat) ? heat : [];
  return Array.from({ length: FORGE_BINS }, (_, i) =>
    round4(Math.max(0, (Number.isFinite(src[i]) ? src[i] : 0) - drop))
  );
}

/**
 * @param {any} controls
 * @returns {{ valid: boolean, sanitized?: object, error?: string }}
 */
export function validateForgeControls(controls) {
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
  const position = round4(clamp01(controls.position));
  const force = round4(clamp01(controls.force === undefined ? 0.6 : controls.force));

  return {
    valid: true,
    sanitized: { kind: 'strike', position, force, commitId },
  };
}

/**
 * @param {object} [opts]
 * @param {number[]} [opts.activeSlots=[0]]
 * @param {number} [opts.seed=FORGE_DEFAULT_SEED]
 * @returns {object}
 */
export function initForgeSimState({ activeSlots = [0], seed = FORGE_DEFAULT_SEED } = {}) {
  const target = targetProfile(seed);
  return {
    rulesVersion: FORGE_RULES_VERSION,
    status: 'forging',
    seed,
    bins: FORGE_BINS,
    target,
    profile: initialProfile(),
    heat: Array.from({ length: FORGE_BINS }, () => 0.35),
    maxStrikes: FORGE_MAX_STRIKES,
    remaining: FORGE_MAX_STRIKES,
    strikes: [],
    lastStrike: null,
    lastCommitId: null,
    error: profileError(initialProfile(), target),
    score: accuracyFromError(profileError(initialProfile(), target)),
    elapsedMs: 0,
    tickCount: 0,
    winner: null,
    resultEmitted: false,
    activeSlots: [...activeSlots],
  };
}

function cloneState(simState) {
  return JSON.parse(JSON.stringify(simState));
}

/**
 * Apply one strike. Identical (state, slot, controls) => identical next profile.
 *
 * @param {object} simState
 * @param {number} slot
 * @param {object} controls
 * @returns {{ simState: object, event: object|null }}
 */
export function applyForgeInput(simState, slot, controls) {
  if (!simState || simState.status === 'complete') {
    return { simState, event: null };
  }

  const valid = validateForgeControls(controls);
  if (!valid.valid || valid.sanitized.kind !== 'strike') {
    return { simState, event: null };
  }

  const strike = valid.sanitized;
  if (strike.commitId != null && strike.commitId === simState.lastCommitId) {
    return { simState, event: null };
  }

  const state = cloneState(simState);
  const profile = deformProfile(state.profile, strike.position, strike.force);
  const heat = addStrikeHeat(state.heat, strike.position, strike.force);
  const error = profileError(profile, state.target);
  const score = accuracyFromError(error);

  const record = {
    slot,
    position: strike.position,
    force: strike.force,
    commitId: strike.commitId,
    error,
    score,
    index: state.strikes.length + 1,
  };

  state.profile = profile;
  state.heat = heat;
  state.error = error;
  state.score = score;
  state.strikes.push(record);
  state.lastStrike = record;
  state.lastCommitId = strike.commitId;
  state.remaining = Math.max(0, state.maxStrikes - state.strikes.length);

  if (state.strikes.length >= state.maxStrikes) {
    state.status = 'complete';
    state.winner = slot;
  }

  return {
    simState: state,
    event: {
      type: 'forge_struck',
      slot,
      payload: {
        ...record,
        profile,
        heat,
      },
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
 * Cool the bar and consume a newly committed strike from player inputs.
 *
 * @param {object} simState
 * @param {object} [players]
 * @param {number} [steps=1]
 * @returns {{ simState: object, event: object|null }}
 */
export function stepForgeSimulation(simState, players = {}, steps = 1) {
  if (!simState) return { simState, event: null };

  const state = cloneState(simState);
  const n = Math.max(0, Math.trunc(Number(steps) || 0));

  if (n > 0) {
    state.tickCount += n;
    state.elapsedMs = round4(state.tickCount * FORGE_DT * 1000);
    state.heat = coolHeat(state.heat, n * FORGE_DT);
  }

  let event = null;
  if (state.status !== 'complete') {
    const slots = state.activeSlots?.length ? state.activeSlots : [0];
    for (const slot of slots) {
      const input = playerInput(players, slot);
      if (!input || typeof input !== 'object') continue;
      const applied = applyForgeInput(state, slot, input);
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
        error: state.error,
        score: state.score,
        profile: state.profile,
        reason: 'strikes_complete',
      },
    };
  }

  return { simState: state, event };
}
