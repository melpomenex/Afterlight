defmodule Afterlight.Conferencing.Actions do
  @moduledoc false

  require Ash.Query

  alias Afterlight.Conferencing
  alias Afterlight.Conferencing.{Call, CallMembership, Feature, Grants, MediaGrant}
  alias Afterlight.Conferencing.Error
  alias Afterlight.Repo

  defmodule AuthorizeJoin do
    @moduledoc false
    use Ash.Resource.Actions.Implementation
    def run(input, _opts, context), do: Conferencing.Actions.authorize_join(input, context)
  end

  defmodule IssueMediaGrant do
    @moduledoc false
    use Ash.Resource.Actions.Implementation
    def run(input, _opts, context), do: Conferencing.Actions.issue_media_grant(input, context)
  end

  defmodule RenewGrant do
    @moduledoc false
    use Ash.Resource.Actions.Implementation
    def run(input, _opts, context), do: Conferencing.Actions.renew_grant(input, context)
  end

  defmodule RevokeGrant do
    @moduledoc false
    use Ash.Resource.Actions.Implementation
    def run(input, _opts, context), do: Conferencing.Actions.revoke_grant(input, context)
  end

  defmodule Leave do
    @moduledoc false
    use Ash.Resource.Actions.Implementation
    def run(input, _opts, context), do: Conferencing.Actions.leave(input, context)
  end

  defmodule RemoveParticipant do
    @moduledoc false
    use Ash.Resource.Actions.Implementation
    def run(input, _opts, context), do: Conferencing.Actions.remove_participant(input, context)
  end

  defmodule CloseCall do
    @moduledoc false
    use Ash.Resource.Actions.Implementation
    def run(input, _opts, context), do: Conferencing.Actions.close_call(input, context)
  end

  def authorize_join(input, context) do
    actor = actor!(input, context)
    call_id = input.arguments.call_id

    with {:ok, call} <- lock_call(call_id),
         :ok <- require_active(call),
         {:ok, existing} <- get_membership(call_id, actor.player_id) do
      cond do
        match?(%{state: :joined}, existing) ->
          {:ok, existing}

        match?(%{state: :removed}, existing) ->
          {:error, Error.Removed.exception(call_id: call_id)}

        true ->
          admit(call, actor.player_id, existing)
      end
    end
  end

  def issue_media_grant(input, context) do
    actor = actor!(input, context)
    call_id = input.arguments.call_id

    with {:ok, call} <- get_call(call_id),
         :ok <- require_active(call),
         :ok <- require_worker(call),
         {:ok, membership} <- require_joined(call_id, actor.player_id) do
      _ = membership
      create_grant(call, actor.player_id, perms(input.arguments, call))
    end
  end

  def renew_grant(input, context) do
    actor = actor!(input, context)
    call_id = input.arguments.call_id

    with {:ok, call} <- get_call(call_id),
         :ok <- require_active(call),
         :ok <- require_worker(call),
         {:ok, membership} <- require_joined(call_id, actor.player_id) do
      _ = membership
      :ok = revoke_open_grants(call_id, actor.player_id, "renewed")
      perms = last_perms(call_id, actor.player_id) || default_perms(call)
      create_grant(call, actor.player_id, perms)
    end
  end

  def revoke_grant(input, context) do
    actor = actor!(input, context)
    jti = input.arguments.jti
    reason = input.arguments.reason || "revoked"

    case Ash.get(MediaGrant, jti, actor: actor, authorize?: false) do
      {:ok, grant} ->
        if grant.player_id != actor.player_id and not creator_or_mod?(actor, grant.call_id) do
          {:error, Error.NotMember.exception(call_id: grant.call_id)}
        else
          mark_revoked(grant, reason)
        end

      {:error, error} ->
        {:error, error}
    end
  end

  def leave(input, context) do
    actor = actor!(input, context)
    call_id = input.arguments.call_id

    case get_membership(call_id, actor.player_id) do
      {:ok, nil} ->
        {:error, Error.NotMember.exception(call_id: call_id)}

      {:ok, %{state: state} = membership} when state in [:left, :removed] ->
        {:ok, membership}

      {:ok, membership} ->
        :ok = revoke_open_grants(call_id, actor.player_id, "left")
        set_state(membership, :left)

      other ->
        other
    end
  end

  def remove_participant(input, context) do
    actor = actor!(input, context)
    call_id = input.arguments.call_id
    target = input.arguments.player_id

    with {:ok, call} <- get_call(call_id),
         :ok <- require_can_remove(actor, call) do
      case get_membership(call_id, target) do
        {:ok, nil} ->
          {:error, Error.NotMember.exception(call_id: call_id)}

        {:ok, %{state: :removed} = membership} ->
          {:ok, membership}

        {:ok, membership} ->
          :ok = revoke_open_grants(call_id, target, "removed")
          set_state(membership, :removed)

        other ->
          other
      end
    end
  end

  def close_call(input, context) do
    actor = actor!(input, context)
    call_id = input.arguments.call_id

    with {:ok, call} <- get_call(call_id),
         :ok <- require_can_remove(actor, call) do
      if call.status == :ended do
        {:ok, call}
      else
        now = DateTime.utc_now()

        CallMembership
        |> Ash.Query.filter(call_id == ^call_id and state == :joined)
        |> Ash.read!(authorize?: false)
        |> Enum.each(fn m ->
          :ok = revoke_open_grants(call_id, m.player_id, "call_closed")
          {:ok, _} = set_state(m, :left)
        end)

        MediaGrant
        |> Ash.Query.filter(call_id == ^call_id and is_nil(revoked_at))
        |> Ash.read!(authorize?: false)
        |> Enum.each(fn g -> {:ok, _} = mark_revoked(g, "call_closed") end)

        {:ok, %Postgrex.Result{}} =
          Repo.query(
            "UPDATE calls SET status = 'ended', ended_at = $2, worker_id = NULL, updated_at = $2 WHERE id = $1",
            [dump_uuid!(call.id), now]
          )

        Ash.get(Call, call.id, authorize?: false)
      end
    end
  end

  defp admit(call, player_id, existing) do
    joined = joined_count(call.id)

    if joined >= call.max_participants do
      {:error, Error.CapacityExceeded.exception(max_participants: call.max_participants)}
    else
      now = DateTime.utc_now()

      attrs = %{
        call_id: call.id,
        player_id: player_id,
        state: :joined,
        joined_at: now,
        left_at: nil
      }

      case existing do
        nil ->
          CallMembership
          |> Ash.Changeset.for_create(:record, attrs)
          |> Ash.create(authorize?: false)

        membership ->
          membership
          |> Ash.Changeset.for_update(:set_state, %{state: :joined, left_at: nil})
          |> Ash.Changeset.force_change_attribute(:joined_at, now)
          |> Ash.update(authorize?: false)
      end
    end
  end

  defp create_grant(call, player_id, perms) do
    now = DateTime.utc_now()
    expires = DateTime.add(now, Feature.grant_ttl_secs(), :second)

    result =
      MediaGrant
      |> Ash.Changeset.for_create(:record, %{
        call_id: call.id,
        player_id: player_id,
        worker_id: call.worker_id,
        can_publish_audio: perms.audio,
        can_publish_video: perms.video,
        can_publish_screen: perms.screen,
        issued_at: now,
        expires_at: expires
      })
      |> Ash.create(authorize?: false)

    case result do
      {:ok, grant} ->
        token = Grants.sign(grant)
        {:ok, %{grant: grant, token: token, expires_at: grant.expires_at}}

      other ->
        other
    end
  end

  defp perms(args, call) do
    %{
      audio: Map.get(args, :can_publish_audio, true),
      video: Map.get(args, :can_publish_video, call.mode == :camera),
      screen: Map.get(args, :can_publish_screen, false)
    }
  end

  defp default_perms(call), do: %{audio: true, video: call.mode == :camera, screen: false}

  defp last_perms(call_id, player_id) do
    MediaGrant
    |> Ash.Query.filter(call_id == ^call_id and player_id == ^player_id)
    |> Ash.Query.sort(issued_at: :desc)
    |> Ash.Query.limit(1)
    |> Ash.read_one!(authorize?: false)
    |> case do
      nil ->
        nil

      g ->
        %{audio: g.can_publish_audio, video: g.can_publish_video, screen: g.can_publish_screen}
    end
  end

  defp revoke_open_grants(call_id, player_id, reason) do
    MediaGrant
    |> Ash.Query.filter(call_id == ^call_id and player_id == ^player_id and is_nil(revoked_at))
    |> Ash.read!(authorize?: false)
    |> Enum.each(fn g -> {:ok, _} = mark_revoked(g, reason) end)

    :ok
  end

  defp mark_revoked(%{revoked_at: t} = grant, _reason) when not is_nil(t), do: {:ok, grant}

  defp mark_revoked(grant, reason) do
    grant
    |> Ash.Changeset.for_update(:mark_revoked, %{
      revoked_at: DateTime.utc_now(),
      revoke_reason: reason
    })
    |> Ash.update(authorize?: false)
  end

  defp set_state(membership, state) do
    left_at = if state == :joined, do: nil, else: DateTime.utc_now()

    membership
    |> Ash.Changeset.for_update(:set_state, %{state: state, left_at: left_at})
    |> Ash.update(authorize?: false)
  end

  defp require_joined(call_id, player_id) do
    case get_membership(call_id, player_id) do
      {:ok, %{state: :joined} = m} -> {:ok, m}
      {:ok, %{state: :removed}} -> {:error, Error.Removed.exception(call_id: call_id)}
      _ -> {:error, Error.NotMember.exception(call_id: call_id)}
    end
  end

  defp get_membership(call_id, player_id) do
    CallMembership
    |> Ash.Query.filter(call_id == ^call_id and player_id == ^player_id)
    |> Ash.read_one(authorize?: false)
  end

  defp get_call(call_id), do: Ash.get(Call, call_id, authorize?: false)

  defp lock_call(call_id) do
    {:ok, uuid} = dump_uuid(call_id)
    {:ok, %Postgrex.Result{}} = Repo.query("SELECT id FROM calls WHERE id = $1 FOR UPDATE", [uuid])
    get_call(call_id)
  end

  defp joined_count(call_id) do
    CallMembership
    |> Ash.Query.filter(call_id == ^call_id and state == :joined)
    |> Ash.read!(authorize?: false)
    |> length()
  end

  defp require_active(%{status: :active}), do: :ok
  defp require_active(call), do: {:error, Error.CallClosed.exception(call_id: call.id)}

  defp require_worker(%{worker_id: id}) when is_binary(id) and id != "", do: :ok
  defp require_worker(call), do: {:error, Error.NoWorker.exception(call_id: call.id)}

  defp require_can_remove(actor, call) do
    if actor.player_id == call.created_by_id or actor.moderator? == true do
      :ok
    else
      {:error, Error.NotMember.exception(call_id: call.id)}
    end
  end

  defp creator_or_mod?(actor, call_id) do
    case get_call(call_id) do
      {:ok, call} -> actor.player_id == call.created_by_id or actor.moderator? == true
      _ -> false
    end
  end

  defp actor!(_input, context) do
    context.actor || raise "conferencing action requires an actor"
  end

  defp dump_uuid!(id) do
    {:ok, bin} = dump_uuid(id)
    bin
  end

  defp dump_uuid(id) when is_binary(id) do
    case Ecto.UUID.dump(id) do
      {:ok, bin} -> {:ok, bin}
      :error -> {:error, :invalid_uuid}
    end
  end
end
