defmodule Afterlight.Conferencing.Changes.JoinCreator do
  @moduledoc false
  use Ash.Resource.Change

  @impl true
  def change(changeset, _opts, context) do
    Ash.Changeset.after_action(changeset, fn _cs, call ->
      now = DateTime.utc_now()

      result =
        Afterlight.Conferencing.CallMembership
        |> Ash.Changeset.for_create(
          :record,
          %{
            call_id: call.id,
            player_id: call.created_by_id,
            state: :joined,
            joined_at: now
          },
          actor: context.actor
        )
        |> Ash.create(authorize?: false)

      case result do
        {:ok, _} -> {:ok, call}
        {:error, error} -> {:error, error}
      end
    end)
  end
end
