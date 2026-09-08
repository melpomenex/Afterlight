defmodule Afterlight.Activities.Snowboard do
  @moduledoc """
  Summit Run authoritative kinematics — the Elixir port of
  `shared/snowboard/rules.js` (add-multiplayer-snowboard-arcade 4.1, design
  D5). Pure data in, pure data out: no rigid-body dependency, no process
  state, no I/O.

  Parity contract (D10): this module and the JavaScript step must agree to
  ≤1cm position and 0.01 m/s velocity over the 180-second golden fixture,
  with exactly equal checkpoint/finish outcomes. The arithmetic below is
  therefore written in the SAME expression order as the JS original — do not
  "clean it up" without rerunning `tests/fixtures/snowboard/golden-
  movement.json` parity (`Afterlight.Activities.SnowboardTest`).

  Rider states are plain maps with the wire field names (string keys):
  `"s"`, `"u"`, `"v"`, `"vu"`, `"y"`, `"vy"`, `"grounded"`, `"jumpCharge"`,
  `"recoveryTicks"`, `"nextCheckpoint"`, `"finishTick"`, `"finishMs"`,
  `"finishKey"`, `"dnfReason"`, `"crossedRampIds"`,
  `"boundaryCooldownSeconds"`, `"splitKeys"`, `"resetSeq"`.
  """

  alias Afterlight.Activities.Snowboard.Course

  @dt 1 / 30
  @tuning %{
    grade_gravity: 9.81,
    grade_max: 0.6,
    tuck_accel: 4,
    cruise_accel: 1.5,
    drag_coefficient: 0.006,
    brake_decel: 12,
    shoulder_decel: 6,
    speed_min: 0,
    speed_max: 45,
    start_speed: 8,
    steer_speed_groomed: 10,
    steer_speed_tuck: 7,
    lateral_ground_approach: 8,
    lateral_air_approach: 2,
    carve_drag: 1.5,
    corridor_half_width: 24,
    groomed_half_width: 18,
    boundary_speed_loss_fraction: 0.2,
    boundary_cooldown_seconds: 0.5,
    gravity: 20,
    jump_base: 7,
    jump_charge_bonus: 6,
    jump_charge_seconds: 0.75,
    ramp_boost: 3,
    crash_impact_normal_speed: 16,
    crash_reset_speed: 8,
    crash_recovery_seconds: 0.75,
    rider_capsule_radius: 0.6,
    board_clearance: 0.5,
    ground_drop_launch_meters: 1.2,
    gate_altitude_ceiling: 30
  }

  @recovery_ticks trunc(:math.ceil(@tuning.crash_recovery_seconds / @dt))

  @doc """
  Whether snowboard-race admission is enabled. Disabled by default (design
  D10/Migration plan 4): operators enable it via the
  `AFTERLIGHT_SNOWBOARD_ENABLED` env var (or Application env). The flag gates
  admission and capability advertisement; clients treat it as presentation
  only and never as a security boundary. The Node-only legacy transport has
  no session authority at all and simply reports the activity unavailable.
  """
  def enabled? do
    Application.get_env(:afterlight, :snowboard_enabled, false)
  end

  @doc "Fixed step in seconds."
  def dt, do: @dt
  def recovery_ticks, do: @recovery_ticks
  def tuning, do: @tuning

  @doc """
  A fresh rider state at the start gate. `slot` spreads riders laterally so
  the start line never stacks a field of eight at one point.
  """
  def initial_state(slot, slot_count) when is_integer(slot) and is_integer(slot_count) do
    spread = 3

    offset =
      if slot_count > 1 do
        (slot - (slot_count - 1) / 2) * spread
      else
        0
      end

    %{
      "s" => 0,
      "u" => clamp(max(-12, min(12, offset)), -12, 12),
      "v" => @tuning.start_speed,
      "vu" => 0,
      "y" => 0,
      "vy" => 0,
      "grounded" => true,
      "jumpCharge" => 0,
      "recoveryTicks" => 0,
      "nextCheckpoint" => 1,
      "finishTick" => nil,
      "finishMs" => nil,
      "finishKey" => nil,
      "dnfReason" => nil,
      "crossedRampIds" => [],
      "boundaryCooldownSeconds" => 0,
      "splitKeys" => [],
      "resetSeq" => 0
    }
  end

  @doc "Neutral control shape (D7): steer 0, brake, no charge."
  def neutral_controls, do: %{"kind" => "neutral"}

  @doc """
  Normalizes a wire controls map (string keys, already protocol-validated)
  into the strict movement tuple the step consumes. Neutral or malformed
  input becomes braking-neutral per D5.
  """
  def normalize_controls(%{"kind" => "neutral"}), do: %{steer: 0.0, tuck: false, brake: true, jump_held: false}

  def normalize_controls(controls) when is_map(controls) do
    steer =
      case controls["steer"] do
        v when is_number(v) -> clamp(v * 1.0, -1.0, 1.0)
        _ -> 0.0
      end

    %{
      steer: steer,
      tuck: controls["tuck"] == true,
      brake: controls["brake"] != false,
      jump_held: controls["jumpHeld"] == true
    }
  end

  def normalize_controls(_other), do: normalize_controls(neutral_controls())

  @doc """
  Advance one rider one 30 Hz tick. Evaluation order (D5, normative):
  recovery → grade/motion → boundary → jump/lips → swept obstacles →
  terrain contact → ordered gates → terminal. Returns `{rider, events}`
  with events as plain maps (`checkpoint`, `finish`, `crash`, `launch`,
  `landing`, `boundary_hit`, `charge_cancelled`, `recovery_complete`).
  """
  def step_rider(course, rider, controls_raw, prev, tick)
      when is_map(rider) and is_integer(tick) do
    controls = normalize_controls(controls_raw)

    if Map.get(rider, "recoveryTicks", 0) > 0 do
      rider = Map.update!(rider, "recoveryTicks", &(&1 - 1))
      events = if Map.get(rider, "recoveryTicks") == 0, do: [%{type: :recovery_complete}], else: []
      {rider, events}
    else
      step_moving(course, rider, controls, prev, tick)
    end
  end

  defp step_moving(course, rider, controls, prev, tick) do
    t = @tuning
    dt = @dt
    next = rider
    prev_s = next["s"]

    # --- grade acceleration (tangent at the rider's lateral position) --------
    s_back = max(0, next["s"] - 2)
    s_ahead = min(Course.total_length(course), next["s"] + 2)
    span = max(1.0e-6, s_ahead - s_back)

    slope =
      (Course.height_at(course, s_ahead, next["u"]) - Course.height_at(course, s_back, next["u"])) / span

    g_slope = clamp(-slope, 0.0, t.grade_max)

    outside_groomed = abs(next["u"]) > t.groomed_half_width
    drive = if controls.tuck, do: t.tuck_accel, else: t.cruise_accel

    a =
      t.grade_gravity * g_slope + drive - t.drag_coefficient * next["v"] * next["v"] -
        if(controls.brake, do: t.brake_decel, else: 0) -
        if(outside_groomed, do: t.shoulder_decel, else: 0)

    next =
      if next["grounded"] do
        Map.put(next, "v", clamp(next["v"] + a * dt, t.speed_min * 1.0, t.speed_max * 1.0))
      else
        Map.put(next, "v", clamp(next["v"] - t.drag_coefficient * next["v"] * next["v"] * dt, t.speed_min * 1.0, t.speed_max * 1.0))
      end

    # --- progress: speed before position, then lateral (D5 order) ------------
    next = Map.put(next, "s", next["s"] + next["v"] * dt)

    desired_vu = controls.steer * if(controls.tuck, do: t.steer_speed_tuck * 1.0, else: t.steer_speed_groomed * 1.0)

    approach_factor =
      min(1, (if(next["grounded"], do: t.lateral_ground_approach, else: t.lateral_air_approach)) * dt)

    next = Map.put(next, "vu", next["vu"] + (desired_vu - next["vu"]) * approach_factor)

    next =
      if next["grounded"] do
        Map.put(next, "v", max(t.speed_min * 1.0, next["v"] - abs(controls.steer) * t.carve_drag * dt))
      else
        next
      end

    next = Map.put(next, "u", next["u"] + next["vu"] * dt)

    # --- boundary: clamp, zero outward lateral velocity, one 20% hit ---------
    next =
      if next["boundaryCooldownSeconds"] > 0 do
        Map.put(next, "boundaryCooldownSeconds", max(0, next["boundaryCooldownSeconds"] - dt))
      else
        next
      end

    {next, events_boundary} =
      cond do
        next["u"] > t.corridor_half_width ->
          rider0 = next |> Map.put("u", t.corridor_half_width * 1.0) |> Map.put("vu", min(0, next["vu"]) * 1.0)

          if rider0["boundaryCooldownSeconds"] == 0 do
            rider1 =
              rider0
              |> Map.put("v", rider0["v"] * (1 - t.boundary_speed_loss_fraction))
              |> Map.put("boundaryCooldownSeconds", t.boundary_cooldown_seconds)

            {rider1, [%{type: :boundary_hit, side: :right}]}
          else
            {rider0, []}
          end

        next["u"] < -t.corridor_half_width ->
          rider0 = next |> Map.put("u", -t.corridor_half_width * 1.0) |> Map.put("vu", max(0, next["vu"]) * 1.0)

          if rider0["boundaryCooldownSeconds"] == 0 do
            rider1 =
              rider0
              |> Map.put("v", rider0["v"] * (1 - t.boundary_speed_loss_fraction))
              |> Map.put("boundaryCooldownSeconds", t.boundary_cooldown_seconds)

            {rider1, [%{type: :boundary_hit, side: :left}]}
          else
            {rider0, []}
          end

        true ->
          {next, []}
      end

    # --- jump charge / release and ramp lips ---------------------------------
    ground_y = Course.height_at(course, next["s"], next["u"]) + t.board_clearance

    {next, events_jump} =
      if next["grounded"] do
        case ramp_crossed(course, prev_s, next["s"], next["u"]) do
          ramp when not is_nil(ramp) ->
            apply_ramp(course, next, ramp)

          _ ->
            cond do
              controls.jump_held ->
                {Map.put(next, "jumpCharge", min(1, next["jumpCharge"] + dt / t.jump_charge_seconds)), []}

              next["jumpCharge"] > 0 and controls.brake ->
                # Neutralization cancels the charge (D4/D5) — never launches.
                {Map.put(next, "jumpCharge", 0), [%{type: :charge_cancelled}]}

              next["jumpCharge"] > 0 ->
                do_launch(course, next, "release", true)

              true ->
                {next, []}
            end
        end
      else
        {next, []}
      end

    # --- swept obstacle collision (before terrain contact, D5 order) ---------
    s_pre_impact = next["s"]
    u_pre_impact = next["u"]

    {next, events_obstacle} =
      case find_obstacle_hit(course, prev, next, s_pre_impact, u_pre_impact) do
        nil ->
          {next, []}

        %{obstacle: obstacle} ->
          do_crash(course, next, "obstacle:" <> Map.get(obstacle, "id"), [])
      end

    # --- vertical motion and terrain contact ---------------------------------
    {next, events_contact} =
      if next["grounded"] do
        candidate = Course.height_at(course, next["s"], next["u"]) + t.board_clearance
        drop = next["y"] - candidate

        if drop > t.ground_drop_launch_meters do
          next =
            next
            |> Map.put("grounded", false)
            |> Map.put("vy", -(drop / dt))
            |> Map.put("y", candidate + drop)

          {next, []}
        else
          {next |> Map.put("y", candidate) |> Map.put("vy", 0), []}
        end
      else
        vy = next["vy"] - t.gravity * dt
        y = next["y"] + vy * dt

        if y <= ground_y do
          g_landing = local_grade(course, next["s"], next["u"])
          norm = :math.sqrt(1 + g_landing * g_landing)
          normal_speed = abs((next["v"] * g_landing + vy) / norm)
          impact_speed = -vy

          rider =
            next
            |> Map.put("y", ground_y)
            |> Map.put("vy", 0)
            |> Map.put("grounded", true)
            |> Map.put("jumpCharge", 0)

          if normal_speed > t.crash_impact_normal_speed do
            do_crash(course, rider, :impact, [])
          else
            {rider, [%{type: :landing, impactSpeed: js_round6(impact_speed), normalSpeed: js_round6(normal_speed)}]}
          end
        else
          {next |> Map.put("vy", vy) |> Map.put("y", y), []}
        end
      end

    # --- ordered gate crossing and terminal state (D6) ------------------------
    sweep_end = min(next["s"], s_pre_impact)
    {next, events_gates} = apply_gates(course, next, prev, sweep_end, u_pre_impact, tick, [])

    rider =
      next
      |> Map.update!("s", &js_round6/1)
      |> Map.update!("u", &js_round6/1)
      |> Map.update!("v", &js_round6/1)
      |> Map.update!("vu", &js_round6/1)
      |> Map.update!("y", &js_round6/1)
      |> Map.update!("vy", &js_round6/1)
      |> Map.update!("jumpCharge", &js_round6/1)
      |> Map.update!("boundaryCooldownSeconds", &js_round6/1)

    events =
      events_boundary ++ events_jump ++ events_obstacle ++ events_contact ++ events_gates

    {rider, events}
  end

  @doc "Local downhill grade (clamped) at (s, u), forward/backward sampled."
  def local_grade(course, s, u) do
    t = @tuning
    s_back = max(0, s - 2)
    s_ahead = min(Course.total_length(course), s + 2)
    span = max(1.0e-6, s_ahead - s_back)
    slope = (Course.height_at(course, s_ahead, u) - Course.height_at(course, s_back, u)) / span
    clamp(-slope, 0.0, t.grade_max)
  end

  defp ramp_crossed(course, prev_s, s, u) do
    Enum.find(course.ramps, fn ramp ->
      ramp["s"] > prev_s and ramp["s"] <= s and u >= ramp["uMin"] and u <= ramp["uMax"]
    end)
  end

  defp apply_ramp(course, rider, ramp) do
    t = @tuning

    if Enum.member?(rider["crossedRampIds"], ramp["id"]) do
      {rider, []}
    else
      rider =
        rider
        |> Map.update!("crossedRampIds", &(&1 ++ [ramp["id"]]))
        |> Map.put("v", min(t.speed_max * 1.0, rider["v"] + t.ramp_boost))

      do_launch(course, rider, "ramp:" <> ramp["id"], false)
    end
  end

  # Jump release adds the vertical tangent speed of the ground just ridden
  # (positive only). Ramp lips launch from the base formula alone (D5).
  defp do_launch(course, rider, cause, with_tangent) do
    t = @tuning

    tangent_vy =
      if with_tangent do
        s_back = max(0, rider["s"] - 2)
        span = max(1.0e-6, rider["s"] - s_back)

        rise = (Course.height_at(course, rider["s"], rider["u"]) - Course.height_at(course, s_back, rider["u"])) / span

        rider["v"] * max(0, rise)
      else
        0
      end

    rider =
      rider
      |> Map.put("vy", t.jump_base + t.jump_charge_bonus * rider["jumpCharge"] + tangent_vy)
      |> Map.put("grounded", false)
      |> Map.put("jumpCharge", 0)

    {rider, [%{type: :launch, cause: cause}]}
  end

  defp do_crash(course, rider, cause, _events) do
    t = @tuning
    rider =
      rider
      |> Map.put("recoveryTicks", @recovery_ticks)
      |> Map.put("v", t.crash_reset_speed * 1.0)
      |> Map.put("vu", 0)
      |> Map.put("vy", 0)
      |> Map.put("jumpCharge", 0)
      |> Map.put("grounded", true)
      |> Map.update!("resetSeq", &(&1 + 1))

    rider =
      case pick_recovery_point(course, rider) do
        nil ->
          rider

        point ->
          rider
          |> Map.put("s", point["s"])
          |> Map.put("u", point["u"])
          |> Map.put("y", Course.height_at(course, point["s"], point["u"]) + t.board_clearance)
      end

    {rider, [%{type: :crash, cause: cause, resetSeq: rider["resetSeq"]}]}
  end

  @doc """
  The safe recovery point nearest behind the crash site that never requires
  crossing an unearned gate (D5).
  """
  def pick_recovery_point(course, rider) do
    next_index = rider["nextCheckpoint"] - 1
    next_gate = Enum.at(course.gates, next_index)
    next_unearned_s = if next_gate, do: next_gate["s"], else: course.finish["s"]

    candidates =
      Enum.filter(course.recovery_points, fn point ->
        point["s"] <= rider["s"] and point["s"] < next_unearned_s
      end)

    candidates =
      if candidates == [], do: course.recovery_points, else: candidates

    candidates
    |> Enum.min_by(fn point -> rider["s"] - point["s"] end, fn -> nil end)
  end

  @doc """
  Swept capsule-vs-obstacle test along this tick's motion segment
  (Liang–Barsky clip against the radius-expanded box; height-gated so
  airborne riders clear low hazards).
  """
  def find_obstacle_hit(course, prev, next, sweep_end_s, sweep_end_u) do
    t = @tuning
    radius = t.rider_capsule_radius
    s0 = prev["s"] * 1.0
    u0 = prev["u"] * 1.0
    ds = sweep_end_s - s0
    du = sweep_end_u - u0

    Enum.find_value(course.obstacles, fn obstacle ->
      s_min = obstacle["s"] - obstacle["halfS"] - radius
      s_max = obstacle["s"] + obstacle["halfS"] + radius
      u_min = obstacle["u"] - obstacle["halfU"] - radius
      u_max = obstacle["u"] + obstacle["halfU"] + radius

      axes = [{s0, ds, s_min, s_max}, {u0, du, u_min, u_max}]

      case clip_segment(axes, 0.0, 1.0) do
        :miss ->
          nil

        t_enter ->
          hit_s = s0 + ds * t_enter
          hit_u = u0 + du * t_enter
          top = Course.height_at(course, obstacle["s"], obstacle["u"]) + obstacle["height"]

          rider_bottom =
            if next["grounded"] do
              Course.height_at(course, hit_s, hit_u)
            else
              next["y"] - t.board_clearance
            end

          if rider_bottom > top do
            nil
          else
            %{obstacle: obstacle, tEnter: t_enter}
          end
      end
    end)
  end

  defp clip_segment([], t_enter, t_exit) do
    if t_enter > t_exit, do: :miss, else: t_enter
  end

  defp clip_segment([{p0, d, lo, hi} | rest], t_enter, t_exit) do
    cond do
      abs(d) < 1.0e-9 and (p0 < lo or p0 > hi) ->
        :miss

      abs(d) < 1.0e-9 ->
        clip_segment(rest, t_enter, t_exit)

      true ->
        {ta, tb} = if (lo - p0) / d > (hi - p0) / d do
          {(hi - p0) / d, (lo - p0) / d}
        else
          {(lo - p0) / d, (hi - p0) / d}
        end

        t_enter2 = max(t_enter, ta)
        t_exit2 = min(t_exit, tb)

        if t_enter2 > t_exit2 do
          :miss
        else
          clip_segment(rest, t_enter2, t_exit2)
        end
    end
  end

  @doc """
  Ordered gate crossing, checkpoint splits and the finish (D6). Gates credit
  only on a forward sweep of the next plane within the valid pre-impact
  segment; the finish requires every checkpoint and records the exact
  monotonic key `(tick + fraction) * 1000/30`.
  """
  def apply_gates(course, next, prev, sweep_end_s, sweep_end_u, tick, events) do
    cond do
      next["finishTick"] != nil or next["dnfReason"] != nil ->
        {next, events}

      not (sweep_end_s > prev["s"]) ->
        {next, events}

      true ->
        corridor_ok = abs(sweep_end_u) <= @tuning.corridor_half_width
        apply_gates_loop(course, next, prev["s"], sweep_end_s, sweep_end_u, corridor_ok, tick, events)
    end
  end

  defp apply_gates_loop(course, next, sweep_start_s, sweep_end_s, sweep_end_u, corridor_ok, tick, events) do
    index = next["nextCheckpoint"]

    if index <= length(course.gates) do
      gate = Enum.at(course.gates, index - 1)

      cond do
        not (sweep_start_s < gate["s"] and gate["s"] <= sweep_end_s) ->
          maybe_finish(course, next, sweep_start_s, sweep_end_s, sweep_end_u, corridor_ok, tick, events)

        not corridor_ok ->
          maybe_finish(course, next, sweep_start_s, sweep_end_s, sweep_end_u, corridor_ok, tick, events)

        true ->
          surface = Course.height_at(course, gate["s"], sweep_end_u)

          if next["y"] > surface + @tuning.gate_altitude_ceiling do
            maybe_finish(course, next, sweep_start_s, sweep_end_s, sweep_end_u, corridor_ok, tick, events)
          else
            fraction = (gate["s"] - sweep_start_s) / (sweep_end_s - sweep_start_s)
            key = (tick + fraction) * (1000 / 30)

            next =
              next
              |> Map.update!("splitKeys", &(&1 ++ [key]))
              |> Map.put("nextCheckpoint", index + 1)

            apply_gates_loop(
              course,
              next,
              sweep_start_s,
              sweep_end_s,
              sweep_end_u,
              corridor_ok,
              tick,
              events ++ [%{type: :checkpoint, index: index, key: js_round6(key)}]
            )
          end
      end
    else
      maybe_finish(course, next, sweep_start_s, sweep_end_s, sweep_end_u, corridor_ok, tick, events)
    end
  end

  defp maybe_finish(course, next, sweep_start_s, sweep_end_s, sweep_end_u, corridor_ok, tick, events) do
    finish = course.finish

    if next["nextCheckpoint"] > length(course.gates) and
         sweep_start_s < finish["s"] and finish["s"] <= sweep_end_s and corridor_ok do
      fraction = (finish["s"] - sweep_start_s) / (sweep_end_s - sweep_start_s)
      key = (tick + fraction) * (1000 / 30)

      next =
        next
        |> Map.put("finishTick", tick)
        |> Map.put("finishKey", key)
        |> Map.put("finishMs", Kernel.trunc(:math.floor(key + 0.5)))

      {next, events ++ [%{type: :finish, key: key, finishMs: next["finishMs"]}]}
    else
      {next, events}
    end
  end

  @doc "World-space placement: x = centerX(s) + u, z = -s, y on the surface."
  def world_position(course, rider) do
    %{
      "x" => Course.center_x_at(course, rider["s"]) + rider["u"],
      "y" => rider["y"],
      "z" => -rider["s"]
    }
  end

  # JS Math.round parity: floor(x + 0.5), with -0 folded to 0 like Object.is.
  defp js_round6(value) do
    rounded = :math.floor(value * 1.0e6 + 0.5) / 1.0e6
    if rounded == 0, do: 0, else: rounded
  end

  defp clamp(value, low, high), do: value |> max(low * 1.0) |> min(high * 1.0)
end
