defmodule Afterlight.Activities.Snowboard.CourseTest do
  @moduledoc """
  Course authority tests (add-multiplayer-snowboard-arcade 3.1): the
  committed priv copy loads, its hash verifies, and the Elixir samplers
  reproduce the JS-exported golden parity points exactly.
  """

  use ExUnit.Case, async: true

  alias Afterlight.Activities.Snowboard.Course

  @parity_path Path.expand("../../../../tests/fixtures/snowboard/course-parity.json", __DIR__)

  describe "loading the canonical course" do
    test "the committed priv copy loads and passes validation" do
      assert %Course{} = course = Course.load_default()
      assert course.hash == Map.get(course.doc, "hash")
      assert Course.validate(course.doc) == []
      assert length(course.gates) == 8
      assert Map.get(course.finish, "s") == 1800
      assert length(course.obstacles) <= 64
    end

    test "a drifted document is refused with named problems" do
      doc = default_doc()
      bad = Map.update!(doc, "lengthMeters", fn _ -> 1500 end)
      assert {:error, problems} = Course.load(bad, raise: false)
      assert Enum.any?(problems, &String.contains?(&1, "lengthMeters"))

      tampered = Map.update!(doc, "grid", fn grid ->
        Map.update!(grid, "height", fn rows -> List.update_at(rows, 100, &List.replace_at(&1, 12, 99.0)) end)
      end)
      assert {:error, problems} = Course.load(tampered, raise: false)
      assert Enum.any?(problems, &String.contains?(&1, "hash must match"))

      assert {:error, ["course document must be an object"]} = Course.load("nope", raise: false)
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
    test "every exported golden point matches exactly" do
      course = Course.load_default()
      parity = @parity_path |> File.read!() |> Jason.decode!()

      assert Map.get(parity, "courseHash") == course.hash
      points = Map.get(parity, "points")
      assert length(points) >= 20

      mismatches =
        for point <- points, mismatch?(course, point) do
          point
        end

      assert mismatches == [], "sampler drift: #{inspect(Enum.take(mismatches, 3))}"
    end

    test "height descends downhill and clamps at the sampled rectangle" do
      course = Course.load_default()
      assert Course.height_at(course, 1800, 0) < Course.height_at(course, 0, 0)
      assert Course.height_at(course, -50, 0) == Course.height_at(course, 0, 0)
      assert Course.height_at(course, 9999, 0) == Course.height_at(course, 1800, 0)
      assert Course.height_at(course, 0, -100) == Course.height_at(course, 0, -24)
      assert Course.height_at(course, 0, 100) == Course.height_at(course, 0, 24)
    end

    test "grade stays inside the contract clamp" do
      course = Course.load_default()

      for s <- [50, 220, 600, 900, 1100, 1500, 1750] do
        grade = Course.grade_at(course, s)
        assert grade >= 0.0 and grade <= 0.6, "grade at #{s} inside [0, 0.6]"
      end
    end
  end

  defp default_path do
    Application.app_dir(:afterlight, "priv/snowboard_course.json")
  end

  defp default_doc, do: default_path() |> File.read!() |> Jason.decode!()

  defp mismatch?(course, %{"kind" => kind, "s" => s, "u" => u, "expected" => expected})
       when kind in ["height_node_or_interp", "clamp_low_s", "clamp_high_s", "clamp_low_u", "clamp_high_u"] do
    abs(Course.height_at(course, s * 1.0, u * 1.0) - expected * 1.0) > 1.0e-9
  end

  defp mismatch?(course, %{"kind" => "center_x", "s" => s, "expected" => expected}) do
    abs(Course.center_x_at(course, s * 1.0) - expected * 1.0) > 1.0e-9
  end

  defp mismatch?(course, %{"kind" => "grade", "s" => s, "expected" => expected}) do
    abs(Course.grade_at(course, s * 1.0) - expected * 1.0) > 1.0e-9
  end
end
