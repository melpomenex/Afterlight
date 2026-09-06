# realtime-wasm-decoder

## Purpose

The conditions under which a Rust/WASM decode path for `afterlight-soa-v1`
exists in this repository: an explicit integer-only ABI, contract-limit
enforcement with status-code errors, deterministic fuzz hardening, memory
discipline, a measured head-to-head against a real JS DataView decoder, and a
clean fallback. WASM is adopted only where it measurably wins; the JS decoder
remains the default and the fallback in every case.

## ADDED Requirements

### Requirement: Narrow, stable ABI

The WASM module SHALL expose a small integer-only ABI (store create/destroy, `apply_frame(ptr, len) -> status`, and pointer/length accessors for changed ids, component columns, and the spawn string table) documented in `ABI.md`. Data SHALL cross the boundary as typed views over WASM memory, never as JSON or per-entity objects. ABI changes SHALL be documented as breaking and reflected in the glue layer and its tests.

#### Scenario: No serialization across the boundary

- **WHEN** a frame is applied and results are read from JS
- **THEN** all data moves as typed-array views over WASM memory with integer handles, and no JSON encode/decode occurs in the hot path

### Requirement: Hostile-input parity with the JS codec

The WASM decoder SHALL enforce the same limits as the contract codec (1 MiB frames, 16 sections, 100k rows, validated lengths, known enums, no trailing bytes) and SHALL return status codes for every rejection — never panic, hang, or allocate proportional to unvalidated lengths. A deterministic in-crate fuzz suite SHALL drive valid-frame corpora through truncation, byte-flip, length-overflow, and bad-enum mutations for at least 10,000 iterations, asserting bounded rejection and store usability after every hostile input.

#### Scenario: Fuzz corpus never panics

- **WHEN** the fuzz suite runs
- **THEN** no mutation causes a panic, an unbounded allocation, or a store that cannot subsequently apply a valid frame

### Requirement: Measured benefit before adoption

The crate SHALL NOT be adopted by any wired client path unless the committed head-to-head benchmark (`benchmarks/realtime/results/wasm.*`) shows a meaningful win for the WASM arm over the JS DataView decoder on identical fixture frames at Afterlight-realistic populations — reported as median and min per grid point with environment metadata, plus JS allocation counts and WASM linear-memory growth over a 600-tick chain. A reject or adopt-selectively verdict SHALL be recorded in `docs/architecture/realtime/decisions.md` and SHALL close this capability's evaluation honestly.

#### Scenario: JS wins, WASM is not wired

- **WHEN** the head-to-head shows the JS decoder equal or faster at every measured point
- **THEN** the verdict records reject (or adopt-selectively with the specific sub-workload that won) and no wired path loads the module

### Requirement: Fallback and runtime safety

The client integration (when a later change wires it) SHALL treat the WASM module as optional: compile or instantiation failure, or an unsupported environment, SHALL fall back to the pure-JS decoder on the same binary frames without session loss. The fallback SHALL be exercised by a test that runs the frame-application suite with the WASM arm disabled.

#### Scenario: Missing module is invisible

- **WHEN** the WASM artifact fails to load in a binary-negotiated session
- **THEN** the JS decoder applies the same frames and the session continues with correct state

### Requirement: Build discipline

The crate SHALL be std-only and build reproducibly with plain cargo for `wasm32-unknown-unknown` (no nightly, no network fetches, no wasm-pack), with the built artifact and toolchain version recorded so the committed benchmark results remain attributable.

#### Scenario: Reproducible build

- **WHEN** a developer runs the documented build commands with the recorded toolchain
- **THEN** the wasm artifact builds without network access and the benchmark harness can load it
