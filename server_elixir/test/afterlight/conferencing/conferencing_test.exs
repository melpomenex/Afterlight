defmodule Afterlight.ConferencingTest do
  use Afterlight.DataCase

  @moduletag :database

  require Ash.Query

  alias Afterlight.Conferencing
  alias Afterlight.Conferencing.{CallMembership, Feature, Grants, MediaGrant, Reaper}
  alias Afterlight.Repo

  defp actor(id, opts \\ []), do: Conferencing.actor(id, Keyword.merge([enabled?: true], opts))

  defp open!(player, attrs \\ %{}) do
    Conferencing.open_call!(
      Map.merge(%{room_key: "theater:1", worker_id: "worker-east-1"}, attrs),
      actor: actor(player)
    )
  end

  test "capacity: 8th join succeeds, 9th is rejected with no membership" do
    call = open!("host")

    for n <- 1..7 do
      {:ok, _} = Conferencing.authorize_join(call.id, actor: actor("p#{n}"))
    end

    assert {:error, error} = Conferencing.authorize_join(call.id, actor: actor("p8"))
    assert Exception.message(error) =~ "capacity"

    count =
      CallMembership
      |> Ash.Query.filter(call_id == ^call.id and state == :joined)
      |> Ash.read!(authorize?: false)
      |> length()

    assert count == 8
    refute Enum.any?(Ash.read!(CallMembership, authorize?: false), &(&1.player_id == "p8"))
  end

  test "issue_media_grant binds call/player/worker/permissions and never persists the token" do
    call = open!("host")
    {:ok, %{grant: grant, token: token}} = Conferencing.issue_media_grant(call.id, actor: actor("host"))

    assert grant.call_id == call.id
    assert grant.player_id == "host"
    assert grant.worker_id == "worker-east-1"
    assert grant.can_publish_audio
    refute Map.has_key?(grant, :token)
    assert is_nil(Map.get(grant, :token, nil))

    {:ok, payload} = Grants.verify(token)
    assert payload["jti"] == grant.id
    assert payload["worker_id"] == "worker-east-1"

    {:ok, %Postgrex.Result{columns: cols, rows: rows}} = Repo.query("SELECT * FROM media_grants")
    refute "token" in cols
    refute Enum.any?(cols, &String.contains?(&1, "token"))

    dumped = Enum.join(List.flatten(rows) |> Enum.map(&to_string/1), " ")
    refute String.contains?(dumped, token)
    refute String.contains?(dumped, Feature.grant_secret())
  end

  test "expiry is honored and revocation is recorded" do
    call = open!("host")
    {:ok, %{grant: grant, token: token}} = Conferencing.issue_media_grant(call.id, actor: actor("host"))

    assert {:error, :expired} = Grants.verify(token, now: DateTime.add(grant.expires_at, 10, :second))

    {:ok, revoked} = Conferencing.revoke_grant(grant.id, actor: actor("host"))
    assert revoked.revoked_at
    assert revoked.revoke_reason == "revoked"
    assert {:error, :revoked} = Grants.live?(token, [revoked.id])

    {:ok, again} = Conferencing.revoke_grant(grant.id, actor: actor("host"))
    assert again.revoked_at == revoked.revoked_at
  end

  test "leave and close are idempotent; close clears worker and memberships" do
    call = open!("host")
    {:ok, _} = Conferencing.authorize_join(call.id, actor: actor("guest"))
    {:ok, left} = Conferencing.leave_call(call.id, actor: actor("guest"))
    {:ok, left2} = Conferencing.leave_call(call.id, actor: actor("guest"))
    assert left.state == :left
    assert left2.state == :left

    {:ok, closed} = Conferencing.close_call(call.id, actor: actor("host"))
    {:ok, closed2} = Conferencing.close_call(call.id, actor: actor("host"))
    assert closed.status == :ended
    assert closed2.status == :ended
    assert is_nil(closed.worker_id)

    host =
      CallMembership
      |> Ash.Query.filter(call_id == ^call.id and player_id == "host")
      |> Ash.read_one!(authorize?: false)
    assert host.state == :left
  end

  test "policies: flag off, non-member room, and moderated actors are forbidden" do
    assert {:error, %Ash.Error.Forbidden{}} =
             Conferencing.open_call(%{room_key: "x"}, actor: actor("h", enabled?: false))

    assert {:error, %Ash.Error.Forbidden{}} =
             Conferencing.open_call(%{room_key: "x"}, actor: actor("h", room_member?: false))

    assert {:error, %Ash.Error.Forbidden{}} =
             Conferencing.open_call(%{room_key: "x"}, actor: actor("h", moderated?: true))
  end

  test "renewal re-issues a token while membership holds; reaper leaves abandoned members" do
    call = open!("host")
    {:ok, first} = Conferencing.issue_media_grant(call.id, actor: actor("host"))
    {:ok, second} = Conferencing.renew_grant(call.id, actor: actor("host"))
    refute first.token == second.token
    assert {:ok, _} = Grants.verify(second.token)

    reloaded = Ash.get!(MediaGrant, first.grant.id, authorize?: false)
    assert reloaded.revoke_reason == "renewed"

    {:ok, _} =
      Repo.query(
        "UPDATE media_grants SET expires_at = $2, revoked_at = NULL, revoke_reason = NULL WHERE id = $1",
        [dump_uuid!(second.grant.id), DateTime.add(DateTime.utc_now(), -120, :second)]
      )

    result = Reaper.sweep(DateTime.utc_now())
    assert result.memberships >= 1

    host =
      CallMembership
      |> Ash.Query.filter(call_id == ^call.id and player_id == "host")
      |> Ash.read_one!(authorize?: false)

    assert host.state == :left
  end

  defp dump_uuid!(id) do
    {:ok, bin} = Ecto.UUID.dump(id)
    bin
  end
end
