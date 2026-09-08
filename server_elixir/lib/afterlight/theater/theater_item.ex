defmodule Afterlight.Theater.TheaterItem do
  @moduledoc """
  One row in the theater bill (`now` or `queue` slot).
  """

  use Ash.Resource,
    otp_app: :afterlight,
    domain: Afterlight.Theater,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table "theater_items"
    repo Afterlight.Repo

    custom_indexes do
      index [:room_key, :slot, :order_index], name: "theater_items_room_slot_idx"
      index [:room_key], name: "theater_items_room_idx"
    end
  end

  attributes do
    attribute :id, :string do
      primary_key? true
      allow_nil? false
      public? true
    end

    attribute :room_key, :string do
      allow_nil? false
      public? true
    end

    attribute :slot, :string do
      allow_nil? false
      public? true
    end

    attribute :order_index, :integer do
      allow_nil? false
      public? true
    end

    attribute :kind, :string do
      allow_nil? false
      public? true
    end

    attribute :url, :string do
      allow_nil? false
      public? true
    end

    attribute :video_id, :string do
      allow_nil? true
      public? true
    end

    attribute :title, :string do
      allow_nil? false
      public? true
    end

    attribute :position_sec, :float do
      allow_nil? false
      default 0.0
      public? true
    end

    attribute :playing, :boolean do
      allow_nil? false
      default false
      public? true
    end

    attribute :updated_at, :integer do
      allow_nil? false
      public? true
    end

    attribute :by, :string do
      allow_nil? false
      public? true
    end

    attribute :queued_by, :string do
      allow_nil? false
      public? true
    end

    attribute :generation, :integer do
      allow_nil? false
      default 1
      public? true
    end

    attribute :infohash, :string do
      allow_nil? true
      public? true
    end

    attribute :file_index, :integer do
      allow_nil? true
      public? true
    end

    attribute :file_path, :string do
      allow_nil? true
      public? true
    end

    attribute :file_bytes, :float do
      allow_nil? true
      public? true
    end

    attribute :source_url, :string do
      allow_nil? true
      public? true
    end

    attribute :playback_url, :string do
      allow_nil? true
      public? true
    end

    attribute :prepare_status, :string do
      allow_nil? true
      public? true
    end

    attribute :prepare_id, :string do
      allow_nil? true
      public? true
    end

    attribute :prepare_error, :string do
      allow_nil? true
      public? true
    end
  end

  relationships do
    belongs_to :room, Afterlight.Theater.TheaterRoom do
      source_attribute :room_key
      destination_attribute :room_key
    end
  end

  actions do
    defaults [:read]

    create :insert do
      accept [
        :id,
        :room_key,
        :slot,
        :order_index,
        :kind,
        :url,
        :video_id,
        :title,
        :position_sec,
        :playing,
        :updated_at,
        :by,
        :queued_by,
        :generation,
        :infohash,
        :file_index,
        :file_path,
        :file_bytes,
        :source_url,
        :playback_url,
        :prepare_status,
        :prepare_id,
        :prepare_error
      ]
    end

    update :patch do
      accept [
        :slot,
        :order_index,
        :kind,
        :url,
        :video_id,
        :title,
        :position_sec,
        :playing,
        :updated_at,
        :by,
        :queued_by,
        :generation,
        :infohash,
        :file_index,
        :file_path,
        :file_bytes,
        :source_url,
        :playback_url,
        :prepare_status,
        :prepare_id,
        :prepare_error
      ]

      require_atomic? false
    end

    destroy :delete do
      primary? true
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

    policy action(:insert) do
      authorize_if actor_attribute_equals(:role, :system)
    end

    policy action(:patch) do
      authorize_if actor_attribute_equals(:role, :system)
    end

    policy action(:delete) do
      authorize_if actor_attribute_equals(:role, :system)
    end
  end
end
