defmodule Afterlight.Conferencing do
  @moduledoc """
  Ash domain for conferencing metadata (calls, memberships, media grants).
  Only durable metadata is stored; raw grant tokens and media packets are never persisted.
  """
  use Ash.Domain

  require Ash.Query
  import Ecto.Query, only: [from: 2]

  alias Afterlight.Conferencing.{Call, CallMembership, Grants, MediaGrant}
  alias Afterlight.Repo

  resources do
    resource Call
    resource CallMembership
    resource MediaGrant
  end

  # ============================================================================
  # Calls
  # ============================================================================

  @doc """
  Creates a new conferencing call.
  """
  def create_call(attrs) do
    Call
    |> Ash.Changeset.for_create(:create, attrs)
    |> Ash.create()
  end

  @doc """
  Gets a call by UUID.
  """
  def get_call(call_id) do
    case Ash.get(Call, call_id) do
      {:ok, call} -> {:ok, call}
      {:error, _} -> {:error, :not_found}
    end
  end

  @doc """
  Finds the active call for a room, if one exists.
  """
  def get_active_call_for_room(room_key) do
    query =
      from c in Call,
        where: c.room_key == ^room_key and c.status == :active,
        order_by: [desc: c.inserted_at],
        limit: 1

    case Repo.one(query) do
      nil -> {:error, :not_found}
      call -> {:ok, call}
    end
  end

  # ============================================================================
  # Authorize Join & Membership
  # ============================================================================

  @doc """
  Authorizes a player to join a call (by room_key or call_id).
  Enforces:
  1. Server-verified identity (player_id present)
  2. Call is active
  3. Capacity check (active memberships strictly < max_participants)
  4. Upserts CallMembership to :joined
  5. Issues short-lived MediaGrant with token
  """
  def authorize_join(room_or_call, player_id, opts \\ [])

  def authorize_join(_room_or_call, player_id, _opts)
      when not is_binary(player_id) or player_id == "" do
    {:error, :invalid_identity}
  end

  def authorize_join(target, player_id, opts) do
    # Moderation check
    if moderation_blocked?(player_id) do
      {:error, :moderation_blocked}
    else
      with {:ok, call} <- resolve_active_call(target, player_id, opts),
           :ok <- check_capacity(call, player_id),
           {:ok, membership} <- upsert_membership(call.id, player_id),
           {:ok, grant_info} <- issue_media_grant(call.id, player_id, call.worker_id || "worker-default", opts) do
        {:ok,
         %{
           call: call,
           membership: membership,
           grant: grant_info.grant,
           token: grant_info.token
         }}
      end
    end
  end

  defp resolve_active_call(call_id, _player_id, _opts) when is_binary(call_id) and byte_size(call_id) == 36 do
    case get_call(call_id) do
      {:ok, %{status: :active} = call} -> {:ok, call}
      {:ok, %{status: :ended}} -> {:error, :call_ended}
      {:error, :not_found} -> {:error, :call_not_found}
    end
  end

  defp resolve_active_call(room_key, player_id, opts) when is_binary(room_key) do
    case get_active_call_for_room(room_key) do
      {:ok, call} ->
        {:ok, call}

      {:error, :not_found} ->
        # Automatically create active call for the room
        mode = Keyword.get(opts, :mode, :voice)
        worker_id = Keyword.get(opts, :worker_id, "worker-#{room_key}")
        max_participants = Keyword.get(opts, :max_participants, 8)

        create_call(%{
          room_key: room_key,
          mode: mode,
          worker_id: worker_id,
          max_participants: max_participants,
          created_by: player_id
        })
    end
  end

  defp check_capacity(%Call{id: call_id, max_participants: max_p}, player_id) do
    # Count members whose state is :joined and who are NOT the joining player (re-joining doesn't consume an extra slot)
    query =
      from m in CallMembership,
        where: m.call_id == ^call_id and m.state == :joined and m.player_id != ^player_id,
        select: count(m.id)

    joined_count = Repo.one(query) || 0

    if joined_count >= max_p do
      {:error, :capacity_exceeded}
    else
      :ok
    end
  end

  defp upsert_membership(call_id, player_id) do
    query =
      from m in CallMembership,
        where: m.call_id == ^call_id and m.player_id == ^player_id,
        limit: 1

    now = DateTime.utc_now()

    case Repo.one(query) do
      nil ->
        CallMembership
        |> Ash.Changeset.for_create(:create, %{
          call_id: call_id,
          player_id: player_id,
          state: :joined,
          joined_at: now
        })
        |> Ash.create()

      existing ->
        existing
        |> Ash.Changeset.for_update(:update, %{
          state: :joined,
          left_at: nil
        })
        |> Ash.update()
    end
  end

  defp moderation_blocked?(_player_id) do
    # Placeholder for moderation hook; returns false by default
    false
  end

  # ============================================================================
  # Grants & Renewal
  # ============================================================================

  @doc """
  Issues a short-lived media grant for a participant on a call.
  Durable metadata row is persisted, but the signed token string itself is NEVER persisted (D9).
  """
  def issue_media_grant(call_id, player_id, worker_id, opts \\ []) do
    jti = Ash.UUID.generate()
    ttl = Keyword.get(opts, :ttl, 300) # 5 minutes default
    now = DateTime.utc_now()
    expires_at = DateTime.add(now, ttl, :second)

    can_audio = Keyword.get(opts, :can_publish_audio, true)
    can_video = Keyword.get(opts, :can_publish_video, false)
    can_screen = Keyword.get(opts, :can_publish_screen, false)

    with {:ok, grant} <-
           MediaGrant
           |> Ash.Changeset.for_create(:create, %{
             jti: jti,
             call_id: call_id,
             player_id: player_id,
             worker_id: worker_id,
             can_publish_audio: can_audio,
             can_publish_video: can_video,
             can_publish_screen: can_screen,
             issued_at: now,
             expires_at: expires_at
           })
           |> Ash.create() do
      claims = %{
        "jti" => jti,
        "call_id" => to_string(call_id),
        "player_id" => player_id,
        "worker_id" => worker_id,
        "can_publish_audio" => can_audio,
        "can_publish_video" => can_video,
        "can_publish_screen" => can_screen,
        "iat" => DateTime.to_unix(now),
        "exp" => DateTime.to_unix(expires_at)
      }

      token = Grants.sign_grant(claims)
      {:ok, %{grant: grant, token: token}}
    end
  end

  @doc """
  Renews a grant for an active participant in an active call.
  Re-issued over the authorized topic while membership holds.
  """
  def renew_grant(call_id, player_id, opts \\ []) do
    query =
      from m in CallMembership,
        where: m.call_id == ^call_id and m.player_id == ^player_id and m.state == :joined,
        limit: 1

    with {:ok, call} <- get_call(call_id),
         true <- (call.status == :active) || {:error, :call_ended},
         %CallMembership{} <- Repo.one(query) || {:error, :not_a_member} do
      worker_id = call.worker_id || "worker-default"
      issue_media_grant(call_id, player_id, worker_id, opts)
    end
  end

  @doc """
  Revokes a media grant by JTI or UUID.
  """
  def revoke_grant(jti_or_id, reason \\ "revoked") do
    query =
      from g in MediaGrant,
        where: (g.jti == ^jti_or_id or g.id == ^jti_or_id) and is_nil(g.revoked_at),
        limit: 1

    case Repo.one(query) do
      nil ->
        {:error, :not_found}

      grant ->
        grant
        |> Ash.Changeset.for_update(:revoke, %{reason: reason})
        |> Ash.update()
    end
  end

  @doc """
  Removes a participant from a call mid-session (moderation or kick).
  Tears down their membership and revokes all active grants.
  """
  def remove_participant(call_id, player_id, reason \\ "removed") do
    query =
      from m in CallMembership,
        where: m.call_id == ^call_id and m.player_id == ^player_id,
        limit: 1

    case Repo.one(query) do
      nil ->
        {:error, :not_a_member}

      membership ->
        now = DateTime.utc_now()

        # Update membership to removed
        {:ok, updated_mem} =
          membership
          |> Ash.Changeset.for_update(:remove, %{})
          |> Ash.update()

        # Revoke all unrevoked grants for this player on this call
        from(g in MediaGrant,
          where: g.call_id == ^call_id and g.player_id == ^player_id and is_nil(g.revoked_at)
        )
        |> Repo.update_all(set: [revoked_at: now, revoke_reason: reason, updated_at: now])

        {:ok, updated_mem}
    end
  end

  @doc """
  Marks a participant as left. Idempotent.
  """
  def leave_call(call_id, player_id) do
    query =
      from m in CallMembership,
        where: m.call_id == ^call_id and m.player_id == ^player_id,
        limit: 1

    case Repo.one(query) do
      nil ->
        {:ok, :not_a_member}

      %{state: :left} ->
        {:ok, :already_left}

      membership ->
        now = DateTime.utc_now()

        {:ok, updated_mem} =
          membership
          |> Ash.Changeset.for_update(:leave, %{})
          |> Ash.update()

        from(g in MediaGrant,
          where: g.call_id == ^call_id and g.player_id == ^player_id and is_nil(g.revoked_at)
        )
        |> Repo.update_all(set: [revoked_at: now, revoke_reason: "left", updated_at: now])

        {:ok, updated_mem}
    end
  end

  @doc """
  Closes a call session. Idempotent.
  Marks all memberships as left and revokes all active grants.
  """
  def close_call(call_id, reason \\ "call_closed") do
    case get_call(call_id) do
      {:ok, %{status: :ended} = call} ->
        {:ok, call}

      {:ok, call} ->
        now = DateTime.utc_now()

        {:ok, updated_call} =
          call
          |> Ash.Changeset.for_update(:end_call, %{})
          |> Ash.update()

        # Mark all joined memberships as left
        from(m in CallMembership,
          where: m.call_id == ^call_id and m.state == :joined
        )
        |> Repo.update_all(set: [state: :left, left_at: now, updated_at: now])

        # Revoke all active grants
        from(g in MediaGrant,
          where: g.call_id == ^call_id and is_nil(g.revoked_at)
        )
        |> Repo.update_all(set: [revoked_at: now, revoke_reason: reason, updated_at: now])

        {:ok, updated_call}

      {:error, err} ->
        {:error, err}
    end
  end

  # ============================================================================
  # Sweeper / Reaper
  # ============================================================================

  @doc """
  Sweeps expired grants and cleans abandoned calls/memberships.
  """
  def sweep_expired(opts \\ []) do
    now = Keyword.get(opts, :now, DateTime.utc_now())

    # 1. Mark unrevoked expired grants
    {reaped_grants, _} =
      from(g in MediaGrant,
        where: is_nil(g.revoked_at) and g.expires_at < ^now
      )
      |> Repo.update_all(set: [revoked_at: now, revoke_reason: "expired", updated_at: now])

    # 2. Find active calls with 0 joined members
    active_calls_query =
      from c in Call,
        where: c.status == :active

    active_calls = Repo.all(active_calls_query)

    closed_calls =
      Enum.reduce(active_calls, 0, fn call, acc ->
        joined_count_query =
          from m in CallMembership,
            where: m.call_id == ^call.id and m.state == :joined,
            select: count(m.id)

        count = Repo.one(joined_count_query) || 0

        # If no active members and last grant expired or none exist, close call
        if count == 0 do
          close_call(call.id, "abandoned_empty")
          acc + 1
        else
          acc
        end
      end)

    %{reaped_grants: reaped_grants, closed_calls: closed_calls}
  end

  # ============================================================================
  # Worker Verification Check (D7, D9)
  # ============================================================================

  @doc """
  Direct PostgreSQL revocation check consulted on use by media workers (D7, D9).
  Does not route through web processes.
  Returns :ok or {:error, reason}.
  """
  def check_grant_validity(jti) when is_binary(jti) do
    now = DateTime.utc_now()

    query =
      from g in MediaGrant,
        where: g.jti == ^jti,
        select: {g.expires_at, g.revoked_at, g.revoke_reason},
        limit: 1

    case Repo.one(query) do
      nil ->
        {:error, :grant_not_found}

      {_expires_at, revoked_at, reason} when not is_nil(revoked_at) ->
        {:error, {:grant_revoked, reason}}

      {expires_at, nil, _reason} ->
        if DateTime.compare(expires_at, now) in [:gt, :eq] do
          :ok
        else
          {:error, :grant_expired}
        end
    end
  end
end
