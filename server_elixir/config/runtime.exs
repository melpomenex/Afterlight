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
