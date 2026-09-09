defmodule Afterlight.Activities.HammerStrike do
  @moduledoc """
  Authoritative Foundry Hammer Strike timing and bell scoring (Task 9.1).

  Specifications:
  - `openspec/changes/add-place-activities-program/specs/signature-place-activities/spec.md`
    (Requirement: Foundry and marsh activities)
  - `design.md` (D5, D6, D7)

  A player commits a timing sample (phase 0..1 or millisecond error). The
  server scores it against a fixed target window and derives bell pitch and
  amplitude from that score. Identical samples always score the same.
  """

  @rules_version 1
  @max_strikes 5
  @dt 1.0 / 60.0
  @cycle_period_ms 1200
  @target_phase 0.5
  @window_phase 0.08
  @bell_min_hz 196.0
  @bell_max_hz 784.0

  def rules_version, do: @rules_version
  def max_strikes, do: @max_strikes
  def target_phase, do: @target_phase
  def window_phase, do: @window_phase
  def cycle_period_ms, do: @cycle_period_ms

  @doc """
  Initializes hammer-strike simulation state.
  """
  def init_sim_state(opts \\ []) do
    slots =
      case Keyword.get(opts, :slots) do
        nil -> [0]
        list when is_list(list) -> list
      end

    %{
      "rulesVersion" => @rules_version,
      "status" => "swinging",
      "cyclePeriodMs" => @cycle_period_ms,
      "targetPhase" => @target_phase,
      "windowPhase" => @window_phase,
      "phase" => 0.0,
      "elapsedMs" => 0.0,
      "tickCount" => 0,
      "maxStrikes" => @max_strikes,
      "remaining" => @max_strikes,
      "strikes" => [],
      "lastStrike" => nil,
      "lastCommitId" => nil,
      "bestScore" => 0.0,
      "totalScore" => 0.0,
      "winner" => nil,
      "resultEmitted" => false,
      "activeSlots" => slots
    }
  end

  @doc """
  Validates a player control payload.
  """
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
        case score_timing_sample(controls) do
          {:ok, scored} ->
            {:ok, Map.put(scored, "kind", "strike")}

          {:error, reason} ->
            {:error, reason}
        end

      _ ->
        {:error, :unknown_kind}
    end
  end

  def validate_controls(_), do: {:error, :invalid_controls}

  @doc """
  Deterministic score and bell parameters from a committed timing sample.
  Phase wins when both phase and errorMs are present.
  """
  def score_timing_sample(sample) when is_map(sample) do
    phase = wrap_phase(Map.get(sample, "phase", Map.get(sample, :phase)))

    {phase, error} =
      if is_number(phase) do
        {phase, timing_error(phase)}
      else
        case phase_error_from_ms(Map.get(sample, "errorMs", Map.get(sample, :errorMs))) do
          nil ->
            {nil, nil}

          from_ms ->
            signed = float_or(Map.get(sample, "errorMs", Map.get(sample, :errorMs)), 0.0)
            signed_phase = wrap_phase(@target_phase + if(signed >= 0.0, do: from_ms, else: -from_ms))
            {signed_phase, from_ms}
        end
      end

    if is_nil(error) do
      {:error, :missing_sample}
    else
      score = clamp(1.0 - error / (@window_phase * 4.0), 0.0, 1.0) |> round4()
      perfect = error <= @window_phase
      bell_hz = round4(@bell_min_hz + score * (@bell_max_hz - @bell_min_hz))
      bell_amp = round4(0.06 + score * 0.24)

      {:ok,
       %{
         "phase" => phase,
         "error" => error,
         "score" => score,
         "perfect" => perfect,
         "bellHz" => bell_hz,
         "bellAmp" => bell_amp,
         "commitId" => commit_id(sample)
       }}
    end
  end

  def score_timing_sample(_), do: {:error, :invalid_sample}

  @doc """
  Apply one committed input. Same sample always yields the same strike record.
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
            record = %{
              "slot" => slot,
              "phase" => strike["phase"],
              "error" => strike["error"],
              "score" => strike["score"],
              "perfect" => strike["perfect"],
              "bellHz" => strike["bellHz"],
              "bellAmp" => strike["bellAmp"],
              "commitId" => strike["commitId"],
              "index" => length(sim_state["strikes"]) + 1
            }

            strikes = sim_state["strikes"] ++ [record]
            remaining = max(0, sim_state["maxStrikes"] - length(strikes))
            best = max(sim_state["bestScore"], record["score"])
            total = round4(sim_state["totalScore"] + record["score"])

            {status, winner} =
              if length(strikes) >= sim_state["maxStrikes"] do
                {"complete", slot}
              else
                {sim_state["status"], sim_state["winner"]}
              end

            state =
              sim_state
              |> Map.put("strikes", strikes)
              |> Map.put("lastStrike", record)
              |> Map.put("lastCommitId", strike["commitId"])
              |> Map.put("remaining", remaining)
              |> Map.put("bestScore", best)
              |> Map.put("totalScore", total)
              |> Map.put("status", status)
              |> Map.put("winner", winner)

            event = %{
              "type" => "hammer_struck",
              "slot" => slot,
              "payload" => record
            }

            {state, event}
          end

        _ ->
          {sim_state, nil}
      end
    end
  end

  @doc """
  Advance the metronome and consume a newly committed strike from player inputs.
  Returns `{sim_state, nil}` or `{sim_state, {:match_ended, slot, details}}`.
  """
  def step_simulation(sim_state, players, steps \\ 1)

  def step_simulation(sim_state, players, steps) do
    n = max(0, trunc(steps || 0))

    sim_state =
      if sim_state["status"] != "complete" and n > 0 do
        tick = sim_state["tickCount"] + n
        elapsed = round4(tick * @dt * 1000.0)
        phase = wrap_phase(elapsed / @cycle_period_ms) || 0.0

        sim_state
        |> Map.put("tickCount", tick)
        |> Map.put("elapsedMs", elapsed)
        |> Map.put("phase", phase)
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
        "bestScore" => sim_state["bestScore"],
        "totalScore" => sim_state["totalScore"],
        "strikes" => Enum.map(sim_state["strikes"], & &1["score"]),
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

  defp wrap_phase(phase) when is_number(phase) do
    p = :math.fmod(phase * 1.0, 1.0)
    p = if p < 0.0, do: p + 1.0, else: p
    round4(p)
  end

  defp wrap_phase(_), do: nil

  defp timing_error(phase) do
    abs(phase - @target_phase) |> round4()
  end

  defp phase_error_from_ms(ms) when is_number(ms) do
    min(0.5, abs(ms * 1.0) / @cycle_period_ms) |> round4()
  end

  defp phase_error_from_ms(_), do: nil

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

  defp clamp(val, min_v, max_v), do: max(min_v, min(max_v, val))

  defp float_or(val, _def) when is_float(val), do: val
  defp float_or(val, _def) when is_integer(val), do: val * 1.0
  defp float_or(_, def), do: def * 1.0

  defp round4(val), do: Float.round(val * 1.0, 4)
end
