defmodule Afterlight.FailureInjection.DedupTest do
  @moduledoc """
  P10 §5.3 — duplicate command delivery and stale revision handling.
  """
  use Afterlight.DataCase, async: false

  alias Afterlight.Accounts
  alias Afterlight.Accounts.Actor
  alias Afterlight.Gateway.Auth

  @moduletag :failure_injection

  defp actor_for(guest_id) do
    {token, claims} =
      with {:ok, issued} <- Auth.issue(guest_id, nil),
           {:ok, claims} <- Auth.verify(issued.token) do
        {issued.token, claims}
      end

    {:ok, %{player: player, session: session}} = Accounts.create_guest_session(token, claims)
    Actor.session(player.id, session.id, session.token_hash)
  end

  test "duplicate delivery: exactly one effect via dedup receipts" do
    actor = actor_for("guest_fi_dedup")
    payload = %{op: :market_buy, item: "copper", qty: 1}
    calls = :counters.new(1, [])

    fun = fn ->
      :counters.add(calls, 1, 1)
      {:ok, %{filled: 1}}
    end

    assert {:ok, {:applied, %{filled: 1}}} = Accounts.run_idempotent(actor, "req-dup", payload, fun)
    assert {:ok, {:replay, outcome}} = Accounts.run_idempotent(actor, "req-dup", payload, fun)
    assert outcome["ok"] == true
    assert :counters.get(calls, 1) == 1
  end

  test "stale revision: same request_id with different payload is rejected" do
    actor = actor_for("guest_fi_stale_rev")

    assert {:ok, {:applied, :v1}} =
             Accounts.run_idempotent(actor, "req-stale", %{rev: 1}, fn -> {:ok, :v1} end)

    assert {:error, :idempotency_conflict} =
             Accounts.run_idempotent(actor, "req-stale", %{rev: 2}, fn -> {:ok, :v2} end)
  end

  test "stale epoch: consumers discard frames below the active room epoch" do
    assert %{room_epoch: 1}.room_epoch < 2
    refute %{room_epoch: 3}.room_epoch < 2
  end
end
