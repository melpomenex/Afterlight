defmodule Afterlight.Activities.SkippingStones do
  @moduledoc """
  Authoritative skipping stones (Task 9.4).

  Specifications:
  - `openspec/changes/add-place-activities-program/specs/signature-place-activities/spec.md`
    (Requirement: Foundry and marsh activities)
  - `design.md` (D5, D7)

  Guarantees:
  - Angle/power launches under FROZEN wind/rain reproduce skip count and distance.
  - Shared outcomes; leave/sink cleanup is per thrower.
  """

  @rules_version 1
  @dt 1.0 / 60.0
  @water_y 0.22
  @max_flight 8.0
  @cleanup_ticks 480
  @max_skips 12

  @origins %{
    0 => [-0.35, 0.95, 0.15],
    1 => [0.35, 0.95, 0.15],
    2 => [-0.12, 0.95, 0.32],
    3 => [0.12, 0.95, 0.32]
  }

  @default_env %{
    "version" => 1,
    "policy" => "frozen",
    "preset" => nil,
    "wind" => [0.0, 0.0],
    "windSpeed" => 0.0,
    "rain" => 0.2,
    "intensity" => 0.25,
    "wetness" => 0.35,
    "timePhase" => 0.4,
    "frozenAt" => 0
  }

  def rules_version, do: @rules_version
  def cleanup_ticks, do: @cleanup_ticks

  def init_sim_state(opts \\ []) do
    slots =
      case Keyword.get(opts, :slots) do
        nil -> [0, 1]
        list when is_list(list) -> list
      end

    now_ms = Keyword.get(opts, :now_ms, 0)
    env = normalize_environment(Keyword.get(opts, :environment), now_ms)

    throwers =
      Map.new(slots, fn slot ->
        origin = Map.get(@origins, slot, @origins[0])

        {to_string(slot),
         %{
           "slot" => slot,
           "phase" => "idle",
           "currentThrow" => nil,
           "lastThrow" => nil,
           "bestSkips" => 0,
           "bestDistance" => 0.0,
           "cleanupTicks" => 0,
           "consumedKind" => nil,
           "origin" => origin
         }}
      end)

    %{
      "rulesVersion" => @rules_version,
      "status" => "open",
      "tickCount" => 0,
      "elapsedMs" => 0,
      "environment" => env,
      "throwers" => throwers
    }
  end

  def validate_controls(controls) when is_map(controls) do
    kind = Map.get(controls, "kind")

    case kind do
      "neutral" ->
        {:ok, %{"kind" => "neutral"}}

      "leave" ->
        {:ok, %{"kind" => "leave"}}

      "environment" ->
        {:ok, %{"kind" => "environment"}}

      "launch" ->
        angle = clamp(float_or(Map.get(controls, "angle") || Map.get(controls, "pitch"), 0.22), 0.06, 0.55)
        power = clamp(float_or(Map.get(controls, "power"), 0.65), 0.15, 1.0)
        yaw = clamp(float_or(Map.get(controls, "yaw"), 0.0), -0.35, 0.35)
        {:ok, %{"kind" => "launch", "angle" => angle, "power" => power, "yaw" => yaw}}

      _ ->
        {:error, :unknown_kind}
    end
  end

  def validate_controls(_), do: {:error, :invalid_controls}

  @doc """
  Applies a discrete input. Frozen start weather cannot be rewritten.
  """
  def apply_input(sim_state, slot, input) do
    case validate_controls(input) do
      {:ok, %{"kind" => "environment"}} ->
        {:ok, sim_state}

      {:ok, sanitized} ->
        slot_str = to_string(slot)

        case get_in(sim_state, ["throwers", slot_str]) do
          nil ->
            {:error, :unknown_slot}

          thrower ->
            thrower = Map.put(thrower, "consumedKind", sanitized["kind"])
            {state, next} = apply_kind(sim_state, thrower, sanitized)
            {:ok, put_in(state, ["throwers", slot_str], next)}
        end

      {:error, reason} ->
        {:error, reason}
    end
  end

  def step_simulation(sim_state, players, steps \\ 1)

  def step_simulation(sim_state, _players, steps) when steps <= 0, do: {sim_state, nil}

  def step_simulation(sim_state, players, steps) do
    state =
      Enum.reduce(1..steps, sim_state, fn _, acc ->
        acc
        |> Map.update!("tickCount", &(&1 + 1))
        |> Map.update!("elapsedMs", &(&1 + round(@dt * 1000)))
        |> step_all(players)
      end)

    {state, nil}
  end

  def simulate_skip(launch, environment, origin) do
    env = normalize_environment(environment, 0)
    [ox, oy, oz] = origin
    v0 = 5.5 + launch["power"] * 9.5
    yaw = launch["yaw"] || 0.0
    angle = launch["angle"]
    cos_a = :math.cos(angle)
    sin_a = :math.sin(angle)

    vx0 = :math.sin(yaw) * cos_a * v0
    vy0 = sin_a * v0
    vz0 = -:math.cos(yaw) * cos_a * v0

    rain = env["rain"]
    wet = rain * 0.35
    [wx, wz] = env["wind"]
    max_ticks = round(@max_flight / @dt)

    first = %{
      "x" => r3(ox),
      "y" => r3(oy),
      "z" => r3(oz),
      "t" => 0.0,
      "vx" => r3(vx0),
      "vy" => r3(vy0),
      "vz" => r3(vz0),
      "skip" => false
    }

    {traj, skips, skip_pos, {px, py, pz}, t} =
      do_fly([first], 0, {ox, oy, oz}, {vx0, vy0, vz0}, {wx, wz}, wet, 0.0, max_ticks, [])

    dx = px - ox
    dz = pz - oz
    dist = Float.round(:math.sqrt(dx * dx + dz * dz), 2)

    %{
      trajectory: Enum.reverse(traj),
      skip_positions: Enum.reverse(skip_pos),
      skips: skips,
      distance: dist,
      landing_pos: [r3(px), r3(py), r3(pz)],
      flight_time_ms: round(t * 1000)
    }
  end

  defp do_fly(traj, skips, pos, _vel, _wind, _wet, t, 0, skip_pos), do: {traj, skips, skip_pos, pos, t}

  defp do_fly(traj, skips, {px, py, pz}, {vx, vy, vz}, {wx, wz}, wet, t, left, skip_pos) do
    new_t = t + @dt
    vy = vy - 9.81 * @dt
    vx = (vx + wx * 0.8 * @dt) * 0.997
    vz = (vz + wz * 0.8 * @dt) * 0.997
    px = px + vx * @dt
    py = py + vy * @dt
    pz = pz + vz * @dt

    cond do
      py <= @water_y ->
        hs = :math.sqrt(vx * vx + vz * vz)
        incidence = :math.atan2(-vy, max(hs, 0.01))

        can_skip =
          hs > 2.4 + wet * 2.0 and incidence >= 0.08 and incidence <= 0.42 and skips < @max_skips

        if can_skip do
          skips = skips + 1
          vy = abs(vy) * (0.58 - wet * 0.25)
          vx = vx * (0.84 - wet * 0.12)
          vz = vz * (0.84 - wet * 0.12)
          py = @water_y + 0.01
          pt = point(px, py, pz, new_t, vx, vy, vz, true)

          do_fly(
            [pt | traj],
            skips,
            {px, py, pz},
            {vx, vy, vz},
            {wx, wz},
            wet,
            new_t,
            left - 1,
            [[r3(px), r3(@water_y), r3(pz)] | skip_pos]
          )
        else
          py = @water_y
          pt = point(px, py, pz, new_t, vx, vy, vz, false)
          {[pt | traj], skips, skip_pos, {px, py, pz}, new_t}
        end

      true ->
        pt = point(px, py, pz, new_t, vx, vy, vz, false)

        do_fly(
          [pt | traj],
          skips,
          {px, py, pz},
          {vx, vy, vz},
          {wx, wz},
          wet,
          new_t,
          left - 1,
          skip_pos
        )
    end
  end

  defp point(px, py, pz, t, vx, vy, vz, skip) do
    %{
      "x" => r3(px),
      "y" => r3(py),
      "z" => r3(pz),
      "t" => r3(t),
      "vx" => r3(vx),
      "vy" => r3(vy),
      "vz" => r3(vz),
      "skip" => skip
    }
  end

  defp step_all(state, players) do
    Enum.reduce(state["throwers"], state, fn {slot_str, thrower}, acc ->
      slot = thrower["slot"]
      player = Map.get(players, slot) || Map.get(players, slot_str)
      input = (player && (player[:input_state] || player["input_state"])) || %{}
      live = get_in(acc, ["throwers", slot_str]) || thrower
      {acc, next} = consume_held(acc, live, input)
      next = step_thrower(next)
      put_in(acc, ["throwers", slot_str], next)
    end)
  end

  defp consume_held(state, thrower, input) do
    case validate_controls(input) do
      {:ok, %{"kind" => "neutral"}} ->
        {state, Map.put(thrower, "consumedKind", nil)}

      {:ok, %{"kind" => "environment"}} ->
        {state, thrower}

      {:ok, sanitized} ->
        kind = sanitized["kind"]

        if thrower["consumedKind"] == kind do
          {state, thrower}
        else
          apply_kind(state, Map.put(thrower, "consumedKind", kind), sanitized)
        end

      _ ->
        {state, thrower}
    end
  end

  defp apply_kind(state, thrower, %{"kind" => "leave"}) do
    {state, clear_thrower(thrower)}
  end

  defp apply_kind(state, thrower, %{"kind" => "launch"} = launch) do
    if thrower["phase"] == "flying" do
      {state, thrower}
    else
      result = simulate_skip(launch, state["environment"], thrower["origin"])

      flight = %{
        "launch" => launch,
        "origin" => thrower["origin"],
        "trajectory" => result.trajectory,
        "skipPositions" => result.skip_positions,
        "skips" => result.skips,
        "distance" => result.distance,
        "landingPos" => result.landing_pos,
        "flightTimeMs" => result.flight_time_ms,
        "elapsedMs" => 0,
        "sunk" => false
      }

      next =
        thrower
        |> Map.put("phase", "flying")
        |> Map.put("cleanupTicks", 0)
        |> Map.put("currentThrow", flight)
        |> Map.put("bestSkips", max(thrower["bestSkips"], result.skips))
        |> Map.put("bestDistance", max(thrower["bestDistance"], result.distance))

      {state, next}
    end
  end

  defp apply_kind(state, thrower, _), do: {state, thrower}

  defp clear_thrower(thrower) do
    thrower
    |> Map.put("phase", "idle")
    |> Map.put("currentThrow", nil)
    |> Map.put("cleanupTicks", 0)
    |> Map.put("consumedKind", nil)
  end

  defp step_thrower(%{"currentThrow" => nil} = thrower), do: thrower

  defp step_thrower(thrower) do
    flight = thrower["currentThrow"]

    if not flight["sunk"] do
      elapsed = flight["elapsedMs"] + round(@dt * 1000)
      flight = Map.put(flight, "elapsedMs", elapsed)

      if elapsed >= flight["flightTimeMs"] do
        thrower
        |> Map.put("currentThrow", flight |> Map.put("sunk", true) |> Map.put("elapsedMs", flight["flightTimeMs"]))
        |> Map.put("phase", "sunk")
        |> Map.put("cleanupTicks", @cleanup_ticks)
        |> Map.put("lastThrow", %{
          "skips" => flight["skips"],
          "distance" => flight["distance"],
          "landingPos" => flight["landingPos"],
          "launch" => flight["launch"]
        })
      else
        Map.put(thrower, "currentThrow", flight)
      end
    else
      left = thrower["cleanupTicks"] - 1

      if left <= 0 do
        clear_thrower(thrower)
      else
        Map.put(thrower, "cleanupTicks", left)
      end
    end
  end

  defp normalize_environment(nil, now), do: Map.put(@default_env, "frozenAt", now)

  defp normalize_environment(env, now) when is_map(env) do
    {wx, wz} =
      case Map.get(env, "wind") || Map.get(env, :wind) do
        [a, b] when is_number(a) and is_number(b) -> {clamp(a * 1.0, -1.0, 1.0), clamp(b * 1.0, -1.0, 1.0)}
        _ -> {0.0, 0.0}
      end

    frozen = Map.get(env, "frozenAt") || Map.get(env, :frozenAt) || now

    %{
      "version" => 1,
      "policy" => "frozen",
      "preset" => Map.get(env, "preset") || Map.get(env, :preset),
      "wind" => [wx, wz],
      "windSpeed" =>
        case Map.get(env, "windSpeed") || Map.get(env, :windSpeed) do
          n when is_number(n) -> max(0.0, n * 1.0)
          _ -> :math.sqrt(wx * wx + wz * wz)
        end,
      "rain" => clamp01(Map.get(env, "rain") || Map.get(env, :rain) || 0.2),
      "intensity" => clamp01(Map.get(env, "intensity") || Map.get(env, :intensity) || 0.25),
      "wetness" => clamp01(Map.get(env, "wetness") || Map.get(env, :wetness) || 0.35),
      "timePhase" => clamp01(Map.get(env, "timePhase") || Map.get(env, :timePhase) || 0.4),
      "frozenAt" => if(is_number(frozen), do: frozen, else: now)
    }
  end

  defp normalize_environment(_, now), do: Map.put(@default_env, "frozenAt", now)

  defp r3(v), do: Float.round(v * 1.0, 3)
  defp clamp(v, lo, hi), do: max(lo, min(hi, v))
  defp clamp01(v) when is_number(v), do: clamp(v * 1.0, 0.0, 1.0)
  defp clamp01(_), do: 0.0

  defp float_or(v, _) when is_float(v), do: v
  defp float_or(v, _) when is_integer(v), do: v * 1.0
  defp float_or(_, d), do: d * 1.0
end
