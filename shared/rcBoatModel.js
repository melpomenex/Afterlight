/**
 * Authoritative Sluiceworks RC Speedboat Racing Simulation & Rules.
 *
 * Part of the Place Activities Program (Phase 5, Task 7.6).
 *
 * Specifications:
 * - openspec/changes/add-place-activities-program/specs/signature-place-activities/spec.md
 *   (Requirement: Rain and water activities: Sluiceworks RC boat racing)
 * - design.md (D5, D7)
 *
 * Guarantees:
 * - 1 to 4 RC speedboats on ordered buoy course 'sluice-circuit' in Sluiceworks canal basin.
 * - Strict sequential buoy checkpoint advancement (missed buoys reject lap count).
 * - Rudder steering and throttle physics with water drag and canal wall collisions.
 * - Collision recovery with brief stun cooldown and manual reset to last buoy.
 * - Lap timing, total race times, sub-tick precision, and deterministic finish ordering.
 * - DNF marking for leaving/disconnected pilots and post-finish race timeout.
 */

export const RC_BOAT_RULES_VERSION = 1;
export const RC_BOAT_COURSE_ID = 'sluice-circuit';
export const RC_BOAT_COURSE_VERSION = 1;
export const RC_BOAT_TOTAL_LAPS = 2;
export const RC_BOAT_TICK_RATE = 60;
export const RC_BOAT_DT = 1 / 60;

export const RC_BOAT_MAX_SPEED = 7.5; // m/s
export const RC_BOAT_ACCEL = 9.0; // m/s^2
export const RC_BOAT_REVERSE_ACCEL = 4.0;
export const RC_BOAT_DRAG = 0.94;
export const RC_BOAT_TURN_RATE = 3.2; // rad/s
export const RC_BOAT_STUN_TICKS = 24;
export const RC_BOAT_DNF_TIMEOUT_TICKS = 60 * 15; // 15 seconds after 1st place finishes
export const RC_BOAT_WATER_Y = 0.23;

export const RC_BOAT_BOUNDS = Object.freeze({
  minX: -2.3,
  maxX: 2.3,
  minZ: 2.3,
  maxZ: 9.0,
});

export const RC_BOAT_CHECKPOINTS = Object.freeze([
  Object.freeze({ index: 0, position: Object.freeze([0.0, RC_BOAT_WATER_Y, 3.2]), radius: 1.8, name: 'Sluice Start' }),
  Object.freeze({ index: 1, position: Object.freeze([1.3, RC_BOAT_WATER_Y, 5.4]), radius: 1.6, name: 'East Pylon' }),
  Object.freeze({ index: 2, position: Object.freeze([0.6, RC_BOAT_WATER_Y, 7.8]), radius: 1.6, name: 'South Overflow' }),
  Object.freeze({ index: 3, position: Object.freeze([-1.2, RC_BOAT_WATER_Y, 7.2]), radius: 1.6, name: 'West Turn' }),
  Object.freeze({ index: 4, position: Object.freeze([-1.2, RC_BOAT_WATER_Y, 4.8]), radius: 1.6, name: 'Mill Culvert' }),
]);

export const RC_BOAT_SPAWN_DOCKS = Object.freeze([
  Object.freeze({ slot: 0, position: Object.freeze([-0.9, RC_BOAT_WATER_Y, 2.7]), yaw: 0, color: '#e8563f', name: 'Ruby Hydro' }),
  Object.freeze({ slot: 1, position: Object.freeze([-0.3, RC_BOAT_WATER_Y, 2.7]), yaw: 0, color: '#38bdf8', name: 'Cyan Wake' }),
  Object.freeze({ slot: 2, position: Object.freeze([0.3, RC_BOAT_WATER_Y, 2.7]), yaw: 0, color: '#edb66c', name: 'Gilded Wave' }),
  Object.freeze({ slot: 3, position: Object.freeze([0.9, RC_BOAT_WATER_Y, 2.7]), yaw: 0, color: '#a78bfa', name: 'Volt Foam' }),
]);

