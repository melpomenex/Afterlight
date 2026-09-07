# Compile-time configuration only — no secrets here (D6).
import Config

config :afterlight,
  # Repo-root-relative path to the parity fixture corpus exported by
  # scripts/export-parity-fixtures.mjs (P0).
  parity_fixtures_path: "../tests/fixtures/parity",
  ecto_repos: [Afterlight.Repo],
  ash_domains: [Afterlight.Conferencing]

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
  # Gateway-side safety cap for buffered reverse-proxy request bodies in
  # bytes (64 MiB, mirroring Node's own EPG cap — Node still enforces
  # its caps and answers 413; the gateway rejects larger bodies itself).
  # Responses are always streamed, never buffered (see AfterlightWeb.HTTPProxy).
  http_proxy_max_body_bytes: 67_108_864,
  # Domain→owner disposition table (P2: transport-terminated ping,
  # everything else relayed to Node). See Afterlight.Gateway.Router.
  # P3 (add-world-room-runtime): the world rows FLIP to :phoenix to route
  # `join_room`/`movement`/`emote` through Afterlight.World. Default stays
  # :node (runtime dormant, zero player-visible change) — flip per
  # environment by setting the three rows to :phoenix; rollback is the
  # same edit in reverse (pure transport change, no durable state moved).
  routing: %{
    "ping" => :terminate_pong,
    "join_room" => :node,
    "movement" => :node,
    "emote" => :node,
    "chat_send" => :node
  },
  # Upstream WebSocket adapter (D5). Overridable in tests so NodeProxy
  # tests inject fake upstream processes instead of dialing real Node.
  upstream_adapter: Afterlight.Gateway.NodeUpstream

# P3 world room runtime (add-world-room-runtime). Room processes read
# these at call time (Afterlight.World.config/2) so tests and deployments
# can override without restarts; test.exs pins deterministic values.
config :afterlight, :world,
  # Movement flush tick — Node's 10 Hz dirty-room cadence (protocol-catalog §2).
  flush_interval_ms: 100,
  # Empty-room grace before a quiet stop (design D2, default 60 s).
  empty_room_grace_ms: 60_000,
  # Per-connection emote cooldown — the Node baseline's 500 ms (task 4.1).
  emote_cooldown_ms: 500,
  # Per-transport outbound ceiling before a stalled consumer is
  # disconnected with a retryable reason (design D3d).
  outbound_queue_max: 256

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

config :phoenix, :json_library, Jason

# Per-env overrides (test.exs pins deterministic gateway values; dev/prod
# runtime knobs live in runtime.exs).
import_config "#{config_env()}.exs"
