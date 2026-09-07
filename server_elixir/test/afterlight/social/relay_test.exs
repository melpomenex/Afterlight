defmodule Afterlight.Social.RelayTest do
  use ExUnit.Case, async: false

  alias Afterlight.Social.Relay

  defp start_relay do
    {:ok, pid} = GenServer.start_link(Relay, [], [])
    pid
  end

  defp connect(relay, guest_id, nick) do
    conn = make_ref()
    ch = self()
    :ok = Relay.player_connected(relay, guest_id, conn, ch, nick)
    {conn, ch}
  end

  test "ring keeps 100 and delivers 50 on history" do
    relay = start_relay()
    {conn, _} = connect(relay, "g1", "Alice")

    for i <- 1..120 do
      :ok = Relay.handle_chat_send(relay, "g1", conn, "msg #{i}")
      drain_chat_messages()
    end

    :ok = Relay.send_history(relay, self())
    assert_receive {:chat_push, "chat_history", %{"messages" => msgs}}
    assert length(msgs) == 50
    assert List.last(msgs)["text"] == "msg 120"
  end

  test "channel broadcast echoes sender exactly once" do
    relay = start_relay()
    {c1, _} = connect(relay, "g1", "Alice")
    {_c2, ch2} = connect(relay, "g2", "Bob")

    :ok = Relay.handle_chat_send(relay, "g1", c1, "hello town")

    assert_receive {:chat_push, "chat_message", m1}
    assert m1["from"] == "Alice"
    assert m1["text"] == "hello town"

    assert_receive {:chat_push, "chat_message", m2}
    assert m2["from"] == "Alice"

    refute_receive {:chat_push, "chat_message", _}, 50

    send(ch2, :ping)
    assert_receive :ping
  end

  test "superseded duplicate connect does not double presence join" do
    relay = start_relay()
    conn1 = make_ref()
    ch1 = self()
    :ok = Relay.player_connected(relay, "g1", conn1, ch1, "Alice")
    assert_receive {:chat_push, "chat_presence", %{"event" => "join", "who" => "Alice"}}

    conn2 = make_ref()
    :ok = Relay.player_connected(relay, "g1", conn2, ch1, "Alice")
    refute_receive {:chat_push, "chat_presence", _}, 50
  end

  test "DM echo flag only on sender copy" do
    relay = start_relay()
    {c1, _} = connect(relay, "g1", "Alice")
    {_c2, ch2} = connect(relay, "g2", "Bob")

    :ok = Relay.handle_chat_send(relay, "g1", c1, "/msg Bob secret")

    dm1 = receive do {:chat_push, "chat_dm", m} -> m end
    dm2 = receive do {:chat_push, "chat_dm", m} -> m end
    sender = if dm1["echo"] == true, do: dm1, else: dm2
    recipient = if dm1["echo"] == true, do: dm2, else: dm1
    assert sender["echo"] == true
    assert recipient["echo"] == nil
    assert sender["to"] == "Bob"
    assert recipient["from"] == "Alice"

    send(ch2, :ping)
    assert_receive :ping
  end

  defp drain_chat_messages do
    receive do
      {:chat_push, "chat_message", _} -> drain_chat_messages()
    after
      0 -> :ok
    end
  end
end
