# Arrow IPC encodings (F snapshot, G delta+Roaring) vs JSON baseline

Generated 2026-09-06T20:59:02.747Z on Node v22.22.1 (24 cpus, gc exposed: true). apache-arrow 21.2.0, roaring-wasm 1.1.0. Times are "median/min" ms over 20 runs; machine shared with concurrent agents — compare MINs. Bytes are payload-only (no ALRT/section framing).

## Fixed IPC overhead (FlatBuffers metadata, measured with 0-row batches)

| schema | schema msg | batch msg | EOS | fixed total per stream |
|---|---|---|---|---|
| snapshot, 6 cols (u32+4xf32+u8) | 392 | 360 | 8 | 760 |
| delta, 5 cols (4xf32+u8) | 336 | 312 | 8 | 656 |

Every Arrow IPC frame pays ~656 B of self-description before the first value byte (fresh writer per frame is the realistic per-tick usage: the JS lib has no public schema-cached "batch-only" emission). Value bytes: ~21 B/row snapshot, ~17 B/row delta (8-byte-aligned columns, non-nullable → no validity bitmaps).

## Snapshot (encoding F: full entity table vs JSON full snapshot)

| N | Arrow F bytes | F meta | F value | JSON bytes | JSON/F size | F enc med/min | JSON enc med/min | F dec med/min | JSON dec med/min | F enc heap | F dec heap | JSON dec heap |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 50 | 1816 | 760 | 1056 | 5418 | 3.0x | 0.387/0.257 | 0.056/0.037 | 0.195/0.140 | 0.038/0.035 | -12.1k | -1.4k | 0.3k |
| 100 | 2864 | 760 | 2104 | 11k | 3.8x | 0.357/0.197 | 0.055/0.046 | 0.151/0.109 | 0.065/0.043 | -51.4k | -15.2k | -0.0k |
| 200 | 4960 | 760 | 4200 | 21k | 4.3x | 0.206/0.139 | 0.115/0.093 | 0.147/0.105 | 0.128/0.079 | -74.8k | -8.2k | -0.0k |
| 500 | 11264 | 760 | 10504 | 52k | 4.8x | 0.295/0.159 | 0.409/0.382 | 0.167/0.116 | 0.386/0.238 | 25.5k | -27.3k | -0.0k |
| 1000 | 21760 | 760 | 21000 | 105k | 4.9x | 0.221/0.140 | 0.808/0.527 | 0.115/0.085 | 0.559/0.396 | 10.5k | -47.9k | -0.0k |
| 5000 | 105760 | 760 | 105000 | 524k | 5.1x | 0.459/0.316 | 3.795/3.019 | 0.169/0.132 | 2.985/2.399 | -28.6k | -1.0k | 0.0k |
| 10000 | 210760 | 760 | 210000 | 1049k | 5.1x | 0.479/0.311 | 9.026/7.596 | 0.208/0.128 | 8.199/4.245 | -44.5k | -11.5k | 0.0k |
| 50000 | 1050760 | 760 | 1050000 | 5243k | 5.1x | 1.121/0.734 | 55.822/41.492 | 0.226/0.133 | 26.000/22.519 | -50.7k | -11.5k | -0.0k |

## Deltas (encoding G: compact Arrow columns + Roaring mask vs JSON presence_update)

