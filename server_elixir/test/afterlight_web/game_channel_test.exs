defmodule AfterlightWeb.GameChannelTest do
  use Afterlight.DataCase, async: false

  import Phoenix.ChannelTest

  alias Afterlight.Gateway.Auth
  alias Afterlight.Gateway.RateLimit

  @endpoint AfterlightWeb.Endpoint

  setup do
    GatewayTest.FakeCore.set_owner(self())
    RateLimit.reset()
    :ok
  end

  defp guest_socket(guest_id) do
    {:ok, %{token: token}} = Auth.issue(guest_id, nil)
    {:ok, socket} = connect(AfterlightWeb.UserSocket, %{"token" => token})
    socket
  end

  defp join(guest_id) do
    socket = guest_socket(guest_id)
    {:ok, reply, socket} = subscribe_and_join(socket, AfterlightWeb.GameChannel, "game:v1")
    # The channel is linked to this process; unlink so intentional
    # self-stops (relay_down, identity_mismatch) don't kill the test,
    # and so leave/1 is safe (see ChannelTest "Leave and close").
    Process.unlink(socket.channel_pid)
    {socket, reply}
  end

  describe "join authorization (task 1.3)" do
    test "join is refused without a verified identity" do
      socket = socket(AfterlightWeb.UserSocket, nil, %{})
      assert {:error, %{reason: "unauthorized"}} = subscribe_and_join(socket, AfterlightWeb.GameChannel, "game:v1")
    end

    test "unknown topics are refused" do
      socket = guest_socket("guest_ch_topic")
      assert {:error, %{reason: "unauthorized"}} = subscribe_and_join(socket, AfterlightWeb.GameChannel, "lobby:v9")
    end

    test "authorized join succeeds and replies the verified guestId" do
      {socket, reply} = join("guest_ch_join")
      assert reply == %{guestId: "guest_ch_join"}
      leave(socket)
    end
  end

  describe "ping termination (design D4)" do
    test "ping is answered at the gateway and never relayed" do
      {socket, _} = join("guest_ch_ping")

      push(socket, "ping", %{"t" => 1_234})
      assert_push "pong", %{"t" => 1_234}

      # No relay call happened: no upstream frame, period.
      refute_receive {:fake_frame, _, _}, 200

      leave(socket)
    end
  end

  describe "relay to Node (everything else, design D4)" do
    test "client frames are forwarded flat with \"type\" re-attached" do
      {socket, _} = join("guest_ch_relay1")

      push(socket, "movement", %{"x" => 3.5, "z" => -1.25, "rotY" => 0.0, "walking" => true, "sitting" => false})

      assert_receive {:fake_frame, _up, json}, 1_000

      assert Jason.decode!(json) == %{
               "type" => "movement",
               "x" => 3.5,
               "z" => -1.25,
               "rotY" => 0.0,
               "walking" => true,
               "sitting" => false
             }

      leave(socket)
    end

    test "unknown types are forwarded to Node too (Node ignores unknown types)" do
      {socket, _} = join("guest_ch_relay2")

      push(socket, "definitely_not_a_type", %{"x" => 1})

      assert_receive {:fake_frame, _up, json}, 1_000
      assert Jason.decode!(json) == %{"type" => "definitely_not_a_type", "x" => 1}

      leave(socket)
    end

    test "upstream frames are pushed with the flat split (event = type, payload = fields)" do
      {socket, _} = join("guest_ch_relay3")
      assert_receive {:fake_upstream_started, up, _headers}

      # The load-bearing connection order (protocol-catalog §2), pushed
      # by the "Node" side; the channel must surface them verbatim.
      GatewayTest.FakeCore.inject_frame(up, %{"type" => "welcome", "player" => %{"id" => "guest_ch_relay3"}})
      GatewayTest.FakeCore.inject_frame(up, %{"type" => "garden_state", "roomId" => "garden:guest_ch_relay3", "beds" => []})
      GatewayTest.FakeCore.inject_frame(up, %{"type" => "chat_history", "channel" => "global", "messages" => []})

      assert_push "welcome", %{"player" => %{"id" => "guest_ch_relay3"}}
      assert_push "garden_state", %{"roomId" => "garden:guest_ch_relay3", "beds" => []}
      assert_push "chat_history", %{"messages" => []}

      leave(socket)
    end
  end

  describe "hello identity binding (design D3, task 5.3)" do
    test "hello whose guestId differs from the token claim is refused" do
      {socket, _} = join("guest_ch_hello1")
      assert_receive {:fake_upstream_started, up, _headers}
      ref = Process.monitor(socket.channel_pid)

      push(socket, "hello", %{"guestId" => "someone_else", "nickname" => "Impostor"})

      assert_push "error", %{"message" => "identity_mismatch"}
      # The session is torn down: channel stopped, upstream closed.
      assert_receive {:DOWN, ^ref, :process, _pid, _reason}, 1_000
      assert_receive {:fake_closed, ^up}, 1_000
    end

    test "hello with the matching guestId is forwarded verbatim" do
      {socket, _} = join("guest_ch_hello2")

      push(socket, "hello", %{"guestId" => "guest_ch_hello2", "nickname" => "Fern"})

      assert_receive {:fake_frame, _up, json}, 1_000
      assert Jason.decode!(json) == %{"type" => "hello", "guestId" => "guest_ch_hello2", "nickname" => "Fern"}
    end

    test "hello without guestId gets the verified claim injected" do
      {socket, _} = join("guest_ch_hello3")

      push(socket, "hello", %{"nickname" => "Moss"})

      assert_receive {:fake_frame, _up, json}, 1_000
      assert Jason.decode!(json) == %{"type" => "hello", "guestId" => "guest_ch_hello3", "nickname" => "Moss"}
    end
  end

  describe "relay failure handling" do
    test "upstream close pushes error relay_down and closes the socket" do
      {socket, _} = join("guest_ch_down1")
      assert_receive {:fake_upstream_started, up, _headers}
      ref = Process.monitor(socket.channel_pid)

      GatewayTest.FakeCore.inject_down(up)

      assert_push "error", %{"message" => "relay_down"}
      assert_receive {:DOWN, ^ref, :process, _pid, _reason}, 1_000
      # The proxy/session is gone afterwards.
      wait_until(fn -> Afterlight.Gateway.Sessions.lookup_proxy("guest_ch_down1") == nil end)
    end
  end

  defp wait_until(fun, tries \\ 100)

  defp wait_until(_fun, 0), do: flunk("condition not met in time")

  defp wait_until(fun, tries) do
    if fun.() do
      :ok
    else
      Process.sleep(10)
      wait_until(fun, tries - 1)
    end
  end
end
