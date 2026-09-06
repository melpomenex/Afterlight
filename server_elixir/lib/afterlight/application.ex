defmodule Afterlight.Application do
  # Afterlight P1 foundation: the supervision tree owns NOTHING yet.
  #
  # There are deliberately NO room processes, NO presence, NO membership,
  # NO Ash domains/resources, and NO game protocol handling. The Node
  # server (../server) remains the sole authority for every game domain
  # until the migration phases (P2+) move authority domain-by-domain.
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      Afterlight.Repo,
      {Phoenix.PubSub, name: Afterlight.PubSub},
      AfterlightWeb.Telemetry,
      AfterlightWeb.Endpoint
    ]

    opts = [strategy: :one_for_one, name: Afterlight.Supervisor]
    Supervisor.start_link(children, opts)
  end

  @impl true
  def config_change(changed, _new, removed) do
    AfterlightWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
