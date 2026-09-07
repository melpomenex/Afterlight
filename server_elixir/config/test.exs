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

# P2 gateway transport — deterministic test pins (no env reads; runtime.exs
# skips the :test branch). Rate-limit windows are short so limit-boundary
# tests can cross them with sleeps measured in milliseconds.
config :afterlight, :gateway,
  node_ws_url: "ws://127.0.0.1:3001/ws",
  proxy_target: "http://127.0.0.1:3001",
  boundary_secret: nil,
  token_secret: "afterlight-test-token-secret-not-for-production-use-0000000000",
  token_max_age_secs: 43_200,
  auth_rate_limit: [limit: 30, window_ms: 60_000],
  connect_rate_limit: [limit: 60, window_ms: 60_000],
  http_proxy_max_body_bytes: 67_108_864,
  routing: %{"ping" => :terminate_pong},
  # Fake upstream processes instead of dialing ws://127.0.0.1:3001 —
  # real-upstream tests are tagged :integration and excluded by default.
  upstream_adapter: GatewayTest.FakeUpstream

# P8 conferencing — still flagged off (no call surface), but tests that
# exercise the domain pass enabled?: true on the actor. Grant secret is
# a test-only pin; never a real token material in logs.
config :afterlight, :conferencing,
  enabled: false,
  grant_ttl_secs: 300,
  reconnect_grace_secs: 30,
  reaper_interval_ms: 60_000,
  expiry_leeway_secs: 5,
  default_max_participants: 8,
  grant_secret: "afterlight-test-conferencing-grant-secret-not-for-prod-0000"

# Real-Node integration tests run only when AFTERLIGHT_INTEGRATION=1.
config :afterlight, :integration_tests, System.get_env("AFTERLIGHT_INTEGRATION") == "1"

config :afterlight, :accounts,
  claim_window_grace_ms: 2_592_000_000,
  reaper_interval_ms: 86_400_000,
  outbox_interval_ms: 86_400_000
