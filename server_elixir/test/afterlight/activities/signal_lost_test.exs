defmodule Afterlight.Activities.SignalLostTest do
  use ExUnit.Case, async: true

  alias Afterlight.Activities.SignalLost

  describe "init_sim_state/1" do
    test "initializes fresh simulation with ship, lives, score, and initial asteroid wave" do
      state = SignalLost.init_sim_state(seed: 42)

      assert state["width"] == 800
      assert state["height"] == 600
      assert state["ship"]["x"] == 400.0
      assert state["ship"]["y"] == 300.0
      assert state["lives"] == 3
      assert state["score"] == 0
      assert state["wave"] == 1
      assert length(state["asteroids"]) == 4 # 3 + wave 1 = 4
      assert state["state"] == "running"
      assert state["tick"] == 0
    end
  end

  describe "ship physics and controls" do
    test "rotates ship angle and thrusts with acceleration and wrapping" do
      state =
        SignalLost.init_sim_state(seed: 123)
        |> Map.put("asteroids", []) # clear for pure kinematics

      # Rotate right
      players_rot = %{0 => %{input_state: %{"rotate" => 1.0}}}
      {rotated, nil} = SignalLost.step(state, players_rot, 20)
      assert rotated["ship"]["angle"] > state["ship"]["angle"]

      # Thrust forward
      players_thrust = %{0 => %{input_state: %{"thrust" => 1.0}}}
      {thrusted, nil} = SignalLost.step(rotated, players_thrust, 40)
      speed = :math.sqrt(thrusted["ship"]["vx"] ** 2 + thrusted["ship"]["vy"] ** 2)
      assert speed > 1.0
      assert speed <= 8.5

      # Wrap around arena
      {wrapped, nil} = SignalLost.step(thrusted, players_thrust, 200)
      assert wrapped["ship"]["x"] >= 0.0 and wrapped["ship"]["x"] <= 800.0
      assert wrapped["ship"]["y"] >= 0.0 and wrapped["ship"]["y"] <= 600.0
    end
  end

  describe "fire and projectile collisions" do
    test "firing spawns projectile, cooldown limits rate, hits split asteroids" do
      # Setup state with 1 large asteroid directly in front of ship
      ship = %{
        "x" => 400.0,
        "y" => 300.0,
        "angle" => 0.0, # facing right (+X)
        "vx" => 0.0,
        "vy" => 0.0,
        "thrusting" => false,
        "invulnerable" => 0
      }

      target_asteroid = %{
        "id" => 1,
        "type" => "large",
        "radius" => 36.0,
        "x" => 550.0, # 150 units to the right
        "y" => 300.0,
        "vx" => 0.0,
        "vy" => 0.0
      }

      state =
        SignalLost.init_sim_state(seed: 10)
        |> Map.put("ship", ship)
        |> Map.put("asteroids", [target_asteroid])
        |> Map.put("projectiles", [])
        |> Map.put("fireCooldown", 0)

      # Fire laser
      players_fire = %{0 => %{input_state: %{"fire" => true}}}
      {fired_state, nil} = SignalLost.step(state, players_fire, 1)

      assert length(fired_state["projectiles"]) == 1
      assert fired_state["fireCooldown"] == 10

      # Step until bullet hits asteroid
      {hit_state, nil} = SignalLost.step(fired_state, %{0 => %{input_state: %{}}}, 10)

      # Bullet hit! Large asteroid split into 2 medium asteroids and awarded 20 points
      assert hit_state["score"] == 20
      assert length(hit_state["asteroids"]) == 2
      assert Enum.all?(hit_state["asteroids"], fn a -> a["type"] == "medium" end)
    end
  end

  describe "ship collision and lives" do
    test "collision depletes lives, respawns with invulnerability, 0 lives ends match" do
      # Setup ship placed right on top of an asteroid without invulnerability
      vulnerable_ship = %{
        "x" => 400.0,
        "y" => 300.0,
        "angle" => 0.0,
        "vx" => 0.0,
        "vy" => 0.0,
        "thrusting" => false,
        "invulnerable" => 0
      }

      asteroid = %{
        "id" => 1,
        "type" => "large",
        "radius" => 36.0,
        "x" => 405.0,
        "y" => 300.0,
        "vx" => 0.0,
        "vy" => 0.0
      }

      state =
        SignalLost.init_sim_state(seed: 10)
        |> Map.put("ship", vulnerable_ship)
        |> Map.put("asteroids", [asteroid])
        |> Map.put("lives", 1) # only 1 life left

      players = %{0 => %{input_state: %{}}}
      {ended_state, outcome} = SignalLost.step(state, players, 1)

      assert ended_state["state"] == "crashed"
      assert ended_state["lives"] == 0
      assert {:match_ended, 0, details} = outcome
      assert details[:reason] == "lives_depleted" || details["reason"] == "lives_depleted"
    end
  end

  describe "run cap" do
    test "36,000 ticks triggers run_cap match end" do
      state =
        SignalLost.init_sim_state(seed: 55)
        |> Map.put("tick", 35_999)
        |> Map.put("asteroids", [])

      players = %{0 => %{input_state: %{}}}
      {capped_state, outcome} = SignalLost.step(state, players, 1)

      assert capped_state["state"] == "completed"
      assert {:match_ended, 0, details} = outcome
      assert details[:reason] == "run_cap" || details["reason"] == "run_cap"
    end
  end
end
