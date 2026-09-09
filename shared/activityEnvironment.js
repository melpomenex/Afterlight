/**
 * Shared activity environment projection, defaults, and validation.
 *
 * Part of the Place Activities Program (Phase 5, Task 7.1).
 *
 * Requirements:
 * - openspec/changes/add-place-activities-program/specs/signature-place-activities/spec.md
 *   (Requirement: Authoritative environment contract)
 * - design.md (D7 — Bounded phase-five catalog: Authoritative atmosphere semantic state)
 *
 * Contract:
 * - Affected activities use server-owned semantic wind, rain, time, and surface conditions,
 *   versioned with the match/run.
 * - Competitive runs freeze the conditions at start; noncompetitive activities (fishing,
 *   telescope) consume timestamped live state.
 * - Missing authoritative conditions fall back to declared shared defaults for the place preset.
 * - Client visual particles never determine outcomes.
 * - Agricultural weather / crop contracts are completely untouched.
 */

import { getPreset } from './atmospherePresets.js';
import { sampleAtmosphere, defaultAtmosphereState } from './atmosphereModel.js';

export const ACTIVITY_ENVIRONMENT_VERSION = 1;
export const ACTIVITY_ENVIRONMENT_POLICIES = Object.freeze(['none', 'frozen', 'live']);

const clamp01 = (v) => (typeof v !== 'number' || Number.isNaN(v) ? 0 : Math.max(0, Math.min(1, v)));
const clampWind = (v) => (typeof v !== 'number' || Number.isNaN(v) ? 0 : Math.max(-1, Math.min(1, v)));

/**
 * Returns deterministic default environment for an activity policy and optional preset.
 *
 * @param {'none' | 'frozen' | 'live'} [policy='none']
 * @param {{ presetId?: string | null, now?: number }} [opts]
 * @returns {object}
 */
export function defaultActivityEnvironment(policy = 'none', { presetId = null, now = 0 } = {}) {
  const normPolicy = ACTIVITY_ENVIRONMENT_POLICIES.includes(policy) ? policy : 'none';
  if (normPolicy === 'none') {
    return {
      version: ACTIVITY_ENVIRONMENT_VERSION,
      policy: 'none',
      preset: null,
      wind: [0, 0],
      windSpeed: 0,
      rain: 0,
      intensity: 0,
      wetness: 0,
      timePhase: 0,
      frozenAt: null,
    };
  }

  const preset = presetId ? getPreset(presetId) : null;
  const windX = preset ? clampWind(preset.wind[0]) : 0;
  const windZ = preset ? clampWind(preset.wind[1]) : 0;
  const windSpeed = Math.hypot(windX, windZ);
  const rain = preset ? clamp01(preset.rain) : 0;
  const intensity = preset ? clamp01(preset.intensity) : 0;
  const wetness = preset ? clamp01(preset.wetness) : 0;
  const timePhase = preset?.visuals?.skyPhase !== undefined ? clamp01(preset.visuals.skyPhase) : 0;

  return {
    version: ACTIVITY_ENVIRONMENT_VERSION,
    policy: normPolicy,
    preset: presetId,
    wind: [windX, windZ],
    windSpeed,
    rain,
    intensity,
    wetness,
    timePhase,
    frozenAt: normPolicy === 'frozen' ? now : null,
  };
}

/**
 * Resolves activity environment from an authoritative atmosphere snapshot or fallback preset.
 *
 * @param {{
 *   policy?: 'none' | 'frozen' | 'live',
 *   atmosphereSnapshot?: object | null,
 *   placePresetId?: string | null,
 *   now?: number
 * }} [opts]
 * @returns {object}
 */
export function resolveActivityEnvironment({
  policy = 'none',
  atmosphereSnapshot = null,
  placePresetId = null,
  now = 0,
} = {}) {
  const normPolicy = ACTIVITY_ENVIRONMENT_POLICIES.includes(policy) ? policy : 'none';
  if (normPolicy === 'none') {
    return defaultActivityEnvironment('none');
  }

  const state = atmosphereSnapshot?.state;
  if (state && typeof state === 'object') {
    const sample = sampleAtmosphere(state, now, {});
    const windX = clampWind(sample.windX);
    const windZ = clampWind(sample.windZ);
    const windSpeed = Math.hypot(windX, windZ);

    return {
      version: ACTIVITY_ENVIRONMENT_VERSION,
      policy: normPolicy,
      preset: state.preset ?? placePresetId,
      wind: [windX, windZ],
      windSpeed,
      rain: clamp01(sample.rain),
      intensity: clamp01(sample.intensity),
      wetness: clamp01(sample.wetnessTarget),
      timePhase: clamp01(sample.timePhase),
      frozenAt: normPolicy === 'frozen' ? now : null,
    };
  }

  // Snapshot missing or unpopulated: use declared fallback for preset
  return defaultActivityEnvironment(normPolicy, { presetId: placePresetId, now });
}

/**
 * Validates an environment state object against the schema and bounds.
 *
 * @param {any} env
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateActivityEnvironment(env) {
  if (!env || typeof env !== 'object' || Array.isArray(env)) {
    return { valid: false, error: 'environment must be an object' };
  }
  if (env.version !== ACTIVITY_ENVIRONMENT_VERSION) {
    return { valid: false, error: `version must be ${ACTIVITY_ENVIRONMENT_VERSION}` };
  }
  if (!ACTIVITY_ENVIRONMENT_POLICIES.includes(env.policy)) {
    return { valid: false, error: `invalid environment policy: ${env.policy}` };
  }
  if (env.policy === 'none') {
    return { valid: true };
  }
  if (!Array.isArray(env.wind) || env.wind.length !== 2 || !env.wind.every(Number.isFinite)) {
    return { valid: false, error: 'wind must be a 2-element array of finite numbers' };
  }
  const [wx, wz] = env.wind;
  if (wx < -1 || wx > 1 || wz < -1 || wz > 1) {
    return { valid: false, error: 'wind components must be in [-1, 1]' };
  }
  if (!Number.isFinite(env.windSpeed) || env.windSpeed < 0) {
    return { valid: false, error: 'windSpeed must be a non-negative finite number' };
  }
  for (const prop of ['rain', 'intensity', 'wetness', 'timePhase']) {
    const val = env[prop];
    if (!Number.isFinite(val) || val < 0 || val > 1) {
      return { valid: false, error: `${prop} must be a number in [0, 1]` };
    }
  }
  if (env.policy === 'frozen' && (!Number.isFinite(env.frozenAt) || env.frozenAt < 0)) {
    return { valid: false, error: 'frozen environment requires non-negative frozenAt timestamp' };
  }
  return { valid: true };
}
