defmodule Afterlight.Activities.ForgeChallenge do
  @moduledoc """
  Authoritative Foundry Forge Challenge deformation and scoring (Task 9.2).

  Specifications:
  - `openspec/changes/add-place-activities-program/specs/signature-place-activities/spec.md`
    (Requirement: Foundry and marsh activities — Forge scenario)
  - `design.md` (D5, D6, D7)

  A shared seeded target profile is deformed by bounded strikes. Identical
  strike sequences produce identical profiles and error scores. Heat cools
  on the simulation tick so every spectator sees the same cooling metal.
  """

  @rules_version 1
  @bins 16
  @max_strikes 8
  @dt 1.0 / 60.0
  @strike_strength 0.35
  @sigma 0.12
  @heat_strike 0.55
  @heat_cool_per_sec 0.18
  @default_seed 1

  def rules_version, do: @rules_version
  def bins, do: @bins
  def max_strikes, do: @max_strikes
  def default_seed, do: @default_seed

  @doc """
  Initializes forge-challenge simulation state.
  """
  def init_sim_state(opts \\ []) do
    slots =
      case Keyword.get(opts, :slots) do
        nil -> [0]
        list when is_list(list) -> list
      end

    seed = Keyword.get(opts, :seed, @default_seed)
    target = target_profile(seed)
    stock = initial_profile()
    error = profile_error(stock, target)

    %{
      "rulesVersion" => @rules_version,
      "status" => "forging",
      "seed" => seed,
      "bins" => @bins,
      "target" => target,
      "profile" => stock,
      "heat" => List.duplicate(0.35, @bins),
      "maxStrikes" => @max_strikes,
      "remaining" => @max_strikes,
      "strikes" => [],
      "lastStrike" => nil,
      "lastCommitId" => nil,
      "error" => error,
      "score" => accuracy_from_error(error),
      "elapsedMs" => 0.0,
      "tickCount" => 0,
      "winner" => nil,
      "resultEmitted" => false,
      "activeSlots" => slots
    }
  end

  @doc """
  Shared target height profile. Same seed always yields the same bins.
  """
  def target_profile(seed \\ @default_seed) do
    s = if is_number(seed), do: seed * 1.0, else: @default_seed * 1.0

    Enum.map(0..(@bins - 1), fn i ->
      t = i / (@bins - 1)

      height =
        0.38 +
          0.22 * :math.sin((t + s * 0.17) * :math.pi()) +
          0.1 * :math.sin(t * :math.pi() * 2.0 + s) +
          0.08 * (1.0 - t)

      clamp(height, 0.15, 0.95) |> round4()
    end)
  end

  def initial_profile, do: List.duplicate(1.0, @bins)

  @doc """
  Apply one Gaussian dent. Pure: same (profile, position, force) => same result.
  """
  def deform_profile(profile, position, force) do
    pos = clamp01(position)
    f = clamp01(force)
    src = if is_list(profile), do: profile, else: initial_profile()
    two_sigma_sq = 2.0 * @sigma * @sigma

    Enum.map(0..(@bins - 1), fn i ->
      t = i / (@bins - 1)
      dist = t - pos
      dent = f * @strike_strength * :math.exp(-(dist * dist) / two_sigma_sq)
      current = Enum.at(src, i) || 1.0
      clamp(current - dent, 0.0, 1.0) |> round4()
    end)
  end

  def add_strike_heat(heat, position, force) do
    pos = clamp01(position)
    f = clamp01(force)
    src = if is_list(heat), do: heat, else: List.duplicate(0.0, @bins)
    two_sigma_sq = 2.0 * @sigma * @sigma

    Enum.map(0..(@bins - 1), fn i ->
      t = i / (@bins - 1)
      dist = t - pos
      add = f * @heat_strike * :math.exp(-(dist * dist) / two_sigma_sq)
      current = Enum.at(src, i) || 0.0
      clamp(current + add, 0.0, 1.0) |> round4()
    end)
  end

  def profile_error(profile, target) do
    a = if is_list(profile), do: profile, else: []
    b = if is_list(target), do: target, else: []

    sum =
      Enum.reduce(0..(@bins - 1), 0.0, fn i, acc ->
        d = (Enum.at(a, i) || 0.0) - (Enum.at(b, i) || 0.0)
        acc + d * d
      end)

    :math.sqrt(sum / @bins) |> round4()
  end

  def accuracy_from_error(error) when is_number(error) do
    clamp(1.0 - error * 1.0, 0.0, 1.0) |> round4()
  end

  def accuracy_from_error(_), do: 0.0

  def cool_heat(heat, dt_seconds) when is_number(dt_seconds) do
    drop = @heat_cool_per_sec * max(0.0, dt_seconds * 1.0)
    src = if is_list(heat), do: heat, else: []

    Enum.map(0..(@bins - 1), fn i ->
      current = Enum.at(src, i) || 0.0
      max(0.0, current - drop) |> round4()
    end)
  end

  def cool_heat(heat, _), do: cool_heat(heat, 0.0)

  def validate_controls(controls) when is_map(controls) do
    kind =
      controls
      |> Map.get("kind", "strike")
      |> kind_string()

    case kind do
      "neutral" ->
        {:ok, %{"kind" => "neutral"}}

      "ready" ->
        {:ok, %{"kind" => "ready"}}

      "strike" ->
        position = clamp01(Map.get(controls, "position", Map.get(controls, :position, 0.0))) |> round4()
        force = clamp01(Map.get(controls, "force", Map.get(controls, :force, 0.6))) |> round4()

        {:ok,
         %{
           "kind" => "strike",
           "position" => position,
           "force" => force,
           "commitId" => commit_id(controls)
         }}

      _ ->
        {:error, :unknown_kind}
    end
  end

  def validate_controls(_), do: {:error, :invalid_controls}

  @doc """
  Apply one strike. Identical inputs yield identical next profiles.
  """
  def apply_input(sim_state, slot, controls) do
    if sim_state["status"] == "complete" do
      {sim_state, nil}
    else
      case validate_controls(controls) do
        {:ok, %{"kind" => "strike"} = strike} ->
          if strike["commitId"] != nil and strike["commitId"] == sim_state["lastCommitId"] do
            {sim_state, nil}
          else
            profile = deform_profile(sim_state["profile"], strike["position"], strike["force"])
            heat = add_strike_heat(sim_state["heat"], strike["position"], strike["force"])
            error = profile_error(profile, sim_state["target"])
            score = accuracy_from_error(error)

            record = %{
              "slot" => slot,
              "position" => strike["position"],
              "force" => strike["force"],
              "commitId" => strike["commitId"],
              "error" => error,
              "score" => score,
              "index" => length(sim_state["strikes"]) + 1
            }

            strikes = sim_state["strikes"] ++ [record]
            remaining = max(0, sim_state["maxStrikes"] - length(strikes))

            {status, winner} =
              if length(strikes) >= sim_state["maxStrikes"] do
                {"complete", slot}
              else
                {sim_state["status"], sim_state["winner"]}
              end

            state =
              sim_state
              |> Map.put("profile", profile)
              |> Map.put("heat", heat)
              |> Map.put("error", error)
              |> Map.put("score", score)
              |> Map.put("strikes", strikes)
              |> Map.put("lastStrike", record)
              |> Map.put("lastCommitId", strike["commitId"])
              |> Map.put("remaining", remaining)
              |> Map.put("status", status)
              |> Map.put("winner", winner)

            event = %{
              "type" => "forge_struck",
              "slot" => slot,
              "payload" => Map.merge(record, %{"profile" => profile, "heat" => heat})
            }

            {state, event}
          end

        _ ->
          {sim_state, nil}
      end
    end
  end

  @doc """
  Cool the bar and consume a newly committed strike from player inputs.
  Returns `{sim_state, nil}` or `{sim_state, {:match_ended, slot, details}}`.
  """
  def step_simulation(sim_state, players, steps \\ 1)

  def step_simulation(sim_state, players, steps) do
    n = max(0, trunc(steps || 0))

    sim_state =
      if n > 0 do
        tick = sim_state["tickCount"] + n
        elapsed = round4(tick * @dt * 1000.0)
        heat = cool_heat(sim_state["heat"], n * @dt)

        sim_state
        |> Map.put("tickCount", tick)
        |> Map.put("elapsedMs", elapsed)
        |> Map.put("heat", heat)
      else
        sim_state
      end

    {sim_state, _strike_event} =
      if sim_state["status"] == "complete" do
        {sim_state, nil}
      else
        consume_pending_strike(sim_state, players)
      end

    if sim_state["status"] == "complete" and not sim_state["resultEmitted"] do
      details = %{
        "winnerSlot" => sim_state["winner"],
        "error" => sim_state["error"],
        "score" => sim_state["score"],
        "profile" => sim_state["profile"],
        "reason" => "strikes_complete"
      }

      {Map.put(sim_state, "resultEmitted", true), {:match_ended, sim_state["winner"], details}}
    else
      {sim_state, nil}
    end
  end

  defp consume_pending_strike(sim_state, players) do
    slots = sim_state["activeSlots"] || [0]

    Enum.reduce_while(slots, {sim_state, nil}, fn slot, {acc, _} ->
      input = player_input(players, slot)

      if is_map(input) do
        {next, event} = apply_input(acc, slot, input)

        if event do
          {:halt, {next, event}}
        else
          {:cont, {acc, nil}}
        end
      else
        {:cont, {acc, nil}}
      end
    end)
  end

  defp player_input(players, slot) when is_map(players) do
    entry = Map.get(players, slot) || Map.get(players, to_string(slot))

    cond do
      is_nil(entry) -> nil
      is_map(entry) -> entry[:input_state] || entry["input_state"] || entry[:inputState] || entry
      true -> nil
    end
  end

  defp player_input(_, _), do: nil

  defp commit_id(sample) do
    raw = Map.get(sample, "commitId", Map.get(sample, :commitId))

    cond do
      is_integer(raw) -> raw
      is_float(raw) -> trunc(raw)
      true -> nil
    end
  end

  defp kind_string(kind) when is_binary(kind), do: String.downcase(kind)
  defp kind_string(kind) when is_atom(kind), do: kind |> Atom.to_string() |> String.downcase()
  defp kind_string(_), do: "strike"

  defp clamp01(val), do: clamp(float_or(val, 0.0), 0.0, 1.0)

  defp clamp(val, min_v, max_v), do: max(min_v, min(max_v, val))

  defp float_or(val, _def) when is_float(val), do: val
  defp float_or(val, _def) when is_integer(val), do: val * 1.0
  defp float_or(_, def), do: def * 1.0

  defp round4(val), do: Float.round(val * 1.0, 4)
end
