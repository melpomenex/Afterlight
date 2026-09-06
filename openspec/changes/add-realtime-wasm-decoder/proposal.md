# Add Realtime WASM Decoder (evaluation)

## Why

The binary protocol change (`add-realtime-binary-protocol`) delivers pure-JS codecs. The program charter forbids assuming WASM wins: for simple fixed-width layouts, a JavaScript `DataView`/`TypedArray` decoder over typed columns is already fast, and a WASM boundary adds build toolchain, ABI surface, and loading complexity. This change answers the question empirically, on the exact frames the protocol defines, and — win or lose — produces the hardening work any wire parser needs: a Rust decoder with status-code errors and a deterministic fuzz suite.

The scope is deliberately narrow: a decoder plus a slot-based entity store. Not a Rust ECS, not a game loop, not a frontend rewrite — the client stays JavaScript, and Three.js stays Three.js.

## What Changes

- **Rust crate `wasm/afterlight-realtime`** (std-only, `cdylib`, `wasm32-unknown-unknown`, built with plain cargo — no wasm-pack/wasm-bindgen): `afterlight-soa-v1` decoder enforcing every contract limit before allocation, a dense slot store (u32 id → u16 slot free-list, generation-guarded lifecycle), and status-code errors (no panics on hostile input).
- **Explicit `extern "C"` ABI** (`ABI.md`): create/destroy store, `apply_frame(ptr, len) -> status`, and pointer/length accessors handing JS typed-array views for changed ids and columns — no data crosses the boundary as JSON, ever.
- **Deterministic fuzz suite in-crate** (`tests/fuzz.rs`): valid-frame corpus mutated by truncation, byte flips, length overflow, and bad enums; ≥10k iterations; every hostile input returns Err and the store stays usable; plus round-trip unit tests cross-checking frames built in Rust.
- **Honest head-to-head** (`benchmarks/realtime/run-wasm.mjs`): the same fixture frame chains decoded+applied through the WASM path and a pure-JS DataView decoder in the same process — median and min per grid point, JS-allocation counts, and WASM linear-memory growth over a 600-tick chain.
- **A verdict, not a default**: `docs/architecture/realtime/decisions.md` records adopt / adopt-selectively (e.g., Arrow or Roaring decoding only) / reject with the numbers. If JS wins, the crate remains as the fuzz-hardened reference and the JS decoder stays the wired path.

## Capabilities

### New Capabilities

- `realtime-wasm-decoder`: the conditions under which the Rust/WASM decode path exists in the repository — ABI stability, hostile-input hardening, memory discipline, measured benefit, and clean fallback to the JS decoder.

### Modified Capabilities

- (none)

## Impact

- **New**: `wasm/afterlight-realtime/**` (crate, ABI doc, fuzz tests, built wasm artifact committed or reproducibly buildable), `benchmarks/realtime/lib/wasm/**` (loader, glue, JS control decoder), `benchmarks/realtime/results/wasm.*`, decision record.
- **Existing**: nothing wired into the game; the JS decoder remains the only decode path used by any live or prototype client until a gated change adopts WASM behind `realtime_wasm`.
- **Tests**: `cargo test` in-crate (unit + fuzz); harness wasm-vs-JS bench; root suites untouched.
- **Downstream**: `add-realtime-worker-pipeline` consumes whichever decoder wins behind the same store interface; the governance capability's fallback ladder uses the JS decoder as the WASM rung's fallback.
