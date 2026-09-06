defmodule Afterlight.Gateway do
  # Config accessor for the P2 gateway transport (`config :afterlight, :gateway`).
  #
  # Values are read at call time (never at compile time) so tests and
  # deployments can override them via Application.put_env / runtime.exs.
  @moduledoc false

  @spec config(atom, term) :: term
  def config(key, default \\ nil) do
    :afterlight
    |> Application.get_env(:gateway, [])
    |> Keyword.get(key, default)
  end

  @doc "Correlation id for logs — never tokens, never secrets (design D5)."
  @spec correlation_id() :: String.t()
  def correlation_id do
    "ga-" <> Base.url_encode64(:crypto.strong_rand_bytes(9), padding: false)
  end
end
