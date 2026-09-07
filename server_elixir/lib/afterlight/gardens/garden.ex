defmodule Afterlight.Gardens.Garden do
  @moduledoc "One garden per player (12 beds, optional sprinklers)."

  use Ash.Resource,
    otp_app: :afterlight,
    domain: Afterlight.Gardens.Domain,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table "gardens"
    repo Afterlight.Repo
  end

  attributes do
    attribute :player_id, :string do
      primary_key? true
      allow_nil? false
      public? true
    end

    attribute :last_tick, :integer do
      allow_nil? false
      default 0
      public? true
    end

    attribute :inserted_at, :integer do
      allow_nil? false
      default 0
      public? true
    end
  end

  relationships do
    has_many :beds, Afterlight.Gardens.Bed do
      destination_attribute :garden_id
      source_attribute :player_id
    end

    has_many :sprinklers, Afterlight.Gardens.Sprinkler do
      destination_attribute :garden_id
      source_attribute :player_id
    end
  end

  identities do
    identity :unique_player, [:player_id]
  end

  actions do
    defaults [:read]

    create :ensure do
      accept [:player_id, :last_tick, :inserted_at]
      upsert? true
      upsert_identity :unique_player
      upsert_fields [:last_tick]
    end

    update :touch do
      accept [:last_tick]
      require_atomic? false
    end

    update :till_bed do
      accept []
      require_atomic? false
    end

    update :plant_bed do
      accept []
      require_atomic? false
    end

    update :water_bed do
      accept []
      require_atomic? false
    end

    update :harvest_bed do
      accept []
      require_atomic? false
    end

    update :place_sprinkler do
      accept []
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

    policy action([:ensure, :touch, :till_bed, :plant_bed, :water_bed, :harvest_bed, :place_sprinkler]) do
      authorize_if expr(player_id == ^actor(:player_id))
    end
  end
end
