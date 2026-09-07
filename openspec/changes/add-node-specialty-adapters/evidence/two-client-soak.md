# P7 task 6.3 — wire-level specialty soak (partial)
Recorded: 2026-09-07T03:22:55.281Z

Covered in this pass:
- Two gateway clients in theater; shared `theater_state` on add/playNow/pause/seek/resume
- `iptv_list_get` + `epg_lookup` against imported PostgreSQL catalog
- `theater_playlist_resolve` mix decline (`is_mix`)

Deferred to manual staging (requires live torrent + IRC sidecar):
- Torrent Range seek with grant-appended stream URL
- Dual-client resolve cooldown while one resolve in flight
- IRC bridge kill/recover with game chat continuity
- Info-level log audit for absent tokens/magnets

Gate script: `node scripts/verify-theater-cutover.mjs` — PASS
