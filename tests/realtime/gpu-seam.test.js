// Headless tests for the EntityRenderBackend seam (spec:
// realtime-gpu-rendering): interface conformance of the CPUThreeBackend
// default arm — capacity, pack application, lifecycle, exponential-lerp
// interpolation, flag-derived poses, allocation-free sampling, and the
// device-loss swap path (snapshot → fresh CPU backend). Runs under plain
// Node — no DOM, no WebGL; avatars are stub rigs with the createGardenerAvatar
// userData shape so the delegated RemotePlayersManager math stays real.
// Run: node --test tests/realtime/gpu-seam.test.js

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { EntityRenderBackend, CPUThreeBackend } from '../../src/realtime/gpu/backend.js';
import { PipelineCore, createPack } from '../../src/realtime/worker/core.js';
import { writeFrame } from '../../shared/realtime/writer.js';
import { FRAME_TYPE, ENCODING } from '../../shared/realtime/constants.js';
import { FLAG_WALKING, FLAG_SITTING, FLAG_AIRBORNE, presenceToFlags } from '../../shared/realtime/entityStore.js';

const GUEST_A = 'guest_aaa111111';
const GUEST_B = 'guest_bbb222222';

// --- frame + pack helpers (real protocol frames through PipelineCore, so
// the packs the backend consumes are exactly the worker's output shape) ---

function snapshotFrame(seq = 1, spawns = [
  { id: 10, guestId: GUEST_A, archetype: 0, variant: 0, x: 1, y: 0, z: 1, yaw: 0 },
  { id: 11, guestId: GUEST_B, archetype: 0, variant: 0, x: 2, y: 0, z: 2, yaw: 0 },
]) {
  const n = spawns.length;
  return writeFrame({
    frameType: FRAME_TYPE.FULL_SNAPSHOT, roomEpoch: 0, serverTick: seq,
    frameSequence: seq, baselineSequence: seq, spawn: spawns,
    transform: { encoding: ENCODING.DENSE, count: n, columns: {
      x: spawns.map((s) => s.x), y: spawns.map(() => 0), z: spawns.map((s) => s.z), yaw: spawns.map((s) => s.yaw),
    } },
  }).bytes;
}

function deltaFrame(seq, baseline, tick, rows) {
  const ids = Uint32Array.from(rows.map((r) => r.id).sort((a, b) => a - b));
  const byId = new Map(rows.map((r) => [r.id, r]));
  return writeFrame({
    frameType: FRAME_TYPE.DELTA, roomEpoch: 0, serverTick: tick,
    frameSequence: seq, baselineSequence: baseline,
    transform: { encoding: ENCODING.SORTED_IDS, ids, count: ids.length, columns: {
      x: ids.map((id) => byId.get(id).x), y: ids.map(() => 0),
      z: ids.map((id) => byId.get(id).z), yaw: ids.map((id) => byId.get(id).yaw),
    } },
    flags: { encoding: ENCODING.SORTED_IDS, ids, count: ids.length, columns: {
      flags: ids.map((id) => byId.get(id).flags ?? 0),
    } },
  }).bytes;
}

function despawnFrame(seq, baseline, tick, ids) {
  return writeFrame({
    frameType: FRAME_TYPE.DELTA, roomEpoch: 0, serverTick: tick,
    frameSequence: seq, baselineSequence: baseline,
    despawn: Uint32Array.from(ids), despawnEncoding: ENCODING.SORTED_IDS,
  }).bytes;
}

function seededCore() {
  const core = new PipelineCore({ maxSlots: 64 });
  core.applyFrame(snapshotFrame(), createPack(8), new Map());
  return core;
}

// A poster folds frames into fresh packs the way the worker side does:
// PipelineCore fills rows/lifecycle, and the poster assigns packId when the
// pack is posted (decode.worker.js: pack.packId = gate.nextPackId++).
function poster() {
  let nextPackId = 1;
  return (core, bytes) => {
    const pack = createPack(8);
    const r = core.applyFrame(bytes, pack, new Map());
    assert.equal(r.ok, true);
    pack.packId = nextPackId++;
    return pack;
  };
}

// Stub rig with the userData shape RemotePlayersManager's pose code touches
// (legs/arms/rig/emote); geometry is irrelevant to the seam.
function createStubAvatar(id, nickname = 'Gardener') {
  const g = new THREE.Group();
  g.userData = {
    playerId: id,
    nickname,
    legs: [new THREE.Group(), new THREE.Group()],
    arms: [new THREE.Group(), new THREE.Group()],
    rig: new THREE.Group(),
    emote: null,
  };
  return g;
}

