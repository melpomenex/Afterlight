/**
 * Authoritative Orpheum 301 double-out darts.
 *
 * Specifications:
 * - openspec/changes/add-place-activities-program/specs/signature-place-activities/spec.md
 *   (Requirement: Orpheum darts — Bust)
 * - design.md (D7)
 *
 * Guarantees:
 * - Two-player 301, three darts per turn, standard board scoring.
 * - Overshooting 0 or leaving 1 restores the start-of-turn score and passes.
 * - Pointer/touch flick and keyboard/controller aim-power share one (u, v) throw model.
 * - No XP or currency.
 */

export const DARTS_RULES_VERSION = 1;
export const DARTS_START_SCORE = 301;
export const DARTS_DARTS_PER_TURN = 3;
export const DARTS_MAX_PLAYERS = 2;
export const DARTS_DT = 1 / 60;

/** Standard clockwise sectors starting at 12 o'clock (20). */
export const DARTS_SECTORS = Object.freeze([
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
]);

export const DARTS_RINGS = Object.freeze({
  innerBull: 0.066,
  outerBull: 0.162,
  tripleInner: 0.582,
  tripleOuter: 0.629,
  doubleInner: 0.953,
  doubleOuter: 1.0,
});

/**
 * Board point that lands in a known segment/ring. Used by both input paths
 * and by tests so flick and aim-power stay on one model.
 * @param {number} segment 1–20 (ignored for bulls)
 * @param {'inner-bull'|'outer-bull'|'triple'|'single-inner'|'single-outer'|'double'|'miss'} ring
 * @returns {{ u: number, v: number }}
 */
export function boardPointFor(segment, ring) {
  if (ring === 'inner-bull') return { u: 0, v: 0 };
  if (ring === 'outer-bull') return { u: 0, v: 0.12 };
  if (ring === 'miss') return { u: 0, v: 1.15 };
  const idx = Math.max(0, DARTS_SECTORS.indexOf(segment));
  const radii = {
    triple: 0.605,
    'single-inner': 0.40,
    'single-outer': 0.78,
    double: 0.975,
  };
  const r = radii[ring] ?? 0.78;
  const a = idx * (Math.PI / 10);
  return { u: Math.sin(a) * r, v: Math.cos(a) * r };
}

/**
 * Score a normalized board hit. u right, v up; 20 is at +v.
 * @param {number} u
 * @param {number} v
 * @returns {{ points: number, segment: number|null, ring: string, double: boolean }}
 */
export function scoreThrow(u, v) {
  const x = Number(u);
  const y = Number(v);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return { points: 0, segment: null, ring: 'miss', double: false };
  }
  const r = Math.hypot(x, y);
  if (r > DARTS_RINGS.doubleOuter) {
    return { points: 0, segment: null, ring: 'miss', double: false };
  }
  if (r <= DARTS_RINGS.innerBull) {
    return { points: 50, segment: 50, ring: 'inner-bull', double: true };
  }
  if (r <= DARTS_RINGS.outerBull) {
    return { points: 25, segment: 25, ring: 'outer-bull', double: false };
  }

  const fromTop = (Math.atan2(x, y) + Math.PI * 2) % (Math.PI * 2);
  const idx = Math.floor((fromTop + Math.PI / 20) / (Math.PI / 10)) % 20;
  const segment = DARTS_SECTORS[idx];

  if (r >= DARTS_RINGS.doubleInner) {
    return { points: segment * 2, segment, ring: 'double', double: true };
  }
  if (r >= DARTS_RINGS.tripleInner && r <= DARTS_RINGS.tripleOuter) {
    return { points: segment * 3, segment, ring: 'triple', double: false };
  }
  const ring = r < DARTS_RINGS.tripleInner ? 'single-inner' : 'single-outer';
  return { points: segment, segment, ring, double: false };
}

/**
 * Convert aim (0–1 around the board) + power (0–1 radius) into the shared (u, v).
 * @param {number} aim
 * @param {number} power
 * @returns {{ u: number, v: number }}
 */
