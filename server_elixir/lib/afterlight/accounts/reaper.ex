defmodule Afterlight.Accounts.Reaper do
  @moduledoc """
  Bounded periodic session-expiry reaper. Expiry does not passively flip
  `players.active`; only this job (or explicit revoke) does.
  """

  use GenServer

  require Ash.Query

  alias Afterlight.Accounts
  alias Afterlight.Accounts.{Actor, GuestSession}

  def start_link(opts), do: GenServer.start_link(__MODULE__, opts, name: Keyword.get(opts, :name, __MODULE__))

  def init(opts) do
    interval = Keyword.get(opts, :interval_ms, 60_000)
    {:ok, %{interval: interval}, {:continue, :tick}}
  end

  def handle_continue(:tick, state) do
    _ = Process.send_after(self(), :tick, state.interval)
    {:noreply, state}
  end

  def handle_info(:tick, state) do
    _ = sweep()
    _ = Process.send_after(self(), :tick, state.interval)
    {:noreply, state}
  end

  def sweep(now \\ Accounts.now_ms()) do
    actor = Actor.system()

    expired =
      GuestSession
      |> Ash.Query.filter(is_nil(revoked_at) and expires_at <= ^now)
      |> Ash.read!(actor: actor, authorize?: false)

    Enum.each(expired, fn session ->
      _ =
        session
        |> Ash.Changeset.for_update(:revoke, %{revoked_at: now}, actor: actor, authorize?: false)
        |> Ash.update()

      _ = Accounts.maybe_deactivate(session.player_id, now, actor)

      _ =
        Afterlight.Accounts.OutboxEvent
        |> Ash.Changeset.for_create(
          :enqueue,
          %{
            aggregate: "accounts",
            aggregate_id: session.player_id,
            revision: now,
            event_type: "session.expired",
            payload: %{"session_id" => session.id},
            created_at: now
          },
          actor: actor,
          authorize?: false
        )
        |> Ash.create()
    end)

    length(expired)
  end
end
