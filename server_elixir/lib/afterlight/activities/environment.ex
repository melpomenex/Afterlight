defmodule Afterlight.Activities.Environment do
  @moduledoc """
  Authoritative activity environment projection and defaults (Task 7.1).

  Specifications:
  - `openspec/changes/add-place-activities-program/specs/signature-place-activities/spec.md`
    (Requirement: Authoritative environment contract)
  - `openspec/changes/add-place-activities-program/design.md` (D7)

  Guarantees:
  - Versioned environment projection from room atmosphere.
  - Frozen conditions captured at match start remain immutable throughout competitive runs.
  - Missing or unpopulated atmosphere falls back to declared place presets or neutral defaults.
  - Pure read-only interaction with room atmosphere; `Afterlight.World.Weather`
    and every other place system are completely untouched.
  """

  alias Afterlight.World.{Atmosphere, PlaceDefinitions}

  @schema_version 1
  @valid_policies ~w(none frozen live)

  @doc "Current schema version"
  def schema_version, do: @schema_version

  @doc "List of valid environment policies"
  def valid_policies, do: @valid_policies

  @doc """
  Resolves environment conditions for an activity run.

  Arguments:
  - `wire_room_id`: string wire room ID (e.g. "court", "rooftops", "canal")
  - `policy`: "none", "frozen", or "live"
  - `now`: timestamp (ms)
  - `opts`: keyword options, supports `:atmosphere_snapshot` to inject snapshot directly.
  """
  def resolve(wire_room_id, policy, now, opts \\ [])

  def resolve(_wire_room_id, policy, _now, _opts) when policy in ["none", :none, nil] do
    default("none")
  end

  def resolve(wire_room_id, policy, now, opts) when is_binary(wire_room_id) or is_nil(wire_room_id) do
    pol_str = to_string(policy)
    pol_str = if pol_str in @valid_policies, do: pol_str, else: "none"

    if pol_str == "none" do
      default("none")
    else
      snapshot =
        case Keyword.get(opts, :atmosphere_snapshot) do
          nil -> Atmosphere.snapshot_for(wire_room_id)
          snap when is_map(snap) -> {:ok, snap}
          :unavailable -> :unavailable
        end

      case snapshot do
        {:ok, %{"state" => state} = _snap} when is_map(state) ->
          wind = Map.get(state, "wind", [0.0, 0.0])
          [wx, wz] = normalize_wind(wind)
          wind_speed = :math.sqrt(wx * wx + wz * wz)
          preset = Map.get(state, "preset")
          intensity = clamp01(Map.get(state, "intensity", 0.0))

          preset_row = if preset, do: Map.get(PlaceDefinitions.presets(), preset), else: nil
          rain = if preset_row, do: clamp01(Map.get(preset_row, "rain", 0.0)), else: 0.0
          wetness = if preset_row, do: clamp01(Map.get(preset_row, "wetness", 0.0)), else: 0.0

          time_phase =
            case Map.get(state, "time") do
              %{"phase" => p} when is_number(p) -> clamp01(p)
              _ -> 0.0
            end

          frozen_at = if pol_str == "frozen", do: now, else: nil

          %{
            "version" => @schema_version,
            "policy" => pol_str,
            "preset" => preset,
            "wind" => [wx, wz],
            "windSpeed" => wind_speed,
            "rain" => rain,
            "intensity" => intensity,
            "wetness" => wetness,
            "timePhase" => time_phase,
            "frozenAt" => frozen_at
          }

        _ ->
          preset_id =
            case PlaceDefinitions.get(wire_room_id) do
              %{"atmosphere" => %{"preset" => p}} when is_binary(p) -> p
              _ -> nil
            end

          default(pol_str, preset_id: preset_id, now: now)
      end
    end
  end

  @doc """
  Returns deterministic default environment.
  """
  def default(policy \\ "none", opts \\ []) do
    pol_str = to_string(policy)
    pol_str = if pol_str in @valid_policies, do: pol_str, else: "none"

    if pol_str == "none" do
      %{
        "version" => @schema_version,
        "policy" => "none",
        "preset" => nil,
        "wind" => [0.0, 0.0],
        "windSpeed" => 0.0,
        "rain" => 0.0,
        "intensity" => 0.0,
        "wetness" => 0.0,
        "timePhase" => 0.0,
        "frozenAt" => nil
      }
    else
      preset_id = Keyword.get(opts, :preset_id)
      now = Keyword.get(opts, :now, 0)

      preset = if preset_id, do: Map.get(PlaceDefinitions.presets(), preset_id), else: nil

      {wx, wz} =
        case preset do
          %{"wind" => [a, b]} when is_number(a) and is_number(b) -> {clamp_wind(a), clamp_wind(b)}
          _ -> {0.0, 0.0}
        end

      wind_speed = :math.sqrt(wx * wx + wz * wz)
      rain = if preset, do: clamp01(Map.get(preset, "rain", 0.0)), else: 0.0
      intensity = if preset, do: clamp01(Map.get(preset, "intensity", 0.0)), else: 0.0
      wetness = if preset, do: clamp01(Map.get(preset, "wetness", 0.0)), else: 0.0

      frozen_at = if pol_str == "frozen", do: now, else: nil

      %{
        "version" => @schema_version,
        "policy" => pol_str,
        "preset" => preset_id,
        "wind" => [wx, wz],
        "windSpeed" => wind_speed,
        "rain" => rain,
        "intensity" => intensity,
        "wetness" => wetness,
        "timePhase" => 0.0,
        "frozenAt" => frozen_at
      }
    end
  end

  @doc """
  Validates an environment state map.
  """
  def validate(env) when is_map(env) do
    with :ok <- validate_version(env["version"]),
         :ok <- validate_policy(env["policy"]),
         :ok <- validate_fields(env) do
      :ok
    end
  end

  def validate(_), do: {:error, :not_a_map}

  defp validate_version(@schema_version), do: :ok
  defp validate_version(_), do: {:error, :invalid_version}

  defp validate_policy(p) when p in @valid_policies, do: :ok
  defp validate_policy(_), do: {:error, :invalid_policy}

  defp validate_fields(%{"policy" => "none"}), do: :ok

  defp validate_fields(env) do
    cond do
      not is_list(env["wind"]) or length(env["wind"]) != 2 ->
        {:error, :invalid_wind}

      not Enum.all?(env["wind"], fn v -> is_number(v) and v >= -1.0 and v <= 1.0 end) ->
        {:error, :wind_out_of_bounds}

      not (is_number(env["windSpeed"]) and env["windSpeed"] >= 0.0) ->
        {:error, :invalid_wind_speed}

      not Enum.all?(["rain", "intensity", "wetness", "timePhase"], fn k ->
        v = env[k]
        is_number(v) and v >= 0.0 and v <= 1.0
      end) ->
        {:error, :property_out_of_bounds}

      env["policy"] == "frozen" and not (is_number(env["frozenAt"]) and env["frozenAt"] >= 0) ->
        {:error, :missing_frozen_at}

      true ->
        :ok
    end
  end

  defp normalize_wind([wx, wz]) when is_number(wx) and is_number(wz) do
    [clamp_wind(wx), clamp_wind(wz)]
  end

  defp normalize_wind(_), do: [0.0, 0.0]

  defp clamp01(v) when is_number(v), do: max(0.0, min(1.0, v * 1.0))
  defp clamp01(_), do: 0.0

  defp clamp_wind(v) when is_number(v), do: max(-1.0, min(1.0, v * 1.0))
  defp clamp_wind(_), do: 0.0
end
