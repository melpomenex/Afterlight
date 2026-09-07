defmodule Afterlight.Economy.Order do
  @moduledoc "Resting limit order (client `orderId` is the primary key)."

  use Ash.Resource,
    otp_app: :afterlight,
    domain: Afterlight.Economy.Domain,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table "orders"
    repo Afterlight.Repo
  end

  attributes do
    attribute :id, :string do
      primary_key? true
      allow_nil? false
      public? true
    end

    attribute :player_id, :string do
      allow_nil? false
      public? true
    end

    attribute :side, :atom do
      allow_nil? false
      public? true
      constraints one_of: [:buy, :sell]
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
      constraints min: 1
    end

    attribute :quantity, :integer do
      allow_nil? false
      public? true
      constraints min: 1
    end

    attribute :filled, :integer do
      allow_nil? false
      default 0
      public? true
      constraints min: 0
    end

    attribute :created_at, :integer do
      allow_nil? false
      public? true
    end

    attribute :cancelled_at, :integer do
      allow_nil? true
      public? true
    end

    attribute :inserted_at, :integer do
      allow_nil? false
      default 0
      public? true
    end
  end

  identities do
    identity :unique_id, [:id]
  end

  preparations do
    prepare build(sort: [created_at: :asc, id: :asc])
  end

  actions do
    defaults [:read]

    create :place do
      accept [
        :id,
        :player_id,
        :side,
        :crop_id,
        :quality,
        :price,
        :quantity,
        :filled,
        :created_at,
        :inserted_at
      ]
    end

    update :fill do
      accept [:filled]
      require_atomic? false
    end

    update :cancel do
      accept [:cancelled_at]
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

    policy action(:place) do
      authorize_if expr(player_id == ^actor(:player_id))
    end

    policy action(:cancel) do
      authorize_if expr(player_id == ^actor(:player_id))
    end

    policy action(:fill) do
      authorize_if actor_attribute_equals(:role, :system)
    end
  end
end
