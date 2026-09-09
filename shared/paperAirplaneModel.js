/**
 * Authoritative Paper Airplane Flight Simulation & Competition Rules.
 *
 * Part of the Place Activities Program (Phase 5, Task 7.4).
 *
 * Specifications:
 * - openspec/changes/add-place-activities-program/specs/signature-place-activities/spec.md
 *   (Requirement: Rooftop flight)
 * - design.md (D5, D7)
 *
 * Guarantees:
 * - Multi-player (1 to 2 participants) launch contest on High Awnings overlook.
 * - Angle (yaw), pitch (elevation), power (impulse), and fold style choices.
 * - Deterministic 60 Hz aerodynamic flight model with lift, drag, gravity, and frozen wind.
 * - Exact reproducible trajectories and distance calculations across JS and Elixir.
 * - 3 rounds of throws per participant with authoritative distance measurement and tie scoring.
 */

export const AIRPLANE_RULES_VERSION = 1;
export const AIRPLANE_ROUNDS = 3;
export const AIRPLANE_DT = 1 / 60;
export const AIRPLANE_MAX_FLIGHT_TIME = 12.0; // seconds

export const FOLD_STYLES = Object.freeze({
  classic: Object.freeze({
    name: 'Classic Wing',
    mass: 0.005, // 5 grams
    wingArea: 0.022, // m^2
    liftCoeff: 0.45,
    dragCoeff: 0.12,
    windSensitivity: 1.0,
  }),
  dart: Object.freeze({
    name: 'Swift Dart',
    mass: 0.006, // 6 grams
    wingArea: 0.015,
    liftCoeff: 0.28,
    dragCoeff: 0.07,
    windSensitivity: 0.65,
  }),
  glider: Object.freeze({
    name: 'Float Glider',
    mass: 0.004, // 4 grams
    wingArea: 0.032,
    liftCoeff: 0.62,
    dragCoeff: 0.16,
    windSensitivity: 1.45,
  }),
});

export const AIRPLANE_LAUNCH_BOUNDS = Object.freeze({
  minYaw: -0.75, // rad (~ -43 deg)
  maxYaw: 0.75, // rad (~ +43 deg)
  minPitch: -0.15, // rad (~ -8.5 deg)
  maxPitch: 0.80, // rad (~ +46 deg)
  minPower: 0.1,
  maxPower: 1.0,
});

/**
 * Validates and clamps paper airplane launch parameters.
 *
 * @param {any} params
 * @returns {{ valid: boolean, sanitized?: object, error?: string }}
 */
export function validateAirplaneLaunch(params) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return { valid: false, error: 'launch parameters must be an object' };
  }

  const rawFold = typeof params.foldStyle === 'string' ? params.foldStyle.toLowerCase() : 'classic';
  const foldStyle = FOLD_STYLES[rawFold] ? rawFold : 'classic';

  const rawYaw = Number(params.yaw);
  const yaw = Number.isFinite(rawYaw)
    ? Math.max(AIRPLANE_LAUNCH_BOUNDS.minYaw, Math.min(AIRPLANE_LAUNCH_BOUNDS.maxYaw, rawYaw))
    : 0.0;

  const rawPitch = Number(params.pitch);
  const pitch = Number.isFinite(rawPitch)
    ? Math.max(AIRPLANE_LAUNCH_BOUNDS.minPitch, Math.min(AIRPLANE_LAUNCH_BOUNDS.maxPitch, rawPitch))
    : 0.25;

  const rawPower = Number(params.power);
  const power = Number.isFinite(rawPower)
    ? Math.max(AIRPLANE_LAUNCH_BOUNDS.minPower, Math.min(AIRPLANE_LAUNCH_BOUNDS.maxPower, rawPower))
    : 0.6;

  return {
    valid: true,
    sanitized: {
      foldStyle,
      yaw,
      pitch,
      power,
    },
  };
}

