// Encoding E — DELTA frames, ROARING masks (contract §3, encoding 2).
//
// Same two sections as encoding D (transform id 3, flags id 6), each carrying
// its id mask as a portable Roaring serialization (CRoaring
// `roaring_uint32_serialize` format) instead of a sorted u32 list:
//   section_id 3: roaring mask, then k×4 f32 (x, y, z, yaw)
//   section_id 6: roaring mask, then k×u8
//
// Mask serialization uses the installed `roaring-wasm` package (CRoaring via
// WASM), so sizes are authentic. Decode uses a strict validating reader for
// the exact portable layout roaring-wasm emits — roaring-wasm's own
// deserialize() documents undefined behavior on corrupt input, which violates
// the contract §8 fuzzing requirement, so it is kept off the decode path.
//
// Probed portable layout (roaring-wasm 1.1.0 / CRoaring, little-endian):
//   cookie u32:
//     12346 SERIAL_COOKIE_NO_RUNCONTAINER:
//       count u32 (high 16 bits must be 0), then count × (u16 key, u16 card-1),
//       then count × u32 offsets (only when count > 0), then container data.
//     12347 SERIAL_COOKIE:
//       count u16, then count × (u16 key, u16 card-1), then ceil(count/8)
//       run-flag bytes (bit i = container i is a run), then count × u32
//       offsets (only when count >= 4), then container data.
//   Container data: run → nruns × (u16 start, u16 len-1);
//     card ≤ 4096 → array container, card × u16;
//     card > 4096 → bitmap container, 8192 bytes.
// Any deviation (unknown cookie, bad offsets, overruns, count mismatch,
// descending keys) is rejected — no allocation from unvalidated counts.

import { RoaringBitmap32 } from 'roaring-wasm';

export const name = 'soa-roaring';
export const MAGIC = 0x414c5254;
export const SECTION_HDR = 12;
export const LIMITS = {
  maxFrameBytes: 1 << 20, // 1 MiB (§3)
  maxSections: 16,
  maxEntityCount: 100_000,
};
const fail = (error) => ({ ok: false, error });
const SEC_TRANSFORM = 3, SEC_FLAGS = 6, ENC_ROARING = 2;
// contract-legal optional sections this v0 decoder ignores but must tolerate
const SKIPPABLE = new Set([4 /* motion */, 5 /* anim */, 7 /* visual */, 8 /* string-table */]);

function writeHeader(frame, frameType, meta) {
  const dv = new DataView(frame.buffer, frame.byteOffset, 24);
  dv.setUint32(0, MAGIC, true);
  dv.setUint8(4, 1);
  dv.setUint8(5, frameType);
  dv.setUint8(6, 0);
  dv.setUint8(7, 24);
  dv.setUint32(8, meta.roomEpoch ?? 1, true);
  dv.setUint32(12, meta.serverTick ?? 700, true);
  dv.setUint32(16, meta.frameSequence ?? 7, true);
  dv.setUint32(20, meta.baselineSequence ?? (frameType === 0 ? 7 : 6), true);
}

function readHeader(u8, opts) {
  const max = opts.maxFrameBytes ?? LIMITS.maxFrameBytes;
  if (u8.byteLength > max) return fail('frame-limit');
  if (u8.byteLength < 24) return fail('truncated');
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  if (dv.getUint32(0, true) !== MAGIC) return fail('bad-magic');
  if (dv.getUint8(4) !== 1) return fail('bad-version');
  const frameType = dv.getUint8(5);
  if (frameType > 2) return fail('bad-frame-type');
  if (dv.getUint8(7) < 24 || dv.getUint8(7) > u8.byteLength) return fail('bad-header-size');
  return {
    ok: true, dv, headerSize: dv.getUint8(7), frameType, end: u8.byteLength,
    meta: { // §4: client validates epoch + baseline_sequence against its state
      roomEpoch: dv.getUint32(8, true), serverTick: dv.getUint32(12, true),
      frameSequence: dv.getUint32(16, true), baselineSequence: dv.getUint32(20, true),
    },
  };
}

// Serialize the changed-id mask with CRoaring (authentic portable bytes).
export function serializeMask(ids) {
  const bm = new RoaringBitmap32(ids);
  const bytes = bm.serialize('portable');
  bm.dispose();
  return bytes;
}

