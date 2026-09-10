defmodule Afterlight.Activities.DownhillMayhem.DailyTest do
  use ExUnit.Case, async: true

  alias Afterlight.Activities.DownhillMayhem.Course
  alias Afterlight.Activities.DownhillMayhem.Daily

  @fixture_dir Path.join([__DIR__, "..", "..", "fixtures", "downhill"])

  # Representative Daily seeds (see scripts/export-downhill-fixtures.mjs):
  # a plain date plus a crafted-seed quirk that must build that mountain.
  @fixture_seeds [20_260_910, 19_930_211]

  defp fixture(seed) do
    @fixture_dir
    |> Path.join("daily_#{seed}.json")
    |> Path.expand()
    |> File.read!()
    |> Jason.decode!()
  end

  defp max_diff(a, b) do
    Enum.zip(a, b) |> Enum.reduce(0.0, fn {x, y}, acc -> max(acc, abs(x - y)) end)
  end

  test "seed_for_date uses the source UTC YYYYMMDD packing" do
    assert Daily.seed_for_date(~D[2026-09-10]) == 20_260_910
    assert Daily.seed_for_date(~D[1993-02-11]) == 1_993_0211
  end

  test "generated Daily matches the JS authoring oracle for every fixture seed" do
    for seed <- @fixture_seeds do
      expected = fixture(seed)
      got = Daily.generate_document(seed)

      assert got["id"] == expected["id"]
      assert got["version"] == expected["version"]
      assert got["rulesVersion"] == expected["rulesVersion"]
      assert got["mountain"] == expected["mountain"]
      assert got["seed"] == expected["seed"]
      assert got["ds"] == expected["ds"]
      assert got["sMin"] == expected["sMin"]
      assert got["sMax"] == expected["sMax"]
      assert got["finishS"] == expected["finishS"]
      assert got["halfW"] == expected["halfW"]
      assert got["rideW"] == expected["rideW"]
      assert got["latClamp"] == expected["latClamp"]
      assert got["knobs"] == expected["knobs"]
      assert got["startLats"] == expected["startLats"]

      # Physics arrays are bit-for-bit (float32 stores shared by both runtimes).
      assert got["cy"] == expected["cy"], "seed #{seed}: cy drifted"
      assert got["ccurv"] == expected["ccurv"], "seed #{seed}: ccurv drifted"
      assert got["cgrade"] == expected["cgrade"], "seed #{seed}: cgrade drifted"

      # Render-only arrays depend on libm sin/cos; keep an explicit tolerance.
      assert max_diff(got["cx"], expected["cx"]) < 1.0e-6, "seed #{seed}: cx drifted"
      assert max_diff(got["cz"], expected["cz"]) < 1.0e-6, "seed #{seed}: cz drifted"
      assert max_diff(got["ch"], expected["ch"]) < 1.0e-6, "seed #{seed}: ch drifted"

      # Structural obstacle/ramp/drop lists are exactly equal.
      assert got["ramps"] == expected["ramps"], "seed #{seed}: ramps drifted"
      assert got["drops"] == expected["drops"], "seed #{seed}: drops drifted"
      assert got["colliders"] == expected["colliders"], "seed #{seed}: colliders drifted"
    end
  end

  test "the Daily document hash is deterministic and canonical-form" do
    seed = hd(@fixture_seeds)
    a = Daily.generate_document(seed)
    b = Daily.generate_document(seed)

    assert a == b, "the same seed must always bake the same document"
    assert is_binary(a["hash"]) and byte_size(a["hash"]) == 64
    assert a["hash"] =~ ~r/^[0-9a-f]{64}$/
  end

  test "the crafted-seed quirk builds that mountain (rock) for the Daily identity" do
    got = Daily.generate_document(1_993_0211)
    assert got["id"] == "daily"
    assert got["knobs"]["twist"] == 0.82
    assert got["knobs"]["rocks"] == 1.0
  end

  test "daily/0 returns a loaded course for today and caches it" do
    first = Daily.daily()
    second = Daily.daily()

    assert %Course{} = first
    assert first.id == "daily"
    assert Course.finish_s(first) == 2300.0
    assert first.seed == Daily.seed_for_date(Date.utc_today())
    assert first == second, "the UTC-day cache must return the same loaded document"
  end
end