function makeBackend() {
  return new CPUThreeBackend({ createAvatar: createStubAvatar });
}

const wrapAngle = (r) => Math.atan2(Math.sin(r), Math.cos(r));

// --- interface conformance ---

test('interface: base is abstract; CPUThreeBackend conforms', () => {
  assert.throws(() => new EntityRenderBackend(), TypeError);
  const proto = EntityRenderBackend.prototype;
  for (const method of ['ensureCapacity', 'applyDeltaPack', 'sample', 'snapshot', 'dispose']) {
    assert.throws(() => proto[method].call({}), Error, `${method} is abstract`);
  }
  const b = makeBackend();
  assert.ok(b instanceof EntityRenderBackend);
  for (const method of ['ensureCapacity', 'applyDeltaPack', 'sample', 'snapshot', 'dispose']) {
    assert.equal(typeof b[method], 'function');
  }
  b.dispose();
});

test('interface: onDeviceLost registers and unsubscribes', () => {
  const b = makeBackend();
  assert.throws(() => b.onDeviceLost('nope'), TypeError);
  const seen = [];
  b.onDeviceLost((reason) => seen.push(`first:${reason}`));
  const off = b.onDeviceLost((reason) => seen.push(reason));
  off();
  b.reportDeviceLost('device-lost');
  assert.deepEqual(seen, ['first:device-lost'], 'unsubscribed handler is not called');
  b.dispose();
});

// --- capacity ---

test('capacity: ensureCapacity is monotonic; the CPU arm stays soft', () => {
  const b = makeBackend();
  assert.equal(b.ensureCapacity(4), 4);
  assert.equal(b.capacity, 4);
  assert.equal(b.ensureCapacity(2), 4, 'capacity never shrinks');
  // A population larger than the hinted capacity still renders on the CPU
  // arm (per-entity Object3Ds need no preallocation).
  const core = seededCore();
  const post = poster();
  const pack = post(core, snapshotFrame(2, [
    { id: 20, guestId: GUEST_A, archetype: 0, variant: 0, x: 0, y: 0, z: 0, yaw: 0 },
    { id: 21, guestId: GUEST_B, archetype: 0, variant: 0, x: 1, y: 0, z: 1, yaw: 0 },
    { id: 22, guestId: 'guest_ccc333333', archetype: 0, variant: 0, x: 2, y: 0, z: 2, yaw: 0 },
    { id: 23, guestId: 'guest_ddd444444', archetype: 0, variant: 0, x: 3, y: 0, z: 3, yaw: 0 },
    { id: 24, guestId: 'guest_eee555555', archetype: 0, variant: 0, x: 4, y: 0, z: 4, yaw: 0 },
  ]));
  const receipt = b.applyDeltaPack(pack);
  assert.equal(receipt.ok, true);
  assert.equal(b.population, 5);
  b.dispose();
});

// --- pack application updates sampled state ---

test('applyDeltaPack: joined identity seeds before rows; sampled state reflects the pack', () => {
  const core = seededCore();
  const post = poster();
  const b = makeBackend();
  const snapPack = post(core, snapshotFrame());
  const receipt = b.applyDeltaPack(snapPack);
  assert.equal(receipt.ok, true);
  assert.equal(receipt.appliedRows, 2);
  assert.equal(receipt.joined, 2);
  assert.equal(receipt.packId, snapPack.packId);
  assert.equal(receipt.tick, snapPack.tick);

  const out = [{}];
  b.sample([GUEST_A], out);
  assert.equal(out[0].id, GUEST_A, 'guestId rides spawn frames once');
  assert.equal(out[0].entityId, 10);
  assert.equal(out[0].x, 1);
  assert.equal(out[0].z, 1);
  assert.equal(out[0].walking, false);

  const pack = post(core, deltaFrame(2, 1, 2, [{ id: 10, x: 5, z: 7, yaw: 1, flags: FLAG_WALKING | FLAG_SITTING }]));
  b.applyDeltaPack(pack);
  b.sample([GUEST_A], out);
  assert.equal(out[0].walking, true, 'flags are target state: applied immediately');
  assert.equal(out[0].sitting, true);
  assert.equal(out[0].airborne, false);
  // Positions are rendered state: the exponential lerp walks them toward
  // the pack's targets over successive frames.
  for (let f = 0; f < 240; f++) b.update(1 / 60, f / 60);
  b.sample([GUEST_A], out);
  assert.ok(Math.abs(out[0].x - 5) < 0.05, `x converged to target (x=${out[0].x})`);
  assert.ok(Math.abs(out[0].z - 7) < 0.05, `z converged to target (z=${out[0].z})`);
  assert.ok(Math.abs(wrapAngle(out[0].rotY) - 1) < 0.05, 'yaw converged to target');
  b.dispose();
});

