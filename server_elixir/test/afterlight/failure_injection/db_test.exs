defmodule Afterlight.FailureInjection.DbTest do
  @moduledoc """
  P10 §5.2 — DB unavailable and DB slow simulation.
  """
  use Afterlight.DataCase, async: false

  alias Afterlight.Accounts
  alias Afterlight.Accounts.Actor
  alias Afterlight.FailureInjection
  alias Afterlight.Gateway.Auth

  @moduletag :failure_injection

  setup do
    FailureInjection.clear!()
    :ok
  end

  defp actor_for(guest_id) do
    {token, claims} =
      with {:ok, issued} <- Auth.issue(guest_id, nil),
           {:ok, claims} <- Auth.verify(issued.token) do
        {issued.token, claims}
      end

    {:ok, %{player: player, session: session}} = Accounts.create_guest_session(token, claims)
    Actor.session(player.id, session.id, session.token_hash)
  end

  test "DB unavailable: durable idempotent path fails closed without applying" do
    FailureInjection.put!(%{db: :unavailable})
    actor = actor_for("guest_fi_db_off")

    result =
      FailureInjection.maybe_simulate_db(fn ->
        Accounts.run_idempotent(actor, "req-db-off", %{op: :buy}, fn -> {:ok, :coins} end)
      end)

    assert result == {:error, :db_unavailable}

    FailureInjection.clear!()

    assert {:ok, {:applied, :coins}} =
             Accounts.run_idempotent(actor, "req-db-off", %{op: :buy}, fn -> {:ok, :coins} end)
  end

  test "DB slow: simulated delay precedes execution; overload hook records wait" do
    FailureInjection.put!(%{db: {:slow, 50}})
    actor = actor_for("guest_fi_db_slow")
    t0 = System.monotonic_time(:millisecond)

    assert {:ok, {:applied, :once}} =
             FailureInjection.maybe_simulate_db(fn ->
               Accounts.run_idempotent(actor, "req-slow", %{n: 1}, fn -> {:ok, :once} end)
             end)

    elapsed = System.monotonic_time(:millisecond) - t0
    assert elapsed >= 45
  end
end
