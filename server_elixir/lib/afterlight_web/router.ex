defmodule AfterlightWeb.Router do
  # Gateway routes. `/api/health` and `/api/theater/*` never reach this
  # router — AfterlightWeb.HTTPProxy forwards them to Node before the
  # parsers. Only the auth route (gateway-owned credential issuance) and
  # the direct Phoenix health check live here.
  use Phoenix.Router

  scope "/", AfterlightWeb do
    get("/", HealthController, :show)
    get("/health", HealthController, :show)

    post("/api/auth/guest", AuthController, :create)
    get("/api/activities/leaderboard/:game", LeaderboardController, :show)
    post("/internal/irc/adapter/event", IrcAdapterController, :create)
  end
end
