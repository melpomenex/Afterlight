## Context

See proposal.md — Why. Current behavior that shapes the fix:

- **The live flush is a full roster, encoded as a delta.** The room runtime's
  `Frames.flush/3` is documented as "FULL roster in join order, no delta
  encoding" (`server_elixir/lib/afterlight/world/frames.ex:47-55`), and the
  JSON path sends it that way. For `rt`-negotiated sockets,
  `game_channel.ex:1495-1507` converts it with
  `BinaryFlush.encode_flush/3`, which always builds
  `%RealtimeFrame{frame_type: :delta, baseline_sequence: max(seq - 1, 0)}`
  (`server_elixir/lib/afterlight/world/binary_flush.ex`); the Node direct
  server mirrors it (`shared/realtime/nodeBinaryFlush.js`,
  `server/world.js:141-160`). Both carry only TRANSFORM + FLAGS.
- **The server encoder cannot emit lifecycle sections.**
  `Afterlight.Realtime.Encoders.BinarySoA` explicitly states that
  spawn/despawn with string tables are "carried by `Encoders.Snapshot` work in
  a later iteration" and writes only SORTED_IDS transform + flags
  (`binary_soa.ex:8-12, 25-36`). `RealtimeFrame` already models
  `spawn`/`despawn` (`realtime_frame.ex:12-30`), and
  `docs/architecture/realtime/compat-report.md` §1.2-1.4 records the intended
  contract: presence is 10 Hz full-roster snapshots, and spawn records carry
  the guestId string once so the client resolves identity.
- **Client sessions reset while the server sequence keeps counting.** The
  `wireRealtime` send wrapper calls `pipeline.reset()` on every `JOIN_ROOM`
  (`src/realtime/wire.js:198-204`); `wireRealtime`'s `onResync` clears remotes
  and replays `JOIN_ROOM` (`src/realtime/wire.js:127-130`); the Phoenix
  gateway's `rt_seq` is per transport and never reset on room change
  (`game_channel.ex:1500, 1507`); and frames arriving before the worker is
  ready are dropped (`src/realtime/pipeline.js:105-107`). Any of these leaves
  `session.frameSequence` behind the next frame's `baseline_sequence`, so
  `shared/realtime/applyFrame.js:42-46` (and the WASM equivalent,
  `src/realtime/wasm/pipelineCore.js:32-35`) return `resync` for every flush.
  `onResync` then clears and rejoins again: a self-sustaining 10 Hz
  clear/recreate cycle — the flicker — whenever a remote avatar exists.
- **The binary path cannot update avatars even when baselines match.**
  `PipelineCore.applyFrame` only fills pack rows for ids already in its
  `EntityStore` (`src/realtime/worker/core.js:87-131`), and the live path never
  seeds that store: JSON presence goes to `LiveRemoteBackend` /
  `RemotePlayersManager`, not to the core. A real `encodeFlush` frame fed
  through `wireRealtime` produces zero `setPlayer` updates, so only the join
  roster JSON moves remote avatars today.
- **Avatar creation is keyed optimistically.** `LiveRemoteBackend.applyDeltaPack`
  resolves `guestId = j.guestId ?? j.id` and `this.live++` for every joined row
  (`src/realtime/liveBackend.js:25-41`); WASM spawn rows carry
  `guestId: null` with the numeric `entityId` as `id`
  (`src/realtime/wasm/pipelineCore.js:53-63`), so repeated snapshot spawns
  would create numeric-keyed duplicate avatars and inflate liveness. `wire.js`
  also re-creates avatars for the local guest when spawn rows are present
  (`src/realtime/wire.js:98-122`), which today is unreachable because no spawn
  frames exist.

## Goals / Non-Goals

**Goals:**

- Remote avatars update their position, rotation, and pose flags from the
  negotiated binary stream, not only from join-time messages.
- Room travel, rejoin, and worker/renderer restarts never clear and recreate
  remote avatars in a loop; the visible result is a stable avatar that keeps
  moving.
