defmodule AfterlightWeb.GameChannelTheaterTest do
  @moduledoc """
  fix-theater-streaming-after-elixir-cutover task 2.4: the stale-live-item
  self-heal contract at the channel level. A player who joins a theater
  whose live item was last updated far earlier than the item's duration
  receives a past-end snapshot; the client heals by reporting `ended`
  once. These tests pin the server side of that handshake: the join
  snapshot carries the stale live item, one `ended` advances exactly one
  step, duplicate/racing `ended` reports collapse to a single advance
  (never duplicate or resurrect), and the bill drains to a clean idle.

  Assertions are state-based (the authoritative PG snapshot, polled until
  the commit lands) because the supervised OutboxRelay drains its 1 s tick
  concurrently with the test; broadcast delivery itself is covered by the
  outbox relay tests.
  """

  use Afterlight.DataCase, async: false

  import Phoenix.ChannelTest

  require Ash.Query

  @endpoint AfterlightWeb.Endpoint

  alias Afterlight.Theater

  @theater_routing %{
    "join_room" => :phoenix,
    "movement" => :phoenix,
    "emote" => :phoenix,
    "theater_queue" => :phoenix,
    "theater_control" => :phoenix,
    "theater_channel" => :phoenix
  }

  @youtube "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  @hours_12 12 * 60 * 60 * 1_000

  setup do
    GatewayTest.FakeCore.set_owner(self())

    # The theater domain runtime: OutboxRelay, SessionTracker (the control
    # op generation guard), and friends.
    start_supervised!(Afterlight.Theater.Supervisor)

    # Deterministic bill (see Afterlight.Theater.DomainTest): the shared
    # test DB may carry non-sandbox theater rows.
    Afterlight.Repo.delete_all(from(ti in "theater_items"))
    Afterlight.Repo.delete_all(from(tr in "theater_rooms"))

    :ok
  end

  defp flipped(fun), do: GatewayTest.ConfigLock.with_lock(:routing, @theater_routing, fun)

  defp connect_and_join_theater(guest_id) do
    {:ok, %{token: token}} = Afterlight.Gateway.Auth.issue(guest_id, nil)

    assert {:ok, socket} = connect(AfterlightWeb.UserSocket, %{"token" => token})
    assert {:ok, _, socket} = subscribe_and_join(socket, AfterlightWeb.GameChannel, "game:v1")
    Process.unlink(socket.channel_pid)

    push(socket, "hello", %{"guestId" => guest_id})
    assert_receive {:fake_frame, _up, _hello_json}, 1_000

    push(socket, "join_room", %{"roomId" => "theater"})

    # Join choreography: roster, shadow forward, then the Phoenix theater
    # join snapshot — the one the client's past-end math runs against.
    assert_push "presence_update", _roster
    assert_receive {:fake_frame, _up, _join_json}, 1_000
    assert_push "theater_state", %{"theater" => snapshot, "serverNow" => server_now}

    {socket, snapshot, server_now}
  end

  # Faithful stale fixture: a live item last touched half a day ago. The
  # client computes position = positionSec + (serverNow - updatedAt)/1000
  # and, for any normal video duration, reports `ended` for this id.
  defp stale_live_item(item_id) do
    old = System.system_time(:millisecond) - @hours_12

    Afterlight.Repo.update_all(
      from(i in "theater_items", where: i.id == ^item_id),
      set: [updated_at: old]
    )

    old
  end

  defp bill_a_now_b_queued do
    assert {:ok, _} =
             Theater.apply_action("theater", %{"op" => "add", "url" => @youtube, "title" => "Stale A"}, "TheaterA")

    assert {:ok, _} =
             Theater.apply_action("theater", %{"op" => "add", "url" => @youtube, "title" => "Queued B"}, "TheaterB")

    # "Stale A" is the live item; find its id from the authoritative snapshot.
    %{"now" => %{"id" => stale_id}} = Theater.snapshot("theater")
    {stale_id, stale_live_item(stale_id)}
  end

  # Waits until the authoritative snapshot satisfies `matcher` (a commit
  # may land a moment after push/3 returns), then returns the snapshot.
  defp eventually_snapshot(matcher, tries \\ 200)

  defp eventually_snapshot(_matcher, 0), do: flunk("theater snapshot never matched")

  defp eventually_snapshot(matcher, tries) do
    snapshot = Theater.snapshot("theater")

    if matcher.(snapshot) do
      snapshot
    else
      Process.sleep(10)
      eventually_snapshot(matcher, tries - 1)
    end
  end

  @advanced_to_b %{"now" => %{"title" => "Queued B"}, "queue" => []}

  test "join snapshot carries the stale live item; one ended advances exactly once" do
    flipped(fn ->
      {stale_id, _old} = bill_a_now_b_queued()
      {socket, snapshot, _now} = connect_and_join_theater("guest_theater_heal1")

      assert %{"now" => %{"id" => ^stale_id}, "queue" => [_queued_b]} = snapshot

      push(socket, "theater_control", %{"op" => "ended", "itemId" => stale_id})

      # Exactly one advance: the next queued item is live, queue empty.
      assert @advanced_to_b = eventually_snapshot(&match?(@advanced_to_b, &1))

      # A duplicate ended for the same item must not advance again: it is
      # refused and the bill is unchanged (no resurrection, no duplicate).
      push(socket, "theater_control", %{"op" => "ended", "itemId" => stale_id})
      assert_push "error", %{"message" => message} when is_binary(message) and message != ""
      assert %{"now" => %{"title" => "Queued B"}, "queue" => []} = Theater.snapshot("theater")
    end)
  end

  test "two occupants reporting the same stale item collapse to one advance" do
    flipped(fn ->
      {stale_id, _old} = bill_a_now_b_queued()
      {socket_a, _, _} = connect_and_join_theater("guest_theater_heal2a")
      {socket_b, _, _} = connect_and_join_theater("guest_theater_heal2b")

      # Both clients independently report the same past-end item (the
      # real-world race when a room fills with fresh joiners).
      push(socket_a, "theater_control", %{"op" => "ended", "itemId" => stale_id})
      push(socket_b, "theater_control", %{"op" => "ended", "itemId" => stale_id})

      # Exactly one advance happened for the whole room: B is live once,
      # the queue is empty, and nothing was duplicated or resurrected.
      assert @advanced_to_b = eventually_snapshot(&match?(@advanced_to_b, &1))
    end)
  end

  test "draining a stale bill ends at a clean idle" do
    flipped(fn ->
      {stale_id, _old} = bill_a_now_b_queued()
      {socket, _, _} = connect_and_join_theater("guest_theater_heal3")

      push(socket, "theater_control", %{"op" => "ended", "itemId" => stale_id})

      %{"now" => %{"id" => b_id}} =
        eventually_snapshot(&match?(%{"now" => %{"title" => "Queued B"}}, &1))

      push(socket, "theater_control", %{"op" => "ended", "itemId" => b_id})

      # Idle: empty bill, and further ended reports are refused, not looping.
      assert %{"now" => nil, "queue" => []} =
               eventually_snapshot(&match?(%{"now" => nil, "queue" => []}, &1))

      push(socket, "theater_control", %{"op" => "ended", "itemId" => b_id})
      assert_push "error", %{"message" => message} when is_binary(message) and message != ""
      assert %{"now" => nil, "queue" => []} = Theater.snapshot("theater")
    end)
  end
end
