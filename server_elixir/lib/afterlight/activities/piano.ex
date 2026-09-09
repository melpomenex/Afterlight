defmodule Afterlight.Activities.Piano do
  @moduledoc """
  Authoritative Orpheum spatial piano (Task 9.7).

  Note events only — never raw audio. Caps: 20 note-ons/sec, 8-note polyphony,
  2s max duration refreshed while held. All-off on mute.
  """

  @rules_version 1
  @max_notes_per_sec 20
  @max_polyphony 8
  @max_note_ms 2000
  @min_midi 48
  @max_midi 72
  @dt 1.0 / 60.0
  @rate_window_ms 1000

  def rules_version, do: @rules_version
  def max_notes_per_sec, do: @max_notes_per_sec
  def max_polyphony, do: @max_polyphony
  def max_note_ms, do: @max_note_ms

  def init_sim_state(opts \\ []) do
    slots =
      case Keyword.get(opts, :slots) do
        nil -> [0]
        list when is_list(list) -> Enum.take(list, 1)
      end

    %{
      "rulesVersion" => @rules_version,
      "status" => "playing",
      "nowMs" => 0,
      "activeNotes" => [],
      "noteOnTimes" => [],
      "muted" => false,
      "lastKind" => nil,
      "lastCommitId" => nil,
      "activeSlots" => slots,
      "elapsedMs" => 0,
      "tickCount" => 0
    }
  end

  def validate_controls(controls) when is_map(controls) do
    kind = kind_string(Map.get(controls, "kind", Map.get(controls, :kind)))

    case kind do
      "neutral" ->
        {:ok, %{"kind" => "neutral"}}

      k when k in ["all_off", "all-off"] ->
        {:ok, %{"kind" => "all_off", "commitId" => commit_id(controls)}}

      "mute" ->
        {:ok,
         %{
           "kind" => "mute",
           "muted" => truthy(Map.get(controls, "muted", Map.get(controls, :muted))),
           "commitId" => commit_id(controls)
         }}

      k when k in ["note_on", "note_off", "sustain"] ->
        midi = int_or(Map.get(controls, "midi", Map.get(controls, :midi)), nil)

        if is_integer(midi) and midi >= @min_midi and midi <= @max_midi do
          {:ok, %{"kind" => k, "midi" => midi, "commitId" => commit_id(controls)}}
        else
          {:error, :invalid_midi}
        end

      _ ->
        {:error, :unknown_kind}
    end
  end

  def validate_controls(_), do: {:error, :invalid_controls}

  def apply_input(sim_state, slot, controls) do
    case validate_controls(controls) do
      {:ok, %{"kind" => "neutral"}} ->
        {sim_state, nil}

      {:ok, input} ->
        if input["commitId"] != nil and input["commitId"] == sim_state["lastCommitId"] do
          {sim_state, nil}
        else
          now = sim_state["nowMs"] || 0
          sim_state = expire(sim_state, now) |> Map.put("lastCommitId", input["commitId"])
          do_apply(sim_state, slot, input, now)
        end

      _ ->
        {sim_state, nil}
    end
  end

  def step_simulation(sim_state, players, steps \\ 1) do
    n = max(0, trunc(steps || 0))

    sim_state =
      if n > 0 do
        add = round(n * @dt * 1000)
        now = (sim_state["nowMs"] || 0) + add

        sim_state
        |> Map.put("nowMs", now)
        |> Map.put("elapsedMs", (sim_state["elapsedMs"] || 0) + add)
        |> Map.put("tickCount", (sim_state["tickCount"] || 0) + n)
        |> expire(now)
      else
        sim_state
      end

    consume_inputs(sim_state, players)
  end

  defp do_apply(sim_state, slot, %{"kind" => "mute", "muted" => true}, _now) do
    released = Enum.map(sim_state["activeNotes"], & &1["midi"])

    state =
      sim_state
      |> Map.put("muted", true)
      |> Map.put("activeNotes", [])
      |> Map.put("lastKind", "mute")

    {state,
     %{"type" => "all_off", "slot" => slot, "payload" => %{"slot" => slot, "midis" => released, "reason" => "mute"}}}
  end

  defp do_apply(sim_state, slot, %{"kind" => "mute"}, _now) do
    state = sim_state |> Map.put("muted", false) |> Map.put("lastKind", "mute")
    {state, %{"type" => "mute", "slot" => slot, "payload" => %{"slot" => slot, "muted" => false}}}
  end

  defp do_apply(sim_state, slot, %{"kind" => "all_off"}, _now) do
    released = Enum.map(sim_state["activeNotes"], & &1["midi"])

    state =
      sim_state
      |> Map.put("activeNotes", [])
      |> Map.put("lastKind", "all_off")

    {state,
     %{"type" => "all_off", "slot" => slot, "payload" => %{"slot" => slot, "midis" => released, "reason" => "all_off"}}}
  end

  defp do_apply(sim_state, slot, %{"kind" => "note_off", "midi" => midi}, _now) do
    before = length(sim_state["activeNotes"])
    notes = Enum.reject(sim_state["activeNotes"], &(&1["midi"] == midi))
    state = sim_state |> Map.put("activeNotes", notes) |> Map.put("lastKind", "note_off")

    if length(notes) == before do
      {state, nil}
    else
      {state, %{"type" => "note_off", "slot" => slot, "payload" => %{"slot" => slot, "midi" => midi}}}
    end
  end

  defp do_apply(sim_state, slot, %{"kind" => "sustain", "midi" => midi}, now) do
    notes =
      Enum.map(sim_state["activeNotes"], fn n ->
        if n["midi"] == midi, do: Map.put(n, "expiresAt", now + @max_note_ms), else: n
      end)

    if Enum.any?(sim_state["activeNotes"], &(&1["midi"] == midi)) do
      state = sim_state |> Map.put("activeNotes", notes) |> Map.put("lastKind", "sustain")

      {state,
       %{
         "type" => "sustain",
         "slot" => slot,
         "payload" => %{"slot" => slot, "midi" => midi, "expiresAt" => now + @max_note_ms}
       }}
    else
      {sim_state, nil}
    end
  end

  defp do_apply(sim_state, slot, %{"kind" => "note_on", "midi" => midi}, now) do
    times = Enum.filter(sim_state["noteOnTimes"] || [], &(now - &1 < @rate_window_ms))

    cond do
      length(times) >= @max_notes_per_sec ->
        state = sim_state |> Map.put("noteOnTimes", times) |> Map.put("lastKind", "note_on")

        {state, %{"type" => "rate_limited", "slot" => slot, "payload" => %{"slot" => slot, "midi" => midi}}}

      Enum.any?(sim_state["activeNotes"], &(&1["midi"] == midi)) ->
        notes =
          Enum.map(sim_state["activeNotes"], fn n ->
            if n["midi"] == midi do
              n |> Map.put("expiresAt", now + @max_note_ms) |> Map.put("startedAt", now)
            else
              n
            end
          end)

        state = sim_state |> Map.put("activeNotes", notes) |> Map.put("lastKind", "sustain")

        {state,
         %{
           "type" => "sustain",
           "slot" => slot,
           "payload" => %{"slot" => slot, "midi" => midi, "expiresAt" => now + @max_note_ms}
         }}

      true ->
        notes =
          if length(sim_state["activeNotes"]) >= @max_polyphony do
            sim_state["activeNotes"]
            |> Enum.sort_by(& &1["startedAt"])
            |> Enum.drop(1)
          else
            sim_state["activeNotes"]
          end

        note = %{
          "midi" => midi,
          "slot" => slot,
          "startedAt" => now,
          "expiresAt" => now + @max_note_ms
        }

        state =
          sim_state
          |> Map.put("activeNotes", notes ++ [note])
          |> Map.put("noteOnTimes", times ++ [now])
          |> Map.put("lastKind", "note_on")

        {state,
         %{
           "type" => "note_on",
           "slot" => slot,
           "payload" => %{"slot" => slot, "midi" => midi, "expiresAt" => note["expiresAt"]}
         }}
    end
  end

  defp expire(sim_state, now) do
    notes = Enum.filter(sim_state["activeNotes"] || [], &(&1["expiresAt"] > now))
    times = Enum.filter(sim_state["noteOnTimes"] || [], &(now - &1 < @rate_window_ms))

    sim_state
    |> Map.put("activeNotes", notes)
    |> Map.put("noteOnTimes", times)
  end

  defp consume_inputs(sim_state, players) do
    Enum.reduce_while(sim_state["activeSlots"] || [0], {sim_state, nil}, fn slot, {acc, _} ->
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
  defp kind_string(_), do: ""

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

  defp truthy(v) when v in [true, "true", 1, "1"], do: true
  defp truthy(_), do: false
end
