defmodule Afterlight.Activities.PaperAirplane do
  @moduledoc """
  Authoritative server-side Paper Airplane simulation and scoring (Task 7.4).

  Specifications:
  - `openspec/changes/add-place-activities-program/specs/signature-place-activities/spec.md`
    (Requirement: Rooftop flight)
  - `design.md` (D5, D7)

  Guarantees:
  - Aerodynamic trajectory calculation under frozen environment wind.
  - Consistent reproducible distance results across clients.
  - Multi-round contest (3 rounds) with tie scoring rules.
  """

  @rules_version 1
  @rounds 3
  @dt 1.0 / 60.0
  @max_flight_time 12.0
  @air_density 1.225
  @gravity 9.81

  @fold_styles %{
    "classic" => %{
      mass: 0.005,
      wing_area: 0.022,
      lift_coeff: 0.45,
      drag_coeff: 0.12,
      wind_sensitivity: 1.0
    },
    "dart" => %{
      mass: 0.006,
      wing_area: 0.015,
      lift_coeff: 0.28,
      drag_coeff: 0.07,
      wind_sensitivity: 0.65
    },
    "glider" => %{
      mass: 0.004,
      wing_area: 0.032,
      lift_coeff: 0.62,
      drag_coeff: 0.16,
      wind_sensitivity: 1.45
    }
  }

  def fold_styles, do: @fold_styles
  def total_rounds, do: @rounds

  @doc """
  Initializes paper airplane simulation state.
  """
  def init_sim_state(opts \\ []) do
    slots =
      case Keyword.get(opts, :slots) do
        nil -> [0, 1]
        list when is_list(list) -> list
      end

    env = Keyword.get(opts, :environment)

    players =
      Map.new(slots, fn slot ->
        p = %{
          "slot" => slot,
          "currentRound" => 1,
          "throws" => [],
          "bestDistance" => 0.0,
          "currentFlight" => nil,
          "readyForThrow" => false
        }

        {to_string(slot), p}
      end)

    %{
      "rulesVersion" => @rules_version,
      "totalRounds" => @rounds,
      "currentRound" => 1,
      "status" => "aiming",
      "activeSlots" => slots,
      "players" => players,
      "winner" => nil,
      "standings" => [],
      "environment" => env
    }
  end

  @doc """
  Validates player launch controls.
  """
  def validate_controls(controls) when is_map(controls) do
    kind = Map.get(controls, "kind", "launch")

    case kind do
      "neutral" ->
        {:ok, %{"kind" => "neutral"}}

      "ready" ->
        {:ok, %{"kind" => "ready"}}

      "launch" ->
        fold =
          case Map.get(controls, "foldStyle", "classic") do
            s when is_binary(s) ->
              down = String.downcase(s)
              if Map.has_key?(@fold_styles, down), do: down, else: "classic"

            _ ->
              "classic"
          end

        yaw = clamp(float_or(Map.get(controls, "yaw"), 0.0), -0.75, 0.75)
        pitch = clamp(float_or(Map.get(controls, "pitch"), 0.25), -0.15, 0.80)
        power = clamp(float_or(Map.get(controls, "power"), 0.6), 0.1, 1.0)

        {:ok,
         %{
           "kind" => "launch",
           "foldStyle" => fold,
           "yaw" => yaw,
           "pitch" => pitch,
           "power" => power
         }}

      _ ->
        {:error, :unknown_kind}
    end
  end

  def validate_controls(_), do: {:error, :invalid_controls}

  @doc """
  Simulates full paper airplane flight given launch parameters and environment.
  """
  def simulate_flight(launch, environment, origin \\ [7.5, 1.2, -7.5]) do
    fold_name = Map.get(launch, "foldStyle", "classic")
    fold = Map.get(@fold_styles, fold_name, @fold_styles["classic"])

    {wind_x, wind_z} =
      case environment do
        %{"wind" => [wx, wz]} when is_number(wx) and is_number(wz) ->
          {wx * 1.0 * fold.wind_sensitivity, wz * 1.0 * fold.wind_sensitivity}

        _ ->
          {0.0, 0.0}
      end

    yaw = Map.get(launch, "yaw", 0.0) * 1.0
    pitch = Map.get(launch, "pitch", 0.25) * 1.0
    power = Map.get(launch, "power", 0.6) * 1.0

    v0 = 5.0 + power * 16.0
    forward_x = :math.sin(yaw)
    forward_z = -:math.cos(yaw)
    cos_pitch = :math.cos(pitch)
    sin_pitch = :math.sin(pitch)

    [ox, oy, oz] = origin
    vx = forward_x * cos_pitch * v0
    vy = sin_pitch * v0
    vz = forward_z * cos_pitch * v0

    max_ticks = round(@max_flight_time / @dt)

    initial_pt = %{
      "x" => round_3(ox),
      "y" => round_3(oy),
      "z" => round_3(oz),
      "t" => 0.0,
      "vx" => round_3(vx),
      "vy" => round_3(vy),
      "vz" => round_3(vz)
    }

    {trajectory, final_pos, total_t} =
      do_simulate(
        [initial_pt],
        {ox, oy, oz},
        {vx, vy, vz},
        {wind_x, wind_z},
        fold,
        0.0,
        max_ticks
      )

    {fx, fy, fz} = final_pos
    dx = fx - ox
    dz = fz - oz
    dist = Float.round(:math.sqrt(dx * dx + dz * dz), 2)
    flight_ms = round(total_t * 1000)

    %{
      trajectory: Enum.reverse(trajectory),
      landing_pos: [Float.round(fx, 2), Float.round(fy, 2), Float.round(fz, 2)],
      distance: dist,
      flight_time_ms: flight_ms
    }
  end

  defp do_simulate(traj, {px, py, pz}, _vel, _wind, _fold, t, 0) do
    {traj, {px, max(0.0, py), pz}, t}
  end

  defp do_simulate(traj, {px, py, pz}, {vx, vy, vz}, {wx, wz}, fold, t, ticks_left) do
    new_t = t + @dt

    rel_vx = vx - wx
    rel_vz = vz - wz
    h_speed_sq = rel_vx * rel_vx + rel_vz * rel_vz
    rel_speed = :math.sqrt(rel_vx * rel_vx + vy * vy + rel_vz * rel_vz)

    {new_vx, new_vy, new_vz} =
      if rel_speed > 0.001 do
        q_h = 0.5 * @air_density * h_speed_sq
        lift_y = min(fold.mass * @gravity * 1.6, q_h * fold.wing_area * fold.lift_coeff)

        drag_factor = 0.5 * @air_density * rel_speed * fold.wing_area * fold.drag_coeff
        ax = -drag_factor * rel_vx / fold.mass
        ay = (lift_y - drag_factor * vy) / fold.mass - @gravity
        az = -drag_factor * rel_vz / fold.mass

        {
          vx + ax * @dt,
          vy + ay * @dt,
          vz + az * @dt
        }
      else
        {vx, vy - @gravity * @dt, vz}
      end

    new_px = px + new_vx * @dt
    new_py = py + new_vy * @dt
    new_pz = pz + new_vz * @dt

    pt = %{
      "x" => round_3(new_px),
      "y" => round_3(new_py),
      "z" => round_3(new_pz),
      "t" => round_3(new_t),
      "vx" => round_3(new_vx),
      "vy" => round_3(new_vy),
      "vz" => round_3(new_vz)
    }

    if new_py <= 0.0 do
      {[pt | traj], {new_px, 0.0, new_pz}, new_t}
    else
      do_simulate(
        [pt | traj],
        {new_px, new_py, new_pz},
        {new_vx, new_vy, new_vz},
        {wx, wz},
        fold,
        new_t,
        ticks_left - 1
      )
    end
  end

  @doc """
  Advances the paper airplane simulation. Processes any pending player throws.
  """
  def step_simulation(sim_state, players, _steps \\ 1) do
    if sim_state["status"] == "complete" do
      {sim_state, nil}
    else
      # Process pending launches from player inputs
      {sim_state, _events, ended?} =
        Enum.reduce(players, {sim_state, [], false}, fn {slot, player}, {acc_state, acc_evs, acc_ended} ->
          input = player[:input_state] || %{}

          if Map.get(input, "kind") == "launch" and not already_thrown?(acc_state, slot) do
            {new_state, ev, match_ended?} = execute_launch(acc_state, slot, input)
            new_evs = if ev, do: [ev | acc_evs], else: acc_evs
            {new_state, new_evs, acc_ended or match_ended?}
          else
            {acc_state, acc_evs, acc_ended}
          end
        end)

      if ended? do
        winner_slot = sim_state["winner"]
        details = %{
          "winnerSlot" => winner_slot,
          "standings" => sim_state["standings"],
          "reason" => "rounds_complete"
        }

        {sim_state, {:match_ended, winner_slot, details}}
      else
        {sim_state, nil}
      end
    end
  end

  defp already_thrown?(sim_state, slot) do
    slot_str = to_string(slot)

    case get_in(sim_state, ["players", slot_str]) do
      nil -> true
      p -> length(p["throws"]) >= p["currentRound"]
    end
  end

  defp execute_launch(sim_state, slot, launch_params) do
    slot_str = to_string(slot)
    player = get_in(sim_state, ["players", slot_str])

    if is_nil(player) or sim_state["status"] == "complete" do
      {sim_state, nil, false}
    else
      case validate_controls(launch_params) do
        {:ok, %{"kind" => "launch"} = launch} ->
          origin_x = 7.0 + slot * 0.8
          origin = [origin_x, 1.2, -7.5]

          result = simulate_flight(launch, sim_state["environment"], origin)

          throw_record = %{
            "round" => player["currentRound"],
            "launch" => launch,
            "origin" => origin,
            "landingPos" => result.landing_pos,
            "distance" => result.distance,
            "flightTimeMs" => result.flight_time_ms,
            "trajectory" => result.trajectory
          }

          throws = player["throws"] ++ [throw_record]
          best_dist = max(player["bestDistance"], result.distance)

          updated_player =
            player
            |> Map.put("throws", throws)
            |> Map.put("bestDistance", best_dist)
            |> Map.put("currentFlight", throw_record)

          sim_state = put_in(sim_state, ["players", slot_str], updated_player)

          all_players = Map.values(sim_state["players"])
          all_thrown? = Enum.all?(all_players, &(length(&1["throws"]) >= &1["currentRound"]))

          {sim_state, match_ended?} =
            if all_thrown? do
              if sim_state["currentRound"] >= @rounds do
                # Conclude match and compute standings
                ranked =
                  Enum.sort_by(all_players, fn p ->
                    # Primary: best distance descending
                    # Secondary: second best distance
                    p_throws =
                      p["throws"]
                      |> Enum.map(& &1["distance"])
                      |> Enum.sort(:desc)

                    {-p["bestDistance"], -Enum.at(p_throws, 1, 0.0)}
                  end)

                winner_slot = List.first(ranked)["slot"]

                standings =
                  Enum.with_index(ranked, 1)
                  |> Enum.map(fn {p, rank} ->
                    %{
                      "rank" => rank,
                      "slot" => p["slot"],
                      "bestDistance" => p["bestDistance"],
                      "throws" => Enum.map(p["throws"], & &1["distance"])
                    }
                  end)

                sim_state =
                  sim_state
                  |> Map.put("status", "complete")
                  |> Map.put("winner", winner_slot)
                  |> Map.put("standings", standings)

                {sim_state, true}
              else
                next_round = sim_state["currentRound"] + 1

                players =
                  Map.new(sim_state["players"], fn {s, p} ->
                    {s, Map.put(p, "currentRound", next_round)}
                  end)

                sim_state =
                  sim_state
                  |> Map.put("currentRound", next_round)
                  |> Map.put("players", players)

                {sim_state, false}
              end
            else
              {sim_state, false}
            end

          event = %{
            "type" => "airplane_launched",
            "slot" => slot,
            "payload" => %{
              "slot" => slot,
              "round" => throw_record["round"],
              "distance" => result.distance,
              "flightTimeMs" => result.flight_time_ms,
              "landingPos" => result.landing_pos
            }
          }

          {sim_state, event, match_ended?}

        _ ->
          {sim_state, nil, false}
      end
    end
  end

  defp clamp(val, min_v, max_v) do
    max(min_v, min(max_v, val))
  end

  defp float_or(val, _def) when is_float(val), do: val
  defp float_or(val, _def) when is_integer(val), do: val * 1.0
  defp float_or(_, def), do: def * 1.0

  defp round_3(val), do: Float.round(val * 1.0, 3)
end
