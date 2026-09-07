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
  routing: %{"ping" => :terminate_pong, "join_room" => :node, "movement" => :node, "emote" => :node, "chat_send" => :node},
  # Fake upstream processes instead of dialing ws://127.0.0.1:3001 —
  # real-upstream tests are tagged :integration and excluded by default.
  upstream_adapter: GatewayTest.FakeUpstream

# P3 world room runtime — deterministic test pins. Individual tests that
# need faster tick/grace or a tighter outbound ceiling override these via
# Application.put_env in a try/after; the emote cooldown keeps the Node
# 500 ms default (tests exercise the cooldown against the real window).
config :afterlight, :world,
  flush_interval_ms: 100,
  empty_room_grace_ms: 60_000,
  emote_cooldown_ms: 500,
  outbound_queue_max: 256

# Real-Node integration tests run only when AFTERLIGHT_INTEGRATION=1.
config :afterlight, :integration_tests, System.get_env("AFTERLIGHT_INTEGRATION") == "1"

config :logger, level: :warning
