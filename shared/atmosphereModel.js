/**
 * Pure atmosphere semantics (add-atmosphere-weather-system D1/D2/D3): the
 * envelope contract, validation, transition/time math, wetness response
 * and the shared event rules that the RoomServer (task 2.1), the client
 * state client (task 2.2) and the renderers (3.x/4.x) all consume. The
 * fixture vectors in tests/fixtures/atmosphere/model-vectors.json pin this
 * module and the Elixir side to identical results — no implementation
 * decision is left to runtime adapters.
 *
 * Hard rules this module enforces:
 *   - full-replacement snapshots: `epoch` is the EXISTING room lease
 *     epoch (never an independent weather counter), `revision` is
 *     atmosphere-only and monotonic within an epoch;
 *   - malformed / unsupported / non-finite state is rejected WHOLE (the
 *     caller keeps its last valid snapshot or a deterministic default);
 *   - zero seed is valid; a missing state falls back to a known preset
 *     via `defaultAtmosphereState`;
 *   - transition `durationMs` must be positive — an instantaneous
 *     replacement is a `null` transition, never a division by zero;
 *   - hot math (`sampleAtmosphere`, wetness, schedule sampling) writes
 *     into a RETAINED output argument and allocates nothing.
 *
 * No Three.js, no DOM, no server fetch, no garden-weather mutation.
 */

import { ATMOSPHERE_PRESETS, LIGHTNING_SPACING_MS, METEOR_SPACING_MS, getPreset } from './atmospherePresets.js';

export { ATMOSPHERE_PRESETS, LIGHTNING_SPACING_MS, METEOR_SPACING_MS, getPreset };

export const ATMOSPHERE_SCHEMA_VERSION = 1;
export const ATMOSPHERE_TYPE = 'atmosphere_state';
export const ATMOSPHERE_ENVELOPE_MAX_BYTES = 8 * 1024;
export const ATMOSPHERE_MAX_EVENTS = 4;
export const ATMOSPHERE_MAX_DURATION_MS = 120_000;
export const ATMOSPHERE_MIN_LEAD_MS = 5_000;
export const ATMOSPHERE_ID_MAX_CHARS = 64;
/** Live events delivered later than this are skipped entirely (D3). */
export const ATMOSPHERE_LATE_TOLERANCE_MS = 250;

/** Supported weather policies; `dynamic` and anything else is rejected. */
export const WEATHER_MODES = Object.freeze(['fixed', 'scheduled']);
/** Supported time clocks; real-time/event-controlled modes are reserved. */
export const TIME_MODES = Object.freeze(['fixed', 'accelerated']);
export const ATMOSPHERE_EVENT_KINDS = Object.freeze(['lightning', 'meteor']);

/** Analytic wetness approach constants (D3): wet-in is fast, dry-out slow. */
export const WETNESS_TAU_WET_MS = 20_000;
export const WETNESS_TAU_DRY_MS = 90_000;

/** Clock bookkeeping (D3): >5s jumps request a fresh snapshot. */
export const ATMOSPHERE_MAX_CLOCK_JUMP_MS = 5_000;

const isSafeNonNegativeInt = value => Number.isSafeInteger(value) && value >= 0;
const isFiniteIn = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const isUint32 = value => Number.isSafeInteger(value) && value >= 0 && value <= 0xffffffff;
const inRange = (value, min, max) => value >= min && value <= max;
const clamp01 = value => (value < 0 ? 0 : value > 1 ? 1 : value);
const wrap = (value, modulus) => ((value % modulus) + modulus) % modulus;

// Byte-exact envelope size check (JSON with multi-byte characters can
// exceed the 8KiB wire budget while staying under the char count).
let encoder = null;
export function envelopeByteSize(frame) {
  if (!encoder) encoder = new TextEncoder();
  return encoder.encode(JSON.stringify(frame)).length;
}

/* ------------------------------------------------------------------ *
 * Deterministic seeded randomness (D1): the unsigned 32-bit LCG
 * (1664525*x + 1013904223) mod 2^32, including zero seed. Shared
 * decisions never use Math.random or locale-dependent hashes.
 * ------------------------------------------------------------------ */

/** One LCG step: uint32 state -> uint32 state. */
export function lcgNext(state) {
  return (Math.imul(1664525, state) + 1013904223) >>> 0;
}

/** A seeded draw function over the shared LCG. Zero seed is valid. */
export function createLcg(seed) {
  if (!isUint32(seed)) throw new TypeError('seed must be an unsigned 32-bit integer');
  let state = seed >>> 0;
  return () => {
    state = lcgNext(state);
    return state;
  };
}

