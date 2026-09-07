defmodule Afterlight.Catalog.EpgChannel do
  @moduledoc false

  use Ash.Resource,
    otp_app: :afterlight,
    domain: Afterlight.Catalog,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table "epg_channels"
    repo Afterlight.Repo
  end

  attributes do
    attribute :guide_id, :string do
      primary_key? true
      allow_nil? false
      public? true
    end

    attribute :xmltv_id, :string do
      primary_key? true
      allow_nil? false
      public? true
    end

    attribute :names, {:array, :string} do
      allow_nil? false
      default []
      public? true
    end

    attribute :icon, :string do
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
      accept [:guide_id, :xmltv_id, :names, :icon]
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
