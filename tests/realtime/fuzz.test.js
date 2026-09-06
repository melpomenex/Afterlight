// Fuzz-style hostile-input corpus for the afterlight-soa-v1 decoders
// (add-realtime-binary-protocol task 2.3; contract §3 bounded rejection and
// §8 fuzzing mandate). Every mutation comes from a fixed-seed PRNG or an
// exact field patch, so any failure reproduces by re-running this file.
// Covers every decoder: readHeader/readSections, readSectionColumns (all
// mask encodings incl. DELTA_VARINT), readSpawnSection, readStringTable,
// decodeVarintIds, deserializeRoaring, applyFrame end-to-end (including the
// chunk accumulator), and the tolerant negotiation parsers. Writers
// (writeFrame & co) are out of scope: they validate their own callers, not
// hostile wire input.
// Run: node --test tests/realtime/
// (Also bridged into `npm test` via tests/realtime.test.js.)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EntityStore } from '../../shared/realtime/entityStore.js';
import { applyFrame } from '../../shared/realtime/applyFrame.js';
import { writeFrame, writeChunkedFrames } from '../../shared/realtime/writer.js';
import { readHeader, readSections } from '../../shared/realtime/frame.js';
import {
  readSectionColumns, readSpawnSection, readStringTable, decodeVarintIds, encodeVarintIds,
} from '../../shared/realtime/encoders.js';
import { serializeRoaring, deserializeRoaring } from '../../shared/realtime/roaring.js';
import { parseHelloRt, parseWelcomeRt } from '../../shared/realtime/negotiation.js';
import {
  FRAME_TYPE, SECTION, SECTION_FIELDS, ENCODING, MAGIC, PROTOCOL_VERSION,
  HEADER_SIZE, LIMITS, RT_PROTOCOL,
} from '../../shared/realtime/constants.js';

// ---- deterministic randomness ----------------------------------------------

// mulberry32 — tiny seeded PRNG; the corpus must never depend on Math.random.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- seed corpus (valid frames, written by the reference writer) ------------

const SPAWN_ROWS = [
  { id: 101, guestId: 'guest_abcdef123', archetype: 0, variant: 0, x: 1, y: 0, z: 2, yaw: 0.5 },
  { id: 102, guestId: 'guest_987654321', archetype: 1, variant: 0, x: 3, y: 0, z: 4, yaw: 1.5 },
];

function seedSnapshot() {
  const r = writeFrame({
    frameType: FRAME_TYPE.FULL_SNAPSHOT, roomEpoch: 0, serverTick: 1,
    frameSequence: 7, baselineSequence: 7, spawn: SPAWN_ROWS,
    transform: { encoding: ENCODING.DENSE, count: 2, columns: { x: [1, 3], y: [0, 0], z: [2, 4], yaw: [0.5, 1.5] } },
  });
  assert.ok(r.ok, 'seed snapshot must write: ' + r.reason);
  return r.bytes;
}

// One DELTA seed per mask encoding, so every readSectionColumns branch gets
// mutated from a valid baseline (BITSET needs maxId at the spec level).
function seedDelta(encoding) {
  const r = writeFrame({
    frameType: FRAME_TYPE.DELTA, roomEpoch: 0, serverTick: 2,
    frameSequence: 8, baselineSequence: 7, maxId: 127,
    transform: { encoding, ids: Uint32Array.from([101, 102]), count: 2,
      columns: { x: [1.5, 2.5], y: [0, 0], z: [2, 3], yaw: [0.25, 0.75] } },
    flags: { encoding, ids: Uint32Array.from([101]), count: 1, columns: { flags: [1] } },
  });
  assert.ok(r.ok, 'seed delta must write: ' + r.reason);
  return r.bytes;
}

// DESPAWN rides a bare mask read by applyFrame's private maskIds — give both
// writer-supported mask encodings their own seeds so the sweeps reach that
// reader too. DELTA_VARINT despawn has no writer path yet, so that seed is
// hand-built: one id (102) as an absolute single-byte varint.
function seedDeltaDespawn(encoding) {
  if (encoding === ENCODING.DELTA_VARINT) {
    const bytes = cat(bareHeader(FRAME_TYPE.DELTA), sectionHeader(SECTION.DESPAWN, encoding, 1, 1), new Uint8Array([102]));
    // bareHeader zeroes the sequence fields; match the writer-built seeds
    // (frameSequence 8 against the seed snapshot's committed baseline 7).
    const v = new DataView(bytes.buffer);
    v.setUint32(16, 8, true);
    v.setUint32(20, 7, true);
    return bytes;
  }
  const r = writeFrame({
    frameType: FRAME_TYPE.DELTA, roomEpoch: 0, serverTick: 2,
    frameSequence: 8, baselineSequence: 7,
    despawn: Uint32Array.from([102]), despawnEncoding: encoding,
  });
  assert.ok(r.ok, 'seed despawn delta must write: ' + r.reason);
  return r.bytes;
}

