defmodule Afterlight.Protocol.PayloadsTest do
  use ExUnit.Case, async: true

  alias Afterlight.Protocol.Payloads

  test "inventory_state omits zero-valued keys" do
    player = %{
      id: "p1",
      nickname: "p1",
      coins: 10,
      xp: 0,
      level: 1,
      reputation: 0,
      reserved_coins: 0,
      current_room: "market",
      last_seen: 1,
      inventory: %{seeds: %{"radish" => 2}, produce: %{}, reserved_produce: %{}, sprinklers: 0},
      materials: %{}
    }

    payload = Payloads.inventory_state(player)
    inv = payload.player.inventory
    refute Map.has_key?(inv, :sprinklers)
    assert inv.seeds == %{"radish" => 2}
  end

  test "harvest message matches JS copy" do
    assert Payloads.harvest_message(2, "B", "Red Radish") ==
             "Harvested 2x Grade B Red Radish!"
  end
end
