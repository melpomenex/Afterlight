/**
 * Authoritative shoreline fishing simulation (Phase 5, Task 9.3).
 *
 * Specifications:
 * - openspec/changes/add-place-activities-program/specs/signature-place-activities/spec.md
 *   (Requirement: Foundry and marsh activities — Fishing together)
 * - design.md (D5, D7)
 *
 * Guarantees:
 * - Cast / bobber / bite / reel / release with live timestamped weather/time.
 * - Nearby visitors see every line and bobber; reel and leave are independent.
 * - Catch/release is social display only: no inventory, economy, crop, or
 *   required progression fields are written.
 * - One module reused at Basin (mangrove) and Marshes (delta) via transform.
 */

export const FISHING_RULES_VERSION = 1;
export const FISHING_DT = 1 / 60;
export const FISHING_WATER_Y = 0.22;
export const FISHING_MIN_CAST = 2.0;
export const FISHING_MAX_CAST = 6.5;
export const FISHING_CAST_TICKS = 24;
export const FISHING_BITE_WINDOW_TICKS = 180;
export const FISHING_REEL_TICKS = 90;
export const FISHING_RECENT_RELEASE_CAP = 8;

export const FISHING_ROD_ORIGINS = Object.freeze([
  Object.freeze({ x: -0.45, y: 1.15, z: 0.2 }),
  Object.freeze({ x: 0.45, y: 1.15, z: 0.2 }),
  Object.freeze({ x: -0.2, y: 1.15, z: 0.4 }),
  Object.freeze({ x: 0.2, y: 1.15, z: 0.4 }),
]);

export const ANGLER_COLORS = Object.freeze(['#38bdf8', '#edb66c', '#a78bfa', '#e8563f']);

export const FISH_SPECIES = Object.freeze([
  'basin-minnow',
  'reed-sunfish',
  'silver-perch',
  'storm-eel',
  'dusk-catfish',
  'dawn-shiner',
  'skipjack',
]);

export const DEFAULT_FISHING_ENVIRONMENT = Object.freeze({
  version: 1,
  policy: 'live',
  preset: null,
  wind: Object.freeze([0, 0]),
  windSpeed: 0,
  rain: 0.25,
  intensity: 0.3,
  wetness: 0.4,
  timePhase: 0.4,
  frozenAt: null,
});

const ECONOMY_KEYS = Object.freeze([
  'gold', 'ash', 'coins', 'currency', 'xp', 'inventory', 'itemId', 'crop', 'harvest',
]);

function clamp01(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function rodOrigin(slot) {
  return FISHING_ROD_ORIGINS[slot] ?? FISHING_ROD_ORIGINS[0];
}

export function normalizeFishingEnvironment(env) {
  if (!env || typeof env !== 'object' || Array.isArray(env)) {
    return { ...DEFAULT_FISHING_ENVIRONMENT, wind: [0, 0] };
  }
  const wx = Number(env.wind?.[0]);
  const wz = Number(env.wind?.[1]);
  const wind = [
    Number.isFinite(wx) ? clamp(wx, -1, 1) : 0,
    Number.isFinite(wz) ? clamp(wz, -1, 1) : 0,
  ];
  return {
    version: 1,
    policy: env.policy === 'frozen' ? 'frozen' : 'live',
    preset: typeof env.preset === 'string' ? env.preset : null,
    wind,
    windSpeed: Number.isFinite(Number(env.windSpeed))
      ? Math.max(0, Number(env.windSpeed))
      : Math.hypot(wind[0], wind[1]),
    rain: clamp01(env.rain ?? DEFAULT_FISHING_ENVIRONMENT.rain),
    intensity: clamp01(env.intensity ?? DEFAULT_FISHING_ENVIRONMENT.intensity),
    wetness: clamp01(env.wetness ?? DEFAULT_FISHING_ENVIRONMENT.wetness),
    timePhase: clamp01(env.timePhase ?? DEFAULT_FISHING_ENVIRONMENT.timePhase),
    frozenAt: env.policy === 'frozen' && Number.isFinite(Number(env.frozenAt))
      ? Number(env.frozenAt)
      : null,
  };
}

/**
 * 32-bit unsigned unit noise in [0, 1). Matches the Elixir port.
 */
export function fishingUnitNoise(seed, slot, tick) {
  const a = Math.imul(seed | 0, 1664525);
  const b = Math.imul(slot | 0, 1013904223);
  const c = Math.imul(tick | 0, 2246822519);
  const n = (a + b + c) >>> 0;
  return (n % 10000) / 10000;
}

export function biteChancePerTick(environment) {
  const env = normalizeFishingEnvironment(environment);
  const dawn = Math.max(0, 1 - Math.abs(env.timePhase - 0.15) / 0.2);
  const dusk = Math.max(0, 1 - Math.abs(env.timePhase - 0.85) / 0.2);
  const twilight = Math.max(dawn, dusk);
  return 0.003 + env.rain * 0.006 + twilight * 0.004;
}

export function pickSpecies(environment, seed, slot, tick) {
  const env = normalizeFishingEnvironment(environment);
  const n = fishingUnitNoise(seed + 7, slot, tick);
  const twilight = Math.max(
    Math.max(0, 1 - Math.abs(env.timePhase - 0.15) / 0.2),
    Math.max(0, 1 - Math.abs(env.timePhase - 0.85) / 0.2),
  );
  if (env.rain > 0.55) return n > 0.5 ? 'silver-perch' : 'storm-eel';
  if (twilight > 0.5) return n > 0.4 ? 'dusk-catfish' : 'dawn-shiner';
  if (env.windSpeed > 0.45) return 'skipjack';
  return n > 0.5 ? 'reed-sunfish' : 'basin-minnow';
}

function makeAngler(slot) {
  const origin = rodOrigin(slot);
  return {
    slot,
    phase: 'idle',
    power: 0,
    origin: [origin.x, origin.y, origin.z],
    rodTip: [origin.x, origin.y, origin.z],
    bobber: null,
    line: null,
    biteTicksLeft: 0,
    reelTicksLeft: 0,
    castTicksLeft: 0,
    lastCatch: null,
    consumedKind: null,
  };
}

function assertNoEconomy(record) {
  if (!record || typeof record !== 'object') return;
  for (const key of ECONOMY_KEYS) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      delete record[key];
    }
  }
}

