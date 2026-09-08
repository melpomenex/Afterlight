#!/usr/bin/env node
/**
 * Export the build-controlled public place projection for the Phoenix world
 * runtime (add-social-place-framework D1/D8, task 3.1).
 *
 * Phoenix cannot import ES modules, so the single editable manifest
 * (shared/placeDefinitions.js) is projected into a committed, bounded JSON
 * subset at server_elixir/priv/place_definitions.json, which
 * Afterlight.World.PlaceDefinitions validates and loads at boot. This file
 * is a generated build artifact, never a second editable manifest: `--check`
 * regenerates the bytes and fails when the committed file drifts (or is
 * hand-edited).
 *
 * The projection is deliberately narrow — per public place: id, public flag,
 * kind, bounds and the atmosphere configuration — with a canonical key
 * order so byte comparisons are stable. Builder keys, display prose,
 * objectives, notes, minimap art and capability plumbing stay client-side,
 * and personal gardens (`garden:<owner>`) are never projected: the wire
 * room-id space stays open (Rooms.resolve accepts any public string), but
 * only these allow-listed ids receive directory/atmosphere features.
 *
 * Usage:
 *   node scripts/export-place-definitions.mjs           # (re)write the file
 *   node scripts/export-place-definitions.mjs --check   # verify committed bytes
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLACE_DEFINITIONS } from '../shared/placeDefinitions.js';
import { ATMOSPHERE_PRESETS, LIGHTNING_SPACING_MS, METEOR_SPACING_MS } from '../shared/atmospherePresets.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PLACE_PROJECTION_PATH = path.join(REPO_ROOT, 'server_elixir', 'priv', 'place_definitions.json');

export const PLACE_PROJECTION_SCHEMA_VERSION = 1;
export const PLACE_PROJECTION_MAX_ENTRIES = 64;
/** The preset table projection stays bounded like the entries themselves. */
export const PLACE_PROJECTION_MAX_PRESETS = 32;
const GARDEN_PREFIX = 'garden:';
const WEATHER_MODES = ['fixed', 'scheduled'];
const at = (ok, message) => { if (!ok) throw new Error(message); };
const isFiniteIn = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

/**
 * Pure projection of one definition: whitelisted plain fields in canonical
 * key order (JSON.stringify preserves insertion order for string keys).
 */
export function projectPlace(definition) {
  const at = (ok, message) => { if (!ok) throw new Error(`${definition?.id ?? 'unknown place'}: ${message}`); };
  at(definition && typeof definition === 'object', 'definition is not an object');
  at(typeof definition.id === 'string' && !definition.id.startsWith(GARDEN_PREFIX), `personal garden “${definition?.id}” is never part of the public projection`);
  at(typeof definition.id === 'string' && /^[a-z0-9-]+$/.test(definition.id), 'id must be a kebab-case string');
  at(definition.kind === 'environment' || definition.kind === 'venue' || definition.kind === 'view', 'kind must be environment, venue or view');

  const b = definition.bounds;
  at(b && ['minX', 'maxX', 'minZ', 'maxZ'].every(k => Number.isFinite(b[k])), 'bounds must be finite numbers');
  at(b.minX < b.maxX && b.minZ < b.maxZ, 'bounds must not be inverted');

  const atmosphere = definition.atmosphere;
  at(atmosphere && typeof atmosphere === 'object', 'atmosphere configuration is required');
  at(atmosphere.preset === null || (typeof atmosphere.preset === 'string' && atmosphere.preset.length > 0), 'atmosphere.preset must be null or a preset key');
  at(atmosphere.weatherMode === 'fixed' || atmosphere.weatherMode === 'scheduled', 'atmosphere.weatherMode must be fixed or scheduled');
  at(atmosphere.timeMode === 'fixed' || atmosphere.timeMode === 'scheduled', 'atmosphere.timeMode must be fixed or scheduled');

  // A named preset must exist in the build-controlled registry: the
  // projection is an allow-list of authored atmosphere, not free-form data.
  if (atmosphere.preset !== null) {
    at(Object.prototype.hasOwnProperty.call(ATMOSPHERE_PRESETS, atmosphere.preset), `atmosphere.preset "${atmosphere.preset}" is not a known preset`);
  }

  return {
    id: definition.id,
    public: true,
    kind: definition.kind,
    bounds: { minX: b.minX, maxX: b.maxX, minZ: b.minZ, maxZ: b.maxZ },
    atmosphere: { preset: atmosphere.preset, weatherMode: atmosphere.weatherMode, timeMode: atmosphere.timeMode },
  };
}

