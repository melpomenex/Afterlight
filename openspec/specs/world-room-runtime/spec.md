# world-room-runtime

## Purpose

Transient world state — room membership, movement, presence, emotes — is owned by supervised OTP room processes in `Afterlight.World` instead of Maps inside the Node server. The compatibility target is the exact wire behavior documented in `docs/architecture/elixir/protocol-catalog.md` (message catalog §1, transport semantics §2): the same room-id strings, the same membership payloads, the same 10 Hz full-roster flush — with two deliberate tightenings (a server-side bounds clamp and a clean duplicate-transport close) and deliberate fixes to Node's ghost-session quirk. Node remains authoritative for all durable domains, the chat relay, and weather, which continue through the P2 boundary proxy (weather authority transfers at the P6 group flip, not here).

## Requirements

### Requirement: Room lifecycle and identity

The system SHALL run one supervised RoomServer process per active room under a DynamicSupervisor with a unique Registry, starting a room lazily on its first join and stopping it after an empty period beyond a configured grace interval. Rooms SHALL be identified internally as `{district_id, instance_id}` with `instance_id` fixed to `"main"` initially (personal gardens as `{"garden", playerId}`), and the wire SHALL keep the exact historical room-id strings — `market`, `theater`, `garden:<playerId>`, `foundry`, `trestle`, `frost-spire` — so clients join with unchanged `join_room {roomId}` payloads. No room state SHALL be persisted: rooms, rosters, poses, and cooldowns are process memory only (the weather phase likewise stays in Node process memory until the P6 flip).

#### Scenario: First join starts the room

- **WHEN** a player sends `join_room {roomId: "foundry"}` and no RoomServer exists for it
- **THEN** a RoomServer is started lazily and the player joins the freshly created room

#### Scenario: Empty room retires

- **WHEN** every member has left a room and the grace period elapses with no new joins
- **THEN** the RoomServer stops, and a later join starts a fresh room with an empty roster without error

#### Scenario: Wire room ids unchanged

- **WHEN** a player joins their personal garden
- **THEN** the join and every subsequent message use the exact string `garden:<playerId>` as the room id on the wire

### Requirement: Join and membership semantics

Room joins SHALL reproduce the documented Node semantics exactly: the joiner receives a full roster `presence_update` of existing members with entries `{id, nickname, x, z, rotY, walking, sitting}`; the room receives `presence_join` carrying the joiner's `{id, nickname, x, z, rotY, walking, sitting}` with the joiner excluded; a duplicate `join_room` for the current room SHALL be a presence no-op; and `presence_leave {playerId}` SHALL fire to the room on travel and on disconnect. While the world domain is routed to the runtime, it SHALL be the single writer of presence: the Node proxy SHALL forward `join_room` to the Node shadow session for membership context (Node still gates domain actions on the current room) and SHALL suppress Node-emitted presence frames, while Node's join-time domain snapshots (`garden_state`, `theater_state`, `iptv_state`, `node_state`, `machine_update`) are still relayed to the joiner after the roster send. A successful `set_nickname` SHALL be propagated to the owning RoomServer so roster entries, later joins' rosters, and `emote_broadcast` nicknames reflect the new name immediately — the Node baseline reads nickname live at emit time, and a stale name after a mid-session rename would be an undeclared parity failure.

#### Scenario: Joiner sees the roster, others see the join

- **WHEN** a player joins a room that already holds two members
- **THEN** the joiner receives one `presence_update` listing both members with nicknames and poses, and each existing member receives one `presence_join` for the joiner that does not echo back to the joiner

#### Scenario: Duplicate join is a no-op

- **WHEN** a member re-sends `join_room` for the room they are already in (as the client does on every reconnect)
- **THEN** no `presence_join` or `presence_leave` is emitted to the room, and the member still receives a full roster

#### Scenario: Travel and disconnect leave once

- **WHEN** a member travels to another room or their transport disconnects
- **THEN** the remaining members receive exactly one `presence_leave` for that player

