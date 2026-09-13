import { SOCIAL_ATMOSPHERE_PRESETS } from './socialAtmospherePresets.js';
import { environmentVariantEntries } from './theaterEnvironments.js';
/**
 * Authored atmosphere presets (add-atmosphere-weather-system D1): plain,
 * deep-frozen data, free of Three.js/DOM/network imports so Node tests, the
 * Elixir projection script and the browser read identical tables.
 *
 * Every preset carries the full authored row; only the SEMANTIC subset
 * (identity, weather mode, intensity/wind/rain/wetness targets, event
 * policy, schedule) is projected into the build-controlled Phoenix
 * manifest (`scripts/export-place-definitions.mjs`). Visual values
 * (colors, exposure, sky phase) and the audio mix are client-renderer
 * inputs and never travel the wire. The room's seed/wind/time/event
 * ownership stays with the RoomServer (program decision 8/10): presets
 * are the authored defaults, not runtime state.
 */

// Event policy bounds (design D3): the server scheduler may never emit
// two lightning strikes closer than 45s or further than 90s apart, nor
// meteors closer than 35s or further than 70s apart. Validation enforces
// these bounds; presets carry per-preset policy inside them.
export const LIGHTNING_SPACING_MS = Object.freeze({ minMs: 45_000, maxMs: 90_000 });
export const METEOR_SPACING_MS = Object.freeze({ minMs: 35_000, maxMs: 70_000 });

const fixedEvents = (lightning, meteor) =>
  Object.freeze({
    lightning: lightning ? Object.freeze({ ...LIGHTNING_SPACING_MS }) : null,
    meteor: meteor ? Object.freeze({ ...METEOR_SPACING_MS }) : null,
  });

function freezeSchedule(schedule) {
  if (!schedule) return null;
  return Object.freeze({
    cycleMs: schedule.cycleMs,
    keyframes: Object.freeze(schedule.keyframes.map(k => Object.freeze({ ...k, wind: Object.freeze([...k.wind]) }))),
  });
}

function definePreset(preset) {
  return Object.freeze({
    weather: 'fixed',
    intensity: 0,
    wind: Object.freeze([0, 0]),
    rain: 0,
    cloud: 0,
    wetness: 0,
    events: null,
    schedule: null,
    visuals: Object.freeze({}),
    audio: Object.freeze({}),
    ...preset,
    wind: Object.freeze([...(preset.wind ?? [0, 0])]),
    events: preset.events ? fixedEvents(preset.events.lightning, preset.events.meteor) : null,
    schedule: freezeSchedule(preset.schedule),
    visuals: Object.freeze({ ...preset.visuals }),
    audio: Object.freeze({ ...preset.audio }),
  });
}

