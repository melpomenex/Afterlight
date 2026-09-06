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

    children = [
      Afterlight.Repo,
      {Phoenix.PubSub, name: Afterlight.PubSub},
      AfterlightWeb.Telemetry,
      {Finch, name: Afterlight.Finch, pools: %{default: [count: 8, size: 32]}},
      {DynamicSupervisor, name: Afterlight.Gateway.ProxySupervisor},
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
