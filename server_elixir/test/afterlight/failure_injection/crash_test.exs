defmodule Afterlight.FailureInjection.CrashTest do
  @moduledoc """
  P10 §5.1 — room-owner and gateway crash invariants.
  """
  use Afterlight.DataCase, async: false

  import Phoenix.ChannelTest

  alias Afterlight.World
  alias Afterlight.World.RoomServer

  @endpoint AfterlightWeb.Endpoint
  @moduletag :failure_injection

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

  test "room-owner crash: room restarts empty, no ghost membership, rejoin restores" do
    wire = "fi-crash-#{System.unique_integer([:positive])}"
    on_exit(fn -> stop_room!(wire) end)

    guest = "guest_fi_crash"
    rec = WorldTestHelper.recorder!(self(), :a)

    assert {:ok, room_pid, _roster} = World.join(wire, guest, :ca, rec, "A")
    assert World.member?(wire, guest, :ca)

    Process.exit(room_pid, :kill)

    wait_until(fn ->
      case Registry.lookup(Afterlight.World.Registry, {RoomServer, wire}) do
        [{pid, _}] -> pid != room_pid
        [] -> false
      end
    end)

    refute World.member?(wire, guest, :ca)

    rec2 = WorldTestHelper.recorder!(self(), :a2)
    assert {:ok, _pid, %{"players" => []}} = World.join(wire, guest, :ca2, rec2, "A")
    assert World.member?(wire, guest, :ca2)
  end

  test "gateway crash: duplicate connect supersedes stale transport, one roster entry" do
    GatewayTest.ConfigLock.with_lock(:routing, @world_routing, fn ->
      guest = "guest_fi_gw#{System.unique_integer([:positive])}"

      first = connect_guest(guest)
      push(first, "hello", %{"guestId" => guest, "nickname" => "Wren"})
      assert_receive {:fake_upstream_started, _up1, _}, 1_000
      push(first, "join_room", %{"roomId" => "market"})
      assert_push("presence_update", %{"players" => []})

      second = connect_guest(guest)
      push(second, "hello", %{"guestId" => guest, "nickname" => "Wren"})
      assert_receive {:fake_upstream_started, _up2, _}, 1_000
      assert_push("error", %{"message" => "superseded"})

      push(second, "join_room", %{"roomId" => "market"})
      assert_push("presence_update", %{"players" => _players})

      assert Afterlight.World.member?("market", guest, second.assigns.conn_ref)
      loser_ref = Process.monitor(first.channel_pid)
      assert_receive {:DOWN, ^loser_ref, :process, _pid, _reason}, 1_000
      refute Process.alive?(first.channel_pid)
    end)
  end

  defp connect_guest(guest_id) do
    {:ok, %{token: token}} = Afterlight.Gateway.Auth.issue(guest_id, nil)
    {:ok, socket} = connect(AfterlightWeb.UserSocket, %{"token" => token})
    {:ok, _reply, socket} = subscribe_and_join(socket, AfterlightWeb.GameChannel, "game:v1")
    Process.unlink(socket.channel_pid)
    socket
  end

  defp stop_room!(wire) do
    case Registry.lookup(Afterlight.World.Registry, {RoomServer, wire}) do
      [{pid, _}] -> if Process.alive?(pid), do: GenServer.stop(pid, :normal, 5_000)
      [] -> :ok
    end
  end

  defp wait_until(fun, attempts \\ 50) do
    if fun.() or attempts <= 0 do
      :ok
    else
      Process.sleep(20)
      wait_until(fun, attempts - 1)
    end
  end
end
