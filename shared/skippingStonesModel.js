/**
 * Authoritative skipping-stones simulation (Phase 5, Task 9.4).
 *
 * Specifications:
 * - openspec/changes/add-place-activities-program/specs/signature-place-activities/spec.md
 *   (Requirement: Foundry and marsh activities)
 * - design.md (D5, D7)
 *
 * Guarantees:
 * - Angle / power launches under FROZEN wind/rain reproduce skip count and
 *   distance across clients.
 * - Shared outcomes; leaving or sinking cleans that throw without touching
 *   the other shoreline.
 * - One module reused at Basin (mangrove) and Marshes (delta) via transform.
 */

export const SKIP_RULES_VERSION = 1;
export const SKIP_DT = 1 / 60;
export const SKIP_WATER_Y = 0.22;
export const SKIP_MAX_FLIGHT_TIME = 8;
export const SKIP_CLEANUP_TICKS = 480;
export const SKIP_MAX_SKIPS = 12;

export const SKIP_LAUNCH_BOUNDS = Object.freeze({
  minAngle: 0.06,
  maxAngle: 0.55,
  minPower: 0.15,
  maxPower: 1,
});

export const SKIP_ORIGINS = Object.freeze([
  Object.freeze({ x: -0.35, y: 0.95, z: 0.15 }),
  Object.freeze({ x: 0.35, y: 0.95, z: 0.15 }),
  Object.freeze({ x: -0.12, y: 0.95, z: 0.32 }),
  Object.freeze({ x: 0.12, y: 0.95, z: 0.32 }),
]);

export const SKIPPER_COLORS = Object.freeze(['#38bdf8', '#edb66c', '#a78bfa', '#e8563f']);

export const DEFAULT_SKIP_ENVIRONMENT = Object.freeze({
  version: 1,
  policy: 'frozen',
  preset: null,
  wind: Object.freeze([0, 0]),
  windSpeed: 0,
  rain: 0.2,
  intensity: 0.25,
  wetness: 0.35,
  timePhase: 0.4,
  frozenAt: 0,
});

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function clamp01(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return clamp(n, 0, 1);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function originFor(slot) {
  return SKIP_ORIGINS[slot] ?? SKIP_ORIGINS[0];
}

export function normalizeSkipEnvironment(env) {
  if (!env || typeof env !== 'object' || Array.isArray(env)) {
    return { ...DEFAULT_SKIP_ENVIRONMENT, wind: [0, 0] };
  }
  const wx = Number(env.wind?.[0]);
  const wz = Number(env.wind?.[1]);
  const wind = [
    Number.isFinite(wx) ? clamp(wx, -1, 1) : 0,
    Number.isFinite(wz) ? clamp(wz, -1, 1) : 0,
  ];
  const frozenAt = Number.isFinite(Number(env.frozenAt)) ? Number(env.frozenAt) : 0;
  return {
    version: 1,
    policy: 'frozen',
    preset: typeof env.preset === 'string' ? env.preset : null,
    wind,
    windSpeed: Number.isFinite(Number(env.windSpeed))
      ? Math.max(0, Number(env.windSpeed))
      : Math.hypot(wind[0], wind[1]),
    rain: clamp01(env.rain ?? DEFAULT_SKIP_ENVIRONMENT.rain),
    intensity: clamp01(env.intensity ?? DEFAULT_SKIP_ENVIRONMENT.intensity),
    wetness: clamp01(env.wetness ?? DEFAULT_SKIP_ENVIRONMENT.wetness),
    timePhase: clamp01(env.timePhase ?? DEFAULT_SKIP_ENVIRONMENT.timePhase),
    frozenAt,
  };
}

export function validateSkipLaunch(params) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return { valid: false, error: 'launch parameters must be an object' };
  }
  const rawAngle = Number(params.angle ?? params.pitch);
  const angle = Number.isFinite(rawAngle)
    ? clamp(rawAngle, SKIP_LAUNCH_BOUNDS.minAngle, SKIP_LAUNCH_BOUNDS.maxAngle)
    : 0.22;
  const rawPower = Number(params.power);
  const power = Number.isFinite(rawPower)
    ? clamp(rawPower, SKIP_LAUNCH_BOUNDS.minPower, SKIP_LAUNCH_BOUNDS.maxPower)
    : 0.65;
  const rawYaw = Number(params.yaw);
  const yaw = Number.isFinite(rawYaw) ? clamp(rawYaw, -0.35, 0.35) : 0;
  return { valid: true, sanitized: { kind: 'launch', angle, power, yaw } };
}

export function validateSkippingInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, error: 'input must be an object' };
  }
  const kind = typeof input.kind === 'string' ? input.kind : 'launch';
  if (kind === 'neutral') return { valid: true, sanitized: { kind: 'neutral' } };
  if (kind === 'leave') return { valid: true, sanitized: { kind: 'leave' } };
  if (kind === 'environment') {
    return {
      valid: true,
      sanitized: {
        kind: 'environment',
        environment: normalizeSkipEnvironment(input.environment),
      },
    };
  }
  if (kind === 'launch') return validateSkipLaunch(input);
  return { valid: false, error: `unknown input kind: ${kind}` };
}