let chunkedFramesCache = null;
function chunkedSeed() {
  if (!chunkedFramesCache) {
    const spawn = Array.from({ length: 40 }, (_, i) => (
      { id: i + 10, guestId: 'g' + i, archetype: 0, variant: 0, x: i, y: 0, z: i, yaw: 0 }));
    const r = writeChunkedFrames({
      frameType: FRAME_TYPE.FULL_SNAPSHOT, roomEpoch: 0, serverTick: 3,
      frameSequence: 100, baselineSequence: 100, spawn,
    }, { maxBytes: 512 });
    assert.ok(r.ok, 'chunked seed must write: ' + r.reason);
    assert.ok(r.frames.length > 1, 'chunked seed must actually chunk');
    for (const bytes of r.frames) assert.ok(bytes.length <= LIMITS.MAX_FRAME_BYTES);
    chunkedFramesCache = r.frames;
  }
  return chunkedFramesCache;
}

// ---- mutation operators ------------------------------------------------------

function truncations(bytes, step = 1) {
  const out = [];
  for (let k = 0; k < bytes.length; k += step) out.push(bytes.subarray(0, k));
  return out;
}

function bitFlips(bytes, rng, count, maxFlips = 3) {
  const out = [];
  for (let m = 0; m < count; m++) {
    const b = bytes.slice();
    const flips = 1 + Math.floor(rng() * maxFlips);
    for (let f = 0; f < flips; f++) {
      const p = Math.floor(rng() * b.length);
      b[p] ^= 1 << Math.floor(rng() * 8);
    }
    out.push(b);
  }
  return out;
}

// Invert every header byte once per seed: deterministically reaches magic,
// version, frame type, header size, epoch/tick/sequences.
function headerByteSweep(bytes) {
  const out = [];
  for (let i = 0; i < HEADER_SIZE; i++) {
    const b = bytes.slice();
    b[i] ^= 0xff;
    out.push(b);
  }
  return out;
}

function bareHeader(frameType, version = PROTOCOL_VERSION) {
  const b = new Uint8Array(HEADER_SIZE);
  const v = new DataView(b.buffer);
  v.setUint32(0, MAGIC, true);
  v.setUint8(4, version);
  v.setUint8(5, frameType);
  v.setUint8(7, HEADER_SIZE);
  return b;
}

function sectionHeader(id, encoding, count, payloadLen) {
  const b = new Uint8Array(12);
  const v = new DataView(b.buffer);
  v.setUint8(0, id);
  v.setUint8(1, encoding);
  v.setUint32(4, count, true);
  v.setUint32(8, payloadLen, true);
  return b;
}