/** Uniform float in [0, 1) from one uint32 draw. */
export function lcgFloat(draw) {
  return draw() / 0x100000000;
}

/* ------------------------------------------------------------------ *
 * Interpolation primitives (D3)
 * ------------------------------------------------------------------ */

/** Smoothstep in linear space: clamp, then u*u*(3-2u). */
export function smoothstep(u) {
  if (!(u > 0)) return 0;
  if (u >= 1) return 1;
  const s = u * u * (3 - 2 * u);
  return s;
}

export function lerp(a, b, u) {
  return a + (b - a) * u;
}

/** Shortest wrapped angular interpolation (radians) for sky orientation. */
export function lerpAngleShortest(a, b, u) {
  const twoPi = Math.PI * 2;
  let delta = wrap(b - a, twoPi);
  if (delta > Math.PI) delta -= twoPi;
  return wrap(a + delta * u, twoPi);
}

/* ------------------------------------------------------------------ *
 * Envelope + state validation (D2): whole-rejection semantics
 * ------------------------------------------------------------------ */

function validateWind(wind) {
  return (
    Array.isArray(wind) &&
    wind.length === 2 &&
    Number.isFinite(wind[0]) &&
    Number.isFinite(wind[1]) &&
    inRange(wind[0], -1, 1) &&
    inRange(wind[1], -1, 1)
  );
}

function validateOrigin(origin) {
  return Array.isArray(origin) && origin.length === 3 && origin.every(v => typeof v === 'number' && Number.isFinite(v));
}

export function validateAtmosphereEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) return 'event_shape';
  if (!(typeof event.id === 'string' && inRange(event.id.length, 1, ATMOSPHERE_ID_MAX_CHARS))) return 'event_id';
  if (!ATMOSPHERE_EVENT_KINDS.includes(event.kind)) return 'event_kind';
  if (!isSafeNonNegativeInt(event.at)) return 'event_at';
  if (!(Number.isInteger(event.durationMs) && event.durationMs > 0 && event.durationMs <= ATMOSPHERE_MAX_DURATION_MS)) return 'event_duration';
  if (!isFiniteIn(event.intensity, 0, 1)) return 'event_intensity';
  if (!validateOrigin(event.origin)) return 'event_origin';
  return null;
}

export function validateTransition(transition) {
  if (transition === null || transition === undefined) return null;
  if (!transition || typeof transition !== 'object' || Array.isArray(transition)) return 'transition_shape';
  if (!(typeof transition.fromPreset === 'string' && typeof transition.toPreset === 'string')) return 'transition_preset';
  if (!isFiniteIn(transition.fromIntensity, 0, 1)) return 'transition_from_intensity';
  if (!isFiniteIn(transition.toIntensity, 0, 1)) return 'transition_to_intensity';
  if (!validateWind(transition.fromWind) || !validateWind(transition.toWind)) return 'transition_wind';
  if (!isSafeNonNegativeInt(transition.startAt)) return 'transition_start';
  // A zero/negative duration is rejected outright: instantaneous state
  // replacement is expressed as a null transition, never a divide by zero.
  if (!(Number.isInteger(transition.durationMs) && transition.durationMs > 0 && transition.durationMs <= ATMOSPHERE_MAX_DURATION_MS)) return 'transition_duration';
  return null;
}

export function validateAtmosphereTime(time) {
  if (!time || typeof time !== 'object' || Array.isArray(time)) return 'time_shape';
  // Unsupported clocks ('realtime', 'event', 'dynamic', ...) are rejected,
  // never silently treated as fixed.
  if (!TIME_MODES.includes(time.mode)) return 'time_mode';
  if (!isFiniteIn(time.phase, 0, 1)) return 'time_phase';
  if (!isSafeNonNegativeInt(time.anchorAt)) return 'time_anchor';
  if (!(typeof time.rate === 'number' && Number.isFinite(time.rate) && time.rate >= 0)) return 'time_rate';
  return null;
}

