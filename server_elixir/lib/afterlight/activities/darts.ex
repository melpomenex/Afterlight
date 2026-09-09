defmodule Afterlight.Activities.Darts do
  @moduledoc """
  Authoritative Orpheum 301 double-out darts (Task 9.6).

  Three darts per turn. Overshooting 0 or leaving 1 restores the start-of-turn
  score and passes. Pointer/touch and aim-power share one (u, v) throw model.
  """

  @rules_version 1
  @start_score 301
  @darts_per_turn 3
  @dt 1.0 / 60.0
  @sectors [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5]
  @inner_bull 0.066
  @outer_bull 0.162
  @triple_inner 0.582
  @triple_outer 0.629
  @double_inner 0.953
  @double_outer 1.0

  def rules_version, do: @rules_version
  def start_score, do: @start_score
  def sectors, do: @sectors

  def init_sim_state(opts \\ []) do
    slots =
      case Keyword.get(opts, :slots) do
        nil -> [0, 1]
        list when is_list(list) -> Enum.take(list, 2)
      end

    players =
      Map.new(slots, fn slot ->
        {to_string(slot),
         %{
           "slot" => slot,
           "score" => @start_score,
           "turnStartScore" => @start_score,
           "dartsThisTurn" => 0,
           "lastThrow" => nil
         }}
      end)

    %{
      "rulesVersion" => @rules_version,
      "status" => "playing",
      "startScore" => @start_score,
      "turnSlot" => List.first(slots) || 0,
      "dartsRemaining" => @darts_per_turn,
      "turnTotal" => 0,
      "players" => players,
      "activeSlots" => slots,
      "winner" => nil,
      "standings" => [],
      "lastEvent" => nil,
      "lastCommitId" => nil,
      "elapsedMs" => 0,
      "tickCount" => 0
    }
  end

  def board_point_for(segment, ring) do
    cond do
      ring in ["inner-bull", :inner_bull] -> %{u: 0.0, v: 0.0}
      ring in ["outer-bull", :outer_bull] -> %{u: 0.0, v: 0.12}
      ring in ["miss", :miss] -> %{u: 0.0, v: 1.15}
      true ->
        idx = max(0, Enum.find_index(@sectors, &(&1 == segment)) || 0)
        r =
          case ring do
            "triple" -> 0.605
            :triple -> 0.605
            "single-inner" -> 0.40
            :single_inner -> 0.40
            "double" -> 0.975
            :double -> 0.975
            _ -> 0.78
          end

        a = idx * (:math.pi() / 10)
        %{u: :math.sin(a) * r, v: :math.cos(a) * r}
    end
  end

  def score_throw(u, v) when is_number(u) and is_number(v) do
    r = :math.sqrt(u * u + v * v)

    cond do
      r > @double_outer ->
        %{points: 0, segment: nil, ring: "miss", double: false}

      r <= @inner_bull ->
        %{points: 50, segment: 50, ring: "inner-bull", double: true}

      r <= @outer_bull ->
        %{points: 25, segment: 25, ring: "outer-bull", double: false}

      true ->
        from_top = rem_float(:math.atan2(u, v) + :math.pi() * 2, :math.pi() * 2)
        idx = rem(trunc(Float.floor((from_top + :math.pi() / 20) / (:math.pi() / 10))), 20)
        segment = Enum.at(@sectors, idx)

        cond do
          r >= @double_inner ->
            %{points: segment * 2, segment: segment, ring: "double", double: true}

          r >= @triple_inner and r <= @triple_outer ->
            %{points: segment * 3, segment: segment, ring: "triple", double: false}

          r < @triple_inner ->
            %{points: segment, segment: segment, ring: "single-inner", double: false}

          true ->
            %{points: segment, segment: segment, ring: "single-outer", double: false}
        end
    end
  end

  def score_throw(_, _), do: %{points: 0, segment: nil, ring: "miss", double: false}

  def aim_power_to_point(aim, power) do
    a = rem_float(aim * 1.0, 1.0)
    a = if a < 0.0, do: a + 1.0, else: a
    p = max(0.0, min(1.0, power * 1.0))
    theta = a * :math.pi() * 2
    r = p * 0.98
    %{u: :math.sin(theta) * r, v: :math.cos(theta) * r}
  end

  def validate_controls(controls) when is_map(controls) do
    kind = kind_string(Map.get(controls, "kind", Map.get(controls, :kind, "throw")))

    case kind do
      "neutral" ->
        {:ok, %{"kind" => "neutral"}}

      "throw" ->
        u = float_or(Map.get(controls, "u", Map.get(controls, :u)), nil)
        v = float_or(Map.get(controls, "v", Map.get(controls, :v)), nil)

        {u, v} =
          if is_number(u) and is_number(v) do
            {clamp(u, -1.5, 1.5), clamp(v, -1.5, 1.5)}
          else
            aim = float_or(Map.get(controls, "aim", Map.get(controls, :aim)), nil)
            power = float_or(Map.get(controls, "power", Map.get(controls, :power)), nil)

            if is_number(aim) and is_number(power) do
              pt = aim_power_to_point(aim, power)
              {pt.u, pt.v}
            else
              {nil, nil}
            end
          end

        if is_number(u) and is_number(v) do
          {:ok, %{"kind" => "throw", "u" => u, "v" => v, "commitId" => commit_id(controls)}}
        else
          {:error, :invalid_throw}
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
        {:ok, %{"kind" => "throw"} = input} ->
          if input["commitId"] != nil and input["commitId"] == sim_state["lastCommitId"] do
            {sim_state, nil}
          else
            if sim_state["turnSlot"] != slot do
              {sim_state, nil}
            else
              do_throw(sim_state, slot, input)
            end
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
      match?(%{"type" => "match_ended"}, event) ->
        details = %{
          "winnerSlot" => sim_state["winner"],
          "reason" => "checkout",
          "standings" => sim_state["standings"]
        }

        {sim_state, {:match_ended, sim_state["winner"], details}}

      true ->
        {sim_state, event}
    end
  end

  defp do_throw(sim_state, slot, input) do
    slot_str = to_string(slot)
    player = get_in(sim_state, ["players", slot_str])

    if is_nil(player) do
      {sim_state, nil}
    else
      hit = score_throw(input["u"], input["v"])
      remaining = player["score"] - hit.points
      bust = remaining < 0 or remaining == 1 or (remaining == 0 and not hit.double)

      last_throw = %{
        "u" => input["u"],
        "v" => input["v"],
        "points" => hit.points,
        "segment" => hit.segment,
        "ring" => hit.ring,
        "double" => hit.double,
        "bust" => bust
      }

      darts = player["dartsThisTurn"] + 1

      player =
        player
        |> Map.put("lastThrow", last_throw)
        |> Map.put("dartsThisTurn", darts)

      sim_state =
        sim_state
        |> put_in(["players", slot_str], player)
        |> Map.put("dartsRemaining", max(0, @darts_per_turn - darts))
        |> Map.put("lastCommitId", input["commitId"])

      cond do
        bust ->
          player =
            player
            |> Map.put("score", player["turnStartScore"])
            |> Map.put("dartsThisTurn", 0)

          sim_state = put_in(sim_state, ["players", slot_str], player)
          {sim_state, next} = pass_turn(sim_state, slot)

          {Map.put(sim_state, "lastEvent", "bust") |> Map.put("turnTotal", 0),
           %{
             "type" => "bust",
             "slot" => slot,
             "payload" => %{
               "slot" => slot,
               "restored" => player["score"],
               "nextSlot" => next,
               "throw" => last_throw
             }
           }}

        remaining == 0 and hit.double ->
          player = Map.put(player, "score", 0)
          sim_state = put_in(sim_state, ["players", slot_str], player)
          ranked = standings(sim_state)

          sim_state =
            sim_state
            |> Map.put("status", "complete")
            |> Map.put("winner", slot)
            |> Map.put("lastEvent", "checkout")
            |> Map.put("standings", ranked)

          {sim_state,
           %{
             "type" => "match_ended",
             "slot" => slot,
             "payload" => %{"winnerSlot" => slot, "reason" => "checkout", "throw" => last_throw}
           }}

        darts >= @darts_per_turn ->
          player = Map.put(player, "score", remaining)
          sim_state = put_in(sim_state, ["players", slot_str], player)
          turn_total = sim_state["turnTotal"] + hit.points
          {sim_state, next} = pass_turn(sim_state, slot)

          {Map.put(sim_state, "lastEvent", "turn_end") |> Map.put("turnTotal", turn_total),
           %{
             "type" => "turn_end",
             "slot" => slot,
             "payload" => %{
               "slot" => slot,
               "nextSlot" => next,
               "turnTotal" => turn_total,
               "score" => remaining,
               "throw" => last_throw
             }
           }}

        true ->
          player = Map.put(player, "score", remaining)
          sim_state = put_in(sim_state, ["players", slot_str], player)
          turn_total = sim_state["turnTotal"] + hit.points

          sim_state =
            sim_state
            |> Map.put("turnTotal", turn_total)
            |> Map.put("lastEvent", "throw")

          {sim_state,
           %{
             "type" => "throw",
             "slot" => slot,
             "payload" => %{
               "slot" => slot,
               "score" => remaining,
               "turnTotal" => turn_total,
               "dartsRemaining" => sim_state["dartsRemaining"],
               "throw" => last_throw
             }
           }}
      end
    end
  end

  defp pass_turn(sim_state, from_slot) do
    from_str = to_string(from_slot)
    from = get_in(sim_state, ["players", from_str])

    from =
      if from do
        from
        |> Map.put("dartsThisTurn", 0)
        |> Map.put("turnStartScore", from["score"])
      else
        from
      end

    sim_state = if from, do: put_in(sim_state, ["players", from_str], from), else: sim_state
    list = sim_state["activeSlots"]
    idx = Enum.find_index(list, &(&1 == from_slot)) || 0
    nxt = Enum.at(list, rem(idx + 1, length(list)))
    nxt_str = to_string(nxt)
    incoming = get_in(sim_state, ["players", nxt_str])

    incoming =
      if incoming, do: Map.put(incoming, "turnStartScore", incoming["score"]), else: incoming

    sim_state =
      sim_state
      |> then(fn s -> if incoming, do: put_in(s, ["players", nxt_str], incoming), else: s end)
      |> Map.put("turnSlot", nxt)
      |> Map.put("dartsRemaining", @darts_per_turn)
      |> Map.put("turnTotal", 0)

    {sim_state, nxt}
  end

  defp standings(sim_state) do
    sim_state["activeSlots"]
    |> Enum.map(&get_in(sim_state, ["players", to_string(&1)]))
    |> Enum.reject(&is_nil/1)
    |> Enum.sort_by(&{&1["score"], &1["slot"]})
    |> Enum.with_index(1)
    |> Enum.map(fn {p, rank} -> %{"rank" => rank, "slot" => p["slot"], "score" => p["score"]} end)
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

  defp rem_float(a, b) do
    r = :math.fmod(a, b)
    if r < 0.0, do: r + b, else: r
  end

  defp kind_string(kind) when is_binary(kind), do: String.downcase(kind)
  defp kind_string(kind) when is_atom(kind), do: kind |> Atom.to_string() |> String.downcase()
  defp kind_string(_), do: "throw"

  defp commit_id(sample) do
    raw = Map.get(sample, "commitId", Map.get(sample, :commitId))

    cond do
      is_integer(raw) -> raw
      is_float(raw) -> trunc(raw)
      true -> nil
    end
  end

  defp float_or(v, _) when is_float(v), do: v
  defp float_or(v, _) when is_integer(v), do: v * 1.0
  defp float_or(_, def), do: def

  defp clamp(v, lo, hi), do: max(lo, min(hi, v))
end
