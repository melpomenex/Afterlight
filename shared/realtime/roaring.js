// Minimal, dependency-free Roaring bitmap portable serialization
// (CRoaring-compatible), for the ROARING section encoding.
//
// Layout was verified byte-level against roaring-wasm 1.1.0 (CRoaring):
//   cookie u32, little-endian:
//     12346 SERIAL_COOKIE_NO_RUNCONTAINER:
//       count u32, count × (u16 key, u16 card-1), count × u32 offsets
//       (when count > 0), then container data.
//     12347 SERIAL_COOKIE:
//       count = (cookie >>> 16) + 1, ceil(count/8) run-flag bytes,
//       count × (u16 key, u16 card-1), count × u32 offsets (count >= 4),
//       then container data.
//   Container data: run → nruns u16 + nruns × (u16 start, u16 len-1);
//     card ≤ 4096 → array (card × u16); card > 4096 → bitmap (8 KiB).
//
// The writer emits the 12346 variant (arrays/bitmaps only, no runs):
// smallest unambiguous output, and CRoaring reads it back identically.
// Interop is asserted in benchmarks/realtime (results/core.*, masks.*).

import { LIMITS } from './constants.js';

const COOKIE_NO_RUN = 12346;
const COOKIE_RUN = 12347;
const ARRAY_MAX = 4096; // card ≤ 4096 → array container, else bitmap (8 KiB)
const OFFSET_THRESHOLD = 4; // 12347: offsets only from count >= 4 (CRoaring quirk)

export function serializeRoaring(sortedIds) {
  const n = sortedIds.length >>> 0;
  if (n === 0) {
    // CRoaring serializes an empty bitmap as cookie + zero count.
    const out = new Uint8Array(8);
    new DataView(out.buffer).setUint32(0, COOKIE_NO_RUN, true);
    return out;
  }
  const keys = [];
  const startOfKey = [];
  for (let i = 0; i < n; i++) {
    const key = sortedIds[i] >>> 16;
    if (keys.length === 0 || keys[keys.length - 1] !== key) {
      keys.push(key);
      startOfKey.push(i);
    }
  }
  const size = keys.length;
  const containerBytes = new Array(size);
  let dataLen = 0;
  for (let k = 0; k < size; k++) {
    const end = k + 1 < size ? startOfKey[k + 1] : n;
    const card = end - startOfKey[k];
    containerBytes[k] = card <= ARRAY_MAX ? card * 2 : 8192;
    dataLen += containerBytes[k];
  }
  const total = 8 + 4 * size + 4 * size + dataLen; // cookie+count, keycards, offsets, data
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, COOKIE_NO_RUN, true);
  view.setUint32(4, size, true);
  let off = 8;
  for (let k = 0; k < size; k++) {
    view.setUint16(off, keys[k], true);
    const end = k + 1 < size ? startOfKey[k + 1] : n;
    view.setUint16(off + 2, end - startOfKey[k] - 1, true);
    off += 4;
  }
  let cursor = off + 4 * size;
  const firstData = cursor;
  for (let k = 0; k < size; k++) {
    view.setUint32(off + k * 4, cursor, true);
    cursor += containerBytes[k];
  }
  off = firstData;
  for (let k = 0; k < size; k++) {
    const start = startOfKey[k];
    const end = k + 1 < size ? startOfKey[k + 1] : n;
    const card = end - start;
    const lowStart = keys[k] << 16;
    if (card <= ARRAY_MAX) {
      for (let i = start; i < end; i++) {
        view.setUint16(off, sortedIds[i] - lowStart, true);
        off += 2;
      }
    } else {
      for (let i = start; i < end; i++) {
        const low = sortedIds[i] - lowStart;
        view.setUint32(off + (low >> 5) * 4, view.getUint32(off + (low >> 5) * 4, true) | (1 << (low & 31)), true);
      }
      off += 8192;
    }
  }
  return out;
}

export function deserializeRoaring(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 5) return { ok: false, reason: 'bad_roaring_header' };
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const cookie = view.getUint32(0, true);
  const low16 = cookie & 0xffff;
  let size;
  let off;
  let runFlags = null;
  let hasOffsets;
  if (low16 === COOKIE_NO_RUN) {
    if (cookie >>> 16 !== 0) return { ok: false, reason: 'bad_roaring_cookie' };
    if (bytes.length < 8) return { ok: false, reason: 'bad_roaring_header' };
    size = view.getUint32(4, true);
    off = 8;
    hasOffsets = size > 0;
  } else if (low16 === COOKIE_RUN) {
    size = (cookie >>> 16) + 1;
    const flagLen = (size + 7) >> 3;
    if (bytes.length < 4 + flagLen) return { ok: false, reason: 'bad_roaring_header' };
    runFlags = bytes.subarray(4, 4 + flagLen);
    off = 4 + flagLen;
    hasOffsets = size >= OFFSET_THRESHOLD;
  } else {
    return { ok: false, reason: 'bad_roaring_cookie' };
  }
  if (size > 65536) return { ok: false, reason: 'roaring_too_many_containers' };
  if (off + size * 4 > bytes.length) return { ok: false, reason: 'roaring_desc_overrun' };
  const descs = new Array(size);
  for (let k = 0; k < size; k++) {
    descs[k] = { key: view.getUint16(off, true), card: view.getUint16(off + 2, true) + 1 };
    off += 4;
  }
  let offsets = null;
  if (hasOffsets && size > 0) {
    if (off + size * 4 > bytes.length) return { ok: false, reason: 'roaring_offsets_overrun' };
    offsets = new Uint32Array(size);
    for (let k = 0; k < size; k++) offsets[k] = view.getUint32(off + k * 4, true);
    off += size * 4;
  }
  const ids = [];
  let overLimit = false;
  const push = (v) => {
    if (ids.length < LIMITS.MAX_SECTION_ROWS * 4) ids.push(v);
    else overLimit = true;
  };
  for (let k = 0; k < size; k++) {
    const { key, card } = descs[k];
    const base = key << 16;
    const isRun = !!(runFlags && runFlags[k >> 3] & (1 << (k & 7)));
    const len = isRun ? -1 : card <= ARRAY_MAX ? card * 2 : 8192;
    const dOff = offsets ? offsets[k] : off; // without offset table, containers are packed in order
    if (isRun) {
      if (dOff + 2 > bytes.length) return { ok: false, reason: 'roaring_run_overrun' };
      const nRuns = view.getUint16(dOff, true);
      if (dOff + 2 + nRuns * 4 > bytes.length) return { ok: false, reason: 'roaring_run_overrun' };
      for (let r = 0; r < nRuns; r++) {
        const start = view.getUint16(dOff + 2 + r * 4, true);
        const l = view.getUint16(dOff + 4 + r * 4, true) + 1;
        for (let v = start; v < start + l; v++) push(base + v);
      }
      if (!offsets) off = dOff + 2 + nRuns * 4;
    } else {
      if (dOff + len > bytes.length) return { ok: false, reason: 'roaring_container_overrun' };
      if (card <= ARRAY_MAX) {
        for (let i = 0; i < card; i++) push(base + view.getUint16(dOff + i * 2, true));
      } else {
        for (let w = 0; w < 1024; w++) {
          const word = view.getUint32(dOff + w * 4, true);
          if (word) for (let b = 0; b < 32; b++) if (word & (1 << b)) push(base + w * 32 + b);
        }
      }
      if (!offsets) off = dOff + len;
    }
  }
  if (overLimit) return { ok: false, reason: 'roaring_expansion_over_limit' };
  return { ok: true, ids: Uint32Array.from(ids) };
}
