import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readWorldSystemRollout,
  setWorldSystemRollout,
  WORLD_SYSTEM_STORAGE_KEY,
} from '../src/worlds/rollout.js';
import { ENVIRONMENT_QUALITY_KEY } from '../src/environments/quality.js';

function createMockStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: (key) => { store.delete(key); },
    has: (key) => store.has(key),
  };
}

test('query override ?world-system=off disables the world system', () => {
  const res = readWorldSystemRollout({
    getSearch: () => '?world-system=off',
    getStorage: () => createMockStorage(),
  });
  assert.equal(res, false);
});

test('query override ?world-system=on enables the world system', () => {
  const res = readWorldSystemRollout({
    getSearch: () => '?world-system=on',
    getStorage: () => createMockStorage({ [WORLD_SYSTEM_STORAGE_KEY]: 'off' }),
  });
  assert.equal(res, true);
});

test('storage override disables when off and enables when on', () => {
  const storageOff = createMockStorage({ [WORLD_SYSTEM_STORAGE_KEY]: 'off' });
  assert.equal(readWorldSystemRollout({ getSearch: () => '', getStorage: () => storageOff }), false);

  const storageOn = createMockStorage({ [WORLD_SYSTEM_STORAGE_KEY]: 'on' });
  assert.equal(readWorldSystemRollout({ getSearch: () => '', getStorage: () => storageOn }), true);
});

test('default rollout respects buildFlag when no query or storage is set', () => {
  assert.equal(readWorldSystemRollout({ getSearch: () => '', getStorage: () => createMockStorage(), buildFlag: true }), true);
  assert.equal(readWorldSystemRollout({ getSearch: () => '', getStorage: () => createMockStorage(), buildFlag: false }), false);
});

test('setWorldSystemRollout sets and clears storage without mutating unrelated keys', () => {
  const storage = createMockStorage({
    [ENVIRONMENT_QUALITY_KEY]: JSON.stringify({ version: 2, worldId: 'alpine', variantId: 'aurora' }),
    'afterlight-save': 'test-save',
  });

  setWorldSystemRollout(false, { getStorage: () => storage });
  assert.equal(storage.getItem(WORLD_SYSTEM_STORAGE_KEY), 'off');

  // Verify other keys intact
  assert.ok(storage.has(ENVIRONMENT_QUALITY_KEY));
  assert.equal(storage.getItem('afterlight-save'), 'test-save');

  setWorldSystemRollout(null, { getStorage: () => storage });
  assert.equal(storage.has(WORLD_SYSTEM_STORAGE_KEY), false);
  assert.ok(storage.has(ENVIRONMENT_QUALITY_KEY));
});
