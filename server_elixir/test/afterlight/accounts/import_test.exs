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
        "guest_imp_a" => player("guest_imp_a", "QuietLantern"),
        "guest_imp_b" => player("guest_imp_b", "SignalKeeper")
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
    path = snapshot(%{"guest_bad" => Map.delete(player("guest_bad", "Bad"), "id")})
    # Missing id will fail the create inside the transaction.
    assert {:error, :validation, _} = Import.run(path)
  end

  test "player normalization keeps identity and current room" do
    raw = %{
      "id" => "guest_norm1",
      "nickname" => "Quirk",
      "currentRoom" => "theater",
      "lastSeen" => 50
    }

    normalized = Normalize.player(raw)
    assert normalized["id"] == "guest_norm1"
    assert normalized["currentRoom"] == "theater"

    path = snapshot(%{"guest_norm1" => raw, "guest_norm2" => player("guest_norm2", "Dusty")})

    {:ok, :imported, _} = Import.run(path)
    {:ok, p} = Ash.get(Player, "guest_norm2", authorize?: false)
    assert p.nickname == "Dusty"
    assert p.current_room == "market"
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
    path = snapshot(%{"guest_h1" => player("guest_h1", "Alpha")})
    {:ok, :imported, _} = Import.run(path)
    other = snapshot(%{"guest_h2" => player("guest_h2", "Beta")})
    assert {:error, :hash_mismatch, _} = Import.run(other)
  end

  test "retained field set round-trip after import" do
    rec = player("guest_rt1", "RoundTrip")
    path = snapshot(%{"guest_rt1" => rec})
    {:ok, :imported, _} = Import.run(path)
    {:ok, p} = Ash.get(Player, "guest_rt1", authorize?: false)
    legacy = Normalize.to_legacy_player(p)
    assert legacy["id"] == rec["id"]
    assert legacy["nickname"] == rec["nickname"]
    assert legacy["currentRoom"] == "market"
  end

  test "legacy economy fields in a snapshot are ignored, never imported" do
    rec =
      player("guest_legacy", "Legacy")
      |> Map.merge(%{
        "coins" => 99,
        "xp" => 500,
        "level" => 6,
        "reputation" => 3,
        "reservedCoins" => 4,
        "materials" => %{"copper" => 2},
        "inventory" => %{"seeds" => %{"radish" => 3}, "produce" => %{}, "reservedProduce" => %{}, "sprinklers" => 1}
      })

    path = snapshot(%{"guest_legacy" => rec})
    {:ok, :imported, _} = Import.run(path)
    {:ok, p} = Ash.get(Player, "guest_legacy", authorize?: false)
    assert p.nickname == "Legacy"

    legacy = Normalize.to_legacy_player(p)
    assert legacy["currentRoom"] == "market"
    refute Map.has_key?(legacy, "coins")
    refute Map.has_key?(legacy, "inventory")
    refute Map.has_key?(legacy, "materials")
  end

  test "export_players requires freeze ack" do
    assert_raise ArgumentError, fn -> Export.write!("/tmp/nope.json") end
    path = Path.join(System.tmp_dir!(), "al-exp-#{System.unique_integer([:positive])}.json")
    assert path == Export.write!(path, freeze_ack: true)
  end

  defp player(id, nickname) do
    %{
      "id" => id,
      "nickname" => nickname,
      "currentRoom" => "market",
      "lastSeen" => 1
    }
  end
end
