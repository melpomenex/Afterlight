// Tests for shared/realtime codecs: round-trips, snapshot/delta/epoch
// semantics, hostile-input rejection, negotiation tolerance.
// Run: node --test tests/realtime/
// (Also bridged into `npm test` via tests/realtime.test.js.)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EntityStore, presenceToFlags } from '../../shared/realtime/entityStore.js';
import { applyFrame } from '../../shared/realtime/applyFrame.js';
import { writeFrame } from '../../shared/realtime/writer.js';
import { readHeader, readSections } from '../../shared/realtime/frame.js';
import { serializeRoaring, deserializeRoaring } from '../../shared/realtime/roaring.js';
import { buildHelloRt, parseHelloRt, buildWelcomeRt, parseWelcomeRt } from '../../shared/realtime/negotiation.js';
import { FRAME_TYPE, ENCODING, MAGIC } from '../../shared/realtime/constants.js';

const spawn2 = [
  { id: 101, guestId: 'guest_abcdef123', archetype: 0, variant: 0, x: 1, y: 0, z: 2, yaw: 0.5 },
  { id: 102, guestId: 'guest_987654321', archetype: 1, variant: 0, x: 3, y: 0, z: 4, yaw: 1.5 },
];

function snapshot(bytes2 = spawn2, seq = 5) {
  return writeFrame({
    frameType: FRAME_TYPE.FULL_SNAPSHOT, roomEpoch: 0, serverTick: 1,
    frameSequence: seq, baselineSequence: seq, spawn: bytes2,
    transform: { encoding: ENCODING.DENSE, count: 2, columns: { x: [1, 3], y: [0, 0], z: [2, 4], yaw: [0.5, 1.5] } },
  });
}

test('roaring serializes portably: self round-trip across container regimes', () => {
  const sets = [
    [5], [1, 2, 3], [65536, 65537, 131072],
    [7, 5000, 70000, 200000, 1000000],
    Array.from({ length: 5000 }, (_, i) => i * 3 + 1),
    Array.from({ length: 1000 }, (_, i) => i), // single wide run
  ];
  for (const s of sets) {
    const ids = Uint32Array.from([...new Set(s)].sort((a, b) => a - b));
    const back = deserializeRoaring(serializeRoaring(ids));
    assert.ok(back.ok, back.reason);
    assert.deepEqual(Array.from(back.ids), Array.from(ids));
  }
});

test('roaring rejects hostile payloads without throwing', () => {
  for (const bad of [new Uint8Array(0), new Uint8Array([1, 2, 3]), new Uint8Array(64).fill(0xff)]) {
    const r = deserializeRoaring(bad);
    assert.equal(r.ok, false);
  }
});

test('snapshot applies spawns with string identity and components', () => {
  const store = new EntityStore(64);
  const session = { epoch: 0, frameSequence: 0 };
  const r = applyFrame(store, snapshot().bytes, session);
  assert.equal(r.kind, 'applied');
  assert.equal(store.count, 2);
  assert.equal(r.entries[0].id, 'guest_abcdef123');
  assert.deepEqual(
    { walking: r.entries[0].walking, sitting: r.entries[0].sitting, airborne: r.entries[0].airborne },
    { walking: false, sitting: false, airborne: false },
  );
  assert.equal(session.frameSequence, 5);
});

test('delta applies on exact baseline; mixed encodings per section', () => {
  const store = new EntityStore(64);
  const session = { epoch: 0, frameSequence: 0 };
  applyFrame(store, snapshot().bytes, session);
  const d = writeFrame({
    frameType: FRAME_TYPE.DELTA, roomEpoch: 0, serverTick: 2, frameSequence: 6, baselineSequence: 5,
    transform: { encoding: ENCODING.SORTED_IDS, ids: Uint32Array.from([101]), count: 1, columns: { x: [2.5], y: [0], z: [2.25], yaw: [0.75] } },
    flags: { encoding: ENCODING.ROARING, ids: Uint32Array.from([101]), count: 1, columns: { flags: [presenceToFlags(true, false, false)] } },
  });
  assert.ok(d.ok, d.reason);
  const r = applyFrame(store, d.bytes, session);
  assert.equal(r.kind, 'applied');
  // entries arrive per section: transform first, then flags
  assert.equal(r.entries[1].walking, true);
  assert.ok(Math.abs(store.x[store.slot(101)] - 2.5) < 1e-6);
  assert.equal(store.flags[store.slot(101)], 1);
});

test('delta against unknown baseline triggers resync, never applies', () => {
  const store = new EntityStore(64);
  const session = { epoch: 0, frameSequence: 0 };
  applyFrame(store, snapshot().bytes, session);
  const d = writeFrame({
    frameType: FRAME_TYPE.DELTA, roomEpoch: 0, serverTick: 3, frameSequence: 9, baselineSequence: 0,
    transform: { encoding: ENCODING.SORTED_IDS, ids: Uint32Array.from([101]), count: 1, columns: { x: [9], y: [0], z: [9], yaw: [0] } },
  });
  const r = applyFrame(store, d.bytes, session);
  assert.equal(r.kind, 'resync');
  assert.ok(Math.abs(store.x[store.slot(101)] - 1) < 1e-6); // state unchanged
});

test('stale room epoch is dropped unconditionally', () => {
  const store = new EntityStore(64);
  const session = { epoch: 3, frameSequence: 6 };
  const d = writeFrame({
    frameType: FRAME_TYPE.DELTA, roomEpoch: 0, serverTick: 3, frameSequence: 9, baselineSequence: 6,
    transform: { encoding: ENCODING.SORTED_IDS, ids: Uint32Array.from([101]), count: 1, columns: { x: [9], y: [0], z: [9], yaw: [0] } },
  });
  const r = applyFrame(store, d.bytes, session);
  assert.equal(r.kind, 'stale_dropped');
});

