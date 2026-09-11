import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MOUSE_LOOK_PREF_KEY, readMouseLookPreference, writeMouseLookPreference,
} from '../src/ui/mouseLookPreference.js';

// Minimal Storage stand-in so tests never touch real localStorage.
function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
  };
}

test('missing preference defaults to mouse look enabled', () => {
  assert.equal(readMouseLookPreference(fakeStorage()), true);
  assert.equal(readMouseLookPreference(null), true, 'no storage at all still defaults to enabled');
});

test('only the exact off string disables mouse look; corrupt values are ignored', () => {
  assert.equal(readMouseLookPreference(fakeStorage({ [MOUSE_LOOK_PREF_KEY]: 'off' })), false);
  assert.equal(readMouseLookPreference(fakeStorage({ [MOUSE_LOOK_PREF_KEY]: 'on' })), true);
  assert.equal(readMouseLookPreference(fakeStorage({ [MOUSE_LOOK_PREF_KEY]: 'yes' })), true,
    'a corrupt value falls back to the enabled default');
  assert.equal(readMouseLookPreference(fakeStorage({ [MOUSE_LOOK_PREF_KEY]: '' })), true);
});

test('read failures fall back to enabled without throwing', () => {
  const hostile = { getItem: () => { throw new Error('security error'); } };
  assert.equal(readMouseLookPreference(hostile), true);
});

test('preference round-trips in both directions', () => {
  const storage = fakeStorage();
  assert.equal(writeMouseLookPreference(false, storage), true);
  assert.equal(readMouseLookPreference(storage), false);
  assert.equal(writeMouseLookPreference(true, storage), true);
  assert.equal(readMouseLookPreference(storage), true);
  assert.equal(storage.getItem(MOUSE_LOOK_PREF_KEY), 'on');
});

test('write failure keeps the choice session-local and reports it honestly', () => {
  const hostile = { setItem: () => { throw new Error('quota exceeded'); } };
  assert.equal(writeMouseLookPreference(false, hostile), false,
    'the caller must not claim a saved preference when storage refused it');
});