export const ATMOSPHERE_PRESETS = Object.freeze({
  ...Object.fromEntries(Object.entries(SOCIAL_ATMOSPHERE_PRESETS).map(([id, row]) => [id, definePreset(row)])),
  // Theater Environment variants (shared/theaterEnvironments.js): the room's
  // authoritative atmosphere preset selects the surrounding world for every
  // occupant. Semantic fields travel the wire; visuals/features/audio are
  // looked up locally by id.
  ...Object.fromEntries(environmentVariantEntries().map(({ row }) => [row.preset, definePreset(row)])),
  // Calm baseline: dry stone, clear sky, no events.
  clear: definePreset({
    weather: 'fixed',
    intensity: 0,
    wind: [0.05, 0],
    rain: 0,
    cloud: 0.15,
    wetness: 0,
    visuals: { fogColor: '#8fa3a8', fogDensity: 0.02, skyColor: '#9db6bd', groundColor: '#5c6a5e', hemisphereIntensity: 0.9, sunColor: '#ffe0a5', sunIntensity: 1.1, exposure: 1, skyPhase: 0.35 },
    audio: { rain: 0, roof: 0, wind: 0.1, lowpassHz: 6000 },
  }),

  // The reference rain row (program example `rain-night` semantics):
  // steady rain, everything already wet, lightning possible.
  rain: definePreset({
    weather: 'fixed',
    intensity: 0.6,
    wind: [0.2, 0.05],
    rain: 0.7,
    cloud: 0.7,
    wetness: 1,
    events: { lightning: true, meteor: false },
    visuals: { fogColor: '#5d6d72', fogDensity: 0.05, skyColor: '#51646e', groundColor: '#3c4a46', hemisphereIntensity: 0.55, sunColor: '#c8d2cf', sunIntensity: 0.45, exposure: 0.9, skyPhase: 0.8 },
    audio: { rain: 1, roof: 0, wind: 0.3, lowpassHz: 6000 },
  }),

  // Storm: heavy rain, driving wind, full shared event policy.
  storm: definePreset({
    weather: 'fixed',
    intensity: 1,
    wind: [-0.7, 0.35],
    rain: 1,
    cloud: 0.95,
    wetness: 1,
    events: { lightning: true, meteor: true },
    visuals: { fogColor: '#43525c', fogDensity: 0.07, skyColor: '#37444f', groundColor: '#333f3c', hemisphereIntensity: 0.4, sunColor: '#b3c0c4', sunIntensity: 0.3, exposure: 0.82, skyPhase: 0.9 },
    audio: { rain: 1, roof: 0.6, wind: 0.7, lowpassHz: 4800 },
  }),

  // Desert baseline: bone dry, hot light, no precipitation, no events.
  'dry-heat': definePreset({
    weather: 'fixed',
    intensity: 0.2,
    wind: [0.3, -0.1],
    rain: 0,
    cloud: 0.05,
    wetness: 0,
    visuals: { fogColor: '#c7b294', fogDensity: 0.03, skyColor: '#d8c9a6', groundColor: '#8a7354', hemisphereIntensity: 1, sunColor: '#ffd9a0', sunIntensity: 1.25, exposure: 1.05, skyPhase: 0.5 },
    audio: { rain: 0, roof: 0, wind: 0.25, lowpassHz: 6000 },
  }),

  // Scheduled profile (weatherMode 'scheduled' places): one bounded cycle
  // of drying and raining again. Keyframes are atMs offsets inside the
  // cycle; sampling wraps, so the last keyframe blends back into the
  // first. Wetness keyframes ride alongside the transitions (D3), which
  // is how a late joiner derives wetness without replaying history.
  'diurnal-rain': definePreset({
    weather: 'scheduled',
    intensity: 0.5,
    wind: [0.15, 0.05],
    rain: 0.5,
    cloud: 0.5,
    wetness: 0.5,
    events: { lightning: false, meteor: false },
    schedule: {
      cycleMs: 1_440_000, // one authored day-cycle per 24 real minutes
      keyframes: [
        { atMs: 0, intensity: 0.15, wind: [0.05, 0], rain: 0, cloud: 0.2, wetness: 0 },
        { atMs: 480_000, intensity: 0.5, wind: [0.2, 0.05], rain: 0.45, cloud: 0.55, wetness: 0.4 },
        { atMs: 960_000, intensity: 0.85, wind: [0.35, 0.1], rain: 0.9, cloud: 0.85, wetness: 1 },
      ],
    },
    visuals: { fogColor: '#71828a', fogDensity: 0.04, skyColor: '#7b8f98', groundColor: '#4c5852', hemisphereIntensity: 0.75, sunColor: '#e8d9b0', sunIntensity: 0.85, exposure: 0.95, skyPhase: 0 },
    audio: { rain: 0.5, roof: 0.1, wind: 0.2, lowpassHz: 6000 },
  }),
});

export const ATMOSPHERE_PRESET_IDS = Object.freeze(Object.keys(ATMOSPHERE_PRESETS));

/** The authored preset row for a build-controlled preset id, or null. */
export function getPreset(id) {
  return Object.prototype.hasOwnProperty.call(ATMOSPHERE_PRESETS, id) ? ATMOSPHERE_PRESETS[id] : null;
}
