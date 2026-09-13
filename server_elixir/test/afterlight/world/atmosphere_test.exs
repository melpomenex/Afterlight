defmodule Afterlight.World.AtmospherePureTest do
  @moduledoc """
  Task 2.1 pure-owner tests: the semantic atmosphere held by the RoomServer.
  Cross-language fixtures (`tests/fixtures/atmosphere/model-vectors.json`)
  pin the shared LCG; emitted frames are checked against the exact envelope
  rules from `shared/atmosphereModel.js` (epoch = held lease epoch,
  atmosphere-only revision, `epoch:revision:slot` event ids, ≥5 s lead,
  design-bounded spacing, ≤4 events, ≤8 KiB).
  """

  use ExUnit.Case, async: false

  alias Afterlight.World.Atmosphere

  @vectors Path.expand("../../../../tests/fixtures/atmosphere/model-vectors.json", __DIR__)
           |> File.read!()
           |> Jason.decode!()

  setup do
    # Deterministic seeds and a probe projection entry for the pure tests
    # (the same override seam the place directory uses). Global config:
    # restored inline.
    world = Application.get_env(:afterlight, :world, [])

    Application.put_env(:afterlight, :world,
      world
      |> Keyword.put(:atmosphere_seed, 123)
      |> Keyword.put(:place_entries, [atmosphere_entry("probe-rain", "rain"), atmosphere_entry("probe-storm", "storm")])
    )

    on_exit(fn -> Application.put_env(:afterlight, :world, world) end)

    %{now: System.system_time(:millisecond)}
  end

  defp atmosphere_entry(id, preset) do
    %{
      "id" => id,
      "public" => true,
      "kind" => "environment",
      "bounds" => %{"minX" => -11.3, "maxX" => 11.3, "minZ" => -9.5, "maxZ" => 10.3},
      "atmosphere" => %{"preset" => preset, "weatherMode" => "fixed", "timeMode" => "fixed"}
    }
  end

  test "the shared LCG reproduces the fixture draws for zero and non-zero seeds" do
    for %{"seed" => seed, "draws" => draws} <- [@vectors["lcg"]["seedZero"], @vectors["lcg"]["seed123"]] do
      draws =
        Enum.map(1..length(draws), fn _ -> nil end)
        |> Enum.scan(seed, fn _next, state -> Atmosphere.lcg_next(state) end)

      assert draws == @vectors["lcg"]["seed#{if seed == 0, do: "Zero", else: "123"}"]["draws"]
    end
  end

  test "configuration resolves only supported projected rooms (fail closed)" do
    assert %{"id" => "rain"} = Atmosphere.config_for("probe-rain")
    assert %{"id" => "storm"} = Atmosphere.config_for("probe-storm")

    # No entry / no preset / unknown preset / unsupported clock: all unavailable.
    assert Atmosphere.config_for("probe-unknown") == nil
    assert Atmosphere.config_for("garden:someone") == nil

    entry = atmosphere_entry("probe-unknown-preset", "hyper-storm-proto")
    Application.put_env(:afterlight, :world, Keyword.put(world_cfg(), :place_entries, [entry]))
    assert Atmosphere.config_for("probe-unknown-preset") == nil

    accelerated = put_in(atmosphere_entry("probe-accel", "rain"), ["atmosphere", "timeMode"], "accelerated")
    Application.put_env(:afterlight, :world, Keyword.put(world_cfg(), :place_entries, [accelerated]))
    assert Atmosphere.config_for("probe-accel") == nil, "reserved clocks fail closed until the projection can express them"
  end

  test "the adoptable-preset allow-list comes from the projection and is empty for fixed rooms" do
    entry =
      put_in(atmosphere_entry("probe-env", "env-coastal-sunset"), ["atmosphere", "presets"], [
        "env-coastal-sunset",
        "env-alpine-aurora",
        42
      ])

    Application.put_env(
      :afterlight,
      :world,
      Keyword.put(world_cfg(), :place_entries, [entry, atmosphere_entry("probe-rain", "rain")])
    )

    assert Atmosphere.allowed_presets_for("probe-env") == ["env-coastal-sunset", "env-alpine-aurora"]
    assert Atmosphere.allowed_presets_for("probe-rain") == []
    assert Atmosphere.allowed_presets_for("probe-unknown") == []
    assert Atmosphere.allowed_presets_for(nil) == []
  end

  test "set_preset adopts an allowed preset as a full replacement and refuses everything else" do
    entry =
      put_in(atmosphere_entry("probe-env", "env-coastal-sunset"), ["atmosphere", "presets"], [
        "env-coastal-sunset",
        "env-coastal-storm"
      ])

    Application.put_env(:afterlight, :world, Keyword.put(world_cfg(), :place_entries, [entry]))
    now = System.system_time(:millisecond)
    atmosphere = Atmosphere.init("probe-env")

    # Un-owned rooms never adopt; ids outside the allow-list are refused even
    # when they are valid committed presets.
    assert Atmosphere.set_preset(atmosphere, "env-coastal-storm", 0, now) == {:error, :unavailable}
    assert Atmosphere.set_preset(atmosphere, "env-alpine-aurora", 7, now) == {:error, :preset_not_allowed}
    assert Atmosphere.set_preset(atmosphere, "not-a-preset", 7, now) == {:error, :preset_not_allowed}
    assert Atmosphere.set_preset(atmosphere, nil, 7, now) == {:error, :preset_not_allowed}

    assert {:ok, next, frame} = Atmosphere.set_preset(atmosphere, "env-coastal-storm", 7, now)
    assert frame["epoch"] == 7
    assert frame["revision"] == 2, "a set is one revision over the adopted window"
    assert frame["state"]["preset"] == "env-coastal-storm"
    assert frame["state"]["mode"] == "fixed"
    assert frame["state"]["intensity"] == 1.0
    assert frame["state"]["startedAt"] == now
    assert frame["state"]["events"] != [], "the new policy rebuilds its event window"
    assert Enum.all?(frame["state"]["events"], &String.starts_with?(&1["id"], "7:2:"))
    assert_envelope_valid(frame, now)

    assert {:ok, _next2, frame2} = Atmosphere.set_preset(next, "env-coastal-sunset", 7, now)
    assert frame2["revision"] == 3, "revision stays monotonic within the epoch"
    assert frame2["state"]["preset"] == "env-coastal-sunset"
  end

  test "an un-owned room (epoch 0) never presents atmosphere state" do
    atmosphere = Atmosphere.init("probe-rain")
    assert Atmosphere.snapshot(atmosphere, 0, System.system_time(:millisecond)) == :unavailable

    {ticked, frame} = Atmosphere.tick(atmosphere, 0, true, System.system_time(:millisecond))
    assert frame == nil
    assert ticked.epoch == nil
  end

  test "the owned snapshot carries the full envelope: held epoch, atmosphere revision, semantic state" do
    now = System.system_time(:millisecond)
    atmosphere = Atmosphere.init("probe-rain")

    assert {:ok, frame} = Atmosphere.snapshot(atmosphere, 7, now)

    assert %{
             "type" => "atmosphere_state",
             "roomId" => "probe-rain",
             "schemaVersion" => 1,
             "epoch" => 7,
             "revision" => 1,
             "serverNow" => ^now,
             "state" => state
           } = frame

    assert %{
             "seed" => 123,
             "mode" => "fixed",
             "preset" => "rain",
             "intensity" => 0.6,
             "wind" => [0.2, 0.05],
             "transition" => nil,
             "time" => %{"mode" => "fixed", "phase" => 0, "anchorAt" => ^now, "rate" => 0}
           } = state

    assert state["startedAt"] == now
    assert_envelope_valid(frame, now)
  end

  test "the event window: stable epoch:revision:slot ids, ≥5s lead, design-bounded spacing" do
    now = System.system_time(:millisecond)

    {:ok, rain} = Atmosphere.snapshot(Atmosphere.init("probe-rain"), 7, now)
    events = rain["state"]["events"]
    assert length(events) == 2, "rain schedules lightning up to the per-kind cap"
    assert Enum.all?(events, &(&1["kind"] == "lightning"))
    assert Enum.map(events, & &1["id"]) == ["7:1:0", "7:1:1"]

    [first, second] = events
    for event <- events do
      assert event["at"] >= now + 5_000, "every shared event leads by at least 5s"
      assert event["durationMs"] == 800, "lightning is one smooth 800ms pulse"
      assert event["intensity"] >= 0 and event["intensity"] <= 1
      assert length(event["origin"]) == 3 and Enum.all?(event["origin"], &is_float(&1))
    end

    spacing = second["at"] - first["at"]
    assert spacing >= 45_000 and spacing <= 90_000, "lightning spacing stays inside the design bounds"

    {:ok, storm} = Atmosphere.snapshot(Atmosphere.init("probe-storm"), 9, now)
    storm_events = storm["state"]["events"]
    assert length(storm_events) == 4, "storm fills the four-event budget from its two kinds"

    by_kind = Enum.group_by(storm_events, & &1["kind"])
    [lightning_a, lightning_b] = Enum.map(by_kind["lightning"], & &1["at"])
    assert lightning_b - lightning_a in 45_000..90_000, "lightning spacing stays inside the design bounds"

    [meteor_a, meteor_b] = Enum.map(by_kind["meteor"], & &1["at"])
    assert meteor_b - meteor_a in 35_000..70_000, "meteor spacing stays inside the design bounds"
    assert Enum.all?(by_kind["meteor"], &(&1["durationMs"] == 1_200)), "a meteor lasts 1200ms with no flash"
    assert Enum.map(storm_events, & &1["at"]) == Enum.sort(Enum.map(storm_events, & &1["at"]))

    assert_envelope_valid(storm, now)
  end

  test "duplicate snapshots keep revision and event ids stable; a new epoch fully regenerates" do
    now = System.system_time(:millisecond)
    atmosphere = Atmosphere.init("probe-rain")

    {:ok, first} = Atmosphere.snapshot(atmosphere, 7, now)
    {:ok, again} = Atmosphere.snapshot(atmosphere, 7, now + 500)
    assert again["revision"] == first["revision"]
    assert Enum.map(again["state"]["events"], & &1["id"]) == Enum.map(first["state"]["events"], & &1["id"])
    assert again["serverNow"] > first["serverNow"], "duplicates still refresh the bounded clock anchor"

    {:ok, successor} = Atmosphere.snapshot(atmosphere, 8, now + 1_000)
    assert successor["epoch"] == 8
    assert successor["revision"] == 1, "a new ownership epoch restarts the atmosphere revision"
    assert Enum.all?(successor["state"]["events"], &String.starts_with?(&1["id"], "8:1:"))
    assert successor["state"]["events"] != first["state"]["events"]
  end

  test "the tick emits for owned occupied rooms, then stays quiet until semantics change or repair is due" do
    now = System.system_time(:millisecond)
    atmosphere = Atmosphere.init("probe-rain")

    # First tick adopts the epoch and emits (nothing emitted yet).
    {atmosphere, frame} = Atmosphere.tick(atmosphere, 5, true, now)
    assert %{"type" => "atmosphere_state", "epoch" => 5, "revision" => 1} = frame

    # Immediately after: no change, repair not due.
    {_atmosphere, frame} = Atmosphere.tick(atmosphere, 5, true, now + 100)
    assert frame == nil

    # Empty rooms stop scheduling entirely.
    {atmosphere, frame} = Atmosphere.tick(atmosphere, 5, false, now + 200)
    assert frame == nil

    # Repair cadence: the ≤30s while-occupied keep-alive.
    {atmosphere, frame} = Atmosphere.tick(atmosphere, 5, true, now + 31_000)
    assert %{"revision" => 1} = frame, "a repair refreshes the clock, never the semantics"

    # At most one replacement batch per policy interval: lightning's 45s
    # floor keeps the next resupply quiet until the window actually thins.
    {_atmosphere, frame} = Atmosphere.tick(atmosphere, 5, true, now + 31_100)
    assert frame == nil
  end

  test "an expired event window is replaced with fresh ids and a bumped revision" do
    now = System.system_time(:millisecond)
    {atmosphere, _frame} = Atmosphere.tick(Atmosphere.init("probe-rain"), 5, true, now)

    [first, second] = atmosphere.events
    assert atmosphere.revision == 1

    # Just past the first window's expiry (at + duration + 250ms tolerance):
    # the pending count drops below the cap, so a new window replaces it.
    later = first["at"] + first["durationMs"] + 250 + 1
    {atmosphere, frame} = Atmosphere.tick(atmosphere, 5, true, later)

    assert %{"revision" => 2} = frame, "an event-window replacement bumps the atmosphere revision"
    ids = Enum.map(atmosphere.events, & &1["id"])
    assert ids == [second["id"], "5:2:2"], "untouched windows keep their stable id; replacements get fresh ones"
    assert hd(Enum.drop(atmosphere.events, 1))["at"] >= later + 5_000, "replacements still lead by ≥5s"
  end

  test "frames stay within the wire bounds (≤8KiB, ≤4 events) even with a hostile room id" do
    long_wire = String.duplicate("r", 64)
    Application.put_env(:afterlight, :world, Keyword.put(world_cfg(), :place_entries, [atmosphere_entry(long_wire, "storm")]))

    {:ok, frame} = Atmosphere.snapshot(Atmosphere.init(long_wire), 3, System.system_time(:millisecond))
    assert_envelope_valid(frame, System.system_time(:millisecond))
    assert length(frame["state"]["events"]) <= 4
    assert byte_size(Jason.encode!(frame)) <= 8 * 1024
  end

  # Mirrors the shared/atmosphereModel.js envelope rules the client enforces;
  # the server-side frames must pass the same contract whole.
  defp assert_envelope_valid(frame, now) do
    assert is_binary(frame["roomId"]) and byte_size(frame["roomId"]) in 1..64
    assert is_integer(frame["epoch"]) and frame["epoch"] >= 0
    assert is_integer(frame["revision"]) and frame["revision"] >= 0
    assert is_integer(frame["serverNow"]) and frame["serverNow"] >= 0

    state = frame["state"]
    assert is_integer(state["seed"]) and state["seed"] >= 0 and state["seed"] <= 0xFFFFFFFF
    assert state["mode"] in ~w(fixed scheduled)
    assert is_binary(state["preset"])
    assert state["intensity"] >= 0 and state["intensity"] <= 1

    assert length(state["wind"]) == 2 and Enum.all?(state["wind"], &(&1 >= -1 and &1 <= 1))
    assert state["transition"] == nil or is_map(state["transition"])

    time = state["time"]
    assert time["mode"] in ~w(fixed accelerated)
    assert time["phase"] >= 0 and time["phase"] <= 1
    assert is_integer(time["anchorAt"]) and time["rate"] >= 0

    events = state["events"]
    assert length(events) <= 4

    for event <- events do
      assert event["at"] >= now
      assert is_binary(event["id"]) and byte_size(event["id"]) <= 64
      assert event["kind"] in ~w(lightning meteor)
      assert event["durationMs"] > 0 and event["durationMs"] <= 120_000
      assert event["intensity"] >= 0 and event["intensity"] <= 1
      assert length(event["origin"]) == 3
    end

    assert byte_size(Jason.encode!(frame)) <= 8 * 1024
  end

  defp world_cfg, do: Application.get_env(:afterlight, :world, [])
