defmodule Afterlight.Activities.Snowboard.Presentation do
  @moduledoc """
  Race snapshot presentation (add-multiplayer-snowboard-arcade 5.2, D7):
  builds the full participant snapshot (with optional private `self`
  attachment) and the room-wide summary from the live session state.

  Extracted from `SessionServer` so the generic session machinery stays
  small; every function reads the session struct through `Map.get/2` —
  no compile-time dependency on the session module. Envelopes carry the
  public wire room id; leases, seqs and reconciliation data never appear
  in summaries.
  """

  @course_length 1800.0

  # Wire phase names for the race (D4 lifecycle vocabulary).
  defp wire_status(state) do
    case Map.get(state, :status) do
      :lobby -> "lobby"
      :countdown -> "countdown"
      :in_progress -> "racing"
      :ended -> "results"
      other -> to_string(other)
    end
  end

  @doc "Current summary phase (pacing key)."
  def summary_phase(state), do: wire_status(state)

  defp wire_room_id(state), do: Map.get(state, :wire_room_id) || Map.get(state, :room_key)

  defp common_fields(state) do
    sim = Map.get(state, :sim_state) || %{}

    %{
      "type" => "activity_state",
      "version" => 1,
      "roomId" => wire_room_id(state),
      "roomEpoch" => Map.get(state, :room_epoch),
      "activityId" => Map.get(state, :activity_id),
      "sessionId" => Map.get(state, :session_id),
      "revision" => Map.get(state, :revision),
      "serverNow" => System.system_time(:millisecond),
      "audience" => "participants",
      "status" => wire_status(state),
      "matchId" => Map.get(state, :match_id),
      "snapshotSeq" => Map.get(state, :snapshot_seq, 0),
      "serverTick" => Map.get(sim, "tick", 0),
      "courseId" => Map.get(sim, "courseId"),
      "courseVersion" => Map.get(sim, "courseVersion"),
      "courseHash" => Map.get(sim, "courseHash"),
      "queueLength" => length(Map.get(state, :queue) || []),
      "spectatorCount" => map_size(Map.get(state, :spectators) || %{})
    }
  end

  defp player_status(player, rider) do
    cond do
      rider["finishTick"] != nil -> "finished"
      rider["dnfReason"] != nil -> "dnf"
      player.ready -> "ready"
      true -> "unready"
    end
  end

  # One roster row per seated rider (D7 shape).
  defp player_rows(state) do
    sim = Map.get(state, :sim_state) || %{}
    riders = Map.get(sim, "riders") || %{}

    state
    |> Map.get(:players)
    |> Enum.map(fn {slot, player} ->
      rider = Map.get(riders, slot) || %{}

      %{
        "playerId" => player.player_id,
        "slot" => slot,
        "connected" => connected?(player),
        "loaded" => Map.get(player, :loaded, false),
        "ready" => player.ready,
        "status" => player_status(player, rider)
      }
    end)
  end

  defp connected?(%{channel_pid: pid}) when is_pid(pid), do: true
  defp connected?(_), do: false

  @doc "Full participant snapshot (no private attachment — see attach_self/3)."
  def full_snapshot(state) do
    sim = Map.get(state, :sim_state) || %{}

    common_fields(state)
    |> Map.put("startAt", Map.get(sim, "startAt"))
    |> Map.put("deadlineAt", Map.get(sim, "deadlineAt"))
    |> Map.put("state", %{
      "players" => player_rows(state),
      "sim" => %{"riders" => Map.get(sim, "riders", %{}), "tick" => Map.get(sim, "tick", 0)}
    })
    |> Map.put(
      "lastAcceptedSeqs",
      Map.new(Map.get(state, :players) || %{}, fn {_s, p} -> {p.player_id, Map.get(p, :last_seq, 0)} end)
    )
    |> Map.put("result", current_result(state))
  end

  @doc """
  The recipient's private reconciliation attachment: appliedSeq, the canonical
  held controls and the authoritative tick. NEVER broadcast.
  """
  def attach_self(snapshot, state, player) do
    sim = Map.get(state, :sim_state) || %{}
    rider = Map.get(sim["riders"] || %{}, Map.get(player, :slot)) || %{}

    held =
      case Map.get(player, :input_state) do
        controls when is_map(controls) and map_size(controls) > 0 ->
          if controls["kind"] in ["ride", "loaded"], do: controls, else: %{"kind" => "neutral"}

        _ ->
          %{"kind" => "neutral"}
      end

    Map.put(snapshot, "self", %{
      "slot" => Map.get(player, :slot),
      "appliedSeq" => rider["appliedSeq"] || Map.get(player, :last_seq, 0),
      "heldControls" => held,
      "serverTick" => Map.get(sim, "tick", 0)
    })
  end

  defp current_result(%{status: :ended, match_outcome: outcome}) when is_map(outcome), do: outcome
  defp current_result(_state), do: nil

  @doc "Room-wide summary: counters/progress/results only (≤8 riders)."
  def summary(state) do
    sim = Map.get(state, :sim_state) || %{}
    riders = Map.get(sim, "riders") || %{}

    progress =
      (Map.get(state, :players) || %{})
      |> Enum.map(fn {slot, player} ->
        rider = Map.get(riders, slot) || %{}

        %{
          "playerId" => player.player_id,
          "slot" => slot,
          "nextCheckpoint" => Map.get(rider, "nextCheckpoint", 0),
          "normalizedProgress" => max(0.0, min(1.0, Map.get(rider, "s", 0) * 1.0 / @course_length)),
          "status" => player_status(player, rider),
          "dnfReason" => Map.get(rider, "dnfReason")
        }
      end)
      |> Enum.sort_by(&(&1["normalizedProgress"] * -1))
      |> Enum.take(8)

    common_fields(state)
    |> Map.put("audience", "summary")
    |> Map.reject(fn {k, _v} -> k in ["startAt", "deadlineAt", "lastAcceptedSeqs"] end)
    |> Map.drop(["state"])
    |> Map.put("summary", %{
      "riderCount" => map_size(Map.get(state, :players) || %{}),
      "readyCount" => Enum.count(Map.get(state, :players) || %{}, fn {_s, p} -> p.ready end),
      "capacity" => Map.get(state, :max_players),
      "progress" => progress,
      "result" => current_result(state)
    })
  end
end
