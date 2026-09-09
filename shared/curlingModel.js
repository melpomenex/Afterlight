/**
 * Authoritative curling simulation and scoring (Phase 5, Tasks 8.7 & 8.8).
 *
 * Specifications:
 * - openspec/changes/add-place-activities-program/specs/signature-place-activities/spec.md
 *   (Requirement: Camp and ice games — Curling end)
 * - design.md D3 (team disconnect: pause, forfeit incomplete side, abort if both incomplete)
 * - design.md D5 (server-owned planar physics)
 * - design.md D6 / D7 (world presentation + ice friction from frozen environment defaults)
 *
 * Guarantees:
 * - 1v1 and 2v2, four ends, four stones per side per end.
 * - Launch / curl / sweep; stone-stone collision; closest-stone scoring.
 * - Extra end when the match is tied after four ends.
 * - Ice friction from the frozen environment snapshot defaults, never client particles.
 * - No XP or currency.
 */

export const CURLING_RULES_VERSION = 1;
export const CURLING_TOTAL_ENDS = 4;
export const CURLING_STONES_PER_SIDE = 4;
export const CURLING_DT = 1 / 60;

export const SHEET_WIDTH = 4.2;
export const SHEET_LENGTH = 8.4;
export const HACK_Z = -3.6;
export const HOUSE_Z = 3.2;
export const HOUSE_X = 0;
export const HOUSE_RADIUS = 1.05;
export const RING_EIGHT = 0.70;
export const RING_FOUR = 0.35;
export const BUTTON_RADIUS = 0.08;
export const STONE_RADIUS = 0.145;
export const BACK_LINE_Z = HOUSE_Z + HOUSE_RADIUS + 0.35;

export const AIM_MIN = -0.28;
export const AIM_MAX = 0.28;
export const POWER_MIN = 0.15;
export const POWER_MAX = 1.0;
export const CURL_MIN = -1;
export const CURL_MAX = 1;

export const STOP_SPEED = 0.045;
export const BOARD_RESTITUTION = 0.32;
export const STONE_RESTITUTION = 0.9;

/** Default frozen Glasshouse ice when the snapshot is absent. */
export const DEFAULT_CURLING_ENVIRONMENT = Object.freeze({
  version: 1,
  policy: 'frozen',
  preset: null,
  wind: Object.freeze([0, 0]),
  windSpeed: 0,
  rain: 0,
  intensity: 0.35,
  wetness: 0.15,
  timePhase: 0,
  frozenAt: 0,
});

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const hypot = (x, z) => Math.hypot(x, z);

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function finiteNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Slipperiness in [0.55, 1]. Higher = faster ice.
 * Derived only from the frozen environment snapshot (wetness / intensity).
 */
export function iceFrictionFromEnvironment(environment) {
  const env = environment && typeof environment === 'object' ? environment : DEFAULT_CURLING_ENVIRONMENT;
  const wetness = clamp(finiteNumber(env.wetness, DEFAULT_CURLING_ENVIRONMENT.wetness), 0, 1);
  const intensity = clamp(finiteNumber(env.intensity, DEFAULT_CURLING_ENVIRONMENT.intensity), 0, 1);
  return clamp(1 - wetness * 0.35 - intensity * 0.08, 0.55, 1);
}

/** Constant deceleration (units/s^2). Sweep reduces drag; wetter ice increases it. */
export function iceDeceleration(environment, sweepStrength = 0) {
  const slip = iceFrictionFromEnvironment(environment);
  const base = 3.55 / slip;
  const sweep = 1 - clamp(finiteNumber(sweepStrength, 0), 0, 2) * 0.16;
  return base * sweep;
}

export function teamForSlot(slot, teamSize) {
  const s = Number(slot);
  if (teamSize === 2) return s <= 1 ? 0 : 1;
  return s === 0 ? 0 : 1;
}

export function slotsForTeam(team, teamSize) {
  if (teamSize === 2) return team === 0 ? [0, 1] : [2, 3];
  return team === 0 ? [0] : [1];
}

export function resolveTeamSize(activeSlots) {
  const slots = Array.isArray(activeSlots) ? activeSlots : [0, 1];
  return slots.length >= 4 ? 2 : 1;
}

/**
 * Who throws stoneIndex (0..7) this end.
 * The side without hammer opens; teammates alternate in 2v2.
 */
