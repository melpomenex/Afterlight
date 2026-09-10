defmodule Afterlight.Activities.DownhillMayhem.Course do
  @moduledoc """
  Canonical Downhill Mayhem course loader + sampler
  (integrate-multiplayer-downhill-mayhem-arcade 8.2).

  Reads the same hash-pinned baked numeric document the browser loads
  (`shared/downhill/courses/<id>.json` / `priv/downhill_courses/<id>.json`) and
  evaluates the same small sampler, so the server and every client share one
  contact surface. The small deterministic noise relief (`hash2`/`vnoise2`) is
  bit-for-bit ported from `shared/downhill/course.js`.
  """

  import Bitwise

  @course_version 1
  @rules_version 1

  defstruct [:doc, :id, :version, :rules_version, :seed, :finish_s, :ramps, :drops, :colliders, :buoys, :collider_buckets]

  @doc "Load a committed crafted course document by id (classic/timber/rock)."
  def load_crafted(mountain) when is_binary(mountain) do
    path = Application.app_dir(:afterlight, "priv/downhill_courses/#{mountain}.json")

    case File.read(path) do
      {:ok, bytes} -> load_bytes(bytes, mountain)
      {:error, reason} -> raise "downhill course #{mountain} unavailable: #{inspect(reason)}"
    end
  end

  def load_any(%{"mountain" => m} = doc) when is_binary(m) do
    build_struct(doc)
  end

  def load_bytes(bytes, mountain) do
    m = String.trim(mountain)
    doc = Jason.decode!(bytes)
    if doc["mountain"] not in [m, "daily"], do: raise("downhill course identity mismatch for #{m}")
    build_struct(doc)
  end

  defp build_struct(doc) do
    colliders = doc["colliders"] || []

    buckets =
      Enum.reduce(colliders, %{}, fn c, acc ->
        b = trunc(Float.floor(c["s"] / 10))
        Map.update(acc, b, [c], &[c | &1])
      end)

    %__MODULE__{
      doc: doc,
      id: doc["id"],
      version: doc["version"] || @course_version,
      rules_version: doc["rulesVersion"] || @rules_version,
      seed: doc["seed"],
      finish_s: doc["finishS"],
      ramps: doc["ramps"] || [],
      drops: doc["drops"] || [],
      colliders: colliders,
      buoys: doc["buoys"] || [],
      collider_buckets: buckets
    }
  end

  def finish_s(%__MODULE__{finish_s: f}), do: f
  def hash(%__MODULE__{doc: %{"hash" => h}}), do: h

  @doc "Interpolate the centreline sample at course distance `s`."
  def sample_track(%__MODULE__{} = c, s) do
    doc = c.doc
    n = length(doc["cy"])
    f = clamp((s - doc["sMin"]) / doc["ds"], 0.0, n - 1.001)
    i = trunc(Float.floor(f))
    t = f - i

    %{
      y: lerp(f32(doc["cy"], i), f32(doc["cy"], i + 1), t),
      curv: lerp(f32(doc["ccurv"], i), f32(doc["ccurv"], i + 1), t),
      grade: lerp(f32(doc["cgrade"], i), f32(doc["cgrade"], i + 1), t)
    }
  end

  defp f32(list, i), do: :erlang.float(Enum.at(list, i))

  @doc "Ramp height contributed at (s, lat), mirroring `rampHeightAt`."
  def ramp_height_at(%__MODULE__{ramps: ramps}, s, lat) do
    Enum.reduce_while(ramps, 0.0, fn r, _acc ->
      cond do
        s < r["s0"] -> {:halt, 0.0}
        s <= r["s0"] + r["len"] ->
          dl = abs(lat - r["latC"])

          if dl <= r["halfW"] do
            t = (s - r["s0"]) / r["len"]
            edge = clamp((r["halfW"] - dl) / 0.8, 0.0, 1.0)
            {:halt, r["h"] * :math.pow(t, 1.6) * edge}
          else
            {:cont, 0.0}
          end

        true -> {:cont, 0.0}
      end
    end)
  end

  @doc "The single ground function shared by physics and rendering."
  def height_at(%__MODULE__{} = c, s, lat) do
    doc = c.doc
    track = sample_track(c, s)
    a = abs(lat)
    half_w = doc["halfW"]
    ride_w = doc["rideW"]
    noff = rem(doc["seed"], 977) * 13.7

    y = track.y + track.curv * 9 * clamp(lat, -10.0, 10.0)

    roll_amp =
      if a < half_w, do: 0.22 * smoothstep(a / half_w), else: min(1.7, 0.22 + (a - half_w) * 0.11)

    y =
      y +
        vnoise2(s * 0.05 + noff, lat * 0.062 + noff) * roll_amp +
        vnoise2(s * 0.23 + noff, lat * 0.21 + noff) * roll_amp * 0.35

    y =
      if a > half_w do
        d = a - half_w
        y2 = y + 0.045 * :math.pow(d, 1.45)

        if a > ride_w do
          w = a - ride_w
          y2 + min(0.5 * w + 0.03 * w * w, 21.0)
        else
          y2
        end
      else
        y
      end

    y + ramp_height_at(c, s, lat)
  end

  # --- deterministic primitives, bit-for-bit with shared/downhill/course.js ---

  defp clamp(v, a, b), do: if(v < a, do: a, else: if(v > b, do: b, else: v))
  defp lerp(a, b, t), do: a + (b - a) * t
  defp smoothstep(t0) do
    t = clamp(t0, 0.0, 1.0)
    t * t * (3 - 2 * t)
  end

  defp to_i32(n) do
    n = band(n, 0xFFFFFFFF)
    if n >= 0x80000000, do: n - 0x100000000, else: n
  end

  defp u32(n), do: band(n, 0xFFFFFFFF)
  # JS `>>>`: logical (zero-filling) right shift.
  defp ushr(n, bits), do: bsr(u32(n), bits)

  @doc "JS `hash2(i, j)` — 2D integer hash in [0, 1)."
  def hash2(i, j) do
    h = to_i32(i * 374_761_393 + j * 668_265_263)
    h = to_i32(bxor(h, ushr(h, 13)))
    h = to_i32(h * 1_274_126_177)
    u32(bxor(h, ushr(h, 16))) / 4_294_967_296
  end

  @doc "JS `vnoise2(x, y)` — deterministic 2D value noise, ~[-1, 1]."
  def vnoise2(x, y) do
    xi = Float.floor(x)
    yi = Float.floor(y)
    xf = x - xi
    yf = y - yi

    a = hash2(trunc(xi), trunc(yi))
    b = hash2(trunc(xi) + 1, trunc(yi))
    cc = hash2(trunc(xi), trunc(yi) + 1)
    d = hash2(trunc(xi) + 1, trunc(yi) + 1)
    u = smoothstep(xf)
    v = smoothstep(yf)
    (lerp(lerp(a, b, u), lerp(cc, d, u), v) * 2 - 1)
  end

  @doc "Arithmetic right shift is not needed; expose bit helpers for tests."
  def bit_i32(n), do: to_i32(n)
end
