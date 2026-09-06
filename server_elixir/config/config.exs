# Compile-time configuration only — no secrets here (D6).
import Config

config :afterlight,
  # Repo-root-relative path to the parity fixture corpus exported by
  # scripts/export-parity-fixtures.mjs (P0).
  parity_fixtures_path: "../tests/fixtures/parity",
  ecto_repos: [Afterlight.Repo]

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
  http: [ip: {127, 0, 0, 1}, port: 4000]

config :phoenix, :json_library, Jason
