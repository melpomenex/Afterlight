/**
 * Authoritative Desert Camp horseshoes rules and throw model.
 *
 * Place Activities Program (Phase 5, Task 8.5).
 *
 * Spec: signature-place-activities — Camp and ice games.
 * Design: D5 (server scores distances/ringers), D7 (frozen environment).
 *
 * House rules (documented, applied consistently):
 * - Two players alternate four shoes per round (2 each: 0, 1, 0, 1).
 * - Ringer = 3 points. Closest live shoe within one shoe-width = 1 point.
 * - Cancellation: equal ringers cancel; leftover ringers score 3 each.
 *   Close points go only to the player whose remaining shoe is strictly
 *   closer than the opponent's closest remaining shoe. Equal closest
 *   distances award no close point.
 * - A shoe that overshoots past the target stake scores 0 (cannot ringer
 *   or take the close point).
 * - First to 21: after a completed round, a player with score >= 21 who
 *   is strictly ahead wins. If both are >= 21 and tied, play extra rounds
 *   until one leads after a complete round.
 * - Competitive environment is frozen at match start.
 */

export const HORSESHOES_RULES_VERSION = 1;
export const HORSESHOES_WIN_SCORE = 21;
export const HORSESHOES_SHOES_PER_PLAYER = 2;
export const HORSESHOES_SHOES_PER_ROUND = 4;
export const HORSESHOES_RINGER_POINTS = 3;
export const HORSESHOES_CLOSE_POINTS = 1;

/** World pit aligned to camp-horseshoes at [4.5, 0, 2.0]. */
export const HORSESHOES_STAKES = Object.freeze({
  0: Object.freeze([4.5, 0, 4.4]),
  1: Object.freeze([4.5, 0, -0.4]),
});

export const HORSESHOES_ORIGINS = Object.freeze({
  0: Object.freeze([4.5, 0.45, -0.4]),
  1: Object.freeze([4.5, 0.45, 4.4]),
});

export const HORSESHOES_STAKE_GAP = 4.8;
export const HORSESHOES_RINGER_RADIUS = 0.1;
export const HORSESHOES_SHOE_WIDTH = 0.18;
export const HORSESHOES_OVERSHOOT_EPS = 0.02;
export const HORSESHOES_TIE_EPS = 0.001;
export const HORSESHOES_MIN_TRAVEL_FRAC = 0.35;
export const HORSESHOES_POWER_SPAN = 0.95;
export const HORSESHOES_MAX_LATERAL = 0.55;
export const HORSESHOES_WIND_DRIFT = 0.08;

export const HORSESHOES_THROW_BOUNDS = Object.freeze({
  minAngle: -0.45,
  maxAngle: 0.45,
  minPower: 0,
  maxPower: 1,
  minLateral: -1,
  maxLateral: 1,
});

/** Power that lands on the stake with angle 0 and lateral 0 (no wind). */
export const HORSESHOES_STAKE_POWER =
  (1 - HORSESHOES_MIN_TRAVEL_FRAC) / HORSESHOES_POWER_SPAN;

const round3 = (v) => Math.round(v * 1000) / 1000;
const clone = (value) => JSON.parse(JSON.stringify(value));

function clamp(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function playerKey(slot) {
  return String(slot);
}

function getPlayer(state, slot) {
  return state.players[slot] ?? state.players[playerKey(slot)] ?? null;
}

/**
 * Validates and clamps a horseshoe throw.
 *
 * @param {any} params
 * @returns {{ valid: boolean, sanitized?: object, error?: string }}
 */
export function validateHorseshoeThrow(params) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return { valid: false, error: 'throw parameters must be an object' };
  }

  const kind = typeof params.kind === 'string' ? params.kind : 'throw';
  if (kind !== 'throw' && kind !== 'launch') {
    return { valid: false, error: `unknown kind: ${kind}` };
  }

  return {
    valid: true,
    sanitized: {
      kind: 'throw',
      angle: clamp(params.angle, HORSESHOES_THROW_BOUNDS.minAngle, HORSESHOES_THROW_BOUNDS.maxAngle, 0),
      power: clamp(params.power, HORSESHOES_THROW_BOUNDS.minPower, HORSESHOES_THROW_BOUNDS.maxPower, 0.65),
      lateral: clamp(params.lateral, HORSESHOES_THROW_BOUNDS.minLateral, HORSESHOES_THROW_BOUNDS.maxLateral, 0),
    },
  };
}