export function validateAtmosphereState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return 'state_shape';
  // Zero seed is valid; anything outside uint32 is not a seed.
  if (!isUint32(state.seed)) return 'seed';
  if (!WEATHER_MODES.includes(state.mode)) return 'mode';
  // Presets are build-controlled: an unknown preset is malformed data.
  if (!(typeof state.preset === 'string' && getPreset(state.preset))) return 'preset';
  if (!isFiniteIn(state.intensity, 0, 1)) return 'intensity';
  if (!validateWind(state.wind)) return 'wind';
  if (!isSafeNonNegativeInt(state.startedAt)) return 'started_at';
  const transition = validateTransition(state.transition);
  if (transition) return transition;
  const time = validateAtmosphereTime(state.time);
  if (time) return time;
  if (!Array.isArray(state.events) || state.events.length > ATMOSPHERE_MAX_EVENTS) return 'events_count';
  for (const event of state.events) {
    const problem = validateAtmosphereEvent(event);
    if (problem) return problem;
  }
  return null;
}

/**
 * Validate one full-replacement atmosphere snapshot. Returns
 * `{ ok: true, value }` with the frame unchanged, or `{ ok: false,
 * reason }` with a stable string code; the caller keeps its previous
 * valid snapshot / deterministic default and marks synchronization
 * unavailable — nothing is partially applied.
 */
export function validateAtmosphereEnvelope(frame) {
  if (!frame || typeof frame !== 'object' || Array.isArray(frame)) return { ok: false, reason: 'frame_shape' };
  if (frame.type !== ATMOSPHERE_TYPE) return { ok: false, reason: 'type' };
  if (frame.schemaVersion !== ATMOSPHERE_SCHEMA_VERSION) return { ok: false, reason: 'schema_version' };
  if (envelopeByteSize(frame) > ATMOSPHERE_ENVELOPE_MAX_BYTES) return { ok: false, reason: 'byte_size' };
  if (!(typeof frame.roomId === 'string' && inRange(frame.roomId.length, 1, ATMOSPHERE_ID_MAX_CHARS))) return { ok: false, reason: 'room_id' };
  if (!isSafeNonNegativeInt(frame.epoch)) return { ok: false, reason: 'epoch' };
  if (!isSafeNonNegativeInt(frame.revision)) return { ok: false, reason: 'revision' };
  if (!isSafeNonNegativeInt(frame.serverNow)) return { ok: false, reason: 'server_now' };
  if (frame.requestId !== undefined && !(typeof frame.requestId === 'string' && inRange(frame.requestId.length, 1, ATMOSPHERE_ID_MAX_CHARS))) {
    return { ok: false, reason: 'request_id' };
  }
  const state = validateAtmosphereState(frame.state);
  if (state) return { ok: false, reason: state };
  return { ok: true, value: frame };
}

/* ------------------------------------------------------------------ *
 * Ordering (D2): epochs and revisions
 * ------------------------------------------------------------------ */

/**
 * Ordering rule for a next snapshot against the accepted one:
 *   - higher epoch: 'new-epoch'   (full replacement; resets event dedup
 *     and transition state — the caller must treat it as a full snapshot)
 *   - same epoch, higher revision: 'new-revision'
 *   - same epoch, same revision: 'duplicate' (no-op apart from a bounded
 *     clock refresh)
 *   - same epoch, lower revision: 'stale-revision'
 *   - lower epoch: 'stale-epoch'
 */
export function compareAtmosphereFrames(prev, next) {
  if (!prev) return 'new-epoch';
  if (next.epoch > prev.epoch) return 'new-epoch';
  if (next.epoch < prev.epoch) return 'stale-epoch';
  if (next.revision > prev.revision) return 'new-revision';
  if (next.revision < prev.revision) return 'stale-revision';
  return 'duplicate';
}

export function atmosphereAccepts(prev, next) {
  const verdict = compareAtmosphereFrames(prev, next);
  return verdict === 'new-epoch' || verdict === 'new-revision';
}

/* ------------------------------------------------------------------ *
 * Clocks (D3)
 * ------------------------------------------------------------------ */

/** True when the server-time jump exceeds the resnapshot threshold. */
export function detectTimeDiscontinuity(previousServerNow, nextServerNow, maxJumpMs = ATMOSPHERE_MAX_CLOCK_JUMP_MS) {
  return Math.abs(nextServerNow - previousServerNow) > maxJumpMs;
}

/** Fixed clocks hold their (validated) phase; accelerated clocks advance
 * by `rate` cycles per second and wrap. */
export function sampleTimePhase(time, serverNow) {
  if (!time || typeof time !== 'object') return 0;
  if (time.mode !== 'accelerated') return time.phase ?? 0;
  const elapsed = serverNow - time.anchorAt;
  return wrap(time.phase + (elapsed * time.rate) / 1000, 1);
}

