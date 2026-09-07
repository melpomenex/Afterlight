defmodule Afterlight.Gateway.WelcomeTest do
  use Afterlight.DataCase, async: false

  alias Afterlight.Accounts
  alias Afterlight.Economy.ContractBoard
  alias Afterlight.EconomyGroup.{Inventory, Wallet}
  alias Afterlight.Gateway.Welcome
  alias Afterlight.Restoration
  alias Afterlight.World.Weather

  setup do
    start_supervised!(Weather)
    :ok
  end

  test "compose builds the Node hello welcome field set" do
    player_id = "welcome_guest"
    now = Accounts.now_ms()

    Repo.insert_all("players", [
      %{
        id: player_id,
        nickname: "Fern",
        coins: 12,
        xp: 0,
        level: 1,
        reputation: 0,
        reserved_coins: 0,
        inventory: %{"seeds" => %{}, "produce" => %{}, "reservedProduce" => %{}, "sprinklers" => 0},
        materials: %{},
        current_room: "market",
        last_seen: now,
        active: true,
        shadow: false
      }
    ])

    Wallet.ensure!(player_id)
    Inventory.backfill_from_player_jsonb!(player_id)
    Restoration.ensure_nodes!()
    ContractBoard.ensure_initialized!()

    welcome = Welcome.compose(player_id, "Fern", nil)

    assert welcome["player"]["id"] == player_id
    assert welcome["player"]["nickname"] == "Fern"
    assert is_binary(welcome["weather"])
    assert is_map(welcome["prices"])
    assert is_list(welcome["contracts"])
    assert is_map(welcome["orderBook"])
    assert is_map(welcome["theater"])
    assert is_map(welcome["iptv"])
  end

  test "initial_frames includes garden_state for the player garden room" do
    player_id = "welcome_garden"
    now = Accounts.now_ms()

    Repo.insert_all("players", [
      %{
        id: player_id,
        nickname: player_id,
        coins: 0,
        xp: 0,
        level: 1,
        reputation: 0,
        reserved_coins: 0,
        inventory: %{"seeds" => %{}, "produce" => %{}, "reservedProduce" => %{}, "sprinklers" => 0},
        materials: %{},
        current_room: "market",
        last_seen: now,
        active: true,
        shadow: false
      }
    ])

    Wallet.ensure!(player_id)
    Inventory.backfill_from_player_jsonb!(player_id)
    Welcome.compose(player_id, player_id, nil)

    assert [{"garden_state", %{"roomId" => "garden:" <> ^player_id, "beds" => beds}}] =
             Welcome.initial_frames(player_id)

    assert length(beds) == 12
  end
end
