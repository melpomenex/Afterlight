# P11 e2e sweep

Recorded: 2026-09-07 (automated wire legs via `npm run verify:p11`).

| Step | Result | Notes |
|---|---|---|
| verify:gateway | PASS | token, hello, join, movement, chat relay, reconnect, proxied health |
| verify:world | **PARTIAL** | 1 §5 failure: `self-echo frames carry playerId == guestId` (pre-existing wire leg; other §5 checks pass) |
| verify:chat | PASS | chat order, DM, history after garden_state |
| snapshot-hashes | PASS | all three files match recorded SHA-256 |

## Manual / live-stack (not automated here)

- Two real browsers on `npm run dev:stack`: theater torrent Range stream, IPTV booth, EPG guide
- Emote wheel + travel gates across districts
- Reconnect with fresh snapshots after gateway restart
