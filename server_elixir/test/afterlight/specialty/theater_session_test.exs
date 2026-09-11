defmodule Afterlight.Specialty.TheaterSessionTest do
  @moduledoc """
  Unit coverage for the torrent grant lifecycle module
  (fix-torrent-playback-grant-regression): mint/skip/replace, renewal
  guards, and teardown. Channel-level integration lives in
  `AfterlightWeb.GameChannelTorrentGrantTest`.
  """

  use ExUnit.Case, async: false

  alias Afterlight.Specialty.{Grants, TheaterSession}

  @infohash "08ada5a7a6183aae1e09d831df6748d566095a10"
  @other_infohash "f5e0b9d5f9d5e6f5a5b5c5d5e5f5060708090a0b"
  @secret "test-torrent-grant-secret-000000000000000000"

  setup do
    prev_secret = Application.get_env(:afterlight, :torrent_grant_secret)
    prev_ttl = Application.get_env(:afterlight, :torrent_grant_ttl_secs)
    prev_env = System.get_env("AFTERLIGHT_TORRENT_GRANT_SECRET")
    prev_prev = System.get_env("AFTERLIGHT_TORRENT_GRANT_SECRET_PREVIOUS")

    Application.put_env(:afterlight, :torrent_grant_secret, @secret)
    System.put_env("AFTERLIGHT_TORRENT_GRANT_SECRET", @secret)
    System.delete_env("AFTERLIGHT_TORRENT_GRANT_SECRET_PREVIOUS")

    on_exit(fn ->
      restore_app(:torrent_grant_secret, prev_secret)
      restore_app(:torrent_grant_ttl_secs, prev_ttl)
      restore_env("AFTERLIGHT_TORRENT_GRANT_SECRET", prev_env)
      restore_env("AFTERLIGHT_TORRENT_GRANT_SECRET_PREVIOUS", prev_prev)
    end)

    :ok
  end

  defp restore_app(key, nil), do: Application.delete_env(:afterlight, key)
  defp restore_app(key, value), do: Application.put_env(:afterlight, key, value)
  defp restore_env(key, nil), do: System.delete_env(key)
  defp restore_env(key, value), do: System.put_env(key, value)

  defp socket(guest_id, opts \\ []) do
    room = Keyword.get(opts, :room, %{wire_id: "theater"})

    %Phoenix.Socket{
      topic: "game:v1",
      join_ref: "1",
      transport_pid: self(),
      serializer: Phoenix.ChannelTest.NoopSerializer,
      joined: true,
      assigns: %{guest_id: guest_id, world_room: room}
    }
  end

  defp torrent_fields(infohash \\ @infohash, file_index \\ 0) do
    %{"theater" => %{"now" => %{"kind" => "torrent", "infohash" => infohash, "fileIndex" => file_index}}}
  end

  defp other_fields do
    %{"theater" => %{"now" => %{"kind" => "youtube", "url" => "https://youtu.be/x"}}}
  end

  defp next_grant(timeout \\ 200) do
    assert_receive %Phoenix.Socket.Message{event: "torrent_grant", payload: payload}, timeout
    payload
  end

  defp refute_grant(timeout \\ 150) do
    refute_receive %Phoenix.Socket.Message{event: "torrent_grant"}, timeout
  end

  test "sync_grant/2 mints a room-tagged participant grant and schedules renewal" do
    socket = TheaterSession.sync_grant(socket("guest_session_a"), torrent_fields())

    payload = next_grant()
    assert payload["roomId"] == "theater"
    assert payload["infohash"] == @infohash
    assert payload["fileIndex"] == 0
    assert is_integer(payload["expiresAtMs"])

    assert {:ok, claims} =
             Grants.verify(payload["grant"], @infohash, 0, secrets: [@secret])

    assert claims["participant"] == "guest_session_a"

    ctx = socket.assigns.torrent_grant_ctx
    assert ctx.key == {@infohash, 0}
    assert is_reference(ctx.timer)
  end

  test "sync_grant/2 skips a fresh matching context and replaces on key change" do
    socket =
      socket("guest_session_b")
      |> TheaterSession.sync_grant(torrent_fields())
      |> TheaterSession.sync_grant(torrent_fields())

    _first = next_grant()
    refute_grant()

    first_timer = socket.assigns.torrent_grant_ctx.timer

    replaced =
      TheaterSession.sync_grant(socket, torrent_fields(@other_infohash, 3))

    payload = next_grant()
    assert payload["infohash"] == @other_infohash
    assert payload["fileIndex"] == 3
    assert replaced.assigns.torrent_grant_ctx.key == {@other_infohash, 3}
    refute replaced.assigns.torrent_grant_ctx.timer == first_timer
  end

  test "sync_grant/2 cancels the lifecycle when the item stops being a torrent" do
    socket =
      socket("guest_session_c")
      |> TheaterSession.sync_grant(torrent_fields())

    _first = next_grant()
    timer = socket.assigns.torrent_grant_ctx.timer

    canceled = TheaterSession.sync_grant(socket, other_fields())

    assert canceled.assigns.torrent_grant_ctx == nil
    refute Process.read_timer(timer)
    refute_grant()
  end

  test "renew_grant/2 re-mints only while the remembered snapshot still matches" do
    socket =
      socket("guest_session_d")
      |> TheaterSession.remember_theater(torrent_fields())
      |> TheaterSession.sync_grant(torrent_fields())

    _first = next_grant()

    renewed = TheaterSession.renew_grant(socket, {@infohash, 0})
    payload = next_grant()
    assert payload["infohash"] == @infohash
    assert is_reference(renewed.assigns.torrent_grant_ctx.timer)

    # Stale key: the remembered item has moved on; nothing is minted.
    stale =
      socket
      |> TheaterSession.remember_theater(torrent_fields(@other_infohash, 1))
      |> TheaterSession.renew_grant({@infohash, 0})

    assert stale.assigns.torrent_grant_ctx == nil
    refute_grant()
  end

  test "renew_grant/2 refuses outside the theater" do
    socket = socket("guest_session_e", room: %{wire_id: "market"})
    socket = TheaterSession.remember_theater(socket, torrent_fields())

    result = TheaterSession.renew_grant(socket, {@infohash, 0})
    assert result.assigns[:torrent_grant_ctx] == nil
    refute_grant()
  end

  def handle_event(_event, measurements, metadata, parent) do
    send(parent, {:telemetry, measurements, metadata})
  end

  test "grant telemetry is bounded and token-free" do
    parent = self()
    handler_id = "torrent-grant-test-#{System.unique_integer([:positive])}"

    :telemetry.attach(
      handler_id,
      [:afterlight, :torrent, :grant],
      &__MODULE__.handle_event/4,
      parent
    )

    on_exit(fn -> :telemetry.detach(handler_id) end)

    _socket = TheaterSession.sync_grant(socket("guest_session_t"), torrent_fields())
    _grant = next_grant()

    assert_receive {:telemetry, measurements, metadata}
    assert measurements.count == 1
    assert metadata.action == :mint
    assert metadata.infohash == "08ada5a7"
    assert metadata.file_index == 0
    assert is_integer(metadata.expires_at_ms)
    refute Map.has_key?(metadata, :grant)
    refute inspect(metadata) =~ "=="
  end

  test "clear/1 cancels the timer and a later stale renewal pushes nothing" do
    socket =
      socket("guest_session_f")
      |> TheaterSession.remember_theater(torrent_fields())
      |> TheaterSession.sync_grant(torrent_fields())

    _first = next_grant()
    timer = socket.assigns.torrent_grant_ctx.timer

    cleared = TheaterSession.clear(socket)
    assert cleared.assigns.torrent_grant_ctx == nil
    refute Process.read_timer(timer)

    # A timer that survived (or a replayed message) for the old item must not
    # mint once the remembered item no longer matches.
    stale =
      cleared
      |> TheaterSession.remember_theater(other_fields())
      |> TheaterSession.renew_grant({@infohash, 0})

    assert stale.assigns.torrent_grant_ctx == nil
    refute_grant()
  end
end
