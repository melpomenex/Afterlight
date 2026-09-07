defmodule Afterlight.Theater.RestartTest do
  use Afterlight.DataCase, async: false

  alias Afterlight.Theater
  alias Afterlight.Theater.{Export, SessionTracker, TheaterRoom}

  @room "theater"
  @youtube "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

  setup do
    start_supervised!(Afterlight.Theater.Supervisor)
    :ok
  end

  test "playing item and queue reload from PostgreSQL with revision continuity" do
    assert {:ok, _} =
             Theater.apply_action(@room, %{"op" => "add", "url" => @youtube, "title" => "Now"}, "Player")

    assert {:ok, _} =
             Theater.apply_action(@room, %{"op" => "add", "url" => @youtube, "title" => "Queued"}, "Player")

    room = Ash.get!(TheaterRoom, @room, actor: Afterlight.Accounts.Actor.system(), authorize?: false)
    revision_before = room.revision

    reloaded = Export.load_state()
    assert reloaded["now"]["title"] == "Now"
    assert [%{"title" => "Queued"}] = reloaded["queue"]

    assert {:ok, after_reload} = Theater.apply_action(@room, %{"op" => "pause"}, "Player")
    assert after_reload.revision == revision_before + 1
    assert after_reload.theater["now"]["playing"] == false
    assert is_integer(after_reload.server_now)
  end

  test "stale ended report stays rejected when generation survives reload" do
    assert {:ok, first} =
             Theater.apply_action(@room, %{"op" => "add", "url" => @youtube, "title" => "A"}, "Player")

    item_id = first.theater["now"]["id"]
    session = SessionTracker.session_key("guest_restart", :conn_restart)
    SessionTracker.stamp(session, first.revision, first.now_generation)

    assert {:ok, second} =
             Theater.apply_action(@room, %{"op" => "add", "url" => @youtube, "title" => "B"}, "Player")

    other_id = second.theater["queue"] |> List.first() |> Map.get("id")

    assert {:ok, _} =
             Theater.apply_action(@room, %{"op" => "playNow", "itemId" => other_id}, "Player")

    assert {:ok, third} =
             Theater.apply_action(@room, %{"op" => "playNow", "itemId" => item_id}, "Player")

    assert third.now_generation > first.now_generation

    reloaded = Export.load_state()
    assert reloaded["now"]["id"] == item_id

    assert {:error, "item_mismatch"} =
             Theater.apply_action(
               @room,
               %{"op" => "ended", "itemId" => item_id},
               "Player",
               session_key: session
             )
  end
end
