defmodule Afterlight.Activities.DownhillMayhem.CourseTest do
  use ExUnit.Case, async: true

  alias Afterlight.Activities.DownhillMayhem.Course

  @fixture Path.join([__DIR__, "..", "..", "fixtures", "downhill", "course_parity.json"])

  setup_all do
    fixture = @fixture |> Path.expand() |> File.read!() |> Jason.decode!()
    {:ok, fixture: fixture}
  end

  test "committed classic course loads and validates", %{fixture: fixture} do
    course = Course.load_crafted("classic")
    assert course.id == "classic"
    assert course.finish_s == fixture["finishS"]
    assert Course.hash(course) == fixture["hash"]
  end

  test "height sampler matches the JavaScript authority", %{fixture: fixture} do
    course = Course.load_crafted("classic")

    worst =
      Enum.reduce(fixture["heights"], 0.0, fn [s, lat, expected], worst ->
        got = Course.height_at(course, s, lat)
        max(worst, abs(got - expected))
      end)

    # Same baked document + the same small sampler; tolerance is for libm pow.
    assert worst < 1.0e-6, "height parity worst diff #{worst}"
  end

  test "hash2 and vnoise2 are bit-for-bit with the JavaScript core", %{fixture: fixture} do
    for [x, y, expected_hash, expected_noise] <- fixture["noise"] do
      assert_in_delta Course.hash2(trunc(Float.floor(x * 1.0)), trunc(Float.floor(y * 1.0))), expected_hash, 1.0e-12
      assert_in_delta Course.vnoise2(x * 1.0, y * 1.0), expected_noise, 1.0e-12
    end
  end
end
