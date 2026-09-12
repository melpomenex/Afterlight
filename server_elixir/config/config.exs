# Compile-time configuration only — no secrets here (D6).
import Config

config :afterlight,
  # Repo-root-relative path to the parity fixture corpus exported by
  # scripts/export-parity-fixtures.mjs (P0).
  parity_fixtures_path: "../tests/fixtures/parity",
  ecto_repos: [Afterlight.Repo],
  ash_domains: [
    Afterlight.Accounts,
    Afterlight.Catalog,
    Afterlight.Conferencing,
    Afterlight.Theater,
    Afterlight.Activities.Domain
  ],
  accounts: [
    claim_window_grace_ms: 2_592_000_000,
    reaper_interval_ms: 60_000,
    outbox_interval_ms: 1_000
  ],
  theater: [
    outbox_interval_ms: 1_000
  ]

# P8 conferencing spike — OFF by default. Enabling this must not change
# game rooms, theater playback, or watch-together.
# Summit Run admission is disabled by default (add-multiplayer-snowboard-arcade 4.5);
# operators enable via AFTERLIGHT_SNOWBOARD_ENABLED=1 in the runtime environment.
config :afterlight, :snowboard_enabled, false

# Downhill Mayhem admission is disabled by default
# (integrate-multiplayer-downhill-mayhem-arcade D20); operators enable via
# AFTERLIGHT_DOWNHILL_MAYHEM_ENABLED=1 in the runtime environment.
config :afterlight, :downhill_mayhem_enabled, false

config :afterlight, :conferencing,
  enabled: false,
  grant_ttl_secs: 300,
  reconnect_grace_secs: 30,
  reaper_interval_ms: 60_000,
  expiry_leeway_secs: 5,
  default_max_participants: 8,
  grant_secret: nil

# P2 gateway transport (add-phoenix-gateway-transport). Compile-time
# defaults only — every secret/env read lives in runtime.exs; test.exs
# pins deterministic values. See Afterlight.Gateway.Router @moduledoc for
# the disposition table semantics.
config :afterlight, :gateway,
  # Node upstream ("shadow" connection) WebSocket URL over the loopback /
  # private boundary (D5). Env: AFTERLIGHT_NODE_WS_URL (runtime.exs).
  node_ws_url: "ws://127.0.0.1:3001/ws",
  # Reverse-proxy target for /api/health and /api/theater/* (D1).
  # Env: AFTERLIGHT_NODE_HTTP_URL (runtime.exs).
  proxy_target: "http://127.0.0.1:3001",
  # Shared boundary secret sent as `x-afterlight-boundary` to Node (D5).
  # nil = no header sent (dev/test; Node accepts secret-less requests
  # during P2 so the rollback path keeps working).
  boundary_secret: nil,
  # Phoenix.Token signing secret (D3). nil in dev falls back to a
  # distinct dev-only default in runtime.exs; prod must set
  # AFTERLIGHT_TOKEN_SECRET. Never logged.
  token_secret: nil,
  # Guest token TTL in seconds (~12h, D3).
  token_max_age_secs: 43_200,
  # POST /api/auth/guest token bucket, per remote IP (5.1).
  auth_rate_limit: [limit: 30, window_ms: 60_000],
  # WS connect token bucket: per source IP and per verified guest_id
  # (5.1). Connect refusals are retryable; the HTTP 429 carries
  # Retry-After.
  connect_rate_limit: [limit: 60, window_ms: 60_000],
  # Places directory snapshot requests (add-social-place-framework 3.3):
  # at most one per signed session per five seconds, enforced with the
  # same ETS bucket table (Afterlight.Gateway.RateLimit).
  place_directory_rate_limit: [limit: 1, window_ms: 5_000],
  # Room atmosphere resnapshots (add-atmosphere-weather-system 2.1, D2):
  # membership-gated `atmosphere_get`, at most one per signed session per
  # five seconds through the same ETS bucket table.
  atmosphere_rate_limit: [limit: 1, window_ms: 5_000],
  # Gateway-side safety cap for buffered reverse-proxy request bodies in
  # bytes (64 MiB, mirroring Node's own EPG cap — Node still enforces
  # its caps and answers 413; the gateway rejects larger bodies itself).
  # Responses are always streamed, never buffered (see AfterlightWeb.HTTPProxy).
  http_proxy_max_body_bytes: 67_108_864,
  # Domain→owner disposition table (P2: transport-terminated ping,
  # everything else relayed to Node). See Afterlight.Gateway.Router.
  routing: %{"ping" => :terminate_pong},
  # Upstream WebSocket adapter (D5). Overridable in tests so NodeProxy
  # tests inject fake upstream processes instead of dialing real Node.
  upstream_adapter: Afterlight.Gateway.NodeUpstream

config :logger, level: :info

# Endpoint template settings; the listener never auto-starts in dev
# (server: false comes from runtime.exs) and binds localhost only.
config :afterlight, AfterlightWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Bandit.PhoenixAdapter,
  render_errors: [format: "html"],
  secret_key_base: nil,
  server: false,
  live_view: [signing_salt: "afterlight-p1"],
  pubsub_server: Afterlight.PubSub,
  http: [ip: {127, 0, 0, 1}, port: 4000]

config :ash, :missed_notifications, :ignore

config :afterlight, Oban,
  repo: Afterlight.Repo,
  queues: [theater_import: 4],
  plugins: [Oban.Plugins.Pruner]

# Per-env overrides (test.exs pins deterministic gateway values; dev/prod
# runtime knobs live in runtime.exs).
import_config "#{config_env()}.exs"
