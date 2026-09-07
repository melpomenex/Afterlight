defmodule Afterlight.Realtime.EntityIdTest do
  use ExUnit.Case, async: true

  alias Afterlight.Realtime.EntityId

  test "hash is stable for the same player id" do
    assert EntityId.hash("guest_abc") == EntityId.hash("guest_abc")
  end
end

defmodule Afterlight.World.BinaryFlushTest do
  use ExUnit.Case, async: true

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
end
