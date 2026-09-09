defmodule Afterlight.Activities.Snowboard.CourseTest do
  @moduledoc """
  Course authority tests (integrate-ssxtricky-snowboard 3.2/3.4): the
  committed ALPINE RUSH priv copy loads, its hash verifies, the source layout
  invariants hold, and the Elixir analytic samplers reproduce the JS-exported
  golden parity points exactly (≤1e-9).
  """

  use ExUnit.Case, async: true

  alias Afterlight.Activities.Snowboard.Course

  @parity_path Path.expand("../../../../tests/fixtures/snowboard/course-parity.json", __DIR__)

  describe "loading the canonical course" do
    test "the committed priv copy loads and passes validation" do
      assert %Course{} = course = Course.load_default()
      assert course.hash == Map.get(course.doc, "hash")
      assert Course.validate(course.doc) == []
      assert length(course.ramps) == 13
      assert length(course.speed_zones) == 13
      assert length(course.pickups) == 22
      assert length(course.banners) == 4
      assert Map.get(course.finish, "s") == 1800
    end

    test "a drifted document is refused with named problems" do
      doc = default_doc()
      bad = Map.update!(doc, "lengthMeters", fn _ -> 1500 end)
      assert {:error, problems} = Course.load(bad, raise: false)
      assert Enum.any?(problems, &String.contains?(&1, "lengthMeters"))

      moved_pickup =
        Map.update!(doc, "pickups", fn pickups ->
          List.update_at(pickups, 3, &Map.put(&1, "x", Map.get(&1, "x") + 9.0))
        end)

      assert {:error, problems} = Course.load(moved_pickup, raise: false)
      assert Enum.any?(problems, &String.contains?(&1, "pickup"))

      assert {:error, ["course document must be an object"]} = Course.load("nope", raise: false)
    end

    test "the source layout invariants hold on the samplers" do
      course = Course.load_default()
      # Ramp 0 sits ON the centerline; ramps 1..12 alternate (i%3-1)*11.
      ramp0 = hd(course.ramps)
      assert abs(ramp0["x"] - Course.center_at(95)) < 1.0e-5 # baked ramp x is round6-rounded at export
      assert ramp0["width"] == 12 and ramp0["height"] == 5
      # Contact on the ramp rises above the raw ground under it.
      mid = (ramp0["start"] + ramp0["end"]) / 2
      assert Course.surface_at(course, ramp0["x"], mid) > Course.ground_at(ramp0["x"], mid)
      # Outside the ramp footprint the surface is the analytic ground.
      assert Course.surface_at(course, ramp0["x"] + 20, mid) ==
               Course.ground_at(ramp0["x"] + 20, mid)
      # Downhill: the ground descends with distance; banks rise outward.
      assert Course.ground_at(0, 100) < Course.ground_at(0, 0)
      assert Course.ground_at(Course.center_at(500) + 30, 500) >
               Course.ground_at(Course.center_at(500), 500)
    end
  end

  describe "hash parity" do
    test "the Elixir canonical hash reproduces the committed hash" do
      doc = default_doc()
      assert Course.hash(doc) == Map.get(doc, "hash")

      # Key order never matters.
      reordered = doc |> Map.to_list() |> Enum.reverse() |> Map.new()
      assert Course.hash(reordered) == Map.get(doc, "hash")
    end
  end

  describe "JS sampler parity" do
    test "every exported golden point matches within 1e-9" do
      course = Course.load_default()
      parity = @parity_path |> File.read!() |> Jason.decode!()

      assert Map.get(parity, "courseHash") == course.hash
      points = Map.get(parity, "points")
      assert length(points) >= 20

      mismatches = for point <- points, mismatch?(course, point), do: point
      assert mismatches == [], "sampler drift: #{inspect(Enum.take(mismatches, 3))}"
    end
  end

  defp default_path do
    Application.app_dir(:afterlight, "priv/snowboard_course.json")
  end

  defp default_doc, do: default_path() |> File.read!() |> Jason.decode!()

  # Parity points carry (s, u-lateral); the samplers take absolute x.
  defp mismatch?(course, %{"kind" => kind, "s" => s, "u" => u, "expected" => expected})
       when kind in ["height", "ramp_contact", "ground_off_center", "far_bank"] do
    x = Course.center_at(s * 1.0) + u * 1.0
    abs(Course.surface_at(course, x, s * 1.0) - expected * 1.0) > 1.0e-9
  end

  defp mismatch?(course, %{"kind" => "center_x", "s" => s, "expected" => expected}) do
    abs(Course.center_at(s * 1.0) - expected * 1.0) > 1.0e-9
  end
end