/* ------------------------------------------------------------------ *
 * Scheduled weather (D3): cycle wrap with smoothstep keyframe blends
 * ------------------------------------------------------------------ */

/**
 * Milliseconds inside the authored cycle for an absolute server time —
 * anchored to the Unix epoch, so a restart resumes the schedule without
 * replaying anything.
 */
export function scheduledPhaseMs(schedule, serverNow) {
  return wrap(serverNow, schedule.cycleMs);
}

/**
 * Sample a schedule's keyframes at a phase inside the cycle, writing the
 * interpolated numeric targets into the retained `out` (when given) and
 * returning it. The last keyframe blends back into the first across the
 * cycle boundary, so wrap produces the same targets from both sides.
 * Nonpositive keyframe spans are rejected at preset validation, never
 * divided by.
 */
export function sampleScheduleKeyframes(keyframes, phaseMs, cycleMs, out) {
  const count = keyframes.length;
  // k0: the last keyframe at or before the phase; k1: the next one,
  // wrapping to the first keyframe across the cycle boundary.
  let index = 0;
  while (index < count - 1 && keyframes[index + 1].atMs <= phaseMs) index += 1;
  const k0 = keyframes[index];
  const wrapped = index + 1 >= count;
  const k1 = keyframes[(index + 1) % count];
  const span = wrapped ? cycleMs - k0.atMs : k1.atMs - k0.atMs;
  const safeSpan = span > 0 ? span : 1;
  const u = smoothstep(clamp01((phaseMs - k0.atMs) / safeSpan));

  const result = out ?? {};
  result.intensity = lerp(k0.intensity, k1.intensity, u);
  result.rain = lerp(k0.rain, k1.rain, u);
  result.cloud = lerp(k0.cloud, k1.cloud, u);
  result.wetness = lerp(k0.wetness, k1.wetness, u);
  result.windX = lerp(k0.wind[0], k1.wind[0], u);
  result.windZ = lerp(k0.wind[1], k1.wind[1], u);
  result.keyframeU = u;
  result.wrapped = wrapped;
  return result;
}

/* ------------------------------------------------------------------ *
 * Semantic sampling (D3): the hot path writes into a retained `out`
 * ------------------------------------------------------------------ */

/**
 * Sample the semantic atmosphere at `serverNow`: transition-adjusted
 * intensity/wind, rain/cloud/wetness targets, the accelerated time phase
 * and the transition progress. Writes into the retained `out` and returns
 * it (callers own one allocation per controller, not per frame).
 */
export function sampleAtmosphere(state, serverNow, out) {
  const result = out ?? {};
  const preset = getPreset(state.preset);

  let intensity = state.intensity;
  let windX = state.wind[0];
  let windZ = state.wind[1];
  let rain = preset ? preset.rain : 0;
  let cloud = preset ? preset.cloud : 0;
  let wetnessTarget = preset ? preset.wetness : 0;
  let transitionU = null;

  const transition = state.transition;
  if (transition) {
    const rawU = (serverNow - transition.startAt) / transition.durationMs;
    const u = clamp01(rawU);
    transitionU = smoothstep(u);
    intensity = lerp(transition.fromIntensity, transition.toIntensity, transitionU);
    windX = lerp(transition.fromWind[0], transition.toWind[0], transitionU);
    windZ = lerp(transition.fromWind[1], transition.toWind[1], transitionU);
    const toPreset = getPreset(transition.toPreset);
    if (toPreset) {
      rain = toPreset.rain;
      cloud = toPreset.cloud;
      wetnessTarget = toPreset.wetness;
    }
  } else if (preset && preset.schedule && state.mode === 'scheduled') {
    const phaseMs = scheduledPhaseMs(preset.schedule, serverNow);
    const targets = sampleScheduleKeyframes(preset.schedule.keyframes, phaseMs, preset.schedule.cycleMs, {});
    intensity = targets.intensity;
    windX = targets.windX;
    windZ = targets.windZ;
    rain = targets.rain;
    cloud = targets.cloud;
    wetnessTarget = targets.wetness;
  }

  result.intensity = clamp01(intensity);
  result.windX = windX;
  result.windZ = windZ;
  result.rain = clamp01(rain);
  result.cloud = clamp01(cloud);
  result.wetnessTarget = clamp01(wetnessTarget);
  result.timePhase = sampleTimePhase(state.time, serverNow);
  result.transitionU = transitionU;
  return result;
}

