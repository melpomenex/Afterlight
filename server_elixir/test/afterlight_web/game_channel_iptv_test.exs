defmodule AfterlightWeb.GameChannelIptvTest do
  use Afterlight.DataCase, async: false

  import Phoenix.ChannelTest

  @endpoint AfterlightWeb.Endpoint

  alias Afterlight.Theater

  @theater_routing %{
    "join_room" => :phoenix,
    "movement" => :phoenix,
    "emote" => :phoenix,
    "theater_queue" => :phoenix,
    "theater_control" => :phoenix,
    "theater_channel" => :phoenix
  }

  @hls "https://example.test/live/channel.m3u8"

  setup do
    GatewayTest.FakeCore.set_owner(self())
    start_supervised!(Afterlight.Theater.Supervisor)
    Afterlight.Repo.delete_all(from(ti in "theater_items"))
    Afterlight.Repo.delete_all(from(tr in "theater_rooms"))
    :ok
  end

  defp flipped(fun), do: GatewayTest.ConfigLock.with_lock(:routing, @theater_routing, fun)

  defp connect_and_join_theater(guest_id) do
    {:ok, %{token: token}} = Afterlight.Gateway.Auth.issue(guest_id, nil)
    assert {:ok, socket} = connect(AfterlightWeb.UserSocket, %{"token" => token})
    assert {:ok, _, socket} = subscribe_and_join(socket, AfterlightWeb.GameChannel, "game:v1")
    Process.unlink(socket.channel_pid)

    push(socket, "hello", %{"guestId" => guest_id})
    assert_receive {:fake_frame, _up, _hello_json}, 1_000

    push(socket, "join_room", %{"roomId" => "theater"})
    assert_push "presence_update", _roster
    assert_receive {:fake_frame, _up, _join_json}, 1_000
    assert_push "theater_state", _join_snapshot

    socket
  end

  test "theater_channel push receives immediate theater_state with hls now" do
    flipped(fn ->
      socket = connect_and_join_theater("guest_iptv_a")

      push(socket, "theater_channel", %{"url" => @hls, "title" => "News"})

      assert_push "theater_state", %{
        "theater" => %{"now" => %{"kind" => "hls", "url" => @hls, "title" => "News"}},
        "serverNow" => _
      }

      snapshot = Theater.snapshot("theater")
      assert snapshot["now"]["kind"] == "hls"
      assert snapshot["now"]["url"] == @hls
    end)
  end

  test "theater_channel updates the authoritative room snapshot for all occupants" do
    flipped(fn ->
      socket_a = connect_and_join_theater("guest_iptv_b1")
      _socket_b = connect_and_join_theater("guest_iptv_b2")

      push(socket_a, "theater_channel", %{"url" => @hls, "title" => "Shared"})

      assert_push "theater_state", %{
        "theater" => %{"now" => %{"kind" => "hls", "url" => @hls}},
        "serverNow" => _
      }

      snapshot =
        eventually_snapshot(fn snap ->
          match?(%{"now" => %{"url" => @hls, "kind" => "hls"}}, snap)
        end)

      assert snapshot["queue"] == []
      assert is_binary(snapshot["now"]["id"])
    end)
  end

  defp eventually_snapshot(matcher, tries \\ 200)

  defp eventually_snapshot(_matcher, 0), do: flunk("theater snapshot never matched")

  defp eventually_snapshot(matcher, tries) do
    snapshot = Theater.snapshot("theater")

    if matcher.(snapshot) do
      snapshot
    else
      Process.sleep(10)
      eventually_snapshot(matcher, tries - 1)
    end
  end
end