| N | f | k | JSON B | G B (ipc+mask) | G meta | G mask | G/JSON | G enc med/min | JSON enc med/min | G dec med/min | JSON dec med/min | G enc heap | G dec heap | JSON dec heap |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 50 | 0.001 | 1 | 144 | 722 (704+18) | 664 | 18 | 5.01 | 0.301/0.213 | 0.004/0.004 | 0.222/0.176 | 0.001/0.001 | -18.7k | -3.5k | 0.9k |
| 50 | 0.01 | 1 | 144 | 722 (704+18) | 664 | 18 | 5.01 | 0.290/0.217 | 0.005/0.004 | 0.190/0.135 | 0.001/0.001 | -23.2k | -6.2k | 0.0k |
| 50 | 0.05 | 3 | 359 | 758 (736+22) | 664 | 22 | 2.11 | 0.397/0.232 | 0.010/0.009 | 0.237/0.198 | 0.005/0.004 | 25.9k | -12.3k | 0.0k |
| 50 | 0.1 | 5 | 573 | 794 (768+26) | 664 | 26 | 1.39 | 0.320/0.203 | 0.010/0.006 | 0.160/0.127 | 0.003/0.003 | -2.3k | -1.5k | 0.0k |
| 50 | 0.25 | 13 | 1433 | 946 (904+42) | 664 | 42 | 0.66 | 0.396/0.282 | 0.019/0.016 | 0.238/0.143 | 0.006/0.006 | 14.8k | -12.5k | 0.0k |
| 50 | 0.5 | 25 | 2728 | 1178 (1112+66) | 664 | 66 | 0.43 | 0.313/0.244 | 0.026/0.019 | 0.202/0.146 | 0.021/0.018 | -30.4k | -12.3k | 0.0k |
| 50 | 1 | 50 | 5408 | 1636 (1520+116) | 664 | 116 | 0.30 | 0.301/0.214 | 0.025/0.023 | 0.209/0.144 | 0.020/0.020 | -38.3k | -0.3k | 0.0k |
| 100 | 0.001 | 1 | 143 | 722 (704+18) | 664 | 18 | 5.05 | 0.325/0.246 | 0.004/0.003 | 0.189/0.123 | 0.001/0.001 | -12.9k | -1.0k | 0.0k |
| 100 | 0.01 | 1 | 144 | 722 (704+18) | 664 | 18 | 5.01 | 0.346/0.169 | 0.005/0.005 | 0.198/0.168 | 0.002/0.002 | -40.5k | -6.1k | 0.1k |
| 100 | 0.05 | 5 | 576 | 794 (768+26) | 664 | 26 | 1.38 | 0.274/0.179 | 0.007/0.005 | 0.118/0.103 | 0.005/0.004 | 3.4k | -12.3k | 0.0k |
| 100 | 0.1 | 10 | 1113 | 876 (840+36) | 664 | 36 | 0.79 | 0.291/0.160 | 0.011/0.010 | 0.180/0.138 | 0.009/0.007 | 13.1k | 0.6k | -9.1k |
| 100 | 0.25 | 25 | 2721 | 1178 (1112+66) | 664 | 66 | 0.43 | 0.338/0.213 | 0.022/0.014 | 0.187/0.125 | 0.011/0.010 | -39.2k | -6.8k | 0.1k |
| 100 | 0.5 | 50 | 5384 | 1636 (1520+116) | 664 | 116 | 0.30 | 0.293/0.200 | 0.036/0.024 | 0.159/0.115 | 0.020/0.020 | 8.3k | -8.9k | 0.0k |
| 100 | 1 | 100 | 10766 | 2584 (2368+216) | 664 | 216 | 0.24 | 0.292/0.187 | 0.078/0.074 | 0.153/0.098 | 0.048/0.041 | 3.1k | 0.0k | 0.0k |
| 200 | 0.001 | 1 | 145 | 722 (704+18) | 664 | 18 | 4.98 | 0.284/0.206 | 0.006/0.005 | 0.195/0.139 | 0.001/0.001 | 10.9k | -1.1k | 0.0k |
| 200 | 0.01 | 2 | 252 | 724 (704+20) | 664 | 20 | 2.87 | 0.288/0.164 | 0.007/0.006 | 0.182/0.140 | 0.001/0.001 | 3.2k | -13.2k | 0.0k |
| 200 | 0.05 | 10 | 1111 | 876 (840+36) | 664 | 36 | 0.79 | 0.210/0.155 | 0.023/0.019 | 0.125/0.096 | 0.014/0.008 | -17.9k | -12.2k | 0.0k |
| 200 | 0.1 | 20 | 2180 | 1064 (1008+56) | 664 | 56 | 0.49 | 0.298/0.156 | 0.026/0.024 | 0.164/0.107 | 0.018/0.016 | -44.9k | 0.0k | 0.0k |
| 200 | 0.25 | 50 | 5407 | 1636 (1520+116) | 664 | 116 | 0.30 | 0.308/0.190 | 0.037/0.026 | 0.153/0.118 | 0.020/0.020 | 16.2k | 0.0k | -21.1k |
| 200 | 0.5 | 100 | 10768 | 2584 (2368+216) | 664 | 216 | 0.24 | 0.265/0.169 | 0.072/0.069 | 0.164/0.112 | 0.061/0.060 | 55.8k | -6.4k | 0.0k |
| 200 | 1 | 200 | 21511 | 4480 (4064+416) | 664 | 416 | 0.21 | 0.356/0.199 | 0.135/0.092 | 0.161/0.116 | 0.111/0.079 | -10.8k | 10.5k | -0.0k |
| 500 | 0.001 | 1 | 146 | 722 (704+18) | 664 | 18 | 4.95 | 0.308/0.195 | 0.024/0.015 | 0.147/0.102 | 0.001/0.001 | -5.4k | 10.6k | 0.0k |
| 500 | 0.01 | 5 | 571 | 794 (768+26) | 664 | 26 | 1.39 | 0.289/0.167 | 0.019/0.014 | 0.151/0.112 | 0.004/0.004 | 2.9k | -6.0k | 0.0k |
| 500 | 0.05 | 25 | 2720 | 1178 (1112+66) | 664 | 66 | 0.43 | 0.311/0.188 | 0.035/0.033 | 0.197/0.131 | 0.019/0.016 | 6.0k | 0.0k | 0.0k |
| 500 | 0.1 | 50 | 5394 | 1636 (1520+116) | 664 | 116 | 0.30 | 0.426/0.210 | 0.034/0.032 | 0.143/0.114 | 0.020/0.020 | -21.0k | -35.0k | 0.0k |
| 500 | 0.25 | 125 | 13439 | 3074 (2808+266) | 664 | 266 | 0.23 | 0.351/0.244 | 0.079/0.072 | 0.209/0.167 | 0.051/0.049 | -71.3k | -6.2k | 0.0k |
| 500 | 0.5 | 250 | 26867 | 5436 (4920+516) | 664 | 516 | 0.20 | 0.322/0.242 | 0.167/0.129 | 0.214/0.135 | 0.116/0.099 | -38.2k | -5.0k | 0.0k |
| 500 | 1 | 500 | 53698 | 10184 (9168+1016) | 664 | 1016 | 0.19 | 0.247/0.178 | 0.328/0.242 | 0.158/0.116 | 0.376/0.212 | 17.0k | -3.9k | 0.0k |
| 1000 | 0.001 | 1 | 146 | 722 (704+18) | 664 | 18 | 4.95 | 0.288/0.175 | 0.034/0.029 | 0.161/0.125 | 0.001/0.001 | 0.6k | 2.5k | 0.0k |
| 1000 | 0.01 | 10 | 1108 | 876 (840+36) | 664 | 36 | 0.79 | 0.295/0.159 | 0.031/0.029 | 0.170/0.110 | 0.004/0.004 | -18.5k | 3.3k | 0.0k |
| 1000 | 0.05 | 50 | 5405 | 1636 (1520+116) | 664 | 116 | 0.30 | 0.356/0.253 | 0.065/0.047 | 0.144/0.118 | 0.020/0.020 | -50.9k | -6.2k | -0.3k |
| 1000 | 0.1 | 100 | 10762 | 2584 (2368+216) | 664 | 216 | 0.24 | 0.254/0.169 | 0.091/0.070 | 0.221/0.186 | 0.069/0.040 | 10.4k | 28.6k | -0.0k |
| 1000 | 0.25 | 250 | 26916 | 5436 (4920+516) | 664 | 516 | 0.20 | 0.339/0.248 | 0.173/0.136 | 0.163/0.107 | 0.110/0.099 | 16.5k | -15.6k | 0.0k |
| 1000 | 0.5 | 500 | 53712 | 10184 (9168+1016) | 664 | 1016 | 0.19 | 0.356/0.296 | 0.429/0.355 | 0.246/0.132 | 0.384/0.262 | 0.7k | -4.9k | -0.0k |
| 1000 | 1 | 1000 | 107385 | 19680 (17664+2016) | 664 | 2016 | 0.18 | 0.296/0.210 | 0.700/0.505 | 0.185/0.149 | 0.630/0.401 | -14.8k | -16.2k | -0.3k |
| 5000 | 0.001 | 5 | 576 | 794 (768+26) | 664 | 26 | 1.38 | 0.296/0.199 | 0.401/0.314 | 0.142/0.116 | 0.002/0.002 | 3.7k | -3.4k | 0.0k |
| 5000 | 0.01 | 50 | 5406 | 1636 (1520+116) | 664 | 116 | 0.30 | 0.255/0.183 | 0.488/0.377 | 0.164/0.125 | 0.020/0.020 | -0.5k | -3.0k | 0.0k |
| 5000 | 0.05 | 250 | 26832 | 5436 (4920+516) | 664 | 516 | 0.20 | 0.283/0.216 | 0.511/0.407 | 0.170/0.132 | 0.160/0.099 | 1.5k | -12.8k | 0.0k |
| 5000 | 0.1 | 500 | 53694 | 10184 (9168+1016) | 664 | 1016 | 0.19 | 0.294/0.214 | 0.762/0.594 | 0.159/0.108 | 0.264/0.200 | 34.1k | 14.2k | 0.0k |
| 5000 | 0.25 | 1250 | 134197 | 24436 (21920+2516) | 664 | 2516 | 0.18 | 0.371/0.276 | 1.281/1.051 | 0.212/0.133 | 0.651/0.501 | -29.1k | -16.2k | 0.0k |
| 5000 | 0.5 | 2500 | 268369 | 48184 (43168+5016) | 664 | 5016 | 0.18 | 0.472/0.360 | 2.293/1.886 | 0.219/0.158 | 1.421/1.106 | -45.3k | -3.3k | 0.0k |
| 5000 | 1 | 5000 | 536647 | 93872 (85664+8208) | 664 | 8208 | 0.17 | 0.482/0.319 | 3.982/3.326 | 0.196/0.142 | 2.345/2.042 | -30.9k | -16.2k | 0.0k |
| 10000 | 0.001 | 10 | 1112 | 876 (840+36) | 664 | 36 | 0.79 | 0.250/0.146 | 0.993/0.849 | 0.195/0.147 | 0.007/0.007 | 16.6k | -0.3k | -0.0k |
| 10000 | 0.01 | 100 | 10757 | 2584 (2368+216) | 664 | 216 | 0.24 | 0.290/0.149 | 0.896/0.741 | 0.146/0.111 | 0.044/0.040 | 16.6k | -14.3k | 0.1k |
| 10000 | 0.05 | 500 | 53711 | 10184 (9168+1016) | 664 | 1016 | 0.19 | 0.288/0.182 | 1.376/1.002 | 0.171/0.120 | 0.317/0.198 | -7.3k | -7.2k | 0.0k |
| 10000 | 0.1 | 1000 | 107389 | 19680 (17664+2016) | 664 | 2016 | 0.18 | 0.274/0.201 | 1.410/1.231 | 0.230/0.125 | 0.617/0.415 | 13.4k | -24.4k | 0.0k |
| 10000 | 0.25 | 2500 | 268386 | 48184 (43168+5016) | 664 | 5016 | 0.18 | 0.399/0.249 | 2.796/2.075 | 0.217/0.149 | 1.117/1.020 | -38.0k | -12.1k | -0.0k |
| 10000 | 0.5 | 5000 | 536699 | 93872 (85664+8208) | 664 | 8208 | 0.17 | 0.600/0.407 | 4.946/3.659 | 0.244/0.149 | 3.548/2.098 | -59.6k | -15.1k | 0.0k |
| 10000 | 1 | 10000 | 1073345 | 178872 (170664+8208) | 664 | 8208 | 0.17 | 0.942/0.724 | 10.451/7.983 | 0.313/0.227 | 7.509/5.045 | -33.4k | -17.2k | 0.0k |
| 50000 | 0.001 | 50 | 5407 | 1652 (1520+132) | 664 | 132 | 0.31 | 0.232/0.192 | 5.470/3.528 | 0.133/0.095 | 0.020/0.020 | 2.8k | -13.5k | 0.0k |
| 50000 | 0.01 | 500 | 53738 | 10200 (9168+1032) | 664 | 1032 | 0.19 | 0.261/0.201 | 4.776/4.091 | 0.134/0.097 | 0.378/0.198 | 13.2k | -16.9k | 0.0k |
| 50000 | 0.1 | 5000 | 536777 | 95696 (85664+10032) | 664 | 10032 | 0.18 | 0.578/0.384 | 9.584/7.862 | 0.175/0.122 | 2.151/2.020 | -83.5k | -13.4k | 0.0k |
| 50000 | 1 | 50000 | 5367565 | 875272 (850664+24608) | 664 | 24608 | 0.16 | 5.700/3.033 | 56.506/43.980 | 1.712/1.224 | 36.468/29.816 | -44.1k | -13.4k | -0.0k |

