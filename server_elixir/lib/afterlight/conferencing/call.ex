defmodule Afterlight.Conferencing.Call do
  @moduledoc """
  Ash resource representing a conferencing call session.
  Persists durable metadata per design D9.
  """
  use Ash.Resource,
    domain: Afterlight.Conferencing,
    data_layer: AshPostgres.DataLayer

  postgres do
    table "calls"
    repo Afterlight.Repo
  end

  attributes do
    uuid_primary_key :id

    attribute :room_key, :string do
      allow_nil? false
      public? true
    end

    attribute :mode, :atom do
      constraints [one_of: [:voice, :camera]]
      default :voice
      allow_nil? false
      public? true
    end

    attribute :status, :atom do
      constraints [one_of: [:active, :ended]]
      default :active
      allow_nil? false
      public? true
    end

    attribute :max_participants, :integer do
      default 8
      allow_nil? false
      public? true
    end

    attribute :worker_id, :string do
      allow_nil? true
      public? true
    end

    attribute :created_by, :string do
      allow_nil? false
      public? true
    end

    attribute :ended_at, :utc_datetime_usec do
      allow_nil? true
      public? true
    end

    create_timestamp :inserted_at
    update_timestamp :updated_at
  end

  relationships do
    has_many :memberships, Afterlight.Conferencing.CallMembership do
      destination_attribute :call_id
    end

    has_many :grants, Afterlight.Conferencing.MediaGrant do
      destination_attribute :call_id
    end
  end

  actions do
    defaults [:read, :destroy]

    create :create do
      primary? true
      accept [:room_key, :mode, :status, :max_participants, :worker_id, :created_by]
    end

    update :update do
      primary? true
      accept [:status, :worker_id, :ended_at, :max_participants]
    end

    update :end_call do
      change set_attribute(:status, :ended)
      change set_attribute(:ended_at, &DateTime.utc_now/0)
    end
  end
end
