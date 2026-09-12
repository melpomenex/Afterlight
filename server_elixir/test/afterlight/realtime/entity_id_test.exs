defmodule Afterlight.Realtime.EntityIdTest do
  use ExUnit.Case, async: true

  alias Afterlight.Realtime.EntityId

  test "hash is stable for the same player id" do
    assert EntityId.hash("guest_abc") == EntityId.hash("guest_abc")
  end
end

defmodule Afterlight.World.BinaryFlushTest do
  use ExUnit.Case, async: true

  import Bitwise

  alias Afterlight.World.BinaryFlush

  test "encode_flush produces ALRT magic header" do
    members = [
      %{
        player_id: "guest_one",
        pose: %{x: 1.0, z: 2.0, rot_y: 0.5, walking: true, sitting: false, airborne: false}
      }
    ]

    bin = BinaryFlush.encode_flush(members, 3, 3)
    <<magic::32-little, _rest::binary>> = bin
    assert magic == 0x414C5254
  end

  test "encode_snapshot emits a lifecycle-carrying full snapshot with sorted ids" do
    members = [
      %{
        player_id: "guest_b",
        pose: %{x: 2.0, z: 5.0, rot_y: 0.25, walking: false, sitting: false, airborne: false}
      },
      %{
        player_id: "guest_a",
        pose: %{x: 1.0, z: 4.0, rot_y: 0.0, walking: true, sitting: false, airborne: false}
      }
    ]

    bin = BinaryFlush.encode_snapshot(members, 7, 7)

    <<magic::32-little, 1::8, 0::8, flags::8, 24::8, 0::32-little, 7::32-little, 7::32-little,
      baseline::32-little, rest::binary>> = bin
    assert magic == 0x414C5254
    assert (flags &&& 1) == 1
    assert baseline == 6

    # DENSE string table carries both guest ids
    <<8::8, 0::8, 0::16, 2::32-little, tlen::32-little, tpayload::binary-size(tlen),
      rest::binary>> = rest
    assert <<2::32-little, 7::16-little, "guest_b", 7::16-little, "guest_a">> = tpayload

    # DENSE spawn rows
    <<1::8, 0::8, 0::16, 2::32-little, slen::32-little, _spayload::binary-size(slen),
      rest::binary>> = rest
    assert slen == 2 * 28

    # SORTED_IDS transform columns ascend by entity id
    <<3::8, 1::8, 0::16, 2::32-little, trlen::32-little, trpayload::binary-size(trlen),
      _::binary>> = rest
    assert trlen == 2 * 4 + 2 * 16
    assert <<id1::32-little, id2::32-little, _::binary>> = trpayload
    assert id1 < id2
  end
end
