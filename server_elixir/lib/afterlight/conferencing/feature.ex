defmodule Afterlight.Conferencing.Feature do
  @moduledoc """
  Conferencing feature flag and knobs. The flag defaults OFF; with it off
  no call surface should be active. Enabling it must not alter game rooms,
  theater playback, or watch-together.
  """

  @app :afterlight
  @key :conferencing

  def enabled? do
    config() |> Keyword.get(:enabled, false) == true
  end

  def grant_ttl_secs, do: Keyword.get(config(), :grant_ttl_secs, 300)
  def reconnect_grace_secs, do: Keyword.get(config(), :reconnect_grace_secs, 30)
  def reaper_interval_ms, do: Keyword.get(config(), :reaper_interval_ms, 60_000)
  def expiry_leeway_secs, do: Keyword.get(config(), :expiry_leeway_secs, 5)
  def default_max_participants, do: Keyword.get(config(), :default_max_participants, 8)

  def grant_secret do
    case Keyword.get(config(), :grant_secret) do
      secret when is_binary(secret) and byte_size(secret) > 0 -> secret
      _ -> raise "afterlight conferencing grant_secret is not configured"
    end
  end

  defp config do
    Application.get_env(@app, @key, [])
  end
end
