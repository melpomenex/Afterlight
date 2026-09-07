defmodule Afterlight.Catalog.PlaylistList do
  @moduledoc false

  use Ash.Resource,
    otp_app: :afterlight,
    domain: Afterlight.Catalog,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table "playlist_lists"
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
      constraints max_length: 80
    end

    attribute :added_by, :string do
      allow_nil? false
      public? true
      constraints max_length: 40
    end

    attribute :added_at, :integer do
      allow_nil? false
      public? true
    end

    attribute :channel_count, :integer do
      allow_nil? false
      default 0
      public? true
    end
  end

  relationships do
    has_many :channels, Afterlight.Catalog.PlaylistChannel do
      destination_attribute :list_id
    end
  end

  actions do
    defaults [:read, :destroy]

    create :create do
      accept [:id, :name, :added_by, :added_at, :channel_count]
    end

    update :set_channel_count do
      accept [:channel_count]
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

    policy action([:create, :destroy, :set_channel_count]) do
      authorize_if actor_attribute_equals(:role, :system)
    end
  end
end
