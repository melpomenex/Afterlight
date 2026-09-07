defmodule AfterlightWeb.HTTPProxy do
  @moduledoc """
  Reverse proxy for the HTTP side channel (design D1, task 3.3):
  `/api/health` and `/api/theater/*` are forwarded to Node
  (`proxy_target`) over the boundary, preserving method, path + query
  string, Content-Type, request body, response status and response
  headers — including `Content-Range` / `Accept-Ranges` for torrent 206
  responses. CORS echo headers come from Node and are passed through
  verbatim; the gateway adds none of its own.

  ## Streaming / buffering decision

  * **Responses are always streamed.** `Finch.stream/5` delivers body
    chunks which are pushed straight onto the client connection
    (`send_chunked` + `chunk`) — no response body is ever buffered, so
    torrent Range streaming and multi-MB EPG downloads flow through at
    the memory cost of one chunk. Because we re-chunk, upstream
    `content-length` and `transfer-encoding` are stripped
    (hop-by-hop); everything else is preserved, so a 206 stays 206 with
    its `Content-Range`, which is what the `<video>` element needs.
  * **Request bodies are buffered up to a cap.** Finch consumes request
    streams in its own pool processes, while a Plug request body may
    only be read by the connection-owner process — clean cross-process
    request streaming is not available, so bodies are read with
    `read_body/2` up to `http_proxy_max_body_bytes` (default 64 MiB,
    mirroring Node's own EPG cap; Node still enforces its caps and
    answers 413 itself). Bodies past the cap are rejected at the
    gateway with 413 instead of being buffered.

  Upstream errors answer 502 `{ok: false, error: "bad_gateway"}` when no
  response head has been sent yet; once the head is out, the connection
  is simply terminated (the client sees a truncated stream).

  Mounted BEFORE `Plug.Parsers` so raw bodies are intact; Endpoint
  socket paths (`/ws`) are matched before any plug runs.
  """

  @behaviour Plug

  alias Afterlight.Gateway

  # Hop-by-hop headers never forwarded in either direction (RFC 9110 §7.6.1).
  @hop_by_hop ~w(connection keep-alive proxy-authenticate proxy-authorization
                 te trailer transfer-encoding upgrade)

  @impl true
  def init(opts), do: opts

  # `opts` may override any `:gateway` config key per plugged instance
  # (proxy_target, boundary_secret, http_proxy_max_body_bytes,
  # http_proxy_timeout_ms) — used by tests that host this plug on a
  # dedicated Bandit listener without mutating global config.
  @impl true
  def call(%Plug.Conn{path_info: path} = conn, opts) do
    if forwarded_path?(path) do
      proxy(conn, opts)
    else
      conn
    end
  end

  # Prefix match: /api/health exactly, and theater paths not owned by Phoenix.
  defp forwarded_path?(["api", "health"]), do: true
  defp forwarded_path?(["api", "theater", segment]) when segment in ["playlists", "epg"], do: false
  defp forwarded_path?(["api", "theater" | _rest]), do: true
  defp forwarded_path?(_path), do: false

  ## Config with per-instance override

  defp cfg(opts, key, default \\ nil) do
    case Keyword.get(opts, key) do
      nil -> Gateway.config(key, default)
      value -> value
    end
  end

  ## Request side

  defp proxy(conn, opts) do
    case read_request_body(conn, opts) do
      {:ok, body} ->
        conn |> build_request(body, opts) |> stream_response(conn, opts)

      {:error, :too_large} ->
        conn
        |> Plug.Conn.put_resp_content_type("application/json")
        |> Plug.Conn.send_resp(413, Jason.encode!(%{ok: false, error: "payload_too_large"}))
        |> Plug.Conn.halt()
    end
  end
  defp read_request_body(conn, opts) do
    cap = cfg(opts, :http_proxy_max_body_bytes, 64 * 1024 * 1024)
    read_body_loop(conn, cap, [])
  end

  defp read_body_loop(conn, cap, acc) do
    opts = [length: 1_048_576, read_length: 1_048_576, read_timeout: 30_000]

    case Plug.Conn.read_body(conn, opts) do
      {:ok, body, _conn} ->
        acc = [body | acc]

        if IO.iodata_length(acc) > cap do
          {:error, :too_large}
        else
          {:ok, IO.iodata_to_binary(Enum.reverse(acc))}
        end

      {:more, part, conn} ->
        acc = [part | acc]

        if IO.iodata_length(acc) > cap do
          {:error, :too_large}
        else
          read_body_loop(conn, cap, acc)
        end

      {:error, _reason} ->
        {:error, :too_large}
    end
  end

  defp build_request(conn, body, opts) do
    url = target_url(conn, opts)

    headers =
      conn.req_headers
      |> Enum.reject(fn {name, _} ->
        name == "host" or name == "content-length" or Enum.member?(@hop_by_hop, name)
      end)
      |> Kernel.++(boundary_header(opts))
      # `host` for the upstream target; first value wins per RFC. The
      # port is included unless it is the scheme default (URI.parse
      # drops default ports automatically).
      |> List.insert_at(0, {"host", host_header(url)})

    Finch.build(conn.method, url, headers, body)
  end

  defp host_header(url) do
    uri = URI.parse(url)

    case uri.port do
      nil -> uri.host
      port -> "#{uri.host}:#{port}"
    end
  end

  # The request path is forwarded exactly as received (still
  # percent-encoded) — Node owns URL semantics for torrent file names.
  defp target_url(conn, opts) do
    base = String.trim_trailing(cfg(opts, :proxy_target, "http://127.0.0.1:3001"), "/")
    path = String.trim_leading(conn.request_path, "/")
    query = if conn.query_string == "", do: "", else: "?" <> conn.query_string
    base <> "/" <> path <> query
  end

  defp boundary_header(opts) do
    case cfg(opts, :boundary_secret) do
      secret when is_binary(secret) -> [{"x-afterlight-boundary", secret}]
      _ -> []
    end
  end

  ## Response side

  defp stream_response(request, client_conn, opts) do
    acc = %{conn: client_conn, head_sent: false}

    result =
      try do
        Finch.stream(
          request,
          Afterlight.Finch,
          acc,
          &handle_resp_part/2,
          receive_timeout: cfg(opts, :http_proxy_timeout_ms, 60_000)
        )
      catch
        # Client went away mid-stream; stop pulling chunks.
        {:__proxy_abort__, acc} -> {:ok, acc}
      end

    case result do
      # Response fully relayed (or already streaming when the upstream
      # failed — nothing left to do but let the connection end).
      {:ok, acc} ->
        halt_proxy(acc.conn)

      # Finch surfaces errors as {:error, exception} (before any body
      # was pulled) or {:error, exception, acc}.
      {:error, _reason, %{head_sent: true} = acc} ->
        halt_proxy(acc.conn)

      {:error, _reason, _acc} ->
        bad_gateway(client_conn)

      {:error, _reason} ->
        bad_gateway(client_conn)
    end
  end

  # A forwarded response is complete: mark halted so the rest of the
  # endpoint pipeline (router dispatch) never runs past it — the router
  # has no route for these paths and raising after a chunked response
  # was started truncates the stream (missing terminating chunk).
  defp halt_proxy(%Plug.Conn{} = conn), do: Plug.Conn.halt(conn)

  defp handle_resp_part({:status, status}, acc) do
    Map.put(acc, :status, status)
  end

  defp handle_resp_part({:headers, headers}, %{head_sent: false, status: status} = acc)
       when is_integer(status) do
    resp_headers =
      Enum.reject(headers, fn {name, _} ->
        name == "content-length" or Enum.member?(@hop_by_hop, name)
      end)

    conn =
      acc.conn
      |> Plug.Conn.merge_resp_headers(resp_headers)
      |> Plug.Conn.send_chunked(status)

    %{acc | conn: conn, head_sent: true}
  end

  defp handle_resp_part({:headers, _headers}, acc), do: acc

  defp handle_resp_part({:data, _data}, %{head_sent: false} = acc), do: acc

  defp handle_resp_part({:data, data}, acc) do
    case Plug.Conn.chunk(acc.conn, data) do
      {:ok, conn} ->
        %{acc | conn: conn}

      {:error, _reason} ->
        throw({:__proxy_abort__, acc})
    end
  end

  defp bad_gateway(conn) do
    conn
    |> Plug.Conn.put_resp_content_type("application/json")
    |> Plug.Conn.send_resp(502, Jason.encode!(%{ok: false, error: "bad_gateway"}))
    |> Plug.Conn.halt()
  end
end
