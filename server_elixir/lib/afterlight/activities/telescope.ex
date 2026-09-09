defmodule Afterlight.Activities.Telescope do
  @moduledoc """
  Authoritative Desert Camp telescope (Task 8.6).

  Specifications:
  - `openspec/changes/add-place-activities-program/specs/signature-place-activities/spec.md`
    (Requirement: Camp telescope + Authoritative environment contract)
  - `design.md` (D2, D5, D7)

  Shared seeded sky from the match/run. Apparent positions use LIVE
  environment timestamps (never frozen). Marks are cooperative; leave
  assigns no winner.
  """

  @rules_version 1
  @sidereal_ms 86_164_000
  @object_count 12
  @named_objects [
    %{"id" => "altair", "name" => "Altair", "ra" => 1.22, "dec" => 0.16},
    %{"id" => "vega", "name" => "Vega", "ra" => 4.87, "dec" => 0.68},
    %{"id" => "deneb", "name" => "Deneb", "ra" => 5.4, "dec" => 0.79},
    %{"id" => "antares", "name" => "Antares", "ra" => 4.31, "dec" => -0.46},
    %{"id" => "arcturus", "name" => "Arcturus", "ra" => 3.73, "dec" => 0.33},
    %{"id" => "capella", "name" => "Capella", "ra" => 1.38, "dec" => 0.8},
    %{"id" => "betelgeuse", "name" => "Betelgeuse", "ra" => 1.55, "dec" => 0.13},
    %{"id" => "polaris", "name" => "Polaris", "ra" => 0.66, "dec" => 1.55}
  ]

  def rules_version, do: @rules_version
  def named_objects, do: @named_objects

  @doc "Unsigned LCG unit in [0, 1), matching shared/telescopeModel.js."
  def unit(seed, index) do
    n = rem((seed + 1) * 1_103_515_245 + 12_345 + index * 997, 4_294_967_296)
    n = rem(n + 4_294_967_296, 4_294_967_296)
    n / 4_294_967_296
  end

  def build_sky(seed \\ 1) do
    extras =
      0..(@object_count - length(@named_objects) - 1)
      |> Enum.map(fn i ->
        %{
          "id" => "seed-#{i}",
          "name" => "Camp Mark #{i + 1}",
          "ra" => round5(unit(seed, i * 2) * :math.pi() * 2),
          "dec" => round5((unit(seed, i * 2 + 1) * 2 - 1) * 1.2),
          "seeded" => true
        }
      end)

    Enum.map(@named_objects, &Map.put(&1, "seeded", false)) ++ extras
  end

  def find_object(sky, object_id) when is_list(sky) do
    Enum.find(sky, &(&1["id"] == object_id))
  end

  def find_object(%{"objects" => objects}, object_id), do: find_object(objects, object_id)
  def find_object(_, _), do: nil

  @doc "Apparent unit direction from a live timestamp + time phase."
  def apparent_position(object, now_ms, environment \\ %{}) do
    now = number_or(now_ms, 0)
    time_phase = clamp(number_or(get_field(environment, "timePhase"), 0.0), 0.0, 1.0)
    lst = wrap01(now / @sidereal_ms + time_phase)
    ra = number_or(get_field(object, "ra"), 0.0)
    dec = number_or(get_field(object, "dec"), 0.0)
    theta = ra + lst * :math.pi() * 2
    phi = dec

    %{
      "x" => round5(:math.cos(phi) * :math.sin(theta)),
      "y" => round5(:math.sin(phi)),
      "z" => round5(:math.cos(phi) * :math.cos(theta)),
      "lst" => round5(lst)
    }
  end

  @doc "Initializes a live, noncompetitive observing session."
  def init_sim_state(opts \\ []) do
    slots =
      case Keyword.get(opts, :slots) || Keyword.get(opts, :active_slots) do
        nil -> [0, 1, 2, 3]
        list when is_list(list) -> list
      end

    seed = Keyword.get(opts, :seed, 1)
    now = Keyword.get(opts, :now, 0)
    match_id = Keyword.get(opts, :match_id)
    env = live_environment(Keyword.get(opts, :environment), now)

    observers =
      Map.new(slots, fn slot ->
        {to_string(slot), empty_observer(slot)}
      end)

    %{
      "rulesVersion" => @rules_version,
      "status" => "observing",
      "seed" => seed,
      "matchId" => match_id,
      "sky" => %{"objects" => build_sky(seed)},
      "marks" => %{},
      "observers" => observers,
      "activeSlots" => slots,
      "winner" => nil,
      "environment" => env
    }
  end

  def validate_controls(controls) when is_map(controls) do
    kind = to_string(Map.get(controls, "kind", Map.get(controls, :kind, "look")))

    if kind in ["look", "mark", "locate", "highlight", "leave", "neutral", "ready", "sync_env"] do
      {:ok, stringify_keys(controls) |> Map.put("kind", kind)}
    else
      {:error, :unknown_kind}
    end
  end

  def validate_controls(_), do: {:error, :invalid_controls}

  @doc "Applies look/mark/highlight/leave/live sync. Leave never assigns a winner."
  def apply_input(sim_state, slot, controls) do
    case validate_controls(controls || %{}) do
      {:ok, input} ->
        state = maybe_refresh_live(sim_state, input)
        do_apply(state, slot, input)

      _ ->
        {sim_state, nil}
    end
  end

  @doc "Steps observer inputs. Never ends with a competitive winner."
  def step_simulation(sim_state, players, _steps \\ 1) do
    {state, event} =
      players
      |> Enum.sort_by(fn {slot, _} -> slot end)
      |> Enum.reduce({sim_state, nil}, fn {slot, player}, {acc, _last} ->
        input = player[:input_state] || player["input_state"] || %{}

        if is_map(input) and Map.has_key?(input, "kind") do
          apply_input(acc, slot, input)
        else
          {acc, nil}
        end
      end)

    {state, event}
  end

  defp do_apply(state, slot, %{"kind" => kind}) when kind in ["neutral", "ready", "sync_env"] do
    type = if kind == "sync_env", do: "environment_live", else: "neutral"

    {state,
     %{
       "type" => type,
       "slot" => slot,
       "now" => get_in(state, ["environment", "now"])
     }}
  end

  defp do_apply(state, slot, %{"kind" => "look"} = input) do
    {state, observer} = ensure_observer(state, slot)
    look = observer["look"] || %{"yaw" => 0.0, "pitch" => 0.35}

    next_look = %{
      "yaw" => clamp(number_or(input["yaw"], look["yaw"]), -:math.pi(), :math.pi()),
      "pitch" => clamp(number_or(input["pitch"], look["pitch"]), -1.2, 1.4)
    }

    observer = Map.put(observer, "look", next_look)
    state = put_in(state, ["observers", to_string(slot)], observer)
    {state, %{"type" => "look", "slot" => slot, "look" => next_look}}
  end

  defp do_apply(state, slot, %{"kind" => kind} = input) when kind in ["mark", "locate", "highlight"] do
    object_id = input["objectId"] || input["object_id"]
    object = find_object(state["sky"], object_id)

    if is_nil(object) do
      {state, nil}
    else
      {state, observer} = ensure_observer(state, slot)

      observer =
        if kind in ["mark", "locate"] do
          Map.put(observer, "located", object_id)
        else
          observer
        end

      existing =
        Map.get(state["marks"], object_id) ||
          %{
            "objectId" => object_id,
            "markedBy" => slot,
            "highlightedBy" => []
          }

      highlighted =
        if slot in existing["highlightedBy"] do
          existing["highlightedBy"]
        else
          existing["highlightedBy"] ++ [slot]
        end

      mark = Map.put(existing, "highlightedBy", highlighted)
      state = put_in(state, ["observers", to_string(slot)], observer)
      state = put_in(state, ["marks", object_id], mark)
      type = if kind == "highlight", do: "object_highlighted", else: "object_marked"
      {state, %{"type" => type, "slot" => slot, "objectId" => object_id, "mark" => mark}}
    end
  end

  defp do_apply(state, slot, %{"kind" => "leave"}) do
    {state, observer} = ensure_observer(state, slot)
    observer = Map.put(observer, "present", false)
    state = put_in(state, ["observers", to_string(slot)], observer)
    anyone = Enum.any?(Map.values(state["observers"]), & &1["present"])
    state = if anyone, do: state, else: Map.put(state, "status", "idle")
    state = Map.put(state, "winner", nil)
    {state, %{"type" => "observer_left", "slot" => slot, "winner" => nil}}
  end

  defp do_apply(state, _slot, _), do: {state, nil}

  defp maybe_refresh_live(state, input) do
    if Map.has_key?(input, "now") or Map.has_key?(input, "timePhase") do
      env = live_environment(Map.merge(state["environment"] || %{}, input), input["now"])
      Map.put(state, "environment", env)
    else
      state
    end
  end

  defp live_environment(nil, now), do: live_environment(%{}, now)

  defp live_environment(env, now) do
    env = stringify_keys(env || %{})
    live_now = number_or(now || env["now"] || env["updatedAt"], 0)

    %{
      "version" => env["version"] || 1,
      "policy" => "live",
      "preset" => env["preset"],
      "wind" => env["wind"] || [0.0, 0.0],
      "windSpeed" => number_or(env["windSpeed"], 0.0),
      "rain" => clamp(number_or(env["rain"], 0.0), 0.0, 1.0),
      "intensity" => clamp(number_or(env["intensity"], 0.0), 0.0, 1.0),
      "wetness" => clamp(number_or(env["wetness"], 0.0), 0.0, 1.0),
      "timePhase" => clamp(number_or(env["timePhase"], 0.0), 0.0, 1.0),
      "now" => live_now,
      "updatedAt" => live_now,
      "frozenAt" => nil
    }
  end

  defp empty_observer(slot) do
    %{
      "slot" => slot,
      "look" => %{"yaw" => 0.0, "pitch" => 0.35},
      "located" => nil,
      "present" => true
    }
  end

  defp ensure_observer(state, slot) do
    key = to_string(slot)

    case get_in(state, ["observers", key]) do
      nil ->
        observer = empty_observer(slot)
        slots = Enum.uniq((state["activeSlots"] || []) ++ [slot])
        state = state |> put_in(["observers", key], observer) |> Map.put("activeSlots", slots)
        {state, observer}

      observer ->
        observer = Map.put(observer, "present", true)
        {put_in(state, ["observers", key], observer), observer}
    end
  end

  defp wrap01(v) do
    r = :math.fmod(v, 1.0)
    if r < 0.0, do: r + 1.0, else: r
  end

  defp get_field(map, key) when is_map(map) do
    Map.get(map, key) || Map.get(map, String.to_atom(key))
  end

  defp get_field(_, _), do: nil

  defp stringify_keys(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {k, v}
    end)
  end

  defp clamp(val, min_v, max_v), do: max(min_v, min(max_v, val))

  defp number_or(val, _def) when is_number(val), do: val * 1.0
  defp number_or(_, def), do: def * 1.0

  defp round5(val), do: Float.round(val * 1.0, 5)
end
