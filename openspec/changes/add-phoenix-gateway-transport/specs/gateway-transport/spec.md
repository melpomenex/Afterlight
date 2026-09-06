# gateway-transport

## Purpose

Phoenix hosts the existing client's realtime transport during migration phase P2: the same `/ws` URL shape, the same flat message semantics behind a Channels envelope, signed guest credentials replacing client-trusted guestIds, and a server-side domain router that relays every still-Node-owned domain to Node over a private authenticated boundary. The client contract documented in `docs/architecture/elixir/protocol-catalog.md` §1/§2/§5 is the compatibility target; this capability defines what the gateway must preserve, what it terminates, what it relays, and how it rolls back.

## ADDED Requirements

### Requirement: Socket and envelope compatibility

The Phoenix gateway SHALL serve the socket at path `/ws` and SHALL deliver every game message to the client as a flat `{type, ...fields}` object after unwrapping the Channels envelope `{topic, event, payload}`. The full message catalog (exact type strings, payloads, scopes) of `docs/architecture/elixir/protocol-catalog.md` §1 SHALL be preserved; malformed input SHALL be dropped without side effects as it is today. A deployment SHALL opt into the gateway via build-time `VITE_WS_URL` pointing at the Phoenix endpoint plus an explicit transport switch, with the Node socket remaining the default so nothing changes until opted in.

#### Scenario: Envelope unwrap is transparent

- **WHEN** the gateway broadcasts `presence_update` to a client connected through Phoenix
- **THEN** the client's registered handler receives a flat `{type: 'presence_update', players: [...]}` message identical in shape and field values to what the Node WebSocket would have delivered
- **AND** no handler observes any topic or envelope artifact

#### Scenario: Default remains Node

- **WHEN** a build sets no transport switch
- **THEN** the client connects to the Node WebSocket exactly as before the change
- **AND** all existing Node-path tests pass unchanged

### Requirement: Client facade preservation

The `NetworkClient` public API and observable behaviors SHALL be preserved behind a pluggable transport: constructor shape `new NetworkClient(wsUrl)`; multiple handlers per type invoked in registration order; `onConnect`/`onDisconnect`; `send(type, payload)` silently dropping when the transport is closed; the 80 ms movement self-throttle; the HTTP side channel `apiBase` derived from the WS URL host so `/api/theater/*` uploads and torrent Range streaming keep working; and `desiredRoom` replayed via `join_room` on every (re)connect in the current handshake order (hello sent first, then the replayed join). GuestId continuity SHALL be preserved: the same localStorage guestId travels through the gateway verbatim, or self-echo filtering and `garden:<guestId>` room ids would break.

#### Scenario: Handler ordering survives the adapter

- **WHEN** a client registers two handlers for `chat_message` and a message arrives through the Phoenix transport
- **THEN** both handlers fire in registration order with the same message object

#### Scenario: HTTP side channel keeps working

- **WHEN** a player uploads a playlist or streams a torrent video while connected through the gateway
- **THEN** the request reaches the Node-owned theater endpoints through the gateway at the `apiBase` the client already derives, and the response is unchanged

#### Scenario: GuestId continuity

- **WHEN** a player reconnects through the gateway with the same localStorage guestId
- **THEN** their own movement is still self-filtered and a personal garden joins `garden:<guestId>` exactly as on the Node transport

### Requirement: Signed guest credentials

The gateway SHALL issue a short-lived signed token (Phoenix.Token) via an HTTP endpoint and SHALL require a valid, unexpired token to complete the socket connect. Socket join authorization SHALL derive from the server-issued token: the token's verified claims bind the connection for its life, and client-supplied ids SHALL never be authorization. Scope honesty: the P2 token authenticates possession of the SOCKET HANDSHAKE — it does not yet make a guestId unforgeable as a player identity (player-identity trust lands in P4/P6, when tokens bind to durable session/player rows). During the migration window (until the P4 claim window), the historical guestId SHALL continue to work as identification — it remains the stable player key used by hello, session keying, self-echo filtering, and `garden:<playerId>` room ids — but SHALL NOT by itself authorize a connection.

#### Scenario: Connect without a token is refused

- **WHEN** a socket attempts to connect to the gateway without a valid signed token
- **THEN** the connect is rejected before any game session is created
- **AND** no Node session is opened for it

#### Scenario: GuestId still identifies during migration

- **WHEN** a legitimate client presents its token and its usual guestId in hello
- **THEN** the player session resolves to the same player key as before, existing room ids like `garden:<guestId>` work, and the gateway does not require any new client-side account flow

#### Scenario: Mismatched hello is rejected

