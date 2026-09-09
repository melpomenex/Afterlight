defmodule Afterlight.Activities.PhotoBooth do
  @moduledoc """
  Authoritative Orpheum photo booth roster and capture gating (Task 9.8).

  Two to three avatars. Declines/departures exclude that person. Capture waits
  while anyone is pending, or proceeds without them. The wire never carries
  image bytes — download is local only.
  """

  @rules_version 1
  @min_players 2
  @max_players 3
  @pose_count 4
  @countdown_ms 3000
  @pose_ms 1200
  @dt 1.0 / 60.0
  @poses ["wave", "peace", "lean", "together"]

  def rules_version, do: @rules_version
  def poses, do: @poses
  def pose_count, do: @pose_count

  def init_sim_state(opts \\ []) do
    slots =
      case Keyword.get(opts, :slots) do
        nil -> [0, 1]
        list when is_list(list) -> Enum.take(list, @max_players)
      end

    %{
      "rulesVersion" => @rules_version,
      "status" => "idle",
      "proposedSlots" => slots,
      "roster" => empty_roster(slots),
      "acceptedSlots" => [],
      "declinedSlots" => [],
      "departedSlots" => [],
      "countdownMs" => 0,
      "poseIndex" => 0,
      "poses" => @poses,
      "poseMs" => 0,
      "stripReady" => false,
      "captureAllowed" => false,
      "captureRules" => %{
        "includeTheaterMedia" => false,
        "includeChat" => false,
        "includeBystanders" => false,
        "upload" => false,
        "download" => "local",
        "scene" => "booth-offscreen"
      },
      "imageBytes" => nil,
      "uploadRequested" => false,
      "lastCommitId" => nil,
      "elapsedMs" => 0,
      "tickCount" => 0
    }
  end

  def capture_subjects(sim_state) do
    %{
      "slots" => slots_with(sim_state, "accepted"),
      "includeTheaterMedia" => false,
      "includeChat" => false,
      "includeBystanders" => false,
      "upload" => false,
      "scene" => "booth-offscreen"
    }
  end

  def local_download(sim_state) do
    if sim_state["stripReady"] do
      %{"localOnly" => true, "upload" => false, "filename" => "afterlight-orpheum-strip.png"}
    else
      nil
    end
  end

  def validate_controls(controls) when is_map(controls) do
    kind = kind_string(Map.get(controls, "kind", Map.get(controls, :kind)))

    case kind do
      "neutral" ->
        {:ok, %{"kind" => "neutral"}}

      "invite" ->
        raw = Map.get(controls, "slots", Map.get(controls, :slots, []))

        slots =
          raw
          |> List.wrap()
          |> Enum.map(&int_or(&1, :invalid))

        if Enum.any?(slots, &(&1 == :invalid)) or
             Enum.any?(slots, &(not is_integer(&1) or &1 < 0 or &1 >= @max_players)) do
          {:error, :invalid_invite}
        else
          slots = Enum.uniq(slots)

          if length(slots) >= @min_players and length(slots) <= @max_players do
            {:ok, %{"kind" => "invite", "slots" => slots, "commitId" => commit_id(controls)}}
          else
            {:error, :invalid_invite}
          end
        end

      k when k in ["accept", "decline", "depart", "start", "reset"] ->
        {:ok, %{"kind" => k, "commitId" => commit_id(controls)}}

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
          do_apply(Map.put(sim_state, "lastCommitId", input["commitId"]), slot, input)
        end

      _ ->
        {sim_state, nil}
    end
  end

  def step_simulation(sim_state, players, steps \\ 1) do
    n = max(0, trunc(steps || 0))
    add = if n > 0, do: round(n * @dt * 1000), else: 0

    sim_state =
      sim_state
      |> Map.put("elapsedMs", (sim_state["elapsedMs"] || 0) + add)
      |> Map.put("tickCount", (sim_state["tickCount"] || 0) + n)

    {sim_state, event} = tick_capture(sim_state, add)
    if event, do: {sim_state, event}, else: consume_inputs(sim_state, players)
  end

  defp tick_capture(sim_state, add) when add <= 0, do: {sim_state, nil}

  defp tick_capture(%{"status" => "countdown"} = sim_state, add) do
    ms = max(0, (sim_state["countdownMs"] || 0) - add)

    if ms <= 0 do
      state =
        sim_state
        |> Map.put("status", "posing")
        |> Map.put("countdownMs", 0)
        |> Map.put("poseIndex", 0)
        |> Map.put("poseMs", 0)
        |> Map.put("captureAllowed", true)

      {state,
       %{
         "type" => "pose",
         "slot" => nil,
         "payload" => %{"poseIndex" => 0, "pose" => Enum.at(@poses, 0), "subjects" => capture_subjects(state)}
       }}
    else
      {Map.put(sim_state, "countdownMs", ms), nil}
    end
  end

  defp tick_capture(%{"status" => "posing"} = sim_state, add) do
    pose_ms = (sim_state["poseMs"] || 0) + add

    if pose_ms >= @pose_ms do
      idx = (sim_state["poseIndex"] || 0) + 1

      if idx >= @pose_count do
        state =
          sim_state
          |> Map.put("status", "ready")
          |> Map.put("poseIndex", idx)
          |> Map.put("poseMs", 0)
          |> Map.put("stripReady", true)
          |> Map.put("captureAllowed", false)
          |> Map.put("imageBytes", nil)
          |> Map.put("uploadRequested", false)

        {state,
         %{
           "type" => "strip_ready",
           "slot" => nil,
           "payload" => %{
             "subjects" => capture_subjects(state),
             "download" => local_download(state),
             "upload" => false
           }
         }}
      else
        state =
          sim_state
          |> Map.put("poseIndex", idx)
          |> Map.put("poseMs", 0)

        {state,
         %{
           "type" => "pose",
           "slot" => nil,
           "payload" => %{
             "poseIndex" => idx,
             "pose" => Enum.at(state["poses"], idx),
             "subjects" => capture_subjects(state)
           }
         }}
      end
    else
      {Map.put(sim_state, "poseMs", pose_ms), nil}
    end
  end

  defp tick_capture(sim_state, _), do: {sim_state, nil}

  defp do_apply(sim_state, slot, %{"kind" => "reset"}) do
    next = init_sim_state(slots: sim_state["proposedSlots"] || [0, 1])

    next =
      next
      |> Map.put("elapsedMs", sim_state["elapsedMs"])
      |> Map.put("tickCount", sim_state["tickCount"])

    {next, %{"type" => "booth_reset", "slot" => slot, "payload" => %{"slot" => slot}}}
  end

  defp do_apply(sim_state, slot, %{"kind" => "invite", "slots" => slots}) do
    if sim_state["status"] in ["idle", "inviting"] do
      state =
        sim_state
        |> Map.put("status", "inviting")
        |> Map.put("proposedSlots", slots)
        |> Map.put("roster", empty_roster(slots))
        |> Map.put("stripReady", false)
        |> Map.put("captureAllowed", false)
        |> Map.put("poseIndex", 0)
        |> Map.put("imageBytes", nil)
        |> Map.put("uploadRequested", false)
        |> refresh()

      {state, %{"type" => "invite", "slot" => slot, "payload" => %{"slots" => slots}}}
    else
      {sim_state, nil}
    end
  end

  defp do_apply(sim_state, slot, %{"kind" => kind}) when kind in ["accept", "decline", "depart"] do
    key = to_string(slot)
    roster = sim_state["roster"] || %{}

    if Map.has_key?(roster, key) do
      status =
        case kind do
          "accept" -> "accepted"
          "decline" -> "declined"
          "depart" -> "departed"
        end

      state =
        sim_state
        |> put_in(["roster", key], status)
        |> then(fn s -> if status != "accepted", do: Map.put(s, "captureAllowed", false), else: s end)
        |> refresh()

      pictured = slots_with(state, "accepted")

      if state["status"] in ["countdown", "posing"] and length(pictured) < @min_players do
        state =
          state
          |> Map.put("status", "inviting")
          |> Map.put("countdownMs", 0)
          |> Map.put("captureAllowed", false)
          |> Map.put("poseIndex", 0)

        {state,
         %{
           "type" => "capture_aborted",
           "slot" => slot,
           "payload" => %{"slot" => slot, "reason" => status, "acceptedSlots" => state["acceptedSlots"]}
         }}
      else
        {state,
         %{
           "type" => status,
           "slot" => slot,
           "payload" => %{
             "slot" => slot,
             "acceptedSlots" => state["acceptedSlots"],
             "pending" => length(slots_with(state, "pending")),
             "canCapture" => can_capture?(state),
             "excluded" => status != "accepted"
           }
         }}
      end
    else
      {sim_state, nil}
    end
  end

  defp do_apply(sim_state, slot, %{"kind" => "start"}) do
    state = refresh(sim_state)
    pending = length(slots_with(state, "pending"))
    pictured = slots_with(state, "accepted")

    cond do
      pending > 0 ->
        {state,
         %{
           "type" => "capture_wait",
           "slot" => slot,
           "payload" => %{"reason" => "pending", "pending" => pending}
         }}

      length(pictured) < @min_players ->
        {state,
         %{
           "type" => "capture_wait",
           "slot" => slot,
           "payload" => %{"reason" => "need_two", "acceptedSlots" => state["acceptedSlots"]}
         }}

      true ->
        state =
          state
          |> Map.put("status", "countdown")
          |> Map.put("countdownMs", @countdown_ms)
          |> Map.put("poseIndex", 0)
          |> Map.put("poseMs", 0)
          |> Map.put("stripReady", false)
          |> Map.put("captureAllowed", false)
          |> Map.put("imageBytes", nil)

        {state,
         %{
           "type" => "countdown",
           "slot" => slot,
           "payload" => %{"countdownMs" => @countdown_ms, "subjects" => capture_subjects(state)}
         }}
    end
  end

  defp consume_inputs(sim_state, players) do
    keys =
      (sim_state["roster"] || %{})
      |> Map.keys()
      |> Enum.map(&String.to_integer/1)

    Enum.reduce_while(keys, {sim_state, nil}, fn slot, {acc, _} ->
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

  defp empty_roster(slots), do: Map.new(slots, fn s -> {to_string(s), "pending"} end)

  defp slots_with(sim_state, status) do
    (sim_state["roster"] || %{})
    |> Enum.filter(fn {_, v} -> v == status end)
    |> Enum.map(fn {k, _} -> String.to_integer(k) end)
    |> Enum.sort()
  end

  defp refresh(sim_state) do
    sim_state
    |> Map.put("acceptedSlots", slots_with(sim_state, "accepted"))
    |> Map.put("declinedSlots", slots_with(sim_state, "declined"))
    |> Map.put("departedSlots", slots_with(sim_state, "departed"))
  end

  defp can_capture?(sim_state) do
    length(slots_with(sim_state, "accepted")) >= @min_players and
      length(slots_with(sim_state, "pending")) == 0
  end

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
end
