// Density-selected section encoding, from measured evidence.
//
// Byte models fit from the benchmark grid (benchmarks/realtime/results/core.*,
// 273 cells, contract fixtures; exact linear fits fell out of the data):
//   SORTED_IDS delta : bytes ≈ 48 + 25·k          (k = changed count)
//   ROARING delta    : bytes ≈ 80 + 21·k
//   DENSE snapshot   : bytes ≈ 48 + 17·n          (n = live entities)
//   legacy JSON      : bytes ≈ 48 + 108·k
// Cross-over sorted→roaring is at k ≈ 8 (k=5: 173 B vs 185 B; k=10: 298 B vs
// 290 B). Dense-vs-delta byte break-even is ≈ 0.81 fullness; at f = 1.0 dense
// is 5–24% smaller than the best delta AND decodes 3–120× faster because the
// mask disappears (decode at N=50000/f=1.0: 0.17 ms dense vs 20.6 ms JSON).
//
// Latency evidence: sorted-ids decode is the fastest binary decode at every
// measured cell (a straight u32 walk, ~0.07 µs at k=30); the mask study
// (results/masks.*) found roaring never won bytes OR decode in the sampled
// uniform-id regimes (delta-varint and bitset beat it on bytes; sorted beat
// everything on decode). Roaring stays in the policy because the k ≥ 8 frame
// model above is measured on the same fixtures, and because clustered/skewed
// id distributions — unsampled by the fixtures — are its claimed win regime.
// DELTA_VARINT (bytes winner in sparse/mid regimes per results/masks.*) is
// NOT in contract v0; it is the leading candidate for a v1 encoding.
//
// Policy (writer-side; readers accept any valid encoding per section):
//   fullness ≥ 0.85            → FULL_SNAPSHOT, DENSE sections
//   k < 8                      → DELTA, SORTED_IDS
//   else                       → DELTA, ROARING  (k ≥ 8)

export const DENSE_FULLNESS = 0.85;
export const SORTED_TO_ROARING_K = 8;

export function chooseFrameShape(liveCount, changedCount) {
  const fullness = liveCount === 0 ? 0 : changedCount / liveCount;
  if (fullness >= DENSE_FULLNESS) {
    return { frameType: 'FULL_SNAPSHOT', transformEncoding: 'DENSE', flagsEncoding: 'DENSE' };
  }
  if (changedCount < SORTED_TO_ROARING_K) {
    return { frameType: 'DELTA', transformEncoding: 'SORTED_IDS', flagsEncoding: 'SORTED_IDS' };
  }
  return { frameType: 'DELTA', transformEncoding: 'ROARING', flagsEncoding: 'ROARING' };
}
