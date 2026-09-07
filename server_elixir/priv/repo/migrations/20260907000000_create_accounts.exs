defmodule Afterlight.Repo.Migrations.CreateAccounts do
  use Ecto.Migration

  def up do
    execute("CREATE EXTENSION IF NOT EXISTS citext")
    execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"")

    create table(:players, primary_key: false) do
      add :id, :text, primary_key: true
      add :nickname, :text, null: false
      add :coins, :integer, null: false, default: 0
      add :xp, :integer, null: false, default: 0
      add :level, :integer, null: false, default: 1
      add :reputation, :integer, null: false, default: 0
      add :reserved_coins, :integer, null: false, default: 0

      add :inventory, :jsonb,
        null: false,
        default: fragment(~s/'{"seeds":{},"produce":{},"reservedProduce":{},"sprinklers":0}'::jsonb/)

      add :materials, :jsonb, null: false, default: fragment("'{}'::jsonb")
      add :current_room, :text, null: false, default: "market"
      add :last_seen, :bigint, null: false, default: 0
      add :active, :boolean, null: false, default: false
      add :shadow, :boolean, null: false, default: false
      add :claimed_at, :bigint, null: true
    end

    execute("ALTER TABLE players ADD CONSTRAINT players_coins_nonneg CHECK (coins >= 0)")
    execute("ALTER TABLE players ADD CONSTRAINT players_xp_nonneg CHECK (xp >= 0)")
    execute("ALTER TABLE players ADD CONSTRAINT players_level_min CHECK (level >= 1)")
    execute("ALTER TABLE players ADD CONSTRAINT players_reputation_nonneg CHECK (reputation >= 0)")
    execute("ALTER TABLE players ADD CONSTRAINT players_reserved_coins_nonneg CHECK (reserved_coins >= 0)")

    execute("""
    CREATE UNIQUE INDEX players_active_nickname_unique
      ON players (lower(nickname))
      WHERE active
    """)

    create index(:players, [:current_room], name: :players_current_room_idx)

    create table(:guest_sessions, primary_key: false) do
      add :id, :uuid, primary_key: true, default: fragment("gen_random_uuid()")
      add :player_id, references(:players, type: :text, column: :id), null: false
      add :token_hash, :text, null: false
      add :issued_at, :bigint, null: false
      add :expires_at, :bigint, null: false
      add :revoked_at, :bigint, null: true
    end

    create unique_index(:guest_sessions, [:token_hash], name: :guest_sessions_token_hash_index)
    create index(:guest_sessions, [:player_id], name: :guest_sessions_player_idx)

    execute("""
    CREATE INDEX guest_sessions_live_idx
      ON guest_sessions (player_id)
      WHERE revoked_at IS NULL
    """)

    create table(:command_receipts, primary_key: false) do
      add :actor, references(:players, type: :text, column: :id), null: false, primary_key: true
      add :request_id, :text, null: false, primary_key: true
      add :payload_hash, :text, null: false
      add :outcome, :jsonb, null: false
      add :created_at, :bigint, null: false
    end

    execute("""
    CREATE TABLE outbox_events (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      aggregate text NOT NULL,
      aggregate_id text NOT NULL,
      revision bigint NOT NULL,
      event_type text NOT NULL,
      payload jsonb NOT NULL,
      created_at bigint NOT NULL,
      published_at bigint NULL
    )
    """)

    execute("""
    CREATE INDEX outbox_events_unpublished_idx
      ON outbox_events (id)
      WHERE published_at IS NULL
    """)

    create table(:system_imports, primary_key: false) do
      add :domain, :text, primary_key: true
      add :snapshot_sha256, :text, null: false
      add :player_count, :integer, null: false, default: 0
      add :coins_sum, :bigint, null: false, default: 0
      add :xp_sum, :bigint, null: false, default: 0
      add :imported_at, :bigint, null: false
      add :source_path, :text, null: false, default: ""
    end
  end

  def down do
    drop table(:system_imports)
    execute("DROP TABLE IF EXISTS outbox_events")
    drop table(:command_receipts)
    drop table(:guest_sessions)
    drop table(:players)
  end
end
