# P5 task 9.2 — two-client theater wire soak
Recorded: 2026-09-10T15:19:06.881Z

- PASS two-client add broadcasts theater_state to both
- PASS playNow promotes queued item
- PASS pause updates playing flag
- PASS seek clamps position
- PASS resume restores playing
- PASS iptv_list_get returns channel array (channels=4038)
- PASS epg_lookup returns entries map
- PASS playlist mix declined via error frame (Radio mixes never end, so the projector cannot pin them down — add the video itself instead.)
- PASS theater_state revision stream grew

Automated via `node scripts/verify-theater-cutover.mjs` against live Phoenix gateway.
