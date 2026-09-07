defmodule Afterlight.Restoration.MachineMaterial do
  @moduledoc "Required/contributed material tally for a machine."

  use Ash.Resource,
    otp_app: :afterlight,
    domain: Afterlight.Restoration.Domain,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table "machine_materials"
    repo Afterlight.Repo
  end

  attributes do
    attribute :machine_id, :string do
      primary_key? true
      allow_nil? false
      public? true
    end

    attribute :material, :string do
      primary_key? true
      allow_nil? false
      public? true
    end

    attribute :required, :integer do
      allow_nil? false
      default 0
      public? true
      constraints min: 0
    end

    attribute :contributed, :integer do
      allow_nil? false
      default 0
      public? true
      constraints min: 0
    end
  end

  identities do
    identity :unique_material, [:machine_id, :material]
  end

  actions do
    defaults [:read]

    create :seed do
      accept [:machine_id, :material, :required, :contributed]
      upsert? true
      upsert_identity :unique_material
      upsert_fields [:required, :contributed]
    end

    update :contribute do
      accept [:contributed]
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

    policy action([:seed, :contribute]) do
      authorize_if actor_attribute_equals(:role, :system)
    end
  end
end