export function throwerForStone(stoneIndex, teamSize, hammerTeam) {
  const firstTeam = 1 - hammerTeam;
  const team = stoneIndex % 2 === 0 ? firstTeam : hammerTeam;
  if (teamSize === 1) return team === 0 ? 0 : 1;
  const teamThrowIndex = Math.floor(stoneIndex / 2);
  const offset = teamThrowIndex % 2;
  return team === 0 ? offset : 2 + offset;
}

export function validateCurlingControls(controls) {
  if (!controls || typeof controls !== 'object' || Array.isArray(controls)) {
    return { valid: false, error: 'controls must be an object' };
  }

  const kind = typeof controls.kind === 'string' ? controls.kind : 'launch';

  if (kind === 'neutral') {
    return { valid: true, sanitized: { kind: 'neutral' } };
  }

  if (kind === 'pause' || kind === 'resume') {
    return { valid: true, sanitized: { kind } };
  }

  if (kind === 'disconnect') {
    const remaining = Array.isArray(controls.remainingSlots)
      ? controls.remainingSlots.map((s) => Number(s)).filter(Number.isInteger)
      : [];
    return { valid: true, sanitized: { kind: 'disconnect', remainingSlots: remaining } };
  }

  if (kind === 'sweep') {
    const sweep = controls.sweep === true || controls.sweep === 1 || controls.sweep === '1' ? 1 : 0;
    return { valid: true, sanitized: { kind: 'sweep', sweep } };
  }

  if (kind === 'aim' || kind === 'launch') {
    return {
      valid: true,
      sanitized: {
        kind,
        aim: clamp(finiteNumber(controls.aim, 0), AIM_MIN, AIM_MAX),
        power: clamp(finiteNumber(controls.power, 0.62), POWER_MIN, POWER_MAX),
        curl: clamp(finiteNumber(controls.curl, 0), CURL_MIN, CURL_MAX),
      },
    };
  }

  return { valid: false, error: `unknown kind: ${kind}` };
}

export function initCurlingState({
  activeSlots = [0, 1],
  environment = null,
} = {}) {
  const slots = [...activeSlots].map(Number).sort((a, b) => a - b);
  const teamSize = resolveTeamSize(slots);
  const env = environment ? { ...DEFAULT_CURLING_ENVIRONMENT, ...environment } : { ...DEFAULT_CURLING_ENVIRONMENT };
  const hammerTeam = 1;
  const currentSlot = throwerForStone(0, teamSize, hammerTeam);

  return {
    rulesVersion: CURLING_RULES_VERSION,
    status: 'aiming',
    teamSize,
    activeSlots: slots,
    currentEnd: 1,
    totalEnds: CURLING_TOTAL_ENDS,
    extraEnd: false,
    hammerTeam,
    currentTeam: teamForSlot(currentSlot, teamSize),
    currentSlot,
    stonesThrown: 0,
    stonesPerSide: CURLING_STONES_PER_SIDE,
    stones: [],
    pending: { aim: 0, power: 0.62, curl: 0 },
    sweepers: {},
    score: { 0: 0, 1: 0 },
    endHistory: [],
    winner: null,
    outcome: null,
    pauseReason: null,
    resumeStatus: null,
    environment: env,
    iceFriction: iceFrictionFromEnvironment(env),
    tick: 0,
  };
}

function defaultSweepers(slots) {
  const sweepers = {};
  for (const slot of slots) sweepers[slot] = 0;
  return sweepers;
}

function resetEnd(state, nextEnd, hammerTeam, extraEnd) {
  const currentSlot = throwerForStone(0, state.teamSize, hammerTeam);
  state.currentEnd = nextEnd;
  state.extraEnd = extraEnd;
  state.hammerTeam = hammerTeam;
  state.currentSlot = currentSlot;
  state.currentTeam = teamForSlot(currentSlot, state.teamSize);
  state.stonesThrown = 0;
  state.stones = [];
  state.sweepers = defaultSweepers(state.activeSlots);
  state.status = 'aiming';
  state.pending = { aim: 0, power: 0.62, curl: 0 };
}

/**
 * Closest-stone scoring: only stones of the closest side that sit nearer
 * than the opposing closest in-play stone score.
 */
