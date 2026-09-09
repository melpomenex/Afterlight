defmodule Afterlight.Activities.FoosballTest do
  use ExUnit.Case, async: true
  alias Afterlight.Activities.Foosball

  describe "initialization and dimensions" do
    test "table dimensions and goal specifications" do
      assert Foosball.length() == 120.0
      assert Foosball.width() == 70.0
      assert Foosball.goal_width() == 20.0
      {g_top, g_bottom} = Foosball.goal_bounds()
      assert g_top == 25.0
      assert g_bottom == 45.0
    end

    test "default simulation state initializes correctly" do
      state = Foosball.init_sim_state()
      assert state["width"] == 70
      assert state["length"] == 120
      assert state["state"] == "serving"
      assert state["score"] == %{"0" => 0, "1" => 0}
      assert state["seriesScore"] == %{"0" => 0, "1" => 0}
      assert state["targetScore"] == 5
      assert state["seriesLength"] == 1
      assert state["winsNeeded"] == 1
      assert is_map(state["rods"])
      assert length(state["rods"]["0"]) == 4
      assert length(state["rods"]["1"]) == 4
    end

    test "series length selection respects permitted lengths" do
      assert Foosball.wins_needed(1) == 1
      assert Foosball.wins_needed(3) == 2
      assert Foosball.wins_needed(5) == 3
      assert Foosball.wins_needed(7) == 1 # clamped to 1 if not in [1, 3, 5]

      s3 = Foosball.init_sim_state(series_length: 3)
      assert s3["seriesLength"] == 3
      assert s3["winsNeeded"] == 2
    end
  end

  describe "rod constraints and angular velocity limits" do
    test "rod lateral translation is clamped within bounds" do
      rod = %{"y" => 35.0, "angle" => 0.0, "vy" => 0.0, "omega" => 0.0}
      # Goalie bounds for slot 0: min 25.0, max 45.0
      clamped_low = Foosball.clamp_rod_state(0, 0, rod, %{"targetY" => 10.0})
      assert clamped_low["y"] >= 25.0

      clamped_high = Foosball.clamp_rod_state(0, 0, rod, %{"targetY" => 60.0})
      assert clamped_high["y"] <= 45.0
    end

    test "rod angular velocity is strictly bounded to <= 15 rad/s" do
      rod = %{"y" => 35.0, "angle" => 0.0, "vy" => 0.0, "omega" => 0.0}
      # Attempt massive instant angular jump
      clamped = Foosball.clamp_rod_state(0, 1, rod, %{"targetAngle" => 3.14159})
      max_omega = Foosball.max_angular_speed()
      assert abs(clamped["omega"]) <= max_omega + 1.0e-5
      assert abs(clamped["angle"]) <= max_omega + 1.0e-5
    end

    test "unrestricted 360-degree spinning is prohibited" do
      rod = %{"y" => 35.0, "angle" => 1.5, "vy" => 0.0, "omega" => 0.0}
      clamped = Foosball.clamp_rod_state(0, 2, rod, %{"targetAngle" => 20.0})
      max_angle = Foosball.max_rod_angle()
      assert clamped["angle"] <= max_angle
      assert clamped["angle"] >= -max_angle
    end

    test "casual mode recommends the active rod by ball position" do
      assert Foosball.get_recommended_rod(0, 15.0) == 0 # Goalie
      assert Foosball.get_recommended_rod(0, 35.0) == 1 # Defense
      assert Foosball.get_recommended_rod(0, 60.0) == 2 # Midfield
      assert Foosball.get_recommended_rod(0, 85.0) == 3 # Attack

      assert Foosball.get_recommended_rod(1, 110.0) == 0 # Goalie
      assert Foosball.get_recommended_rod(1, 85.0) == 1  # Defense
      assert Foosball.get_recommended_rod(1, 60.0) == 2  # Midfield
      assert Foosball.get_recommended_rod(1, 35.0) == 3  # Attack
    end
  end

  describe "ball physics, rails, and corner ramps" do
    test "ball bounces off side rails" do
      state =
        Foosball.init_sim_state()
        |> Map.put("state", "rally")
        |> put_in(["ball", "x"], 60.0)
        |> put_in(["ball", "y"], 2.1)
        |> put_in(["ball", "vx"], 0.0)
        |> put_in(["ball", "vy"], -5.0)

      {stepped, _} = Foosball.step(state, %{}, 1)
      assert stepped["ball"]["vy"] > 0.0
      assert stepped["ball"]["y"] >= 2.0
    end

    test "ball deflects off corner ramps preventing dead corners" do
      state =
        Foosball.init_sim_state()
        |> Map.put("state", "rally")
        |> put_in(["ball", "x"], 3.0)
        |> put_in(["ball", "y"], 3.0)
        |> put_in(["ball", "vx"], -4.0)
        |> put_in(["ball", "vy"], -4.0)

      {stepped, _} = Foosball.step(state, %{}, 1)
      # Velocity should bounce back towards the positive quadrant
      assert stepped["ball"]["vx"] > 0.0 or stepped["ball"]["vy"] > 0.0
    end

    test "ball kicks upon player figure contact when kicking" do
      # Place ball just in front of P0 Midfield rod (x = 66.0, centered figure at y = 35.0)
      state =
        Foosball.init_sim_state()
        |> Map.put("state", "rally")
        |> put_in(["ball", "x"], 68.0)
        |> put_in(["ball", "y"], 35.0)
        |> put_in(["ball", "vx"], 0.0)
        |> put_in(["ball", "vy"], 0.0)

      players = %{
        0 => %{input_state: %{"kick" => true, "selectRod" => 2, "controlMode" => "advanced"}}
      }

      {stepped, _} = Foosball.step(state, players, 1)
      # Kicking rod should drive ball forward (+X)
      assert stepped["ball"]["vx"] > 0.0
    end
  end

  describe "goals, double-goal lock, and match conclusion" do
    test "goal scored for slot 1 when ball crosses left goal mouth" do
      state =
        Foosball.init_sim_state()
        |> Map.put("state", "rally")
        |> put_in(["ball", "x"], 2.0)
        |> put_in(["ball", "y"], 35.0)
        |> put_in(["ball", "vx"], -10.0)
        |> put_in(["ball", "vy"], 0.0)

      {stepped, outcome} = Foosball.step(state, %{}, 1)
      assert stepped["state"] == "goal"
      assert stepped["score"]["1"] == 1
      assert stepped["score"]["0"] == 0
      assert stepped["goalDelay"] == 60
      assert outcome == nil
    end

    test "goal scored for slot 0 when ball crosses right goal mouth" do
      state =
        Foosball.init_sim_state()
        |> Map.put("state", "rally")
        |> put_in(["ball", "x"], 118.0)
        |> put_in(["ball", "y"], 35.0)
        |> put_in(["ball", "vx"], 10.0)
        |> put_in(["ball", "vy"], 0.0)

      {stepped, outcome} = Foosball.step(state, %{}, 1)
      assert stepped["state"] == "goal"
      assert stepped["score"]["0"] == 1
      assert stepped["score"]["1"] == 0
      assert stepped["goalDelay"] == 60
      assert outcome == nil
    end

    test "ball crossing end line outside goal mouth bounces off end rail" do
      # End rail above goal mouth: y = 10.0 (goal is 25.0..45.0)
      state =
        Foosball.init_sim_state()
        |> Map.put("state", "rally")
        |> put_in(["ball", "x"], 2.0)
        |> put_in(["ball", "y"], 10.0)
        |> put_in(["ball", "vx"], -8.0)
        |> put_in(["ball", "vy"], 0.0)

      {stepped, _} = Foosball.step(state, %{}, 1)
      assert stepped["state"] == "rally"
      assert stepped["score"]["1"] == 0
      assert stepped["ball"]["vx"] > 0.0
    end

    test "double-goal rejection: goals are ignored during goal delay" do
      state =
        Foosball.init_sim_state()
        |> Map.put("state", "goal")
        |> Map.put("goalDelay", 30)
        |> Map.put("score", %{"0" => 1, "1" => 0})
        |> put_in(["ball", "x"], 1.0)
        |> put_in(["ball", "y"], 35.0)
        |> put_in(["ball", "vx"], -10.0)

      {stepped, _} = Foosball.step(state, %{}, 1)
      assert stepped["score"]["1"] == 0
      assert stepped["score"]["0"] == 1
      assert stepped["goalDelay"] == 29
    end

    test "first-to-five wins the game and concludes single-game match" do
      state =
        Foosball.init_sim_state(series_length: 1)
        |> Map.put("state", "goal")
        |> Map.put("goalDelay", 1)
        |> Map.put("score", %{"0" => 5, "1" => 3})

      {stepped, outcome} = Foosball.step(state, %{}, 1)
      assert stepped["state"] == "ended"
      assert stepped["winner"] == 0
      assert stepped["seriesScore"]["0"] == 1
      assert match?({:match_ended, 0, _}, outcome)
    end

    test "best-of-three series transitions to game_break when game won but series ongoing" do
      state =
        Foosball.init_sim_state(series_length: 3)
        |> Map.put("state", "goal")
        |> Map.put("goalDelay", 1)
        |> Map.put("score", %{"0" => 5, "1" => 2})
        |> Map.put("seriesScore", %{"0" => 0, "1" => 0})

      {stepped, outcome} = Foosball.step(state, %{}, 1)
      assert stepped["state"] == "game_break"
      assert stepped["currentGame"] == 2
      assert stepped["seriesScore"]["0"] == 1
      assert outcome == nil
    end
  end
end