function cat(...parts) {
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

// ---- bounded-contract harness ------------------------------------------------

// Every decoder must return a status object, never throw into game code
// (contract §3). applyFrame results are one of exactly three shapes.
function applyBounded(store, bytes, session, note = '') {
  let r;
  try { r = applyFrame(store, bytes, session); } catch (e) {
    assert.fail(`applyFrame threw on ${note}: ${e && e.stack || e}`);
  }
  assert.ok(r !== null && typeof r === 'object', `applyFrame returned ${r} on ${note}`);
  if (r.ok === false) {
    assert.equal(typeof r.reason, 'string', `rejection needs a string reason on ${note}`);
  } else if (r.ok === true) {
    if (r.kind === 'applied') {
      assert.ok(Array.isArray(r.joined) && Array.isArray(r.left) && Array.isArray(r.entries),
        `applied result needs joined/left/entries arrays on ${note}`);
    } else if (r.kind !== 'resync' && r.kind !== 'stale_dropped') {
      assert.fail(`unbounded applyFrame kind ${r.kind} on ${note}`);
    }
  } else {
    assert.fail(`applyFrame result missing ok flag on ${note}`);
  }
  return r;
}

// Spec scenario: "WHEN a corrupted frame is rejected mid-session THEN a
// subsequent valid snapshot applies correctly to the same store."
function assertStoreRecovers(store, note = '') {
  const r = applyBounded(store, seedSnapshot(), { epoch: 0, frameSequence: 0 }, note + ' recovery');
  assert.equal(r.kind, 'applied', note + ' recovery');
  assert.equal(store.count, 2, note + ' recovery entity count');
  assert.ok(store.slot(101) >= 0, note + ' recovery slot');
  const d = applyBounded(store, seedDelta(ENCODING.SORTED_IDS), { epoch: 0, frameSequence: 7 }, note + ' recovery delta');
  assert.equal(d.kind, 'applied', note + ' recovery delta');
}

const newStore = () => new EntityStore(64);

// ---- tests --------------------------------------------------------------------

test('fuzz: seed corpus is valid, applies cleanly, and is deterministic', () => {
  // Deltas need the snapshot's committed baseline (7) before they apply, and
  // each applied delta advances the session — so each gets a fresh replay.
  for (const bytes of [seedDelta(ENCODING.SORTED_IDS), seedDelta(ENCODING.ROARING), seedDelta(ENCODING.BITSET),
    seedDelta(ENCODING.DELTA_VARINT),
    seedDeltaDespawn(ENCODING.SORTED_IDS), seedDeltaDespawn(ENCODING.ROARING), seedDeltaDespawn(ENCODING.DELTA_VARINT)]) {
    const store = newStore();
    const session = { epoch: 0, frameSequence: 0 };
    assert.equal(applyBounded(store, seedSnapshot(), session, 'seed snapshot').kind, 'applied');
    const r = applyBounded(store, bytes, session, 'seed delta');
    assert.equal(r.kind, 'applied', 'seeds must apply');
  }
  // Determinism: identical mutation streams byte-for-byte across rebuilds.
  const build = (rngSeed) => {
    const rng = mulberry32(rngSeed);
    return { t: truncations(seedSnapshot()), f: bitFlips(seedSnapshot(), rng, 16), h: headerByteSweep(seedSnapshot()) };
  };
  const a = build(20260906);
  const b = build(20260906);
  assert.equal(a.t.length, b.t.length);
  for (let i = 0; i < a.t.length; i++) assert.deepEqual(a.t[i], b.t[i]);
  for (let i = 0; i < a.f.length; i++) assert.deepEqual(a.f[i], b.f[i]);
  for (let i = 0; i < a.h.length; i++) assert.deepEqual(a.h[i], b.h[i]);
});

test('fuzz: truncation sweep over every seed frame stays bounded, store recovers', () => {
  const seeds = [
    ['snapshot', seedSnapshot()],
    ['delta-sorted', seedDelta(ENCODING.SORTED_IDS)],
    ['delta-roaring', seedDelta(ENCODING.ROARING)],
    ['delta-bitset', seedDelta(ENCODING.BITSET)],
    ['delta-varint', seedDelta(ENCODING.DELTA_VARINT)],
    ['despawn-sorted', seedDeltaDespawn(ENCODING.SORTED_IDS)],
    ['despawn-roaring', seedDeltaDespawn(ENCODING.ROARING)],
    ['despawn-varint', seedDeltaDespawn(ENCODING.DELTA_VARINT)],
  ];
  for (const [name, seed] of seeds) {
    const store = newStore();
    for (const bytes of truncations(seed)) {
      applyBounded(store, bytes, { epoch: 0, frameSequence: 0 }, `${name} truncated@${bytes.length}`);
    }
    assertStoreRecovers(store, `${name} truncations`);
  }
});

test('fuzz: seeded bit flips and header byte inversions stay bounded, store recovers', () => {
  const seeds = [
    ['snapshot', seedSnapshot()],
    ['delta-sorted', seedDelta(ENCODING.SORTED_IDS)],
    ['delta-roaring', seedDelta(ENCODING.ROARING)],
    ['delta-bitset', seedDelta(ENCODING.BITSET)],
    ['delta-varint', seedDelta(ENCODING.DELTA_VARINT)],
    ['despawn-sorted', seedDeltaDespawn(ENCODING.SORTED_IDS)],
    ['despawn-roaring', seedDeltaDespawn(ENCODING.ROARING)],
    ['despawn-varint', seedDeltaDespawn(ENCODING.DELTA_VARINT)],
  ];
  for (const [name, seed] of seeds) {
    const rng = mulberry32(0x414c5254 ^ name.length);
    const store = newStore();
    const corpus = [...bitFlips(seed, rng, 40), ...headerByteSweep(seed)];
    for (const bytes of corpus) {
      // A flip may land on a value byte and still apply — the contract is a
      // bounded outcome, never that every mutation must be rejected.
      applyBounded(store, bytes, { epoch: 0, frameSequence: 0 }, `${name} mutant`);
    }
    assertStoreRecovers(store, `${name} flips`);
  }
});

test('fuzz: chunked-frame mutations stay bounded and the accumulator recovers', () => {
  const frames = chunkedSeed();
  // Truncations of every chunk (sampled) and flips of the middle/last chunks.
  for (let i = 0; i < frames.length; i++) {
    const store = newStore();
    for (const bytes of truncations(frames[i], 4)) {
      applyBounded(store, bytes, { epoch: 0, frameSequence: 0, chunkSeq: 0 }, `chunk${i} truncated@${bytes.length}`);
    }
  }
  const rng = mulberry32(0xc40c4e);
  for (let i = 1; i < frames.length; i++) {
    const store = newStore();
    const session = { epoch: 0, frameSequence: 0, chunkSeq: 0 };
    for (const mutant of bitFlips(frames[i], rng, 8)) {
      applyBounded(store, mutant, session, `chunk${i} flip`);
    }
    // Spec scenario on the same store: a valid snapshot applies correctly
    // after corrupted chunks, and a delta against its baseline applies too.
    assertStoreRecovers(store, `chunk${i} flips`);
  }
  // A chunk stream that never delivers CHUNK_END must not commit its
  // sequence: a delta against the uncommitted baseline resyncs.
  const store = newStore();
  const session = { epoch: 0, frameSequence: 0, chunkSeq: 0 };
  for (let i = 0; i < frames.length - 1; i++) {
    assert.equal(applyBounded(store, frames[i], session, 'open chunk stream').kind, 'applied');
  }
  assert.notEqual(session.frameSequence, 100, 'uncommitted chunk sequence must not become the baseline');
  const ghost = writeFrame({
    frameType: FRAME_TYPE.DELTA, roomEpoch: 0, serverTick: 4,
    frameSequence: 101, baselineSequence: 100,
    transform: { encoding: ENCODING.SORTED_IDS, ids: Uint32Array.from([10]), count: 1,
      columns: { x: [9], y: [0], z: [9], yaw: [0] } },
  });
  assert.ok(ghost.ok, ghost.reason);
  assert.equal(applyBounded(store, ghost.bytes, session, 'ghost baseline').kind, 'resync');
});

test('fuzz: frame-type enum sweep — unknown types reject exactly, known types stay bounded', () => {
  const known = new Set(Object.values(FRAME_TYPE));
  const store = newStore();
  for (let t = 0; t <= 255; t++) {
    const bytes = bareHeader(t);
    const r = applyBounded(store, bytes, { epoch: 0, frameSequence: 0 }, `frameType ${t}`);
    if (known.has(t)) assert.notEqual(r.ok, false, `known type ${t} must not be enum-rejected`);
    else assert.equal(r.reason, 'bad_frame_type', `type ${t}`);
  }
});

test('fuzz: section-id and section-encoding enum sweeps reject exactly', () => {
  const knownIds = new Set(Object.values(SECTION));
  for (let id = 0; id <= 255; id++) {
    const bytes = cat(bareHeader(FRAME_TYPE.FULL_SNAPSHOT), sectionHeader(id, ENCODING.SORTED_IDS, 0, 0));
    const r = applyBounded(newStore(), bytes, { epoch: 0, frameSequence: 0 }, `sectionId ${id}`);
    // Known ids may still reject on other rules (e.g. empty SPAWN without a
    // string table) — they must only never fail on the id itself.
    if (knownIds.has(id)) assert.notEqual(r.reason, 'bad_section_id', `known section ${id} must not be enum-rejected`);
    else assert.equal(r.reason, 'bad_section_id', `section id ${id}`);
  }
  const knownEnc = new Set(Object.values(ENCODING));
  for (let enc = 0; enc <= 255; enc++) {
    const bytes = cat(bareHeader(FRAME_TYPE.FULL_SNAPSHOT), sectionHeader(SECTION.TRANSFORM, enc, 0, 0));
    const r = applyBounded(newStore(), bytes, { epoch: 0, frameSequence: 0 }, `encoding ${enc}`);
    if (knownEnc.has(enc)) assert.notEqual(r.reason, 'bad_section_encoding', `known encoding ${enc} must not be enum-rejected`);
    else assert.equal(r.reason, 'bad_section_encoding', `encoding ${enc}`);
  }
  // In-domain but unsupported encodings are rejected by the readers, not guessed.
  const arrow = cat(bareHeader(FRAME_TYPE.DELTA), sectionHeader(SECTION.TRANSFORM, ENCODING.ARROW_RECORD_BATCH, 1, 16), new Uint8Array(16));
  assert.equal(applyBounded(newStore(), arrow, { epoch: 0, frameSequence: 0 }, 'arrow transform').reason, 'unsupported_read_encoding');
  const denseDespawn = cat(bareHeader(FRAME_TYPE.DELTA), sectionHeader(SECTION.DESPAWN, ENCODING.DENSE, 1, 4), new Uint8Array(4));
  assert.equal(applyBounded(newStore(), denseDespawn, { epoch: 0, frameSequence: 0 }, 'dense despawn').reason, 'unsupported_despawn_encoding');
  const bitsetDespawn = cat(bareHeader(FRAME_TYPE.DELTA), sectionHeader(SECTION.DESPAWN, ENCODING.BITSET, 1, 4), new Uint8Array(4));
  assert.equal(applyBounded(newStore(), bitsetDespawn, { epoch: 0, frameSequence: 0 }, 'bitset despawn').reason, 'unsupported_despawn_encoding');
  // Protocol version is enum-checked too.
  for (const v of [0, 2, 3, 100, 254, 255]) {
    const r = applyBounded(newStore(), bareHeader(FRAME_TYPE.DELTA, v), { epoch: 0, frameSequence: 0 }, `version ${v}`);
    assert.equal(r.reason, 'bad_version', `version ${v}`);
  }
});

test('fuzz: declared-length overflows reject before allocation', () => {
  const snap = seedSnapshot();
  const payload = new Uint8Array(16);
  const cases = [
    // section entity_count just past the 100k limit
    ['rows 100001', cat(bareHeader(FRAME_TYPE.DELTA), sectionHeader(SECTION.TRANSFORM, ENCODING.SORTED_IDS, LIMITS.MAX_SECTION_ROWS + 1, 16)), 'section_rows_over_limit'],
    ['spawn rows 100001', cat(bareHeader(FRAME_TYPE.FULL_SNAPSHOT), sectionHeader(SECTION.SPAWN, ENCODING.DENSE, LIMITS.MAX_SECTION_ROWS + 1, 16)), 'section_rows_over_limit'],
    // at-limit count whose columns cannot fit the (empty) payload: rejected
    // before the 100k-row column allocation (maskLen goes negative)
    ['rows 100000 short payload', cat(bareHeader(FRAME_TYPE.DELTA), sectionHeader(SECTION.TRANSFORM, ENCODING.SORTED_IDS, LIMITS.MAX_SECTION_ROWS, 0)), 'payload_shorter_than_columns'],
    // payload_len one past the remaining bytes
    ['payload overrun', cat(bareHeader(FRAME_TYPE.DELTA), sectionHeader(SECTION.TRANSFORM, ENCODING.SORTED_IDS, 1, 17), payload), 'section_payload_overrun'],
    // 17 minimal valid sections cross the 16-section cap
    ['17 sections', cat(bareHeader(FRAME_TYPE.DELTA), ...Array.from({ length: 17 }, () => sectionHeader(SECTION.TRANSFORM, ENCODING.SORTED_IDS, 0, 0))), 'too_many_sections'],
    // string table whose embedded count overflows (section count stays legal)
    ['string table count overflow', cat(bareHeader(FRAME_TYPE.FULL_SNAPSHOT), sectionHeader(SECTION.STRING_TABLE, ENCODING.DENSE, 1, 8), new Uint8Array([0xff, 0xff, 0xff, 0xff, 0, 0, 0, 0])), 'string_table_count'],
  ];
  for (const [name, bytes, reason] of cases) {
    const r = applyBounded(newStore(), bytes, { epoch: 0, frameSequence: 0 }, name);
    assert.equal(r.ok, false, name);
    assert.equal(r.reason, reason, name);
  }
  // Header round-trip of a patched frame still must not throw at the raw layer.
  const head = readHeader(snap);
  assert.ok(head.ok);
});

test('fuzz: trailing garbage after the last section is rejected', () => {
  const snap = seedSnapshot();
  const deterministic = [
    ['zero run', new Uint8Array(12)],
    ['zero run +1', new Uint8Array(13)],
    ['ff run', new Uint8Array(12).fill(0xff)],
    ['ff run long', new Uint8Array(40).fill(0xff)],
  ];
  for (const [name, garbage] of deterministic) {
    const r = applyBounded(newStore(), cat(snap, garbage), { epoch: 0, frameSequence: 0 }, `trailing ${name}`);
    assert.equal(r.ok, false, `trailing ${name} must be rejected`);
  }
  // Random garbage is not guaranteed to parse as an invalid section id, so
  // it only owes the bounded contract.
  const rng = mulberry32(0x7ea11c);
  for (let m = 0; m < 20; m++) {
    const garbage = new Uint8Array(1 + Math.floor(rng() * 48));
    for (let i = 0; i < garbage.length; i++) garbage[i] = Math.floor(rng() * 256);
    applyBounded(newStore(), cat(snap, garbage), { epoch: 0, frameSequence: 0 }, 'trailing random');
  }
});

test('fuzz: non-Uint8Array inputs are rejected as bad_input everywhere', () => {
  for (const bad of [null, undefined, 0, 42, 'ALRT...', {}, [], new ArrayBuffer(32)]) {
    const h = readHeader(/** @type {*} */ (bad));
    assert.equal(h.ok, false, typeof bad + ' input');
    assert.equal(h.reason, 'bad_input');
    const r = applyBounded(newStore(), /** @type {*} */ (bad), { epoch: 0, frameSequence: 0 }, 'bad input');
    assert.equal(r.reason, 'bad_input');
  }
});

test('fuzz: roaring decoder survives mutated payloads and enforces container limits', () => {
  const valid = serializeRoaring(Uint32Array.from([1, 2, 3, 70000, 131072, 6553600 + 5]));
  const shape = (r, note) => {
    if (r.ok === false) assert.equal(typeof r.reason, 'string', note);
    else if (r.ok === true) assert.ok(r.ids instanceof Uint32Array, note);
    else assert.fail(`roaring result missing ok flag on ${note}`);
    return r;
  };
  const rng = mulberry32(0x0a41e5);
  for (const bytes of [...truncations(valid), ...bitFlips(valid, rng, 150)]) {
    shape(deserializeRoaring(bytes), `roaring mutant len=${bytes.length}`);
  }
  const u32 = (n) => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n, true); return b; };
  // Unknown cookies, and the no-run cookie with dirty high bits.
  for (const cookie of [12345, 12348, 0xffffffff, 12346 | (1 << 16)]) {
    const r = shape(deserializeRoaring(cat(u32(cookie), new Uint8Array(16))), `cookie ${cookie}`);
    assert.equal(r.reason, 'bad_roaring_cookie', `cookie ${cookie}`);
  }
  // Container count past the 65536 cap.
  let r = shape(deserializeRoaring(cat(u32(12346), u32(65537))), 'size 65537');
  assert.equal(r.reason, 'roaring_too_many_containers');
  // Run container (cookie 12347) decodes a real run, then overruns on a
  // declared nRuns it does not have bytes for.
  const run = cat(u32(12347), new Uint8Array([0x01]), u32(0), new Uint8Array([1, 0]), new Uint8Array([0, 0]), new Uint8Array([9, 0]));
  r = shape(deserializeRoaring(run), 'valid run');
  assert.ok(r.ok && r.ids.length === 10 && r.ids[9] === 9, 'run container must decode 0..9');
  const runOver = cat(u32(12347), new Uint8Array([0x01]), u32(0), new Uint8Array([0xff, 0xff]));
  r = shape(deserializeRoaring(runOver), 'run overrun');
  assert.equal(r.reason, 'roaring_run_overrun');
  // Expansion cap: six full bitmap containers (393,216 ids) fit under the
  // 400k push cap; seven (458,752) trip it instead of growing unbounded.
  const bitmapBlob = (n) => {
    const dataLen = n * 8192;
    const b = new Uint8Array(8 + n * 8 + dataLen);
    const v = new DataView(b.buffer);
    v.setUint32(0, 12346, true);
    v.setUint32(4, n, true);
    for (let k = 0; k < n; k++) {
      v.setUint16(8 + k * 4, k, true);
      v.setUint16(8 + k * 4 + 2, 0xffff, true); // card-1 → card 65536 → bitmap
      v.setUint32(8 + n * 4 + k * 4, 8 + n * 8 + k * 8192, true);
    }
    b.fill(0xff, 8 + n * 8);
    return b;
  };
  r = shape(deserializeRoaring(bitmapBlob(6)), '6 bitmap containers');
  assert.ok(r.ok && r.ids.length === 393216, 'under the expansion cap it must decode');
  r = shape(deserializeRoaring(bitmapBlob(7)), '7 bitmap containers');
  assert.equal(r.reason, 'roaring_expansion_over_limit');
});

