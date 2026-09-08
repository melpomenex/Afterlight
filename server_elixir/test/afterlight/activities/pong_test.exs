defmodule Afterlight.Activities.PongTest do
  use ExUnit.Case, async: true

  alias Afterlight.Activities.Pong

  describe "init_sim_state/1" do
    test "initializes default 800x500 Pong state" do
      state = Pong.init_sim_state()

      assert state["width"] == 800
      assert state["height"] == 500
      assert state["targetScore"] == 7
      assert state["state"] == "serving"
      assert state["serveDelay"] == 45
      assert state["score"] == %{"0" => 0, "1" => 0}

      ball = state["ball"]
      assert ball["x"] == 400.0
      assert ball["y"] == 250.0
      assert ball["radius"] == 8

      p0 = state["paddles"]["0"]
      p1 = state["paddles"]["1"]
      assert p0["x"] == 40.0
      assert p0["y"] == 250.0
      assert p1["x"] == 760.0
      assert p1["y"] == 250.0
    end
  end

  describe "paddle movement and clamping" do
    test "paddles move with digital up and down inputs" do
      state = Pong.init_sim_state()
      p0_initial_y = state["paddles"]["0"]["y"]

      # Player 0 presses up
      players = %{0 => %{input_state: %{"up" => true}}}
      {state1, nil} = Pong.step(state, players, 1)
      assert state1["paddles"]["0"]["y"] == p0_initial_y - 7.0

      # Player 0 presses down
      players = %{0 => %{input_state: %{"down" => true}}}
      {state2, nil} = Pong.step(state1, players, 1)
      assert state2["paddles"]["0"]["y"] == p0_initial_y
    end

    test "paddles move with continuous target y capped by speed" do
      state = Pong.init_sim_state()
      # Target is far below
      players = %{1 => %{input_state: %{"y" => 400.0}}}
      {state1, nil} = Pong.step(state, players, 1)
      assert state1["paddles"]["1"]["y"] == 250.0 + 7.0

      # Target is close
      players = %{1 => %{input_state: %{"y" => 259.0}}}
      {state2, nil} = Pong.step(state1, players, 1)
      assert state2["paddles"]["1"]["y"] == 259.0
    end

    test "paddles are clamped within table bounds" do
      state = Pong.init_sim_state()

      # Move up beyond top (half height = 35.0)
      players = %{0 => %{input_state: %{"up" => true}}}
      {top_state, nil} = Pong.step(state, players, 100)
      assert top_state["paddles"]["0"]["y"] == 35.0

      # Move down beyond bottom (500 - 35.0 = 465.0)
      players = %{0 => %{input_state: %{"down" => true}}}
      {bot_state, nil} = Pong.step(state, players, 100)
      assert bot_state["paddles"]["0"]["y"] == 465.0
    end
  end

  describe "serve delay and transitions" do
    test "decrements serve delay until rally starts" do
      state = Pong.init_sim_state()
      assert state["state"] == "serving"
      assert state["serveDelay"] == 45

      # Step 44 ticks
      {state44, nil} = Pong.step(state, %{}, 44)
      assert state44["state"] == "serving"
      assert state44["serveDelay"] == 1
      assert state44["ball"]["x"] == 400.0

      # Step 1 tick -> starts rally
      {rally_state, nil} = Pong.step(state44, %{}, 1)
      assert rally_state["state"] == "rally"
      assert rally_state["serveDelay"] == 0
    end
  end

  describe "rail collisions" do
    test "ball bounces off top and bottom rails" do
      # Set ball near top moving upward
      state =
        Pong.init_sim_state()
        |> Map.put("serveDelay", 0)
        |> Map.put("state", "rally")
        |> put_in(["ball", "y"], 10.0)
        |> put_in(["ball", "vy"], -4.0)

      {bounced, nil} = Pong.step(state, %{}, 1)
      assert bounced["ball"]["vy"] > 0
      assert bounced["ball"]["y"] >= 8.0

      # Set ball near bottom moving downward
      state_bot =
        bounced
        |> put_in(["ball", "y"], 490.0)
        |> put_in(["ball", "vy"], 4.0)

      {bounced_bot, nil} = Pong.step(state_bot, %{}, 1)
      assert bounced_bot["ball"]["vy"] < 0
      assert bounced_bot["ball"]["y"] <= 492.0
    end
  end

  describe "paddle collisions" do
    test "ball bounces off left paddle with angle deflection" do
      # Place ball just right of left paddle moving left
      state =
        Pong.init_sim_state()
        |> Map.put("serveDelay", 0)
        |> Map.put("state", "rally")
        |> put_in(["ball", "x"], 56.0)
        |> put_in(["ball", "y"], 270.0)
        |> put_in(["ball", "vx"], -5.0)
        |> put_in(["ball", "vy"], 0.0)

      {bounced, nil} = Pong.step(state, %{}, 1)
      assert bounced["ball"]["vx"] > 0
      # Hit lower half of paddle -> deflected downward (positive vy)
      assert bounced["ball"]["vy"] > 0
      assert bounced["ball"]["x"] > 40.0
    end

    test "ball bounces off right paddle with angle deflection" do
      state =
        Pong.init_sim_state()
        |> Map.put("serveDelay", 0)
        |> Map.put("state", "rally")
        |> put_in(["ball", "x"], 744.0)
        |> put_in(["ball", "y"], 230.0)
        |> put_in(["ball", "vx"], 5.0)
        |> put_in(["ball", "vy"], 0.0)

      {bounced, nil} = Pong.step(state, %{}, 1)
      assert bounced["ball"]["vx"] < 0
      # Hit upper half of paddle -> deflected upward (negative vy)
      assert bounced["ball"]["vy"] < 0
      assert bounced["ball"]["x"] < 760.0
    end
  end

  describe "scoring and match end" do
    test "scoring resets ball to center and increments score" do
      # Ball moving past left paddle (missed)
      state =
        Pong.init_sim_state()
        |> Map.put("serveDelay", 0)
        |> Map.put("state", "rally")
        |> put_in(["ball", "x"], 2.0)
        |> put_in(["ball", "vx"], -5.0)

      {scored, nil} = Pong.step(state, %{}, 1)
      # Slot 1 scored
      assert scored["score"]["1"] == 1
      assert scored["score"]["0"] == 0
      assert scored["state"] == "serving"
      assert scored["serveDelay"] == 45
      assert scored["ball"]["x"] == 400.0
      assert scored["ball"]["y"] == 250.0
    end

    test "first to seven ends the match and returns outcome" do
      state =
        Pong.init_sim_state()
        |> Map.put("serveDelay", 0)
        |> Map.put("state", "rally")
        |> Map.put("score", %{"0" => 6, "1" => 4})
        |> put_in(["ball", "x"], 798.0)
        |> put_in(["ball", "vx"], 5.0)

      # Ball passes right edge -> slot 0 scores 7th point!
      {final_state, outcome} = Pong.step(state, %{}, 1)

      assert final_state["score"]["0"] == 7
      assert final_state["score"]["1"] == 4
      assert final_state["state"] == "ended"
      assert final_state["winner"] == 0

      assert {:match_ended, 0, details} = outcome
      assert details.winner_slot == 0
      assert details.score == %{"0" => 7, "1" => 4}
    end
  end
end
