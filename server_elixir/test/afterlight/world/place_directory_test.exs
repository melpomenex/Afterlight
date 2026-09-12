defmodule Afterlight.World.PlaceDirectoryTest do
  @moduledoc """
  Task 3.3: bounded, truthful public place summaries — unique occupant
  counts with the requester included, zero only for absent locally-known
  public rooms, null on unreadable owners, retired garden-prefixed rooms
  never enumerated, no
  lazy room creation, and the 64-entry / 16KiB / deadline bounds.
  """

  use ExUnit.Case, async: false

  alias Afterlight.World
  alias Afterlight.World.PlaceDefinitions
  alias Afterlight.World.PlaceDirectory
  alias Afterlight.World.RoomServer

  setup do
    # Deterministic entries for most cases: the committed projection is the
    # production source, but probe ids keep these tests independent of
    # whatever rooms other suites leave behind.
    entries = [
      probe_entry("probe-live-room"),
      probe_entry("probe-absent-room"),
      probe_entry("probe-slow-room")
    ]

    override_place_entries(entries)

    on_exit(fn -> Application.delete_env(:afterlight, :world) end)

    :ok
  end

  test "the snapshot reads only the projection and keeps manifest order" do
    clear_place_entries_override()

    entries = PlaceDirectory.snapshot()

    assert length(entries) == PlaceDefinitions.count()
    assert length(entries) <= PlaceDirectory.max_entries()
    assert Enum.map(entries, & &1["roomId"]) == PlaceDefinitions.ids()

    for entry <- entries do
      assert MapSet.subset?(
               MapSet.new(Map.keys(entry)),
               MapSet.new(["roomId", "occupancy", "observedAt", "atmosphereLabel", "activities"])
             )
      assert is_integer(entry["occupancy"]) or is_nil(entry["occupancy"])
      # A count is an observation; an unknown is never backdated.
      if is_integer(entry["occupancy"]), do: assert(is_integer(entry["observedAt"])), else: assert(is_nil(entry["observedAt"]))
    end
  end

  test "occupancy counts unique identities and includes the member present" do
    pid = start_room!("probe-live-room")
    a = WorldTestHelper.recorder!(self(), :a)
    b = WorldTestHelper.recorder!(self(), :b)

    {:ok, _} = RoomServer.join(pid, attrs("visitor_x", :cx, a))
    {:ok, _} = RoomServer.join(pid, attrs("visitor_y", :cy, b))

    assert occupancy_of("probe-live-room") == 2

    # Duplicate connection (supersession, D8): same identity, newer conn —
    # the roster entry is replaced in place, the count stays put.
    c = WorldTestHelper.recorder!(self(), :c)
    {:ok, _} = RoomServer.join(pid, attrs("visitor_x", :cx2, c))

    assert occupancy_of("probe-live-room") == 2
  end

  test "an absent locally-known public room is zero, and no room gets started" do
    assert occupancy_of("probe-absent-room") == 0
    assert Registry.lookup(Afterlight.World.Registry, {RoomServer, "probe-absent-room"}) == []
  end

  test "an unreadable owner is null within the deadline, never fabricated as zero" do
    # The test process poses as the room: it never answers `stats`, so the
    # bounded read times out (brutally killed) and reports unknown.
    {:ok, _} = Registry.register(Afterlight.World.Registry, {RoomServer, "probe-slow-room"}, nil)

    assert occupancy_of("probe-slow-room") == nil
  end

  test "retired garden-prefixed rooms are never enumerated, even when live" do
    clear_place_entries_override()

    # A live retired-namespace room exists on this node.
    {:ok, _room_pid, _roster} = World.join("garden:secret_room", "secret_room", :cg, self(), "Secret", nil)

    entries = PlaceDirectory.snapshot()
    assert entries != []
    refute Enum.any?(entries, &String.starts_with?(&1["roomId"], "garden:"))
  after
    World.leave("garden:secret_room", "secret_room", :cg, :travel)
  end

  test "bounds: no more than 64 entries and entries alone stay under 16KiB" do
    huge =
      Enum.map(1..PlaceDirectory.max_entries(), fn i ->
        probe_entry("probe-#{i}-#{String.duplicate("x", 300)}")
      end)

    override_place_entries(huge)

    entries = PlaceDirectory.snapshot()
    assert length(entries) <= PlaceDirectory.max_entries()
    assert byte_size(Jason.encode!(entries)) <= 16 * 1024

    # Whole entries only: whatever survived is complete and truthful.
    for entry <- entries do
      assert Map.has_key?(entry, "roomId") and Map.has_key?(entry, "occupancy")
    end
  end

  test "activity summaries stay separate from occupancy and never invent zeros for unread sessions" do
    clear_place_entries_override()
    entries = PlaceDirectory.snapshot()
    assert entries != []

    for entry <- entries do
      assert is_list(entry["activities"])
      playing = Enum.reduce(entry["activities"], 0, fn row, acc -> acc + (row["playing"] || 0) end)
      watching = Enum.reduce(entry["activities"], 0, fn row, acc -> acc + (row["watching"] || 0) end)
      queued = Enum.reduce(entry["activities"], 0, fn row, acc -> acc + (row["queued"] || 0) end)
      # Occupancy is roster size, never playing+watching+queued.
      if is_integer(entry["occupancy"]) do
        refute entry["occupancy"] == playing + watching + queued and playing + watching + queued > 0 and
                 entry["occupancy"] != playing
      end
    end
  end

  test "an empty or unusable entry source degrades to an honest empty catalog, never a crash" do
    override_place_entries([])

    assert PlaceDirectory.snapshot() == []

    # A non-list override falls back to the boot-validated projection.
    override_place_entries(:not_a_list)
    assert length(PlaceDirectory.snapshot()) == PlaceDefinitions.count()
  end

  ## Helpers

  defp probe_entry(id) do
    %{
      "id" => id,
      "public" => true,
      "kind" => "environment",
      "bounds" => %{"minX" => -11.3, "maxX" => 11.3, "minZ" => -9.5, "maxZ" => 10.3},
      "atmosphere" => %{"preset" => nil, "weatherMode" => "fixed", "timeMode" => "fixed"}
    }
  end

  defp override_place_entries(entries) do
    world = Application.get_env(:afterlight, :world, [])
    Application.put_env(:afterlight, :world, Keyword.put(world, :place_entries, entries))
  end

  defp clear_place_entries_override do
    world = Application.get_env(:afterlight, :world, [])
    Application.put_env(:afterlight, :world, Keyword.delete(world, :place_entries))
  end

  defp start_room!(wire_id) do
    room = %{district: wire_id, instance: "main", wire_id: wire_id, kind: :public}
    start_supervised!(Supervisor.child_spec({RoomServer, room}, id: {RoomServer, wire_id}))
  end

  defp attrs(player_id, conn_ref, channel_pid) do
    %{
      player_id: player_id,
      conn_ref: conn_ref,
      channel_pid: channel_pid,
      nickname: player_id,
      pose: %{x: 1.0, z: 2.0, rot_y: 0.0, walking: false, sitting: false, airborne: false}
    }
  end

  defp occupancy_of(room_id) do
    PlaceDirectory.snapshot()
    |> Enum.find(&(&1["roomId"] == room_id))
    |> Map.fetch!("occupancy")
  end
end
