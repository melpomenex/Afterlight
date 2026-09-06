defmodule AfterlightWeb.HealthController do
  use Phoenix.Controller, formats: [:json]

  def show(conn, _params) do
    json(conn, %{status: "ok", app: "afterlight", phase: "p1-foundation"})
  end
end
