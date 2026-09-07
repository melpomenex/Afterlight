## 1. World supervision and room identity

- [ ] 1.1 Add `Afterlight.World.Supervisor` to the application tree: unique `Registry` + `DynamicSupervisor` for room processes, started by the P1 supervision tree, owning nothing at boot.
- [ ] 1.2 Create `World.Rooms`: pure bidirectional mapping between `{district_id, instance_id}` and the exact wire room-id strings (`"market"`, `"theater"`, `"garden:<playerId>"`, `"foundry"`, `"trestle"`, `"frost-spire"`; `instance_id = "main"` for public rooms), with unit tests over every room id and rejects for unknown ids (fallback `"market"` preserved).
- [ ] 1.3 Create `World.RoomServer` GenServer: lazy start via `DynamicSupervisor` under its Registry name on first join; serialized join during room startup; empty-room grace-period stop (config, default 60 s) and `:hibernate` on idle ticks.

## 2. Membership and presence semantics

- [ ] 2.1 Implement join: full roster `presence_update` to the joiner with entries `{id, nickname, x, z, rotY, walking, sitting}` (baseline join-roster shape, including its asymmetry with the flush shape); `presence_join` with `{id, nickname, x, z, rotY, walking, sitting}` to the room excluding the joiner; duplicate `join_room` as a presence no-op that still returns the roster.
- [ ] 2.2 Implement leave: `presence_leave {playerId}` to the room on travel and on disconnect; single leave per player per transition.
- [ ] 2.3 Keep the room roster as the single membership truth (bespoke map, no Phoenix Presence in P3); document in the module that any future Presence adoption carries coarse membership only, never 10 Hz positions.

## 3. Movement validation and coalesced flush