/**
 * Classifies a landed shoe against its target stake.
 *
 * Overshoot past the stake along the throw axis scores 0 that shoe.
 *
 * @param {[number, number, number]} landing
 * @param {[number, number, number]} stake
 * @param {[number, number, number]} origin
 * @returns {{ distance: number, overshoot: boolean, ringer: boolean, close: boolean }}
 */
export function classifyShoe(landing, stake, origin) {
  const lx = landing[0];
  const lz = landing[2] ?? landing[1];
  const sx = stake[0];
  const sz = stake[2] ?? stake[1];
  const ox = origin[0];
  const oz = origin[2] ?? origin[1];

  const axisX = sx - ox;
  const axisZ = sz - oz;
  const axisLen = Math.hypot(axisX, axisZ) || HORSESHOES_STAKE_GAP;
  const fwdX = axisX / axisLen;
  const fwdZ = axisZ / axisLen;
  const along = (lx - ox) * fwdX + (lz - oz) * fwdZ;
  const distance = round3(Math.hypot(lx - sx, lz - sz));
  const overshoot = along > axisLen + HORSESHOES_OVERSHOOT_EPS;
  const ringer = !overshoot && distance <= HORSESHOES_RINGER_RADIUS;
  const close = !overshoot && !ringer && distance <= HORSESHOES_SHOE_WIDTH;

  return { distance, overshoot, ringer, close };
}

/**
 * Deterministic landing from angle / power / lateral plus frozen wind.
 *
 * @param {number} slot
 * @param {{ angle: number, power: number, lateral: number }} throwParams
 * @param {object} [environment]
 * @returns {{ landing: [number, number, number], distance: number, overshoot: boolean, ringer: boolean, close: boolean }}
 */
export function simulateHorseshoeThrow(slot, throwParams, environment = null) {
  const origin = HORSESHOES_ORIGINS[slot] ?? HORSESHOES_ORIGINS[0];
  const stake = HORSESHOES_STAKES[slot] ?? HORSESHOES_STAKES[0];
  const axisX = stake[0] - origin[0];
  const axisZ = stake[2] - origin[2];
  const axisLen = Math.hypot(axisX, axisZ) || HORSESHOES_STAKE_GAP;
  const fwdX = axisX / axisLen;
  const fwdZ = axisZ / axisLen;
  const perpX = -fwdZ;
  const perpZ = fwdX;

  const c = Math.cos(throwParams.angle);
  const s = Math.sin(throwParams.angle);
  const dirX = fwdX * c - fwdZ * s;
  const dirZ = fwdX * s + fwdZ * c;

  const travel = axisLen * (HORSESHOES_MIN_TRAVEL_FRAC + throwParams.power * HORSESHOES_POWER_SPAN);
  const windX = environment?.wind?.[0] ?? 0;
  const side = throwParams.lateral * HORSESHOES_MAX_LATERAL + windX * HORSESHOES_WIND_DRIFT;

  const lx = round3(origin[0] + dirX * travel + perpX * side);
  const lz = round3(origin[2] + dirZ * travel + perpZ * side);
  const landing = [lx, 0, lz];
  const classified = classifyShoe(landing, stake, origin);

  return {
    landing,
    ...classified,
  };
}

/**
 * Cancellation scoring for one completed round (up to two shoes each).
 *
 * @param {Array<object>} shoes0
 * @param {Array<object>} shoes1
 * @returns {{ points: [number, number], cancelledRingers: number, closestTied: boolean }}
 */
