defmodule Afterlight.Accounts.ImportTest do
  use Afterlight.DataCase, async: false

  alias Afterlight.Accounts.{Export, Import, Normalize, Player}

  defp snapshot(players) do
    dir = Path.join(System.tmp_dir!(), "al-import-#{System.unique_integer([:positive])}")
    File.mkdir_p!(dir)
    path = Path.join(dir, "game-state.json")
    File.write!(path, Jason.encode!(%{"version" => 1, "players" => players}))
    path
  end

  test "idempotent second run against the same snapshot" do
    path =
      snapshot(%{
        "guest_imp_a" => player("guest_imp_a", 10, 3),
        "guest_imp_b" => player("guest_imp_b", 4, 1)
      })

    {:ok, :imported, meta} = Import.run(path)
    assert meta.count == 2
    {:ok, :identical, meta2} = Import.run(path)
    assert meta2.hash == meta.hash
    for id <- ["guest_imp_a", "guest_imp_b"] do
      assert {:ok, _} = Ash.get(Player, id, authorize?: false)
    end
  end

  test "count validation failure aborts" do
    path = snapshot(%{"guest_bad" => Map.delete(player("guest_bad", 1, 0), "id")})
    # Missing id will fail the create inside the transaction.
    assert {:error, :validation, _} = Import.run(path)
  end

  test "normalizePlayer quirk fixtures" do
    raw = %{
      "id" => "guest_norm1",
      "nickname" => "Quirk",
      "coins" => 2.9,
      "xp" => 1,
      "level" => 1,
      "inventory" => %{},
      "currentRoom" => "market",
      "lastSeen" => 50
    }

    normalized = Normalize.player(raw)
    assert normalized["materials"] == %{}
    assert normalized["inventory"]["sprinklers"] == 0
    assert normalized["reservedCoins"] == 0

    path =
      snapshot(%{
        "guest_norm1" => raw,
        "guest_norm2" => %{
          "id" => "guest_norm2",
          "nickname" => "Dusty",
          "coins" => 1,
          "xp" => 0,
          "level" => 1,
          "materials" => %{"copper" => 1.8, "bad" => 0, "nan" => "x"},
          "inventory" => %{"sprinklers" => -3},
          "currentRoom" => "market",
          "lastSeen" => 1
        }
      })

    {:ok, :imported, _} = Import.run(path)
    {:ok, p} = Ash.get(Player, "guest_norm2", authorize?: false)
    assert p.materials == %{"copper" => 1}
    assert p.inventory["sprinklers"] == 0
  end

  test "partial file is a success no-op" do
    path = snapshot(%{})
    assert {:ok, :noop, _} = Import.run(path)

    dir = Path.dirname(path)
    empty = Path.join(dir, "no-players.json")
    File.write!(empty, Jason.encode!(%{"version" => 1, "theater" => %{}}))
    assert {:ok, :noop, _} = Import.run(empty)
  end

  test "snapshot-hash mismatch detection" do
    path = snapshot(%{"guest_h1" => player("guest_h1", 1, 0)})
    {:ok, :imported, _} = Import.run(path)
    other = snapshot(%{"guest_h2" => player("guest_h2", 2, 0)})
    assert {:error, :hash_mismatch, _} = Import.run(other)
  end

  test "legacy field set round-trip after import" do
    rec = player("guest_rt1", 9, 4)
    rec = Map.merge(rec, %{"materials" => %{"timber" => 2}, "inventory" => %{"seeds" => %{"radish" => 1}, "produce" => %{}, "reservedProduce" => %{}, "sprinklers" => 2}})
    path = snapshot(%{"guest_rt1" => rec})
    {:ok, :imported, _} = Import.run(path)
    {:ok, p} = Ash.get(Player, "guest_rt1", authorize?: false)
    legacy = Normalize.to_legacy_player(p)
    assert legacy["id"] == rec["id"]
    assert legacy["nickname"] == rec["nickname"]
    assert legacy["coins"] == rec["coins"]
    assert legacy["materials"]["timber"] == 2
    assert legacy["inventory"]["sprinklers"] == 2
  end

  test "export_players requires freeze ack" do
    assert_raise ArgumentError, fn -> Export.write!("/tmp/nope.json") end
    path = Path.join(System.tmp_dir!(), "al-exp-#{System.unique_integer([:positive])}.json")
    assert path == Export.write!(path, freeze_ack: true)
  end

  defp player(id, coins, xp) do
    %{
      "id" => id,
      "nickname" => "N#{id}",
      "coins" => coins,
      "xp" => xp,
      "level" => 1,
      "reputation" => 0,
      "reservedCoins" => 0,
      "inventory" => %{"seeds" => %{}, "produce" => %{}, "reservedProduce" => %{}, "sprinklers" => 0},
      "materials" => %{},
      "currentRoom" => "market",
      "lastSeen" => 1
    }
  end
end
