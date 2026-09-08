## Context

See proposal.md for the three root causes. Current implementation facts that shape the design:

- `scripts/dev-elixir-stack.sh` boots Node sidecar, then Phoenix (`mix phx.server`, all six `AFTERLIGHT_*_OWNER=phoenix` exports), runs a WS-upgrade smoke check, then Vite. No `mix ecto.migrate` anywhere. `set -euo pipefail` is on, so any failing step aborts the stack.
- `deploy/entrypoint-phoenix.sh` is 5 lines: `mix ecto.create || true`, `mix ecto.migrate`, `exec mix phx.server`. No catalog import.
- `mix afterlight.import_theater_catalog` exists (`server_elixir/lib/mix/tasks/afterlight.import_theater_catalog.ex`) and imports theater + IPTV + EPG snapshots into Postgres with SHA-256 attestation into `system_imports`; idempotency is hash-based (`:identical` no-op). It does **not** currently skip when the Postgres catalog is non-empty from player uploads.
- The catalog ownership flip is resolved by `Afterlight.Gateway.Router.catalog_owner/0` / `catalog_phx?/0` (default `node`, set from `AFTERLIGHT_CATALOG_OWNER` in `config/runtime.exs:108`). The `AfterlightWeb.Plugs.TheaterCatalog` plug routes the two upload endpoints before the parser, unconditionally, and does not consult the flip.
- `TheaterCors` runs before `TheaterCatalog` in the endpoint and echoes any Origin, so cross-origin uploads from the Vercel frontend already pass (confirmed against the production console logs the user provided — no CORS failure appears there).
- The join path pushes `theater_state` before `iptv_state` (`game_channel.ex:730-751`), so a stale schema kills the catalog snapshot along with the bill; ordering stays as-is once the schema is migrated.

## Goals / Non-Goals

**Goals:**

- dev:stack and production boot paths guarantee a migrated schema before Phoenix serves.
- Deployed backends restore the preserved IPTV catalog into Postgres once, safely, on first boot.
- No shipped boot path can accept catalog uploads into a store nobody serves (split-brain).
- Failures are legible: migration failure, import failure, and refusal all name their cause.

**Non-Goals:**

- No client changes (theater UI, transport, wire protocol untouched).
- No change to the snapshot files or the P11 data policy (they remain read-only forensic evidence).
- No re-attempt of the full gardens/economy cutover (P6) or new domain ports.
- No live-reload of catalog ownership; the flip stays a boot-time environment decision.

## Decisions

**D1 — Dev stack migrates in the Phoenix subshell, before `mix phx.server`.**
Add `mix ecto.migrate` to the `scripts/dev-elixir-stack.sh` Phoenix subshell (lines 28–39). `set -euo pipefail` + `set -e` in the subshell aborts the whole stack on a failed migration, satisfying "fail loudly". Alternative considered: a runtime boot check (`Ecto.Migrator.migrations_status`) — rejected because `mix ecto.migrate` already runs pending migrations *and* fails on an unreachable/misconfigured DB, which covers both spec scenarios without new code; a status check adds a second source of truth. The script also gains a smoke line mirroring the existing guest-auth smoke check: after listeners are up, `POST /api/theater/...`-adjacent health is not enough — assert `/health` on Phoenix returns 200 after migrate (already in the wait loop) and let the existing WS smoke check catch the channel-crash class.

**D2 — Test database migrates via mix aliases, not per-test code.**
In `server_elixir/mix.exs`, extend the `test` alias to run `ecto.create --quiet` and `ecto.migrate --quiet` before `test`. This is the idiomatic Phoenix fix for the reproduced `42703` failures in `game_channel_theater_test.exs` and needs no test-helper changes. Alternative considered: migrating in `test_helper.exs` — rejected; it hides a setup step inside code and diverges from how the alias already orchestrates sandbox setup.

**D3 — Import becomes an entrypoint step guarded by an `--if-empty` flag added to the mix task.**
`deploy/entrypoint-phoenix.sh` gains one step between `mix ecto.migrate` and `mix phx.server`:

```sh
mix afterlight.import_theater_catalog \
  --if-empty \
  --game-state /app/../data/game-state.json \
  --iptv  .../data/iptv.json \
  --epg   .../data/epg.json
```