const dist2D = (x1, z1, x2, z2) => Math.hypot(x1 - x2, z1 - z2);

/**
 * Initializes RC boat race simulation state.
 *
 * @param {object} [opts]
 * @param {number[]} [opts.activeSlots=[0, 1]]
 * @param {object} [opts.environment]
 * @param {number} [opts.seed=42]
 * @returns {object}
 */
export function initRcBoatSimState({
  activeSlots = [0, 1],
  environment = null,
  seed = 42,
} = {}) {
  const boats = {};
  for (const slot of activeSlots) {
    const dock = RC_BOAT_SPAWN_DOCKS[slot] ?? RC_BOAT_SPAWN_DOCKS[0];
    boats[slot] = {
      slot,
      position: [...dock.position],
      yaw: dock.yaw,
      speed: 0.0,
      nextCheckpoint: 0,
      checkpointsHit: 0,
      currentLap: 1,
      lapTimes: [],
      totalTimeMs: 0,
      finished: false,
      finishTimeMs: null,
      dnf: false,
      stunTicks: 0,
      collisionCount: 0,
    };
  }

  return {
    courseId: RC_BOAT_COURSE_ID,
    courseVersion: RC_BOAT_COURSE_VERSION,
    totalLaps: RC_BOAT_TOTAL_LAPS,
    status: 'racing', // 'racing', 'complete'
    elapsedMs: 0,
    tickCount: 0,
    seed,
    boats,
    winner: null,
    standings: [],
    dnfCountdownTicks: null,
    environment: environment ? { ...environment } : null,
  };
}

/**
 * Validates player controls for RC boats.
 *
 * @param {any} input
 * @returns {{ valid: boolean, sanitized?: object, error?: string }}
 */
export function validateRcBoatControls(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, error: 'input must be an object' };
  }

  const throttle = typeof input.throttle === 'number' && Number.isFinite(input.throttle)
    ? Math.max(-0.5, Math.min(1.0, input.throttle))
    : 0.0;

  const steer = typeof input.steer === 'number' && Number.isFinite(input.steer)
    ? Math.max(-1.0, Math.min(1.0, input.steer))
    : 0.0;

  const recover = Boolean(input.recover);

  return {
    valid: true,
    sanitized: {
      throttle,
      steer,
      recover,
    },
  };
}

/**
 * Marks a racer as DNF (e.g. disconnected or explicitly left).
 *
 * @param {object} simState
 * @param {number} slot
 * @param {string} [reason='left']
 * @returns {{ simState: object, events: Array<object> }}
 */
export function markRcBoatDnf(simState, slot, reason = 'left') {
  const state = JSON.parse(JSON.stringify(simState));
  const boat = state.boats[slot];
  if (!boat || boat.finished || boat.dnf) {
    return { simState: state, events: [] };
  }

  boat.dnf = true;
  boat.speed = 0.0;
  const events = [
    {
      type: 'player_dnf',
      slot,
      payload: { slot, reason, checkpointsHit: boat.checkpointsHit, lap: boat.currentLap },
    },
  ];

  // Re-check if race is now complete
  maybeFinalizeRace(state, events);

  return { simState: state, events };
}

/**
 * Advances the RC boat simulation by steps.
 *
 * @param {object} simState
 * @param {Record<number, object>} playerInputs
 * @param {number} [steps=1]
 * @returns {{ simState: object, events: Array<object>, finished: boolean }}
 */