/**
 * Simulates a full aerodynamic paper airplane flight deterministically.
 *
 * @param {object} launch - Sanitized launch parameters { yaw, pitch, power, foldStyle }
 * @param {object} [environment] - Versioned environment { wind: [wx, wz], windSpeed }
 * @param {number[]} [originPos=[7.5, 1.2, -7.5]] - Launch origin [x, y, z]
 * @returns {{
 *   trajectory: Array<{ x: number, y: number, z: number, t: number, vx: number, vy: number, vz: number }>,
 *   landingPos: [number, number, number],
 *   distance: number,
 *   flightTimeMs: number
 * }}
 */
export function simulateAirplaneTrajectory(
  launch,
  environment = null,
  originPos = [7.5, 1.2, -7.5]
) {
  const fold = FOLD_STYLES[launch.foldStyle] || FOLD_STYLES.classic;
  const windX = (environment?.wind?.[0] ?? 0.0) * fold.windSensitivity;
  const windZ = (environment?.wind?.[1] ?? 0.0) * fold.windSensitivity;

  // Initial speed (m/s)
  const v0 = 5.0 + launch.power * 16.0;

  // Heading is North (-Z) with yaw offset
  const forwardX = Math.sin(launch.yaw);
  const forwardZ = -Math.cos(launch.yaw);
  const cosPitch = Math.cos(launch.pitch);
  const sinPitch = Math.sin(launch.pitch);

  let px = originPos[0];
  let py = originPos[1];
  let pz = originPos[2];

  let vx = forwardX * cosPitch * v0;
  let vy = sinPitch * v0;
  let vz = forwardZ * cosPitch * v0;

  const trajectory = [{ x: px, y: py, z: pz, t: 0, vx, vy, vz }];
  const gravity = 9.81;
  const airDensity = 1.225;

  let t = 0;
  const maxTicks = Math.round(AIRPLANE_MAX_FLIGHT_TIME / AIRPLANE_DT);

  for (let tick = 0; tick < maxTicks; tick++) {
    t += AIRPLANE_DT;

    // Relative airspeed accounting for wind
    const relVx = vx - windX;
    const relVz = vz - windZ;
    const hSpeedSq = relVx * relVx + relVz * relVz;
    const relSpeed = Math.hypot(relVx, vy, relVz);

    if (relSpeed > 0.001) {
      const qH = 0.5 * airDensity * hSpeedSq;
      const liftY = Math.min(fold.mass * gravity * 1.6, qH * fold.wingArea * fold.liftCoeff);

      const dragFactor = 0.5 * airDensity * relSpeed * fold.wingArea * fold.dragCoeff;
      const ax = -dragFactor * relVx / fold.mass;
      const ay = (liftY - dragFactor * vy) / fold.mass - gravity;
      const az = -dragFactor * relVz / fold.mass;

      vx += ax * AIRPLANE_DT;
      vy += ay * AIRPLANE_DT;
      vz += az * AIRPLANE_DT;
    } else {
      vy -= gravity * AIRPLANE_DT;
    }

    px += vx * AIRPLANE_DT;
    py += vy * AIRPLANE_DT;
    pz += vz * AIRPLANE_DT;

    trajectory.push({
      x: Math.round(px * 1000) / 1000,
      y: Math.round(py * 1000) / 1000,
      z: Math.round(pz * 1000) / 1000,
      t: Math.round(t * 1000) / 1000,
      vx: Math.round(vx * 1000) / 1000,
      vy: Math.round(vy * 1000) / 1000,
      vz: Math.round(vz * 1000) / 1000,
    });

    // Touchdown condition: hits roof deck or street level (y <= 0)
    if (py <= 0.0) {
      py = 0.0;
      break;
    }
  }

  const dx = px - originPos[0];
  const dz = pz - originPos[2];
  const distance = Math.round(Math.hypot(dx, dz) * 100) / 100;
  const flightTimeMs = Math.round(t * 1000);

  return {
    trajectory,
    landingPos: [Math.round(px * 100) / 100, Math.round(py * 100) / 100, Math.round(pz * 100) / 100],
    distance,
    flightTimeMs,
  };
}

