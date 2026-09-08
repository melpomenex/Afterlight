# Evidence: fix-theater-iptv-state-propagation

## Root cause

1. **`theater_channel` rejected at gateway.** `Afterlight.Theater.Gateway` `@queue_ops` omitted `"channel"`, so IPTV flips returned `invalid_action` with no DB commit and no `theater_state`.
2. **Client epoch filter dropped bill snapshots.** `shouldApplyRoomFrame` treated missing `epoch` as `0`, discarding `theater_state` after `presence_update` with `epoch >= 1`.
3. **Secondary:** Phoenix never returned synchronous `theater_state` on commit (async outbox only); outbox marked `published_at` even when no room process existed.

## Before

```
C → S  theater_channel     YES (wire)
S → C  error / no state    invalid_action OR theater_state dropped (epoch 0 < newest)
Client applyState          never runs with new HLS item
hls.loadSource             never called
Network .m3u8 GET          none
```

## After

```
C → S  theater_channel           YES
S     commit now.kind == hls      YES
S → C  theater_state (immediate) YES (commit_replies)
S → room broadcast (flush)        YES (OutboxRelay.publish_pending)
Client applyState                 YES (epoch omitted on theater_state)
loadCurrent → attachHls path      YES
hls.loadSource(channel.m3u8)      invoked (client test); smoke proves theater_channel bill
```

## Tests

| Suite | Test |
|-------|------|
| Elixir | `Afterlight.Theater.GatewayTest` — channel commits + replies |
| Elixir | `AfterlightWeb.GameChannelIptvTest` — initiator + second client |
| Elixir | `Afterlight.Theater.DomainTest` — relay delivered vs no_room defer |
| JS | `tests/theater-hls-state.test.js` — HLS resolvedPlayback, duplicate suppress |
| JS | `tests/net/room-epoch.test.js` — theater_state after presence |
| Smoke | `scripts/theater-streaming-smoke.mjs` — `theater_channel` HLS block |

## Commands run

```bash
npm test                                    # 640/640 pass
cd server_elixir && MIX_ENV=test mix ecto.migrate
cd server_elixir && mix test test/afterlight/theater/gateway_test.exs \
  test/afterlight_web/game_channel_iptv_test.exs test/afterlight/theater/domain_test.exs  # 14/14 pass
openspec validate fix-theater-iptv-state-propagation --strict  # valid
```

## Multi-client

`GameChannelIptvTest` "two occupants receive the same hls item" asserts matching `now.id` on both sockets.

## Limitations

- Browser Playwright automation not added; smoke script covers WS-level `theater_channel` against live stack.
- External Mux test stream used in smoke (not a local HLS fixture).
- Catalog boot/migration remains in `fix-iptv-playback-elixir`.