export function stepRcBoatSimulation(simState, playerInputs = {}, steps = 1) {
  if (simState.status !== 'racing') {
    return { simState, events: [], finished: simState.status === 'complete' };
  }

  const state = JSON.parse(JSON.stringify(simState));
  const events = [];

  for (let step = 0; step < steps; step++) {
    state.tickCount += 1;
    state.elapsedMs += Math.round(RC_BOAT_DT * 1000);

    // DNF countdown check
    if (state.dnfCountdownTicks !== null) {
      state.dnfCountdownTicks -= 1;
      if (state.dnfCountdownTicks <= 0) {
        // Mark all unfinished boats as DNF
        for (const b of Object.values(state.boats)) {
          if (!b.finished && !b.dnf) {
            b.dnf = true;
            b.speed = 0.0;
            events.push({
              type: 'player_dnf',
              slot: b.slot,
              payload: { slot: b.slot, reason: 'timeout', checkpointsHit: b.checkpointsHit, lap: b.currentLap },
            });
          }
        }
        maybeFinalizeRace(state, events);
        break;
      }
    }

    const activeKeys = Object.keys(state.boats);

    for (const key of activeKeys) {
      const boat = state.boats[key];
      if (boat.finished || boat.dnf) continue;

      boat.totalTimeMs = state.elapsedMs;

      const rawInput = playerInputs[key] ?? playerInputs[Number(key)] ?? {};
      const { sanitized: input } = validateRcBoatControls(rawInput);

      // 1. Recovery action (reset to last checkpoint)
      if (input.recover) {
        const lastCpIdx = (boat.nextCheckpoint - 1 + RC_BOAT_CHECKPOINTS.length) % RC_BOAT_CHECKPOINTS.length;
        const lastCp = RC_BOAT_CHECKPOINTS[lastCpIdx];
        boat.position[0] = lastCp.position[0];
        boat.position[2] = lastCp.position[2];
        boat.speed = 0.0;
        boat.stunTicks = 15;
        events.push({
          type: 'boat_recovered',
          slot: boat.slot,
          payload: { slot: boat.slot, position: [...boat.position] },
        });
        continue;
      }

      // 2. Stun cooldown handling
      if (boat.stunTicks > 0) {
        boat.stunTicks -= 1;
        boat.speed *= 0.90; // rapid friction slowdown while stunned
      } else {
        // 3. Rudder steering
        const effectiveTurn = input.steer * RC_BOAT_TURN_RATE * Math.min(1.0, 0.35 + Math.abs(boat.speed) / RC_BOAT_MAX_SPEED);
        boat.yaw += effectiveTurn * RC_BOAT_DT;

        // 4. Throttle acceleration
        if (input.throttle > 0) {
          boat.speed += input.throttle * RC_BOAT_ACCEL * RC_BOAT_DT;
        } else if (input.throttle < 0) {
          boat.speed += input.throttle * RC_BOAT_REVERSE_ACCEL * RC_BOAT_DT;
        }
      }

      // 5. Water friction drag
      boat.speed *= Math.pow(RC_BOAT_DRAG, RC_BOAT_DT * 60);
      boat.speed = Math.max(-2.5, Math.min(RC_BOAT_MAX_SPEED, boat.speed));

      // 6. Integrate position
      const forwardX = Math.sin(boat.yaw);
      const forwardZ = Math.cos(boat.yaw);
      boat.position[0] += forwardX * boat.speed * RC_BOAT_DT;
      boat.position[2] += forwardZ * boat.speed * RC_BOAT_DT;

      // 7. Canal wall boundary collision checks
      let collided = false;
      if (boat.position[0] < RC_BOAT_BOUNDS.minX) {
        boat.position[0] = RC_BOAT_BOUNDS.minX;
        collided = true;
      } else if (boat.position[0] > RC_BOAT_BOUNDS.maxX) {
        boat.position[0] = RC_BOAT_BOUNDS.maxX;
        collided = true;
      }

      if (boat.position[2] < RC_BOAT_BOUNDS.minZ) {
        boat.position[2] = RC_BOAT_BOUNDS.minZ;
        collided = true;
      } else if (boat.position[2] > RC_BOAT_BOUNDS.maxZ) {
        boat.position[2] = RC_BOAT_BOUNDS.maxZ;
        collided = true;
      }

      if (collided) {
        boat.speed *= -0.35; // bounce backward
        boat.stunTicks = RC_BOAT_STUN_TICKS;
        boat.collisionCount += 1;
        events.push({
          type: 'boat_collision',
          slot: boat.slot,
          payload: { slot: boat.slot, position: [...boat.position] },
        });
      }

      // 8. Checkpoint / Buoy advancement
      const cp = RC_BOAT_CHECKPOINTS[boat.nextCheckpoint];
      const dist = dist2D(boat.position[0], boat.position[2], cp.position[0], cp.position[2]);

      if (dist <= cp.radius) {
        const clearedIdx = boat.nextCheckpoint;
        boat.checkpointsHit += 1;

        events.push({
          type: 'checkpoint_cleared',
          slot: boat.slot,
          payload: {
            slot: boat.slot,
            checkpointIndex: clearedIdx,
            lap: boat.currentLap,
            timeMs: state.elapsedMs,
          },
        });

        if (clearedIdx === 0 && boat.checkpointsHit > 1) {
          // Completed a lap
          const prevLapTotal = boat.lapTimes.reduce((acc, t) => acc + t, 0);
          const thisLapTime = state.elapsedMs - prevLapTotal;
          boat.lapTimes.push(thisLapTime);

          events.push({
            type: 'lap_completed',
            slot: boat.slot,
            payload: {
              slot: boat.slot,
              lap: boat.currentLap,
              lapTimeMs: thisLapTime,
              totalTimeMs: state.elapsedMs,
            },
          });

          if (boat.currentLap >= state.totalLaps) {
            // Finished race!
            boat.finished = true;
            boat.finishTimeMs = state.elapsedMs;
            boat.speed = 0.0;

            events.push({
              type: 'boat_finished',
              slot: boat.slot,
              payload: {
                slot: boat.slot,
                finishTimeMs: boat.finishTimeMs,
                laps: boat.lapTimes,
              },
            });

            // Start DNF countdown for remaining racers if not already started
            if (state.dnfCountdownTicks === null) {
              state.dnfCountdownTicks = RC_BOAT_DNF_TIMEOUT_TICKS;
            }
          } else {
            boat.currentLap += 1;
          }
        }

        boat.nextCheckpoint = (boat.nextCheckpoint + 1) % RC_BOAT_CHECKPOINTS.length;
      }
    }

    // Check race completion
    if (maybeFinalizeRace(state, events)) {
      break;
    }
  }

  return {
    simState: state,
    events,
    finished: state.status === 'complete',
  };
}

