defmodule Afterlight.Economy.LedgerEntry do
  @moduledoc "Audit row for every durable balance/xp/reputation mutation."

  use Ash.Resource,
    otp_app: :afterlight,
    domain: Afterlight.Economy.Domain,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table "ledger_entries"
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

    attribute :player_id, :string do
      allow_nil? false
      public? true
    end

    attribute :kind, :atom do
      allow_nil? false
      public? true
    end

    attribute :account, :atom do
      allow_nil? false
      public? true
    end

    attribute :item_id, :string do
      allow_nil? true
      public? true
    end

    attribute :delta, :integer do
      allow_nil? false
      public? true
    end

    attribute :trade_id, :integer do
      allow_nil? true
      public? true
    end

    attribute :command_ref, :string do
      allow_nil? true
      public? true
    end

    attribute :inserted_at, :integer do
      allow_nil? false
      default 0
      public? true
    end
  end

  actions do
    defaults [:read]

    create :record do
      accept [:player_id, :kind, :account, :item_id, :delta, :trade_id, :command_ref, :inserted_at]
    end
  end

  policies do
    bypass actor_attribute_equals(:role, :system) do
      authorize_if always()
    end

    policy action_type(:read) do
      authorize_if expr(player_id == ^actor(:player_id))
    end

    policy action(:record) do
      authorize_if actor_attribute_equals(:role, :system)
    end
  end
end
