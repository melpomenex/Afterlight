defmodule Afterlight.Activities.SnowboardTelemetryTest do
  @moduledoc """
  Operational visibility tests (add-multiplayer-snowboard-arcade 9.6): the
  race emits bounded, low-cardinality telemetry for join/start/finish/abort
  through `:telemetry`, with NO player or session identifiers in the
  metadata.
  """

  use ExUnit.Case, async: false

  alias Afterlight.Activities
  alias Afterlight.World.Lease

  @act_def %{
    "id" => "summit-run",
    "type" => "snowboard-race",
    "rulesVersion" => 1,
    "minPlayers" => 2,
    "capacities" => %{"players" => 8, "spectators" => 32, "queue" => 16},
    "interactionRadius" => 3.0,
    "transform" => %{"position" => [10.42, 0.0, 2.6]}
  }

  setup do
    Application.put_env(:afterlight, :snowboard_enabled, true)
    on_exit(fn -> Application.put_env(:afterlight, :snowboard_enabled, false) end)

    room_pid = spawn_link(fn -> fake_room_loop(%{}) end)

    %{
      room_pid: room_pid,
      room_key: "theater-test-#{System.unique_integer([:positive])}",
      room_epoch: 1,
      handle: %Lease.Handle{room_key: "theater-test", owner_node: "test_node", epoch: 1, fenced: false}
    }
  end

  defp fake_room_loop(members) do
    receive do
      {:"$gen_call", from, _msg} ->
        GenServer.reply(from, {:ok, %{x: 9.3, z: 2.6}})
        fake_room_loop(members)

      {:"$gen_cast", _frame} ->
        fake_room_loop(members)

      :stop ->
        :ok

      _other ->
        fake_room_loop(members)
    end
  end

  defp make_player(prefix) do
    %{player_id: "#{prefix}_#{System.unique_integer([:positive])}", conn_ref: 1, channel_pid: self()}
  end

  test "join, start, finish and abort signals fire with bounded metadata" do
    test_pid = self()
    handler_id = "snowboard-telemetry-test-#{System.unique_integer([:positive])}"

    :telemetry.attach_many(
      handler_id,
      [
        [:afterlight, :activity, :snowboard, :join],
        [:afterlight, :activity, :snowboard, :start],
        [:afterlight, :activity, :snowboard, :finish],
        [:afterlight, :activity, :snowboard, :abort],
        [:afterlight, :activity, :snowboard, :overload]
      ],
      fn event, measurements, metadata, _config ->
        send(test_pid, {:telemetry, event, measurements, metadata})
      end,
      nil
    )

    on_exit(fn -> :telemetry.detach(handler_id) end)

    {:ok, session} =
      Activities.get_or_start_session(
        self(),
        "theater-test-#{System.unique_integer([:positive])}",
        1,
        "summit-run",
        %Lease.Handle{room_key: "theater-test", owner_node: "test_node", epoch: 1, fenced: false},
        activity_def: @act_def,
        check_proximity: false,
        countdown_ms: 50,
        race_deadline_ms: 150
      )

    course = Afterlight.Activities.Snowboard.SessionPolicy.course()

    for prefix <- ["t1", "t2"] do
      player = %{player_id: "#{prefix}_#{System.unique_integer([:positive])}", conn_ref: 1, channel_pid: self()}
      {:ok, %{slot: slot, lease: lease}} =
        GenServer.call(session, {:command, "activity_join", %{"role" => "play"}, player})

      GenServer.call(session, {:command, "activity_input",
        %{
          "sessionId" => Activities.session_id(session),
          "lease" => lease,
          "seq" => System.unique_integer([:positive]),
          "matchId" => Activities.session_info(session).match_id,
          "controls" => %{
            "kind" => "loaded",
            "courseId" => Map.get(course.doc, "id"),
            "courseVersion" => Map.get(course.doc, "version"),
            "courseHash" => course.hash
          }
        }, player})

      GenServer.call(session, {:command, "activity_ready",
        %{"ready" => true, "matchId" => Activities.session_info(session).match_id}, player})
    end

    # The race starts (join + start signals), then the deadline finishes it.
    assert_receive {:telemetry, [:afterlight, :activity, :snowboard, :join], _, _}, 5_000
    assert_receive {:telemetry, [:afterlight, :activity, :snowboard, :start], _, _}, 5_000
    assert_receive {:telemetry, [:afterlight, :activity, :snowboard, :finish], measurements, metadata}, 10_000

    assert measurements.finished == 0, "a deadline race has no finishers"
    assert metadata.reason == "deadline"
    assert metadata.activity_type == "snowboard-race"

    # No player/session identifiers ever appear as metadata.
    refute Map.has_key?(metadata, "playerId")
    refute Map.has_key?(metadata, :player_id)
    refute Map.has_key?(metadata, :session_id)
    refute Map.has_key?(metadata, :matchId)
  end

  test "a deadline race also finishes without finishers; abort signal fires when nobody remains" do
    test_pid = self()
    handler_id = "snowboard-telemetry-abort-#{System.unique_integer([:positive])}"

    :telemetry.attach(
      handler_id,
      [:afterlight, :activity, :snowboard, :finish],
      fn _event, _measurements, metadata, _config -> send(test_pid, {:telemetry, metadata}) end,
      nil
    )

    on_exit(fn -> :telemetry.detach(handler_id) end)

    {:ok, session} =
      Activities.get_or_start_session(
        self(),
        "theater-test-#{System.unique_integer([:positive])}",
        1,
        "summit-run",
        %Lease.Handle{room_key: "theater-test", owner_node: "test_node", epoch: 1, fenced: false},
        activity_def: @act_def,
        check_proximity: false,
        countdown_ms: 50,
        race_deadline_ms: 4_000,
        reconnect_grace_ms: 100
      )

    course = Afterlight.Activities.Snowboard.SessionPolicy.course()

    for prefix <- ["x1", "x2"] do
      player = %{player_id: "#{prefix}_#{System.unique_integer([:positive])}", conn_ref: 1, channel_pid: self()}
      {:ok, %{slot: _slot, lease: lease}} =
        GenServer.call(session, {:command, "activity_join", %{"role" => "play"}, player})

      GenServer.call(session, {:command, "activity_input",
        %{
          "sessionId" => Activities.session_id(session),
          "lease" => lease,
          "seq" => System.unique_integer([:positive]),
          "matchId" => Activities.session_info(session).match_id,
          "controls" => %{
            "kind" => "loaded",
            "courseId" => Map.get(course.doc, "id"),
            "courseVersion" => Map.get(course.doc, "version"),
            "courseHash" => course.hash
          }
        }, player})

      GenServer.call(session, {:command, "activity_ready",
        %{"ready" => true, "matchId" => Activities.session_info(session).match_id}, player})
    end

    assert_receive {:telemetry, metadata}, 8_000
    assert metadata.reason == "deadline"
  end
end
