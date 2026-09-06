# Realtime binary/GPU acceleration (umbrella)

## Why

The Elixir/Phoenix/OTP/Ash migration (`port-backend-to-elixir`, phases P0–P11 in `docs/architecture/elixir/ownership.md`) is rebuilding the authoritative backend while explicitly preserving the Three.js frontend. Independently of which backend owns a room, the realtime wire is still flat-JSON full-roster snapshots at 10 Hz (`docs/architecture/elixir/protocol-catalog.md` §2), remote avatars are ~24 individually mutated meshes per player (`src/render/avatars.js`), and nothing on the client moves decoding off the main thread. The migration's own load model (`docs/architecture/elixir/migration.md`) prices this shape at ~50 MB/s egress at 1k sessions. If Afterlight is ever to carry crowded rooms, dense vegetation simulation, or projectile populations, it needs a high-performance realtime *data plane* beneath the existing abstractions — without touching durable domains, without replacing Three.js, Phoenix, OTP, or Ash, and without blocking the migration.

This is an umbrella change: it defines the program, its governance (adoption gates, fallback ladder, flags), and decomposes into implementation changes. No technology (binary transport, WASM, Roaring, Arrow, WebGPU, Workers, WebTransport) is adopted by this change; each must earn adoption through `benchmarks/realtime` evidence and the gates in `specs/realtime-acceleration-governance/spec.md`.

## What Changes

- **A program, not a rewrite.** The architecture is a negotiated binary data plane beside the existing JSON control plane: OTP room owner → delta extractor → `RealtimeFrame` → `Afterlight.Realtime.FrameEncoder` behaviour (JSON debug / BinarySoA / Arrow) → binary Phoenix or Node WS frames → Web Worker → (optional) WASM decoder/entity store → compact changed arrays → optional WebGPU scatter into persistent storage buffers → Three.js rendering. Ash/PostgreSQL never enter the frame path.
- **Benchmark-driven decomposition** into implementation changes (each independently valuable, none blocking the migration):
  - `add-realtime-benchmark-harness` — deterministic Afterlight-style fixtures, encoders A–H, repeatable runners, committed results. The evidence base; lands first.
  - `add-realtime-binary-protocol` — `afterlight-soa-v1` frame format (24-byte header, sectioned columnar payloads, density-selected encodings), additive capability negotiation on `hello`/`welcome`, snapshot/delta/baseline/epoch semantics, `shared/realtime` pure codecs with hostile-input tests, and the Elixir-side `FrameEncoder` behaviour contract for the migration to implement.
  - `add-realtime-wasm-decoder` — narrowly scoped Rust crate (decoder + slot-based entity store + fuzz tests) compiled to `wasm32-unknown-unknown`, adopted only where it beats the JS DataView decoder measurably.
  - `add-realtime-worker-pipeline` — Web Worker decode pipeline (transferable buffers, ring buffering, no per-entity object churn) producing `setPlayer()`-compatible output so the legacy avatar path is untouched.
  - `add-realtime-gpu-rendering` — experimental `EntityRenderBackend` seam: CPUThreeBackend (default) and WebGPUThreeBackend (persistent storage buffers + compute scatter + instanced draw), gated behind flags and visual-parity checks.
- **Explicit non-adoption is a first-class outcome.** If measurements show JSON wins at Afterlight's actual populations, or WASM/Arrow/Roaring/WebGPU do not pay for themselves at any milestone in scope, the program records `reject` verdicts with numbers and stops.
- **The migration is untouched.** No edits to `shared/protocol.js`, the `NetworkClient` facade, `server/index.js`, `server/world.js`, or any migration-owned OpenSpec. All fast-path code is new files under `shared/realtime/`, `src/realtime/`, `benchmarks/realtime/`, `wasm/`, `tools/realtime/`, plus docs under `docs/architecture/realtime/`.

Depends on: nothing that does not already exist. Coordinates with (but does not modify): `add-phoenix-gateway-transport` (P2), `add-world-room-runtime` (P3), `add-distributed-room-ownership` (P9), `add-observability-security-loadtesting` (P10).

## Capabilities

### New Capabilities

- `realtime-acceleration-governance`: the program's rules — technology adoption gates (benchmarks or it did not happen), the fallback ladder (accelerated → binary CPU → legacy), granular feature flags, dual-path parity verification, ownership boundaries with the Elixir migration, debug tooling requirements, and hostile-input/security requirements for any wire-facing parser.

### Modified Capabilities

- (none — no capability has been archived yet; all fast-path capabilities are introduced by the child changes listed above and are additive to the frozen migration message catalog.)

## Impact

- **New code**: `benchmarks/realtime/**` (harness + results), `shared/realtime/**` (pure codecs), `wasm/afterlight-realtime/**` (Rust crate), `src/realtime/**` (client fast path, unwired by default), `tools/realtime/**` (prototype server/harness pages).
- **New docs**: `docs/architecture/realtime/**` (compat report, protocol contract, decision records).
- **Existing code**: unchanged by this umbrella. Wiring the fast path into the live game is a separate, gated change that lands only after parity evidence; until then the default experience is byte-identical to today.
- **Tests**: `tests/realtime/**` and benchmark-internal test suites; root `npm test` suites stay green untouched.
- **Risks**: measurement noise on a shared machine (mitigated by min-statistic reporting), three.js WebGPU surface drift (probes pin r0.180), scope creep into a renderer rewrite (governance capability forbids it).
