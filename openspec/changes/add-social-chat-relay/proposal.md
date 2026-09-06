# Add Social Chat Relay (P7 window)

## Why

The adversarial review of the migration found that the chat relay had no owning change: P2 kept it proxied to Node, P3 explicitly declined it (to avoid entangling the Node IRC bridge boundary), and no later change picks it up — yet `remove-node-server-authority` audits row 16 as "Node write path disabled", so the migration plan has a hole exactly where a player-visible surface sits. Chat is the last transient relay on Node (`server/chat.js`: ring buffer, `/me`//`/msg` parsing, DM routing, and the IRC bridge in one file) and shares that file with the IRC sidecar boundary that `add-node-specialty-adapters` authenticates. This change gives the relay an owner: `Afterlight.Social` in Phoenix, with the IRC exchange moved onto the P7 authenticated adapter so game chat survives sidecar loss by contract rather than by accident.

## What Changes

- New Ash-free context `Afterlight.Social` owns the game chat relay: `chat_send` (≤600 raw chars hard-limit, control-char strip + whitespace collapse + 400-char sanitized cap — parity-ported), `/me` and `/msg` parsed server-side exactly as today, and `chat_error` targeted responses with byte-identical strings.
- `chat_message` broadcast to ALL with the sender echoed exactly once (single fan-out, sender included once — the property the IRCd fan-out provides today); `chat_dm` delivered to both parties with `echo: true` on the sender's copy only; `chat_presence` join/part broadcast ALL on player connect/disconnect and IRC join/part.
- History ring preserved: keep the last 100 messages per the `#afterlight` channel, deliver the last 50 as targeted `chat_history` after hello in the documented connection order. The ring stays ephemeral (in-memory) by default — persistence is a declared follow-up requiring its own behavior-change justification, not scope here.
- IRC bridge boundary: Phoenix `Social` exchanges events with the Node IRC sidecar (`server/irc.js` + bridge, retained) over the P7 authenticated adapter from `add-node-specialty-adapters` — every relayed message carries a unique message ID plus an origin-scoped echo-suppression key (`{origin: game|irc, id}`) so game→IRC→game or IRC→game→IRC reflection cannot double-deliver. If the sidecar is down, `Social` degrades to game-only relay (today's degraded-mode behavior) and marks IRC presence down instead of erroring the chat path.
- Gateway router flips the `chat_*` entries to Phoenix; at the same release the Node game-relay portions of `server/chat.js` are disabled (the IRC sidecar portions stay). `irc.js` itself is retained unchanged (ownership row #17).
- No client changes: every message type, field set, and error string is byte-identical; the client keeps its storage, handlers, and `chatPanel.js` behavior.

Depends on: `add-world-room-runtime` (gateway routing, room runtime, and the documented P3 decision that chat stays proxied until an owning change exists). This change lands alongside `add-node-specialty-adapters` in the P7 window (it consumes that change's authenticated IRC adapter boundary) and before `remove-node-server-authority` (which audits row 16 as cut over).

## Capabilities

### New Capabilities

- `social-chat-relay`: the game chat relay owned by `Afterlight.Social` — parity-exact `chat_send` parsing and caps, exactly-once sender echo on `chat_message`, both-parties `chat_dm` with sender `echo: true`, targeted `chat_error` strings, the 50-of-100 ephemeral history ring delivered in the documented connection order, `chat_presence` join/part, and the authenticated IRC adapter boundary with message IDs + loop prevention so game chat survives sidecar outage.

### Modified Capabilities

None. `world-room-runtime`'s "chat stays proxied" requirement is satisfied (not weakened) by this change becoming the owning change the requirement defers to; `gateway-transport`'s routing requirement continues to apply with the `chat_*` router entries flipped server-side.

## Impact

- **Elixir (new)**: `server_elixir/lib/afterlight/social/` (relay process, ring, parser, delivery), `Afterlight.Social.Bridge` (IRC adapter client over the P7 authenticated boundary, message-ID + echo-suppression ledger), `Gateway.Router` chat entries flipped to `phoenix`, connection-order composition so `chat_history` still arrives after `garden_state`.
- **Node (modified)**: `server/chat.js` game-relay portions (session registry, ring, in-game delivery) disabled at the flip; `server/irc.js` and the IRC-facing bridge halves stay as the retained sidecar behind the authenticated adapter. No removal of Node files yet (P11 retires them).
- **Client**: none — `src/ui/chatPanel.js`, `src/net/client.js` chat handlers, message shapes, and error strings unchanged.
- **Persistence**: none — the history ring stays ephemeral (in-memory 100, deliver 50), matching current behavior; persistence remains a declared follow-up.
- **Tests**: existing JS tests stay green; new Elixir unit tests (parser, ring, echo-exactness, suppression ledger), adapter tests (loop prevention, sidecar-down degradation), and two-client wire equivalence for the chat surface.
- **Docs**: `docs/architecture/elixir/ownership.md` row #16 marked cut over in the P7 window; `protocol-catalog.md` disposition table gains the chat flip.