end

defmodule Afterlight.World.AtmosphereRoomTest do
  @moduledoc """
  Task 2.1 RoomServer integration: emission requires ownership and occupancy
  — an un-owned room (no lease handle) emits NOTHING and answers
  `:unavailable`, an owned occupied room snapshots after the roster, and a
  fenced owner stops emitting with the room (fail closed).
  """

  use Afterlight.DataCase, async: false

  alias Afterlight.World
  alias Afterlight.World.{RoomKey, RoomServer}

  setup do
    world = Application.get_env(:afterlight, :world, [])

    Application.put_env(:afterlight, :world, Keyword.put(world, :place_entries, [atmosphere_entry("probe-room-rain", "rain")]))

    on_exit(fn -> Application.put_env(:afterlight, :world, world) end)

    wire = "probe-room-rain-#{System.unique_integer([:positive])}"
    %{wire: wire, room: %{district: wire, instance: "main", wire_id: wire, kind: :public}}
  end

  defp atmosphere_entry(id, preset) do
    %{
      "id" => id,
      "public" => true,
      "kind" => "environment",
      "bounds" => %{"minX" => -11.3, "maxX" => 11.3, "minZ" => -9.5, "maxZ" => 10.3},
      "atmosphere" => %{"preset" => preset, "weatherMode" => "fixed", "timeMode" => "fixed"}
    }
  end

  defp pose(x \\ 0.0, z \\ 0.0) do
    %{x: x, z: z, rot_y: 0.0, walking: false, sitting: false, airborne: false}
  end

  test "a room with NO lease (un-owned) emits nothing and reports unavailable (no fake epoch-0 atmosphere)" do
    # Direct test start: no database checkout for a lease, so the room holds
    # no handle — the pre-lease degraded state.
    pid = start_supervised!(Supervisor.child_spec({RoomServer, %{district: "probe-room-rain", instance: "main", wire_id: "probe-room-rain-direct-#{System.unique_integer([:positive])}", kind: :public}}, id: "atmo-direct"))

    a = WorldTestHelper.recorder!(self(), :a)
    assert {:ok, %{"type" => "presence_update", "epoch" => 0}} = RoomServer.join(pid, %{player_id: "guest_a", conn_ref: :ca, channel_pid: a, nickname: "A", pose: pose()})

    # Several ticks pass with the room occupied; nothing may be emitted.
    Process.sleep(400)
    refute_receive {:recorded, :a, %{"type" => "atmosphere_state"}}, 100

    assert RoomServer.atmosphere_snapshot(pid) == :unavailable
  end

  test "an owned occupied room snapshots and broadcasts; a fenced owner stops with the room" do
    wire = "probe-owned-rain-#{System.unique_integer([:positive])}"
    Application.put_env(:afterlight, :world, Keyword.put(world_cfg(), :place_entries, [atmosphere_entry(wire, "rain")]))

    # Short renewal cadence so the REAL renewer→fence flow runs in test time
    # (production never sets this key; the setup's on_exit restores :world).
    world = world_cfg()
    Application.put_env(:afterlight, :world, Keyword.put(world, :lease_renew_interval_ms, 20))

    a = WorldTestHelper.recorder!(self(), :a)
    assert {:ok, room_pid, %{"type" => "presence_update", "epoch" => epoch}} = World.join(wire, "guest_a", :ca, a, "A")
    assert is_integer(epoch) and epoch >= 1

    # The owner-side snapshot matches the held epoch exactly.
    assert {:ok, frame} = RoomServer.atmosphere_snapshot(room_pid)
    assert %{"type" => "atmosphere_state", "roomId" => ^wire, "epoch" => ^epoch, "revision" => revision} = frame
    assert revision >= 1

    # The existing 100ms tick broadcasts the atmosphere to members (repair
    # is due on the first owned occupied tick).
    assert_receive {:recorded, :a, %{"type" => "atmosphere_state", "epoch" => ^epoch}}, 2_000

    # Ownership loss through the existing fail-closed choreography: the
    # renewal is guaranteed to lose against the expired row, the renewer
    # reports the fence and the room STOPS as the former owner — queued
    # old-owner output dies with the process, so it emits nothing further.
    {:ok, key} = RoomKey.from_wire(wire)

    Afterlight.Repo.query!(
      "UPDATE room_leases SET expires_at = now() - interval '1 second' WHERE room_key = $1",
      [key.room_key]
    )

    down_ref = Process.monitor(room_pid)
    assert_receive {:DOWN, ^down_ref, :process, ^room_pid, :shutdown}, 5_000

    # Restored inline: a leaked fast renewal interval would fence every
    # other test's auto-restarted rooms mid-test.
    Application.put_env(:afterlight, :world, world)

    wait_until(fn -> Registry.lookup(Afterlight.World.Registry, {RoomServer, wire}) == [] end)
    refute_receive {:recorded, :a, %{"type" => "atmosphere_state"}}, 300
  end

  defp world_cfg, do: Application.get_env(:afterlight, :world, [])

  defp wait_until(pred, attempts \\ 100)

  defp wait_until(_pred, 0), do: flunk("condition not met")

  defp wait_until(pred, attempts) do
    if pred.() do
      :ok
    else
      Process.sleep(10)
      wait_until(pred, attempts - 1)
    end
  end
