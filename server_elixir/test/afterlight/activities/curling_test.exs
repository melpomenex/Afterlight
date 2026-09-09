defmodule Afterlight.Activities.CurlingTest do
  use ExUnit.Case, async: true

  alias Afterlight.Activities.Curling

  defp launch_and_rest(state, slot, shot) do
    {state, _} = Curling.apply_input(state, slot, Map.put(shot, "kind", "launch"))
    rest(state)
  end

  defp rest(state, guard \\ 0)
  defp rest(%{"status" => "in_flight"} = state, guard) when guard < 900 do
    {state, _} = Curling.step_simulation(state, %{}, 8)
    rest(state, guard + 8)
  end
  defp rest(state, _), do: state

  defp play_blank_ends(state, 0), do: state

  defp play_blank_ends(state, count) do
    state =
      Enum.reduce(1..8, state, fn _, acc ->
        slot = acc["currentSlot"]
        {acc, _} = Curling.apply_input(acc, slot, %{"kind" => "launch", "aim" => 0.24, "power" => 0.18, "curl" => 0.0})
        rest(acc)
      end)

    assert acc_score(state, 0) == 0
    assert acc_score(state, 1) == 0
    play_blank_ends(state, count - 1)
  end

  defp acc_score(state, team), do: Map.get(state["score"], to_string(team), 0)

  describe "init_sim_state/1" do
    test "1v1 and 2v2 with four ends and four stones per side" do
      singles = Curling.init_sim_state(slots: [0, 1])
      assert singles["rulesVersion"] == 1
      assert singles["teamSize"] == 1
      assert singles["totalEnds"] == 4
      assert singles["stonesPerSide"] == 4
      assert singles["status"] == "aiming"
      assert singles["hammerTeam"] == 1
      assert singles["currentSlot"] == 0
      assert singles["currentTeam"] == 0

      doubles = Curling.init_sim_state(slots: [0, 1, 2, 3])
      assert doubles["teamSize"] == 2
      assert Curling.slots_for_team(0, 2) == [0, 1]
      assert Curling.thrower_for_stone(0, 2, 1) == 0
      assert Curling.thrower_for_stone(1, 2, 1) == 2
      assert Curling.thrower_for_stone(2, 2, 1) == 1
    end
  end

  describe "apply_input/3" do
    test "clamps launch and ignores the wrong thrower" do
      state = Curling.init_sim_state(slots: [0, 1])
      {denied, _} = Curling.apply_input(state, 1, %{"kind" => "launch", "aim" => 0.0, "power" => 0.8})
      assert denied["stonesThrown"] == 0

      {:ok, clamped} = Curling.validate_controls(%{"kind" => "launch", "aim" => 4, "power" => 9, "curl" => -3})
      assert clamped["aim"] == 0.28
      assert clamped["power"] == 1.0
      assert clamped["curl"] == -1.0
    end

    test "launch, curl and sweep change the live stone" do
      straight = launch_and_rest(Curling.init_sim_state(slots: [0, 1]), 0, %{"aim" => 0.0, "power" => 0.7, "curl" => 0.0})
      stone = hd(straight["stones"])
      assert stone["z"] > -1.5
      assert abs(stone["x"]) < 0.35

      curled = launch_and_rest(Curling.init_sim_state(slots: [0, 1]), 0, %{"aim" => 0.0, "power" => 0.7, "curl" => 1.0})
      curled_stone = hd(curled["stones"])
      assert abs(curled_stone["x"] - stone["x"]) > 0.08

      {swept, _} = Curling.apply_input(Curling.init_sim_state(slots: [0, 1]), 0, %{"kind" => "launch", "aim" => 0.0, "power" => 0.58, "curl" => 0.0})
      {swept, _} = Curling.apply_input(swept, 0, %{"kind" => "sweep", "sweep" => 1})

      swept =
        Enum.reduce_while(1..200, swept, fn _, acc ->
          {next, _} = Curling.step_simulation(acc, %{0 => %{input_state: %{"kind" => "sweep", "sweep" => 1}}}, 4)
          if next["status"] == "in_flight", do: {:cont, next}, else: {:halt, next}
        end)

      dry = launch_and_rest(Curling.init_sim_state(slots: [0, 1]), 0, %{"aim" => 0.0, "power" => 0.58, "curl" => 0.0})
      assert hd(swept["stones"])["z"] > hd(dry["stones"])["z"] + 0.15
    end

    test "opposing sweepers cannot sweep" do
      {state, _} = Curling.apply_input(Curling.init_sim_state(slots: [0, 1]), 0, %{"kind" => "launch", "aim" => 0.0, "power" => 0.6})
      {state, _} = Curling.apply_input(state, 1, %{"kind" => "sweep", "sweep" => 1})
      assert Map.get(state["sweepers"], "1", 0) == 0
    end
  end

  describe "scoring fixtures" do
    test "closest-stone scoring counts only nearer stones of the closest side" do
      stones = [
        %{"team" => 0, "x" => 0.0, "z" => 3.32, "out" => false},
        %{"team" => 0, "x" => 0.2, "z" => 3.48, "out" => false},
        %{"team" => 1, "x" => 0.0, "z" => 3.75, "out" => false},
        %{"team" => 1, "x" => -0.4, "z" => 4.0, "out" => false}
      ]

      result = Curling.score_end(stones)
      assert result["scoringTeam"] == 0
      assert result["points"] == 2
    end

    test "tied end awards no points and starts the next end" do
      equal = Curling.score_end([
        %{"team" => 0, "x" => 0.2, "z" => 3.2, "out" => false},
        %{"team" => 1, "x" => -0.2, "z" => 3.2, "out" => false}
      ])

      assert equal["scoringTeam"] == nil
      assert equal["points"] == 0

      state = play_blank_ends(Curling.init_sim_state(slots: [0, 1]), 1)
      assert state["currentEnd"] == 2
      assert acc_score(state, 0) == 0
      assert state["status"] == "aiming"
      assert state["stones"] == []
    end

    test "match tied after four ends starts an extra end" do
      state = play_blank_ends(Curling.init_sim_state(slots: [0, 1]), 4)
      assert state["currentEnd"] == 5
      assert state["extraEnd"] == true
      assert state["winner"] == nil
    end

    test "extra end that scores ends the match" do
      state = play_blank_ends(Curling.init_sim_state(slots: [0, 1]), 4)

      stone = %{
        "id" => "shot",
        "team" => 0,
        "slot" => 0,
        "x" => 0.0,
        "z" => 3.2,
        "vx" => 0.0,
        "vz" => 0.0,
        "omega" => 0.0,
        "radius" => 0.145,
        "moving" => false,
        "out" => false
      }

      state =
        state
        |> Map.put("stones", [stone])
        |> Map.put("stonesThrown", 8)
        |> Map.put("status", "in_flight")

      {state, event} = Curling.step_simulation(state, %{}, 1)
      assert state["status"] == "complete"
      assert state["winner"] == 0
      assert state["outcome"] == "complete"
      assert {:match_ended, 0, %{"reason" => "complete"}} = event
    end
  end

  describe "collisions and environment" do
    test "stone collisions transfer momentum" do
      state =
        Curling.init_sim_state(slots: [0, 1])
        |> Map.put("status", "in_flight")
        |> Map.put("currentTeam", 0)
        |> Map.put("stonesThrown", 2)
        |> Map.put("stones", [
          %{
            "id" => "parked",
            "team" => 1,
            "slot" => 1,
            "x" => 0.0,
            "z" => 1.2,
            "vx" => 0.0,
            "vz" => 0.0,
            "omega" => 0.0,
            "radius" => 0.145,
            "moving" => false,
            "out" => false
          },
          %{
            "id" => "shot",
            "team" => 0,
            "slot" => 0,
            "x" => 0.0,
            "z" => 0.6,
            "vx" => 0.0,
            "vz" => 3.2,
            "omega" => 0.0,
            "radius" => 0.145,
            "moving" => true,
            "out" => false
          }
        ])

      before_z = 1.2

      state =
        Enum.reduce(1..40, state, fn _, acc ->
          {next, _} = Curling.step_simulation(acc, %{}, 1)
          next
        end)

      [a | _] = state["stones"]
      moved = :math.sqrt(:math.pow(a["x"], 2) + :math.pow(a["z"] - before_z, 2))
      assert moved > 0.08
    end

    test "ice friction uses frozen environment defaults" do
      dry = %{"wetness" => 0.0, "intensity" => 0.0}
      wet = %{"wetness" => 0.9, "intensity" => 0.8}
      assert Curling.ice_friction(dry) > Curling.ice_friction(wet)
      assert Curling.ice_deceleration(wet, 0) > Curling.ice_deceleration(dry, 0)

      dry_shot = launch_and_rest(Curling.init_sim_state(slots: [0, 1], environment: dry), 0, %{"aim" => 0.0, "power" => 0.6, "curl" => 0.0})
      wet_shot = launch_and_rest(Curling.init_sim_state(slots: [0, 1], environment: wet), 0, %{"aim" => 0.0, "power" => 0.6, "curl" => 0.0})
      assert hd(dry_shot["stones"])["z"] > hd(wet_shot["stones"])["z"] + 0.2
    end
  end

  describe "D3 disconnected teammate handling" do
    test "pauses during grace then forfeits an incomplete side or aborts both" do
      {paused, event} = Curling.apply_input(Curling.init_sim_state(slots: [0, 1]), 0, %{"kind" => "pause"})
      assert paused["status"] == "paused"
      assert paused["pauseReason"] == "disconnect_grace"
      assert event["reason"] == "disconnect_grace"

      {resumed, _} = Curling.apply_input(paused, 0, %{"kind" => "resume"})
      assert resumed["status"] == "aiming"

      {forfeit, ev} = Curling.apply_disconnect(Curling.init_sim_state(slots: [0, 1]), [0])
      assert forfeit["status"] == "complete"
      assert forfeit["winner"] == 0
      assert forfeit["outcome"] == "forfeit"
      assert ev["reason"] == "forfeit"

      {aborted, ev} = Curling.apply_input(Curling.init_sim_state(slots: [0, 1]), 0, %{"kind" => "disconnect", "remainingSlots" => []})
      assert aborted["status"] == "aborted"
      assert aborted["outcome"] == "aborted"
      assert ev["reason"] == "both_sides_incomplete"

      {keep, _} = Curling.apply_disconnect(Curling.init_sim_state(slots: [0, 1, 2, 3]), [2, 3])
      assert keep["winner"] == 1

      {both, _} = Curling.apply_disconnect(Curling.init_sim_state(slots: [0, 1, 2, 3]), [0, 2])
      assert both["status"] == "aborted"
      assert both["winner"] == nil
    end
  end

  describe "step_simulation/3 input consume" do
    test "launches from player input_state once per last_seq" do
      state = Curling.init_sim_state(slots: [0, 1])

      players = %{
        0 => %{
          slot: 0,
          last_seq: 1,
          input_state: %{"kind" => "launch", "aim" => 0.0, "power" => 0.35, "curl" => 0.0}
        }
      }

      {state, _} = Curling.step_simulation(state, players, 1)
      assert state["stonesThrown"] == 1
      assert state["status"] == "in_flight"

      {again, _} = Curling.step_simulation(state, players, 1)
      assert again["stonesThrown"] == 1
    end
  end

  describe "2v2 rotation" do
    test "teammates alternate throws" do
      state = Curling.init_sim_state(slots: [0, 1, 2, 3])
      assert state["currentSlot"] == 0
      state = launch_and_rest(state, 0, %{"aim" => 0.2, "power" => 0.2, "curl" => 0.0})
      assert state["currentSlot"] == 2
      state = launch_and_rest(state, 2, %{"aim" => -0.2, "power" => 0.2, "curl" => 0.0})
      assert state["currentSlot"] == 1
    end
  end
end
