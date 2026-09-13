import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorldState, validateAndRepairSelection } from '../src/worlds/state.js';
import { WORLD_IDS, getWorldDefinition } from '../shared/worldDefinitions.js';
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

test('initial assignment uses injected RNG uniformly when no saved preference exists and persists', () => {
  const storage = createMockStorage();
  // RNG returning 0.3 should pick floor(0.3 * 6) = 1 -> WORLD_IDS[1] = 'rainforest'
  const state = createWorldState({
    storage,
    rng: () => 0.3,
  });

  const snap = state.snapshot();
  assert.equal(snap.worldId, 'rainforest');
  assert.equal(snap.variantId, getWorldDefinition('rainforest').defaultVariant);
  assert.equal(snap.saved, true);
  assert.equal(snap.isPreview, false);

  // Check persisted in storage
  const stored = JSON.parse(storage.getItem(ENVIRONMENT_QUALITY_KEY));
  assert.equal(stored.worldId, 'rainforest');
  assert.equal(stored.variantId, 'mist');
});

test('saved preference is restored without rerolling on subsequent instantiation', () => {
  const storage = createMockStorage({
    [ENVIRONMENT_QUALITY_KEY]: JSON.stringify({
      version: 2,
      worldId: 'alpine',
      variantId: 'snowfall',
    }),
  });

  // Even with an RNG that would pick index 0 ('coastal')
  const state = createWorldState({
    storage,
    rng: () => 0.0,
  });

  const snap = state.snapshot();
  assert.equal(snap.worldId, 'alpine');
  assert.equal(snap.variantId, 'snowfall');
  assert.equal(snap.saved, true);
});

test('storage denial preserves selection in session without throwing and marks saved: false', () => {
  const throwingStorage = {
    getItem: () => null,
    setItem: () => { throw new Error('QuotaExceeded'); },
  };

  const state = createWorldState({
    storage: throwingStorage,
    rng: () => 0.5,
  });

  const snap = state.snapshot();
  assert.ok(WORLD_IDS.includes(snap.worldId));
  assert.equal(snap.saved, false);
  assert.equal(snap.storageAvailable, false);

  // Subsequent select in session works without throwing
  const nextSnap = state.select({ worldId: 'desert', variantId: 'golden' });
  assert.equal(nextSnap.worldId, 'desert');
  assert.equal(nextSnap.saved, false);
});

test('session preview does not overwrite durable selection until explicit select', () => {
  const storage = createMockStorage({
    [ENVIRONMENT_QUALITY_KEY]: JSON.stringify({
      version: 2,
      worldId: 'redwood',
      variantId: 'fog',
    }),
  });

  const state = createWorldState({
    storage,
    initialSelection: { worldId: 'coastal', variantId: 'storm' },
    isPreview: true,
  });

  const snap = state.snapshot();
  assert.equal(snap.worldId, 'coastal');
  assert.equal(snap.variantId, 'storm');
  assert.equal(snap.isPreview, true);
  assert.equal(snap.saved, false);
  assert.equal(snap.durableWorldId, 'redwood');

  // Durable preference in storage remains redwood
  const stored = JSON.parse(storage.getItem(ENVIRONMENT_QUALITY_KEY));
  assert.equal(stored.worldId, 'redwood');

  // Explicit selection persists and clears preview
  state.select({ worldId: 'coastal', variantId: 'storm', persist: true });
  const finalSnap = state.snapshot();
  assert.equal(finalSnap.isPreview, false);
  assert.equal(finalSnap.saved, true);
  assert.equal(finalSnap.durableWorldId, 'coastal');

  const finalStored = JSON.parse(storage.getItem(ENVIRONMENT_QUALITY_KEY));
  assert.equal(finalStored.worldId, 'coastal');
});

test('state subscription notifies on selection change and increments revision', () => {
  const storage = createMockStorage();
  const state = createWorldState({ storage, rng: () => 0.0 });
  const initialRev = state.revision;

  const notifications = [];
  const unsubscribe = state.subscribe((s) => notifications.push(s));

  state.select({ worldId: 'cloud', variantId: 'day' });
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].worldId, 'cloud');
  assert.equal(notifications[0].revision, initialRev + 1);

  unsubscribe();
  state.select({ worldId: 'alpine', variantId: 'aurora' });
  assert.equal(notifications.length, 1);
});