test('despawn frees slots; stale transform for despawned id is ignored', () => {
  const store = new EntityStore(64);
  const session = { epoch: 0, frameSequence: 0 };
  applyFrame(store, snapshot().bytes, session);
  const desp = writeFrame({
    frameType: FRAME_TYPE.DELTA, roomEpoch: 3, serverTick: 4, frameSequence: 7, baselineSequence: 5,
    despawn: Uint32Array.from([102]), despawnEncoding: ENCODING.ROARING,
  });
  // Higher epoch invalidates the baseline: this frame resyncs instead of applying.
  const r = applyFrame(store, desp.bytes, session);
  assert.equal(r.kind, 'resync');
  // After resync (epoch accepted via a fresh snapshot at the new epoch)…
  const snap3 = writeFrame({
    frameType: FRAME_TYPE.FULL_SNAPSHOT, roomEpoch: 3, serverTick: 4, frameSequence: 8, baselineSequence: 8, spawn: spawn2,
    transform: { encoding: ENCODING.DENSE, count: 2, columns: { x: [1, 3], y: [0, 0], z: [2, 4], yaw: [0.5, 1.5] } },
  });
  assert.equal(applyFrame(store, snap3.bytes, session).kind, 'applied');
  const desp2 = writeFrame({
    frameType: FRAME_TYPE.DELTA, roomEpoch: 3, serverTick: 5, frameSequence: 9, baselineSequence: 8,
    despawn: Uint32Array.from([102]), despawnEncoding: ENCODING.ROARING,
  });
  const r2 = applyFrame(store, desp2.bytes, session);
  assert.equal(r2.kind, 'applied');
  assert.deepEqual(r2.left.map((l) => l.id), [102]);
  assert.equal(store.count, 1);
  assert.equal(store.slot(102), -1);
});

test('hostile frames are rejected with bounded reasons and no throw', () => {
  const good = snapshot().bytes;
  const cases = [
    ['empty', new Uint8Array(0)],
    ['short header', good.subarray(0, 10)],
    ['bad magic', (() => { const b = new Uint8Array(24); new DataView(b.buffer).setUint32(0, 0xdeadbeef, true); return b; })()],
    ['truncated section header', good.subarray(0, 30)],
    ['truncated payload', good.subarray(0, good.bytes?.length ?? good.length - 1)],
  ];
  for (const [name, bytes] of cases) {
    const store = new EntityStore(64);
    const r = applyFrame(store, bytes, { epoch: 0, frameSequence: 0 });
    assert.equal(r.ok, false, name);
    assert.equal(typeof r.reason, 'string');
    // store stays usable
    const r2 = applyFrame(store, snapshot().bytes, { epoch: 0, frameSequence: 0 });
    assert.equal(r2.kind, 'applied', name);
  }
});

test('oversized declared lengths are rejected before allocation', () => {
  const b = new Uint8Array(64);
  const v = new DataView(b.buffer);
  v.setUint32(0, MAGIC, true);
  v.setUint8(4, 1); v.setUint8(5, 1); v.setUint8(7, 24);
  v.setUint32(8, 0, true); v.setUint32(12, 0, true); v.setUint32(16, 1, true); v.setUint32(20, 1, true);
  // a section claiming a 4 GB payload
  v.setUint8(24, 3); v.setUint8(25, 1); v.setUint32(28 + 4, 0xffffffff);
  const r = applyFrame(new EntityStore(64), b.subarray(0, 40), { epoch: 0, frameSequence: 1 });
  assert.equal(r.ok, false);
});

test('negotiation is additive and tolerant', () => {
  const hello = { guestId: 'g', rt: buildHelloRt({ webgpu: true }) };
  const caps = parseHelloRt(hello);
  assert.deepEqual(caps, { protocols: ['afterlight-soa-v1'], webgpu: true, wasm: false });
  assert.equal(parseHelloRt({ guestId: 'legacy' }), null);
  assert.equal(parseHelloRt({ rt: 'garbage' }), null);
  assert.equal(parseHelloRt({ rt: { noProtocols: true } }), null);
  const welcome = { player: {}, rt: buildWelcomeRt({}) };
  const mode = parseWelcomeRt(welcome);
  assert.equal(mode.protocol, 'afterlight-soa-v1');
  assert.equal(mode.snapshotHz, 10);
  assert.equal(parseWelcomeRt({ player: {} }), null);
});

test('frame header round-trips through readHeader/readSections', () => {
  const f = snapshot(spawn2, 7);
  const head = readHeader(f.bytes);
  assert.ok(head.ok);
  assert.equal(head.header.frameSequence, 7);
  assert.equal(head.header.frameType, FRAME_TYPE.FULL_SNAPSHOT);
  const secs = readSections(f.bytes, head.bodyOffset);
  assert.ok(secs.ok);
  const ids = secs.sections.map((s) => s.id).sort();
  assert.deepEqual(ids, [1, 3, 8]); // spawn + transform + string table
});

test('writeFrame enforces the 1 MiB contract cap', () => {
  const n = 60000;
  const ids = Uint32Array.from({ length: n }, (_, i) => i + 1);
  const cols = { x: new Float32Array(n), y: new Float32Array(n), z: new Float32Array(n), yaw: new Float32Array(n) };
  const r = writeFrame({
    frameType: FRAME_TYPE.DELTA, frameSequence: 1, baselineSequence: 1,
    transform: { encoding: ENCODING.SORTED_IDS, ids, count: n, columns: cols },
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'frame_too_large');
});
