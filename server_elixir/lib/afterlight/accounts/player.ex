defmodule Afterlight.Accounts.Player do
  @moduledoc """
  Player row: identity and current room only. The gardener-era economy
  columns (coins, xp, level, reputation, reserved coins, inventory,
  materials) were removed with the gardening retirement.
  """

  use Ash.Resource,
    otp_app: :afterlight,
    domain: Afterlight.Accounts,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table "players"
    repo Afterlight.Repo

    custom_indexes do
      index [:current_room], name: "players_current_room_idx"
    end
  end

  attributes do
    attribute :id, :string do
      primary_key? true
      allow_nil? false
      public? true
    end

    attribute :nickname, :string do
      allow_nil? false
      public? true
    end

    attribute :current_room, :string do
      allow_nil? false
      default "market"
      public? true
    end

    attribute :last_seen, :integer do
      allow_nil? false
      default 0
      public? true
    end

    attribute :active, :boolean do
      allow_nil? false
      default false
      public? true
    end

    attribute :shadow, :boolean do
      allow_nil? false
      default false
      public? true
    end

    attribute :claimed_at, :integer do
      allow_nil? true
      public? true
    end
  end

  relationships do
    has_many :guest_sessions, Afterlight.Accounts.GuestSession do
      destination_attribute :player_id
    end
  end

  actions do
    defaults [:read]

    create :stub do
      accept [:id, :nickname, :last_seen]
    end

    create :import_upsert do
      upsert? true
      upsert_fields [
        :nickname,
        :current_room,
        :last_seen,
        :shadow
      ]

      accept [
        :id,
        :nickname,
        :current_room,
        :last_seen,
        :shadow
      ]
    end

    update :set_active do
      accept [:active, :claimed_at]
      require_atomic? false
    end

    update :set_nickname do
      accept [:nickname]
      require_atomic? false
    end

    update :touch_last_seen do
      accept [:last_seen]
      require_atomic? false
    end
  end

  policies do
    bypass actor_attribute_equals(:role, :system) do
      authorize_if always()
    end

    policy action_type(:read) do
      authorize_if expr(id == ^actor(:player_id))
      authorize_if actor_attribute_equals(:role, :connecting)
    end

    policy action(:stub) do
      authorize_if actor_attribute_equals(:role, :connecting)
    end

    policy action(:import_upsert) do
      forbid_if always()
    end

    policy action(:set_active) do
      authorize_if expr(id == ^actor(:player_id))
    end

    policy action([:set_nickname, :touch_last_seen]) do
      forbid_if always()
    end
  end
end
