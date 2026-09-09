defmodule Afterlight.Activities.Curling do
  @moduledoc """
  Authoritative curling simulation (Tasks 8.7 & 8.8).

  Specifications:
  - signature-place-activities/spec.md (Camp and ice / Curling end)
  - design.md D3 (pause during grace, forfeit incomplete side, abort if both incomplete)
  - design.md D5 / D7 (server planar physics; ice friction from frozen environment defaults)

  Contract: `init_sim_state/1`, `apply_input/3`, `step_simulation/3`.
  """

  @rules_version 1
  @total_ends 4
  @stones_per_side 4
  @dt 1.0 / 60.0

  @sheet_width 4.2
  @hack_z -3.6
  @house_x 0.0
  @house_z 3.2
  @house_radius 1.05
  @stone_radius 0.145
  @back_line_z 3.2 + 1.05 + 0.35

  @aim_min -0.28
  @aim_max 0.28
  @power_min 0.15
  @power_max 1.0
  @curl_min -1.0
  @curl_max 1.0

  @stop_speed 0.045
  @board_restitution 0.32
  @stone_restitution 0.9

  @default_env %{
    "version" => 1,
    "policy" => "frozen",
    "preset" => nil,
    "wind" => [0.0, 0.0],
    "windSpeed" => 0.0,
    "rain" => 0.0,
    "intensity" => 0.35,
    "wetness" => 0.15,
    "timePhase" => 0.0,
    "frozenAt" => 0
  }

  def rules_version, do: @rules_version
  def total_ends, do: @total_ends
  def stones_per_side, do: @stones_per_side
  def house, do: {@house_x, @house_z, @house_radius}

  @doc """
  Initializes curling simulation state.

  Options:
  - `:slots` or `"activeSlots"` — `[0, 1]` (1v1) or `[0, 1, 2, 3]` (2v2)
  - `:environment` — frozen activity environment snapshot
  """
  def init_sim_state(opts \\ []) do
    slots = resolve_slots(opts)
    team_size = if length(slots) >= 4, do: 2, else: 1
    env = resolve_env(opts)
    hammer = 1
    current_slot = thrower_for_stone(0, team_size, hammer)

    %{
      "rulesVersion" => @rules_version,
      "status" => "aiming",
      "teamSize" => team_size,
      "activeSlots" => slots,
      "currentEnd" => 1,
      "totalEnds" => @total_ends,
      "extraEnd" => false,
      "hammerTeam" => hammer,
      "currentTeam" => team_for_slot(current_slot, team_size),
      "currentSlot" => current_slot,
      "stonesThrown" => 0,
      "stonesPerSide" => @stones_per_side,
      "stones" => [],
      "pending" => %{"aim" => 0.0, "power" => 0.62, "curl" => 0.0},
      "sweepers" => %{},
      "score" => %{"0" => 0, "1" => 0},
      "endHistory" => [],
      "winner" => nil,
      "outcome" => nil,
      "pauseReason" => nil,
      "resumeStatus" => nil,
      "environment" => env,
      "iceFriction" => ice_friction(env),
      "tick" => 0
    }
  end

  @doc "Applies a single validated input from `slot`."
  def apply_input(sim_state, slot, controls) when is_map(sim_state) do
    case validate_controls(controls) do
      {:ok, input} -> do_apply(sim_state, to_int(slot), input)
      {:error, _} -> {sim_state, nil}
    end
  end

  def apply_input(sim_state, _slot, _controls), do: {sim_state, nil}

  @doc "Applies pending player inputs, then steps in-flight physics."
  def step_simulation(sim_state, players, steps \\ 1)

  def step_simulation(sim_state, players, steps)
      when is_map(sim_state) and is_integer(steps) and steps > 0 do
    {state, input_event} = consume_inputs(sim_state, players)

    if state["status"] != "in_flight" do
      {state, input_event}
    else
      step_in_flight(state, players, min(max(steps, 1), 8), input_event)
    end
  end

  def step_simulation(sim_state, _players, _steps), do: {sim_state, nil}

  defp step_in_flight(sim_state, players, n, input_event) do
    state = fold_sweep_inputs(sim_state, players)
    decel = ice_deceleration(state["environment"], sweep_strength(state))

    {final, event} =
      Enum.reduce_while(1..n, {state, nil}, fn _, {curr, _} ->
        curr = Map.update(curr, "tick", 1, &(&1 + 1))
        stones = Enum.map(curr["stones"], &step_stone(&1, decel, @dt))
        stones = resolve_collisions(stones)
        curr = settle(Map.put(curr, "stones", stones))

        cond do
          curr["status"] == "complete" ->
            {:halt, {curr, ended_outcome(curr)}}

          curr["status"] == "aborted" ->
            {:halt, {curr, {:match_aborted, %{"reason" => curr["outcome"] || "aborted"}}}}

          curr["status"] != "in_flight" ->
            {:halt, {curr, %{"type" => "stone_rested", "stonesThrown" => curr["stonesThrown"]}}}

          true ->
            {:cont, {curr, input_event}}
        end
      end)

    {final, event}
  end

  def validate_controls(controls) when is_map(controls) do
    kind = Map.get(controls, "kind") || Map.get(controls, :kind) || "launch"

    case kind do
      "neutral" ->
        {:ok, %{"kind" => "neutral"}}

      kind when kind in ["pause", "resume"] ->
        {:ok, %{"kind" => kind}}

      "disconnect" ->
        remaining =
          (Map.get(controls, "remainingSlots") || Map.get(controls, :remaining_slots) || [])
          |> List.wrap()
          |> Enum.map(&to_int/1)

        {:ok, %{"kind" => "disconnect", "remainingSlots" => remaining}}

      "sweep" ->
        raw = Map.get(controls, "sweep", Map.get(controls, :sweep, 0))
        sweep = if raw in [true, 1, "1"], do: 1, else: 0
        {:ok, %{"kind" => "sweep", "sweep" => sweep}}

      kind when kind in ["aim", "launch"] ->
        {:ok,
         %{
           "kind" => kind,
           "aim" => clamp(to_float(Map.get(controls, "aim", Map.get(controls, :aim, 0.0))), @aim_min, @aim_max),
           "power" =>
             clamp(to_float(Map.get(controls, "power", Map.get(controls, :power, 0.62))), @power_min, @power_max),
           "curl" => clamp(to_float(Map.get(controls, "curl", Map.get(controls, :curl, 0.0))), @curl_min, @curl_max)
         }}

      _ ->
        {:error, :unknown_kind}
    end
  end

  def validate_controls(_), do: {:error, :invalid_controls}

  def ice_friction(env) when is_map(env) do
    wetness = clamp(to_float(Map.get(env, "wetness", 0.15)), 0.0, 1.0)
    intensity = clamp(to_float(Map.get(env, "intensity", 0.35)), 0.0, 1.0)
    clamp(1.0 - wetness * 0.35 - intensity * 0.08, 0.55, 1.0)
  end

  def ice_friction(_), do: ice_friction(@default_env)

  def ice_deceleration(env, sweep_strength) do
    slip = ice_friction(env)
    base = 3.55 / slip
    sweep = 1.0 - clamp(to_float(sweep_strength), 0.0, 2.0) * 0.16
    base * sweep
  end

  def team_for_slot(slot, 2) when slot <= 1, do: 0
  def team_for_slot(_slot, 2), do: 1
  def team_for_slot(0, _), do: 0
  def team_for_slot(_, _), do: 1

  def slots_for_team(0, 2), do: [0, 1]
  def slots_for_team(1, 2), do: [2, 3]
  def slots_for_team(0, _), do: [0]
  def slots_for_team(1, _), do: [1]

  def thrower_for_stone(stone_index, team_size, hammer_team) do
    first_team = 1 - hammer_team
    team = if rem(stone_index, 2) == 0, do: first_team, else: hammer_team

    if team_size == 1 do
      if team == 0, do: 0, else: 1
    else
      offset = rem(div(stone_index, 2), 2)
      if team == 0, do: offset, else: 2 + offset
    end
  end

  def score_end(stones) do
    in_house =
      stones
      |> List.wrap()
      |> Enum.reject(& &1["out"])
      |> Enum.filter(fn s ->
        dx = to_float(s["x"]) - @house_x
        dz = to_float(s["z"]) - @house_z
        :math.sqrt(dx * dx + dz * dz) <= @house_radius + @stone_radius
      end)

    if in_house == [] do
      %{"scoringTeam" => nil, "points" => 0}
    else
      ranked =
        in_house
        |> Enum.map(fn s ->
          dx = to_float(s["x"]) - @house_x
          dz = to_float(s["z"]) - @house_z
          {s["team"], :math.sqrt(dx * dx + dz * dz)}
        end)
        |> Enum.sort_by(fn {_team, d} -> d end)

      {closest_team, _} = hd(ranked)
      opposing = Enum.find(ranked, fn {team, _} -> team != closest_team end)
      cutoff = if opposing, do: elem(opposing, 1), else: 1.0e12

      scoring =
        Enum.filter(ranked, fn {team, d} -> team == closest_team and d < cutoff - 1.0e-9 end)

      if scoring == [] do
        %{"scoringTeam" => nil, "points" => 0}
      else
        %{"scoringTeam" => closest_team, "points" => length(scoring)}
      end
    end
  end

  def apply_disconnect(sim_state, remaining_slots) do
    remaining = MapSet.new(Enum.map(List.wrap(remaining_slots), &to_int/1))
    team_size = sim_state["teamSize"]
    t0 = Enum.all?(slots_for_team(0, team_size), &MapSet.member?(remaining, &1))
    t1 = Enum.all?(slots_for_team(1, team_size), &MapSet.member?(remaining, &1))

    cond do
      t0 and t1 ->
        {sim_state, nil}

      not t0 and t1 ->
        state =
          sim_state
          |> Map.put("status", "complete")
          |> Map.put("winner", 1)
          |> Map.put("outcome", "forfeit")
          |> Map.put("pauseReason", nil)

        {state, %{"type" => "match_ended", "winner" => 1, "reason" => "forfeit"}}

      not t1 and t0 ->
        state =
          sim_state
          |> Map.put("status", "complete")
          |> Map.put("winner", 0)
          |> Map.put("outcome", "forfeit")
          |> Map.put("pauseReason", nil)

        {state, %{"type" => "match_ended", "winner" => 0, "reason" => "forfeit"}}

      true ->
        state =
          sim_state
          |> Map.put("status", "aborted")
          |> Map.put("winner", nil)
          |> Map.put("outcome", "aborted")
          |> Map.put("pauseReason", nil)

        {state, %{"type" => "match_aborted", "reason" => "both_sides_incomplete"}}
    end
  end

  defp do_apply(%{"status" => status} = state, _slot, %{"kind" => "pause"})
       when status in ["complete", "aborted"] do
    {state, nil}
  end

  defp do_apply(state, _slot, %{"kind" => "pause"}) do
    state =
      if state["status"] != "paused" do
        state
        |> Map.put("resumeStatus", state["status"])
        |> Map.put("status", "paused")
        |> Map.put("pauseReason", "disconnect_grace")
      else
        state
      end

    {state, %{"type" => "paused", "reason" => "disconnect_grace"}}
  end

  defp do_apply(%{"status" => "paused"} = state, _slot, %{"kind" => "resume"}) do
    state =
      state
      |> Map.put("status", state["resumeStatus"] || "aiming")
      |> Map.put("pauseReason", nil)
      |> Map.put("resumeStatus", nil)

    {state, %{"type" => "resumed"}}
  end

  defp do_apply(state, _slot, %{"kind" => "resume"}), do: {state, nil}

  defp do_apply(state, _slot, %{"kind" => "disconnect", "remainingSlots" => remaining}) do
    apply_disconnect(state, remaining)
  end

  defp do_apply(%{"status" => status} = state, _slot, _input)
       when status in ["paused", "complete", "aborted"] do
    {state, nil}
  end

  defp do_apply(state, slot, %{"kind" => "aim"} = input) do
    if state["status"] == "aiming" and slot == state["currentSlot"] do
      pending = %{"aim" => input["aim"], "power" => input["power"], "curl" => input["curl"]}
      {Map.put(state, "pending", pending), nil}
    else
      {state, nil}
    end
  end

  defp do_apply(state, slot, %{"kind" => "sweep", "sweep" => sweep}) do
    if slot in state["activeSlots"] and state["status"] == "in_flight" and
         team_for_slot(slot, state["teamSize"]) == state["currentTeam"] do
      sweepers =
        state
        |> Map.get("sweepers", %{})
        |> Map.put(to_string(slot), sweep)

      {Map.put(state, "sweepers", sweepers), %{"type" => "sweep", "slot" => slot, "sweep" => sweep}}
    else
      {state, nil}
    end
  end

  defp do_apply(state, slot, %{"kind" => "launch"} = input) do
    cond do
      state["status"] != "aiming" or slot != state["currentSlot"] ->
        {state, nil}

      state["stonesThrown"] >= @stones_per_side * 2 ->
        {state, nil}

      true ->
        v0 = 2.4 + input["power"] * 7.2
        thrown = state["stonesThrown"]

        stone = %{
          "id" => "e#{state["currentEnd"]}-n#{thrown}",
          "team" => state["currentTeam"],
          "slot" => slot,
          "x" => 0.0,
          "z" => @hack_z,
          "vx" => :math.sin(input["aim"]) * v0,
          "vz" => :math.cos(input["aim"]) * v0,
          "omega" => input["curl"] * 2.8,
          "radius" => @stone_radius,
          "moving" => true,
          "out" => false
        }

        state =
          state
          |> Map.update("stones", [stone], &(&1 ++ [stone]))
          |> Map.put("stonesThrown", thrown + 1)
          |> Map.put("status", "in_flight")
          |> Map.put("pending", %{"aim" => input["aim"], "power" => input["power"], "curl" => input["curl"]})
          |> Map.put("sweepers", %{})

        {state, %{"type" => "stone_launched", "slot" => slot, "stoneId" => stone["id"]}}
    end
  end

  defp do_apply(state, _slot, _), do: {state, nil}

  defp finish_end(state) do
    result = score_end(state["stones"])
    scoring_team = result["scoringTeam"]
    points = result["points"]

    history_entry = %{
      "end" => state["currentEnd"],
      "extra" => state["extraEnd"],
      "scoringTeam" => scoring_team,
      "points" => points,
      "hammerTeam" => state["hammerTeam"]
    }

    score = state["score"] || %{"0" => 0, "1" => 0}

    score =
      if scoring_team != nil and points > 0 do
        key = to_string(scoring_team)
        Map.put(score, key, Map.get(score, key, 0) + points)
      else
        score
      end

    state =
      state
      |> Map.put("score", score)
      |> Map.update("endHistory", [history_entry], &(&1 ++ [history_entry]))

    s0 = Map.get(score, "0", 0)
    s1 = Map.get(score, "1", 0)
    regulation_over? = state["currentEnd"] >= state["totalEnds"] and not state["extraEnd"]
    extra_just? = state["extraEnd"]

    cond do
      (regulation_over? or extra_just?) and s0 != s1 ->
        winner = if s0 > s1, do: 0, else: 1

        state
        |> Map.put("status", "complete")
        |> Map.put("winner", winner)
        |> Map.put("outcome", "complete")

      regulation_over? and s0 == s1 ->
        next_hammer = if scoring_team == nil, do: state["hammerTeam"], else: 1 - scoring_team
        reset_end(state, state["currentEnd"] + 1, next_hammer, true)

      extra_just? and s0 == s1 ->
        next_hammer = if scoring_team == nil, do: state["hammerTeam"], else: 1 - scoring_team
        reset_end(state, state["currentEnd"] + 1, next_hammer, true)

      true ->
        next_hammer = if scoring_team == nil, do: state["hammerTeam"], else: 1 - scoring_team
        reset_end(state, state["currentEnd"] + 1, next_hammer, false)
    end
  end

  defp reset_end(state, next_end, hammer, extra?) do
    current_slot = thrower_for_stone(0, state["teamSize"], hammer)

    state
    |> Map.put("currentEnd", next_end)
    |> Map.put("extraEnd", extra?)
    |> Map.put("hammerTeam", hammer)
    |> Map.put("currentSlot", current_slot)
    |> Map.put("currentTeam", team_for_slot(current_slot, state["teamSize"]))
    |> Map.put("stonesThrown", 0)
    |> Map.put("stones", [])
    |> Map.put("sweepers", %{})
    |> Map.put("status", "aiming")
    |> Map.put("pending", %{"aim" => 0.0, "power" => 0.62, "curl" => 0.0})
  end

  defp settle(state) do
    any_moving? = Enum.any?(state["stones"], fn s -> s["moving"] and not s["out"] end)

    if any_moving? do
      state
    else
      state = Map.put(state, "sweepers", %{})

      if state["stonesThrown"] >= @stones_per_side * 2 do
        finish_end(state)
      else
        next_slot = thrower_for_stone(state["stonesThrown"], state["teamSize"], state["hammerTeam"])

        state
        |> Map.put("currentSlot", next_slot)
        |> Map.put("currentTeam", team_for_slot(next_slot, state["teamSize"]))
        |> Map.put("status", "aiming")
      end
    end
  end

  defp step_stone(%{"moving" => false} = stone, _decel, _dt), do: stone
  defp step_stone(%{"out" => true} = stone, _decel, _dt), do: stone

  defp step_stone(stone, decel, dt) do
    vx = to_float(stone["vx"])
    vz = to_float(stone["vz"])
    omega = to_float(stone["omega"])
    speed = :math.sqrt(vx * vx + vz * vz)

    stone =
      if speed < @stop_speed and abs(omega) < 0.08 do
        stone
        |> Map.put("vx", 0.0)
        |> Map.put("vz", 0.0)
        |> Map.put("omega", 0.0)
        |> Map.put("moving", false)
      else
        {vx, vz} =
          if speed > 1.0e-6 do
            drop = min(speed, decel * dt)
            scale = (speed - drop) / speed
            vx = vx * scale
            vz = vz * scale
            curl = omega * speed * 0.11
            tx = -vz / speed
            tz = vx / speed
            {vx + tx * curl * dt, vz + tz * curl * dt}
          else
            {vx, vz}
          end

        stone
        |> Map.put("x", to_float(stone["x"]) + vx * dt)
        |> Map.put("z", to_float(stone["z"]) + vz * dt)
        |> Map.put("vx", vx)
        |> Map.put("vz", vz)
        |> Map.put("omega", omega * 0.988)
      end

    bounce_boards(stone)
  end

  defp bounce_boards(stone) do
    half = @sheet_width / 2.0 - @stone_radius
    x = to_float(stone["x"])
    z = to_float(stone["z"])
    vx = to_float(stone["vx"])
    vz = to_float(stone["vz"])
    omega = to_float(stone["omega"])

    {x, vx, vz, omega} =
      cond do
        x < -half -> {-half, abs(vx) * @board_restitution, vz * 0.85, omega * 0.7}
        x > half -> {half, -abs(vx) * @board_restitution, vz * 0.85, omega * 0.7}
        true -> {x, vx, vz, omega}
      end

    min_z = @hack_z - 0.25

    {z, vz} =
      if z < min_z do
        {min_z, abs(vz) * @board_restitution}
      else
        {z, vz}
      end

    if z > @back_line_z do
      stone
      |> Map.put("x", x)
      |> Map.put("z", z)
      |> Map.put("vx", 0.0)
      |> Map.put("vz", 0.0)
      |> Map.put("omega", 0.0)
      |> Map.put("moving", false)
      |> Map.put("out", true)
    else
      stone
      |> Map.put("x", x)
      |> Map.put("z", z)
      |> Map.put("vx", vx)
      |> Map.put("vz", vz)
      |> Map.put("omega", omega)
    end
  end

  defp resolve_collisions(stones) do
    n = length(stones)

    if n < 2 do
      stones
    else
      for i <- 0..(n - 2), j <- (i + 1)..(n - 1), reduce: stones do
        acc ->
          {a2, b2} = collide(Enum.at(acc, i), Enum.at(acc, j))
          acc |> List.replace_at(i, a2) |> List.replace_at(j, b2)
      end
    end
  end

  defp collide(a, b) do
    if a["out"] or b["out"] do
      {a, b}
    else
      collide_live(a, b)
    end
  end

  defp collide_live(a, b) do
    dx = to_float(b["x"]) - to_float(a["x"])
    dz = to_float(b["z"]) - to_float(a["z"])
    dist = :math.sqrt(dx * dx + dz * dz)
    min = @stone_radius + @stone_radius

    if dist >= min or dist < 1.0e-8 do
      {a, b}
    else
      nx = dx / dist
      nz = dz / dist
      overlap = min - dist
      ax = to_float(a["x"]) - nx * overlap * 0.5
      az = to_float(a["z"]) - nz * overlap * 0.5
      bx = to_float(b["x"]) + nx * overlap * 0.5
      bz = to_float(b["z"]) + nz * overlap * 0.5

      rel = (to_float(a["vx"]) - to_float(b["vx"])) * nx + (to_float(a["vz"]) - to_float(b["vz"])) * nz

      if rel > 0.0 do
        impulse = rel * (1.0 + @stone_restitution) * 0.5
        spin = rel * 0.15

        avx = to_float(a["vx"]) - impulse * nx
        avz = to_float(a["vz"]) - impulse * nz
        bvx = to_float(b["vx"]) + impulse * nx
        bvz = to_float(b["vz"]) + impulse * nz

        a =
          a
          |> Map.put("x", ax)
          |> Map.put("z", az)
          |> Map.put("vx", avx)
          |> Map.put("vz", avz)
          |> Map.put("omega", to_float(a["omega"]) - spin)
          |> Map.put("moving", :math.sqrt(avx * avx + avz * avz) >= @stop_speed)

        b =
          b
          |> Map.put("x", bx)
          |> Map.put("z", bz)
          |> Map.put("vx", bvx)
          |> Map.put("vz", bvz)
          |> Map.put("omega", to_float(b["omega"]) + spin)
          |> Map.put("moving", :math.sqrt(bvx * bvx + bvz * bvz) >= @stop_speed)

        {a, b}
      else
        a = a |> Map.put("x", ax) |> Map.put("z", az)
        b = b |> Map.put("x", bx) |> Map.put("z", bz)
        {a, b}
      end
    end
  end

  defp consume_inputs(state, players) when is_map(players) do
    Enum.reduce(players, {state, nil}, fn {key, player}, {acc, ev} ->
      slot = to_int(Map.get(player, :slot) || Map.get(player, "slot") || key)
      input = Map.get(player, :input_state) || Map.get(player, "input_state") || %{}
      seq = Map.get(player, :last_seq) || Map.get(player, "last_seq") || 0
      applied = acc["appliedSeq"] || %{}
      slot_key = to_string(slot)

      if not is_map(input) or map_size(input) == 0 or Map.get(applied, slot_key, -1) == seq do
        {acc, ev}
      else
        {next, new_ev} = apply_input(acc, slot, input)
        next = Map.put(next, "appliedSeq", Map.put(applied, slot_key, seq))
        {next, normalize_event(next, new_ev) || ev}
      end
    end)
  end

  defp consume_inputs(state, _), do: {state, nil}

  defp normalize_event(state, %{"type" => "match_ended"} = ev) do
    ended_outcome(Map.merge(state, %{"winner" => ev["winner"], "outcome" => ev["reason"] || state["outcome"]}))
  end

  defp normalize_event(_state, %{"type" => "match_aborted"} = ev) do
    {:match_aborted, ev}
  end

  defp normalize_event(_state, ev), do: ev

  defp ended_outcome(state) do
    {:match_ended, state["winner"],
     %{
       "winnerSlot" => state["winner"],
       "reason" => state["outcome"] || "complete",
       "score" => state["score"]
     }}
  end

  defp fold_sweep_inputs(state, players) when is_map(players) do
    Enum.reduce(players, state, fn {key, player}, acc ->
      slot = to_int(Map.get(player, :slot) || Map.get(player, "slot") || key)
      input = Map.get(player, :input_state) || Map.get(player, "input_state") || %{}

      if is_map(input) and (Map.get(input, "kind") == "sweep" or Map.has_key?(input, "sweep")) do
        case validate_controls(%{"kind" => "sweep", "sweep" => Map.get(input, "sweep")}) do
          {:ok, %{"sweep" => sweep}} ->
            if team_for_slot(slot, acc["teamSize"]) == acc["currentTeam"] do
              sweepers = Map.put(acc["sweepers"] || %{}, to_string(slot), sweep)
              Map.put(acc, "sweepers", sweepers)
            else
              acc
            end

          _ ->
            acc
        end
      else
        acc
      end
    end)
  end

  defp fold_sweep_inputs(state, _), do: state

  defp sweep_strength(state) do
    slots_for_team(state["currentTeam"], state["teamSize"])
    |> Enum.count(fn slot ->
      Map.get(state["sweepers"] || %{}, to_string(slot), Map.get(state["sweepers"] || %{}, slot, 0)) in [1, true]
    end)
  end

  defp resolve_slots(opts) when is_list(opts) do
    case Keyword.get(opts, :slots) || Keyword.get(opts, :active_slots) do
      list when is_list(list) -> Enum.map(list, &to_int/1)
      _ -> [0, 1]
    end
  end

  defp resolve_slots(%{"activeSlots" => list}) when is_list(list), do: Enum.map(list, &to_int/1)
  defp resolve_slots(%{active_slots: list}) when is_list(list), do: Enum.map(list, &to_int/1)
  defp resolve_slots(%{slots: list}) when is_list(list), do: Enum.map(list, &to_int/1)
  defp resolve_slots(_), do: [0, 1]

  defp resolve_env(opts) when is_list(opts) do
    case Keyword.get(opts, :environment) do
      env when is_map(env) -> Map.merge(@default_env, stringify_keys(env))
      _ -> @default_env
    end
  end

  defp resolve_env(%{"environment" => env}) when is_map(env), do: Map.merge(@default_env, stringify_keys(env))
  defp resolve_env(_), do: @default_env

  defp stringify_keys(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {k, v}
    end)
  end

  defp to_int(v) when is_integer(v), do: v
  defp to_int(v) when is_binary(v) do
    case Integer.parse(v) do
      {n, _} -> n
      :error -> 0
    end
  end
  defp to_int(_), do: 0

  defp to_float(v) when is_float(v), do: v
  defp to_float(v) when is_integer(v), do: v * 1.0
  defp to_float(_), do: 0.0

  defp clamp(v, lo, hi) when is_number(v), do: max(lo, min(hi, v * 1.0))
  defp clamp(_, lo, _), do: lo * 1.0
end
