defmodule Afterlight.Gardens.Bed do
  @moduledoc "Single garden bed row (0–11 grid index)."

  use Ash.Resource,
    otp_app: :afterlight,
    domain: Afterlight.Gardens.Domain,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table "beds"
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

    attribute :index, :integer do
      allow_nil? false
      public? true
      constraints min: 0, max: 11
    end

    attribute :prepared, :boolean do
      allow_nil? false
      default false
      public? true
    end

    attribute :crop_id, :string do
      allow_nil? true
      public? true
    end

    attribute :planted_at, :integer do
      allow_nil? true
      public? true
    end

    attribute :last_watered_at, :integer do
      allow_nil? true
      public? true
    end

    attribute :moisture, :float do
      allow_nil? false
      default 0.0
      public? true
    end

    attribute :health, :float do
      allow_nil? false
      default 1.0
      public? true
    end

    attribute :moisture_history_sum, :float do
      allow_nil? false
      default 0.0
      public? true
    end

    attribute :moisture_checks, :float do
      allow_nil? false
      default 0.0
      public? true
    end

    attribute :stage, :integer do
      allow_nil? false
      default 0
      public? true
      constraints min: 0, max: 6
    end

    attribute :harvest_count, :integer do
      allow_nil? false
      default 0
      public? true
      constraints min: 0
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
    identity :unique_index, [:garden_id, :index]
  end

  preparations do
    prepare build(sort: [index: :asc])
  end

  actions do
    defaults [:read]

    create :seed do
      accept [
        :garden_id,
        :index,
        :prepared,
        :crop_id,
        :planted_at,
        :last_watered_at,
        :moisture,
        :health,
        :moisture_history_sum,
        :moisture_checks,
        :stage,
        :harvest_count
      ]

      upsert? true
      upsert_identity :unique_index
      upsert_fields [
        :prepared,
        :crop_id,
        :planted_at,
        :last_watered_at,
        :moisture,
        :health,
        :moisture_history_sum,
        :moisture_checks,
        :stage,
        :harvest_count
      ]
    end

    update :mutate do
      accept [
        :prepared,
        :crop_id,
        :planted_at,
        :last_watered_at,
        :moisture,
        :health,
        :moisture_history_sum,
        :moisture_checks,
        :stage,
        :harvest_count
      ]

      require_atomic? false
    end
  end

  policies do
    bypass actor_attribute_equals(:role, :system) do
      authorize_if always()
    end

    policy action_type(:read) do
      authorize_if expr(garden_id == ^actor(:player_id))
    end

    policy action([:seed, :mutate]) do
      authorize_if expr(garden_id == ^actor(:player_id))
    end
  end
end
