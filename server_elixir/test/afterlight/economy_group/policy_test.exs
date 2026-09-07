defmodule Afterlight.EconomyGroup.PolicyTest do
  @moduledoc """
  Actor-scoped policies: forged player ids cannot touch another wallet,
  garden, or order (design D12).
  """

  use Afterlight.DataCase, async: false

  @moduletag :database

  import Ash.Expr

  require Ash.Query

  alias Afterlight.Accounts.Actor
  alias Afterlight.Economy.{Order, Wallet}
  alias Afterlight.Gardens.{Bed, Garden}
  alias Afterlight.Restoration.MachineContribution

  setup do
    now = System.system_time(:millisecond)

    insert_player!("guest_a", "PlayerA", now)
    insert_player!("guest_b", "PlayerB", now)

    Repo.insert_all("gardens", [%{player_id: "guest_a", inserted_at: now, last_tick: now}])
    Repo.insert_all("wallets", [%{player_id: "guest_a", coins: 100, reserved_coins: 0}])
    Repo.insert_all("wallets", [%{player_id: "guest_b", coins: 50, reserved_coins: 0}])

    Repo.insert_all("orders", [
      %{
        id: "ord_a_1",
        player_id: "guest_a",
        side: "buy",
        crop_id: "wheat",
        quality: "B",
        price: 10,
        quantity: 5,
        filled: 0,
        created_at: now,
        inserted_at: now
      }
    ])

    actor_a = Actor.session("guest_a", "sess-a")
    actor_b = Actor.session("guest_b", "sess-b")

    %{actor_a: actor_a, actor_b: actor_b, now: now}
  end

  test "actor cannot read another player's wallet", %{actor_b: actor_b} do
    assert {:error, %Ash.Error.Invalid{errors: [%Ash.Error.Query.NotFound{}]}} =
             Ash.get(Wallet, "guest_a", actor: actor_b)
  end

  test "actor cannot adjust another player's wallet", %{actor_b: actor_b} do
    {:ok, wallet} = Ash.get(Wallet, "guest_b", actor: actor_b, authorize?: false)

    assert {:error, %Ash.Error.Forbidden{}} =
             wallet
             |> Ash.Changeset.for_update(:adjust, %{coins: 999}, actor: Actor.session("guest_a", "forged"))
             |> Ash.update()
  end

  test "actor cannot read another player's garden beds", %{actor_b: actor_b} do
    Repo.insert_all("beds", [
      %{
        garden_id: "guest_a",
        index: 0,
        prepared: false,
        moisture: 0.0,
        health: 1.0,
        moisture_history_sum: 0.0,
        moisture_checks: 0.0,
        stage: 0,
        harvest_count: 0
      }
    ])

    assert {:ok, []} =
             Bed
             |> Ash.Query.filter(expr(garden_id == "guest_a"))
             |> Ash.read(actor: actor_b)
  end

  test "actor cannot mutate another player's garden", %{actor_b: actor_b} do
    {:ok, garden} = Ash.get(Garden, "guest_a", actor: Actor.system(), authorize?: false)

    assert {:error, %Ash.Error.Forbidden{}} =
             garden
             |> Ash.Changeset.for_update(:till_bed, %{}, actor: actor_b)
             |> Ash.update()
  end

  test "actor cannot read or cancel another player's order", %{actor_b: actor_b} do
    assert {:error, %Ash.Error.Invalid{errors: [%Ash.Error.Query.NotFound{}]}} =
             Ash.get(Order, "ord_a_1", actor: actor_b)

    {:ok, order} = Ash.get(Order, "ord_a_1", actor: Actor.system(), authorize?: false)

    assert {:error, %Ash.Error.Forbidden{}} =
             order
             |> Ash.Changeset.for_update(:cancel, %{cancelled_at: 1}, actor: actor_b)
             |> Ash.update()
  end

  test "authenticated actor may record own machine contribution (communal)", %{actor_a: actor_a, now: now} do
    Repo.insert_all("machines", [%{machine_id: "mill", status: "broken"}])

    assert {:ok, _} =
             MachineContribution
             |> Ash.Changeset.for_create(
               :record,
               %{
                 machine_id: "mill",
                 player_id: "guest_a",
                 material: "copper",
                 applied: 1,
                 inserted_at: now
               },
               actor: actor_a
             )
             |> Ash.create()
  end

  test "forged player_id on contribution create is denied", %{actor_b: actor_b, now: now} do
    Repo.insert_all("machines", [%{machine_id: "mill", status: "broken"}])

    assert {:error, %Ash.Error.Forbidden{}} =
             MachineContribution
             |> Ash.Changeset.for_create(
               :record,
               %{
                 machine_id: "mill",
                 player_id: "guest_a",
                 material: "copper",
                 applied: 1,
                 inserted_at: now
               },
               actor: actor_b
             )
             |> Ash.create()
  end

  defp insert_player!(id, nickname, last_seen) do
    Repo.insert_all("players", [
      %{
        id: id,
        nickname: nickname,
        coins: 0,
        xp: 0,
        level: 1,
        reputation: 0,
        reserved_coins: 0,
        inventory: %{"seeds" => %{}, "produce" => %{}, "reservedProduce" => %{}, "sprinklers" => 0},
        materials: %{},
        current_room: "market",
        last_seen: last_seen,
        active: true,
        shadow: false,
        claimed_at: last_seen
      }
    ])
  end
end
