defmodule Afterlight.Conferencing.Call do
  @moduledoc """
  A bounded conference. Durable metadata only — media lives on a worker.
  """

  use Ash.Resource,
    otp_app: :afterlight,
    domain: Afterlight.Conferencing,
    data_layer: AshPostgres.DataLayer,
    authorizers: [Ash.Policy.Authorizer]

  postgres do
    table "calls"
    repo Afterlight.Repo
  end

  actions do
    defaults [:read]

    create :open do
      accept [:room_key, :mode, :max_participants, :worker_id]
      change Afterlight.Conferencing.Changes.SetCreatedBy
      change set_attribute(:status, :active)
      change Afterlight.Conferencing.Changes.JoinCreator
    end

    action :authorize_join, :struct do
      constraints instance_of: Afterlight.Conferencing.CallMembership
      argument :call_id, :uuid, allow_nil?: false
      transaction? true
      run Afterlight.Conferencing.Actions.AuthorizeJoin
    end

    action :issue_media_grant, :map do
      argument :call_id, :uuid, allow_nil?: false
      argument :can_publish_audio, :boolean, default: true
      argument :can_publish_video, :boolean, default: false
      argument :can_publish_screen, :boolean, default: false
      transaction? true
      run Afterlight.Conferencing.Actions.IssueMediaGrant
    end

    action :renew_grant, :map do
      argument :call_id, :uuid, allow_nil?: false
      transaction? true
      run Afterlight.Conferencing.Actions.RenewGrant
    end

    action :revoke_grant, :struct do
      constraints instance_of: Afterlight.Conferencing.MediaGrant
      argument :jti, :uuid, allow_nil?: false
      argument :reason, :string, default: "revoked"
      transaction? true
      run Afterlight.Conferencing.Actions.RevokeGrant
    end

    action :leave, :struct do
      constraints instance_of: Afterlight.Conferencing.CallMembership
      argument :call_id, :uuid, allow_nil?: false
      transaction? true
      run Afterlight.Conferencing.Actions.Leave
    end

    action :remove_participant, :struct do
      constraints instance_of: Afterlight.Conferencing.CallMembership
      argument :call_id, :uuid, allow_nil?: false
      argument :player_id, :string, allow_nil?: false
      transaction? true
      run Afterlight.Conferencing.Actions.RemoveParticipant
    end

    action :close_call, :struct do
      constraints instance_of: __MODULE__
      argument :call_id, :uuid, allow_nil?: false
      transaction? true
      run Afterlight.Conferencing.Actions.CloseCall
    end
  end

  policies do
    policy always() do
      forbid_unless actor_present()
      forbid_unless actor_attribute_equals(:enabled?, true)
      forbid_if actor_attribute_equals(:moderated?, true)
      authorize_if always()
    end

    policy action([:open, :authorize_join]) do
      forbid_unless actor_attribute_equals(:room_member?, true)
      authorize_if always()
    end
  end

  attributes do
    uuid_primary_key :id

    attribute :room_key, :string do
      allow_nil? false
      public? true
    end

    attribute :mode, :atom do
      constraints one_of: [:voice, :camera]
      default :voice
      allow_nil? false
      public? true
    end

    attribute :status, :atom do
      constraints one_of: [:active, :ended]
      default :active
      allow_nil? false
      public? true
    end

    attribute :max_participants, :integer do
      default 8
      allow_nil? false
      public? true
      constraints min: 1, max: 32
    end

    attribute :worker_id, :string do
      public? true
    end

    attribute :created_by_id, :string do
      allow_nil? false
      public? true
    end

    create_timestamp :inserted_at
    update_timestamp :updated_at

    attribute :ended_at, :utc_datetime_usec do
      public? true
    end
  end

  relationships do
    has_many :memberships, Afterlight.Conferencing.CallMembership
    has_many :grants, Afterlight.Conferencing.MediaGrant
  end
end