#### Scenario: Join snapshots still arrive from Node

- **WHEN** a player joins the theater through the gateway with the world runtime active
- **THEN** they receive the World roster first and the Node-owned `theater_state`/`iptv_state` snapshots afterwards, each exactly once

#### Scenario: Mid-session rename is visible everywhere

- **WHEN** a member's `set_nickname` succeeds while the world runtime owns their room presence
- **THEN** subsequent rosters served to later joiners and that member's next `emote_broadcast` carry the new nickname, matching the Node baseline's live-read behavior

### Requirement: Movement validation

Movement handling SHALL validate that `x`, `z`, and `rotY` are finite (existing behavior) and SHALL clamp `x` and `z` into the walkable bounds `-11.3 < x < 11.3` and `-9.5 < z < 10.3` before storing a pose — a deliberate, documented tightening that is invisible to legitimate clients because the client already clamps to the same bounds. Flag fields (`walking`, `sitting`, `airborne`) SHALL remain permissively relayed as today (no seat-context or state-transition validation in this phase, explicitly deferred), and arrival time SHALL be owned by the server internally without adding fields to the wire. The client's 80 ms send throttle and the flat `movement` payload are unchanged.

#### Scenario: Out-of-bounds pose is clamped

- **WHEN** a modified client sends `movement {x: 500, z: -500, ...}`
- **THEN** the stored and broadcast pose is clamped inside the walkable bounds instead of appearing outside the map

#### Scenario: Legitimate movement is unaffected

- **WHEN** a normal client walks within the play area
- **THEN** its poses are stored and broadcast unmodified, because the client never sends coordinates outside the bounds

#### Scenario: Non-finite input is dropped

- **WHEN** a client sends `movement` with a non-finite `x`, `z`, or `rotY`
- **THEN** the update is ignored and the actor's last valid pose is unchanged

### Requirement: Coalesced flush and bounded mailboxes

The runtime SHALL flush dirty rooms every 100 ms with FULL roster snapshots (`presence_update {players: [{id, x, z, rotY, walking, sitting, airborne}]}` per actor — no delta encoding), coalescing movement so that only the newest pose per actor survives per tick. Room processes SHALL avoid selective receive so mailboxes drain at frame rate, and per-transport outbound SHALL be bounded: a stalled or too-slow consumer SHALL be disconnected with a retryable reason and resnapshot on rejoin rather than allowing unbounded frame queueing (replacing the documented unbounded Node posture).

#### Scenario: Burst of movement coalesces to one snapshot

- **WHEN** an actor sends 15 valid movement updates between two flush ticks
- **THEN** the tick broadcasts at most one roster entry for that actor carrying the newest pose, and the coalesced count is observable via telemetry

#### Scenario: Slow consumer is resnapshotted, not queued under

- **WHEN** a client stops reading its transport while its room keeps flushing
- **THEN** the runtime disconnects that transport once the outbound bound is hit instead of growing the queue without limit, and a reconnect restores the room state from a fresh full snapshot

#### Scenario: Roster flush shape matches the baseline

- **WHEN** a dirty room flushes
- **THEN** each entry carries `{id, x, z, rotY, walking, sitting, airborne}` exactly as the Node baseline's 10 Hz flush

### Requirement: Emotes

The runtime SHALL validate `emote` against the six-id allow-list (`wave`, `dance`, `cheer`, `heart`, `bow`, `shrug`), enforce the 500 ms per-session cooldown, and broadcast `emote_broadcast {playerId, nickname, emote}` to the room. Rejected emotes SHALL not produce broadcasts. The cooldown SHALL be keyed to the transport session, not the surviving roster entry: the Node baseline holds the cooldown on the session object, so a reconnect may emote immediately, and a roster-entry-keyed cooldown that survives reconnect would be an undeclared tightening.

#### Scenario: Allowed emote relays with nickname

- **WHEN** a member sends `emote {emote: "wave"}`
- **THEN** the room receives `emote_broadcast` with that player's id, current nickname, and `emote: "wave"`

