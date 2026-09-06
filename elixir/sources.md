# Evidence and references

Reviewed 2026-09-06. External references describe frameworks; room design, capacity estimates and migration strategy are proposed engineering choices, not vendor guarantees.

## Repository evidence

- `package.json`, `README.md`, `AGENTS.md`: stack, player behavior and integration requirements.
- `src/net/client.js`: guest ID storage, raw WS transport, reconnect and desiredRoom replay.
- `server/index.js`: guest handshake, domain dispatch, HTTP uploads and 100 ms / 1 s tickers.
- `server/world.js`: process-local rooms, finite coordinate validation and dirty-room full occupant snapshots.
- `server/storage.js`: synchronous whole-state JSON persistence and error behavior.
- `server/theater.js`: shared reducer delegation and save-before-broadcast intent.
- Repository map and documented contracts identify `shared/*`, `server/iptv.js`, `server/torrents.js`, `server/irc.js` and `src/ui/theaterScreen.js` for detailed parity work in phase 0. This was an architectural inspection, not an exhaustive implementation audit of every module.

## Official sources

- [Phoenix Channels](https://hexdocs.pm/phoenix/channels.html): topic-based realtime communication and PubSub.
- [Phoenix Presence](https://hexdocs.pm/phoenix/presence.html): distributed presence tracking.
- [LiveView JavaScript interoperability](https://hexdocs.pm/phoenix_live_view/js-interop.html): hooks, lifecycle callbacks and JS integration.
- [Ecto.Multi](https://hexdocs.pm/ecto/Ecto.Multi.html): grouping transactional repository operations.
- [Membrane WebRTC plugin](https://hexdocs.pm/membrane_webrtc_plugin/readme.html): ExWebRTC-based sources/sinks and Phoenix signaling demos.
- [Original RTC Engine repository](https://github.com/membraneframework-labs/membrane_rtc_engine): archived, points to successor.
- [Fishjam RTC Engine repository](https://github.com/fishjam-cloud/membrane_rtc_engine): archived November 12, 2025; explicitly no longer maintained.
- [Archify](https://github.com/tt-a1i/archify): typed architecture JSON compiled into standalone interactive HTML.

No current service pricing or vendor throughput claims were used. Select and pin dependency versions after the interoperability spike rather than treating documentation's displayed latest versions as a tested stack.
