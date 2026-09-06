// Encoding C — FULL_SNAPSHOT, DENSE sections (contract §3, encoding 0).
//
// Two sections, both DENSE (no id lists):
//   section_id 3 (transform): entity_count rows × 4 × f32 (x, y, z, yaw)
//   section_id 6 (flags):     entity_count rows × u8
//
// DENSE semantics (§3): "values for slots 0..entity_count-1 in slot order (no
// id list)". Rows are server-local slots, so the server id ≡ slot index on
// this plane; decode() therefore reports ids = null and count rows in slot
// order. A FULL_SNAPSHOT is measured at f = 1.0 (all rows) regardless of the
// changed set passed in.
//
// Decode enforces every §3 constraint (1 MiB frame, 16 sections, entity_count
// ≤ 100k, lengths bounds-checked, unknown enums rejected, trailing bytes
// rejected) and never throws out of the entry point.

export const name = 'soa-dense';
export const MAGIC = 0x414c5254;
export const SECTION_HDR = 12;
export const LIMITS = {
  maxFrameBytes: 1 << 20, // 1 MiB (§3)
  maxSections: 16,
  maxEntityCount: 100_000,
};
const fail = (error) => ({ ok: false, error });
const SEC_TRANSFORM = 3, SEC_FLAGS = 6, ENC_DENSE = 0;
// contract-legal optional sections this v0 decoder ignores but must tolerate
const SKIPPABLE = new Set([4 /* motion */, 5 /* anim */, 7 /* visual */, 8 /* string-table */]);

function writeHeader(frame, frameType, meta) {
  const dv = new DataView(frame.buffer, frame.byteOffset, 24);
  dv.setUint32(0, MAGIC, true);
  dv.setUint8(4, 1); // protocol_version
  dv.setUint8(5, frameType);
  dv.setUint8(6, 0); // flags
  dv.setUint8(7, 24); // header_size
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

export function encode(world, _changed, meta = {}) {
  const n = world.n; // FULL_SNAPSHOT: f = 1.0 rows
  const frame = new Uint8Array(24 + 2 * SECTION_HDR + 17 * n);
  writeHeader(frame, 0 /* FULL_SNAPSHOT */, meta);
  const dv = new DataView(frame.buffer);
  let p = 24;
  dv.setUint8(p, SEC_TRANSFORM);
  dv.setUint8(p + 1, ENC_DENSE);
  dv.setUint16(p + 2, 0);
  dv.setUint32(p + 4, n);
  dv.setUint32(p + 8, 16 * n);
  p += SECTION_HDR;
  for (let i = 0; i < n; i++) {
    dv.setFloat32(p, world.x[i], true);
    dv.setFloat32(p + 4, world.y[i], true);
    dv.setFloat32(p + 8, world.z[i], true);
    dv.setFloat32(p + 12, world.yaw[i], true);
    p += 16;
  }
  dv.setUint8(p, SEC_FLAGS);
  dv.setUint8(p + 1, ENC_DENSE);
  dv.setUint16(p + 2, 0);
  dv.setUint32(p + 4, n);
  dv.setUint32(p + 8, n);
  p += SECTION_HDR;
  frame.set(world.flags.subarray(0, n), p);
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
  let cols = null, seen = 0;
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
    if (encoding !== ENC_DENSE) return fail('unknown-encoding');
    if (reserved !== 0) return fail('bad-reserved');
    if (count === 0) return fail('empty-section'); // §3: empty sections are omitted, never sent
    if (count > LIMITS.maxEntityCount) return fail('entity-count-limit');
    const expect = sectionId === SEC_TRANSFORM ? 16 * count : count;
    if (payloadLen !== expect) return fail('bad-payload-len');
    if (payloadLen > end - p) return fail('payload-len-overflow');
    if (cols && cols.n !== count) return fail('count-mismatch');
    if (!cols) cols = { n: count, x: new Float32Array(count), y: new Float32Array(count), z: new Float32Array(count), yaw: new Float32Array(count), flags: new Uint8Array(count) };
    if (sectionId === SEC_TRANSFORM) {
      for (let i = 0; i < count; i++) {
        cols.x[i] = dv.getFloat32(p + i * 16, true);
        cols.y[i] = dv.getFloat32(p + i * 16 + 4, true);
        cols.z[i] = dv.getFloat32(p + i * 16 + 8, true);
        cols.yaw[i] = dv.getFloat32(p + i * 16 + 12, true);
      }
    } else {
      cols.flags.set(u8.subarray(p, p + count));
    }
    p += payloadLen;
    seen++;
  }
  if (p !== end) return fail('trailing-bytes');
  if (!cols || seen < 2) {
    // bare header: legal empty-world snapshot
    return { ok: true, frameType: h.frameType, meta: h.meta, ids: null, n: 0, x: new Float32Array(0), y: new Float32Array(0), z: new Float32Array(0), yaw: new Float32Array(0), flags: new Uint8Array(0) };
  }
  return { ok: true, frameType: h.frameType, meta: h.meta, ids: null /* DENSE: id ≡ slot */, ...cols };
}
