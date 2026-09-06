# DELTA_VARINT vs SORTED_IDS vs ROARING (frame level, fraction 0.1)

Node v22.22.1, min-of-runs (shared machine).

| N | k | sorted B | varint B | B ratio | sorted dec µs | varint dec µs | decode ratio | roaring/varint B |
|---|---|---|---|---|---|---|---|---|
| 200 | 20 | 548 | 430 | 0.785 | 0.00 | 0.00 | 1 | 1.163 |
| 1000 | 100 | 2548 | 1960 | 0.769 | 0.00 | 0.00 | 1.13 | 1.112 |
| 5000 | 500 | 12548 | 9576 | 0.763 | 0.00 | 0.00 | 1 | 1.105 |
| 10000 | 1000 | 25048 | 19084 | 0.762 | 0.00 | 0.00 | 0.89 | 1.105 |
| 50000 | 5000 | 125048 | 95296 | 0.762 | 0.00 | 0.00 | 1.13 | 1.103 |

Read: varint shrinks the mask portion (~4 B/id → ~1.3–2.5 B/id), so frame bytes drop a few percent vs sorted at every k; decode is proportionally slower but stays in microseconds at 10 Hz tick scale. Roaring only approaches varint bytes at large k.