export function aimPowerToPoint(aim, power) {
  const a = ((Number(aim) || 0) % 1 + 1) % 1;
  const p = Math.max(0, Math.min(1, Number(power) || 0));
  const theta = a * Math.PI * 2;
  const r = p * 0.98;
  return { u: Math.sin(theta) * r, v: Math.cos(theta) * r };
}

/**
 * @param {any} controls
 * @returns {{ valid: boolean, sanitized?: object, error?: string }}
 */
export function validateDartsInput(controls) {
  if (!controls || typeof controls !== 'object' || Array.isArray(controls)) {
    return { valid: false, error: 'controls must be an object' };
  }
  const kind = typeof controls.kind === 'string' ? controls.kind : 'throw';
  if (kind === 'neutral') {
    return { valid: true, sanitized: { kind: 'neutral' } };
  }
  if (kind !== 'throw') {
    return { valid: false, error: 'unknown kind' };
  }

  if (Number.isFinite(Number(controls.u)) && Number.isFinite(Number(controls.v))) {
    const u = Math.max(-1.5, Math.min(1.5, Number(controls.u)));
    const v = Math.max(-1.5, Math.min(1.5, Number(controls.v)));
    return { valid: true, sanitized: { kind: 'throw', u, v } };
  }

  if (Number.isFinite(Number(controls.aim)) && Number.isFinite(Number(controls.power))) {
    const point = aimPowerToPoint(Number(controls.aim), Number(controls.power));
    return { valid: true, sanitized: { kind: 'throw', u: point.u, v: point.v } };
  }

  return { valid: false, error: 'throw requires u/v or aim/power' };
}

/**
 * @param {object} [opts]
 * @param {number[]} [opts.activeSlots]
 * @returns {object}
 */
export function initDartsState({ activeSlots = [0, 1] } = {}) {
  const slots = (activeSlots || [0, 1]).slice(0, DARTS_MAX_PLAYERS);
  const players = {};
  for (const slot of slots) {
    players[slot] = {
      slot,
      score: DARTS_START_SCORE,
      turnStartScore: DARTS_START_SCORE,
      dartsThisTurn: 0,
      lastThrow: null,
    };
  }
  return {
    rulesVersion: DARTS_RULES_VERSION,
    status: 'playing',
    startScore: DARTS_START_SCORE,
    turnSlot: slots[0] ?? 0,
    dartsRemaining: DARTS_DARTS_PER_TURN,
    turnTotal: 0,
    players,
    activeSlots: [...slots],
    winner: null,
    standings: [],
    lastEvent: null,
    lastCommitId: null,
    elapsedMs: 0,
    tickCount: 0,
  };
}

function cloneState(simState) {
  return JSON.parse(JSON.stringify(simState));
}

function playerOf(state, slot) {
  return state.players[slot] ?? state.players[String(slot)] ?? null;
}

function nextSlot(state, slot) {
  const list = state.activeSlots;
  const idx = list.indexOf(slot);
  if (idx < 0) return list[0] ?? 0;
  return list[(idx + 1) % list.length];
}

function passTurn(state, fromSlot) {
  const player = playerOf(state, fromSlot);
  if (player) {
    player.dartsThisTurn = 0;
    player.turnStartScore = player.score;
  }
  const nxt = nextSlot(state, fromSlot);
  state.turnSlot = nxt;
  state.dartsRemaining = DARTS_DARTS_PER_TURN;
  state.turnTotal = 0;
  const incoming = playerOf(state, nxt);
  if (incoming) incoming.turnStartScore = incoming.score;
  return nxt;
}

/**
 * Apply one dart. Bust restores the start-of-turn score and passes.
 * @param {object} simState
 * @param {number} slot
 * @param {object} controls
 * @returns {{ simState: object, event: object|null }}
 */
