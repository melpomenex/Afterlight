/**
 * Authoritative Rooftop Drone Racing Simulation & Rules.
 *
 * Part of the Place Activities Program (Phase 5, Tasks 7.2 & 7.3).
 *
 * Specifications:
 * - openspec/changes/add-place-activities-program/specs/signature-place-activities/spec.md
 *   (Requirement: Rooftop flight)
 * - design.md (D5, D7)
 *
 * Guarantees:
 * - 1 to 4 racers on ordered checkpoint course 'rooftop-circuit'.
 * - Strict sequential checkpoint advancement (missed checkpoints reject lap count).
 * - Lap times, total race times, and deterministic finish ordering.
 * - 60 Hz simulation with velocity drag, thrust, frozen environment wind, and boundary collisions.
 * - Collision recovery with brief control stun and bounce response.
 * - DNF marking for leaving/disconnected pilots without aborting remaining racers.
 */

export const DRONE_RULES_VERSION = 1;
export const DRONE_COURSE_ID = 'rooftop-circuit';
export const DRONE_COURSE_VERSION = 1;
export const DRONE_TOTAL_LAPS = 2;
export const DRONE_TICK_RATE = 60;
export const DRONE_DT = 1 / 60;

export const DRONE_CHECKPOINTS = Object.freeze([
  Object.freeze({ index: 0, position: Object.freeze([-3.0, 3.0, 1.0]), radius: 2.2, name: 'Start/Finish' }),
  Object.freeze({ index: 1, position: Object.freeze([5.0, 4.0, -2.0]), radius: 2.2, name: 'East Awning' }),
  Object.freeze({ index: 2, position: Object.freeze([7.0, 5.0, -6.0]), radius: 2.2, name: 'Skyline Turn' }),
  Object.freeze({ index: 3, position: Object.freeze([0.0, 4.5, -7.0]), radius: 2.2, name: 'Lounge Overpass' }),
  Object.freeze({ index: 4, position: Object.freeze([-7.0, 3.5, -4.0]), radius: 2.2, name: 'Utility Vault' }),
  Object.freeze({ index: 5, position: Object.freeze([-6.0, 2.5, 1.0]), radius: 2.2, name: 'Home Stretch' }),
]);

export const DRONE_SPAWN_PADS = Object.freeze([
  Object.freeze({ slot: 0, position: Object.freeze([-4.2, 2.0, 2.5]), yaw: 0 }),
  Object.freeze({ slot: 1, position: Object.freeze([-3.4, 2.0, 2.5]), yaw: 0 }),
  Object.freeze({ slot: 2, position: Object.freeze([-2.6, 2.0, 2.5]), yaw: 0 }),
  Object.freeze({ slot: 3, position: Object.freeze([-1.8, 2.0, 2.5]), yaw: 0 }),
]);

export const DRONE_BOUNDS = Object.freeze({
  minX: -12.0,
  maxX: 12.0,
  minY: 1.0,
  maxY: 9.0,
  minZ: -10.0,
  maxZ: 8.0,
});

export const DRONE_MAX_SPEED = 22.0;
export const DRONE_DRAG = 0.96;
export const DRONE_STUN_TICKS = 18;

const dist3D = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * Initializes simulation state for a drone race.
 *
 * @param {object} [opts]
 * @param {number[]} [opts.activeSlots=[0, 1]]
 * @param {object} [opts.environment]
 * @returns {object}
 */
