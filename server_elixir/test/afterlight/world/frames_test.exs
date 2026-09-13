defmodule Afterlight.World.FramesTest do
  @moduledoc """
  Task 3.4: room frames are built in the World layer, the flush is
  extracted through the FrameEncoder seam (JSON in P3), and the emitted
  `presence_update` is EXACTLY the catalog wire shape (field set + values;
  no extra fields, string keys — clients decode JSON, so key order is not
  part of the wire contract).
  """

  use ExUnit.Case, async: true

  alias Afterlight.World.Frames

  defp member(id, nickname, opts \\ []) do
    base = %{
      player_id: id,
      conn_ref: make_ref(),
      channel_pid: nil,
      monitor: nil,
      nickname: nickname,
      pose:
        Map.merge(
          %{x: 1.5, z: -2.5, rot_y: 0.75, walking: false, sitting: false, airborne: false},
          Map.new(Keyword.get(opts, :pose, []))
        ),
      joined_seq: 0
    }

    case Keyword.get(opts, :avatar) do
      nil -> base
      avatar -> Map.put(base, :avatar, avatar)
    end
  end

  test "flush shape is exactly the catalog roster shape" do
    frame = Frames.flush([member("guest_a", "Mossy", pose: [walking: true, airborne: true])], 7)

    assert frame == %{
             "type" => "presence_update",
             "epoch" => 0,
             "players" => [
               %{
                 "id" => "guest_a",
                 "x" => 1.5,
                 "z" => -2.5,
                 "rotY" => 0.75,
                 "walking" => true,
                 "sitting" => false,
                 "airborne" => true
               }
             ]
           }

    # Byte-level: the wire JSON carries no internal fields (the encoder's
    # debug `tick` is normalized away) and Jason round-trips the map.
    json = Jason.encode!(frame)
    assert Jason.decode!(json) == frame
    refute json =~ "tick"
  end

  test "flush preserves join order and carries no nickname" do
    frame =
      Frames.flush(
        [member("guest_a", "A"), member("guest_b", "B", pose: [sitting: true])],
        0
      )

    assert Enum.map(frame["players"], & &1["id"]) == ["guest_a", "guest_b"]
    refute Map.has_key?(hd(frame["players"]), "nickname")
    assert hd(tl(frame["players"]))["sitting"] == true
  end

  test "join roster entries carry the join-shape asymmetry (nicknames, no airborne)" do
    frame = Frames.join_roster([member("guest_a", "Mossy", pose: [walking: true])])

    assert frame["type"] == "presence_update"
    assert hd(frame["players"]) == %{
             "id" => "guest_a",
             "nickname" => "Mossy",
             "x" => 1.5,
             "z" => -2.5,
             "rotY" => 0.75,
             "walking" => true,
             "sitting" => false
           }
  end

  test "presence_join carries the player under :player with the join shape" do
    frame = Frames.presence_join(member("guest_b", "Kiln's friend"))
    assert frame["type"] == "presence_join"
    assert frame["player"]["id"] == "guest_b"
    assert frame["player"]["nickname"] == "Kiln's friend"
    refute Map.has_key?(frame["player"], "airborne")
  end

  test "presence_leave carries playerId; emote_broadcast carries id + live nickname" do
    assert Frames.presence_leave("guest_a") == %{
             "type" => "presence_leave",
             "playerId" => "guest_a",
             "epoch" => 0
           }

    assert Frames.emote_broadcast("guest_a", "Mossy Fern", "wave") == %{
             "type" => "emote_broadcast",
             "playerId" => "guest_a",
             "nickname" => "Mossy Fern",
             "emote" => "wave",
             "epoch" => 0
           }
  end

  test "a member with no learned nickname drops the key (Node undefined-drop parity)" do
    frame = Frames.join_roster([member("guest_a", nil)])
    refute Map.has_key?(hd(frame["players"]), "nickname")
    assert hd(frame["players"])["id"] == "guest_a"
  end

  # Task 3.2 (add-social-place-framework D3): the tagged internal envelope
  # and the additive public room field.

  test "world_message tags the internal envelope with the source room" do
    frame = Frames.flush([member("guest_a", "Mossy")], 7)

    assert Frames.world_message("theater", frame) == {:world_frame, "theater", frame}
  end

  test "put_room adds only the additive roomId field to the public frame" do
    frame = Frames.emote_broadcast("guest_a", "Mossy Fern", "wave")
    tagged = Frames.put_room(frame, "market")

    assert tagged ==
             Map.put(frame, "roomId", "market")

    # The built frame itself stays untouched (non-mutating tag).
    refute Map.has_key?(frame, "roomId")
  end

  test "avatar is included in join_roster and presence_join when present" do
    m = member("guest_c", "Moonwalker", avatar: "moon-head")

    join_frame = Frames.presence_join(m)
    assert join_frame["player"]["avatar"] == "moon-head"

    roster_frame = Frames.join_roster([m])
    assert hd(roster_frame["players"])["avatar"] == "moon-head"

    # Periodic flush does NOT include avatar (flush shape is compact)
    flush_frame = Frames.flush([m])
    refute Map.has_key?(hd(flush_frame["players"]), "avatar")
  end
end
