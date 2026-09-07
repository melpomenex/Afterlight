defmodule Afterlight.Economy.InventoryBalance do
  @moduledoc "Normalized inventory row (seeds, produce, materials, fixtures)."

  use Ash.Resource,
    otp_app: :afterlight,
    domain: Afterlight.Economy.Domain,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table "inventory_balances"
    repo Afterlight.Repo
  end

  attributes do
    attribute :player_id, :string do
      primary_key? true
      allow_nil? false
      public? true
    end

    attribute :item_kind, :atom do
      primary_key? true
      allow_nil? false
      public? true
      constraints one_of: [:seed, :produce, :reserved_produce, :material, :fixture]
    end

    attribute :item_id, :string do
      primary_key? true
      allow_nil? false
      public? true
    end

    attribute :quantity, :integer do
      allow_nil? false
      public? true
      constraints min: 0
    end

    attribute :acquired_seq, :integer do
      allow_nil? false
      public? true
    end
  end

  identities do
    identity :unique_item, [:player_id, :item_kind, :item_id]
  end

  preparations do
    prepare build(sort: [acquired_seq: :asc])
  end

  actions do
    defaults [:read, :destroy]

    create :upsert do
      accept [:player_id, :item_kind, :item_id, :quantity, :acquired_seq]
      upsert? true
      upsert_identity :unique_item
      upsert_fields [:quantity, :acquired_seq]
    end

    update :adjust do
      accept [:quantity, :acquired_seq]
      require_atomic? false
    end
  end

  policies do
    bypass actor_attribute_equals(:role, :system) do
      authorize_if always()
    end

    policy action_type(:read) do
      authorize_if expr(player_id == ^actor(:player_id))
    end

    policy action([:upsert, :adjust, :destroy]) do
      authorize_if expr(player_id == ^actor(:player_id))
    end
  end
end
