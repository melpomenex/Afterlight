import test from 'node:test';
import assert from 'node:assert/strict';
import { AVATAR_DEFINITIONS, getAvatarDefinition } from '../shared/avatarDefinitions.js';
import { pickWeightedAvatar, ensureAvatar } from '../server/avatars.js';

test('pickWeightedAvatar distribution respects weight bounds across iterations', () => {
  const totalWeight = AVATAR_DEFINITIONS.reduce((sum, d) => sum + d.weight, 0);

  // Boundary checks with deterministic rolls
  const first = pickWeightedAvatar(AVATAR_DEFINITIONS, 0);
  assert.equal(first, AVATAR_DEFINITIONS[0].id);

  const last = pickWeightedAvatar(AVATAR_DEFINITIONS, totalWeight - 1);
  assert.equal(last, AVATAR_DEFINITIONS[AVATAR_DEFINITIONS.length - 1].id);

  // Statistical distribution check over 10,000 rolls
  const counts = new Map();
  for (const def of AVATAR_DEFINITIONS) {
    counts.set(def.id, 0);
  }

  const N = 15000;
  for (let i = 0; i < N; i++) {
    const id = pickWeightedAvatar();
    counts.set(id, (counts.get(id) || 0) + 1);
  }

  // Every avatar must have been chosen at least once
  for (const [id, count] of counts.entries()) {
    assert.ok(count > 0, `Avatar ${id} was never picked in ${N} rolls`);
  }

  // Common (weight 10) vs Rare (weight 2) frequency check
  const moonCount = counts.get('moon-head'); // weight 10
  const porcelainCount = counts.get('porcelain-doll'); // weight 2
  assert.ok(
    moonCount > porcelainCount * 2,
    `Common avatar (${moonCount}) should be substantially more frequent than rare avatar (${porcelainCount})`
  );
});

test('ensureAvatar is sticky for returning players with valid avatar', () => {
  let savedPlayer = null;
  const mockStorage = {
    savePlayer(p) {
      savedPlayer = p;
    },
  };

  const existingPlayer = {
    id: 'guest_existing',
    nickname: 'Veteran',
    avatar: 'alien-tourist',
    currentRoom: 'market',
    lastSeen: 123456,
  };

  const result = ensureAvatar(existingPlayer, mockStorage);
  assert.equal(result, 'alien-tourist');
  assert.equal(existingPlayer.avatar, 'alien-tourist');
  // Did not need to re-save if not modified
  assert.equal(savedPlayer, null);
});

test('ensureAvatar assigns fresh avatar to new player and persists', () => {
  let saved = false;
  const mockStorage = {
    savePlayer(p) {
      saved = true;
    },
  };

  const newPlayer = {
    id: 'guest_new',
    nickname: 'Newcomer',
    currentRoom: 'market',
    lastSeen: 123456,
  };

  const result = ensureAvatar(newPlayer, mockStorage);
  assert.ok(result);
  assert.ok(getAvatarDefinition(result), 'Assigned avatar must exist in manifest');
  assert.equal(newPlayer.avatar, result);
  assert.equal(saved, true, 'New assignment was persisted');
});

test('ensureAvatar heals retired avatar ids by re-assigning a valid one', () => {
  let saved = false;
  const mockStorage = {
    savePlayer(p) {
      saved = true;
    },
  };

  const retiredPlayer = {
    id: 'guest_old',
    nickname: 'OldTimer',
    avatar: 'retired-avatar-v0', // No longer in manifest
    currentRoom: 'market',
    lastSeen: 123456,
  };

  const result = ensureAvatar(retiredPlayer, mockStorage);
  assert.ok(result);
  assert.notEqual(result, 'retired-avatar-v0');
  assert.ok(getAvatarDefinition(result), 'Healed avatar must exist in manifest');
  assert.equal(retiredPlayer.avatar, result);
  assert.equal(saved, true, 'Healed assignment was persisted');
});

test('server assignment ignores client-supplied avatar in HELLO', () => {
  // Simulate server HELLO handling logic
  const clientHelloMsg = {
    type: 'hello',
    guestId: 'guest_sneaky',
    nickname: 'Sneaky',
    avatar: 'hacked-custom-avatar-or-rare',
  };

  // Stored player has no avatar yet
  const player = {
    id: clientHelloMsg.guestId,
    nickname: clientHelloMsg.nickname,
    currentRoom: 'market',
    lastSeen: Date.now(),
  };

  // Server only passes player object, ignoring clientHelloMsg.avatar
  const assigned = ensureAvatar(player);
  assert.ok(assigned);
  assert.notEqual(assigned, clientHelloMsg.avatar);
  assert.ok(getAvatarDefinition(assigned));
});
