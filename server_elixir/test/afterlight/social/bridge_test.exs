defmodule Afterlight.Social.BridgeTest do
  use ExUnit.Case, async: false

  alias Afterlight.Social.{Bridge, Relay}

  defmodule FakeAdapter do
    def send_event(_payload), do: :ok
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

  test "reflection loop irc→game→irc is suppressed" do
    {relay, bridge} = start_bridge()
    conn = make_ref()
    :ok = Relay.player_connected(relay, "g1", conn, self(), "Alice")
    drain_presence()

    assert :ok =
             Bridge.handle_irc_event(bridge, %{
               "type" => "chat_relay",
               "origin" => "irc",
               "id" => "irc_msg_1",
               "from" => "bot",
               "text" => "from irc",
               "action" => false
             })

    assert_receive {:chat_push, "chat_message", %{"text" => "from irc", "fromKind" => "irc"}}

    assert {:dropped, :duplicate} =
             Bridge.handle_irc_event(bridge, %{
               "type" => "chat_relay",
               "origin" => "irc",
               "id" => "irc_msg_1",
               "from" => "bot",
               "text" => "from irc",
               "action" => false
             })

    refute_receive {:chat_push, "chat_message", _}, 50
  end

  test "sidecar down does not produce chat_error; game relay and DMs still work" do
    {relay, bridge} = start_bridge()
    :ok = Bridge.set_sidecar_status(bridge, :down)
    assert Bridge.sidecar_status(bridge) == :down
    assert Bridge.irc_nicks(bridge) == []

    conn_a = make_ref()
    :ok = Relay.player_connected(relay, "g1", conn_a, self(), "Alice")
    drain_presence()

    conn_b = make_ref()
    :ok = Relay.player_connected(relay, "g2", conn_b, self(), "Bob")
    drain_presence()

    :ok = Relay.handle_chat_send(relay, "g1", conn_a, "still works")
    assert_receive {:chat_push, "chat_message", %{"text" => "still works"}}
    refute_receive {:chat_push, "chat_error", _}, 50

    :ok = Relay.handle_chat_send(relay, "g1", conn_a, "/msg Bob secret dm")
    dm1 = receive do {:chat_push, "chat_dm", m} -> m end
    dm2 = receive do {:chat_push, "chat_dm", m} -> m end
    sender = if dm1["echo"] == true, do: dm1, else: dm2
    recipient = if dm1["echo"] == true, do: dm2, else: dm1
    assert sender["echo"] == true
    assert recipient["text"] == "secret dm"
    refute_receive {:chat_push, "chat_error", _}, 50
  end

  test "bridge recovery reattaches without duplicate delivery" do
    {relay, bridge} = start_bridge()
    conn = make_ref()
    :ok = Relay.player_connected(relay, "g1", conn, self(), "Alice")
    drain_presence()

    :ok = Bridge.set_sidecar_status(bridge, :down)
    :ok = Relay.handle_chat_send(relay, "g1", conn, "offline msg")
    assert_receive {:chat_push, "chat_message", %{"text" => "offline msg"}}
    refute_receive {:chat_push, "chat_message", _}, 50

    :ok = Bridge.set_sidecar_status(bridge, :up)
    assert Bridge.sidecar_status(bridge) == :up

    {:ok, msg_id} =
      Bridge.relay_event(bridge, {:channel_message, "Alice", "back online", false})

    assert {:dropped, :duplicate} =
             Bridge.handle_irc_event(bridge, %{
               "type" => "chat_relay",
               "origin" => "game",
               "id" => msg_id,
               "from" => "Alice",
               "text" => "back online"
             })
  end

  defp drain_presence do
    receive do
      {:chat_push, "chat_presence", _} -> drain_presence()
    after
      0 -> :ok
    end
  end
end
