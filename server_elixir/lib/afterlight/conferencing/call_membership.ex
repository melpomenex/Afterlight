defmodule Afterlight.Conferencing.CallMembership do
  @moduledoc "One player in one call. Unique on (call_id, player_id)."

  use Ash.Resource,
    otp_app: :afterlight,
    domain: Afterlight.Conferencing,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table "call_memberships"
    repo Afterlight.Repo
  end

  actions do
    defaults [:read]

    create :record do
      primary? true
      accept [:call_id, :player_id, :state, :joined_at, :left_at]
      upsert? true
      upsert_identity :unique_member
      upsert_fields [:state, :joined_at, :left_at]
    end

    update :set_state do
      accept [:state, :left_at]
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

    attribute :state, :atom do
      constraints one_of: [:joined, :left, :removed]
      default :joined
      allow_nil? false
      public? true
    end

    attribute :joined_at, :utc_datetime_usec do
      allow_nil? false
      public? true
    end

    attribute :left_at, :utc_datetime_usec do
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

  identities do
    identity :unique_member, [:call_id, :player_id]
  end
end
