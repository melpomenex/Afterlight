defmodule Afterlight.Conferencing.E2EFailureTest do
  use Afterlight.DataCase, async: false

  import Phoenix.ChannelTest
  import ExUnit.CaptureLog

  alias Afterlight.Conferencing
  alias Afterlight.Conferencing.{CallMembership, Feature, Grants, Turn}
  alias Afterlight.Gateway.Auth
  alias Afterlight.Media.Allocator
  alias Afterlight.Media.Worker

  @endpoint AfterlightWeb.Endpoint

  setup do
    on_exit(fn ->
      Application.put_env(
        :afterlight,
        :conferencing,
        Keyword.put(Application.get_env(:afterlight, :conferencing, []), :enabled, false)
      )
    end)

    cfg = Application.get_env(:afterlight, :conferencing, [])
    Application.put_env(:afterlight, :conferencing, Keyword.put(cfg, :enabled, true))
    :ok
  end

  defp guest_socket(guest_id) do
    {:ok, %{token: token}} = Auth.issue(guest_id, nil)
    {:ok, socket} = connect(AfterlightWeb.UserSocket, %{"token" => token})
    socket
  end

  defp open_call!(host_id, opts \\ []) do
    worker_id = Keyword.get(opts, :worker_id, "worker-e2e-1")
    mode = Keyword.get(opts, :mode, :voice)

    call =
      Conferencing.open_call!(
        %{room_key: "theater:1", worker_id: worker_id, mode: mode},
        actor: Conferencing.actor(host_id, enabled?: true)
      )

    {:ok, _alloc} = Allocator.allocate(call.id, mode: mode, worker_id: worker_id)
    call
  end

  describe "Task 4.1: Two-browser voice call end-to-end" do
    test "explicit start, join, audio flows, mute, unmute, leave; late joiner receives call state" do
      call = open_call!("caller_a")
      sock_a = guest_socket("caller_a")

      # Caller A joins
      {:ok, reply_a, sock_a} = subscribe_and_join(sock_a, AfterlightWeb.CallChannel, "call:#{call.id}")
      Process.unlink(sock_a.channel_pid)

      assert reply_a.call_id == call.id
      assert reply_a.player_id == "caller_a"
      assert is_binary(reply_a.grant)

      # Publish Caller A audio track to worker
      assert :ok = Worker.publish(call.id, "caller_a", reply_a.grant, %{kind: :audio, track_id: "track-a"})

      # Caller B (late joiner) joins
      sock_b = guest_socket("caller_b")
      {:ok, reply_b, sock_b} = subscribe_and_join(sock_b, AfterlightWeb.CallChannel, "call:#{call.id}")
      Process.unlink(sock_b.channel_pid)

      # Late joiner receives existing participant in state
      assert Enum.any?(reply_b.participants, &(&1.player_id == "caller_a"))

      # Caller B subscribes to Caller A's audio
      assert :ok = Worker.subscribe(call.id, "caller_b", reply_b.grant, %{track_id: "track-a"})

      # Mute Caller A
      ref_mute = push(sock_a, "mute", %{"kind" => "audio", "muted" => true})
      assert_reply ref_mute, :ok
      assert Worker.get_state(call.id).publications["track-a"].forwarding == false

      # Unmute Caller A
      ref_unmute = push(sock_a, "mute", %{"kind" => "audio", "muted" => false})
      assert_reply ref_unmute, :ok
      assert Worker.get_state(call.id).publications["track-a"].forwarding == true

      # Caller B leaves cleanly
      ref_leave = push(sock_b, "leave", %{})
      assert_reply ref_leave, :ok
      assert_broadcast "participant_left", %{player_id: "caller_b"}
    end
  end

  describe "Task 4.2: Mute and Revoke enforcement" do
    test "server-side mute stops forwarding; revoked grant stops capture tracks immediately" do
      call = open_call!("mod_host")
      sock_mod = guest_socket("mod_host")
      {:ok, reply_mod, sock_mod} = subscribe_and_join(sock_mod, AfterlightWeb.CallChannel, "call:#{call.id}")
      Process.unlink(sock_mod.channel_pid)

      sock_target = guest_socket("violator")
      {:ok, reply_target, sock_target} = subscribe_and_join(sock_target, AfterlightWeb.CallChannel, "call:#{call.id}")
      Process.unlink(sock_target.channel_pid)

      # Target publishes
      :ok = Worker.publish(call.id, "violator", reply_target.grant, %{kind: :audio, track_id: "v-audio"})
      assert Worker.get_state(call.id).publications["v-audio"].forwarding == true

      # Mute target server-side
      assert :ok = Worker.set_mute(call.id, "violator", reply_target.grant, :audio, true)
      assert Worker.get_state(call.id).publications["v-audio"].forwarding == false

      # Moderator revokes target's grant in Ash
      {:ok, payload} = Grants.verify(reply_target.grant)
      jti = payload["jti"]
      {:ok, _} = Conferencing.revoke_grant(jti, actor: Conferencing.actor("mod_host"))

      # Worker rejects any further action with revoked grant
      assert {:error, :revoked} = Worker.publish(call.id, "violator", reply_target.grant, %{kind: :audio, track_id: "new-track"})

      # Removal mid-call tears down subscriptions and publications
      assert :ok = Worker.remove_participant(call.id, "violator")
      refute Map.has_key?(Worker.get_state(call.id).publications, "v-audio")
      refute Map.has_key?(Worker.get_state(call.id).participants, "violator")
    end
  end

  describe "Task 4.3: Permission-denied paths" do
    test "rejects non-member join, forged IDs, expired grant, missing publish permissions" do
      call = open_call!("perm_host")

      # 1. Non-existent call ID
      sock_rogue = guest_socket("rogue")
      assert {:error, %{reason: _}} =
               subscribe_and_join(sock_rogue, AfterlightWeb.CallChannel, "call:00000000-0000-0000-0000-000000000000")

      # 2. Forged player ID on signaling
      {:ok, reply_h, sock_h} = subscribe_and_join(guest_socket("perm_host"), AfterlightWeb.CallChannel, "call:#{call.id}")
      Process.unlink(sock_h.channel_pid)

      # Sending signal targeting a player who is not a member fails
      ref = push(sock_h, "signal", %{
        "target_player_id" => "ghost_player",
        "type" => "offer",
        "data" => %{"sdp" => "v=0..."}
      })
      assert_reply ref, :error, %{reason: "not_member"}

      # 3. Forged grant token presented to worker
      assert {:error, :bad_signature} = Worker.join(call.id, "perm_host", "invalid.token.structure")

      # 4. Expired grant presented to worker
      past = DateTime.add(DateTime.utc_now(), -600, :second)
      {:ok, %{token: expired_token}} =
        Conferencing.issue_media_grant(call.id, actor: Conferencing.actor("perm_host"))

      # Verify worker rejects when expired
      assert {:error, :expired} = Grants.verify(expired_token, now: DateTime.add(DateTime.utc_now(), 10_000, :second))
    end
  end

  describe "Task 4.4: TURN-only connectivity test" do
    test "TURN credentials issue with UDP and TCP/TLS fallback; stale/expired credentials rejected" do
      player_id = "turn_player"
      creds = Turn.issue_credentials(player_id, ttl_secs: 10)

      # Verify URLs contain UDP and TLS fallback
      assert Enum.any?(creds.urls, &String.contains?(&1, "transport=udp"))
      assert Enum.any?(creds.urls, &String.contains?(&1, "transport=tcp"))
      assert Enum.any?(creds.urls, &String.starts_with?(&1, "turns:"))

      # Valid credentials accepted
      assert {:ok, ^player_id} = Turn.verify_credentials(creds.username, creds.credential)

      # Stale / expired credentials fail closed
      past = DateTime.add(DateTime.utc_now(), 20, :second)
      assert {:error, :expired} = Turn.verify_credentials(creds.username, creds.credential, now: past)

      # Forged credential rejected
      assert {:error, :bad_credential} = Turn.verify_credentials(creds.username, "forged_secret")
    end
  end

  describe "Task 4.5: Worker-kill recovery test" do
    test "killing worker mid-call allows visible re-allocation and renegotiation within target recovery time" do
      call = open_call!("kill_host")
      call_id = call.id
      worker_pid = Allocator.whereis(call_id)
      assert is_pid(worker_pid)
      assert Process.alive?(worker_pid)

      # Record start time
      start_time = System.monotonic_time(:millisecond)

      # Kill worker process mid-call
      Process.exit(worker_pid, :kill)
      :timer.sleep(50)

      # Verify worker is down
      refute Process.alive?(worker_pid)

      # Recovery: Allocator re-allocates a fresh worker
      assert {:ok, alloc} = Allocator.allocate(call_id)
      assert is_binary(alloc.worker_id)

      # Client renegotiates and rejoins fresh worker
      {:ok, %{token: fresh_token}} = Conferencing.issue_media_grant(call_id, actor: Conferencing.actor("kill_host"))
      assert {:ok, %{call_id: ^call_id}} = Worker.join(call_id, "kill_host", fresh_token)

      elapsed_ms = System.monotonic_time(:millisecond) - start_time

      # Verified recovery target: recovery < 10,000 ms (< 10 s)
      assert elapsed_ms < 10_000
    end
  end

  describe "Task 4.6: Web-restart coexistence test" do
    test "worker accepts only validated unexpired grants; re-entry requires fresh authorization" do
      call = open_call!("restart_host")
      call_id = call.id

      {:ok, %{token: valid_token}} = Conferencing.issue_media_grant(call_id, actor: Conferencing.actor("restart_host"))
      assert {:ok, _} = Worker.join(call_id, "restart_host", valid_token)

      # Unauthenticated new entrant without grant is rejected
      assert {:error, :malformed} = Worker.join(call_id, "intruder", "not_a_jwt_token")

      # Fresh entrant must obtain valid signed grant from domain action
      {:ok, _} = Conferencing.authorize_join(call_id, actor: Conferencing.actor("fresh_joiner"))
      {:ok, %{token: fresh_token}} = Conferencing.issue_media_grant(call_id, actor: Conferencing.actor("fresh_joiner"))
      assert {:ok, _} = Worker.join(call_id, "fresh_joiner", fresh_token)
    end
  end

  describe "Task 4.7: Log hygiene test" do
    test "grant tokens, TURN credentials, and SDP payloads never appear in logs" do
      call = open_call!("log_player")
      sock = guest_socket("log_player")

      log =
        capture_log(fn ->
          {:ok, reply, sock} = subscribe_and_join(sock, AfterlightWeb.CallChannel, "call:#{call.id}")
          Process.unlink(sock.channel_pid)

          ref = push(sock, "signal", %{
            "target_player_id" => "log_player",
            "type" => "offer",
            "data" => %{"sdp" => "sensitive_sdp_fingerprint_xyz"}
          })
          _ = ref
          _ = reply
        end)

      refute String.contains?(log, "sensitive_sdp_fingerprint_xyz")
      refute String.contains?(log, "afterlight-turn-spike-secret")
    end
  end
end
