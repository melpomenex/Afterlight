defmodule Afterlight.Repo.Migrations.AddTheaterMediaPrepareFields do
  use Ecto.Migration

  def change do
    alter table(:theater_items) do
      add :source_url, :text, null: true
      add :playback_url, :text, null: true
      add :prepare_status, :text, null: true
      add :prepare_id, :text, null: true
      add :prepare_error, :text, null: true
    end
  end
end
