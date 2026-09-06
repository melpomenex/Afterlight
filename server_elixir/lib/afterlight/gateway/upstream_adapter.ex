defmodule Afterlight.Gateway.UpstreamAdapter do
  @moduledoc """
  The upstream ("shadow") WebSocket connection to Node — design D5: one
  authenticated connection per gateway session over the loopback /
  private boundary.

  The adapter is a behaviour so tests can inject fake upstream processes
  (`GatewayTest.FakeUpstream`) instead of dialing a real Node (tasks
  3.1/3.4). The default implementation is `Afterlight.Gateway.NodeUpstream`
  (WebSockex).

  An adapter reports lifecycle to its owner (`NodeProxy`) with these
  messages, all tagged with the connection pid:

    * `{:upstream_up, pid}` — the connection was established.
    * `{:upstream_frame, pid, json :: binary}` — a text frame arrived.
    * `{:upstream_down, pid, reason :: term}` — the connection closed
      (or failed to establish); the adapter process exits afterwards.
  """

  @callback connect(url :: String.t(), headers :: [{String.t(), String.t()}], owner :: pid) ::
              {:ok, pid} | {:error, term}

  @callback send_frame(pid :: pid, json :: String.t()) :: :ok | {:error, term}

  @callback close(pid :: pid) :: :ok
end
