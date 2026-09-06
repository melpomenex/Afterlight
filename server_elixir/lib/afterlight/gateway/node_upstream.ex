defmodule Afterlight.Gateway.NodeUpstream do
  @moduledoc """
  The real upstream adapter: a WebSockex client connection to Node's
  `/ws` endpoint carrying the boundary secret header (`x-afterlight-boundary`,
  design D5) when one is configured.

  Session semantics: the connection is 1:1 with a gateway session. When
  Node closes (or the TCP link drops), the session is over — no silent
  auto-reconnect, because a reconnecting shadow connection would replay
  nothing and desync from the client, which owns reconnect semantics
  (hello → desiredRoom replay). The adapter notifies its owner
  (`Afterlight.Gateway.NodeProxy`) and exits.
  """

  @behaviour Afterlight.Gateway.UpstreamAdapter
  use WebSockex

  @impl true
  def connect(url, headers, owner) do
    WebSockex.start_link(url, __MODULE__, %{owner: owner}, extra_headers: headers)
  end

  @impl true
  def send_frame(pid, json), do: WebSockex.send_frame(pid, {:text, json})

  @impl true
  def close(pid) do
    WebSockex.cast(pid, :__afterlight_close__)
    :ok
  catch
    # Upstream already dead — treat as closed; the :upstream_down path
    # (or the absence of any future frames) settles the session.
    _, _ -> :ok
  end

  ## WebSockex callbacks

  @impl true
  def handle_connect(_conn, %{owner: owner} = state) do
    send(owner, {:upstream_up, self()})
    {:ok, state}
  end

  @impl true
  def handle_frame({:text, json}, %{owner: owner} = state) do
    send(owner, {:upstream_frame, self(), json})
    {:ok, state}
  end

  # Close is driven through handle_cast because WebSockex exposes no
  # synchronous close/1: {:close, state} performs a proper close handshake.
  @impl true
  def handle_cast(:__afterlight_close__, state) do
    {:close, state}
  end

  @impl true
  def handle_disconnect(_connection_status, %{owner: owner} = state) do
    send(owner, {:upstream_down, self(), :closed})
    # Do not reconnect: the client transport owns reconnect semantics.
    {:close, state}
  end

  @impl true
  def handle_info(_msg, state), do: {:ok, state}
end
