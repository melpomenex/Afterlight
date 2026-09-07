defmodule Afterlight.Conferencing.MediaGrant do
  @moduledoc """
  Ash resource storing durable media grant metadata.
  Grant bearer tokens themselves are never stored here or anywhere in DB (D9).
  """
  use Ash.Resource,
    domain: Afterlight.Conferencing,
    data_layer: AshPostgres.DataLayer

  postgres do
    table "media_grants"
    repo Afterlight.Repo
  end

  attributes do
    uuid_primary_key :id

    attribute :jti, :string do
      allow_nil? false
      public? true
    end

    attribute :player_id, :string do
      allow_nil? false
      public? true
    end

    attribute :worker_id, :string do
      allow_nil? false
      public? true
    end

    attribute :can_publish_audio, :boolean do
      default false
      allow_nil? false
      public? true
    end

    attribute :can_publish_video, :boolean do
      default false
      allow_nil? false
      public? true
    end

    attribute :can_publish_screen, :boolean do
      default false
      allow_nil? false
      public? true
    end

    attribute :issued_at, :utc_datetime_usec do
      default &DateTime.utc_now/0
      allow_nil? false
      public? true
    end

    attribute :expires_at, :utc_datetime_usec do
      allow_nil? false
      public? true
    end

    attribute :revoked_at, :utc_datetime_usec do
      allow_nil? true
      public? true
    end

    attribute :revoke_reason, :string do
      allow_nil? true
      public? true
    end

    create_timestamp :inserted_at
    update_timestamp :updated_at
  end

  relationships do
    belongs_to :call, Afterlight.Conferencing.Call do
      allow_nil? false
      attribute_writable? true
      public? true
    end
  end

  identities do
    identity :unique_jti, [:jti]
  end

  actions do
    defaults [:read, :destroy]

    create :create do
      primary? true
      accept [
        :jti,
        :call_id,
        :player_id,
        :worker_id,
        :can_publish_audio,
        :can_publish_video,
        :can_publish_screen,
        :issued_at,
        :expires_at,
        :revoked_at,
        :revoke_reason
      ]
    end

    update :update do
      primary? true
      accept [:revoked_at, :revoke_reason, :expires_at]
    end

    update :revoke do
      argument :reason, :string, allow_nil?: true
      change set_attribute(:revoked_at, &DateTime.utc_now/0)
      change set_attribute(:revoke_reason, arg(:reason))
    end
  end
end
