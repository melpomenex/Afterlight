// afterlight-soa-v1 section encoders/decoders (contract §3).
// Payload layout per section: [mask/ids per encoding] then one contiguous
// column per field in SECTION_FIELDS order. DENSE omits the id list.

import {
  SECTION, SECTION_FIELDS, ENCODING, TYPE_SIZE, LIMITS,
} from './constants.js';
import { serializeRoaring, deserializeRoaring } from './roaring.js';

// ---- varint ids (DELTA_VARINT, v1) ----------------------------------------
// Delta + LEB128 over strictly ascending ids: first id absolute, then gaps.
// Max 5 bytes per id (u32). Wins frame bytes vs SORTED_IDS (~3 B/row) and vs
// ROARING in the mid regime (measured: results/varint.*) at the cost of a
// byte-wise decode — still microseconds at 10 Hz tick scale.

export function encodeVarintIds(sortedIds) {
  const out = new Uint8Array(sortedIds.length * 5);
  let o = 0;
  let prev = 0;
  for (let i = 0; i < sortedIds.length; i++) {
    let d = (sortedIds[i] - prev) >>> 0;
    prev = sortedIds[i];
    for (;;) {
      if (d < 0x80) {
        out[o++] = d;
        break;
      }
      out[o++] = (d & 0x7f) | 0x80;
      d >>>= 7;
    }
  }
  return out.subarray(0, o);
}

export function decodeVarintIds(bytes, count) {
  const ids = new Uint32Array(count);
  let p = 0;
  let prev = 0;
  for (let i = 0; i < count; i++) {
    let d = 0;
    let shift = 0;
    for (;;) {
      if (p >= bytes.length) return { ok: false, reason: 'varint_truncated' };
      const b = bytes[p++];
      d += (b & 0x7f) * 2 ** shift; // Number math: 5-byte u32 deltas exceed 31-bit shifts
      if ((b & 0x80) === 0) break;
      shift += 7;
      if (shift > 28) return { ok: false, reason: 'varint_overlong' };
    }
    prev = (prev + d) >>> 0;
    ids[i] = prev;
  }
  for (let i = 1; i < count; i++) {
    if (ids[i] <= ids[i - 1]) return { ok: false, reason: 'varint_unsorted' };
  }
  return { ok: true, ids, consumed: p };
}

// ---- writers ---------------------------------------------------------------

// columns: {name: TypedArray|number[]} aligned to ids (or to dense rows).
// ids: sorted Uint32Array (not needed for DENSE). maxId required for BITSET.
export function writeSection(sectionId, encoding, ids, columns, rowCount, maxId) {
  const fields = SECTION_FIELDS[sectionId];
  if (!fields) return { ok: false, reason: 'unknown_section' };
  const rows = rowCount >>> 0;
  const maskBytes = maskSize(encoding, ids, rows, maxId);
  if (maskBytes.ok === false) return maskBytes;
  const colBytes = fields.reduce((s, f) => s + TYPE_SIZE[f.type] * rows, 0);
  const out = new Uint8Array(12 + maskBytes.len + colBytes);
  const view = new DataView(out.buffer);
  view.setUint8(0, sectionId);
  view.setUint8(1, encoding);
  view.setUint16(2, 0, true);
  view.setUint32(4, rows, true);
  view.setUint32(8, maskBytes.len + colBytes, true);
  let off = 12;
  maskBytes.write(out, view, off);
  off += maskBytes.len;
  for (const f of fields) {
    const col = columns[f.name];
    if (!col || col.length < rows) return { ok: false, reason: 'column_missing_or_short:' + f.name };
    for (let i = 0; i < rows; i++) {
      if (f.type === 'f32') view.setFloat32(off, col[i], true);
      else if (f.type === 'u8') view.setUint8(off, col[i]);
      else if (f.type === 'u16') view.setUint16(off, col[i], true);
      off += TYPE_SIZE[f.type];
    }
  }
  return { ok: true, bytes: out };
}

