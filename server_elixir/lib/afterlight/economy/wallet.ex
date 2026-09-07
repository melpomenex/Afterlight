defmodule Afterlight.Economy.Wallet do
  @moduledoc "Player coin balances and buy-order escrow (`reserved_coins`)."

  use Ash.Resource,
    otp_app: :afterlight,
    domain: Afterlight.Economy.Domain,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table "wallets"
    repo Afterlight.Repo
  end

  attributes do
    attribute :player_id, :string do
      primary_key? true
      allow_nil? false
      public? true
    end

    attribute :coins, :integer do
      allow_nil? false
      default 0
      public? true
      constraints min: 0
    end

    attribute :reserved_coins, :integer do
      allow_nil? false
      default 0
      public? true
      constraints min: 0
    end
  end

  identities do
    identity :unique_player, [:player_id]
  end

  actions do
    defaults [:read]

    create :ensure do
      accept [:player_id, :coins, :reserved_coins]
      upsert? true
      upsert_identity :unique_player
      upsert_fields [:coins, :reserved_coins]
    end

    update :adjust do
      accept [:coins, :reserved_coins]
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

    policy action([:ensure, :adjust]) do
      authorize_if expr(player_id == ^actor(:player_id))
    end
  end
end
