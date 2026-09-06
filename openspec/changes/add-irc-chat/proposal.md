## Why

Afterlight is now a living multiplayer town, but players have no way to talk to each other: presence, emotes, and a shared market exist, yet coordination and atmosphere happen off-platform. The community also wants a place to host bots and connect with ordinary IRC clients. Hosting our own IRC server gives us both: chat inside the game and an open, standards-based door for external tools — with no third-party chat service in the middle.

## What Changes

- **Embedded IRC Server**: Add a minimal RFC 1459-style IRC server implemented in-repo (`server/irc.js`), listening on its own TCP port (default 6667, configurable). Supports NICK, USER, PRIVMSG, JOIN, PART, TOPIC, NAMES, PING/PONG, QUIT, and numerics well enough for mainstream IRC clients (IRSSI, WeeChat, HexChat, mIRC) and bots to connect and stay connected.
- **Global Channel**: One server-run standard channel `#afterlight` with a welcoming topic; it always exists.
- **In-Game Chat Panel**: A translucent HUD chat panel (collapsible, chat-history scrolling, `T`/`Enter` to focus, `Escape` to release) showing channel messages; supports `/msg <nick> <text>` for direct messages and `/me` actions.
- **Game ⇄ IRC Bridge**: Each connected player is represented on the IRC server under their game nickname (collision-proofed); in-game messages become IRC PRIVMSGs and IRC messages appear in the game panel. Presence joins/leaves stay in sync in both directions. DMs are bridged so players and bots can whisper.
- **Nickname Reservation**: Game nicknames are registered on the IRC server when a player connects and released on disconnect; external clients cannot impersonate an online player's nick.
- **Protocol Extension**: New WebSocket message types for chat (send, history, channel + DM delivery, join/leave notices) added additively to `shared/protocol.js`; no existing packet changes.
- **Operator Hooks**: Optional IRC operator password via env (`IRC_OPER_PASS`) for moderation from a real IRC client; no in-game moderation UI in this change.

## Capabilities

### New Capabilities
- `irc-server`: The embedded TCP IRC server: connection registration, nickname registry, channel lifecycle for `#afterlight`, PRIVMSG (channel and DM), keepalive, graceful shutdown, and client-compatibility numerics.
- `chat-irc-bridge`: The bridge between game WebSocket sessions and the IRC server: per-player server-side IRC sessions, bidirectional message relay, DM relay, presence sync, and nickname reservation.
- `in-game-chat`: The player-facing chat experience: HUD panel, channel and DM message display, slash commands (`/msg`, `/me`), history on join, input focus behavior that coexists with movement keys, and chat enabled/disabled states when disconnected.

### Modified Capabilities
<!-- None: existing multiplayer, garden, market, and exploration requirements are unchanged. -->

## Impact

- **New server code**: `server/irc.js` (protocol + connection handling), `server/chat.js` (bridge manager) wired into `server/index.js`; TCP listener runs alongside the HTTP/WebSocket server and is covered by `close()`.
- **Shared protocol**: New chat MSG_TYPES in `shared/protocol.js` (additive only).
- **Client code**: New `src/ui/chatPanel.js` (or similar) integrated into `index.html` HUD and `src/style.css`; input key handling must yield to movement-key state (no WASD while typing, Escape releases focus); `src/net/client.js` gains chat send methods.
- **No new npm dependencies**: the IRC server is implemented with Node's `node:net`; no external IRCd or client library.
- **Ports**: server now binds an additional configurable TCP port (default 6667); deployment docs must note it.
- **Tests**: Node test-suite coverage for IRC handshake/numerics, channel relay, DM relay, nickname reservation/collision, and bridge presence sync via real socket connections.
- **README**: player-facing chat controls and IRC connection instructions (host/port, how to attach a bot).
