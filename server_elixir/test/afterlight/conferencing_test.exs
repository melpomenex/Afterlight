defmodule Afterlight.ConferencingTest do
  use ExUnit.Case, async: false

  alias Afterlight.Conferencing
  alias Afterlight.Conferencing.Grants
  alias Afterlight.Repo
  import Ecto.Query

  setup do
    # Explicitly check out Sandbox connection
    :ok = Ecto.Adapters.SQL.Sandbox.checkout(Repo)
    Ecto.Adapters.SQL.Sandbox.mode(Repo, {:shared, self()})
    :ok
  end

  describe "capacity boundary" do
    test "8th participant is admitted, 9th is rejected with :capacity_exceeded" do
      room = "test_room_capacity_#{System.unique_integer([:positive])}"

      # 1 to 8 join successfully
      results =
        for i <- 1..8 do
          player_id = "player_#{i}"
          Conferencing.authorize_join(room, player_id, max_participants: 8)
        end

      for {res, idx} <- Enum.with_index(results, 1) do
        assert {:ok, %{membership: mem, token: token}} = res
        assert mem.state == :joined
        assert is_binary(token)
      end

      # 9th join attempts to join and is rejected
      ninth = Conferencing.authorize_join(room, "player_9", max_participants: 8)
      assert {:error, :capacity_exceeded} = ninth

      # Existing participant can re-join without consuming extra capacity
      assert {:ok, %{membership: mem}} = Conferencing.authorize_join(room, "player_1", max_participants: 8)
      assert mem.state == :joined
    end
  end

  describe "grant binding fields enforced" do
    test "tokens carry and bind all required fields, and worker verification catches tampering" do
      room = "test_room_binding_#{System.unique_integer([:positive])}"
      player_id = "player_alice"

      {:ok, %{call: call, grant: grant, token: token}} =
        Conferencing.authorize_join(room, player_id,
          worker_id: "worker-west-1",
          can_publish_audio: true,
          can_publish_video: false,
          can_publish_screen: false
        )

      assert {:ok, claims} = Grants.verify_grant_signature(token)
      assert claims["player_id"] == player_id
      assert claims["call_id"] == to_string(call.id)
      assert claims["worker_id"] == "worker-west-1"
      assert claims["can_publish_audio"] == true
      assert claims["can_publish_video"] == false
      assert claims["can_publish_screen"] == false
      assert claims["jti"] == grant.jti

      # Tampered signature is rejected
      tampered_token = token <> "corrupted"
      assert {:error, :invalid_signature} = Grants.verify_grant_signature(tampered_token)

      # Tampered claims are rejected
      [h, _p, s] = String.split(token, ".")
      forged_claims = Map.put(claims, "can_publish_video", true)
      forged_payload = Base.url_encode64(Jason.encode!(forged_claims), padding: false)
      forged_token = h <> "." <> forged_payload <> "." <> s
      assert {:error, :invalid_signature} = Grants.verify_grant_signature(forged_token)
    end
  end

  describe "expiry honored" do
    test "expired grant is rejected by signature and DB validity check" do
      room = "test_room_exp_#{System.unique_integer([:positive])}"
      player_id = "player_bob"

      # Issue grant with negative TTL (already expired)
      {:ok, %{call: call}} = Conferencing.authorize_join(room, player_id)
      {:ok, %{grant: grant, token: token}} =
        Conferencing.issue_media_grant(call.id, player_id, "worker-1", ttl: -20)

      assert {:error, :grant_expired} = Grants.verify_grant_signature(token)
      assert {:error, :grant_expired} = Conferencing.check_grant_validity(grant.jti)
    end
  end

  describe "revocation recorded" do
    test "revoking a grant records timestamp, reason, and blocks validity check" do
      room = "test_room_rev_#{System.unique_integer([:positive])}"
      player_id = "player_charlie"

      {:ok, %{grant: grant, token: token}} = Conferencing.authorize_join(room, player_id)

      # Initially valid
      assert :ok = Conferencing.check_grant_validity(grant.jti)

      # Revoke grant
      {:ok, revoked_grant} = Conferencing.revoke_grant(grant.jti, "moderator_action")
      assert not is_nil(revoked_grant.revoked_at)
      assert revoked_grant.revoke_reason == "moderator_action"

      # Worker validity check fails
      assert {:error, {:grant_revoked, "moderator_action"}} = Conferencing.check_grant_validity(grant.jti)

      # Removing participant also revokes active grants
      {:ok, %{call: call}} = Conferencing.authorize_join(room, "player_david")
      {:ok, %{grant: grant_d}} = Conferencing.issue_media_grant(call.id, "player_david", "worker-1")
      assert :ok = Conferencing.check_grant_validity(grant_d.jti)

      {:ok, mem} = Conferencing.remove_participant(call.id, "player_david", "removed_by_mod")
      assert mem.state == :removed
      assert {:error, {:grant_revoked, "removed_by_mod"}} = Conferencing.check_grant_validity(grant_d.jti)
    end
  end

  describe "leave/close idempotency" do
    test "multiple leaves and closes succeed idempotently" do
      room = "test_room_idem_#{System.unique_integer([:positive])}"
      {:ok, %{call: call}} = Conferencing.authorize_join(room, "player_eve")

      # First leave
      assert {:ok, %{state: :left}} = Conferencing.leave_call(call.id, "player_eve")
      # Second leave is idempotent
      assert {:ok, :already_left} = Conferencing.leave_call(call.id, "player_eve")

      # First close
      assert {:ok, %{status: :ended}} = Conferencing.close_call(call.id)
      # Second close is idempotent
      assert {:ok, %{status: :ended}} = Conferencing.close_call(call.id)
    end
  end

  describe "no grant tokens in any persisted column" do
    test "grant bearer token strings are never written to any database table" do
      room = "test_room_sec_#{System.unique_integer([:positive])}"
      player_id = "player_frank"

      {:ok, %{token: token}} = Conferencing.authorize_join(room, player_id)

      # Inspect calls table
      calls = Repo.all(from c in "calls", select: map(c, [:id, :room_key, :mode, :status, :worker_id, :created_by]))
      for c <- calls, {_k, v} <- c do
        refute v == token
        refute is_binary(v) and String.contains?(v, token)
      end

      # Inspect call_memberships table
      memberships = Repo.all(from m in "call_memberships", select: map(m, [:id, :call_id, :player_id, :state]))
      for m <- memberships, {_k, v} <- m do
        refute v == token
        refute is_binary(v) and String.contains?(v, token)
      end

      # Inspect media_grants table
      grants = Repo.all(from g in "media_grants", select: map(g, [:id, :jti, :call_id, :player_id, :worker_id, :revoke_reason]))
      for g <- grants, {_k, v} <- g do
        refute v == token
        refute is_binary(v) and String.contains?(v, token)
      end
    end
  end

  describe "grant renewal and sweep" do
    test "renewing grant produces new token while membership holds" do
      room = "test_room_renew_#{System.unique_integer([:positive])}"
      player_id = "player_grace"

      {:ok, %{call: call, grant: g1, token: t1}} = Conferencing.authorize_join(room, player_id)
      {:ok, %{grant: g2, token: t2}} = Conferencing.renew_grant(call.id, player_id)

      assert g1.jti != g2.jti
      assert t1 != t2
      assert :ok = Conferencing.check_grant_validity(g2.jti)

      # Non-member cannot renew
      assert {:error, :not_a_member} = Conferencing.renew_grant(call.id, "non_member")
    end

    test "sweep_expired cleans abandoned calls and marks expired grants" do
      room = "test_room_sweep_#{System.unique_integer([:positive])}"
      {:ok, %{call: call}} = Conferencing.authorize_join(room, "player_heidi")
      Conferencing.leave_call(call.id, "player_heidi")

      sweep_result = Conferencing.sweep_expired()
      assert sweep_result.closed_calls >= 1

      assert {:ok, %{status: :ended}} = Conferencing.get_call(call.id)
    end
  end

  describe "TURN credentials" do
    test "generates short-lived credentials verifiable by TURN server" do
      player_id = "player_iris"
      creds = Grants.issue_turn_credentials(player_id, ttl: 60)

      assert is_binary(creds.username)
      assert is_binary(creds.credential)
      assert is_list(creds.urls)

      assert :ok = Grants.verify_turn_credential(creds.username, creds.credential)

      # Tampered credential rejected
      assert {:error, :invalid_credential} = Grants.verify_turn_credential(creds.username, "bad_cred")

      # Expired credential rejected
      expired_creds = Grants.issue_turn_credentials(player_id, ttl: -10)
      assert {:error, :credential_expired} = Grants.verify_turn_credential(expired_creds.username, expired_creds.credential)
    end
  end
end
