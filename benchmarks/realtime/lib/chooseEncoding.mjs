// Hybrid H — density-aware encoding selector (the deliverable of this bench).
//
// Picks, per frame, between:
//   C soa-dense    FULL_SNAPSHOT, DENSE sections (17 B/entity, no mask)
//   D soa-sorted   DELTA, SORTED_IDS sections (25 B/changed entity)
//   E soa-roaring  DELTA, ROARING portable masks (17 B/entity + 2× mask)
//
// THRESHOLDS (measured on this grid, Node 22.22.1, linux 7.0.0-30-generic;
// bytes are deterministic per (N, k) — see results/core.json. The fixture id
// space (§2, gap-y u32) gives exact linear byte models:
//   sorted  = 48 + 25k          (mask paid twice, once per section)
//   roaring = 80 + 21k          (portable mask ≈ 16 + 2k per section, k ≤ ~4k)
//   dense   = 48 + 17n          (no mask, but every slot shipped)
//   json    = 48 + ~108k        (current wire shape, for reference)
//
// Measured crossovers:
//   sorted vs roaring: equal at k = 8 (48+25k = 80+21k). Grid data: k=5 →
//     sorted 173 B < roaring 185 B; k=10 → sorted 298 B > roaring 290 B.
//   delta vs snapshot: dense wins when 17n + 48 < 21k + 80 → fullness ≳ 0.81.
//     The grid brackets this: at f = 0.5 the delta is 37% smaller than dense
//     (N=200: roaring-delta 2180 vs 3448 B); at f = 1.0 dense is 5–24% smaller
//     than the best delta (N=50000: 850048 vs 899264 B) and decodes 3–6x
//     faster at N ≥ 5000 (N=50000 min: 0.18 ms vs 1.06 ms). T_FULL = 0.85
//     sits just above the 0.81 break-even for margin against multi-container
//     masks.
//
// Decision, given world size n and changed count k:
//   1. k === 0                       → bare DELTA header (all encoders agree)
//   2. fullness = k/n ≥ T_FULL       → C (snapshot: no mask, cheapest bytes
//                                      per entity and fastest decode)
//   3. k < T_SORTED                  → D (SORTED_IDS mask beats Roaring's
//                                      fixed header cost at tiny k)
//   4. otherwise                     → E (ROARING mask wins on sparse deltas)
//
// Frames remain fully self-describing: H.decode routes on frame_type (0 → C)
// and the first section's encoding byte (1 → D path, 2 → E path), so a client
// needs no side channel to decode a hybrid stream.

import * as dense from './encoders/soaDense.mjs';
import * as sorted from './encoders/soaSorted.mjs';
import * as roaring from './encoders/soaRoaring.mjs';

export const name = 'hybrid-h';

export const THRESHOLDS = {
  // byte break-even delta-vs-snapshot ≈ 0.81 (17n + 48 vs 21k + 80); grid
  // brackets it (delta wins at f=0.5, dense wins at f=1.0); 0.85 = margin.
  T_FULL: 0.85,
  // sorted 48+25k vs roaring 80+21k → equal at k = 8 (measured at k=5 and k=10)
  T_SORTED: 8,
};

export function choose(n, k) {
  if (k / n >= THRESHOLDS.T_FULL) return 'dense';
  if (k < THRESHOLDS.T_SORTED) return 'sorted';
  return 'roaring';
}

export function encode(world, changed, meta = {}) {
  const pick = choose(world.n, changed.length);
  const enc = pick === 'dense' ? dense : pick === 'sorted' ? sorted : roaring;
  return enc.encode(world, changed, meta);
}

// bytes only (selector overhead without building the frame) — used by the
// bench to report which path H would take at each grid point
export function choice(n, k) {
  return choose(n, k);
}

export function decode(frame, opts = {}) {
  try {
    const u8 = frame instanceof Uint8Array ? frame : new Uint8Array(0);
    if (u8.byteLength < 24) return { ok: false, error: 'truncated' };
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    if (dv.getUint32(0, true) !== 0x414c5254) return { ok: false, error: 'bad-magic' };
    const frameType = dv.getUint8(5);
    if (frameType === 0) return dense.decode(u8, opts); // FULL_SNAPSHOT → C
    const hs = dv.getUint8(7);
    if (hs < 24 || hs > u8.byteLength) return { ok: false, error: 'bad-header-size' };
    if (u8.byteLength === hs) return sorted.decode(u8, opts); // bare no-op delta
    const encoding = dv.getUint8(hs + 1); // first section's encoding byte
    if (encoding === 1) return sorted.decode(u8, opts);
    if (encoding === 2) return roaring.decode(u8, opts);
    return { ok: false, error: 'unknown-encoding' };
  } catch {
    return { ok: false, error: 'decode-crash' };
  }
}
