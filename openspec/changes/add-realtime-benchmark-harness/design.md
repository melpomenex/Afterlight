# Design: realtime benchmark harness

## Context

The harness must produce numbers that generalize to Afterlight's real traffic.
That imposes three disciplines: fixtures model the *actual* wire shape and
value distributions (not synthetic integers); comparisons share identical
inputs; and results are committed with environment metadata so drift across
machines is visible.

## Fixture model (lib/fixtures.mjs)

- Worlds are SoA column sets over dense slots with sparse gap-y u32 server ids
  (like real id spaces) and string guestIds (the current identity).
- Values respect world bounds (x ∈ [-11.3, 11.3], z ∈ [-9.5, 10.3]) and the
  jump apex (y ≤ 0.72); yaw wraps [0, 2π).
- The JSON baseline serializes to the *current* `presence_update` shape with
  rounded coordinates and boolean flags — the literal wire the Node server
  emits today (protocol-catalog §1).
- `stepWorld` moves a fraction-chosen subset realistically (walk speed 2.2 u/s
  along yaw, occasional flag flips), so delta chains look like play, not noise.

## Encoding matrix

| Encoding | File | Meaning |
|---|---|---|
| A JSON | `encoders/jsonBaseline.mjs` | today's path, `JSON.stringify/parse` |
| B AoS | `encoders/aosBinary.mjs` | custom binary, per-entity records |
| C SoA dense | `encoders/soaDense.mjs` | full snapshot, DENSE columns |
| D SoA + sorted IDs | `encoders/soaSorted.mjs` | delta, SORTED_IDS |
| E SoA + Roaring | `encoders/soaRoaring.mjs` | delta, ROARING (real `roaring-wasm` bytes) |
| F Arrow | `encoders/arrow.mjs` | Arrow IPC record batch |
| G Arrow + masks | `encoders/arrow.mjs` | Arrow columns + Roaring mask |
| H hybrid | `chooseEncoding.mjs` | density-selected, thresholds from D/E + mask study |

D/E/F/G all share the 24-byte contract header so bytes and times compare
fairly. Hybrid thresholds are written into code with the numbers that justify
them, never guessed.

## Measurement discipline

`lib/measure.mjs`: warmup 3, 20 measured runs, median + p95 + **min** (min is
the comparable statistic on this shared machine); allocation proxy via
`--expose-gc` heap delta (honestly `undefined` without the flag); every result
file embeds `{node, cpus, date, exposedGc}`.

Grid: full cross of populations × fractions for N ≤ 10k; N = 50k sampled at
4 fractions to bound runtime. The mask study extends to N = 200k to find
crossover points.

## Server arm (BEAM)

Standalone `.exs` scripts, no Mix app (P1 owns the app). Measures: JSON encode
(built-in `JSON` if available), binary-SoA bitstream construction, iodata
build vs flatten cost, and encode-once-fanout vs per-client encode at K ∈
{1,10,100,200}. This approximates what `Afterlight.Realtime.Encoders.*` will
cost before P1 exists to host them.

## Client arms

- WASM: crate `wasm/afterlight-realtime` (std-only, cdylib), slot-based entity
  store, contract decoder with all limits enforced, status-code errors (no
  panics on hostile input), deterministic fuzz suite in-crate, built via
  `cargo build --target wasm32-unknown-unknown --release`. Control arm: a
  pure-JS DataView decoder of the same format in the same process.
- WebGPU: self-contained `probe.html` (no build step) benchmarking full write
  vs per-entity partial writes vs compact scatter into persistent storage
  buffers, with GPU-computed checksums validated against CPU expectations;
  software-adapter flags documented for headless runs.

## Risks / Trade-offs

- Machine contention inflates medians → min-of-runs is the comparison
  statistic, and contention is noted in results metadata.
- `roaring-wasm`'s JS↔wasm boundary cost is itself a finding (it may make
  roaring unattractive for tiny sets regardless of byte size).
- Software WebGPU adapters measure CPU-emitted GPU work — numbers bound the
  *relative* strategy comparison, not absolute production GPU performance;
  the probe README says so explicitly.

## Migration Plan

Harness lands first, results committed, decision records opened in
`docs/architecture/realtime/decisions.md`; subsequent changes cite it.

## Open Questions

- Interest management (send only what a client perceives) may dominate any
  encoding win at real populations; parked for coordination with the P10 load
  work, out of scope for the harness itself.
