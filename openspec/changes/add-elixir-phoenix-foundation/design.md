# Design: Elixir/Phoenix foundation

## Context

Current behavior: the repo has no Elixir code. The Node server (`server/index.js` + managers) is the sole composition root and authority; `npm test` runs the existing `node --test` suite; durable state lives in `data/*.json`. The P0 change `add-parity-fixture-baseline` delivers `tests/fixtures/parity/*.json`, the determinism gate, and the `Afterlight.Parity` runner contract; this change provides the app that runner executes in. Reference material exists in-repo: `serviceradar/elixir/web-ng/mix.exs` + `mix.lock` pin a known-resolving set (phoenix 1.8.11, phoenix_live_view 1.2.9, ecto 3.14.1, postgrex 0.22.4, ash 3.31.3, ash_postgres 2.10.0, ash_phoenix 2.3.24, bandit, jason, telemetry), and `serviceradar/elixir/serviceradar_core/lib/serviceradar/repo.ex` shows the AshPostgres repo shape (`uuid-ossp`, `citext`, `ash-functions`; min PG 15). The developer environment has a local PostgreSQL available; per the umbrella, nothing may disrupt the running Node game.

Desired behavior: `server_elixir/` is a Mix application that compiles from a clean checkout, starts a minimal supervision tree in dev, runs `mix test` green against the committed parity fixtures, and owns nothing — no client traffic, no Channels, no game writes, no data model.

## Goals / Non-Goals

**Goals:**

- `mix deps.get && mix compile` clean from a fresh checkout with a committed, self-resolved `mix.lock`.
- `mix test` green with the parity runner as the seed suite, requiring neither the Node server nor PostgreSQL for the default run.
- Supervision tree exactly: Repo, PubSub, telemetry, Endpoint — with the absence of room/membership/domain processes explicit in code.
- Dev database provisioning documented and reproducible; env-overridable connection config.
- The Node game untouched: no changes outside `server_elixir/` plus tooling/docs; `npm test` green.

**Non-Goals:**

- No Channels/UserSocket, no signed identity, no gateway routing proxy — those are `add-phoenix-gateway-transport` (P2).
- No Ash resources, domains, or policies; migrations stay an empty scaffold (the data model starts with the P4–P6 changes).
- No room processes, presence, movement handling, or any game runtime behavior.
- No production deployment config, clustering, or releases.
- No LiveView surfaces — the dependency is pinned for version compatibility only; the Endpoint mounts a minimal plug pipeline.
- No dual-run traffic: no client or configuration points at Phoenix in this phase.

## Data Model

None yet, deliberately. `priv/repo/migrations/` ships empty; there are no Ash resources and no game tables. The durable model (players, wallets, orders, theater, catalog, receipts, outbox — per `docs/architecture/elixir/runtime.md` and migration-governance constraints like integer money and nonnegative constraints) arrives with the P4–P6 changes. The Repo exists now so those changes are about domains, not plumbing.

## Decisions

### D1 — Single Mix app with an `afterlight_web` namespace, not an umbrella
*Decision:* one OTP app `:afterlight` (module prefix `Afterlight`) with web modules under `AfterlightWeb` (`lib/afterlight_web/`), matching Phoenix 1.8's generated single-app layout.
*Alternative Considered:* an `:afterlight` + `:afterlight_web` umbrella. Rejected: two apps and two dependency lists before there is enough code to organize; splitting later is mechanical if the domains ever demand it.

### D2 — Pin our own dependency set informed by serviceradar, verified by resolution
*Decision:* `mix.exs` declares compatibility ranges targeting the serviceradar-evidenced versions (phoenix 1.8.11, phoenix_live_view 1.2.9, ecto 3.14.1, postgrex 0.22.4, ash 3.31.3, ash_postgres 2.10.0, ash_phoenix 2.3.24, bandit, jason, telemetry); `mix.lock` is produced by actually running `mix deps.get` and letting the resolver settle transitive dependencies in our context. Any pin the resolver is forced to move is documented with the reason in `server_elixir/README.md`. Hex advisory status is reviewed at pin time; the reference lock's advisory-ignore list is serviceradar-specific and is not carried over. ash_phoenix is included now (pinned, unused) so the toolchain the whole migration relies on is frozen once.
*Alternative Considered:* copying web-ng's `mix.lock` verbatim. Rejected: locks are not portable across projects — the transitive closure differs, and unexamined locks hide resolution surprises until the worst time.

