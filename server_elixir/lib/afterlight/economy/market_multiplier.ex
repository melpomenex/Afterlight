defmodule Afterlight.Economy.MarketMultiplier do
  @moduledoc "Per-item NPC market multiplier (float8 exact)."

  use Ash.Resource,
    otp_app: :afterlight,
    domain: Afterlight.Economy.Domain,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table "market_multipliers"
    repo Afterlight.Repo
  end

  attributes do
    attribute :item_id, :string do
      primary_key? true
      allow_nil? false
      public? true
    end

    attribute :multiplier, :float do
      allow_nil? false
      public? true
    end

    attribute :updated_at, :integer do
      allow_nil? false
      default 0
      public? true
    end
  end

  identities do
    identity :unique_item, [:item_id]
  end

  actions do
    defaults [:read]

    create :upsert do
      accept [:item_id, :multiplier, :updated_at]
      upsert? true
      upsert_identity :unique_item
      upsert_fields [:multiplier, :updated_at]
    end
  end

  policies do
    bypass actor_attribute_equals(:role, :system) do
      authorize_if always()
    end

    policy action_type(:read) do
      authorize_if always()
    end

    policy action(:upsert) do
      authorize_if actor_attribute_equals(:role, :system)
    end
  end
end
