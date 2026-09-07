defmodule Afterlight.Conferencing.Changes.SetCreatedBy do
  @moduledoc false
  use Ash.Resource.Change

  @impl true
  def change(changeset, _opts, %{actor: %{player_id: id}}) when is_binary(id) do
    Ash.Changeset.force_change_attribute(changeset, :created_by_id, id)
  end

  def change(changeset, _opts, _context), do: changeset
end
