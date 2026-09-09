defmodule Afterlight.Activities.Snowboard do
  @moduledoc """
  Summit Run authoritative rules — the ALPINE RUSH port
  (integrate-ssxtricky-snowboard 3.4).

  Fixed-step (30 Hz) Elixir port of the shared simulation
  `shared/snowboard/rules.js`, itself the port of the frozen user-owned
  source (`SSXTricky/lib/game/rules.mjs` + the running section of
  `engine.js` tick(), rev e87f6c7d — see the change's baseline.md). Pure
  data in, pure data out: no process state, no I/O.

  Parity contract: this module and the JavaScript step must agree to ≤1cm
  position and 0.01 m/s velocity over the golden fixture
  (`tests/fixtures/snowboard/golden-movement.json`), with exactly equal
  event outcomes. The arithmetic below is written in the SAME expression
  order as the JS original — do not "clean it up" without regenerating the
  fixture and rerunning `Afterlight.Activities.SnowboardTest`.

  State uses the source's own coordinates: `"s"` downhill meters (world
  z = -s), `"x"` ABSOLUTE world lateral, `"lateral"` lateral velocity,
  `"y"` contact/ballistic height, plus the source trick/boost/score fields.
  Held-input edges (jump release, trick taps) are detected from held-field
  snapshots carried in the state (`"jumpWasHeld"`, `"trickHeld"`), so a pure
  held-state control stream reproduces the source keydown/keyup semantics
  deterministically on both runtimes.

  Intentional multiplayer adaptations (change design): no AI rivals, no
  racer-racer collisions, per-rider per-race pickup claims, terminal riders
  stop simulating, and the finish records a deterministic within-tick
  crossing key `(tick + fraction) * 1000/30` for shared ordering.
  """

  alias Afterlight.Activities.Snowboard.Course

  @dt 1 / 30
  @tick_hz 30

  @tuning %{
    base_speed: 29,
    tuck_bonus: 6,
    lean_bonus: 4,
    tuck_lean_bonus: 3,
    brake_speed: 10,
    pad_boost_speed: 56,
    boost_speed: 48,
    boost_min_speed: 8,
    boost_spend_per_second: 23,
    boost_regen_per_second: 1.8,
    boost_start: 45,
    boost_max: 100,
    carve_boost_reward: 12,
    carve_charge_rate: 0.5,
    carve_speed_min: 20,
    carve_steer_min: 0.5,
    carve_half_width: 20,
    lateral_ground: 20,
    lateral_air: 13,
    lateral_tuck: 14,
    lateral_approach: 5,
    speed_approach: 0.8,
    edge_bleed_half_width: 23,
    edge_bleed_factor: 0.65,
    corridor_half_width: 35,
    charge_rate: 1.2,
    jump_base: 7,
    jump_charge_bonus: 6,
    super_pop_bonus: 4,
    super_pop_charge: 0.8,
    gravity: 20,
    ramp_launch_base: 10,
    ramp_launch_speed_factor: 0.17,
    ramp_launch_charge_bonus: 4,
    bail_trick_progress: 0.82,
    bail_seconds: 1.2,
    bail_speed_factor: 0.3,
    boost_per_landing_point: 75,
    zone_boost_seconds: 2.4,
    zone_min_speed: 46,
    pickup_score: 250,
    pickup_boost: 10,
    pickup_distance_window: 2.2,
    pickup_lateral_window: 2.1,
    pickup_height_window: 3,
    air_time_points_per_second: 100,
    combo_step_bonus: 0.5,
    combo_max_extra: 4,
    banked_tricks_cap: 8,
    start_speed: 12
  }

  @tricks %{
    "Q" => %{"code" => "KeyQ", "name" => "360 SPIN", "points" => 800, "duration" => 0.72, "axis" => "y"},
    "E" => %{"code" => "KeyE", "name" => "INDY GRAB", "points" => 500, "duration" => 0.58, "axis" => "grab"},
    "X" => %{"code" => "KeyX", "name" => "BACKFLIP", "points" => 1200, "duration" => 0.92, "axis" => "x"}
  }

  @trick_buffer_seconds 0.8
  @trick_airtime_margin 0.2
  @ramp_edge_drop 0.6

  @doc "Whether snowboard-race admission is enabled (unchanged rollout gate)."
  def enabled? do
    Application.get_env(:afterlight, :snowboard_enabled, false)
  end

  def dt, do: @dt
  def tick_hz, do: @tick_hz
  def tuning, do: @tuning
  def tricks, do: @tricks

  @doc """
  A fresh rider state at the start gate. `slot` spreads riders laterally
  across the source-wide start line (±19 for eight riders, inside ±35).
  """
  def initial_state(slot, slot_count) when is_integer(slot) and is_integer(slot_count) do
    spread = 5.5

    x =
      if slot_count > 1 do
        clamp((slot - (slot_count - 1) / 2) * spread, -19, 19)
      else
        0.0
      end

    %{
      "slot" => slot,
      "s" => 0,
      "x" => x,
      "lateral" => 0.0,
      "v" => @tuning.start_speed * 1.0,
      "boost" => @tuning.boost_start * 1.0,
      "y" => Course.ground_at(x, 0),
      "vy" => 0.0,
      "airborne" => false,
      "airTime" => 0.0,
      "charge" => 0.0,
      "tricks" => [],
      "trick" => nil,
      "trickQueue" => nil,
      "trickBuffer" => 0.0,
      "trickHeld" => %{"Q" => false, "E" => false, "X" => false},
      "jumpWasHeld" => false,
      "score" => 0,
      "bestCombo" => 0,
      "landings" => 0,
      "bail" => 0.0,
      "time" => 0.0,
      "zoneBoost" => 0.0,
      "boosting" => false,
      "tucking" => false,
      "leaning" => false,
      "carving" => false,
      "carveCharge" => 0.0,
      "carveReward" => 0,
      "pickupsClaimed" => [],
      "finishTick" => nil,
      "finishMs" => nil,
      "finishKey" => nil,
      "dnfReason" => nil,
      "resetSeq" => 0
    }
  end

  @doc "Neutral control shape (D7)."
  def neutral_controls, do: %{"kind" => "neutral"}

  @doc """
  Normalizes a wire controls map (string keys, already protocol-validated)
  into the strict ride tuple the step consumes. Neutral or malformed input
  becomes braking-neutral.
  """
  def normalize_controls(%{"kind" => "neutral"}) do
    %{steer: 0.0, tuck: false, lean: false, brake: true, boost: false, jump_held: false, trick: %{"Q" => false, "E" => false, "X" => false}}
  end

  def normalize_controls(controls) when is_map(controls) do
    steer =
      case controls["steer"] do
        v when is_number(v) -> clamp(v * 1.0, -1.0, 1.0)
        _ -> 0.0
      end

    %{
      steer: steer,
      tuck: controls["tuck"] == true,
      lean: controls["lean"] == true,
      brake: controls["brake"] !== false,
      boost: controls["boost"] == true,
      jump_held: controls["jumpHeld"] == true,
      trick: %{
        "Q" => controls["trickQ"] == true,
        "E" => controls["trickE"] == true,
        "X" => controls["trickX"] == true
      }
    }
  end

  def normalize_controls(_other), do: normalize_controls(neutral_controls())

  @doc """
  Advance one rider one 30 Hz tick — the shared step port (source tick order:
  timers → speed zones → motion → charge → jump release → trick edges → ramp
  launches → airborne/landing → pickups → finish). Terminal riders stop
  simulating. Returns `{rider, events}`.
  """
  def step_rider(course, rider, controls_raw, prev, tick) when is_map(rider) and is_integer(tick) do
    controls = normalize_controls(controls_raw)

    if rider["finishTick"] != nil or rider["dnfReason"] != nil do
      {rider, []}
    else
      step_alive(course, rider, controls, prev, tick)
    end
  end

  defp step_alive(course, rider, controls, prev, tick) do
    t = @tuning
    dt = @dt
    next = rider
    previous = prev || rider

    # 1. Timers.
    next = next |> Map.update!("time", &(&1 + dt)) |> Map.update!("bail", &max(0, &1 - dt)) |> Map.update!("trickBuffer", &max(0, &1 - dt))

    # 2. Speed zones — the entering burst fires only when zoneBoost was empty.
    {next, zone_events} =
      Enum.reduce(course.speed_zones, {next, []}, fn zone, {r, events} ->
        entering = r["zoneBoost"] <= 0

        case enter_speed_zone(r, zone) do
          {true, r2} ->
            if entering, do: {r2, events ++ [%{type: :speed_zone, zoneId: zone["id"]}]}, else: {r2, events}

          {false, r2} ->
            {r2, events}
        end
      end)

    # 3. Motion (bail zeroes steering and forces brake, like the source tick).
    previous_carve_reward = next["carveReward"]

    motion_input = %{
      steer: if(next["bail"] > 0, do: 0.0, else: controls.steer),
      brake: controls.brake or next["bail"] > 0,
      crouch: controls.tuck,
      lean: controls.lean,
      boost: controls.boost
    }

    next = step_motion(next, motion_input, dt)

    carve_events =
      if next["carveReward"] > previous_carve_reward do
        [%{type: :carve_reward, count: next["carveReward"]}]
      else
        []
      end

    # 4. Charge while Space is held on the ground.
    next =
      if controls.jump_held and !next["airborne"] do
        Map.put(next, "charge", clamp(next["charge"] + dt * t.charge_rate, 0, 1))
      else
        next
      end

    # 5. Jump release edge → pop (source jump() on Space keyup).
    {next, jump_events} =
      if next["jumpWasHeld"] and !controls.jump_held and !next["airborne"] and next["bail"] <= 0 do
        super_pop = next["tucking"] and next["charge"] >= t.super_pop_charge
        velocity = pop_velocity(next)
        next = do_launch(next, velocity)

        events = [
          %{type: :launch, cause: if(super_pop, do: "super_pop", else: "release")}
          | if(super_pop, do: [%{type: :super_pop}], else: [])
        ]

        {next, events}
      else
        {next, []}
      end

    next = Map.put(next, "jumpWasHeld", controls.jump_held)

    # 6. Trick key edges: press in the air starts immediately (if free),
    #    otherwise queues with the source 0.8 s buffer.
    {next, trick_edge_events} = apply_trick_edges(next, controls.trick)

    # 7. Ramp-edge launches: swept crossing of ramp.end within the ramp line.
    before_s = previous["s"]
    previous_x = previous["x"]
    ground = surface_height(course, next["x"], next["s"])

    {next, ramp_events} =
      if !next["airborne"] and next["bail"] <= 0 do
        ramp_crossing(course, next, before_s, previous_x)
      else
        {next, []}
      end

    # 8. Airborne / ground contact.
    {next, air_events} = air_phase(course, next, controls, ground, dt, previous_x, before_s)

    # 9. Pickups (per-rider claims, source windows).
    {next, pickup_events} = collect_pickups(course, next, ground)

    # 10. Finish: swept crossing records the deterministic within-tick key.
    {next, finish_events} = maybe_finish(course, next, before_s, tick)

    events = zone_events ++ carve_events ++ jump_events ++ trick_edge_events ++ ramp_events ++ air_events ++ pickup_events ++ finish_events

    {round_wire(next), events}
  end

  # --- source stepMotion (verbatim order) -----------------------------------------

  defp step_motion(s, input, dt) do
    t = @tuning

    s = Map.put(s, "zoneBoost", max(0, (s["zoneBoost"] || 0) - dt))
    pad_boost = s["zoneBoost"] > 0 and !input.brake
    manual_boost = input.boost and s["boost"] > 0 and s["v"] > t.boost_min_speed and !input.brake
    boosting = pad_boost or manual_boost

    s = Map.put(s, "tucking", input.crouch and !s["airborne"] and !input.brake)
    s = Map.put(s, "leaning", input.lean and !s["airborne"] and !input.brake)

    tuck_speed =
      t.base_speed + if_full(s["tucking"], t.tuck_bonus) + if_full(s["leaning"], t.lean_bonus) +
        if_full(s["tucking"] and s["leaning"], t.tuck_lean_bonus)

    target_speed =
      cond do
        input.brake -> t.brake_speed * 1.0
        pad_boost -> t.pad_boost_speed * 1.0
        boosting -> t.boost_speed * 1.0
        true -> tuck_speed * 1.0
      end

    s =
      Map.put(
        s,
        "carving",
        !s["airborne"] and !input.brake and abs(input.steer) > t.carve_steer_min and s["v"] > t.carve_speed_min and
          abs(s["x"] - Course.center_at(s["s"])) < t.carve_half_width
      )

    s =
      Map.put(
        s,
        "carveCharge",
        if(s["carving"], do: min(1, (s["carveCharge"] || 0) + dt * t.carve_charge_rate), else: 0.0)
      )

    {s, _reward?} =
      if s["carveCharge"] >= 1 do
        {s |> Map.put("boost", clamp(s["boost"] + t.carve_boost_reward, 0, t.boost_max)) |> Map.put("carveCharge", 0.0)
         |> Map.put("carveReward", (s["carveReward"] || 0) + 1), true}
      else
        {s, false}
      end

    s = Map.put(s, "v", (s["v"] + (target_speed - s["v"]) * min(1, dt * t.speed_approach)) |> max(0.0))
    s = Map.put(s, "boost", clamp(s["boost"] + (if(manual_boost and !pad_boost, do: -t.boost_spend_per_second, else: t.boost_regen_per_second)) * dt, 0, t.boost_max))

    lateral_target =
      input.steer *
        if(s["airborne"], do: t.lateral_air * 1.0, else: (if s["tucking"], do: t.lateral_tuck * 1.0, else: t.lateral_ground * 1.0))

    s = Map.put(s, "lateral", s["lateral"] + (lateral_target - s["lateral"]) * min(1, dt * t.lateral_approach))
    s = Map.put(s, "x", s["x"] + s["lateral"] * dt)
    s = Map.put(s, "s", s["s"] + s["v"] * dt)

    edge = Course.center_at(s["s"])

    s =
      if abs(s["x"] - edge) > t.edge_bleed_half_width do
        Map.put(s, "v", s["v"] * :math.pow(t.edge_bleed_factor, dt))
      else
        s
      end

    s = Map.put(s, "x", clamp(s["x"], edge - t.corridor_half_width, edge + t.corridor_half_width))
    Map.put(s, "boosting", boosting)
  end

  defp if_full(true, bonus), do: bonus
  defp if_full(false, _bonus), do: 0

  # --- source helpers ---------------------------------------------------------------

  defp enter_speed_zone(s, zone) do
    t = @tuning

    if s["airborne"] or s["bail"] > 0 or s["s"] < zone["start"] or s["s"] > zone["end"] or
         abs(s["x"] - zone["x"]) > zone["width"] / 2 do
      {false, s}
    else
      {true, s |> Map.put("zoneBoost", t.zone_boost_seconds * 1.0) |> Map.put("v", max(s["v"], t.zone_min_speed * 1.0))}
    end
  end

  defp jump_velocity(charge), do: 7 + clamp(charge, 0, 1) * 6

  defp pop_velocity(s) do
    t = @tuning
    jump_velocity(s["charge"]) + if_full(s["tucking"] and s["charge"] >= t.super_pop_charge, t.super_pop_bonus)
  end

  defp ramp_launch_velocity(speed, charge) do
    t = @tuning
    t.ramp_launch_base + speed * t.ramp_launch_speed_factor + clamp(charge, 0, 1) * t.ramp_launch_charge_bonus
  end

  defp do_launch(s, velocity) do
    s
    |> Map.put("airborne", true)
    |> Map.put("vy", velocity)
    |> Map.put("airTime", 0.0)
    |> Map.put("charge", 0.0)
    |> Map.put("tricks", [])
    |> Map.put("trick", nil)
  end

  defp remaining_air_time(s, ground) do
    v = s["vy"] + s["v"] * 0.18
    (v + :math.sqrt(v * v + 40 * max(0, s["y"] - ground))) / 20
  end

  defp begin_trick(s, code) do
    trick_def = @tricks[code]

    cond do
      !s["airborne"] or s["trick"] != nil or trick_def == nil ->
        {false, s}

      true ->
        trick = Map.merge(trick_def, %{"code" => code, "elapsed" => 0.0})
        {true, Map.put(s, "trick", trick)}
    end
  end
  defp advance_trick(s, dt) do
    t = @tuning

    if s["trick"] == nil do
      {false, s}
    else
      trick = Map.update!(s["trick"], "elapsed", &(&1 + dt))

      if trick["elapsed"] < trick["duration"] do
        {false, Map.put(s, "trick", trick)}
      else
        s =
          if length(s["tricks"]) <= t.banked_tricks_cap do
            Map.put(s, "tricks", s["tricks"] ++ [%{"code" => trick["code"], "points" => trick["points"]}])
          else
            s
          end

        {true, Map.put(s, "trick", nil)}
      end
    end
  end

  defp award_combo(tricks, air_time) do
    t = @tuning

    if tricks == [] do
      0
    else
      sum = Enum.reduce(tricks, 0, &(&1["points"] + &2))
      round(sum * (1 + min(length(tricks) - 1, t.combo_max_extra) * t.combo_step_bonus) + air_time * t.air_time_points_per_second)
    end
  end

  defp do_land(s) do
    t = @tuning

    bailed = s["trick"] != nil and s["trick"]["elapsed"] / s["trick"]["duration"] < t.bail_trick_progress

    s =
      if !bailed and s["trick"] != nil do
        Map.put(s, "tricks", s["tricks"] ++ [%{"code" => s["trick"]["code"], "points" => s["trick"]["points"]}])
      else
        s
      end

    points = if(bailed, do: 0, else: award_combo(s["tricks"], s["airTime"]))

    s =
      cond do
        bailed ->
          s |> Map.put("v", s["v"] * t.bail_speed_factor) |> Map.put("bail", t.bail_seconds * 1.0)

        points > 0 ->
          s
          |> Map.put("score", s["score"] + points)
          |> Map.put("bestCombo", max(s["bestCombo"], points))
          |> Map.put("boost", clamp(s["boost"] + points / t.boost_per_landing_point, 0, t.boost_max))
          |> Map.put("landings", s["landings"] + 1)

        true ->
          s
      end

    s =
      s
      |> Map.put("airborne", false)
      |> Map.put("tricks", [])
      |> Map.put("trick", nil)
      |> Map.put("charge", 0.0)

    {s, bailed, points}
  end

  # --- step phases ---------------------------------------------------------------------

  defp apply_trick_edges(next, trick_controls) do
    Enum.reduce(["Q", "E", "X"], {next, []}, fn code, {r, events} ->
      was_held = r["trickHeld"][code]
      is_held = trick_controls[code]

      {r, events} =
        if !was_held and is_held do
          {started?, r2} = begin_trick(r, code)

          if started? do
            {r2, events}
          else
            {r2 |> Map.put("trickQueue", code) |> Map.put("trickBuffer", @trick_buffer_seconds), events}
          end
        else
          {r, events}
        end

      {Map.put(r, "trickHeld", Map.put(r["trickHeld"], code, is_held)), events}
    end)
  end

  defp ramp_crossing(course, next, before_s, previous_x) do
    after_s = next["s"]

    # JS breaks at the first crossed ramp; find_value returns the first
    # non-nil result, defaulting to the unchanged rider.
    Enum.find_value(course.ramps, {next, []}, fn ramp ->
      if before_s <= ramp["end"] and after_s > ramp["end"] do
        span = after_s - before_s
        frac = if(span > 1.0e-9, do: (ramp["end"] - before_s) / span, else: 1.0)
        crossing_x = previous_x + (next["x"] - previous_x) * frac

        if abs(crossing_x - ramp["x"]) <= ramp["width"] / 2 do
          r =
            next
            |> Map.put("y", Course.ramp_height(ramp, ramp["end"]))
            |> do_launch(ramp_launch_velocity(next["v"], next["charge"]))

          {r,
           [
             %{type: :ramp_launch, rampId: ramp["id"]},
             %{type: :launch, cause: "ramp:" <> ramp["id"]}
           ]}
        else
          nil
        end
      else
        nil
      end
    end)
  end

  defp air_phase(course, next, controls, ground, dt, previous_x, previous_s) do
    if next["airborne"] do
      next = Map.update!(next, "airTime", &(&1 + dt))
      next = Map.update!(next, "vy", &(&1 - @tuning.gravity * dt))
      vy = next["vy"]
      next = Map.update!(next, "y", &(&1 + vy * dt))

      {next, start_events} =
        if next["trick"] == nil do
          buffered = if(next["trickBuffer"] > 0, do: next["trickQueue"], else: nil)

          held =
            Enum.find(["Q", "E", "X"], fn code ->
              controls.trick[code] and remaining_air_time(next, ground) > @tricks[code]["duration"] + @trick_airtime_margin
            end)

          {started?, next2} = begin_trick(next, buffered || held)

          if started? do
            {next2 |> Map.put("trickQueue", nil) |> Map.put("trickBuffer", 0.0), []}
          else
            {next, []}
          end
        else
          {next, []}
        end

      {banked?, next} = advance_trick(next, dt)

      complete_events =
        if banked? do
          last = Enum.at(next["tricks"], -1)
          [%{type: :trick_complete, code: last && last["code"], points: last && last["points"]}]
        else
          []
        end

      if next["y"] <= ground do
        next = Map.put(next, "y", ground)
        {next, bailed, points} = do_land(next)
        next = next |> Map.put("trickQueue", nil) |> Map.put("trickBuffer", 0.0)

        landing_events =
          cond do
            bailed -> [%{type: :bail}]
            points > 0 -> [%{type: :clean_landing, points: points}]
            next["airTime"] > 1 -> [%{type: :nice_air, airTime: js_round6(next["airTime"])}]
            true -> []
          end

        {next, start_events ++ complete_events ++ landing_events}
      else
        {next, start_events ++ complete_events}
      end
    else
      rode_ramp = Enum.any?(course.ramps, &Course.on_ramp?(&1, previous_x, previous_s))

      if next["y"] > ground + @ramp_edge_drop and rode_ramp do
        {do_launch(next, 0), [%{type: :launch, cause: "edge"}]}
      else
        {Map.put(next, "y", ground), []}
      end
    end
  end

  defp collect_pickups(course, next, ground) do
    t = @tuning

    if next["y"] - ground < t.pickup_height_window do
      Enum.reduce(course.pickups, {next, []}, fn p, {r, events} ->
        if p["id"] in r["pickupsClaimed"] do
          {r, events}
        else
          if abs(p["d"] - r["s"]) < t.pickup_distance_window and abs(p["x"] - r["x"]) < t.pickup_lateral_window do
            r =
              r
              |> Map.put("pickupsClaimed", r["pickupsClaimed"] ++ [p["id"]])
              |> Map.put("score", r["score"] + t.pickup_score)
              |> Map.put("boost", clamp(r["boost"] + t.pickup_boost, 0, t.boost_max))

            {r, events ++ [%{type: :pickup, id: p["id"]}]}
          else
            {r, events}
          end
        end
      end)
    else
      {next, []}
    end
  end

  defp maybe_finish(course, next, before_s, tick) do
    finish_s = course.finish["s"]

    if next["finishTick"] == nil and next["s"] >= finish_s do
      span = next["s"] - before_s
      fraction = if(span > 1.0e-9, do: clamp((finish_s - before_s) / span, 0, 1), else: 1.0)
      key = (tick + fraction) * (1000 / 30)

      next =
        next
        |> Map.put("s", finish_s * 1.0)
        |> Map.put("finishTick", tick)
        |> Map.put("finishKey", key)
        |> Map.put("finishMs", Kernel.trunc(:math.floor(key + 0.5)))

      {next,
       [
         %{type: :finish, key: key, finishMs: next["finishMs"], score: next["score"], bestCombo: next["bestCombo"]}
       ]}
    else
      {next, []}
    end
  end

  @doc "World-space placement: x is already absolute, z = -s."
  def world_position(_course, rider) do
    %{"x" => rider["x"], "y" => rider["y"], "z" => -rider["s"]}
  end

  defp surface_height(course, x, s), do: Course.surface_at(course, x, s)

  # Wire hygiene (JS round6 parity: floor(x*1e6+0.5)/1e6, -0 folded to 0).
  defp round_wire(next) do
    next
    |> Map.update!("s", &js_round6/1)
    |> Map.update!("x", &js_round6/1)
    |> Map.update!("v", &js_round6/1)
    |> Map.update!("lateral", &js_round6/1)
    |> Map.update!("y", &js_round6/1)
    |> Map.update!("vy", &js_round6/1)
    |> Map.update!("charge", &js_round6/1)
    |> Map.update!("bail", &js_round6/1)
    |> Map.update!("airTime", &js_round6/1)
    |> Map.update!("zoneBoost", &js_round6/1)
    |> Map.update!("carveCharge", &js_round6/1)
    |> Map.update!("trickBuffer", &js_round6/1)
    |> Map.update!("boost", &js_round6/1)
  end

  defp js_round6(value) do
    rounded = :math.floor(value * 1.0e6 + 0.5) / 1.0e6
    if rounded == 0, do: 0, else: rounded
  end

  defp clamp(value, low, high), do: value |> max(low * 1.0) |> min(high * 1.0)
end
