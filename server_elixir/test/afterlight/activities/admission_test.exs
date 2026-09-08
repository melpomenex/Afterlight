defmodule Afterlight.Activities.AdmissionTest do
  use ExUnit.Case, async: false

  alias Afterlight.Activities.Admission

  setup do
    player_id = "test_player_#{System.unique_integer([:positive])}"
    meta = %{room_key: "theater", activity_id: "pong", session_id: "sess_1", slot: 0}
    %{player_id: player_id, meta: meta}
  end

  describe "atomic admission leases" do
    test "acquire succeeds and release frees the lease", ctx do
      refute Admission.playing?(ctx.player_id)
      assert Admission.where_playing(ctx.player_id) == :none

      assert {:ok, :acquired} = Admission.acquire(ctx.player_id, ctx.meta)
      assert Admission.playing?(ctx.player_id)
      assert {:ok, {pid, meta}} = Admission.where_playing(ctx.player_id)
      assert pid == self()
      assert meta == ctx.meta

      # Re-acquire from same process
      new_meta = %{ctx.meta | slot: 1}
      assert {:ok, :already_acquired} = Admission.acquire(ctx.player_id, new_meta)
      assert {:ok, {_pid, ^new_meta}} = Admission.where_playing(ctx.player_id)

      # Release
      assert :ok = Admission.release(ctx.player_id)
      refute Admission.playing?(ctx.player_id)
      assert Admission.where_playing(ctx.player_id) == :none
    end

    test "concurrent / cross-process claim is rejected atomically", ctx do
      assert {:ok, :acquired} = Admission.acquire(ctx.player_id, ctx.meta)

      other_task =
        Task.async(fn ->
          Admission.acquire(ctx.player_id, %{ctx.meta | session_id: "other_sess"})
        end)

      assert {:error, :already_playing} = Task.await(other_task)
    end

    test "crash of holder automatically releases the lease without orphans", ctx do
      test_pid = self()

      worker =
        spawn(fn ->
          {:ok, :acquired} = Admission.acquire(ctx.player_id, ctx.meta)
          send(test_pid, :acquired)

          receive do
            :crash -> exit(:simulated_crash)
          end
        end)

      assert_receive :acquired
      assert Admission.playing?(ctx.player_id)

      # Kill the worker
      Process.monitor(worker)
      send(worker, :crash)
      assert_receive {:DOWN, _, :process, ^worker, _}

      # Now another process can acquire cleanly
      assert {:ok, :acquired} = Admission.acquire(ctx.player_id, %{ctx.meta | session_id: "new_sess"})
      assert Admission.playing?(ctx.player_id)

      # Cleanup
      Admission.release(ctx.player_id)
    end
  end
end
