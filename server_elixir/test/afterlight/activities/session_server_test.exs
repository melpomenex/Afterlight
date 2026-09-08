defmodule Afterlight.Activities.SessionServerTest do
  use ExUnit.Case, async: false

  alias Afterlight.Activities
  alias Afterlight.World.Lease

  @act_def %{
    "id" => "pong-table",
    "type" => "pong",
    "rulesVersion" => 1,
    "capacities" => %{"players" => 2, "spectators" => 4, "queue" => 3},
    "interactionRadius" => 5.0,
    "transform" => %{"position" => [0.0, 0.0, 0.0]}
  }

  setup do
    # Spawn a fake room process that responds to RoomServer calls
    room_pid = spawn_link(fn -> fake_room_loop(%{}) end)
    room_key = "theater-test-#{System.unique_integer([:positive])}"
    room_epoch = 1

    handle = %Lease.Handle{
      room_key: room_key,
      owner_node: "test_node",
      epoch: room_epoch,
      fenced: false
    }

    %{
      room_pid: room_pid,
      room_key: room_key,
      room_epoch: room_epoch,
      handle: handle
    }
  end

  defp fake_room_loop(members) do
    receive do
      {:set_member, player_id, conn_ref, pose} ->
        fake_room_loop(Map.put(members, player_id, %{conn_ref: conn_ref, pose: pose}))

      {:remove_member, player_id} ->
        fake_room_loop(Map.delete(members, player_id))

      {:"$gen_call", from, {:member?, player_id, conn_ref}} ->
        m = Map.get(members, player_id)
        # If no members map populated, default to true for basic tests
        res = if members == %{}, do: true, else: m != nil and m.conn_ref == conn_ref
        GenServer.reply(from, res)
        fake_room_loop(members)

      {:"$gen_call", from, {:member_pose, player_id}} ->
        case Map.get(members, player_id) do
          nil ->
            if members == %{} do
              GenServer.reply(from, {:ok, %{x: 0.0, z: 0.0}})
            else
              GenServer.reply(from, :not_found)
            end

          m ->
            GenServer.reply(from, {:ok, m.pose})
        end

        fake_room_loop(members)

      {:"$gen_call", from, :lease_handle} ->
        GenServer.reply(from, {:ok, 1})
        fake_room_loop(members)

      {:"$gen_cast", {:broadcast_frame, _frame}} ->
        fake_room_loop(members)

      :stop ->
        :ok

      _other ->
        fake_room_loop(members)
    end
  end

  defp make_player(prefix, conn_ref \\ 1, chan_pid \\ nil) do
    uid = System.unique_integer([:positive])
    %{
      player_id: "#{prefix}_#{uid}",
      conn_ref: conn_ref,
      channel_pid: chan_pid || self()
    }
  end

  describe "session lifecycle and ownership" do
    test "starts session and registers under {room_key, room_epoch, activity_id}", ctx do
      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "pong-table",
                 ctx.handle,
                 activity_def: @act_def,
                 check_proximity: false
               )

      assert Process.alive?(session_pid)
      assert {:ok, ^session_pid} = Activities.lookup_session(ctx.room_key, ctx.room_epoch, "pong-table")

      info = Activities.session_info(session_pid)
      assert info.room_key == ctx.room_key
      assert info.room_epoch == ctx.room_epoch
      assert info.activity_id == "pong-table"
      assert String.starts_with?(info.session_id, "act_sess_")
      refute info.fenced
    end

    test "owner loss: room crash immediately terminates session without leaking orphans", ctx do
      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "pong-table",
                 ctx.handle,
                 activity_def: @act_def,
                 check_proximity: false
               )

      session_monitor = Process.monitor(session_pid)

      # Kill the room process
      Process.unlink(ctx.room_pid)
      Process.exit(ctx.room_pid, :kill)

      # Session must detect :DOWN from room and exit
      assert_receive {:DOWN, ^session_monitor, :process, ^session_pid, :shutdown}, 1000
      refute Process.alive?(session_pid)

      # Lookup must now fail
      assert {:error, :not_found} = Activities.lookup_session(ctx.room_key, ctx.room_epoch, "pong-table")
    end

    test "restarted session mints a fresh, unique session_id", ctx do
      assert {:ok, session_pid1} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "pong-table",
                 ctx.handle,
                 activity_def: @act_def,
                 check_proximity: false
               )

      id1 = Activities.session_id(session_pid1)

      # Stop the first session
      Activities.stop_session(session_pid1)
      refute Process.alive?(session_pid1)

      # Start session again
      assert {:ok, session_pid2} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "pong-table",
                 ctx.handle,
                 activity_def: @act_def,
                 check_proximity: false
               )

      id2 = Activities.session_id(session_pid2)
      assert id1 != id2
      assert session_pid1 != session_pid2
    end
  end

  describe "lease fencing and undeclared activities" do
    test "fails to start if activity is undeclared in the room", ctx do
      assert {:error, :activity_not_found} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "undeclared-bowling",
                 ctx.handle,
                 check_proximity: false
               )
    end

    test "fails to start if room is not alive", ctx do
      dead_pid = spawn(fn -> :ok end)
      Process.sleep(10)

      assert {:error, :room_unavailable} =
               Activities.get_or_start_session(
                 dead_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "pong-table",
                 ctx.handle,
                 activity_def: @act_def,
                 check_proximity: false
               )
    end

    test "fails to start if ownership handle is already fenced", ctx do
      fenced_handle = %{ctx.handle | fenced: true}

      assert {:error, :lease_lost} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "pong-table",
                 fenced_handle,
                 activity_def: @act_def,
                 check_proximity: false
               )
    end

    test "commands fail closed when session is fenced", ctx do
      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "pong-table",
                 ctx.handle,
                 activity_def: @act_def,
                 check_proximity: false
               )

      cmd_ctx = make_player("p1")

      # Command succeeds before fencing
      assert {:ok, _result} =
               Activities.command(
                 session_pid,
                 "activity_join",
                 %{"activityId" => "pong-table", "role" => "player"},
                 cmd_ctx
               )

      # Fence the session
      assert :ok = Activities.fence_session(session_pid)

      # Subsequent commands must fail closed with {:error, :lease_lost}
      assert {:error, :lease_lost} =
               Activities.command(
                 session_pid,
                 "activity_join",
                 %{"activityId" => "pong-table", "role" => "player"},
                 cmd_ctx
               )
    end
  end

  describe "atomic cross-room admission and duplicate tabs (task 2.2)" do
    test "an identity can occupy at most one playing slot across activities", ctx do
      assert {:ok, sess_a} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "pong-table",
                 ctx.handle,
                 activity_def: @act_def,
                 check_proximity: false
               )

      # Start a second session (e.g. chess)
      chess_def = %{@act_def | "id" => "chess-table", "type" => "chess"}

      assert {:ok, sess_b} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "chess-table",
                 ctx.handle,
                 activity_def: chess_def,
                 check_proximity: false
               )

      p1_ctx = make_player("piper_1")

      # Piper joins pong as player -> succeeds (slot 0)
      assert {:ok, %{result: "seated", slot: 0}} =
               Activities.command(
                 sess_a,
                 "activity_join",
                 %{"activityId" => "pong-table", "role" => "player"},
                 p1_ctx
               )

      # Piper attempts to join chess as player concurrently -> rejected with :already_playing!
      assert {:error, :already_playing} =
               Activities.command(
                 sess_b,
                 "activity_join",
                 %{"activityId" => "chess-table", "role" => "player"},
                 p1_ctx
               )

      # Piper leaves pong
      assert {:ok, %{result: "left"}} =
               Activities.command(
                 sess_a,
                 "activity_leave",
                 %{"activityId" => "pong-table"},
                 p1_ctx
               )

      # Now Piper can join chess as player -> succeeds!
      assert {:ok, %{result: "seated", slot: 0}} =
               Activities.command(
                 sess_b,
                 "activity_join",
                 %{"activityId" => "chess-table", "role" => "player"},
                 p1_ctx
               )
    end

    test "duplicate tab for seated player updates connection in place without allocating a new slot", ctx do
      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "pong-table",
                 ctx.handle,
                 activity_def: @act_def,
                 check_proximity: false
               )

      tab1_ctx = make_player("piper_1", 101)
      tab2_ctx = %{tab1_ctx | conn_ref: 102}

      # Tab 1 joins as player -> slot 0
      assert {:ok, %{result: "seated", slot: 0}} =
               Activities.command(
                 session_pid,
                 "activity_join",
                 %{"activityId" => "pong-table", "role" => "player"},
                 tab1_ctx
               )

      # Tab 2 joins with same player_id -> updates connection in place, still slot 0
      assert {:ok, %{result: "seated", slot: 0}} =
               Activities.command(
                 session_pid,
                 "activity_join",
                 %{"activityId" => "pong-table", "role" => "player"},
                 tab2_ctx
               )

      info = Activities.session_info(session_pid)
      assert map_size(info.players) == 1
      assert info.players[0].conn_ref == 102

      # Tab cannot join queue while already seated
      assert {:error, :already_seated} =
               Activities.command(
                 session_pid,
                 "activity_join",
                 %{"activityId" => "pong-table", "role" => "queue"},
                 tab2_ctx
               )
    end

    test "duplicate tab in queue updates connection in place preserving FIFO position", ctx do
      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "pong-table",
                 ctx.handle,
                 activity_def: @act_def,
                 check_proximity: false
               )

      # Fill player slots first
      p1_ctx = make_player("p1", 1)
      p2_ctx = make_player("p2", 2)

      Activities.command(session_pid, "activity_join", %{"activityId" => "pong-table", "role" => "player"}, p1_ctx)
      Activities.command(session_pid, "activity_join", %{"activityId" => "pong-table", "role" => "player"}, p2_ctx)

      # Q1 joins queue -> pos 1
      q1_tab1 = make_player("q1", 201)
      assert {:ok, %{result: "queued", position: 1}} =
               Activities.command(
                 session_pid,
                 "activity_join",
                 %{"activityId" => "pong-table", "role" => "queue"},
                 q1_tab1
               )

      # Q2 joins queue -> pos 2
      q2_ctx = make_player("q2", 301)
      assert {:ok, %{result: "queued", position: 2}} =
               Activities.command(
                 session_pid,
                 "activity_join",
                 %{"activityId" => "pong-table", "role" => "queue"},
                 q2_ctx
               )

      # Q1 opens second tab and joins queue -> position stays 1, queue length stays 2!
      q1_tab2 = %{q1_tab1 | conn_ref: 202}
      assert {:ok, %{result: "queued", position: 1}} =
               Activities.command(
                 session_pid,
                 "activity_join",
                 %{"activityId" => "pong-table", "role" => "queue"},
                 q1_tab2
               )

      info = Activities.session_info(session_pid)
      assert length(info.queue) == 2
      assert hd(info.queue).conn_ref == 202
    end
  end

  describe "capacity limits and readiness (task 2.2)" do
    test "enforces capacity limits on players, queue, and spectators", ctx do
      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "pong-table",
                 ctx.handle,
                 activity_def: @act_def,
                 check_proximity: false
               )

      p1 = make_player("p1", 1)
      p2 = make_player("p2", 2)
      p3 = make_player("p3", 3)

      assert {:ok, %{slot: 0}} = Activities.command(session_pid, "activity_join", %{"role" => "player"}, p1)
      assert {:ok, %{slot: 1}} = Activities.command(session_pid, "activity_join", %{"role" => "player"}, p2)

      # 3rd player rejected with :activity_full
      assert {:error, :activity_full} =
               Activities.command(session_pid, "activity_join", %{"role" => "player"}, p3)

      # Queue caps at 3 (from @act_def)
      q1 = make_player("q1", 11)
      q2 = make_player("q2", 12)
      q3 = make_player("q3", 13)
      q4 = make_player("q4", 14)

      assert {:ok, %{position: 1}} = Activities.command(session_pid, "activity_join", %{"role" => "queue"}, q1)
      assert {:ok, %{position: 2}} = Activities.command(session_pid, "activity_join", %{"role" => "queue"}, q2)
      assert {:ok, %{position: 3}} = Activities.command(session_pid, "activity_join", %{"role" => "queue"}, q3)
      assert {:error, :queue_full} = Activities.command(session_pid, "activity_join", %{"role" => "queue"}, q4)

      # Spectators cap at 4 (from @act_def)
      s1 = make_player("s1", 21)
      s2 = make_player("s2", 22)
      s3 = make_player("s3", 23)
      s4 = make_player("s4", 24)
      s5 = make_player("s5", 25)

      assert {:ok, %{role: "spectator"}} =
               Activities.command(session_pid, "activity_join", %{"role" => "spectator"}, s1)

      assert {:ok, %{role: "spectator"}} =
               Activities.command(session_pid, "activity_join", %{"role" => "spectator"}, s2)

      assert {:ok, %{role: "spectator"}} =
               Activities.command(session_pid, "activity_join", %{"role" => "spectator"}, s3)

      assert {:ok, %{role: "spectator"}} =
               Activities.command(session_pid, "activity_join", %{"role" => "spectator"}, s4)

      assert {:error, :spectators_full} =
               Activities.command(session_pid, "activity_join", %{"role" => "spectator"}, s5)
    end

    test "readiness: two ready players start the match", ctx do
      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "pong-table",
                 ctx.handle,
                 activity_def: @act_def,
                 check_proximity: false
               )

      p1 = make_player("p1", 1)
      p2 = make_player("p2", 2)

      Activities.command(session_pid, "activity_join", %{"role" => "player"}, p1)
      Activities.command(session_pid, "activity_join", %{"role" => "player"}, p2)

      # Unseated player cannot ready
      p3 = make_player("p3", 3)
      assert {:error, :not_seated} = Activities.command(session_pid, "activity_ready", %{"ready" => true}, p3)

      # P1 readies -> status remains :lobby
      assert {:ok, %{ready: true, status: :lobby}} =
               Activities.command(session_pid, "activity_ready", %{"ready" => true}, p1)

      # P2 readies -> both ready, status becomes :in_progress!
      assert {:ok, %{ready: true, status: :in_progress}} =
               Activities.command(session_pid, "activity_ready", %{"ready" => true}, p2)

      info = Activities.session_info(session_pid)
      assert info.status == :in_progress
      assert is_binary(info.match_id)
    end
  end

  describe "FIFO timed offers and queue promotion (task 2.2)" do
    test "when a slot opens, the first queued player receives a timed offer and can accept it", ctx do
      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "pong-table",
                 ctx.handle,
                 activity_def: @act_def,
                 check_proximity: false
               )

      p1 = make_player("p1", 1)
      p2 = make_player("p2", 2)
      q1 = make_player("q1", 10)

      Activities.command(session_pid, "activity_join", %{"role" => "player"}, p1)
      Activities.command(session_pid, "activity_join", %{"role" => "player"}, p2)
      Activities.command(session_pid, "activity_join", %{"role" => "queue"}, q1)

      # P1 leaves -> slot 0 opens
      Activities.command(session_pid, "activity_leave", %{}, p1)

      # Q1 must have received an offer for slot 0!
      info = Activities.session_info(session_pid)
      assert Map.has_key?(info.offers, 0)
      assert info.offers[0].player_id == q1.player_id
      assert info.queue == []

      # Q1 accepts the offer via activity_ready
      assert {:ok, %{result: "accepted_offer", slot: 0, ready: true}} =
               Activities.command(session_pid, "activity_ready", %{"ready" => true}, q1)

      info = Activities.session_info(session_pid)
      assert info.offers == %{}
      assert info.players[0].player_id == q1.player_id
      assert info.players[0].ready == true
    end

    test "when timed offer expires, slot is offered to the next player in FIFO queue", ctx do
      # Configure session with a tight 60ms offer timeout for the test
      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "pong-table",
                 ctx.handle,
                 activity_def: @act_def,
                 offer_timeout_ms: 60,
                 check_proximity: false
               )

      p1 = make_player("p1", 1)
      p2 = make_player("p2", 2)
      q1 = make_player("q1", 10)
      q2 = make_player("q2", 20)

      Activities.command(session_pid, "activity_join", %{"role" => "player"}, p1)
      Activities.command(session_pid, "activity_join", %{"role" => "player"}, p2)
      Activities.command(session_pid, "activity_join", %{"role" => "queue"}, q1)
      Activities.command(session_pid, "activity_join", %{"role" => "queue"}, q2)

      # P1 leaves -> slot 0 offered to Q1 first
      Activities.command(session_pid, "activity_leave", %{}, p1)

      info = Activities.session_info(session_pid)
      assert info.offers[0].player_id == q1.player_id
      assert length(info.queue) == 1
      assert hd(info.queue).player_id == q2.player_id

      # Wait for Q1 offer to expire (> 60ms)
      Process.sleep(100)

      # Q1 timed out, slot 0 must now be offered to Q2!
      info = Activities.session_info(session_pid)
      assert info.offers[0].player_id == q2.player_id
      assert info.queue == []
    end
  end

  describe "disconnect grace, forfeit, watchdog, and idle reaping (task 2.3)" do
    defp fake_chan do
      receive do
        _ -> fake_chan()
      end
    end

    test "disconnect during 2-player match pauses match, and reconnecting within grace resumes match", ctx do
      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "pong-table",
                 ctx.handle,
                 activity_def: @act_def,
                 reconnect_grace_ms: 500,
                 check_proximity: false
               )

      c1 = spawn(fn -> fake_chan() end)
      c2 = spawn(fn -> fake_chan() end)

      p1 = make_player("p1", 1, c1)
      p2 = make_player("p2", 2, c2)

      Activities.command(session_pid, "activity_join", %{"role" => "player"}, p1)
      Activities.command(session_pid, "activity_join", %{"role" => "player"}, p2)
      Activities.command(session_pid, "activity_ready", %{"ready" => true}, p1)
      Activities.command(session_pid, "activity_ready", %{"ready" => true}, p2)

      assert Activities.session_info(session_pid).status == :in_progress

      # Player 1's channel drops unexpectedly
      Process.exit(c1, :kill)
      Process.sleep(20)

      # Match must be paused during grace!
      info = Activities.session_info(session_pid)
      assert info.status == :paused
      assert Map.has_key?(info.disconnects, p1.player_id)

      # Player 1 reconnects within grace with new channel
      c1_new = spawn(fn -> fake_chan() end)
      p1_new = %{p1 | conn_ref: 101, channel_pid: c1_new}

      assert {:ok, %{result: "seated", slot: 0, status: :in_progress}} =
               Activities.command(session_pid, "activity_join", %{"role" => "player"}, p1_new)

      # Match resumed and disconnects cleared!
      info = Activities.session_info(session_pid)
      assert info.status == :in_progress
      assert info.disconnects == %{}
    end

    test "disconnect grace expiry causes player to forfeit and remaining player wins", ctx do
      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "pong-table",
                 ctx.handle,
                 activity_def: @act_def,
                 reconnect_grace_ms: 60,
                 check_proximity: false
               )

      c1 = spawn(fn -> fake_chan() end)
      c2 = spawn(fn -> fake_chan() end)

      p1 = make_player("p1", 1, c1)
      p2 = make_player("p2", 2, c2)

      Activities.command(session_pid, "activity_join", %{"role" => "player"}, p1)
      Activities.command(session_pid, "activity_join", %{"role" => "player"}, p2)
      Activities.command(session_pid, "activity_ready", %{"ready" => true}, p1)
      Activities.command(session_pid, "activity_ready", %{"ready" => true}, p2)

      # Player 1 disconnects
      Process.exit(c1, :kill)
      Process.sleep(10)
      assert Activities.session_info(session_pid).status == :paused

      # Wait for grace to expire (> 60ms)
      Process.sleep(100)

      info = Activities.session_info(session_pid)
      assert info.status == :ended
      assert info.match_outcome == %{"winner" => p2.player_id, "loser" => p1.player_id, "reason" => "forfeit"}
      refute Map.has_key?(info.players, 0)
    end

    test "both players disconnecting during match aborts without inventing a winner", ctx do
      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "pong-table",
                 ctx.handle,
                 activity_def: @act_def,
                 reconnect_grace_ms: 60,
                 check_proximity: false
               )

      c1 = spawn(fn -> fake_chan() end)
      c2 = spawn(fn -> fake_chan() end)

      p1 = make_player("p1", 1, c1)
      p2 = make_player("p2", 2, c2)

      Activities.command(session_pid, "activity_join", %{"role" => "player"}, p1)
      Activities.command(session_pid, "activity_join", %{"role" => "player"}, p2)
      Activities.command(session_pid, "activity_ready", %{"ready" => true}, p1)
      Activities.command(session_pid, "activity_ready", %{"ready" => true}, p2)

      # Both disconnect
      Process.exit(c1, :kill)
      Process.exit(c2, :kill)

      # Wait for grace to expire
      Process.sleep(100)

      info = Activities.session_info(session_pid)
      assert info.status == :lobby
      assert info.match_outcome == %{"reason" => "aborted"}
      assert info.players == %{}
    end

    test "explicit leave during an active match forfeits immediately without grace", ctx do
      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "pong-table",
                 ctx.handle,
                 activity_def: @act_def,
                 check_proximity: false
               )

      p1 = make_player("p1", 1)
      p2 = make_player("p2", 2)

      Activities.command(session_pid, "activity_join", %{"role" => "player"}, p1)
      Activities.command(session_pid, "activity_join", %{"role" => "player"}, p2)
      Activities.command(session_pid, "activity_ready", %{"ready" => true}, p1)
      Activities.command(session_pid, "activity_ready", %{"ready" => true}, p2)

      # P1 explicitly leaves
      Activities.command(session_pid, "activity_leave", %{}, p1)

      info = Activities.session_info(session_pid)
      assert info.status == :ended
      assert info.match_outcome == %{"winner" => p2.player_id, "loser" => p1.player_id, "reason" => "forfeit"}
      refute Map.has_key?(info.players, 0)
    end

    test "input watchdog neutralizes continuous input after timeout", ctx do
      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "pong-table",
                 ctx.handle,
                 activity_def: @act_def,
                 input_watchdog_ms: 60,
                 check_proximity: false
               )

      p1 = make_player("p1", 1)
      assert {:ok, %{leaseId: lease}} = Activities.command(session_pid, "activity_join", %{"role" => "player"}, p1)

      # Send input
      assert {:ok, %{ackSeq: 1}} =
               Activities.command(
                 session_pid,
                 "activity_input",
                 %{"lease" => lease, "seq" => 1, "input" => %{"vy" => 1.0}},
                 p1
               )

      info = Activities.session_info(session_pid)
      assert info.players[0].input_state == %{"vy" => 1.0}

      # Wait for watchdog to fire (> 60ms)
      Process.sleep(100)

      info = Activities.session_info(session_pid)
      # Must be neutralized!
      assert info.players[0].input_state == %{}
    end

    test "AFK readiness in lobby expires after ready_timeout_ms", ctx do
      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "pong-table",
                 ctx.handle,
                 activity_def: @act_def,
                 ready_timeout_ms: 60,
                 check_proximity: false
               )

      p1 = make_player("p1", 1)
      Activities.command(session_pid, "activity_join", %{"role" => "player"}, p1)
      Activities.command(session_pid, "activity_ready", %{"ready" => true}, p1)

      info = Activities.session_info(session_pid)
      assert info.players[0].ready == true

      # Wait for ready timeout to fire (> 60ms)
      Process.sleep(100)

      info = Activities.session_info(session_pid)
      assert info.players[0].ready == false
    end

    test "empty session reaps itself after idle_reap_ms", ctx do
      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "pong-table",
                 ctx.handle,
                 activity_def: @act_def,
                 idle_reap_ms: 60,
                 check_proximity: false
               )

      assert Process.alive?(session_pid)

      # Wait for idle reap timeout (> 60ms)
      Process.sleep(100)

      refute Process.alive?(session_pid)
    end
  end

  describe "sequence, lease, full snapshots, event deduplication, and catch-up (task 2.4)" do
    test "participant lease is issued upon seating and required for activity_input", ctx do
      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "pong-table",
                 ctx.handle,
                 activity_def: @act_def,
                 check_proximity: false
               )

      p1 = make_player("p1", 1)

      # Join as player yields leaseId
      assert {:ok, %{result: "seated", slot: 0, leaseId: lease_id, lease: lease_id}} =
               Activities.command(session_pid, "activity_join", %{"role" => "player"}, p1)

      assert is_binary(lease_id)
      assert String.starts_with?(lease_id, "lease_")

      # activity_input without lease is rejected with :invalid_participant_lease
      assert {:error, :invalid_participant_lease} =
               Activities.command(
                 session_pid,
                 "activity_input",
                 %{"seq" => 1, "controls" => %{"vy" => 1.0}},
                 p1
               )

      # activity_input with incorrect lease is rejected
      assert {:error, :invalid_participant_lease} =
               Activities.command(
                 session_pid,
                 "activity_input",
                 %{"lease" => "lease_wrong", "seq" => 1, "controls" => %{"vy" => 1.0}},
                 p1
               )

      # activity_input with matching lease succeeds and returns ackSeq
      assert {:ok, %{ackSeq: 1}} =
               Activities.command(
                 session_pid,
                 "activity_input",
                 %{"lease" => lease_id, "seq" => 1, "controls" => %{"vy" => 1.0}},
                 p1
               )
    end

    test "monotonic sequence numbers are enforced, rejecting duplicates, negative, and stale sequences", ctx do
      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "pong-table",
                 ctx.handle,
                 activity_def: @act_def,
                 check_proximity: false
               )

      p1 = make_player("p1", 1)
      assert {:ok, %{leaseId: lease}} = Activities.command(session_pid, "activity_join", %{"role" => "player"}, p1)

      # Sequence 1 succeeds
      assert {:ok, %{ackSeq: 1}} =
               Activities.command(
                 session_pid,
                 "activity_input",
                 %{"lease" => lease, "seq" => 1, "controls" => %{"vy" => 1.0}},
                 p1
               )

      # Duplicate sequence 1 is rejected as :stale_sequence
      assert {:error, :stale_sequence} =
               Activities.command(
                 session_pid,
                 "activity_input",
                 %{"lease" => lease, "seq" => 1, "controls" => %{"vy" => 1.0}},
                 p1
               )

      # Sequence 0 is stale
      assert {:error, :stale_sequence} =
               Activities.command(
                 session_pid,
                 "activity_input",
                 %{"lease" => lease, "seq" => 0, "controls" => %{"vy" => 1.0}},
                 p1
               )

      # Negative sequence is invalid
      assert {:error, :invalid_sequence} =
               Activities.command(
                 session_pid,
                 "activity_input",
                 %{"lease" => lease, "seq" => -1, "controls" => %{"vy" => 1.0}},
                 p1
               )

      # Non-integer sequence is invalid
      assert {:error, :invalid_sequence} =
               Activities.command(
                 session_pid,
                 "activity_input",
                 %{"lease" => lease, "seq" => "two", "controls" => %{"vy" => 1.0}},
                 p1
               )

      # Monotonically increasing sequence 2 succeeds
      assert {:ok, %{ackSeq: 2}} =
               Activities.command(
                 session_pid,
                 "activity_input",
                 %{"lease" => lease, "seq" => 2, "controls" => %{"vy" => -1.0}},
                 p1
               )
    end

    test "unseated player or spectator cannot submit input", ctx do
      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "pong-table",
                 ctx.handle,
                 activity_def: @act_def,
                 check_proximity: false
               )

      unseated = make_player("unseated")
      spectator = make_player("spectator")

      # Spectator joins
      assert {:ok, %{role: "spectator"}} =
               Activities.command(session_pid, "activity_join", %{"role" => "spectator"}, spectator)

      # Unseated input is rejected
      assert {:error, :not_seated} =
               Activities.command(
                 session_pid,
                 "activity_input",
                 %{"lease" => "lease_fake", "seq" => 1, "controls" => %{}},
                 unseated
               )

      # Spectator input is rejected
      assert {:error, :not_seated} =
               Activities.command(
                 session_pid,
                 "activity_input",
                 %{"lease" => "lease_fake", "seq" => 1, "controls" => %{}},
                 spectator
               )
    end

    test "canonical authority guards: rejects client-supplied score, winner, transform, non-map or out-of-range controls", ctx do
      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "pong-table",
                 ctx.handle,
                 activity_def: @act_def,
                 check_proximity: false
               )

      p1 = make_player("p1", 1)
      assert {:ok, %{leaseId: lease}} = Activities.command(session_pid, "activity_join", %{"role" => "player"}, p1)

      # Attempting to forge score
      assert {:error, :invalid_input} =
               Activities.command(
                 session_pid,
                 "activity_input",
                 %{"lease" => lease, "seq" => 1, "controls" => %{"score" => 99}},
                 p1
               )

      # Attempting to forge winner
      assert {:error, :invalid_input} =
               Activities.command(
                 session_pid,
                 "activity_input",
                 %{"lease" => lease, "seq" => 1, "controls" => %{"winner" => p1.player_id}},
                 p1
               )

      # Attempting to forge ball/paddle transform
      assert {:error, :invalid_input} =
               Activities.command(
                 session_pid,
                 "activity_input",
                 %{"lease" => lease, "seq" => 1, "controls" => %{"transform" => %{}}},
                 p1
               )

      # Non-map controls
      assert {:error, :invalid_input} =
               Activities.command(
                 session_pid,
                 "activity_input",
                 %{"lease" => lease, "seq" => 1, "controls" => "invalid_string"},
                 p1
               )

      # Absurd/infinite float value
      assert {:error, :invalid_input} =
               Activities.command(
                 session_pid,
                 "activity_input",
                 %{"lease" => lease, "seq" => 1, "controls" => %{"vy" => 1.0e10}},
                 p1
               )
    end

    test "reconnect mints a fresh participant lease, invalidating previous lease", ctx do
      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "pong-table",
                 ctx.handle,
                 activity_def: @act_def,
                 check_proximity: false
               )

      c1 = spawn(fn -> fake_chan() end)
      p1 = make_player("p1", 1, c1)

      assert {:ok, %{leaseId: lease1}} = Activities.command(session_pid, "activity_join", %{"role" => "player"}, p1)
      assert {:ok, %{ackSeq: 1}} =
               Activities.command(
                 session_pid,
                 "activity_input",
                 %{"lease" => lease1, "seq" => 1, "controls" => %{"vy" => 1.0}},
                 p1
               )

      # Duplicate tab / reconnect
      c1_new = spawn(fn -> fake_chan() end)
      p1_new = %{p1 | conn_ref: 101, channel_pid: c1_new}

      assert {:ok, %{leaseId: lease2}} = Activities.command(session_pid, "activity_join", %{"role" => "player"}, p1_new)
      assert lease1 != lease2

      # Old lease1 is now rejected
      assert {:error, :invalid_participant_lease} =
               Activities.command(
                 session_pid,
                 "activity_input",
                 %{"lease" => lease1, "seq" => 2, "controls" => %{"vy" => 1.0}},
                 p1_new
               )

      # New lease2 succeeds with seq resetting to 1
      assert {:ok, %{ackSeq: 1}} =
               Activities.command(
                 session_pid,
                 "activity_input",
                 %{"lease" => lease2, "seq" => 1, "controls" => %{"vy" => 1.0}},
                 p1_new
               )
    end

    test "full snapshot contract: version 1, sim, events, <= 32 KiB cap", ctx do
      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "pong-table",
                 ctx.handle,
                 activity_def: @act_def,
                 check_proximity: false
               )

      p1 = make_player("p1", 1)
      assert {:ok, %{leaseId: lease}} = Activities.command(session_pid, "activity_join", %{"role" => "player"}, p1)
      Activities.command(session_pid, "activity_input", %{"lease" => lease, "seq" => 5, "controls" => %{"vy" => 0.5}}, p1)

      snapshot = Activities.session_full_snapshot(session_pid)

      assert snapshot["version"] == 1
      assert snapshot["type"] == "activity_state"
      assert snapshot["activityId"] == "pong-table"
      assert snapshot["roomId"] == ctx.room_key
      assert snapshot["roomEpoch"] == ctx.room_epoch
      assert is_binary(snapshot["sessionId"])
      assert is_integer(snapshot["revision"])
      assert is_integer(snapshot["serverNow"])

      state = snapshot["state"]
      assert is_map(state)
      assert Map.has_key?(state, "sim")
      assert Map.has_key?(state, "events")
      assert Map.has_key?(state, "lastAcceptedSeqs")
      assert state["lastAcceptedSeqs"][p1.player_id] == 5

      # Verify <= 32 KiB cap
      encoded = Jason.encode!(snapshot)
      assert byte_size(encoded) <= 32_768
    end

    test "activity_resnapshot returns full snapshot and validates sessionId", ctx do
      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "pong-table",
                 ctx.handle,
                 activity_def: @act_def,
                 check_proximity: false
               )

      sess_id = Activities.session_id(session_pid)
      p1 = make_player("p1", 1)

      # Valid resnapshot request returns full snapshot
      assert {:ok, snapshot} =
               Activities.command(
                 session_pid,
                 "activity_resnapshot",
                 %{"sessionId" => sess_id},
                 p1
               )

      assert snapshot["version"] == 1
      assert snapshot["sessionId"] == sess_id

      # Stale sessionId is rejected with :stale_session
      assert {:error, :stale_session} =
               Activities.command(
                 session_pid,
                 "activity_resnapshot",
                 %{"sessionId" => "act_sess_stale_999"},
                 p1
               )
    end

    test "event deduplication: events have unique IDs and recent_events ring buffer retains at most 20", ctx do
      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "pong-table",
                 ctx.handle,
                 activity_def: @act_def,
                 check_proximity: false
               )

      p1 = make_player("p1", 1)
      p2 = make_player("p2", 2)

      Activities.command(session_pid, "activity_join", %{"role" => "player"}, p1)
      Activities.command(session_pid, "activity_join", %{"role" => "player"}, p2)
      Activities.command(session_pid, "activity_ready", %{"ready" => true}, p1)
      Activities.command(session_pid, "activity_ready", %{"ready" => true}, p2)

      snapshot = Activities.session_full_snapshot(session_pid)
      events = snapshot["state"]["events"]

      assert is_list(events)
      assert length(events) > 0

      # Each event must have unique id
      ids = Enum.map(events, & &1["id"])
      assert length(ids) == length(Enum.uniq(ids))
      assert Enum.all?(ids, &String.starts_with?(&1, "evt_"))

      # Ring buffer capped at 20
      assert length(events) <= 20
    end

    test "idempotent ready and leave retries do not duplicate effects or revisions", ctx do
      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "pong-table",
                 ctx.handle,
                 activity_def: @act_def,
                 check_proximity: false
               )

      p1 = make_player("p1", 1)
      Activities.command(session_pid, "activity_join", %{"role" => "player"}, p1)

      # First ready
      assert {:ok, %{ready: true, revision: rev1}} =
               Activities.command(session_pid, "activity_ready", %{"ready" => true}, p1)

      # Retry ready(true) -> idempotent, same revision
      assert {:ok, %{ready: true, revision: rev2}} =
               Activities.command(session_pid, "activity_ready", %{"ready" => true}, p1)

      assert rev1 == rev2

      # Leave
      assert {:ok, %{result: "left", revision: rev3}} =
               Activities.command(session_pid, "activity_leave", %{}, p1)

      # Retry leave -> idempotent, same revision
      assert {:ok, %{result: "left", revision: rev4}} =
               Activities.command(session_pid, "activity_leave", %{}, p1)

      assert rev3 == rev4
    end
  end

  describe "Pong authoritative match, scoring, and rematch (task 2.7)" do
    test "authoritative Pong match runs, scores, ends at 7 points, and supports rematch", ctx do
      assert {:ok, session_pid} =
               Activities.get_or_start_session(
                 ctx.room_pid,
                 ctx.room_key,
                 ctx.room_epoch,
                 "pong-table",
                 ctx.handle,
                 activity_def: @act_def,
                 check_proximity: false,
                 tick_interval_ms: 16
               )

      p1 = make_player("p1", 1)
      p2 = make_player("p2", 2)

      {:ok, %{leaseId: l1}} = Activities.command(session_pid, "activity_join", %{"role" => "player"}, p1)
      {:ok, %{leaseId: l2}} = Activities.command(session_pid, "activity_join", %{"role" => "player"}, p2)

      Activities.command(session_pid, "activity_ready", %{"ready" => true}, p1)
      Activities.command(session_pid, "activity_ready", %{"ready" => true}, p2)

      info = Activities.session_info(session_pid)
      assert info.status == :in_progress
      assert is_binary(info.match_id)
      assert info.sim_state["width"] == 800
      assert info.sim_state["targetScore"] == 7
      assert info.sim_state["score"] == %{"0" => 0, "1" => 0}

      # Players send paddle controls
      assert {:ok, %{result: "input_accepted"}} =
               Activities.command(
                 session_pid,
                 "activity_input",
                 %{"lease" => l1, "seq" => 1, "controls" => %{"dy" => -1.0}},
                 p1
               )

      assert {:ok, %{result: "input_accepted"}} =
               Activities.command(
                 session_pid,
                 "activity_input",
                 %{"lease" => l2, "seq" => 1, "controls" => %{"y" => 200.0}},
                 p2
               )

      # Allow simulation to step a few ticks
      Process.sleep(50)

      info = Activities.session_info(session_pid)
      assert info.sim_tick_count > 0

      # Authoritative match ending: inject score of 6 and ball about to score 7th point for slot 0
      fast_state =
        info.sim_state
        |> Map.put("state", "rally")
        |> Map.put("serveDelay", 0)
        |> Map.put("score", %{"0" => 6, "1" => 2})
        |> put_in(["ball", "x"], 798.0)
        |> put_in(["ball", "vx"], 5.0)

      :sys.replace_state(session_pid, fn s -> %{s | sim_state: fast_state} end)

      # Send sim tick to trigger score and match end
      send(session_pid, :sim_tick)
      Process.sleep(30)

      ended_info = Activities.session_info(session_pid)
      assert ended_info.status == :ended
      assert ended_info.match_outcome["reason"] == "score"
      assert ended_info.match_outcome["winner"] == p1.player_id
      assert ended_info.match_outcome["winnerSlot"] == 0
      assert ended_info.match_outcome["score"]["0"] == 7

      # Player ready flags must be reset for rematch
      assert ended_info.players[0].ready == false
      assert ended_info.players[1].ready == false

      # Rematch flow: both players ready up again
      old_match_id = ended_info.match_id
      Activities.command(session_pid, "activity_ready", %{"ready" => true}, p1)
      Activities.command(session_pid, "activity_ready", %{"ready" => true}, p2)

      rematch_info = Activities.session_info(session_pid)
      assert rematch_info.status == :in_progress
      assert rematch_info.match_id != old_match_id
      assert rematch_info.sim_state["score"] == %{"0" => 0, "1" => 0}
      assert rematch_info.sim_state["state"] == "serving"
    end
  end
end