export function applyDartsInput(simState, slot, controls) {
  if (!simState || simState.status === 'complete') {
    return { simState, event: null };
  }
  const valid = validateDartsInput(controls);
  if (!valid.valid || valid.sanitized.kind !== 'throw') {
    return { simState, event: null };
  }
  if (simState.turnSlot !== slot) {
    return { simState, event: null };
  }

  const commitId = controls.commitId ?? controls.commit_id ?? null;
  if (commitId != null && commitId === simState.lastCommitId) {
    return { simState, event: null };
  }

  const state = cloneState(simState);
  state.lastCommitId = commitId;
  const player = playerOf(state, slot);
  if (!player) return { simState, event: null };

  const hit = scoreThrow(valid.sanitized.u, valid.sanitized.v);
  const remaining = player.score - hit.points;
  const bust = remaining < 0 || remaining === 1 || (remaining === 0 && !hit.double);

  player.lastThrow = {
    u: valid.sanitized.u,
    v: valid.sanitized.v,
    ...hit,
    bust,
  };
  player.dartsThisTurn += 1;
  state.dartsRemaining = Math.max(0, DARTS_DARTS_PER_TURN - player.dartsThisTurn);

  if (bust) {
    player.score = player.turnStartScore;
    state.turnTotal = 0;
    state.lastEvent = 'bust';
    const next = passTurn(state, slot);
    return {
      simState: state,
      event: {
        type: 'bust',
        slot,
        payload: {
          slot,
          restored: player.score,
          nextSlot: next,
          throw: player.lastThrow,
        },
      },
    };
  }

  player.score = remaining;
  state.turnTotal += hit.points;

  if (remaining === 0 && hit.double) {
    state.status = 'complete';
    state.winner = slot;
    state.lastEvent = 'checkout';
    const ranked = [...state.activeSlots]
      .map((s) => playerOf(state, s))
      .filter(Boolean)
      .sort((a, b) => a.score - b.score || a.slot - b.slot);
    state.standings = ranked.map((p, idx) => ({
      rank: idx + 1,
      slot: p.slot,
      score: p.score,
    }));
    return {
      simState: state,
      event: {
        type: 'match_ended',
        slot,
        payload: { winnerSlot: slot, reason: 'checkout', throw: player.lastThrow },
      },
    };
  }

  if (player.dartsThisTurn >= DARTS_DARTS_PER_TURN) {
    state.lastEvent = 'turn_end';
    const next = passTurn(state, slot);
    return {
      simState: state,
      event: {
        type: 'turn_end',
        slot,
        payload: { slot, nextSlot: next, turnTotal: state.turnTotal, score: player.score, throw: player.lastThrow },
      },
    };
  }

  state.lastEvent = 'throw';
  return {
    simState: state,
    event: {
      type: 'throw',
      slot,
      payload: {
        slot,
        score: player.score,
        turnTotal: state.turnTotal,
        dartsRemaining: state.dartsRemaining,
        throw: player.lastThrow,
      },
    },
  };
}

/**
 * @param {object} simState
 * @param {object} [_players]
 * @param {number} [steps=1]
 * @returns {{ simState: object, event: object|null }}
 */
function playerInput(players, slot) {
  if (!players) return null;
  const entry = players[slot] ?? players[String(slot)];
  if (!entry) return null;
  return entry.input_state || entry.inputState || entry.controls || null;
}

export function stepDartsSimulation(simState, players = {}, steps = 1) {
  if (!simState) return { simState, event: null };
  let state = simState;
  if (state.status !== 'complete' && steps > 0) {
    state = cloneState(state);
    state.elapsedMs += Math.round(steps * DARTS_DT * 1000);
    state.tickCount += steps;
  }
  if (state.status === 'complete') return { simState: state, event: null };
  for (const slot of state.activeSlots || []) {
    const input = playerInput(players, slot);
    if (!input) continue;
    const applied = applyDartsInput(state, slot, input);
    if (applied.event) return applied;
    state = applied.simState;
  }
  return { simState: state, event: null };
}
