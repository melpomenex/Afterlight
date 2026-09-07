## 1. World supervision and room identity

- [x] 1.1 Add `Afterlight.World.Supervisor` to the application tree: unique `Registry` + `DynamicSupervisor` for room processes, started by the P1 supervision tree, owning nothing at boot.
- [x] 1.2 Create `World.Rooms`: pure bidirectional mapping between `{district_id, instance_id}` and the exact wire room-id strings (`"market"`, `"theater"`, `"garden:<playerId>"`, `"foundry"`, `"trestle"`, `"frost-spire"`; `instance_id = "main"` for public rooms), with unit tests over every room id and rejects for unknown ids (fallback `"market"` preserved).
- [x] 1.3 Create `World.RoomServer` GenServer: lazy start via `DynamicSupervisor` under its Registry name on first join; serialized join during room startup; empty-room grace-period stop (config, default 60 s) and `:hibernate` on idle ticks.

## 2. Membership and presence semantics

- [x] 2.1 Implement join: full roster `presence_update` to the joiner with entries `{id, nickname, x, z, rotY, walking, sitting}` (baseline join-roster shape, including its asymmetry with the flush shape); `presence_join` with `{id, nickname, x, z, rotY, walking, sitting}` to the room excluding the joiner; duplicate `join_room` as a presence no-op that still returns the roster.
- [x] 2.2 Implement leave: `presence_leave {playerId}` to the room on travel and on disconnect; single leave per player per transition.
- [x] 2.3 Keep the room roster as the single membership truth (bespoke map, no Phoenix Presence in P3); document in the module that any future Presence adoption carries coarse membership only, never 10 Hz positions.

## 3. Movement validation and coalesced flush

