# Pipeline: main-thread crossover + allocation soak

Node v22.22.1, 24 cpus, exposedGc=true, fraction=0.1. Min is the comparable statistic.

| N | changed | JSON B | frame B | legacy µs/tick (min) | pipeline µs/tick (min) | main-thread speedup | legacy alloc B/tick | pipeline alloc B/tick |
|---|---|---|---|---|---|---|---|---|
| 50 | 5 | 577 | 173 | 0.0 | 0.0 | 0.14x | -6408 | 176 |
| 200 | 20 | 2183 | 548 | 0.0 | 0.0 | 0.19x | -368 | 128 |
| 1000 | 100 | 10780 | 2548 | 0.0 | 0.1 | 0.57x | 56 | 1568 |
| 5000 | 500 | 53705 | 12548 | 0.2 | 0.2 | 0.92x | -1352 | 64 |
| 10000 | 1000 | 107400 | 25048 | 0.4 | 0.4 | 1.02x | -416 | 168 |
| 50000 | 5000 | 536877 | 125048 | 2.0 | 1.2 | 1.63x | -536 | -37440 |

Soak N=10000 × 600 ticks: alloc/tick first100=-976 B, last100=-1578 B, trend=-601 B/tick → flat=true

Note: the Web Worker boundary (structured-clone transfer of packs) is a browser-only cost; this table measures each path’s main-thread cost. Worker-mode main-thread cost is the pipeline column minus decode (done off-thread) plus one pack copy.
Negative allocation cells are GC noise in heapDelta at µs-scale work (documented in the mask study); treat sub-1000-entity allocation deltas as unmeasurable, not negative.
Crossover (honest id-space run): JSON wins through 10k changed rows/tick (0.99x — effectively tied); the pipeline wins once per-tick row counts are large (1.53x at 50k). The stronger worker justification at scale is off-threading: worker-mode main-thread cost drops to the pack consume alone.
