defmodule Afterlight.Activities.SnowboardTest do
  @moduledoc """
  Cross-runtime parity admission gate (integrate-ssxtricky-snowboard 3.4):
  the Elixir step must reproduce every JS-exported ALPINE RUSH golden
  scenario within 1cm position / 0.01 m/s velocity at every recorded sample,
  with exactly equal event sequences (speed zones, ramp launches, tricks,
  clean landings, bails, pickups, super pops, finishes) and equal trick
  scores.
  """

  use ExUnit.Case, async: true

  alias Afterlight.Activities.Snowboard

  @golden_path Path.expand("../../../../tests/fixtures/snowboard/golden-movement.json", __DIR__)

  # D10 tolerances.
  @position_tol 0.01
  @velocity_tol 0.01
  @key_tol 1.0e-6

  test "golden fixture course hash matches the committed course" do
    golden = golden()
    course = Snowboard.Course.load_default()
    assert Map.get(golden, "courseHash") == course.hash
    assert Map.get(golden, "courseId") == "alpine-rush"
    assert Map.get(golden, "rulesVersion") == 2
  end

  test "every golden scenario reproduces within D10 tolerance" do
    course = Snowboard.Course.load_default()

    failures =
      for scenario <- Map.get(golden(), "scenarios"),
          problem <- assert_replay(course, scenario) do
        {Map.get(scenario, "id"), problem}
      end

    assert failures == [], "parity drift:\n#{inspect(failures, pretty: true, limit: 6)}"
  end

  defp assert_replay(course, scenario) do
    id = Map.get(scenario, "id")
    segments = Map.get(scenario, "controls")
    total_ticks = Map.get(scenario, "ticks")
    sample_ticks = Map.get(scenario, "samples") |> Enum.map(&Map.get(&1, "tick")) |> MapSet.new()

    rider = Snowboard.initial_state(0, 1)
    do_replay(course, rider, segments, 0, total_ticks, sample_ticks, id,
              Map.get(scenario, "samples"), Map.get(scenario, "events"), [], [])
  end

  defp do_replay(_course, _rider, _segments, tick, total_ticks, _sample_ticks, _id, _samples,
                _expected_events, problems, _capture) when tick > total_ticks do
    Enum.reverse(problems)
  end

  defp do_replay(course, rider, segments, tick, total_ticks, sample_ticks, id, samples,
                 expected_events, problems, capture) do
    problems =
      if tick in sample_ticks do
        expected = Enum.find(samples, &(&1["tick"] == tick))
        problems ++ check_close(id, tick, rider, expected["state"])
      else
        problems
      end

    if tick == total_ticks do
      expected_final = Map.get(List.last(samples), "state")

      problems =
        problems ++ check_close(id, tick, rider, expected_final) ++ check_events(id, capture, expected_events)

      Enum.reverse(problems)
    else
      controls = controls_at(segments, tick, 0, rider)
      {next, step_events} = Snowboard.step_rider(course, rider, controls, rider, tick)

      do_replay(
        course,
        next,
        segments,
        tick + 1,
        total_ticks,
        sample_ticks,
        id,
        samples,
        expected_events,
        problems,
        capture ++ Enum.map(step_events, &normalize_event/1)
      )
    end
  end

  # Event sequences must match exactly in type AND the distinguishing
  # payload fields (finish time, pickup id, landing points, ramp id).
  defp check_events(id, actual, expected) do
    types_ok =
      length(actual) == length(expected) and
        Enum.zip(actual, expected)
        |> Enum.all?(fn
          {%{"type" => "finish", "finishMs" => ms, "score" => score}, %{"type" => "finish", "finishMs" => ems, "score" => escore}} ->
            ms == ems and score == escore

          {%{"type" => "pickup", "id" => pid}, %{"type" => "pickup", "id" => epid}} ->
            pid == epid

          {%{"type" => "ramp_launch", "rampId" => rid}, %{"type" => "ramp_launch", "rampId" => erid}} ->
            rid == erid

          {%{"type" => "clean_landing", "points" => pts}, %{"type" => "clean_landing", "points" => epts}} ->
            pts == epts

          {%{"type" => a}, %{"type" => b}} ->
            a == b

          _ ->
            false
        end)

    if types_ok do
      []
    else
      [
        "scenario #{id}: event sequence drifted — " <>
          "expected #{inspect(Enum.map(expected, & &1["type"]))}, " <>
          "got #{inspect(Enum.map(actual, & &1["type"]))}"
      ]
    end
  end

  defp normalize_event(%{type: :finish, finishMs: finish_ms, score: score, bestCombo: best}),
    do: %{"type" => "finish", "finishMs" => finish_ms, "score" => score, "bestCombo" => best}

  defp normalize_event(%{type: :pickup, id: id}), do: %{"type" => "pickup", "id" => id}

  defp normalize_event(%{type: :ramp_launch, rampId: rid}),
    do: %{"type" => "ramp_launch", "rampId" => rid}

  defp normalize_event(%{type: :clean_landing, points: pts}),
    do: %{"type" => "clean_landing", "points" => pts}

  defp normalize_event(%{type: type}), do: %{"type" => to_string(type)}

  defp check_close(id, tick, actual, expected) do
    problems =
      for {field, tol} <- [
            {"s", @position_tol},
            {"x", @position_tol},
            {"y", @position_tol},
            {"v", @velocity_tol},
            {"lateral", @velocity_tol},
            {"vy", @velocity_tol}
          ],
          drift = abs(to_float(Map.get(actual, field)) - to_float(Map.get(expected, field))),
          drift > tol do
        "scenario #{id} tick #{tick}: #{field} drifted #{drift} > #{tol} " <>
          "(#{inspect(Map.get(actual, field))} vs #{inspect(Map.get(expected, field))})"
      end

    exact_fields = [
      {"airborne", "airborne"},
      {"score", "trick score must be exactly equal"},
      {"bestCombo", "bestCombo must be exactly equal"},
      {"landings", "clean landings must be exactly equal"},
      {"carveReward", "carve rewards must be exactly equal"},
      {"pickupsClaimed", "pickup claims must be exactly equal"},
      {"resetSeq", "resetSeq must be exactly equal"},
      {"finishTick", "finishTick must be exactly equal"}
    ]

    exact =
      Enum.flat_map(exact_fields, fn {field, note} ->
        if Map.get(actual, field) != Map.get(expected, field) do
          [
            "scenario #{id} tick #{tick}: #{note} " <>
              "(#{inspect(Map.get(actual, field))} vs #{inspect(Map.get(expected, field))})"
          ]
        else
          []
        end
      end)

    # The boost meter is a slow integral; tolerate tiny accumulation drift but
    # not real divergence (0.05 over a 180 s scenario).
    boost_drift = abs(to_float(Map.get(actual, "boost")) - to_float(Map.get(expected, "boost")))

    boost =
      if boost_drift > 0.05 do
        [
          "scenario #{id} tick #{tick}: boost drifted #{boost_drift} " <>
            "(#{inspect(Map.get(actual, "boost"))} vs #{inspect(Map.get(expected, "boost"))})"
        ]
      else
        []
      end

    finish_key =
      if Map.get(expected, "finishKey") do
        drift = abs(to_float(Map.get(actual, "finishKey")) - to_float(Map.get(expected, "finishKey")))

        if drift <= @key_tol do
          []
        else
          ["scenario #{id} tick #{tick}: finishKey drift #{drift}"]
        end
      else
        []
      end

    problems ++ exact ++ boost ++ finish_key
  end

  # Golden segments are {until, controls, aim?} maps; `aim` derives steer
  # from the CURRENT rider x exactly like the JS export.
  defp controls_at([], _tick, _acc, _rider), do: Snowboard.neutral_controls()

  defp controls_at([segment | rest], tick, acc, rider) do
    until = Map.get(segment, "until")

    if tick - acc < until do
      controls = Map.get(segment, "controls")

      case Map.get(segment, "aim") do
        aim when is_number(aim) ->
          steer = max(-1.0, min(1.0, (aim - to_float(Map.get(rider, "x"))) / 6))
          Map.put(controls, "steer", steer)

        _ ->
          controls
      end
    else
      controls_at(rest, tick, acc + until, rider)
    end
  end

  defp to_float(v) when is_number(v), do: v * 1.0
  defp to_float(_), do: 0.0

  defp golden, do: @golden_path |> File.read!() |> Jason.decode!()
end
