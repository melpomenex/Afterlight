# Add Realtime Benchmark Harness

## Why

The acceleration program's first rule is "no adoption without measurement", and its primary empirical question — what representation should realtime world deltas use? — is currently answered by folklore. The existing repository has no benchmark infrastructure at all: no fixtures modeling Afterlight's realtime entities, no encoders to compare, and no recorded numbers. Writing the protocol change (`add-realtime-binary-protocol`) before the evidence exists would bake in assumptions (e.g., "Arrow must win", "Roaring is always smaller") that the program charter explicitly forbids starting from.

This change builds the evidence base: deterministic Afterlight-style fixtures across realistic populations and churn levels, competing encodings A–H (JSON baseline, binary AoS, binary SoA dense, SoA + sorted delta IDs, SoA + Roaring, Arrow IPC, Arrow + masks, and a measured hybrid), repeatable runners, and committed results. It also answers the program's critical secondary comparisons: WASM vs pure-JS decoding, Roaring vs simpler masks at every density, and BEAM-side encode cost for the server arm.

## What Changes

- **Fixture generator** (`benchmarks/realtime/lib/fixtures.mjs`): deterministic (seeded LCG, matching the repo's procedural-determinism convention), SoA world columns mirroring the current presence fields (`id, x, z, rotY, walking, sitting, airborne`) plus the contract's component model, gap-y u32 id spaces, string guestIds, busy-room flag mix (≈60/25/10/5 idle/walk/sit/air), `stepWorld` churn across fractions 0.1%–100%, populations 50–50,000.
- **Encoders A–E + H** (`lib/encoders/`): JSON baseline through the real `JSON.stringify`/`parse` path; binary AoS; contract-shaped SoA (DENSE / SORTED_IDS / ROARING section encodings); a density-selected hybrid with measured thresholds. Every encoder round-trips semantically and rejects hostile input cleanly.
- **Mask study** (`lib/masks/`, `run-masks.mjs`): sorted u32 vs delta-varint vs bitset vs `roaring-wasm` (real CRoaring serialization) across world sizes up to 200k — serialized bytes, decode time, iteration time, and density threshold recommendations.
- **WASM arm** (`run-wasm.mjs`, `lib/wasm/`): the contract decoder in Rust (crate `wasm/afterlight-realtime`, std-only, `wasm32-unknown-unknown`, hand-rolled `extern "C"` ABI) vs a pure-JS DataView decoder on identical frames, plus an in-crate deterministic fuzz suite.
- **Arrow arm** (`lib/encoders/arrow.mjs`, `run-arrow.mjs`): `apache-arrow` IPC record batches (with and without Roaring masks), measuring metadata overhead separately from value bytes.
- **BEAM arm** (`beam/bench_encode.exs`): standalone Elixir scripts (no Mix app — P1 owns that) measuring binary-SoA iodata encoding vs JSON on the same fixtures, plus encode-once/fanout-vs-per-client cost.
- **WebGPU probe** (`webgpu/probe.html`): full-buffer write vs N partial writes vs compact-upload + compute scatter into persistent storage buffers, with checksum validation; run under browser tooling with software-adapter fallbacks.
- **Committed results**: `benchmarks/realtime/results/*.json|md` with environment metadata; benchmarks are repeatable scripts, not anecdotes.
- **Dependency isolation**: benchmark-only npm deps live in `benchmarks/realtime/package.json` (nested manifest); the repo root `package.json` is untouched.

## Capabilities

### New Capabilities

- `realtime-benchmark-harness`: the repository's standing rule that data-plane claims come from this harness — deterministic fixtures, comparable encodings, min+median reporting, committed results, and hostile-input test coverage for anything that parses wire bytes.

### Modified Capabilities

- (none)

## Impact

- **New**: `benchmarks/realtime/**` (libs, encoders, masks, wasm glue, beam scripts, webgpu probe, results), `wasm/afterlight-realtime/**` (Rust crate, built wasm artifact, ABI doc, fuzz tests).
- **Existing**: nothing modified — root `package.json`, game source, server, and migration docs untouched by design.
- **Tests**: benchmark-internal suites run via `node --test benchmarks/realtime/tests/` and `cargo test`; root suites unaffected.
- **Downstream**: every subsequent `add-realtime-*` change cites this harness; the decision records in `docs/architecture/realtime/decisions.md` are generated from its results.
