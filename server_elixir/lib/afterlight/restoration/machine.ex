defmodule Afterlight.Restoration.Machine do
  @moduledoc "Shared restoration machine (mill)."

  use Ash.Resource,
    otp_app: :afterlight,
    domain: Afterlight.Restoration.Domain,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table "machines"
    repo Afterlight.Repo
  end

  attributes do
    attribute :machine_id, :string do
      primary_key? true
      allow_nil? false
      public? true
    end

    attribute :status, :atom do
      allow_nil? false
      default :broken
      public? true
      constraints one_of: [:broken, :restored]
    end

    attribute :restored_at, :integer do
      allow_nil? true
      public? true
    end
  end

  identities do
    identity :unique_machine, [:machine_id]
  end

  actions do
    defaults [:read]

    create :seed do
      accept [:machine_id, :status, :restored_at]
      upsert? true
      upsert_identity :unique_machine
      upsert_fields [:status, :restored_at]
    end

    update :restore do
      accept [:status, :restored_at]
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

    policy action([:seed, :restore]) do
      authorize_if actor_attribute_equals(:role, :system)
    end
  end
end