/**
 * Semantic-only projection of one authored atmosphere preset
 * (add-atmosphere-weather-system D1): preset identity, weather mode,
 * intensity/wind/rain/wetness targets, event policy and the schedule.
 * Visual colors and audio mixes stay client-side — no material colors or
 * meshes ever reach the wire. Throws a named error on out-of-contract
 * data; the projection is all-or-nothing like the entries.
 */
export function projectPreset(presetId) {
  const id = String(presetId);
  at(/^[a-z0-9][a-z0-9-]*$/.test(id), `preset id "${id}" must be kebab-case`);
  const preset = ATMOSPHERE_PRESETS[id];
  at(preset && typeof preset === 'object', `preset "${id}" is missing from shared/atmospherePresets.js`);
  at(WEATHER_MODES.includes(preset.weather), `preset "${id}": weather must be fixed or scheduled`);
  at(isFiniteIn(preset.intensity, 0, 1), `preset "${id}": intensity must be finite in [0, 1]`);
  at(Array.isArray(preset.wind) && preset.wind.length === 2 && preset.wind.every(w => isFiniteIn(w, -1, 1)), `preset "${id}": wind must be two finite components in [-1, 1]`);
  at(isFiniteIn(preset.rain, 0, 1), `preset "${id}": rain must be finite in [0, 1]`);
  at(isFiniteIn(preset.wetness, 0, 1), `preset "${id}": wetness must be finite in [0, 1]`);

  let events = null;
  if (preset.events) {
    const check = (kind, bounds) => {
      const spacing = preset.events[kind];
      if (spacing === null || spacing === undefined) return null;
      at(spacing && Number.isInteger(spacing.minMs) && Number.isInteger(spacing.maxMs), `preset "${id}": ${kind} spacing must be integer ms`);
      at(spacing.minMs >= bounds.minMs && spacing.maxMs <= bounds.maxMs && spacing.minMs <= spacing.maxMs, `preset "${id}": ${kind} spacing escapes the design bounds`);
      return { minMs: spacing.minMs, maxMs: spacing.maxMs };
    };
    events = {
      lightning: check('lightning', LIGHTNING_SPACING_MS),
      meteor: check('meteor', METEOR_SPACING_MS),
    };
  }

  let schedule = null;
  if (preset.schedule) {
    const { cycleMs, keyframes } = preset.schedule;
    at(Number.isInteger(cycleMs) && cycleMs > 0, `preset "${id}": schedule.cycleMs must be a positive integer`);
    at(Array.isArray(keyframes) && keyframes.length >= 2 && keyframes.length <= 8, `preset "${id}": schedule needs 2..8 keyframes`);
    let previousAt = -1;
    const projectedKeyframes = keyframes.map(keyframe => {
      at(Number.isInteger(keyframe.atMs) && keyframe.atMs >= 0 && keyframe.atMs < cycleMs, `preset "${id}": keyframe atMs must land inside the cycle`);
      at(keyframe.atMs > previousAt, `preset "${id}": keyframes must be strictly increasing`);
      previousAt = keyframe.atMs;
      at(isFiniteIn(keyframe.intensity, 0, 1), `preset "${id}": keyframe intensity out of range`);
      at(Array.isArray(keyframe.wind) && keyframe.wind.length === 2 && keyframe.wind.every(w => isFiniteIn(w, -1, 1)), `preset "${id}": keyframe wind out of range`);
      at(isFiniteIn(keyframe.rain, 0, 1), `preset "${id}": keyframe rain out of range`);
      at(isFiniteIn(keyframe.wetness, 0, 1), `preset "${id}": keyframe wetness out of range`);
      return { atMs: keyframe.atMs, intensity: keyframe.intensity, wind: [keyframe.wind[0], keyframe.wind[1]], rain: keyframe.rain, wetness: keyframe.wetness };
    });
    schedule = { cycleMs, keyframes: projectedKeyframes };
  }

  return {
    id,
    weather: preset.weather,
    intensity: preset.intensity,
    wind: [preset.wind[0], preset.wind[1]],
    rain: preset.rain,
    wetness: preset.wetness,
    events,
    schedule,
  };
}