/**
 * Initializes simulation state for a paper airplane session.
 *
 * @param {object} [opts]
 * @param {number[]} [opts.activeSlots=[0, 1]]
 * @param {object} [opts.environment]
 * @returns {object}
 */
export function initAirplaneSimState({ activeSlots = [0, 1], environment = null } = {}) {
  const players = {};
  for (const slot of activeSlots) {
    players[slot] = {
      slot,
      currentRound: 1,
      throws: [],
      bestDistance: 0.0,
      currentFlight: null, // { launch, trajectory, landingPos, distance, flightTimeMs, elapsedMs }
      readyForThrow: false,
    };
  }

  return {
    totalRounds: AIRPLANE_ROUNDS,
    currentRound: 1,
    status: 'aiming', // 'aiming', 'flying', 'complete'
    activeSlots: [...activeSlots],
    players,
    winner: null,
    standings: [],
    environment: environment ? { ...environment } : null,
  };
}

/**
 * Handles a player's launch action in the simulation.
 *
 * @param {object} simState
 * @param {number} slot
 * @param {object} launchParams
 * @returns {{ simState: object, event: object|null }}
 */
export function executeAirplaneLaunch(simState, slot, launchParams) {
  if (simState.status === 'complete') {
    return { simState, event: null };
  }

  const state = JSON.parse(JSON.stringify(simState));
  const player = state.players[slot] ?? state.players[String(slot)];
  if (!player) return { simState, event: null };

  const valid = validateAirplaneLaunch(launchParams);
  if (!valid.valid) return { simState, event: null };

  const launch = valid.sanitized;
  const originX = 7.0 + slot * 0.8;
  const origin = [originX, 1.2, -7.5];

  const result = simulateAirplaneTrajectory(launch, state.environment, origin);

  const throwRecord = {
    round: player.currentRound,
    launch,
    origin,
    landingPos: result.landingPos,
    distance: result.distance,
    flightTimeMs: result.flightTimeMs,
    trajectory: result.trajectory,
  };

  player.throws.push(throwRecord);
  player.bestDistance = Math.max(player.bestDistance, result.distance);
  player.currentFlight = throwRecord;

  // Check if all players completed this round
  const allPlayers = Object.values(state.players);
  const allThrownThisRound = allPlayers.every(p => p.throws.length >= p.currentRound);

  if (allThrownThisRound) {
    if (state.currentRound >= state.totalRounds) {
      state.status = 'complete';
      // Build standings
      const ranked = [...allPlayers].sort((a, b) => {
        if (b.bestDistance !== a.bestDistance) return b.bestDistance - a.bestDistance;
        // Tie-breaker: second best throw
        const aThrows = [...a.throws].map(t => t.distance).sort((x, y) => y - x);
        const bThrows = [...b.throws].map(t => t.distance).sort((x, y) => y - x);
        for (let i = 1; i < aThrows.length; i++) {
          const diff = (bThrows[i] ?? 0) - (aThrows[i] ?? 0);
          if (Math.abs(diff) > 0.001) return diff;
        }
        return 0;
      });

      state.winner = ranked[0]?.slot ?? null;
      state.standings = ranked.map((p, idx) => ({
        rank: idx + 1,
        slot: p.slot,
        bestDistance: p.bestDistance,
        throws: p.throws.map(t => t.distance),
      }));
    } else {
      state.currentRound += 1;
      for (const p of allPlayers) {
        p.currentRound = state.currentRound;
      }
    }
  }

  const event = {
    type: 'airplane_launched',
    slot,
    payload: {
      slot,
      round: throwRecord.round,
      launch,
      distance: result.distance,
      flightTimeMs: result.flightTimeMs,
      landingPos: result.landingPos,
      trajectory: result.trajectory,
    },
  };

  return { simState: state, event };
}