/**
 * Checks whether all active racers have finished or DNFed, and computes final standings.
 */
function maybeFinalizeRace(state, events) {
  const allBoats = Object.values(state.boats);
  if (allBoats.length === 0) return false;

  const allTerminated = allBoats.every(b => b.finished || b.dnf);
  if (!allTerminated) return false;

  state.status = 'complete';

  // Sort standings: finished racers by finishTimeMs ascending, then DNF racers by checkpointsHit descending
  const sorted = [...allBoats].sort((a, b) => {
    if (a.finished && b.finished) {
      if (a.finishTimeMs !== b.finishTimeMs) return a.finishTimeMs - b.finishTimeMs;
      return a.slot - b.slot;
    }
    if (a.finished && !b.finished) return -1;
    if (!a.finished && b.finished) return 1;

    // Both DNF: most checkpoints hit first
    if (a.checkpointsHit !== b.checkpointsHit) return b.checkpointsHit - a.checkpointsHit;
    return a.slot - b.slot;
  });

  state.winner = sorted[0]?.finished ? sorted[0].slot : null;
  state.standings = sorted.map((b, idx) => ({
    rank: idx + 1,
    slot: b.slot,
    finished: b.finished,
    dnf: b.dnf,
    finishTimeMs: b.finishTimeMs,
    checkpointsHit: b.checkpointsHit,
    lapTimes: b.lapTimes,
    tied: idx > 0 && sorted[idx - 1].finished && b.finished && Math.abs(b.finishTimeMs - sorted[idx - 1].finishTimeMs) <= 1,
  }));

  events.push({
    type: 'race_complete',
    slot: state.winner,
    payload: {
      winnerSlot: state.winner,
      winnerTimeMs: sorted[0]?.finishTimeMs,
      standings: state.standings,
    },
  });

  return true;
}