export function encode(world, changed, meta = {}) {
  const k = changed.length;
  if (k === 0) {
    const frame = new Uint8Array(24);
    writeHeader(frame, 1, meta);
    return frame; // §3: entity_count = 0 sections are omitted entirely
  }
  const mask = serializeMask(changed);
  const frame = new Uint8Array(24 + 2 * SECTION_HDR + 2 * mask.length + 17 * k);
  writeHeader(frame, 1 /* DELTA */, meta);
  const dv = new DataView(frame.buffer);
  const slotOf = new Map();
  for (let i = 0; i < world.n; i++) slotOf.set(world.ids[i], i);
  let p = 24;
  for (const sectionId of [SEC_TRANSFORM, SEC_FLAGS]) {
    dv.setUint8(p, sectionId);
    dv.setUint8(p + 1, ENC_ROARING);
    dv.setUint16(p + 2, 0);
    dv.setUint32(p + 4, k);
    const payloadLen = mask.length + (sectionId === SEC_TRANSFORM ? 16 * k : k);
    dv.setUint32(p + 8, payloadLen);
    p += SECTION_HDR;
    frame.set(mask, p);
    p += mask.length;
    if (sectionId === SEC_TRANSFORM) {
      for (let j = 0; j < k; j++) {
        const i = slotOf.get(changed[j]);
        dv.setFloat32(p + 16 * j, world.x[i], true);
        dv.setFloat32(p + 16 * j + 4, world.y[i], true);
        dv.setFloat32(p + 16 * j + 8, world.z[i], true);
        dv.setFloat32(p + 16 * j + 12, world.yaw[i], true);
      }
      p += 16 * k;
    } else {
      for (let j = 0; j < k; j++) frame[p + j] = world.flags[slotOf.get(changed[j])];
      p += k;
    }
  }
  return frame;
}

// ---- strict portable-mask reader (validation-first, see file header) ----

function readMask(u8, dv, p, end) {
  if (end - p < 8) return fail('bad-mask');
  const cookie = dv.getUint32(p, true);
  let count, runFlagsAt, offsetsAt, contentsAt;
  const containers = [];
  if (cookie === 12346) {
    const raw = dv.getUint32(p + 4, true);
    if (raw >>> 16 !== 0) return fail('bad-mask');
    count = raw & 0xffff;
    if (count > (end - p - 8) / 4) return fail('bad-mask'); // bound before trust
    runFlagsAt = -1;
    offsetsAt = p + 8 + 4 * count;
    if (count > 0 && offsetsAt + 4 * count > end) return fail('bad-mask');
    contentsAt = count > 0 ? offsetsAt + 4 * count : p + 8;
  } else if (cookie === 12347) {
    count = dv.getUint16(p + 4, true);
    const flagBytes = (count + 7) >> 3;
    runFlagsAt = p + 6 + 4 * count;
    if (runFlagsAt + flagBytes > end) return fail('bad-mask');
    offsetsAt = runFlagsAt + flagBytes;
    const hasOffsets = count >= 4;
    if (hasOffsets && offsetsAt + 4 * count > end) return fail('bad-mask');
    contentsAt = hasOffsets ? offsetsAt + 4 * count : offsetsAt;
  } else {
    return fail('bad-mask');
  }
  // key + cardinality descriptors
  let cursor = contentsAt;
  let total = 0;
  let prevKey = -1;
  for (let i = 0; i < count; i++) {
    const key = dv.getUint16(p + 8 + 4 * i, true);
    const cm1 = dv.getUint16(p + 8 + 4 * i + 2, true);
    if (key <= prevKey) return fail('bad-mask'); // ascending, unique
    prevKey = key;
    const isRun = cookie === 12347 && (dv.getUint8(runFlagsAt + (i >> 3)) >> (i & 7)) & 1;
    let size;
    if (isRun) {
      size = (cm1 + 1) * 4;
    } else if (cm1 < 4096) {
      size = (cm1 + 1) * 2;
    } else {
      size = 8192;
    }
    total += cm1 + 1;
    if (total > LIMITS.maxEntityCount) return fail('bad-mask');
    containers.push({ key, cm1, isRun, at: cursor, size });
    cursor += size;
  }
  if (cursor > end) return fail('bad-mask');
  // strict offset validation when present (offsets are relative to mask start)
  if (count > 0 && (cookie === 12346 || count >= 4)) {
    for (let i = 0; i < count; i++) {
      if (dv.getUint32(offsetsAt + 4 * i, true) !== containers[i].at - p) return fail('bad-mask');
    }
  }
  // materialize ascending ids
  const ids = new Uint32Array(total);
  let w = 0;
  for (const c of containers) {
    const base = c.key * 65536;
    if (c.isRun) {
      for (let r = 0; r <= c.cm1; r++) {
        const at = c.at + 4 * r;
        if (at + 4 > end) return fail('bad-mask');
        const start = dv.getUint16(at, true);
        const len = dv.getUint16(at + 2, true) + 1;
        if (start + len > 65536) return fail('bad-mask');
        for (let v = 0; v < len; v++) ids[w++] = base + start + v;
      }
    } else if (c.cm1 < 4096) {
      for (let j = 0; j <= c.cm1; j++) {
        if (c.at + 2 * j + 2 > end) return fail('bad-mask');
        ids[w++] = base + dv.getUint16(c.at + 2 * j, true);
      }
    } else {
      if (c.at + 8192 > end) return fail('bad-mask');
      for (let b = 0; b < 8192; b++) {
        const byte = u8[c.at + b];
        if (byte === 0) continue;
        for (let bit = 0; bit < 8; bit++) {
          if (byte & (1 << bit)) ids[w++] = base + b * 8 + bit;
        }
      }
    }
  }
  return { ok: true, ids, cardinality: total, end: cursor };
}

