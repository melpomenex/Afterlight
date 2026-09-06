# Add Realtime Binary Protocol (afterlight-soa-v1)

## Why

The realtime wire is flat-JSON full-roster snapshots at 10 Hz (`docs/architecture/elixir/protocol-catalog.md` §2): every client receives every player's pose as objects with string keys, decoded on the browser main thread. The migration's own load model prices that shape at ~50 MB/s egress at 1k sessions, and the P2/P3 specs freeze the JSON catalog ("no new wire message types") — correctly, for the migration. What is missing is an additive data plane that a negotiating client and server can upgrade to without touching the frozen catalog: compact columnar frames for pose/animation/lifecycle state, with explicit snapshot/delta semantics so no client ever applies a delta against an unknown baseline, and epoch fencing that converges with the P9 room-lease model before it exists.

This change specifies that data plane (`afterlight-soa-v1`, contract in `docs/architecture/realtime/contract.md`), implements the codec purely and testably in `shared/realtime/` (browser- and Node-import-safe like the rest of `shared/`), and defines the server-side `Afterlight.Realtime.FrameEncoder` behaviour so the Phoenix migration can implement binary fanout without redesign. It deliberately wires nothing into the live game: the codec ships with tests, the negotiation fields are specified for the gateway change that adopts them, and the live integration is a separate gated change.

## What Changes

- **Frame format `afterlight-soa-v1`** (v0 = protocol_version 1): 24-byte little-endian header (magic `ALRT`, version, frame type, flags, `room_epoch`, `server_tick`, `frame_sequence`, `baseline_sequence`) followed by typed sections (lifecycle spawn/despawn, transform, motion, anim, flags, visual, string table), each self-describing (section id, encoding enum: DENSE / SORTED_IDS / ROARING / BITSET / ARROW_RECORD_BATCH, entity count, payload length) and columnar inside.
- **Density-selected encodings.** Section encoding is chosen by measured thresholds from the benchmark harness — compact sorted IDs for tiny changed sets, Roaring for moderately sparse sets at scale, dense/omitted masks at high density — never hardcoded folklore.
- **Snapshot/delta/baseline semantics.** FULL_SNAPSHOT resets client state; DELTA applies only against the exact `baseline_sequence` the client holds; gap → client discards and resyncs; lower `room_epoch` frames are discarded unconditionally (stale-owner fencing, converging with P9 `room_leases.epoch`); spawn/despawn are generation-guarded so stale frames cannot resurrect entities.
- **Additive capability negotiation.** `hello` MAY carry `"rt": {protocols, webgpu, wasm}`; `welcome` MAY carry `"rt": {protocol, snapshot_hz}`. Absence anywhere = legacy mode; servers never send binary to non-advertising clients; three consecutive decode failures disable the fast path locally. No new JSON message types.
- **Pure codecs in `shared/realtime/`.** Frame writer/reader, density selector, entity-slot store (u32 id → u16 slot free-list), and a strict decoder enforcing all contract limits (1 MiB frames, 16 sections, 100k rows, bounds-checked lengths, enum validation) that rejects hostile input with status codes, never throws into game code. The store's output feeds `RemotePlayersManager.setPlayer()`-shaped entries so the legacy avatar path is untouched.
- **Server-side encoder contract.** `Afterlight.Realtime.FrameEncoder` behaviour (JSON debug / BinarySoA / Arrow) with `RealtimeFrame` structs produced by a delta extractor — Phoenix channel handlers never touch byte offsets; encode once per capability class per tick, fan out the same iodata.
- **Debug and tooling.** The JSON debug encoder reproduces the legacy shape; a frame-dump tool prints tick/epoch/sequence/type/sections/masks and a readable entity table; `AFTERLIGHT_REALTIME_ENCODING=json` selects the debug encoding server-side.

## Capabilities

### New Capabilities

- `realtime-binary-protocol`: the `afterlight-soa-v1` wire format, negotiation, snapshot/delta/epoch semantics, codec robustness, debug tooling, and the server encoder behaviour contract.

### Modified Capabilities

- (none — strictly additive to the frozen JSON catalog; `gateway-transport` and `world-room-runtime` requirements are unmodified. When the gateway adopts negotiation, it will add its own requirements referencing this capability.)

## Impact

- **New**: `shared/realtime/**` (pure codecs + store), `tests/realtime/**` (round-trip, hostile-input, snapshot/delta/epoch semantics, density selection), `tools/realtime/**` (frame-dump tool, prototype echo server for harness use), Elixir reference modules documented under `docs/architecture/realtime/`.
- **Existing**: unchanged. `shared/protocol.js`, `src/net/client.js`, `server/*` untouched; no live traffic changes until a gated integration change flips a flag.
- **Tests**: `node --test tests/realtime/` (codec + semantics + hostile input); root suites green untouched.
- **Downstream**: `add-realtime-wasm-decoder` implements this format in Rust against the same vectors; `add-realtime-worker-pipeline` consumes the codecs in a worker; the migration's P2/P3 can adopt the negotiation fields and `FrameEncoder` behaviour additively.
