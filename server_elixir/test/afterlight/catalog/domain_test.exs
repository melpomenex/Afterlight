defmodule Afterlight.Catalog.DomainTest do
  use Afterlight.DataCase, async: true

  alias Afterlight.Catalog
  alias Afterlight.Catalog.{Errors, Model, Snapshot}
  alias Afterlight.Repo

  setup do
    Ecto.Adapters.SQL.query!(
      Repo,
      "TRUNCATE playlist_channels, playlist_lists, epg_programmes, epg_channels, epg_guides RESTART IDENTITY CASCADE",
      []
    )

    :ok
  end

  @playlist """
  #EXTM3U
  #EXTINF:-1 tvg-id="news1",News One
  http://example.com/news.m3u8
  #EXTINF:-1,Backup
  https://cdn.example.com/live/stream
  """

  test "add_playlist enforces caps and persists channels" do
    {:ok, list} = Catalog.add_playlist(%{"name" => "Courtyard", "text" => @playlist, "addedBy" => "Kiln"})

    assert list["name"] == "Courtyard"
    assert length(list["channels"]) == 2

    channels = Catalog.list_channels(list["id"])
    assert length(channels) == 2
    assert Enum.at(channels, 0)["url"] == "http://example.com/news.m3u8"
    assert Enum.at(channels, 0)["tvgId"] == "news1"
  end

  test "add_playlist rejects invalid text" do
    assert {:error, "not_a_playlist"} = Catalog.add_playlist(%{"text" => "nope", "addedBy" => "Kiln"})
    assert {:error, "no_channels"} = Catalog.add_playlist(%{"text" => "#EXTM3U\n", "addedBy" => "Kiln"})
  end

  test "lists_max trips too_many_lists" do
    for i <- 1..Model.lists_max() do
      {:ok, _} =
        Catalog.add_playlist(%{
          "name" => "List #{i}",
          "text" => @playlist,
          "addedBy" => "Kiln"
        })
    end

    assert {:error, "too_many_lists"} =
             Catalog.add_playlist(%{"name" => "Overflow", "text" => @playlist, "addedBy" => "Kiln"})
  end

  test "remove_list deletes rows and rejects missing list" do
    {:ok, list} = Catalog.add_playlist(%{"name" => "Temp", "text" => @playlist, "addedBy" => "Kiln"})
    assert :ok = Catalog.remove_list(list["id"])
    assert {:error, "list_not_found"} = Catalog.remove_list(list["id"])
  end

  test "snapshot stays metadata-only" do
    {:ok, list} = Catalog.add_playlist(%{"name" => "Meta", "text" => @playlist, "addedBy" => "Kiln"})
    snap = Snapshot.build()

    assert [%{"id" => id, "name" => "Meta", "channelCount" => 2}] = snap["lists"]
    assert id == list["id"]
    refute Map.has_key?(Enum.at(snap["lists"], 0), "channels")
  end

  test "epg lookup returns now/next entries" do
    now = 1_700_000_000_000

    {:ok, _} =
      Catalog.set_epg(%{
        name: "Guide",
        channels: %{
          "ch1" => %{"names" => ["News One"], "icon" => nil}
        },
        programmes: %{
          "ch1" => [
            [now - 3_600_000, now + 3_600_000, "Live bulletin", "Subtitle"],
            [now + 3_600_000, now + 7_200_000, "Next hour"]
          ]
        }
      })

    [entry] = Catalog.lookup_epg(["News One"], now)
    assert entry["key"] == "News One"
    assert entry["now"]["title"] == "Live bulletin"
    assert entry["next"]["title"] == "Next hour"
  end

  test "error strings match Node reasons" do
    assert Errors.text("too_many_lists") =~ "24 lists"
    assert Errors.text("text_too_large") =~ "too large"
    assert Errors.text("list_not_found") =~ "no longer"
  end
end
