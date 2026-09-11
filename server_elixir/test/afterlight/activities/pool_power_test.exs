defmodule Afterlight.Activities.PoolPowerTest do
  use ExUnit.Case, async: true

  alias Afterlight.Activities.Pool.{Physics, Rules}

  describe "power curve calibration and JS parity" do
    test "constants match JS specification" do
      assert Rules.min_cue_speed() == 0.65
      assert Rules.max_cue_speed() == 10.5
      assert Rules.power_exponent() == 1.35
    end

    test "evaluates expected checkpoints with exact parity" do
      # 0.0 -> 0.65
      assert_in_delta Rules.normalized_power_to_cue_speed(0.0), 0.65, 1.0e-5

      # 0.10 -> ~1.08998
      assert_in_delta Rules.normalized_power_to_cue_speed(0.10), 1.08998, 1.0e-3

      # 0.25 -> ~2.1658
      assert_in_delta Rules.normalized_power_to_cue_speed(0.25), 2.1658, 1.0e-3

      # 0.35 -> ~3.0374
      assert_in_delta Rules.normalized_power_to_cue_speed(0.35), 3.0374, 1.0e-3

      # 0.50 -> ~4.5140
      assert_in_delta Rules.normalized_power_to_cue_speed(0.50), 4.5140, 1.0e-3

      # 0.75 -> ~7.3298
      assert_in_delta Rules.normalized_power_to_cue_speed(0.75), 7.3298, 1.0e-3

      # 1.00 -> 10.5
      assert_in_delta Rules.normalized_power_to_cue_speed(1.00), 10.5, 1.0e-5
    end

    test "strictly monotonic across [0.0, 1.0]" do
      steps = [0.0, 0.05, 0.1, 0.25, 0.35, 0.5, 0.75, 0.9, 1.0]

      Enum.zip(steps, tl(steps))
      |> Enum.each(fn {p1, p2} ->
        s1 = Rules.normalized_power_to_cue_speed(p1)
        s2 = Rules.normalized_power_to_cue_speed(p2)
        assert s1 < s2, "speed(#{p1}) = #{s1} must be less than speed(#{p2}) = #{s2}"
      end)
    end

    test "clamps out-of-bound and invalid inputs" do
      assert Rules.normalized_power_to_cue_speed(-0.5) == 0.65
      assert Rules.normalized_power_to_cue_speed(-9999.0) == 0.65
      assert Rules.normalized_power_to_cue_speed(1.5) == 10.5
      assert Rules.normalized_power_to_cue_speed(9999.0) == 10.5
      assert Rules.normalized_power_to_cue_speed(nil) == 0.65
      assert Rules.normalized_power_to_cue_speed("invalid") == 0.65
    end
  end

  describe "authoritative break shot" do
    test "full-power break launches cue ball at configured maximum speed" do
      game = Rules.init_game()
      {:ok, shooting_game} = Rules.shoot(game, 0, 0.0, 1.0)
      cue_ball = shooting_game["physics"]["balls"]["0"]

      assert_in_delta cue_ball["vx"], 10.5, 1.0e-3
      assert_in_delta cue_ball["vz"], 0.0, 1.0e-3
    end

    test "full-power break forcefully disperses the rack" do
      initial_rack = Physics.init_rack()
      # Strike rack at maximum break speed 10.5 m/s
      struck_rack = Physics.strike_cue_ball(initial_rack, 0.0, 10.5, 0.0, 0.0)

      # Step physics forward until settled or capped
      {final_rack, _events} =
        Enum.reduce_while(1..500, {struck_rack, []}, fn _step, {acc_state, acc_events} ->
          if acc_state["settled"] do
            {:halt, {acc_state, acc_events}}
          else
            {next_state, step_events} = Physics.step(acc_state, 1.0 / 60.0)
            {:cont, {next_state, acc_events ++ step_events}}
          end
        end)

      # Count object balls displaced by > 5 cm
      displaced_count =
        Enum.count(1..15, fn id ->
          b_init = initial_rack["balls"][to_string(id)]
          b_final = final_rack["balls"][to_string(id)]
          dx = b_final["x"] - b_init["x"]
          dz = b_final["z"] - b_init["z"]
          :math.sqrt(dx * dx + dz * dz) > 0.05
        end)

      # At full 10.5 m/s, all 15 balls in the rack must separate!
      assert displaced_count == 15
    end
  end
end
