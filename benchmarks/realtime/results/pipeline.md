# Pipeline: main-thread crossover + allocation soak

Node v22.22.1, 24 cpus, exposedGc=true, fraction=0.1. Min is the comparable statistic.

| N | changed | JSON B | frame B | legacy µs/tick (min) | pipeline µs/tick (min) | main-thread speedup | legacy alloc B/tick | pipeline alloc B/tick |
|---|---|---|---|---|---|---|---|---|
| 50 | 5 | 577 | 173 | 0.0 | 0.0 | 0.42x | -6584 | 112 |
| 200 | 20 | 2183 | 548 | 0.0 | 0.0 | 0.69x | -464 | 208 |
| 1000 | 100 | 10780 | 2548 | 0.0 | 0.0 | 1.03x | -192 | 824 |
| 5000 | 500 | 53705 | 12548 | 0.2 | 0.1 | 1.47x | -648 | 9424 |
| 10000 | 1000 | 107400 | 25048 | 0.4 | 0.2 | 1.87x | -320 | -264 |

Soak N=10000 × 600 ticks: alloc/tick first100=-78 B, last100=16 B, trend=94 B/tick → flat=true

Note: the Web Worker boundary (structured-clone transfer of packs) is a browser-only cost; this table measures each path’s main-thread cost. Worker-mode main-thread cost is the pipeline column minus decode (done off-thread) plus one pack copy.
