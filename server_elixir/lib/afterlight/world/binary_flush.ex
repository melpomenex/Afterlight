defmodule Afterlight.World.BinaryFlush do
  @moduledoc """
  Encode a room flush as an `afterlight-soa-v1` binary delta (transform + flags).
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

  defp pose_flags(pose) do
    walk = if pose.walking, do: 1, else: 0
    sit = if pose.sitting, do: 2, else: 0
    air = if pose.airborne, do: 4, else: 0
    walk + sit + air
  end
end
