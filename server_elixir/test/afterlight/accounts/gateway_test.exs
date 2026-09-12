defmodule Afterlight.Accounts.GatewayTest do
  use Afterlight.DataCase, async: false

  import Phoenix.ChannelTest

  alias Afterlight.Gateway.{Auth, RateLimit, Router}

  require Ash.Query

  @endpoint AfterlightWeb.Endpoint

  setup do
    RateLimit.reset()
    GatewayTest.FakeCore.set_owner(self())
    :ok
  end

  test "hello and set_nickname stay relayed to Node" do
    assert Router.disposition("hello") == :node
    assert Router.disposition("set_nickname") == :node
  end

  test "welcome field set is Node-built (relayed) matching the P2 split" do
    {:ok, %{token: token}} = Auth.issue("guest_gw_welcome", nil)
    {:ok, socket} = connect(AfterlightWeb.UserSocket, %{"token" => token})
    {:ok, _, socket} = subscribe_and_join(socket, AfterlightWeb.GameChannel, "game:v1")
    Process.unlink(socket.channel_pid)
    assert_receive {:fake_upstream_started, up, _headers}

    player = %{
      "id" => "guest_gw_welcome",
      "nickname" => "QuietLantern",
      "currentRoom" => "market",
      "lastSeen" => 1
    }

    GatewayTest.FakeCore.inject_frame(up, %{"type" => "welcome", "player" => player})
    GatewayTest.FakeCore.inject_frame(up, %{"type" => "inventory_state", "player" => player})

    assert_push "welcome", %{"player" => ^player}
    refute_push "inventory_state", _
    leave(socket)
  end

  test "duplicate connect stickiness: one session row, old transport close does not evict" do
    {:ok, %{token: token}} = Auth.issue("guest_stick1", nil)
    {:ok, socket_a} = connect(AfterlightWeb.UserSocket, %{"token" => token})
    {:ok, _, socket_a} = subscribe_and_join(socket_a, AfterlightWeb.GameChannel, "game:v1")
    Process.unlink(socket_a.channel_pid)

    {:ok, socket_b} = connect(AfterlightWeb.UserSocket, %{"token" => token})
    {:ok, _, socket_b} = subscribe_and_join(socket_b, AfterlightWeb.GameChannel, "game:v1")
    Process.unlink(socket_b.channel_pid)

    sessions =
      Afterlight.Accounts.GuestSession
      |> Ash.Query.filter(player_id == "guest_stick1")
      |> Ash.read!(authorize?: false)

    assert length(sessions) == 1
    leave(socket_a)
    Process.sleep(30)

    still =
      Afterlight.Accounts.GuestSession
      |> Ash.Query.filter(player_id == "guest_stick1")
      |> Ash.read!(authorize?: false)

    assert length(still) == 1
    refute still |> hd() |> Map.get(:revoked_at)
    leave(socket_b)
  end
end
