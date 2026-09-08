defmodule Afterlight.World.Frames do
  @moduledoc """
  Frame construction for the room runtime (task 3.4, design D9): channel
  handlers never build frames, and neither does the RoomServer — every
  outbound frame is rendered by the configured realtime encoder
  (`Afterlight.Realtime.FrameEncoder` behaviour; `Encoders.JSON` selected
  unconditionally in P3) through the additive world-frame renderers that
  change landed there.

  This module is the RoomServer's seam onto that encoder: it projects room
  members into plain pose entries and delegates. The rendered frames are
  the frozen catalog wire shapes — string keys, no internal fields (the
  flush carries no `tick`) — so non-negotiating clients are untouched.
  Unit tests pin the emitted `presence_update` shapes field-for-field
  (`test/afterlight/world/frames_test.exs`, realtime encoder cases) and
  the JSON is byte-compared against the catalog literal. The BinarySoA
  flip stays a config change away (`:world_frame_encoder`): it swaps the
  encoder, and the binary data plane change owns the guest-id → actor-id
  mapping the soa-v1 layout requires (design D9).
  """

  @doc """
  The internal world message envelope (add-social-place-framework D3, task
  3.2): every RoomServer → channel message travels as
  `{:world_frame, room_id, frame}` so the GameChannel can verify the source
  room against its CURRENT assigned room before pushing or converting —
  queued output from a room the transport already left is dropped, never
  rendered.
  """
  @spec world_message(String.t(), %{String.t() => term}) ::
          {:world_frame, String.t(), %{String.t() => term}}
  def world_message(room_id, frame) when is_binary(room_id) and is_map(frame) do
    {:world_frame, room_id, frame}
  end

  @doc """
  The public room tag (task 3.2): the additive `"roomId"` field on outbound
  JSON world frames (and the outer `rt_binary` envelope — never the SoA
  bytes). Clients discard mismatched tagged frames before epoch bookkeeping
  and binary consumption; untagged legacy frames stay compatible.
  """
  @spec put_room(%{String.t() => term}, String.t()) :: %{String.t() => term}
  def put_room(frame, room_id) when is_binary(room_id) do
    Map.put(frame, "roomId", room_id)
  end

  @doc "The 10 Hz dirty-room flush: FULL roster in join order, no delta encoding,
  entries in the flush shape `{id, x, z, rotY, walking, sitting, airborne}`
  (no nickname). The `tick` argument is accepted for call-site stability
  and deliberately NOT rendered — the catalog frame carries no internal
  fields (the server-tick bookkeeping lives in telemetry, not on the wire)."
  @spec flush([map], non_neg_integer, non_neg_integer) :: %{String.t() => term}
  def flush(members, _tick \\ 0, epoch \\ 0) do
    encoder().flush(Enum.map(members, &flush_entry/1)) |> with_epoch(epoch)
  end

  @doc "Full roster sent to the JOINER on join — entries carry nicknames (catalog §1 asymmetry)."
  @spec join_roster([map], non_neg_integer) :: %{String.t() => term}
  def join_roster(members, epoch \\ 0) do
    encoder().join_roster(Enum.map(members, &roster_entry/1)) |> with_epoch(epoch)
  end

  @doc "Room broadcast when a member joins — joiner excluded by the caller."
  @spec presence_join(map, non_neg_integer) :: %{String.t() => term}
  def presence_join(member, epoch \\ 0) do
    encoder().presence_join(roster_entry(member)) |> with_epoch(epoch)
  end

  @spec presence_leave(String.t(), non_neg_integer) :: %{String.t() => term}
  def presence_leave(player_id, epoch \\ 0) do
    encoder().presence_leave(player_id) |> with_epoch(epoch)
  end

  @spec emote_broadcast(String.t(), String.t(), String.t(), non_neg_integer) :: %{String.t() => term}
  def emote_broadcast(player_id, nickname, emote, epoch \\ 0) do
    encoder().emote_broadcast(player_id, nickname, emote) |> with_epoch(epoch)
  end

  # Flush entry: {id, x, z, rotY, walking, sitting, airborne} — no nickname.
  # Coordinates are relayed verbatim (Node echoes the numbers it stored; no
  # integer→float widening, so the JSON bytes match the Node baseline).
  defp flush_entry(member) do
    pose = member.pose

    %{
      id: member.player_id,
      x: pose.x,
      z: pose.z,
      rot_y: pose.rot_y,
      walking: pose.walking,
      sitting: pose.sitting,
      airborne: pose.airborne
    }
  end

  # Join-shape entry: adds the nickname and omits airborne.
  defp roster_entry(member) do
    member
    |> flush_entry()
    |> Map.delete(:airborne)
    |> Map.put(:nickname, member.nickname)
  end

  defp encoder do
    Application.get_env(:afterlight, :world_frame_encoder, Afterlight.Realtime.Encoders.JSON)
  end

  defp with_epoch(frame, epoch), do: Map.put(frame, "epoch", epoch)
end
