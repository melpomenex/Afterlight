import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WORLD_DEFINITIONS,
  WORLD_IDS,
  DEFAULT_WORLD_ID,
  DEFAULT_WORLD_VARIANT,
  getWorldDefinition,
  getWorldVariant,
  worldVariantEntries,
  worldForPreset,
  worldVariantPreset,
  isWorldPreset,
  randomWorldSelection,
  validateWorldDefinitions,
} from '../shared/worldDefinitions.js';
import {
  THEATER_ENVIRONMENTS,
  THEATER_ENVIRONMENT_IDS,
  getTheaterEnvironment,
  getTheaterVariant,
  environmentVariantEntries,
  environmentForPreset,
  environmentVariantPreset,
  isEnvironmentPreset,
  validateTheaterEnvironments,
} from '../shared/theaterEnvironments.js';

test('world definitions catalog contains exactly the 6 authored worlds', () => {
  assert.deepEqual(WORLD_IDS, ['coastal', 'rainforest', 'alpine', 'desert', 'redwood', 'cloud']);
  for (const id of WORLD_IDS) {
    const def = getWorldDefinition(id);
    assert.ok(def, `world ${id} must exist`);
    assert.equal(def.id, id);
    assert.equal(def.version, 1);
    assert.ok(Array.isArray(def.assetKit));
    assert.ok(def.interpretations && typeof def.interpretations === 'object');
    assert.ok(def.variants[def.defaultVariant], `defaultVariant ${def.defaultVariant} must be in variants`);
  }
});

test('world definitions contain exactly 18 variants with unique presets', () => {
  const entries = worldVariantEntries();
  assert.equal(entries.length, 18, 'must have exactly 18 variants across 6 worlds');
  const seenPresets = new Set();
  for (const { worldId, variantId, row } of entries) {
    assert.ok(row.preset.startsWith('env-'));
    assert.equal(row.atmospherePreset, row.preset);
    assert.ok(!seenPresets.has(row.preset), `duplicate preset ${row.preset}`);
    seenPresets.add(row.preset);
    assert.equal(worldVariantPreset(worldId, variantId), row.preset);
    assert.ok(isWorldPreset(row.preset));
    const lookup = worldForPreset(row.preset);
    assert.equal(lookup.worldId, worldId);
    assert.equal(lookup.variantId, variantId);
    assert.equal(lookup.row.preset, row.preset);
  }
});

test('validateWorldDefinitions passes on canonical catalog', () => {
  const problems = validateWorldDefinitions();
  assert.deepEqual(problems, []);
});

test('randomWorldSelection chooses a valid world and default variant', () => {
  const customRng = () => 0.5; // selects middle
  const selection = randomWorldSelection(customRng);
  assert.ok(WORLD_IDS.includes(selection.worldId));
  const def = getWorldDefinition(selection.worldId);
  assert.equal(selection.variantId, def.defaultVariant);
});

test('theaterEnvironments compatibility exports remain identical to worldDefinitions', () => {
  assert.equal(THEATER_ENVIRONMENTS, WORLD_DEFINITIONS);
  assert.deepEqual(THEATER_ENVIRONMENT_IDS, WORLD_IDS);
  assert.equal(getTheaterEnvironment('coastal'), getWorldDefinition('coastal'));
  assert.equal(getTheaterVariant('coastal', 'sunset'), getWorldVariant('coastal', 'sunset'));
  assert.equal(environmentVariantEntries().length, 18);
  assert.equal(environmentVariantPreset('desert', 'golden'), worldVariantPreset('desert', 'golden'));
  assert.ok(isEnvironmentPreset('env-alpine-aurora'));
  assert.equal(environmentForPreset('env-cloud-storm')?.row.preset, 'env-cloud-storm');
  assert.deepEqual(validateTheaterEnvironments(), []);
});
