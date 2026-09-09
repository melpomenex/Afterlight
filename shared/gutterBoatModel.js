/**
 * Authoritative Rain Court Gutter Boat Race Simulation & Rules.
 *
 * Part of the Place Activities Program (Phase 5, Task 7.5).
 *
 * Specifications:
 * - openspec/changes/add-place-activities-program/specs/signature-place-activities/spec.md
 *   (Requirement: Rain and water activities)
 * - design.md (D5, D7)
 *
 * Guarantees:
 * - 1 to 4 toy wooden boats released down the copper courtyard gutters.
 * - Current flow influenced by rain intensity and wind velocity.
 * - Sub-tick finish timing with deterministic tie policy for simultaneous finishes.
 * - 60 Hz pure simulation identical across JS and Elixir.
 */

export const GUTTER_BOAT_RULES_VERSION = 1;
export const GUTTER_BOAT_COURSE_ID = 'rain-court-gutter';
export const GUTTER_BOAT_COURSE_VERSION = 1;
export const GUTTER_BOAT_LENGTH = 8.0; // meters (z = -1.5 to z = 6.5)
export const GUTTER_BOAT_DT = 1 / 60;
export const GUTTER_BOAT_START_Z = -1.5;
export const GUTTER_BOAT_FINISH_Z = 6.5;

export const GUTTER_LANES = Object.freeze([
  Object.freeze({ slot: 0, x: -4.875, color: '#e8563f', name: 'Crimson Keel' }),
  Object.freeze({ slot: 1, x: -4.625, color: '#38bdf8', name: 'Azure Drifter' }),
  Object.freeze({ slot: 2, x: -4.375, color: '#edb66c', name: 'Amber Skiff' }),
  Object.freeze({ slot: 3, x: -4.125, color: '#a78bfa', name: 'Violet Sloop' }),
]);

/**
 * Initializes gutter boat simulation state.
 *
 * @param {object} [opts]
 * @param {number[]} [opts.activeSlots=[0, 1]]
 * @param {object} [opts.environment]
 * @param {number} [opts.seed=42]
 * @returns {object}
 */
export function initGutterBoatState({
  activeSlots = [0, 1],
  environment = null,
  seed = 42,
} = {}) {
  const boats = {};
  for (const slot of activeSlots) {
    const lane = GUTTER_LANES[slot] ?? GUTTER_LANES[0];
    boats[slot] = {
      slot,
      x: lane.x,
      z: GUTTER_BOAT_START_Z,
      progress: 0.0,
      speed: 0.0,
      boost: 0.0,
      released: false,
      finished: false,
      finishTimeMs: null,
      rank: null,
    };
  }

  return {
    courseId: GUTTER_BOAT_COURSE_ID,
    courseVersion: GUTTER_BOAT_COURSE_VERSION,
    courseLength: GUTTER_BOAT_LENGTH,
    status: 'racing', // 'lobby', 'racing', 'complete'
    elapsedMs: 0,
    tickCount: 0,
    seed,
    boats,
    winner: null,
    standings: [],
    environment: environment ? { ...environment } : null,
  };
}

/**
 * Validates player input for gutter boats.
 *
 * @param {any} input
 * @returns {{ valid: boolean, sanitized?: object, error?: string }}
 */
export function validateGutterBoatInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, error: 'input must be an object' };
  }

  const kind = input.kind ?? 'push';
  if (kind === 'neutral') {
    return { valid: true, sanitized: { kind: 'neutral' } };
  }
  if (kind === 'push') {
    return { valid: true, sanitized: { kind: 'push' } };
  }
  return { valid: false, error: `unknown input kind: ${kind}` };
}

/**
 * Deterministic pseudo-random turbulence function based on seed and distance.
 */
function pseudoNoise(seed, slot, segment) {
  const n = (seed * 37 + slot * 101 + segment * 13) % 1000;
  return ((n / 1000) - 0.5) * 0.12;
}

/**
 * Advances the gutter boat simulation by steps.
 *
 * @param {object} simState
 * @param {Record<number, object>} playerInputs
 * @param {number} [steps=1]
 * @returns {{ simState: object, events: Array<object>, finished: boolean }}
 */
