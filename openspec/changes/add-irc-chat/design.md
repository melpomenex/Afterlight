## Context

The multiplayer server (`server/index.js`) is a single Node process: an HTTP server carrying the `ws` WebSocket endpoint, with `WorldManager` providing rooms/presence and feature managers (gardens, economy, nodes, machines) sharing one `Storage`. The client speaks a JSON protocol (`shared/protocol.js`) through `src/net/client.js`. There is no chat today; the only player-to-player expression is emotes. Deployed builds reach the server through a WebSocket URL (e.g. `wss://…ts.net/ws`), so external raw-TCP reachability cannot be assumed.

See `proposal.md` for motivation and the three spec deltas for behavioral requirements.

## Goals / Non-Goals

**Goals:**
- A genuine IRC server (RFC 1459-style line protocol) that mainstream clients and bots can connect to over TCP with no game involvement.
- One conversation shared by game players and IRC users: channel `#afterlight`, DMs, presence lines.
- Zero new npm dependencies; fits the existing single-process, module-per-concern server layout and its test approach (real sockets via `node --test`).
- In-game chat panel that respects the AGENTS.md HUD rules (movement-key safety, responsive breakpoints, accessibility).

**Non-Goals:**
- IRC services (NickServ/ChanServ), channel modes beyond +o display, KICK/BAN/IGNORE moderation commands, operator UI in-game.
- Multiple channels or per-room channel mapping (protocol keeps a `channel` field so this can come later).
- Chat persistence across server restarts (history is an in-memory ring buffer).
- TLS on the IRC port (private/small deployment; document that bots should connect on a trusted network or via a tunnel the operator provides).

## Decisions

### D1: Embedded IRCd written in-repo over `node:net` (no new deps, no external IRCd)
`server/irc.js` implements a line-based server: CRLF-framed ≤512-byte lines, a small command table (NICK, USER, JOIN, PART, TOPIC, NAMES, PRIVMSG, PING, QUIT, WHO, WHOIS, OPER, CAP), numerics for client compatibility (001–004, 331/332, 353/366, 311/318, 352/315, 381, 401/411/421/431/433/451/464, and PONG handling). Modern clients gate on `CAP LS 302` / SASL: we answer `CAP * LS :` (empty list) and complete on `CAP END` so unauthenticated plain clients proceed.

*Alternatives considered:* an external IRCd (Ergo) adds a second binary/process and ops burden this repo doesn't have; an npm IRCd package would introduce an unmaintained dependency for ~600 lines of straightforward code. Writing it in-repo keeps the single-process `npm run server` story intact.

### D2: One connection abstraction; player sessions are non-TCP connections
All IRC state lives behind a `Connection` interface (`id`, `sendLine(str)`, `close()`, registration state). TCP sockets and bridge sessions for game players both implement it, and both feed the same command parser. The bridge never uses loopback sockets.

*Rationale:* one protocol code path, no N-players-worth of wasted localhost sockets, and tests can drive the same handler from real TCP (external-client behavior) and synthetic connections (bridge behavior).
*Alternative rejected:* game server connecting to itself over `localhost:6667` per player — elegant single-path purism, but doubles failure modes and makes the bridge depend on the IRC port being open.

### D3: Bridge as a peer manager (`server/chat.js`)
`ChatBridge` owns: per-player synthetic sessions, the `#afterlight` history ring buffer (last 100 messages), nickname derivation/reservation, and relay. Flow:

- **Outbound:** WS `chat_send {text}` → server parses commands (`/msg`, `/me`) and length-caps (~400 chars post-sanitize) → bridge injects a PRIVMSG through the player's synthetic session → IRCd fans out to channel members → the bridge's channel-listener receives member PRIVMSGs and rebroadcasts to game clients as `chat_message`. The originating player is echoed exactly once (their synthetic session receives it like any member; the bridge marks the origin to avoid double delivery).
- **Inbound:** TCP client PRIVMSG `#afterlight` → same fan-out → bridge rebroadcasts to `world.broadcastToAll` with `fromKind: 'irc'`; CTCP `\x01ACTION …\x01` is detected at relay time and delivered as an action line.
- **DMs:** PRIVMSG targeting a nickname resolves to either a synthetic session (player) or a TCP connection (external); the bridge mirrors delivery into the corresponding game session as `chat_dm` when the target is a player.
- **Presence:** IRC JOIN/QUIT/PART events for both kinds of members become `chat_presence` system lines in-game; game connect/disconnect drives synthetic JOIN/QUIT.

