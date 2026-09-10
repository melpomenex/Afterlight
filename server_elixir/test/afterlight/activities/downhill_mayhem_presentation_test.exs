defmodule Afterlight.Activities.DownhillMayhem.PresentationTest do
  @moduledoc """
  Snapshot/summary shape tests for Downhill Mayhem
  (integrate-multiplayer-downhill-mayhem-arcade 8.5): the full participant
  snapshot carries exactly six bounded rider rows with the shared camelCase
  wire keys, the private self attachment carries reconciliation data, and the
  room-wide summary never leaks state, self, riders or sequences.
  """

  use ExUnit.Case, async: true

  alias Afterlight.Activities.DownhillMayhem
  alias Afterlight.Activities.DownhillMayhem.Presentation

  @rider_keys ~w(
    slot playerId nickname isAI s lat y vs vlat vy grounded steerPos meter
    trick crashed invuln finishMs racePos resetSeq dnfReason
  )

  defp human(slot, id) do
    %{
      slot: slot,
      is_ai: false,
      is_human: true,
      def: %{name: "RIDER"},
      s: slot * 10.0,
      lat: 0.0,
      y: 0.0,
      vs: 12.5,
      vlat: 0.0,
      vy: 0.0,
      grounded: true,
      steer_pos: 0.1,
      meter: 42.0,
      trick: nil,
      crashed: false,
      invuln: 0.0,
      finished: false,
      finish_time: nil,
      race_pos: slot + 1,
      reset_seq: 2,
      dnf_reason: nil,
      player_id: id,
      nickname: id,
      def_name: id
    }
  end

  defp ai(slot) do
    %{
      slot: slot,
      is_ai: true,
      is_human: false,
      def: %{name: "RIVAL#{slot}"},
      s: slot * 8.0,
      lat: 1.0,
      y: 0.2,
      vs: 11.0,
      vlat: -0.1,
      vy: 0.0,
      grounded: true,
      steer_pos: -0.2,
      meter: 55.0,
      trick: "nohander",
      crashed: false,
      invuln: 0.5,
      finished: false,
      finish_time: nil,
      race_pos: slot + 1,
      reset_seq: 0,
      dnf_reason: nil
    }
  end

  defp state(riders) do
    %{
      status: :in_progress,
      wire_room_id: "theater",
      room_key: "default:theater:main",
      room_epoch: 1,
      activity_id: "orpheum-downhill-mayhem",
      session_id: "sess_1",
      revision: 7,
      match_id: "match_1",
      snapshot_seq: 3,
      sim_state: %{
        "tick" => 42,
        "courseId" => "classic",
        "courseVersion" => 1,
        "courseHash" => String.duplicate("a", 64),
        "rulesVersion" => 1,
        "difficulty" => "mayhem",
        "riders" => Map.new(riders, &{&1.slot, &1})
      },
      queue: [],
      spectators: %{},
      players: %{
        0 => %{player_id: "p0", slot: 0, ready: true, last_seq: 12},
        1 => %{player_id: "p1", slot: 1, ready: true, last_seq: 5}
      },
      lobby_config: %{"mountain" => "timber", "difficulty" => "brutal"},
      activity_def: %{"type" => "downhill-mayhem"},
      max_players: 6,
      start_at: 1_000,
      deadline_at: 181_000
    }
  end

  defp field_state do
    riders = [human(0, "p0"), human(1, "p1")] ++ Enum.map(2..5, &ai/1)
    state(riders)
  end

  test "full snapshot carries six bounded riders with the exact camelCase keys" do
    snapshot = Presentation.full_snapshot(field_state())

    assert snapshot["type"] == "activity_state"
    assert snapshot["audience"] == "participants"
    assert snapshot["status"] == "racing"
    assert snapshot["matchId"] == "match_1"
    assert snapshot["serverTick"] == 42
    assert snapshot["courseId"] == "classic"
    assert snapshot["courseHash"] == String.duplicate("a", 64)
    assert snapshot["mountain"] == "timber"
    assert snapshot["difficulty"] == "brutal"
    assert snapshot["startAt"] == 1_000
    assert snapshot["deadlineAt"] == 181_000

    assert length(snapshot["riders"]) == 6

    for row <- snapshot["riders"] do
      assert Map.keys(row) |> Enum.sort() == Enum.sort(@rider_keys), "row keys: #{inspect(Map.keys(row))}"
      assert row["grounded"] in [true, false]
      assert is_integer(row["racePos"])
    end

    assert snapshot["riders"] |> Enum.map(& &1["slot"]) == [0, 1, 2, 3, 4, 5]
    assert Enum.count(snapshot["riders"], & &1["isAI"]) == 4
    assert Enum.count(snapshot["riders"], &(not &1["isAI"])) == 2

    # Bounded payload.
    assert byte_size(Jason.encode!(snapshot)) < 16_384
  end

  test "attach_self adds only private reconciliation data" do
    st = field_state()
    player = st.players[0] |> Map.put(:input_state, %{"kind" => "ride", "steer" => 0.0})
    snapshot = Presentation.attach_self(Presentation.full_snapshot(st), st, player)

    assert snapshot["self"]["slot"] == 0
    assert snapshot["self"]["serverTick"] == 42
    assert snapshot["self"]["heldControls"] == %{"kind" => "ride", "steer" => 0.0}
    assert is_integer(snapshot["self"]["appliedSeq"])
  end

  test "summary is overview-only and never leaks state, self, riders or sequences" do
    summary = Presentation.summary(field_state())

    assert summary["audience"] == "summary"
    refute Map.has_key?(summary, "state")
    refute Map.has_key?(summary, "self")
    refute Map.has_key?(summary, "riders")
    refute Map.has_key?(summary, "lastAcceptedSeqs")
    refute Map.has_key?(summary, "startAt")
    refute Map.has_key?(summary, "deadlineAt")

    assert summary["summary"]["riderCount"] == 6
    assert summary["summary"]["aiCount"] == 4
    assert summary["summary"]["readyCount"] == 2
    assert summary["summary"]["capacity"] == 6
    assert summary["summary"]["mountain"] == "timber"
    assert summary["summary"]["difficulty"] == "brutal"
    assert length(summary["summary"]["progress"]) == 6

    for row <- summary["summary"]["progress"] do
      assert Map.has_key?(row, "normalizedProgress")
      assert Map.has_key?(row, "status")
    end

    # Never a lease, token or reconciliation blob in the room-wide frame.
    refute Map.has_key?(summary, "lease")
    refute inspect(summary) =~ "lease_"
  end

  test "results summary carries the authoritative standings" do
    base = field_state()

    riders =
      base.sim_state["riders"]
      |> Map.update!(0, &%{&1 | finished: true, finish_time: 95.5})
      |> Map.update!(1, &%{&1 | dnf_reason: "disconnect"})

    sim = %{base.sim_state | "riders" => riders}

    st =
      base
      |> Map.put(:status, :ended)
      |> Map.put(:sim_state, sim)
      |> Map.put(:match_outcome, %{
        "kind" => "downhill_race",
        "standings" => DownhillMayhem.SessionPolicy.standings(sim, %{})
      })

    summary = Presentation.summary(st)
    assert summary["status"] == "results"
    assert summary["summary"]["result"]["kind"] == "downhill_race"
    assert is_list(summary["summary"]["result"]["standings"])
  end
end