function setLine(angler) {
  if (!angler.bobber) {
    angler.line = null;
    return;
  }
  angler.line = [angler.rodTip.slice(), angler.bobber.slice()];
}

function landingFromCast(origin, power, env) {
  const dist = FISHING_MIN_CAST + power * (FISHING_MAX_CAST - FISHING_MIN_CAST);
  const x = origin[0] + env.wind[0] * 0.8;
  const z = origin[2] - dist + env.wind[1] * 0.4;
  return [
    Math.round(x * 1000) / 1000,
    FISHING_WATER_Y,
    Math.round(z * 1000) / 1000,
  ];
}

/**
 * @param {object} [opts]
 * @param {number[]} [opts.activeSlots]
 * @param {object} [opts.environment]
 * @param {number} [opts.seed]
 * @param {number} [opts.nowMs]
 */
export function initFishingState({
  activeSlots = [0, 1],
  environment = null,
  seed = 42,
  nowMs = 0,
} = {}) {
  const env = normalizeFishingEnvironment(environment);
  const anglers = {};
  for (const slot of activeSlots) {
    anglers[slot] = makeAngler(slot);
  }
  return {
    rulesVersion: FISHING_RULES_VERSION,
    status: 'open',
    tickCount: 0,
    elapsedMs: 0,
    seed,
    environment: env,
    environmentAt: nowMs,
    anglers,
    recentReleases: [],
  };
}

export function validateFishingInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, error: 'input must be an object' };
  }
  const kind = typeof input.kind === 'string' ? input.kind : '';
  if (kind === 'neutral') {
    return { valid: true, sanitized: { kind: 'neutral' } };
  }
  if (kind === 'cast') {
    const raw = Number(input.power);
    const power = Number.isFinite(raw) ? clamp(raw, 0.15, 1) : 0.65;
    return { valid: true, sanitized: { kind: 'cast', power } };
  }
  if (kind === 'reel' || kind === 'release' || kind === 'leave') {
    return { valid: true, sanitized: { kind } };
  }
  if (kind === 'environment') {
    return {
      valid: true,
      sanitized: {
        kind: 'environment',
        environment: normalizeFishingEnvironment(input.environment),
        nowMs: Number.isFinite(Number(input.nowMs)) ? Number(input.nowMs) : 0,
      },
    };
  }
  return { valid: false, error: `unknown input kind: ${kind}` };
}

export function applyFishingEnvironment(simState, environment, nowMs = 0) {
  const state = clone(simState);
  state.environment = normalizeFishingEnvironment(environment);
  state.environmentAt = Number.isFinite(Number(nowMs)) ? Number(nowMs) : state.environmentAt;
  return state;
}

function consumeKind(angler, kind) {
  if (!kind || kind === 'neutral') {
    angler.consumedKind = null;
    return false;
  }
  if (angler.consumedKind === kind) return false;
  angler.consumedKind = kind;
  return true;
}

