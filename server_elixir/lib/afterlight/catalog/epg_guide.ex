defmodule Afterlight.Catalog.EpgGuide do
  @moduledoc false

  use Ash.Resource,
    otp_app: :afterlight,
    domain: Afterlight.Catalog,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table "epg_guides"
    repo Afterlight.Repo
  end

  attributes do
    attribute :id, :string do
      primary_key? true
      allow_nil? false
      public? true
    end

    attribute :name, :string do
      allow_nil? false
      public? true
      constraints max_length: 120
    end

    attribute :updated_at, :integer do
      allow_nil? false
      public? true
    end
  end

  relationships do
    has_many :channels, Afterlight.Catalog.EpgChannel do
      destination_attribute :guide_id
    end

    has_many :programmes, Afterlight.Catalog.EpgProgramme do
      destination_attribute :guide_id
    end
  end

  actions do
    defaults [:read, :destroy]

    create :upsert do
      upsert? true
      upsert_identity :id
      accept [:id, :name, :updated_at]
    end
  end

  policies do
    bypass actor_attribute_equals(:role, :system) do
      authorize_if always()
    end

    policy action_type(:read) do
      authorize_if always()
    end

    policy action([:upsert, :destroy]) do
      authorize_if actor_attribute_equals(:role, :system)
    end
  end

  identities do
    identity :id, [:id]
  end
end
