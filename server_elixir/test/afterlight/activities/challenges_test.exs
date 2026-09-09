defmodule Afterlight.Activities.ChallengesTest do
  use ExUnit.Case, async: true

  alias Afterlight.Activities.Challenges

  setup do
    name = :"challenges_#{System.unique_integer([:positive])}"
    pid = start_supervised!({Challenges, name: name})
    %{server: pid}
  end

  test "invite delivers to the named target and decline changes no table state", %{server: server} do
    target = self()

    {:ok, invite} =
      Challenges.invite(server, %{
        sender_id: "a",
        target_id: "b",
        activity_id: "pool-1",
        room_id: "theater",
        sender_channel: self(),
        target_channel: target
      })

    assert invite["status"] == "pending"
    assert_receive {:challenge_frame, "activity_challenge", delivered}
    assert delivered["inviteId"] == invite["inviteId"]

    {:ok, result} =
      Challenges.respond(server, %{
        invite_id: invite["inviteId"],
        actor_id: "b",
        accept: false
      })

    assert result["status"] == "declined"
    assert_receive {:challenge_frame, "activity_challenge_result", %{"status" => "declined"}}
  end

  test "one pending invite per sender and three invites per minute", %{server: server} do
    {:ok, _} =
      Challenges.invite(server, %{
        sender_id: "a",
        target_id: "b",
        activity_id: "pool-1",
        sender_channel: self(),
        target_channel: self()
      })

    assert {:error, :pending_invite} =
             Challenges.invite(server, %{
               sender_id: "a",
               target_id: "c",
               activity_id: "pool-1",
               sender_channel: self(),
               target_channel: self()
             })

    now = System.system_time(:millisecond)

    for i <- 1..3 do
      {:ok, inv} =
        Challenges.invite(server, %{
          sender_id: "rate_#{i}",
          target_id: "z",
          activity_id: "pool-1",
          now: now,
          sender_channel: self(),
          target_channel: self()
        })

      {:ok, _} = Challenges.respond(server, %{invite_id: inv["inviteId"], actor_id: "z", accept: false})
    end

    sender = "rate_limited_sender"

    for _ <- 1..3 do
      {:ok, inv} =
        Challenges.invite(server, %{
          sender_id: sender,
          target_id: "z2",
          activity_id: "pool-1",
          now: now,
          sender_channel: self(),
          target_channel: self()
        })

      {:ok, _} = Challenges.respond(server, %{invite_id: inv["inviteId"], actor_id: "z2", accept: false})
    end

    assert {:error, :rate_limited} =
             Challenges.invite(server, %{
               sender_id: sender,
               target_id: "z2",
               activity_id: "pool-1",
               now: now + 1,
               sender_channel: self(),
               target_channel: self()
             })
  end

  test "block and mute suppress delivery", %{server: server} do
    :ok = Challenges.set_blocked(server, "b", "a", true)

    assert {:error, :not_delivered} =
             Challenges.invite(server, %{
               sender_id: "a",
               target_id: "b",
               activity_id: "pool-1",
               sender_channel: self(),
               target_channel: self()
             })

    :ok = Challenges.set_muted(server, "c", true)

    assert {:error, :not_delivered} =
             Challenges.invite(server, %{
               sender_id: "a",
               target_id: "c",
               activity_id: "pool-1",
               sender_channel: self(),
               target_channel: self()
             })
  end

  test "stale accept reports watch/queue and never seats", %{server: server} do
    {:ok, invite} =
      Challenges.invite(server, %{
        sender_id: "a",
        target_id: "b",
        activity_id: "pool-1",
        room_id: "theater",
        sender_channel: self(),
        target_channel: self()
      })

    {:ok, result} =
      Challenges.respond(server, %{
        invite_id: invite["inviteId"],
        actor_id: "b",
        accept: true,
        availability: %{available: false, playing: 2, watching: 3, queued: 1, can_watch: true, can_queue: true}
      })

    assert result["status"] == "stale"
    assert result["teleport"] == false
    assert result["autoSeat"] == false
    assert result["availability"]["canWatch"] == true
    assert result["availability"]["playing"] == 2
  end

  test "accepted invite highlights and never teleports", %{server: server} do
    {:ok, invite} =
      Challenges.invite(server, %{
        sender_id: "a",
        target_id: "b",
        activity_id: "pool-1",
        room_id: "theater",
        sender_channel: self(),
        target_channel: self()
      })

    {:ok, result} =
      Challenges.respond(server, %{
        invite_id: invite["inviteId"],
        actor_id: "b",
        accept: true,
        availability: %{available: true}
      })

    assert result["status"] == "accepted"
    assert result["highlight"] == true
    assert result["teleport"] == false
    assert result["autoSeat"] == false
  end
end
