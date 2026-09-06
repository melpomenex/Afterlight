// Density-selected section encoding, from measured evidence.
//
// Frame-level measurements (benchmarks/realtime/results/):
//   core.*  (273 cells, byte models): sorted = 48+25k, roaring = 80+21k,
//           dense = 48+17n, legacy JSON = 48+108k.
//   varint.* (v1 study): DELTA_VARINT frames are 0.762x sorted's bytes at
//           every measured scale (k = 20..5000), ~10% smaller than roaring
//           frames (roaring/varint = 1.10-1.16), with decode-time parity
//           (ratio 0.89-1.13, microseconds absolute). At frame level the
//           varint mask (~1.3-2.5 B/id) beats both sorted (4 B/id) and
//           roaring (~3-4 B/id effective) in the uniform-id regimes the
//           fixtures model.
//
// Policy (writer-side; readers accept any valid encoding per section):
//   fullness >= 0.85  -> FULL_SNAPSHOT, DENSE sections   (byte break-even 0.81; dense decode 3-120x faster)
//   k < 8             -> DELTA, SORTED_IDS               (cross-over sorted/varint bytes measured at the mask level; tiny-k decode is a straight u32 walk)
//   else              -> DELTA, DELTA_VARINT             (bytes winner everywhere measured)
// ROARING stays reader-supported (CRoaring-portable interop; clustered/skewed
// id distributions are its unsampled win regime) but the writer no longer
// selects it: DELTA_VARINT measured smaller at every fixture point.

export const DENSE_FULLNESS = 0.85;
export const SORTED_TO_VARINT_K = 8;

export function chooseFrameShape(liveCount, changedCount) {
  const fullness = liveCount === 0 ? 0 : changedCount / liveCount;
  if (fullness >= DENSE_FULLNESS) {
    return { frameType: 'FULL_SNAPSHOT', transformEncoding: 'DENSE', flagsEncoding: 'DENSE' };
  }
  if (changedCount < SORTED_TO_VARINT_K) {
    return { frameType: 'DELTA', transformEncoding: 'SORTED_IDS', flagsEncoding: 'SORTED_IDS' };
  }
  return { frameType: 'DELTA', transformEncoding: 'DELTA_VARINT', flagsEncoding: 'DELTA_VARINT' };
}