export function scoreRound(shoes0 = [], shoes1 = []) {
  const live0 = shoes0.filter((shoe) => !shoe.overshoot);
  const live1 = shoes1.filter((shoe) => !shoe.overshoot);
  const ringers0 = live0.filter((shoe) => shoe.ringer);
  const ringers1 = live1.filter((shoe) => shoe.ringer);
  const cancelledRingers = Math.min(ringers0.length, ringers1.length);
  const leftoverR0 = ringers0.length - cancelledRingers;
  const leftoverR1 = ringers1.length - cancelledRingers;

  let points0 = leftoverR0 * HORSESHOES_RINGER_POINTS;
  let points1 = leftoverR1 * HORSESHOES_RINGER_POINTS;

  const rest0 = live0.filter((shoe) => !shoe.ringer);
  const rest1 = live1.filter((shoe) => !shoe.ringer);
  const consider0 = rest0.concat(ringers0.slice(cancelledRingers));
  const consider1 = rest1.concat(ringers1.slice(cancelledRingers));

  const closest0 = consider0.reduce((min, shoe) => Math.min(min, shoe.distance), Infinity);
  const closest1 = consider1.reduce((min, shoe) => Math.min(min, shoe.distance), Infinity);
  const closestTied = Number.isFinite(closest0) && Number.isFinite(closest1)
    && Math.abs(closest0 - closest1) <= HORSESHOES_TIE_EPS;

  if (!closestTied && closest0 < closest1) {
    points0 += rest0.filter((shoe) => shoe.distance < closest1 && shoe.distance <= HORSESHOES_SHOE_WIDTH).length
      * HORSESHOES_CLOSE_POINTS;
  } else if (!closestTied && closest1 < closest0) {
    points1 += rest1.filter((shoe) => shoe.distance < closest0 && shoe.distance <= HORSESHOES_SHOE_WIDTH).length
      * HORSESHOES_CLOSE_POINTS;
  }

  return {
    points: [points0, points1],
    cancelledRingers,
    closestTied,
  };
}

function emptyPlayer(slot, score) {
  return {
    slot,
    score,
    shoes: [],
    lastThrow: null,
  };
}

/**
 * @param {object} [opts]
 * @param {number[]} [opts.activeSlots]
 * @param {object} [opts.environment]
 * @param {number[]} [opts.scores]
 * @returns {object}
 */
export function initHorseshoeSimState({
  activeSlots = [0, 1],
  environment = null,
  scores = [0, 0],
} = {}) {
  const slots = activeSlots.slice(0, 2);
  const players = {};
  slots.forEach((slot, index) => {
    players[slot] = emptyPlayer(slot, Number.isFinite(scores[index]) ? scores[index] : 0);
  });

  const frozen = environment
    ? {
        ...environment,
        policy: 'frozen',
        frozenAt: Number.isFinite(environment.frozenAt) ? environment.frozenAt : (environment.now ?? 0),
      }
    : {
        version: 1,
        policy: 'frozen',
        wind: [0, 0],
        windSpeed: 0,
        rain: 0,
        intensity: 0,
        wetness: 0,
        timePhase: 0,
        frozenAt: 0,
      };

  return {
    rulesVersion: HORSESHOES_RULES_VERSION,
    winScore: HORSESHOES_WIN_SCORE,
    status: 'throwing',
    currentRound: 1,
    throwsThisRound: 0,
    nextSlot: slots[0] ?? 0,
    activeSlots: [...slots],
    players,
    lastRound: null,
    winner: null,
    standings: [],
    extraRound: false,
    environment: frozen,
  };
}

function finishRound(state) {
  const shoes0 = getPlayer(state, 0)?.shoes ?? [];
  const shoes1 = getPlayer(state, 1)?.shoes ?? [];
  const scored = scoreRound(shoes0, shoes1);
  const p0 = getPlayer(state, 0);
  const p1 = getPlayer(state, 1);
  p0.score += scored.points[0];
  p1.score += scored.points[1];
  p0.shoes = [];
  p1.shoes = [];

  state.lastRound = {
    round: state.currentRound,
    points: scored.points,
    cancelledRingers: scored.cancelledRingers,
    closestTied: scored.closestTied,
  };
  state.throwsThisRound = 0;
  state.nextSlot = state.activeSlots[0] ?? 0;
  state.currentRound += 1;

  const lead = p0.score - p1.score;
  const reached = p0.score >= HORSESHOES_WIN_SCORE || p1.score >= HORSESHOES_WIN_SCORE;
  if (reached && lead !== 0) {
    state.status = 'complete';
    state.winner = lead > 0 ? 0 : 1;
    state.extraRound = false;
    state.standings = [
      { rank: 1, slot: state.winner, score: state.winner === 0 ? p0.score : p1.score },
      { rank: 2, slot: state.winner === 0 ? 1 : 0, score: state.winner === 0 ? p1.score : p0.score },
    ];
  } else if (reached && lead === 0) {
    state.status = 'throwing';
    state.extraRound = true;
    state.winner = null;
  } else {
    state.status = 'throwing';
    state.extraRound = false;
  }

  return scored;
}