export function scoreEnd(stones, house = { x: HOUSE_X, z: HOUSE_Z }) {
  const inHouse = (stones || []).filter((s) => {
    if (!s || s.out) return false;
    const d = hypot(s.x - house.x, s.z - house.z);
    return d <= HOUSE_RADIUS + STONE_RADIUS;
  });
  if (inHouse.length === 0) {
    return { scoringTeam: null, points: 0, distances: [] };
  }

  const ranked = inHouse
    .map((s) => ({
      team: s.team,
      d: hypot(s.x - house.x, s.z - house.z),
    }))
    .sort((a, b) => a.d - b.d);

  const closest = ranked[0];
  const opposing = ranked.find((s) => s.team !== closest.team);
  const cutoff = opposing ? opposing.d : Number.POSITIVE_INFINITY;
  const scoring = ranked.filter((s) => s.team === closest.team && s.d < cutoff - 1e-9);

  if (scoring.length === 0) {
    return { scoringTeam: null, points: 0, distances: ranked };
  }

  return { scoringTeam: closest.team, points: scoring.length, distances: ranked };
}

function finishEnd(state) {
  const result = scoreEnd(state.stones);
  state.endHistory.push({
    end: state.currentEnd,
    extra: state.extraEnd,
    scoringTeam: result.scoringTeam,
    points: result.points,
    hammerTeam: state.hammerTeam,
  });

  if (result.scoringTeam !== null && result.points > 0) {
    const key = result.scoringTeam;
    state.score[key] = (state.score[key] || 0) + result.points;
    state.score[String(key)] = state.score[key];
  }

  const s0 = state.score[0] ?? state.score['0'] ?? 0;
  const s1 = state.score[1] ?? state.score['1'] ?? 0;
  const regulationOver = state.currentEnd >= state.totalEnds && !state.extraEnd;
  const extraJustPlayed = state.extraEnd;

  if ((regulationOver || extraJustPlayed) && s0 !== s1) {
    state.status = 'complete';
    state.winner = s0 > s1 ? 0 : 1;
    state.outcome = 'complete';
    return state;
  }

  if (regulationOver && s0 === s1) {
    const nextHammer = result.scoringTeam === null ? state.hammerTeam : 1 - result.scoringTeam;
    resetEnd(state, state.currentEnd + 1, nextHammer, true);
    return state;
  }

  if (extraJustPlayed && s0 === s1) {
    const nextHammer = result.scoringTeam === null ? state.hammerTeam : 1 - result.scoringTeam;
    resetEnd(state, state.currentEnd + 1, nextHammer, true);
    return state;
  }

  const nextHammer = result.scoringTeam === null ? state.hammerTeam : 1 - result.scoringTeam;
  resetEnd(state, state.currentEnd + 1, nextHammer, false);
  return state;
}

export function applyCurlingInput(simState, slot, controls) {
  if (!simState || typeof simState !== 'object') {
    return { simState, event: null };
  }

  const parsed = validateCurlingControls(controls);
  if (!parsed.valid) {
    return { simState, event: null };
  }

  const state = cloneState(simState);
  const input = parsed.sanitized;
  const slotNum = Number(slot);

  if (input.kind === 'pause') {
    if (state.status === 'complete' || state.status === 'aborted') {
      return { simState: state, event: null };
    }
    if (state.status !== 'paused') {
      state.resumeStatus = state.status;
      state.status = 'paused';
      state.pauseReason = 'disconnect_grace';
    }
    return { simState: state, event: { type: 'paused', reason: 'disconnect_grace' } };
  }

  if (input.kind === 'resume') {
    if (state.status === 'paused') {
      state.status = state.resumeStatus || 'aiming';
      state.pauseReason = null;
      state.resumeStatus = null;
    }
    return { simState: state, event: { type: 'resumed' } };
  }

  if (input.kind === 'disconnect') {
    return applyCurlingDisconnect(state, input.remainingSlots);
  }

  if (state.status === 'paused' || state.status === 'complete' || state.status === 'aborted') {
    return { simState: state, event: null };
  }

  if (input.kind === 'aim') {
    if (state.status === 'aiming' && slotNum === state.currentSlot) {
      state.pending = { aim: input.aim, power: input.power, curl: input.curl };
    }
    return { simState: state, event: null };
  }

  if (input.kind === 'sweep') {
    if (!state.activeSlots.includes(slotNum)) {
      return { simState: state, event: null };
    }
    const sweeperTeam = teamForSlot(slotNum, state.teamSize);
    if (state.status === 'in_flight' && sweeperTeam === state.currentTeam) {
      state.sweepers[slotNum] = input.sweep;
      state.sweepers[String(slotNum)] = input.sweep;
    }
    return { simState: state, event: { type: 'sweep', slot: slotNum, sweep: input.sweep } };
  }

  if (input.kind === 'launch') {
    if (state.status !== 'aiming' || slotNum !== state.currentSlot) {
      return { simState: state, event: null };
    }
    if (state.stonesThrown >= CURLING_STONES_PER_SIDE * 2) {
      return { simState: state, event: null };
    }

    const v0 = 2.4 + input.power * 7.2;
    const stone = {
      id: `e${state.currentEnd}-n${state.stonesThrown}`,
      team: state.currentTeam,
      slot: slotNum,
      x: 0,
      z: HACK_Z,
      vx: Math.sin(input.aim) * v0,
      vz: Math.cos(input.aim) * v0,
      omega: input.curl * 2.8,
      radius: STONE_RADIUS,
      moving: true,
      out: false,
    };

    state.stones.push(stone);
    state.stonesThrown += 1;
    state.status = 'in_flight';
    state.pending = { aim: input.aim, power: input.power, curl: input.curl };
    state.sweepers = defaultSweepers(state.activeSlots);
    return {
      simState: state,
      event: { type: 'stone_launched', slot: slotNum, stoneId: stone.id, aim: input.aim, power: input.power, curl: input.curl },
    };
  }

  return { simState: state, event: null };
}