test('sample: fills caller-provided rows in place; unknown keys fill null', () => {
  const core = seededCore();
  const post = poster();
  const b = makeBackend();
  b.applyDeltaPack(post(core, snapshotFrame()));

  const rows = [{}, {}];
  const returned = b.sample([GUEST_A, GUEST_B], rows);
  assert.equal(returned, rows, 'out array is returned, not replaced');
  assert.equal(rows[0].id, GUEST_A);
  assert.equal(rows[1].id, GUEST_B);

  const before = rows[0];
  b.sample([GUEST_A], rows);
  assert.ok(rows[0] === before, 'rows are reused across samples — no per-sample allocation');

  b.sample(['nobody'], rows);
  assert.equal(rows[0], null);
  b.dispose();
});

// --- interpolation stays the CPU arm's behavior ---

test('interpolation: exponential lerp converges toward targets; yaw wraps shortest-path', () => {
  const core = seededCore();
  const post = poster();
  const b = makeBackend();
  b.applyDeltaPack(post(core, snapshotFrame()));
  b.applyDeltaPack(post(core, deltaFrame(2, 1, 2, [{ id: 10, x: 10, z: 0, yaw: 3, flags: 0 }])));

  const rows = [{}];
  b.sample([GUEST_A], rows);
  assert.equal(rows[0].x, 1, 'no motion before update');

  b.update(1 / 60, 0.1);
  b.sample([GUEST_A], rows);
  assert.ok(rows[0].x > 1 && rows[0].x < 10, `mid-lerp between spawn and target (x=${rows[0].x})`);

  for (let f = 0; f < 600; f++) b.update(1 / 60, f / 60);
  b.sample([GUEST_A], rows);
  assert.ok(Math.abs(rows[0].x - 10) < 0.1, `converged to target (x=${rows[0].x})`);
  assert.ok(Math.abs(wrapAngle(rows[0].rotY) - 3) < 0.05, 'yaw took the short way around');
  assert.ok(Number.isFinite(rows[0].rotY));
  b.dispose();
});

// --- flag-derived pose state matches the avatar path ---

test('poses: sitting folds legs, airborne hops, walking bobs the legs', () => {
  const core = seededCore();
  const post = poster();
  const b = makeBackend();
  b.applyDeltaPack(post(core, snapshotFrame()));

  b.applyDeltaPack(post(core, deltaFrame(2, 1, 2, [{ id: 10, x: 1, z: 1, yaw: 0, flags: FLAG_SITTING }])));
  b.update(1 / 60, 1);
  const seated = b.manager.players.get(GUEST_A).avatar;
  assert.equal(seated.position.y, 0);
  assert.equal(seated.userData.legs[0].rotation.x, -1.35, 'seated legs fold');
  assert.equal(seated.userData.legs[1].rotation.x, -1.35);

  // Rising edge on the airborne flag starts a fresh hop.
  b.applyDeltaPack(post(core, deltaFrame(3, 2, 3, [{ id: 10, x: 1, z: 1, yaw: 0, flags: FLAG_AIRBORNE }])));
  b.update(1 / 60, 2);
  assert.ok(seated.position.y > 0.001, `airborne avatar is mid-hop (y=${seated.position.y})`);

  b.applyDeltaPack(post(core, deltaFrame(4, 3, 4, [{ id: 11, x: 2, z: 2, yaw: 0, flags: FLAG_WALKING }])));
  b.update(1 / 60, 0.2);
  const walker = b.manager.players.get(GUEST_B).avatar;
  assert.ok(Math.abs(walker.userData.legs[0].rotation.x) > 0.01, 'walking legs swing');
  assert.ok(Math.abs(walker.userData.legs[1].rotation.x) > 0.01, 'opposite phase');
  b.dispose();
});

// --- joined / left lifecycle ---

