import test from 'node:test';
import assert from 'node:assert/strict';
import { NetworkClient } from '../src/net/client.js';

const GUEST_KEY = 'afterlight-guest-id';
const NICK_KEY = 'afterlight-nickname';
const LEGACY_GUEST_KEY = 'afterlight-gardener-guest-id';
const LEGACY_NICK_KEY = 'afterlight-gardener-nickname';

function useStorage(initial = {}) {
  const store = { ...initial };
  globalThis.localStorage = {
    getItem: (key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
  };
  return store;
}

function makeClient() {
  return new NetworkClient('ws://127.0.0.1:1/ws');
}

test('new players get the new storage keys only', () => {
  const store = useStorage();
  const client = makeClient();
  assert.match(client.guestId, /^guest_/);
  assert.equal(store[GUEST_KEY], client.guestId);
  assert.equal(store[NICK_KEY], client.nickname);
  assert.ok(!(LEGACY_GUEST_KEY in store), 'no gardener-era guest key is created');
  assert.ok(!(LEGACY_NICK_KEY in store), 'no gardener-era nickname key is created');
});

test('legacy gardener-era keys migrate without losing identity', () => {
  const store = useStorage({
    [LEGACY_GUEST_KEY]: 'guest_legacy_1',
    [LEGACY_NICK_KEY]: 'CopperLantern42',
  });
  const client = makeClient();
  assert.equal(client.guestId, 'guest_legacy_1');
  assert.equal(client.nickname, 'CopperLantern42');
  assert.equal(store[GUEST_KEY], 'guest_legacy_1');
  assert.equal(store[NICK_KEY], 'CopperLantern42');
  assert.equal(store[LEGACY_GUEST_KEY], 'guest_legacy_1', 'legacy value is not deleted');
  assert.equal(store[LEGACY_NICK_KEY], 'CopperLantern42', 'legacy value is not deleted');
});

test('new keys win over legacy values', () => {
  const store = useStorage({
    [GUEST_KEY]: 'guest_new_1',
    [NICK_KEY]: 'RustCompass17',
    [LEGACY_GUEST_KEY]: 'guest_legacy_1',
    [LEGACY_NICK_KEY]: 'OldName',
  });
  const client = makeClient();
  assert.equal(client.guestId, 'guest_new_1');
  assert.equal(client.nickname, 'RustCompass17');
});

test('storage failures keep a session-local identity', () => {
  globalThis.localStorage = {
    getItem() { throw new Error('denied'); },
    setItem() { throw new Error('denied'); },
  };
  const client = makeClient();
  assert.match(client.guestId, /^guest_/);
  assert.ok(client.nickname.length >= 3);
  client.setNickname('QuietSignal9');
  assert.equal(client.nickname, 'QuietSignal9');
});
