defmodule Afterlight.Repo.Migrations.CreateRoomLeases do
  use Ecto.Migration

  def change do
    create table(:room_leases, primary_key: false) do
      add :room_key, :text, primary_key: true
      add :region, :text, null: false, default: "default"
      add :district_id, :text, null: false
      add :instance_id, :text, null: false
      add :owner_node, :text, null: false
      add :epoch, :bigint, null: false, default: 1
      add :expires_at, :utc_datetime_usec, null: false
      add :renewed_at, :utc_datetime_usec, null: false
      add :inserted_at, :utc_datetime_usec, null: false, default: fragment("now()")
      add :updated_at, :utc_datetime_usec, null: false, default: fragment("now()")
    end

    create index(:room_leases, [:owner_node])
    create index(:room_leases, [:expires_at])
    create unique_index(:room_leases, [:region, :district_id, :instance_id])
  end
end