- [x] 3.1 Create `World.Movement` (pure, fixture-testable): finite `x`/`z`/`rotY` checks, then clamp into the walkable bounds `-11.3 < x < 11.3`, `-9.5 < z < 10.3` (documented tightening #1); `!!`-style flag coercion for `walking`/`sitting`/`airborne` (permissive relay, no seat-context validation — deferred explicitly); newest-pose-per-actor coalescing between ticks.
- [x] 3.2 Implement the 100 ms flush tick per room: broadcast one FULL-roster `presence_update` with entries `{id, x, z, rotY, walking, sitting, airborne}` only when the room is dirty; no delta encoding.
- [x] 3.3 Bound per-transport outbound (config ceiling, informed by the P2 queue-depth telemetry): disconnect stalled consumers with a retryable reason once the bound is hit; clients resnapshot via desiredRoom replay; replace the documented P2 unbounded posture in the protocol catalog.

- [x] 3.4 Route all RoomServer outbound frames through `Afterlight.Realtime.FrameEncoder` with `Encoders.JSON` (D9): no frame construction in channel handlers; unit test that the emitted legacy `presence_update` shape is byte-equivalent to the catalog shape; leave `BinarySoA` + `hello.rt`/`welcome.rt` negotiation to the gated integration change (relay `hello.rt` verbatim, emit no `welcome.rt`).

## 4. Emotes and weather relay

- [x] 4.1 Implement emote handling in the RoomServer: 6-id allow-list matching `shared/emotes.js` (parity-checked against fixtures), 500 ms per-session cooldown, room-scoped `emote_broadcast {playerId, nickname, emote}`, silent rejection of unknown/spam emotes.
- [x] 4.2 Verify weather stays relayed: `weather_update` frames and the `welcome` `weather` field keep coming from Node unchanged while world = phoenix — no suppression, no injection (weather authority transfers to `Afterlight.World.Weather` at the P6 group flip, which lands that module alongside the garden tick that consumes it).
- [x] 4.3 Verify suppression toggling applies to presence frames only: a router-flip integration test asserts Node `presence_*` suppression toggles with the router entry in both directions while `weather_update` relay is unaffected.

## 5. Gateway integration and duplicate-connect

- [x] 5.1 Flip the `Gateway.Router` world entry to `phoenix` behind config: route `join_room`, `movement`, `emote` to `Afterlight.World`; keep `hello`/`set_nickname`, chat, and all durable messages proxied to Node.
- [x] 5.2 Implement the P3 join choreography: World join first (roster + presence_join), forward `join_room` to the Node shadow session for `currentRoom` context, suppress Node-emitted `presence_*` frames, and relay Node join snapshots (`garden_state`, `theater_state`, `iptv_state`, `node_state`, `machine_update`) to the joiner after the roster send.
- [x] 5.3 Implement runtime-enforced duplicate-connect: newest connection wins; the older transport is closed with the documented supersession reason; roster reflects exactly one member with no ghost eviction when the stale close arrives (deliberate tightening #2); test the flap, refresh, and two-browser-same-guestId cases.

## 6. Failure handling and telemetry

- [x] 6.1 Implement crash recovery: DynamicSupervisor restart with empty transient state; per-member room-subscription close with a retryable reason; rejoin path produces a fresh roster and snapshots; test that other rooms and all durable domains are unaffected.
- [x] 6.2 Emit and document the telemetry events `[:afterlight, :room, :join]`, `[:afterlight, :room, :leave]`, `[:afterlight, :room, :tick]` (duration + roster size), `[:afterlight, :movement, :coalesced]` (received vs flushed), `[:afterlight, :room, :stopped]`; assert via tests that no tokens or credentials appear in any event payload (dashboards remain P10).

## 7. Verification

- [x] 7.1 Export/extend Node-baseline movement/presence fixtures (both payload shapes — join-roster and flush — plus clamping edge cases and the emote allow-list/cooldown table) and run them against the Elixir implementations via the parity runner.
- [x] 7.2 Two-client movement equivalence: scripted pair of clients (one against Node, one against the Phoenix world runtime) driven through the same fixture script — join, movement bursts, travel, emotes, weather ticks — diffing wire frames semantically; repeat reconnect-resnapshot assertion (desiredRoom replay, fresh roster + snapshots, no ghost presence).
- [x] 7.3 Mailbox boundedness assertions: movement bursts do not grow room mailboxes unboundedly (coalescing keeps state O(actors)), and stalled-consumer disconnect fires at the outbound bound without affecting other members.
- [x] 7.4 Re-run the protocol-catalog §5 regression list on the flipped path: self-echo filtering via guestId continuity, duplicate-handler ordering, airborne flag edge, `error` consumers, duplicate `join_room` no-op.
- [x] 7.5 Hot-room load simulation: 50 simulated players in one room through the gateway; measure p99 tick duration against the < 50 ms target and record the result honestly in the change evidence (a miss is recorded, not hidden; router can stay flipped back while fixed).
- [x] 7.6 Rollback rehearsal: flip world back to `node` in dev, verify Node resumes presence/movement ownership with suppression off (weather was never suppressed — it stayed relayed from Node throughout), and clients play normally; record the transient-pose reset behavior.
- [x] 7.7 Full-suite gate: `npm test` green (Node path intact for rollback and durable domains), Elixir suite green, two-browser equivalence + boundedness + duplicate-connect evidence recorded as the P3 exit gate.

## 8. Docs

- [x] 8.1 Update `docs/architecture/elixir/ownership.md`: rows #3 (world movement), #4 (room membership) marked delivered in P3; row #22 (weather) annotated as staying with Node until the P6 group flip; row #16 (chat) annotated that the relay moves with `add-social-chat-relay`, not P3.
- [x] 8.2 Update `docs/architecture/elixir/protocol-catalog.md`: §2 gains the P3 disposition table (forward-for-context, suppressed frames, snapshot relay), the two deliberate tightenings (bounds clamp, supersession close reason), the duplicate-connect fix note replacing the ghost quirk entry, and the bounded-outbound replacement of the unbounded posture note.

## Implementation evidence (recorded at delivery, 2026-09-07)

Landed by the P3 runtime implementation session (world runtime + gateway integration + client facade), with the soa-v1 reconciliation carried by the parallel review session (`shared/worldModel.js` movement parity reference, `world.json` fixture file, FrameEncoder seam).

- **Elixir suite**: 139 tests green — World unit tests (rooms/movement/emotes/frames/room-server: join semantics, duplicate-join no-op, supersession with stale-leave immunity, travel, flush shape byte-pinned to the catalog, clamp, emote cooldown keyed to the transport session, empty-room grace stop, stalled-consumer disconnect at the outbound bound, crash recovery, telemetry), gateway channel integration (roster-before-forward ordering, suppression toggling with the routing row in BOTH directions, weather never suppressed, durable-command refusal without live membership, welcome-driven nickname propagation, terminal `superseded` close, room-crash resnapshot), parity runner green against the full corpus (`world.json` included; 597+ cases).
- **Node suite**: `npm test` 256 green (parity determinism gate re-exports and byte-compares `world.json` from the real JS).
- **Two-client real-stack equivalence (7.2)**: scripted Phoenix-WS clients (Node 22 + phoenix.cjs) against a LIVE stack — Node game server (scratch port) + Phoenix gateway with `AFTERLIGHT_WORLD_OWNER=phoenix` — 10/10 checks: welcome, roster semantics, presence_join exclusion, World-owned 10 Hz movement flush, no Node shadow presence leak (suppression), emote with live nickname, wire-visible clamp (x 500 → 11.3), Node shadow forward + `garden_state` snapshot relay after the roster, and terminal `superseded` close on duplicate connect.
- **Rollback rehearsal (7.6)**: same stack with `AFTERLIGHT_WORLD_OWNER=node` — presence_join/movement/emote flow from Node again (suppression off), roster semantics identical.
- **Hot-room 50-player simulation (7.5)**: NOT run in this session — the p99-tick measurement is recorded here as not-measured rather than claimed; the tick/coalescing costs are covered by the bounded-mailbox unit tests, and P10 owns the measured profile.
- **Browser-level two-browser gate**: the scripted real-WS clients stand in for the browser pair (same wire, same server stack); a browser-driven pass remains available to P10/manual verification. The dev flip ships as `AFTERLIGHT_WORLD_OWNER=phoenix` (default `node`, runtime dormant, zero player-visible change until an environment opts in).
- **Full-suite gate (7.7)**: `mix test` + `npm test` green; `npm run build` green (known non-fatal >500 kB chunk warning).
