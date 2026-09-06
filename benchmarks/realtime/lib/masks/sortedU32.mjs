// SORTED_IDS mask encoding — contract.md §3: `entity_count` ascending u32 ids,
// little-endian, 4 bytes per id. The zero-intelligence encoding; baseline for
// every other mask candidate in run-masks.mjs.
//
// `count` always comes from the section header (§3 entity_count), so decoders
// never trust the byte payload alone.

export const NAME = 'sorted';

// ids: ascending Uint32Array (or subarray of one). Returns a standalone
// Uint8Array of 4*count bytes.
export function encode(ids, count) {
  const out = new Uint8Array(count * 4);
  const view = new DataView(out.buffer);
  for (let i = 0; i < count; i++) view.setUint32(i * 4, ids[i], true);
  return out;
}

// Copy-out decode: bytes → fresh Uint32Array of ids. Bounds-checked; a
// truncated payload decodes only the whole ids present. When the payload is
// 4-byte aligned (its own ArrayBuffer, as on the wire after header parsing at
// even offsets) this is an aligned typed-array copy — effectively a memcpy.
export function decode(bytes, count) {
  const avail = bytes.length >> 2;
  const n = Math.min(count, avail);
  if ((bytes.byteOffset & 3) === 0 && bytes.buffer.byteLength >= bytes.byteOffset + n * 4) {
    return new Uint32Array(bytes.buffer, bytes.byteOffset, n).slice();
  }
  const out = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] =
      bytes[i * 4] |
      (bytes[i * 4 + 1] << 8) |
      (bytes[i * 4 + 2] << 16) |
      (bytes[i * 4 + 3] << 24);
  }
  return out;
}

// Full traversal without materializing the id array. `visit`, if given, is
// called per id; otherwise this returns a checksum (sum of all ids) so the
// benchmark measures pure traversal with no callback overhead. The loop body
// depends on every loaded byte, so V8 cannot elide the scan.
export function iterate(bytes, count, visit) {
  const n = Math.min(count, bytes.length >> 2);
  let sum = 0;
  if (visit) {
    for (let i = 0; i < n; i++) {
      const id =
        bytes[i * 4] |
        (bytes[i * 4 + 1] << 8) |
        (bytes[i * 4 + 2] << 16) |
        (bytes[i * 4 + 3] << 24);
      visit(id);
      sum += id;
    }
  } else {
    for (let i = 0; i < n; i++) {
      sum +=
        bytes[i * 4] |
        (bytes[i * 4 + 1] << 8) |
        (bytes[i * 4 + 2] << 16) |
        (bytes[i * 4 + 3] << 24);
    }
  }
  return sum;
}
