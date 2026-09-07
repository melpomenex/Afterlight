defmodule Afterlight.EconomyGroup.GatewayTest do
  use Afterlight.DataCase, async: false

  alias Afterlight.Accounts
  alias Afterlight.EconomyGroup.Gateway
  alias Afterlight.Gardens
  alias Afterlight.Gardens.Loader
  alias Afterlight.EconomyGroup.{Inventory, Wallet}

  setup do
    start_supervised!(Afterlight.Gardens.Loader)
    :ok
  end

  defp seed_player(id) do
    now = Accounts.now_ms()

    Repo.insert_all("players", [
      %{
        id: id,
        nickname: id,
        coins: 100,
        xp: 0,
        level: 1,
        reputation: 0,
        reserved_coins: 0,
        inventory: %{"seeds" => %{}, "produce" => %{}, "reservedProduce" => %{}, "sprinklers" => 0},
        materials: %{},
        current_room: "garden:#{id}",
        last_seen: now,
        active: true,
        shadow: false
      }
    ])

    Wallet.ensure!(id)
    Inventory.backfill_from_player_jsonb!(id)
    Loader.load(id)
    Gardens.get_or_create_garden(id)
  end

  test "garden till returns action_result and garden_state" do
    seed_player("gw_garden")

    ctx = %{
      guest_id: "gw_garden",
      world_room: %{wire_id: "garden:gw_garden"}
    }

    assert {:ok, replies} =
             Gateway.handle(
               "garden_action",
               %{"actionId" => "till1", "action" => "till", "bedIndex" => 0},
               ctx
             )

    assert Enum.any?(replies, fn
      {"action_result", %{"success" => true, "actionId" => "till1"}} -> true
      _ -> false
    end)

    assert Enum.any?(replies, fn
      {"garden_state", %{"roomId" => "garden:gw_garden"}} -> true
      _ -> false
    end)

    garden = Gardens.fetch_garden("gw_garden")
    bed = Enum.at(garden.beds, 0)
    assert bed.prepared
  end
end