function r3(v) {
  return Math.round(v * 1000) / 1000;
}

/**
 * Deterministic skip trajectory under frozen wind/rain.
 */
export function simulateSkipTrajectory(launch, environment = null, originPos = null) {
  const env = normalizeSkipEnvironment(environment);
  const origin = originPos || [0, 0.95, 0.15];
  const v0 = 5.5 + launch.power * 9.5;
  const yaw = launch.yaw || 0;
  const angle = launch.angle;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  let px = origin[0];
  let py = origin[1];
  let pz = origin[2];
  let vx = Math.sin(yaw) * cosA * v0;
  let vy = sinA * v0;
  let vz = -Math.cos(yaw) * cosA * v0;

  const trajectory = [{ x: r3(px), y: r3(py), z: r3(pz), t: 0, vx: r3(vx), vy: r3(vy), vz: r3(vz), skip: false }];
  const skipPositions = [];
  let skips = 0;
  let t = 0;
  const maxTicks = Math.round(SKIP_MAX_FLIGHT_TIME / SKIP_DT);
  const rain = env.rain;
  const wetChop = rain * 0.35;
  const windX = env.wind[0];
  const windZ = env.wind[1];

  for (let tick = 0; tick < maxTicks; tick++) {
    t += SKIP_DT;
    vy -= 9.81 * SKIP_DT;
    vx += windX * 0.8 * SKIP_DT;
    vz += windZ * 0.8 * SKIP_DT;
    vx *= 0.997;
    vz *= 0.997;

    px += vx * SKIP_DT;
    py += vy * SKIP_DT;
    pz += vz * SKIP_DT;

    let didSkip = false;
    if (py <= SKIP_WATER_Y) {
      const hs = Math.hypot(vx, vz);
      const incidence = Math.atan2(-vy, Math.max(hs, 0.01));
      const canSkip = hs > (2.4 + wetChop * 2)
        && incidence >= 0.08
        && incidence <= 0.42
        && skips < SKIP_MAX_SKIPS;
      if (canSkip) {
        skips += 1;
        didSkip = true;
        vy = Math.abs(vy) * (0.58 - wetChop * 0.25);
        vx *= (0.84 - wetChop * 0.12);
        vz *= (0.84 - wetChop * 0.12);
        py = SKIP_WATER_Y + 0.01;
        skipPositions.push([r3(px), r3(SKIP_WATER_Y), r3(pz)]);
      } else {
        py = SKIP_WATER_Y;
        trajectory.push({
          x: r3(px), y: r3(py), z: r3(pz), t: r3(t),
          vx: r3(vx), vy: r3(vy), vz: r3(vz), skip: false,
        });
        break;
      }
    }

    trajectory.push({
      x: r3(px), y: r3(py), z: r3(pz), t: r3(t),
      vx: r3(vx), vy: r3(vy), vz: r3(vz), skip: didSkip,
    });
  }

  const dx = px - origin[0];
  const dz = pz - origin[2];
  const distance = Math.round(Math.hypot(dx, dz) * 100) / 100;
  return {
    trajectory,
    skipPositions,
    skips,
    distance,
    landingPos: [r3(px), r3(py), r3(pz)],
    flightTimeMs: Math.round(t * 1000),
  };
}

function makeThrower(slot) {
  const o = originFor(slot);
  return {
    slot,
    phase: 'idle',
    currentThrow: null,
    lastThrow: null,
    bestSkips: 0,
    bestDistance: 0,
    cleanupTicks: 0,
    consumedKind: null,
    origin: [o.x, o.y, o.z],
  };
}

export function initSkippingState({
  activeSlots = [0, 1],
  environment = null,
  nowMs = 0,
} = {}) {
  const throwers = {};
  for (const slot of activeSlots) {
    throwers[slot] = makeThrower(slot);
  }
  return {
    rulesVersion: SKIP_RULES_VERSION,
    status: 'open',
    tickCount: 0,
    elapsedMs: 0,
    environment: normalizeSkipEnvironment(environment ?? { ...DEFAULT_SKIP_ENVIRONMENT, frozenAt: nowMs }),
    throwers,
  };
}

