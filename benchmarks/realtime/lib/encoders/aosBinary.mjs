// Encoding B — custom binary Array-of-Structs (AoS), per-entity records.
//
// FRAME LAYOUT
//   [24-byte contract header (§3)]  frame_type = 1 (DELTA), flags = 0
//   [one 12-byte section header]    section_id = 63 (experimental AoS),
//                                   encoding = 0 (DENSE), reserved = 0
//   [payload]                       `count` packed records, each 21 bytes:
//
//   AoS record (packed, little-endian, 21 bytes/entity):
//     offset size field
//     0      4    id          u32 server entity id
//     4      4    x           f32
//     8      4    y           f32
//     12     4    z           f32
//     16     4    yaw         f32
//     20     1    flags       u8 (bit0 walking, bit1 sitting, bit2 airborne)
//
// Section_id 63 is deliberately outside the contract §3 range (1..8): this is
// the "naive custom binary" comparison point — one section, one interleaved
// record per entity, no columnar payload. It would be rejected by every
// contract-strict decoder that does not know id 63.
//
// Decode returns SoA columns (ids, x, y, z, yaw, flags): the client contract
// (§7) consumes "changed-id + changed-column arrays", so the AoS→SoA transpose
// is part of B's honest measured decode cost.

export const name = 'aos-binary';
export const RECORD_BYTES = 21;
export const SECTION_ID_AOS = 63;
export const MAGIC = 0x414c5254;
export const SECTION_HDR = 12;
export const LIMITS = {
  maxFrameBytes: 1 << 20, // 1 MiB (§3)
  maxSections: 16,
  maxEntityCount: 100_000,
};
const fail = (error) => ({ ok: false, error });

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
  // baseline: snapshot resets to own sequence; delta applies to previous (§4)
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
    meta: {
      roomEpoch: dv.getUint32(8, true), serverTick: dv.getUint32(12, true),
      frameSequence: dv.getUint32(16, true), baselineSequence: dv.getUint32(20, true),
    },
  };
}

export function encode(world, changed, meta = {}) {
  const k = changed.length;
  if (k === 0) {
    const frame = new Uint8Array(24); // §3 convention: empty sections omitted
    writeHeader(frame, 1, meta);
    return frame;
  }
  const frame = new Uint8Array(24 + SECTION_HDR + RECORD_BYTES * k);
  writeHeader(frame, 1 /* DELTA */, meta);
  const dv = new DataView(frame.buffer);
  let p = 24;
  dv.setUint8(p, SECTION_ID_AOS);
  dv.setUint8(p + 1, 0 /* DENSE */);
  dv.setUint16(p + 2, 0);
  dv.setUint32(p + 4, k);
  dv.setUint32(p + 8, RECORD_BYTES * k);
  p += SECTION_HDR;
  // id -> slot for the gap-y fixture id space (same lookup the JSON path pays)
  const slotOf = new Map();
  for (let i = 0; i < world.n; i++) slotOf.set(world.ids[i], i);
  for (let j = 0; j < k; j++) {
    const i = slotOf.get(changed[j]);
    dv.setUint32(p, changed[j]);
    dv.setFloat32(p + 4, world.x[i], true);
    dv.setFloat32(p + 8, world.y[i], true);
    dv.setFloat32(p + 12, world.z[i], true);
    dv.setFloat32(p + 16, world.yaw[i], true);
    frame[p + 20] = world.flags[i];
    p += RECORD_BYTES;
  }
  return frame;
}

export function decode(frame, opts = {}) {
  try {
    return decodeInner(frame, opts);
  } catch {
    return { ok: false, error: 'decode-crash' }; // never throw out (§8)
  }
}

function decodeInner(frame, opts) {
  const u8 = frame instanceof Uint8Array ? frame : new Uint8Array(0);
  const h = readHeader(u8, opts);
  if (!h.ok) return h;
  const { dv, end } = h;
  let p = h.headerSize;
  let got = null;
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
    if (sectionId !== SECTION_ID_AOS) return fail('unknown-section');
    if (encoding !== 0) return fail('unknown-encoding');
    if (reserved !== 0) return fail('bad-reserved');
    if (count === 0) return fail('empty-section');
    if (count > LIMITS.maxEntityCount) return fail('entity-count-limit');
    if (payloadLen !== count * RECORD_BYTES) return fail('bad-record-size');
    if (payloadLen > end - p) return fail('payload-len-overflow');
    const ids = new Uint32Array(count);
    const x = new Float32Array(count), y = new Float32Array(count);
    const z = new Float32Array(count), yaw = new Float32Array(count);
    const flags = new Uint8Array(count);
    for (let j = 0; j < count; j++) {
      const r = p + j * RECORD_BYTES;
      ids[j] = dv.getUint32(r);
      x[j] = dv.getFloat32(r + 4, true);
      y[j] = dv.getFloat32(r + 8, true);
      z[j] = dv.getFloat32(r + 12, true);
      yaw[j] = dv.getFloat32(r + 16, true);
      flags[j] = u8[r + 20];
      if (flags[j] & ~0x07) return fail('bad-flags');
    }
    p += payloadLen;
    got = { ids, x, y, z, yaw, flags };
  }
  if (p !== end) return fail('trailing-bytes');
  if (!got) {
    return { ok: true, frameType: h.frameType, meta: h.meta, ids: new Uint32Array(0), n: 0, x: new Float32Array(0), y: new Float32Array(0), z: new Float32Array(0), yaw: new Float32Array(0), flags: new Uint8Array(0) };
  }
  return { ok: true, frameType: h.frameType, meta: h.meta, ...got };
}