### D4: Nickname derivation and reservation
Game nicknames already go through `sanitizeNickname`; the bridge additionally maps them onto the RFC nick charset (strip/replace invalid characters, ensure a valid first character). If the mapped nick is taken on IRC — by an external client or another player — the bridge appends `_`, then a counter (`Kiln_`, `Kiln_2`), and the player is told their in-IRC handle via a system line. While a player is connected, their nick is held by their synthetic session, so external clients attempting to take it get `433`. Players keep their *game* nickname in-game regardless of the IRC-side suffix; attribution in-game always uses the game nickname.

### D5: Protocol additions are additive JSON messages
Client→Server: `chat_send {text}` (slash commands parsed server-authoritatively; the client parses only for local feedback hints).
Server→Client: `chat_history {messages[]}`, `chat_message {channel, from, fromKind: 'player'|'irc'|'system'|'action', text, ts}`, `chat_dm {from, to, text, ts, fromKind}`, `chat_presence {event: 'join'|'part', who, fromKind}`, `chat_error {message}`.
`chat_history` is sent once after `WELCOME`. The `channel` field exists everywhere so per-room channels can be added without another breaking change.

### D6: Client panel module (`src/ui/chatPanel.js`) + input arbitration in `main.js`
Panel markup lives in `index.html` next to the other HUD panels; styling uses the existing translucent teal panel language and sits bottom-right, clear of the companion (bottom-left), interaction card (bottom-center, moved right in the 901–1100px rule — the chat rules must be checked against that breakpoint), and footer. `main.js`'s keydown controller already has a "typing in an input" hazard; chat follows the established dialog pattern: opening focus clears held movement keys, keydown handlers early-return when `document.activeElement` is the chat input, Escape blurs, T/Enter focuses, Enter sends. Unread badge is a simple count on the collapsed toggle.

### D7: Config and lifecycle
`IRC_PORT` (default `6667`; `0`/unset-and-disabled flag not needed — presence of the module is fine, but `IRC_PORT=0` picks an ephemeral port for tests and `IRC_DISABLED=1` skips the listener), bound to `HOST` like the HTTP server. `IRC_OPER_NAME`/`IRC_OPER_PASS` optional; `IRC_TOPIC` optional topic override. `close()` sends QUIT to all IRC connections and closes the TCP server. The announce line in the startup log lists both ports.

## Risks / Trade-offs

- **[Raw TCP 6667 may not be reachable in the deployed environment (ts.net HTTPS tunnel)]** → IRC remains fully optional: in-game chat works without any external client; README documents that external access needs a TCP tunnel/port-forward at the operator's end.
- **[Client compatibility quirks (SASL, WHOIS storms, vendor extensions)]** → CAP-empty strategy plus tolerant parser (421 for unknowns, bounded WHO/WHOIS support) covers mainstream clients; tests drive IRSSI-style handshake sequences.
- **[Anonymous IRC users can address players directly]** → DMs only reach holders of an exact nick; players' nicks are reserved while online; an oper password is available for a human moderator; rate-limit: simple per-connection flood guard (e.g. >10 messages/5 s → short delay) at the IRCd edge.
- **[Nick collision suffixes confuse "who is who"]** → in-game attribution always uses game nicknames; the bridge posts a one-time system line when a player's IRC handle differs.
- **[Chat panel colliding with the 901–1100px interaction-card rule]** → chat gets its own breakpoint behavior and is verified at ~930px, desktop, and ≤560px per AGENTS.md verification steps.
- **[UTF-8 truncation at 512 bytes]** → truncate IRC lines on code-point boundaries, never mid-sequence.

## Migration Plan

Purely additive: no save-schema, storage, or existing-packet changes. Deploy = restart server; a new port opens. Rollback = stop setting `IRC_DISABLED=1`/revert; clients tolerate the missing chat messages because `chat_*` handlers simply never fire. No data migration exists or is needed.

## Open Questions

None blocking. Future follow-ups (per-room channels, moderation commands, chat persistence) are explicitly out of scope and do not change this design's shape.
