defmodule Afterlight.Conferencing do
  @moduledoc """
  Durable conferencing metadata (P8). Calls, memberships and grant
  *bindings* live in PostgreSQL. Signed grant tokens are short-lived and
  never persisted — see `Afterlight.Conferencing.Grants`.

  Media packets do not flow through this domain. Phoenix authorizes
  identity + membership + capacity here, then a media worker validates
  grants independently.
  """

  use Ash.Domain, otp_app: :afterlight

  resources do
    resource Afterlight.Conferencing.Call do
      define :open_call, action: :open
      define :authorize_join, action: :authorize_join, args: [:call_id]
      define :issue_media_grant, action: :issue_media_grant, args: [:call_id]
      define :renew_grant, action: :renew_grant, args: [:call_id]
      define :revoke_grant, action: :revoke_grant, args: [:jti]
      define :leave_call, action: :leave, args: [:call_id]
      define :remove_participant, action: :remove_participant, args: [:call_id, :player_id]
      define :close_call, action: :close_call, args: [:call_id]
    end

    resource Afterlight.Conferencing.CallMembership
    resource Afterlight.Conferencing.MediaGrant
  end

  @doc "Build the actor map Phoenix (and tests) pass into Ash."
  def actor(player_id, opts \\ []) when is_binary(player_id) do
    %{
      player_id: player_id,
      enabled?: Keyword.get(opts, :enabled?, Afterlight.Conferencing.Feature.enabled?()),
      room_member?: Keyword.get(opts, :room_member?, true),
      moderated?: Keyword.get(opts, :moderated?, false),
      moderator?: Keyword.get(opts, :moderator?, false)
    }
  end
end
