defmodule Afterlight.Repo.Migrations.AddImportMetaAndEpgDedup do
  use Ecto.Migration

  def up do
    alter table(:system_imports) do
      add :meta, :map, null: false, default: %{}
    end
  end

  def down do
    alter table(:system_imports) do
      remove :meta
    end
  end
end