## Representative points

| point | JSON B | G B (ipc+mask) | G/JSON | G enc med/min | JSON enc med/min | G dec med/min | JSON dec med/min |
|---|---|---|---|---|---|---|---|
| N=200 f=0.05 (k=10) | 1111 | 876 (840+36) | 0.79 | 0.210/0.155 | 0.023/0.019 | 0.125/0.096 | 0.014/0.008 |
| N=5000 f=0.01 (k=50) | 5406 | 1636 (1520+116) | 0.30 | 0.255/0.183 | 0.488/0.377 | 0.164/0.125 | 0.020/0.020 |
| N=50000 f=0.1 (k=5000) | 536777 | 95696 (85664+10032) | 0.18 | 0.578/0.384 | 9.584/7.862 | 0.175/0.122 | 2.151/2.020 |

## Findings

1. Metadata dominates frequent small deltas. A G frame costs 656 B fixed (schema FlatBuffers 336 B + record-batch FlatBuffers 312 B + EOS 8 B) + ~17 B/changed-row + Roaring mask. Smallest grid point (k=1): 722 B vs 144 B JSON = 5.0x larger. Arrow G first reaches parity at k=10 (ratio 0.787); it wins at 40/53 grid points, all with k≥10.
2. Snapshots/bulk are where Arrow wins: F is 3.0x–5.1x smaller than the JSON snapshot at every N (N=50000: 1050760 B vs 5368754 B = 5.1x). Fixed 21 B/row beats quoted floats + repeated keys + string ids.
3. Latency: all four paths are sub-millisecond at delta sizes (mins in the tens of microseconds). But the per-frame constant is real: even at k=1 G encode costs ~0.21 ms vs JSON ~0.004 ms (writer machinery + FlatBuffers build dominate tiny payloads), while at large k G flattens to O(bytes) and beats JSON by >10x (N=50000 k=5000: encode 0.38 vs 7.86 ms, decode 0.12 vs 2.02 ms min). Arrow decode itself is O(columns) not O(rows). None of this threatens a 100 ms tick budget — the decision is SIZE, not speed.
4. Copy behavior (verified in node_modules/apache-arrow source, full citations in lib/encoders/arrow.mjs header): tableToIPC COPIES buffers into the output stream; tableFromIPC is ZERO-COPY over the input bytes (VectorLoader.readData = bytes.subarray; single-buffer reads return views; Vector.toArray() on a single-chunk primitive column is an O(1) subarray). Decode is O(columns), not O(rows), but the decoded Table retains the whole input ArrayBuffer and must not outlive or mutate it.
5. Schema evolution (actual v21 behavior + probe): every IPC stream is self-describing; the reader adopts the stream's schema, so adding a trailing field (probe result: true) is transparent and getChild(name) returns null — no throw, no backfill — for columns an older stream lacks (probe: true). There is no schema registry, no compat check, and no Schema.compareTo in v21; versioning and by-name null-guards are the app's job, and renames/type changes silently reinterpret.
6. Robustness/ops: truncated or malformed IPC throws out of tableFromIPC (readMessageBody/readMetadata), so the contract §3 "bad frame never throws into game code" rule needs a try/catch wrapper, same as JSON.parse. RoaringBitmap32 allocates in WASM memory and needs explicit dispose() on both sides.

