defmodule Afterlight.Specialty.TheaterSession do
  @moduledoc """
  Targeted `torrent_grant` pushes for theater occupants (P7 task 1.2).

  When the active bill item is a torrent pick, mints a short-lived playback
  grant keyed to the server-verified guest identity and schedules re-mints
  before expiry so in-flight `<video>` Range requests never 403 mid-stream.
  """

  alias Afterlight.Specialty.Grants

  require Logger

  @theater_room "theater"

  @doc """
  After a `theater_state` relay, mint or refresh the participant's grant.
  """
  @spec sync_grant(Phoenix.Socket.t(), map()) :: Phoenix.Socket.t()
  def sync_grant(socket, fields) when is_map(fields) do
    theater = Map.get(fields, "theater") || Map.get(fields, :theater)

    case {in_theater?(socket), active_torrent(theater)} do
      {true, {infohash, file_index}} ->
        maybe_mint(socket, socket.assigns.guest_id, infohash, file_index, action: :mint)

      _ ->
        clear_if_ctx(socket)
    end
  end

  @doc "Re-mint on the scheduled timer when the same item is still active."
  @spec renew_grant(Phoenix.Socket.t(), {String.t(), non_neg_integer()}) :: Phoenix.Socket.t()
  def renew_grant(socket, {infohash, file_index}) do
    theater = socket.assigns[:theater_snapshot]

    case {in_theater?(socket), active_torrent(theater)} do
      {true, {^infohash, ^file_index}} ->
        maybe_mint(socket, socket.assigns.guest_id, infohash, file_index,
          force: true,
          action: :renew
        )

      _ ->
        clear_if_ctx(socket)
    end
  end

  @doc """
  Cancel the participant's grant lifecycle (left the theater, disconnected,
  or the item stopped being a torrent). Idempotent.
  """
  @spec clear(Phoenix.Socket.t()) :: Phoenix.Socket.t()
  def clear(socket) do
    ctx = socket.assigns[:torrent_grant_ctx]
    socket = cancel_timer(socket) |> assign_ctx(nil)
    if ctx, do: emit(:clear, ctx.key, %{})
    socket
  end

  @doc "Remember the latest theater snapshot for renew timers."
  @spec remember_theater(Phoenix.Socket.t(), map()) :: Phoenix.Socket.t()
  def remember_theater(socket, fields) when is_map(fields) do
    theater = Map.get(fields, "theater") || Map.get(fields, :theater)
    Phoenix.Socket.assign(socket, :theater_snapshot, theater)
  end

  defp clear_if_ctx(socket) do
    if socket.assigns[:torrent_grant_ctx] do
      clear(socket)
    else
      socket
    end
  end

  defp maybe_mint(socket, participant, infohash, file_index, opts \\ []) do
    key = {infohash, file_index}
    ctx = socket.assigns[:torrent_grant_ctx]
    force? = Keyword.get(opts, :force, false)
    action = Keyword.get(opts, :action, :mint)

    cond do
      not force? and ctx_matches?(ctx, key) and not Grants.should_re_mint?(ctx.expires_at_ms) ->
        emit(:skip, key, %{})
        socket

      true ->
        case Grants.mint(participant, infohash, file_index) do
          {:ok, info} ->
            payload =
              %{
                "infohash" => infohash,
                "fileIndex" => file_index,
                "grant" => info.grant,
                "expiresAtMs" => info.expires_at_ms
              }
              |> maybe_put_room(socket)

            Phoenix.Channel.push(socket, "torrent_grant", payload)
            emit(action, key, %{expires_at_ms: info.expires_at_ms})

            socket
            |> schedule_renew(key, info.expires_at_ms)

          {:error, reason} ->
            emit(:mint_failed, key, %{reason: reason})

            Logger.debug(
              "torrent grant mint failed infohash=#{prefix(infohash)} reason=#{inspect(reason)}"
            )

            socket
        end
    end
  end

  defp ctx_matches?(%{key: key}, key), do: true
  defp ctx_matches?(_, _), do: false

  defp schedule_renew(socket, key, expires_at_ms) do
    socket = cancel_timer(socket)
    now = System.system_time(:millisecond)
    ttl = expires_at_ms - now
    delay = max(100, trunc(ttl * Grants.re_mint_ratio()))
    ref = Process.send_after(self(), {:torrent_grant_renew, key}, delay)
    assign_ctx(socket, %{key: key, expires_at_ms: expires_at_ms, timer: ref})
  end

  defp cancel_timer(socket) do
    case socket.assigns[:torrent_grant_ctx] do
      %{timer: ref} when is_reference(ref) ->
        Process.cancel_timer(ref)

      _ ->
        :ok
    end

    socket
  end

  defp assign_ctx(socket, ctx) do
    Phoenix.Socket.assign(socket, :torrent_grant_ctx, ctx)
  end

  # Room tag travels on the public frame (never in the token): the client's
  # travel filter drops a queued old-room grant.
  defp maybe_put_room(payload, socket) do
    case socket.assigns[:world_room] do
      %{wire_id: wire} when is_binary(wire) -> Map.put(payload, "roomId", wire)
      _ -> payload
    end
  end

  # Bounded telemetry for the grant lifecycle; never the token, never the
  # full magnet. `infohash` is an 8-char prefix only.
  defp emit(action, key, extra) do
    {infohash, file_index} = key || {nil, nil}

    :telemetry.execute(
      [:afterlight, :torrent, :grant],
      %{count: 1},
      Map.merge(
        %{action: action, infohash: prefix(infohash), file_index: file_index},
        extra
      )
    )
  end

  defp prefix(nil), do: nil
  defp prefix(infohash) when is_binary(infohash), do: String.slice(infohash, 0, 8)
  defp prefix(_other), do: nil

  defp in_theater?(socket) do
    case socket.assigns[:world_room] do
      %{wire_id: @theater_room} -> true
      _ -> false
    end
  end

  defp active_torrent(%{"now" => %{"kind" => "torrent"} = now}) do
    with infohash when is_binary(infohash) <- now["infohash"],
         file_index when is_integer(file_index) <- normalize_index(now["fileIndex"]) do
      {String.downcase(infohash), file_index}
    else
      _ -> nil
    end
  end

  defp active_torrent(_), do: nil

  defp normalize_index(n) when is_integer(n) and n >= 0, do: n

  defp normalize_index(n) when is_float(n) and n >= 0 and trunc(n) == n,
    do: trunc(n)

  defp normalize_index(_), do: nil
end
