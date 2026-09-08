defmodule Afterlight.Repo.Migrations.CreateActivityResults do
  @moduledoc """
  Additive durable activity results (task 3.9, design D8): terminal arcade
  runs and multiplayer matches, each idempotent by server-derived completion
  key. No columns touch existing tables; original snapshots are untouched.
  """

  use Ecto.Migration

  def change do
    create table(:activity_arcade_runs, primary_key: false) do
      add :completion_key, :text, primary_key: true
      add :game, :text, null: false
      add :rules_version, :integer, null: false
      add :player_id, :text, null: false
      add :session_id, :text, null: false
      add :match_id, :text, null: false
      add :score, :integer, null: false
      add :outcome, :text, null: false
      add :stats, :map, null: false, default: %{}
      add :ended_at, :bigint, null: false
      add :recorded_at, :bigint, null: false
    end

    create index(:activity_arcade_runs, [:game, :rules_version])
    create index(:activity_arcade_runs, [:player_id])

    create table(:activity_matches, primary_key: false) do
      add :completion_key, :text, primary_key: true
      add :game, :text, null: false
      add :rules_version, :integer, null: false
      add :session_id, :text, null: false
      add :match_id, :text, null: false
      add :outcome, :text, null: false
      add :winner_id, :text
      add :participants, :map, null: false, default: %{}
      add :ended_at, :bigint, null: false
      add :recorded_at, :bigint, null: false
    end

    create index(:activity_matches, [:game, :rules_version])
  end
end
