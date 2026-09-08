## Why

IPTV (the shared playlist library and program guide) no longer works on the supported Phoenix stack. It worked under the legacy Node backend; after the Elixir port the shared library and guide go dead for players. Root causes identified by tracing every IPTV touchpoint on both transports:

1. **Missing migration at dev-stack boot.** `20260908120000_add_theater_media_prepare_fields.exs` adds `theater_items` columns, but `scripts/dev-elixir-stack.sh` boots Phoenix with `mix phx.server` only — no `mix ecto.migrate`. On any database last migrated before that commit, every theater read raises `ERROR 42703 (undefined_column) column t0.source_url does not exist`. Because the join path pushes `theater_state` (`game_channel.ex:736`) *before* `iptv_state` (`:743`), the channel process dies before the catalog snapshot is ever sent — taking the shared library and guide down with the theater bill. Every `theater_queue`/`theater_control`/`theater_channel` op (channel flips ride `theater_channel`) fails the same way. Reproduced: `game_channel_theater_test.exs` shows 3 failures against the stale test database.
2. **Production data gap.** `deploy/entrypoint-phoenix.sh` runs `mix ecto.migrate` but nothing ever runs `mix afterlight.import_theater_catalog`, so a fresh VM Postgres serves an empty catalog while the preserved read-only `data/iptv.json` / `data/epg.json` snapshots sit unused. Uploads then work but write only to PG.
3. **Flip/upload split-brain.** The `TheaterCatalog` plug handles the two upload endpoints unconditionally, while WS catalog ops (`iptv_list_get`, `iptv_list_remove`, `epg_lookup`) follow the `AFTERLIGHT_CATALOG_OWNER` flip. A gateway started without the flip (e.g. `npm run server:elixir`, which sets no owner envs) accepts uploads into Postgres while serving the catalog from frozen Node JSON — uploads silently never appear.

## What Changes

- `scripts/dev-elixir-stack.sh` runs `mix ecto.migrate` before `mix phx.server`, and a stale-schema database aborts the boot with a legible error instead of a crashing channel loop.
- `deploy/entrypoint-phoenix.sh` imports the theater catalog from the preserved read-only snapshots on first boot (when the PG catalog is empty), so deployed backends serve the real shared library and guide.
- The Phoenix upload endpoints honor catalog ownership: when the catalog flip is not Phoenix, `POST /api/theater/playlists` and `POST /api/theater/epg` are refused with a clear error (not silently written to a catalog nobody serves).
- `npm run server:elixir` either receives the owner env vars or prints a warning that catalog uploads will be refused, so local Elixir boots cannot re-create the split-brain.
- Test setup gains the same migration guard so wire/chan tests fail with the missing-migration cause, not column errors.

No client-side change: `theaterScreen.js` / `net/client.js` already work against the Phoenix transport (uploads POST to the gateway origin; `iptv_state` / `iptv_list` / `epg_schedule` frames are forwarded and room-filtered correctly).

## Capabilities

### New Capabilities

- `elixir-stack-boot`: The Phoenix stack SHALL boot against a database whose schema matches its code (dev-stack migrates before serving, stale schema fails loudly) and a deployed backend SHALL serve the preserved shared IPTV catalog (one-time import from the read-only snapshots when the Postgres catalog is empty).

### Modified Capabilities

- `shared-iptv-library`: Add the requirement that shared-library upload endpoints honor catalog ownership — uploads are accepted only by the owner serving the catalog, never split between Postgres and the frozen Node JSON store.

`program-guide` behavior is unchanged; its availability is restored by the boot/import fixes above.

## Impact

- `scripts/dev-elixir-stack.sh`, `deploy/entrypoint-phoenix.sh` (or `deploy/deploy.sh`), `server_elixir/lib/afterlight_web/plugs/theater_catalog.ex` (+ controllers or plug-level refusal), `server_elixir/config/runtime.exs` or boot checks, `package.json` (`server:elixir` script env), Elixir test setup.
- Data policy preserved: `data/iptv.json` / `data/epg.json` / `game-state.json` remain read-only snapshot forensics; the import is additive into Postgres.
- No change to the client IPTV UI, the shared model limits, or the wire protocol.
- Verification: `npm test`, `mix test` in `server_elixir` (migration guard makes the currently-failing `game_channel_theater_test.exs` pass), `scripts/verify-theater-cutover.mjs` against a fresh migrated database, and a dev:stack smoke check of upload → catalog → guide → tune.
