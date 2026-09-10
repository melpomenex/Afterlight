defmodule Afterlight.Activities.DownhillMayhem.Presentation do
  @moduledoc """
  Downhill Mayhem race snapshot presentation
  (integrate-multiplayer-downhill-mayhem-arcade 8.5).

  Builds the full participant snapshot (with an optional private `self`
  attachment) and the room-wide `audience: "summary"` frame from live session
  state. Extracted from `SessionServer` so the generic session machinery stays
  small; every function reads the session struct through `Map.get/2`, so there
  is no compile-time dependency on the session module.

  Wire keys are camelCase to match `shared/downhill/rules.js`. Leases, seqs and
  reconciliation data never appear in summaries. The full snapshot carries
  exactly six rider rows: slot, playerId, nickname, isAI, s, lat, y, vs, vlat,
  vy, grounded, steerPos, meter, trick, crashed, invuln, finishMs, racePos,
  resetSeq and dnfReason.
  """

  @progress_segment_meters 225.0
  @course_length 2_460.0

  alias Afterlight.Activities.DownhillMayhem.SessionPolicy

  def wire_status(state) do
    Afterlight.Activities.DownhillMayhem.SessionPolicy.phase(Map.get(state, :status))
  end

  @doc "Current summary phase (pacing key)."
  def summary_phase(state), do: wire_status(state)

  defp wire_room_id(state), do: Map.get(state, :wire_room_id) || Map.get(state, :room_key)

  defp sim(state), do: Map.get(state, :sim_state) || %{}

  @doc "Selected mountain (lobby config wins over the manifest course)."
  def mountain(state) do
    (Map.get(state, :lobby_config) || %{})["mountain"] ||
      sim(state)["courseId"] ||
      get_in(Map.get(state, :activity_def) || %{}, ["course", "id"]) || "classic"
  end

  @doc "Selected difficulty."
  def difficulty(state) do
    (Map.get(state, :lobby_config) || %{})["difficulty"] || sim(state)["difficulty"] || "mayhem"
  end

  defp common_fields(state) do
    s = sim(state)

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
      "serverTick" => Map.get(s, "tick", 0),
      "courseId" => Map.get(s, "courseId"),
      "courseVersion" => Map.get(s, "courseVersion"),
      "courseHash" => Map.get(s, "courseHash"),
      "rulesVersion" => Map.get(s, "rulesVersion"),
      "mountain" => mountain(state),
      "difficulty" => difficulty(state),
      "captainPlayerId" => SessionPolicy.captain(Map.get(state, :players) || %{}),
      "queueLength" => length(Map.get(state, :queue) || []),
      "spectatorCount" => map_size(Map.get(state, :spectators) || %{})
    }
  end

  @doc "Full participant snapshot (no private attachment — see attach_self/3)."
  def full_snapshot(state) do
    common_fields(state)
    |> Map.put("startAt", Map.get(state, :start_at))
    |> Map.put("deadlineAt", Map.get(state, :deadline_at))
    |> Map.put("riders", rider_rows(state))
    |> Map.put("result", current_result(state))
    |> Map.put(
      "lastAcceptedSeqs",
      Map.new(Map.get(state, :players) || %{}, fn {_s, p} ->
        {p.player_id, Map.get(p, :last_seq, 0)}
      end)
    )
  end

  @doc """
  The recipient's private reconciliation attachment: appliedSeq, the canonical
  held controls and the authoritative tick. NEVER broadcast.
  """
  def attach_self(snapshot, state, player) do
    rider = Map.get(sim(state)["riders"] || %{}, Map.get(player, :slot)) || %{}

    held =
      case Map.get(player, :input_state) do
        controls when is_map(controls) and map_size(controls) > 0 ->
          if Map.get(controls, "kind") in ["ride", "loaded"],
            do: controls,
            else: %{"kind" => "neutral"}

        _ ->
          %{"kind" => "neutral"}
      end

    Map.put(snapshot, "self", %{
      "slot" => Map.get(player, :slot),
      "appliedSeq" => Map.get(rider, :applied_seq, Map.get(player, :last_seq, 0)),
      "heldControls" => held,
      "serverTick" => Map.get(sim(state), "tick", 0)
    })
  end

  defp current_result(%{status: :ended, match_outcome: outcome}) when is_map(outcome), do: outcome
  defp current_result(_state), do: nil

  @doc "Every rider row (six by construction), sorted by slot."
  def rider_rows(state) do
    riders = sim(state)["riders"] || %{}

    rows =
      if map_size(riders) > 0 do
        riders
        |> Map.values()
        |> Enum.sort_by(& &1.slot)
        |> Enum.map(&race_rider_row(state, &1))
      else
        # Before the roster lock the six-rider race field does not exist yet,
        # but the lobby still presents the projected field (seated humans plus
        # deterministic AI fillers) so every client sees the same six slots.
        lobby_rider_rows(state)
      end

    rows
  end

  defp race_rider_row(state, r) do
    players = Map.get(state, :players) || %{}
    player = Map.get(players, r.slot)

    %{
      "slot" => r.slot,
      "playerId" => r[:player_id] || (player && player.player_id),
      "nickname" => r[:nickname] || (player && Map.get(player, :nickname)) || def_name(r),
      "isAI" => r.is_ai,
      "s" => num(r.s),
      "lat" => num(r.lat),
      "y" => num(r.y),
      "vs" => num(r.vs),
      "vlat" => num(r.vlat),
      "vy" => num(r.vy),
      "grounded" => r.grounded,
      "steerPos" => num(r.steer_pos),
      "meter" => num(r.meter),
      "trick" => r.trick,
      "crashed" => r.crashed,
      "invuln" => num(r.invuln),
      "finishMs" => if(r.finished, do: trunc(round((r.finish_time || 0.0) * 1000)), else: nil),
      "racePos" => r.race_pos,
      "resetSeq" => Map.get(r, :reset_seq, 0),
      "dnfReason" => r[:dnf_reason]
    }
  end

  defp lobby_rider_rows(state) do
    players = Map.get(state, :players) || %{}
    field = SessionPolicy.lock_field(players)

    Enum.map(field, fn f ->
      %{
        "slot" => f.slot,
        "playerId" => Map.get(f, :player_id),
        "nickname" => Map.get(f, :nickname) || "RIDER",
        "isAI" => Map.get(f, :is_ai, false),
        "s" => 0.0,
        "lat" => 0.0,
        "y" => 0.0,
        "vs" => 0.0,
        "vlat" => 0.0,
        "vy" => 0.0,
        "grounded" => true,
        "steerPos" => 0.0,
        "meter" => 0.0,
        "trick" => nil,
        "crashed" => false,
        "invuln" => 0.0,
        "finishMs" => nil,
        "racePos" => nil,
        "resetSeq" => 0,
        "dnfReason" => nil
      }
    end)
  end

  @doc "Room-wide summary: counters/progress/results only (never a lease or seq)."
  def summary(state) do
    riders = sim(state)["riders"] || %{}

    progress =
      if map_size(riders) > 0 do
        riders
        |> Map.values()
        |> Enum.sort_by(& &1.s, :desc)
        |> Enum.map(&race_progress_row/1)
      else
        lobby_progress_rows(state)
      end

    common_fields(state)
    |> Map.put("audience", "summary")
    |> Map.drop(["startAt", "deadlineAt", "lastAcceptedSeqs", "riders", "result"])
    |> Map.put("summary", %{
      "riderCount" => length(progress),
      "aiCount" => Enum.count(progress, & &1["isAI"]),
      "readyCount" => Enum.count(Map.get(state, :players) || %{}, fn {_s, p} -> p.ready end),
      "capacity" => Map.get(state, :max_players),
      "mountain" => mountain(state),
      "difficulty" => difficulty(state),
      "progress" => progress,
      "result" => current_result(state)
    })
  end

  defp race_progress_row(r) do
    %{
      "slot" => r.slot,
      "playerId" => r[:player_id],
      "nickname" => r[:nickname] || def_name(r),
      "isAI" => r.is_ai,
      "nextCheckpoint" => min(8, trunc((r.s || 0) * 1.0 / @progress_segment_meters) + 1),
      "normalizedProgress" => max(0.0, min(1.0, (r.s || 0) * 1.0 / @course_length)),
      "status" => rider_status(r),
      "dnfReason" => r[:dnf_reason]
    }
  end

  defp lobby_progress_rows(state) do
    state
    |> lobby_rider_rows()
    |> Enum.map(fn row ->
      Map.merge(row, %{
        "nextCheckpoint" => 1,
        "normalizedProgress" => 0.0,
        "status" => "racing"
      })
    end)
  end

  defp rider_status(%{finished: true}), do: "finished"
  defp rider_status(%{dnf_reason: reason}) when not is_nil(reason), do: "dnf"
  defp rider_status(%{crashed: true}), do: "crashed"
  defp rider_status(_), do: "racing"

  defp def_name(%{def: %{name: name}}), do: name
  defp def_name(_), do: "RIDER"

  defp num(v) when is_float(v), do: Float.round(v, 6)
  defp num(v), do: v
end
