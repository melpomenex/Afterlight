defmodule Afterlight.Theater.TheaterRoom do
  @moduledoc """
  Durable theater room header: revision, epoch placeholder (P9), now pointer.
  """

  use Ash.Resource,
    otp_app: :afterlight,
    domain: Afterlight.Theater,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table "theater_rooms"
    repo Afterlight.Repo
  end

  attributes do
    attribute :room_key, :string do
      primary_key? true
      allow_nil? false
      public? true
    end

    attribute :revision, :integer do
      allow_nil? false
      default 1
      public? true
      constraints min: 1
    end

    attribute :epoch, :integer do
      allow_nil? false
      default 1
      public? true
    end

    attribute :now_item_id, :string do
      allow_nil? true
      public? true
    end

    attribute :updated_at, :integer do
      allow_nil? false
      public? true
    end
  end

  relationships do
    has_many :items, Afterlight.Theater.TheaterItem do
      destination_attribute :room_key
      source_attribute :room_key
    end
  end

  actions do
    defaults [:read]

    create :ensure do
      accept [:room_key, :revision, :epoch, :now_item_id, :updated_at]
    end

    update :commit do
      accept [:revision, :now_item_id, :updated_at]
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

    policy action(:ensure) do
      authorize_if actor_attribute_equals(:role, :system)
    end

    policy action(:commit) do
      authorize_if actor_attribute_equals(:role, :system)
    end
  end
end
