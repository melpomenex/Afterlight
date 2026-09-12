defmodule Afterlight.World.RoomsTest do
  @moduledoc """
  Task 1.2: wire id ↔ internal identity mapping; task 6.1: the
  `leave_all/2` channel-down sweep over the live room registry.
  """

  # async: false — the sweep test starts real room processes against the
  # shared world Registry and must not overlap other world test modules.
  use ExUnit.Case, async: false

  alias Afterlight.World.RoomServer
  alias Afterlight.World.Rooms

  test "public rooms map identity-to-id with instance main" do
    for id <- ["market", "theater", "foundry", "trestle", "frost-spire"] do
      assert {:ok, %{district: ^id, instance: "main", wire_id: ^id, kind: :public}} = Rooms.resolve(id)
      assert {:ok, {^id, "main"}} = Rooms.key(id)
      assert {:ok, ^id} = Rooms.to_wire({id, "main"})
    end
  end

  test "district rooms are open — every game district id is a valid public room" do
    # The client joins a room per district id (src/districts.js); Node
    # accepts any non-empty string (protocol-catalog §2). The runtime must
    # not regress travel to the 16-district world (the Glass Garden retired).
    for id <- ~w(court canal station aqueduct caldera understory saltworks rooftops mangrove trestle foundry frost-spire delta archives kiln-terrace theater) do
      assert {:ok, %{district: ^id, instance: "main", kind: :public}} = Rooms.resolve(id)
    end
  end

  test "retired garden-prefixed ids resolve as open public room strings" do
    # Node accepts any non-empty room string; the personal-garden adapter is
    # gone, so this is just a (featureless) public room id now.
    assert {:ok, %{district: "garden:guest_abc", instance: "main", kind: :public}} =
             Rooms.resolve("garden:guest_abc")

    assert {:ok, {"garden:guest_abc", "main"}} = Rooms.key("garden:guest_abc")
    assert {:ok, "garden:guest_abc"} = Rooms.to_wire({"garden:guest_abc", "main"})
  end

  test "falsy room ids fall back to market (Node `msg.roomId || 'market'`)" do
    for falsy <- [nil, "", false] do
      assert {:ok, %{district: "market", instance: "main", wire_id: "market"}} = Rooms.resolve(falsy)
    end
  end

  test "non-string truthy ids are refused, not invented" do
    assert :error = Rooms.resolve(123)
    assert :error = Rooms.resolve(%{})
  end

  test "round trip is stable for every id kind" do
    for id <- ["market", "theater", "kiln-terrace", "garden:guest_x"] do
      {:ok, room} = Rooms.resolve(id)
      assert Rooms.key(room) == Rooms.key(id)
      assert {:ok, ^id} = Rooms.to_wire(elem(Rooms.key(id), 1))
    end
  end

  test "to_wire rejects unknown keys; resolve! raises on non-string ids" do
    assert :error = Rooms.to_wire({"nope", "two"})
    assert :error = Rooms.to_wire({"market", "other"})
    assert_raise ArgumentError, fn -> Rooms.resolve!(123) end
    assert Rooms.resolve!("market").wire_id == "market"
  end

  describe "leave_all/2 channel-down sweep" do
    test "one sweep drops a member from every room that held it and only those" do
      tap = WorldTestHelper.tap_telemetry!(self())
      on_exit(fn -> WorldTestHelper.detach_telemetry(tap) end)

      pose = %{x: 0.0, z: 0.0, rot_y: 0.0, walking: false, sitting: false, airborne: false}

      start_room = fn room ->
        start_supervised!(Supervisor.child_spec({RoomServer, room}, id: room.wire_id))
      end

      join = fn pid, channel_pid, player_id, conn ->
        assert {:ok, _roster} =
                 RoomServer.join(pid, %{
                   player_id: player_id,
                   conn_ref: conn,
                   channel_pid: channel_pid,
                   nickname: player_id,
                   pose: pose
                 })
      end

      room_a = Rooms.resolve!("sweep-a-#{System.unique_integer([:positive])}")
      room_b = Rooms.resolve!("sweep-b-#{System.unique_integer([:positive])}")
      room_c = Rooms.resolve!("sweep-c-#{System.unique_integer([:positive])}")
      wire_a = room_a.wire_id
      wire_b = room_b.wire_id

      # Two rooms share the channel process under sweep; a third does not
      # hold it (and any other live rooms in the registry must no-op too).
      shared = WorldTestHelper.recorder!(self(), :shared)
      obs_a = WorldTestHelper.recorder!(self(), :obs_a)
      obs_b = WorldTestHelper.recorder!(self(), :obs_b)
      obs_c = WorldTestHelper.recorder!(self(), :obs_c)

      pid_a = start_room.(room_a)
      pid_b = start_room.(room_b)
      pid_c = start_room.(room_c)

      join.(pid_a, shared, "guest_x", :cx)
      join.(pid_a, obs_a, "guest_oa", :coa)
      join.(pid_b, shared, "guest_x", :cx)
      join.(pid_b, obs_b, "guest_ob", :cob)
      join.(pid_c, obs_c, "guest_oc", :coc)

      # Drain the join-time frames so the sweep's effect is isolated.
      Enum.each([:shared, :obs_a, :obs_b, :obs_c], &drain_frames/1)

      # One call fans out to every live room (task 6.1).
      assert Rooms.leave_all(shared) == :ok

      # Each room that held the member emitted exactly one presence_leave
      # to its remaining members.
      assert_receive {:recorded, :obs_a, %{"type" => "presence_leave", "playerId" => "guest_x"}}
      assert_receive {:recorded, :obs_b, %{"type" => "presence_leave", "playerId" => "guest_x"}}
      refute_receive {:recorded, :obs_a, _}, 200
      refute_receive {:recorded, :obs_b, _}, 200

      # ...rooms that did not hold it emitted nothing, and the departing
      # channel does not observe its own leave.
      refute_receive {:recorded, :obs_c, _}, 200
      refute_receive {:recorded, :shared, %{"type" => "presence_leave"}}, 200

      refute RoomServer.member?(pid_a, "guest_x", :cx)
      refute RoomServer.member?(pid_b, "guest_x", :cx)
      assert RoomServer.member?(pid_a, "guest_oa", :coa)
      assert RoomServer.member?(pid_c, "guest_oc", :coc)

      # Idempotent: a second sweep of the same dead channel is silent.
      assert Rooms.leave_all(shared) == :ok
      refute_receive {:recorded, :obs_a, _}, 200
      refute_receive {:recorded, :obs_b, _}, 200

      # Telemetry says which rooms swept and why (design D10): exactly one
      # leave event per room that held the member.
      assert_receive {:telemetry, [:afterlight, :room, :leave], %{}, %{room: ^wire_a, player: "guest_x", reason: :disconnect}}
      assert_receive {:telemetry, [:afterlight, :room, :leave], %{}, %{room: ^wire_b, player: "guest_x", reason: :disconnect}}
      refute_receive {:telemetry, [:afterlight, :room, :leave], %{}, %{player: "guest_x"}}, 200
    end
  end

  defp drain_frames(id) do
    receive do
      {:recorded, ^id, _} -> drain_frames(id)
    after
      0 -> :ok
    end
  end
end
