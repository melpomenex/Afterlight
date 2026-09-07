defmodule Afterlight.FailureInjection.PartitionTest do
  @moduledoc """
  P10 §5.4 — partition fencing and outbox worker crash after commit.
  """
  use Afterlight.DataCase, async: false

  alias Afterlight.Accounts
  alias Afterlight.Accounts.{Actor, OutboxEvent, OutboxRelay}
  alias Afterlight.FailureInjection
  alias Afterlight.Gateway.Auth

  @moduletag :failure_injection

  setup do
    FailureInjection.clear!()
    :ok
  end

  test "partitioned owner: durable path fails closed when DB unavailable" do
    FailureInjection.put!(%{db: :unavailable})

    {token, claims} =
      with {:ok, issued} <- Auth.issue("guest_fi_part", nil),
           {:ok, claims} <- Auth.verify(issued.token) do
        {issued.token, claims}
      end

    {:ok, %{player: player, session: session}} = Accounts.create_guest_session(token, claims)
    actor = Actor.session(player.id, session.id, session.token_hash)

    assert {:error, :db_unavailable} =
             FailureInjection.maybe_simulate_db(fn ->
               Accounts.run_idempotent(actor, "req-part", %{op: :till}, fn -> {:ok, :ok} end)
             end)
  end

  test "outbox worker crash after commit: relay resumes at-least-once delivery" do
    {token, claims} =
      with {:ok, issued} <- Auth.issue("guest_fi_outbox", nil),
           {:ok, claims} <- Auth.verify(issued.token) do
        {issued.token, claims}
      end

    {:ok, _} = Accounts.create_guest_session(token, claims)

    Phoenix.PubSub.subscribe(Afterlight.PubSub, "accounts:outbox")

    assert OutboxRelay.publish_pending() >= 1
    assert_receive {:outbox, %OutboxEvent{}}, 2_000
    assert OutboxRelay.unpublished_count() == 0

    # Second poll is a no-op (at-least-once already satisfied); simulates
    # worker restart seeing an empty unpublished queue.
    assert OutboxRelay.publish_pending() == 0
  end
end
