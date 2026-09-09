defmodule Afterlight.Activities.Tournament do
  @moduledoc """
  Room-local pool tournament process (tasks 10.6–10.7, design D8).

  One GenServer per room. Unfinished brackets cancel on process/server
  restart; completed played matches remain in `activity_matches`. Players
  cannot hold a casual pool slot and a tournament slot at the same time.
  """

  use GenServer, restart: :transient

  alias Afterlight.Activities
  alias Afterlight.Activities.Tournament.{State, Store}
  alias Afterlight.World.RoomServer

  @registry Afterlight.Activities.TournamentRegistry
  @tick_ms 1_000

  def via(room_key), do: {:via, Registry, {@registry, room_key}}

  def start_link(opts) do
    room_key = Keyword.fetch!(opts, :room_key)
    GenServer.start_link(__MODULE__, opts, name: via(room_key))
  end

  def get_or_start(room_key, opts \\ []) when is_binary(room_key) do
    case Registry.lookup(@registry, room_key) do
      [{pid, _}] ->
        {:ok, pid}

      [] ->
        spec = {__MODULE__, Keyword.put(opts, :room_key, room_key)}

        case DynamicSupervisor.start_child(Afterlight.Activities.TournamentSupervisor, spec) do
          {:ok, pid} -> {:ok, pid}
          {:error, {:already_started, pid}} -> {:ok, pid}
          other -> other
        end
    end
  end

  def command(room_key, action, ctx \\ %{}) do
    with {:ok, pid} <- get_or_start(room_key, room_pid: ctx[:room_pid]) do
      GenServer.call(pid, {:command, action, ctx})
    end
  end

  def snapshot(room_key) when is_binary(room_key) do
    case Registry.lookup(@registry, room_key) do
      [{pid, _}] -> GenServer.call(pid, :snapshot)
      [] -> load_stored(room_key) || State.snapshot(State.idle(room_key))
    end
  end

  def occupies?(room_key, player_id) when is_binary(room_key) and is_binary(player_id) do
    case Registry.lookup(@registry, room_key) do
      [{pid, _}] -> GenServer.call(pid, {:occupies?, player_id})
      [] -> false
    end
  end

  def assigned_activity(room_key, player_id) do
    case Registry.lookup(@registry, room_key) do
      [{pid, _}] -> GenServer.call(pid, {:assigned_activity, player_id})
      [] -> nil
    end
  end

  @doc """
  Reject a casual pool join when the player already holds a tournament slot
  that is not this assigned table, and reject tournament enroll when they
  already hold a casual play slot.
  """
  def slot_conflict(room_key, player_id, activity_id, role \\ "play") do
    if role not in ["play", "player"] do
      :ok
    else
      assigned = assigned_activity(room_key, player_id)

      cond do
        occupies?(room_key, player_id) and assigned != activity_id ->
          {:error, :casual_tournament_conflict}

        casual_occupant?(room_key, player_id) and occupies?(room_key, player_id) == false ->
          # Casual occupant trying to join a second table is session_server's
          # problem; tournament only cares when they also try to enroll.
          :ok

        true ->
          :ok
      end
    end
  end

  def casual_player_ids(room_key) when is_binary(room_key) do
    assigned = fn player_id, activity_id ->
      assigned_activity(room_key, player_id) == activity_id
    end

    Afterlight.Activities.Registry
    |> Registry.select([{{{:"$1", :"$2", :"$3"}, :"$4", :_}, [{:==, :"$1", room_key}], [{{:"$3", :"$4"}}]}])
    |> Enum.flat_map(fn {activity_id, pid} ->
      try do
        info = Activities.session_info(pid)

        info.player_to_slot
        |> Map.keys()
        |> Enum.reject(&assigned.(&1, activity_id))
      catch
        :exit, _ -> []
      end
    end)
  rescue
    _ -> []
  end

  def casual_occupant?(room_key, player_id), do: player_id in casual_player_ids(room_key)

  def notify_recorded(room_key, fields) when is_binary(room_key) and is_map(fields) do
    case Registry.lookup(@registry, room_key) do
      [{pid, _}] -> GenServer.cast(pid, {:verified_result, fields})
      [] -> :ok
    end
  end

  def notify_recorded(_, _), do: :ok

  @impl true
  def init(opts) do
    room_key = Keyword.fetch!(opts, :room_key)
    room_pid = Keyword.get(opts, :room_pid)

    state = %{
      room_key: room_key,
      room_pid: room_pid,
      tournament: restore(room_key),
      timer: Process.send_after(self(), :tick, @tick_ms)
    }

    {:ok, state}
  end

  @impl true
  def handle_call({:command, action, ctx}, _from, state) do
    now = System.system_time(:millisecond)
    ctx = Map.put(ctx, :casual_player_ids, casual_player_ids(state.room_key))
    action = normalize_action(action)

    case State.apply_action(state.tournament, action, now, ctx) do
      {:ok, next} ->
        persist_and_broadcast(state, next)
        {:reply, {:ok, State.snapshot(next)}, %{state | tournament: next}}

      {:error, error, kept} ->
        {:reply, {:error, error, State.snapshot(kept)}, %{state | tournament: kept}}
    end
  end

  def handle_call(:snapshot, _from, state) do
    {:reply, State.snapshot(state.tournament), state}
  end

  def handle_call({:occupies?, player_id}, _from, state) do
    {:reply, State.occupies?(state.tournament, player_id), state}
  end

  def handle_call({:assigned_activity, player_id}, _from, state) do
    {:reply, State.assigned_activity(state.tournament, player_id), state}
  end

  @impl true
  def handle_cast({:verified_result, fields}, state) do
    now = System.system_time(:millisecond)

    action = %{
      type: "verified_result",
      winner_id: Map.get(fields, :winner_id) || Map.get(fields, "winnerId"),
      outcome: Map.get(fields, :outcome) || Map.get(fields, "outcome"),
      player_a: Map.get(fields, :player_a) || Map.get(fields, "playerA"),
      player_b: Map.get(fields, :player_b) || Map.get(fields, "playerB"),
      match_id: Map.get(fields, :match_id) || Map.get(fields, "matchId"),
      verified_match_id: Map.get(fields, :verified_match_id) || Map.get(fields, "verifiedMatchId")
    }

    case State.apply_action(state.tournament, action, now, %{}) do
      {:ok, next} ->
        persist_and_broadcast(state, next)
        {:noreply, %{state | tournament: next}}

      {:error, _error, kept} ->
        {:noreply, %{state | tournament: kept}}
    end
  end

  @impl true
  def handle_info(:tick, state) do
    now = System.system_time(:millisecond)

    state =
      case State.apply_action(state.tournament, %{type: "tick"}, now, %{}) do
        {:ok, next} ->
          if next.revision != state.tournament.revision do
            persist_and_broadcast(state, next)
            %{state | tournament: next}
          else
            %{state | tournament: next}
          end

        {:error, _, kept} ->
          %{state | tournament: kept}
      end

    {:noreply, %{state | timer: Process.send_after(self(), :tick, @tick_ms)}}
  end

  def handle_info(_other, state), do: {:noreply, state}

  defp persist_and_broadcast(state, tournament) do
    Store.persist(tournament)
    frame = State.snapshot(tournament)

    if state.room_pid && Process.alive?(state.room_pid) do
      try do
        RoomServer.broadcast_frame(state.room_pid, frame)
      catch
        :exit, _ -> :ok
      end
    end

    :ok
  end

  defp restore(room_key) do
    case Store.load_latest(room_key) do
      %{snapshot: snap} when is_map(snap) ->
        state = hydrate(snap, room_key)

        if state.status in ["enrolling", "check_in", "in_progress"] do
          {:ok, cancelled} = State.apply_action(state, %{type: "server_restart"}, 0, %{})
          Store.persist(cancelled)
          cancelled
        else
          state
        end

      _ ->
        State.idle(room_key)
    end
  end

  defp load_stored(room_key) do
    case Store.load_latest(room_key) do
      %{snapshot: snap} when is_map(snap) -> stringify_keys(snap) |> Map.put("type", "tournament_state")
      _ -> nil
    end
  end

  # Boot-cancelled snapshots are already wire-shaped; live processes start idle
  # unless a terminal snapshot exists to show the cancellation.
  defp hydrate(snap, room_key) when is_map(snap) do
    snap = stringify_keys(snap)

    %{
      idle(room_key)
      | id: snap["id"],
        status: snap["status"] || "cancelled",
        size: snap["size"],
        cancel_reason: snap["cancelReason"],
        champion_id: snap["championId"],
        players: Enum.map(snap["players"] || [], &hydrate_player/1),
        matches: Enum.map(snap["matches"] || [], &hydrate_match/1),
        active_match_id: snap["activeMatchId"],
        check_in_deadline: snap["checkInDeadline"],
        revision: snap["revision"] || 0
    }
  end

  defp hydrate(_, room_key), do: State.idle(room_key)

  defp hydrate_player(p) do
    %{
      player_id: p["playerId"],
      display_name: p["displayName"] || "visitor",
      enrolled_at: p["enrolledAt"] || 0,
      checked_in: p["checkedIn"] == true,
      status: p["status"] || "enrolled"
    }
  end

  defp hydrate_match(m) do
    %{
      id: m["id"],
      round: m["round"] || 0,
      index: m["index"] || 0,
      player_a: m["playerA"],
      player_b: m["playerB"],
      winner_id: m["winnerId"],
      outcome: m["outcome"],
      status: m["status"] || "pending",
      activity_id: m["activityId"],
      credited: m["credited"] == true,
      verified_match_id: m["verifiedMatchId"],
      advanced: true
    }
  end

  defp idle(room_key), do: State.idle(room_key)

  defp stringify_keys(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), stringify_keys(v)}
      {k, v} -> {k, stringify_keys(v)}
    end)
  end

  defp stringify_keys(list) when is_list(list), do: Enum.map(list, &stringify_keys/1)
  defp stringify_keys(other), do: other

  defp normalize_action(action) when is_map(action) do
    type = Map.get(action, :type) || Map.get(action, "type")
    Map.put(action, :type, type)
  end
end
