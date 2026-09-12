defmodule Afterlight.Repo.Migrations.DropGardeningEconomyDomain do
  @moduledoc """
  Drops the retired garden/economy/restoration tables and the player economy
  columns. Run `mix afterlight.archive_economy` first: the dated export lands
  in `.retired/` and is the only restore source. The protected
  `data/*.json` snapshots are never touched by this migration.
  """

  use Ecto.Migration

  def up do
    # Player economy columns (created by the accounts migration).
    alter table(:players) do
      remove :coins
      remove :xp
      remove :level
      remove :reputation
      remove :reserved_coins
      remove :inventory
      remove :materials
    end

    alter table(:system_imports) do
      remove :coins_sum
      remove :xp_sum
    end

    # Economy-group tables: children before parents (beds/sprinklers point at
    # gardens; machine materials/contributions point at machines).
    drop table(:ledger_entries)
    drop table(:trades)
    drop table(:orders)
    drop table(:contracts)
    drop table(:contract_board)
    drop table(:market_multipliers)
    drop table(:inventory_balances)
    drop table(:sprinklers)
    drop table(:beds)
    drop table(:gardens)
    drop table(:gather_nodes)
    drop table(:machine_contributions)
    drop table(:machine_materials)
    drop table(:machines)
    drop table(:import_snapshots)

    execute "DROP SEQUENCE IF EXISTS inventory_acquired_seq"
  end

  def down do
    raise """
    drop_gardening_economy_domain is irreversible.

    The garden/economy tables and player columns were removed on purpose.
    To recover data, restore from the dated `.retired/economy-*.json`
    archive written by `mix afterlight.archive_economy` and redeploy the
    revision that still contains the economy domains.
    """
  end
end
