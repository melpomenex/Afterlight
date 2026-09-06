## 1. IRC Server Core (`server/irc.js`)

- [ ] 1.1 Implement the line protocol layer: CRLF framing, 512-byte limit with UTF-8-safe truncation, tolerant parser (unknown command → 421; garbage input never throws)
- [ ] 1.2 Implement the `Connection` abstraction (TCP sockets + synthetic bridge sessions) with registration state, per-connection flood guard, and idle PING/timeout reaping
- [ ] 1.3 Implement registration: NICK/USER, RFC nick charset sanitization, case-insensitive unique nick registry with 433, welcome numerics 001–004, 451 for pre-registration commands
- [ ] 1.4 Implement channel support: always-present `#afterlight` with topic, JOIN (332/353/366 + member announcements), PART, NAMES, QUIT cleanup and announcements
- [ ] 1.5 Implement PRIVMSG fan-out for channel and nickname targets, error numerics 401/411, CTCP ACTION pass-through as raw line (bridge interprets)
- [ ] 1.6 Implement client-compatibility surface: CAP LS/END (empty), PING/PONG, WHO/WHOIS minimal numerics (352/315, 311/318), TOPIC, OPER with env credentials (381/464)
- [ ] 1.7 Implement the TCP listener with `IRC_PORT`/`IRC_DISABLED` env handling, startup log line, and graceful shutdown (QUIT all + close) wired into `createServer().close()`

## 2. Chat Bridge (`server/chat.js`)

- [ ] 2.1 Implement per-player synthetic IRC sessions: creation on WELCOME, nick derivation/reservation with `_`/counter suffix policy, JOIN `#afterlight`, teardown on disconnect
- [ ] 2.2 Implement outbound relay: `chat_send` handling with server-side `/msg` + `/me` parsing, sanitization and ~400-char cap, exactly-once echo to the originating player
- [ ] 2.3 Implement inbound relay: channel PRIVMSG → `chat_message` broadcast with `fromKind: 'player'|'irc'|'system'|'action'`, CTCP ACTION detection
- [ ] 2.4 Implement DM relay both directions (`chat_dm`) including unknown-target feedback and privacy (only target receives)
- [ ] 2.5 Implement presence sync: IRC join/part/quit → `chat_presence` system lines; maintain the 100-message `chat_history` ring buffer and send it after WELCOME
- [ ] 2.6 Add `MSG_TYPES` chat constants to `shared/protocol.js` and document additive payload shapes in its header comment

## 3. Server Wiring (`server/index.js`)

- [ ] 3.1 Instantiate IRC server + bridge in `createServer()`, route `chat_send` messages, call bridge teardown in the `ws.on('close')` path, and include IRC shutdown in `close()`
- [ ] 3.2 Add the IRC port to the startup log and `/api/health` response (e.g. `ircPort`), keeping the health contract additive

## 4. In-Game Chat Panel (client)

- [ ] 4.1 Add chat panel markup to `index.html` (log region, input, collapse toggle with unread badge) with accessible names consistent with the existing HUD
- [ ] 4.2 Implement `src/ui/chatPanel.js`: render channel/DM/action/system lines with sender attribution and visual distinctions, auto-scroll with history, unread counting while collapsed
- [ ] 4.3 Style the panel in `src/style.css` using the translucent panel language; resolve overlap with the 901–1100px interaction-card rule, desktop, and ≤560px breakpoints
- [ ] 4.4 Wire input arbitration in `src/main.js`: T/Enter focuses input, typing never moves the player or triggers hotkeys, Escape blurs and restores movement, Enter sends and returns focus
- [ ] 4.5 Wire `src/net/client.js`: `sendChat(text)` helper plus handlers for `chat_history`/`chat_message`/`chat_dm`/`chat_presence`/`chat_error`; handle disconnected state (disabled input + status note, no fake echo)

## 5. Tests (`tests/irc-chat.test.js`)

- [ ] 5.1 IRCd unit/integration tests over real TCP: registration numerics, 433 collision, pre-registration 451, JOIN/topic/NAMES, channel + DM PRIVMSG fan-out, 421/401/411 errors, PING timeout reaping, unknown-input tolerance, OPER 381/464
- [ ] 5.2 Bridge integration tests: WS player + raw IRC client share `#afterlight` traffic both directions, DM relay both directions with privacy assertions, unknown-target feedback, presence sync lines, nick reservation (external client gets 433 for an online player's nick; conflicted player gets suffixed handle)
- [ ] 5.3 History and lifecycle tests: late joiner receives bounded history, exactly-once echo, server `close()` disconnects IRC clients cleanly, chat works with IRC listener disabled (`IRC_DISABLED=1`)
- [ ] 5.4 Protocol/additive tests: existing suites still pass unchanged (`npm test` green) proving no packet regressions

## 6. Docs & Verification

- [ ] 6.1 Update README: chat controls (T/Enter, Escape, `/msg`, `/me`), IRC connection info (host/port, topic, oper env), bot attachment notes and deployment caveat about TCP reachability
- [ ] 6.2 Run `npm test` and `npm run build`; resolve real failures (chunk-size warning is pre-existing, not a failure)
- [ ] 6.3 Browser verification via dev server: two browser profiles + one real IRC client (or scripted TCP bot) exchange channel messages and DMs; verify typing safety (wasd in input doesn't move), Escape restore, unread badge, history on reload, and chat panel layout at ~930px and narrow viewport
- [ ] 6.4 Verify persistence/discard expectations: reconnect shows recent history, no chat data written to `afterlight-save` or player storage; old saves unaffected
