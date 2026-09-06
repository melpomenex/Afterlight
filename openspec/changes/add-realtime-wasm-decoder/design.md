# Design: realtime WASM decoder

## Context

The question is not "can WASM decode faster" in the abstract but "does it win
on `afterlight-soa-v1` frames at Afterlight populations, enough to pay for a
Rust build in the toolchain". The experiment is designed to be decisive.

## Experiment design

- **Same frames, same store semantics.** `run-wasm.mjs` builds snapshot+delta
  chains from the shared fixtures and feeds identical bytes to both arms. Both
  arms maintain the same slot-store semantics, so the comparison is
  decode+apply, not decode-into-nothing.
- **Control arm is real.** The JS arm is a DataView/TypedArray decoder written
  against the same contract — not a strawman `JSON.parse`.
- **Metrics.** Median + min µs per frame at N ∈ {1k, 10k, 50k} × f ∈
  {1%, 10%, 100%}; JS-side allocation counts (the store output must be
  allocation-free on the hot path in both arms); wasm linear memory growth
  over 600 ticks (bounded working set, no growth leak).
- **Hardening regardless of verdict.** The crate enforces contract limits,
  returns status codes, and survives a deterministic 10k-iteration fuzz corpus;
  these properties transfer to any future WASM use (e.g., Arrow or Roaring
  decoding) even if the frame-decode verdict is reject.

## ABI principles

Tiny, stable, integer-only: `(ptr, len)` pairs and status codes; caller-owned
input memory; callee-owned store; accessors return views into WASM memory that
JS copies only when crossing to the render thread. No stringification across
the boundary; the guestId string table is exposed as (ptr,len) UTF-8 + index
list.

## Build discipline

Plain `cargo build --target wasm32-unknown-unknown --release`, std-only (no
wasm-bindgen runtime, no wasm-pack). The built artifact + a pinned rustc
version are recorded; the artifact is reproducible from the crate. CI-
friendliness is documented (no nightly, no network).

## Risks / Trade-offs

- Hand-rolled ABI is more error-prone than wasm-bindgen — mitigated by its
  smallness (one store, one frame type) and the fuzz suite.
- If rejected, we carry a crate that "does nothing live" — acceptable: it is
  the fuzz-hardened reference implementation and the home of any future WASM
  decoding that DOES win (the verdict may be adopt-selectively).

## Migration Plan

Prototype lands behind nothing (it is inert by nature: the game never loads it
until the pipeline change adopts it behind `realtime_wasm`). Verdict recorded;
either outcome closes this change.

## Open Questions

- Does the WASM arm win when it must copy results to JS for the render thread?
  Measured as part of the head-to-head (view-based accessors minimize this).
