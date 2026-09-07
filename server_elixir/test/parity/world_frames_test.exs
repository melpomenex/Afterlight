defmodule WorldFramesTest do
  @moduledoc """
  Task 7.1: the world runtime's presence payloads are pinned field-for-field
  to the Node baseline shapes recorded in `world.json` (`shape/*` cases —
  literal ports of `server/world.js` `joinRoom` and
  `tickMovementBroadcast`, executed against the real JS module by the
  exporter).

  Two wire shapes exist and are deliberately asymmetric (wire-observed
  Node behavior, not a bug to fix here):

    * join-roster entry `{id, nickname, x, z, rotY, walking, sitting}`
      — sent to the JOINER on join, nickname present, no airborne;
    * flush entry `{id, x, z, rotY, walking, sitting, airborne}`
      — the 10 Hz dirty-room flush, airborne present, no nickname.

  The runner (`parity_runner_test.exs`) already proves the JS entry
  builders themselves against this reference (including the flag-coercion
  variants); this module proves that `Afterlight.World.Frames` renders
  EXACTLY those recorded shapes — full-frame equality against the fixture
  expectations, Jason round-trip (decode-equal) so the wire JSON carries
  no extra fields.

  Runs DB-free and needs no Node runtime.
  """

  use ExUnit.Case, async: false

  alias Afterlight.World.Frames

  @fixture Afterlight.Parity.load_fixture("world.json")

  # The base shape cases hold already-sanitized booleans, exactly what
  # `Afterlight.World.Movement.validate/1` stores in a member's pose — so
  # Frames' input here is the runtime's real input, not a hand-built stand-in.
  # (Lookups go through fixture_arg/fixture_expected at runtime: defp helpers
  # cannot be evaluated in module-attribute position.)
  defp session, do: fixture_arg("shape/join-roster-entry")
  defp flush_entry, do: fixture_expected("shape/flush-entry")
  defp roster_entry, do: fixture_expected("shape/join-roster-entry")

  test "flush frame entries are exactly the Node baseline flush shape" do
    frame = Frames.flush([member(session())], 0)

    assert frame == %{"type" => "presence_update", "players" => [flush_entry()], "epoch" => 0}

    # Byte-level: the frame JSON carries no internal fields, and a decode
    # round-trip reproduces the frame exactly (string-keyed, decode-equal).
    json = Jason.encode!(frame)
    assert Jason.decode!(json) == frame
    refute json =~ "nickname"
    refute json =~ "tick"
  end

  test "join roster entries are exactly the Node baseline join shape" do
    frame = Frames.join_roster([member(session())])

    assert frame == %{"type" => "presence_update", "players" => [roster_entry()], "epoch" => 0}

    json = Jason.encode!(frame)
    assert Jason.decode!(json) == frame
    refute json =~ "airborne"
  end

  test "presence_join carries the join shape under :player" do
    frame = Frames.presence_join(member(session()))

    assert frame == %{"type" => "presence_join", "player" => roster_entry(), "epoch" => 0}
  end

  # The shape asymmetry is pinned by exact equality above; assert the field
  # sets by name too so a future failure reads as the contract it breaks.
  test "the two shapes stay asymmetric (nickname on join, airborne on flush)" do
    assert MapSet.new(Map.keys(roster_entry())) ==
             MapSet.new(~w(id nickname x z rotY walking sitting))

    assert MapSet.new(Map.keys(flush_entry())) ==
             MapSet.new(~w(id x z rotY walking sitting airborne))
  end

  defp fixture_arg(case_id) do
    case Enum.find(@fixture["cases"], &(&1["id"] == case_id)) do
      nil -> flunk("fixture case #{case_id} missing from world.json — re-run scripts/export-parity-fixtures.mjs")
      %{"args" => [session]} -> session
    end
  end

  defp fixture_expected(case_id) do
    case Enum.find(@fixture["cases"], &(&1["id"] == case_id)) do
      nil -> flunk("fixture case #{case_id} missing from world.json — re-run scripts/export-parity-fixtures.mjs")
      %{"expected" => expected} -> expected
    end
  end

  # A member exactly as the RoomServer holds it: identity + live nickname on
  # the member, the validated pose nested under :pose (atom keys).
  defp member(session) do
    %{
      player_id: session["player"]["id"],
      conn_ref: make_ref(),
      channel_pid: nil,
      monitor: nil,
      nickname: session["player"]["nickname"],
      pose: %{
        x: session["x"],
        z: session["z"],
        rot_y: session["rotY"],
        walking: session["walking"],
        sitting: session["sitting"],
        airborne: session["airborne"]
      },
      joined_seq: 0
    }
  end
end
