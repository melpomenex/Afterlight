defmodule Afterlight.Activities.DownhillMayhem.SessionPolicy do
  @moduledoc """
  Downhill Mayhem lifecycle policy
  (integrate-multiplayer-downhill-mayhem-arcade 8.4).

  Pure helpers for the phase machine (`lobby → countdown → racing → results`,
  plus `aborted`), six-rider human/AI population, captain selection, explicit
  readiness, the 3 s countdown lock, the 180 s race deadline, 120 s results
  retention, 30 s reconnect grace, rematch reset, standings/DNF and the tick
  cadence. The SessionServer owns the process and timers; every rule here is
  pure and testable.

  Riders are the atom-keyed maps produced by `DownhillMayhem.initial_state/2`;
  rosters accepted by `start_ready?/2`, `captain/1` and `lock_field/1` may be
  either the string-keyed policy maps used by the pure tests or the atom-keyed
  session-player maps used by `SessionServer`.
  """

  alias Afterlight.Activities.DownhillMayhem
  alias Afterlight.Activities.DownhillMayhem.AI
  alias Afterlight.Activities.DownhillMayhem.Course

  @activity_type "downhill-mayhem"
  @countdown_ms 3_000
  @race_deadline_ms 180_000
  @results_retention_ms 120_000
  @reconnect_grace_ms 30_000
  @tick_interval_ms 33
  @snapshot_interval_ms 50
  @ready_timeout_ms 60_000
  @race_timeout_s 180.0
  @capacity 6
  @mountains ~w(classic timber rock daily)
  @difficulties ~w(chill mayhem brutal)

  def activity_type, do: @activity_type
  def countdown_ms, do: @countdown_ms
  def race_deadline_ms, do: @race_deadline_ms
  def results_retention_ms, do: @results_retention_ms
  def reconnect_grace_ms, do: @reconnect_grace_ms
  def tick_interval_ms, do: @tick_interval_ms
  def snapshot_interval_ms, do: @snapshot_interval_ms
  def ready_timeout_ms, do: @ready_timeout_ms
  def race_timeout_s, do: @race_timeout_s
  def capacity, do: @capacity
  def mountains, do: @mountains
  def difficulties, do: @difficulties

  @doc "Wire phase name for the lifecycle status."
  def phase(status) do
    case status do
      :lobby -> "lobby"
      :countdown -> "countdown"
      :in_progress -> "racing"
      :ended -> "results"
      :aborted -> "aborted"
      other -> to_string(other)
    end
  end

  def min_players(act_def) do
    case act_def["minPlayers"] do
      n when is_integer(n) and n >= 1 -> n
      _ -> 1
    end
  end

  def max_players(act_def) do
    case get_in(act_def, ["capacities", "players"]) do
      n when is_integer(n) -> n
      _ -> @capacity
    end
  end

  @doc "The first seated connected human, in join order, is the captain."
  def captain(players) do
    players
    |> normalize_players()
    |> Enum.filter(&seated_connected?/1)
    |> Enum.sort_by(&pget(&1, "joined_at", :joined_at, 0))
    |> List.first()
    |> case do
      nil -> nil
      p -> pget(p, "player_id", :player_id, nil)
    end
  end

  @doc """
  All connected seated humans ready with at least `min`. Accepts a list of
  policy maps or a `%{slot => player}` session map; the second argument is
  either the manifest definition or an explicit minimum.
  """
  def start_ready?(players, %{} = act_def) do
    start_ready?(players, min_players(act_def))
  end

  def start_ready?(players, min) when is_integer(min) do
    seated = players |> normalize_players() |> Enum.filter(&seated_connected?/1)

    seated != [] and length(seated) >= min and Enum.all?(seated, &ready?/1)
  end

  @doc "Deterministic AI roster for a list of open slots (name + def from the source roster)."
  def ai_roster(slots) when is_list(slots) do
    defs = DownhillMayhem.rider_defs()

    Enum.map(slots, fn slot ->
      def0 = Enum.at(defs, rem(slot, length(defs)))
      %{name: def0.name, def: def0}
    end)
  end

  @doc """
  Freeze the six-rider population from the currently seated connected humans.
  Humans take the lowest free slots by join order; AI fill the rest with
  slot-stable deterministic identities. The result is a list of field entries
  accepted by `init_sim/5`.
  """
  def lock_field(players) do
    humans =
      players
      |> normalize_players()
      |> Enum.filter(&seated_connected?/1)
      |> Enum.sort_by(&pget(&1, "joined_at", :joined_at, 0))
      |> Enum.with_index()
      |> Enum.map(fn {p, slot} ->
        %{
          slot: slot,
          player_id: pget(p, "player_id", :player_id, nil),
          is_ai: false,
          nickname: pget(p, "nickname", :nickname, nil)
        }
      end)

    taken = Enum.map(humans, & &1.slot)
    ai_slots = Enum.reject(0..(@capacity - 1), &(&1 in taken))
    ai = ai_roster(ai_slots)

    field =
      humans ++
        Enum.zip_with(ai_slots, ai, fn slot, a ->
          %{slot: slot, is_ai: true, ai: a, nickname: a.name}
        end)

    Enum.sort_by(field, & &1.slot)
  end

  def ai_count(field) when is_list(field), do: Enum.count(field, & &1.is_ai)
  def human_count(field) when is_list(field), do: Enum.count(field, &(not &1.is_ai))

  @doc """
  Build the six-rider field: humans take the lowest free slots in join order,
  server-chosen AI fill the rest. `ai_roster` is a list of
  `%{name: ..., def: ...}` chosen deterministically by the caller.
  """
  def assign_field(players, ai_roster) when is_list(players) and is_list(ai_roster) do
    humans =
      players
      |> Enum.filter(&(&1["role"] == "player" and &1["connected?"] != false))
      |> Enum.sort_by(& &1["joined_at"])
      |> Enum.with_index()

    taken = Enum.map(humans, fn {_p, i} -> i end)
    ai_slots = Enum.reject(0..(@capacity - 1), &(&1 in taken))

    field =
      Enum.map(humans, fn {p, slot} ->
        %{slot: slot, player_id: p["player_id"], is_ai: false, nickname: p["nickname"]}
      end) ++
        (ai_slots
         |> Enum.zip(ai_roster)
         |> Enum.map(fn {slot, ai} -> %{slot: slot, is_ai: true, ai: ai, nickname: ai.name} end))

    Enum.sort_by(field, & &1.slot)
  end

  @doc "Initialise the authoritative sim from a locked field."
  def init_sim(course, field, difficulty, seed, rules_version \\ 1) do
    riders =
      field
      |> Enum.map(fn f ->
        r = DownhillMayhem.initial_state(f.slot, difficulty: difficulty, is_ai: f.is_ai, seed: seed)

        r
        |> Map.put(:y, Course.height_at(course, r.s, r.lat))
        |> Map.put(:player_id, Map.get(f, :player_id))
        |> Map.put(:nickname, Map.get(f, :nickname))
        |> Map.put(:finish_key, nil)
        |> Map.put(:reset_seq, 0)
      end)
      |> Map.new(&{&1.slot, &1})

    %{
      "courseId" => course.id,
      "courseVersion" => course.version,
      "courseHash" => Course.hash(course),
      "rulesVersion" => rules_version,
      "difficulty" => difficulty,
      "riders" => riders,
      "tick" => 0
    }
  end

  @doc "Rematch reset: a fresh simulation from the same locked course/field/difficulty."
  def rematch_sim(course, field, difficulty, seed, rules_version \\ 1) do
    init_sim(course, field, difficulty, seed, rules_version)
  end

  @doc """
  Advance the field one 1/30 tick. `controls_by_slot` is `%{slot => control}`
  for human riders; AI riders are driven by `DownhillMayhem.AI`. `frozen` is a
  collection of slots whose riders are held at their previous authoritative
  state (disconnected or DNF).
  """
  def step(course, sim, elapsed, controls_by_slot \\ %{}, frozen \\ []) do
    frozen = MapSet.new(frozen)
    tick = sim["tick"] + 1
    prev = sim["riders"] || %{}
    riders = prev

    reference =
      riders
      |> Map.values()
      |> Enum.filter(& &1.is_human)
      |> Enum.sort_by(& &1.s, :desc)
      |> List.first() || (riders |> Map.values() |> Enum.sort_by(& &1.s, :desc) |> List.first())

    ctx = %{
      difficulty: sim["difficulty"],
      elapsed: elapsed,
      reference: reference,
      reference_crashes: 0,
      ai_control: &AI.control/3
    }

    {riders, events} = DownhillMayhem.step_field(course, riders, controls_by_slot, ctx)

    riders =
      Enum.reduce(frozen, riders, fn slot, acc ->
        case Map.get(prev, slot) do
          nil -> acc
          r -> Map.put(acc, slot, r)
        end
      end)

    events = Enum.reject(events, fn e -> MapSet.member?(frozen, Map.get(e, :slot)) end)

    sim = %{sim | "riders" => riders, "tick" => tick}

    outcome =
      if race_over?(riders) do
        {:race_complete, sim}
      else
        :continue
      end

    {sim, events, outcome}
  end

  @doc "Run `steps` fixed 1/30 ticks, advancing the elapsed clock per tick."
  def step_many(course, sim, elapsed, steps, controls_by_slot \\ %{}, frozen \\ []) do
    dt = DownhillMayhem.dt()

    Enum.reduce(1..max(steps, 1), {sim, [], :continue}, fn k, {s, acc, _} ->
      {s2, ev, outcome} = step(course, s, elapsed + (k - 1) * dt, controls_by_slot, frozen)
      {s2, acc ++ ev, outcome}
    end)
  end

  @doc "Mark a rider DNF once, with an explicit reason."
  def dnf(riders, slot, reason) do
    case Map.get(riders, slot) do
      nil ->
        riders

      r ->
        if r.finished or r[:dnf_reason] do
          riders
        else
          Map.put(riders, slot, Map.put(r, :dnf_reason, to_string(reason)))
        end
    end
  end

  @doc "Mark a rider DNF once on the whole sim, returning an updated sim."
  def dnf_sim(sim, slot, reason) do
    %{sim | "riders" => dnf(sim["riders"] || %{}, slot, reason)}
  end

  def race_over?(riders) do
    riders == %{} or Enum.all?(Map.values(riders), &(&1.finished or &1[:dnf_reason]))
  end

  @doc "True when at least one rider has an authoritative finish."
  def any_finished?(riders) do
    Enum.any?(Map.values(riders), & &1.finished)
  end

  @doc "Final standings: finishes by time (ties within 1ms share place), then DNF by progress."
  def standings(sim, _players) do
    sim
    |> Map.get("riders", %{})
    |> then(&standings_from_riders/1)
  end

  def standings_from_riders(riders) do
    finished =
      riders
      |> Map.values()
      |> Enum.filter(& &1.finished)
      |> Enum.sort_by(& &1.finish_time)

    {finish_rows, _} =
      finished
      |> Enum.with_index()
      |> Enum.reduce({[], nil}, fn {r, i}, {acc, prev} ->
        place =
          case prev do
            {pt, pp} -> if abs(r.finish_time - pt) < 0.001, do: pp, else: i + 1
            nil -> 1
          end

        {acc ++ [row(r, place, "finished", nil)], {r.finish_time, place}}
      end)

    dnf_rows =
      riders
      |> Map.values()
      |> Enum.reject(& &1.finished)
      |> Enum.sort_by(fn r -> {-r.s, r.slot} end)
      |> Enum.with_index(1)
      |> Enum.map(fn {r, index} ->
        row(r, length(finish_rows) + index, "dnf", r[:dnf_reason] || "dnf")
      end)

    finish_rows ++ dnf_rows
  end

  defp row(r, place, status, reason) do
    %{
      slot: r.slot,
      playerId: r[:player_id],
      nickname: r[:nickname] || row_name(r),
      isAI: r.is_ai,
      place: place,
      timeMs: if(r.finished, do: trunc(round(r.finish_time * 1000)), else: nil),
      status: status,
      dnfReason: reason
    }
  end

  defp row_name(r) do
    case r[:def] do
      %{name: name} -> name
      _ -> "RIDER"
    end
  end

  # --- roster normalisation --------------------------------------------------

  defp normalize_players(players) when is_map(players), do: Map.values(players)
  defp normalize_players(players) when is_list(players), do: players

  defp pget(p, skey, akey, default) when is_map(p) do
    cond do
      Map.has_key?(p, skey) -> Map.get(p, skey)
      Map.has_key?(p, akey) -> Map.get(p, akey)
      true -> default
    end
  end

  defp pget(_p, _skey, _akey, default), do: default

  defp seated_connected?(p) do
    seated?(p) and connected?(p)
  end

  defp seated?(p), do: pget(p, "role", :role, "player") == "player"

  defp connected?(p) when is_map(p) do
    if Map.has_key?(p, "connected?") do
      Map.get(p, "connected?") != false
    else
      is_pid(Map.get(p, :channel_pid))
    end
  end

  defp connected?(_), do: false

  defp ready?(p), do: pget(p, "ready", :ready, false) == true
end
