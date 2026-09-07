defmodule Afterlight.EconomyGroup.Command do
  @moduledoc "Receipt + outbox helpers for economy-group writes."

  alias Afterlight.Accounts
  alias Afterlight.Accounts.{Actor, OutboxEvent}

  def run_idempotent(actor, request_id, payload, fun) do
    Accounts.run_idempotent(actor, request_id, payload, fun)
  end

  def enqueue_outbox(aggregate_id, event_type, payload, actor) do
    OutboxEvent
    |> Ash.Changeset.for_create(
      :enqueue,
      %{
        aggregate: "economy_group",
        aggregate_id: aggregate_id,
        revision: Accounts.now_ms(),
        event_type: event_type,
        payload: jsonish(payload),
        created_at: Accounts.now_ms()
      },
      actor: actor
    )
    |> Ash.create()
  end

  def system_actor, do: Actor.system()

  defp jsonish(map) when is_map(map) do
    Map.new(map, fn {k, v} -> {to_string(k), jsonish(v)} end)
  end

  defp jsonish(list) when is_list(list), do: Enum.map(list, &jsonish/1)
  defp jsonish(other), do: other
end
