defmodule Afterlight.Activities.Fishing do
  @moduledoc """
  Authoritative shoreline fishing (Task 9.3).

  Specifications:
  - `openspec/changes/add-place-activities-program/specs/signature-place-activities/spec.md`
    (Requirement: Foundry and marsh activities — Fishing together)
  - `design.md` (D5, D7)

  Guarantees:
  - Cast / bobber / bite / reel / release using LIVE timestamped weather.
  - Nearby visitors see every line; reel and leave are independent.
  - Catch/release is social display only — no inventory, economy, or crop writes.
  """

  @rules_version 1
  @dt 1.0 / 60.0
  @water_y 0.22
  @min_cast 2.0
  @max_cast 6.5
  @cast_ticks 24
  @bite_window_ticks 180
  @reel_ticks 90
  @recent_cap 8

  @rod_origins %{
    0 => [-0.45, 1.15, 0.2],
    1 => [0.45, 1.15, 0.2],
    2 => [-0.2, 1.15, 0.4],
    3 => [0.2, 1.15, 0.4]
  }

  @default_env %{
    "version" => 1,
    "policy" => "live",
    "preset" => nil,
    "wind" => [0.0, 0.0],
    "windSpeed" => 0.0,
    "rain" => 0.25,
    "intensity" => 0.3,
    "wetness" => 0.4,
    "timePhase" => 0.4,
    "frozenAt" => nil
  }

  def rules_version, do: @rules_version

  @doc """
  Initializes an open social fishing session.
  """
  def init_sim_state(opts \\ []) do
    slots =
      case Keyword.get(opts, :slots) do
        nil -> [0, 1]
        list when is_list(list) -> list
      end

    env = normalize_environment(Keyword.get(opts, :environment))
    seed = Keyword.get(opts, :seed, 42)
    now_ms = Keyword.get(opts, :now_ms, 0)

    anglers =
      Map.new(slots, fn slot ->
        origin = Map.get(@rod_origins, slot, @rod_origins[0])

        {to_string(slot),
         %{
           "slot" => slot,
           "phase" => "idle",
           "power" => 0.0,
           "origin" => origin,
           "rodTip" => origin,
           "bobber" => nil,
           "line" => nil,
           "biteTicksLeft" => 0,
           "reelTicksLeft" => 0,
           "castTicksLeft" => 0,
           "castTarget" => nil,
           "lastCatch" => nil,
           "consumedKind" => nil
         }}
      end)

    %{
      "rulesVersion" => @rules_version,
      "status" => "open",
      "tickCount" => 0,
      "elapsedMs" => 0,
      "seed" => seed,
      "environment" => env,
      "environmentAt" => now_ms,
      "anglers" => anglers,
      "recentReleases" => []
    }
  end

  def validate_controls(controls) when is_map(controls) do
    kind = Map.get(controls, "kind")

    case kind do
      "neutral" ->
        {:ok, %{"kind" => "neutral"}}

      "reel" ->
        {:ok, %{"kind" => "reel"}}

      "release" ->
        {:ok, %{"kind" => "release"}}

      "leave" ->
        {:ok, %{"kind" => "leave"}}

      "cast" ->
        {:ok, %{"kind" => "cast", "power" => clamp(float_or(Map.get(controls, "power"), 0.65), 0.15, 1.0)}}

      "environment" ->
        {:ok,
         %{
           "kind" => "environment",
           "environment" => normalize_environment(Map.get(controls, "environment")),
           "nowMs" => int_or(Map.get(controls, "nowMs"), 0)
         }}

      _ ->
        {:error, :unknown_kind}
    end
  end

  def validate_controls(_), do: {:error, :invalid_controls}

  @doc """
  Applies a discrete input. Returns `{:ok, sim_state, event | nil}` or `{:error, reason}`.
  """
  def apply_input(sim_state, slot, input) do
    case validate_controls(input) do
      {:ok, sanitized} ->
        {:ok, do_apply_input(sim_state, slot, sanitized)}

      {:error, reason} ->
        {:error, reason}
    end
  end

  def apply_environment(sim_state, env, now_ms \\ 0) do
    sim_state
    |> Map.put("environment", normalize_environment(env))
    |> Map.put("environmentAt", now_ms)
  end

  @doc """
  Advances live bobber / bite / reel simulation. Never ends the social session.
  """
  def step_simulation(sim_state, players, steps \\ 1)

  def step_simulation(sim_state, _players, steps) when steps <= 0, do: {sim_state, nil}

  def step_simulation(sim_state, players, steps) do
    state =
      Enum.reduce(1..steps, sim_state, fn _, acc ->
        acc
        |> Map.update!("tickCount", &(&1 + 1))
        |> Map.update!("elapsedMs", &(&1 + round(@dt * 1000)))
        |> step_all_anglers(players)
      end)

    {state, nil}
  end

  defp step_all_anglers(state, players) do
    Enum.reduce(state["anglers"], state, fn {slot_str, angler}, acc ->
      slot = angler["slot"]
      player = Map.get(players, slot) || Map.get(players, slot_str)
      input = (player && (player[:input_state] || player["input_state"])) || %{}
      live = get_in(acc, ["anglers", slot_str]) || angler
      {acc, next_angler} = consume_held_input(acc, live, input)
      next_angler = step_angler(acc, next_angler)
      put_in(acc, ["anglers", slot_str], next_angler)
    end)
  end

  defp consume_held_input(state, angler, input) do
    case validate_controls(input) do
      {:ok, %{"kind" => "neutral"}} ->
        {state, Map.put(angler, "consumedKind", nil)}

      {:ok, %{"kind" => "environment"} = sanitized} ->
        {apply_environment(state, sanitized["environment"], sanitized["nowMs"]), angler}

      {:ok, sanitized} ->
        kind = sanitized["kind"]

        if angler["consumedKind"] == kind do
          {state, angler}
        else
          {next_state, next_angler, _ev} = apply_kind(state, Map.put(angler, "consumedKind", kind), sanitized)
          {next_state, next_angler}
        end

      _ ->
        {state, angler}
    end
  end

  defp do_apply_input(sim_state, _slot, %{"kind" => "environment"} = sanitized) do
    apply_environment(sim_state, sanitized["environment"], sanitized["nowMs"])
  end

  defp do_apply_input(sim_state, slot, sanitized) do
    slot_str = to_string(slot)

    case get_in(sim_state, ["anglers", slot_str]) do
      nil ->
        sim_state

      angler ->
        {state, next, _ev} = apply_kind(sim_state, angler, sanitized)
        put_in(state, ["anglers", slot_str], next)
    end
  end

  defp apply_kind(state, angler, %{"kind" => "cast", "power" => power}) do
    if angler["phase"] != "idle" do
      {state, angler, nil}
    else
      landing = landing(angler["origin"], power, state["environment"])

      next =
        angler
        |> Map.put("phase", "casting")
        |> Map.put("power", power)
        |> Map.put("castTicksLeft", @cast_ticks)
        |> Map.put("bobber", angler["origin"])
        |> Map.put("castTarget", landing)
        |> Map.put("line", [angler["rodTip"], angler["origin"]])

      {state, next, %{"type" => "line_cast", "slot" => angler["slot"]}}
    end
  end

  defp apply_kind(state, angler, %{"kind" => "reel"}) do
    if angler["phase"] != "bite" do
      {state, angler, nil}
    else
      species = pick_species(state["environment"], state["seed"], angler["slot"], state["tickCount"])
      length = Float.round(12.0 + unit_noise(state["seed"] + 3, angler["slot"], state["tickCount"] + 1) * 28.0, 1)

      catch_record = %{
        "species" => species,
        "lengthCm" => length,
        "released" => false,
        "environmentAt" => state["environmentAt"]
      }

      next =
        angler
        |> Map.put("phase", "reeling")
        |> Map.put("reelTicksLeft", @reel_ticks)
        |> Map.put("biteTicksLeft", 0)
        |> Map.put("lastCatch", catch_record)

      {state, next, %{"type" => "fish_hooked", "slot" => angler["slot"]}}
    end
  end

  defp apply_kind(state, angler, %{"kind" => "release"}) do
    if angler["phase"] != "catch" or is_nil(angler["lastCatch"]) do
      {state, angler, nil}
    else
      released = Map.put(angler["lastCatch"], "released", true)
      entry = %{
        "slot" => angler["slot"],
        "species" => released["species"],
        "lengthCm" => released["lengthCm"],
        "tick" => state["tickCount"]
      }

      recent = Enum.take([entry | state["recentReleases"]], @recent_cap)
      state = Map.put(state, "recentReleases", recent)
      {state, reset_line(Map.put(angler, "lastCatch", released)), %{"type" => "fish_released"}}
    end
  end

  defp apply_kind(state, angler, %{"kind" => "leave"}) do
    {state, reset_line(Map.put(angler, "consumedKind", nil)), %{"type" => "line_cleared"}}
  end

  defp apply_kind(state, angler, %{"kind" => "neutral"}) do
    {state, Map.put(angler, "consumedKind", nil), nil}
  end

  defp apply_kind(state, angler, _), do: {state, angler, nil}

  defp reset_line(angler) do
    angler
    |> Map.put("phase", "idle")
    |> Map.put("bobber", nil)
    |> Map.put("line", nil)
    |> Map.put("castTarget", nil)
    |> Map.put("biteTicksLeft", 0)
    |> Map.put("reelTicksLeft", 0)
    |> Map.put("castTicksLeft", 0)
  end

  defp step_angler(state, angler) do
    env = state["environment"] || @default_env

    case angler["phase"] do
      "casting" ->
        left = angler["castTicksLeft"] - 1
        t = 1.0 - max(0, left) / @cast_ticks
        [ox, oy, oz] = angler["origin"]
        [tx, _ty, tz] = angler["castTarget"]
        arc = :math.sin(min(1.0, t) * :math.pi()) * 0.85

        bobber = [
          r3(lerp(ox, tx, t)),
          r3(lerp(oy, @water_y, t) + arc * (1.0 - t)),
          r3(lerp(oz, tz, t))
        ]

        next =
          angler
          |> Map.put("castTicksLeft", left)
          |> Map.put("bobber", bobber)
          |> Map.put("line", [angler["rodTip"], bobber])

        if left <= 0 do
          target = angler["castTarget"]

          next
          |> Map.put("phase", "waiting")
          |> Map.put("bobber", target)
          |> Map.put("line", [angler["rodTip"], target])
        else
          next
        end

      "waiting" ->
        [wx, wz] = env["wind"] || [0.0, 0.0]
        [bx, _by, bz] = angler["bobber"]
        bobber = [r3(bx + wx * 0.15 * @dt), @water_y, r3(bz + wz * 0.10 * @dt)]
        chance = bite_chance(env)

        next =
          angler
          |> Map.put("bobber", bobber)
          |> Map.put("line", [angler["rodTip"], bobber])

        if unit_noise(state["seed"], angler["slot"], state["tickCount"]) < chance do
          next
          |> Map.put("phase", "bite")
          |> Map.put("biteTicksLeft", @bite_window_ticks)
        else
          next
        end

      "bite" ->
        [bx, _, bz] = angler["bobber"]
        bobber = [bx, @water_y - 0.08, bz]
        left = angler["biteTicksLeft"] - 1

        next =
          angler
          |> Map.put("bobber", bobber)
          |> Map.put("line", [angler["rodTip"], bobber])
          |> Map.put("biteTicksLeft", left)

        if left <= 0, do: reset_line(next), else: next

      "reeling" ->
        left = angler["reelTicksLeft"] - 1
        t = 1.0 - max(0, left) / @reel_ticks
        [ox, _, oz] = angler["origin"]
        [bx, by, bz] = angler["bobber"]
        bobber = [
          r3(lerp(bx, ox, 0.08 + t * 0.12)),
          r3(lerp(by, @water_y, 0.2)),
          r3(lerp(bz, oz, 0.08 + t * 0.12))
        ]

        next =
          angler
          |> Map.put("reelTicksLeft", left)
          |> Map.put("bobber", bobber)
          |> Map.put("line", [angler["rodTip"], bobber])

        if left <= 0 do
          land = [ox, @water_y, oz - 0.35]

          next
          |> Map.put("phase", "catch")
          |> Map.put("bobber", land)
          |> Map.put("line", [angler["rodTip"], land])
        else
          next
        end

      _ ->
        angler
    end
  end

  def bite_chance(env) do
    env = normalize_environment(env)
    rain = env["rain"]
    phase = env["timePhase"]
    dawn = max(0.0, 1.0 - abs(phase - 0.15) / 0.2)
    dusk = max(0.0, 1.0 - abs(phase - 0.85) / 0.2)
    0.003 + rain * 0.006 + max(dawn, dusk) * 0.004
  end

  def pick_species(env, seed, slot, tick) do
    env = normalize_environment(env)
    n = unit_noise(seed + 7, slot, tick)
    twilight = max(
      max(0.0, 1.0 - abs(env["timePhase"] - 0.15) / 0.2),
      max(0.0, 1.0 - abs(env["timePhase"] - 0.85) / 0.2)
    )

    cond do
      env["rain"] > 0.55 -> if n > 0.5, do: "silver-perch", else: "storm-eel"
      twilight > 0.5 -> if n > 0.4, do: "dusk-catfish", else: "dawn-shiner"
      env["windSpeed"] > 0.45 -> "skipjack"
      true -> if n > 0.5, do: "reed-sunfish", else: "basin-minnow"
    end
  end

  def unit_noise(seed, slot, tick) do
    n = u32(i32(seed * 1_664_525) + i32(slot * 1_013_904_223) + i32(tick * 2_246_822_519))
    rem(n, 10_000) / 10_000.0
  end

  defp landing([ox, _oy, oz], power, env) do
    env = normalize_environment(env)
    [wx, wz] = env["wind"]
    dist = @min_cast + power * (@max_cast - @min_cast)
    [r3(ox + wx * 0.8), @water_y, r3(oz - dist + wz * 0.4)]
  end

  defp normalize_environment(nil), do: @default_env

  defp normalize_environment(env) when is_map(env) do
    {wx, wz} =
      case Map.get(env, "wind") || Map.get(env, :wind) do
        [a, b] when is_number(a) and is_number(b) -> {clamp(a * 1.0, -1.0, 1.0), clamp(b * 1.0, -1.0, 1.0)}
        _ -> {0.0, 0.0}
      end

    rain = clamp01(Map.get(env, "rain") || Map.get(env, :rain) || 0.25)
    intensity = clamp01(Map.get(env, "intensity") || Map.get(env, :intensity) || 0.3)
    wetness = clamp01(Map.get(env, "wetness") || Map.get(env, :wetness) || 0.4)
    phase = clamp01(Map.get(env, "timePhase") || Map.get(env, :timePhase) || 0.4)
    wind_speed = Map.get(env, "windSpeed") || Map.get(env, :windSpeed)
    wind_speed = if is_number(wind_speed), do: max(0.0, wind_speed * 1.0), else: :math.sqrt(wx * wx + wz * wz)

    %{
      "version" => 1,
      "policy" => "live",
      "preset" => Map.get(env, "preset") || Map.get(env, :preset),
      "wind" => [wx, wz],
      "windSpeed" => wind_speed,
      "rain" => rain,
      "intensity" => intensity,
      "wetness" => wetness,
      "timePhase" => phase,
      "frozenAt" => nil
    }
  end

  defp normalize_environment(_), do: @default_env

  defp lerp(a, b, t), do: a + (b - a) * t
  defp r3(v), do: Float.round(v * 1.0, 3)
  defp clamp(v, lo, hi), do: max(lo, min(hi, v))
  defp clamp01(v) when is_number(v), do: clamp(v * 1.0, 0.0, 1.0)
  defp clamp01(_), do: 0.0

  defp float_or(v, _) when is_float(v), do: v
  defp float_or(v, _) when is_integer(v), do: v * 1.0
  defp float_or(_, d), do: d * 1.0

  defp int_or(v, _) when is_integer(v), do: v
  defp int_or(v, _) when is_float(v), do: trunc(v)
  defp int_or(_, d), do: d

  defp i32(n) do
    n = rem(n, 4_294_967_296)
    n = if n < 0, do: n + 4_294_967_296, else: n
    if n >= 2_147_483_648, do: n - 4_294_967_296, else: n
  end

  defp u32(n) do
    n = rem(n, 4_294_967_296)
    if n < 0, do: n + 4_294_967_296, else: n
  end
end
