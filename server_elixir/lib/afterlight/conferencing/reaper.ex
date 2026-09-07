defmodule Afterlight.Conferencing.Reaper do
  @moduledoc """
  Expiry sweep: abandoned joined memberships whose grants lapsed beyond
  reconnect grace are marked left; empty calls drop their worker allocation.
  Grant *tokens* are never stored, so there is nothing to delete there —
  expired/revoked metadata rows stay for audit and fail `Grants.verify/1`.
  """

  use GenServer

  require Ash.Query

  alias Afterlight.Conferencing.{CallMembership, Feature, MediaGrant}
  alias Afterlight.Repo

  def start_link(opts), do: GenServer.start_link(__MODULE__, opts, name: __MODULE__)

  @impl true
  def init(_opts) do
    schedule()
    {:ok, %{}}
  end

  @impl true
  def handle_info(:sweep, state) do
    _ = sweep()
    schedule()
    {:noreply, state}
  end

  @impl true
  def handle_call(:sweep, _from, state) do
    {:reply, sweep(), state}
  end

  def sweep_now, do: GenServer.call(__MODULE__, :sweep)

  def sweep(now \\ DateTime.utc_now()) do
    abandoned = reap_memberships(now)
    released = release_empty_workers()
    %{memberships: abandoned, workers_released: released}
  end

  defp schedule do
    Process.send_after(self(), :sweep, Feature.reaper_interval_ms())
  end

  defp reap_memberships(now) do
    grace = Feature.reconnect_grace_secs()
    cutoff = DateTime.add(now, -grace, :second)

    joined =
      CallMembership
      |> Ash.Query.filter(state == :joined)
      |> Ash.read!(authorize?: false)

    Enum.reduce(joined, 0, fn membership, acc ->
      if abandoned?(membership, cutoff) do
        membership
        |> Ash.Changeset.for_update(:set_state, %{state: :left, left_at: now})
        |> Ash.update!(authorize?: false)

        MediaGrant
        |> Ash.Query.filter(
          call_id == ^membership.call_id and player_id == ^membership.player_id and
            is_nil(revoked_at)
        )
        |> Ash.read!(authorize?: false)
        |> Enum.each(fn g ->
          g
          |> Ash.Changeset.for_update(:mark_revoked, %{
            revoked_at: now,
            revoke_reason: "expired"
          })
          |> Ash.update!(authorize?: false)
        end)

        acc + 1
      else
        acc
      end
    end)
  end

  defp abandoned?(membership, cutoff) do
    grants =
      MediaGrant
      |> Ash.Query.filter(call_id == ^membership.call_id and player_id == ^membership.player_id)
      |> Ash.read!(authorize?: false)

    case grants do
      [] ->
        DateTime.compare(membership.joined_at, cutoff) == :lt

      list ->
        Enum.all?(list, fn g ->
          expired = DateTime.compare(g.expires_at, cutoff) == :lt
          revoked = not is_nil(g.revoked_at)
          expired or revoked
        end)
    end
  end

  defp release_empty_workers do
    {:ok, %{num_rows: n}} =
      Repo.query("""
      UPDATE calls
      SET worker_id = NULL, updated_at = NOW()
      WHERE status = 'active'
        AND worker_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM call_memberships m
          WHERE m.call_id = calls.id AND m.state = 'joined'
        )
      """)

    n
  end
end
