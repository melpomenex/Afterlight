// Semantic round-trip + hostile-input tests for the realtime encoding bench.
// Run: node --test benchmarks/realtime/tests/
// Implements contract §8 verification duties: decoded values == fixture
// values, and decoders survive truncation / bad magic / absurd lengths /
// unknown enums / trailing bytes / random mutation without throwing.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, stepWorld, rng } from '../lib/fixtures.mjs';
import * as jsonEnc from '../lib/encoders/jsonBaseline.mjs';
import * as aos from '../lib/encoders/aosBinary.mjs';
import * as dense from '../lib/encoders/soaDense.mjs';
import * as sorted from '../lib/encoders/soaSorted.mjs';
import * as roaring from '../lib/encoders/soaRoaring.mjs';
import * as hybrid from '../lib/chooseEncoding.mjs';

const META = { roomEpoch: 5, serverTick: 5000, frameSequence: 42, baselineSequence: 41 };
const world = makeWorld(200, 42);
const changed = stepWorld(world, 0.25, 7); // k = 50, sorted ascending
const slotOf = new Map();
for (let i = 0; i < world.n; i++) slotOf.set(world.ids[i], i);

const BINARY = [aos, sorted, roaring];

function assertColumnsMatch(d, count) {
  assert.equal(d.ok, true, `decode failed: ${d.error}`);
  assert.equal(d.ids.length, count);
  for (let j = 0; j < count; j++) {
    const i = slotOf.get(d.ids[j]);
    assert.ok(i !== undefined, `unknown id ${d.ids[j]}`);
    assert.equal(d.x[j], world.x[i], `x @${j}`);
    assert.equal(d.y[j], world.y[i], `y @${j}`);
    assert.equal(d.z[j], world.z[i], `z @${j}`);
    assert.equal(d.yaw[j], world.yaw[i], `yaw @${j}`);
    assert.equal(d.flags[j], world.flags[i], `flags @${j}`);
  }
}

// ---------- semantic round-trips ----------

test('json baseline round-trips fixture values through the real wire shape', () => {
  const text = jsonEnc.encode(world, changed);
  const res = jsonEnc.decode(text);
  assert.equal(res.ok, true);
  assert.equal(res.players.length, changed.length);
  const byGuest = new Map(world.guestIds.map((g, i) => [g, i]));
  for (const p of res.players) {
    const i = byGuest.get(p.id);
    assert.ok(i !== undefined, `unknown guestId ${p.id}`);
    assert.equal(p.x, Math.round(world.x[i] * 1000) / 1000);
    assert.equal(p.z, Math.round(world.z[i] * 1000) / 1000);
    assert.equal(p.rotY, Math.round(world.yaw[i] * 1000) / 1000);
    assert.equal(p.walking, !!(world.flags[i] & 1));
    assert.equal(p.sitting, !!(world.flags[i] & 2));
    assert.equal(p.airborne, !!(world.flags[i] & 4));
  }
});

for (const enc of BINARY) {
  test(`${enc.name}: decoded columns == fixture values, ids == changed set`, () => {
    const frame = enc.encode(world, changed, META);
    const d = enc.decode(frame);
    assertColumnsMatch(d, changed.length);
    for (let j = 0; j < d.ids.length; j++) assert.equal(d.ids[j], changed[j]);
  });

  test(`${enc.name}: header fields round-trip (§4 epoch/sequence)`, () => {
    const d = enc.decode(enc.encode(world, changed, META));
    assert.equal(d.ok, true);
    assert.equal(d.meta.roomEpoch, 5);
    assert.equal(d.meta.serverTick, 5000);
    assert.equal(d.meta.frameSequence, 42);
    assert.equal(d.meta.baselineSequence, 41);
    assert.equal(d.frameType, 1); // DELTA
  });

  test(`${enc.name}: empty change set → bare header frame, decodes to zero rows`, () => {
    const frame = enc.encode(world, new Uint32Array(0), META);
    assert.equal(frame.byteLength, 24);
    const d = enc.decode(frame);
    assert.equal(d.ok, true);
    assert.equal(d.ids.length, 0);
  });
}

