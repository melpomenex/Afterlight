// BITSET mask encoding — contract.md §3: ceil((world_max_id+1)/8) bytes,
// little-endian bit order, bit i = server id i. Size depends only on the
// id-space span, never on how many ids are set — so it wins bytes only at
// high density.
//
// Traversal cost is O(span/8) regardless of count: the scan visits every
// byte even when 1 id is set. (Early exit after `count` ids found helps the
// sparse case only when the set ids happen to be low-numbered.)

export const NAME = 'bitset';

export function bytesFor(maxId) {
  return ((maxId + 8) >> 3); // ceil((maxId+1)/8)
}

// ids: ascending Uint32Array; count ids set; bitset spans [0, maxId].
export function encode(ids, count, maxId) {
  const out = new Uint8Array(bytesFor(maxId));
  for (let i = 0; i < count; i++) {
    const id = ids[i];
    out[id >> 3] |= 1 << (id & 7);
  }
  return out;
}

// Scan all bytes, collect set-bit ids into a fresh Uint32Array. Two-pass:
// popcount to size, then fill. `count` is the expected entity_count (§3
// header); the scan trusts the payload and stops early once `count` ids are
// found.
export function decode(bytes, count) {
  // pass 1: popcount per byte
  let total = 0;
  for (let i = 0; i < bytes.length; i++) {
    let b = bytes[i];
    while (b) {
      b &= b - 1;
      total++;
    }
  }
  const out = new Uint32Array(Math.min(total, count));
  let n = 0;
  for (let i = 0; i < bytes.length && n < out.length; i++) {
    let b = bytes[i];
    while (b) {
      const low = b & -b;
      out[n++] = i * 8 + (31 - Math.clz32(low));
      b ^= low;
    }
  }
  return out;
}

// Full traversal (sum checksum, same contract as sortedU32.iterate).
// `visit`, if given, is called per id.
export function iterate(bytes, count, visit) {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < bytes.length; i++) {
    let b = bytes[i];
    while (b) {
      const low = b & -b;
      const id = i * 8 + (31 - Math.clz32(low));
      if (visit) visit(id);
      sum += id;
      if (++n >= count) return sum;
      b ^= low;
    }
  }
  return sum;
}
