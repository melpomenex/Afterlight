# Test configuration — parity suite is DB-free by default (D3/D5).
import Config

config :afterlight,
  parity_fixtures_path: "../tests/fixtures/parity",
  ecto_repos: [Afterlight.Repo]

config :afterlight, Afterlight.Repo,
  url: System.get_env("DATABASE_URL") || "ecto://afterlight@127.0.0.1:5433/afterlight_test",
  pool: Ecto.Adapters.SQL.Sandbox,
  pool_size: 10

config :afterlight, AfterlightWeb.Endpoint,
  secret_key_base: "afterlight-test-secret-base-not-for-production-use-at-all-000000",
  server: false,
  http: [ip: {127, 0, 0, 1}, port: 4002]

config :logger, level: :warning
