defmodule Afterlight.Theater.DomainTest do
  use Afterlight.DataCase, async: false

  require Ash.Query

  alias Afterlight.Accounts.{Actor, CommandReceipt, Player}
  alias Afterlight.Theater
  alias Afterlight.Theater.{OutboxRelay, SessionTracker, TheaterRoom}

  @room "theater"
  @youtube "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

  setup do
    start_supervised!(Afterlight.Theater.Supervisor)

    # Deterministic bill: the shared test database may carry theater rows
    # from non-sandbox runs (e.g. the P5 shadow import committed a room at
    # revision 37), while these tests assume a fresh room. Clearing inside
    # the sandbox keeps every test starting from revision 1 without
    # touching data outside the transaction.
    Afterlight.Repo.delete_all(from(ti in "theater_items"))
    Afterlight.Repo.delete_all(from(tr in "theater_rooms"))

    now = Afterlight.Accounts.now_ms()
    actor = Actor.system()

    _ =
      Player
      |> Ash.Changeset.for_create(
        :stub,
        %{id: "guest_rcpt", nickname: "guest_rcpt", last_seen: now},
        actor: actor
      )
      |> Ash.create(authorize?: false)

    :ok
  end

  test "add starts playback on an idle screen and bumps revision" do
    assert {:ok, commit} =
             Theater.apply_action(@room, %{"op" => "add", "url" => @youtube}, "PlayerOne")

    assert commit.revision == 2
    assert is_map(commit.theater["now"])
    assert commit.theater["queue"] == []

    room = Ash.get!(TheaterRoom, @room, actor: Actor.system(), authorize?: false)
    assert room.revision == 2
    assert room.now_item_id == commit.theater["now"]["id"]

    assert OutboxRelay.publish_pending() == 1
  end

  test "queue_full rejects when the queue is at cap" do
    assert {:ok, _} =
             Theater.apply_action(@room, %{"op" => "add", "url" => @youtube, "title" => "Now"}, "PlayerOne")

    items =
      for n <- 1..50 do
        %{"url" => @youtube, "title" => "Video #{n}"}
      end

    assert {:ok, _} =
             Theater.apply_action(@room, %{"op" => "addMany", "items" => items}, "Importer")

    assert {:error, "queue_full"} =
             Theater.apply_action(@room, %{"op" => "add", "url" => @youtube}, "PlayerOne")
  end

  test "stale ended report is rejected after re-promotion" do
    assert {:ok, first} =
             Theater.apply_action(@room, %{"op" => "add", "url" => @youtube, "title" => "A"}, "PlayerOne")

    item_id = first.theater["now"]["id"]
    session = SessionTracker.session_key("guest_a", :conn_a)
    SessionTracker.stamp(session, first.revision, first.now_generation)

    assert {:ok, second} =
             Theater.apply_action(@room, %{"op" => "add", "url" => @youtube, "title" => "B"}, "PlayerOne")

    other_id = second.theater["queue"] |> List.first() |> Map.get("id")

    assert {:ok, _} =
             Theater.apply_action(@room, %{"op" => "playNow", "itemId" => other_id}, "PlayerOne")

    assert {:ok, third} =
             Theater.apply_action(@room, %{"op" => "playNow", "itemId" => item_id}, "PlayerOne")

    assert third.now_generation > first.now_generation

    assert {:error, "item_mismatch"} =
             Theater.apply_action(
               @room,
               %{"op" => "ended", "itemId" => item_id},
               "PlayerOne",
               session_key: session
             )
  end

  test "concurrent commits serialize with strictly increasing revision" do
    parent = self()

    tasks =
      for _ <- 1..4 do
        Task.async(fn ->
          Ecto.Adapters.SQL.Sandbox.allow(Afterlight.Repo, parent, self())
          Theater.apply_action(@room, %{"op" => "add", "url" => @youtube}, "Racer")
        end)
      end

    results = Task.await_many(tasks, 5_000)
    assert Enum.all?(results, &match?({:ok, _}, &1))

    revisions = Enum.map(results, fn {:ok, c} -> c.revision end) |> Enum.sort()
    assert revisions == [2, 3, 4, 5]

    room = Ash.get!(TheaterRoom, @room, actor: Actor.system(), authorize?: false)
    assert room.revision == Enum.max(revisions)
  end

  test "playlist resolve declines mix ids without fetch" do
    ctx = %{
      guest_id: "guest_mix",
      conn_ref: :c1,
      nickname: "Mix",
      world_room: %{wire_id: @room}
    }

    assert {:noreply, [{"error", %{"message" => msg}}]} =
             Theater.Gateway.handle(
               "theater_playlist_resolve",
               %{"requestId" => "req1", "listId" => "RDabc1234567"},
               ctx
             )

    assert msg == Theater.error_text("is_mix")
  end

  test "playlist resolve enforces cooldown" do
    ctx = %{
      guest_id: "guest_cd",
      conn_ref: :c1,
      nickname: "Cool",
      world_room: %{wire_id: @room}
    }

    assert {:noreply, _} =
             Theater.Gateway.handle(
               "theater_playlist_resolve",
               %{"requestId" => "req1", "listId" => "PLabc1234567"},
               ctx
             )

    assert {:noreply, [{"error", %{"message" => msg}}]} =
             Theater.Gateway.handle(
               "theater_playlist_resolve",
               %{"requestId" => "req2", "listId" => "PLabc1234567"},
               ctx
             )

    assert msg == Theater.error_text("resolve_cooldown")
  end

  test "command receipt records server-minted theater ops" do
    receipt = "srv_testreceipt1"

    assert {:ok, _} =
             Theater.apply_action(
               @room,
               %{"op" => "clear"},
               "PlayerOne",
               receipt_id: receipt,
               receipt_actor: "guest_rcpt"
             )

    row =
      CommandReceipt
      |> Ash.Query.filter(actor == ^"guest_rcpt" and request_id == ^receipt)
      |> Ash.read_one!(actor: Actor.system(), authorize?: false)

    assert row.outcome["ok"] == true
  end

  # fix-theater-streaming-after-elixir-cutover D3: the relay's broadcast
  # key must stay pinned to the world runtime's theater wire id. A drift
  # would not error — every live bill broadcast would silently no-op while
  # joins still snapshot, reading to players as "nothing streams".
  test "relay broadcast key is derived from the shared theater wire id" do
    assert OutboxRelay.theater_registry_key() ==
             {Afterlight.World.RoomServer, Afterlight.Specialty.TorrentRules.theater_wire_id()}

    # The client joins the room by this exact id, so the shared definition
    # must keep answering with it.
    assert Afterlight.Specialty.TorrentRules.theater_wire_id() == @room
  end

  test "publish_pending emits a telemetry event per broadcast frame" do
    :ok =
      :telemetry.attach(
        "outbox-relay-test",
        [:afterlight, :theater, :broadcast],
        &__MODULE__.relay_handler/4,
        self()
      )

    assert {:ok, commit} =
             Theater.apply_action(@room, %{"op" => "add", "url" => @youtube}, "PlayerOne")

    assert OutboxRelay.publish_pending() == 1

    assert_receive {:relay_broadcast, %{count: 1}, %{room: @room, revision: revision}}, 1_000
    assert revision == commit.revision

    # A second drain publishes nothing and therefore emits nothing.
    refute OutboxRelay.publish_pending() > 0
    refute_receive {:relay_broadcast, _, _}
  after
    :telemetry.detach("outbox-relay-test")
  end

  # Module-level handler: telemetry warns on anonymous function handlers.
  def relay_handler(_name, measurements, metadata, pid) do
    send(pid, {:relay_broadcast, measurements, metadata})
  end
end
