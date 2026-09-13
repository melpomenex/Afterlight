defmodule Afterlight.Repo.Migrations.AddPlayerAvatar do
  @moduledoc """
  Adds nullable avatar column to players for server-authoritative avatar assignment (add-creative-avatar-system D1/D5).
  """

  use Ecto.Migration

  def change do
    alter table(:players) do
      add :avatar, :string, null: true
    end
  end
end
