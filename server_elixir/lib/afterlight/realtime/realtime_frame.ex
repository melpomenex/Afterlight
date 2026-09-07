defmodule Afterlight.Realtime.RealtimeFrame do
  @moduledoc """
  The realtime data plane's frame payload, extracted from room state by a
  delta extractor and handed to an encoder (behaviour:
  `Afterlight.Realtime.FrameEncoder`).

  Contract: `docs/architecture/realtime/contract.md` (afterlight-soa-v1).
  Pure data — no wire encoding knowledge lives here, so Phoenix channel
  handlers stay free of byte-offset arithmetic.
  """

  defstruct [
    :frame_sequence,
    :baseline_sequence,
    # Every frame carries an epoch/tick (contract §3 header); 0 = pre-epoch.
    room_epoch: 0,
    server_tick: 0,
    frame_type: :delta,
    # lifecycle: [%{id, guest_id, archetype, variant, x, y, z, yaw}] / [id]
    spawn: [],
    despawn: [],
    # transform: sorted ascending ids + column lists (one entry per id)
    transform_ids: [],
    transform_x: [],
    transform_y: [],
    transform_z: [],
    transform_yaw: [],
    flags_ids: [],
    flags: []
  ]

  @type t :: %__MODULE__{}
end
