defmodule Afterlight.Activities do
  @moduledoc """
  Context for place activities authority and sessions (task 2.1, design D3),
  plus verified leaderboard reads over durable arcade runs (task 3.10,
  design D8).
  """

  alias Afterlight.Activities.SessionServer
  alias Afterlight.Repo
  alias Afterlight.World.Fence
  alias Afterlight.World.PlaceDefinitions

  @registry Afterlight.Activities.Registry
  @supervisor Afterlight.Activities.DynamicSupervisor

  @leaderboard_page_size 10
  @max_leaderboard_page 100
  @nonranking_outcomes ["aborted", "forfeit"]

  import Ecto.Query

  @doc "Registry name via-tuple for an activity session: {room_key, room_epoch, activity_id}."
  def via_tuple(room_key, room_epoch, activity_id) do
    {:via, Registry, {@registry, {room_key, room_epoch, activity_id}}}
  end

  @doc "Look up an active session PID by {room_key, room_epoch, activity_id}."
  def lookup_session(room_key, room_epoch, activity_id) do
    case Registry.lookup(@registry, {room_key, room_epoch, activity_id}) do
      [{pid, _value}] ->
        if Process.alive?(pid) do
          {:ok, pid}
        else
          {:error, :not_found}
        end

      [] ->
        {:error, :not_found}
    end
  end

  @doc "Get an existing session or start a new one under the DynamicSupervisor."
  def get_or_start_session(
        room_pid,
        room_key,
        room_epoch,
        activity_id,
        ownership_handle,
        opts \\ []
      ) do
    case lookup_session(room_key, room_epoch, activity_id) do
      {:ok, pid} ->
        {:ok, pid}

      {:error, :not_found} ->
        start_session(room_pid, room_key, room_epoch, activity_id, ownership_handle, opts)
    end
  end

  defp start_session(room_pid, room_key, room_epoch, activity_id, ownership_handle, opts) do
    cond do
      not Process.alive?(room_pid) ->
        {:error, :room_unavailable}

      not Fence.allows_command?(ownership_handle) ->
        {:error, :lease_lost}

      true ->
        # Canonical session keys (add-multiplayer-snowboard-arcade 4.4) are
        # "region:district:instance"; the manifest resolves by DISTRICT id.
        # Wire ids (no colon structure) resolve unchanged.
        declared_activities = PlaceDefinitions.activities(manifest_room_id(room_key))
        act_def = Enum.find(declared_activities, fn a -> a["id"] == activity_id end)

        # In tests or custom definitions, opts can supply activity_def
        act_def = act_def || Keyword.get(opts, :activity_def)

        cond do
          is_nil(act_def) ->
            {:error, :activity_not_found}

          # Disabled-by-default admission gate (4.5): unsupported/disabled
          # types fail closed with a typed error, never a partial session.
          Map.get(act_def, "type") == Afterlight.Activities.Snowboard.SessionPolicy.activity_type() and
              not Afterlight.Activities.Snowboard.enabled?() ->
            {:error, :race_unavailable}

          true ->
            args =
            %{
              room_pid: room_pid,
              room_key: room_key,
              room_epoch: room_epoch,
              activity_id: activity_id,
              ownership_handle: ownership_handle,
              activity_def: act_def,
              session_id: Keyword.get(opts, :session_id)
            }
            |> maybe_put(:offer_timeout_ms, Keyword.get(opts, :offer_timeout_ms))
            |> maybe_put(:check_proximity, Keyword.get(opts, :check_proximity))
            |> maybe_put(:reconnect_grace_ms, Keyword.get(opts, :reconnect_grace_ms))
            |> maybe_put(:input_watchdog_ms, Keyword.get(opts, :input_watchdog_ms))
            |> maybe_put(:ready_timeout_ms, Keyword.get(opts, :ready_timeout_ms))
            |> maybe_put(:idle_reap_ms, Keyword.get(opts, :idle_reap_ms))
            |> maybe_put(:tick_interval_ms, Keyword.get(opts, :tick_interval_ms))
            |> maybe_put(:snapshot_interval_ms, Keyword.get(opts, :snapshot_interval_ms))
            |> maybe_put(:wire_room_id, Keyword.get(opts, :wire_room_id))
            |> maybe_put(:countdown_ms, Keyword.get(opts, :countdown_ms))
            |> maybe_put(:race_deadline_ms, Keyword.get(opts, :race_deadline_ms))
            |> maybe_put(:results_retention_ms, Keyword.get(opts, :results_retention_ms))
            |> maybe_put(:nonready_inactivity_ms, Keyword.get(opts, :nonready_inactivity_ms))

            case DynamicSupervisor.start_child(@supervisor, {SessionServer, args}) do
              {:ok, pid} -> {:ok, pid}
              {:error, {:already_started, pid}} -> {:ok, pid}
              {:error, {:shutdown, reason}} -> {:error, reason}
              {:error, reason} -> {:error, reason}
            end
        end
    end
  end

  defp manifest_room_id(room_key) when is_binary(room_key) do
    case String.split(room_key, ":", parts: 3) do
      [_region, district, _instance] -> district
      _ -> room_key
    end
  end

  defp manifest_room_id(room_key), do: room_key

  @doc "Returns session information map."
  def session_info(session_pid) do
    GenServer.call(session_pid, :get_session_info)
  end

  @doc "Returns the full snapshot of the session."
  def session_full_snapshot(session_pid) do
    GenServer.call(session_pid, :get_full_snapshot)
  end

  @doc "Returns the unique session ID of the session."
  def session_id(session_pid) do
    session_info(session_pid).session_id
  end

  @doc "Stops an activity session process."
  def stop_session(session_pid, reason \\ :normal) do
    GenServer.stop(session_pid, reason)
  end

  @doc "Manually marks a session as fenced (useful in tests or directed failover)."
  def fence_session(session_pid, reason \\ :manual) do
    GenServer.call(session_pid, {:fence!, reason})
  end

  @doc "Dispatches a command to the activity session, gated by fencing."
  def command(session_pid, action, payload, ctx \\ %{}) do
    GenServer.call(session_pid, {:command, action, payload, ctx})
  end

  defp maybe_put(map, _key, nil), do: map
  defp maybe_put(map, key, value), do: Map.put(map, key, value)

  @doc """
  Verified leaderboard for a game and rules version (task 3.10, design D8).

  Rankings derive only from server-recorded arcade runs (the fenced
  completion path); aborted and forfeited runs never rank. Ties are stable
  by completion time. Bounded pagination. Returns:

      {:ok, %{game, rulesVersion, page, pageSize, total, versions, entries}}
  """
  def leaderboard(game, rules_version, page, opts \\ [])
      when is_binary(game) and is_integer(rules_version) and rules_version >= 1 do
    page_size = Keyword.get(opts, :page_size, @leaderboard_page_size)

    base =
      from(r in Afterlight.Activities.ArcadeRun,
        where: r.game == ^game and r.rules_version == ^rules_version,
        where: r.outcome not in @nonranking_outcomes
      )

    total = Repo.one(from(q in base, select: count())) || 0

    # Pages clamp to the last content page, matching the client model.
    page =
      page
      |> clamp_page()
      |> min(max(div(total + page_size - 1, page_size) - 1, 0))

    rows =
      Repo.all(
        from(r in base,
          order_by: [desc: r.score, asc: r.ended_at, asc: r.completion_key],
          limit: ^page_size,
          offset: ^(page * page_size)
        )
      )

    versions =
      Repo.all(
        from(r in Afterlight.Activities.ArcadeRun,
          distinct: true,
          select: r.rules_version,
          where: r.game == ^game,
          order_by: r.rules_version
        )
      )

    entries =
      rows
      |> Enum.with_index(1 + page * page_size)
      |> Enum.map(fn {row, rank} ->
        %{
          "rank" => rank,
          "playerId" => row.player_id,
          "displayName" => display_name_for(row.player_id),
          "score" => row.score,
          "outcome" => row.outcome,
          "stats" => row.stats || %{},
          "endedAt" => row.ended_at
        }
      end)

    {:ok,
     %{
       "game" => game,
       "rulesVersion" => rules_version,
       "page" => page,
       "pageSize" => page_size,
       "total" => total,
       "versions" => versions,
       "entries" => entries
     }}
  end

  defp clamp_page(page) when is_integer(page) and page >= 0,
    do: min(page, @max_leaderboard_page)

  defp clamp_page(_), do: 0

  # Player rows are gateway-owned; a missing row degrades to a truncated
  # masked id so the board never blocks on account state.
  defp display_name_for(player_id) do
    case Repo.one(from(p in "players", where: p.id == ^player_id, select: p.nickname)) do
      nil ->
        if String.length(player_id) > 12 do
          "#{String.slice(player_id, 0, 8)}…"
        else
          player_id
        end

      nickname ->
        nickname
    end
  rescue
    _ -> "visitor"
  end
end
