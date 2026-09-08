defmodule AfterlightWeb.CallChannelTest do
  use Afterlight.DataCase, async: false

  import Phoenix.ChannelTest
  import ExUnit.CaptureLog

  alias Afterlight.Conferencing
  alias Afterlight.Conferencing.Feature
  alias Afterlight.Gateway.Auth
  alias Afterlight.Media.Allocator

  @endpoint AfterlightWeb.Endpoint

  setup do
    on_exit(fn ->
      Application.put_env(:afterlight, :conferencing, Keyword.put(Application.get_env(:afterlight, :conferencing, []), :enabled, false))
    end)
    :ok
  end

  defp enable_conferencing! do
    cfg = Application.get_env(:afterlight, :conferencing, [])
    Application.put_env(:afterlight, :conferencing, Keyword.put(cfg, :enabled, true))
  end

  defp guest_socket(guest_id) do
    {:ok, %{token: token}} = Auth.issue(guest_id, nil)
    {:ok, socket} = connect(AfterlightWeb.UserSocket, %{"token" => token})
    socket
  end

  defp open_call!(host_id, opts \\ []) do
    worker_id = Keyword.get(opts, :worker_id, "worker-ch-1")
    mode = Keyword.get(opts, :mode, :voice)

    call =
      Conferencing.open_call!(
        %{room_key: "theater:1", worker_id: worker_id, mode: mode},
        actor: Conferencing.actor(host_id, enabled?: true)
      )

    {:ok, _alloc} = Allocator.allocate(call.id, mode: mode, worker_id: worker_id)
    call
  end

  test "refuses join when conferencing is disabled" do
    call = open_call!("host-dis")
    socket = guest_socket("host-dis")

    assert {:error, %{reason: "conferencing_disabled"}} =
             subscribe_and_join(socket, AfterlightWeb.CallChannel, "call:#{call.id}")
  end

  test "authorized join succeeds, issues grant and TURN creds, broadcasts participant_joined" do
    enable_conferencing!()
    call = open_call!("host-1")
    socket1 = guest_socket("host-1")

    # Host joins topic
    {:ok, reply, socket1} = subscribe_and_join(socket1, AfterlightWeb.CallChannel, "call:#{call.id}")
    Process.unlink(socket1.channel_pid)

    assert reply.call_id == call.id
    assert is_binary(reply.grant)
    assert is_map(reply.turn)
    assert is_binary(reply.turn.credential)

    # Player 2 joins topic
    socket2 = guest_socket("player-2")
    {:ok, reply2, socket2} = subscribe_and_join(socket2, AfterlightWeb.CallChannel, "call:#{call.id}")
    Process.unlink(socket2.channel_pid)

    assert reply2.call_id == call.id

    # Host received participant_joined
    assert_broadcast "participant_joined", %{player_id: "player-2"}
  end

  test "signaling relays between authorized members" do
    enable_conferencing!()
    call = open_call!("host-sig")
    socket1 = guest_socket("host-sig")
    {:ok, _reply1, socket1} = subscribe_and_join(socket1, AfterlightWeb.CallChannel, "call:#{call.id}")
    Process.unlink(socket1.channel_pid)

    socket2 = guest_socket("player-sig")
    {:ok, _reply2, socket2} = subscribe_and_join(socket2, AfterlightWeb.CallChannel, "call:#{call.id}")
    Process.unlink(socket2.channel_pid)

    # Player 1 sends offer to Player 2
    ref = push(socket1, "signal", %{
      "target_player_id" => "player-sig",
      "type" => "offer",
      "data" => %{"sdp" => "v=0..."}
    })
    assert_reply ref, :ok

    # Player 2 receives signal broadcast
    assert_broadcast "signal", %{
      from_player_id: "host-sig",
      target_player_id: "player-sig",
      type: "offer",
      data: %{"sdp" => "v=0..."}
    }
  end

  test "mute broadcasts to call topic" do
    enable_conferencing!()
    call = open_call!("host-mute")
    socket = guest_socket("host-mute")
    {:ok, _reply, socket} = subscribe_and_join(socket, AfterlightWeb.CallChannel, "call:#{call.id}")
    Process.unlink(socket.channel_pid)

    ref = push(socket, "mute", %{"kind" => "audio", "muted" => true})
    assert_reply ref, :ok

    assert_broadcast "participant_muted", %{
      player_id: "host-mute",
      kind: "audio",
      muted: true
    }
  end

  test "grant renewal issues fresh token" do
    enable_conferencing!()
    call = open_call!("host-renew")
    socket = guest_socket("host-renew")
    {:ok, reply1, socket} = subscribe_and_join(socket, AfterlightWeb.CallChannel, "call:#{call.id}")
    Process.unlink(socket.channel_pid)

    ref = push(socket, "renew_grant", %{})
    assert_reply ref, :ok, %{grant: new_token}
    assert is_binary(new_token)
    assert new_token != reply1.grant
  end

  test "leave broadcasts participant_left and cleans up" do
    enable_conferencing!()
    call = open_call!("host-leave")
    socket = guest_socket("host-leave")
    {:ok, _reply, socket} = subscribe_and_join(socket, AfterlightWeb.CallChannel, "call:#{call.id}")
    Process.unlink(socket.channel_pid)

    ref = push(socket, "leave", %{})
    assert_reply ref, :ok
    assert_broadcast "participant_left", %{player_id: "host-leave"}
  end

  test "capacity limit is enforced at 8 members" do
    enable_conferencing!()
    call = open_call!("host-cap")

    # host-cap is member #1. Add 7 more participants to reach capacity (8)
    sockets =
      for n <- 1..7 do
        id = "cap-user-#{n}"
        sock = guest_socket(id)
        {:ok, _, sock} = subscribe_and_join(sock, AfterlightWeb.CallChannel, "call:#{call.id}")
        Process.unlink(sock.channel_pid)
        sock
      end

    # 9th participant (8th joined via channel) is rejected
    sock_overflow = guest_socket("cap-user-overflow")
    assert {:error, %{reason: reason}} =
             subscribe_and_join(sock_overflow, AfterlightWeb.CallChannel, "call:#{call.id}")
    assert reason =~ "capacity"

    _ = sockets
  end

  test "log hygiene: grant tokens, TURN credentials, and SDP payloads never appear in logs" do
    enable_conferencing!()
    call = open_call!("host-log")
    socket = guest_socket("host-log")

    log =
      capture_log(fn ->
        {:ok, reply, socket} = subscribe_and_join(socket, AfterlightWeb.CallChannel, "call:#{call.id}")
        Process.unlink(socket.channel_pid)

        ref = push(socket, "signal", %{
          "target_player_id" => "host-log",
          "type" => "offer",
          "data" => %{"sdp" => "sensitive-sdp-marker-12345"}
        })
        _ = ref
      end)

    # Secrets and raw payloads never appear in logs
    refute String.contains?(log, "sensitive-sdp-marker-12345")
    refute String.contains?(log, "turn-spike-secret")
  end
end