function maskSize(encoding, ids, rows, maxId) {
  if (encoding === ENCODING.DENSE) {
    return { len: 0, write() {} };
  }
  if (encoding === ENCODING.SORTED_IDS) {
    if (!ids || ids.length < rows) return { ok: false, reason: 'ids_missing' };
    return {
      len: rows * 4,
      write(out, view, off) { for (let i = 0; i < rows; i++) view.setUint32(off + i * 4, ids[i], true); },
    };
  }
  if (encoding === ENCODING.ROARING) {
    const ser = serializeRoaring(ids);
    return {
      len: ser.length,
      write(out, view, off) { out.set(ser, off); },
    };
  }
  if (encoding === ENCODING.BITSET) {
    if (!Number.isFinite(maxId) || maxId < 0) return { ok: false, reason: 'bitset_needs_max_id' };
    const len = ((maxId + 8) >> 3);
    const buf = new Uint8Array(len);
    for (let i = 0; i < rows; i++) buf[ids[i] >> 3] |= 1 << (ids[i] & 7);
    return { len, write(out) { out.set(buf, 12); } };
  }
  if (encoding === ENCODING.DELTA_VARINT) {
    if (!ids || ids.length < rows) return { ok: false, reason: 'ids_missing' };
    const ser = encodeVarintIds(ids);
    return {
      len: ser.length,
      write(out) { out.set(ser, 12); },
    };
  }
  return { ok: false, reason: 'unsupported_write_encoding' };
}

// Lifecycle spawn rows: {id, archetype, variant, stringRef, x, y, z, yaw}.
export function writeSpawnSection(rows) {
  const n = rows.length >>> 0;
  const out = new Uint8Array(12 + n * 28);
  const view = new DataView(out.buffer);
  view.setUint8(0, SECTION.SPAWN);
  view.setUint8(1, ENCODING.DENSE);
  view.setUint32(4, n, true);
  view.setUint32(8, n * 28, true);
  let off = 12;
  for (const r of rows) {
    view.setUint32(off, r.id >>> 0, true);
    view.setUint16(off + 4, r.archetype & 0xffff, true);
    view.setUint16(off + 6, r.variant & 0xffff, true);
    view.setUint32(off + 8, r.stringRef >>> 0, true);
    view.setFloat32(off + 12, r.x, true);
    view.setFloat32(off + 16, r.y, true);
    view.setFloat32(off + 20, r.z, true);
    view.setFloat32(off + 24, r.yaw, true);
    off += 28;
  }
  return { ok: true, bytes: out };
}

// strings: string[] → STRING_TABLE section. Returns section + index map.
export function writeStringTable(strings) {
  const enc = new TextEncoder();
  const encoded = strings.map((s) => {
    const b = enc.encode(s);
    if (b.length > LIMITS.MAX_STRING_BYTES) throw new Error('string_over_limit');
    return b;
  });
  const body = 4 + encoded.reduce((s, b) => s + 2 + b.length, 0);
  const out = new Uint8Array(12 + body);
  const view = new DataView(out.buffer);
  view.setUint8(0, SECTION.STRING_TABLE);
  view.setUint8(1, ENCODING.DENSE);
  view.setUint32(4, encoded.length, true);
  view.setUint32(8, body, true);
  let off = 12;
  view.setUint32(off, encoded.length, true);
  off += 4;
  const refs = [];
  encoded.forEach((b, i) => {
    view.setUint16(off, b.length, true);
    out.set(b, off + 2);
    refs.push(i);
    off += 2 + b.length;
  });
  return { ok: true, bytes: out, refs };
}

// ---- readers ---------------------------------------------------------------

