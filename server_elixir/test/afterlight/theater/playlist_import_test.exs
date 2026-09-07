defmodule Afterlight.Theater.PlaylistImportTest do
  use ExUnit.Case, async: true

  alias Afterlight.Theater.{PlaylistImport, Reducer}

  @videos [
    %{"videoId" => "dQw4w9WgXcQ", "title" => "One"},
    %{"videoId" => "9bZkp7q19f0", "title" => "Two"}
  ]

  test "preview_import_result full fit on idle screen" do
    state = Reducer.create_state()

    assert {:ok, report} = PlaylistImport.preview_import_result(state, @videos, "Tester")
    assert report["queued"] == 2
    assert report["skipped"] == 0
    assert report["didNotFit"] == 0
  end

  test "preview_import_result partial fit against queue cap" do
    queue =
      for i <- 1..49 do
        %{
          "id" => "itm_q#{i}",
          "kind" => "youtube",
          "url" => "https://www.youtube.com/watch?v=vid#{i}",
          "title" => "Q#{i}",
          "queuedBy" => "Someone"
        }
      end

    now = %{
      "id" => "itm_now",
      "kind" => "youtube",
      "url" => "https://www.youtube.com/watch?v=now1",
      "title" => "Now",
      "playing" => true,
      "positionSec" => 0,
      "updatedAt" => 1,
      "by" => "Someone",
      "queuedBy" => "Someone"
    }

    state = %{"now" => now, "queue" => queue}

    assert {:ok, report} = PlaylistImport.preview_import_result(state, @videos, "Tester")
    assert report["queued"] == 1
    assert report["skipped"] == 0
    assert report["didNotFit"] == 1
  end

  test "stage and confirm preview" do
    room = "theater"
    request_id = "plreq_test1"

    {:ok, payload} =
      PlaylistImport.stage_resolved(room, request_id, "player1", "Test list", @videos)

    assert payload["requestId"] == request_id
    assert payload["title"] == "Test list"
    assert length(payload["videos"]) == 2

    assert {:ok, report} =
             PlaylistImport.confirm_preview(room, request_id, Reducer.create_state(), "Tester")

    assert report["queued"] == 2
  end

  test "import_result_payload uses camelCase wire keys" do
    payload = PlaylistImport.import_result_payload(%{"queued" => 3, "skipped" => 1, "didNotFit" => 2})

    assert payload == %{"queued" => 3, "skipped" => 1, "didNotFit" => 2}
  end
end
