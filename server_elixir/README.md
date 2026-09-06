# Afterlight (Elixir/Phoenix/Ash) — P1 foundation

This is the Elixir side of the Afterlight backend migration. **It currently owns nothing**: no client traffic, no Channels, no game state, no database tables. The Node server (`../server`) keeps serving the game until the migration phases (P2+) move authority domain-by-domain. See `../docs/architecture/elixir/ownership.md` for the authority contract and `../openspec/changes/add-elixir-phoenix-foundation/` for this phase's scope.

## Prerequisites

- Erlang/OTP 27, Elixir 1.18 (dev convention: `~/.local/afterlight-beam` holds a rootless install — `source ~/.local/afterlight-beam/env.sh` or put its `otp/bin` + `elixir/bin` on `PATH`)
- PostgreSQL ≥ 15 reachable on `localhost:5433` (dev convention: a user-run cluster; `initdb -D ~/.local/afterlight-pg -U afterlight --auth-local=trust --auth-host=trust` then `pg_ctl -D ~/.local/afterlight-pg -o "-p 5433 -k /tmp" start`)

## Quick start

```sh
mix deps.get && mix compile   # toolchain sanity
mix test                      # parity suite — DB-free, no Node runtime needed
```

The default `mix test` run executes the parity gate (`test/parity/parity_runner_test.exs`): every case in `../tests/fixtures/parity/*.json` (exported from the JavaScript by `../scripts/export-parity-fixtures.mjs`) must reproduce against the `Afterlight.Parity.Reference.*` modules. Those modules are **test-side parity references, never authority** — production domain code must not import them.

## Database (not needed for `mix test`)

```sh
mix ecto.create    # creates afterlight_dev (DATABASE_URL overrides)
mix ecto.migrate   # empty migration scaffold until P4–P6
mix ecto.migrations
mix test --include database   # DB-touching tests (none yet; tagged :database)
```

Databases: `afterlight_dev` / `afterlight_test` on `localhost:5433`, user `afterlight`. Extensions installed by the migrations when they arrive: `uuid-ossp`, `citext`, `ash-functions`.

## Configuration

| Env var | Default | Meaning |
|---|---|---|
| `DATABASE_URL` | `ecto://afterlight@127.0.0.1:5433/afterlight_dev` | Postgres connection |
| `PORT` | `4000` | Endpoint port (dev binds `127.0.0.1`, `server: false` — no auto-start) |
| `SECRET_KEY_BASE` | dev-only default; **hard error in prod** | Endpoint secret |

No secret material is committed. `config/config.exs` is compile-time only.

## Dependency pins (P1, D2)

Declared ranges target the serviceradar-evidenced known-good set; `mix.lock` is resolved in THIS project. Resolved pins and deviations:

- phoenix 1.8.x, phoenix_live_view 1.2.x, bandit 1.x
- ecto/ecto_sql 3.14.x, postgrex 0.22.x
- **ash pinned `~> 3.31.3`** (patch stream only): ash 3.33 broke `ash_phoenix` 2.3.x compilation — the resolver was forced back to the 3.31 line. ash_postgres `~> 2.10.0`, ash_phoenix `~> 2.3.24`.
- jason, telemetry, telemetry_metrics, telemetry_poller

Serviceradar's advisory-ignore list was deliberately not carried over; re-review advisories at pin bumps.

## Supervision tree

`Afterlight.Application`: `Afterlight.Repo` → `Phoenix.PubSub` → `AfterlightWeb.Telemetry` → `AfterlightWeb.Endpoint`. There are deliberately **no** room processes, presence, membership, Ash domains, or game protocol handlers — those arrive with their own migration changes and must never be smuggled into the foundation.

Endpoint routes: `GET /` and `GET /health` (health JSON) only.
