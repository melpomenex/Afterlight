defmodule Afterlight.Repo.Migrations.CreateEconomyGroup do
  use Ecto.Migration

  def up do
    create table(:gardens, primary_key: false) do
      add :player_id, references(:players, type: :text, column: :id), primary_key: true
      add :last_tick, :bigint, null: false, default: 0
      add :inserted_at, :bigint, null: false, default: 0
    end

    create table(:beds, primary_key: false) do
      add :id, :bigserial, primary_key: true
      add :garden_id, references(:gardens, type: :text, column: :player_id, on_delete: :delete_all),
        null: false

      add :index, :integer, null: false
      add :prepared, :boolean, null: false, default: false
      add :crop_id, :text
      add :planted_at, :bigint
      add :last_watered_at, :bigint
      add :moisture, :float, null: false, default: 0.0
      add :health, :float, null: false, default: 1.0
      add :moisture_history_sum, :float, null: false, default: 0.0
      add :moisture_checks, :float, null: false, default: 0.0
      add :stage, :integer, null: false, default: 0
      add :harvest_count, :integer, null: false, default: 0
    end

    create unique_index(:beds, [:garden_id, :index])
    execute("ALTER TABLE beds ADD CONSTRAINT beds_index_range CHECK (index BETWEEN 0 AND 11)")

    create table(:sprinklers, primary_key: false) do
      add :id, :bigserial, primary_key: true
      add :garden_id, references(:gardens, type: :text, column: :player_id, on_delete: :delete_all),
        null: false

      add :bed_index, :integer, null: false
      add :type, :text, null: false, default: "sprinkler"
    end

    create unique_index(:sprinklers, [:garden_id, :bed_index])

    create table(:wallets, primary_key: false) do
      add :player_id, references(:players, type: :text, column: :id), primary_key: true
      add :coins, :bigint, null: false, default: 0
      add :reserved_coins, :bigint, null: false, default: 0
    end

    execute("ALTER TABLE wallets ADD CONSTRAINT wallets_coins_nonneg CHECK (coins >= 0)")
    execute("ALTER TABLE wallets ADD CONSTRAINT wallets_reserved_nonneg CHECK (reserved_coins >= 0)")

    execute("CREATE SEQUENCE inventory_acquired_seq AS bigint")

    create table(:inventory_balances, primary_key: false) do
      add :player_id, references(:players, type: :text, column: :id), null: false
      add :item_kind, :text, null: false
      add :item_id, :text, null: false
      add :quantity, :bigint, null: false
      add :acquired_seq, :bigint, null: false
    end

    execute(
      "ALTER TABLE inventory_balances ADD PRIMARY KEY (player_id, item_kind, item_id)"
    )
    create index(:inventory_balances, [:player_id])
    execute("ALTER TABLE inventory_balances ADD CONSTRAINT inventory_qty_nonneg CHECK (quantity >= 0)")

    create table(:market_multipliers, primary_key: false) do
      add :item_id, :text, primary_key: true
      add :multiplier, :float, null: false
      add :updated_at, :bigint, null: false, default: 0
    end

    create table(:orders, primary_key: false) do
      add :id, :text, primary_key: true
      add :player_id, references(:players, type: :text, column: :id), null: false
      add :side, :text, null: false
      add :crop_id, :text, null: false
      add :quality, :text, null: false, default: "B"
      add :price, :bigint, null: false
      add :quantity, :bigint, null: false
      add :filled, :bigint, null: false, default: 0
      add :created_at, :bigint, null: false
      add :cancelled_at, :bigint
      add :inserted_at, :bigint, null: false, default: 0
    end

    execute("ALTER TABLE orders ADD CONSTRAINT orders_side_check CHECK (side IN ('buy','sell'))")
    execute("ALTER TABLE orders ADD CONSTRAINT orders_price_pos CHECK (price > 0)")
    execute("ALTER TABLE orders ADD CONSTRAINT orders_qty_pos CHECK (quantity > 0)")
    execute("ALTER TABLE orders ADD CONSTRAINT orders_filled_range CHECK (filled >= 0 AND filled <= quantity)")

    execute("""
    CREATE INDEX orders_matching_bids ON orders (crop_id, price DESC, created_at, id)
      WHERE side = 'buy' AND cancelled_at IS NULL AND filled < quantity
    """)

    execute("""
    CREATE INDEX orders_matching_asks ON orders (crop_id, price ASC, created_at, id)
      WHERE side = 'sell' AND cancelled_at IS NULL AND filled < quantity
    """)

    create table(:trades, primary_key: false) do
      add :id, :bigserial, primary_key: true
      add :public_id, :text, null: false
      add :buyer_id, references(:players, type: :text, column: :id), null: false
      add :seller_id, references(:players, type: :text, column: :id), null: false
      add :crop_id, :text, null: false
      add :quality, :text, null: false
      add :price, :bigint, null: false
      add :quantity, :bigint, null: false
      add :value, :bigint, null: false
      add :fee, :bigint, null: false
      add :executed_at, :bigint, null: false
      add :taker_order_id, :text
      add :maker_order_id, :text
    end

    create unique_index(:trades, [:public_id])
    execute("ALTER TABLE trades ADD CONSTRAINT trades_fee_min CHECK (fee >= 1)")

    create table(:ledger_entries, primary_key: false) do
      add :id, :bigserial, primary_key: true
      add :player_id, references(:players, type: :text, column: :id), null: false
      add :kind, :text, null: false
      add :account, :text, null: false
      add :item_id, :text
      add :delta, :bigint, null: false
      add :trade_id, :bigint
      add :command_ref, :text
      add :inserted_at, :bigint, null: false
    end

    create index(:ledger_entries, [:player_id])

    create table(:contracts, primary_key: false) do
      add :id, :text, primary_key: true
      add :slot, :integer, null: false
      add :client, :text, null: false
      add :crop_id, :text, null: false
      add :crop_name, :text, null: false
      add :quantity, :bigint, null: false
      add :min_quality, :text, null: false
      add :reward, :bigint, null: false
      add :reputation, :bigint, null: false
      add :xp, :bigint, null: false
      add :tier, :text
      add :expires_at, :bigint, null: false
      add :generated_at, :bigint, null: false
    end

    create unique_index(:contracts, [:slot])
    execute("ALTER TABLE contracts ADD CONSTRAINT contracts_slot_range CHECK (slot BETWEEN 0 AND 2)")

    create table(:contract_board, primary_key: false) do
      add :id, :integer, primary_key: true, default: 1
      add :last_refresh_at, :bigint, null: false, default: 0
    end

    execute("INSERT INTO contract_board (id, last_refresh_at) VALUES (1, 0)")

    create table(:gather_nodes, primary_key: false) do
      add :node_id, :text, primary_key: true
      add :district, :text, null: false
      add :material, :text, null: false
      add :depleted_at, :bigint
      add :respawn_ms, :bigint, null: false, default: 180_000
    end

    create table(:machines, primary_key: false) do
      add :machine_id, :text, primary_key: true
      add :status, :text, null: false, default: "broken"
      add :restored_at, :bigint
    end

    execute("ALTER TABLE machines ADD CONSTRAINT machines_status_check CHECK (status IN ('broken','restored'))")

    create table(:machine_materials, primary_key: false) do
      add :machine_id, references(:machines, type: :text, column: :machine_id, on_delete: :delete_all),
        null: false

      add :material, :text, null: false
      add :required, :bigint, null: false
      add :contributed, :bigint, null: false, default: 0
    end

    execute("ALTER TABLE machine_materials ADD PRIMARY KEY (machine_id, material)")
    execute("ALTER TABLE machine_materials ADD CONSTRAINT mm_required_nonneg CHECK (required >= 0)")
    execute("ALTER TABLE machine_materials ADD CONSTRAINT mm_contributed_nonneg CHECK (contributed >= 0)")
    execute("ALTER TABLE machine_materials ADD CONSTRAINT mm_contributed_le CHECK (contributed <= required)")

    create table(:machine_contributions, primary_key: false) do
      add :id, :bigserial, primary_key: true
      add :machine_id, :text, null: false
      add :player_id, references(:players, type: :text, column: :id), null: false
      add :material, :text, null: false
      add :applied, :bigint, null: false
      add :inserted_at, :bigint, null: false
    end

    execute("ALTER TABLE machine_contributions ADD CONSTRAINT mc_applied_pos CHECK (applied > 0)")

    create table(:import_snapshots, primary_key: false) do
      add :id, :bigserial, primary_key: true
      add :snapshot_sha256, :text, null: false
      add :imported_at, :bigint, null: false
      add :report, :jsonb, null: false, default: "{}"
    end

    create unique_index(:import_snapshots, [:snapshot_sha256])
  end

  def down do
    drop table(:import_snapshots)
    drop table(:machine_contributions)
    drop table(:machine_materials)
    drop table(:machines)
    drop table(:gather_nodes)
    drop table(:contract_board)
    drop table(:contracts)
    drop table(:ledger_entries)
    drop table(:trades)
    drop table(:orders)
    drop table(:market_multipliers)
    drop table(:inventory_balances)
    execute("DROP SEQUENCE IF EXISTS inventory_acquired_seq")
    drop table(:wallets)
    drop table(:sprinklers)
    drop table(:beds)
    drop table(:gardens)
  end
end
