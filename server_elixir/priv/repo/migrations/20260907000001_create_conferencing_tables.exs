defmodule Afterlight.Repo.Migrations.CreateConferencingTables do
  use Ecto.Migration

  def change do
    create table(:calls, primary_key: false) do
      add :id, :uuid, primary_key: true, default: fragment("gen_random_uuid()")
      add :room_key, :string, null: false
      add :mode, :string, null: false, default: "voice"
      add :status, :string, null: false, default: "active"
      add :max_participants, :integer, null: false, default: 8
      add :worker_id, :string
      add :created_by, :string, null: false
      add :ended_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create index(:calls, [:room_key])
    create index(:calls, [:status])

    create table(:call_memberships, primary_key: false) do
      add :id, :uuid, primary_key: true, default: fragment("gen_random_uuid()")
      add :call_id, references(:calls, type: :uuid, on_delete: :delete_all), null: false
      add :player_id, :string, null: false
      add :state, :string, null: false, default: "joined"
      add :joined_at, :utc_datetime_usec, null: false
      add :left_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:call_memberships, [:call_id, :player_id])
    create index(:call_memberships, [:call_id, :state])
    create index(:call_memberships, [:player_id])

    create table(:media_grants, primary_key: false) do
      add :id, :uuid, primary_key: true, default: fragment("gen_random_uuid()")
      add :jti, :string, null: false
      add :call_id, references(:calls, type: :uuid, on_delete: :delete_all), null: false
      add :player_id, :string, null: false
      add :worker_id, :string, null: false
      add :can_publish_audio, :boolean, null: false, default: false
      add :can_publish_video, :boolean, null: false, default: false
      add :can_publish_screen, :boolean, null: false, default: false
      add :issued_at, :utc_datetime_usec, null: false
      add :expires_at, :utc_datetime_usec, null: false
      add :revoked_at, :utc_datetime_usec
      add :revoke_reason, :string

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:media_grants, [:jti])
    create index(:media_grants, [:call_id, :player_id])
    create index(:media_grants, [:expires_at])
    create index(:media_grants, [:revoked_at])
  end
end
