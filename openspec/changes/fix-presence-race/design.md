## Context

`NetworkClient.send()` (`src/net/client.js:132`) drops packets unless the socket is `OPEN`. `setRoom()` calls `net.joinRoom()` once during page load (`src/main.js:303`), before the handshake finishes, so `JOIN_ROOM` is lost and the server leaves the player roomless. The server's `HELLO` handler does not assign a room. `world.joinRoom()` (`server/world.js:29`) is already idempotent for same-room re-joins (it only broadcasts leave when the room actually changes), which the fix can rely on.

## Goals / Non-Goals

**Goals:**
- A player who loads the page always ends up in their requested room (or the default court).
- Reconnect restores room membership without a page reload.
- No regression for the normal travel path (`setRoom` while connected).

**Non-Goals:**
- General packet queueing/replay for all message types.
- Cross-district presence, interest management, or proximity filtering.

## Decisions

- **Client stores the desired room and re-sends `JOIN_ROOM` from `onopen` after `HELLO`** — chosen over queueing all packets (larger change to `send()` semantics for one packet's benefit) and over a server-side default room alone (places the player in the court but silently loses a requested `garden:<id>` room on reconnect).
- **Server assigns the default Market Court room on `HELLO` as a safety net** — guarantees roomless states are transient even if a client version misbehaves.
- **Ignore movement from roomless players server-side** — cheap guard in the movement handler; prevents reliance on undefined room keys.

## Risks / Trade-offs

- [Double `JOIN_ROOM` (load-time send + `onopen` resend)] → `world.joinRoom` is already idempotent for the same room; add a regression test asserting no duplicate `PRESENCE_JOIN` reaches other clients.
- [Reconnect to a garden room the player was visiting] → resend the last requested room; garden state is re-sent by the server on room entry, so no extra recovery path is needed.

## Migration Plan

None. Additive behavior change; no state format touched. Rollback is a revert.

## Open Questions

None.
