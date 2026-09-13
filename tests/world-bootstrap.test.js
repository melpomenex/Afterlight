import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveWorldUrlPreview,
  resolveBootstrapWorldState,
} from '../src/worlds/state.js';
import { ENVIRONMENT_QUALITY_KEY } from '../src/environments/quality.js';

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

test('resolveWorldUrlPreview resolves valid ?preset', () => {
  const res = resolveWorldUrlPreview('?preset=env-desert-night');
  assert.deepEqual(res, {
    worldId: 'desert',
    variantId: 'night',
    preset: 'env-desert-night',
  });
});

test('valid ?preset takes precedence over valid ?world', () => {
  const res = resolveWorldUrlPreview('?preset=env-alpine-snowfall&world=coastal');
  assert.equal(res.worldId, 'alpine');
  assert.equal(res.variantId, 'snowfall');
});

test('invalid ?preset falls through to valid ?world', () => {
  const res = resolveWorldUrlPreview('?preset=env-unknown&world=rainforest&variant=thunderstorm');
  assert.equal(res.worldId, 'rainforest');
  assert.equal(res.variantId, 'thunderstorm');
});

test('valid ?world uses defaultVariant when variant is missing or invalid', () => {
  const res = resolveWorldUrlPreview('?world=cloud&variant=not-a-real-variant');
  assert.equal(res.worldId, 'cloud');
  assert.equal(res.variantId, 'sunrise');
});

test('invalid ?world and invalid ?preset return null', () => {
  const res = resolveWorldUrlPreview('?world=atlantis&preset=env-bogus');
  assert.equal(res, null);
});

test('resolveBootstrapWorldState with preview creates durable preference if missing, but active is preview', () => {
  const storage = createMockStorage();
  // RNG picks index 0 ('coastal')
  const state = resolveBootstrapWorldState({
    search: '?preset=env-desert-golden',
    storage,
    rng: () => 0.0,
  });

  const snap = state.snapshot();
  assert.equal(snap.worldId, 'desert');
  assert.equal(snap.variantId, 'golden');
  assert.equal(snap.isPreview, true);
  assert.equal(snap.saved, false);
  // Durable selection assigned was coastal
  assert.equal(snap.durableWorldId, 'coastal');

  const stored = JSON.parse(storage.getItem(ENVIRONMENT_QUALITY_KEY));
  assert.equal(stored.worldId, 'coastal');

  // Explicitly saving preview promotes it to durable
  state.select({ worldId: 'desert', variantId: 'golden', persist: true });
  assert.equal(state.snapshot().isPreview, false);
  assert.equal(state.snapshot().saved, true);
  assert.equal(state.snapshot().durableWorldId, 'desert');

  const storedAfter = JSON.parse(storage.getItem(ENVIRONMENT_QUALITY_KEY));
  assert.equal(storedAfter.worldId, 'desert');
});

test('reload without query parameters restores the durable preference', () => {
  const storage = createMockStorage({
    [ENVIRONMENT_QUALITY_KEY]: JSON.stringify({
      version: 2,
      worldId: 'redwood',
      variantId: 'firefly',
    }),
  });

  const state = resolveBootstrapWorldState({
    search: '',
    storage,
  });

  const snap = state.snapshot();
  assert.equal(snap.worldId, 'redwood');
  assert.equal(snap.variantId, 'firefly');
  assert.equal(snap.isPreview, false);
  assert.equal(snap.saved, true);
});
