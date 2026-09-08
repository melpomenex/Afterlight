defmodule Afterlight.Activities.Snowboard.Course do
  @moduledoc """
  Canonical Summit Run course loader, validator and samplers
  (add-multiplayer-snowboard-arcade 3.1, design D5/D6).

  The browser and this module consume the SAME generated document
  (`priv/snowboard_course.json`, byte-identical to
  `shared/snowboard/course-summit-night.json`) and its embedded sha256.
  Samplers reproduce the JavaScript arithmetic order exactly: linear
  centerline interpolation and clamped bilinear height interpolation over the
  baked grid. `tests/fixtures/snowboard/course-parity.json` pins sampled
  golden points; reducer parity (D10: ≤1cm position / 0.01 m/s) builds on
  these matching exactly.

  There is no hand-ported terrain function here and no rigid-body dependency:
  the baked grid IS the mountain for simulation as well as render. Document
  maps use the JSON string keys exactly as decoded from the shared file.
  """

  @course_id "summit-night"
  @course_version 1
  @rules_version 1
  @length_meters 1800
  @grid_step 2
  @lateral_step 2
  @corridor_half_width 24
  @groomed_half_width 18
  @max_colliders 64
  @checkpoint_planes [200, 400, 600, 800, 1000, 1200, 1400, 1600]
  @finish_meters 1800

  defstruct [:doc, :hash, :gates, :finish, :ramps, :obstacles, :recovery_points]

  @doc "Default priv path of the committed canonical course."
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
          gates: Map.get(doc, "gates"),
          finish: Map.get(doc, "finish"),
          ramps: Map.get(doc, "ramps"),
          obstacles: Map.get(doc, "obstacles"),
          recovery_points: Map.get(doc, "recoveryPoints")
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
  `canonicalCourseJson` in shared/snowboard/course.js byte for byte.
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

  @doc """
  Validates the document and returns a list of problems (empty = valid).
  Mirrors `validateCourse` in shared/snowboard/course.js.
  """
  def validate(doc) when is_map(doc) do
    grid = fetch(doc, "grid")
    s_values = fetch(grid, "sValues") || []
    u_values = fetch(grid, "uValues") || []
    height = fetch(grid, "height") || []
    centerline = fetch(doc, "centerline") || []
    s_count = div(@length_meters, @grid_step) + 1
    u_count = div(@corridor_half_width * 2, @lateral_step) + 1

    []
    |> problem(fetch(doc, "id") == @course_id, "course id must be #{@course_id}")
    |> problem(fetch(doc, "version") == @course_version, "course version must be #{@course_version}")
    |> problem(fetch(doc, "rulesVersion") == @rules_version, "rulesVersion must be #{@rules_version}")
    |> problem(fetch(doc, "lengthMeters") == @length_meters, "lengthMeters must be #{@length_meters}")
    |> problem(fetch(doc, "gridStepMeters") == @grid_step, "gridStepMeters must be 2")
    |> problem(fetch(doc, "corridorHalfWidth") == @corridor_half_width, "corridorHalfWidth must be 24")
    |> problem(length(s_values) == s_count, "grid needs #{s_count} s samples")
    |> problem(length(u_values) == u_count, "grid needs #{u_count} u samples")
    |> problem(length(height) == s_count, "height rows must match s samples")
    |> problem(s_uniform?(s_values), "sValues must run 0..#{@length_meters} uniformly at #{@grid_step}m")
    |> problem(u_uniform?(u_values), "uValues must span -#{@corridor_half_width}..#{@corridor_half_width} uniformly at #{@lateral_step}m")
    |> problem(heights_finite?(height, u_count), "all heights must be finite with #{u_count} columns")
    |> problem(centerline_ok?(centerline, s_count), "centerline entries must be finite, in-bounds, with rideable width")
    |> problem(gates_ok?(doc), "gates must be the eight ordered full-width checkpoints")
    |> problem(fetch(fetch(doc, "finish"), "s") == @finish_meters, "finish must sit at #{@finish_meters}m")
    |> problem(colliders_ok?(doc), "obstacle colliders must be bounded, finite and <= #{@max_colliders}")
    |> problem(recovery_ok?(doc), "recovery points must sit inside their earned segments")
    |> problem(valid_hash?(doc), "hash must match the canonical document")
    |> Enum.reverse()
  end

  def validate(_other), do: ["course document must be an object"]

  # --- samplers (exact JS arithmetic order) -----------------------------------

  @doc "Clamped bilinear surface height at course position (s, u)."
  def height_at(%__MODULE__{} = course, s, u) do
    grid = fetch(course.doc, "grid")
    height = fetch(grid, "height")
    s_max = length(fetch(grid, "sValues")) - 1
    u_max = length(fetch(grid, "uValues")) - 1

    fs = clamp(s / @grid_step, 0, s_max)
    i0 = min(trunc(fs), s_max - 1)
    ts = fs - i0
    fu = clamp((u + @corridor_half_width) / @lateral_step, 0, u_max)
    j0 = min(trunc(fu), u_max - 1)
    tu = fu - j0

    h00 = height_at_index(height, i0, j0)
    h10 = height_at_index(height, i0 + 1, j0)
    h01 = height_at_index(height, i0, j0 + 1)
    h11 = height_at_index(height, i0 + 1, j0 + 1)

    (h00 * (1 - ts) + h10 * ts) * (1 - tu) + (h01 * (1 - ts) + h11 * ts) * tu
  end

  @doc "Linear centerline x at s, clamped at the ends."
  def center_x_at(%__MODULE__{} = course, s) do
    centerline = fetch(course.doc, "centerline")
    last = length(centerline) - 1
    fs = clamp(s / @grid_step, 0, last)
    i0 = min(trunc(fs), last - 1)
    ts = fs - i0

    x0 = fetch(Enum.at(centerline, i0), "x")
    x1 = fetch(Enum.at(centerline, i0 + 1), "x")
    x0 * (1 - ts) + x1 * ts
  end

  @doc """
  Downhill grade g(s) = clamp(-dHeight/ds, 0, 0.6) sampled from the same
  grid at the centerline.
  """
  def grade_at(%__MODULE__{} = course, s) do
    back = max(0, s - @grid_step) * 1.0
    ahead = min(@length_meters, s + @grid_step) * 1.0
    slope = (height_at(course, ahead, 0) - height_at(course, back, 0)) / (ahead - back)
    clamp(-slope, 0.0, 0.6)
  end

  # --- internals ---------------------------------------------------------------

  defp height_at_index(height, i, j), do: height |> Enum.at(i) |> Enum.at(j)

  defp s_uniform?(s_values) do
    s_values
    |> Enum.with_index()
    |> Enum.all?(fn {s, i} -> s == i * @grid_step end)
  end

  defp u_uniform?(u_values) do
    u_values
    |> Enum.with_index()
    |> Enum.all?(fn {u, j} -> u == -@corridor_half_width + j * @lateral_step end)
  end

  defp heights_finite?(height, u_count) do
    Enum.all?(height, fn row ->
      is_list(row) and length(row) == u_count and Enum.all?(row, &is_number/1)
    end)
  end

  defp centerline_ok?(centerline, s_count) do
    length(centerline) == s_count and
      Enum.all?(centerline, fn entry ->
        is_number(fetch(entry, "x")) and abs(fetch(entry, "x")) <= @corridor_half_width and
          is_number(fetch(entry, "width")) and fetch(entry, "width") > 0 and
          fetch(entry, "width") <= 2 * @corridor_half_width
      end)
  end

  defp gates_ok?(doc) do
    gates = fetch(doc, "gates") || []

    length(gates) == length(@checkpoint_planes) and
      Enum.with_index(gates, 1)
      |> Enum.all?(fn {gate, index} ->
        fetch(gate, "index") == index and
          Enum.at(@checkpoint_planes, index - 1) == fetch(gate, "s") and
          fetch(gate, "uMin") == -@corridor_half_width and
          fetch(gate, "uMax") == @corridor_half_width
      end)
  end

  defp colliders_ok?(doc) do
    obstacles = fetch(doc, "obstacles") || []
    length(obstacles) <= @max_colliders and
      Enum.all?(obstacles, fn ob ->
        is_binary(fetch(ob, "id")) and
          is_number(fetch(ob, "s")) and fetch(ob, "s") >= 0 and fetch(ob, "s") <= @finish_meters and
          abs(fetch(ob, "u") || 999) <= @corridor_half_width and
          is_number(fetch(ob, "halfS")) and fetch(ob, "halfS") > 0 and
          is_number(fetch(ob, "halfU")) and fetch(ob, "halfU") > 0 and
          is_number(fetch(ob, "height")) and fetch(ob, "height") > 0
      end)
  end

  defp recovery_ok?(doc) do
    recovery = fetch(doc, "recoveryPoints") || []

    Enum.all?(recovery, fn point ->
      s = fetch(point, "s")
      segment = fetch(point, "segment")

      is_number(s) and s >= 0 and s < @finish_meters and
        is_integer(segment) and segment >= 0 and segment <= length(@checkpoint_planes) and
        abs(fetch(point, "u") || 999) < @groomed_half_width and
        within_segment?(s, segment)
    end)
  end

  defp within_segment?(s, 0), do: s < Enum.at(@checkpoint_planes, 0)

  defp within_segment?(s, segment) do
    earned = Enum.at(@checkpoint_planes, segment - 1)
    next = Enum.at(@checkpoint_planes, segment, @finish_meters)
    s >= earned and s < next
  end

  defp valid_hash?(doc) do
    hash_value = fetch(doc, "hash")
    is_binary(hash_value) and Regex.match?(~r/^[0-9a-f]{64}$/, hash_value) and hash(doc) == hash_value
  end

  defp fetch(map, key) when is_map(map) and is_binary(key), do: Map.get(map, key)
  defp fetch(_other, _key), do: nil

  defp problem(problems, true, _message), do: problems
  defp problem(problems, false, message), do: [message | problems]

  defp clamp(value, low, high), do: value |> max(low) |> min(high)
end
