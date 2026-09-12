# world-room-runtime

## MODIFIED Requirements

### Requirement: Room lifecycle and identity

The system SHALL run one supervised RoomServer process per active room under a DynamicSupervisor with a unique Registry, starting a room lazily on its first join and stopping it after an empty period beyond a configured grace interval. Rooms SHALL be identified internally as `{district_id, instance_id}` with `instance_id` fixed to `"main"`, and the wire SHALL keep the exact historical room-id strings — `market`, `theater`, `foundry`, `trestle`, `frost-spire` — so clients join with unchanged `join_room {roomId}` payloads. No room state SHALL be persisted: rooms, rosters, poses, and cooldowns are process memory only.

#### Scenario: First join starts the room

- **WHEN** a player sends `join_room {roomId: "foundry"}` and no RoomServer exists for it
- **THEN** a RoomServer is started lazily and the player joins the freshly created room

#### Scenario: Empty room retires

- **WHEN** every member has left a room and the grace period elapses with no new joins
- **THEN** the RoomServer stops, and a later join starts a fresh room with an empty roster without error

#### Scenario: Wire room ids unchanged

- **WHEN** a player joins the theater
- **THEN** the join and every subsequent message use the exact string `theater` as the room id on the wire

### Requirement: Join and membership semantics

Room joins SHALL reproduce the documented Node semantics exactly: the joiner receives a full roster `presence_update` of existing members with entries `{id, nickname, x, z, rotY, walking, sitting}`; the room receives `presence_join` carrying the joiner's `{id, nickname, x, z, rotY, walking, sitting}` with the joiner excluded; a duplicate `join_room` for the current room SHALL be a presence no-op; and `presence_leave {playerId}` SHALL fire to the room on travel and on disconnect. While the world domain is routed to the runtime, it SHALL be the single writer of presence: the Node proxy SHALL forward `join_room` to the Node shadow session for membership context (Node still gates domain actions on the current room) and SHALL suppress Node-emitted presence frames, while Node's join-time domain snapshots (`theater_state`, `iptv_state`) are still relayed to the joiner after the roster send. A successful `set_nickname` SHALL be propagated to the owning RoomServer so roster entries, later joins' rosters, and `emote_broadcast` nicknames reflect the new name immediately — the Node baseline reads nickname live at emit time, and a stale name after a mid-session rename would be an undeclared parity failure.

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

### Requirement: Weather stays relayed

The runtime SHALL NOT own weather: Node remains the weather writer (its 3-minute `clear → drizzle → rain` rotation) and `weather_update {weather}` frames SHALL keep flowing from Node through the proxy unsuppressed. Weather is presentation-only after this change — no durable behavior consumes it and authority never transfers to the runtime — and the `weather` field of `welcome`, when present, SHALL agree with the most recently relayed weather. Clients SHALL tolerate a welcome without weather and fall back to their ambient default.

#### Scenario: Weather advances on schedule

- **WHEN** three minutes elapse while clients are connected
- **THEN** every connected client receives one `weather_update` relayed from Node with the next state in the `clear → drizzle → rain` cycle, exactly as before this change

#### Scenario: Welcome agrees with the broadcasts

- **WHEN** a player connects while Node's weather is `rain`
- **THEN** any `weather` field on their welcome matches the most recent relayed `weather_update`, and a welcome without the field leaves the client's ambient default in place

### Requirement: Chat and durable domains stay proxied

The chat relay (`chat_send`, `chat_message`, `chat_dm`, `chat_history`, `chat_presence`, `chat_error`) and every durable domain (theater, catalog, accounts) SHALL continue to be relayed to the Node server through the authenticated boundary exactly as in the gateway phase; the world runtime SHALL NOT take over chat or any durable write in this phase. The chat relay's move to `Afterlight.Social` belongs to `add-social-chat-relay` (the P7 window).

#### Scenario: Chat keeps flowing through Node

- **WHEN** two players exchange messages, DMs, and `/me` actions while the world runtime is active
- **THEN** all chat messages, history, presence events, and IRC-bridged messages behave exactly as before, delivered through the Node proxy

#### Scenario: Durable actions unaffected by the world flip

- **WHEN** a player performs a theater, catalog, or account action after the world flip
- **THEN** those commands are relayed to Node and their replies and broadcasts are unchanged

### Requirement: Failure containment and recovery

A crashing RoomServer SHALL be restarted by its DynamicSupervisor with empty transient state, and affected members SHALL be resnapshotted. Because the gateway transport multiplexes every room on a single `game:v1` topic, there is no per-room client subscription to close: recovery SHALL close the affected members' full transports — the only client-observable disconnect lever — and their clients' `desiredRoom` replay rejoins the restarted room to receive a fresh roster and join-time snapshots. While a transport has no live World membership (crash window, or any flip window below), the gateway SHALL refuse durable domain commands for it rather than letting Node's shadow `currentRoom` authorize actions for a player no room owns — room membership has one authority at every instant. Other rooms SHALL be unaffected, and no durable state SHALL be read or written during recovery — the only loss is transient poses.

#### Scenario: Room crash degrades to resnapshot

- **WHEN** a RoomServer process crashes while holding members
- **THEN** the supervisor restarts it, each member's transport is closed (full transport close, firing the client's reconnect/rejoin path), and a client rejoin yields a correct fresh room view

#### Scenario: No durable actions without live membership

- **WHEN** a durable command (a theater queue action, an account rename) arrives from a transport during the crash recovery window, before its rejoin has restored World membership
- **THEN** the gateway refuses it with a retryable response instead of forwarding it on the strength of Node's shadow room state

#### Scenario: Durable domains survive a room crash

- **WHEN** a public room's RoomServer (for example the theater) crashes and members rejoin
- **THEN** theater state, catalog data, account profiles, and chat history are unaffected, because the room process owned none of them
