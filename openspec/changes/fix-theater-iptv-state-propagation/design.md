## Context

Theater bill mutations on Phoenix commit to Postgres, enqueue an outbox row, and rely on `OutboxRelay` (1 s tick) → `RoomServer.broadcast_frame` → `GameChannel` push. The Node path called `world.broadcastToRoom` synchronously in the same handler turn, including the initiator.

IPTV tuning uses `theater_channel` → `op: "channel"` → `start_now` with `kind: "hls"`. The client never calls `hls.loadSource()` until `applyState()` receives authoritative `theater_state`.

## Root cause (proven)

| Step | Before fix | Evidence |
|------|-----------|----------|
| Client sends `theater_channel` | Yes | `theaterScreen.js` `sendChannel` |
| Gateway accepts `channel` op | **No** | `gateway.ex` `@queue_ops` omits `"channel"` |
| DB commit + outbox | Never reached | `invalid_action` reply |
| Initiator gets `theater_state` | No | `commit_replies` returns `[]` |
| Relay broadcast | N/A / delayed | 1 s tick; marks published even if room absent |
| Client `applyState` | Skipped | Missing epoch → treated as 0, dropped after presence |

## Goals

**G1.** Successful `theater_channel` with `.m3u8` commits `now.kind == "hls"` and delivers `theater_state` to the initiator on the command path.

**G2.** Other theater occupants receive the same committed state via room broadcast without duplicate queue items.

**G3.** Join/reconnect snapshots unchanged.

**G4.** Duplicate `theater_state` (immediate + relay) does not double-call `hls.loadSource()` for the same item.

**G5.** Outbox `published_at` means relay processed delivery attempt; absent room process defers publish (retry).

## Decisions

**D1 — Add `"channel"` to gateway queue ops.** Matches reducer `run_op("channel", ...)` and Node `theater_channel` normalization. Single-line allow-list fix.

**D2 — Immediate `theater_state` reply on every successful commit.** `commit_replies` appends `{"theater_state", %{theater, serverNow}}` from the commit struct. Initiator never depends solely on outbox latency.

**D3 — Synchronous `OutboxRelay.publish_pending()` after commit.** Mirrors economy `flush_player` pattern; notifies other occupants in the same turn. Requester may receive duplicate state; client `playKey` / idempotent `applyState` suppresses reload.

**D4 — Epoch exemption for missing `epoch`.** In `shouldApplyRoomFrame`, only compare epochs when `typeof frame.epoch === 'number'`. Untagged/`theater_state` snapshots apply when `roomId` matches. Explicit low epoch still rejects stale presence frames.

**D5 — Outbox defer on `:no_room`.** `broadcast_theater_state` returns `:delivered` | `:no_room`. Only `:delivered` marks `published_at`. Empty room with live process still `:delivered` (zero-member broadcast is intentional no-op; join snapshot covers late joiners).

## Authoritative contract (post-fix)

```
The initiating live client SHALL receive committed theater_state on the
successful command path.

Other current occupants SHALL observe the same state via synchronous
outbox flush + room broadcast.

A reconnecting occupant SHALL receive the latest state via join snapshot.

The browser SHALL NOT depend solely on a delayed outbox poll to begin
playback after its own successful command.
```

## Risks

- Duplicate delivery → mitigated by client `loadedPlayKey` tests.
- Outbox backlog if room never starts → bounded; join snapshot + DB are authoritative.
- Ordering: immediate reply before relay duplicate is safe; same revision.

## Migration

No schema change. Deploy gateway + client together for epoch fix; server-only partial deploy still benefits from D1–D3.
