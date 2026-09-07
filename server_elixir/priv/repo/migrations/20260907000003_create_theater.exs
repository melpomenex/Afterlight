defmodule Afterlight.Repo.Migrations.CreateTheater do
  use Ecto.Migration

  def up do
    create table(:theater_rooms, primary_key: false) do
      add :room_key, :text, primary_key: true
      add :revision, :bigint, null: false, default: 1
      add :epoch, :integer, null: false, default: 1
      add :now_item_id, :text, null: true
      add :updated_at, :bigint, null: false
    end

    create table(:theater_items, primary_key: false) do
      add :id, :text, primary_key: true
      add :room_key, references(:theater_rooms, type: :text, column: :room_key), null: false
      add :slot, :text, null: false
      add :order_index, :integer, null: false
      add :kind, :text, null: false
      add :url, :text, null: false
      add :video_id, :text, null: true
      add :title, :text, null: false
      add :position_sec, :float, null: false, default: 0.0
      add :playing, :boolean, null: false, default: false
      add :updated_at, :bigint, null: false
      add :by, :varchar, size: 40, null: false
      add :queued_by, :varchar, size: 40, null: false
      add :generation, :integer, null: false, default: 1
      add :infohash, :text, null: true
      add :file_index, :integer, null: true
      add :file_path, :text, null: true
      add :file_bytes, :float, null: true
    end

    execute("ALTER TABLE theater_items ADD CONSTRAINT theater_items_slot_check CHECK (slot IN ('now','queue'))")
    execute("ALTER TABLE theater_items ADD CONSTRAINT theater_items_url_len CHECK (length(url) <= 2048)")

    create index(:theater_items, [:room_key, :slot, :order_index], name: :theater_items_room_slot_idx)
    create index(:theater_items, [:room_key], name: :theater_items_room_idx)
  end

  def down do
    drop table(:theater_items)
    drop table(:theater_rooms)
  end
end