end

defmodule AfterlightWeb.GameChannelAtmosphereTest do
  @moduledoc """
  Task 2.1 GameChannel integration: the `atmosphere_state` join snapshot
  follows the roster and agrees across occupants, `atmosphere_get` is
  membership-gated and rate-limited, unsupported rooms answer
  `atmosphere_unavailable`, nothing is ever relayed to Node, and an empty
  room's atmosphere stops with the room.
  """

  use Afterlight.DataCase, async: false

  import Phoenix.ChannelTest

  @endpoint AfterlightWeb.Endpoint

  @world_routing %{
    "ping" => :terminate_pong,
    "join_room" => :phoenix,
    "movement" => :phoenix,
    "emote" => :phoenix
  }

  @node_routing %{"ping" => :terminate_pong}

  setup do
    GatewayTest.FakeCore.set_owner(self())
    Afterlight.Gateway.RateLimit.reset()

    world = Application.get_env(:afterlight, :world, [])

    # The same deterministic seed the pure module pins, so snapshots assert
    # exact semantics (restored with :world on exit).
    Application.put_env(:afterlight, :world, Keyword.put(world, :atmosphere_seed, 123))

    on_exit(fn -> Application.put_env(:afterlight, :world, world) end)

    :ok
  end

  defp flipped(fun), do: GatewayTest.ConfigLock.with_lock(:routing, @world_routing, fun)

  defp with_atmosphere_room do
    wire = "probe-channel-rain-#{System.unique_integer([:positive])}"
    world = Application.get_env(:afterlight, :world, [])

    Application.put_env(
      :afterlight,
      :world,
      Keyword.put(world, :place_entries, [
        %{
          "id" => wire,
          "public" => true,
          "kind" => "environment",
          "bounds" => %{"minX" => -11.3, "maxX" => 11.3, "minZ" => -9.5, "maxZ" => 10.3},
          "atmosphere" => %{"preset" => "rain", "weatherMode" => "fixed", "timeMode" => "fixed"}
        }
      ])
    )

    wire
  end

  # A Theater-style room: fixed default preset plus the explicit adoptable
  # allow-list the environment campaign projects.
  defp with_environment_room do
    wire = "probe-channel-env-#{System.unique_integer([:positive])}"
    world = Application.get_env(:afterlight, :world, [])

    Application.put_env(
      :afterlight,
      :world,
      Keyword.put(world, :place_entries, [
        %{
          "id" => wire,
          "public" => true,
          "kind" => "venue",
          "bounds" => %{"minX" => -11.3, "maxX" => 11.3, "minZ" => -9.5, "maxZ" => 10.3},
          "atmosphere" => %{
            "preset" => "env-coastal-sunset",
            "weatherMode" => "fixed",
            "timeMode" => "fixed",
            "presets" => ["env-coastal-sunset", "env-coastal-storm"]
          }
        }
      ])
    )

    wire
  end

  defp connect_guest(guest_id, nickname) do
    {:ok, %{token: token}} = Afterlight.Gateway.Auth.issue(guest_id, nickname)
    assert {:ok, socket} = connect(AfterlightWeb.UserSocket, %{"token" => token})

    assert {:ok, %{guestId: ^guest_id}, socket} =
             subscribe_and_join(socket, AfterlightWeb.GameChannel, "game:v1")

    Process.unlink(socket.channel_pid)
    socket
  end

  defp hello(socket, guest_id, nickname) do
    push(socket, "hello", %{"guestId" => guest_id, "nickname" => nickname})
    assert_receive {:fake_frame, _up, json}, 1_000
    Jason.decode!(json)
  end

  test "two occupants receive the same semantic snapshot, each after their roster (D2)" do
    flipped(fn ->
      wire = with_atmosphere_room()

      guest_a = "guest_atmo_a#{System.unique_integer([:positive])}"
      a = connect_guest(guest_a, "Alder")
      _hello = hello(a, guest_a, "Alder")
      push(a, "join_room", %{"roomId" => wire})

      assert_push("presence_update", %{"roomId" => ^wire, "epoch" => epoch, "players" => []})
      assert is_integer(epoch) and epoch >= 1

      assert_push("atmosphere_state", frame_a = %{"roomId" => ^wire, "epoch" => ^epoch})
      assert frame_a["schemaVersion"] == 1
      assert frame_a["revision"] >= 1
      assert frame_a["state"]["preset"] == "rain" and frame_a["state"]["seed"] == 123

      events_a = frame_a["state"]["events"]
      assert length(events_a) <= 4
      assert byte_size(Jason.encode!(frame_a)) <= 8 * 1024

      # A second client gets the SAME semantics — identical seed, revision
      # and event windows — and generates its own rain locally (D1).
      guest_b = "guest_atmo_b#{System.unique_integer([:positive])}"
      b = connect_guest(guest_b, "Birch")
      _hello = hello(b, guest_b, "Birch")
      push(b, "join_room", %{"roomId" => wire})

      assert_push("presence_update", %{"roomId" => ^wire, "epoch" => epoch_b, "players" => players})
      assert epoch_b == epoch and length(players) == 1

      assert_push("atmosphere_state", frame_b = %{"roomId" => ^wire, "epoch" => ^epoch})
      assert frame_b["revision"] == frame_a["revision"]
      assert frame_b["state"]["seed"] == frame_a["state"]["seed"]
      assert frame_b["state"]["events"] == events_a, "shared event windows are the coherence contract"

      _ = frame_b
    end)
  end

  test "atmosphere_get: membership-gated, requestId echoed, one per five seconds" do
    flipped(fn ->
      wire = with_atmosphere_room()
      guest = "guest_atmo_get#{System.unique_integer([:positive])}"
      socket = connect_guest(guest, "Wren")
      _hello = hello(socket, guest, "Wren")

      # No live membership: refused retryably, and nothing reads a room.
      push(socket, "atmosphere_get", %{"requestId" => "req-0"})
      assert_push("error", %{"message" => "room_unavailable"})

      push(socket, "join_room", %{"roomId" => wire})
      assert_push("presence_update", %{"roomId" => ^wire})
      assert_push("atmosphere_state", %{})

      push(socket, "atmosphere_get", %{"requestId" => "req-1"})
      assert_push("atmosphere_state", %{"requestId" => "req-1", "roomId" => ^wire, "epoch" => epoch})
      assert is_integer(epoch) and epoch >= 1

      # One resnapshot per five seconds: spam answers the bare error.
      push(socket, "atmosphere_get", %{"requestId" => "req-2"})
      assert_push("error", %{"message" => "rate_limited"})

      # An invalid requestId never reaches the limiter or the room.
      push(socket, "atmosphere_get", %{"requestId" => String.duplicate("x", 65)})
      assert_push("error", %{"message" => "atmosphere_request_invalid"})
    end)
  end

  test "atmosphere_set: any live member adopts an allowed environment and the room broadcasts it" do
    flipped(fn ->
      wire = with_environment_room()

      guest_a = "guest_atmo_set_a#{System.unique_integer([:positive])}"
      a = connect_guest(guest_a, "Alder")
      _hello = hello(a, guest_a, "Alder")
      push(a, "join_room", %{"roomId" => wire})
      assert_push("presence_update", %{"roomId" => ^wire, "epoch" => epoch})
      frame_a = receive_atmosphere(&(&1["state"]["preset"] == "env-coastal-sunset"))
      assert frame_a["roomId"] == wire and frame_a["epoch"] == epoch
      initial_revision = frame_a["revision"]

      guest_b = "guest_atmo_set_b#{System.unique_integer([:positive])}"
      b = connect_guest(guest_b, "Birch")
      _hello = hello(b, guest_b, "Birch")
      push(b, "join_room", %{"roomId" => wire})
      assert_push("presence_update", %{"roomId" => ^wire})
      _frame_b = receive_atmosphere(&(&1["state"]["preset"] == "env-coastal-sunset"))

      # A (not the host — there is no host) adopts the storm world; every
      # member receives the authoritative full replacement.
      push(a, "atmosphere_set", %{"preset" => "env-coastal-storm"})

      frame_set_a = receive_atmosphere(&(&1["state"]["preset"] == "env-coastal-storm"))
      assert frame_set_a["roomId"] == wire and frame_set_a["epoch"] == epoch
      assert frame_set_a["revision"] == initial_revision + 1
      assert frame_set_a["state"]["events"] != []

      frame_set_b = receive_atmosphere(&(&1["state"]["preset"] == "env-coastal-storm"))
      assert frame_set_b["revision"] == frame_set_a["revision"]
      assert frame_set_b["state"] == frame_set_a["state"], "one window shared by the whole room"

      # Ids outside the room allow-list, even valid committed presets, are refused.
      push(a, "atmosphere_set", %{"preset" => "rain"})
      assert_push("error", %{"message" => "atmosphere_set_rejected", "reason" => "preset_not_allowed"})

      # The limiter allows two sets per five seconds; rejected sets count too,
      # while malformed payloads never reach it.
      push(b, "atmosphere_set", %{"preset" => "env-alpine-aurora"})
      assert_push("error", %{"message" => "atmosphere_set_rejected", "reason" => "preset_not_allowed"})
      push(b, "atmosphere_set", %{"preset" => "not-a-preset"})
      assert_push("error", %{"message" => "atmosphere_set_rejected", "reason" => "preset_not_allowed"})
      push(b, "atmosphere_set", %{"preset" => "env-coastal-sunset"})
      assert_push("error", %{"message" => "rate_limited"})
      push(b, "atmosphere_set", %{"preset" => ""})
      assert_push("error", %{"message" => "atmosphere_set_invalid"})
    end)
  end

  test "atmosphere_set is gated like the read: members only, allow-list only" do
    flipped(fn ->
      # Not a live member: refused before any room is touched.
      guest = "guest_atmo_set_gate#{System.unique_integer([:positive])}"
      socket = connect_guest(guest, "Wren")
      _hello = hello(socket, guest, "Wren")
      push(socket, "atmosphere_set", %{"preset" => "env-coastal-storm"})
      assert_push("error", %{"message" => "room_unavailable"})

      # A fixed-atmosphere room (no allow-list) rejects every set.
      wire = with_atmosphere_room()
      push(socket, "join_room", %{"roomId" => wire})
      assert_push("presence_update", %{"roomId" => ^wire})
      assert_push("atmosphere_state", %{})
      push(socket, "atmosphere_set", %{"preset" => "env-coastal-storm"})
      assert_push("error", %{"message" => "atmosphere_set_rejected", "reason" => "preset_not_allowed"})
    end)
  end

  test "unknown / no-atmosphere rooms answer atmosphere_unavailable, never a fabricated state" do
    flipped(fn ->
      guest = "guest_atmo_market#{System.unique_integer([:positive])}"
      socket = connect_guest(guest, "Wren")
      _hello = hello(socket, guest, "Wren")

      # The market is a live room with no projected atmosphere: no join
      # snapshot, and the explicit request answers unavailable.
      push(socket, "join_room", %{"roomId" => "market"})
      assert_push("presence_update", %{"roomId" => "market"})
      assert_no_push("atmosphere_state", 300)

      push(socket, "atmosphere_get", %{"requestId" => "req-market"})
      assert_push("atmosphere_unavailable", %{"requestId" => "req-market", "roomId" => "market"})
    end)
  end

  test "the atmosphere is Phoenix-only: never relayed to Node, unrouted when the world rolls back" do
    flipped(fn ->
      wire = with_atmosphere_room()
      guest = "guest_atmo_node#{System.unique_integer([:positive])}"
      socket = connect_guest(guest, "Wren")
      _hello = hello(socket, guest, "Wren")
      assert_receive {:fake_upstream_started, up, _headers}, 1_000

      push(socket, "join_room", %{"roomId" => wire})
      assert_push("presence_update", %{"roomId" => ^wire})
      assert_push("atmosphere_state", %{})

      push(socket, "atmosphere_get", %{"requestId" => "req-node"})
      assert_push("atmosphere_state", %{"requestId" => "req-node"})

      # No Node path ever owns the atmosphere. (The join_room shadow-context
      # forward IS expected — Node keeps gating domain actions on its shadow
      # session's currentRoom — so anything else relayed is drained here and
      # only an atmosphere frame fails the test.)
      assert_no_atmosphere_relay(up)
    end)

    # Rollback: like place_directory_get, the atmosphere is unrouted (never
    # silently handed to the Node sidecar).
    GatewayTest.ConfigLock.with_lock(:routing, @node_routing, fn ->
      guest = "guest_atmo_rollback#{System.unique_integer([:positive])}"
      socket = connect_guest(guest, "Wren")
      _hello = hello(socket, guest, "Wren")
      assert_receive {:fake_upstream_started, up, _headers}, 1_000

      push(socket, "atmosphere_get", %{"requestId" => "req-off"})
      assert_push("error", %{"message" => "unrouted"})
      refute_receive {:fake_frame, ^up, _json}, 200
    end)
  end

  test "empty-room cleanup: the atmosphere stops with the room, no global timer remains" do
    flipped(fn ->
      wire = with_atmosphere_room()

      world = Application.get_env(:afterlight, :world, [])
      Application.put_env(:afterlight, :world, Keyword.put(world, :empty_room_grace_ms, 120))

      guest = "guest_atmo_empty#{System.unique_integer([:positive])}"
      socket = connect_guest(guest, "Wren")
      _hello = hello(socket, guest, "Wren")

      push(socket, "join_room", %{"roomId" => wire})
      assert_push("presence_update", %{"roomId" => ^wire})
      assert_push("atmosphere_state", %{})

      # Travel away: the probe room empties and, past the grace, stops —
      # taking its atmosphere scheduling with it.
      push(socket, "join_room", %{"roomId" => "theater"})
      assert_push("presence_update", %{"roomId" => "theater"})

      wait_until(fn ->
        Registry.lookup(Afterlight.World.Registry, {Afterlight.World.RoomServer, wire}) == []
      end)

      assert_no_push("atmosphere_state", 300)
    end)
  end

  defp assert_no_push(event, timeout) do
    receive do
      %Phoenix.Socket.Message{event: ^event, payload: payload} ->
        flunk("unexpected push #{inspect(event)}: #{inspect(payload)}")
    after
      timeout -> :ok
    end
  end

  # Receives the next atmosphere_state frame matching `pred`, skipping roster
  # pushes and the room's first-tick repair snapshot (which always fires once
  # per room with the same semantics as the join frame).
  defp receive_atmosphere(pred, timeout \\ 2_000) do
    receive do
      %Phoenix.Socket.Message{event: "atmosphere_state", payload: frame} ->
        if pred.(frame), do: frame, else: receive_atmosphere(pred, timeout)
    after
      timeout -> flunk("no atmosphere_state frame matched")
    end
  end

  # Drains relayed shadow frames for `timeout`, skipping expected non-atmosphere
  # context (join_room/hello); any atmosphere frame relayed to Node fails.
  defp assert_no_atmosphere_relay(up, timeout \\ 200) do
    receive do
      {:fake_frame, ^up, json} ->
        if is_binary(json) and String.contains?(json, "atmosphere") do
          flunk("atmosphere was relayed to Node: #{inspect(json)}")
        end

        assert_no_atmosphere_relay(up, timeout)

      {:fake_closed, ^up} ->
        :ok
    after
      timeout -> :ok
    end
  end

  defp wait_until(pred, attempts \\ 100)

  defp wait_until(_pred, 0), do: flunk("condition not met")

  defp wait_until(pred, attempts) do
    if pred.() do
      :ok
    else
      Process.sleep(20)
      wait_until(pred, attempts - 1)
    end
  end
end
