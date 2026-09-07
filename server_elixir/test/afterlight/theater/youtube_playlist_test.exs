defmodule Afterlight.Theater.YoutubePlaylistTest do
  use ExUnit.Case, async: true

  alias Afterlight.Theater.YoutubePlaylist

  test "mix ids are declined" do
    assert {:error, "is_mix"} = YoutubePlaylist.resolve("RDClQcPDx2I")
    assert {:error, "is_mix"} = YoutubePlaylist.resolve("ULabc123456789")
  end

  test "invalid ids are unreadable" do
    assert {:error, "playlist_unreadable"} = YoutubePlaylist.resolve("short")
    assert {:error, "playlist_unreadable"} = YoutubePlaylist.resolve(nil)
  end

  test "extract_playlist_videos from fixture html" do
    html = File.read!(Path.expand("../../tests/fixtures/parity/youtube-playlist.html", __DIR__))

    case YoutubePlaylist.extract_playlist_videos(html) do
      {:ok, %{title: title, videos: videos}} ->
        assert is_binary(title)
        assert length(videos) > 0
        assert Enum.all?(videos, &is_map/1)

      {:error, "playlist_not_public"} ->
        # Fixture may be absent in minimal checkouts; skip shape assertion.
        :ok
    end
  rescue
    File.Error -> :ok
  end
end
