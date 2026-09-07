defmodule Afterlight.Gardens.Sprinkler do
  @moduledoc "Sprinkler fixture placed on a garden bed."

  use Ash.Resource,
    otp_app: :afterlight,
    domain: Afterlight.Gardens.Domain,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table "sprinklers"
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

    attribute :garden_id, :string do
      allow_nil? false
      public? true
    end

    attribute :bed_index, :integer do
      allow_nil? false
      public? true
      constraints min: 0, max: 11
    end

    attribute :type, :string do
      allow_nil? false
      default "sprinkler"
      public? true
    end
  end

  relationships do
    belongs_to :garden, Afterlight.Gardens.Garden do
      define_attribute? false
      source_attribute :garden_id
      destination_attribute :player_id
    end
  end

  identities do
    identity :unique_bed, [:garden_id, :bed_index]
  end

  actions do
    defaults [:read, :destroy]

    create :place do
      accept [:garden_id, :bed_index, :type]
    end
  end

  policies do
    bypass actor_attribute_equals(:role, :system) do
      authorize_if always()
    end

    policy action_type(:read) do
      authorize_if expr(garden_id == ^actor(:player_id))
    end

    policy action([:place, :destroy]) do
      authorize_if expr(garden_id == ^actor(:player_id))
    end
  end
end
