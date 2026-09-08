## 1. Transport: restore and guard the gateway origin contract

- [x] 1.1 Restart the local dev stack onto HEAD config (`scripts/dev-elixir-stack.sh`); confirm with curl that `POST /api/auth/guest` answers 200 and the `/ws/websocket` upgrade with `Origin: http://localhost:5173` + a guest token answers 101 (and that an unlisted origin answers 403).
- [x] 1.2 Add an Elixir config-resolution test: dev endpoint origin list includes the Vite origins; `PHX_CHECK_ORIGIN=false` disables the check; a CSV value overrides the list.
- [x] 1.3 Extend `scripts/dev-elixir-stack.sh` with a post-boot handshake smoke check (guest token + browser Origin → expect 101; log the failing origin/status and exit non-zero on mismatch).
- [x] 1.4 Confirm the gateway logs rejected origins with the offending value (Phoenix default or a small log statement); add coverage or a manual verification note.

## 2. Hardening on the streaming path

- [x] 2.1 Consolidate the theater room key into one shared definition used by `Afterlight.Theater.OutboxRelay` and the specialty rules; add a regression test asserting the relay's Registry lookup key equals the world runtime's theater wire id.
- [x] 2.2 Log (debug-level) when the outbox relay finds no theater room process at publish time; add a telemetry event for published theater_state frames (room, revision) so silent no-op cannot recur unnoticed.
- [x] 2.3 Give `/api/theater/torrent/*` proxy requests an env-tunable longer Finch `receive_timeout` (default ~5 min) while other proxied paths keep 60 s; document the knob alongside the existing proxy config; unit-test the per-path timeout selection.
- [x] 2.4 Add an Elixir channel-level test for stale-live-item self-heal: join snapshot with a live item past its duration → one `ended` → exactly one advance; concurrent duplicate `ended` reports collapse via the item generation guard; queue drains to idle.
- [x] 2.5 Run `mix test` (server_elixir) and `npm test`; resolve failures.

## 3. End-to-end streaming verification pass (browser)

- [x] 3.1 Write the pass checklist/script under `scripts/` (dedicated probe guest, add+remove restore, never `clear`, fixtures untouched) covering: YouTube link, Vimeo link (if available), direct `.mp4` URL, `.m3u8` URL, magnet resolve → pick → granted stream, IPTV guide flip, playlist import preview.
- [x] 3.2 Run the pass against `npm run dev:stack`; for each source kind observe actual playback on the screen overlay (visible state change, not just WS frames), including a second occupant seeing bill changes live.
- [x] 3.3 Fix whatever the pass surfaces (client engine in `src/ui/theaterScreen.js`, grant mint/renewal in `Afterlight.Specialty`, `torrent_state` pass-through, BillSync, EPG/`iptv_list` flows), keeping changes within this change's scope; re-run until green.
- [x] 3.4 Verify failure modes: unsupported URL rejected with readable message; a failed/stalled item advances with a visible error and does not wedge or duplicate.
- [x] 3.5 Confirm bill/saves integrity after the pass: probe items removed, no duplicate queue entries, reload restores correct completed/visited state for the probe profile.

## 4. Spec/docs alignment and wrap-up

- [x] 4.1 Update `docs/architecture/elixir/ownership.md` §5 and `parity-notes.md` with the verified streaming posture (origin contract, grant+proxy Range path, relay key consolidation).
- [x] 4.2 Update README player-facing notes if any user-visible control or behavior changed during fixes (expect: none or minor).
- [x] 4.3 Run `openspec validate --change fix-theater-streaming-after-elixir-cutover --strict`; archive-ready check: proposal/specs/design/tasks consistent with what landed.
