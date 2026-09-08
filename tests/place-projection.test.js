import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PLACE_PROJECTION_PATH,
  PLACE_PROJECTION_SCHEMA_VERSION,
  PLACE_PROJECTION_MAX_ENTRIES,
  PLACE_PROJECTION_MAX_PRESETS,
  projectPlace,
  projectPreset,
  projectPresets,
  projectPlaceDefinitions,
  serializeProjection,
  generateProjectionBytes,
  exportProjection,
  checkProjection,
} from '../scripts/export-place-definitions.mjs';
import { ATMOSPHERE_PRESET_IDS } from '../shared/atmospherePresets.js';
import { PLACE_DEFINITIONS, PLACE_VIEW_FIXTURE, LEGACY_DISTRICT_IDS, getPlaceDefinition } from '../shared/placeDefinitions.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('projection is the build-controlled whitelist of the shared manifest', () => {
  const doc = projectPlaceDefinitions();
  assert.equal(doc.schemaVersion, PLACE_PROJECTION_SCHEMA_VERSION);
  assert.equal(doc.entries.length, PLACE_DEFINITIONS.length);
  assert.ok(doc.entries.length <= PLACE_PROJECTION_MAX_ENTRIES, 'the committed projection stays under the 64-entry cap');
  assert.deepEqual(doc.entries.map(e => e.id), [...LEGACY_DISTRICT_IDS, 'desert-camp'], 'manifest order is the projection order');
});

test('projected entries carry only the whitelisted plain fields, in canonical key order', () => {
  for (const [index, entry] of projectPlaceDefinitions().entries.entries()) {
    assert.deepEqual(Object.keys(entry), ['id', 'public', 'kind', 'bounds', 'atmosphere']);
    assert.deepEqual(Object.keys(entry.bounds), ['minX', 'maxX', 'minZ', 'maxZ']);
    assert.deepEqual(Object.keys(entry.atmosphere), ['preset', 'weatherMode', 'timeMode']);
    assert.equal(entry.public, true);
    assert.deepEqual(entry.bounds, {
      minX: PLACE_DEFINITIONS[index].bounds.minX,
      maxX: PLACE_DEFINITIONS[index].bounds.maxX,
      minZ: PLACE_DEFINITIONS[index].bounds.minZ,
      maxZ: PLACE_DEFINITIONS[index].bounds.maxZ,
    });
  }

  // Renderer/editorial metadata never reaches the server projection.
  const raw = generateProjectionBytes();
  for (const forbidden of ['builderKey', 'minimapPath', 'objective', 'noteBody', '"seed"', 'district:', 'shell']) {
    assert.ok(!raw.includes(forbidden), `${forbidden} stays client-side`);
  }
});

test('roundtrip: exporting twice (and to a temp file) is byte-identical to the committed file', async () => {
  const committed = readFileSync(PLACE_PROJECTION_PATH, 'utf8');
  assert.equal(generateProjectionBytes(), committed, 'regeneration is deterministic');

  const dir = await mkdtemp(path.join(tmpdir(), 'place-projection-'));
  const written = await exportProjection(path.join(dir, 'place_definitions.json'));
  assert.equal(written, committed);

  await assert.doesNotReject(() => checkProjection(path.join(dir, 'place_definitions.json')));
});

test('--check catches a hand-edited or drifted committed file', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'place-projection-'));
  const target = path.join(dir, 'place_definitions.json');
  const bytes = await exportProjection(target);

  await assert.rejects(
    () => checkProjection(path.join(dir, 'missing.json')),
    /missing/,
  );

  const edited = bytes.replace('"theater"', '"theatre"');
  await (await import('node:fs/promises')).writeFile(target, edited);
  await assert.rejects(
    () => checkProjection(target),
    /drifted from shared\/placeDefinitions\.js/,
  );
});

test('the projection never includes personal gardens or test fixtures', () => {
  const doc = projectPlaceDefinitions();
  for (const entry of doc.entries) {
    assert.ok(!entry.id.startsWith('garden:'), `${entry.id} must not be a personal garden`);
    assert.notEqual(entry.id, PLACE_VIEW_FIXTURE.id, 'the test-only view is never projected');
  }
  assert.ok(!getPlaceDefinition('garden')?.id.startsWith('garden:'), 'the public Glass Garden district is a place, not a personal garden');

  // Defensive exporter: a garden-prefixed definition fails closed.
  assert.throws(() => projectPlace({ ...PLACE_DEFINITIONS[0], id: 'garden:someone' }), /never part of the public projection/);
});

