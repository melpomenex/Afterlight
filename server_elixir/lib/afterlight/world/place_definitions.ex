defmodule Afterlight.World.PlaceDefinitions do
  @moduledoc """
  The build-controlled public place projection, validated and loaded at
  boot (add-social-place-framework D1/D8, task 3.1).

  Phoenix cannot read the JS manifest (`shared/placeDefinitions.js`), so the
  build exports a bounded committed subset to
  `priv/place_definitions.json` (`scripts/export-place-definitions.mjs`;
  `--check` fails on drift). This module is the server-side reader: it
  parses and validates that file ONCE at boot and serves the plain entries
  from a protected ETS table to concurrent readers (the place directory,
  task 3.3). Validation is all-or-nothing — a single invalid entry fails
  feature initialization with a named error rather than booting a partial
  catalog.

  Wire room compatibility is deliberately untouched: `Afterlight.World.Rooms`
  still resolves any public room string, including unknown legacy ids and
  personal gardens. Only ids present here receive directory/atmosphere
  features. Personal gardens (`"garden:<owner>"`) are never projected and
  are rejected by validation — the directory must never enumerate them.
  """

  use GenServer

  @table :afterlight_place_definitions

  @schema_version 1
  @max_entries 64
  @max_presets 32
  @garden_prefix "garden:"
  @kinds ~w(environment venue view)
  @modes ~w(fixed scheduled)

  @max_activities 16
  @activity_types ~w(
    pong rain-runner signal-lost sporefall kart-royale snowboard-race pool billiards
    air-hockey foosball drones paper-airplanes gutter-boats rc-boats chess
    checkers tile-puzzle horseshoes telescope curling hammer-strike
    forge-challenge fishing skipping-stones light-music-puzzle darts piano
    photo-booth
  )
  @activity_env_policies ~w(none frozen live)
  @activity_ready_policies ~w(auto explicit)

  # The semantic subset the JS exporter projects per preset
  # (add-atmosphere-weather-system B 1.2). Visual colors and audio mixes
  # stay client-side and must never appear in the projection.
  @preset_modes ~w(fixed scheduled)
  @preset_keys ~w(id weather intensity wind rain wetness events schedule)

  defstruct [:path, :entries, :presets]

  ## Client API

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @doc "All validated public entries, in manifest order."
  @spec all() :: [map()]
  def all do
    lookup(:entries)
  end

  @doc """
  The validated atmosphere preset table (semantic subset), keyed by preset
  id. Empty when the committed projection carries no presets (a schema-1
  file from before B 1.2 stays loadable — the key is optional and
  validated when present).
  """
  @spec presets() :: %{optional(String.t()) => map()}
  def presets do
    case :ets.lookup(@table, :presets) do
      [{:presets, value}] -> value
      [] -> %{}
    end
  end

  @doc "The validated entry for a wire room id, or nil (unknown/legacy room string)."
  @spec get(term) :: map() | nil
  def get(id) when is_binary(id) do
    Enum.find(all(), &(&1["id"] == id))
  end

  def get(_other), do: nil

  @doc "The known public wire ids, in manifest order."
  @spec ids() :: [String.t()]
  def ids, do: Enum.map(all(), & &1["id"])

  @doc "True when the wire room id has a public feature entry."
  @spec known?(term) :: boolean
  def known?(id) do
    get(id) != nil
  end

  @doc "Entry count (bounded by #{@max_entries} at validation)."
  @spec count() :: non_neg_integer()
  def count, do: length(all())

  @doc "The projection schema version accepted by this reader."
  @spec schema_version() :: pos_integer()
  def schema_version, do: @schema_version

  @doc "The maximum public entries the projection may carry."
  @spec max_entries() :: pos_integer()
  def max_entries, do: @max_entries

  @doc "The maximum activities a place may carry."
  @spec max_activities() :: pos_integer()
  def max_activities, do: @max_activities

  @doc "The activities list for a wire room id, or [] if none/unknown."
  @spec activities(term) :: [map()]
  def activities(id) when is_binary(id) do
    case get(id) do
      %{"activities" => acts} when is_list(acts) -> acts
      _ -> []
    end
  end

  def activities(_other), do: []

  @doc """
  Loads and validates a projection file. Returns `{:ok, entries}` or
  `{:error, named_reason}` — never a partial catalog. The optional
  `presets` table is validated when present.
  """
  @spec load(String.t()) :: {:ok, [map()]} | {:error, term}
  def load(path) do
    with {:ok, bytes} <- File.read(path),
         {:ok, decoded} <- decode(bytes),
         :ok <- validate(decoded) do
      entries =
        Enum.map(decoded["entries"], fn entry ->
          Map.put_new(entry, "activities", [])
        end)

      {:ok, entries}
    end
  end

  @doc "Bang variant of `load/1` — raises with the named reason (boot path)."
  @spec load!(String.t()) :: [map()]
  def load!(path) do
    case load(path) do
      {:ok, entries} -> entries
      {:error, reason} -> raise ArgumentError, "invalid place projection at #{path}: #{inspect(reason)}"
    end
  end

  @doc """
  Pure validation of a decoded projection document. Named errors:
  `{:invalid_schema_version, v}`, `:missing_entries`, `{:invalid_entries, term}`,
  `{:too_many_entries, n}`, `{:duplicate_id, id}`, `{:private_garden_id, id}`,
  `{:invalid_entry, id, [problems]}`, `{:invalid_presets, id, [problems]}`,
  `{:too_many_presets, n}`.
  """
  @spec validate(term) :: :ok | {:error, term}
  def validate(%{"schemaVersion" => @schema_version} = doc) do
    entries = doc["entries"]

    cond do
      not is_list(entries) ->
        {:error, :missing_entries}

      length(entries) > @max_entries ->
        {:error, {:too_many_entries, length(entries)}}

      true ->
        with :ok <- validate_entries(entries), :ok <- validate_presets(doc["presets"]) do
          :ok
        end
    end
  end

  def validate(%{"schemaVersion" => other}), do: {:error, {:invalid_schema_version, other}}
  def validate(_other), do: {:error, :missing_entries}

  ## Callbacks

  @impl true
  def init(opts) do
    path = Keyword.get(opts, :path) || default_path()
    entries = load!(path)
    presets = load_presets!(path)

    :ets.new(@table, [:named_table, :set, :protected, read_concurrency: true])
    :ets.insert(@table, {:entries, entries})
    :ets.insert(@table, {:presets, presets})

    {:ok, %__MODULE__{path: path, entries: entries, presets: presets}}
  end

  ## Internals

  defp lookup(key) do
    case :ets.lookup(@table, key) do
      [{^key, value}] -> value
      [] -> []
    end
  end

  defp load_presets!(path) do
    with {:ok, bytes} <- File.read(path),
         {:ok, decoded} <- decode(bytes) do
      case decoded["presets"] do
        nil -> %{}
        presets when is_list(presets) -> Map.new(presets, fn %{"id" => id} = preset -> {id, preset} end)
      end
    else
      # load!/1 above has already raised on unreadable/undecodable files.
      _ -> %{}
    end
  end

  defp default_path, do: Application.app_dir(:afterlight, "priv/place_definitions.json")

  defp decode(bytes) do
    case Jason.decode(bytes) do
      {:ok, decoded} -> {:ok, decoded}
      {:error, _} -> {:error, :not_json}
    end
  end

  # The optional atmosphere preset table (B 1.2): an ORDERED LIST of
  # preset objects (like the entries), validated all-or-nothing — bounded
  # count, unique ids, semantic keys only, finite targets, schedule
  # keyframes increasing inside the cycle, and event spacing inside the
  # design bounds (lightning 45-90s, meteor 35-70s).
  defp validate_presets(nil), do: :ok

  defp validate_presets(presets) when is_list(presets) do
    if length(presets) > @max_presets do
      {:error, {:too_many_presets, length(presets)}}
    else
      # The accumulator is only the duplicate-id bookkeeping; success
      # MUST reduce to plain :ok — a leaked {:ok, _} would flow through
      # validate/1's and load/1's `with` chains as a false positive.
      result =
        Enum.reduce_while(presets, MapSet.new(), fn preset, seen ->
          id = (is_map(preset) && preset["id"]) || nil

          cond do
            not is_binary(id) ->
              {:halt, {:error, {:invalid_presets, "*", ["every preset needs a string id"]}}}

            MapSet.member?(seen, id) ->
              {:halt, {:error, {:invalid_presets, id, ["duplicate preset id"]}}}

            true ->
              case validate_preset(id, preset) do
                [] -> {:cont, MapSet.put(seen, id)}
                problems -> {:halt, {:error, {:invalid_presets, id, problems}}}
              end
          end
        end)

      case result do
        %MapSet{} -> :ok
        error -> error
      end
    end
  end

  defp validate_presets(_other),
    do: {:error, {:invalid_presets, "*", ["presets must be a list of preset objects"]}}

  defp validate_preset(id, %{"id" => preset_id, "weather" => weather} = preset)
       when weather in @preset_modes and preset_id == id do
    problems =
      []
      |> preset_key_problems(id, preset)
      |> preset_number_problems(id, preset)
      |> preset_schedule_problems(id, preset)
      |> preset_events_problems(id, preset)

    problems
  end

  defp validate_preset(_id, _preset),
    do: ["preset must carry its id and a fixed/scheduled weather mode"]

  defp preset_key_problems(problems, id, preset) do
    keys = preset |> Map.keys() |> Enum.sort()
    expected = Enum.sort(@preset_keys)

    if keys == expected do
      problems
    else
      ["preset #{id} must carry exactly #{Enum.join(expected, ", ")}" | problems]
    end
  end

  defp preset_number_problems(problems, id, preset) do
    numeric = %{"intensity" => {0, 1}, "rain" => {0, 1}, "wetness" => {0, 1}}

    bad_numbers =
      Enum.filter(numeric, fn {key, {min, max}} ->
        value = preset[key]
        not (is_number(value) and value >= min and value <= max)
      end)

    wind = preset["wind"]

    bad_wind =
      not (is_list(wind) and length(wind) == 2 and
             Enum.all?(wind, fn w -> is_number(w) and w >= -1 and w <= 1 end))

    problems =
      for {key, _} <- bad_numbers, reduce: problems do
        acc -> ["preset #{id}: #{key} must be a finite number in range" | acc]
      end

    if bad_wind, do: ["preset #{id}: wind must be two finite components in [-1, 1]" | problems], else: problems
  end

  defp preset_schedule_problems(problems, _id, %{"schedule" => nil}), do: problems

  defp preset_schedule_problems(problems, id, %{"schedule" => %{"cycleMs" => cycleMs, "keyframes" => keyframes}})
       when is_integer(cycleMs) and cycleMs > 0 and is_list(keyframes) and length(keyframes) >= 2 do
    {problems, _last} =
      Enum.reduce(keyframes, {problems, -1}, fn keyframe, {acc, previous} ->
        at_ms = keyframe["atMs"]

        ok_shape =
          is_integer(at_ms) and at_ms > previous and at_ms < cycleMs and
            is_number(keyframe["intensity"]) and keyframe["intensity"] >= 0 and keyframe["intensity"] <= 1 and
            is_number(keyframe["rain"]) and keyframe["rain"] >= 0 and keyframe["rain"] <= 1 and
            is_number(keyframe["wetness"]) and keyframe["wetness"] >= 0 and keyframe["wetness"] <= 1 and
            valid_wind?(keyframe["wind"])

        if ok_shape do
          {acc, at_ms}
        else
          {["preset #{id}: schedule keyframes must increase inside the cycle with finite targets" | acc], previous}
        end
      end)

    problems
  end

  defp preset_schedule_problems(problems, id, _schedule) do
    ["preset #{id}: schedule must carry a positive cycleMs and 2+ keyframes" | problems]
  end

  defp preset_events_problems(problems, _id, %{"events" => nil}), do: problems

  defp preset_events_problems(problems, id, %{"events" => %{"lightning" => lightning, "meteor" => meteor} = events}) do
    extra = Map.keys(events) -- ~w(lightning meteor)

    problems =
      if extra == [] do
        problems
      else
        ["preset #{id}: events carry unknown kinds" | problems]
      end

    problems =
      case spacing_problem(lightning, 45_000, 90_000) do
        nil -> problems
        message -> ["preset #{id}: #{message}" | problems]
      end

    case spacing_problem(meteor, 35_000, 70_000) do
      nil -> problems
      message -> ["preset #{id}: #{message}" | problems]
    end
  end

  defp preset_events_problems(problems, id, _events) do
    ["preset #{id}: events must carry lightning/meteor spacing or null" | problems]
  end

  defp spacing_problem(nil, _min, _max), do: nil

  defp spacing_problem(%{"minMs" => min_ms, "maxMs" => max_ms}, min, max)
       when is_integer(min_ms) and is_integer(max_ms) and min_ms >= min and max_ms <= max and min_ms <= max_ms,
       do: nil

  defp spacing_problem(_spacing, _min, _max), do: "event spacing escapes the design bounds"

  defp valid_wind?([a, b]) when is_number(a) and is_number(b), do: a >= -1 and a <= 1 and b >= -1 and b <= 1
  defp valid_wind?(_), do: false


  defp validate_entries(entries) do
    validate_entries(entries, MapSet.new())
  end

  defp validate_entries([], _seen), do: :ok

  defp validate_entries([%{"id" => id} = entry | rest], seen) when is_binary(id) do
    cond do
      MapSet.member?(seen, id) ->
        {:error, {:duplicate_id, id}}

      String.starts_with?(id, @garden_prefix) ->
        {:error, {:private_garden_id, id}}

      true ->
        case validate_entry(entry) do
          [] -> validate_entries(rest, MapSet.put(seen, id))
          problems -> {:error, {:invalid_entry, id, problems}}
        end
    end
  end

  defp validate_entries(_other, _seen), do: {:error, {:invalid_entries, "every entry needs a string id"}}

  defp validate_entry(entry) do
    problems =
      []
      |> kind_problems(entry)
      |> bounds_problems(entry)
      |> atmosphere_problems(entry)
      |> activities_problems(entry)
      |> public_problems(entry)

    problems
  end

  defp kind_problems(problems, %{"kind" => kind}) when kind in @kinds, do: problems
  defp kind_problems(problems, _), do: ["kind must be one of #{Enum.join(@kinds, ", ")}" | problems]

  defp bounds_problems(problems, %{"bounds" => %{"minX" => minX, "maxX" => maxX, "minZ" => minZ, "maxZ" => maxZ}})
       when is_number(minX) and is_number(maxX) and is_number(minZ) and is_number(maxZ) do
    if minX < maxX and minZ < maxZ do
      problems
    else
      ["bounds must not be inverted" | problems]
    end
  end

  defp bounds_problems(problems, _), do: ["bounds must be finite numbers" | problems]

  defp atmosphere_problems(problems, %{"atmosphere" => %{"preset" => preset, "weatherMode" => weather, "timeMode" => time}}) do
    preset_ok = is_nil(preset) or is_binary(preset)

    if preset_ok and weather in @modes and time in @modes do
      problems
    else
      ["atmosphere must carry a null/string preset and fixed/scheduled modes" | problems]
    end
  end

  defp atmosphere_problems(problems, _), do: ["atmosphere configuration is required" | problems]

  defp public_problems(problems, %{"public" => true}), do: problems
  defp public_problems(problems, _), do: ["only public places are projected" | problems]

  defp activities_problems(problems, %{"activities" => nil}), do: problems

  defp activities_problems(problems, %{"activities" => activities} = entry) when is_list(activities) do
    bounds = entry["bounds"]

    cond do
      length(activities) > @max_activities ->
        ["activities list exceeds maximum of #{@max_activities}" | problems]

      true ->
        {act_problems, _seen} =
          Enum.reduce(activities, {[], MapSet.new()}, fn act, {acc, seen} ->
            id = is_map(act) && act["id"]

            cond do
              not is_binary(id) ->
                {["every activity needs a string id" | acc], seen}

              MapSet.member?(seen, id) ->
                {["duplicate activity id: #{id}" | acc], seen}

              true ->
                case validate_activity(act, bounds) do
                  [] -> {acc, MapSet.put(seen, id)}
                  probs -> {probs ++ acc, MapSet.put(seen, id)}
                end
            end
          end)

        act_problems ++ problems
    end
  end

  defp activities_problems(problems, %{"activities" => _other}) do
    ["activities must be a list" | problems]
  end

  defp activities_problems(problems, _entry), do: problems

  defp validate_activity(act, bounds) when is_map(act) do
    []
    |> activity_type_problems(act)
    |> activity_rules_problems(act)
    |> activity_transform_problems(act, bounds)
    |> activity_footprint_problems(act)
    |> activity_interaction_problems(act)
    |> activity_anchors_problems(act, bounds)
    |> activity_capacities_problems(act)
    |> activity_env_policy_problems(act)
    |> activity_race_problems(act)
  end

  defp validate_activity(_act, _bounds), do: ["activity must be a map"]

  defp activity_type_problems(problems, %{"type" => type}) when type in @activity_types, do: problems
  defp activity_type_problems(problems, %{"id" => id, "type" => type}),
    do: ["activity #{id}: unknown activity type #{inspect(type)}" | problems]
  defp activity_type_problems(problems, %{"id" => id}),
    do: ["activity #{id}: missing type" | problems]

  defp activity_rules_problems(problems, %{"rulesVersion" => v}) when is_integer(v) and v >= 1, do: problems
  defp activity_rules_problems(problems, %{"id" => id}),
    do: ["activity #{id}: rulesVersion must be an integer >= 1" | problems]

  defp activity_transform_problems(problems, %{"id" => id, "transform" => %{"position" => pos} = t}, bounds)
       when is_list(pos) and (length(pos) == 2 or length(pos) == 3) do
    in_bounds =
      case pos do
        [x, z] when is_number(x) and is_number(z) and is_map(bounds) ->
          x > bounds["minX"] and x < bounds["maxX"] and z > bounds["minZ"] and z < bounds["maxZ"]
        [x, _y, z] when is_number(x) and is_number(z) and is_map(bounds) ->
          x > bounds["minX"] and x < bounds["maxX"] and z > bounds["minZ"] and z < bounds["maxZ"]
        _ ->
          false
      end

    rot_ok = is_nil(t["rotationY"]) or is_number(t["rotationY"])

    cond do
      not in_bounds -> ["activity #{id}: transform position outside bounds" | problems]
      not rot_ok -> ["activity #{id}: transform rotationY must be a number" | problems]
      true -> problems
    end
  end

  defp activity_transform_problems(problems, %{"id" => id, "transform" => _}, _bounds),
    do: ["activity #{id}: transform position must be 2 or 3 numbers" | problems]
  defp activity_transform_problems(problems, %{"id" => id}, _bounds),
    do: ["activity #{id}: transform is required" | problems]

  defp activity_footprint_problems(problems, %{"id" => _id, "footprint" => %{"width" => w, "depth" => d}})
       when is_number(w) and w > 0 and is_number(d) and d > 0, do: problems
  defp activity_footprint_problems(problems, %{"id" => id}),
    do: ["activity #{id}: footprint width and depth must be positive numbers" | problems]

  defp activity_interaction_problems(problems, %{"id" => _id, "interactionRadius" => r})
       when is_number(r) and r > 0, do: problems
  defp activity_interaction_problems(problems, %{"id" => id}),
    do: ["activity #{id}: interactionRadius must be a positive number" | problems]

  defp activity_anchors_problems(problems, %{"id" => id, "participantAnchors" => anchors}, bounds)
       when is_list(anchors) and length(anchors) > 0 do
    bad_anchor =
      Enum.find(anchors, fn a ->
        case a do
          %{"slot" => _s, "position" => [x, z]} when is_number(x) and is_number(z) and is_map(bounds) ->
            not (x > bounds["minX"] and x < bounds["maxX"] and z > bounds["minZ"] and z < bounds["maxZ"])
          %{"slot" => _s, "position" => [x, _y, z]} when is_number(x) and is_number(z) and is_map(bounds) ->
            not (x > bounds["minX"] and x < bounds["maxX"] and z > bounds["minZ"] and z < bounds["maxZ"])
          _ ->
            true
        end
      end)

    if bad_anchor do
      ["activity #{id}: participantAnchors contains invalid or out-of-bounds anchor" | problems]
    else
      problems
    end
  end

  defp activity_anchors_problems(problems, %{"id" => id}, _bounds),
    do: ["activity #{id}: participantAnchors must be a non-empty list" | problems]

  defp activity_capacities_problems(problems, %{"id" => _id, "capacities" => %{"players" => p, "spectators" => s, "queue" => q}})
       when is_integer(p) and p >= 1 and p <= 8 and
            is_integer(s) and s >= 0 and s <= 32 and
            is_integer(q) and q >= 0 and q <= 16, do: problems
  defp activity_capacities_problems(problems, %{"id" => id}),
    do: ["activity #{id}: capacities must specify players (1..8), spectators (0..32), queue (0..16)" | problems]

  defp activity_env_policy_problems(problems, %{"environmentPolicy" => policy}) when policy in @activity_env_policies, do: problems
  defp activity_env_policy_problems(problems, %{"environmentPolicy" => nil}), do: problems
  defp activity_env_policy_problems(problems, %{"id" => id, "environmentPolicy" => policy}),
    do: ["activity #{id}: unknown environmentPolicy #{inspect(policy)}" | problems]
  defp activity_env_policy_problems(problems, _act), do: problems

  # Race-style admission/ready/course contract
  # (add-multiplayer-snowboard-arcade): additive optional fields for every
  # type, required complete for snowboard-race so the authoritative server
  # projection carries everything admission and the session policy need.
  defp activity_race_problems(problems, %{"id" => id, "type" => type} = act) when type in ~w(snowboard-race drones gutter-boats rc-boats) do
    problems
    |> activity_min_players_problems(act, required?: true)
    |> activity_ready_policy_problems(act, required?: true)
    |> activity_course_problems(act, required?: true)
    |> then(fn probs ->
      cond do
        players = act["capacities"] && act["capacities"]["players"] ->
          if is_integer(players) and is_integer(act["minPlayers"]) and act["minPlayers"] <= players do
            probs
          else
            ["activity #{id}: minPlayers must not exceed capacities.players" | probs]
          end

        is_nil(act["minPlayers"]) ->
          probs

        true ->
          probs
      end
    end)
  end

  defp activity_race_problems(problems, %{"id" => id} = act) do
    extra =
      [act["minPlayers"] && "minPlayers", act["readyPolicy"] && "readyPolicy", act["course"] && "course"]
      |> Enum.reject(&is_falsey/1)

    if extra == [] do
      problems
    else
      ["activity #{id}: #{Enum.join(extra, "/")} are race fields; other types omit them" | problems]
    end
  end

  defp activity_min_players_problems(problems, %{"id" => _id, "minPlayers" => mp}, _kw)
       when is_integer(mp) and mp >= 1,
       do: problems

  defp activity_min_players_problems(problems, %{"id" => id}, required?: true),
    do: ["activity #{id}: snowboard-race requires minPlayers" | problems]

  defp activity_min_players_problems(problems, %{"id" => id, "minPlayers" => mp}, _kw),
    do: ["activity #{id}: minPlayers must be an integer >= 1, got #{inspect(mp)}" | problems]

  defp activity_min_players_problems(problems, _act, _kw), do: problems

  defp activity_ready_policy_problems(problems, %{"id" => _id, "readyPolicy" => policy}, _kw)
       when policy in @activity_ready_policies,
       do: problems

  defp activity_ready_policy_problems(problems, %{"id" => id}, required?: true),
    do: ["activity #{id}: snowboard-race requires readyPolicy" | problems]

  defp activity_ready_policy_problems(problems, %{"id" => id, "readyPolicy" => policy}, _kw),
    do: ["activity #{id}: unknown readyPolicy #{inspect(policy)}" | problems]

  defp activity_ready_policy_problems(problems, _act, _kw), do: problems

  defp activity_course_problems(
         problems,
         %{"id" => _id, "course" => %{"id" => cid, "version" => v}},
         _kw
       )
       when is_binary(cid) and is_integer(v) and v >= 1,
       do: problems

  defp activity_course_problems(problems, %{"id" => id}, required?: true),
    do: ["activity #{id}: snowboard-race requires course metadata" | problems]

  defp activity_course_problems(problems, %{"id" => id, "course" => course}, _kw),
    do: ["activity #{id}: course must specify id and a positive integer version, got #{inspect(course)}" | problems]

  defp activity_course_problems(problems, _act, _kw), do: problems

  defp is_falsey(nil), do: true
  defp is_falsey(false), do: true
  defp is_falsey(_), do: false
end
