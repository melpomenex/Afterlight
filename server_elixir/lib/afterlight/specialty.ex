defmodule Afterlight.Specialty do
  @moduledoc false

  @doc """
  Config accessor (`config :afterlight, :specialty`), read at call time.

  Keys:

    * `:sidecar_http_url` — Node HTTP base for adapter calls (defaults to gateway proxy_target)
    * `:boundary_secret` — shared adapter auth header (defaults to gateway boundary_secret)
    * `:resolve_timeout_ms` — Phoenix→sidecar resolve HTTP timeout
    * `:resolve_cooldown_ms` — per-player cooldown between resolves (~10 s)
    * `:resolve_global_cap` — max concurrent resolves cluster-wide on this node
    * `:circuit_failure_threshold` — consecutive failures before opening the breaker
    * `:circuit_reset_ms` — time before half-open probe
    * `:status_interval_ms` — torrent_state poll cadence (~2 s)
  """
  @spec config(atom, term) :: term
  def config(key, default \\ nil) do
    :afterlight
    |> Application.get_env(:specialty, [])
    |> Keyword.get(key, default)
  end

  @spec sidecar_base_url() :: String.t()
  def sidecar_base_url do
    config(:sidecar_http_url) ||
      Afterlight.Gateway.config(:proxy_target, "http://127.0.0.1:3001")
  end

  @spec boundary_secret() :: String.t() | nil
  def boundary_secret do
    config(:boundary_secret, Afterlight.Gateway.config(:boundary_secret))
  end
end