- [ ] 3.1 Create `World.Movement` (pure, fixture-testable): finite `x`/`z`/`rotY` checks, then clamp into the walkable bounds `-11.3 < x < 11.3`, `-9.5 < z < 10.3` (documented tightening #1); `!!`-style flag coercion for `walking`/`sitting`/`airborne` (permissive relay, no seat-context validation — deferred explicitly); newest-pose-per-actor coalescing between ticks.
- [ ] 3.2 Implement the 100 ms flush tick per room: broadcast one FULL-roster `presence_update` with entries `{id, x, z, rotY, walking, sitting, airborne}` only when the room is dirty; no delta encoding.
- [ ] 3.3 Bound per-transport outbound (config ceiling, informed by the P2 queue-depth telemetry): disconnect stalled consumers with a retryable reason once the bound is hit; clients resnapshot via desiredRoom replay; replace the documented P2 unbounded posture in the protocol catalog.

- [ ] 3.4 Route all RoomServer outbound frames through `Afterlight.Realtime.FrameEncoder` with `Encoders.JSON` (D9): no frame construction in channel handlers; unit test that the emitted legacy `presence_update` shape is byte-equivalent to the catalog shape; leave `BinarySoA` + `hello.rt`/`welcome.rt` negotiation to the gated integration change (relay `hello.rt` verbatim, emit no `welcome.rt`).

## 4. Emotes and weather relay

- [ ] 4.1 Implement emote handling in the RoomServer: 6-id allow-list matching `shared/emotes.js` (parity-checked against fixtures), 500 ms per-session cooldown, room-scoped `emote_broadcast {playerId, nickname, emote}`, silent rejection of unknown/spam emotes.
- [ ] 4.2 Verify weather stays relayed: `weather_update` frames and the `welcome` `weather` field keep coming from Node unchanged while world = phoenix — no suppression, no injection (weather authority transfers to `Afterlight.World.Weather` at the P6 group flip, which lands that module alongside the garden tick that consumes it).
- [ ] 4.3 Verify suppression toggling applies to presence frames only: a router-flip integration test asserts Node `presence_*` suppression toggles with the router entry in both directions while `weather_update` relay is unaffected.

## 5. Gateway integration and duplicate-connect

- [ ] 5.1 Flip the `Gateway.Router` world entry to `phoenix` behind config: route `join_room`, `movement`, `emote` to `Afterlight.World`; keep `hello`/`set_nickname`, chat, and all durable messages proxied to Node.
- [ ] 5.2 Implement the P3 join choreography: World join first (roster + presence_join), forward `join_room` to the Node shadow session for `currentRoom` context, suppress Node-emitted `presence_*` frames, and relay Node join snapshots (`garden_state`, `theater_state`, `iptv_state`, `node_state`, `machine_update`) to the joiner after the roster send.
- [ ] 5.3 Implement runtime-enforced duplicate-connect: newest connection wins; the older transport is closed with the documented supersession reason; roster reflects exactly one member with no ghost eviction when the stale close arrives (deliberate tightening #2); test the flap, refresh, and two-browser-same-guestId cases.

## 6. Failure handling and telemetry

- [ ] 6.1 Implement crash recovery: DynamicSupervisor restart with empty transient state; per-member room-subscription close with a retryable reason; rejoin path produces a fresh roster and snapshots; test that other rooms and all durable domains are unaffected.
- [ ] 6.2 Emit and document the telemetry events `[:afterlight, :room, :join]`, `[:afterlight, :room, :leave]`, `[:afterlight, :room, :tick]` (duration + roster size), `[:afterlight, :movement, :coalesced]` (received vs flushed), `[:afterlight, :room, :stopped]`; assert via tests that no tokens or credentials appear in any event payload (dashboards remain P10).

## 7. Verification

- [ ] 7.1 Export/extend Node-baseline movement/presence fixtures (both payload shapes — join-roster and flush — plus clamping edge cases and the emote allow-list/cooldown table) and run them against the Elixir implementations via the parity runner.
- [ ] 7.2 Two-client movement equivalence: scripted pair of clients (one against Node, one against the Phoenix world runtime) driven through the same fixture script — join, movement bursts, travel, emotes, weather ticks — diffing wire frames semantically; repeat reconnect-resnapshot assertion (desiredRoom replay, fresh roster + snapshots, no ghost presence).
- [ ] 7.3 Mailbox boundedness assertions: movement bursts do not grow room mailboxes unboundedly (coalescing keeps state O(actors)), and stalled-consumer disconnect fires at the outbound bound without affecting other members.
- [ ] 7.4 Re-run the protocol-catalog §5 regression list on the flipped path: self-echo filtering via guestId continuity, duplicate-handler ordering, airborne flag edge, `error` consumers, duplicate `join_room` no-op.
- [ ] 7.5 Hot-room load simulation: 50 simulated players in one room through the gateway; measure p99 tick duration against the < 50 ms target and record the result honestly in the change evidence (a miss is recorded, not hidden; router can stay flipped back while fixed).
- [ ] 7.6 Rollback rehearsal: flip world back to `node` in dev, verify Node resumes presence/movement ownership with suppression off (weather was never suppressed — it stayed relayed from Node throughout), and clients play normally; record the transient-pose reset behavior.
- [ ] 7.7 Full-suite gate: `npm test` green (Node path intact for rollback and durable domains), Elixir suite green, two-browser equivalence + boundedness + duplicate-connect evidence recorded as the P3 exit gate.

## 8. Docs

- [ ] 8.1 Update `docs/architecture/elixir/ownership.md`: rows #3 (world movement), #4 (room membership) marked delivered in P3; row #22 (weather) annotated as staying with Node until the P6 group flip; row #16 (chat) annotated that the relay moves with `add-social-chat-relay`, not P3.
- [ ] 8.2 Update `docs/architecture/elixir/protocol-catalog.md`: §2 gains the P3 disposition table (forward-for-context, suppressed frames, snapshot relay), the two deliberate tightenings (bounds clamp, supersession close reason), the duplicate-connect fix note replacing the ghost quirk entry, and the bounded-outbound replacement of the unbounded posture note.
