# Design: World Room Runtime (P3)

## Context

P2 (add-phoenix-gateway-transport) put the existing client's traffic through the Phoenix gateway with every game domain still relayed to Node. The world state this change moves is small and precisely documented (`server/world.js` + protocol-catalog §1/§2):

- Membership: a `clients` map (playerId → session) and a `rooms` map (roomId → Set<playerId>); `presence_join` carries `{player: {id, nickname, x, z, rotY, walking, sitting}}` and excludes the joiner; duplicate `join_room` is a presence no-op; `presence_leave` fires on travel and disconnect; the joiner gets a full roster `presence_update`.
- Movement: client self-throttles to 80 ms; server validates **finite x/z/rotY only** (no bounds check today), coerces flags with `!!`, marks the room dirty, and flushes dirty rooms every 100 ms with FULL roster snapshots — join-roster entries carry `{id, nickname, x, z, rotY, walking, sitting}` while flush entries carry `{id, x, z, rotY, walking, sitting, airborne}` (this asymmetry is wire-observed behavior, not a bug to fix here).
- Emotes: 6-id allow-list (`wave`, `dance`, `cheer`, `heart`, `bow`, `shrug`), 500 ms cooldown, `emote_broadcast {playerId, nickname, emote}` room-scoped.
- Weather: 3-minute rotation `clear → drizzle → rain` in `server/index.js`, broadcast to ALL; `welcome` carries the current weather.
- Known quirks to fix deliberately: duplicate guestId overwrites the session map (old socket lingers; first close evicts the survivor — ghosts), and no slow-client handling anywhere.

Client contract constraints: room-id strings (`market`, `theater`, `garden:<playerId>`, `foundry`, `trestle`, `frost-spire`) are on the wire; the snapshot ordering `join_room` → roster → room snapshots is load-bearing; Node gates `garden_action` (room ownership) and `node_harvest` (district match) on `session.currentRoom`, so Node must keep learning about room membership even after the world flip. `runtime.md` prescribes Registry + DynamicSupervisor + room owner GenServers, bounded mailboxes, newest-movement-per-actor coalescing, and Presence-for-coarse-membership-only-if-adopted.

The parallel (now-archived) `add-realtime-binary-protocol` change ships an additive binary data plane (`afterlight-soa-v1`): pure codecs in `shared/realtime/`, the `Afterlight.Realtime.FrameEncoder` behaviour with `Encoders.JSON`/`Encoders.BinarySoA`, and capability-negotiation fields (`hello.rt` / `welcome.rt`) specified but deliberately not wired into live traffic. This change consumes that seam.

## Goals / Non-Goals

**Goals**

- One supervised owner per active room owning ALL transient world state; lazy start; bounded lifetime when empty.
- Byte-compatible membership and presence semantics (§1 payloads, exclusion, duplicate-join no-op, leave on travel/disconnect) proven by fixtures against the Node baseline.
- Movement: same 10 Hz full-roster flush, plus explicit validation additions (bounds clamp, server-owned arrival time) documented as deliberate tightenings.
- Bounded resource behavior: no selective receive, newest-pose-per-actor coalescing, bounded outbound per transport with disconnect/resnapshot for stalled consumers.
- Allow-listed emotes owned by the runtime; weather stays Node-owned and relayed (no P3 flip — authority transfers at the P6 group flip, with gardens/economy which consume it).
- Duplicate-connect: newest wins, older transport closed with a reason, zero ghost members.
- Crash containment: room crash → restart → forced rejoin → fresh snapshot; durable domains untouched.

**Non-Goals**

