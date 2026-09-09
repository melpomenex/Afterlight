defmodule Afterlight.Activities.GutterBoat do
  @moduledoc """
  Authoritative server-side Rain Court Gutter Boat racing simulation (Task 7.5).

  Specifications:
  - `openspec/changes/add-place-activities-program/specs/signature-place-activities/spec.md`
    (Requirement: Rain and water activities)
  - `design.md` (D5, D7)

  Guarantees:
  - 1 to 4 toy boats racing along courtyard copper gutters.
  - Water flow influenced by rain intensity and wind vector.
  - Sub-tick finish timing and deterministic tie policy for close finishes.
  """

  @rules_version 1
  @course_id "rain-court-gutter"
  @course_version 1
  @course_length 8.0
  @start_z -1.5
  @finish_z 6.5
  @dt 1.0 / 60.0

  @lanes %{
    0 => %{slot: 0, x: -4.875, color: "#e8563f", name: "Crimson Keel"},
    1 => %{slot: 1, x: -4.625, color: "#38bdf8", name: "Azure Drifter"},
    2 => %{slot: 2, x: -4.375, color: "#edb66c", name: "Amber Skiff"},
    3 => %{slot: 3, x: -4.125, color: "#a78bfa", name: "Violet Sloop"}
  }

  def course_id, do: @course_id
  def course_version, do: @course_version
  def course_length, do: @course_length
  def lanes, do: @lanes

  @doc """
  Initializes gutter boat simulation state.
  """
  def init_sim_state(opts \\ []) do
    slots =
      case Keyword.get(opts, :slots) do
        nil -> [0, 1]
        list when is_list(list) -> list
      end

    env = Keyword.get(opts, :environment)
    seed = Keyword.get(opts, :seed, 42)

    boats =
      Map.new(slots, fn slot ->
        lane = Map.get(@lanes, slot, Map.get(@lanes, 0))

        b = %{
          "slot" => slot,
          "x" => lane.x,
          "z" => @start_z,
          "progress" => 0.0,
          "speed" => 0.0,
          "boost" => 0.0,
          "released" => false,
          "finished" => false,
          "finishTimeMs" => nil,
          "rank" => nil
        }

        {to_string(slot), b}
      end)

    %{
      "rulesVersion" => @rules_version,
      "courseId" => @course_id,
      "courseVersion" => @course_version,
      "courseLength" => @course_length,
      "status" => "racing",
      "elapsedMs" => 0,
      "tickCount" => 0,
      "seed" => seed,
      "boats" => boats,
      "winner" => nil,
      "standings" => [],
      "environment" => env
    }
  end

  @doc """
  Validates player controls for gutter boats.
  """
  def validate_controls(controls) when is_map(controls) do
    kind = Map.get(controls, "kind", "push")

    case kind do
      "neutral" -> {:ok, %{"kind" => "neutral"}}
      "push" -> {:ok, %{"kind" => "push"}}
      _ -> {:error, :unknown_kind}
    end
  end

  def validate_controls(_), do: {:error, :invalid_controls}

  @doc """
  Advances gutter boat simulation by steps.
  """
  def step_simulation(sim_state, players, steps \\ 1) do
    if sim_state["status"] != "racing" do
      {sim_state, nil}
    else
      do_step_simulation(sim_state, players, steps)
    end
  end

  defp do_step_simulation(sim_state, _players, 0), do: {sim_state, nil}

  defp do_step_simulation(sim_state, players, steps) do
    elapsed_ms = sim_state["elapsedMs"] + round(@dt * 1000)
    tick_count = sim_state["tickCount"] + 1

    rain =
      case get_in(sim_state, ["environment", "rain"]) do
        r when is_number(r) -> r * 1.0
        _ -> 0.5
      end

    wind_z =
      case get_in(sim_state, ["environment", "wind"]) do
        [_, wz] when is_number(wz) -> wz * 1.0
        _ -> 0.0
      end

    base_current_speed = 0.85 + rain * 0.55 + wind_z * 0.20
    seed = sim_state["seed"] || 42

    boats =
      Map.new(sim_state["boats"], fn {slot_str, boat} ->
        if boat["finished"] do
          {slot_str, boat}
        else
          slot = boat["slot"]
          player = Map.get(players, slot)
          input = (player && player[:input_state]) || %{}

          boost =
            if Map.get(input, "kind") == "push" and boat["boost"] <= 0.05 and boat["progress"] < 2.0 do
              0.40
            else
              max(0.0, boat["boost"] - 0.25 * @dt)
            end

          segment = trunc(boat["progress"] * 4)
          turb = pseudo_noise(seed, slot, segment)

          target_speed = max(0.2, base_current_speed + boost + turb)
          speed = boat["speed"] + (target_speed - boat["speed"]) * 0.15

          prev_prog = boat["progress"]
          new_prog = prev_prog + speed * @dt

          if new_prog >= @course_length do
            # Sub-tick exact arrival
            diff = max(0.001, new_prog - prev_prog)
            fraction = (@course_length - prev_prog) / diff
            sub_tick_ms = round(fraction * @dt * 1000)
            exact_ms = elapsed_ms - round(@dt * 1000) + sub_tick_ms

            updated =
              boat
              |> Map.put("progress", @course_length)
              |> Map.put("z", @finish_z)
              |> Map.put("speed", 0.0)
              |> Map.put("boost", 0.0)
              |> Map.put("finished", true)
              |> Map.put("finishTimeMs", max(0, exact_ms))

            {slot_str, updated}
          else
            updated =
              boat
              |> Map.put("progress", new_prog)
              |> Map.put("z", @start_z + new_prog)
              |> Map.put("speed", speed)
              |> Map.put("boost", boost)

            {slot_str, updated}
          end
        end
      end)

    all_boats = Map.values(boats)
    all_finished? = length(all_boats) > 0 and Enum.all?(all_boats, & &1["finished"])

    if all_finished? do
      ranked =
        Enum.sort_by(all_boats, fn b ->
          {b["finishTimeMs"], b["slot"]}
        end)

      winner_slot = List.first(ranked)["slot"]

      standings =
        Enum.with_index(ranked, 1)
        |> Enum.map(fn {b, rank} ->
          %{
            "rank" => rank,
            "slot" => b["slot"],
            "finishTimeMs" => b["finishTimeMs"]
          }
        end)

      sim_state =
        sim_state
        |> Map.put("elapsedMs", elapsed_ms)
        |> Map.put("tickCount", tick_count)
        |> Map.put("boats", boats)
        |> Map.put("status", "complete")
        |> Map.put("winner", winner_slot)
        |> Map.put("standings", standings)

      details = %{
        "winnerSlot" => winner_slot,
        "winnerTimeMs" => List.first(ranked)["finishTimeMs"],
        "standings" => standings,
        "reason" => "finish"
      }

      {sim_state, {:match_ended, winner_slot, details}}
    else
      sim_state =
        sim_state
        |> Map.put("elapsedMs", elapsed_ms)
        |> Map.put("tickCount", tick_count)
        |> Map.put("boats", boats)

      do_step_simulation(sim_state, players, steps - 1)
    end
  end

  defp pseudo_noise(seed, slot, segment) do
    n = rem(seed * 37 + slot * 101 + segment * 13, 1000)
    ((n / 1000.0) - 0.5) * 0.12
  end
end
