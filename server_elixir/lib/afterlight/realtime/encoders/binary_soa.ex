defmodule Afterlight.Realtime.Encoders.BinarySoA do
  @moduledoc """
  `afterlight-soa-v1` binary encoder (contract §3, v0 including the §4a
  chunk amendment's frame types). Reference implementation — byte layout
  cross-checked against the JS reference (`shared/realtime/writer.js`) and
  the BEAM benchmark (`benchmarks/realtime/beam/bench_encode.exs`).

  Emits: 24-byte little-endian header, then optional DENSE STRING_TABLE +
  SPAWN lifecycle sections (spawn rows carry the guestId string once, per
  contract §1/§3) followed by SORTED_IDS transform + flags sections. The
  caller is responsible for ascending id order in SORTED_IDS columns.
  """

  @behaviour Afterlight.Realtime.FrameEncoder

  @magic 0x414C5254
  @version 1
  @header_size 24
  @frame_types %{full_snapshot: 0, delta: 1, resync_required: 2, snapshot_chunk: 3, delta_chunk: 4}
  @section_spawn 1
  @section_transform 3
  @section_flags 6
  @section_string_table 8
  @encoding_dense 0
  @encoding_sorted_ids 1
  @flag_has_string_table 1
  @no_string_ref 0xFFFFFFFF

  @impl true
  def encode(%Afterlight.Realtime.RealtimeFrame{} = frame, _opts \\ []) do
    spawn = frame.spawn || []
    has_spawn = spawn != []
    {strings, refs} = spawn_string_refs(spawn)

    [
      header(frame, has_spawn),
      string_table_section(strings, has_spawn),
      spawn_section(spawn, refs),
      sorted_ids_section(@section_transform, frame.transform_ids, [
        {:f32, frame.transform_x},
        {:f32, frame.transform_y},
        {:f32, frame.transform_z},
        {:f32, frame.transform_yaw}
      ]),
      sorted_ids_section(@section_flags, frame.flags_ids, [{:u8, frame.flags}])
    ]
  end

  defp header(frame, has_string_table) do
    flags = if has_string_table, do: @flag_has_string_table, else: 0

    <<
      @magic::32-little,
      @version::8,
      Map.get(@frame_types, frame.frame_type, 1)::8,
      flags::8,
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

  # DENSE string table: u32 count, then per entry a u16 byte length + UTF-8
  # bytes. Emitted whenever spawn rows are present; a guestId-less spawn set
  # still writes the single empty-string table (JS writer parity, contract §3).
  defp string_table_section(_strings, false), do: []

  defp string_table_section(strings, true) do
    entries = if strings == [], do: [""], else: strings

    body = [
      <<length(entries)::32-little>>,
      for(s <- entries, do: <<byte_size(s)::16-little, s::binary>>)
    ]

    body_len = IO.iodata_length(body)

    [
      <<@section_string_table::8, @encoding_dense::8, 0::16, length(entries)::32-little,
        body_len::32-little>>,
      body
    ]
  end

  # DENSE interleaved 28-byte spawn rows (JS reference layout):
  # id u32, archetype u16, variant u16, stringRef u32, x/y/z/yaw f32.
  defp spawn_section([], _refs), do: []

  defp spawn_section(spawn, refs) do
    rows =
      spawn
      |> Enum.zip(refs)
      |> Enum.map(fn {row, ref} ->
        <<row_id(row)::32-little,
          row_field(row, :archetype)::16-little,
          row_field(row, :variant)::16-little,
          ref::32-little,
          row_field(row, :x)::32-little-float,
          row_field(row, :y)::32-little-float,
          row_field(row, :z)::32-little-float,
          row_field(row, :yaw)::32-little-float>>
      end)

    payload = IO.iodata_to_binary(rows)
    count = length(spawn)

    [
      <<@section_spawn::8, @encoding_dense::8, 0::16, count::32-little,
        byte_size(payload)::32-little>>,
      payload
    ]
  end

  # Identity per spawn row: the guestId string once, referenced by index.
  defp spawn_string_refs(spawn) do
    {refs, strings, _next} =
      Enum.reduce(spawn, {[], [], 0}, fn row, {refs, strings, next} ->
        case guest_id(row) do
          nil -> {[@no_string_ref | refs], strings, next}
          guest_id -> {[next | refs], [guest_id | strings], next + 1}
        end
      end)

    {Enum.reverse(strings), Enum.reverse(refs)}
  end

  defp guest_id(row) when is_map(row) do
    case Map.get(row, :guest_id) do
      nil -> nil
      guest_id when is_binary(guest_id) -> guest_id
      _ -> nil
    end
  end

  defp guest_id(_row), do: nil

  defp row_id(row) when is_integer(row), do: row
  defp row_id(row) when is_map(row), do: Map.get(row, :id, 0)

  defp row_field(row, _field) when is_integer(row), do: 0
  defp row_field(row, field) when is_map(row), do: Map.get(row, field, 0)
end
