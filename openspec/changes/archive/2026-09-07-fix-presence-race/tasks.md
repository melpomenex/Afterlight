## 1. Client room re-join

- [x] 1.1 Add `desiredRoom` state to `NetworkClient`; `joinRoom()` stores it before sending
- [x] 1.2 Send `HELLO` then `JOIN_ROOM(desiredRoom)` from `ws.onopen`, and re-send both in the reconnect path so reconnection restores membership
- [x] 1.3 Update `setRoom()` in `src/main.js` to rely on the stored desired room (no behavior change while already connected)

## 2. Server room assignment

- [x] 2.1 Assign the default Market Court room in the `HELLO` handler when the player has no room
- [x] 2.2 Ignore movement packets from roomless players without errors in the movement handler

## 3. Verification

- [x] 3.1 Add a multi-client test that requests `JOIN_ROOM` before the socket opens and asserts both clients receive each other's presence and movement
- [x] 3.2 Add a reconnect test: drop the connection, reconnect, assert room membership and presence flow resume without a page reload
- [x] 3.3 Run `npm test` and `npm run build`; manually verify two browser windows see each other in the Market Court and stop seeing each other across different districts

> Verified by main agent: 51/51 tests pass on the final merged tree; two browser windows (separate origins → distinct guest IDs) saw each other's avatars and arrival toasts in the same district, alongside a third live client.
