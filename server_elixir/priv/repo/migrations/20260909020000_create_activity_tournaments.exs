defmodule Afterlight.Repo.Migrations.CreateActivityTournaments do
  @moduledoc """
  Room-local tournament snapshots (task 10.6). Additive table so unfinished
  brackets can be cancelled visibly on server restart without touching
  completed `activity_matches` rows.
  """

  use Ecto.Migration

  def change do
    create table(:activity_tournaments, primary_key: false) do
      add :id, :text, primary_key: true
      add :room_key, :text, null: false
      add :status, :text, null: false
      add :size, :integer
      add :cancel_reason, :text
      add :snapshot, :map, null: false, default: %{}
      add :inserted_at, :bigint, null: false
      add :updated_at, :bigint, null: false
    end

    create index(:activity_tournaments, [:room_key, :status])
    create index(:activity_matches, [:winner_id])
  end
end