## Draft verdict

Adopt for snapshots/bulk; do not adopt for the frequent small-delta path. F (full-table Arrow IPC) is 3.0x–5.1x smaller than JSON snapshots with zero-copy column access — clear win for FULL_SNAPSHOT/resync/debug tooling. For deltas, G only beats JSON above ~k=10 changed rows/frame because ~656 B of per-stream FlatBuffers metadata dominates below that — and even above the crossover it loses to the contract’s hand-rolled SoA+Roaring sections, which carry no per-frame schema. The JS lib (v21) exposes no public schema-cached "batch-only" emission that would remove the fixed cost.

## Method notes

- JSON baseline rebuilds the id→slot Map per stringify — that is the real worldToJsonUpdate code path (contract §8: measured through the real code path).
- Payload semantics differ by contract design: JSON presence_update identifies players by guestId string (~15 B each); the binary plane carries u32 server ids (mask in G, entity_id column in F) with the guest string sent once in the spawn section (contract §2). This favors JSON on delta bytes at equal k, and still G wins at k≥10.
- heap columns are retained-heap delta of ONE call (gc before/after) and are noisy on this shared machine (frequently negative) — treat them as order-of-magnitude only; bytes columns are exact.
- decodeDelta ids come out as number[] (Roaring API); a client would scatter into typed-array stores by slot.

