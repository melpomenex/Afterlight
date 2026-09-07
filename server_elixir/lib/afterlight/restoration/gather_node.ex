defmodule Afterlight.Restoration.GatherNode do
  @moduledoc "District gather node with persisted depletion timestamp."

  use Ash.Resource,
    otp_app: :afterlight,
    domain: Afterlight.Restoration.Domain,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table "gather_nodes"
    repo Afterlight.Repo
  end

  attributes do
    attribute :node_id, :string do
      primary_key? true
      allow_nil? false
      public? true
    end

    attribute :district, :string do
      allow_nil? false
      public? true
    end

    attribute :material, :string do
      allow_nil? false
      public? true
    end

    attribute :depleted_at, :integer do
      allow_nil? true
      public? true
    end

    attribute :respawn_ms, :integer do
      allow_nil? false
      default 180_000
      public? true
    end
  end

  identities do
    identity :unique_node, [:node_id]
  end

  actions do
    defaults [:read]

    create :seed do
      accept [:node_id, :district, :material, :depleted_at, :respawn_ms]
      upsert? true
      upsert_identity :unique_node
      upsert_fields [:district, :material, :depleted_at, :respawn_ms]
    end

    update :deplete do
      accept [:depleted_at]
      require_atomic? false
    end

    update :respawn do
      accept [:depleted_at]
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

    policy action([:seed, :deplete, :respawn]) do
      authorize_if actor_attribute_equals(:role, :system)
    end
  end
end
