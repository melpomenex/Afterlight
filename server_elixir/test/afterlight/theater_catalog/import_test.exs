defmodule Afterlight.TheaterCatalog.ImportTest do
  use Afterlight.DataCase, async: false

  alias Afterlight.Catalog.Import, as: CatalogImport
  alias Afterlight.Theater.Import, as: TheaterImport

  defp tmp_dir do
    Path.join(System.tmp_dir!(), "al-tc-import-#{System.unique_integer([:positive])}")
  end

  test "theater idle import is idempotent" do
    dir = tmp_dir()
    File.mkdir_p!(dir)
    path = Path.join(dir, "game-state.json")

    File.write!(
      path,
      Jason.encode!(%{
        "version" => 1,
        "players" => %{},
        "theater" => %{"now" => nil, "queue" => []}
      })
    )

    assert {:ok, :imported, meta} = TheaterImport.run(path)
    assert meta.idle == true
    assert {:ok, :identical, meta2} = TheaterImport.run(path)
    assert meta2.hash == meta.hash
  end

  test "iptv import validates counts" do
    dir = tmp_dir()
    File.mkdir_p!(dir)
    path = Path.join(dir, "iptv.json")

    payload = %{
      "lists" => [
        %{
          "id" => "iptv_test1",
          "name" => "Test",
          "addedBy" => "Someone",
          "addedAt" => 1,
          "channels" => [
            %{
              "url" => "https://example.com/one.m3u8",
              "name" => "One",
              "group" => "G",
              "logo" => nil,
              "tvgId" => "one"
            }
          ]
        }
      ]
    }

    File.write!(path, Jason.encode!(payload))

    assert {:ok, :imported, meta} = CatalogImport.run_iptv(path)
    assert meta.lists == 1
    assert meta.channels == 1
    assert {:ok, :identical, _} = CatalogImport.run_iptv(path)
  end

  test "epg import with first-wins dedup" do
    dir = tmp_dir()
    File.mkdir_p!(dir)
    path = Path.join(dir, "epg.json")

    payload = %{
      "name" => "Guide",
      "updatedAt" => 1000,
      "channels" => %{
        "ch1" => %{"names" => ["Channel 1"], "icon" => nil}
      },
      "programmes" => %{
        "ch1" => [
          [1000, 2000, "Show A"],
          [1000, 3000, "Duplicate start"]
        ]
      }
    }

    File.write!(path, Jason.encode!(payload))

    assert {:ok, :imported, meta} = CatalogImport.run_epg(path)
    assert meta.channels == 1
    assert meta.programme_channels == 1
  end

  test "normalize_theater_state repair on import" do
    dir = tmp_dir()
    File.mkdir_p!(dir)
    path = Path.join(dir, "game-state.json")

    File.write!(
      path,
      Jason.encode!(%{
        "theater" => %{
          "now" => %{
            "url" => "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "title" => "  Rick  ",
            "playing" => true,
            "positionSec" => 0,
            "updatedAt" => 1_700_000_000_000,
            "by" => "Tester",
            "queuedBy" => "Tester"
          },
          "queue" => [
            %{
              "url" => "not-a-url",
              "title" => "Bad"
            },
            %{
              "url" => "https://www.youtube.com/watch?v=9bZkp7q19f0",
              "title" => "Gangnam",
              "queuedBy" => "Tester"
            }
          ]
        }
      })
    )

    assert {:ok, :imported, meta} = TheaterImport.run(path)
    assert meta.now == 1
    assert meta.queue == 1
  end
end
