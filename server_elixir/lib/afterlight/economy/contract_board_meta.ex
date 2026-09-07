defmodule Afterlight.Economy.ContractBoardMeta do
  @moduledoc "Singleton `contract_board` row (reroll cadence metadata)."

  use Ash.Resource,
    otp_app: :afterlight,
    domain: Afterlight.Economy.Domain,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table "contract_board"
    repo Afterlight.Repo
  end

  attributes do
    attribute :id, :integer do
      primary_key? true
      allow_nil? false
      default 1
      public? true
    end

    attribute :last_refresh_at, :integer do
      allow_nil? false
      default 0
      public? true
    end
  end

  identities do
    identity :singleton, [:id]
  end

  actions do
    defaults [:read]

    create :ensure do
      accept [:id, :last_refresh_at]
      upsert? true
      upsert_identity :singleton
      upsert_fields [:last_refresh_at]
    end

    update :touch_refresh do
      accept [:last_refresh_at]
      require_atomic? false
    end
  end

  policies do
    bypass actor_attribute_equals(:role, :system) do
      authorize_if always()
    end

    policy action_type(:read) do
      authorize_if always()
    end

    policy action([:ensure, :touch_refresh]) do
      authorize_if actor_attribute_equals(:role, :system)
    end
  end
end
