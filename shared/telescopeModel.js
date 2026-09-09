/**
 * Authoritative Desert Camp telescope sky, marks, and live environment.
 *
 * Place Activities Program (Phase 5, Task 8.6).
 *
 * Spec: signature-place-activities — Camp telescope + Authoritative environment.
 * Design: D2 (eye camera / focused spectator), D5 (server marks), D7 (live time).
 *
 * Noncompetitive: visitors share a seeded catalog, mark objects for companions,
 * and may leave without a winner. Sky IDs come from the match/run seed; apparent
 * positions use LIVE environment timestamps (never frozen).
 */

export const TELESCOPE_RULES_VERSION = 1;
export const TELESCOPE_SIDEREAL_MS = 86164000;
export const TELESCOPE_OBJECT_COUNT = 12;

export const TELESCOPE_NAMED_OBJECTS = Object.freeze([
  Object.freeze({ id: 'altair', name: 'Altair', ra: 1.22, dec: 0.16 }),
  Object.freeze({ id: 'vega', name: 'Vega', ra: 4.87, dec: 0.68 }),
  Object.freeze({ id: 'deneb', name: 'Deneb', ra: 5.4, dec: 0.79 }),
  Object.freeze({ id: 'antares', name: 'Antares', ra: 4.31, dec: -0.46 }),
  Object.freeze({ id: 'arcturus', name: 'Arcturus', ra: 3.73, dec: 0.33 }),
  Object.freeze({ id: 'capella', name: 'Capella', ra: 1.38, dec: 0.8 }),
  Object.freeze({ id: 'betelgeuse', name: 'Betelgeuse', ra: 1.55, dec: 0.13 }),
  Object.freeze({ id: 'polaris', name: 'Polaris', ra: 0.66, dec: 1.55 }),
]);

const clone = (value) => JSON.parse(JSON.stringify(value));
const wrap01 = (v) => ((v % 1) + 1) % 1;
const round5 = (v) => Math.round(v * 100000) / 100000;

