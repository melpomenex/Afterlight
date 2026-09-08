defmodule Afterlight.Activities.Snowboard.SessionPolicy do
  @moduledoc """
  Race lifecycle policy for `snowboard-race` sessions
  (add-multiplayer-snowboard-arcade 4.2, design D3/D4).

  `Afterlight.Activities.SessionServer` keeps its generic two-player/solo
  behavior untouched; every snowboard-specific branch consults this policy.
  Simulation delegates to the pure reducer (`Afterlight.Activities.Snowboard`)
  over the canonical course (`Afterlight.Activities.Snowboard.Course`, cached
  per VM in persistent terms).

  Lifecycle (D4): lobby → countdown (3 s, roster locked) → racing (30 Hz
  fixed steps, 20 Hz snapshots) → results (session-local, retained 120 s).
  Disconnects never pause a race: the absent rider freezes at its last valid
  state and goes DNF(disconnect) when the 30 s grace expires, while the race
  continues for everyone else. Deadlines: 180 s race cap, with the 30 s
  finish window capped by the overall deadline.
  """

  alias Afterlight.Activities.Snowboard
  alias Afterlight.Activities.Snowboard.Course

  @countdown_ms 3_000
  @race_deadline_ms 180_000
  @results_retention_ms 120_000
  @tick_interval_ms 33
  @snapshot_interval_ms 50
  @tie_window_ms 1
  @activity_type "snowboard-race"

  def activity_type, do: @activity_type
  def countdown_ms, do: @countdown_ms
  def race_deadline_ms, do: @race_deadline_ms
  def results_retention_ms, do: @results_retention_ms
  def tick_interval_ms, do: @tick_interval_ms
  def snapshot_interval_ms, do: @snapshot_interval_ms

  @doc "The cached canonical course (loaded once per VM)."
  def course do
    case :persistent_term.get({__MODULE__, :course}, :missing) do
      :missing ->
        course = Course.load_default()
        :persistent_term.put({__MODULE__, :course}, course)
        course

      course ->
        course
    end
  end

  @doc "Minimum riders to lock a roster (manifest minPlayers, default 2)."
  def min_players(activity_def) do
    case Map.get(activity_def, "minPlayers") do
      n when is_integer(n) and n >= 1 -> n
      _ -> 2
    end
  end

  @doc """
  The roster locks when every seated CONNECTED rider is ready and the field
  is at least minPlayers — never full capacity, never a solo start (D4).
  """
  def start_ready?(players, activity_def) when is_map(players) do
    count = map_size(players)
    min = min_players(activity_def)

    count >= min and Enum.all?(players, fn {_slot, p} -> p.ready == true and connected?(p) end)
  end

  def connected?(%{channel_pid: pid}) when is_pid(pid), do: true
  def connected?(_), do: false

  @doc "Initial race simulation state: one rider state per seated slot."
  def init_sim(players) when is_map(players) do
    count = max(map_size(players), 1)

    riders =
      Map.new(players, fn {slot, _p} ->
        {slot, Snowboard.initial_state(slot, count)}
      end)

    course = course()

    %{
      "courseId" => Map.get(course.doc, "id"),
      "courseVersion" => Map.get(course.doc, "version"),
      "courseHash" => course.hash,
      "rulesVersion" => Map.get(course.doc, "rulesVersion"),
      "riders" => riders,
      "tick" => 0
    }
  end

  @doc """
  Advances the race `steps` fixed ticks. Disconnected riders freeze at their
  last valid state (D4); terminal riders stop simulating. Returns
  `{sim, events, outcome}` where events are `{slot, event}` pairs in order
  and outcome is `{:race_complete, sim}` once every rider is terminal.
  """
  def step(sim, players, steps) when steps >= 0 do
    do_step(sim, players, steps, [])
  end

  defp do_step(sim, _players, 0, events), do: {sim, Enum.reverse(events), completion(sim)}

  defp do_step(sim, players, steps, events) do
    tick = sim["tick"]
    course = course()

    {riders, tick_events} =
      Enum.reduce(sim["riders"], {%{}, []}, fn {slot, rider}, {riders_acc, events_acc} ->
        player = Map.get(players, slot)

        cond do
          terminal?(rider) ->
            {Map.put(riders_acc, slot, rider), events_acc}

          player == nil or not connected?(player) ->
            # Absent rider: freeze at the last valid state (D4).
            {Map.put(riders_acc, slot, rider), events_acc}

          true ->
            {next, step_events} =
              Snowboard.step_rider(course, rider, player_input(player), rider, tick)

            {Map.put(riders_acc, slot, next), events_acc ++ decorate(slot, step_events)}
        end
      end)

    sim = sim |> Map.put("riders", riders) |> Map.put("tick", tick + 1)

    # Accumulate newest-tick-first; the base case reverses into chronological order.
    do_step(sim, players, steps - 1, tick_events ++ events)
  end

  defp decorate(slot, step_events), do: Enum.map(step_events, &{slot, &1})

  defp player_input(%{input_state: controls}) when is_map(controls), do: controls
  defp player_input(_), do: %{}

  defp terminal?(rider), do: rider["finishTick"] != nil or rider["dnfReason"] != nil

  @doc "Marks a rider DNF once with the given reason (idempotent, never a finished rider)."
  def dnf(sim, slot, reason) do
    case Map.get(sim["riders"], slot) do
      nil ->
        sim

      rider ->
        cond do
          rider["finishTick"] != nil -> sim
          rider["dnfReason"] != nil -> sim
          true -> put_in(sim, ["riders", slot], %{rider | "dnfReason" => to_string(reason)})
        end
    end
  end

  @doc "True when every rider is terminal (finished or DNF)."
  def race_over?(sim) do
    map_size(sim["riders"]) > 0 and Enum.all?(sim["riders"], fn {_slot, rider} -> terminal?(rider) end)
  end

  @doc """
  Authoritative standings (D6): finishes ordered by exact finishKey, then DNF
  riders by last checkpoint then progress. Finishes under 1 ms apart share a
  displayed place; the next rider places after the whole tied group.
  """
  def standings(sim) do
    finished =
      sim["riders"]
      |> Enum.map(fn {slot, rider} -> Map.put(rider, "slot", slot) end)
      |> Enum.filter(&(&1["finishTick"] != nil))
      |> Enum.sort_by(& &1["finishKey"])

    finished_rows =
      finished
      |> assign_places()
      |> Enum.map(fn {rider, place} ->
        %{
          "slot" => rider["slot"],
          "place" => place,
          "timeMs" => rider["finishMs"],
          "status" => "finished",
          "dnfReason" => nil
        }
      end)

    dnf_rows =
      sim["riders"]
      |> Enum.map(fn {slot, rider} -> Map.put(rider, "slot", slot) end)
      |> Enum.filter(&(&1["dnfReason"] != nil))
      |> Enum.sort_by(&{-(&1["nextCheckpoint"] || 0), -(&1["s"] || 0)})
      |> Enum.with_index(1)
      |> Enum.map(fn {rider, index} ->
        %{
          "slot" => rider["slot"],
          "place" => length(finished_rows) + index,
          "timeMs" => nil,
          "status" => "dnf",
          "dnfReason" => rider["dnfReason"]
        }
      end)

    Enum.sort_by(finished_rows ++ dnf_rows, & &1["place"])
  end

  # Rides the sorted finish list, sharing a place across sub-millisecond ties.
  defp assign_places(sorted) do
    {acc, _} =
      Enum.reduce(sorted, {[], nil}, fn rider, {rows, group_key} ->
        tied? = group_key != nil and abs(rider["finishKey"] - group_key) < @tie_window_ms

        if tied? do
          {_last_rider, place} = Enum.at(rows, length(rows) - 1)
          {rows ++ [{rider, place}], group_key}
        else
          {rows ++ [{rider, length(rows) + 1}], rider["finishKey"]}
        end
      end)

    acc
  end

  defp completion(sim) do
    if race_over?(sim), do: {:race_complete, sim}, else: nil
  end
end