test('soa-dense: FULL_SNAPSHOT carries all rows in slot order', () => {
  const frame = dense.encode(world, changed, META); // changed ignored: snapshot
  assert.equal(frame.byteLength, 24 + 2 * 12 + 17 * world.n);
  const d = dense.decode(frame);
  assert.equal(d.ok, true, d.error);
  assert.equal(d.frameType, 0);
  assert.equal(d.n, world.n);
  assert.equal(d.ids, null); // DENSE: id ≡ slot
  for (let i = 0; i < world.n; i++) {
    assert.equal(d.x[i], world.x[i]);
    assert.equal(d.y[i], world.y[i]);
    assert.equal(d.z[i], world.z[i]);
    assert.equal(d.yaw[i], world.yaw[i]);
    assert.equal(d.flags[i], world.flags[i]);
  }
});

test('hybrid H: decodes its own frames and matches the chosen encoder byte-for-byte', () => {
  for (const f of [0.001, 0.05, 1.0]) {
    const w = makeWorld(200, 42);
    const ch = stepWorld(w, f, 7);
    const slotOf2 = new Map();
    for (let i = 0; i < w.n; i++) slotOf2.set(w.ids[i], i);
    const frame = hybrid.encode(w, ch, META);
    const pick = hybrid.choice(w.n, ch.length);
    const direct = pick === 'dense' ? dense : pick === 'sorted' ? sorted : roaring;
    assert.deepEqual(Array.from(frame), Array.from(direct.encode(w, ch, META)), `pick ${pick} @f=${f}`);
    const d = hybrid.decode(frame);
    assert.equal(d.ok, true, d.error);
    if (pick === 'dense') {
      assert.equal(d.n, w.n); // DENSE: id ≡ slot, all rows
      for (let i = 0; i < w.n; i++) assert.equal(d.x[i], w.x[i]);
    } else {
      for (let j = 0; j < d.ids.length; j++) {
        const i = slotOf2.get(d.ids[j]);
        assert.equal(d.x[j], w.x[i]);
        assert.equal(d.flags[j], w.flags[i]);
      }
    }
  }
});

// ---------- hostile inputs ----------

function expectReject(enc, frame, label) {
  let out;
  try {
    out = enc.decode(frame);
  } catch (e) {
    assert.fail(`${enc.name} ${label}: threw ${e.message}`);
  }
  assert.equal(out.ok, false, `${enc.name} ${label}: accepted hostile frame`);
  assert.equal(typeof out.error, 'string');
}

function mutate(frame, at, value) {
  const u = frame.slice();
  new DataView(u.buffer).setUint32(at, value, true);
  return u;
}

