defmodule AfterlightWeb.MetricsPlug do
  @moduledoc """
  Private-network Prometheus scrape endpoint at `/metrics` (P10 design D1).

  Public or non-RFC1918 clients receive 404 so the path is not advertised
  on the internet-facing listener. Telemetry must be enabled; when disabled
  the endpoint also returns 404 (task 1.6/1.7).
  """

  @behaviour Plug

  @impl true
  def init(opts), do: opts

  @impl true
  def call(%Plug.Conn{path_info: ["metrics"]} = conn, _opts) do
    if Afterlight.Telemetry.enabled?() and private_ip?(conn.remote_ip) do
      body = Afterlight.Telemetry.scrape()

      conn
      |> Plug.Conn.put_resp_content_type("text/plain; version=0.0.4; charset=utf-8")
      |> Plug.Conn.send_resp(200, body)
      |> Plug.Conn.halt()
    else
      conn
      |> Plug.Conn.put_status(:not_found)
      |> Plug.Conn.send_resp(404, "Not Found")
      |> Plug.Conn.halt()
    end
  end

  def call(conn, _opts), do: conn

  defp private_ip?(ip) do
    case ip do
      {127, _, _, _} -> true
      {10, _, _, _} -> true
      {172, b, _, _} when b >= 16 and b <= 31 -> true
      {192, 168, _, _} -> true
      {0, 0, 0, 0, 0, 0, 0, 1} -> true
      {0xFE, 0x80, _, _, _, _, _, _} -> true
      _ -> false
    end
  end
end