/** The whole build-controlled preset table in canonical id order. */
export function projectPresets(presets = ATMOSPHERE_PRESETS) {
  const ids = Object.keys(presets);
  if (ids.length > PLACE_PROJECTION_MAX_PRESETS) {
    throw new Error(`preset projection exceeds ${PLACE_PROJECTION_MAX_PRESETS} entries (${ids.length})`);
  }
  return ids.map(projectPreset);
}

/**
 * Pure entry point (importable by tests): the whole projection document in
 * canonical key order, or a thrown named error on any out-of-contract input.
 * Alongside the place entries this carries the build-controlled atmosphere
 * preset table (semantic subset only) so the Phoenix owner (task 2.1)
 * schedules from the same authored data the client renders from.
 */
export function projectPlaceDefinitions(definitions = PLACE_DEFINITIONS) {
  if (!Array.isArray(definitions)) throw new Error('place definitions must be an array');
  if (definitions.length > PLACE_PROJECTION_MAX_ENTRIES) {
    throw new Error(`public place projection exceeds ${PLACE_PROJECTION_MAX_ENTRIES} entries (${definitions.length}); shrink the manifest`);
  }

  const seen = new Set();
  const entries = definitions.map((definition) => {
    const projected = projectPlace(definition);
    if (seen.has(projected.id)) throw new Error(`duplicate public place id: ${projected.id}`);
    seen.add(projected.id);
    return projected;
  });

  return { schemaVersion: PLACE_PROJECTION_SCHEMA_VERSION, entries, presets: projectPresets() };
}

/** Deterministic serialization: 2-space JSON + trailing newline. */
export function serializeProjection(projection) {
  return `${JSON.stringify(projection, null, 2)}\n`;
}

/** Byte-exact projection document for the current manifest. */
export function generateProjectionBytes() {
  return serializeProjection(projectPlaceDefinitions());
}

export async function exportProjection(outPath = PLACE_PROJECTION_PATH) {
  const bytes = generateProjectionBytes();
  await writeFile(outPath, bytes);
  return bytes;
}

/** --check: the committed file must be byte-identical to the generated one. */
export async function checkProjection(outPath = PLACE_PROJECTION_PATH) {
  const [committed, generated] = await Promise.all([
    readFile(outPath, 'utf8').catch(() => {
      throw new Error(`${path.relative(REPO_ROOT, outPath)} is missing — run: node scripts/export-place-definitions.mjs`);
    }),
    Promise.resolve(generateProjectionBytes()),
  ]);
  if (committed !== generated) {
    throw new Error(`${path.relative(REPO_ROOT, outPath)} drifted from shared/placeDefinitions.js — regenerate it with: node scripts/export-place-definitions.mjs`);
  }
  return true;
}

function parseArgs(argv) {
  return { check: argv.includes('--check') };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { check } = parseArgs(process.argv.slice(2));
  try {
    if (check) {
      await checkProjection();
      console.log(`place projection is up to date: ${path.relative(REPO_ROOT, PLACE_PROJECTION_PATH)}`);
    } else {
      await exportProjection();
      console.log(`exported ${PLACE_DEFINITIONS.length} public places → ${path.relative(REPO_ROOT, PLACE_PROJECTION_PATH)}`);
    }
  } catch (error) {
    console.error(`place projection error: ${error.message}`);
    process.exitCode = 1;
  }
}
