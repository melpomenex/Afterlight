# social-chat-relay

## Purpose

The game chat relay — channel messages, DMs, `/me`//`/msg` commands, history, presence, and errors — is owned by `Afterlight.Social` in Phoenix instead of the game-relay halves of `server/chat.js`, with the IRC exchange crossing the authenticated P7 adapter to the retained Node IRC sidecar. Player-facing behavior is byte-identical to the Node baseline documented in `docs/architecture/elixir/protocol-catalog.md` §1 (`chat_send`, `chat_message`, `chat_dm`, `chat_history`, `chat_presence`, `chat_error`); this capability moves authority in the P7 window and makes game chat's survival of sidecar loss contractual.

## ADDED Requirements

### Requirement: Wire-exact channel relay with exactly-once sender echo

`Afterlight.Social` SHALL accept `chat_send {text}`, reject raw submissions above 600 characters with today's `chat_error` string, sanitize to at most 400 characters with the `cleanText` semantics ported exactly (control-character strip, whitespace-run collapse to single spaces, trim), and broadcast `chat_message {channel, from, fromKind, text, ts, action?}` to ALL connected clients with the sender echoed exactly once. The `action` field SHALL appear only for `/me` messages, and `ts` SHALL be server milliseconds. Message types, field sets, and error strings SHALL be byte-identical to the Node implementation.

#### Scenario: Sender sees exactly one echo

- **WHEN** a player sends a channel message while other players and an IRC participant are connected
- **THEN** every participant including the sender receives exactly one `chat_message` for it, and no IRC round-trip produces a second copy for the sender

#### Scenario: Oversized submission is rejected identically

- **WHEN** a client submits a 601-character `chat_send`
- **THEN** the sender receives the same targeted `chat_error` message text as the Node server produces and nothing is broadcast or stored

### Requirement: Command parsing parity for /me and /msg

`/me` and `/msg` SHALL be parsed server-side exactly as today: `/me <action>` produces a `chat_message` with the `action` flag set; `/msg <name> <text>` delivers `chat_dm {from, fromKind, to, text, ts}` to the target and `chat_dm {…, echo: true}` to the sender; a bare or malformed command, an unknown command, or a `/msg` to an absent player produces the same targeted `chat_error` usage/absence strings as the Node implementation. The parsing SHALL pass the exported parity fixtures (from `add-parity-fixture-baseline`) before the flip.

#### Scenario: Direct message reaches both parties

- **WHEN** a player sends `/msg Mossy hello` while Mossy is online
- **THEN** Mossy receives one `chat_dm` and the sender receives one `chat_dm` with `echo: true`, both with the same text and server timestamp

#### Scenario: Missing target errors identically

- **WHEN** a player sends `/msg Ghost hi` with no such player or IRC nick connected
- **THEN** the sender receives the same `chat_error` absence string the Node server emits

### Requirement: Ephemeral 50-of-100 history ring

`Afterlight.Social` SHALL keep an in-memory ring of the last 100 accepted channel messages and SHALL deliver the last 50 as targeted `chat_history {channel, messages}` after `garden_state` in the documented connection order (`hello` → `welcome` → `garden_state` → `chat_history` → join snapshots). The ring SHALL be ephemeral: this change SHALL NOT add persistence — a restart losing history is current behavior, and any persistence is a declared follow-up change requiring its own behavior-change justification.

#### Scenario: Reconnecting player gets the tail

- **WHEN** a player reconnects after 120 messages were exchanged
- **THEN** their targeted `chat_history` carries the most recent 50 messages in order, and the ring retains at most 100

#### Scenario: Restart resets history

- **WHEN** the Phoenix app restarts and a player reconnects
- **THEN** `chat_history` is empty, exactly as after a Node restart today

### Requirement: Presence join and part broadcasts

The relay SHALL broadcast `chat_presence {channel, event, who, fromKind, ts}` to ALL clients when a player joins or leaves the game (connect/disconnect, including superseded duplicates exactly once) and when IRC participants join or part, with `fromKind` distinguishing `player` from `irc` exactly as today.

#### Scenario: Join and part are broadcast once

- **WHEN** a player connects and later disconnects while others are present
- **THEN** the room receives one `chat_presence` join and one `chat_presence` part for that player, each with the correct `fromKind`, and a superseded duplicate transport produces no extra pair

### Requirement: Authenticated IRC adapter boundary with loop prevention

Exchange with the retained Node IRC sidecar (`server/irc.js` + bridge) SHALL cross the authenticated adapter boundary from `add-node-specialty-adapters` only — never an unauthenticated path. Every relayed message SHALL carry a unique message ID and an origin-scoped echo-suppression key (`{origin: game|irc, id}`), and a message re-entering its origin carrying a seen key SHALL be dropped, so game→IRC→game or IRC→game→IRC reflection cannot double-deliver. If the sidecar is down, `Social` SHALL degrade to game-only relay (same packets, same history, no external door — today's degraded mode) and SHALL mark IRC presence down instead of erroring the chat path.

#### Scenario: IRC message reaches the game exactly once

- **WHEN** an IRC participant sends a channel message while the bridge is up
- **THEN** game clients receive exactly one `chat_message` with `fromKind: "irc"`, and the reflected event re-entering the adapter with a seen message ID is dropped

#### Scenario: Sidecar outage degrades without errors

- **WHEN** the IRC sidecar crashes while players are chatting
- **THEN** game channel messages, DMs between players, history, and presence keep working unchanged, IRC presence is marked down, and no `chat_error` is produced by the outage

### Requirement: Server-side routing and rollback honesty

The gateway router SHALL decide the `chat_*` disposition server-side (clients cannot choose), and the flip SHALL disable the Node game-relay portions of `server/chat.js` in the same release per the single-writer rule. It SHALL be possible to flip the `chat_*` entries back to the Node relay by configuration alone before the compatibility layer is removed; history accumulated on the Elixir side SHALL NOT be expected to survive the flip back (it is ephemeral on both sides), which the rollback documentation SHALL state honestly.

#### Scenario: Router flip is invisible to compliant clients

- **WHEN** the `chat_*` router entries flip to Phoenix and two clients exchange messages, DMs, `/me` actions, and history across the flip boundary
- **THEN** the wire sequences match the Node baseline fixture-for-feature, with no client change

#### Scenario: Rollback flips the relay back

- **WHEN** the deployment flips `chat_*` back to the Node relay
- **THEN** chat flows through Node again with unchanged message shapes, the empty Elixir ring is simply abandoned, and no durable state needs migrating
