# Afterlight (Elixir/Phoenix/Ash)

This is the Elixir side of the Afterlight backend migration. **P1 owned nothing.** **P2 (gateway transport) terminates the socket, signed guest tokens, `ping`/`pong`, and rate limits, then relays every game domain 1:1 to Node.** Durable authority is still Node's (`../server`). See `../docs/architecture/elixir/ownership.md` and `../openspec/changes/add-phoenix-gateway-transport/`.

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

`Afterlight.Application`: `Afterlight.Repo` → `Phoenix.PubSub` → `AfterlightWeb.Telemetry` → Finch → `Afterlight.Gateway.ProxySupervisor` → `AfterlightWeb.Endpoint`. No room processes or Ash game domains — those arrive in later phases. P2 only adds the relay.

Endpoint routes: `GET /` and `GET /health`; P2 adds `POST /api/auth/guest`, UserSocket at `/ws`, and reverse-proxy of `/api/health` + `/api/theater/*` to Node.

## P2 rollback (transport only)

The gateway stores no durable game state. To return a deployment to Node:

1. Build/run the client with `VITE_TRANSPORT=node` (default) and `VITE_WS_URL` pointing at the Node socket (`ws://localhost:3001/ws` in dev).
2. Leave Node running; stopping Phoenix is optional.
3. Players reconnect with the same localStorage `guestId`. Transient poses and chat history reset as on any Node restart.

Node still accepts secret-less clients in P2 (invalid boundary secrets are rejected; absent secrets are not). Do not treat this as a rollback after later phases write PostgreSQL.