test('the exporter fails closed on oversized or malformed manifests', () => {
  const oversized = Array.from({ length: PLACE_PROJECTION_MAX_ENTRIES + 1 }, (_, i) => ({
    ...PLACE_DEFINITIONS[0],
    id: `probe-place-${i}`,
  }));
  assert.throws(() => projectPlaceDefinitions(oversized), /exceeds 64 entries/);

  assert.throws(() => projectPlaceDefinitions([{ ...PLACE_DEFINITIONS[0] }, { ...PLACE_DEFINITIONS[0], id: 'court' }]), /duplicate public place id/);
  assert.throws(() => projectPlace({ id: 'bad kind', kind: 'environment', bounds: PLACE_DEFINITIONS[0].bounds, atmosphere: PLACE_DEFINITIONS[0].atmosphere }), /kebab-case/);
  assert.throws(() => projectPlace({ ...PLACE_DEFINITIONS[0], kind: 'castle' }), /kind must be/);
  assert.throws(() => projectPlace({ ...PLACE_DEFINITIONS[0], bounds: { ...PLACE_DEFINITIONS[0].bounds, minX: 99 } }), /bounds must not be inverted/);
  assert.throws(() => projectPlace({ ...PLACE_DEFINITIONS[0], atmosphere: { preset: 'x', weatherMode: 'sometimes', timeMode: 'fixed' } }), /weatherMode/);
});

test('serialization is stable: two-space JSON with a trailing newline', () => {
  const bytes = serializeProjection(projectPlaceDefinitions());
  assert.ok(bytes.endsWith('\n') && !bytes.endsWith('\n\n'));
  assert.ok(bytes.includes('  "schemaVersion": 1'));
  assert.equal(JSON.parse(bytes).schemaVersion, PLACE_PROJECTION_SCHEMA_VERSION);
});

test('the committed file ships the exact public ids and bounds both runtimes must agree on', () => {
  const committed = JSON.parse(readFileSync(PLACE_PROJECTION_PATH, 'utf8'));
  const theater = committed.entries.find(e => e.id === 'theater');
  assert.deepEqual(theater.bounds, { minX: -11.3, maxX: 11.3, minZ: -9.5, maxZ: 10.3 });
  assert.equal(theater.kind, 'venue');
  assert.deepEqual(committed.entries.find(e => e.id === 'court').atmosphere, { preset: 'rain-night', weatherMode: 'fixed', timeMode: 'fixed' });
});

// --- Atmosphere preset table (add-atmosphere-weather-system B 1.2) ---

test('the projection carries the build-controlled preset table as a semantic subset', () => {
  const doc = projectPlaceDefinitions();
  assert.deepEqual(Object.keys(doc), ['schemaVersion', 'entries', 'presets'], 'presets ride the same document, after entries');
  assert.ok(doc.presets.length <= PLACE_PROJECTION_MAX_PRESETS, 'the preset table stays bounded');
  assert.deepEqual(doc.presets.map(p => p.id), ATMOSPHERE_PRESET_IDS, 'preset order is canonical registry order');

  for (const preset of doc.presets) {
    assert.deepEqual(Object.keys(preset), ['id', 'weather', 'intensity', 'wind', 'rain', 'wetness', 'events', 'schedule'], 'semantic subset keys');
    assert.ok(['fixed', 'scheduled'].includes(preset.weather));
    assert.ok(preset.intensity >= 0 && preset.intensity <= 1);
    assert.equal(preset.wind.length, 2);
    for (const w of preset.wind) assert.ok(w >= -1 && w <= 1);
    if (preset.events) {
      if (preset.events.lightning) {
        assert.ok(preset.events.lightning.minMs >= 45_000 && preset.events.lightning.maxMs <= 90_000, 'lightning spacing stays inside the design bounds');
      }
      if (preset.events.meteor) {
        assert.ok(preset.events.meteor.minMs >= 35_000 && preset.events.meteor.maxMs <= 70_000, 'meteor spacing stays inside the design bounds');
      }
    }
    if (preset.schedule) {
      assert.ok(Number.isInteger(preset.schedule.cycleMs) && preset.schedule.cycleMs > 0);
      assert.ok(preset.schedule.keyframes.length >= 2);
      let previous = -1;
      for (const keyframe of preset.schedule.keyframes) {
        assert.ok(keyframe.atMs > previous && keyframe.atMs < preset.schedule.cycleMs, 'keyframes increase inside the cycle');
        previous = keyframe.atMs;
      }
    }
  }

  // Visual colors and audio mixes never reach the server projection.
  const raw = generateProjectionBytes();
  for (const forbidden of ['fogColor', 'sunColor', 'lowpassHz', 'visuals', 'audio']) {
    assert.ok(!raw.includes(forbidden), `${forbidden} stays client-side`);
  }
});

test('the exporter fails closed on unknown or out-of-contract presets', () => {
  assert.throws(() => projectPlace({ ...PLACE_DEFINITIONS[0], atmosphere: { preset: 'hyper-storm-proto', weatherMode: 'fixed', timeMode: 'fixed' } }), /not a known preset/);
  assert.equal(projectPreset('rain').id, 'rain');
});

test('the committed file ships the preset table verbatim for the Phoenix reader', () => {
  const committed = JSON.parse(readFileSync(PLACE_PROJECTION_PATH, 'utf8'));
  assert.deepEqual(committed.presets, projectPresets(), 'regeneration is byte-stable through the committed file');
  const rain = committed.presets.find(p => p.id === 'rain');
  assert.equal(rain.wetness, 1, 'fixed rain arrives wet (late-join rule)');
  assert.equal(rain.events.lightning.minMs, 45_000);
});
