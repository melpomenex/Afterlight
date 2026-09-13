import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ENVIRONMENT_QUALITY_KEY,
  loadEnvironmentPreferences,
  saveEnvironmentPreferences,
  normalizeWorldPreferences,
} from '../src/environments/quality.js';
import { getWorldDefinition } from '../shared/worldDefinitions.js';

function createMockStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: (key) => { store.delete(key); },
    has: (key) => store.has(key),
    dump: () => Object.fromEntries(store.entries()),
  };
}

test('normalizeWorldPreferences migrates valid v1 record', () => {
  const v1 = { quality: 'low', environment: 'alpine', variant: 'aurora' };
  const res = normalizeWorldPreferences(v1);
  assert.equal(res.worldId, 'alpine');
  assert.equal(res.variantId, 'aurora');
});

test('normalizeWorldPreferences infers default variant when variant is invalid or missing', () => {
  const v1 = { quality: 'medium', environment: 'desert', variant: 'invalid-variant' };
  const res = normalizeWorldPreferences(v1);
  assert.equal(res.worldId, 'desert');
  assert.equal(res.variantId, getWorldDefinition('desert').defaultVariant);
});

test('normalizeWorldPreferences rejects corrupt or removed worldId in v2 without using mirrors', () => {
  const v2 = {
    version: 2,
    quality: 'high',
    worldId: 'space-station',
    variantId: 'orbit',
    environment: 'coastal',
    variant: 'sunset',
  };
  const res = normalizeWorldPreferences(v2);
  assert.equal(res.worldId, null);
  assert.equal(res.variantId, null);
});

test('saveEnvironmentPreferences writes v2 record with compatibility mirrors and preserves unrelated fields', () => {
  const storage = createMockStorage({
    [ENVIRONMENT_QUALITY_KEY]: JSON.stringify({
      version: 1,
      quality: 'low',
      unrelatedCustomField: 'keep-me',
    }),
    'afterlight-save': JSON.stringify({ playerPos: [0, 0] }),
  });

  const ok = saveEnvironmentPreferences(
    { worldId: 'rainforest', variantId: 'thunderstorm' },
    storage,
  );
  assert.equal(ok, true);

  const raw = JSON.parse(storage.getItem(ENVIRONMENT_QUALITY_KEY));
  assert.equal(raw.version, 2);
  assert.equal(raw.quality, 'low');
  assert.equal(raw.worldId, 'rainforest');
  assert.equal(raw.variantId, 'thunderstorm');
  assert.equal(raw.environment, 'rainforest'); // mirror
  assert.equal(raw.variant, 'thunderstorm'); // mirror
  assert.equal(raw.unrelatedCustomField, 'keep-me');

  // Verify unrelated save key untouched
  assert.ok(storage.has('afterlight-save'));
  assert.equal(storage.getItem('afterlight-save'), JSON.stringify({ playerPos: [0, 0] }));
});

test('quality-only edits preserve existing world selection', () => {
  const storage = createMockStorage({
    [ENVIRONMENT_QUALITY_KEY]: JSON.stringify({
      version: 2,
      quality: 'low',
      worldId: 'redwood',
      variantId: 'fog',
    }),
  });

  const ok = saveEnvironmentPreferences({ quality: 'ultra' }, storage);
  assert.equal(ok, true);

  const raw = JSON.parse(storage.getItem(ENVIRONMENT_QUALITY_KEY));
  assert.equal(raw.version, 2);
  assert.equal(raw.quality, 'ultra');
  assert.equal(raw.worldId, 'redwood');
  assert.equal(raw.variantId, 'fog');
});

test('storage failures return false gracefully without throwing', () => {
  const throwingStorage = {
    getItem: () => { throw new Error('QuotaExceeded'); },
    setItem: () => { throw new Error('QuotaExceeded'); },
  };

  const loaded = loadEnvironmentPreferences({ storage: throwingStorage });
  assert.ok(loaded.prefs);
  assert.equal(loaded.fromStorage, false);

  const saved = saveEnvironmentPreferences({ quality: 'high' }, throwingStorage);
  assert.equal(saved, false);
});
