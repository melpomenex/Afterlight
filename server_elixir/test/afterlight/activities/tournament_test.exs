defmodule Afterlight.Activities.TournamentTest do
  use Afterlight.DataCase, async: false

  alias Afterlight.Activities.Tournament
  alias Afterlight.Activities.Tournament.{State, Store}
  alias Afterlight.Repo

  setup do
    unless Process.whereis(Afterlight.Activities.TournamentRegistry) do
      start_supervised!({Registry, keys: :unique, name: Afterlight.Activities.TournamentRegistry})
    end

    Repo.delete_all(Store)
    :ok
  end

  test "a replacement process cancels an unfinished tournament and keeps played matches" do
    room = "theater-tn-#{System.unique_integer([:positive])}"
    {:ok, pid} = start_supervised({Tournament, room_key: room})

    Enum.each(0..3, fn i ->
      assert {:ok, _} =
               Tournament.command(room, %{
                 type: "enroll",
                 player_id: "p#{i}",
                 size: 4,
                 tournament_id: "t_live",
                 display_name: "P#{i}"
               })
    end)

    snap = Tournament.snapshot(room)
    assert snap["status"] == "check_in"
    match = hd(Enum.filter(snap["matches"], &(&1["round"] == 0)))

    assert {:ok, _} = Tournament.command(room, %{type: "check_in", player_id: match["playerA"]})
    assert {:ok, _} = Tournament.command(room, %{type: "check_in", player_id: match["playerB"]})

    assert {:ok, mid} =
             Tournament.command(room, %{
               type: "verified_result",
               match_id: match["id"],
               winner_id: match["playerA"],
               outcome: "completed"
             })

    played = Enum.find(mid["matches"], &(&1["id"] == match["id"]))
    assert played["credited"] == true

    :ok = GenServer.stop(pid)
    {:ok, _pid2} = Tournament.start_link(room_key: room)
    restored = Tournament.snapshot(room)
    assert restored["status"] == "cancelled"
    assert restored["cancelReason"] == "server_restart"
    kept = Enum.find(restored["matches"], &(&1["id"] == match["id"]))
    assert kept["outcome"] == "played"
    assert kept["credited"] == true
  end

  test "boot cancel_unfinished marks persisted in-progress rows cancelled" do
    state = State.idle("room_boot")

    {:ok, enrolling} =
      State.apply_action(state, %{type: "enroll", player_id: "a", size: 4, tournament_id: "t_boot"}, 1)

    Store.persist(enrolling)
    assert Store.load_latest("room_boot").status == "enrolling"
    Store.cancel_unfinished()
    row = Store.load_latest("room_boot")
    assert row.status == "cancelled"
    assert row.cancel_reason == "server_restart"
  end
end
