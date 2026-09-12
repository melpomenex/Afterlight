defmodule Afterlight.World.BinaryFlush do
  @moduledoc """
  Encode a room flush as an `afterlight-soa-v1` frame.

  `encode_flush/3` is the baseline-compatible delta (transform + flags) kept
  for non-upgraded negotiating clients; `encode_snapshot/3` is the live
  full-roster flush shape (self-validating FULL snapshot carrying guest
  identity) used by clients that advertise the `spawn` capability.
  """

  alias Afterlight.Realtime.{Encoders.BinarySoA, EntityId, RealtimeFrame}

  @spec encode_flush([map], non_neg_integer, non_neg_integer) :: binary()
  def encode_flush(members, tick_count, seq) when is_list(members) do
    {ids, xs, ys, zs, yaws, flags} =
      Enum.reduce(members, {[], [], [], [], [], []}, fn member, {ids, xs, ys, zs, yaws, flags} ->
        pose = member.pose
        id = EntityId.hash(member.player_id)

        {ids ++ [id], xs ++ [pose.x], ys ++ [0.0], zs ++ [pose.z], yaws ++ [pose.rot_y],
         flags ++ [pose_flags(pose)]}
      end)

    frame = %RealtimeFrame{
      frame_type: :delta,
      room_epoch: 0,
      server_tick: tick_count,
      frame_sequence: seq,
      baseline_sequence: max(seq - 1, 0),
      transform_ids: ids,
      transform_x: xs,
      transform_y: ys,
      transform_z: zs,
      transform_yaw: yaws,
      flags_ids: ids,
      flags: flags
    }

    IO.iodata_to_binary(BinarySoA.encode(frame))
  end

  @doc """
  Encode a room flush as a FULL snapshot (contract §4): SPAWN rows carry each
  member's guestId once via the string table, and transform/flags columns are
  ordered by ascending entity id (the SORTED_IDS contract the WASM decoder
  enforces).
  """
  @spec encode_snapshot([map], non_neg_integer, non_neg_integer) :: binary()
  def encode_snapshot(members, tick_count, seq) when is_list(members) do
    rows =
      members
      |> Enum.map(fn member ->
        pose = member.pose
        id = EntityId.hash(member.player_id)

        %{
          id: id,
          guest_id: member.player_id,
          archetype: 0,
          variant: 0,
          x: pose.x,
          y: 0.0,
          z: pose.z,
          yaw: pose.rot_y,
          flags: pose_flags(pose)
        }
      end)
      |> Enum.sort_by(& &1.id)

    ids = Enum.map(rows, & &1.id)

    frame = %RealtimeFrame{
      frame_type: :full_snapshot,
      room_epoch: 0,
      server_tick: tick_count,
      frame_sequence: seq,
      baseline_sequence: max(seq - 1, 0),
      spawn:
        Enum.map(rows, fn row ->
          Map.take(row, [:id, :guest_id, :archetype, :variant, :x, :y, :z, :yaw])
        end),
      transform_ids: ids,
      transform_x: Enum.map(rows, & &1.x),
      transform_y: Enum.map(rows, & &1.y),
      transform_z: Enum.map(rows, & &1.z),
      transform_yaw: Enum.map(rows, & &1.yaw),
      flags_ids: ids,
      flags: Enum.map(rows, & &1.flags)
    }

    IO.iodata_to_binary(BinarySoA.encode(frame))
  end

  defp pose_flags(pose) do
    walk = if pose.walking, do: 1, else: 0
    sit = if pose.sitting, do: 2, else: 0
    air = if pose.airborne, do: 4, else: 0
    walk + sit + air
  end
end