function applyCast(state, angler, power) {
  if (angler.phase !== 'idle') return null;
  const env = state.environment;
  const landing = landingFromCast(angler.origin, power, env);
  angler.phase = 'casting';
  angler.power = power;
  angler.castTicksLeft = FISHING_CAST_TICKS;
  angler.bobber = [angler.origin[0], angler.origin[1], angler.origin[2]];
  angler.castTarget = landing;
  setLine(angler);
  return {
    type: 'line_cast',
    slot: angler.slot,
    payload: { slot: angler.slot, power, landing },
  };
}

function applyReel(state, angler) {
  if (angler.phase !== 'bite') return null;
  const species = pickSpecies(state.environment, state.seed, angler.slot, state.tickCount);
  const lengthCm = Math.round((12 + fishingUnitNoise(state.seed + 3, angler.slot, state.tickCount + 1) * 28) * 10) / 10;
  angler.phase = 'reeling';
  angler.reelTicksLeft = FISHING_REEL_TICKS;
  angler.biteTicksLeft = 0;
  angler.lastCatch = {
    species,
    lengthCm,
    released: false,
    environmentAt: state.environmentAt,
  };
  assertNoEconomy(angler.lastCatch);
  return {
    type: 'fish_hooked',
    slot: angler.slot,
    payload: { slot: angler.slot, species, lengthCm },
  };
}

function applyRelease(state, angler) {
  if (angler.phase !== 'catch' || !angler.lastCatch) return null;
  angler.lastCatch.released = true;
  assertNoEconomy(angler.lastCatch);
  state.recentReleases = [
    {
      slot: angler.slot,
      species: angler.lastCatch.species,
      lengthCm: angler.lastCatch.lengthCm,
      tick: state.tickCount,
    },
    ...state.recentReleases,
  ].slice(0, FISHING_RECENT_RELEASE_CAP);
  const event = {
    type: 'fish_released',
    slot: angler.slot,
    payload: {
      slot: angler.slot,
      species: angler.lastCatch.species,
      lengthCm: angler.lastCatch.lengthCm,
    },
  };
  resetAnglerLine(angler);
  return event;
}

function resetAnglerLine(angler) {
  angler.phase = 'idle';
  angler.bobber = null;
  angler.line = null;
  angler.castTarget = null;
  angler.biteTicksLeft = 0;
  angler.reelTicksLeft = 0;
  angler.castTicksLeft = 0;
}

/**
 * Discrete authoritative input (cast / reel / release / leave / live env).
 */
export function applyFishingInput(simState, slot, input) {
  const valid = validateFishingInput(input);
  if (!valid.valid) {
    return { simState, event: null, error: valid.error };
  }
  const state = clone(simState);
  const sanitized = valid.sanitized;

  if (sanitized.kind === 'environment') {
    state.environment = sanitized.environment;
    state.environmentAt = sanitized.nowMs;
    return { simState: state, event: { type: 'environment', payload: { environmentAt: sanitized.nowMs } } };
  }

  const angler = state.anglers[slot] ?? state.anglers[String(slot)];
  if (!angler) {
    return { simState, event: null, error: 'unknown_slot' };
  }

  if (sanitized.kind === 'neutral') {
    angler.consumedKind = null;
    return { simState: state, event: null };
  }

  let event = null;
  if (sanitized.kind === 'cast') event = applyCast(state, angler, sanitized.power);
  else if (sanitized.kind === 'reel') event = applyReel(state, angler);
  else if (sanitized.kind === 'release') event = applyRelease(state, angler);
  else if (sanitized.kind === 'leave') {
    resetAnglerLine(angler);
    angler.consumedKind = null;
    event = { type: 'line_cleared', slot: angler.slot, payload: { slot: angler.slot } };
  }

  if (event) angler.consumedKind = sanitized.kind;
  return { simState: state, event };
}

