defmodule AfterlightWeb.Plugs.TheaterCatalog do
  @moduledoc """
  Phoenix-owned theater upload endpoints (design D5).

  Handles `POST /api/theater/playlists` and `POST /api/theater/epg`
  before the Node reverse proxy. Torrent streaming and other theater
  paths continue to proxy.
  """

  @behaviour Plug

  alias AfterlightWeb.TheaterEpgController
  alias AfterlightWeb.TheaterPlaylistController

  @impl true
  def init(opts), do: opts

  @impl true
  def call(%Plug.Conn{path_info: ["api", "theater", segment]} = conn, _opts) do
    conn = Plug.Conn.fetch_query_params(conn)

    case {conn.method, segment} do
      {"POST", "playlists"} ->
        TheaterPlaylistController.serve(conn)

      {"POST", "epg"} ->
        TheaterEpgController.serve(conn)

      _ ->
        conn
    end
  end

  def call(conn, _opts), do: conn
end
