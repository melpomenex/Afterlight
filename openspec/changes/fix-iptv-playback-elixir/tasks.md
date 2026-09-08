## 1. Schema guarantees at boot (dev stack + tests)

- [ ] 1.1 Add `mix ecto.migrate` to the Phoenix subshell in `scripts/dev-elixir-stack.sh` before `mix phx.server`, so `set -e` aborts the whole stack on a failed migration
- [ ] 1.2 Extend the `test` alias in `server_elixir/mix.exs` to run `ecto.create --quiet` and `ecto.migrate --quiet` before `test`
- [ ] 1.3 Verify: drop the newest columns (or restore a pre-migration test DB), run `mix test test/afterlight_web/game_channel_theater_test.exs` — the previously failing `42703` tests pass; confirm `npm run dev:stack` still boots and the wait-loop/WS smoke check still pass

## 2. Split-brain refusal (upload endpoints honor catalog ownership)

- [ ] 2.1 In `server_elixir/lib/afterlight_web/plugs/theater_catalog.ex`, check `Afterlight.Gateway.Router.catalog_phx?/0` before routing; when false respond `503` + `{"error": "catalog_not_owned_by_gateway"}` (preflight OPTIONS still answered 204 by TheaterCors)
- [ ] 2.2 Add a gateway startup warning log when `catalog_owner() != :phoenix`, naming that catalog uploads will be refused and the `AFTERLIGHT_CATALOG_OWNER` fix
- [ ] 2.3 Add tests in `server_elixir/test/afterlight_web/theater_upload_test.exs` (or a new plug test): upload refused with the stable error and no PG writes when the flip is node; accepted + `iptv_state` announced when phoenix
- [ ] 2.4 Verify in a browser against dev:stack: booth upload succeeds and the list appears in the catalog; then (optional manual check) boot `npm run server:elixir` and confirm the refusal surfaces in the add-status line with no catalog write

## 3. Deployed catalog import (`--if-empty`)

- [ ] 3.1 Add `--if-empty` to `Mix.Tasks.Afterlight.ImportTheaterCatalog` and `Afterlight.TheaterCatalog.Import.run/1`: when the flag is set and Postgres already has playlist lists or an active guide, short-circuit to a no-op before hashing/reading snapshots
- [ ] 3.2 Unit-test the emptiness guard: empty PG imports; populated PG (including rows not derived from the snapshot) no-ops without touching data; snapshot files remain unchanged (hashes stable)
- [ ] 3.3 Add the import step to `deploy/entrypoint-phoenix.sh` between `mix ecto.migrate` and `mix phx.server` with explicit snapshot paths from the deployed volume layout (design D3; confirm the VM's actual `data/` mount path first)
- [ ] 3.4 Verify with `docker compose` locally: first boot imports the catalog once; second boot is a no-op; missing snapshot file blocks boot with a legible error naming the file

## 4. End-to-end verification

- [ ] 4.1 Run `npm test` and `npm run build` from the repo root; run `mix test` in `server_elixir`
- [ ] 4.2 Run `scripts/verify-theater-cutover.mjs` against a freshly migrated database: join snapshot (`theater_state` + `iptv_state`), `iptv_list_get`, `epg_lookup` all pass
- [ ] 4.3 dev:stack browser smoke: upload a playlist text and an EPG file, see the catalog update, open the guide with now/next, tune a channel from a shared list, reload and confirm persistence
- [ ] 4.4 Update docs touched by the new boot behavior: `server_elixir/README.md` (migrate note), `docs/architecture/elixir/cutover-theater-catalog.md` (import now automated on deploy), and report honestly what was verified where
