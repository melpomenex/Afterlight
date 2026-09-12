// End-to-end avatar path (fix-remote-avatar-flicker): real snapshot bytes
// through wireRealtime + LiveRemoteBackend drive RemotePlayersManager without
// clear/recreate storms, placeholder avatars, or self/Kiln avatars.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wireRealtime } from '../../src/realtime/wire.js';
import { encodeSnapshot } from '../../shared/realtime/nodeBinaryFlush.js';
import { playerEntityId } from '../../shared/realtime/entityId.js';
import { createPack } from '../../src/realtime/worker/core.js';

function makeRemotePlayers() {
  const players = new Map();
  const calls = [];
  return {
    players,
    calls,
    setPlayer(p) {
      const prev = players.get(p.id);
      calls.push(['set', p.id]);
      players.set(p.id, prev
        ? { ...prev, ...p, nickname: p.nickname ?? prev.nickname }
        : { ...p });
    },
    removePlayer(id) {
      calls.push(['remove', id]);
      players.delete(id);
    },
    clear() {
      calls.push(['clear']);
      players.clear();
    },
    update() {},
  };
}

function makeNet(guestId = 'guest_me') {
  const handlers = new Map();
  return {
    guestId,
    desiredRoom: 'theater',
    handlers,
    on(event, fn) { handlers.set(event, fn); },
    send: () => {},
    handleBinary: null,
    rtHello: null,
  };
}

function feed(net, bytes) {
  net.handleBinary(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}

function makeWire(guestId = 'guest_me') {
  const remotePlayers = makeRemotePlayers();
  const net = makeNet(guestId);
  const wire = wireRealtime({
    net,
    remotePlayers,
    guestId,
    flags: { realtime_binary: true, realtime_worker: false, renderer_webgpu_fastpath: false },
  });
  return { wire, net, remotePlayers };
}

test('live binary snapshots drive remote avatars without clear/recreate storms', () => {
  const { wire, net, remotePlayers } = makeWire();

  // Join roster (JSON) creates the avatar with its nickname.
  wire.consumePresenceJoin({
    player: { id: 'guest_remote', nickname: 'MossRadish42', x: 1, z: 1, rotY: 0 },
  });
  assert.equal(remotePlayers.players.get('guest_remote').nickname, 'MossRadish42');

  const snapshot = (seq, x) => encodeSnapshot([
    { id: 'guest_remote', x, z: 2, rotY: 0.25, walking: true },
    { id: 'guest_me', x: 0, z: 0, rotY: 0 },
    { id: 'kiln', x: 0.5, z: 0.5, rotY: 0 },
  ], seq, seq);

  feed(net, snapshot(1, 5));
  const after = remotePlayers.players.get('guest_remote');
  assert.equal(after.x, 5, 'binary snapshot updates the avatar target');
  assert.equal(after.z, 2);
  assert.equal(after.rotY, 0.25);
  assert.equal(after.walking, true, 'pose flags ride the snapshot');
  assert.equal(remotePlayers.players.has('guest_me'), false, 'the local guest is never a remote avatar');
  assert.equal(remotePlayers.players.has('kiln'), false, 'Kiln is never a remote avatar');

  // Travel: JOIN_ROOM resets the decode session while the server's transport
  // sequence keeps counting (the shipped pre-fix resync loop).
  const clears = () => remotePlayers.calls.filter(([kind]) => kind === 'clear').length;
  net.send('join_room', { roomId: 'market' });
  feed(net, snapshot(5, 7));
  feed(net, snapshot(6, 8));
  assert.equal(remotePlayers.players.get('guest_remote').x, 8, 'post-travel snapshots keep applying');
  assert.equal(clears(), 0, 'no clear/recreate storm after a room change');

  wire.dispose();
});

test('WASM-shaped spawn rows without guest ids never create placeholder avatars', () => {
  const { wire, remotePlayers } = makeWire();

  wire.consumePresenceJoin({
    player: { id: 'guest_remote', nickname: 'MossRadish42', x: 1, z: 1, rotY: 0 },
  });
  const entityId = playerEntityId('guest_remote');
  const guestIds = wire.pipeline.consumer.guestIds;

  // The WASM decoder emits spawn rows with guestId: null and the numeric
  // entity id as `id`; identity comes from the JSON presence bridge.
  const pack = createPack(4);
  pack.tick = 2;
  pack.joined = [{ entityId, guestId: null, id: entityId, x: 3, z: 3, yaw: 0 }];
  pack.count = 1;
  pack.ids[0] = entityId;
  pack.x[0] = 3;
  pack.z[0] = 3;
  pack.yaw[0] = 0;
  pack.flags[0] = 1;

  for (let i = 0; i < 4; i++) {
    wire.entitySession.backend.applyDeltaPack(pack, { guestIds });
  }
  assert.equal(remotePlayers.players.has(String(entityId)), false, 'no numeric placeholder avatar');
  assert.equal(remotePlayers.players.get('guest_remote').x, 3, 'the resolved guest avatar updates');
  assert.equal(wire.entitySession.backend.live, 1, 'repeated spawn rows do not inflate liveness');

  // A row with no known mapping at all is skipped rather than keyed by id.
  const unknown = createPack(2);
  unknown.tick = 3;
  unknown.joined = [{ entityId: 999999, guestId: null, id: 999999, x: 0, z: 0, yaw: 0 }];
  wire.entitySession.backend.applyDeltaPack(unknown, { guestIds });
  assert.equal(remotePlayers.players.has('999999'), false, 'unresolved spawn rows are skipped');
  assert.equal(remotePlayers.players.size, 1);
  assert.equal(wire.entitySession.backend.live, 1);

  wire.dispose();
});

test('binary leave through the pipeline removes the guest-keyed avatar', () => {
  const { wire, net, remotePlayers } = makeWire();
  wire.consumePresenceJoin({
    player: { id: 'guest_remote', nickname: 'MossRadish42', x: 1, z: 1, rotY: 0 },
  });
  feed(net, encodeSnapshot([{ id: 'guest_remote', x: 2, z: 2, rotY: 0 }], 1, 1));
  assert.ok(remotePlayers.players.has('guest_remote'));

  // Synthetic despawn (the shape the consumer produces from a DESPAWN
  // section): the avatar must be removed by guest id, not by numeric id.
  const entityId = playerEntityId('guest_remote');
  wire.pipeline.consumer.consume({
    joined: [],
    left: [entityId],
    count: 0,
    ids: new Uint32Array(0),
    x: new Float32Array(0),
    z: new Float32Array(0),
    yaw: new Float32Array(0),
    flags: new Uint8Array(0),
  });
  assert.equal(remotePlayers.players.has('guest_remote'), false, 'departure removes the guest avatar');
  assert.equal(remotePlayers.players.has(String(entityId)), false);

  wire.dispose();
});
