defmodule Afterlight.Durable do
  @moduledoc """
  Shared command-receipt and outbox helpers for P6 write paths.

  Reuses P4 `command_receipts` / `outbox_events` tables via the Accounts
  resources; domains call these from every durable action transaction.
  """

  alias Afterlight.Accounts
  alias Afterlight.Accounts.{CommandReceipt, OutboxEvent}

  defdelegate run_idempotent(actor, request_id, payload, fun),
    to: Accounts

  defdelegate payload_hash(payload), to: Accounts

  @doc """
  Enqueue an outbox row in the same transaction as the caller's `Repo.transaction`.
  """
  def enqueue_outbox(aggregate, aggregate_id, event_type, payload, actor) do
    now = Accounts.now_ms()

    OutboxEvent
    |> Ash.Changeset.for_create(
      :enqueue,
      %{
        aggregate: aggregate,
        aggregate_id: aggregate_id,
        revision: now,
        event_type: event_type,
        payload: jsonish(payload),
        created_at: now
      },
      actor: actor
    )
    |> Ash.create()
  end

  @doc "Record a command receipt (usually via `run_idempotent/4`)."
  def record_receipt(actor, request_id, payload_hash, outcome) do
    CommandReceipt
    |> Ash.Changeset.for_create(
      :record,
      %{
        actor: actor.player_id,
        request_id: request_id,
        payload_hash: payload_hash,
        outcome: outcome,
        created_at: Accounts.now_ms()
      },
      actor: actor
    )
    |> Ash.create()
  end

  defp jsonish(%_{} = struct), do: Map.from_struct(struct) |> Map.drop([:__meta__]) |> jsonish()
  defp jsonish(map) when is_map(map), do: Map.new(map, fn {k, v} -> {to_string(k), jsonish(v)} end)
  defp jsonish(list) when is_list(list), do: Enum.map(list, &jsonish/1)
  defp jsonish(other), do: other
end