#### Scenario: Unknown emote or spam is rejected

- **WHEN** a client sends an emote id outside the allow-list, or sends again within 500 ms
- **THEN** no `emote_broadcast` is produced for the rejected input

### Requirement: Weather stays relayed

The runtime SHALL NOT own weather in this phase: Node remains the weather writer (its 3-minute `clear → drizzle → rain` rotation), `weather_update {weather}` frames SHALL keep flowing from Node through the proxy unsuppressed, and the `weather` field of `welcome` SHALL remain Node-built exactly as in the gateway phase. Weather authority transfers to the runtime at the P6 economy-group flip — the change that consumes it for the garden tick — not in P3.

#### Scenario: Weather advances on schedule

- **WHEN** three minutes elapse while clients are connected
- **THEN** every connected client receives one `weather_update` relayed from Node with the next state in the `clear → drizzle → rain` cycle, exactly as before this change

#### Scenario: Welcome agrees with the broadcasts

- **WHEN** a player connects while Node's weather is `rain`
- **THEN** their Node-built `welcome` carries `weather: "rain"`, matching the most recent relayed `weather_update`

### Requirement: Duplicate-connect resolution

When a second transport authenticates for an identity that already has a live connection, the newest connection SHALL win and the older transport SHALL be closed with a documented supersession close reason; the room roster SHALL reflect exactly one member for the identity throughout, with no ghost members left behind by the stale connection's close (deliberately fixing Node's overwrite-then-evict quirk, and recorded as the second wire-visible tightening). Because `NetworkClient` auto-reconnects on any disconnect, the supersession close SHALL be terminal for the losing transport's reconnect logic — the client facade SHALL treat this close reason as stop-retrying (or, where the facade cannot be taught the reason, identity-keyed reconnect backoff SHALL prevent mutual eviction) — so two live tabs or an adversarial holder of a broadcast guestId cannot produce a perpetual supersession loop. The recorded client-impact analysis in `docs/architecture/elixir/protocol-catalog.md` §"Declared tightenings" SHALL cover the two-live-tabs and adversarial-supersede cases explicitly, including the leave/join traffic each supersession incident produces.

#### Scenario: Stale duplicate is closed cleanly

- **WHEN** a player's client reconnects (refresh or network flap) while the old transport still exists
- **THEN** the old transport is closed with the supersession reason, the newest connection receives a full snapshot of its desired room, and other members observe at most a leave/join pair — never a lingering ghost

#### Scenario: Old socket closing cannot evict the survivor

- **WHEN** the superseded transport's close is processed after the new connection is established
- **THEN** the surviving member remains in the room roster and continues receiving presence and snapshots

#### Scenario: Supersession cannot loop

- **WHEN** the superseded client's auto-reconnect fires after losing a duplicate-connect race
- **THEN** the reconnect attempt is suppressed (terminal close reason) or deferred by identity-keyed backoff, so the same two transports cannot evict each other indefinitely

### Requirement: Failure containment and recovery

A crashing RoomServer SHALL be restarted by its DynamicSupervisor with empty transient state, and affected members SHALL be resnapshotted. Because the gateway transport multiplexes every room on a single `game:v1` topic, there is no per-room client subscription to close: recovery SHALL close the affected members' full transports — the only client-observable disconnect lever — and their clients' `desiredRoom` replay rejoins the restarted room to receive a fresh roster and join-time snapshots. While a transport has no live World membership (crash window, or any flip window below), the gateway SHALL refuse durable domain commands for it rather than letting Node's shadow `currentRoom` authorize actions for a player no room owns — room membership has one authority at every instant. Other rooms SHALL be unaffected, and no durable state SHALL be read or written during recovery — the only loss is transient poses.

#### Scenario: Room crash degrades to resnapshot

- **WHEN** a RoomServer process crashes while holding members
- **THEN** the supervisor restarts it, each member's transport is closed (full transport close, firing the client's reconnect/rejoin path), and a client rejoin yields a correct fresh room view

