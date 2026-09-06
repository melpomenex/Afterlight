# Design: social chat relay (P7 window)

## Context

The adversarial review found chat had no owning change: P2 relayed it, P3 explicitly declined it (`add-world-room-runtime` non-goal — moving it there would entangle the Node IRC bridge boundary), and no later change owned row 16 even though `remove-node-server-authority` audits it. Today's facts (protocol-catalog §1, `server/chat.js`):

- One global channel `#afterlight`; the relay keeps `HISTORY_KEEP = 100` and delivers `HISTORY_DELIVER = 50` targeted after hello; `chat_history {channel, messages}` order is insertion order. Memory only — a restart loses it (current behavior).
- `chat_send`: raw hard limit 600 (rejection is a targeted `chat_error` with a human string), `cleanText` strips control chars, collapses whitespace runs, trims, then caps at 400 sanitized. `/me <action>` sets the `action` flag; `/msg <name> <text>` DMs; usage errors (`Usage: /me <action>`), the commands help text, unknown-command and absent-target strings are wire protocol.
- Delivery: `chat_message {channel, from, fromKind, text, ts, action?}` broadcast ALL with the sender echoed exactly once — today this is a property of the IRCd fan-out (the synthetic session's PRIVMSG is fanned out by the IRC server, which excludes the sender); degraded mode (IRC off) delivers in-game directly. `chat_dm` goes to both parties with `echo: true` on the sender's copy only. `fromKind` is `player`, `irc`, or `system`. `chat_presence {channel, event, who, fromKind, ts}` join/part broadcast ALL.
- IRC: `server/irc.js` is the embedded IRC server; `server/chat.js` bridges every player as a synthetic IRC session and translates IRC events back into `chat_message`/`chat_dm`/`chat_presence`. The bridge halves (game sessions, ring) and the IRC halves (event translation) live in one file today.
- `add-node-specialty-adapters` (same P7 window) defines the authenticated adapter with message IDs + origin-scoped echo suppression; this change is its chat-side consumer.
- P6 has already moved `hello` to Phoenix, so `Social` composes `chat_history` directly in the connection order; no Node round-trip remains for chat after this change.

## Goals / Non-Goals

**Goals**

- One owner for the game chat relay: `Afterlight.Social`, flipped server-side at the gateway like every other domain.
- Byte-exact wire behavior: parsing, caps, echo-exactness, error strings, and the 50-of-100 ring proven by fixtures against the Node baseline before the flip.
- Loop-free IRC exchange over the authenticated adapter (message IDs + origin-scoped suppression), with sidecar-outage degradation as a tested contract.
- Preserve the connection order (`hello` → `welcome` → `garden_state` → `chat_history` → join snapshots) and `chatPanel.js` behavior with zero client changes.

**Non-Goals**

- No chat persistence, moderation, rate-limiting beyond today's caps, or IRC feature work — additive history persistence is a declared follow-up requiring its own behavior-change justification.
- No change to the retained IRC sidecar's process model (`server/irc.js` stays Node, row #17).
- No new message types or fields; the catalog is frozen.
- No multiple channels or per-room chat scoping (the single `#afterlight` channel is current behavior).

## Decisions

### D1 — `Afterlight.Social` owns the relay; one flip, then Node game-relay halves die
*Decision:* A `Afterlight.Social.Relay` process (single global channel) owns sessions, the ring, and delivery. The gateway router flips `chat_send`/`chat_message`/`chat_dm`/`chat_history`/`chat_presence`/`chat_error` to `phoenix`; in the same release the game-relay portions of `server/chat.js` (session registry, ring, in-game delivery) are disabled while the IRC-facing halves stay as the sidecar bridge behind the adapter. This restores the single-writer discipline for the relay: exactly one chat writer per routing position, config-owned.
*Alternative Considered:* Keeping chat on Node and only authenticating the adapter — rejected: the review's finding is that no change owns chat; leaving the relay on Node leaves row 16 unauditable and the IRC boundary half-migrated.

### D2 — Ring and history: keep 100, deliver 50, ephemeral by declared default
*Decision:* The relay keeps the last 100 accepted channel messages and delivers the last 50 targeted after `garden_state`, in insertion order, exactly today's `HISTORY_KEEP`/`HISTORY_DELIVER` semantics. The ring is process memory with a bounded size (trim-on-insert); nothing is written to PostgreSQL. Persistence is explicitly a follow-up: saving history is a durability/behavior change (restart-visible) that needs its own justification under the migration's client-preservation rules, so this change declares ephemeral as the default rather than leaving it ambiguous.
*Alternative Considered:* Persisting the ring now while moving the relay — rejected: mixing a durability addition into an authority move confounds parity failures with intended behavior changes (the same rule the P6 change applies to known quirks).

### D3 — Echo-exactness is a contract, not a side effect of the IRCd
*Decision:* `Social` delivers `chat_message` to ALL local sessions exactly once per message, sender included, and tags IRC-originated deliveries with `fromKind: "irc"`; the adapter ledger (D5) guarantees an IRC round-trip can never add a second copy. `chat_dm` sends two targeted frames — recipient without `echo`, sender with `echo: true` — with the same `ts`. Where today's exactly-once property is an artifact of the IRC server excluding the sender from fan-out, Elixir makes it an explicit, tested invariant so it holds in degraded mode and across the adapter.
*Alternative Considered:* Porting the synthetic-IRC-session architecture wholesale (players as fake IRC clients inside Social) — rejected: it drags the IRC server's semantics into Elixir, violating the retained-sidecar decision and the no-IRC-feature-change non-goal.

### D4 — Parser and caps ported 1:1 under parity fixtures
*Decision:* `Afterlight.Social.Parser` ports `cleanText` (control-char strip set, whitespace collapse, trim), the 600 raw / 400 sanitized caps, `/me`//`/msg` parsing, and every error/help string byte-identically; the exporter gains chat cases (control chars, multi-byte truncation at the 400 boundary, `/msg` to self, `/msg` to an IRC nick, unknown commands) pinned from `server/chat.js`. Fixtures green is the flip gate per governance.
*Alternative Considered:* Reusing the JS parser through the sidecar — rejected: it would keep Node in the chat write path after the flip.

### D5 — IRC exchange over the P7 authenticated adapter with an origin-scoped suppression ledger
*Decision:* `Afterlight.Social.Bridge` exchanges the narrow event set (game→IRC send, IRC→game receive, presence up/down) with the Node sidecar over the authenticated adapter from `add-node-specialty-adapters`. Every event carries a unique message ID plus `{origin: game|irc, id}`; the bridge keeps a bounded LRU of seen IDs per origin and drops re-entrant events carrying a seen ID, so reflection loops are impossible by construction rather than by IRCd courtesy. Sidecar down ⇒ game-only relay (D3's local fan-out covers it), IRC presence marked down, no chat-path errors; reconnect re-establishes the exchange without manual repair.
*Alternative Considered:* A fire-and-forget adapter without IDs (today's shape) — rejected: it is exactly the "accidental tolerance" the specialty-adapters change exists to make contractual.

### D6 — Ordering and lifecycle parity at the gateway
*Decision:* The gateway composes `chat_history` into the documented connection order after `garden_state` (P6 already serves `hello`/`welcome`), and `chat_presence` join/part fire on player connect/disconnect and IRC join/part exactly once per transition (superseded duplicates produce no extra pair — the P3 duplicate-connect rule already guarantees one logical session per player). Rollback: flip the `chat_*` router entries back to `node`; ephemeral history does not survive the flip in either direction and the docs say so.
*Alternative Considered:* Delivering history from a gateway cache independent of `Social` — rejected: two components would own the ring, violating single-writer.

## Risks / Trade-offs

- *[Echo duplication at the boundary]* → origin-scoped suppression ledger (D5) with tests for game→IRC→game and IRC→game→IRC reflection; ledger is bounded LRU so memory is O(recent).
- *[Parity rot in parsing/error strings]* → the chat fixture set is the flip gate; strings are wire protocol and pinned byte-for-byte.
- *[Ring loss on restart surprises nobody]* → current behavior preserved and documented; persistence is a declared follow-up.
- *[Degraded-mode drift (IRC-off paths diverge from bridged paths)]* → degraded mode is exercised by tests with the sidecar stopped, comparing the local fan-out frames against the bridged frames.
- *[History ordering race at connect (join snapshot vs chat_history)]* → composition order pinned in the gateway integration test (`hello` → `welcome` → `garden_state` → `chat_history` → join snapshots).

## Migration Plan

1. Land `Afterlight.Social` + parser/ring/bridge behind the router (still `node` for `chat_*`): zero player-visible change; fixtures ported and green.
2. Dev flip: `chat_*` → `phoenix` with the sidecar up — two-client wire equivalence (messages, DMs, `/me`, history, presence, errors) against the Node baseline; then stop the sidecar and verify game-only degradation.
3. Deploy per environment; in the same release disable the Node game-relay portions of `server/chat.js` (sidecar halves stay); update ownership row #16 and the protocol-catalog disposition table.
4. Rollback: flip `chat_*` entries back to `node` (ephemeral history is lost across the flip — documented). Exit gate: chat survives sidecar crash by test; no `chat_error` from infra failure; ownership audit row 16 has an owning change to cite.