export function clearAngler(simState, slot) {
  const state = clone(simState);
  const angler = state.anglers[slot] ?? state.anglers[String(slot)];
  if (!angler) return state;
  resetAnglerLine(angler);
  angler.consumedKind = null;
  return state;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function stepAngler(state, angler) {
  const env = state.environment;
  const events = [];

  if (angler.phase === 'casting') {
    angler.castTicksLeft -= 1;
    const t = 1 - Math.max(0, angler.castTicksLeft) / FISHING_CAST_TICKS;
    const target = angler.castTarget;
    const ox = angler.origin[0];
    const oy = angler.origin[1];
    const oz = angler.origin[2];
    const arc = Math.sin(Math.min(1, t) * Math.PI) * 0.85;
    angler.bobber = [
      Math.round(lerp(ox, target[0], t) * 1000) / 1000,
      Math.round((lerp(oy, FISHING_WATER_Y, t) + arc * (1 - t)) * 1000) / 1000,
      Math.round(lerp(oz, target[2], t) * 1000) / 1000,
    ];
    setLine(angler);
    if (angler.castTicksLeft <= 0) {
      angler.phase = 'waiting';
      angler.bobber = target.slice();
      setLine(angler);
      events.push({ type: 'bobber_landed', slot: angler.slot, payload: { slot: angler.slot, bobber: angler.bobber } });
    }
    return events;
  }

  if (angler.phase === 'waiting') {
    const driftX = env.wind[0] * 0.15 * FISHING_DT;
    const driftZ = env.wind[1] * 0.1 * FISHING_DT;
    angler.bobber[0] = Math.round((angler.bobber[0] + driftX) * 1000) / 1000;
    angler.bobber[2] = Math.round((angler.bobber[2] + driftZ) * 1000) / 1000;
    angler.bobber[1] = FISHING_WATER_Y;
    setLine(angler);
    const chance = biteChancePerTick(env);
    if (fishingUnitNoise(state.seed, angler.slot, state.tickCount) < chance) {
      angler.phase = 'bite';
      angler.biteTicksLeft = FISHING_BITE_WINDOW_TICKS;
      events.push({ type: 'bite', slot: angler.slot, payload: { slot: angler.slot, environmentAt: state.environmentAt } });
    }
    return events;
  }

  if (angler.phase === 'bite') {
    angler.bobber[1] = FISHING_WATER_Y - 0.08;
    setLine(angler);
    angler.biteTicksLeft -= 1;
    if (angler.biteTicksLeft <= 0) {
      resetAnglerLine(angler);
      events.push({ type: 'bite_missed', slot: angler.slot, payload: { slot: angler.slot } });
    }
    return events;
  }

  if (angler.phase === 'reeling') {
    angler.reelTicksLeft -= 1;
    const t = 1 - Math.max(0, angler.reelTicksLeft) / FISHING_REEL_TICKS;
    const ox = angler.origin[0];
    const oy = FISHING_WATER_Y;
    const oz = angler.origin[2];
    if (angler.bobber) {
      angler.bobber = [
        Math.round(lerp(angler.bobber[0], ox, 0.08 + t * 0.12) * 1000) / 1000,
        Math.round(lerp(angler.bobber[1], oy, 0.2) * 1000) / 1000,
        Math.round(lerp(angler.bobber[2], oz, 0.08 + t * 0.12) * 1000) / 1000,
      ];
    }
    setLine(angler);
    if (angler.reelTicksLeft <= 0) {
      angler.phase = 'catch';
      angler.bobber = [ox, FISHING_WATER_Y, oz - 0.35];
      setLine(angler);
      events.push({
        type: 'catch',
        slot: angler.slot,
        payload: {
          slot: angler.slot,
          species: angler.lastCatch?.species,
          lengthCm: angler.lastCatch?.lengthCm,
        },
      });
    }
    return events;
  }

  return events;
}

/**
 * Advances live fishing. `playerInputs` may carry discrete kinds; each kind
 * is consumed once until a neutral arrives so held snapshots do not recast.
 */
export function stepFishingSimulation(simState, playerInputs = {}, steps = 1) {
  const state = clone(simState);
  const events = [];

  for (let step = 0; step < steps; step++) {
    state.tickCount += 1;
    state.elapsedMs += Math.round(FISHING_DT * 1000);

    for (const key of Object.keys(state.anglers)) {
      const angler = state.anglers[key];
      const input = playerInputs[angler.slot] ?? playerInputs[key] ?? playerInputs[Number(key)];
      if (input) {
        const valid = validateFishingInput(input);
        if (valid.valid) {
          const kind = valid.sanitized.kind;
          if (kind === 'environment') {
            state.environment = valid.sanitized.environment;
            state.environmentAt = valid.sanitized.nowMs;
          } else if (kind === 'neutral') {
            angler.consumedKind = null;
          } else if (consumeKind(angler, kind)) {
            let ev = null;
            if (kind === 'cast') ev = applyCast(state, angler, valid.sanitized.power);
            else if (kind === 'reel') ev = applyReel(state, angler);
            else if (kind === 'release') ev = applyRelease(state, angler);
            else if (kind === 'leave') {
              resetAnglerLine(angler);
              ev = { type: 'line_cleared', slot: angler.slot, payload: { slot: angler.slot } };
            }
            if (ev) events.push(ev);
          }
        }
      }
      events.push(...stepAngler(state, angler));
    }
  }

  return { simState: state, events, finished: false };
}

export function visibleLines(simState) {
  return Object.values(simState.anglers || {})
    .filter((a) => a.line && a.phase !== 'idle')
    .map((a) => ({
      slot: a.slot,
      phase: a.phase,
      line: a.line,
      bobber: a.bobber,
    }));
}