#### Scenario: No durable actions without live membership

- **WHEN** a durable command (`garden_action`, `node_harvest`, market order) arrives from a transport during the crash recovery window, before its rejoin has restored World membership
- **THEN** the gateway refuses it with a retryable response instead of forwarding it on the strength of Node's shadow room state

#### Scenario: Durable domains survive a room crash

- **WHEN** the market room's RoomServer crashes and members rejoin
- **THEN** wallets, inventory, orders, theater state, and chat history are unaffected, because the room process owned none of them

### Requirement: Telemetry events

The runtime SHALL emit named telemetry events for room joins, room leaves, room ticks (duration and roster size), coalesced movement counts, and room stops — `[:afterlight, :room, :join]`, `[:afterlight, :room, :leave]`, `[:afterlight, :room, :tick]`, `[:afterlight, :movement, :coalesced]`, `[:afterlight, :room, :stopped]` — without logging tokens, and metrics dashboards/alerting remain deferred to the observability phase.

#### Scenario: Tick telemetry is observable

- **WHEN** a populated room flushes a movement tick
- **THEN** a `[:afterlight, :room, :tick]` event carries the tick duration and roster size, and a `[:afterlight, :movement, :coalesced]` event reports received-versus-flushed counts

#### Scenario: Telemetry never leaks secrets

- **WHEN** any room telemetry event is emitted
- **THEN** it contains room/player identifiers and counts but no tokens or credentials

### Requirement: Chat and durable domains stay proxied

The chat relay (`chat_send`, `chat_message`, `chat_dm`, `chat_history`, `chat_presence`, `chat_error`) and every durable domain (theater, catalog, gardens, economy, restoration, accounts) SHALL continue to be relayed to the Node server through the authenticated boundary exactly as in the gateway phase; the world runtime SHALL NOT take over chat or any durable write in this phase. The chat relay's move to `Afterlight.Social` belongs to `add-social-chat-relay` (the P7 window).

#### Scenario: Chat keeps flowing through Node

- **WHEN** two players exchange messages, DMs, and `/me` actions while the world runtime is active
- **THEN** all chat messages, history, presence events, and IRC-bridged messages behave exactly as before, delivered through the Node proxy

#### Scenario: Durable actions unaffected by the world flip

- **WHEN** a player performs market, garden, machine, or theater actions after the world flip
- **THEN** those commands are relayed to Node and their replies and broadcasts are unchanged

### Requirement: Rollback to Node world proxy

The domain router SHALL be able to flip the world domain back to the Node proxy by configuration alone: presence suppression stops and `server/world.js` resumes ownership unchanged (weather was never suppressed — it stayed Node's writer throughout P3). This is a pure transport change — no durable state moves in either direction — and SHALL be allowed to reset transient poses (the same reset as a Node restart today), which the rollback documentation SHALL state honestly. Flip choreography is normative in BOTH directions (node→phoenix and phoenix→node): a flip SHALL force-close the transports of clients whose live membership the outgoing owner holds, so every session re-derives membership from the new owner via its `desiredRoom` replay before any `movement` is accepted. The incoming owner SHALL reject `movement` from an identity with no live roster entry rather than accept a ghost pose, and the reject SHALL NOT be client-visible beyond the reconnect the flip itself causes (spec-compliant clients reconnect and resnapshot; there is no observable intermediate state).

#### Scenario: Router flip back restores Node behavior

- **WHEN** the world router entry is flipped back to `node` and clients reconnect
- **THEN** movement, presence, and emotes behave exactly as served by Node, with presence suppression disabled; weather is unchanged because it was Node's writer throughout this phase
- **AND** no durable state needs migrating or cleaning up in either direction

#### Scenario: Live clients re-derive membership at flip time

- **WHEN** the world domain flips while clients are connected to a populated room
- **THEN** each affected transport is closed by the gateway, the client's desiredRoom replay joins the room under the new owner, and movement from a not-yet-rejoined identity is refused rather than ghosted