- Each remote guest owns exactly one avatar keyed to their guest id; no
  numeric-placeholder duplicates and no remote avatars for the local guest or
  Kiln.
- An in-flight un-upgraded client keeps its previous decode behavior (delta
  shape) so a staged deploy cannot regress it.
- The server frames remain protocol v1 (`afterlight-soa-v1`) and the existing
  delta semantics stay valid for callers that track per-client state.

**Non-Goals:**

- Flipping or changing the WebGPU instanced proxy fast path (stays opt-in and
  default off).
- Implementing per-client delta extraction or spatial interest management for
  the live flush; the server still encodes one full roster per tick.
- Adding DESPAWN lifecycle emission to the live snapshot path: snapshot
  application resets entity state wholesale, and avatar removal on leave
  already rides the JSON `presence_leave` bridge.
- Changing save data, the frozen JSON message catalog, the renderer, HUD,
  local-player/Kiln presentation, or the theater/social features.

## Decisions

**1. Encode the live flush as a FULL snapshot, not a delta.**

The server's source of truth is already a full roster; labeling it a delta
invented a baseline dependency the payload never needed. FULL snapshots are
self-validating (`applyFrame` replaces state wholesale and ignores baselines),
so the three reset paths (travel, rejoin, worker start) apply the next flush
instead of resyncing, and the SPAWN + STRING_TABLE sections populate the
client store so binary transform/flags rows update real avatars.

*Alternatives considered:* (a) keep the delta and fix the client only
(baseline adoption plus synthesizing a store seed from JSON presence) —
rejected: more moving parts in the pipeline/worker/WASM, and it leaves the
server mislabeling a snapshot as a delta; (b) per-client delta tracking in the
gateway — deferred: correct and smaller on the wire, but adds per-socket
state/interest logic this defect does not need, and the live frame stays below
the JSON flush it replaces. `DELTA`, baseline semantics, and chunking remain
fully supported.

*Cost:* a snapshot carries spawn (28 B/row) + string table (~38 B/member) +
transform/flags per tick. For place-sized rooms this is still smaller than the
JSON flush the non-negotiated path already sends at 10 Hz; the 1 MiB frame cap
and `SNAPSHOT_CHUNK` types remain available if a room ever exceeds it.

**2. Implement lifecycle encoding once per language, mirrored.**

`BinarySoA` gains DENSE STRING_TABLE + SPAWN section encoding and sets the
header `HAS_STRING_TABLE` flag, with section order matching the JS reference
writer (`shared/realtime/writer.js:26-73`); `BinaryFlush` gains
`encode_snapshot/3` building a `:full_snapshot` `RealtimeFrame` whose spawn
rows carry `guest_id`, zero archetype/variant, and the member pose.
`nodeBinaryFlush.js` gains `encodeSnapshot/3` built on the existing
`writeFrame` (it already supports spawn + string tables + despawn), and
`server/world.js` uses it for `rt` sessions. The existing delta encoders and
their tests stay untouched as the reference for baseline-tracking callers.

**3. Gate the new frame shape on an additive `spawn` capability.**

A stale browser tab running the previous bundle decodes WASM spawn rows
without guest ids; `LiveRemoteBackend`'s `guestId ?? id` fallback would then
create a second, numeric-keyed avatar next to the JSON-roster avatar. To make
the deploy safe in both directions, `hello.rt` gains `"spawn": bool`
(`shared/realtime/negotiation.js`, `negotiation.ex`). The gateway emits
lifecycle-carrying snapshots only to clients that advertise it and keeps the
previous delta conversion for every other negotiating client. New client +
old server stays on deltas and is stabilized by decision 5; old client + new
server is byte-for-byte unchanged.

**4. Client identity and liveness are authoritative.**

`LiveRemoteBackend.applyDeltaPack` resolves each row's guest id from the
existing id map (seeded by the JSON presence bridge) before touching an
avatar:

