# Tasks: add-realtime-wasm-decoder

## 1. Crate

- [x] 1.1 `wasm/afterlight-realtime`: cdylib crate, std-only, release profile (lto), builds for wasm32-unknown-unknown with plain cargo.
- [x] 1.2 Contract decoder: header/section validation, all limits enforced pre-allocation, status-code errors, no panics on hostile input.
- [x] 1.3 Slot store: u32→u16 slot map with free-list, component columns, generation-guarded spawn/despawn.
- [x] 1.4 `ABI.md`: exported functions, ownership rules, view accessors; integer-only boundary, no JSON crossing.

## 2. Hardening

- [x] 2.1 Round-trip unit tests with frames built in Rust.
- [x] 2.2 Deterministic fuzz suite (truncation/flip/overflow/bad-enum, ≥10k iterations, store usable after each hostile frame) — `cargo test` green.
- [x] 2.3 Build reproducibility noted (pinned toolchain, no network deps).

## 3. Head-to-head

- [x] 3.1 `benchmarks/realtime/lib/wasm/glue.mjs` loader + JS control decoder (`jsRefDecoder.mjs`) of the same format.
- [x] 3.2 `run-wasm.mjs`: identical fixture frame chains through both arms; median+min per grid point; JS allocation counts; 600-tick wasm memory growth.
- [x] 3.3 Results committed (`results/wasm.json|md`) with environment metadata.

## 4. Verdict

- [x] 4.1 Decision record in `docs/architecture/realtime/decisions.md`: benefit / cost / benchmark / verdict (adopt / adopt-selectively / reject).
- [ ] 4.2 Fallback path exercised: JS decoder consumes the same frames when the wasm module is absent or fails to instantiate.
