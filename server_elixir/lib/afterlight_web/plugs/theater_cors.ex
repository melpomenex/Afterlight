defmodule AfterlightWeb.Plugs.TheaterCors do
  @moduledoc """
  CORS preflight + Origin echo + `Vary: Origin` for browser-facing gateway
  HTTP routes (`/api/theater/*`, `/api/auth/*`).
  """

  @behaviour Plug

  @impl true
  def init(opts), do: opts

  @impl true
  def call(%Plug.Conn{path_info: ["api", "theater" | _]} = conn, _opts) do
    cors(conn)
  end

  def call(%Plug.Conn{path_info: ["api", "auth" | _]} = conn, _opts) do
    cors(conn)
  end

  def call(conn, _opts), do: conn

  defp cors(conn) do
    origin = Plug.Conn.get_req_header(conn, "origin") |> List.first()

    conn =
      conn
      |> Plug.Conn.put_resp_header("access-control-allow-methods", "GET, HEAD, POST, OPTIONS")
      |> Plug.Conn.put_resp_header(
        "access-control-allow-headers",
        "Content-Type, Range"
      )
      |> Plug.Conn.put_resp_header(
        "access-control-expose-headers",
        "Content-Range, Accept-Ranges, Content-Length"
      )

    conn =
      if is_binary(origin) do
        conn
        |> Plug.Conn.put_resp_header("access-control-allow-origin", origin)
        |> Plug.Conn.put_resp_header("vary", "Origin")
      else
        conn
      end

    if conn.method == "OPTIONS" do
      conn
      |> Plug.Conn.send_resp(204, "")
      |> Plug.Conn.halt()
    else
      conn
    end
  end
end
