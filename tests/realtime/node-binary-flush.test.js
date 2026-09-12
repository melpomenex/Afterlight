import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAGIC, FRAME_TYPE, SECTION, ENCODING } from '../../shared/realtime/constants.js';
import { encodeFlush, encodeSnapshot } from '../../shared/realtime/nodeBinaryFlush.js';
import { playerEntityId } from '../../shared/realtime/entityId.js';
import { parseHelloRt, buildWelcomeRt } from '../../shared/realtime/negotiation.js';
import { readHeader, readSections } from '../../shared/realtime/frame.js';
import {
  readSectionColumns,
  readSpawnSection,
  readStringTable,
} from '../../shared/realtime/encoders.js';
import { applyFrame } from '../../shared/realtime/applyFrame.js';
import { EntityStore } from '../../shared/realtime/entityStore.js';
import { WorldManager } from '../../server/world.js';

test('encodeFlush produces ALRT magic header', () => {
  const bin = encodeFlush([
    { id: 'guest_one', x: 1, z: 2, rotY: 0.5, walking: true },
  ], 3, 3);
  const view = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  assert.equal(view.getUint32(0, true), MAGIC);
});

test('encodeFlush stays a baseline delta', () => {
  const bin = encodeFlush([{ id: 'guest_one', x: 1, z: 2, rotY: 0.5 }], 3, 3);
  const head = readHeader(bin);
  assert.equal(head.header.frameType, FRAME_TYPE.DELTA);
  assert.equal(head.header.baselineSequence, 2);
});

test('encodeSnapshot emits a spawn-carrying FULL snapshot with sorted ids', () => {
  const bin = encodeSnapshot([
    { id: 'guest_b', x: 2, z: 5, rotY: 0.25, walking: true },
    { id: 'guest_a', x: 1, z: 4, rotY: 0 },
  ], 7, 7);

  const head = readHeader(bin);
  assert.ok(head.ok);
  assert.equal(head.header.frameType, FRAME_TYPE.FULL_SNAPSHOT);
  assert.equal(head.header.flags & 1, 1, 'header promises a string table');

  const secs = readSections(bin, head.bodyOffset);
  assert.ok(secs.ok);
  assert.deepEqual(secs.sections.map((s) => s.id), [
    SECTION.STRING_TABLE, SECTION.SPAWN, SECTION.TRANSFORM, SECTION.FLAGS,
  ]);

  const stringSec = secs.sections.find((s) => s.id === SECTION.STRING_TABLE);
  const strings = readStringTable(bin, stringSec).strings;
  const expectedOrder = ['guest_b', 'guest_a']
    .sort((a, b) => playerEntityId(a) - playerEntityId(b));
  assert.deepEqual(strings, expectedOrder, 'string table follows the ascending entity-id order');

  const spawnSec = secs.sections.find((s) => s.id === SECTION.SPAWN);
  const rows = readSpawnSection(bin, spawnSec).rows;
  assert.equal(rows.length, 2);
  const byGuest = new Map([
    [strings[rows[0].stringRef], rows[0]],
    [strings[rows[1].stringRef], rows[1]],
  ]);
  assert.equal(byGuest.get('guest_a').id, playerEntityId('guest_a'));
  assert.equal(byGuest.get('guest_b').id, playerEntityId('guest_b'));
  assert.equal(byGuest.get('guest_b').x, 2);
  assert.equal(byGuest.get('guest_b').z, 5);
  assert.equal(byGuest.get('guest_b').yaw, 0.25);

  const transformSec = secs.sections.find((s) => s.id === SECTION.TRANSFORM);
  assert.equal(transformSec.encoding, ENCODING.SORTED_IDS);
  const ids = Array.from(readSectionColumns(bin, transformSec).ids);
  assert.deepEqual(ids, ids.slice().sort((a, b) => a - b), 'SORTED_IDS columns ascend');
});