export function decode(frame, opts = {}) {
  try {
    return decodeInner(frame, opts);
  } catch {
    return { ok: false, error: 'decode-crash' };
  }
}

function decodeInner(frame, opts) {
  const u8 = frame instanceof Uint8Array ? frame : new Uint8Array(0);
  const h = readHeader(u8, opts);
  if (!h.ok) return h;
  const { dv, end } = h;
  let p = h.headerSize;
  let cols = null, ids = null;
  let sections = 0;
  while (p < end) {
    if (++sections > LIMITS.maxSections) return fail('too-many-sections');
    if (end - p < SECTION_HDR) return fail('truncated');
    const sectionId = dv.getUint8(p);
    const encoding = dv.getUint8(p + 1);
    const reserved = dv.getUint16(p + 2);
    const count = dv.getUint32(p + 4);
    const payloadLen = dv.getUint32(p + 8);
    p += SECTION_HDR;
    if (SKIPPABLE.has(sectionId)) { // tolerated, bounds-checked, ignored
      if (payloadLen > end - p) return fail('payload-len-overflow');
      p += payloadLen;
      continue;
    }
    if (sectionId !== SEC_TRANSFORM && sectionId !== SEC_FLAGS) return fail('unknown-section');
    if (encoding !== ENC_ROARING) return fail('unknown-encoding');
    if (reserved !== 0) return fail('bad-reserved');
    if (count === 0) return fail('empty-section'); // §3: empty sections are omitted, never sent
    if (count > LIMITS.maxEntityCount) return fail('entity-count-limit');
    if (payloadLen > end - p) return fail('payload-len-overflow');
    const secEnd = p + payloadLen;
    const mask = readMask(u8, dv, p, secEnd);
    if (!mask.ok) return mask;
    if (mask.cardinality !== count) return fail('count-mismatch');
    if (cols && cols.n !== count) return fail('count-mismatch');
    if (!cols) cols = { n: count, x: new Float32Array(count), y: new Float32Array(count), z: new Float32Array(count), yaw: new Float32Array(count), flags: new Uint8Array(count) };
    // columns are in mask (ascending) order after the mask bytes; the mask
    // must end exactly where the columns begin (no gaps, no slack)
    const colsAt = secEnd - (sectionId === SEC_TRANSFORM ? 16 * count : count);
    if (mask.end !== colsAt) return fail('bad-payload-len');
    p = secEnd;
    ids = mask.ids;
    if (sectionId === SEC_TRANSFORM) {
      for (let j = 0; j < count; j++) {
        cols.x[j] = dv.getFloat32(colsAt + 16 * j, true);
        cols.y[j] = dv.getFloat32(colsAt + 16 * j + 4, true);
        cols.z[j] = dv.getFloat32(colsAt + 16 * j + 8, true);
        cols.yaw[j] = dv.getFloat32(colsAt + 16 * j + 12, true);
      }
    } else {
      cols.flags.set(u8.subarray(colsAt, colsAt + count));
    }
  }
  if (p !== end) return fail('trailing-bytes');
  if (!cols) {
    return { ok: true, frameType: h.frameType, meta: h.meta, ids: new Uint32Array(0), n: 0, x: new Float32Array(0), y: new Float32Array(0), z: new Float32Array(0), yaw: new Float32Array(0), flags: new Uint8Array(0) };
  }
  return { ok: true, frameType: h.frameType, meta: h.meta, ids, ...cols };
}
