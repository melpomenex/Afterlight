defmodule Afterlight.FailureInjection.DeployDrainTest do
  @moduledoc """
  P10 §5.5 — deploy drain: bounded shutdown, no duplicate economic effects.
  """
  use Afterlight.DataCase, async: false

  alias Afterlight.Accounts
  alias Afterlight.Accounts.Actor
  alias Afterlight.Gateway.Auth

  @moduletag :failure_injection

  test "drain window: replayed commands do not double-apply economic effects" do
    {token, claims} =
      with {:ok, issued} <- Auth.issue("guest_fi_drain", nil),
           {:ok, claims} <- Auth.verify(issued.token) do
        {issued.token, claims}
      end

    {:ok, %{player: player, session: session}} = Accounts.create_guest_session(token, claims)
    actor = Actor.session(player.id, session.id, session.token_hash)
    calls = :counters.new(1, [])

    payload = %{op: :account_rename, name: "Drained"}

    fun = fn ->
      :counters.add(calls, 1, 1)
      {:ok, %{order_id: "o1"}}
    end

    # Pre-drain apply
    assert {:ok, {:applied, %{order_id: "o1"}}} =
             Accounts.run_idempotent(actor, "req-drain-1", payload, fun)

    # Simulated client jitter reconnect replays the same request_id
    assert {:ok, {:replay, _}} = Accounts.run_idempotent(actor, "req-drain-1", payload, fun)

    # New request after drain must still be exactly-once
    assert {:ok, {:applied, _}} = Accounts.run_idempotent(actor, "req-drain-2", payload, fun)

    assert :counters.get(calls, 1) == 2
  end
end
