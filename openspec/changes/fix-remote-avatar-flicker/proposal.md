# Fix remote avatar flicker on the live realtime path

## Why

Players report that a remote player's avatar flickers continuously whenever
another player is present in the same place. Reproduced headlessly against the
real client pipeline:

- The Phoenix gateway converts the room runtime's 10 Hz **full-roster**
  `presence_update` flush into an `afterlight-soa-v1` **DELTA**
  (`server_elixir/lib/afterlight/world/binary_flush.ex`,
  `game_channel.ex:1495-1507`), and the Node direct server does the same
  (`shared/realtime/nodeBinaryFlush.js`, `server/world.js:143-160`). Both carry
  only TRANSFORM + FLAGS: no SPAWN, no STRING_TABLE.
- The client resets its decode session whenever it sends `join_room`
  (`src/realtime/wire.js` wraps `net.send`), after worker fallback, and it
  drops binary frames received before the worker reports ready
  (`src/realtime/pipeline.js`). The gateway's `rt_seq` is per transport and
  keeps counting across rooms (`game_channel.ex:1500`; Node's `roomRtSeq` is
  per room and shared across clients). After any reset the next flush's
  `baseline_sequence` cannot match, so `PipelineCore.applyFrame` / the WASM
  core return `resync` for **every** subsequent frame.
- `wireRealtime`'s `onResync` reacts with `entitySession.clearRemotes()` plus a
  `join_room` replay, which resets the session again. While at least one remote
  avatar is present, avatars are removed and recreated at 10 Hz — the flicker.
- Because the flush carries no lifecycle sections, the live client entity store
  is never seeded and binary transform rows are discarded for unknown ids:
  even with a matching baseline the negotiated binary path cannot update remote
  positions, rotations, or pose flags. Only the JSON join roster moves avatars
  today, so fixing the resync loop alone would leave remote avatars frozen.

The shipped dev/production builds enable the binary path by default
(`VITE_RT_BINARY=1`), so this is the default live experience, and the bug
directly contradicts the `player-identity` "Remote Movement Interpolation"
guarantee.

## What Changes

- **Encode the live flush as a FULL snapshot.** The room flush's source of
  truth is a full roster, so the server emits the frame type that matches its
  semantics: `FULL_SNAPSHOT` with SPAWN + STRING_TABLE + TRANSFORM + FLAGS.
  Snapshots are self-validating, so a client that reset its decoder (travel,
  rejoin, worker start) applies the next flush instead of resyncing in a loop,
  and remote entities exist in the client store so binary rows actually update
  avatars.
- **Implement lifecycle section encoding** (STRING_TABLE + SPAWN, header
  `HAS_STRING_TABLE` flag) in `Afterlight.Realtime.Encoders.BinarySoA`; the
  existing delta encoder stays for callers that track per-client state. Mirror
  the snapshot encoder in `shared/realtime/nodeBinaryFlush.js` using the
  existing JS reference writer, and use it in `server/world.js`.
- **Capability-gate the new frame shape.** The client hello `rt` object gains
  the additive `spawn: true` flag; the server emits lifecycle-carrying
  snapshots only to clients that advertise it, keeping the previous delta
  shape for stale clients so an in-flight old tab cannot develop duplicate
  avatars from WASM spawn rows that carry no guest id.
- **Make client avatar identity and liveness authoritative.** Resolve remote
  rows by guest id (from the presence bridge / id map) before creating or
  updating an avatar, skip rows with no resolvable guest identity instead of
  keying placeholder avatars under the numeric entity id, never remote-render
  the local guest or Kiln, and keep liveness idempotent when spawn rows repeat
  every tick.
- **Re-baseline freshly reset decoder sessions.** A decode session that has not
  applied a frame since its last reset adopts the first applicable frame's
  baseline rather than resyncing indefinitely; once a baseline exists, the
  strict delta-gap rule is unchanged. This keeps new clients stable against
  older servers and any future delta emitter, and covers the worker-ready race.
- **Regression coverage**: a JS end-to-end test feeding real gateway-shaped
  snapshot bytes through `wireRealtime` (avatar updates, no clear storm across
  a travel reset, no self/Kiln/numeric duplicate avatars), encoder layout tests
  in JS and Elixir, negotiation tests for `spawn`, and baseline-adoption tests
  for the inline and worker cores.

## Capabilities

### New Capabilities
<!-- none: this repairs the live behavior of existing guarantees -->

### Modified Capabilities
- `player-identity`: "Avatar Differentiation and Remote Movement
  Interpolation" gains the live-binary-path guarantee — avatars update from
  the ongoing entity stream, room transitions do not clear and recreate them,
  and each remote guest owns exactly one avatar while the local player and
  Kiln are never rendered as remote avatars.
- `realtime-binary-protocol`: "Snapshot, delta, and baseline semantics" gains
  the live-flush contract (full-roster flushes are self-validating snapshots
  carrying spawn identity; freshly reset sessions adopt their first baseline)
  and "Additive capability negotiation" gains the `spawn` capability that
  gates the new frame shape for stale clients.

## Impact

- Server (Phoenix): `server_elixir/lib/afterlight/realtime/encoders/binary_soa.ex`,
  `.../world/binary_flush.ex`, `.../afterlight_web/game_channel.ex`,
  `.../realtime/negotiation.ex`; Elixir tests under
  `server_elixir/test/afterlight/realtime/` and
  `server_elixir/test/afterlight_web/`.
- Server (Node legacy transport): `shared/realtime/nodeBinaryFlush.js`,
  `server/world.js`; tests under `tests/realtime/`.
- Client: `src/realtime/wire.js`, `src/realtime/liveBackend.js`,
  `src/realtime/pipeline.js`, `src/realtime/worker/core.js`,
  `src/realtime/worker/decode.worker.js`,
  `src/realtime/wasm/pipelineCore.js`, `shared/realtime/applyFrame.js`,
  `shared/realtime/negotiation.js`.
- Docs/build: `docs/architecture/realtime/compat-report.md` note; regenerated
  `dist/` bundle.
- No save-data, JSON message-catalog, renderer, HUD, or local-player/Kiln
  presentation changes.
