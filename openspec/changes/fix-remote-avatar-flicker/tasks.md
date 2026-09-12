## 1. Server: full-snapshot live flush (Phoenix)

- [x] 1.1 Add DENSE STRING_TABLE (section 8) and SPAWN (section 1, 28-byte rows) encoding to `Afterlight.Realtime.Encoders.BinarySoA`, mirroring the JS reference layout (`shared/realtime/encoders.js`, `shared/realtime/writer.js:26-73`), and set the header `HAS_STRING_TABLE` flag when a table is written; leave the delta output byte-identical.
- [x] 1.2 Add `BinaryFlush.encode_snapshot/3` building a `%RealtimeFrame{frame_type: :full_snapshot}` with spawn rows (`id: EntityId.hash(player_id)`, `guest_id: player_id`, archetype/variant 0, pose x/z/yaw, y 0) plus transform + flags for the same members; keep `encode_flush/3` as the delta reference. Transform/flags ids sort ascending for the SORTED_IDS contract.
- [x] 1.3 In `game_channel.ex` `push_world_frame/3`, emit the full snapshot for sockets whose negotiated `rt` advertises `spawn`, and keep the existing delta conversion for every other negotiating client; `rt_seq` bookkeeping is unchanged.
- [x] 1.4 Parse the additive `spawn` boolean from `hello.rt` in `Afterlight.Realtime.Negotiation` (default `false` when absent or malformed).

## 2. Server: Node mirror and capability

- [x] 2.1 In `shared/realtime/negotiation.js`, add `spawn` to `buildHelloRt()` and return it from `parseHelloRt()` (default `false`).
- [x] 2.2 Add `encodeSnapshot(members, tick, seq)` to `shared/realtime/nodeBinaryFlush.js` using `writeFrame` with spawn + string table + transform + flags; do not change `encodeFlush()`.
- [x] 2.3 In `server/world.js` `tickMovementBroadcast()`, build the snapshot payload for sessions with `rt.spawn` and keep the delta payload for the rest of the room; confirm `server/index.js` hello parsing already flows through `parseHelloRt()`.

## 3. Client: capability, identity, liveness, baseline

- [x] 3.1 In `src/realtime/wire.js`, advertise `spawn: true` in the hello `rt` object; when an entity session is active, stop `onEntry`/`onJoin` from creating remote avatars for the local guest or Kiln.
- [x] 3.2 In `src/realtime/liveBackend.js`, resolve each row's guest id from the existing id map before creating/updating an avatar, skip spawn rows with no resolvable guest identity (no numeric placeholder avatars, no overwriting a known mapping with the `guestId ?? id` fallback), and track liveness by key set so repeated spawn rows are idempotent through `applyDeltaPack`, `applyPresencePlayer`, and `removePresencePlayer`. Also preserve a joined row's nickname when its transform row overwrites the pending entry, and keep departure mappings resolvable until the consumer's backend has removed the guest-keyed avatar (`src/realtime/consumer.js`).
- [x] 3.3 Add `opts.adoptBaseline` to `shared/realtime/applyFrame.js`: when a delta's baseline/epoch do not match and the caller allows adoption, align `session.frameSequence`/`session.epoch` to the frame and apply instead of returning `resync`.
- [x] 3.4 Arm baseline adoption on construction and `reset()` in `src/realtime/worker/core.js` (pass it through to `applyFrame`), clear it after the first applied frame, and re-arm on `reset`/fallback in `src/realtime/pipeline.js`.
- [x] 3.5 In `src/realtime/wasm/pipelineCore.js`, when `applyFrame` reports `OK_RESYNC_NEEDED` while unbaselined, read the frame header, `store.resetTo(epoch, baselineSequence, true)`, retry once, and clear the flag on success; `reset()` re-arms it. Confirm `decode.worker.js` reset handling re-arms the core. A delta whose ids are all unknown while the store is empty (an older server's streams) commits its sequence instead of resyncing forever.
- [x] 3.6 Node legacy transport: decode the server's JSON `rt_binary` envelope (`{tick, data: base64}`) into the same ArrayBuffer the Phoenix transport hands to `handleBinary`, with the desired-room filter, so direct-Node rt clients actually consume the binary flush (discovered during headless two-client verification).

## 4. Tests

- [x] 4.1 Extend `tests/realtime/node-binary-flush.test.js` / `tests/realtime/gateway-binary-convergence.test.js` with snapshot encoding cases: frame type, header `HAS_STRING_TABLE`, string-table layout, spawn row geometry, and transform/flags for the same ids.
- [x] 4.2 Add an end-to-end avatar path test (e.g. `tests/realtime/live-avatar-path.test.js`) that drives the real `wireRealtime` + `LiveRemoteBackend` with `encodeSnapshot` bytes: remote movement updates arrive; a simulated travel reset (`JOIN_ROOM`) followed by snapshots produces no `clear`/resync storm; a snapshot containing the local guest and Kiln creates no remote avatars; WASM-shaped spawn rows without guest ids create no numeric duplicate.
- [x] 4.3 Add baseline-adoption coverage: the inline `PipelineCore` and a worker-core fixture adopt the first delta after reset; a delta gap on an established session still returns `resync`.
- [x] 4.4 Add negotiation tests for the additive `spawn` flag on both sides (`tests/realtime/wiring.test.js` hello shape; Elixir `Negotiation` parse) including absent/unknown-field legacy behavior.
- [x] 4.5 Add Elixir tests for the snapshot layout (`frame_encoder_test.exs` or a sibling) and the gateway's snapshot-vs-delta selection per `rt.spawn` (`game_channel_world_test.exs`), keeping existing delta expectations unchanged.
- [x] 4.6 Run `npm test` and resolve relevant failures; run `mix test` in `server_elixir/` where the toolchain is available and report any suite that could not run. (Elixir/mix unavailable in this environment; the added Elixir tests were not executed — see 5.5.)

## 5. Docs, build, and verification

- [x] 5.1 Update `docs/architecture/realtime/compat-report.md` (and a dated note in `decisions.md` if appropriate) to record that the live flush is now a spawn-carrying FULL snapshot gated by the `spawn` capability.
- [ ] 5.2 Run `npm run build` and refresh the committed `dist/` output; do not hand-edit generated bundles. (`npx vite build` verified exit 0; the full script's `build:wasm` step needs cargo/rustc, absent here, and the committed `dist/` refresh was withheld because the working tree carries unrelated in-flight changes that would be baked into the bundle.)
- [x] 5.3 Browser smoke with shipped defaults and two clients in The Orpheum: the remote avatar moves smoothly while the other player walks, never blinks out; travel to another place and back and confirm no flicker; confirm the local player and Kiln are never duplicated. (Performed with system Chromium via Playwright against the real Node server + Vite, in The Market Court and The Rain Court: 260 FULL snapshot frames on one client, 3 total `join_room` sends over the whole session, 74 live frames after travel, and the remote avatar with its nickname plate present in every post-travel screenshot; the lazy wire import raced the first socket, so a forced reconnect negotiated the binary path exactly as the lazy-import ordering does in a real session.)
- [x] 5.4 Exercise the staged-deploy path: with the new backend and a stale (pre-change) bundle, confirm the old client keeps the delta shape without new errors or duplicate avatars; then reload the new bundle and confirm the snapshot path. (Emulated with a raw rt client omitting `spawn`: deltas only, no snapshots, no errors; spawn clients received snapshots.)
- [x] 5.5 Report the verification actually performed, including any browser or Elixir check that could not be completed.
