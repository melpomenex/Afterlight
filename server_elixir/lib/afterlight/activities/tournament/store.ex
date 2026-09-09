defmodule Afterlight.Activities.Tournament.Store do
  @moduledoc """
  Durable tournament snapshots so a server restart can cancel unfinished
  brackets visibly while completed (played) match rows remain in
  `activity_matches`.
  """

  use Ecto.Schema

  import Ecto.Query

  alias Afterlight.Repo

  @primary_key {:id, :string, autogenerate: false}
  schema "activity_tournaments" do
    field :room_key, :string
    field :status, :string
    field :size, :integer
    field :cancel_reason, :string
    field :snapshot, :map, default: %{}
    field :inserted_at, :integer
    field :updated_at, :integer
  end

  def persist(state) when is_map(state) do
    if state.status == "idle" or state.id in [nil, ""] do
      :ok
    else
      now = System.system_time(:millisecond)
      snap = Afterlight.Activities.Tournament.State.snapshot(state)

      row = %{
        id: state.id,
        room_key: state.room_id,
        status: state.status,
        size: state.size,
        cancel_reason: state.cancel_reason,
        snapshot: snap,
        inserted_at: now,
        updated_at: now
      }

      Repo.insert_all(__MODULE__, [row],
        on_conflict: {:replace, [:status, :size, :cancel_reason, :snapshot, :updated_at]},
        conflict_target: [:id]
      )

      :ok
    end
  rescue
    _ -> :ok
  end

  def load_latest(room_key) when is_binary(room_key) do
    Repo.one(
      from t in __MODULE__,
        where: t.room_key == ^room_key,
        order_by: [desc: t.updated_at],
        limit: 1
    )
  rescue
    _ -> nil
  end

  @doc "Mark every non-terminal tournament cancelled (boot / process restart)."
  def cancel_unfinished do
    now = System.system_time(:millisecond)

    from(t in __MODULE__, where: t.status in ["enrolling", "check_in", "in_progress"])
    |> Repo.all()
    |> Enum.each(fn row ->
      snap = stringify(row.snapshot) |> put_cancelled(now)

      Repo.update_all(
        from(t in __MODULE__, where: t.id == ^row.id),
        set: [
          status: "cancelled",
          cancel_reason: "server_restart",
          snapshot: snap,
          updated_at: now
        ]
      )
    end)

    :ok
  rescue
    _ -> :ok
  end

  defp put_cancelled(snap, _now) do
    matches =
      snap
      |> Map.get("matches", [])
      |> Enum.map(fn m ->
        if Map.get(m, "status") in ["complete", "cancelled"] do
          m
        else
          m
          |> Map.put("status", "cancelled")
          |> Map.put("outcome", "cancelled")
          |> Map.put("credited", false)
          |> Map.put("winnerId", nil)
        end
      end)

    snap
    |> Map.put("status", "cancelled")
    |> Map.put("cancelReason", "server_restart")
    |> Map.put("matches", matches)
    |> Map.put("activeMatchId", nil)
    |> Map.put("checkInDeadline", nil)
    |> Map.put("championId", nil)
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), stringify(v)}
      {k, v} -> {k, stringify(v)}
    end)
  end

  defp stringify(list) when is_list(list), do: Enum.map(list, &stringify/1)
  defp stringify(other), do: other
end