/**
 * D3 team curling: after grace, forfeit an incomplete side to a complete side;
 * abort if both sides are incomplete.
 */
export function applyCurlingDisconnect(simState, remainingSlots) {
  const state = simState.status ? simState : cloneState(simState);
  const remaining = new Set((remainingSlots || []).map(Number));
  const t0 = slotsForTeam(0, state.teamSize);
  const t1 = slotsForTeam(1, state.teamSize);
  const t0complete = t0.every((s) => remaining.has(s));
  const t1complete = t1.every((s) => remaining.has(s));

  if (t0complete && t1complete) {
    return { simState: state, event: null };
  }

  if (!t0complete && t1complete) {
    state.status = 'complete';
    state.winner = 1;
    state.outcome = 'forfeit';
    state.pauseReason = null;
    return { simState: state, event: { type: 'match_ended', winner: 1, reason: 'forfeit' } };
  }

  if (!t1complete && t0complete) {
    state.status = 'complete';
    state.winner = 0;
    state.outcome = 'forfeit';
    state.pauseReason = null;
    return { simState: state, event: { type: 'match_ended', winner: 0, reason: 'forfeit' } };
  }

  state.status = 'aborted';
  state.winner = null;
  state.outcome = 'aborted';
  state.pauseReason = null;
  return { simState: state, event: { type: 'match_aborted', reason: 'both_sides_incomplete' } };
}

function sweepStrength(state) {
  let n = 0;
  for (const slot of slotsForTeam(state.currentTeam, state.teamSize)) {
    const flag = state.sweepers[slot] ?? state.sweepers[String(slot)] ?? 0;
    if (flag) n += 1;
  }
  return n;
}

function bounceBoards(stone) {
  const half = SHEET_WIDTH / 2 - stone.radius;
  if (stone.x < -half) {
    stone.x = -half;
    stone.vx = Math.abs(stone.vx) * BOARD_RESTITUTION;
    stone.vz *= 0.85;
    stone.omega *= 0.7;
  } else if (stone.x > half) {
    stone.x = half;
    stone.vx = -Math.abs(stone.vx) * BOARD_RESTITUTION;
    stone.vz *= 0.85;
    stone.omega *= 0.7;
  }

  const minZ = HACK_Z - 0.25;
  if (stone.z < minZ) {
    stone.z = minZ;
    stone.vz = Math.abs(stone.vz) * BOARD_RESTITUTION;
  }

  if (stone.z > BACK_LINE_Z) {
    stone.out = true;
    stone.moving = false;
    stone.vx = 0;
    stone.vz = 0;
    stone.omega = 0;
  }
}

function collideStones(a, b) {
  if (a.out || b.out) return false;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const dist = hypot(dx, dz);
  const min = a.radius + b.radius;
  if (dist >= min || dist < 1e-8) return false;

  const nx = dx / dist;
  const nz = dz / dist;
  const overlap = min - dist;
  a.x -= nx * overlap * 0.5;
  a.z -= nz * overlap * 0.5;
  b.x += nx * overlap * 0.5;
  b.z += nz * overlap * 0.5;

  const rel = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
  if (rel > 0) {
    const impulse = rel * (1 + STONE_RESTITUTION) * 0.5;
    a.vx -= impulse * nx;
    a.vz -= impulse * nz;
    b.vx += impulse * nx;
    b.vz += impulse * nz;
    const spin = rel * 0.15;
    a.omega -= spin;
    b.omega += spin;
    if (hypot(a.vx, a.vz) >= STOP_SPEED) a.moving = true;
    if (hypot(b.vx, b.vz) >= STOP_SPEED) b.moving = true;
  }
  return true;
}

