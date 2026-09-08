defmodule Afterlight.Gardens.DomainTest do
  use Afterlight.DataCase, async: false

  alias Afterlight.Accounts
  alias Afterlight.Accounts.Actor
  alias Afterlight.Gardens
  alias Afterlight.Gardens.Loader
  alias Afterlight.EconomyGroup.{Inventory, Wallet}

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
        inventory: %{"seeds" => %{"radish" => 5}, "produce" => %{}, "reservedProduce" => %{}, "sprinklers" => 0},
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

  test "till and plant bed updates garden and inventory" do
    actor = Actor.session("garden_a", "sess")
    seed_player("garden_a")

    assert {:ok, {:applied, _}} = Gardens.till_bed(actor, "act_till_1", 0)
    assert {:ok, {:applied, _}} = Gardens.plant_bed(actor, "act_plant_1", 0, "radish")

    garden = Gardens.fetch_garden("garden_a")
    bed = Enum.at(garden.beds, 0)
    assert bed.prepared
    assert bed.crop_id == "radish"
    assert Inventory.get_quantity("garden_a", "seed", "radish") == 4
  end

  test "harvest grants produce when bed is harvestable" do
    actor = Actor.session("garden_b", "sess")
    seed_player("garden_b")

    {:ok, {:applied, _}} = Gardens.till_bed(actor, "t1", 0)
    {:ok, {:applied, _}} = Gardens.plant_bed(actor, "p1", 0, "radish")

    garden = Gardens.fetch_garden("garden_b")
    bed = Enum.at(garden.beds, 0)
    now = Accounts.now_ms()

    harvestable =
      %{bed | stage: 6, planted_at: now - 30_000, crop_id: "radish", moisture_checks: 1.0, moisture_history_sum: 0.5}

    Gardens.persist_bed!("garden_b", harvestable)

    assert {:ok, {:applied, result}} = Gardens.harvest_bed(actor, "h1", 0)
    assert result.message =~ "Harvested"
    assert Inventory.get_quantity("garden_b", "produce", "radish_B") >= 2
  end
end
