defmodule Afterlight.Accounts.DomainTest do
  use Afterlight.DataCase, async: false

  alias Afterlight.Accounts
  alias Afterlight.Accounts.{Actor, CommandReceipt, GuestSession, OutboxEvent, Player, Reaper, OutboxRelay}
  alias Afterlight.Gateway.Auth

  defp issue(guest_id) do
    {:ok, issued} = Auth.issue(guest_id, nil)
    {:ok, claims} = Auth.verify(issued.token)
    {issued.token, claims}
  end

  test "create_guest_session hashes the token and never stores it" do
    {token, claims} = issue("guest_sesshash")
    {:ok, %{session: session}} = Accounts.create_guest_session(token, claims)
    assert session.token_hash == Accounts.token_hash(token)
    refute session.token_hash == token
    refute String.contains?(inspect(session), token)
  end

  test "duplicate connect rebinds one logical session" do
    {token, claims} = issue("guest_rebind1")
    {:ok, first} = Accounts.create_guest_session(token, claims)
    {:ok, second} = Accounts.create_guest_session(token, claims)
    assert first.session.id == second.session.id

    {token2, claims2} = issue("guest_rebind1")
    {:ok, third} = Accounts.create_guest_session(token2, claims2)
    assert third.session.id == first.session.id
    assert third.session.token_hash == Accounts.token_hash(token2)
  end

  test "revoke then expired token is dead; reaper frees nickname slot" do
    {token, claims} = issue("guest_revoke1")
    {:ok, %{session: session, player: player}} = Accounts.create_guest_session(token, claims)
    actor = Actor.session(player.id, session.id, session.token_hash)
    {:ok, _} = Accounts.revoke_session(session, actor)

    {:ok, player} = Ash.get(Player, player.id, actor: Actor.system(), authorize?: false)
    assert player.active == false

    {token2, claims2} = issue("guest_reaper1")
    {:ok, %{session: session2, player: p2}} = Accounts.create_guest_session(token2, claims2)

    session2
    |> Ash.Changeset.for_update(:rebind, %{expires_at: 1}, actor: Actor.system(), authorize?: false)
    |> Ash.update!()

    assert Reaper.sweep(Accounts.now_ms()) >= 1
    {:ok, p2} = Ash.get(Player, p2.id, actor: Actor.system(), authorize?: false)
    assert p2.active == false
  end

  test "policies deny cross-player access" do
    {t1, c1} = issue("guest_pol_a")
    {t2, c2} = issue("guest_pol_b")
    {:ok, a} = Accounts.create_guest_session(t1, c1)
    {:ok, b} = Accounts.create_guest_session(t2, c2)

    actor_a = Actor.session(a.player.id, a.session.id)

    assert {:error, %Ash.Error.Invalid{errors: [%Ash.Error.Query.NotFound{}]}} =
             Ash.get(Player, b.player.id, actor: actor_a)

    assert {:error, _} =
             b.player
             |> Ash.Changeset.for_update(:set_active, %{active: false}, actor: actor_a)
             |> Ash.update()
  end

  test "set_nickname action is forbidden for session actors in P4" do
    {token, claims} = issue("guest_nickpol")
    {:ok, %{player: player, session: session}} = Accounts.create_guest_session(token, claims)
    actor = Actor.session(player.id, session.id)

    assert {:error, %Ash.Error.Forbidden{}} =
             player
             |> Ash.Changeset.for_update(:set_nickname, %{nickname: "MossyRadish"}, actor: actor)
             |> Ash.update()
  end

  test "receipt accept, replay, and payload mismatch" do
    {token, claims} = issue("guest_receipt1")
    {:ok, %{player: player, session: session}} = Accounts.create_guest_session(token, claims)
    actor = Actor.session(player.id, session.id, session.token_hash)
    payload = %{op: :demo, n: 1}

    {:ok, {:applied, :once}} =
      Accounts.run_idempotent(actor, "req-1", payload, fn -> {:ok, :once} end)

    {:ok, {:replay, outcome}} =
      Accounts.run_idempotent(actor, "req-1", payload, fn -> {:ok, :twice} end)

    assert outcome["ok"] == true

    assert {:error, :idempotency_conflict} =
             Accounts.run_idempotent(actor, "req-1", %{op: :demo, n: 2}, fn -> {:ok, :nope} end)
  end

  test "outbox crash-after-commit publishes via relay" do
    {token, claims} = issue("guest_outbox1")
    {:ok, _} = Accounts.create_guest_session(token, claims)

    Phoenix.PubSub.subscribe(Afterlight.PubSub, "accounts:outbox")
    assert OutboxRelay.publish_pending() >= 1
    assert_receive {:outbox, %OutboxEvent{}}, 1_000
    assert OutboxRelay.unpublished_count() == 0
  end

  test "partial unique index allows historical duplicates and blocks active case variants" do
    now = Accounts.now_ms()

    insert_player!("guest_hist_a", "MistyCompass94", false, now)
    insert_player!("guest_hist_b", "MistyCompass94", false, now)

    insert_player!("guest_live_a", "CopperLantern42", true, now)

    assert_raise Postgrex.Error, fn ->
      insert_player!("guest_live_b", "copperlantern42", true, now)
    end
  end

  test "P4 writable player fields are only session-derived active/claimed_at" do
    assert Accounts.p4_writable_player_fields() == [:active, :claimed_at]

    set_nickname = Player |> Ash.Resource.Info.action(:set_nickname)
    set_active = Player |> Ash.Resource.Info.action(:set_active)
    assert set_active.accept == [:active, :claimed_at]
    assert :nickname in set_nickname.accept
  end

  test "no economy write surface exists on Accounts" do
    names = Player |> Ash.Resource.Info.actions() |> Enum.map(& &1.name)
    refute :adjust_balance in names
    refute :adjust_inventory in names
  end

  test "claim window rejects stale unclaimed shadow rows" do
    now = Accounts.now_ms()
    insert_player!("guest_claim1", "OldTimer", false, 1, true)

    %Afterlight.Accounts.SystemImport{
      domain: "players",
      snapshot_sha256: "abc",
      player_count: 1,
      imported_at: 1,
      source_path: "/tmp/x"
    }
    |> Repo.insert!()

    {token, claims} = issue("guest_claim1")

    assert {:error, :claim_window_closed} = Accounts.create_guest_session(token, claims)
  end

  test "claim window binds a recency-fresh shadow row" do
    now = Accounts.now_ms()
    insert_player!("guest_claim2", "StillHere", false, now, true)
    {token, claims} = issue("guest_claim2")
    {:ok, %{player: player}} = Accounts.create_guest_session(token, claims)
    assert player.id == "guest_claim2"
  end

  defp insert_player!(id, nickname, active, last_seen, shadow \\ false) do
    Repo.insert_all("players", [
      %{
        id: id,
        nickname: nickname,
        current_room: "market",
        last_seen: last_seen,
        active: active,
        shadow: shadow,
        claimed_at: nil
      }
    ])
  end
end
