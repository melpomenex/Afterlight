## 1. Investigation & specification

- [x] 1.1 Trace client, gateway, outbox, and Node comparison; document failure model
- [x] 1.2 Create OpenSpec proposal, design, spec deltas, tasks
- [x] 1.3 Multi-agent review incorporated into design

## 2. Server fixes

- [x] 2.1 Add `"channel"` to `Theater.Gateway` allowed ops
- [x] 2.2 Return immediate `theater_state` in `commit_replies/2`
- [x] 2.3 Call `OutboxRelay.publish_pending/0` after successful commit
- [x] 2.4 Defer outbox `mark_published` when room process absent; telemetry distinction

## 3. Client fix

- [x] 3.1 `shouldApplyRoomFrame`: skip epoch compare when `epoch` field absent

## 4. Tests

- [x] 4.1 Elixir gateway/domain: `channel` op commits HLS item
- [x] 4.2 GameChannel: `theater_channel` → `theater_state` to initiator
- [x] 4.3 GameChannel: two clients receive same HLS state
- [x] 4.4 JS: `applyState` HLS reaches `loadSource` mock; duplicate suppressed
- [x] 4.5 JS: `room-epoch` theater_state without epoch after presence
- [x] 4.6 WS smoke: `theater_channel` HLS path

## 5. Verification

- [x] 5.1 `npm test`
- [x] 5.2 `mix test` in `server_elixir`
- [x] 5.3 `openspec validate --change fix-theater-iptv-state-propagation --strict`
- [x] 5.4 Evidence file recorded