- **WHEN** a client presenting a token for guest A sends hello claiming guest B's guestId
- **THEN** the gateway refuses the session rather than forwarding it

### Requirement: Server-side domain routing

The gateway SHALL decide, per message, whether to terminate it locally or relay it to the legacy Node server, using a config-owned table mapping domain → owner (`node` | `phoenix`). Clients SHALL NOT be able to choose the implementation that serves a domain. In this phase every game domain SHALL route to `node`; the router exists as the mechanism later phases flip. The disposition for this phase SHALL be recorded in the architecture docs: terminated at the gateway are socket connect/token verification, `ping`/`pong`, and connection rate limiting; relayed to Node is everything else — `hello`/`set_nickname` with their `welcome` replies, `join_room` with all room membership and snapshot messages, `movement`, `emote`, chat, and all durable-domain messages — so remote avatars, theater, market, gardens, and chat keep working unchanged.

#### Scenario: Router decides, client cannot

- **WHEN** a client sends `join_room` through the gateway
- **THEN** the router's table entry (world = node in this phase) relays it to the Node shadow session, and the reply path returns Node's join snapshots to that client only

#### Scenario: Ping is terminated locally

- **WHEN** a client sends `ping {t}` through the gateway
- **THEN** the gateway replies `pong {t}` itself without relaying to Node, preserving the echo semantics

### Requirement: Private authenticated boundary to Node

Relayed traffic between the gateway and Node SHALL travel over a private network path carrying a shared secret credential. Node SHALL reject boundary requests presenting an invalid secret; during this phase Node SHALL still accept secret-less direct connections so the rollback path keeps working. Each gateway session SHALL map to exactly one upstream Node session, relaying frames in order, so Node-side semantics (snapshot ordering, `welcome` aggregation, stable `error` reason strings) are preserved unchanged. The `/api/theater/*` and `/api/health` HTTP surfaces SHALL be reverse-proxied to Node under the same secret discipline.

#### Scenario: Forged boundary credential is rejected

- **WHEN** a request reaches Node's socket upgrade or API with a wrong boundary secret
- **THEN** Node rejects it and no game session is created

#### Scenario: Relay preserves Node semantics

- **WHEN** a client joins the theater through the gateway
- **THEN** it receives `theater_state` and `iptv_state` join snapshots from Node, once and in the documented order, exactly as a direct Node client would

### Requirement: Reconnect continuity without a second logical session

After every reconnect through the gateway the client SHALL receive `welcome` again (the network indicator and chat enablement depend on it), SHALL have its `desiredRoom` replayed, and SHALL be restored to a consistent room view via the standard snapshot ordering (`hello` → `welcome` → `garden_state` → `chat_history` → join snapshots). The gateway SHALL enforce one live transport per verified identity: when a new transport arrives for an identity, the previous upstream Node session SHALL be closed first so Node never holds two sessions for one player, preventing the known duplicate-guestId ghost-eviction quirk from transport reconnects.

#### Scenario: Reconnect restores the room

- **WHEN** a client's transport drops and the client reconnects with a remembered `desiredRoom`
- **THEN** it receives `welcome` again and a fresh full roster and room snapshots for the desired room, without any user action

#### Scenario: Transport flap creates no ghost session

- **WHEN** the same player's client reconnects through the gateway while its previous upstream session still exists
- **THEN** the gateway closes the previous upstream before forwarding the new hello, and Node holds exactly one session for that player afterwards

### Requirement: Connection security

The gateway SHALL authorize every channel join against the verified session (no anonymous topic subscription), SHALL rate-limit connection attempts per source and per identity, SHALL derive actor identity only from the verified token claim (never from client-supplied playerId fields), and SHALL never write tokens or boundary secrets to logs.

#### Scenario: Rate-limited connect storm

- **WHEN** one source makes repeated connect attempts beyond the configured limit
- **THEN** further attempts are refused with a retryable signal and existing legitimate sessions are unaffected

#### Scenario: Tokens stay out of logs

- **WHEN** the gateway logs any connect, disconnect, or error event
- **THEN** the log lines contain correlation ids but no token or secret material

### Requirement: Transport rollback

It SHALL be possible to return a deployment to the Node WebSocket transport by configuration alone (the transport switch and `VITE_WS_URL`), because this phase moves no durable state and changes no durable writers. Clients reconnecting after a rollback SHALL resume play against Node with their existing guestIds, and any transient state (positions, in-memory chat history) SHALL be allowed to reset exactly as a Node restart would today.

#### Scenario: Rollback is a config flip

- **WHEN** a deployment switches the transport back to the Node socket
- **THEN** clients reconnect directly to Node and play normally with no data migration or cleanup step required
- **AND** no durable state written during the gateway phase needs reversing