// Reads payload of one section (after readHeader/readSections validated it).
export function readSectionColumns(bytes, sec) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let off = sec.payloadOffset;
  const end = sec.payloadOffset + sec.payloadLen;
  // Columns always follow the mask; payload_len is deterministic, so the
  // mask length is derivable and every cursor advance is bounds-checkable.
  const fields = SECTION_FIELDS[sec.id];
  if (!fields) return { ok: false, reason: 'unknown_section' };
  const colBytes = fields.reduce((s, f) => s + TYPE_SIZE[f.type] * sec.count, 0);
  const maskLen = sec.payloadLen - colBytes;
  if (maskLen < 0) return { ok: false, reason: 'payload_shorter_than_columns' };
  let ids = null;
  if (sec.encoding === ENCODING.DENSE) {
    if (maskLen !== 0) return { ok: false, reason: 'dense_with_mask' };
  } else if (sec.encoding === ENCODING.SORTED_IDS) {
    if (maskLen !== sec.count * 4) return { ok: false, reason: 'ids_len_mismatch' };
    ids = new Uint32Array(sec.count);
    for (let i = 0; i < sec.count; i++) ids[i] = view.getUint32(off + i * 4, true);
    off += maskLen;
  } else if (sec.encoding === ENCODING.ROARING) {
    const r = deserializeRoaring(bytes.subarray(off, off + maskLen));
    if (!r.ok) return r;
    if (r.ids.length !== sec.count) return { ok: false, reason: 'roaring_count_mismatch' };
    ids = r.ids;
    off += maskLen;
  } else if (sec.encoding === ENCODING.DELTA_VARINT) {
    const r = decodeVarintIds(bytes.subarray(off, off + maskLen), sec.count);
    if (!r.ok) return r;
    ids = r.ids;
    off += maskLen;
  } else if (sec.encoding === ENCODING.BITSET) {
    ids = [];
    for (let b = off; b < off + maskLen; b++) {
      const byte = bytes[b];
      if (!byte) continue;
      for (let bit = 0; bit < 8; bit++) if (byte & (1 << bit)) ids.push(((b - off) << 3) | bit);
    }
    ids = Uint32Array.from(ids);
    off += maskLen;
  } else {
    return { ok: false, reason: 'unsupported_read_encoding' };
  }
  const columns = {};
  for (const f of fields) {
    const size = TYPE_SIZE[f.type];
    if (off + size * sec.count > end) return { ok: false, reason: 'column_overrun:' + f.name };
    const col = makeTyped(f.type, sec.count);
    for (let i = 0; i < sec.count; i++) {
      if (f.type === 'f32') col[i] = view.getFloat32(off + i * size, true);
      else if (f.type === 'u8') col[i] = view.getUint8(off + i * size);
      else if (f.type === 'u16') col[i] = view.getUint16(off + i * size, true);
    }
    columns[f.name] = col;
    off += size * sec.count;
  }
  if (off !== end) return { ok: false, reason: 'section_payload_trailing' };
  return { ok: true, ids, columns };
}

function makeTyped(type, n) {
  if (type === 'f32') return new Float32Array(n);
  if (type === 'u8') return new Uint8Array(n);
  if (type === 'u16') return new Uint16Array(n);
  return new Uint32Array(n);
}

export function readSpawnSection(bytes, sec) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const rows = [];
  let off = sec.payloadOffset;
  const end = sec.payloadOffset + sec.payloadLen;
  for (let i = 0; i < sec.count; i++) {
    if (off + 28 > end) return { ok: false, reason: 'spawn_overrun' };
    rows.push({
      id: view.getUint32(off, true),
      archetype: view.getUint16(off + 4, true),
      variant: view.getUint16(off + 6, true),
      stringRef: view.getUint32(off + 8, true),
      x: view.getFloat32(off + 12, true),
      y: view.getFloat32(off + 16, true),
      z: view.getFloat32(off + 20, true),
      yaw: view.getFloat32(off + 24, true),
    });
    off += 28;
  }
  if (off !== end) return { ok: false, reason: 'spawn_trailing' };
  return { ok: true, rows };
}

export function readStringTable(bytes, sec) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let off = sec.payloadOffset;
  const end = sec.payloadOffset + sec.payloadLen;
  if (off + 4 > end) return { ok: false, reason: 'string_table_overrun' };
  const count = view.getUint32(off, true);
  if (count > LIMITS.MAX_SECTION_ROWS) return { ok: false, reason: 'string_table_count' };
  off += 4;
  const dec = new TextDecoder();
  const strings = [];
  for (let i = 0; i < count; i++) {
    if (off + 2 > end) return { ok: false, reason: 'string_table_overrun' };
    const len = view.getUint16(off, true);
    off += 2;
    if (off + len > end) return { ok: false, reason: 'string_table_overrun' };
    strings.push(dec.decode(bytes.subarray(off, off + len)));
    off += len;
  }
  if (off !== end) return { ok: false, reason: 'string_table_trailing' };
  return { ok: true, strings };
}
