## 1. Mix application skeleton

- [ ] 1.1 Create `server_elixir/mix.exs`: app `:afterlight`, module `Afterlight`, Elixir version requirement, `elixirc_paths` for test, application module `Afterlight.Application`, and deps declared as ranges targeting the documented pins (phoenix ~> 1.8.11, phoenix_live_view ~> 1.2.9, ecto ~> 3.14, ecto_sql, postgrex ~> 0.22, ash ~> 3.31, ash_postgres ~> 2.10, ash_phoenix ~> 2.3, bandit, jason, telemetry).
- [ ] 1.2 Run `mix deps.get`, let the resolver settle transitive dependencies, and commit our own `mix.lock`; record the resolved versions and any deviation from the serviceradar/web-ng reference pins in `server_elixir/README.md`; review hex advisory status at pin time (do not carry over serviceradar's advisory-ignore list).
- [ ] 1.3 Create `server_elixir/.gitignore` (deps/, _build/, .elixir_ls/) so build artifacts never reach git.

## 2. Configuration

- [ ] 2.1 Create `config/config.exs`: compile-time config only — logger, the `:afterlight` config namespace, the parity fixture path default (repo-root-relative), endpoint template settings; no secrets.
- [ ] 2.2 Create `config/runtime.exs`: env reads for `DATABASE_URL`, `PORT`, and `SECRET_KEY_BASE` (explicit non-production dev default; hard error under `MIX_ENV=prod` when missing); localhost bind default.
- [ ] 2.3 Create `config/test.exs`: test database from `DATABASE_URL` or the `afterlight_test` default, SQL sandbox config, fixture path pin, static asset serving off.

## 3. Supervision tree, Repo, Endpoint

- [ ] 3.1 Create `lib/afterlight/application.ex`: supervision tree exactly `[Afterlight.Repo, {Phoenix.PubSub, name: Afterlight.PubSub}, telemetry child, AfterlightWeb.Endpoint]` honoring `server: false` in dev; include a code comment stating that no room, presence, membership, or domain processes exist by design in P1.
- [ ] 3.2 Create `lib/afterlight/repo.ex`: `use AshPostgres.Repo, otp_app: :afterlight` modeled on `serviceradar/elixir/serviceradar_core/lib/serviceradar/repo.ex` — `installed_extensions` returning `uuid-ossp`, `citext`, `ash-functions`, and `min_pg_version` 15.0.
- [ ] 3.3 Create `lib/afterlight_web/` with a minimal Endpoint and plug pipeline (health check route only, e.g. `GET /` returns ok); no Channels, no socket, no game protocol, no LiveView surface.
- [ ] 3.4 Create the `priv/repo/migrations/` empty scaffold and a no-op `priv/repo/seeds.exs`; verify `mix ecto.create && mix ecto.migrate` succeeds with zero game tables.

## 4. Dev database provisioning

- [ ] 4.1 Follow the documented convention locally: user-run PostgreSQL cluster on `localhost:5433`; create `afterlight_dev` and `afterlight_test`; confirm `DATABASE_URL` override works.
- [ ] 4.2 Run `mix ecto.create` for dev and test envs and `mix ecto.migrate`; run `mix ecto.migrations` to confirm the empty state; record the exact commands in `server_elixir/README.md`.
- [ ] 4.3 Install the declared extensions into both databases (via the AshPostgres repo helper or psql) and verify `uuid-ossp`, `citext`, and `ash-functions` are available.

## 5. Parity runner integration (contract from `add-parity-fixture-baseline`)

- [ ] 5.1 Integrate the `Afterlight.Parity` runner and `server_elixir/test/parity/` scaffold delivered by `add-parity-fixture-baseline`: resolve the fixture path from config, confirm it compiles under this app's dependency set, and keep failure output naming fixture file + case id.
- [ ] 5.2 Integrate the `Afterlight.Parity.Reference.*` ports and hazard helpers (js_round as floor(x + 0.5), js_to_number, UTF-16 truncation, 32-bit mask, Date.UTC rollover) per the P0 task list, still named and documented as test-side parity references, never authority.
- [ ] 5.3 Verify `mix test` runs the parity suite DB-free and green; tag any DB-touching tests `:database`, exclude them from the default run, and verify `mix test --include database` passes against `afterlight_test`.

## 6. Docs and verification

- [ ] 6.1 Write `server_elixir/README.md`: prerequisites (Erlang/Elixir versions), the pinned dependency set and resolution notes, database provisioning steps and env vars, commands (`mix deps.get && mix compile`, `mix test`, `mix ecto.*`), and the owns-nothing statement (no client traffic; the Node server keeps serving the game).
- [ ] 6.2 Verify a scratch build: fresh `mix deps.get && mix compile` succeeds from the committed lock with no local state.
- [ ] 6.3 Verify `mix test` is green (parity suite vs committed fixtures) with no Node runtime and no database required.
- [ ] 6.4 Verify the Node game is unaffected: `npm test` green; `git status` shows changes only under `server_elixir/`, `openspec/`, and docs; the game still runs via `npm run dev` + `npm run server` with no client configuration pointing at Phoenix.
