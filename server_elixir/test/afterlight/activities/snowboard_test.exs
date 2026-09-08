defmodule Afterlight.Activities.SnowboardTest do
  @moduledoc """
  Cross-runtime parity admission gate (add-multiplayer-snowboard-arcade 4.1,
  D10): the Elixir step must reproduce every JS-exported golden scenario
  within 1cm position / 0.01 m/s velocity at every recorded sample, with
  exactly equal checkpoint/finish outcomes and event sequences.
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
      controls = controls_at(segments, tick, 0)
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

  defp check_events(id, actual, expected) do
    types_ok =
      length(actual) == length(expected) and
        Enum.zip(actual, expected)
        |> Enum.all?(fn
          {%{"type" => "checkpoint", "index" => index}, %{"type" => "checkpoint", "index" => ei}} -> index == ei
          {%{"type" => "finish", "finishMs" => ms}, %{"type" => "finish", "finishMs" => ems}} -> ms == ems
          {%{"type" => "crash", "cause" => cause, "resetSeq" => seq}, %{"type" => "crash", "cause" => ec, "resetSeq" => es}} ->
            cause == ec and seq == es
          {%{"type" => a}, %{"type" => b}} -> a == b
          _ -> false
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

  defp normalize_event(%{type: :checkpoint, index: index, key: _key}),
    do: %{"type" => "checkpoint", "index" => index}

  defp normalize_event(%{type: :finish, finishMs: finish_ms}), do: %{"type" => "finish", "finishMs" => finish_ms}

  defp normalize_event(%{type: :crash, cause: cause, resetSeq: reset_seq}),
    do: %{"type" => "crash", "cause" => to_string(cause), "resetSeq" => reset_seq}

  defp normalize_event(%{type: type}), do: %{"type" => to_string(type)}

  defp check_close(id, tick, actual, expected) do
    problems =
      for {field, tol} <- [
            {"s", @position_tol},
            {"u", @position_tol},
            {"y", @position_tol},
            {"v", @velocity_tol},
            {"vu", @velocity_tol},
            {"vy", @velocity_tol}
          ],
          drift = abs(to_float(Map.get(actual, field)) - to_float(Map.get(expected, field))),
          drift > tol do
        "scenario #{id} tick #{tick}: #{field} drifted #{drift} > #{tol} " <>
          "(#{inspect(Map.get(actual, field))} vs #{inspect(Map.get(expected, field))})"
      end

    exact =
      for {field, note} <- [
            {"grounded", "grounded"},
            {"nextCheckpoint", "nextCheckpoint must be exactly equal"},
            {"recoveryTicks", "recoveryTicks"},
            {"resetSeq", "resetSeq must be exactly equal"},
            {"finishTick", "finishTick must be exactly equal"}
          ],
          Map.get(actual, field) != Map.get(expected, field) do
        "scenario #{id} tick #{tick}: #{note} " <>
          "(#{inspect(Map.get(actual, field))} vs #{inspect(Map.get(expected, field))})"
      end

    split_count =
      if length(Map.get(actual, "splitKeys") || []) == length(Map.get(expected, "splitKeys") || []) do
        []
      else
        ["scenario #{id} tick #{tick}: split count mismatch"]
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

    problems ++ exact ++ split_count ++ finish_key
  end

  defp controls_at([], _tick, _acc), do: Snowboard.neutral_controls()

  defp controls_at([[until, controls] | rest], tick, acc) do
    if tick - acc < until do
      controls
    else
      controls_at(rest, tick, acc + until)
    end
  end

  defp to_float(v) when is_number(v), do: v * 1.0
  defp to_float(_), do: 0.0

  defp golden, do: @golden_path |> File.read!() |> Jason.decode!()
end
