defmodule Afterlight.Activities.PoolRulesTest do
  use ExUnit.Case, async: true

  alias Afterlight.Activities.Pool.Rules

  describe "initial state" do
    test "adheres to frozen rulesVersion and initial house rules" do
      game = Rules.init_game()

      assert game["rules_version"] == 1
      assert game["status"] == "aiming"
      assert game["turn"] == 0
      assert game["table_open"] == true
      assert game["groups"]["0"] == nil
      assert game["groups"]["1"] == nil
      assert game["ball_in_hand"] == false
      assert game["winner"] == nil
      assert game["win_reason"] == nil
      assert game["shot_count"] == 0
    end
  end

  describe "break shot" do
    test "scratch on break awards opponent ball-in-hand" do
      game = Rules.init_game()
      angle = :math.atan2(-0.56, -0.56)

      {:ok, shooting_game} = Rules.shoot(game, 0, angle, 4.0)

      final_game =
        Enum.reduce_while(1..60, shooting_game, fn _i, acc ->
          {next_state, _events} = Rules.step(acc, 1.0 / 60.0)
          if next_state["status"] != "shooting" do
            {:halt, next_state}
          else
            {:cont, next_state}
          end
        end)

      assert final_game["status"] == "awaiting_ball_in_hand"
      assert final_game["turn"] == 1
      assert final_game["ball_in_hand"] == true
      assert final_game["foul"] == "scratch"
      assert final_game["shot_count"] == 1
      assert final_game["table_open"] == true
    end
  end

  describe "ball-in-hand placement" do
    test "validates boundaries, pocket openings, and ball overlap" do
      game =
        Rules.init_game()
        |> Map.put("status", "awaiting_ball_in_hand")
        |> Map.put("turn", 1)
        |> Map.put("ball_in_hand", true)

      # 1. Out of bounds
      assert {:error, :invalid_position} = Rules.place_cue_ball(game, 1, 2.5, 0.0)

      # 2. Overlapping ball 1 at apex (x = 0.56, z = 0.0)
      assert {:error, :invalid_position} = Rules.place_cue_ball(game, 1, 0.56, 0.0)

      # 3. Valid placement
      {:ok, updated} = Rules.place_cue_ball(game, 1, -0.4, 0.2)
      assert updated["ball_in_hand"] == false
      assert updated["status"] == "aiming"
      assert updated["physics"]["balls"]["0"]["x"] == -0.4
      assert updated["physics"]["balls"]["0"]["z"] == 0.2
      assert updated["physics"]["balls"]["0"]["state"] == "in_play"
    end
  end

  describe "group assignment" do
    test "assigns groups and closes table on first legally pocketed ball post-break" do
      game =
        Rules.init_game()
        |> Map.put("shot_count", 1)
        |> Map.put("table_open", true)
        |> Map.put("turn", 0)
        |> put_in(["physics", "balls"], %{
          "0" => %{
            "id" => 0,
            "x" => 0.8,
            "z" => 0.4,
            "vx" => 0.0,
            "vz" => 0.0,
            "wx" => 0.0,
            "wz" => 0.0,
            "wy" => 0.0,
            "state" => "in_play"
          },
          "3" => %{
            "id" => 3,
            "x" => 1.0,
            "z" => 0.5,
            "vx" => 0.0,
            "vz" => 0.0,
            "wx" => 0.0,
            "wz" => 0.0,
            "wy" => 0.0,
            "state" => "in_play"
          }
        })
        |> put_in(["physics", "settled"], true)

      angle = :math.atan2(0.56 - 0.4, 1.12 - 0.8)
      {:ok, shooting} = Rules.shoot(game, 0, angle, 3.0)

      final_game =
        Enum.reduce_while(1..80, shooting, fn _i, acc ->
          {next_state, _events} = Rules.step(acc, 1.0 / 60.0)
          if next_state["status"] != "shooting" do
            {:halt, next_state}
          else
            {:cont, next_state}
          end
        end)

      assert final_game["status"] == "aiming"
      assert final_game["table_open"] == false
      assert final_game["groups"]["0"] == "solids"
      assert final_game["groups"]["1"] == "stripes"
      assert final_game["turn"] == 0
    end
  end

  describe "8-ball rules and end-conditions" do
    test "early eight-ball causes immediate loss" do
      game =
        Rules.init_game()
        |> Map.put("shot_count", 1)
        |> Map.put("table_open", false)
        |> Map.put("groups", %{"0" => "solids", "1" => "stripes"})
        |> Map.put("turn", 0)
        |> put_in(["physics", "balls"], %{
          "0" => %{"id" => 0, "x" => 0.8, "z" => 0.4, "vx" => 0.0, "vz" => 0.0, "wx" => 0.0, "wz" => 0.0, "wy" => 0.0, "state" => "in_play"},
          "1" => %{"id" => 1, "x" => -0.5, "z" => 0.0, "vx" => 0.0, "vz" => 0.0, "wx" => 0.0, "wz" => 0.0, "wy" => 0.0, "state" => "in_play"},
          "8" => %{"id" => 8, "x" => 1.0, "z" => 0.5, "vx" => 0.0, "vz" => 0.0, "wx" => 0.0, "wz" => 0.0, "wy" => 0.0, "state" => "in_play"}
        })
        |> put_in(["physics", "settled"], true)

      angle = :math.atan2(0.56 - 0.4, 1.12 - 0.8)
      {:ok, shooting} = Rules.shoot(game, 0, angle, 3.0)

      final_game =
        Enum.reduce_while(1..80, shooting, fn _i, acc ->
          {next_state, _events} = Rules.step(acc, 1.0 / 60.0)
          if next_state["status"] != "shooting" do
            {:halt, next_state}
          else
            {:cont, next_state}
          end
        end)

      assert final_game["status"] == "game_over"
      assert final_game["winner"] == 1
      assert final_game["win_reason"] == "early_eight"
    end

    test "legal called eight-ball wins match" do
      game =
        Rules.init_game()
        |> Map.put("shot_count", 5)
        |> Map.put("table_open", false)
        |> Map.put("groups", %{"0" => "solids", "1" => "stripes"})
        |> Map.put("turn", 0)
        |> put_in(["physics", "balls"], %{
          "0" => %{"id" => 0, "x" => 0.8, "z" => 0.4, "vx" => 0.0, "vz" => 0.0, "wx" => 0.0, "wz" => 0.0, "wy" => 0.0, "state" => "in_play"},
          "8" => %{"id" => 8, "x" => 1.0, "z" => 0.5, "vx" => 0.0, "vz" => 0.0, "wx" => 0.0, "wz" => 0.0, "wy" => 0.0, "state" => "in_play"}
        })
        |> put_in(["physics", "settled"], true)

      {:ok, called_game} = Rules.call_pocket(game, 0, "corner_br")
      angle = :math.atan2(0.56 - 0.4, 1.12 - 0.8)
      {:ok, shooting} = Rules.shoot(called_game, 0, angle, 3.0)

      final_game =
        Enum.reduce_while(1..80, shooting, fn _i, acc ->
          {next_state, _events} = Rules.step(acc, 1.0 / 60.0)
          if next_state["status"] != "shooting" do
            {:halt, next_state}
          else
            {:cont, next_state}
          end
        end)

      assert final_game["status"] == "game_over"
      assert final_game["winner"] == 0
      assert final_game["win_reason"] == "eight_ball"
    end

    test "wrong-pocket eight-ball loses match" do
      game =
        Rules.init_game()
        |> Map.put("shot_count", 5)
        |> Map.put("table_open", false)
        |> Map.put("groups", %{"0" => "solids", "1" => "stripes"})
        |> Map.put("turn", 0)
        |> put_in(["physics", "balls"], %{
          "0" => %{"id" => 0, "x" => 0.8, "z" => 0.4, "vx" => 0.0, "vz" => 0.0, "wx" => 0.0, "wz" => 0.0, "wy" => 0.0, "state" => "in_play"},
          "8" => %{"id" => 8, "x" => 1.0, "z" => 0.5, "vx" => 0.0, "vz" => 0.0, "wx" => 0.0, "wz" => 0.0, "wy" => 0.0, "state" => "in_play"}
        })
        |> put_in(["physics", "settled"], true)

      # Call wrong pocket corner_tl while it goes into corner_br
      {:ok, called_game} = Rules.call_pocket(game, 0, "corner_tl")
      angle = :math.atan2(0.56 - 0.4, 1.12 - 0.8)
      {:ok, shooting} = Rules.shoot(called_game, 0, angle, 3.0)

      final_game =
        Enum.reduce_while(1..80, shooting, fn _i, acc ->
          {next_state, _events} = Rules.step(acc, 1.0 / 60.0)
          if next_state["status"] != "shooting" do
            {:halt, next_state}
          else
            {:cont, next_state}
          end
        end)

      assert final_game["status"] == "game_over"
      assert final_game["winner"] == 1
      assert final_game["win_reason"] == "wrong_pocket_eight"
    end

    test "resignation immediately awards victory to opponent" do
      game = Rules.init_game()
      resigned = Rules.resign(game, 0)

      assert resigned["status"] == "game_over"
      assert resigned["winner"] == 1
      assert resigned["win_reason"] == "resignation"
    end
  end
end