/**
 * Analytic wetness approach from the last sample (D3):
 * `next = target + (previous - target) * exp(-dt / tau)` with tau
 * wet=20s / dry=90s, clamped to [0, 1]. Restoring wet/dry cycles returns
 * symmetric values — no cumulative drift, nothing is mutated.
 */
export function sampleWetness(previous, target, dtMs) {
  const dt = dtMs > 0 ? dtMs : 0;
  const tau = target > previous ? WETNESS_TAU_WET_MS : WETNESS_TAU_DRY_MS;
  const next = target + (previous - target) * Math.exp(-dt / tau);
  return clamp01(next);
}

/**
 * Late-join wetness (D3): derived deterministically from the preset —
 * fixed rain arrives already wet (1), fixed desert already dry (0),
 * scheduled profiles read their keyframe history inside the bounded
 * cycle — never accumulated from local entry time.
 */
export function initialWetness(state, serverNow) {
  const preset = getPreset(state.preset);
  if (!preset) return 0;
  if (state.mode === 'scheduled' && preset.schedule) {
    const phaseMs = scheduledPhaseMs(preset.schedule, serverNow);
    return clamp01(sampleScheduleKeyframes(preset.schedule.keyframes, phaseMs, preset.schedule.cycleMs, {}).wetness);
  }
  return clamp01(preset.wetness);
}

/**
 * Deterministic fallback state for a known preset (missing/invalid
 * snapshot handling): seed 0, fixed clock anchored at `now`, no
 * transition, no events. Unknown preset ids return null — the caller
 * reports atmosphere unavailable rather than inventing a state.
 */
export function defaultAtmosphereState(presetId, { seed = 0, now = 0 } = {}) {
  const preset = getPreset(presetId);
  if (!preset) return null;
  return {
    seed: isUint32(seed) ? seed : 0,
    mode: preset.weather,
    preset: presetId,
    intensity: preset.intensity,
    wind: [preset.wind[0], preset.wind[1]],
    startedAt: now,
    transition: null,
    time: { mode: 'fixed', phase: preset.visuals.skyPhase ?? 0, anchorAt: now, rate: 0 },
    events: [],
  };
}

/* ------------------------------------------------------------------ *
 * Shared events (D3): stable ids, bounded, never replayed
 * ------------------------------------------------------------------ */

/** Validate an authored event-spacing policy against the design bounds. */
export function validateEventPolicy(policy) {
  if (!policy || typeof policy !== 'object') return 'policy_shape';
  for (const [kind, bounds] of [['lightning', LIGHTNING_SPACING_MS], ['meteor', METEOR_SPACING_MS]]) {
    const spacing = policy[kind];
    if (spacing === null || spacing === undefined) continue;
    if (!spacing || typeof spacing !== 'object') return 'policy_spacing';
    if (!(Number.isInteger(spacing.minMs) && Number.isInteger(spacing.maxMs))) return 'policy_spacing';
    if (spacing.minMs < bounds.minMs || spacing.maxMs > bounds.maxMs || spacing.minMs > spacing.maxMs) return 'policy_spacing';
  }
  return null;
}

/** Event ids are `epoch:revision:slot` — stable across duplicate snapshots. */
export function formatEventId(epoch, revision, slot) {
  return `${epoch}:${revision}:${slot}`;
}

/**
 * Classification for a shared event relative to a receive time:
 *   - `pending`: not started (leads by `leadMs`);
 *   - `live`: started within the late tolerance, remaining envelope
 *     sampleable via `progress` (clamped 0..1);
 *   - `expired`: already started beyond the tolerance — skipped entirely,
 *     including its delayed thunder.
 */
export function eventPhase(event, now, lateToleranceMs = ATMOSPHERE_LATE_TOLERANCE_MS) {
  if (now < event.at) return { state: 'pending', leadMs: event.at - now, progress: 0 };
  if (now <= event.at + event.durationMs + lateToleranceMs) {
    return { state: 'live', leadMs: 0, progress: clamp01((now - event.at) / event.durationMs) };
  }
  return { state: 'expired', leadMs: 0, progress: 1 };
}

/** Events a first snapshot may execute: only those not yet started. */
export function eventsForJoin(events, now) {
  return events.filter(event => event.at >= now);
}

/** Thunder arrives at distance/343 m/s, clamped to 0.5–4s (D3). */
export function thunderDelayMs(distanceMeters) {
  const raw = (distanceMeters / 343) * 1000;
  return Math.min(4000, Math.max(500, raw));
}
