defmodule AfterlightWeb.HTTPProxyTest do
  use ExUnit.Case, async: false

  @moduledoc """
  Reverse-proxy passthrough (task 3.3) against a Bandit-hosted stub
  upstream standing in for Node. The plug itself is hosted under a
  second Bandit listener (per-test opts overrides, no global config
  mutation) and driven with real HTTP via Finch, so streaming and header
  semantics are exercised on the wire. Real-Node coverage is tagged
  `:integration` in Afterlight.Gateway.NodeUpstreamIntegrationTest.
  """

  alias Afterlight.Gateway

  defmodule StubNode do
    @moduledoc "Stand-in for Node's HTTP surface."

    def init(opts), do: opts

    def call(conn, _opts) do
      case {conn.method, conn.path_info} do
        {"GET", ["api", "health"]} ->
          conn
          |> Plug.Conn.put_resp_header("x-stub-hit", "health")
          |> Plug.Conn.send_resp(200, ~s({"ok":true,"uptime":1}))

        {method, ["api", "theater", "echo"]} ->
          {:ok, body, conn} = Plug.Conn.read_body(conn)

          content_type = conn |> Plug.Conn.get_req_header("content-type") |> List.first()

          conn
          |> Plug.Conn.put_resp_header("content-type", "application/json")
          |> Plug.Conn.send_resp(
            201,
            Jason.encode!(%{method: method, query: conn.query_string, content_type: content_type, body: body})
          )

        {"GET", ["api", "theater", "range"]} ->
          # Simulate torrent Range streaming: 206 + Content-Range +
          # Accept-Ranges, body delivered in chunks.
          conn
          |> Plug.Conn.put_resp_header("accept-ranges", "bytes")
          |> Plug.Conn.put_resp_header("content-range", "bytes 0-9/100")
          |> Plug.Conn.put_resp_header("content-type", "video/mp2t")
          |> Plug.Conn.send_chunked(206)
          |> chunk_all(["01234", "56789"])

        {"GET", ["api", "theater", "cors"]} ->
          # Node echoes the Origin; the gateway must NOT add its own.
          conn
          |> Plug.Conn.put_resp_header("access-control-allow-origin", "https://origin.example")
          |> Plug.Conn.send_resp(200, "cors-echo")

        {"GET", ["api", "theater", "boundary"]} ->
          secret = conn |> Plug.Conn.get_req_header("x-afterlight-boundary") |> List.first()
          Plug.Conn.send_resp(conn, 200, "boundary:" <> to_string(secret))

        {"GET", ["api", "theater", "host"]} ->
          host = conn |> Plug.Conn.get_req_header("host") |> List.first()
          Plug.Conn.send_resp(conn, 200, "host:" <> to_string(host))

        {method, ["api", "theater", "method"]} ->
          Plug.Conn.send_resp(conn, 200, "method:" <> method)

        _ ->
          Plug.Conn.send_resp(conn, 404, "stub-404")
      end
    end

    defp chunk_all(conn, []), do: conn

    defp chunk_all(conn, [chunk | rest]) do
      {:ok, conn} = Plug.Conn.chunk(conn, chunk)
      chunk_all(conn, rest)
    end
  end

  setup do
    ports =
      Enum.map([:stub, :gateway], fn _ ->
        {:ok, socket} = :gen_tcp.listen(0, [])
        {:ok, port} = :inet.port(socket)
        :gen_tcp.close(socket)
        port
      end)

    [stub_port, gateway_port] = ports

    {:ok, _} = start_supervised({Bandit, plug: StubNode, scheme: :http, port: stub_port})

    {:ok, _} =
      start_supervised(
        {Bandit,
         plug: {AfterlightWeb.HTTPProxy, proxy_target: "http://127.0.0.1:#{stub_port}"},
         scheme: :http,
         port: gateway_port}
      )

    %{stub_port: stub_port, gateway_port: gateway_port}
  end

  defp get(port, path) do
    Finch.build(:get, "http://127.0.0.1:#{port}" <> path, [], nil)
    |> Finch.request(Afterlight.Finch, receive_timeout: 30_000)
  end

  defp post(port, path, body, content_type) do
    Finch.build(:post, "http://127.0.0.1:#{port}" <> path, [{"content-type", content_type}], body)
    |> Finch.request(Afterlight.Finch, receive_timeout: 30_000)
  end

  defp hosted_proxy(%{stub_port: stub_port}, extra_opts) do
    {:ok, socket} = :gen_tcp.listen(0, [])
    {:ok, port} = :inet.port(socket)
    :gen_tcp.close(socket)

    opts = Keyword.merge([proxy_target: "http://127.0.0.1:#{stub_port}"], extra_opts)

    {:ok, _} =
      start_supervised({Bandit, plug: {AfterlightWeb.HTTPProxy, opts}, scheme: :http, port: port})

    port
  end

  test "/api/health is forwarded and the response is passed through", %{gateway_port: gw} do
    assert {:ok, resp} = get(gw, "/api/health")
    assert resp.status == 200
    assert resp.body =~ ~s("ok":true)
    assert {"x-stub-hit", "health"} in resp.headers
  end

  test "query strings, methods, content-type and bodies are preserved", %{gateway_port: gw} do
    assert {:ok, resp} = get(gw, "/api/theater/echo?listId=abc&x=%20")
    assert resp.status == 201

    assert %{"query" => "listId=abc&x=%20", "body" => "", "method" => "GET"} =
             Jason.decode!(resp.body)

    body = Jason.encode!(%{url: "https://video.example/live.m3u8"})
    assert {:ok, resp} = post(gw, "/api/theater/echo?op=add", body, "application/json")
    assert resp.status == 201

    assert %{
             "method" => "POST",
             "query" => "op=add",
             "content_type" => "application/json",
             "body" => ^body
           } = Jason.decode!(resp.body)
  end

  test "arbitrary methods pass through", %{gateway_port: gw} do
    assert {:ok, resp} =
             Finch.build(:head, "http://127.0.0.1:#{gw}/api/theater/method", [], nil)
             |> Finch.request(Afterlight.Finch, receive_timeout: 30_000)

    assert resp.status == 200
  end

  test "torrent Range semantics survive: 206 + Content-Range + Accept-Ranges, streamed chunks", %{
    gateway_port: gw
  } do
    assert {:ok, resp} = get(gw, "/api/theater/range")
    assert resp.status == 206
    assert {"content-range", "bytes 0-9/100"} in resp.headers
    assert {"accept-ranges", "bytes"} in resp.headers
    assert resp.body == "0123456789"
  end

  test "CORS echo headers come from Node and are passed through untouched", %{gateway_port: gw} do
    assert {:ok, resp} = get(gw, "/api/theater/cors")
    assert {"access-control-allow-origin", "https://origin.example"} in resp.headers
  end

  test "the boundary secret header is attached to the upstream request", %{stub_port: stub} do
    gw = hosted_proxy(%{stub_port: stub}, boundary_secret: "test-boundary-secret")
    assert {:ok, resp} = get(gw, "/api/theater/boundary")
    assert resp.body == "boundary:test-boundary-secret"
  end

  test "host header is rewritten to the upstream target", %{gateway_port: gw} do
    assert {:ok, resp} = get(gw, "/api/theater/host")
    assert resp.body =~ ~r/^host:127\.0\.0\.1:\d+$/
  end

  test "paths outside the proxied prefixes are not intercepted" do
    conn = Plug.Test.conn(:get, "/health")
    returned = AfterlightWeb.HTTPProxy.call(conn, [])
    assert returned.state == :unset
    assert returned.halted == false
  end

  test "oversized request bodies are refused at the gateway with 413", %{stub_port: stub} do
    gw = hosted_proxy(%{stub_port: stub}, http_proxy_max_body_bytes: 8)
    assert {:ok, resp} = post(gw, "/api/theater/echo", String.duplicate("x", 100), "text/plain")
    assert resp.status == 413
    assert %{"ok" => false} = Jason.decode!(resp.body)
  end

  test "unreachable upstream answers 502 {ok: false}" do
    gw = hosted_proxy(%{stub_port: 1}, proxy_target: "http://127.0.0.1:1")
    assert {:ok, resp} = get(gw, "/api/health")
    assert resp.status == 502
    assert %{"ok" => false, "error" => "bad_gateway"} = Jason.decode!(resp.body)
  end

  test "per-instance opts override global config without mutating it" do
    # The boundary/413/502 tests above already prove overrides take
    # effect per listener; this asserts the global config is untouched.
    assert Gateway.config(:proxy_target) == "http://127.0.0.1:3001"
    assert Gateway.config(:boundary_secret) == nil
  end

  # fix-theater-streaming-after-elixir-cutover D4: only the torrent stream
  # prefix is a video stream — a paused <video> legitimately idles longer
  # than an API round-trip, so it alone gets the patient timeout.
  test "torrent stream paths get the long receive timeout; other paths keep the default" do
    torrent = ["api", "theater", "torrent", "deadbeef", "0"]
    other = ["api", "theater", "echo"]

    assert AfterlightWeb.HTTPProxy.torrent_stream_path?(torrent)
    refute AfterlightWeb.HTTPProxy.torrent_stream_path?(other)
    refute AfterlightWeb.HTTPProxy.torrent_stream_path?(["api", "health"])

    opts = [http_proxy_timeout_ms: 1_000, http_proxy_torrent_timeout_ms: 9_000]

    assert AfterlightWeb.HTTPProxy.receive_timeout_ms(torrent, opts) == 9_000
    assert AfterlightWeb.HTTPProxy.receive_timeout_ms(other, opts) == 1_000
    assert AfterlightWeb.HTTPProxy.receive_timeout_ms(["api", "health"], opts) == 1_000
  end
end
