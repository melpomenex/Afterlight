defmodule Afterlight.Accounts.AvatarTest do
  use Afterlight.DataCase, async: false

  alias Afterlight.Accounts.{Actor, AvatarDefinitions, Normalize, Player}
  alias Afterlight.Gateway.Welcome

  test "AvatarDefinitions loads projection and validates entries" do
    {:ok, entries} = AvatarDefinitions.load()
    assert is_list(entries)
    assert length(entries) == 24

    assert AvatarDefinitions.valid_id?(entries, "moon-head")
    assert AvatarDefinitions.valid_id?(entries, "crt-head")
    assert AvatarDefinitions.valid_id?(entries, "neon-jellyfish")
    refute AvatarDefinitions.valid_id?(entries, "non-existent-avatar")
    refute AvatarDefinitions.valid_id?(entries, nil)

    moon = AvatarDefinitions.get_entry(entries, "moon-head")
    assert moon["name"] == "Moon Head"
    assert moon["rig"] == "humanoid"
    assert moon["rarity"] == "common"
    assert moon["weight"] == 10

    tot = AvatarDefinitions.total_weight(entries)
    assert tot > 0

    # Test deterministic roll
    first_id = AvatarDefinitions.pick_weighted(entries, 0)
    assert first_id == hd(entries)["id"]

    random_id = AvatarDefinitions.pick_weighted(entries)
    assert AvatarDefinitions.valid_id?(entries, random_id)
  end

  test "Normalize.to_legacy_player passes avatar through" do
    player_with_avatar = %{
      id: "guest_1",
      nickname: "Tester",
      current_room: "market",
      last_seen: 12345,
      avatar: "alien-tourist"
    }

    legacy = Normalize.to_legacy_player(player_with_avatar)
    assert legacy["id"] == "guest_1"
    assert legacy["nickname"] == "Tester"
    assert legacy["currentRoom"] == "market"
    assert legacy["lastSeen"] == 12345
    assert legacy["avatar"] == "alien-tourist"

    player_without_avatar = %{
      id: "guest_2",
      nickname: "Tester2",
      current_room: "market",
      last_seen: 12345,
      avatar: nil
    }

    legacy2 = Normalize.to_legacy_player(player_without_avatar)
    assert legacy2["id"] == "guest_2"
    refute Map.has_key?(legacy2, "avatar")
  end

  test "Welcome.compose assigns avatar on first welcome, sticks on return, heals retired id" do
    actor = Actor.system()
    guest_id = "guest_avatar_lifecycle_#{System.unique_integer([:positive])}"

    # 1. First welcome: assigns fresh avatar
    welcome1 = Welcome.compose(guest_id, "Wanderer")
    player1 = welcome1["player"]
    assert is_binary(player1["avatar"])
    {:ok, entries} = AvatarDefinitions.load()
    assert AvatarDefinitions.valid_id?(entries, player1["avatar"])
    assigned_avatar = player1["avatar"]

    # Check persistence in DB
    db_player = Ash.get!(Player, guest_id, actor: actor)
    assert db_player.avatar == assigned_avatar

    # 2. Returning player: sticks to assigned avatar
    welcome2 = Welcome.compose(guest_id, "Wanderer")
    player2 = welcome2["player"]
    assert player2["avatar"] == assigned_avatar

    # 3. Healing retired avatar: manually corrupt avatar to a retired string
    db_player
    |> Ash.Changeset.for_update(:set_avatar, %{avatar: "retired-avatar-v0"}, actor: actor)
    |> Ash.update!()

    # Next welcome should heal the avatar to a valid catalog entry
    welcome3 = Welcome.compose(guest_id, "Wanderer")
    player3 = welcome3["player"]
    assert is_binary(player3["avatar"])
    assert player3["avatar"] != "retired-avatar-v0"
    assert AvatarDefinitions.valid_id?(entries, player3["avatar"])

    db_player_healed = Ash.get!(Player, guest_id, actor: actor)
    assert db_player_healed.avatar == player3["avatar"]
  end
end
