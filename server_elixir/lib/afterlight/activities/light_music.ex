defmodule Afterlight.Activities.LightMusic do
  @moduledoc """
  Authoritative Understory cooperative light/music puzzle (Task 9.5).

  One to four people share a four-pad sequence. Completion is cooperative
  with no ranking.
  """

  import Bitwise

  @rules_version 1
  @pad_count 4
  @sequence_length 8
  @dt 1.0 / 60.0

  def rules_version, do: @rules_version
  def sequence_length, do: @sequence_length

  def init_sim_state(opts \\ []) do
    slots =
      case Keyword.get(opts, :slots) do
        nil -> [0]
        list when is_list(list) -> Enum.filter(list, &(&1 >= 0 and &1 < 4))
      end

    seed = Keyword.get(opts, :seed, 42)

    participants =
      Map.new(slots, fn slot ->
        {to_string(slot), %{"slot" => slot, "presses" => 0}}
      end)

    %{
      "rulesVersion" => @rules_version,
      "status" => "playing",
      "seed" => seed,
      "sequence" => generate_sequence(seed),
      "progress" => 0,
      "lastPad" => nil,
      "lastSlot" => nil,
      "lastResult" => nil,
      "completed" => false,
      "winner" => nil,
      "standings" => [],
      "activeSlots" => slots,
      "participants" => participants,
      "lastCommitId" => nil,
      "elapsedMs" => 0,
      "tickCount" => 0
    }
  end

  def generate_sequence(seed, length \\ @sequence_length) do
    {seq, _} =
      Enum.map_reduce(1..length, band(trunc(seed || 0), 0xFFFFFFFF), fn _, s ->
        s = band(s * 1_664_525 + 1_013_904_223, 0xFFFFFFFF)
        {rem(s, @pad_count), s}
      end)

    seq
  end

  def validate_controls(controls) when is_map(controls) do
    kind = kind_string(Map.get(controls, "kind", Map.get(controls, :kind, "press")))

    case kind do
      "neutral" ->
        {:ok, %{"kind" => "neutral"}}

      "reset" ->
        {:ok, %{"kind" => "reset", "commitId" => commit_id(controls)}}

      "press" ->
        pad = int_or(Map.get(controls, "pad", Map.get(controls, :pad)), nil)

        if is_integer(pad) and pad >= 0 and pad < @pad_count do
          {:ok, %{"kind" => "press", "pad" => pad, "commitId" => commit_id(controls)}}
        else
          {:error, :invalid_pad}
        end

      _ ->
        {:error, :unknown_kind}
    end
  end

  def validate_controls(_), do: {:error, :invalid_controls}

  def apply_input(sim_state, slot, controls) do
    if sim_state["status"] == "complete" do
      {sim_state, nil}
    else
      case validate_controls(controls) do
        {:ok, %{"kind" => "neutral"}} ->
          {sim_state, nil}

        {:ok, input} ->
          if input["commitId"] != nil and input["commitId"] == sim_state["lastCommitId"] do
            {sim_state, nil}
          else
            do_apply(sim_state, slot, input)
          end

        _ ->
          {sim_state, nil}
      end
    end
  end

  def step_simulation(sim_state, players, steps \\ 1) do
    n = max(0, trunc(steps || 0))

    sim_state =
      if sim_state["status"] != "complete" and n > 0 do
        sim_state
        |> Map.put("tickCount", sim_state["tickCount"] + n)
        |> Map.put("elapsedMs", sim_state["elapsedMs"] + round(n * @dt * 1000))
      else
        sim_state
      end

    {sim_state, event} = consume_inputs(sim_state, players)

    cond do
      match?(%{"type" => "puzzle_complete"}, event) ->
        details = %{
          "reason" => "solved",
          "ranked" => false,
          "participants" => sim_state["activeSlots"]
        }

        {sim_state, {:match_ended, nil, details}}

      true ->
        {sim_state, event}
    end
  end

  defp do_apply(sim_state, slot, %{"kind" => "reset"} = input) do
    slot_str = to_string(slot)

    if Map.has_key?(sim_state["participants"], slot_str) do
      state =
        sim_state
        |> Map.put("progress", 0)
        |> Map.put("lastPad", nil)
        |> Map.put("lastSlot", slot)
        |> Map.put("lastResult", "reset")
        |> Map.put("lastCommitId", input["commitId"])

      {state,
       %{
         "type" => "sequence_reset",
         "slot" => slot,
         "payload" => %{"slot" => slot, "progress" => 0, "reason" => "manual"}
       }}
    else
      {sim_state, nil}
    end
  end

  defp do_apply(sim_state, slot, %{"kind" => "press", "pad" => pad} = input) do
    slot_str = to_string(slot)
    participant = get_in(sim_state, ["participants", slot_str])

    if is_nil(participant) do
      {sim_state, nil}
    else
      presses = participant["presses"] + 1
      sim_state = put_in(sim_state, ["participants", slot_str, "presses"], presses)
      sim_state = Map.put(sim_state, "lastCommitId", input["commitId"])
      expected = Enum.at(sim_state["sequence"], sim_state["progress"])

      if pad != expected do
        state =
          sim_state
          |> Map.put("progress", 0)
          |> Map.put("lastPad", pad)
          |> Map.put("lastSlot", slot)
          |> Map.put("lastResult", "miss")

        {state,
         %{
           "type" => "sequence_reset",
           "slot" => slot,
           "payload" => %{"slot" => slot, "pad" => pad, "progress" => 0, "reason" => "miss"}
         }}
      else
        progress = sim_state["progress"] + 1

        state =
          sim_state
          |> Map.put("progress", progress)
          |> Map.put("lastPad", pad)
          |> Map.put("lastSlot", slot)
          |> Map.put("lastResult", "hit")

        if progress >= length(state["sequence"]) do
          state =
            state
            |> Map.put("status", "complete")
            |> Map.put("completed", true)
            |> Map.put("winner", nil)
            |> Map.put("standings", [])

          {state,
           %{
             "type" => "puzzle_complete",
             "slot" => nil,
             "payload" => %{
               "progress" => progress,
               "sequence" => state["sequence"],
               "participants" => state["activeSlots"],
               "ranked" => false
             }
           }}
        else
          {state,
           %{
             "type" => "pad_hit",
             "slot" => slot,
             "payload" => %{
               "slot" => slot,
               "pad" => pad,
               "progress" => progress,
               "remaining" => length(state["sequence"]) - progress
             }
           }}
        end
      end
    end
  end

  defp consume_inputs(sim_state, players) do
    Enum.reduce_while(sim_state["activeSlots"] || [], {sim_state, nil}, fn slot, {acc, _} ->
      input = player_input(players, slot)

      if is_map(input) do
        {next, event} = apply_input(acc, slot, input)

        if event do
          {:halt, {next, event}}
        else
          {:cont, {next, nil}}
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
      is_map(entry) -> entry[:input_state] || entry["input_state"] || entry[:inputState] || nil
      true -> nil
    end
  end

  defp player_input(_, _), do: nil

  defp kind_string(kind) when is_binary(kind), do: String.downcase(kind)
  defp kind_string(kind) when is_atom(kind), do: kind |> Atom.to_string() |> String.downcase()
  defp kind_string(_), do: "press"

  defp commit_id(sample) do
    raw = Map.get(sample, "commitId", Map.get(sample, :commitId))

    cond do
      is_integer(raw) -> raw
      is_float(raw) -> trunc(raw)
      true -> nil
    end
  end

  defp int_or(v, _) when is_integer(v), do: v
  defp int_or(v, _) when is_float(v), do: trunc(v)
  defp int_or(_, def), do: def
end
