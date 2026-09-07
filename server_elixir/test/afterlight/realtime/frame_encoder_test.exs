defmodule Afterlight.Realtime.FrameEncoderTest do
  @moduledoc """
  Verifies the BinarySoA encoder against the afterlight-soa-v1 byte layout
  (contract §3): header fields, SORTED_IDS section geometry, and JSON debug
  shape. Byte-level cross-checks with the JS reference live in the JS suite
  and the BEAM benchmark's round-trip decode.
  """

  use ExUnit.Case, async: true

  alias Afterlight.Realtime.{RealtimeFrame, FrameEncoder}
  alias Afterlight.Realtime.Encoders.{BinarySoA, JSON}

  @magic 0x414C5254

  defp delta_frame do
    %RealtimeFrame{
      frame_type: :delta,
      room_epoch: 7,
      server_tick: 102,
      frame_sequence: 6,
      baseline_sequence: 5,
      transform_ids: [10, 20, 30],
      transform_x: [1.0, 2.0, 3.0],
      transform_y: [0.0, 0.0, 0.0],
      transform_z: [4.0, 5.0, 6.0],
      transform_yaw: [0.5, 1.0, 1.5],
      flags_ids: [10, 20, 30],
      flags: [1, 0, 4]
    }
  end

  test "binary frame matches the contract layout" do
    bin = IO.iodata_to_binary(BinarySoA.encode(delta_frame()))

    # header
    <<@magic::32-little, 1::8, 1::8, _flags::8, 24::8, 7::32-little, 102::32-little, 6::32-little,
      5::32-little, rest::binary>> = bin

    # transform section: id 3, encoding 1, 3 rows, 12-byte header + 3*4 + 3*16
    <<3::8, 1::8, 0::16, 3::32-little, tlen::32-little, tpayload::binary-size(tlen), rest::binary>> = rest
    assert tlen == 3 * 4 + 3 * 16

    <<10::32-little, 20::32-little, 30::32-little, x1::32-float-little, _::binary>> = tpayload
    assert x1 == 1.0

    # flags section (columnar: id table, then one contiguous u8 column)
    <<6::8, 1::8, 0::16, 3::32-little, flen::32-little, fpayload::binary-size(flen)>> = rest
    assert flen == 3 * 4 + 3 * 1
    <<10::32-little, 20::32-little, 30::32-little, 1::8, 0::8, 4::8>> = fpayload
  end

  test "frame decodes back to the same semantic values (round-trip)" do
    bin = IO.iodata_to_binary(BinarySoA.encode(delta_frame()))
    <<_header::binary-size(24), 3::8, 1::8, _::16, 3::32-little, _len::32-little,
      ids::binary-size(12), x::binary-size(12), y::binary-size(12), z::binary-size(12),
      yaw::binary-size(12), _rest::binary>> = bin

    assert for(<<id::32-little <- ids>>, do: id) == [10, 20, 30]
    assert for(<<v::32-float-little <- x>>, do: v) == [1.0, 2.0, 3.0]
    assert for(<<v::32-float-little <- z>>, do: v) == [4.0, 5.0, 6.0]
    assert for(<<v::32-float-little <- yaw>>, do: v) == [0.5, 1.0, 1.5]
    assert byte_size(y) == 12
  end

  test "empty sections are omitted" do
    frame = %RealtimeFrame{frame_sequence: 1, baseline_sequence: 1}
    bin = IO.iodata_to_binary(BinarySoA.encode(frame))
    assert byte_size(bin) == 24
  end

  test "json debug encoder renders the legacy presence shape" do
    json = JSON.encode(delta_frame())
    assert json.type == :presence_update
    assert [%{id: 10, walking: true, sitting: false, airborne: false}, %{id: 20}, %{id: 30, airborne: true}] = json.players
  end

  test "encoders satisfy the behaviour" do
    assert Code.ensure_loaded?(BinarySoA)
    assert function_exported?(BinarySoA, :encode, 2)
    # Elixir's built-in JSON module loads lazily — ensure_loaded? first.
    assert Code.ensure_loaded?(JSON)
    assert function_exported?(JSON, :encode, 2)
    assert Enum.all?([BinarySoA, JSON], &implements_encode?/1)
  end

  defp implements_encode?(mod) do
    # behaviour_check via protocol-consistent reflection
    FrameEncoder.behaviour_info(:callbacks) |> Enum.all?(fn {f, a} -> function_exported?(mod, f, a) end)
  end
end
