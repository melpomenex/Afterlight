defmodule Afterlight.Accounts.GuestSession do
  @moduledoc """
  Durable guest session. Stores a SHA-256 of the signed token, never the token.
  """

  use Ash.Resource,
    otp_app: :afterlight,
    domain: Afterlight.Accounts,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table "guest_sessions"
    repo Afterlight.Repo

    custom_indexes do
      index [:player_id], name: "guest_sessions_player_idx"
      index [:player_id], name: "guest_sessions_live_idx", where: "revoked_at IS NULL"
    end
  end

  attributes do
    uuid_primary_key :id

    attribute :player_id, :string do
      allow_nil? false
      public? true
    end

    attribute :token_hash, :string do
      allow_nil? false
      public? true
    end

    attribute :issued_at, :integer do
      allow_nil? false
      public? true
    end

    attribute :expires_at, :integer do
      allow_nil? false
      public? true
    end

    attribute :revoked_at, :integer do
      allow_nil? true
      public? true
    end
  end

  identities do
    identity :unique_token_hash, [:token_hash]
  end

  relationships do
    belongs_to :player, Afterlight.Accounts.Player do
      source_attribute :player_id
      destination_attribute :id
      attribute_type :string
      allow_nil? false
      define_attribute? false
    end
  end

  actions do
    defaults [:read]

    create :open do
      accept [:player_id, :token_hash, :issued_at, :expires_at]
    end

    update :rebind do
      accept [:token_hash, :issued_at, :expires_at]
      require_atomic? false
    end

    update :revoke do
      accept [:revoked_at]
      require_atomic? false
    end
  end

  policies do
    bypass actor_attribute_equals(:role, :system) do
      authorize_if always()
    end

    policy action_type(:read) do
      authorize_if expr(player_id == ^actor(:player_id))
      authorize_if actor_attribute_equals(:role, :connecting)
    end

    policy action(:open) do
      authorize_if actor_attribute_equals(:role, :connecting)
    end

    policy action([:rebind, :revoke]) do
      authorize_if expr(player_id == ^actor(:player_id))
    end
  end
end
