defmodule Afterlight.Theater do
  @moduledoc """
  Ash domain for the Orpheum theater bill (design D1/D2).

  Command path: room row `FOR UPDATE` → load items → pure reducer → persist
  diffs → revision bump → outbox → `theater_state` broadcast via relay.
  """

  use Ash.Domain, otp_app: :afterlight

  require Ash.Query
  import Ecto.Query

  alias Afterlight.Accounts.{Actor, CommandReceipt, OutboxEvent}
  alias Afterlight.Repo
  alias Afterlight.Theater.{Reducer, SessionTracker, State, TheaterItem, TheaterRoom}
  alias Afterlight.Theater.Errors

  @default_room "theater"

  resources do
    resource TheaterRoom
    resource TheaterItem
  end

  def default_room_key, do: @default_room

  @doc """
  Apply a theater reducer action atomically. Returns
  `{:ok, result}` or `{:error, reason_string}`.
  """
  def apply_action(room_key, action, actor_name, opts \\ []) do
    session_key = Keyword.get(opts, :session_key)
    receipt_id = Keyword.get(opts, :receipt_id)
    receipt_actor = Keyword.get(opts, :receipt_actor)
    actor = Actor.system()

    with {:ok, commit} <- commit_action(room_key, action, actor_name, actor, session_key) do
      maybe_record_receipt(receipt_id, receipt_actor, action, commit, actor)
      {:ok, commit}
    end
  end

  @doc "Idempotent command wrapper using P4 command receipts."
  def run_idempotent(actor_id, request_id, payload, fun) when is_function(fun, 0) do
    hash = payload_hash(payload)

    case fetch_receipt(actor_id, request_id) do
      %{payload_hash: ^hash, outcome: outcome} ->
        {:ok, {:replay, outcome}}

      %{payload_hash: _other} ->
        {:error, :idempotency_conflict}

      nil ->
        case fun.() do
          {:ok, result} ->
            outcome = %{"ok" => true, "result" => jsonish(result)}

            {:ok, _} =
              CommandReceipt
              |> Ash.Changeset.for_create(
                :record,
                %{
                  actor: actor_id,
                  request_id: request_id,
                  payload_hash: hash,
                  outcome: outcome,
                  created_at: now_ms()
                },
                actor: Actor.system()
              )
              |> Ash.create(authorize?: false)

            {:ok, {:applied, result}}

          {:error, reason} when is_binary(reason) ->
            {:error, reason}

          other ->
            other
        end
    end
  end

  def payload_hash(payload) do
    json = Jason.encode!(jsonish(payload))
    :sha256 |> :crypto.hash(json) |> Base.encode16(case: :lower)
  end

  def error_text(reason), do: Errors.text(reason)

  @doc """
  Patch prepare-related fields on one bill item and broadcast a fresh snapshot.
  Used by the async media compatibility pipeline.
  """
  def patch_prepare_fields(room_key, item_id, fields) when is_map(fields) do
    actor = Actor.system()

    Repo.transaction(fn ->
      with {:ok, room} <- lock_room(room_key),
           :ok <- item_present?(room_key, item_id),
           :ok <- apply_prepare_patch(item_id, fields),
           items <- load_items(room_key, actor),
           {new_state, _} <- State.from_rows(items),
           now_ms <- now_ms(),
           room <- bump_room(room, new_state, now_ms, actor),
           payload <- build_outbox_payload(new_state, now_ms),
           {:ok, _} <- enqueue_outbox(room_key, room.revision, payload, actor) do
        :ok
      else
        :stale -> :ok
        {:error, reason} -> Repo.rollback(reason)
        other -> Repo.rollback(other)
      end
    end)
  end

  defp item_present?(room_key, item_id) do
    case Ash.get(TheaterItem, item_id, actor: Actor.system(), authorize?: false) do
      {:ok, %TheaterItem{room_key: ^room_key}} -> :ok
      {:ok, _} -> :stale
      _ -> :stale
    end
  end

  defp apply_prepare_patch(item_id, fields) do
    item = Ash.get!(TheaterItem, item_id, actor: Actor.system(), authorize?: false)
    attrs = prepare_attrs(fields)

    item
    |> Ash.Changeset.for_update(:patch, attrs, actor: Actor.system())
    |> Ash.update!(authorize?: false)

    :ok
  rescue
    Ash.Error.Invalid -> :stale
  end

  defp prepare_attrs(fields) do
    mapping = %{
      "prepareStatus" => :prepare_status,
      "prepareId" => :prepare_id,
      "playbackUrl" => :playback_url,
      "sourceUrl" => :source_url,
      "prepareError" => :prepare_error,
      "kind" => :kind
    }

    Enum.reduce(fields, %{}, fn {k, v}, acc ->
      key = if is_atom(k), do: Atom.to_string(k), else: k
      if field = mapping[key], do: Map.put(acc, field, v), else: acc
    end)
  end

  @doc "Wire `{now, queue}` snapshot for welcome and join_room replay."
  def snapshot(room_key \\ @default_room) do
    items =
      TheaterItem
      |> Ash.Query.filter(room_key == ^room_key)
      |> Ash.Query.sort([{:slot, :asc}, {:order_index, :asc}])
      |> Ash.read!(actor: Actor.system(), authorize?: false)

    {state, _} = State.from_rows(items)
    State.snapshot(state)
  end

  def now_ms, do: System.system_time(:millisecond)

  defp commit_action(room_key, action, actor_name, actor, session_key) do
    Repo.transaction(fn ->
      with {:ok, room} <- lock_room(room_key),
           items <- load_items(room_key, actor),
           {prev_state, old_by_id} <- State.from_rows(items),
           :ok <- guard_generation(action, prev_state, old_by_id, session_key),
           result <- apply_reducer(prev_state, action, actor_name),
           {:ok, new_state, report} <- reducer_ok(result),
           now_ms <- now_ms(),
           target_rows <- State.target_rows(room_key, new_state, old_by_id, now_ms),
           :ok <- persist_items(room_key, items, target_rows, actor),
           room <- bump_room(room, new_state, now_ms, actor),
           payload <- build_outbox_payload(new_state, now_ms),
           {:ok, _} <- enqueue_outbox(room_key, room.revision, payload, actor) do
        %{
          revision: room.revision,
          theater: State.snapshot(new_state),
          report: report,
          server_now: now_ms,
          now_generation: current_now_generation(target_rows, new_state)
        }
      else
        {:error, reason} -> Repo.rollback(reason)
        %{"error" => reason} when is_binary(reason) -> Repo.rollback(reason)
        other -> Repo.rollback(other)
      end
    end)
  end

  defp lock_room(room_key) do
    ensure_room_row(room_key)

    query =
      from(r in "theater_rooms",
        where: r.room_key == ^room_key,
        lock: "FOR UPDATE",
        select: %{
          room_key: r.room_key,
          revision: r.revision,
          epoch: r.epoch,
          now_item_id: r.now_item_id,
          updated_at: r.updated_at
        }
      )

    case Repo.one(query) do
      nil ->
        {:error, "persist_failed"}

      row ->
        {:ok,
         %TheaterRoom{
           room_key: row.room_key,
           revision: row.revision,
           epoch: row.epoch,
           now_item_id: row.now_item_id,
           updated_at: row.updated_at
         }}
    end
  end

  defp ensure_room_row(room_key) do
    now = now_ms()

    Repo.insert_all(
      "theater_rooms",
      [%{room_key: room_key, revision: 1, epoch: 1, now_item_id: nil, updated_at: now}],
      on_conflict: :nothing
    )
  end

  defp guard_generation(%{"op" => op}, state, old_by_id, session_key)
       when op in ["ended", "failed"] and not is_nil(session_key) do
    now = state["now"]

    if is_map(now) do
      stamped = SessionTracker.last_generation(session_key)
      current = Map.get(old_by_id, now["id"], %{}) |> Map.get(:generation, 1)

      if stamped > 0 and stamped < current do
        {:error, "item_mismatch"}
      else
        :ok
      end
    else
      :ok
    end
  end

  defp guard_generation(_action, _state, _old_by_id, _session_key), do: :ok

  defp load_items(room_key, actor) do
    TheaterItem
    |> Ash.Query.filter(room_key == ^room_key)
    |> Ash.Query.sort([{:slot, :asc}, {:order_index, :asc}])
    |> Ash.read!(actor: actor, authorize?: false)
  end

  defp apply_reducer(state, action, actor_name) do
    Reducer.apply_action(state, action, actor_name, now_ms())
  end

  defp reducer_ok(%{"error" => nil, "state" => state} = result) do
    {:ok, state, Map.get(result, "report")}
  end

  defp reducer_ok(%{"error" => reason}), do: {:error, reason}
  defp reducer_ok(_), do: {:error, "invalid_action"}

  defp persist_items(room_key, old_items, target_rows, actor) do
    old_by_id = Map.new(old_items, &{&1.id, &1})
    target_ids = MapSet.new(Map.keys(target_rows))

    Enum.each(old_items, fn item ->
      unless MapSet.member?(target_ids, item.id) do
        item
        |> Ash.Changeset.for_destroy(:delete)
        |> Ash.destroy!(authorize?: false, actor: actor)
      end
    end)

    Enum.each(target_rows, fn {id, attrs} ->
      case Map.get(old_by_id, id) do
        nil ->
          TheaterItem
          |> Ash.Changeset.for_create(:insert, Map.put(attrs, :room_key, room_key), actor: actor)
          |> Ash.create!(authorize?: false)

        existing ->
          patch_attrs = Map.drop(attrs, [:id, :room_key])

          existing
          |> Ash.Changeset.for_update(:patch, patch_attrs, actor: actor)
          |> Ash.update!(authorize?: false)
      end
    end)

    :ok
  end

  defp bump_room(%{room_key: room_key}, new_state, now_ms, actor) do
    now_id =
      case new_state["now"] do
        %{"id" => id} -> id
        _ -> nil
      end

    room = Ash.get!(TheaterRoom, room_key, actor: actor, authorize?: false)

    room
    |> Ash.Changeset.for_update(
      :commit,
      %{revision: room.revision + 1, now_item_id: now_id, updated_at: now_ms},
      actor: actor
    )
    |> Ash.update!(authorize?: false)
  end

  defp build_outbox_payload(state, server_now) do
    %{
      "theater" => State.snapshot(state),
      "serverNow" => server_now
    }
  end

  defp enqueue_outbox(room_key, revision, payload, actor) do
    OutboxEvent
    |> Ash.Changeset.for_create(
      :enqueue,
      %{
        aggregate: "theater",
        aggregate_id: room_key,
        revision: revision,
        event_type: "theater_state",
        payload: payload,
        created_at: now_ms()
      },
      actor: actor
    )
    |> Ash.create(authorize?: false)
  end

  defp current_now_generation(target_rows, state) do
    case state["now"] do
      %{"id" => id} ->
        case Map.get(target_rows, id) do
          %{generation: gen} -> gen
          _ -> 0
        end

      _ ->
        0
    end
  end

  defp maybe_record_receipt(nil, _actor_id, _action, _commit, _system), do: :ok
  defp maybe_record_receipt(_id, nil, _action, _commit, _system), do: :ok

  defp maybe_record_receipt(receipt_id, actor_id, action, commit, actor) when is_binary(receipt_id) do
    {:ok, _} =
      CommandReceipt
      |> Ash.Changeset.for_create(
        :record,
        %{
          actor: actor_id,
          request_id: receipt_id,
          payload_hash: payload_hash(action),
          outcome: %{"ok" => true, "revision" => commit.revision},
          created_at: now_ms()
        },
        actor: actor
      )
      |> Ash.create(authorize?: false)

    :ok
  end

  defp fetch_receipt(actor_id, request_id) do
    CommandReceipt
    |> Ash.Query.filter(actor == ^actor_id and request_id == ^request_id)
    |> Ash.read(actor: Actor.system(), authorize?: false)
    |> case do
      {:ok, [row | _]} -> row
      _ -> nil
    end
  end

  defp jsonish(map) when is_map(map), do: Map.new(map, fn {k, v} -> {to_string(k), jsonish(v)} end)
  defp jsonish(list) when is_list(list), do: Enum.map(list, &jsonish/1)
  defp jsonish(other), do: other
end