test('lifecycle: despawn removes the entity; rejoin re-creates without duplicates', () => {
  const core = seededCore();
  const post = poster();
  const b = makeBackend();
  b.applyDeltaPack(post(core, snapshotFrame()));
  assert.equal(b.population, 2);

  b.applyDeltaPack(post(core, despawnFrame(2, 1, 2, [10])));
  assert.equal(b.population, 1);
  const rows = [{}];
  b.sample([GUEST_A], rows);
  assert.equal(rows[0], null, 'despawned entity samples null');
  b.sample([GUEST_B], rows);
  assert.equal(rows[0].id, GUEST_B, 'survivor untouched');

  // Rejoin: a new snapshot for the same identity lands as a fresh spawn.
  core.reset();
  const rejoinPack = post(core, snapshotFrame(3, [
    { id: 10, guestId: GUEST_A, archetype: 0, variant: 0, x: 4, y: 0, z: 4, yaw: 0 },
  ]));
  const receipt = b.applyDeltaPack(rejoinPack);
  assert.equal(receipt.joined, 1);
  assert.equal(b.population, 2, 'rejoin adds exactly one entry');
  b.sample([GUEST_A], rows);
  assert.equal(rows[0].x, 4);
  assert.equal(rows[0].id, GUEST_A, 'identity re-seeded after rejoin');
  b.dispose();
});

// --- device-loss swap (failure model, CPU rebuild side) ---

test('device loss: a fresh CPUThreeBackend rebuilds from the last acknowledged snapshot', () => {
  const core = seededCore();
  const post = poster();
  const a = makeBackend();
  a.ensureCapacity(64);
  a.applyDeltaPack(post(core, snapshotFrame()));
  a.applyDeltaPack(post(core, deltaFrame(2, 1, 2, [
    { id: 10, x: 6, z: 8, yaw: 2, flags: FLAG_WALKING },
  ])));
  a.update(1 / 60, 0.1); // interpolation has progressed; targets stay authoritative

  const snap = a.snapshot();
  assert.equal(snap.kind, 'cpu-three');
  assert.equal(snap.packId, 2, 'snapshot carries the last acknowledged pack');
  assert.equal(snap.entities.length, 2);
  const snapA = snap.entities.find((e) => e.entityId === 10);
  assert.equal(snapA.guestId, GUEST_A);
  assert.deepEqual(
    { x: snapA.x, z: snapA.z, yaw: snapA.yaw, flags: snapA.flags },
    { x: 6, z: 8, yaw: 2, flags: presenceToFlags(true, false, false) },
    'snapshot holds acknowledged targets, not interpolated positions'
  );

  const losses = [];
  const off = a.onDeviceLost((reason, backend) => losses.push([reason, backend === a]));
  a.reportDeviceLost('device-lost');
  assert.deepEqual(losses, [['device-lost', true]], 'loss routes to handlers with the dying backend');
  off();
  a.dispose();

  const b = new CPUThreeBackend({ createAvatar: createStubAvatar, snapshot: snap });
  assert.equal(b.population, snap.entities.length, 'no missing entities');
  assert.equal(b.manager.players.size, snap.entities.length, 'no duplicate entities');
  assert.equal(b.capacity, 0, 'capacity hint is not inherited; the consumer re-issues it');
  const rows = [{}];
  b.sample([GUEST_A], rows);
  assert.equal(rows[0].x, 6);
  assert.equal(rows[0].z, 8);
  assert.equal(rows[0].rotY, 2);
  assert.equal(rows[0].walking, true);
  assert.equal(rows[0].id, GUEST_A, 'identity survives the swap');
  assert.ok(rows[0].entityId === 10);

  // The rebuilt arm continues the session from the acknowledged pack.
  b.ensureCapacity(64);
  const receipt = b.applyDeltaPack(post(core, deltaFrame(3, 2, 3, [{ id: 10, x: 0, z: 0, yaw: 0, flags: 0 }])));
  assert.equal(receipt.ok, true);
  assert.equal(receipt.packId, 3);
  b.sample([GUEST_A], rows);
  assert.equal(rows[0].walking, false, 'flags apply immediately on the rebuilt arm');
  for (let f = 0; f < 240; f++) b.update(1 / 60, f / 60);
  b.sample([GUEST_A], rows);
  assert.ok(Math.abs(rows[0].x) < 0.05, `rebuilt arm tracks new targets (x=${rows[0].x})`);
  b.dispose();
});

// --- dispose ---

test('dispose releases avatars and rejects further packs', () => {
  const core = seededCore();
  const post = poster();
  const b = makeBackend();
  b.applyDeltaPack(post(core, snapshotFrame()));
  assert.ok(b.population > 0);
  b.dispose();
  assert.equal(b.population, 0);
  b.dispose(); // idempotent
  assert.throws(() => b.applyDeltaPack(createPack(8)), /disposed/);
});