test('fuzz: varint id decoder survives mutated streams and enforces stream rules', () => {
  // Multi-container gaps exercise multi-byte LEB128 deltas.
  const stream = encodeVarintIds(Uint32Array.from([1, 2, 3, 70000, 131072, 6553605]));
  const count = 6;
  const shape = (r, note) => {
    if (r.ok === false) assert.equal(typeof r.reason, 'string', note);
    else if (r.ok === true) {
      assert.ok(r.ids instanceof Uint32Array && r.ids.length === count, note);
      assert.equal(typeof r.consumed, 'number', note);
    } else assert.fail(`varint result missing ok flag on ${note}`);
    return r;
  };
  const rng = mulberry32(0x7a2b1e);
  for (const bytes of [...truncations(stream), ...bitFlips(stream, rng, 120)]) {
    shape(decodeVarintIds(bytes, count), `varint mutant len=${bytes.length}`);
  }
  // An empty stream for zero rows is legal; wrong row counts are count errors
  // at the section layer, not here.
  assert.ok(decodeVarintIds(new Uint8Array(0), 0).ok);
  // Overlong continuation (shift past 28) must be rejected exactly.
  let r = shape(decodeVarintIds(new Uint8Array([0x80, 0x80, 0x80, 0x80, 0x80, 0x01]), 1), 'overlong');
  assert.equal(r.reason, 'varint_overlong');
  // A zero gap makes the cumulative stream non-ascending.
  r = shape(decodeVarintIds(new Uint8Array([5, 0]), 2), 'unsorted');
  assert.equal(r.reason, 'varint_unsorted');
  // A stream shorter than `count` rows truncates.
  r = shape(decodeVarintIds(new Uint8Array([5]), 2), 'truncated');
  assert.equal(r.reason, 'varint_truncated');
});

