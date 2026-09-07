defmodule Afterlight.Theater.PlaylistFetchWorkerTest do
  use Afterlight.DataCase, async: false

  alias Afterlight.Theater.{PlaylistFetchWorker, PlaylistPreview}

  test "perform notifies on mix decline without HTTP" do
    Phoenix.PubSub.subscribe(Afterlight.PubSub, "theater:playlist_fetch:theater")

    assert :ok =
             PlaylistFetchWorker.perform(%Oban.Job{
               args: %{
                 "room_key" => "theater",
                 "request_id" => "plreq_mix",
                 "list_id" => "RDmixlist1234",
                 "player_id" => "guest_test"
               }
             })

    assert_receive {:theater_playlist_fetch, "guest_test", {:failed, "is_mix"}}
    assert {:error, _} = PlaylistPreview.get("theater", "plreq_mix")
  end

  test "enqueue inserts a theater_import job" do
    assert {:ok, %Oban.Job{queue: "theater_import"}} =
             PlaylistFetchWorker.enqueue("theater", "plreq1", "PLvalidlist12", "guest1")
  end
end