/**
 * Applies one horseshoe input (throw). Wrong-turn and finished matches are no-ops.
 *
 * @param {object} simState
 * @param {number} slot
 * @param {object} controls
 * @returns {{ simState: object, event: object|null }}
 */
export function applyHorseshoeInput(simState, slot, controls) {
  if (!simState || simState.status === 'complete') {
    return { simState, event: null };
  }

  const kind = typeof controls?.kind === 'string' ? controls.kind : 'throw';
  if (kind === 'neutral' || kind === 'ready') {
    return { simState, event: { type: 'neutral', slot } };
  }
  if (kind !== 'throw' && kind !== 'launch') {
    return { simState, event: null };
  }

  const state = clone(simState);
  if (Number(state.nextSlot) !== Number(slot)) {
    return { simState: state, event: null };
  }

  const player = getPlayer(state, slot);
  if (!player) return { simState: state, event: null };
  if (player.shoes.length >= HORSESHOES_SHOES_PER_PLAYER) {
    return { simState: state, event: null };
  }

  const valid = validateHorseshoeThrow(controls);
  if (!valid.valid) return { simState: state, event: null };

  const result = simulateHorseshoeThrow(slot, valid.sanitized, state.environment);
  const shoe = {
    slot,
    round: state.currentRound,
    throwIndex: player.shoes.length,
    launch: valid.sanitized,
    landing: result.landing,
    distance: result.distance,
    overshoot: result.overshoot,
    ringer: result.ringer,
    close: result.close,
  };

  player.shoes.push(shoe);
  player.lastThrow = shoe;
  state.throwsThisRound += 1;

  const opponents = state.activeSlots.filter((s) => Number(s) !== Number(slot));
  const nextCandidate = opponents.find((s) => (getPlayer(state, s)?.shoes.length ?? 0) < HORSESHOES_SHOES_PER_PLAYER);
  state.nextSlot = nextCandidate ?? slot;

  let scored = null;
  if (state.throwsThisRound >= HORSESHOES_SHOES_PER_ROUND) {
    scored = finishRound(state);
  }

  const event = {
    type: state.status === 'complete' ? 'match_ended' : (scored ? 'round_scored' : 'shoe_thrown'),
    slot,
    shoe,
    nextSlot: state.nextSlot,
    lastRound: scored ? state.lastRound : null,
    winner: state.winner,
  };

  return { simState: state, event };
}

/**
 * Steps pending player throws. Mirrors Elixir step_simulation/3.
 *
 * @param {object} simState
 * @param {object} players
 * @param {number} [_steps]
 * @returns {{ simState: object, outcome: object|null }}
 */
export function stepHorseshoeSimulation(simState, players = {}, _steps = 1) {
  if (!simState || simState.status === 'complete') {
    return { simState, outcome: null };
  }

  let state = simState;
  let lastEvent = null;

  const slots = Object.keys(players).map(Number).sort((a, b) => a - b);
  for (const slot of slots) {
    const input = players[slot]?.input_state || players[slot]?.inputState || players[slot] || {};
    if (input.kind === 'throw' || input.kind === 'launch') {
      const applied = applyHorseshoeInput(state, slot, input);
      state = applied.simState;
      lastEvent = applied.event;
    }
  }

  if (state.status === 'complete') {
    return {
      simState: state,
      outcome: {
        type: 'match_ended',
        winnerSlot: state.winner,
        standings: state.standings,
        reason: 'first_to_21',
      },
    };
  }

  return { simState: state, outcome: lastEvent };
}
