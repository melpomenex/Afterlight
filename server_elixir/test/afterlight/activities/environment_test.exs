defmodule Afterlight.Activities.EnvironmentTest do
  use ExUnit.Case, async: false

  alias Afterlight.Activities.Environment
  alias Afterlight.World.Weather

  setup do
    case Process.whereis(Weather) do
      nil -> start_supervised(Weather)
      _ -> :ok
    end
    :ok
  end

  describe "resolve/4 and default/2" do
    test "policy none returns neutral default" do
      env = Environment.resolve("court", "none", 1_000)

      assert env["version"] == 1
      assert env["policy"] == "none"
      assert env["preset"] == nil
      assert env["wind"] == [0.0, 0.0]
      assert env["windSpeed"] == 0.0
      assert env["rain"] == 0.0
      assert env["intensity"] == 0.0
      assert env["wetness"] == 0.0
      assert env["timePhase"] == 0.0
      assert env["frozenAt"] == nil

      assert :ok == Environment.validate(env)
    end

    test "policy frozen with atmosphere snapshot extracts and freezes conditions" do
      now = 1_725_840_000_000
      fake_snapshot = %{
        "state" => %{
          "preset" => "rain",
          "seed" => 123,
          "mode" => "fixed",
          "intensity" => 0.6,
          "wind" => [0.3, 0.4],
          "time" => %{"phase" => 0.8}
        }
      }

      env = Environment.resolve("court", "frozen", now, atmosphere_snapshot: fake_snapshot)

      assert env["version"] == 1
      assert env["policy"] == "frozen"
      assert env["preset"] == "rain"
      assert env["wind"] == [0.3, 0.4]
      assert_in_delta env["windSpeed"], 0.5, 0.001
      assert env["frozenAt"] == now
      assert env["rain"] > 0.0
      assert env["intensity"] == 0.6

      assert :ok == Environment.validate(env)
    end

    test "policy frozen with unavailable atmosphere falls back to preset or default" do
      now = 1_725_840_100_000
      env = Environment.resolve("rooftops", "frozen", now, atmosphere_snapshot: :unavailable)

      assert env["version"] == 1
      assert env["policy"] == "frozen"
      assert env["frozenAt"] == now
      assert :ok == Environment.validate(env)
    end

    test "frozen competitive conditions remain immutable mid-match even when atmosphere updates" do
      start_time = 1_725_840_200_000
      initial_snapshot = %{
        "state" => %{
          "preset" => "clear",
          "seed" => 1,
          "mode" => "fixed",
          "intensity" => 0.0,
          "wind" => [0.05, 0.0],
          "time" => %{"phase" => 0.35}
        }
      }

      match_env = Environment.resolve("rooftops", "frozen", start_time, atmosphere_snapshot: initial_snapshot)
      assert match_env["preset"] == "clear"
      assert match_env["wind"] == [0.05, 0.0]
      assert match_env["frozenAt"] == start_time

      # Storm arrives during match at t + 45s
      storm_time = start_time + 45_000
      storm_snapshot = %{
        "state" => %{
          "preset" => "storm",
          "seed" => 1,
          "mode" => "fixed",
          "intensity" => 1.0,
          "wind" => [-0.7, 0.35],
          "time" => %{"phase" => 0.9}
        }
      }

      # Ongoing match keeps match_env, never re-resolves mid-flight
      assert match_env["preset"] == "clear"
      assert match_env["wind"] == [0.05, 0.0]

      # Subsequent new run freezes storm conditions
      next_run_env = Environment.resolve("rooftops", "frozen", storm_time, atmosphere_snapshot: storm_snapshot)
      assert next_run_env["preset"] == "storm"
      assert next_run_env["wind"] == [-0.7, 0.35]
      assert next_run_env["frozenAt"] == storm_time
    end

    test "agricultural weather contracts remain completely untouched" do
      initial_weather = Weather.get()
      # Environment resolution performs zero writes/casts to agricultural Weather
      _env = Environment.resolve("court", "frozen", 1_000)
      assert Weather.get() == initial_weather
    end
  end

  describe "validate/1" do
    test "rejects invalid versions or policies" do
      assert {:error, :invalid_version} = Environment.validate(%{"version" => 2, "policy" => "none"})
      assert {:error, :invalid_policy} = Environment.validate(%{"version" => 1, "policy" => "stormy"})
    end

    test "rejects out of bounds wind and properties" do
      bad_wind = %{
        "version" => 1,
        "policy" => "frozen",
        "wind" => [1.5, 0.0],
        "windSpeed" => 1.5,
        "rain" => 0.0,
        "intensity" => 0.0,
        "wetness" => 0.0,
        "timePhase" => 0.0,
        "frozenAt" => 100
      }
      assert {:error, :wind_out_of_bounds} = Environment.validate(bad_wind)

      bad_prop = %{
        "version" => 1,
        "policy" => "frozen",
        "wind" => [0.0, 0.0],
        "windSpeed" => 0.0,
        "rain" => 1.5,
        "intensity" => 0.0,
        "wetness" => 0.0,
        "timePhase" => 0.0,
        "frozenAt" => 100
      }
      assert {:error, :property_out_of_bounds} = Environment.validate(bad_prop)

      missing_frozen = %{
        "version" => 1,
        "policy" => "frozen",
        "wind" => [0.0, 0.0],
        "windSpeed" => 0.0,
        "rain" => 0.0,
        "intensity" => 0.0,
        "wetness" => 0.0,
        "timePhase" => 0.0,
        "frozenAt" => nil
      }
      assert {:error, :missing_frozen_at} = Environment.validate(missing_frozen)
    end
  end
end
