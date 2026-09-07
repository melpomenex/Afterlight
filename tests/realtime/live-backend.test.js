import { test } from 'node:test';
import assert from 'node:assert/strict';
import { playerEntityId } from '../../shared/realtime/entityId.js';
import { LiveRemoteBackend, createLiveEntitySession } from '../../src/realtime/liveBackend.js';
import { createPack } from '../../src/realtime/worker/core.js';

test('playerEntityId is stable FNV-1a u32', () => {
  const a = playerEntityId('guest_abc');
  const b = playerEntityId('guest_abc');
  assert.equal(a, b);
  assert.equal(typeof a, 'number');
  assert.ok(a <= 0xFFFFFFFF);
});

test('LiveRemoteBackend drives RemotePlayersManager and excludes local guest', () => {
  const scene = { add() {}, remove() {} };
  const calls = [];
  const remotePlayers = {
    setPlayer: (p) => calls.push(['set', p.id]),
    removePlayer: (id) => calls.push(['rm', id]),
    update: () => {},
    clear: () => {},
  };
  const backend = new LiveRemoteBackend({
    remotePlayers,
    excludedIds: new Set(['guest_me']),
  });
  const pack = createPack(8);
  pack.tick = 1;
  pack.joined = [{ entityId: 10, guestId: 'guest_remote', x: 1, z: 2 }];
  pack.count = 1;
  pack.ids[0] = 10;
  pack.x[0] = 1;
  pack.z[0] = 2;
  pack.yaw[0] = 0;
  pack.flags[0] = 1;
  const guestIds = new Map();
  backend.applyDeltaPack(pack, { guestIds });

  assert.deepEqual(calls, [['set', 'guest_remote']]);

  pack.left = [10];
  pack.count = 0;
  backend.applyDeltaPack(pack, { guestIds });
  assert.deepEqual(calls, [['set', 'guest_remote'], ['rm', 'guest_remote']]);
});

test('createLiveEntitySession exposes presence bridge hooks', () => {
  const remotePlayers = {
    setPlayer() {},
    removePlayer() {},
    update() {},
    clear() {},
  };
  const session = createLiveEntitySession({ remotePlayers, guestId: 'guest_me' });
  assert.equal(session.handlesPresence(), true);
  session.applyPresencePlayer({ id: 'guest_other', x: 0, z: 0, rotY: 0 });
  session.removePresencePlayer('guest_other');
});
