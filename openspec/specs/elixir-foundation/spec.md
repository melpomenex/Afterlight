# elixir-foundation

## Purpose

Establish the Elixir/Phoenix/Ash application skeleton that every later migration phase builds inside: a compiling Mix application with a pinned dependency set, a minimal supervision tree, an AshPostgres Repo against a documented dev database, disciplined configuration, and the parity runner as its seed test suite. The foundation owns nothing: it serves no game traffic and writes no game state.

## Requirements

### Requirement: Compiling application skeleton

The repository SHALL contain a Mix application under `server_elixir/` (app `:afterlight`, module prefix `Afterlight`, web modules under `AfterlightWeb`) with a committed `mix.lock` resolved for this project. From a clean checkout, `mix deps.get && mix compile` SHALL succeed, and the resolved dependency set SHALL match the documented pins or document any resolver-forced deviation.

#### Scenario: fresh checkout builds

- **WHEN** a contributor runs `mix deps.get && mix compile` in `server_elixir/` from a clean checkout
- **THEN** compilation succeeds with the committed lock and no missing or conflicting dependencies
- **AND** the resolved versions match the documented pin set or the deviation is explained in `server_elixir/README.md`

### Requirement: Minimal supervision tree, owning nothing

The application supervision tree SHALL start the Repo, a PubSub, telemetry, and the web Endpoint, plus the gateway processes added by `add-phoenix-gateway-transport` (transient session registry, connect rate limiter). From this change onward it SHALL additionally start the World supervisor: the `Afterlight.World` room registry and its DynamicSupervisor of per-room RoomServer processes. Room processes own transient world state only (rosters, poses, emote cooldowns) — the tree still SHALL NOT start durable domain contexts or any scheduler of durable game behavior. The Node server SHALL remain the sole authoritative writer for every durable domain still assigned to it in `docs/architecture/elixir/ownership.md`.

#### Scenario: world processes join the tree

- **WHEN** the application starts with this change active
- **THEN** the World supervisor and its DynamicSupervisor are running under the P1 tree alongside the Repo, PubSub, telemetry, Endpoint, and gateway processes
- **AND** no durable domain context or writer is started by the Elixir app

#### Scenario: room processes are transient only

- **WHEN** rooms start and stop under the DynamicSupervisor during play
- **THEN** no durable store, file, or table is read or written by any room process

### Requirement: Repository and dev database

`Afterlight.Repo` SHALL be an `AshPostgres.Repo` declaring installed extensions `uuid-ossp`, `citext`, and `ash-functions`, with a minimum PostgreSQL version of 15. Dev and test databases SHALL follow a documented convention (local cluster on port 5433, databases `afterlight_dev` and `afterlight_test`) and SHALL be overridable via `DATABASE_URL`. `mix ecto.create` and `mix ecto.migrate` SHALL succeed against an empty migration scaffold, and the declared extensions SHALL be installable in both databases. No game data model exists in this change.

#### Scenario: databases provision cleanly

- **WHEN** a developer follows `server_elixir/README.md` and runs `mix ecto.create && mix ecto.migrate` for dev and test
- **THEN** both databases are created, the declared extensions install successfully, and migration succeeds with no game tables
- **AND** the test environment uses the SQL sandbox against a database separate from dev

### Requirement: Parity runner integration

The parity runner contracted by `add-parity-fixture-baseline` SHALL run under `mix test` against the committed `tests/fixtures/parity/*.json` without requiring the Node runtime or a database, and SHALL be green. Tests that require the database SHALL be tagged and excluded from the default run.

#### Scenario: mix test is green on the foundation

- **WHEN** `mix test` runs in `server_elixir/`
- **THEN** the parity suite passes against the committed fixtures
- **AND** the run required neither a live Node server nor PostgreSQL

### Requirement: Configuration and secret discipline

Configuration SHALL separate compile-time config from runtime environment reads. Secrets SHALL come from the environment only and SHALL NOT be committed. Production SHALL refuse to boot without an explicit `SECRET_KEY_BASE`. In dev the web server SHALL NOT start automatically (`server: false`), and when started explicitly it SHALL bind to localhost only.

#### Scenario: no committed secrets

- **WHEN** the `server_elixir/` tree is reviewed or committed
- **THEN** no secret key material, password, or token appears in any tracked file
- **AND** a production boot without `SECRET_KEY_BASE` fails with an explicit error

### Requirement: Node game unaffected

The foundation SHALL NOT modify any Node game source, client code, wire protocol, persistence format, or developer workflow. `npm test` SHALL remain green, and running the game (`npm run dev`, `npm run server`) SHALL behave exactly as before, with no client or configuration pointing at the Phoenix app.

#### Scenario: existing suite still green

- **WHEN** the foundation lands
- **THEN** `npm test` passes unchanged
- **AND** no file outside `server_elixir/`, tooling, and docs is modified, and no client configuration references the Phoenix endpoint
