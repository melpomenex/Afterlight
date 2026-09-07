defmodule Afterlight.Social.BridgeTest do
  use ExUnit.Case, async: false

  alias Afterlight.Social.{Bridge, Relay}

  defmodule FakeAdapter do
    def send(_payload), do: :ok
  end

  defp start_bridge(opts \\ []) do
    {:ok, relay} = GenServer.start_link(Relay, [], [])
    {:ok, bridge} = GenServer.start_link(Bridge, Keyword.merge([relay: relay, adapter: FakeAdapter], opts), [])
    Relay.set_bridge(relay, bridge)
    {relay, bridge}
  end

  test "reflection loop game→irc→game is suppressed" do
    {_relay, bridge} = start_bridge()

    {:ok, msg_id} =
      Bridge.relay_event(bridge, {:channel_message, "Alice", "hi", false})

    assert {:dropped, :duplicate} =
             Bridge.handle_irc_event(bridge, %{
               "type" => "chat_relay",
               "origin" => "game",
               "id" => msg_id,
               "from" => "Alice",
               "text" => "hi",
               "action" => false
             })
  end

  test "sidecar down does not produce chat_error; game relay still works" do
    {relay, bridge} = start_bridge()
    :ok = Bridge.set_sidecar_status(bridge, :down)
    assert Bridge.sidecar_status(bridge) == :down
    assert Bridge.irc_nicks(bridge) == []

    conn = make_ref()
    ch = self()
    :ok = Relay.player_connected(relay, "g1", conn, ch, "Alice")
    drain_presence()

    :ok = Relay.handle_chat_send(relay, "g1", conn, "still works")
    assert_receive {:chat_push, "chat_message", %{"text" => "still works"}}
    refute_receive {:chat_push, "chat_error", _}, 50
  end

  defp drain_presence do
    receive do
      {:chat_push, "chat_presence", _} -> drain_presence()
    after
      0 -> :ok
    end
  end
end
