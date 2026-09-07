defmodule Afterlight.Economy.Trade do
  @moduledoc "Executed order-book trade (audit + wire `trade_filled`)."

  use Ash.Resource,
    otp_app: :afterlight,
    domain: Afterlight.Economy.Domain,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table "trades"
    repo Afterlight.Repo
  end

  attributes do
    attribute :id, :integer do
      primary_key? true
      generated? true
      writable? false
      allow_nil? false
      public? true
    end

    attribute :public_id, :string do
      allow_nil? false
      public? true
    end

    attribute :buyer_id, :string do
      allow_nil? false
      public? true
    end

    attribute :seller_id, :string do
      allow_nil? false
      public? true
    end

    attribute :crop_id, :string do
      allow_nil? false
      public? true
    end

    attribute :quality, :string do
      allow_nil? false
      public? true
    end

    attribute :price, :integer do
      allow_nil? false
      public? true
    end

    attribute :quantity, :integer do
      allow_nil? false
      public? true
    end

    attribute :value, :integer do
      allow_nil? false
      public? true
    end

    attribute :fee, :integer do
      allow_nil? false
      public? true
      constraints min: 1
    end

    attribute :executed_at, :integer do
      allow_nil? false
      public? true
    end

    attribute :taker_order_id, :string do
      allow_nil? false
      public? true
    end

    attribute :maker_order_id, :string do
      allow_nil? false
      public? true
    end
  end

  identities do
    identity :unique_public_id, [:public_id]
  end

  actions do
    defaults [:read]

    create :record do
      accept [
        :public_id,
        :buyer_id,
        :seller_id,
        :crop_id,
        :quality,
        :price,
        :quantity,
        :value,
        :fee,
        :executed_at,
        :taker_order_id,
        :maker_order_id
      ]
    end
  end

  policies do
    bypass actor_attribute_equals(:role, :system) do
      authorize_if always()
    end

    policy action_type(:read) do
      authorize_if expr(buyer_id == ^actor(:player_id) or seller_id == ^actor(:player_id))
    end

    policy action(:record) do
      authorize_if actor_attribute_equals(:role, :system)
    end
  end
end
