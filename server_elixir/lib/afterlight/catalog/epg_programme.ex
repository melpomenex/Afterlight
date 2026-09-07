defmodule Afterlight.Catalog.EpgProgramme do
  @moduledoc false

  use Ash.Resource,
    otp_app: :afterlight,
    domain: Afterlight.Catalog,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table "epg_programmes"
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

    attribute :guide_id, :string do
      allow_nil? false
      public? true
    end

    attribute :channel_key, :string do
      allow_nil? false
      public? true
    end

    attribute :start_ms, :integer do
      allow_nil? false
      public? true
    end

    attribute :stop_ms, :integer do
      allow_nil? false
      public? true
    end

    attribute :title, :string do
      allow_nil? false
      public? true
    end

    attribute :sub_title, :string do
      allow_nil? true
      public? true
    end

    attribute :description, :string do
      allow_nil? true
      public? true
    end
  end

  relationships do
    belongs_to :guide, Afterlight.Catalog.EpgGuide do
      attribute_type :string
      allow_nil? false
    end
  end

  actions do
    defaults [:read, :destroy]

    create :create do
      accept [:guide_id, :channel_key, :start_ms, :stop_ms, :title, :sub_title, :description]
    end
  end

  policies do
    bypass actor_attribute_equals(:role, :system) do
      authorize_if always()
    end

    policy action_type(:read) do
      authorize_if always()
    end

    policy action([:create, :destroy]) do
      authorize_if actor_attribute_equals(:role, :system)
    end
  end
end