test('fuzz: raw readers hold the bounded contract across the whole corpus', () => {
  const snap = seedSnapshot();
  const rng = mulberry32(0xfee0c0de);
  const corpus = [
    ...truncations(snap),
    ...truncations(seedDelta(ENCODING.ROARING)),
    ...truncations(seedDelta(ENCODING.DELTA_VARINT)),
    ...bitFlips(snap, rng, 25),
    ...headerByteSweep(snap),
    bareHeader(255),
    cat(bareHeader(FRAME_TYPE.DELTA), sectionHeader(SECTION.TRANSFORM, ENCODING.SORTED_IDS, LIMITS.MAX_SECTION_ROWS + 1, 0)),
    cat(snap, new Uint8Array(12)),
  ];
  const noThrow = (fn, note) => {
    let r;
    try { r = fn(); } catch (e) { assert.fail(`${note} threw: ${e && e.stack || e}`); }
    return r;
  };
  for (const bytes of corpus) {
    const head = noThrow(() => readHeader(bytes), 'readHeader');
    assert.ok(head !== null && typeof head === 'object' && typeof head.ok === 'boolean', 'readHeader shape');
    if (!head.ok) { assert.equal(typeof head.reason, 'string', 'readHeader reason'); continue; }
    assert.equal(typeof head.bodyOffset, 'number', 'bodyOffset');
    const secs = noThrow(() => readSections(bytes, head.bodyOffset), 'readSections');
    assert.ok(secs !== null && typeof secs === 'object' && typeof secs.ok === 'boolean', 'readSections shape');
    if (!secs.ok) { assert.equal(typeof secs.reason, 'string', 'readSections reason'); continue; }
    assert.ok(Array.isArray(secs.sections) && secs.sections.length <= LIMITS.MAX_SECTIONS, 'section table bounded');
    for (const sec of secs.sections) {
      // DESPAWN masks are read by applyFrame's private maskIds (not exported);
      // they are covered by the despawn seeds in the applyFrame sweeps above.
      if (sec.id === SECTION.SPAWN) {
        const r = noThrow(() => readSpawnSection(bytes, sec), 'readSpawnSection');
        assert.ok(r.ok === false ? typeof r.reason === 'string' : Array.isArray(r.rows), 'spawn reader shape');
      } else if (sec.id === SECTION.STRING_TABLE) {
        const r = noThrow(() => readStringTable(bytes, sec), 'readStringTable');
        assert.ok(r.ok === false ? typeof r.reason === 'string' : Array.isArray(r.strings), 'string table reader shape');
      } else {
        const r = noThrow(() => readSectionColumns(bytes, sec), 'readSectionColumns');
        if (r.ok === false) assert.equal(typeof r.reason, 'string', 'section reader reason');
        else if (r.ok === true) {
          assert.ok(r.ids === null || r.ids instanceof Uint32Array, 'mask ids shape');
          for (const f of SECTION_FIELDS[sec.id]) {
            const col = r.columns[f.name];
            assert.ok(ArrayBuffer.isView(col) && !(col instanceof DataView), `column ${f.name} is a TypedArray`);
            assert.equal(col.length, sec.count, `column ${f.name} length`);
          }
        } else assert.fail('section reader missing ok flag');
      }
    }
  }
});

