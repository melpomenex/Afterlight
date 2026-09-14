defmodule AfterlightWeb.GameChannelAvailabilityTest do
  @moduledoc """
  Arcade availability handshake and per-game closed-door naming
  (arcade availability fix).

  Joining a world room pushes one additive `activity_availability`
  snapshot listing the admission-gated games this server has closed, so
  clients present those cabinets as coming soon. A join against a closed
  game is still rejected server-side — naming the actual game, never a
  hardcoded one (a closed Downhill Mayhem cabinet used to report itself
  as Summit Run).
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

  defp join_theater(socket) do
    push(socket, "join_room", %{"roomId" => "theater"})
    assert_push("presence_update", %{})
  end

  test "world join pushes one availability snapshot naming the closed games", ctx do
    Application.put_env(:afterlight, :snowboard_enabled, true)
    Application.put_env(:afterlight, :downhill_mayhem_enabled, false)

    flipped(fn ->
      guest = "guest_avail_#{ctx.test}_#{System.unique_integer([:positive])}"
      socket = connect_guest(guest)
      join_theater(socket)

      assert_push("activity_availability", %{"roomId" => "theater", "closed" => closed})

      assert [%{"id" => "orpheum-downhill-mayhem", "type" => "downhill-mayhem", "title" => "Downhill Mayhem"}] =
               closed

      # Exactly one snapshot per join.
      assert_no_push("activity_availability", 200)
    end)
  after
    Application.put_env(:afterlight, :snowboard_enabled, false)
    Application.put_env(:afterlight, :downhill_mayhem_enabled, false)
  end

  test "closed snapshot is empty when every gated game is open", ctx do
    Application.put_env(:afterlight, :snowboard_enabled, true)
    Application.put_env(:afterlight, :downhill_mayhem_enabled, true)

    flipped(fn ->
      guest = "guest_avail_open_#{ctx.test}_#{System.unique_integer([:positive])}"
      socket = connect_guest(guest)
      join_theater(socket)

      assert_push("activity_availability", %{"roomId" => "theater", "closed" => []})
    end)
  after
    Application.put_env(:afterlight, :snowboard_enabled, false)
    Application.put_env(:afterlight, :downhill_mayhem_enabled, false)
  end

  test "joining a closed game is rejected naming THAT game, not another", ctx do
    Application.put_env(:afterlight, :snowboard_enabled, true)
    Application.put_env(:afterlight, :downhill_mayhem_enabled, false)

    flipped(fn ->
      guest = "guest_avail_join_#{ctx.test}_#{System.unique_integer([:positive])}"
      socket = connect_guest(guest)
      join_theater(socket)

      # Stand at the Downhill Mayhem cabinet before pressing play.
      push(socket, "movement", %{"x" => 9.3, "z" => -3.85, "rotY" => -1.57, "walking" => false, "sitting" => false})
      Process.sleep(150)

      push(socket, "activity_join", %{
        "activityId" => "orpheum-downhill-mayhem",
        "role" => "play",
        "requestId" => "req-downhill-1"
      })

      assert_push("activity_error", %{
        "error" => "race_unavailable",
        "message" => "Downhill Mayhem isn't open on this server",
        "activityId" => "orpheum-downhill-mayhem"
      })
    end)
  after
    Application.put_env(:afterlight, :snowboard_enabled, false)
    Application.put_env(:afterlight, :downhill_mayhem_enabled, false)
  end

  defp assert_no_push(event, timeout) do
    receive do
      %Phoenix.Socket.Message{event: ^event, payload: payload} ->
        flunk("unexpected push #{inspect(event)}: #{inspect(payload)}")
    after
      timeout -> :ok
    end
  end
end
