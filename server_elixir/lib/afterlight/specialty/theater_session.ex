defmodule Afterlight.Specialty.TheaterSession do
  @moduledoc """
  Targeted `torrent_grant` pushes for theater occupants (P7 task 1.2).

  When the active bill item is a torrent pick, mints a short-lived playback
  grant keyed to the server-verified guest identity and schedules re-mints
  before expiry so in-flight `<video>` Range requests never 403 mid-stream.
  """

  alias Afterlight.Specialty.Grants

  @theater_room "theater"

  @doc """
  After a `theater_state` relay, mint or refresh the participant's grant.
  """
  @spec sync_grant(Phoenix.Socket.t(), map()) :: Phoenix.Socket.t()
  def sync_grant(socket, fields) when is_map(fields) do
    theater = Map.get(fields, "theater") || Map.get(fields, :theater)

    case {in_theater?(socket), active_torrent(theater)} do
      {true, {infohash, file_index}} ->
        maybe_mint(socket, socket.assigns.guest_id, infohash, file_index)

      _ ->
        cancel_timer(socket)
        |> assign_ctx(nil)
    end
  end

  @doc "Re-mint on the scheduled timer when the same item is still active."
  @spec renew_grant(Phoenix.Socket.t(), {String.t(), non_neg_integer()}) :: Phoenix.Socket.t()
  def renew_grant(socket, {infohash, file_index}) do
    theater = socket.assigns[:theater_snapshot]

    case {in_theater?(socket), active_torrent(theater)} do
      {true, {^infohash, ^file_index}} ->
        maybe_mint(socket, socket.assigns.guest_id, infohash, file_index, force: true)

      _ ->
        cancel_timer(socket) |> assign_ctx(nil)
    end
  end

  @doc "Remember the latest theater snapshot for renew timers."
  @spec remember_theater(Phoenix.Socket.t(), map()) :: Phoenix.Socket.t()
  def remember_theater(socket, fields) when is_map(fields) do
    theater = Map.get(fields, "theater") || Map.get(fields, :theater)
    Phoenix.Socket.assign(socket, :theater_snapshot, theater)
  end

  defp maybe_mint(socket, participant, infohash, file_index, opts \\ []) do
    key = {infohash, file_index}
    ctx = socket.assigns[:torrent_grant_ctx]
    force? = Keyword.get(opts, :force, false)

    cond do
      not force? and ctx_matches?(ctx, key) and not Grants.should_re_mint?(ctx.expires_at_ms) ->
        socket

      true ->
        case Grants.mint(participant, infohash, file_index) do
          {:ok, info} ->
            Phoenix.Channel.push(socket, "torrent_grant", %{
              "infohash" => infohash,
              "fileIndex" => file_index,
              "grant" => info.grant,
              "expiresAtMs" => info.expires_at_ms
            })

            socket
            |> schedule_renew(key, info.expires_at_ms)

          {:error, _} ->
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
