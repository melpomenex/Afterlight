## Why

Since the Phoenix gateway cutover, theater streaming is broken in practice: a player who pastes a YouTube link, a magnet, an `.mp4`, or an `.m3u8` URL into the Orpheum booth sees nothing play. Diagnosis against the live stack (2026-09-07) found the dominant root cause: the browser never reaches the gateway at all — guest auth over HTTP succeeds, but the WebSocket upgrade from the Vite dev origin (`http://localhost:5173`) is rejected with **403 Forbidden**, because the gateway that was running when the cutover landed had no `check_origin` configuration (Phoenix's default rejects cross-origin sockets). With no socket there is no `theater_state`, no `iptv_state`, no bill ops, no torrent grants — every source kind fails identically, which is exactly the reported symptom. The config fix landed at HEAD (`926a802`), but nothing verified it end to end, the local gateway was never restarted onto it, and the streaming path behind a connected socket (YouTube/Vimeo engines, direct file/HLS playback, torrent resolve → pick → grant → Range stream through the gateway proxy) has not been proven as a whole since Node stopped owning the theater.

## What Changes

- **Restore and prove the transport**: run the gateway on the HEAD `check_origin` config (dev stack restart) and add a regression guard so a gateway that rejects the configured browser origins fails loudly (automated handshake check + doctor/smoke coverage), instead of presenting as an eternal silent "reconnecting" loop.
- **End-to-end streaming verification pass over the Phoenix stack**, fixing whatever the pass surfaces, for all four source kinds:
  - YouTube/Vimeo (iframe engines driven by Phoenix-owned bill state),
  - direct files (`.mp4`/`.webm`) via the client file engine,
  - HLS (`.m3u8`) via hls.js/native fallback,
  - magnets via the retained Node sidecar behind the specialty adapter: `torrent_resolve` proxy → `torrent_files` → pick → Phoenix-minted `torrent_grant` → Range/206 stream through `AfterlightWeb.HTTPProxy` → `torrent_state` pass-through → BillSync.
- **Harden the found soft spots** that the pass depends on (each currently silent):
  - `Theater.OutboxRelay` no-ops silently when the world Registry has no `{RoomServer, "theater"}` entry (room-key mismatch would kill all live bill broadcasts with zero signal);
  - the HTTP proxy's 60 s `receive_timeout` can truncate an otherwise healthy torrent Range stream that pauses mid-transfer;
  - join-time `theater_state` snapshots with a long-stale `now` item (observed: ~20 h old, `playing: true`) must deterministically self-heal via `ended` reporting rather than wedging or mass-draining the queue ambiguously.
- **Spec alignment**: record the delivered grant-and-proxy streaming contract and the gateway origin policy in the repo specs (see Capabilities).
- Documentation: update the Elixir architecture notes (`docs/architecture/elixir/ownership.md` §5 / `parity-notes.md`) and README with the verified streaming posture and the origin-configuration contract.

No changes to what the screen may play, the bill rules, queue caps, or the DOM homography overlay. No new transport. Node remains a read-only sidecar; no dual writes.

## Capabilities

### New Capabilities

- `video-screen`: End-to-end playback of the shared Orpheum screen over the current Phoenix-stack architecture — join-time bill application, all four source kinds playing from a connected client, auto-advance and failure self-healing (stale/fatal items), and the origin-correct transport this playback presupposes. (The `video-screen` directory exists under `openspec/specs/` but is empty; this change populates it.)

### Modified Capabilities

- `multiplayer-networking`: Adds a requirement for the gateway WebSocket origin policy — connections from explicitly configured browser origins (dev client ports, production frontend origin) SHALL be accepted, unlisted origins rejected, and misconfiguration SHALL surface as a loud, diagnosable failure rather than a silent reconnect loop.
- `torrent-streaming`: Amends the Range-capable streaming endpoint requirement for the post-cutover topology — streams are served by the Node sidecar behind the gateway with a Phoenix-minted scoped grant, and the gateway proxy SHALL preserve Range/206 semantics end to end.

## Impact

- **Code likely touched**: `server_elixir/config/runtime.exs` (origin list/env documentation only if the pass surfaces gaps), `server_elixir/lib/afterlight/theater/outbox_relay.ex` (loud no-op path), `server_elixir/lib/afterlight_web/http_proxy.ex` (stream timeout), `server_elixir/lib/afterlight/specialty/*` (grant mint/renewal, status relay, BillSync — only if the pass finds them broken), `src/ui/theaterScreen.js` / `src/net/*` (only if client-side verification surfaces bugs), `scripts/dev-elixir-stack.sh` (smoke check), tests under `server_elixir/test/` and `tests/`.
- **Verification surface**: Elixir channel/transport tests, JS theater model tests, plus a real-browser pass against `npm run dev:stack` exercising each source kind (this is the acceptance gate — DOM/WS-level success has repeatedly masked browser-level failure in this migration).
- **Ops**: the local dev gateway must be restarted onto HEAD config; the production VM already accepts the deployed frontend origin (verified 101 handshake with a Vercel origin), so no production redeploy is required by this change, but the smoke check is written so the next deploy can reuse it.
- **Risk**: low — changes are additive hardening around an already-flipped architecture; rollback is reverting the hardening commits. The stale gateway restart is dev-local.
