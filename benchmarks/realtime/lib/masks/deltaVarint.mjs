// DELTA+VARINT mask encoding: first id as LEB128-style varint (7 bits per
// byte, little-endian groups, high bit = continuation), then per subsequent id
// the *gap minus one* (ids are strictly ascending, so gap-1 >= 0 fits u32).
// Storing gap-1 lets a 4-byte varint reach the full u32 id space.
//
// Size is data-dependent: dense clusters shrink to ~1 byte/id, but a random
// sample over a wide id space costs ~1 byte per 7 bits of average gap.

export const NAME = 'deltaVarint';

const CONT = 0x80;

// Read one u32 varint at `pos`; returns [value, nextPos] or null on
// truncation/malformed. `2 **` keeps bit31 exact (|0 would corrupt it).
// A 5th byte with continuation set, or a 6th byte, is malformed → null.
// Malformed overflow (>2^32) wraps via >>>0 at the call sites; production
// decoders should range-check per contract §8 fuzzing rules.
function readVarintAt(bytes, pos, end) {
  let v = 0;
  let shift = 0;
  for (;;) {
    if (pos >= end) return null;
    const b = bytes[pos++];
    v += (b & 0x7f) * 2 ** shift;
    if ((b & CONT) === 0) return [v, pos];
    shift += 7;
    if (shift > 28) return null; // continuation on the 5th byte → malformed
  }
}

// ids: ascending Uint32Array; count ids encoded. Worst case 5 bytes per
// varint (1 + count varints); returns the exact-size tail view.
export function encode(ids, count) {
  const out = new Uint8Array(5 + count * 5);
  let pos = 0;
  let prev = 0;
  for (let i = 0; i < count; i++) {
    const id = ids[i];
    const word = i === 0 ? id : id - prev - 1;
    prev = id;
    let v = word;
    for (;;) {
      let b = v % 128;
      v = (v - b) / 128;
      if (v !== 0) b += CONT;
      out[pos++] = b;
      if (v === 0) break;
    }
  }
  return out.subarray(0, pos);
}

// Decode back to a fresh Uint32Array of ids. Truncated payloads return only
// the ids fully present (never throws).
export function decode(bytes, count) {
  const end = bytes.length;
  const out = new Uint32Array(count);
  let n = 0;
  let pos = 0;
  let r = readVarintAt(bytes, pos, end);
  if (r === null) return out.subarray(0, 0);
  let id = r[0] >>> 0;
  pos = r[1];
  out[n++] = id;
  while (n < count) {
    r = readVarintAt(bytes, pos, end);
    if (r === null) break;
    id = (id + r[0] + 1) >>> 0;
    pos = r[1];
    out[n++] = id;
  }
  return out.subarray(0, n);
}

// Full traversal (sum checksum, same contract as sortedU32.iterate).
// `visit`, if given, is called per id.
export function iterate(bytes, count, visit) {
  const end = bytes.length;
  let sum = 0;
  let pos = 0;
  let r = readVarintAt(bytes, pos, end);
  if (r === null) return 0;
  let id = r[0] >>> 0;
  pos = r[1];
  if (visit) visit(id);
  sum += id;
  let n = 1;
  while (n < count && pos < end) {
    r = readVarintAt(bytes, pos, end);
    if (r === null) break;
    id = (id + r[0] + 1) >>> 0;
    pos = r[1];
    if (visit) visit(id);
    sum += id;
    n++;
  }
  return sum;
}
