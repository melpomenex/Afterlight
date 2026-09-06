defmodule Afterlight.Gateway.NodeUpstreamIntegrationTest do
  @moduledoc """
  Real-upstream coverage (task 3.1 against a live Node). Excluded by
  default (test_helper.exs configures `exclude: :integration`); run with:

      AFTERLIGHT_INTEGRATION=1 mix test --include integration

  Requires the Node server listening on ws://127.0.0.1:3001/ws.
  """

  use ExUnit.Case, async: false

  alias Afterlight.Gateway.NodeUpstream

  @moduletag :integration

  @tag timeout: 15_000
  test "connects to real Node, relays a frame, reports close" do
    url = Afterlight.Gateway.config(:node_ws_url, "ws://127.0.0.1:3001/ws")
    headers = Afterlight.Gateway.config(:boundary_secret) && [{"x-afterlight-boundary", Afterlight.Gateway.config(:boundary_secret)}] || []

    assert {:ok, up} = NodeUpstream.connect(url, headers, self())

    assert_receive {:upstream_up, ^up}, 10_000

    # ping {t} -> pong {t} through the real Node.
    :ok = NodeUpstream.send_frame(up, Jason.encode!(%{"type" => "ping", "t" => 99_121}))
    assert_receive {:upstream_frame, ^up, json}, 10_000
    assert %{"type" => "pong", "t" => 99_121} = Jason.decode!(json)

    # Closing the upstream reports the disconnect and exits cleanly.
    :ok = NodeUpstream.close(up)
    assert_receive {:upstream_down, ^up, _reason}, 10_000
  end
end
