defmodule Afterlight.Activities.Horseshoes do
  @moduledoc """
  Authoritative Desert Camp horseshoes (Task 8.5).

  Specifications:
  - `openspec/changes/add-place-activities-program/specs/signature-place-activities/spec.md`
    (Requirement: Camp and ice games)
  - `design.md` (D5, D7)

  House rules:
  - Two players alternate four shoes per round (2 each).
  - Ringer 3 pts; closest live shoe within one shoe-width 1 pt; cancellation.
  - Overshoot past the stake scores 0 that shoe.
  - First to 21 after a complete round, strictly ahead. Tied scores at 21+
    play extra rounds until one leads.
  """

  @rules_version 1
  @win_score 21
  @shoes_per_player 2
  @shoes_per_round 4
  @ringer_points 3
  @close_points 1
  @stake_gap 4.8
  @ringer_radius 0.1
  @shoe_width 0.18
  @overshoot_eps 0.02
  @tie_eps 0.001
  @min_travel_frac 0.35
  @power_span 0.95
  @max_lateral 0.55
  @wind_drift 0.08
  @stakes %{
    0 => [4.5, 0.0, 4.4],
    1 => [4.5, 0.0, -0.4]
  }
  @origins %{
    0 => [4.5, 0.45, -0.4],
    1 => [4.5, 0.45, 4.4]
  }

  def rules_version, do: @rules_version
  def win_score, do: @win_score
  def stake_power, do: (1.0 - @min_travel_frac) / @power_span
  def stakes, do: @stakes
  def origins, do: @origins

  @doc "Initializes a frozen two-player horseshoes match."
  def init_sim_state(opts \\ []) do
    slots =
      case Keyword.get(opts, :slots) || Keyword.get(opts, :active_slots) do
        nil -> [0, 1]
        list when is_list(list) -> Enum.take(list, 2)
      end

    scores = Keyword.get(opts, :scores, [0, 0])
    env = freeze_environment(Keyword.get(opts, :environment))

    players =
      slots
      |> Enum.with_index()
      |> Map.new(fn {slot, index} ->
        score = Enum.at(scores, index, 0)

        {to_string(slot),
         %{
           "slot" => slot,
           "score" => score,
           "shoes" => [],
           "lastThrow" => nil
         }}
      end)

    %{
      "rulesVersion" => @rules_version,
      "winScore" => @win_score,
      "status" => "throwing",
      "currentRound" => 1,
      "throwsThisRound" => 0,
      "nextSlot" => List.first(slots) || 0,
      "activeSlots" => slots,
      "players" => players,
      "lastRound" => nil,
      "winner" => nil,
      "standings" => [],
      "extraRound" => false,
      "environment" => env
    }
  end

  @doc "Validates throw / ready / neutral controls."
  def validate_controls(controls) when is_map(controls) do
    kind = Map.get(controls, "kind", Map.get(controls, :kind, "throw"))

    case kind do
      k when k in ["neutral", :neutral] ->
        {:ok, %{"kind" => "neutral"}}

      k when k in ["ready", :ready] ->
        {:ok, %{"kind" => "ready"}}

      k when k in ["throw", :throw, "launch", :launch] ->
        {:ok,
         %{
           "kind" => "throw",
           "angle" => clamp(float_or(get_field(controls, "angle"), 0.0), -0.45, 0.45),
           "power" => clamp(float_or(get_field(controls, "power"), 0.65), 0.0, 1.0),
           "lateral" => clamp(float_or(get_field(controls, "lateral"), 0.0), -1.0, 1.0)
         }}

      _ ->
        {:error, :unknown_kind}
    end
  end

  def validate_controls(_), do: {:error, :invalid_controls}

  @doc "Classifies a landing against the target stake."
  def classify_shoe(landing, stake, origin) do
    [lx, _, lz] = pad_pos(landing)
    [sx, _, sz] = pad_pos(stake)
    [ox, _, oz] = pad_pos(origin)

    axis_x = sx - ox
    axis_z = sz - oz
    axis_len = :math.sqrt(axis_x * axis_x + axis_z * axis_z)
    axis_len = if axis_len == 0.0, do: @stake_gap, else: axis_len
    fwd_x = axis_x / axis_len
    fwd_z = axis_z / axis_len
    along = (lx - ox) * fwd_x + (lz - oz) * fwd_z
    distance = round3(:math.sqrt((lx - sx) * (lx - sx) + (lz - sz) * (lz - sz)))
    overshoot = along > axis_len + @overshoot_eps
    ringer = not overshoot and distance <= @ringer_radius
    close = not overshoot and not ringer and distance <= @shoe_width

    %{
      "distance" => distance,
      "overshoot" => overshoot,
      "ringer" => ringer,
      "close" => close
    }
  end

  @doc "Deterministic landing from angle/power/lateral plus frozen wind."
  def simulate_throw(slot, throw_params, environment \\ nil) do
    origin = Map.get(@origins, slot, @origins[0])
    stake = Map.get(@stakes, slot, @stakes[0])
    [ox, _, oz] = origin
    [sx, _, sz] = stake
    axis_x = sx - ox
    axis_z = sz - oz
    axis_len = :math.sqrt(axis_x * axis_x + axis_z * axis_z)
    axis_len = if axis_len == 0.0, do: @stake_gap, else: axis_len
    fwd_x = axis_x / axis_len
    fwd_z = axis_z / axis_len
    perp_x = -fwd_z
    perp_z = fwd_x

    angle = float_or(get_field(throw_params, "angle"), 0.0)
    power = float_or(get_field(throw_params, "power"), 0.65)
    lateral = float_or(get_field(throw_params, "lateral"), 0.0)
    c = :math.cos(angle)
    s = :math.sin(angle)
    dir_x = fwd_x * c - fwd_z * s
    dir_z = fwd_x * s + fwd_z * c
    travel = axis_len * (@min_travel_frac + power * @power_span)
    wind_x = env_wind_x(environment)
    side = lateral * @max_lateral + wind_x * @wind_drift
    lx = round3(ox + dir_x * travel + perp_x * side)
    lz = round3(oz + dir_z * travel + perp_z * side)
    landing = [lx, 0.0, lz]
    classified = classify_shoe(landing, stake, origin)

    Map.merge(classified, %{"landing" => landing})
  end

  @doc "Cancellation scoring for one completed round."
  def score_round(shoes0, shoes1) do
    live0 = Enum.reject(shoes0, &truthy(&1, "overshoot"))
    live1 = Enum.reject(shoes1, &truthy(&1, "overshoot"))
    ringers0 = Enum.filter(live0, &truthy(&1, "ringer"))
    ringers1 = Enum.filter(live1, &truthy(&1, "ringer"))
    cancelled = min(length(ringers0), length(ringers1))
    leftover0 = length(ringers0) - cancelled
    leftover1 = length(ringers1) - cancelled
    points0 = leftover0 * @ringer_points
    points1 = leftover1 * @ringer_points

    rest0 = Enum.reject(live0, &truthy(&1, "ringer"))
    rest1 = Enum.reject(live1, &truthy(&1, "ringer"))
    consider0 = rest0 ++ Enum.drop(ringers0, cancelled)
    consider1 = rest1 ++ Enum.drop(ringers1, cancelled)
    closest0 = closest_distance(consider0)
    closest1 = closest_distance(consider1)

    closest_tied =
      is_number(closest0) and is_number(closest1) and abs(closest0 - closest1) <= @tie_eps

    {points0, points1} =
      cond do
        not closest_tied and closest0 < closest1 ->
          {points0 + close_count(rest0, closest1) * @close_points, points1}

        not closest_tied and closest1 < closest0 ->
          {points0, points1 + close_count(rest1, closest0) * @close_points}

        true ->
          {points0, points1}
      end

    %{
      "points" => [points0, points1],
      "cancelledRingers" => cancelled,
      "closestTied" => closest_tied
    }
  end

  @doc "Applies one throw. Wrong-turn and finished matches are no-ops."
  def apply_input(sim_state, slot, controls) do
    if sim_state["status"] == "complete" do
      {sim_state, nil}
    else
      case validate_controls(controls || %{}) do
        {:ok, %{"kind" => kind}} when kind in ["neutral", "ready"] ->
          {sim_state, %{"type" => "neutral", "slot" => slot}}

        {:ok, %{"kind" => "throw"} = launch} ->
          do_throw(sim_state, slot, launch)

        _ ->
          {sim_state, nil}
      end
    end
  end

  @doc "Steps pending player throws. Returns `{state, nil | {:match_ended, winner, details}}`."
  def step_simulation(sim_state, players, _steps \\ 1) do
    if sim_state["status"] == "complete" do
      {sim_state, nil}
    else
      {state, _event} =
        players
        |> Enum.sort_by(fn {slot, _} -> slot end)
        |> Enum.reduce({sim_state, nil}, fn {slot, player}, {acc, _last} ->
          input = player[:input_state] || player["input_state"] || %{}

          if Map.get(input, "kind") in ["throw", "launch"] do
            apply_input(acc, slot, input)
          else
            {acc, nil}
          end
        end)

      if state["status"] == "complete" do
        details = %{
          "winnerSlot" => state["winner"],
          "standings" => state["standings"],
          "reason" => "first_to_21"
        }

        {state, {:match_ended, state["winner"], details}}
      else
        {state, nil}
      end
    end
  end

  defp do_throw(sim_state, slot, launch) do
    if sim_state["nextSlot"] != slot do
      {sim_state, nil}
    else
      slot_str = to_string(slot)
      player = get_in(sim_state, ["players", slot_str])

      if is_nil(player) or length(player["shoes"]) >= @shoes_per_player do
        {sim_state, nil}
      else
        result = simulate_throw(slot, launch, sim_state["environment"])

        shoe = %{
          "slot" => slot,
          "round" => sim_state["currentRound"],
          "throwIndex" => length(player["shoes"]),
          "launch" => launch,
          "landing" => result["landing"],
          "distance" => result["distance"],
          "overshoot" => result["overshoot"],
          "ringer" => result["ringer"],
          "close" => result["close"]
        }

        player =
          player
          |> Map.put("shoes", player["shoes"] ++ [shoe])
          |> Map.put("lastThrow", shoe)

        state = put_in(sim_state, ["players", slot_str], player)
        state = Map.put(state, "throwsThisRound", state["throwsThisRound"] + 1)

        opponents = Enum.reject(state["activeSlots"], &(&1 == slot))

        next =
          Enum.find(opponents, fn other ->
            length(get_in(state, ["players", to_string(other), "shoes"]) || []) < @shoes_per_player
          end) || slot

        state = Map.put(state, "nextSlot", next)

        state =
          if state["throwsThisRound"] >= @shoes_per_round do
            finish_round(state)
          else
            state
          end

        event_type =
          cond do
            state["status"] == "complete" -> "match_ended"
            state["lastRound"] && state["throwsThisRound"] == 0 -> "round_scored"
            true -> "shoe_thrown"
          end

        event = %{
          "type" => event_type,
          "slot" => slot,
          "shoe" => shoe,
          "nextSlot" => state["nextSlot"],
          "lastRound" => if(event_type == "shoe_thrown", do: nil, else: state["lastRound"]),
          "winner" => state["winner"]
        }

        {state, event}
      end
    end
  end

  defp finish_round(state) do
    shoes0 = get_in(state, ["players", "0", "shoes"]) || []
    shoes1 = get_in(state, ["players", "1", "shoes"]) || []
    scored = score_round(shoes0, shoes1)
    [pts0, pts1] = scored["points"]

    state =
      state
      |> update_in(["players", "0"], fn p ->
        p |> Map.put("score", p["score"] + pts0) |> Map.put("shoes", [])
      end)
      |> update_in(["players", "1"], fn p ->
        p |> Map.put("score", p["score"] + pts1) |> Map.put("shoes", [])
      end)

    last_round = %{
      "round" => state["currentRound"],
      "points" => scored["points"],
      "cancelledRingers" => scored["cancelledRingers"],
      "closestTied" => scored["closestTied"]
    }

    s0 = get_in(state, ["players", "0", "score"])
    s1 = get_in(state, ["players", "1", "score"])
    lead = s0 - s1
    reached = s0 >= @win_score or s1 >= @win_score

    {status, winner, extra, standings} =
      cond do
        reached and lead != 0 ->
          w = if lead > 0, do: 0, else: 1
          loser = if w == 0, do: 1, else: 0
          w_score = if w == 0, do: s0, else: s1
          l_score = if w == 0, do: s1, else: s0

          {"complete", w, false,
           [
             %{"rank" => 1, "slot" => w, "score" => w_score},
             %{"rank" => 2, "slot" => loser, "score" => l_score}
           ]}

        reached and lead == 0 ->
          {"throwing", nil, true, []}

        true ->
          {"throwing", nil, false, []}
      end

    state
    |> Map.put("lastRound", last_round)
    |> Map.put("throwsThisRound", 0)
    |> Map.put("nextSlot", List.first(state["activeSlots"]) || 0)
    |> Map.put("currentRound", state["currentRound"] + 1)
    |> Map.put("status", status)
    |> Map.put("winner", winner)
    |> Map.put("extraRound", extra)
    |> Map.put("standings", standings)
  end

  defp freeze_environment(nil) do
    %{
      "version" => 1,
      "policy" => "frozen",
      "wind" => [0.0, 0.0],
      "windSpeed" => 0.0,
      "rain" => 0.0,
      "intensity" => 0.0,
      "wetness" => 0.0,
      "timePhase" => 0.0,
      "frozenAt" => 0
    }
  end

  defp freeze_environment(env) when is_map(env) do
    now = env["frozenAt"] || env[:frozenAt] || env["now"] || env[:now] || 0

    env
    |> stringify_keys()
    |> Map.put("policy", "frozen")
    |> Map.put("frozenAt", now)
  end

  defp closest_distance([]), do: nil

  defp closest_distance(shoes) do
    shoes
    |> Enum.map(&float_or(get_field(&1, "distance"), 99.0))
    |> Enum.min()
  end

  defp close_count(shoes, opponent_closest) do
    Enum.count(shoes, fn shoe ->
      dist = float_or(get_field(shoe, "distance"), 99.0)
      dist < opponent_closest and dist <= @shoe_width
    end)
  end

  defp env_wind_x(%{"wind" => [wx, _]}) when is_number(wx), do: wx * 1.0
  defp env_wind_x(%{wind: [wx, _]}) when is_number(wx), do: wx * 1.0
  defp env_wind_x(_), do: 0.0

  defp truthy(map, key), do: Map.get(map, key) == true or Map.get(map, String.to_atom(key)) == true

  defp pad_pos([x, z]), do: [x * 1.0, 0.0, z * 1.0]
  defp pad_pos([x, y, z]), do: [x * 1.0, y * 1.0, z * 1.0]
  defp pad_pos(_), do: [0.0, 0.0, 0.0]

  defp get_field(map, key) when is_map(map) do
    Map.get(map, key) || Map.get(map, String.to_atom(key))
  end

  defp stringify_keys(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {k, v}
    end)
  end

  defp clamp(val, min_v, max_v), do: max(min_v, min(max_v, val))

  defp float_or(val, _def) when is_float(val), do: val
  defp float_or(val, _def) when is_integer(val), do: val * 1.0
  defp float_or(_, def), do: def * 1.0

  defp round3(val), do: Float.round(val * 1.0, 3)
end