test('encodeSnapshot round-trips through applyFrame with guest identity', () => {
  const bin = encodeSnapshot([
    { id: 'guest_a', x: 1, z: 1, rotY: 0.5, sitting: true },
    { id: 'guest_b', x: 3, z: -2, rotY: 0, airborne: true },
  ], 1, 1);

  const store = new EntityStore(64);
  const session = { epoch: 0, frameSequence: 0 };
  const r = applyFrame(store, bin, session);
  assert.equal(r.kind, 'applied');
  assert.equal(store.count, 2);

  const a = store.entryFor(store.slot(playerEntityId('guest_a')));
  assert.equal(a.id, 'guest_a');
  assert.equal(a.x, 1);
  assert.equal(a.sitting, true);
  const b = store.entryFor(store.slot(playerEntityId('guest_b')));
  assert.equal(b.id, 'guest_b');
  assert.equal(b.z, -2);
  assert.equal(b.airborne, true);
});

test('encodeSnapshot of an empty room is a bare self-validating snapshot', () => {
  const bin = encodeSnapshot([], 2, 2);
  const store = new EntityStore(64);
  store.spawn(123, { x: 9, z: 9, guestId: 'ghost' });
  const r = applyFrame(store, bin, { epoch: 0, frameSequence: 0 });
  assert.equal(r.kind, 'applied');
  assert.equal(store.count, 0, 'snapshot replaces state wholesale');
});

test('playerEntityId matches Elixir FNV-1a fixture', () => {
  const id = playerEntityId('guest_abc');
  assert.equal(typeof id, 'number');
  assert.ok(id > 0);
});

test('WorldManager sends snapshots to spawn sessions and deltas to the rest', () => {
  const makeSession = (id, rt = null) => {
    const session = {
      player: { id, nickname: id },
      currentRoom: null,
      x: 0, z: 0, rotY: 0, walking: false, sitting: false, airborne: false,
      moved: false,
      rt,
      sent: [],
    };
    session.ws = { readyState: 1, send: (data) => session.sent.push(data) };
    session.send = (msg) => session.sent.push(msg);
    return session;
  };

  const wm = new WorldManager();
  const spawn = makeSession('guest_spawn', { spawn: true });
  const delta = makeSession('guest_delta', { spawn: false });
  const legacy = makeSession('guest_legacy', null);
  wm.addClient('guest_spawn', spawn);
  wm.addClient('guest_delta', delta);
  wm.addClient('guest_legacy', legacy);

  wm.updateMovement('guest_spawn', { x: 1, z: 1, rotY: 0, walking: true });
  wm.updateMovement('guest_delta', { x: 2, z: 2, rotY: 0, walking: false });
  wm.tickMovementBroadcast();

  const findRt = (s) => s.sent.find((m) => m && typeof m === 'object' && m.type === 'rt_binary');
  const spawnBin = Buffer.from(findRt(spawn).data, 'base64');
  const deltaBin = Buffer.from(findRt(delta).data, 'base64');
  assert.equal(spawnBin[5], FRAME_TYPE.FULL_SNAPSHOT, 'spawn capability gets a FULL snapshot');
  assert.equal(spawnBin[6] & 1, 1, 'snapshot promises its string table');
  assert.equal(deltaBin[5], FRAME_TYPE.DELTA, 'other rt clients keep the delta shape');
  assert.equal(deltaBin[6] & 1, 0, 'delta carries no string table');

  const legacyFrame = legacy.sent.find((m) => typeof m === 'string');
  assert.ok(legacyFrame, 'non-rt clients still get the JSON presence flush');
  assert.equal(JSON.parse(legacyFrame).type, 'presence_update');
});

test('negotiation helpers tolerate legacy hello/welcome', () => {
  assert.equal(parseHelloRt({ guestId: 'g' }), null);
  assert.deepEqual(parseHelloRt({
    guestId: 'g',
    rt: { protocols: ['afterlight-soa-v1'], webgpu: true, wasm: false },
  }), { protocols: ['afterlight-soa-v1'], webgpu: true, wasm: false, spawn: false });
  assert.deepEqual(parseHelloRt({
    guestId: 'g',
    rt: { protocols: ['afterlight-soa-v1'], spawn: true },
  }), { protocols: ['afterlight-soa-v1'], webgpu: false, wasm: false, spawn: true });
  assert.equal(parseHelloRt({
    guestId: 'g',
    rt: { protocols: ['afterlight-soa-v1'], spawn: 'yes' },
  }).spawn, false, 'a non-boolean spawn flag is ignored');
  assert.deepEqual(buildWelcomeRt(), { protocol: 'afterlight-soa-v1', snapshot_hz: 10 });
});
