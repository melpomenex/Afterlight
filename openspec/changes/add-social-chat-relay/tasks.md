## 1. Parity fixtures and parser port

- [ ] 1.1 Extend the parity exporter with chat cases pinned from `server/chat.js`: `cleanText` (control-char strip set, whitespace-run collapse, trim), raw 600 / sanitized 400 caps (incl. multi-byte characters at the truncation boundary), `/me`//`/msg` parsing (bare command, unknown command, missing args, `/msg` to self, `/msg` to an online player, `/msg` to an IRC nick, absent target), and every error/help string byte-for-byte.
- [ ] 1.2 Port `Afterlight.Social.Parser` (pure): caps, sanitization, command parsing, and stable error strings; wire into the `Afterlight.Parity` runner and get every chat fixture green (this gates the flip).

## 2. Social relay

- [ ] 2.1 Implement `Afterlight.Social.Relay`: single `#afterlight` channel, in-memory ring keeping the last 100 accepted messages (bounded trim-on-insert), targeted `chat_history` of the last 50 composed after `garden_state` in the documented connection order.
- [ ] 2.2 Implement delivery contracts: `chat_message {channel, from, fromKind, text, ts, action?}` broadcast ALL with the sender echoed exactly once (tested invariant, holds in bridged and degraded modes); `chat_dm` to both parties with `echo: true` on the sender's copy only and matching `ts`; `chat_error` targeted with the ported strings.
- [ ] 2.3 Implement `chat_presence {channel, event, who, fromKind, ts}` join/part broadcast ALL on player connect/disconnect (superseded duplicates produce no extra pair — reuse the P3 one-logical-session rule) and on IRC join/part with `fromKind` parity.

## 3. IRC adapter boundary

- [ ] 3.1 Implement `Afterlight.Social.Bridge` over the authenticated adapter from `add-node-specialty-adapters`: events game→IRC send, IRC→game receive, presence up/down; unique message IDs plus origin-scoped `{origin: game|irc, id}` echo-suppression keys with a bounded LRU seen-ledger; reflection loops (game→IRC→game, IRC→game→IRC) covered by tests that assert exactly one delivery.
- [ ] 3.2 Implement sidecar-outage degradation: with the sidecar stopped, game messages, DMs, history, and presence keep working unchanged, IRC presence is marked down, and no `chat_error` is produced by the outage; reconnect re-establishes the exchange without manual repair.

## 4. Gateway routing and flip

- [ ] 4.1 Flip the `chat_*` entries in `Gateway.Router` to `phoenix` behind config (server-side only; clients cannot choose) and compose `chat_history` into the connection order (`hello` → `welcome` → `garden_state` → `chat_history` → join snapshots) with an integration test pinning the order.
- [ ] 4.2 In the same release, disable the Node game-relay portions of `server/chat.js` (session registry, ring, in-game delivery) while the IRC sidecar halves stay behind the adapter; keep `npm test` green with the disabled paths encoded in the JS tests.

## 5. Tests

- [ ] 5.1 Unit: parser edge cases, ring bounds (100 keep / 50 deliver), exactly-once echo in bridged and degraded modes, DM echo flag, presence single-fire under duplicate connect.
- [ ] 5.2 Adapter: message-ID suppression for both reflection directions, LRU bounding, sidecar-down degradation frames, reconnect recovery.
- [ ] 5.3 Two-client wire equivalence against a Node recording: message, DM, `/me`, history, presence, and error sequences match field-for-field with `src/ui/chatPanel.js` untouched.

## 6. Cutover and verification

- [ ] 6.1 Rehearse on staging: fixtures green → flip `chat_*` → two-browser chat session (channel, DM, `/me`, reconnect history) → stop the IRC sidecar and verify game chat survives → record evidence.
- [ ] 6.2 Update `docs/architecture/elixir/ownership.md` row #16 (cut over in the P7 window) and the `protocol-catalog.md` §2 disposition table (chat terminated by `Afterlight.Social`; IRC sidecar boundary authenticated); document the rollback flip and its ephemeral-history caveat.
