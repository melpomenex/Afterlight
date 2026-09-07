defmodule Afterlight.Conferencing.MediaGrant do
  @moduledoc """
  Durable grant *metadata*. The signed token is never an attribute and
  must never be written to this table.
  """

  use Ash.Resource,
    otp_app: :afterlight,
    domain: Afterlight.Conferencing,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table "media_grants"
    repo Afterlight.Repo
  end

  actions do
    defaults [:read]

    create :record do
      primary? true
      accept [
        :call_id,
        :player_id,
        :worker_id,
        :can_publish_audio,
        :can_publish_video,
        :can_publish_screen,
        :issued_at,
        :expires_at
      ]
    end

    update :mark_revoked do
      accept [:revoked_at, :revoke_reason]
    end
  end

  policies do
    policy always() do
      forbid_unless actor_present()
      authorize_if always()
    end
  end

  attributes do
    uuid_primary_key :id

    attribute :player_id, :string do
      allow_nil? false
      public? true
    end

    attribute :worker_id, :string do
      allow_nil? false
      public? true
    end

    attribute :can_publish_audio, :boolean do
      allow_nil? false
      default true
      public? true
    end

    attribute :can_publish_video, :boolean do
      allow_nil? false
      default false
      public? true
    end

    attribute :can_publish_screen, :boolean do
      allow_nil? false
      default false
      public? true
    end

    attribute :issued_at, :utc_datetime_usec do
      allow_nil? false
      public? true
    end

    attribute :expires_at, :utc_datetime_usec do
      allow_nil? false
      public? true
    end

    attribute :revoked_at, :utc_datetime_usec do
      public? true
    end

    attribute :revoke_reason, :string do
      public? true
    end

    create_timestamp :inserted_at
    update_timestamp :updated_at
  end

  relationships do
    belongs_to :call, Afterlight.Conferencing.Call do
      allow_nil? false
      attribute_writable? true
    end
  end
end
