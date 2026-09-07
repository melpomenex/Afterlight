defmodule AfterlightWeb.TheaterUploadTest do
  use Afterlight.DataCase, async: false

  import Plug.Conn
  import Plug.Test

  @endpoint AfterlightWeb.Endpoint

  setup do
    Ecto.Adapters.SQL.query!(
      Afterlight.Repo,
      "TRUNCATE playlist_channels, playlist_lists, epg_programmes, epg_channels, epg_guides RESTART IDENTITY CASCADE",
      []
    )

    :ok
  end

  @playlist """
  #EXTM3U
  #EXTINF:-1,One
  https://example.com/one.m3u8
  """

  test "playlist upload returns success JSON" do
    conn =
      conn(:post, "/api/theater/playlists?name=Test", @playlist)
      |> put_req_header("content-type", "text/plain")
      |> put_req_header("origin", "http://localhost:5173")

    conn = @endpoint.call(conn, @endpoint.init([]))

    assert conn.status == 200
    body = Jason.decode!(conn.resp_body)
    assert body["ok"] == true
    assert body["list"]["channelCount"] == 1
    assert conn.resp_headers |> Enum.any?(fn {k, v} -> k == "access-control-allow-origin" and v == "http://localhost:5173" end)
  end

  test "oversized playlist is rejected" do
    huge = String.duplicate("x", 8 * 1024 * 1024 + 1)

    conn =
      conn(:post, "/api/theater/playlists", huge)
      |> put_req_header("content-type", "text/plain")

    conn = @endpoint.call(conn, @endpoint.init([]))
    assert conn.status == 413
    assert Jason.decode!(conn.resp_body)["error"] =~ "too large"
  end

  test "OPTIONS preflight on theater uploads" do
    conn =
      conn(:options, "/api/theater/playlists")
      |> put_req_header("origin", "http://localhost:5173")

    conn = @endpoint.call(conn, @endpoint.init([]))
    assert conn.status == 204
    assert {"access-control-allow-origin", "http://localhost:5173"} in conn.resp_headers
    assert {"vary", "Origin"} in conn.resp_headers
  end
end