function stepStone(stone, decel, dt) {
  if (!stone.moving || stone.out) return;

  const speed = hypot(stone.vx, stone.vz);
  if (speed < STOP_SPEED && Math.abs(stone.omega) < 0.08) {
    stone.vx = 0;
    stone.vz = 0;
    stone.omega = 0;
    stone.moving = false;
    return;
  }

  if (speed > 1e-6) {
    const drop = Math.min(speed, decel * dt);
    const scale = (speed - drop) / speed;
    stone.vx *= scale;
    stone.vz *= scale;
    const curlAccel = stone.omega * speed * 0.11;
    const tx = -stone.vz / speed;
    const tz = stone.vx / speed;
    stone.vx += tx * curlAccel * dt;
    stone.vz += tz * curlAccel * dt;
  }

  stone.x += stone.vx * dt;
  stone.z += stone.vz * dt;
  stone.omega *= 0.988;
  bounceBoards(stone);
}

function settleIfQuiet(state) {
  const anyMoving = state.stones.some((s) => s.moving && !s.out);
  if (anyMoving) return state;

  state.sweepers = defaultSweepers(state.activeSlots);
  if (state.stonesThrown >= CURLING_STONES_PER_SIDE * 2) {
    return finishEnd(state);
  }

  const nextSlot = throwerForStone(state.stonesThrown, state.teamSize, state.hammerTeam);
  state.currentSlot = nextSlot;
  state.currentTeam = teamForSlot(nextSlot, state.teamSize);
  state.status = 'aiming';
  return state;
}

export function stepCurlingSimulation(simState, players = {}, steps = 1) {
  if (!simState || simState.status !== 'in_flight') {
    return { simState, event: null };
  }

  const state = cloneState(simState);
  const n = Math.max(1, Math.min(8, Number(steps) || 1));

  if (players && typeof players === 'object') {
    for (const [key, player] of Object.entries(players)) {
      const slot = Number(player?.slot ?? key);
      const input = player?.input_state || player?.inputState || player || {};
      if (input.kind === 'sweep' || input.sweep !== undefined) {
        const parsed = validateCurlingControls({ kind: 'sweep', sweep: input.sweep });
        if (parsed.valid && teamForSlot(slot, state.teamSize) === state.currentTeam) {
          state.sweepers[slot] = parsed.sanitized.sweep;
          state.sweepers[String(slot)] = parsed.sanitized.sweep;
        }
      }
    }
  }

  const decel = iceDeceleration(state.environment, sweepStrength(state));

  for (let i = 0; i < n; i += 1) {
    state.tick = (state.tick || 0) + 1;
    for (const stone of state.stones) {
      stepStone(stone, decel, CURLING_DT);
    }
    for (let a = 0; a < state.stones.length; a += 1) {
      for (let b = a + 1; b < state.stones.length; b += 1) {
        collideStones(state.stones[a], state.stones[b]);
      }
    }
    settleIfQuiet(state);
    if (state.status !== 'in_flight') break;
  }

  let event = null;
  if (state.status === 'aiming') {
    event = { type: 'stone_rested', stonesThrown: state.stonesThrown };
  } else if (state.status === 'complete') {
    event = { type: 'match_ended', winner: state.winner, reason: state.outcome || 'complete' };
  }

  return { simState: state, event };
}

/** Test helper: drop settled stones and score the current end immediately. */
export function scorePlacedEnd(placements, opts = {}) {
  const stones = placements.map((p, i) => ({
    id: `place-${i}`,
    team: p.team,
    slot: p.slot ?? p.team,
    x: p.x,
    z: p.z,
    vx: 0,
    vz: 0,
    omega: 0,
    radius: STONE_RADIUS,
    moving: false,
    out: !!p.out,
  }));
  return scoreEnd(stones, opts.house);
}

export function launchVelocity(aim, power, curl) {
  const a = clamp(finiteNumber(aim, 0), AIM_MIN, AIM_MAX);
  const p = clamp(finiteNumber(power, 0.62), POWER_MIN, POWER_MAX);
  const c = clamp(finiteNumber(curl, 0), CURL_MIN, CURL_MAX);
  const v0 = 2.4 + p * 7.2;
  return {
    vx: Math.sin(a) * v0,
    vz: Math.cos(a) * v0,
    omega: c * 2.8,
    v0,
  };
}
