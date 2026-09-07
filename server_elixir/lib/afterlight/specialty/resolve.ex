defmodule Afterlight.Specialty.Resolve do
  @moduledoc false

  alias Afterlight.Specialty.{ResolveGuard, TorrentRules, TorrentSidecar}

  @type result ::
          {:ok, %{String.t() => term}}
          | {:error, %{String.t() => term}}

  @doc """
  Handles a `torrent_resolve` push after gateway membership checks.

  Returns either a `torrent_files` frame map or an `error` frame map.
  """
  @spec handle(String.t(), map()) :: result()
  def handle(player_id, payload) when is_binary(player_id) and is_map(payload) do
    request_id = to_string(payload["requestId"] || "")
    magnet_raw = to_string(payload["magnet"] || "")

    with :ok <- validate_magnet(magnet_raw),
         :ok <- ResolveGuard.acquire(player_id) do
      try do
        case TorrentSidecar.resolve(magnet_raw) do
          {:ok, snap} ->
            {:ok,
             %{
               "type" => "torrent_files",
               "requestId" => request_id,
               "infohash" => snap["infohash"],
               "name" => snap["name"],
               "files" => snap["files"] || []
             }}

          {:error, reason} ->
            {:error, %{"type" => "error", "message" => TorrentRules.error_text(reason)}}
        end
      after
        ResolveGuard.release(player_id)
      end
    else
      {:error, :invalid_magnet} ->
        {:error, %{"type" => "error", "message" => TorrentRules.error_text("invalid_magnet")}}

      {:error, :in_flight} ->
        {:error, %{"type" => "error", "message" => TorrentRules.error_text("resolve_in_flight")}}

      {:error, :cooldown} ->
        {:error, %{"type" => "error", "message" => TorrentRules.error_text("resolve_cooldown")}}

      {:error, :global_cap} ->
        {:error, %{"type" => "error", "message" => TorrentRules.error_text("resolve_cooldown")}}
    end
  end

  defp validate_magnet(raw) do
    if TorrentRules.parse_magnet(raw), do: :ok, else: {:error, :invalid_magnet}
  end
end
