defmodule Afterlight.Accounts.SystemImport do
  @moduledoc false
  use Ecto.Schema

  @primary_key {:domain, :string, autogenerate: false}
  schema "system_imports" do
    field :snapshot_sha256, :string
    field :player_count, :integer
    field :coins_sum, :integer
    field :xp_sum, :integer
    field :imported_at, :integer
    field :source_path, :string
    field :meta, :map, default: %{}
  end

  def imported_at(domain) do
    import Ecto.Query

    case Afterlight.Repo.one(from s in __MODULE__, where: s.domain == ^domain) do
      nil -> nil
      row -> row.imported_at
    end
  rescue
    _ -> nil
  end
end
