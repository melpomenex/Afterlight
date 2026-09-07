defmodule Afterlight.World.MovementTest do
  @moduledoc """
  Task 3.1: Node-baseline semantics (finite checks + `!!` flags) plus the
  P3 deliberate tightening #1 (the bounds clamp). The unclamped baseline
  itself is pinned by the parity fixture corpus (`world.json`); these tests
  pin the production rule including the clamp.
  """

  use ExUnit.Case, async: true

  alias Afterlight.World.Movement

  test "finite pose passes with coerced flags" do
    assert {:ok,
            %{
              x: 1.5,
              z: -2.5,
              rot_y: 0.75,
              walking: true,
              sitting: false,
              airborne: true
            }} =
             Movement.validate(%{
               "x" => 1.5,
               "z" => -2.5,
               "rotY" => 0.75,
               "walking" => true,
               "sitting" => false,
               "airborne" => true
             })
  end

  test "flags are permissively coerced (JS truthiness)" do
    assert {:ok, %{walking: true, sitting: true, airborne: false}} =
             Movement.validate(%{"x" => 0, "z" => 0, "rotY" => 0, "walking" => 1, "sitting" => "yes"})
  end

  test "non-finite coordinates drop the update (Number.isFinite parity)" do
    assert :invalid = Movement.validate(%{"x" => 1, "z" => 2})
    assert :invalid = Movement.validate(%{"x" => 1, "z" => 2, "rotY" => "left"})
    assert :invalid = Movement.validate(nil)
  end

  test "out-of-bounds pose is clamped, not rejected (deliberate tightening #1)" do
    assert {:ok, %{x: 11.3, z: -9.5}} = Movement.validate(%{"x" => 500, "z" => -500, "rotY" => 0})
  end

  test "the clamp matches the client's own bounds" do
    # Walkable boundary (AGENTS.md §6): -11.3 < x < 11.3, -9.5 < z < 10.3.
    # The clamp is inclusive at the client's edge values.
    assert {:ok, %{x: x, z: z}} = Movement.validate(%{"x" => 11.3, "z" => 10.3, "rotY" => 0})
    assert x == 11.3 and z == 10.3
    assert {:ok, %{x: x2, z: z2}} = Movement.validate(%{"x" => -11.3, "z" => -9.5, "rotY" => 0})
    assert x2 == -11.3 and z2 == -9.5
  end

  test "legitimate movement is unmodified" do
    assert {:ok, %{x: 3.25, z: 4.5, rot_y: -1.0}} =
             Movement.validate(%{"x" => 3.25, "z" => 4.5, "rotY" => -1.0, "walking" => true})
  end

  test "boundary values exactly at every bound are valid and kept" do
    for {x, z} <- [{11.3, 10.3}, {-11.3, -9.5}, {11.3, -9.5}, {-11.3, 10.3}] do
      assert {:ok, %{x: ^x, z: ^z}} = Movement.validate(%{"x" => x, "z" => z, "rotY" => 0})
    end
  end

  test "one step beyond any bound clamps INTO the bound (never rejects)" do
    for {raw, clamped} <- [{11.5, 11.3}, {-11.5, -11.3}, {500, 11.3}, {-500, -11.3}] do
      assert {:ok, %{x: ^clamped}} = Movement.validate(%{"x" => raw, "z" => 0, "rotY" => 0})
    end

    for {raw, clamped} <- [{10.4, 10.3}, {10.9, 10.3}, {-9.6, -9.5}, {-13.0, -9.5}] do
      assert {:ok, %{z: ^clamped}} = Movement.validate(%{"x" => 0, "z" => raw, "rotY" => 0})
    end
  end

  test "rotY is finite-checked but never clamped (a facing has no walkable bound)" do
    assert {:ok, %{rot_y: 40.0}} = Movement.validate(%{"x" => 0, "z" => 0, "rotY" => 40.0})
    assert {:ok, %{rot_y: -6.28}} = Movement.validate(%{"x" => 0, "z" => 0, "rotY" => -6.28})
    assert :invalid = Movement.validate(%{"x" => 0, "z" => 0, "rotY" => :inf})
  end

  test "non-number and non-finite terms are invalid (Number.isFinite parity)" do
    for bad <- [nil, true, false, "1.0", :nan, :inf, :neg_infinity, %{}, [1.0]] do
      assert :invalid = Movement.validate(%{"x" => bad, "z" => 0, "rotY" => 0})
      assert :invalid = Movement.validate(%{"x" => 0, "z" => bad, "rotY" => 0})
      assert :invalid = Movement.validate(%{"x" => 0, "z" => 0, "rotY" => bad})
    end
  end

  test "numbers keep their JSON type (no integer widening — Node echoes as stored)" do
    assert {:ok, %{x: 7, z: -3, rot_y: 2}} = Movement.validate(%{"x" => 7, "z" => -3, "rotY" => 2})
  end

  test "flags coerce with the JS falsy table" do
    # JS falsy: null→nil, false, 0, 0.0/-0.0, "" (and NaN — a float NaN
    # cannot be produced by this runtime's arithmetic).
    for falsy <- [nil, false, 0, 0.0, ""] do
      assert {:ok, %{walking: false, sitting: false, airborne: false}} =
               Movement.validate(%{"x" => 0, "z" => 0, "rotY" => 0, "walking" => falsy, "sitting" => falsy, "airborne" => falsy})
    end

    # Everything else is truthy — including empty lists/objects (JS !![] is true).
    for truthy <- [true, 1, 2.5, "yes", "false", [], %{}] do
      assert {:ok, %{walking: true, sitting: true, airborne: true}} =
               Movement.validate(%{"x" => 0, "z" => 0, "rotY" => 0, "walking" => truthy, "sitting" => truthy, "airborne" => truthy})
    end
  end

  test "coalesce keeps only the newest pose per actor (last write wins)" do
    poses = %{}
    pose1 = %{x: 1.0, z: 1.0, rot_y: 0.0, walking: false, sitting: false, airborne: false}
    pose2 = %{x: 2.0, z: 2.0, rot_y: 0.5, walking: true, sitting: false, airborne: false}
    pose3 = %{x: 3.0, z: 3.0, rot_y: 1.0, walking: true, sitting: true, airborne: true}

    coalesced =
      poses
      |> Movement.coalesce("guest_a", pose1)
      |> Movement.coalesce("guest_a", pose2)
      |> Movement.coalesce("guest_a", pose3)

    # The intermediate positions never existed anywhere: one entry, newest.
    assert coalesced == %{"guest_a" => pose3}
    assert map_size(coalesced) == 1
  end

  test "coalesce keeps actors independent (state stays O(actors))" do
    pose_a = %{x: 1.0, z: 0.0, rot_y: 0.0, walking: false, sitting: false, airborne: false}
    pose_b = %{x: 5.0, z: 5.0, rot_y: 0.0, walking: true, sitting: false, airborne: false}

    coalesced =
      %{}
      |> Movement.coalesce("guest_a", pose_a)
      |> Movement.coalesce("guest_b", pose_b)
      |> Movement.coalesce("guest_a", pose_a)

    assert coalesced["guest_a"] == pose_a
    assert coalesced["guest_b"] == pose_b
    assert map_size(coalesced) == 2
  end

  test "bounds are the documented walkable rectangle (deliberate tightening #1)" do
    assert Movement.bounds() == %{x_min: -11.3, x_max: 11.3, z_min: -9.5, z_max: 10.3}
  end
end
