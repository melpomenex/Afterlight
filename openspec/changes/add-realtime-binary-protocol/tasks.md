# Tasks: add-realtime-binary-protocol

## 1. Pure codecs (`shared/realtime/`)

- [x] 1.1 `frame.mjs` — header writer/reader (magic, version, type, flags, epoch, tick, sequence, baseline), section table reader with strict bounds, frame-type constants.
- [x] 1.2 `encoders.mjs` — DENSE / SORTED_IDS / ROARING / BITSET section writers + readers (transform, flags, lifecycle, string table); columnar layout per contract §3.
- [x] 1.3 `chooseEncoding.mjs` — measured density thresholds from the harness results, numbers in comments.
- [x] 1.4 `entityStore.mjs` — u32 id → u16 slot map with free-list, component columns, generation-guarded spawn/despawn.
- [x] 1.5 `applyFrame.mjs` — snapshot/delta application with baseline/epoch validation and resync signaling; output feeds `setPlayer()`-shaped entries.
- [x] 1.6 `parseHelloCaps.mjs` / `welcomeCaps.mjs` — negotiation field builders/parsers (tolerant: absence = legacy).

## 2. Robustness

- [x] 2.1 All contract limits enforced before allocation (1 MiB, 16 sections, 100k rows, lengths vs remaining bytes, enum validation, trailing-byte rejection).
- [x] 2.2 Bounded rejection contract: decoders return status, never throw into game code; store stays usable after a rejected frame.
- [ ] 2.3 Fuzz-style test: deterministic mutation corpus (truncate/flip/overflow/bad-enum) over valid frames across all decoders.

## 3. Semantics tests (`tests/realtime/`)

- [x] 3.1 Snapshot resets state; delta applies only on exact baseline match; gap triggers resync; epoch fencing discards stale owners.
- [x] 3.2 Spawn initializes all components before visibility; despawn frees slots; stale frames cannot resurrect ids.
- [x] 3.3 Density selector matches its documented thresholds; encoders agree with the harness results on shared fixtures.
- [x] 3.4 Dual-path check: legacy JSON update stream and binary frame stream from the same fixture chain produce identical store state.

## 3a. Chunked frames (v0 amendment)

- [x] 3.5 SNAPSHOT_CHUNK / DELTA_CHUNK semantics: per-sequence accumulation, CHUNK_END commit, clean rejection on old readers.
- [x] 3.6 writeChunkedFrames with caller budget (degrades to single frame); per-chunk string tables.
- [x] 3.7 Tests: 50k-entity chunked join, delta-chunk baseline continuity, unknown-type rejection.
- [x] 3.8 Contract §4a amendment + live 50,002-entity browser verification (worker path).

## 3b. Delta-varint (v1 promotion, measured)

- [x] 3.9 DELTA_VARINT encoding (delta + LEB128) in shared/realtime: writer, reader, despawn masks; strictly-ascending validation; truncated/overlong varint bounded rejection.
- [x] 3.10 Frame-level study `results/varint.*`: varint 0.762x sorted bytes at every scale, ~10% under roaring frames, decode parity — writer policy updated (sorted k<8, varint k>=8, dense at fullness >= 0.85).

## 4. Tooling + server contract

- [x] 4.1 `tools/realtime/frame-dump.mjs` — decode a captured frame to readable metadata + entity table.
- [x] 4.2 `tools/realtime/echo-server.mjs` — prototype binary-capable WS server (standalone, harness-only) used by parity/worker tests; never imported by the game server.
- [x] 4.3 Elixir behaviour contract documented (`docs/architecture/realtime/decisions.md` + reference `.exs` in the harness): `RealtimeFrame` struct, `FrameEncoder` behaviour, JSON debug encoder, encode-once fanout notes.
- [x] 4.4 `AFTERLIGHT_REALTIME_ENCODING=json` debug switch specified (env name, semantics) for the future server implementation.
