defmodule AfterlightWeb.Plugs.TheaterCorsTest do
  use ExUnit.Case, async: true

  alias AfterlightWeb.Plugs.TheaterCors

  test "OPTIONS on /api/auth/guest echoes CORS for browser token fetch" do
    conn =
      Plug.Test.conn(:options, "/api/auth/guest")
      |> Plug.Conn.put_req_header("origin", "https://afterlight.vercel.app")
      |> TheaterCors.call([])

    assert conn.halted
    assert conn.status == 204
    assert {"access-control-allow-origin", "https://afterlight.vercel.app"} in conn.resp_headers
  end
end
