defmodule Afterlight.Activities.PoolPhysicsTest do
  use ExUnit.Case, async: true

  alias Afterlight.Activities.Pool.Physics

  describe "initialization and bounds" do
    test "init_rack/1 sets up 16 balls and settled state" do
      table = Physics.init_rack()

      assert table["settled"] == true
      assert table["tick"] == 0
      assert map_size(table["balls"]) == 16

      cue = table["balls"]["0"]
      assert cue["id"] == 0
      assert cue["state"] == "in_play"
      assert cue["x"] == -0.56
      assert cue["z"] == 0.0

      eight = table["balls"]["8"]
      assert eight["id"] == 8
      assert eight["state"] == "in_play"
      assert eight["x"] > 0.56
    end
  end

  describe "cloth friction" do
    test "sliding to rolling transition under cloth friction" do
      table = %{
        "balls" => %{
          "0" => %{
            "id" => 0,
            "x" => -0.8,
            "z" => 0.0,
            "vx" => 0.0,
            "vz" => 0.0,
            "wx" => 0.0,
            "wz" => 0.0,
            "wy" => 0.0,
            "state" => "in_play"
          }
        },
        "settled" => false,
        "events" => [],
        "tick" => 0
      }

      table = Physics.strike_cue_ball(table, 0.0, 1.0, 0.0, 0.0)
      cue = table["balls"]["0"]
      assert cue["vx"] == 1.0
      assert cue["wz"] == 0.0

      # Step 20 ticks (~0.33s)
      final_table =
        Enum.reduce(1..20, table, fn _i, acc ->
          {next_state, _events} = Physics.step(acc, 1.0 / 60.0)
          next_state
        end)

      final_cue = final_table["balls"]["0"]
      assert final_cue["wz"] > 0.0
      roll_diff = abs(final_cue["vx"] - final_cue["wz"] * Physics.ball_radius())
      assert roll_diff < 0.001
    end
  end

  describe "ball-ball collisions" do
    test "head-on elastic collision transfers forward momentum" do
      table = %{
        "balls" => %{
          "0" => %{
            "id" => 0,
            "x" => -0.2,
            "z" => 0.0,
            "vx" => 2.0,
            "vz" => 0.0,
            "wx" => 0.0,
            "wz" => 0.0,
            "wy" => 0.0,
            "state" => "in_play"
          },
          "1" => %{
            "id" => 1,
            "x" => 0.0,
            "z" => 0.0,
            "vx" => 0.0,
            "vz" => 0.0,
            "wx" => 0.0,
            "wz" => 0.0,
            "wy" => 0.0,
            "state" => "in_play"
          }
        },
        "settled" => false,
        "events" => [],
        "tick" => 0
      }

      {final_table, collision_event} =
        Enum.reduce_while(1..20, {table, nil}, fn _i, {acc, _} ->
          {next_state, events} = Physics.step(acc, 1.0 / 60.0)
          hit = Enum.find(events, fn e -> e["type"] == "ball_collision" end)

          if hit do
            {:halt, {next_state, hit}}
          else
            {:cont, {next_state, nil}}
          end
        end)

      assert collision_event != nil
      assert collision_event["ballA"] == 0
      assert collision_event["ballB"] == 1

      b0 = final_table["balls"]["0"]
      b1 = final_table["balls"]["1"]
      assert b1["vx"] > 1.5
      assert b0["vx"] < 0.5
    end
  end

  describe "cushion rail bounces" do
    test "rail bounce reverses normal velocity and applies side-spin deflection" do
      table = %{
        "balls" => %{
          "0" => %{
            "id" => 0,
            "x" => 0.9,
            "z" => 0.0,
            "vx" => 3.0,
            "vz" => 0.0,
            "wx" => 0.0,
            "wz" => 0.0,
            "wy" => 10.0,
            "state" => "in_play"
          }
        },
        "settled" => false,
        "events" => [],
        "tick" => 0
      }

      {final_table, rail_event} =
        Enum.reduce_while(1..20, {table, nil}, fn _i, {acc, _} ->
          {next_state, events} = Physics.step(acc, 1.0 / 60.0)
          rail = Enum.find(events, fn e -> e["type"] == "rail_collision" end)

          if rail do
            {:halt, {next_state, rail}}
          else
            {:cont, {next_state, nil}}
          end
        end)

      assert rail_event != nil
      assert rail_event["rail"] == "foot"

      cue = final_table["balls"]["0"]
      assert cue["vx"] < 0.0
      assert cue["vz"] != 0.0
    end
  end

  describe "pocket capture" do
    test "ball entering pocket transitions to pocketed state" do
      table = %{
        "balls" => %{
          "0" => %{
            "id" => 0,
            "x" => -1.0,
            "z" => -0.50,
            "vx" => -1.5,
            "vz" => -0.75,
            "wx" => 0.0,
            "wz" => 0.0,
            "wy" => 0.0,
            "state" => "in_play"
          }
        },
        "settled" => false,
        "events" => [],
        "tick" => 0
      }

      {final_table, pocket_event} =
        Enum.reduce_while(1..30, {table, nil}, fn _i, {acc, _} ->
          {next_state, events} = Physics.step(acc, 1.0 / 60.0)
          pkt = Enum.find(events, fn e -> e["type"] == "pocketed" end)

          if pkt do
            {:halt, {next_state, pkt}}
          else
            {:cont, {next_state, nil}}
          end
        end)

      assert pocket_event != nil
      assert pocket_event["ballId"] == 0
      assert pocket_event["pocketId"] == "corner_tl"

      cue = final_table["balls"]["0"]
      assert cue["state"] == "pocketed"
      assert cue["vx"] == 0.0
      assert cue["vz"] == 0.0
    end
  end

  describe "anti-tunneling and settling" do
    test "maximum-power break shot (15 m/s) does not tunnel through rack" do
      table = Physics.init_rack(cue_x: -0.56, cue_z: 0.0)
      table = Physics.strike_cue_ball(table, 0.0, 15.0, 0.0, 0.0)

      assert table["balls"]["0"]["vx"] == 15.0

      {_final_table, had_collision} =
        Enum.reduce(1..20, {table, false}, fn _i, {acc, hit_any} ->
          {next_state, events} = Physics.step(acc, 1.0 / 60.0)
          hit = Enum.any?(events, fn e -> e["type"] == "ball_collision" end)

          # Check boundaries
          Enum.each(next_state["balls"], fn {_id, b} ->
            if b["state"] == "in_play" do
              assert b["x"] >= -Physics.table_length() / 2 - 0.05
              assert b["x"] <= Physics.table_length() / 2 + 0.05
              assert b["z"] >= -Physics.table_width() / 2 - 0.05
              assert b["z"] <= Physics.table_width() / 2 + 0.05
            end
          end)

          {next_state, hit_any or hit}
        end)

      assert had_collision == true
    end

    test "settling detection zeroes micro-velocities" do
      table = %{
        "balls" => %{
          "0" => %{
            "id" => 0,
            "x" => 0.0,
            "z" => 0.0,
            "vx" => 0.02,
            "vz" => 0.0,
            "wx" => 0.0,
            "wz" => 0.0,
            "wy" => 0.0,
            "state" => "in_play"
          }
        },
        "settled" => false,
        "events" => [],
        "tick" => 0
      }

      final_table =
        Enum.reduce_while(1..60, table, fn _i, acc ->
          {next_state, _} = Physics.step(acc, 1.0 / 60.0)
          if next_state["settled"] do
            {:halt, next_state}
          else
            {:cont, next_state}
          end
        end)

      assert final_table["settled"] == true
      cue = final_table["balls"]["0"]
      assert cue["vx"] == 0.0
      assert cue["vz"] == 0.0
      assert cue["wx"] == 0.0
      assert cue["wz"] == 0.0
      assert cue["wy"] == 0.0
    end
  end

  # convincing-billiards-audio: additive presentation metadata. These cases
  # mirror tests/pool-physics.test.js op-for-op — the two engines must stamp
  # identical event identity (shot/step/t), positions and pre-impact speeds.
  describe "presentation metadata (convincing-billiards-audio)" do
    defp meta_ball(id, x, z, vx \\ 0.0, vz \\ 0.0) do
      %{"id" => id, "x" => x, "z" => z, "vx" => vx, "vz" => vz, "wx" => 0.0, "wz" => 0.0, "wy" => 0.0, "state" => "in_play"}
    end

    test "strike stamps monotonic shot identity and shot clock" do
      table = %{
        "balls" => %{"0" => meta_ball(0, -0.6, 0.0), "1" => meta_ball(1, 0.6, 0.0)},
        "settled" => true,
        "events" => [],
        "tick" => 0
      }

      shot1 = Physics.strike_cue_ball(table, 0.0, 3.0, 0.0, 0.0)
      assert shot1["shot"] == 1
      assert shot1["shotTime"] == 0.0
      shot2 = Physics.strike_cue_ball(shot1, 0.0, 3.0, 0.0, 0.0)
      assert shot2["shot"] == 2
    end

    test "collision events carry shot/step/t identity and contact midpoint" do
      table =
        %{
          "balls" => %{"0" => meta_ball(0, -0.3, 0.0), "1" => meta_ball(1, 0.0, 0.0)},
          "settled" => true,
          "events" => [],
          "tick" => 4
        }
        |> Physics.strike_cue_ball(0.0, 2.0, 0.0, 0.0)

      {collision, _final} =
        Enum.reduce_while(1..30, {nil, table}, fn _i, {found, acc} ->
          {next, events} = Physics.step(acc, 1.0 / 60.0)
          hit = Enum.find(events, fn e -> e["type"] == "ball_collision" end)
          if hit, do: {:halt, {hit, next}}, else: {:cont, {found, next}}
        end)

      assert collision != nil
      assert collision["shot"] == 1
      assert collision["step"] != nil and collision["step"] > 4
      assert is_number(collision["t"]) and collision["t"] >= 0
      assert abs(collision["x"]) < 0.2 and abs(collision["z"]) < 0.2
      assert collision["speed"] > 0
    end

    test "rail events carry pre-impact normal speed and clamped contact position" do
      table = %{
        "balls" => %{"0" => meta_ball(0, 1.08, 0.0, 1.5, 0.0)},
        "settled" => false,
        "events" => [],
        "tick" => 0,
        "shot" => 7,
        "shotTime" => 0.25
      }

      {rail, final} =
        Enum.reduce_while(1..10, {nil, table}, fn _i, {found, acc} ->
          {next, events} = Physics.step(acc, 1.0 / 60.0)
          hit = Enum.find(events, fn e -> e["type"] == "rail_collision" end)
          if hit, do: {:halt, {hit, next}}, else: {:cont, {found, next}}
        end)

      assert rail != nil
      assert rail["rail"] == "foot"
      assert_in_delta rail["speed"], 1.5, 0.05
      assert_in_delta rail["x"], 1.12 - 0.0285, 1.0e-9
      assert rail["shot"] == 7
      assert rail["step"] == final["tick"] || rail["step"] == final["tick"] - 1
    end

    test "pocket events carry pocket center position and capture speed" do
      table = %{
        "balls" => %{"0" => meta_ball(0, 1.05, 0.5, 1.2, 0.4)},
        "settled" => false,
        "events" => [],
        "tick" => 0
      }

      {pocket, _final} =
        Enum.reduce_while(1..30, {nil, table}, fn _i, {found, acc} ->
          {next, events} = Physics.step(acc, 1.0 / 60.0)
          hit = Enum.find(events, fn e -> e["type"] == "pocketed" end)
          if hit, do: {:halt, {hit, next}}, else: {:cont, {found, next}}
        end)

      assert pocket != nil
      assert pocket["pocketId"] == "corner_br"
      assert pocket["x"] == 1.12
      assert pocket["z"] == 0.56
      assert is_number(pocket["speed"]) and pocket["speed"] >= 0
      assert is_number(pocket["t"])
    end
  end
end
