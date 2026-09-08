defmodule Afterlight.Media.WorkerTest do
  use Afterlight.DataCase

  @moduletag :database

  alias Afterlight.Conferencing
  alias Afterlight.Media.Allocator
  alias Afterlight.Media.Prototype
  alias Afterlight.Media.Worker

  defp actor(id), do: Conferencing.actor(id, enabled?: true)

  defp setup_call_and_grant(host_id, opts \\ []) do
    worker_id = Keyword.get(opts, :worker_id, "worker-test-1")
    mode = Keyword.get(opts, :mode, :camera)

    call =
      Conferencing.open_call!(
        %{room_key: "theater:1", worker_id: worker_id, mode: mode},
        actor: actor(host_id)
      )

    # Start worker
    {:ok, _alloc} = Allocator.allocate(call.id, mode: mode, worker_id: worker_id)

    # Issue grant for host
    {:ok, %{token: token, grant: grant}} =
      Conferencing.issue_media_grant(call.id, actor: actor(host_id))

    %{call: call, token: token, grant: grant, worker_id: worker_id}
  end

  test "independent grant validation on join: accepts valid grant, rejects forged and expired" do
    %{call: call, token: token} = setup_call_and_grant("host1")

    # Valid join
    assert {:ok, %{call_id: call_id}} = Worker.join(call.id, "host1", token)
    assert call_id == call.id

    # Forged token
    assert {:error, :bad_signature} = Worker.join(call.id, "host1", token <> "tamper")

    # Mismatched player ID
    assert {:error, :player_mismatch} = Worker.join(call.id, "wrong_player", token)
  end

  test "rejects revoked grant on use" do
    %{call: call, token: token, grant: grant} = setup_call_and_grant("host2")

    # Revoke grant
    {:ok, _} = Conferencing.revoke_grant(grant.id, actor: actor("host2"))

    # Attempt to join with revoked grant
    assert {:error, :revoked} = Worker.join(call.id, "host2", token)
  end

  test "publishing checks permissions" do
    %{call: call} = setup_call_and_grant("host3", mode: :voice)

    # Issue voice-only grant (no video, no screen)
    call_id = call.id
    {:ok, %{token: voice_token}} =
      Conferencing.issue_media_grant(
        call_id,
        %{can_publish_audio: true, can_publish_video: false, can_publish_screen: false},
        actor: actor("host3")
      )

    {:ok, _} = Worker.join(call_id, "host3", voice_token)

    # Audio publish succeeds
    assert :ok = Worker.publish(call_id, "host3", voice_token, %{kind: :audio, track_id: "audio-1"})

    # Video publish denied
    assert {:error, :permission_denied} =
             Worker.publish(call_id, "host3", voice_token, %{kind: :video, track_id: "cam-1"})

    # Screen publish denied
    assert {:error, :permission_denied} =
             Worker.publish(call_id, "host3", voice_token, %{kind: :screen, track_id: "screen-1"})
  end

  test "enforces 4-camera subscription cap per participant" do
    %{call: call, token: host_token} = setup_call_and_grant("host4", mode: :camera)
    call_id = call.id
    {:ok, _} = Worker.join(call_id, "host4", host_token)

    # Add 5 camera publishers
    for n <- 1..5 do
      pid = "publisher-#{n}"
      {:ok, _} = Conferencing.authorize_join(call_id, actor: actor(pid))
      {:ok, %{token: p_token}} =
        Conferencing.issue_media_grant(call_id, %{can_publish_video: true}, actor: actor(pid))
      {:ok, _} = Worker.join(call_id, pid, p_token)
      :ok = Worker.publish(call_id, pid, p_token, %{kind: :video, track_id: "cam-#{n}"})
    end

    # Host subscribes to first 4 cameras -> succeeds
    for n <- 1..4 do
      assert :ok = Worker.subscribe(call_id, "host4", host_token, %{track_id: "cam-#{n}"})
    end

    # 5th camera subscription is rejected by cap
    assert {:error, :camera_subscription_cap_exceeded} =
             Worker.subscribe(call_id, "host4", host_token, %{track_id: "cam-5"})
  end

  test "enforces single screen-share lifecycle" do
    %{call: call, token: token1} = setup_call_and_grant("user1", mode: :camera)
    call_id = call.id
    {:ok, _} = Worker.join(call_id, "user1", token1)

    {:ok, %{token: token2}} =
      Conferencing.issue_media_grant(call_id, %{can_publish_screen: true}, actor: actor("user1"))

    # User 1 publishes screen
    assert :ok = Worker.publish(call_id, "user1", token2, %{kind: :screen, track_id: "screen-u1"})

    # User 2 joins with screen permission
    {:ok, _} = Conferencing.authorize_join(call_id, actor: actor("user2"))
    {:ok, %{token: u2_token}} =
      Conferencing.issue_media_grant(call_id, %{can_publish_screen: true}, actor: actor("user2"))
    {:ok, _} = Worker.join(call_id, "user2", u2_token)

    # User 2 attempting second screen share is rejected
    assert {:error, :screen_share_already_active} =
             Worker.publish(call_id, "user2", u2_token, %{kind: :screen, track_id: "screen-u2"})
  end

  test "server-side mute stops forwarding immediately" do
    %{call: call, token: token} = setup_call_and_grant("mute_user", mode: :voice)
    call_id = call.id
    {:ok, _} = Worker.join(call_id, "mute_user", token)
    :ok = Worker.publish(call_id, "mute_user", token, %{kind: :audio, track_id: "audio-m1"})

    state = Worker.get_state(call_id)
    assert state.publications["audio-m1"].forwarding == true

    # Mute audio
    assert :ok = Worker.set_mute(call_id, "mute_user", token, :audio, true)

    # Forwarding stopped immediately
    state_after = Worker.get_state(call_id)
    assert state_after.publications["audio-m1"].forwarding == false
  end

  test "participant removal tears down publications and subscriptions" do
    %{call: call, token: token} = setup_call_and_grant("remove_user", mode: :voice)
    call_id = call.id
    {:ok, _} = Worker.join(call_id, "remove_user", token)
    :ok = Worker.publish(call_id, "remove_user", token, %{kind: :audio, track_id: "audio-r1"})

    assert Map.has_key?(Worker.get_state(call_id).publications, "audio-r1")

    # Remove participant
    assert :ok = Worker.remove_participant(call_id, "remove_user")

    # Tracks and participant removed
    state_after = Worker.get_state(call_id)
    refute Map.has_key?(state_after.participants, "remove_user")
    refute Map.has_key?(state_after.publications, "audio-r1")
  end

  test "Afterlight.Media.Prototype satisfies SFU behaviour" do
    %{call: call, token: token} = setup_call_and_grant("proto_user", mode: :voice)
    call_id = call.id

    assert {:ok, _} = Prototype.join(call_id, "proto_user", token)
    assert :ok = Prototype.publish(call_id, "proto_user", token, %{kind: :audio, track_id: "p-a1"})
    assert :ok = Prototype.signal(call_id, "proto_user", token, %{"type" => "offer", "sdp" => "v=0..."})
    assert :ok = Prototype.remove_participant(call_id, "proto_user")
    assert :ok = Prototype.close_call(call_id)
  end
end