for (const enc of [...BINARY, dense, hybrid]) {
  const frame = enc === hybrid ? hybrid.encode(world, changed, META) : enc.encode(world, changed, META);

  test(`${enc.name}: truncation rejected at every prefix`, () => {
    // Note: cut at exactly 24 is NOT rejectable — the §3 header carries no
    // total-length field, so a 24-byte prefix is byte-identical to a legal
    // bare-header empty delta. Every shorter or deeper cut must reject.
    for (const cut of [0, 4, 10, 23, 30, Math.floor(frame.length / 2), frame.length - 13, frame.length - 1]) {
      expectReject(enc, frame.slice(0, cut), `truncated@${cut}`);
    }
    const bare = enc.decode(frame.slice(0, 24));
    assert.equal(bare.ok, true);
    assert.equal(bare.ids ? bare.ids.length : 0, 0);
  });

  test(`${enc.name}: bad magic rejected`, () => {
    expectReject(enc, mutate(frame, 0, 0x4b4e554a), 'bad-magic'); // "JUNK"
  });

  test(`${enc.name}: absurd payload_len rejected (no runaway allocation)`, () => {
    const firstSection = 24;
    expectReject(enc, mutate(frame, firstSection + 8, 0xfffffff0), 'absurd-payload-len');
    expectReject(enc, mutate(frame, firstSection + 8, 0xffffffff), 'absurd-payload-len');
  });

  test(`${enc.name}: absurd entity_count rejected`, () => {
    expectReject(enc, mutate(frame, firstSectionOf(frame), 500_000), 'absurd-count');
  });

  test(`${enc.name}: unknown section_id / encoding / frame_type / version rejected`, () => {
    const b = frame.slice();
    new DataView(b.buffer).setUint8(24, 200); // section_id
    expectReject(enc, b, 'unknown-section');
    const b2 = frame.slice();
    new DataView(b2.buffer).setUint8(25, 7); // encoding
    expectReject(enc, b2, 'unknown-encoding');
    const b3 = frame.slice();
    new DataView(b3.buffer).setUint8(5, 9); // frame_type
    expectReject(enc, b3, 'unknown-frame-type');
    const b4 = frame.slice();
    new DataView(b4.buffer).setUint8(4, 2); // protocol_version
    expectReject(enc, b4, 'bad-version');
  });

  test(`${enc.name}: trailing bytes rejected`, () => {
    const one = new Uint8Array(frame.length + 1); one.set(frame); one[frame.length] = 0x41;
    expectReject(enc, one, 'trailing+1');
    const twelve = new Uint8Array(frame.length + 12); twelve.set(frame);
    expectReject(enc, twelve, 'trailing+12'); // parses as a section start → unknown/overflow
  });

  test(`${enc.name}: oversize frame rejected by §3 1 MiB cap`, () => {
    expectReject(enc, new Uint8Array((1 << 20) + 1), 'frame-limit');
  });

  test(`${enc.name}: random byte mutation never throws (§8 fuzzing)`, () => {
    const rand = rng(20260906);
    let accepted = 0;
    for (let t = 0; t < 500; t++) {
      const u = frame.slice();
      const flips = 1 + ((rand() * 4) | 0);
      for (let m = 0; m < flips; m++) u[(rand() * u.length) | 0] = (rand() * 256) | 0;
      let out;
      try {
        out = enc.decode(u);
      } catch (e) {
        assert.fail(`fuzz iteration ${t} threw: ${e.message}`);
      }
      if (out.ok) accepted++;
    }
    assert.ok(accepted > 0, 'benign mutations should still decode'); // sanity: decoder not reject-everything
  });
}

function firstSectionOf(frame) {
  return 24 + 4; // entity_count u32 inside the first section header (id@0, enc@1, rsv@2, count@4)
}

test('contract-legal optional sections (motion/anim/visual) are tolerated by C/D/E', () => {
  const extra = [4, 5, 7]; // motion, anim, visual
  for (const enc of [dense, sorted, roaring]) {
    const base = enc.encode(world, changed, META);
    const section = new Uint8Array(12 + 3);
    const dv = new DataView(section.buffer);
    dv.setUint8(0, 4); // motion
    dv.setUint8(1, enc === roaring ? 2 : enc === sorted ? 1 : 0);
    dv.setUint32(4, 0);
    dv.setUint32(8, 3);
    const merged = new Uint8Array(base.length + section.length);
    merged.set(base);
    merged.set(section, base.length);
    const d = enc.decode(merged);
    assert.equal(d.ok, true, `${enc.name} should tolerate an appended motion section: ${d.error}`);
  }
});

test('json baseline rejects garbage text without throwing', () => {
  for (const bad of ['', '{', '{"type":', 'null', '[]', '{"players": 5}']) {
    const out = jsonEnc.decode(bad);
    assert.equal(out.ok, false, `accepted ${JSON.stringify(bad)}`);
  }
});
