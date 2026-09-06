defmodule AfterlightWeb.Router do
  # Health-check-only pipeline. Intentionally no game routes.
  use Phoenix.Router

  scope "/", AfterlightWeb do
    get "/", HealthController, :show
    get "/health", HealthController, :show
  end
end
