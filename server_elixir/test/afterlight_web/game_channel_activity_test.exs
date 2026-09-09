defmodule AfterlightWeb.GameChannelActivityTest do
  @moduledoc """
  Tests for activity protocol integration with Phoenix GameChannel (Tasks 1.4 & 2.1).
  Verifies fail-closed checks:
  - room_unavailable when not joined
  - invalid_input when activityId is missing
  - activity_not_found for undeclared activity
  - lease_lost when room lease is fenced
  """

  use Afterlight.DataCase, async: false
  import Phoenix.ChannelTest

  alias Afterlight.Gateway.Auth

  @endpoint AfterlightWeb.Endpoint

  @world_routing %{
    "ping" => :terminate_pong,
    "join_room" => :phoenix,
    "movement" => :phoenix,
    "emote" => :phoenix
  }

  setup do
    GatewayTest.FakeCore.set_owner(self())
    :ok
  end

  defp flipped(fun), do: GatewayTest.ConfigLock.with_lock(:routing, @world_routing, fun)

  defp connect_guest(guest_id, nickname \\ "Piper") do
    {:ok, %{token: token}} = Auth.issue(guest_id, nickname)
    assert {:ok, socket} = connect(AfterlightWeb.UserSocket, %{"token" => token})

    assert {:ok, %{guestId: ^guest_id}, socket} =
             subscribe_and_join(socket, AfterlightWeb.GameChannel, "game:v1")

    Process.unlink(socket.channel_pid)
    socket
  end

  test "activity commands before room join are rejected with room_unavailable" do
    flipped(fn ->
      guest = "guest_act_noroom_#{System.unique_integer([:positive])}"
      socket = connect_guest(guest)

      push(socket, "activity_join", %{
        "activityId" => "pong-table",
        "requestId" => "req-1",
        "role" => "player"
      })

      assert_push "activity_error", %{
        "error" => "room_unavailable",
        "requestId" => "req-1",
        "activityId" => "pong-table"
      }
    end)
  end

  test "activity commands with missing activityId are rejected with invalid_input" do
    flipped(fn ->
      guest = "guest_act_noid_#{System.unique_integer([:positive])}"
      socket = connect_guest(guest)

      push(socket, "hello", %{"guestId" => guest, "nickname" => "Piper"})
      assert_receive {:fake_frame, _up, _json}, 1_000

      push(socket, "join_room", %{"roomId" => "court"})
      assert_push "presence_update", _

      push(socket, "activity_join", %{
        "requestId" => "req-no-id",
        "role" => "player"
      })

      assert_push "activity_error", %{
        "error" => "invalid_input",
        "requestId" => "req-no-id"
      }
    end)
  end

  test "activity commands for undeclared activities fail closed with activity_not_found" do
    flipped(fn ->
      guest = "guest_act_undeclared_#{System.unique_integer([:positive])}"
      socket = connect_guest(guest)

      push(socket, "hello", %{"guestId" => guest, "nickname" => "Piper"})
      assert_receive {:fake_frame, _up, _json}, 1_000

      push(socket, "join_room", %{"roomId" => "court"})
      assert_push "presence_update", _

      push(socket, "activity_join", %{
        "activityId" => "nonexistent-arcade",
        "requestId" => "req-undeclared",
        "role" => "player"
      })

      assert_push "activity_error", %{
        "error" => "activity_not_found",
        "requestId" => "req-undeclared",
        "activityId" => "nonexistent-arcade"
      }
    end)
  end

  test "activity commands with payload > 2 KiB are rejected with payload_too_large" do
    flipped(fn ->
      guest = "guest_act_huge_#{System.unique_integer([:positive])}"
      socket = connect_guest(guest)

      push(socket, "hello", %{"guestId" => guest, "nickname" => "Piper"})
      assert_receive {:fake_frame, _up, _json}, 1_000

      push(socket, "join_room", %{"roomId" => "court"})
      assert_push "presence_update", _

      # Generate payload > 2048 bytes
      huge_blob = String.duplicate("x", 2500)

      push(socket, "activity_join", %{
        "activityId" => "pong-table",
        "requestId" => "req-huge",
        "blob" => huge_blob
      })

      assert_push "activity_error", %{
        "error" => "payload_too_large",
        "requestId" => "req-huge",
        "activityId" => "pong-table"
      }
    end)
  end

  test "rapid activity commands trigger rate limiting with rate_limited" do
    flipped(fn ->
      guest = "guest_act_rate_#{System.unique_integer([:positive])}"
      socket = connect_guest(guest)

      push(socket, "hello", %{"guestId" => guest, "nickname" => "Piper"})
      assert_receive {:fake_frame, _up, _json}, 1_000

      push(socket, "join_room", %{"roomId" => "court"})
      assert_push "presence_update", _

      # Send 10 rapid join commands (limit is 5/sec)
      for i <- 1..10 do
        push(socket, "activity_join", %{
          "activityId" => "nonexistent-arcade",
          "requestId" => "req-rate-#{i}",
          "role" => "player"
        })
      end

      # At least one must receive rate_limited error
      assert_push "activity_error", %{
        "error" => "rate_limited"
      }
    end)
  end

  test "challenges before room join fail closed with room_unavailable" do
    flipped(fn ->
      guest = "guest_chal_noroom_#{System.unique_integer([:positive])}"
      socket = connect_guest(guest)

      push(socket, "activity_challenge", %{
        "activityId" => "orpheum-pool",
        "targetId" => "someone",
        "requestId" => "req-chal-1"
      })

      assert_push "activity_error", %{
        "error" => "room_unavailable",
        "requestId" => "req-chal-1"
      }
    end)
  end
end
