defmodule Afterlight.Application do
  # Afterlight supervision tree.
  #
  # P1 foundation owned NOTHING (no room processes, no presence, no Ash
  # domains — Node remained the sole authority). P2 (gateway transport)
  # adds ONLY the transport machinery: the Finch HTTP client behind the
  # reverse proxy, and the transient per-session NodeProxy relay under a
  # DynamicSupervisor. Authority is still 100% Node's (design D4) — the
  # gateway terminates transport + identity + `ping` and relays
  # everything else 1:1.
  use Application

  @impl true
  def start(_type, _args) do
    # Transient ETS registries (sessions + rate-limit buckets) must exist
    # before the Endpoint can serve a request. No database rows anywhere.
    Afterlight.Gateway.Sessions.init()
    Afterlight.Gateway.RateLimit.init()
    Afterlight.Theater.PlaylistPreview.init()

    children =
      [
        Afterlight.Repo
      ] ++ oban_children() ++ domain_children() ++ [
        Afterlight.Conferencing.Reaper,
        Afterlight.Media.Supervisor,
        {Phoenix.PubSub, name: Afterlight.PubSub},
        Afterlight.Telemetry,
        {Finch, name: Afterlight.Finch, pools: %{default: [count: 8, size: 32]}},
        {DynamicSupervisor, name: Afterlight.Gateway.ProxySupervisor},
        AfterlightWeb.Endpoint
      ]

    opts = [strategy: :one_for_one, name: Afterlight.Supervisor]
    Supervisor.start_link(children, opts)
  end

  defp oban_children do
    if Application.get_env(:afterlight, :enable_oban, true) do
      [{Oban, oban_config()}]
    else
      []
    end
  end

  defp domain_children do
    if Application.get_env(:afterlight, :start_domain_supervisors, true) do
      [
        Afterlight.Accounts.Supervisor,
        Afterlight.Theater.Supervisor,
        Afterlight.TheaterMedia.Supervisor,
        Afterlight.World.Supervisor,
        Afterlight.Activities.Supervisor,
        Afterlight.Social.Supervisor,
        Afterlight.Specialty.Supervisor
      ]
    else
      [Afterlight.World.Supervisor, Afterlight.Activities.Supervisor]
    end
  end

  @impl true
  def config_change(changed, _new, removed) do
    AfterlightWeb.Endpoint.config_change(changed, removed)
    :ok
  end

  defp oban_config do
    Application.get_env(:afterlight, Oban, [])
  end
end
