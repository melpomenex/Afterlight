defmodule Afterlight.Catalog.UploadTest do
  use Afterlight.DataCase, async: false

  import Plug.Conn
  import Plug.Test

  alias Afterlight.Catalog.Errors

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

  test "playlist JSON url fetch refuses private addresses" do
    conn =
      conn(:post, "/api/theater/playlists", Jason.encode!(%{"url" => "http://127.0.0.1/list.m3u"}))
      |> put_req_header("content-type", "application/json")

    conn = @endpoint.call(conn, @endpoint.init([]))
    assert conn.status == 502
    assert Jason.decode!(conn.resp_body)["error"] =~ "Could not fetch"
  end

  test "playlist JSON url fetch rejects non-http schemes" do
    conn =
      conn(:post, "/api/theater/playlists", Jason.encode!(%{"url" => "file:///tmp/list.m3u"}))
      |> put_req_header("content-type", "application/json")

    conn = @endpoint.call(conn, @endpoint.init([]))
    assert conn.status == 400
    assert Jason.decode!(conn.resp_body)["error"] =~ "http"
  end

  test "plain-text playlist upload succeeds" do
    conn =
      conn(:post, "/api/theater/playlists?name=Text", @playlist)
      |> put_req_header("content-type", "text/plain")

    conn = @endpoint.call(conn, @endpoint.init([]))
    assert conn.status == 200
    assert Jason.decode!(conn.resp_body)["ok"] == true
  end

  test "plain-text playlist upload enforces the 8 MiB cap" do
    huge = String.duplicate("x", 8 * 1024 * 1024 + 1)

    conn =
      conn(:post, "/api/theater/playlists", huge)
      |> put_req_header("content-type", "text/plain")

    conn = @endpoint.call(conn, @endpoint.init([]))
    assert conn.status == 413
    assert Jason.decode!(conn.resp_body)["error"] == Errors.text("text_too_large")
  end

  test "epg upload rejects oversize bodies" do
    huge = String.duplicate("x", 64 * 1024 * 1024 + 1)

    conn =
      conn(:post, "/api/theater/epg", huge)
      |> put_req_header("content-type", "application/xml")

    conn = @endpoint.call(conn, @endpoint.init([]))
    assert conn.status == 413
    assert Jason.decode!(conn.resp_body)["error"] =~ "too large"
  end

  test "OPTIONS preflight echoes origin on theater upload routes" do
    conn =
      conn(:options, "/api/theater/epg")
      |> put_req_header("origin", "http://localhost:5173")

    conn = @endpoint.call(conn, @endpoint.init([]))
    assert conn.status == 204
    assert {"access-control-allow-origin", "http://localhost:5173"} in conn.resp_headers
    assert {"vary", "Origin"} in conn.resp_headers
  end
end