- rows with a resolvable guest id create/update exactly that avatar;
- spawn rows with no resolvable guest identity are skipped (the JSON
  `presence_join`/roster owns avatar creation) instead of keying a placeholder
  under the numeric entity id;
- the joined-row fast path never overwrites a known guest mapping with a
  numeric id;
- liveness is tracked by a key set and is idempotent across the spawn rows
  that now repeat every tick.

`wireRealtime` stops re-creating avatars for the local guest and Kiln when an
entity session is active; the backend's `excludedIds` already defines that
boundary for the remote-avatar path. The Node legacy transport also gains the
same JSON `rt_binary` envelope decode the Phoenix transport already performs
(`binaryBufferFromEnvelope`), because direct-Node rt clients previously
received the envelope but never routed it to `handleBinary`: the binary flush
delivered nothing at all on that transport. Found and fixed during the
headless two-client integration.

**5. A freshly reset decoder session adopts its first baseline.**

`applyFrame` accepts `opts.adoptBaseline`; the pipeline arms it on
construction and on `reset()` (which covers travel, rejoin, and worker
restart) and clears it after the first applied frame. `WasmPipelineCore`
realigns with `store.resetTo(epoch, baseline, true)` when it sees
`OK_RESYNC_NEEDED` while unbaselined, then retries; because the Rust decoder
rejects delta rows for unknown ids, an all-unknown delta against an empty
store commits its sequence and continues rather than resyncing forever (an
old server never delivers a spawn snapshot). Once a baseline exists the
strict gap rule and the resync/rejoin recovery are unchanged. This is
defense-in-depth for the mixed-version window and for any future delta
emitter; it also makes the worker-ready frame drop harmless.

**6. Verification is end-to-end at the avatar boundary.**

The core regression test exercises `wireRealtime` with a `RemotePlayersManager`
map and real snapshot bytes from `nodeBinaryFlush.encodeSnapshot` — the same
bytes the gateway emits — covering: movement updates arrive; a travel-style
`JOIN_ROOM` reset followed by snapshots causes no `clear`/resync storm; a
snapshot containing the local guest and Kiln creates no remote avatars; and
WASM-shaped spawn rows without guest ids create no numeric duplicates. Encoder
layout tests run in JS and Elixir, and the existing
`gateway-binary-convergence` / `wasm-pipeline` suites stay green.

## Risks / Trade-offs

- [Snapshot bytes grow with roster size] → Still below the JSON flush the
  legacy path already sends at 10 Hz for place-sized rooms; `SNAPSHOT_CHUNK`
  and the 1 MiB cap cover pathological rooms if they ever appear.
- [WASM decode exposes no guest id for spawn rows] → Identity resolves from
  the JSON presence bridge; a player whose first snapshot lands before their
  join message gets their avatar when the join arrives (the current behavior),
  and there is no placeholder avatar in the meantime. Exposing
  `out_spawn_sref` and parsing the frame string table in the worker is a
  possible follow-up, not required here.
- [New client against an old server] → The old server ignores `spawn` and
  keeps sending deltas; adoption prevents the resync loop but binary motion
  stays unavailable (pre-existing). Deploys pair both sides; the capability
  gate makes single-side rollbacks safe.
- [The pending `fix-remote-avatar-proxies` change modifies the same
  `player-identity` requirement] → Archive that change first (or rebase this
  delta's requirement text at archive time) so its shipped-full-avatars
  guarantee is not lost.
- [Elixir tooling unavailable in some verification environments] → Run the
  JS encoder/parity tests and the browser smoke check; report any Elixir test
  that could not be executed rather than claiming it passed.

## Migration Plan

No data migration. The gateway switch is capability-gated per client, so the
backend can deploy before the frontend without affecting stale tabs, and the
frontend can roll back independently (old clients negotiate without `spawn`).
Roll back by reverting both sides; a new client left against an old server
degrades to the previous delta behavior with the resync loop suppressed.
Refresh the committed `dist/` bundle with `npm run build` as part of the
change.