export function stepGutterBoatSimulation(simState, playerInputs = {}, steps = 1) {
  if (simState.status !== 'racing') {
    return { simState, events: [], finished: simState.status === 'complete' };
  }

  const state = JSON.parse(JSON.stringify(simState));
  const events = [];

  const rain = state.environment?.rain ?? 0.5;
  const windZ = state.environment?.wind?.[1] ?? 0.0; // wind along the gutter (+Z)

  // Stream current speed: base 0.85 m/s + rain volume + tailwind
  const baseCurrentSpeed = 0.85 + rain * 0.55 + windZ * 0.20;

  for (let step = 0; step < steps; step++) {
    state.tickCount += 1;
    state.elapsedMs += Math.round(GUTTER_BOAT_DT * 1000);

    const activeKeys = Object.keys(state.boats);
    const finishingThisTick = [];

    for (const key of activeKeys) {
      const boat = state.boats[key];
      if (boat.finished) continue;

      const input = playerInputs[key] ?? playerInputs[Number(key)];
      if (input?.kind === 'push' && boat.boost <= 0.05 && boat.progress < 2.0) {
        boat.boost = 0.40; // temporary start boost
        events.push({ type: 'boat_pushed', slot: boat.slot, payload: { slot: boat.slot } });
      }

      // Decay boost
      if (boat.boost > 0) {
        boat.boost = Math.max(0, boat.boost - 0.25 * GUTTER_BOAT_DT);
      }

      // Micro-turbulence along stream
      const segment = Math.floor(boat.progress * 4);
      const turbulence = pseudoNoise(state.seed, boat.slot, segment);

      // Target speed for this boat
      const targetSpeed = Math.max(0.2, baseCurrentSpeed + boat.boost + turbulence);
      boat.speed += (targetSpeed - boat.speed) * 0.15;

      const prevProgress = boat.progress;
      boat.progress += boat.speed * GUTTER_BOAT_DT;
      boat.z = GUTTER_BOAT_START_Z + boat.progress;

      // Check finish line
      if (boat.progress >= GUTTER_BOAT_LENGTH) {
        boat.finished = true;
        // Sub-tick exact arrival time
        const fraction = (GUTTER_BOAT_LENGTH - prevProgress) / Math.max(0.001, (boat.progress - prevProgress));
        const subTickMs = Math.round(fraction * GUTTER_BOAT_DT * 1000);
        const exactFinishMs = state.elapsedMs - Math.round(GUTTER_BOAT_DT * 1000) + subTickMs;

        boat.finishTimeMs = Math.max(0, exactFinishMs);
        boat.progress = GUTTER_BOAT_LENGTH;
        boat.z = GUTTER_BOAT_FINISH_Z;
        boat.speed = 0.0;

        finishingThisTick.push(boat);
      }
    }

    if (finishingThisTick.length > 0) {
      // Sort finishers by exact finish time
      finishingThisTick.sort((a, b) => a.finishTimeMs - b.finishTimeMs);
      for (const b of finishingThisTick) {
        events.push({
          type: 'boat_finished',
          slot: b.slot,
          payload: { slot: b.slot, finishTimeMs: b.finishTimeMs },
        });
      }
    }

    // Check race completion
    const allBoats = Object.values(state.boats);
    const allDone = allBoats.length > 0 && allBoats.every(b => b.finished);

    if (allDone) {
      state.status = 'complete';
      const ranked = [...allBoats].sort((a, b) => {
        if (a.finishTimeMs !== b.finishTimeMs) return a.finishTimeMs - b.finishTimeMs;
        return a.slot - b.slot; // Deterministic tie break
      });

      state.winner = ranked[0]?.slot ?? null;
      state.standings = ranked.map((b, idx) => ({
        rank: idx + 1,
        slot: b.slot,
        finishTimeMs: b.finishTimeMs,
        tied: idx > 0 && Math.abs(b.finishTimeMs - ranked[idx - 1].finishTimeMs) <= 1,
      }));

      events.push({
        type: 'race_complete',
        slot: state.winner,
        payload: {
          winnerSlot: state.winner,
          winnerTimeMs: ranked[0]?.finishTimeMs,
          standings: state.standings,
        },
      });
      break;
    }
  }

  return {
    simState: state,
    events,
    finished: state.status === 'complete',
  };
}
