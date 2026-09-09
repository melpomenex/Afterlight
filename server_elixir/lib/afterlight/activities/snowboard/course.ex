defmodule Afterlight.Activities.Snowboard.Course do
  @moduledoc """
  Canonical Summit Run course — ALPINE RUSH loader, validator and samplers
  (integrate-ssxtricky-snowboard 3.2, ported from the frozen SSXTricky source
  rev e87f6c7d; see the change's baseline.md for provenance).

  The course is ANALYTIC: the browser and this module compute the SAME
  closed-form terrain functions (winding centerline, ground height, ramp
  profiles) that `shared/snowboard/course.js` ports verbatim, while the
  enumerable features (13 ramps, 13 speed zones, 22 pickups, 4 banners) come
  from the SAME canonical document (`priv/snowboard_course.json`,
  byte-identical to `shared/snowboard/course-alpine-rush.json`) with its
  embedded sha256. `tests/fixtures/snowboard/course-parity.json` pins sampled
  golden points; reducer parity (≤1cm position / 0.01 m/s over the golden
  fixture) builds on these agreeing to ≤1e-9.

  There is no baked height grid and no rigid-body dependency: the analytic
  surface IS the mountain for simulation and render alike, exactly as in the
  source game (cosmetic bank noise beyond |x-center| > 29 is render-only and
  absent from contact math on both runtimes).
  """

  defstruct [:doc, :hash, :ramps, :speed_zones, :pickups, :banners, :finish]

  @course_id "alpine-rush"
  @course_version 2
  @rules_version 2
  @length_meters 1800
  @corridor_half_width 35
  @carve_half_width 20
  @groomed_half_width 23
  @edge_bleed_half_width 23
  @ramp_count 13
  @pickup_count 22
  @approx 1.0e-6

  def default_path, do: Application.app_dir(:afterlight, "priv/snowboard_course.json")

  @doc """
  Loads and validates the course document (a decoded JSON map). Raises on
  any contract violation: the race authority must never simulate on top of a
  drifted course. `raise: false` returns `{:error, problems}` instead.
  """
  def load(doc, opts \\ [])

  def load(doc, opts) when is_map(doc) do
    case validate(doc) do
      [] ->
        %__MODULE__{
          doc: doc,
          hash: Map.get(doc, "hash"),
          ramps: Map.get(doc, "ramps"),
          speed_zones: Map.get(doc, "speedZones"),
          pickups: Map.get(doc, "pickups"),
          banners: Map.get(doc, "banners"),
          finish: Map.get(doc, "finish")
        }

      problems ->
        if opts[:raise] == false do
          {:error, problems}
        else
          raise ArgumentError, "refusing to load invalid snowboard course: " <> Enum.join(problems, "; ")
        end
    end
  end

  def load(_other, _opts), do: {:error, ["course document must be an object"]}

  @doc "Total course length in meters."
  def total_length(%__MODULE__{} = course), do: Map.get(course.doc, "lengthMeters")

  @doc "Loads the committed priv copy."
  def load_default do
    default_path() |> File.read!() |> Jason.decode!() |> load()
  end

  @doc """
  Canonical (sorted-key, hash-free) JSON encoding, matching
  `canonicalCourseJson` in shared/snowboard/courseHash.js byte for byte.
  """
  def canonical_json(value) when is_map(value) do
    inner =
      value
      |> Enum.map(fn {k, v} -> {to_string(k), canonical_json(v)} end)
      |> Enum.sort_by(fn {k, _v} -> k end)
      |> Enum.map_join(",", fn {k, v} -> Jason.encode!(k) <> ":" <> v end)

    "{" <> inner <> "}"
  end

  def canonical_json(value) when is_list(value) do
    "[" <> Enum.map_join(value, ",", &canonical_json/1) <> "]"
  end

  def canonical_json(value), do: Jason.encode!(value)

  @doc "sha256 hex over the canonical hash-free form, as computed by the JS export."
  def hash(%{} = doc) do
    without_hash = Map.drop(doc, ["hash", :hash])
    Base.encode16(:crypto.hash(:sha256, canonical_json(without_hash)), case: :lower)
  end

  # --- analytic terrain (verbatim ports of the source functions) -----------------

  @doc """
  Winding groomed centerline x(d). Source:
  sin(d*.003)*24 + sin(d*.009)*7.
  """
  def center_at(d) do
    :math.sin(d * 0.003) * 24 + :math.sin(d * 0.009) * 7
  end

  @doc """
  Absolute ground height. Source:
  -d*.18 + sin(d*.012)*2 + pow(max(0,|x-center(d)|-22),1.18)*.38
  """
  def ground_at(x, d) do
    -d * 0.18 + :math.sin(d * 0.012) * 2 +
      :math.pow(max(0.0, abs(x - center_at(d)) - 22), 1.18) * 0.38
  end

  @doc "Height on a ramp at course distance d (clamped profile)."
  def ramp_height(ramp, d) do
    ramp["base"] + clamp((d - ramp["start"]) / (ramp["end"] - ramp["start"]), 0, 1) * ramp["height"]
  end

  @doc "Whether (x, d) is on the ramp's footprint."
  def on_ramp?(ramp, x, d) do
    d >= ramp["start"] and d <= ramp["end"] and abs(x - ramp["x"]) <= ramp["width"] / 2
  end

  @doc "Contact surface at absolute (x, d): max(ground, ramp surfaces)."
  def surface_at(%__MODULE__{} = course, x, d) do
    Enum.reduce(course.ramps, ground_at(x, d), fn ramp, h ->
      if on_ramp?(ramp, x, d), do: max(h, ramp_height(ramp, d)), else: h
    end)
  end

  # --- validation -----------------------------------------------------------------

  @doc """
  Validates the document and returns a list of problems (empty = valid).
  Mirrors `validateCourse` in shared/snowboard/course.js.
  """
  def validate(doc) when is_map(doc) do
    ramps = fetch(doc, "ramps") || []
    zones = fetch(doc, "speedZones") || []
    pickups = fetch(doc, "pickups") || []
    banners = fetch(doc, "banners") || []

    []
    |> problem(fetch(doc, "id") == @course_id, "course id must be #{@course_id}")
    |> problem(fetch(doc, "version") == @course_version, "course version must be #{@course_version}")
    |> problem(fetch(doc, "rulesVersion") == @rules_version, "rulesVersion must be #{@rules_version}")
    |> problem(fetch(doc, "lengthMeters") == @length_meters, "lengthMeters must be #{@length_meters}")
    |> problem(fetch(doc, "corridorHalfWidth") == @corridor_half_width, "corridorHalfWidth must be #{@corridor_half_width}")
    |> problem(fetch(doc, "carveHalfWidth") == @carve_half_width, "carveHalfWidth must be #{@carve_half_width}")
    |> problem(fetch(doc, "groomedHalfWidth") == @groomed_half_width, "groomedHalfWidth must be #{@groomed_half_width}")
    |> problem(fetch(doc, "edgeBleedHalfWidth") == @edge_bleed_half_width, "edgeBleedHalfWidth must be #{@edge_bleed_half_width}")
    |> problem(length(ramps) == @ramp_count, "course must declare exactly #{@ramp_count} ramps")
    |> problem(ramps_ok?(ramps), "ramps must match the source layout and sit on the terrain")
    |> problem(length(zones) == @ramp_count, "course must declare exactly #{@ramp_count} speed zones")
    |> problem(zones_ok?(zones, ramps), "speed zones must feed their ramps at source offsets")
    |> problem(length(pickups) == @pickup_count, "course must declare exactly #{@pickup_count} pickups")
    |> problem(pickups_ok?(pickups), "pickups must sit on the source lines inside the corridor")
    |> problem(length(banners) == 4, "course must declare the four source banners")
    |> problem(banners_ok?(banners), "the finish banner must sit at the finish")
    |> problem(fetch(fetch(doc, "finish"), "s") == @length_meters, "finish must sit at #{@length_meters}m")
    |> problem(valid_hash?(doc), "hash must match the canonical document")
    |> Enum.reverse()
  end

  def validate(_other), do: ["course document must be an object"]

  defp ramps_ok?(ramps) do
    ramps
    |> Enum.with_index()
    |> Enum.all?(fn {ramp, i} ->
      center = 95 + i * 124
      source_x = center_at(center) + source_offset(i)

      is_binary(fetch(ramp, "id")) and
        abs(fetch(ramp, "start") - (center - 9)) <= @approx and
        abs(fetch(ramp, "end") - (center + 9)) <= @approx and
        abs(fetch(ramp, "x") - source_x) <= 1.0e-4 and
        fetch(ramp, "width") == 12 and fetch(ramp, "height") == 5 and
        abs(fetch(ramp, "base") - ground_at(fetch(ramp, "x"), fetch(ramp, "start"))) <= 1.0e-4 and
        fetch(ramp, "start") > 0 and fetch(ramp, "end") < @length_meters
    end)
  end

  # Source createRamps(): the first ramp sits ON the centerline, the rest
  # alternate (i%3-1)*11 across it.
  defp source_offset(0), do: 0
  defp source_offset(i), do: (rem(i, 3) - 1) * 11

  defp zones_ok?(zones, ramps) do
    zones
    |> Enum.with_index()
    |> Enum.all?(fn {zone, i} ->
      ramp = Enum.at(ramps, i)

      is_map(ramp) and is_map(zone) and
        abs(fetch(zone, "start") - (fetch(ramp, "start") - 41)) <= @approx and
        abs(fetch(zone, "end") - (fetch(ramp, "start") - 19)) <= @approx and
        fetch(zone, "x") == fetch(ramp, "x") and fetch(zone, "width") == 10
    end)
  end

  defp pickups_ok?(pickups) do
    pickups
    |> Enum.with_index()
    |> Enum.all?(fn {pickup, i} ->
      d = 70 + i * 76
      source_x = center_at(d) + :math.sin(i * 2) * 15

      is_map(pickup) and
        abs(fetch(pickup, "d") - d) <= @approx and
        abs(fetch(pickup, "x") - source_x) <= 1.0e-4 and
        abs(fetch(pickup, "x") - center_at(fetch(pickup, "d"))) <= @corridor_half_width and
        fetch(pickup, "d") > 0 and fetch(pickup, "d") < @length_meters
    end)
  end

  defp banners_ok?(banners) do
    Enum.any?(banners, fn banner ->
      is_map(banner) and fetch(banner, "finish") == true and fetch(banner, "d") == @length_meters
    end)
  end

  defp valid_hash?(doc) do
    hash_value = fetch(doc, "hash")
    is_binary(hash_value) and Regex.match?(~r/^[0-9a-f]{64}$/, hash_value) and hash(doc) == hash_value
  end

  defp fetch(map, key) when is_map(map) and is_binary(key), do: Map.get(map, key)
  defp fetch(_other, _key), do: nil

  defp problem(problems, true, _message), do: problems
  defp problem(problems, false, message), do: [message | problems]

  defp clamp(value, low, high), do: value |> max(low * 1.0) |> min(high * 1.0)
end
