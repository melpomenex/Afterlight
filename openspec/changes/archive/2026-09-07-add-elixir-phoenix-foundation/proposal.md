# Add Elixir/Phoenix Foundation

## Why

Phase P1 of the migration (`port-backend-to-elixir`). The parity baseline (P0, `add-parity-fixture-baseline`) pins what the game's deterministic rules do; before any gateway or domain work can start, the Elixir side must exist as a real, compiling, tested Mix application — otherwise every later change invents its own scaffolding under pressure and the toolchain, dependency pins, and Repo wiring stay unproven until the worst possible moment. The foundation owns nothing: the Node server keeps serving the game exactly as today, and the app's entire job is to compile, start a minimal supervision tree, and pass the committed parity fixtures.

## What Changes

- **New Mix application** under `server_elixir/`: app `:afterlight`, module prefix `Afterlight`; `mix.exs`, `config/config.exs` + `config/runtime.exs` + `config/test.exs`, `lib/afterlight/application.ex` supervision tree, and a minimal Phoenix Endpoint under `lib/afterlight_web/` (single-app layout, not an umbrella).
- **Pinned dependency set**: phoenix 1.8.11, phoenix_live_view 1.2.9, ecto 3.14.1, postgrex 0.22.4, ash 3.31.3, ash_postgres 2.10.0, ash_phoenix 2.3.24, plus bandit, jason, telemetry — declared as ranges, resolved by us, and committed in our own `mix.lock`. The `serviceradar/elixir/web-ng` lock is compatibility evidence for what resolves together, not a copy source.
- **AshPostgres Repo** `Afterlight.Repo` modeled on `serviceradar/elixir/serviceradar_core/lib/serviceradar/repo.ex` (installed extensions `uuid-ossp`, `citext`, `ash-functions`; minimum PostgreSQL 15), pointed at a local dev PostgreSQL: documented convention is a user-run cluster on port 5433 with databases `afterlight_dev` / `afterlight_test`, overridable via `DATABASE_URL`.
- **Supervision tree**: `Afterlight.Repo`, `Phoenix.PubSub`, telemetry, `AfterlightWeb.Endpoint` — explicitly no room processes, no membership/registry structures, no domain contexts, no schedulers.
- **Parity runner wired**: the `Afterlight.Parity` runner contracted by `add-parity-fixture-baseline` runs under `mix test` against the committed `tests/fixtures/parity/*.json`; it is the app's initial and likely only test surface.
- **Config discipline**: secrets via environment only, nothing committed; the web server does not start by default in dev (`server: false`); the Node game is untouched.

Depends on: `add-parity-fixture-baseline` (provides the fixture corpus the runner executes and the runner contract it implements).

## Capabilities

### New Capabilities

- `elixir-foundation`: the compiling, tested, owns-nothing Elixir application skeleton — app layout, pinned dependencies, minimal supervision tree, AshPostgres Repo with documented dev database provisioning, configuration and secret discipline, and parity-runner integration — that every later migration phase builds inside.

### Modified Capabilities

- (none — this change creates its own capability and alters no existing spec.)

## Impact

- **Server (Node) / Shared / Client**: none — no file outside `server_elixir/`, `openspec/`, and docs changes; the game keeps running from Node with its existing workflow (`npm run dev`, `npm run server`) and `npm test` stays green.
- **New files**: the entire `server_elixir/` tree — `mix.exs`, `mix.lock`, `.gitignore`, `config/` trio, `lib/afterlight/application.ex`, `lib/afterlight/repo.ex`, `lib/afterlight_web/` (endpoint + minimal plug pipeline), `priv/repo/migrations/` (empty scaffold), `test/`, and `server_elixir/README.md`.
- **Compatibility requirements**: a clean checkout builds with `mix deps.get && mix compile`; `mix test` is green using only the committed fixtures (no Node runtime, no database required for the default run); existing JS tests pass unchanged.
- **Protocol changes**: none — the Endpoint serves only a localhost health check; no Channels, no socket, no game messages.
- **Persistence / data model**: none yet, explicitly — migrations scaffold is empty, no Ash resources exist, `data/*.json` is untouched, and PostgreSQL holds nothing game-owned.
- **Security**: no secret material committed; `SECRET_KEY_BASE` comes from the environment with an explicit non-production dev default and a hard failure in prod when missing; the Endpoint binds localhost only; there is no authentication surface yet to get wrong.
- **Tests**: `mix test` green (parity suite vs committed fixtures); `npm test` still green.
- **Load tests**: none — the app serves no traffic; capacity claims remain deferred to P10 per the umbrella.
- **Docs**: `server_elixir/README.md` (prerequisites, pins and resolution notes, database provisioning, env vars, commands, owns-nothing statement).
- **Rollback**: delete `server_elixir/`; nothing else references it and no operational state changes.