- **Chat does not move in P3.** The chat relay and history ring stay proxied to Node (this includes `chat_send`/`chat_message`/`chat_dm`/`chat_history`/`chat_presence`/`chat_error`); moving them here would entangle the Node IRC bridge boundary. Chat moves to `Afterlight.Social` in `add-social-chat-relay` (P7 window; ownership matrix row #16 annotated accordingly; IRC remains Node through P7+).
- No durable domain moves; no PostgreSQL writes of any kind; no data model (all state is transient process memory).
- No Phoenix Presence adoption in P3 (see D5); no spatial interest groups (crowding is a measured, later concern).
- No authoritative physics/speed simulation — movement stays "finite, clamped, relayed"; input-based simulation is a separate future change.
- No seat-context or state-transition validation yet: `sitting`/`airborne` stay client-relayed flags in P3 (permissive as today); tightening them is explicitly deferred and must come with client-visible rules, not silently.
- No distributed room ownership, leases, or epochs (P9); no multi-node room placement.
- No new wire message types; the catalog is frozen except for the two documented tightenings (bounds clamp behavior, duplicate-transport close reason).

## Decisions

### D1 — Room identity: `{district_id, instance_id}` internally, exact wire strings preserved
*Decision:* Rooms are addressed internally as `{district_id, instance_id}` with `instance_id = "main"` for public rooms (`market`, `theater`, `foundry`, `trestle`, `frost-spire`) and `{"garden", playerId}` for personal gardens. A pure bidirectional mapping (`World.Rooms`) derives the wire id: public rooms map identity-to-id (`"market"`), gardens map to `` `"garden:<playerId>" `` — so clients join with today's exact strings and every wire payload keeps today's `roomId` shapes. PubSub topics follow `runtime.md`: `room:<district_id>:<instance_id>` plus a global topic for weather/all-client broadcasts.
*Alternative Considered:* Keeping bare wire strings as process keys — rejected: it would bake the `garden:<id>` string convention into the runtime just before P4 changes what identity is; the tuple isolates that decision.

### D2 — Supervision: Registry + DynamicSupervisor + RoomServer per room; lazy start; graceful empty-room stop
*Decision:* `World.Supervisor` owns a unique Registry and a DynamicSupervisor. The first `join_room` for a room starts its `RoomServer` via the DynamicSupervisor under its Registry name; `join_room` on a starting room is serialized through the supervisor call so the joiner is never dropped. When a room has been empty for a grace period (config, default 60 s) it saves nothing (there is nothing to save), broadcasts nothing (nobody is there), and stops; a later join starts it fresh with an empty roster — matching today's observable behavior where an empty room's membership vanishes. RoomServers call `:hibernate` after idle ticks to shrink memory.
*Alternative Considered:* One GenServer for all rooms — rejected outright by `runtime.md` (no global GenServer; partition workers per room instance).

### D3 — Bounded mailboxes: selective-receive avoidance, newest-pose-per-actor coalescing, bounded outbound
*Decision:* (a) RoomServers avoid selective receive — movement arrives as ordinary `handle_call`/`handle_info` messages that mutate a `poses` map, so the mailbox drains at frame rate rather than scanning. (b) Between 100 ms flush ticks, `World.Movement` keeps only the newest pose per actor (validated writes overwrite in place; no queue of intermediate positions exists), and telemetry counts coalesced-away updates. (c) The flush tick marks the room dirty only when something moved and emits one FULL-roster `presence_update` broadcast — no deltas. (d) Per-transport outbound is bounded (config-driven buffer ceiling inherited from the P2 queue-depth telemetry): a stalled consumer is disconnected with a retryable reason and resnapshots on rejoin, instead of queueing unbounded frames — the protocol catalog's documented P2 posture is replaced by enforcement here.
*Alternative Considered:* GenStage/backpressure pipeline for movement — rejected: a dedicated flow-control library for one coalescing rule adds moving parts; a map-overwrite plus tick broadcast is the entire semantics and is trivially testable.

### D4 — Movement validation: existing finite checks + deliberate world-bounds clamp + server-owned arrival time; flags stay permissive
*Decision:* Validation becomes: finite `x`/`z`/`rotY` (existing behavior), then clamp `x`/`z` into the walkable bounds `-11.3 < x < 11.3`, `-9.5 < z < 10.3` (the market/district bounds the client already enforces via `src/world/bounds.js`, so legitimate clients never hit the clamp — this is **deliberate tightening #1**, closing the door on out-of-bounds teleports from modified clients); flags continue to be coerced `!!` and relayed (sitting/airborne remain presentation-only; seat-context validation is explicitly future work); arrival time is stamped server-side on receipt and used for tick bookkeeping and telemetry — it is not added to the wire (no format change). Out-of-bounds input is clamped, not rejected, so behavior degrades gracefully and identically for everyone.
*Alternative Considered:* Velocity/elapsed-time plausibility checks now — rejected: without lag-compensated client prediction reconciliation this would punish legit players on jittery links; `runtime.md` lists it as a later, separate change.

### D5 — Presence is a bespoke roster map in the RoomServer; Phoenix Presence is not adopted in P3
*Decision:* The RoomServer's roster map (playerId → pose + nickname) is the single membership truth, replicated to subscribers only as message broadcasts — exactly like Node's Maps, but supervised. Phoenix Presence is deferred: its CRDT-style diffs would introduce a second membership representation to keep consistent with room state, and it must never carry 10 Hz positions (`runtime.md`). When multi-node ownership (P9) needs cluster-visible coarse membership, Presence may be adopted for that narrow purpose only, positions excluded.
*Alternative Considered:* Phoenix Presence for coarse membership now — rejected: it solves a distribution problem P3 does not have, at the cost of a parallel truth source during the exact phase where parity with Node semantics is the gate.

### D6 — Join choreography across the boundary: forward for context, suppress duplicates, relay Node snapshots
*Decision:* On `join_room` with world = phoenix: (1) the RoomServer performs the world join — roster `presence_update` to the joiner, `presence_join` (joiner excluded, duplicate join a no-op) to the room; (2) the gateway still forwards `join_room` to the Node shadow session so Node's `currentRoom` gating (`garden_action` ownership, `node_harvest` district match, theater/catalog room checks) keeps working; (3) the Node proxy **suppresses** Node-emitted `presence_join`/`presence_leave`/`presence_update` (World is the single presence writer) while Node's `weather_update` stays relayed (D7 — Node owns weather until P6); (4) Node's join-time domain snapshots (`garden_state`, `theater_state`, `iptv_state`, `node_state`, `machine_update`) are relayed to the joiner, after the World roster send — preserving the documented `join_room` → roster → snapshots ordering. On disconnect, World emits `presence_leave` to the room and the shadow close is suppressed likewise. Travel = leave old room + join new with identical semantics.
*Alternative Considered:* Teaching Node to stop tracking rooms (dropping the forward) — rejected: it would break Node-side domain gating a phase before those domains move, and would complicate rollback.

### D7 — Weather does NOT flip in P3: Node stays the weather writer until the P6 group flip; the runtime keeps relaying it
*Decision:* The runtime does not take weather in P3 (review correction — the earlier draft had P3 owning weather, which would have left the garden tick's `isRaining` input and the world rotation on different servers with no consumer on the Elixir side). Node remains the sole weather writer: its 3-minute `clear → drizzle → rain` rotation keeps broadcasting `weather_update {weather}` to all clients, the Node proxy relays those frames unsuppressed, and `welcome.weather` stays Node-built exactly as in P2. `Afterlight.World.Weather` (deterministic rotation anchored to a fixed server epoch) therefore lands with the P6 economy-group flip — the same change whose garden tick consumes `is_raining` — at which point the gateway starts dropping Node's `weather_update` and injecting the runtime state into `welcome`, making exactly one writer of weather per routing position. On a P3 rollback there is nothing weather-related to toggle: it never stopped flowing from Node.
*Alternative Considered:* Owning weather in P3 as originally drafted — rejected in review: a P3-owned `World.Weather` would have no Elixir consumer until P6, and splitting "who broadcasts weather" from "who needs weather" across phases invites the exact split-brain the umbrella forbids, while P3-only rollback semantics got murkier for zero benefit.

### D8 — Duplicate-connect: newest connection wins; the older transport is closed with a reason; no ghosts
*Decision:* P2's gateway-side rule becomes a runtime invariant: when a second transport arrives for an identity, the older transport is closed with a documented close reason (`superseded`), the room roster updates exactly once (`presence_leave` for the old connection only if it was a different room, otherwise nothing — the player never leaves the roster), and the surviving connection resnapshots. At no point does a stale connection's disappearance remove the *current* member — Node's "first close evicts the survivor" quirk is structurally impossible. This is **deliberate tightening #2**: a stale duplicate tab now observes a clean close instead of silently becoming a zombie.
*Alternative Considered:* Rejecting the newer connection instead — rejected: reconnect storms and tab refreshes are the common case; the newest connection is the one the player is looking at.

### D9 — Failure: restart, force rejoin, resnapshot; durable untouched
*Decision:* A crashed RoomServer is restarted by the DynamicSupervisor with empty transient state. The gateway detects membership loss per affected transport, closes the room-side subscription with a retryable reason, and lets the client's existing reconnect machinery (`desiredRoom` replay) rejoin — receiving fresh roster + snapshots from the restarted room. Members of other rooms are unaffected; no durable state is read or written during recovery (nothing was lost but poses).
*Alternative Considered:* Stateful room restarts (snapshot to ETS on every tick) — rejected: it re-creates the ghost-resurrection problem (stale rosters returning from the dead) for zero benefit; transient means transient.

### D10 — Telemetry events named now; dashboards stay P10
*Decision:* Emit and document now: `[:afterlight, :room, :join]` (room, player), `[:afterlight, :room, :leave]` (room, player, reason), `[:afterlight, :room, :tick]` (duration_ms, roster size), `[:afterlight, :movement, :coalesced]` (per tick: received vs flushed counts), `[:afterlight, :room, :stopped]` (room, lifetime). Metrics scraping, dashboards, and alert thresholds are P10 (`add-observability-security-loadtesting`); naming the events now fixes the observability contract without pulling that scope forward.
*Alternative Considered:* Defining telemetry in P10 — rejected: retrofitting event names across a runtime that already shipped tends to lose the tick/coalescing context that only exists at the source.

## Risks / Trade-offs

- *[Presence payload asymmetry (nickname on join-roster, airborne on flush) mis-ported]* → fixtures pin both shapes field-for-field from the Node baseline; the equivalence suite diffs wire frames between a Node and a Phoenix client pair.
- *[Join ordering regression (roster before Node snapshots)]* → D6 makes the ordering explicit; the scripted two-browser test asserts roster-then-snapshot order on every room type, including `garden:<playerId>`.
- *[Clamp changes behavior for edge clients]* → the clamp equals the client's own bounds; the only observable difference is that modified/buggy clients can no longer stand outside the map — documented as deliberate tightening #1.
- *[Hot rooms slower through the runtime than Node]* → the 50-player simulation measures p99 tick against the < 50 ms target honestly; if the target is missed the result is recorded and the router can stay flipped back (rollback) while it is fixed.
- *[Rollback resets transient poses]* → accepted and documented: flipping world back to Node is a pure transport change; players reappear at spawn/last-Node-known poses exactly as after a Node restart today. No durable state is involved.
- *[Many garden rooms = many processes]* → gardens are 1:1 with players who open them; lazy start + grace-period stop bounds population to active players, and hibernation shrinks idle ones; measured in the load sim.
- *[Suppression rules silently eating Node frames after a rollback flip-flop]* → the proxy suppression is keyed on the same router entry as the flip (single source of truth); a router-flip integration test asserts suppression and injection toggle together in both directions.

## Migration Plan

1. Land `Afterlight.World` + tests with the router still `node` for world (runtime dormant but supervised) — zero player-visible change.
2. Flip world → `phoenix` in dev; run fixture equivalence (movement/presence vs Node baseline), the two-browser scripted suite, mailbox boundedness tests, and the duplicate-connect tests; run the hot-room 50-player simulation and record p99 tick against the < 50 ms target.
3. Deploy the flip per environment. Rollback at any point: flip the router entry back to `node` — pure transport change, no durable state, suppression/injection toggles off with it (transient poses reset, documented).
4. Exit gate: two clients see equivalent state, reconnect resnapshots, no mailbox growth; ownership matrix rows #3/#4 annotated as delivered (#22 weather stays Node until the P6 group flip).

Phase gate (exit P3): supervised rooms own movement/membership/emotes; reconnect resnapshots; no unbounded mailbox growth; Node keeps every durable domain, the chat relay, and weather.

### D9 — Emission goes through the FrameEncoder behaviour; binary fanout stays a config flip away (reconciliation with add-realtime-binary-protocol)
*Decision:* RoomServer outbound frames (join rosters, flushes, presence events) are produced through `Afterlight.Realtime.FrameEncoder` with `Encoders.JSON` selected unconditionally in P3 — its output is the legacy `presence_update` shape, so the frozen catalog and non-negotiating clients are untouched. P3 relays any client-sent `hello.rt` field verbatim (additive, Node ignores it) but emits no `welcome.rt` and no binary frames: per that change's own gate, live binary adoption (negotiation + delta extraction + the BinarySoA flip behind config) is a separate gated change built on P3's room runtime.
*Alternative Considered:* (a) Wiring BinarySoA fanout for negotiating clients now — rejected: stacks a wire-format change onto a runtime-ownership change and doubles the P3 gate. (b) Hand-building frames in the RoomServer and bolting the encoder on later — rejected: the whole point of the behaviour is that channel handlers never touch frame construction; retrofitting ownership code is costlier than starting on the seam.
