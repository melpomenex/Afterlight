defmodule Afterlight.Catalog.PlaylistChannel do
  @moduledoc false

  use Ash.Resource,
    otp_app: :afterlight,
    domain: Afterlight.Catalog,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table "playlist_channels"
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

    attribute :list_id, :string do
      allow_nil? false
      public? true
    end

    attribute :position, :integer do
      allow_nil? false
      public? true
    end

    attribute :url, :string do
      allow_nil? false
      public? true
    end

    attribute :name, :string do
      allow_nil? false
      default ""
      public? true
      constraints max_length: 200
    end

    attribute :group_name, :string do
      allow_nil? false
      default ""
      public? true
      constraints max_length: 120, allow_empty?: true
    end

    attribute :logo, :string do
      allow_nil? true
      public? true
    end

    attribute :tvg_id, :string do
      allow_nil? true
      public? true
    end
  end

  relationships do
    belongs_to :list, Afterlight.Catalog.PlaylistList do
      attribute_type :string
      allow_nil? false
    end
  end

  actions do
    defaults [:read, :destroy]

    create :create do
      accept [:list_id, :position, :url, :name, :group_name, :logo, :tvg_id]
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
