# P5 dev-environment flip procedure (task 9.3)

Date: 2026-09-07

## Preconditions

- PostgreSQL running with migrations applied (`cd server_elixir && mix ecto.migrate`)
- Parity + domain tests green (`mix test test/afterlight/theater/ test/afterlight/catalog/`)
- Original snapshot files present and hashed (`data/game-state.json`, `data/iptv.json`, `data/epg.json`)

## 1. Import theater + catalog into PostgreSQL

```sh
cd server_elixir
mix afterlight.import_theater_catalog \
  --game-state ../data/game-state.json \
  --iptv ../data/iptv.json \
  --epg ../data/epg.json
```

Record the printed SHA-256 hashes in this evidence folder. A second run must report `identical` (no writes).

## 2. Flip gateway routing (dev)

Merge the P5 rows into `config/dev.exs` (or set at runtime before boot):

```elixir
config :afterlight, :gateway,
  routing: %{
    "ping" => :terminate_pong,
    "join_room" => :phoenix,
    "movement" => :phoenix,
    "emote" => :phoenix,
    "chat_send" => :phoenix,
    # P5 theater + catalog
    "theater_queue" => :phoenix,
    "theater_control" => :phoenix,
    "theater_channel" => :phoenix,
    "theater_playlist_resolve" => :phoenix,
    "iptv_list_get" => :phoenix,
    "iptv_list_remove" => :phoenix,
    "epg_lookup" => :phoenix
  }
```

**Canonical flip choreography:** restart the Phoenix gateway (`PHX_SERVER=true mix phx.server` or the `npm run dev:stack` Phoenix process). The restart force-closes transports; clients replay `desiredRoom` and receive fresh `theater_state` / `iptv_state` snapshots from PostgreSQL.

Rollback: set the theater/catalog rows back to `:node` (or remove them) and restart — same transport-only reset as the P3 world flip.

## 3. Disable Node theater/catalog writes

At cutover, Node `server/theater.js` and `server/iptv.js` persistence paths become read-only (no `game-state.json` theater slice writes; no `iptv.json` / `epg.json` rewrites). HTTP uploads terminate at Phoenix (`TheaterPlaylistController`, `TheaterEpgController`) instead of the Node reverse proxy.

## 4. Verification checklist (manual)

1. **Playlist upload** — POST a small M3U through `http://localhost:4000/api/theater/playlists?name=DevTest` (or Vite proxy); confirm `iptv_state` broadcast in theater room.
2. **EPG upload** — POST a gzipped XMLTV fixture to `/api/theater/epg`; open the guide and confirm now/next via `epg_lookup`.
3. **Theater bill** — queue/add/playNow/pause/seek from two browsers; confirm `theater_state {theater, serverNow}` matches pre-flip behavior.
4. **Restart recovery** — restart Phoenix; confirm bill, catalog metadata, and EPG reload from PostgreSQL (`mix test test/afterlight/theater/restart_test.exs` automates bill reload).
5. **Forensic hashes** — confirm `data/game-state.json` no longer gains a `theater` section on mutation; original snapshot hashes unchanged.

## Automated gates referenced

| Suite | Command |
|---|---|
| Theater concurrency + restart | `mix test test/afterlight/theater/concurrency_test.exs test/afterlight/theater/restart_test.exs` |
| Catalog upload + SSRF | `mix test test/afterlight/catalog/upload_test.exs test/afterlight/catalog/url_fetch_test.exs` |
| JS parity | `npm test` (theater + iptv fixtures) |
| Two-client theater wire soak | `npm run verify:theater` → `evidence/two-client-theater-soak.md` |

## Import record (2026-09-07)

```
theater: no-op (hash 4e788261… already applied)
iptv: imported 2 lists / 16278 channels (hash 504ba03f…)
epg: imported 12246 channels / 1339 programme channels (hash cb9ad858…)
```

Chunking fix: `catalog/import.ex` now chunks `playlist_channels` inserts (`@chunk_size` 1000) for the 16k-channel import.