The new `--if-empty` flag makes the task check emptiness *in Elixir* (no `playlist_lists` rows and no `epg_guides` row) and short-circuit to a no-op otherwise, before hashing or importing anything. Rationale for the flag living in the task: the emptiness predicate is domain logic, testable in `Afterlight.TheaterCatalog.Import` tests, and reusable outside Docker. Hash-based idempotency alone is insufficient because a catalog enriched by player uploads since deployment would hash-differ from the snapshot and re-import would then resurrect stale rows; emptiness-guarded import + hash no-op covers both restart and first-boot cases. Entrypoint passes explicit paths resolved from the existing volume layout (`/opt/afterlight/game/data` is mounted at the repo's `data/`); missing files keep the task's existing "blocks unless `--attest-missing-catalog yes`" behavior — the entrypoint does **not** attest, so a genuinely absent snapshot blocks boot with a legible error rather than silently serving an empty catalog. If that proves too strict in practice, a follow-up can attest explicitly; the spec requires serving the preserved catalog, and the snapshots are part of the deploy volume.

**D4 — `TheaterCatalog` plug refuses uploads when the flip is not Phoenix.**
In `plugs/theater_catalog.ex`, before dispatching to the playlist/EPG controllers, evaluate `Afterlight.Gateway.Router.catalog_phx?/0`; when false, respond immediately with `503` + JSON `{"error": "catalog_not_owned_by_gateway"}` (CORS headers already applied by the earlier plug; the preflight `OPTIONS` path is unaffected). The client's existing `iptvErrorText` / add-status surfacing shows the refusal without new client code — the message type rides the existing `error` payload shape used by upload failures. Rationale for refusal over proxying to Node: Node is durable-read-only under the supported stack (`AFTERLIGHT_NODE_DURABLE_READ_ONLY=1`), so proxying uploads into the frozen JSON store would violate the data policy; refusal is honest and pushes the operator to set the flip. Refusal-over-succeed-silently also makes the misconfiguration *visible* in a browser in seconds, which the current split-brain hides.

**D5 — `npm run server:elixir` stays default-owner and gets a printed warning.**
The script's purpose is booting a local gateway for manual/relay testing; forcing all six flips there would duplicate `dev-elixir-stack.sh`. Instead, `Afterlight.Gateway.Router` (or the endpoint's boot logging) emits one warning line at startup when `catalog_owner() != :phoenix`, naming that catalog uploads will be refused and how to flip. Combined with D4, this closes every shipped path: dev:stack (phoenix), production compose (phoenix), `server:elixir` (node + refused uploads + visible warning).

## Risks / Trade-offs

- [Entrypoint now fails boot when snapshot files are missing] → This matches the data policy (snapshots are deployed volume content); operators can attest explicitly later. Mitigated by the error naming the exact missing file.
- [`--if-empty` emptiness check races two Phoenix nodes booting simultaneously] → Single-node compose deployment; the check is advisory. Worst case is a duplicate import into an empty table, not data loss.
- [Refusing uploads on non-phoenix gateways changes behavior for anyone relying on the old split-brain] → That behavior was the bug (uploads silently invisible); the stable error string makes the change diagnosable. No persistence migration needed.
- [dev:stack now takes a few extra seconds for `mix ecto.migrate`] → Idempotent, typically instant when up-to-date; acceptable vs. a crashing theater channel loop.
- [Alias-level test migration assumes `MIX_ENV=test` DB is creatable in all environments] → Matches existing CI/dev expectations; `--quiet` keeps output clean.

## Migration Plan

1. Land dev-stack + test alias changes; verify with `npm test`, `mix test`, and a fresh dev:stack boot from a dropped-column database.
2. Land the plug refusal + warning; verify `npm run server:elixir` refuses uploads with the stable error and dev:stack accepts them.
3. Land `--if-empty` on the mix task (unit-tested against empty/populated PG) and the entrypoint step; verify on a fresh `docker compose` boot (import once) and a restart (no-op).
4. Rollback: each step is independently revertible; the entrypoint import is additive and no-op on restart, so rolling it back never removes imported data.

## Open Questions

None blocking. The deployed volume path for the snapshot files should be confirmed during implementation (D3 uses the existing `data/` mount layout; if the path differs on the VM, it is a one-line entrypoint change that does not affect the specs).