export function initDroneSimState({ activeSlots = [0, 1], environment = null } = {}) {
  const drones = {};
  for (const slot of activeSlots) {
    const pad = DRONE_SPAWN_PADS[slot] ?? DRONE_SPAWN_PADS[0];
    drones[slot] = {
      slot,
      position: [...pad.position],
      velocity: [0, 0, 0],
      rotation: [0, pad.yaw, 0], // pitch, yaw, roll
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
    courseId: DRONE_COURSE_ID,
    courseVersion: DRONE_COURSE_VERSION,
    totalLaps: DRONE_TOTAL_LAPS,
    status: 'racing',
    elapsedMs: 0,
    tickCount: 0,
    drones,
    winner: null,
    environment: environment ? { ...environment } : null,
  };
}

/**
 * Validates drone flight controls.
 *
 * @param {any} controls
 * @returns {{ valid: boolean, sanitized?: object, error?: string }}
 */
export function validateDroneControls(controls) {
  if (!controls || typeof controls !== 'object' || Array.isArray(controls)) {
    return { valid: false, error: 'controls must be an object' };
  }
  const kind = controls.kind ?? 'flight';
  if (kind === 'neutral') {
    return { valid: true, sanitized: { kind: 'neutral', throttle: 0, pitch: 0, yaw: 0, roll: 0 } };
  }
  if (kind !== 'flight') {
    return { valid: false, error: `unknown control kind: ${kind}` };
  }

  const throttle = typeof controls.throttle === 'number' ? Math.max(0, Math.min(1, controls.throttle)) : 0;
  const pitch = typeof controls.pitch === 'number' ? Math.max(-1, Math.min(1, controls.pitch)) : 0;
  const yaw = typeof controls.yaw === 'number' ? Math.max(-1, Math.min(1, controls.yaw)) : 0;
  const roll = typeof controls.roll === 'number' ? Math.max(-1, Math.min(1, controls.roll)) : 0;

  return {
    valid: true,
    sanitized: { kind: 'flight', throttle, pitch, yaw, roll },
  };
}

/**
 * Advances drone simulation by a given number of steps.
 *
 * @param {object} simState
 * @param {Record<number, object>} playerInputs - map of slot -> sanitized controls
 * @param {number} [steps=1]
 * @returns {{ simState: object, events: Array<{ type: string, slot: number, payload: object }>, finished: boolean }}
 */
export function stepDroneSimulation(simState, playerInputs = {}, steps = 1) {
  if (simState.status !== 'racing') {
    return { simState, events: [], finished: simState.status === 'complete' };
  }

  const state = JSON.parse(JSON.stringify(simState));
  const events = [];
  const windX = state.environment?.wind?.[0] ?? 0;
  const windZ = state.environment?.wind?.[1] ?? 0;

  for (let step = 0; step < steps; step++) {
    state.tickCount += 1;
    state.elapsedMs += Math.round(DRONE_DT * 1000);

    const activeDroneKeys = Object.keys(state.drones);

    // 1. Advance individual drones physics
    for (const key of activeDroneKeys) {
      const drone = state.drones[key];
      if (drone.finished || drone.dnf) continue;

      const input = playerInputs[key] ?? playerInputs[Number(key)] ?? { throttle: 0, pitch: 0, yaw: 0, roll: 0 };

      // Update stun countdown
      if (drone.stunTicks > 0) {
        drone.stunTicks -= 1;
      }

      // Yaw turning
      const effectiveYawInput = drone.stunTicks > 0 ? 0 : input.yaw ?? 0;
      drone.rotation[1] += effectiveYawInput * 3.5 * DRONE_DT;

      // Pitch & Roll visual tilt
      const targetPitch = (input.pitch ?? 0) * 0.45;
      const targetRoll = (input.roll ?? 0) * 0.55;
      drone.rotation[0] += (targetPitch - drone.rotation[0]) * 0.2;
      drone.rotation[2] += (targetRoll - drone.rotation[2]) * 0.2;

      // Acceleration vectors
      const currentYaw = drone.rotation[1];
      const forwardX = Math.sin(currentYaw);
      const forwardZ = -Math.cos(currentYaw);

      let ax = 0;
      let ay = 0;
      let az = 0;

      if (drone.stunTicks === 0) {
        const throttle = input.throttle ?? 0;
        const pitch = input.pitch ?? 0;
        const forwardThrust = throttle * 18.0 + pitch * 8.0;

        ax = forwardX * forwardThrust;
        az = forwardZ * forwardThrust;
        ay = (throttle - 0.42) * 14.0; // hover around 0.42 throttle
      } else {
        // Stunned: slight downward gravity
        ay = -4.0;
      }

      // Add environmental wind force
      ax += windX * 3.5;
      az += windZ * 3.5;

      // Integrate velocity with drag
      drone.velocity[0] = (drone.velocity[0] + ax * DRONE_DT) * DRONE_DRAG;
      drone.velocity[1] = (drone.velocity[1] + ay * DRONE_DT) * DRONE_DRAG;
      drone.velocity[2] = (drone.velocity[2] + az * DRONE_DT) * DRONE_DRAG;

      // Speed clamp
      const currentSpeed = Math.hypot(drone.velocity[0], drone.velocity[1], drone.velocity[2]);
      if (currentSpeed > DRONE_MAX_SPEED) {
        const scale = DRONE_MAX_SPEED / currentSpeed;
        drone.velocity[0] *= scale;
        drone.velocity[1] *= scale;
        drone.velocity[2] *= scale;
      }

      // Integrate position
      drone.position[0] += drone.velocity[0] * DRONE_DT;
      drone.position[1] += drone.velocity[1] * DRONE_DT;
      drone.position[2] += drone.velocity[2] * DRONE_DT;

      // Boundary collision check
      let collided = false;
      const b = DRONE_BOUNDS;
      if (drone.position[0] < b.minX) { drone.position[0] = b.minX; drone.velocity[0] *= -0.5; collided = true; }
      if (drone.position[0] > b.maxX) { drone.position[0] = b.maxX; drone.velocity[0] *= -0.5; collided = true; }
      if (drone.position[1] < b.minY) { drone.position[1] = b.minY; drone.velocity[1] *= -0.4; collided = true; }
      if (drone.position[1] > b.maxY) { drone.position[1] = b.maxY; drone.velocity[1] *= -0.4; collided = true; }
      if (drone.position[2] < b.minZ) { drone.position[2] = b.minZ; drone.velocity[2] *= -0.5; collided = true; }
      if (drone.position[2] > b.maxZ) { drone.position[2] = b.maxZ; drone.velocity[2] *= -0.5; collided = true; }

      if (collided) {
        drone.stunTicks = DRONE_STUN_TICKS;
        drone.collisionCount += 1;
        events.push({
          type: 'drone_collision',
          slot: drone.slot,
          payload: { slot: drone.slot, position: [...drone.position] },
        });
      }

      // Checkpoint passing
      const targetCheckpoint = DRONE_CHECKPOINTS[drone.nextCheckpoint];
      if (targetCheckpoint) {
        const dist = dist3D(drone.position, targetCheckpoint.position);
        if (dist <= targetCheckpoint.radius) {
          drone.checkpointsHit += 1;
          const checkpointIndex = drone.nextCheckpoint;
          drone.nextCheckpoint = (drone.nextCheckpoint + 1) % DRONE_CHECKPOINTS.length;

          events.push({
            type: 'checkpoint',
            slot: drone.slot,
            payload: {
              slot: drone.slot,
              checkpointIndex,
              elapsedMs: state.elapsedMs,
            },
          });

          // If loop completed (returned to 0 after hitting 5)
          if (drone.nextCheckpoint === 0) {
            const previousLapsTotal = drone.lapTimes.reduce((acc, t) => acc + t, 0);
            const currentLapDuration = state.elapsedMs - previousLapsTotal;
            drone.lapTimes.push(currentLapDuration);

            events.push({
              type: 'lap_complete',
              slot: drone.slot,
              payload: {
                slot: drone.slot,
                lap: drone.currentLap,
                lapTimeMs: currentLapDuration,
              },
            });

            if (drone.lapTimes.length >= state.totalLaps) {
              drone.finished = true;
              drone.finishTimeMs = state.elapsedMs;
              drone.totalTimeMs = state.elapsedMs;

              events.push({
                type: 'drone_finished',
                slot: drone.slot,
                payload: {
                  slot: drone.slot,
                  finishTimeMs: state.elapsedMs,
                  lapTimes: [...drone.lapTimes],
                },
              });
            } else {
              drone.currentLap += 1;
            }
          }
        }
      }
    }

    // 2. Drone-to-drone collision detection
    for (let i = 0; i < activeDroneKeys.length; i++) {
      for (let j = i + 1; j < activeDroneKeys.length; j++) {
        const d1 = state.drones[activeDroneKeys[i]];
        const d2 = state.drones[activeDroneKeys[j]];
        if (d1.finished || d1.dnf || d2.finished || d2.dnf) continue;

        const dDist = dist3D(d1.position, d2.position);
        if (dDist < 0.8 && dDist > 0.001) {
          // Repulsion impulse
          const nx = (d1.position[0] - d2.position[0]) / dDist;
          const ny = (d1.position[1] - d2.position[1]) / dDist;
          const nz = (d1.position[2] - d2.position[2]) / dDist;

          d1.velocity[0] += nx * 4.0;
          d1.velocity[1] += ny * 2.0;
          d1.velocity[2] += nz * 4.0;
          d1.stunTicks = 12;
          d1.collisionCount += 1;

          d2.velocity[0] -= nx * 4.0;
          d2.velocity[1] -= ny * 2.0;
          d2.velocity[2] -= nz * 4.0;
          d2.stunTicks = 12;
          d2.collisionCount += 1;

          events.push({
            type: 'drone_bump',
            slot: d1.slot,
            payload: { slot1: d1.slot, slot2: d2.slot },
          });
        }
      }
    }

    // 3. Check overall race completion
    const allPilots = Object.values(state.drones);
    const activePilots = allPilots.filter(d => !d.dnf);
    const allFinished = activePilots.length > 0 && activePilots.every(d => d.finished);

    if (allFinished) {
      state.status = 'complete';
      // Determine winner: pilot with lowest finishTimeMs
      const ranked = [...activePilots].sort((a, b) => (a.finishTimeMs ?? Infinity) - (b.finishTimeMs ?? Infinity));
      state.winner = ranked[0]?.slot ?? null;

      events.push({
        type: 'race_complete',
        slot: state.winner,
        payload: {
          winnerSlot: state.winner,
          winnerTimeMs: ranked[0]?.finishTimeMs ?? 0,
          rankings: ranked.map(r => ({ slot: r.slot, finishTimeMs: r.finishTimeMs, lapTimes: r.lapTimes })),
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

/**
 * Marks a pilot as DNF (did not finish) after disconnection or leave.
 *
 * @param {object} simState
 * @param {number} slot
 * @returns {object} updated simState
 */
export function markDroneDnf(simState, slot) {
  const state = JSON.parse(JSON.stringify(simState));
  if (state.drones[slot]) {
    state.drones[slot].dnf = true;
    state.drones[slot].velocity = [0, 0, 0];
  }

  // If all remaining active racers are finished, conclude race
  const active = Object.values(state.drones).filter(d => !d.dnf);
  if (active.length > 0 && active.every(d => d.finished)) {
    state.status = 'complete';
    const ranked = [...active].sort((a, b) => (a.finishTimeMs ?? Infinity) - (b.finishTimeMs ?? Infinity));
    state.winner = ranked[0]?.slot ?? null;
  }

  return state;
}
