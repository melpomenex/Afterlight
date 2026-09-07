defmodule Afterlight.Conferencing.CallMembership do
  @moduledoc """
  Ash resource representing a participant's membership in a call.
  Unique per (call_id, player_id).
  """
  use Ash.Resource,
    domain: Afterlight.Conferencing,
    data_layer: AshPostgres.DataLayer

  postgres do
    table "call_memberships"
    repo Afterlight.Repo
  end

  attributes do
    uuid_primary_key :id

    attribute :player_id, :string do
      allow_nil? false
      public? true
    end

    attribute :state, :atom do
      constraints [one_of: [:joined, :left, :removed]]
      default :joined
      allow_nil? false
      public? true
    end

    attribute :joined_at, :utc_datetime_usec do
      default &DateTime.utc_now/0
      allow_nil? false
      public? true
    end

    attribute :left_at, :utc_datetime_usec do
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
    identity :unique_call_player, [:call_id, :player_id]
  end

  actions do
    defaults [:read, :destroy]

    create :create do
      primary? true
      accept [:call_id, :player_id, :state, :joined_at, :left_at]
    end

    update :update do
      primary? true
      accept [:state, :left_at]
    end

    update :leave do
      change set_attribute(:state, :left)
      change set_attribute(:left_at, &DateTime.utc_now/0)
    end

    update :remove do
      change set_attribute(:state, :removed)
      change set_attribute(:left_at, &DateTime.utc_now/0)
    end
  end
end