### D3 — AshPostgres Repo now, resources later
*Decision:* `Afterlight.Repo` (`use AshPostgres.Repo, otp_app: :afterlight`) modeled on the serviceradar repo: `installed_extensions: ["uuid-ossp", "citext", "ash-functions"]` and `min_pg_version` 15.0. `mix ecto.create` / `mix ecto.migrate` run against an empty migration list. Tests that need the database are tagged `:database` and excluded from the default `mix test` run so the parity gate stays DB-free; the provisioning verification runs them explicitly.
*Alternative Considered:* deferring the Repo to P4 (first durable domain). Rejected: Postgres is the committed durability target; pinning Repo, extensions, and provisioning here keeps later changes focused on domains.

### D4 — Dev database: user-run local PostgreSQL on port 5433
*Decision:* documented dev convention: a developer-run PostgreSQL cluster on `localhost:5433`, databases `afterlight_dev` and `afterlight_test` (SQL sandbox in test), connection strings overridable via `DATABASE_URL`. Tasks create the databases (`mix ecto.create` for both envs), run the empty initial migration, and install the declared extensions. Nothing auto-provisions clusters; `server_elixir/README.md` documents setup and the exact commands.
*Alternative Considered:* an in-repo docker-compose. Rejected for this change: keeps the foundation dependency-free and works with whatever cluster a developer already runs; compose packaging can come later with ops work if wanted.

### D5 — Parity runner integration is the acceptance spine
*Decision:* the `Afterlight.Parity` runner contracted by `add-parity-fixture-baseline` lives at `server_elixir/test/parity/`, resolves `tests/fixtures/parity/` relative to the repo root (path configurable in `config.exs`/`test.exs`), and runs under `mix test` with no database and no Node runtime. This app change integrates it: fixture path config, test helper wiring, and green verification. It is the app's primary test content and the P1 exit evidence.
*Alternative Considered:* a standalone `mix parity` task only. Rejected: `mix test` must be the one green command the phase gate names.

### D6 — Configuration discipline from day one
*Decision:* `config/config.exs` holds compile-time config only (no secrets); `config/runtime.exs` reads `DATABASE_URL`, `PORT`, and `SECRET_KEY_BASE` from the environment, with an explicit non-production dev default for the secret and a hard boot failure under `MIX_ENV=prod` when it is missing; `config/test.exs` pins the sandbox, test database, and fixture path. Dev Endpoint runs with `server: false` — the app never auto-starts a listener in dev — and binds `127.0.0.1` when started explicitly. No secret material is ever committed.
*Alternative Considered:* generating a dev secret into config like `mix phx.new` does. Rejected: generated secrets get committed and blur the rule; env-with-default keeps the discipline honest from the first commit.

## Risks / Trade-offs

- *[Version resolution drifts from the serviceradar pins]* → our own lock resolved locally, with deviations documented in the README; advisory review happens at pin time rather than inheriting serviceradar's ignore list.
- *[Contributors without PostgreSQL see failing optional tests]* → the parity suite is DB-free and is the default `mix test`; DB-touching tests are tagged and excluded by default, and the provisioning step runs `mix test --include database` explicitly.
- *[Pinned-but-unused dependencies (ash, ash_phoenix) look like dead weight]* → accepted: freezing the toolchain once is the point; if resolution friction appears, ash_phoenix may defer to P2 without touching the parity gate.
- *[The app accidentally serves game traffic]* → `server: false` in dev, localhost-only bind, no routes beyond a health check, no socket; acceptance asserts no client config points at Phoenix and the Node game is untouched.
- *[Foundation rots before P2 lands]* → `mix compile && mix test` is documented at the top of `server_elixir/README.md`, and the parity suite doubles as a canary that app and fixture corpus stay in sync.

## Migration Plan

Purely additive: everything new lives in `server_elixir/` (plus docs). Order: mix.exs + dependency resolution + lock → config trio → supervision tree → Repo + migrations scaffold → Endpoint → parity runner integration → README + verification. Protocol changes: none. Persistence: none (no game tables; `data/*.json` untouched). Rollback: remove `server_elixir/` and its README — nothing references it, no data was written, and the Node server's authority was never touched, so there is no operational rollback at all.

## Open Questions

None blocking. The dev listener port (default 4000-class, localhost-only) is a config constant tunable at implementation.
