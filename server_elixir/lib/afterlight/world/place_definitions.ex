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
      {:ok, decoded["entries"]}
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

  defp validate_preset(id, _preset),
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
end