function applyLaunch(state, thrower, launch) {
  if (thrower.phase === 'flying') return null;
  const origin = thrower.origin;
  const result = simulateSkipTrajectory(launch, state.environment, origin);
  thrower.phase = 'flying';
  thrower.cleanupTicks = 0;
  thrower.currentThrow = {
    launch,
    origin,
    trajectory: result.trajectory,
    skipPositions: result.skipPositions,
    skips: result.skips,
    distance: result.distance,
    landingPos: result.landingPos,
    flightTimeMs: result.flightTimeMs,
    elapsedMs: 0,
    sunk: false,
  };
  thrower.bestSkips = Math.max(thrower.bestSkips, result.skips);
  thrower.bestDistance = Math.max(thrower.bestDistance, result.distance);
  return {
    type: 'stone_launched',
    slot: thrower.slot,
    payload: {
      slot: thrower.slot,
      launch,
      skips: result.skips,
      distance: result.distance,
      landingPos: result.landingPos,
      flightTimeMs: result.flightTimeMs,
      trajectory: result.trajectory,
      skipPositions: result.skipPositions,
    },
  };
}

function clearThrower(thrower) {
  thrower.phase = 'idle';
  thrower.currentThrow = null;
  thrower.cleanupTicks = 0;
}

export function applySkippingInput(simState, slot, input) {
  const valid = validateSkippingInput(input);
  if (!valid.valid) {
    return { simState, event: null, error: valid.error };
  }
  const state = clone(simState);
  const sanitized = valid.sanitized;

  if (sanitized.kind === 'environment') {
    // Competitive start snapshot is frozen; later weather must not rewrite it.
    return { simState: state, event: null };
  }

  const thrower = state.throwers[slot] ?? state.throwers[String(slot)];
  if (!thrower) return { simState, event: null, error: 'unknown_slot' };

  if (sanitized.kind === 'neutral') {
    thrower.consumedKind = null;
    return { simState: state, event: null };
  }
  if (sanitized.kind === 'leave') {
    clearThrower(thrower);
    thrower.consumedKind = null;
    return {
      simState: state,
      event: { type: 'stone_cleared', slot: thrower.slot, payload: { slot: thrower.slot } },
    };
  }
  if (sanitized.kind === 'launch') {
    const event = applyLaunch(state, thrower, sanitized);
    if (event) thrower.consumedKind = 'launch';
    return { simState: state, event };
  }
  return { simState: state, event: null };
}

export function clearThrow(simState, slot) {
  const state = clone(simState);
  const thrower = state.throwers[slot] ?? state.throwers[String(slot)];
  if (thrower) clearThrower(thrower);
  return state;
}

function consumeKind(thrower, kind) {
  if (!kind || kind === 'neutral') {
    thrower.consumedKind = null;
    return false;
  }
  if (thrower.consumedKind === kind) return false;
  thrower.consumedKind = kind;
  return true;
}

function stepThrower(thrower) {
  const events = [];
  const flight = thrower.currentThrow;
  if (!flight) return events;

  if (!flight.sunk) {
    flight.elapsedMs += Math.round(SKIP_DT * 1000);
    if (flight.elapsedMs >= flight.flightTimeMs) {
      flight.sunk = true;
      flight.elapsedMs = flight.flightTimeMs;
      thrower.phase = 'sunk';
      thrower.lastThrow = {
        skips: flight.skips,
        distance: flight.distance,
        landingPos: flight.landingPos,
        launch: flight.launch,
      };
      thrower.cleanupTicks = SKIP_CLEANUP_TICKS;
      events.push({
        type: 'stone_sunk',
        slot: thrower.slot,
        payload: {
          slot: thrower.slot,
          skips: flight.skips,
          distance: flight.distance,
          landingPos: flight.landingPos,
        },
      });
    }
    return events;
  }

  thrower.cleanupTicks -= 1;
  if (thrower.cleanupTicks <= 0) {
    clearThrower(thrower);
    events.push({ type: 'stone_cleared', slot: thrower.slot, payload: { slot: thrower.slot } });
  }
  return events;
}

export function stepSkippingSimulation(simState, playerInputs = {}, steps = 1) {
  const state = clone(simState);
  const events = [];

  for (let step = 0; step < steps; step++) {
    state.tickCount += 1;
    state.elapsedMs += Math.round(SKIP_DT * 1000);

    for (const key of Object.keys(state.throwers)) {
      const thrower = state.throwers[key];
      const input = playerInputs[thrower.slot] ?? playerInputs[key] ?? playerInputs[Number(key)];
      if (input) {
        const valid = validateSkippingInput(input);
        if (valid.valid) {
          const kind = valid.sanitized.kind;
          if (kind === 'neutral') {
            thrower.consumedKind = null;
          } else if (kind === 'environment') {
            // start snapshot stays frozen
          } else if (consumeKind(thrower, kind)) {
            if (kind === 'launch') {
              const ev = applyLaunch(state, thrower, valid.sanitized);
              if (ev) events.push(ev);
            } else if (kind === 'leave') {
              clearThrower(thrower);
              events.push({ type: 'stone_cleared', slot: thrower.slot, payload: { slot: thrower.slot } });
            }
          }
        }
      }
      events.push(...stepThrower(thrower));
    }
  }

  return { simState: state, events, finished: false };
}
