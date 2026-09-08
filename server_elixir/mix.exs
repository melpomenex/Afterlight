defmodule Afterlight.MixProject do
  use Mix.Project

  @version "0.1.0"

  def project do
    [
      app: :afterlight,
      version: @version,
      elixir: "~> 1.18",
      elixirc_paths: elixirc_paths(Mix.env()),
      start_permanent: Mix.env() == :prod,
      aliases: aliases(),
      deps: deps()
    ]
  end

  def application do
    [
      mod: {Afterlight.Application, []},
      extra_applications: [:logger, :runtime_tools]
    ]
  end

  defp elixirc_paths(:test), do: ["lib", "test/support"]
  defp elixirc_paths(_), do: ["lib"]

  defp aliases do
    [
      setup: ["deps.get", "ecto.setup"],
      "ecto.setup": ["ecto.create", "ecto.migrate"],
      "ecto.reset": ["ecto.drop", "ecto.setup"]
    ]
  end

  # Dependency ranges target the serviceradar-evidenced, known-resolving set
  # (see docs/architecture/elixir/ownership.md and server_elixir/README.md).
  # mix.lock is produced by actually resolving in THIS project's context —
  # locks are not portable across projects.
  defp deps do
    [
      {:phoenix, "~> 1.8.11"},
      {:phoenix_live_view, "~> 1.2.9"},
      {:bandit, "~> 1.12"},
      {:ecto, "~> 3.14"},
      {:ecto_sql, "~> 3.14"},
      {:postgrex, "~> 0.22"},
      {:ash, "~> 3.31.3"},
      {:ash_postgres, "~> 2.10.0"},
      {:ash_phoenix, "~> 2.3.24"},
      # Ash.Policy.Authorizer needs a SAT solver; pure-Elixir, no NIF.
      {:simple_sat, "~> 0.1"},
      {:jason, "~> 1.4"},
      {:telemetry, "~> 1.4"},
      {:telemetry_metrics, "~> 1.1"},
      {:telemetry_metrics_prometheus_core, "~> 1.2"},
      {:telemetry_poller, "~> 1.3"},
      {:libcluster, "~> 3.4"},
      # P2 gateway transport: WebSocket CLIENT for the per-session Node
      # "shadow" upstream connection, and the HTTP client behind the
      # /api/health + /api/theater/* reverse proxy.
      {:websockex, "~> 0.4"},
      {:finch, "~> 0.19"},
      # P5 theater playlist import worker (design D3 — plain Oban, not AshOban).
      {:oban, "~> 2.18"},
      {:stream_data, "~> 1.0"}
    ]
  end
end
