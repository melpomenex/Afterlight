defmodule Afterlight.Repo.Migrations.CreateCatalog do
  use Ecto.Migration

  def up do
    create table(:playlist_lists, primary_key: false) do
      add :id, :text, primary_key: true
      add :name, :string, size: 80, null: false
      add :added_by, :string, size: 40, null: false
      add :added_at, :bigint, null: false
      add :channel_count, :integer, null: false, default: 0
    end

    execute("""
    CREATE TABLE playlist_channels (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      list_id text NOT NULL REFERENCES playlist_lists(id) ON DELETE CASCADE,
      position integer NOT NULL,
      url text NOT NULL,
      name varchar(200) NOT NULL DEFAULT '',
      group_name varchar(120) NOT NULL DEFAULT '',
      logo text NULL,
      tvg_id text NULL,
      UNIQUE (list_id, position)
    )
    """)

    create table(:epg_guides, primary_key: false) do
      add :id, :text, primary_key: true
      add :name, :string, size: 120, null: false
      add :updated_at, :bigint, null: false
    end

    create table(:epg_channels, primary_key: false) do
      add :guide_id, references(:epg_guides, type: :text, column: :id, on_delete: :delete_all),
        null: false,
        primary_key: true

      add :xmltv_id, :text, null: false, primary_key: true
      add :names, :jsonb, null: false, default: fragment("'[]'::jsonb")
      add :icon, :text, null: true
    end

    execute("""
    CREATE TABLE epg_programmes (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      guide_id text NOT NULL REFERENCES epg_guides(id) ON DELETE CASCADE,
      channel_key text NOT NULL,
      start_ms bigint NOT NULL,
      stop_ms bigint NOT NULL,
      title text NOT NULL,
      sub_title text NULL,
      description text NULL
    )
    """)

    create index(:epg_programmes, [:guide_id, :channel_key, :start_ms, :stop_ms],
             name: :epg_programmes_lookup_idx
           )

    execute("""
    CREATE UNIQUE INDEX epg_programmes_dedup_idx
      ON epg_programmes (guide_id, channel_key, start_ms)
    """)
  end

  def down do
    drop table(:epg_programmes)
    drop table(:epg_channels)
    drop table(:epg_guides)
    drop table(:playlist_channels)
    drop table(:playlist_lists)
  end
end
