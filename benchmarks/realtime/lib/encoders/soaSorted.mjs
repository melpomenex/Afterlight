// Encoding D — DELTA frames, SORTED_IDS (contract §3, encoding 1).
//
// Two sections, both SORTED_IDS:
//   section_id 3 (transform): k ascending u32 ids, then k×4 f32 (x, y, z, yaw)
//   section_id 6 (flags):     k ascending u32 ids, then k×u8
//
// Each contract section carries its own id list (§3: "mask/ids first (per
// encoding), then one value column per field"), so the frame pays the 4-byte/
// id mask twice — that duplication is part of what the hybrid selector (H)
// weighs against ROARING masks and DENSE snapshots.
// Frame = 24 + 2×12 + 25k bytes. At k = 50_000 this is 1.25 MB and exceeds
// the §3 1 MiB frame limit: decode() enforces the limit (rejects), and the
// benchmark flags those cells overContractLimit and decodes them with an
// explicit raised limit for measurement only.
//
// Decode enforces every §3 constraint and never throws out of the entry point.

export const name = 'soa-sorted';
export const MAGIC = 0x414c5254;
export const SECTION_HDR = 12;
export const LIMITS = {
  maxFrameBytes: 1 << 20, // 1 MiB (§3)
  maxSections: 16,
  maxEntityCount: 100_000,
};
const fail = (error) => ({ ok: false, error });
const SEC_TRANSFORM = 3, SEC_FLAGS = 6, ENC_SORTED = 1;
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

export function encode(world, changed, meta = {}) {
  const k = changed.length;
  if (k === 0) {
    const frame = new Uint8Array(24); // §3: entity_count = 0 sections omitted
    writeHeader(frame, 1, meta);
    return frame;
  }
  const ids = k > 0 && changed.some((v, i) => i > 0 && v <= changed[i - 1])
    ? Uint32Array.from(changed).sort()
    : changed;
  const frame = new Uint8Array(24 + 2 * SECTION_HDR + 25 * k);
  writeHeader(frame, 1 /* DELTA */, meta);
  const dv = new DataView(frame.buffer);
  const slotOf = new Map();
  for (let i = 0; i < world.n; i++) slotOf.set(world.ids[i], i);
  let p = 24;
  for (const sectionId of [SEC_TRANSFORM, SEC_FLAGS]) {
    dv.setUint8(p, sectionId);
    dv.setUint8(p + 1, ENC_SORTED);
    dv.setUint16(p + 2, 0);
    dv.setUint32(p + 4, k);
    dv.setUint32(p + 8, sectionId === SEC_TRANSFORM ? 20 * k : 5 * k);
    p += SECTION_HDR;
    for (let j = 0; j < k; j++) dv.setUint32(p + 4 * j, ids[j], true);
    p += 4 * k;
    for (let j = 0; j < k; j++) {
      const i = slotOf.get(ids[j]);
      if (sectionId === SEC_TRANSFORM) {
        dv.setFloat32(p + 16 * j, world.x[i], true);
        dv.setFloat32(p + 16 * j + 4, world.y[i], true);
        dv.setFloat32(p + 16 * j + 8, world.z[i], true);
        dv.setFloat32(p + 16 * j + 12, world.yaw[i], true);
      } else {
        frame[p + j] = world.flags[i];
      }
    }
    p += sectionId === SEC_TRANSFORM ? 16 * k : k;
  }
  return frame;
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
    if (encoding !== ENC_SORTED) return fail('unknown-encoding');
    if (reserved !== 0) return fail('bad-reserved');
    if (count === 0) return fail('empty-section'); // §3: empty sections are omitted, never sent
    if (count > LIMITS.maxEntityCount) return fail('entity-count-limit');
    const expect = sectionId === SEC_TRANSFORM ? 20 * count : 5 * count;
    if (payloadLen !== expect) return fail('bad-payload-len');
    if (payloadLen > end - p) return fail('payload-len-overflow');
    if (cols && cols.n !== count) return fail('count-mismatch');
    if (!cols) cols = { n: count, x: new Float32Array(count), y: new Float32Array(count), z: new Float32Array(count), yaw: new Float32Array(count), flags: new Uint8Array(count) };
    // id list first (§3), strictly ascending
    ids = new Uint32Array(count);
    for (let j = 0; j < count; j++) {
      ids[j] = dv.getUint32(p + 4 * j, true);
      if (j > 0 && ids[j] <= ids[j - 1]) return fail('non-ascending-ids');
    }
    p += 4 * count;
    if (sectionId === SEC_TRANSFORM) {
      for (let j = 0; j < count; j++) {
        cols.x[j] = dv.getFloat32(p + 16 * j, true);
        cols.y[j] = dv.getFloat32(p + 16 * j + 4, true);
        cols.z[j] = dv.getFloat32(p + 16 * j + 8, true);
        cols.yaw[j] = dv.getFloat32(p + 16 * j + 12, true);
      }
      p += 16 * count;
    } else {
      cols.flags.set(u8.subarray(p, p + count));
      p += count;
    }
  }
  if (p !== end) return fail('trailing-bytes');
  if (!cols) {
    // bare header: legal no-op delta — nothing changed this tick
    return { ok: true, frameType: h.frameType, meta: h.meta, ids: new Uint32Array(0), n: 0, x: new Float32Array(0), y: new Float32Array(0), z: new Float32Array(0), yaw: new Float32Array(0), flags: new Uint8Array(0) };
  }
  return { ok: true, frameType: h.frameType, meta: h.meta, ids, ...cols };
}