function clamp(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function playerKey(slot) {
  return String(slot);
}

function getObserver(state, slot) {
  return state.observers[slot] ?? state.observers[playerKey(slot)] ?? null;
}

/** Unsigned LCG unit in [0, 1). Safe-integer math, identical to the Elixir port. */
export function telescopeUnit(seed, index) {
  const n = ((Number(seed) + 1) * 1103515245 + 12345 + Number(index) * 997) % 4294967296;
  return ((n % 4294967296) + 4294967296) % 4294967296 / 4294967296;
}

/**
 * Shared catalog: named objects plus extras derived from the match/run seed.
 *
 * @param {number} [seed=1]
 * @returns {Array<{ id: string, name: string, ra: number, dec: number, seeded: boolean }>}
 */
export function buildTelescopeSky(seed = 1) {
  const named = TELESCOPE_NAMED_OBJECTS.map((object) => ({
    ...object,
    seeded: false,
  }));

  const extras = [];
  const extraCount = TELESCOPE_OBJECT_COUNT - named.length;
  for (let i = 0; i < extraCount; i++) {
    extras.push({
      id: `seed-${i}`,
      name: `Camp Mark ${i + 1}`,
      ra: round5(telescopeUnit(seed, i * 2) * Math.PI * 2),
      dec: round5((telescopeUnit(seed, i * 2 + 1) * 2 - 1) * 1.2),
      seeded: true,
    });
  }

  return named.concat(extras);
}

export function findSkyObject(sky, objectId) {
  const objects = Array.isArray(sky) ? sky : sky?.objects;
  if (!objects) return null;
  return objects.find((object) => object.id === objectId) ?? null;
}

/**
 * Apparent unit direction from live timestamp + time phase.
 * Same seed + same live now reproduces the same vector on every client.
 *
 * @param {{ ra: number, dec: number }} object
 * @param {number} nowMs
 * @param {{ timePhase?: number }} [environment]
 * @returns {{ x: number, y: number, z: number, lst: number }}
 */
export function apparentTelescopePosition(object, nowMs, environment = null) {
  const now = Number.isFinite(nowMs) ? nowMs : 0;
  const timePhase = clamp(environment?.timePhase, 0, 1, 0);
  const lst = wrap01(now / TELESCOPE_SIDEREAL_MS + timePhase);
  const theta = object.ra + lst * Math.PI * 2;
  const phi = object.dec;
  return {
    x: round5(Math.cos(phi) * Math.sin(theta)),
    y: round5(Math.sin(phi)),
    z: round5(Math.cos(phi) * Math.cos(theta)),
    lst: round5(lst),
  };
}

function liveEnvironment(environment, now) {
  const source = environment && typeof environment === 'object' ? environment : {};
  const liveNow = Number.isFinite(now)
    ? now
    : (Number.isFinite(source.now) ? source.now : (Number.isFinite(source.updatedAt) ? source.updatedAt : 0));

  return {
    version: source.version ?? 1,
    policy: 'live',
    preset: source.preset ?? null,
    wind: Array.isArray(source.wind) ? [source.wind[0] ?? 0, source.wind[1] ?? 0] : [0, 0],
    windSpeed: Number.isFinite(source.windSpeed) ? source.windSpeed : 0,
    rain: clamp(source.rain, 0, 1, 0),
    intensity: clamp(source.intensity, 0, 1, 0),
    wetness: clamp(source.wetness, 0, 1, 0),
    timePhase: clamp(source.timePhase, 0, 1, 0),
    now: liveNow,
    updatedAt: liveNow,
    frozenAt: null,
  };
}

function emptyObserver(slot) {
  return {
    slot,
    look: { yaw: 0, pitch: 0.35 },
    located: null,
    present: true,
  };
}

/**
 * @param {object} [opts]
 * @param {number[]} [opts.activeSlots]
 * @param {object} [opts.environment]
 * @param {number} [opts.seed]
 * @param {number} [opts.now]
 * @param {string} [opts.matchId]
 * @returns {object}
 */
export function initTelescopeSimState({
  activeSlots = [0, 1, 2, 3],
  environment = null,
  seed = 1,
  now = 0,
  matchId = null,
} = {}) {
  const live = liveEnvironment(environment, environment?.now ?? now);
  const objects = buildTelescopeSky(seed);
  const observers = {};
  for (const slot of activeSlots) {
    observers[slot] = emptyObserver(slot);
  }

  return {
    rulesVersion: TELESCOPE_RULES_VERSION,
    status: 'observing',
    seed,
    matchId,
    sky: { objects },
    marks: {},
    observers,
    activeSlots: [...activeSlots],
    winner: null,
    environment: live,
  };
}

export function refreshTelescopeEnvironment(simState, update = {}) {
  const state = clone(simState);
  const nextNow = Number.isFinite(update.now) ? update.now : state.environment?.now;
  state.environment = liveEnvironment({ ...state.environment, ...update, policy: 'live', frozenAt: null }, nextNow);
  return state;
}

function ensureObserver(state, slot) {
  let observer = getObserver(state, slot);
  if (!observer) {
    observer = emptyObserver(slot);
    state.observers[slot] = observer;
    if (!state.activeSlots.includes(slot)) state.activeSlots.push(slot);
  }
  observer.present = true;
  return observer;
}

/**
 * Applies look / mark / highlight / leave / live environment sync.
 * Leave never assigns a winner.
 *
 * @param {object} simState
 * @param {number} slot
 * @param {object} controls
 * @returns {{ simState: object, event: object|null }}
 */
export function applyTelescopeInput(simState, slot, controls) {
  if (!simState || !controls || typeof controls !== 'object') {
    return { simState, event: null };
  }

  const state = clone(simState);
  const kind = typeof controls.kind === 'string' ? controls.kind : 'look';

  if (Number.isFinite(controls.now) || controls.timePhase !== undefined) {
    state.environment = liveEnvironment({
      ...state.environment,
      ...controls,
      policy: 'live',
      frozenAt: null,
    }, controls.now);
  }

  if (kind === 'neutral' || kind === 'ready' || kind === 'sync_env') {
    return {
      simState: state,
      event: { type: kind === 'sync_env' ? 'environment_live' : 'neutral', slot, now: state.environment.now },
    };
  }

  const observer = ensureObserver(state, slot);

  if (kind === 'look') {
    observer.look = {
      yaw: clamp(controls.yaw, -Math.PI, Math.PI, observer.look.yaw),
      pitch: clamp(controls.pitch, -1.2, 1.4, observer.look.pitch),
    };
    return { simState: state, event: { type: 'look', slot, look: observer.look } };
  }

  if (kind === 'mark' || kind === 'locate' || kind === 'highlight') {
    const objectId = typeof controls.objectId === 'string' ? controls.objectId : '';
    const object = findSkyObject(state.sky, objectId);
    if (!object) return { simState: state, event: null };

    if (kind === 'locate') {
      observer.located = objectId;
    }

    const existing = state.marks[objectId] || {
      objectId,
      markedBy: slot,
      highlightedBy: [],
    };
    if (kind === 'mark' && existing.highlightedBy.length === 0 && existing.markedBy === undefined) {
      existing.markedBy = slot;
    }
    if (kind === 'mark' && !state.marks[objectId]) {
      existing.markedBy = slot;
    }
    if (!existing.highlightedBy.includes(slot)) {
      existing.highlightedBy.push(slot);
    }
    state.marks[objectId] = existing;
    if (kind === 'mark' || kind === 'locate') observer.located = objectId;

    return {
      simState: state,
      event: {
        type: kind === 'highlight' ? 'object_highlighted' : 'object_marked',
        slot,
        objectId,
        mark: existing,
      },
    };
  }

  if (kind === 'leave') {
    observer.present = false;
    const anyone = Object.values(state.observers).some((item) => item.present);
    if (!anyone) state.status = 'idle';
    state.winner = null;
    return {
      simState: state,
      event: { type: 'observer_left', slot, winner: null },
    };
  }

  return { simState: state, event: null };
}

/**
 * Steps observer inputs and refreshes live timestamps. Never ends with a winner.
 *
 * @param {object} simState
 * @param {object} players
 * @param {number} [_steps]
 * @returns {{ simState: object, outcome: object|null }}
 */
export function stepTelescopeSimulation(simState, players = {}, _steps = 1) {
  let state = simState;
  let lastEvent = null;

  const slots = Object.keys(players).map(Number).sort((a, b) => a - b);
  for (const slot of slots) {
    const input = players[slot]?.input_state || players[slot]?.inputState || players[slot] || {};
    if (input && typeof input === 'object' && input.kind) {
      const applied = applyTelescopeInput(state, slot, input);
      state = applied.simState;
      lastEvent = applied.event;
    }
  }

  return { simState: state, outcome: lastEvent };
}