test('fuzz: negotiation parsers tolerate hostile JSON shapes', () => {
  const helloCorpus = [
    null, undefined, 0, 42, 'x', true, [], {}, { rt: null }, { rt: 0 }, { rt: 'x' }, { rt: [] }, { rt: {} },
    { rt: { protocols: null } }, { rt: { protocols: 'afterlight-soa-v1' } },
    { rt: { protocols: [null, 3, {}, ['afterlight-soa-v1']] } }, { rt: { protocols: { length: 1 } } },
    { rt: { protocols: ['afterlight-soa-v1'], webgpu: 'yes', wasm: 1 } },
    { rt: { protocols: new Array(5000).fill('afterlight-soa-v1') } },
  ];
  for (const h of helloCorpus) {
    let r;
    try { r = parseHelloRt(h); } catch (e) { assert.fail(`parseHelloRt threw on ${JSON.stringify(h)?.slice(0, 60)}: ${e}`); }
    assert.ok(r === null || (Array.isArray(r.protocols) && typeof r.webgpu === 'boolean' && typeof r.wasm === 'boolean'),
      `parseHelloRt shape for ${JSON.stringify(h)?.slice(0, 60)}`);
  }
  const welcomeCorpus = [
    null, undefined, 'welcome', [], { rt: 3 }, { rt: { protocol: 1 } }, { rt: { protocol: 'x' } },
    { rt: { protocol: RT_PROTOCOL, snapshot_hz: -5 } }, { rt: { protocol: RT_PROTOCOL, snapshot_hz: 0 } },
    { rt: { protocol: RT_PROTOCOL, snapshot_hz: Number.NaN } }, { rt: { protocol: RT_PROTOCOL, snapshot_hz: 'fast' } },
    { rt: { protocol: RT_PROTOCOL, snapshot_hz: 1e9 } }, { rt: { protocol: RT_PROTOCOL, snapshot_hz: null } },
  ];
  for (const w of welcomeCorpus) {
    let r;
    try { r = parseWelcomeRt(w); } catch (e) { assert.fail(`parseWelcomeRt threw: ${e}`); }
    assert.ok(r === null || (r.protocol === RT_PROTOCOL && typeof r.snapshotHz === 'number' && Number.isFinite(r.snapshotHz) && r.snapshotHz > 0),
      `parseWelcomeRt shape for ${JSON.stringify(w)?.slice(0, 60)}`);
  }
  // Garbage never upgrades a session: hostile hello/welcome stay legacy.
  assert.equal(parseHelloRt({ rt: { protocols: [] } })?.protocols.length, 0);
});
