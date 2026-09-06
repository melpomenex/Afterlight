defmodule Afterlight.Realtime.Encoders.BinarySoA do
  @moduledoc """
  `afterlight-soa-v1` binary encoder (contract §3, v0 including the §4a
  chunk amendment's frame types). Reference implementation — byte layout
  cross-checked against the JS reference (`shared/realtime/writer.js`) and
  the BEAM benchmark (`benchmarks/realtime/beam/bench_encode.exs`).

  Emits: 24-byte little-endian header, then SORTED_IDS transform + flags
  sections. Lifecycle sections (spawn/despawn with string tables) are
  carried by `Encoders.Snapshot` work in a later iteration; this encoder
  covers the 10 Hz delta path, which the benchmarks price as the hot path.
  """

  @behaviour Afterlight.Realtime.FrameEncoder

  @magic 0x414C5254
  @version 1
  @header_size 24
  @frame_types %{full_snapshot: 0, delta: 1, resync_required: 2, snapshot_chunk: 3, delta_chunk: 4}
  @section_transform 3
  @section_flags 6
  @encoding_sorted_ids 1

  @impl true
  def encode(%Afterlight.Realtime.RealtimeFrame{} = frame, _opts \\ []) do
    [
      header(frame),
      sorted_ids_section(@section_transform, frame.transform_ids, [
        {:f32, frame.transform_x},
        {:f32, frame.transform_y},
        {:f32, frame.transform_z},
        {:f32, frame.transform_yaw}
      ]),
      sorted_ids_section(@section_flags, frame.flags_ids, [{:u8, frame.flags}])
    ]
  end

  defp header(frame) do
    <<
      @magic::32-little,
      @version::8,
      Map.get(@frame_types, frame.frame_type, 1)::8,
      0::8,
      @header_size::8,
      frame.room_epoch::32-little,
      frame.server_tick::32-little,
      frame.frame_sequence::32-little,
      frame.baseline_sequence::32-little
    >>
  end

  # One section: u32 id table (ascending) then one contiguous column per
  # field, little-endian. Empty sections are omitted entirely (contract §3).
  defp sorted_ids_section(_id, [], _columns), do: []

  defp sorted_ids_section(section_id, ids, columns) do
    count = length(ids)

    payload = [
      for(id <- ids, into: <<>>, do: <<id::32-little>>),
      Enum.map(columns, fn {type, col} -> column(col, type) end)
    ]

    body = IO.iodata_length(payload)

    [
      <<section_id::8, @encoding_sorted_ids::8, 0::16, count::32-little, body::32-little>>,
      payload
    ]
  end

  defp column(col, :f32), do: for(v <- col, do: <<v::32-little-float>>)
  defp column(col, :u8), do: for(v <- col, do: <<v::8>>)
end
