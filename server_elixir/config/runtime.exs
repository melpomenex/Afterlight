# Runtime configuration — environment reads only (D6).
import Config

database_url = System.get_env("DATABASE_URL") || "ecto://afterlight@127.0.0.1:5433/afterlight_dev"

config :afterlight, Afterlight.Repo,
  url: database_url,
  pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10")

# Explicit non-production dev default; hard boot failure under :prod when
# missing so a secretless release can never start.
secret_key_base =
  System.get_env("SECRET_KEY_BASE") ||
    if config_env() == :prod do
      raise "SECRET_KEY_BASE is not set — refusing to boot a production release without a secret"
    else
      "afterlight-dev-only-secret-base-please-do-not-use-in-prod-0000000000000000"
    end

config :afterlight, AfterlightWeb.Endpoint,
  secret_key_base: secret_key_base,
  server: System.get_env("PHX_SERVER") == "true",
  http: [
    ip: {127, 0, 0, 1},
    port: String.to_integer(System.get_env("PORT") || "4000")
  ]

# P2 gateway transport runtime knobs (env reads only; test pins its own
# deterministic values in test.exs, which is why this block is skipped
# under :test — runtime.exs evaluates after per-env configs).
if config_env() != :test do
  token_secret =
    System.get_env("AFTERLIGHT_TOKEN_SECRET") ||
      if config_env() == :prod do
        raise "AFTERLIGHT_TOKEN_SECRET is not set — refusing to boot a production release without a guest-token secret"
      else
        # Distinct from secret_key_base on purpose (D3): the guest-token
        # secret rotates independently of the endpoint signing secret.
        "afterlight-dev-only-token-secret-please-do-not-use-in-prod-1111111111111111"
      end

  # P3 world flip (add-world-room-runtime): AFTERLIGHT_WORLD_OWNER=phoenix
  # routes the world rows through Afterlight.World; "node" (default) keeps
  # the runtime dormant. Rollback is the env back to "node" — a pure
  # transport change (protocol-catalog §"World disposition"). The flip is
  # applied at boot; the canonical flip procedure is a gateway restart,
  # which force-closes all transports so every client re-derives
  # membership from the incoming owner via its desiredRoom replay.
  routing =
    :afterlight
    |> Application.get_env(:gateway, [])
    |> Keyword.get(:routing, %{"ping" => :terminate_pong})

  routing =
    if System.get_env("AFTERLIGHT_WORLD_OWNER", "node") == "phoenix" do
      Map.merge(routing, %{"join_room" => :phoenix, "movement" => :phoenix, "emote" => :phoenix})
    else
      routing
    end

  routing =
    if System.get_env("AFTERLIGHT_CHAT_OWNER", "node") == "phoenix" do
      Map.merge(routing, %{"chat_send" => :phoenix})
    else
      routing
    end

  config :afterlight, :gateway,
    node_ws_url: System.get_env("AFTERLIGHT_NODE_WS_URL") || "ws://127.0.0.1:3001/ws",
    proxy_target: System.get_env("AFTERLIGHT_NODE_HTTP_URL") || "http://127.0.0.1:3001",
    boundary_secret: System.get_env("AFTERLIGHT_BOUNDARY_SECRET"),
    token_secret: token_secret,
    token_max_age_secs: String.to_integer(System.get_env("AFTERLIGHT_TOKEN_MAX_AGE") || "43200"),
    routing: routing
end
