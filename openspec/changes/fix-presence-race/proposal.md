## Why

Multiplayer presence is broken in real use: a freshly loaded client calls `joinRoom()` during page load, before the WebSocket handshake completes, and `NetworkClient.send()` silently drops the packet (`src/net/client.js:132`). The server then holds the player as connected but belonging to no room, so `broadcastToRoom` never reaches them and their movement never reaches anyone — players cannot see each other. Nothing re-sends the room join from `onopen`. This blocks every multiplayer feature, including the planned crafting and gathering loop that depends on a shared Market Court.

## What Changes

- **Client room re-join**: The client remembers the desired room and sends `JOIN_ROOM` from `onopen` (after `HELLO`), and again on every successful reconnect, instead of relying on a single fire-and-forget call during page load.
- **Server default room**: On `HELLO`, the server assigns a default room (Market Court) so a connected player is always a member of some room and reachable by room-scoped broadcasts.
- **Defensive roomless handling**: Movement updates from a player with no room membership are ignored server-side without errors.
- **Race coverage in tests**: The automated multi-client test connects and requests a room join without waiting for the open event, asserting both clients end up seeing each other.

## Capabilities

### New Capabilities
- `multiplayer-presence`: Reliable room membership on connect and reconnect; room-scoped presence events (`PRESENCE_JOIN`, `PRESENCE_LEAVE`, `PRESENCE_UPDATE`) reach every member of a district room.

### Modified Capabilities
<!-- No existing capabilities exist under openspec/specs/. -->

## Impact

- **Client**: `src/net/client.js` (pending-room state, send-on-open/reconnect), `src/main.js` (`setRoom()` records the desired room instead of relying on the immediate send).
- **Server**: `server/index.js` (default room on `HELLO`), `server/world.js` (roomless movement guard).
- **Tests**: New/updated multi-client presence test in `tests/` reproducing the connect-then-join race.
- **Scope**: Small and self-contained; no save-format, protocol, or world changes. `add-crafting-gathering-loop` depends on this change for verifiable multiplayer behavior.
