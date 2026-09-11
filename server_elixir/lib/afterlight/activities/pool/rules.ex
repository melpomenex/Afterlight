defmodule Afterlight.Activities.Pool.Rules do
  @moduledoc """
  Authoritative casual 8-ball rules reducer (Tasks 4.3, 4.4; Specs social-billiards).

  Rules implemented:
  - Two-player turn-based match with published house rules.
  - Frozen rulesVersion = 1.
  - Legal break requires a pocket or 4 object balls touching rails.
  - 8-ball on break is spotted (including on scratch); scratch gives opponent ball in hand.
  - Table remains open after break until first legally pocketed ball post-break.
  - While table is open, either group can be hit first (cannot hit 8 first).
  - Groups assign to solids (1..7) or stripes (9..15) from first legally pocketed post-break ball.
  - Legal shots after assignment: must hit own group first (or 8 if own group cleared),
    then at least one ball must hit a rail or be pocketed.
  - Called pocket required for 8-ball once own group is cleared.
  - Early 8-ball, wrong-pocket 8-ball, or scratch on 8-ball is an immediate loss.
  - Legal own-group pockets retain turn; legal shots with no pocket or opponent pocket switch turn.
  - Fouls (scratch, no hit, wrong ball first, no rail contact) grant opponent ball in hand.
  - Resignation immediately awards win to opponent.
  """

  alias Afterlight.Activities.Pool.Physics

  @rules_version 1
  def rules_version, do: @rules_version

  @min_cue_speed 0.65
  @max_cue_speed 32.0
  @power_exponent 1.35

  def min_cue_speed, do: @min_cue_speed
  def max_cue_speed, do: @max_cue_speed
  def power_exponent, do: @power_exponent

  @doc """
  Converts a normalized cue shot strength [0.0, 1.0] to physical launch speed in m/s.
  Matches shared/pool/physics.js normalizedPowerToCueSpeed op-for-op.
  """
  def normalized_power_to_cue_speed(power) do
    p =
      case power do
        v when is_number(v) -> max(0.0, min(1.0, v * 1.0))
        _ -> 0.0
      end

    @min_cue_speed + (@max_cue_speed - @min_cue_speed) * :math.pow(p, @power_exponent)
  end

  @doc """
  Initializes a fresh 8-ball game state.
  """
  def init_game(opts \\ []) do
    physics_state = Physics.init_rack(opts)

    %{
      "rules_version" => @rules_version,
      "status" => "aiming", # "aiming" | "shooting" | "awaiting_ball_in_hand" | "game_over"
      "turn" => 0,          # 0 or 1
      "table_open" => true,
      "groups" => %{"0" => nil, "1" => nil}, # "solids" | "stripes"
      "called_pocket" => nil,
      "ball_in_hand" => false,
      "winner" => nil,
      "win_reason" => nil,  # "eight_ball" | "early_eight" | "wrong_pocket_eight" | "scratch_on_eight" | "resignation"
      "foul" => nil,        # nil | "scratch" | "miss" | "wrong_ball" | "no_rail" | "illegal_break"
      "shot_count" => 0,
      "physics" => physics_state,
      "current_shot" => nil
    }
  end

  @doc """
  Resigns a player, granting immediate victory to opponent.
  """
  def resign(state, player) when player in [0, 1] do
    if state["status"] == "game_over" do
      state
    else
      opponent = 1 - player
      %{
        state
        | "status" => "game_over",
          "winner" => opponent,
          "win_reason" => "resignation"
      }
    end
  end

  @doc """
  Declares called pocket for the 8-ball.
  """
  def call_pocket(state, player, pocket_id) do
    valid_pocket? = Enum.any?(Physics.pockets(), fn p -> p["id"] == pocket_id end)

    if state["status"] in ["aiming", "awaiting_ball_in_hand"] and state["turn"] == player and valid_pocket? do
      {:ok, %{state | "called_pocket" => pocket_id}}
    else
      {:error, :invalid_call}
    end
  end

  @doc """
  Places the cue ball when player has ball-in-hand.
  """
  def place_cue_ball(state, player, x, z) do
    cond do
      state["status"] not in ["aiming", "awaiting_ball_in_hand"] ->
        {:error, :invalid_state}

      state["turn"] != player ->
        {:error, :not_your_turn}

      not state["ball_in_hand"] ->
        {:error, :no_ball_in_hand}

      true ->
        r = Physics.ball_radius()
        half_l = Physics.table_length() / 2.0
        half_w = Physics.table_width() / 2.0

        in_bounds? =
          x >= -half_l + r + 0.01 and x <= half_l - r - 0.01 and
          z >= -half_w + r + 0.01 and z <= half_w - r - 0.01

        in_pocket? =
          Enum.any?(Physics.pockets(), fn p ->
            dx = x - p["x"]
            dz = z - p["z"]
            :math.sqrt(dx * dx + dz * dz) <= p["radius"] + 0.02
          end)

        balls = state["physics"]["balls"]
        d_min = Physics.ball_radius() * 2.0

        overlapping? =
          Enum.any?(balls, fn {id, b} ->
            if id != "0" and b["state"] == "in_play" do
              dx = x - b["x"]
              dz = z - b["z"]
              :math.sqrt(dx * dx + dz * dz) < d_min
            else
              false
            end
          end)

        if in_bounds? and not in_pocket? and not overlapping? do
          updated_cue = %{
            "id" => 0,
            "x" => x * 1.0,
            "z" => z * 1.0,
            "vx" => 0.0,
            "vz" => 0.0,
            "wx" => 0.0,
            "wz" => 0.0,
            "wy" => 0.0,
            "state" => "in_play"
          }

          updated_physics = %{
            state["physics"]
            | "balls" => Map.put(balls, "0", updated_cue),
              "settled" => true
          }

          updated_state = %{
            state
            | "physics" => updated_physics,
              "ball_in_hand" => false,
              "status" => "aiming"
          }

          {:ok, updated_state}
        else
          {:error, :invalid_position}
        end
    end
  end

  @doc """
  Executes a shot if legal for the current player and settled state.
  """
  def shoot(state, player, angle, power, spin_x \\ 0.0, spin_y \\ 0.0, called_pocket \\ nil) do
    effective_pocket = called_pocket || state["called_pocket"]

    cond do
      state["status"] != "aiming" ->
        {:error, :not_aiming}

      state["turn"] != player ->
        {:error, :not_your_turn}

      state["ball_in_hand"] ->
        {:error, :must_place_cue_ball}

      not state["physics"]["settled"] ->
        {:error, :balls_in_motion}

      needs_called_pocket?(state, player) and is_nil(effective_pocket) ->
        {:error, :pocket_call_required}

      true ->
        speed = normalized_power_to_cue_speed(power)
        phys = Physics.strike_cue_ball(state["physics"], angle, speed, spin_x, spin_y)

        shot_tracker = %{
          "shooter" => player,
          "called_pocket" => effective_pocket,
          "first_hit" => nil,
          "rails_post_contact" => 0,
          "pocketed_balls" => [],
          "cue_scratched" => false,
          "eight_pocketed" => false,
          "object_balls_hit_rails" => []
        }

        updated_state = %{
          state
          | "physics" => phys,
            "status" => "shooting",
            "foul" => nil,
            "called_pocket" => effective_pocket,
            "current_shot" => shot_tracker
        }

        {:ok, updated_state}
    end
  end

  @doc """
  Steps game physics and resolves shot rules once settled.
  """
  def step(state, delta_sec \\ 0.016667) do
    if state["status"] != "shooting" do
      {state, []}
    else
      {next_phys, events} = Physics.step(state["physics"], delta_sec)
      tracker = update_shot_tracker(state["current_shot"], events)

      if next_phys["settled"] do
        resolved = resolve_shot(%{state | "physics" => next_phys, "current_shot" => tracker})
        {resolved, events}
      else
        updated = %{state | "physics" => next_phys, "current_shot" => tracker}
        {updated, events}
      end
    end
  end

  # Helper: track events occurring during the shot
  defp update_shot_tracker(tracker, events) do
    Enum.reduce(events, tracker, fn evt, acc ->
      case evt["type"] do
        "ball_collision" ->
          # Check if cue ball was involved
          is_cue_hit = evt["ballA"] == 0 or evt["ballB"] == 0
          object_id = if evt["ballA"] == 0, do: evt["ballB"], else: evt["ballA"]

          new_first =
            if is_cue_hit and is_nil(acc["first_hit"]) do
              object_id
            else
              acc["first_hit"]
            end

          %{acc | "first_hit" => new_first}

        "rail_collision" ->
          bid = evt["ballId"]
          prev_rails = acc["object_balls_hit_rails"]
          # Plain list (wire-safe JSON): distinct object balls, MapSet semantics
          new_rails_list = if bid != 0 and bid not in prev_rails, do: [bid | prev_rails], else: prev_rails

          # If cue has already touched an object ball, count rail contact
          new_rails =
            if acc["first_hit"] != nil do
              acc["rails_post_contact"] + 1
            else
              acc["rails_post_contact"]
            end

          %{acc | "object_balls_hit_rails" => new_rails_list, "rails_post_contact" => new_rails}

        "pocketed" ->
          bid = evt["ballId"]
          pkt = evt["pocketId"]
          entry = %{"ballId" => bid, "pocketId" => pkt}
          new_pockets = acc["pocketed_balls"] ++ [entry]

          cue_scratched = acc["cue_scratched"] or (bid == 0)
          eight_pocketed = acc["eight_pocketed"] or (bid == 8)

          %{
            acc
            | "pocketed_balls" => new_pockets,
              "cue_scratched" => cue_scratched,
              "eight_pocketed" => eight_pocketed
          }

        _other ->
          acc
      end
    end)
  end

  # Evaluates shot outcome when all balls have settled
  defp resolve_shot(state) do
    tracker = state["current_shot"]
    shooter = tracker["shooter"]
    opponent = 1 - shooter
    is_break = state["shot_count"] == 0

    if is_break do
      resolve_break_shot(state, tracker, shooter, opponent)
    else
      resolve_regular_shot(state, tracker, shooter, opponent)
    end
  end

  # Break shot rules
  defp resolve_break_shot(state, tracker, shooter, opponent) do
    cue_scratched = tracker["cue_scratched"]
    eight_pocketed = tracker["eight_pocketed"]
    object_pockets = Enum.filter(tracker["pocketed_balls"], fn p -> p["ballId"] not in [0, 8] end)
    object_rails_count = tracker["object_balls_hit_rails"] |> Enum.uniq() |> length()

    # 8-ball on break is spotted
    state_after_spot =
      if eight_pocketed do
        spot_ball(state, 8)
      else
        state
      end

    legal_break? = (length(object_pockets) > 0 or object_rails_count >= 4) and not cue_scratched

    cond do
      cue_scratched ->
        # Scratch on break -> opponent ball-in-hand, switch turn
        %{
          state_after_spot
          | "status" => "awaiting_ball_in_hand",
            "turn" => opponent,
            "ball_in_hand" => true,
            "foul" => "scratch",
            "shot_count" => 1,
            "called_pocket" => nil,
            "current_shot" => nil
        }

      not legal_break? ->
        # Illegal break -> opponent gets ball-in-hand
        %{
          state_after_spot
          | "status" => "awaiting_ball_in_hand",
            "turn" => opponent,
            "ball_in_hand" => true,
            "foul" => "illegal_break",
            "shot_count" => 1,
            "called_pocket" => nil,
            "current_shot" => nil
        }

      true ->
        # Legal break: table remains open!
        # If shooter pocketed an object ball, shooter retains turn; else opponent plays
        retains_turn? = length(object_pockets) > 0
        next_turn = if retains_turn?, do: shooter, else: opponent

        %{
          state_after_spot
          | "status" => "aiming",
            "turn" => next_turn,
            "ball_in_hand" => false,
            "table_open" => true,
            "shot_count" => 1,
            "called_pocket" => nil,
            "current_shot" => nil
        }
    end
  end

  # Regular post-break shot rules
  defp resolve_regular_shot(state, tracker, shooter, opponent) do
    cue_scratched = tracker["cue_scratched"]
    eight_pocketed = tracker["eight_pocketed"]
    first_hit = tracker["first_hit"]
    rails_post_contact = tracker["rails_post_contact"]
    pocketed_balls = tracker["pocketed_balls"]
    object_pockets = Enum.filter(pocketed_balls, fn p -> p["ballId"] != 0 end)

    shooter_group = state["groups"][to_string(shooter)]
    cleared_group? = if shooter_group, do: is_group_cleared?(state["physics"]["balls"], shooter_group), else: false

    # 1. Determine if shot was a foul
    foul_reason =
      cond do
        cue_scratched ->
          "scratch"

        is_nil(first_hit) ->
          "miss"

        state["table_open"] and first_hit == 8 ->
          "wrong_ball"

        not state["table_open"] and not cleared_group? and ball_group(first_hit) != shooter_group ->
          "wrong_ball"

        not state["table_open"] and cleared_group? and first_hit != 8 ->
          "wrong_ball"

        rails_post_contact == 0 and length(object_pockets) == 0 ->
          "no_rail"

        true ->
          nil
      end

    # 2. Check 8-ball resolutions (win / loss conditions)
    cond do
      eight_pocketed and (cue_scratched or foul_reason == "scratch") ->
        # Scratch on eight -> immediate loss
        %{
          state
          | "status" => "game_over",
            "winner" => opponent,
            "win_reason" => "scratch_on_eight",
            "foul" => "scratch",
            "current_shot" => nil
        }

      eight_pocketed and not cleared_group? ->
        # Early eight -> immediate loss
        %{
          state
          | "status" => "game_over",
            "winner" => opponent,
            "win_reason" => "early_eight",
            "current_shot" => nil
        }

      eight_pocketed and foul_reason != nil ->
        # Foul on eight -> immediate loss
        %{
          state
          | "status" => "game_over",
            "winner" => opponent,
            "win_reason" => "early_eight",
            "foul" => foul_reason,
            "current_shot" => nil
        }

      eight_pocketed and cleared_group? ->
        eight_entry = Enum.find(pocketed_balls, fn p -> p["ballId"] == 8 end)
        called = tracker["called_pocket"]

        if eight_entry["pocketId"] == called do
          # Legal win!
          %{
            state
            | "status" => "game_over",
              "winner" => shooter,
              "win_reason" => "eight_ball",
              "current_shot" => nil
          }
        else
          # Wrong pocket eight -> immediate loss
          %{
            state
            | "status" => "game_over",
              "winner" => opponent,
              "win_reason" => "wrong_pocket_eight",
              "current_shot" => nil
          }
        end

      foul_reason != nil ->
        # Regular foul -> turn switches, opponent gets ball in hand
        %{
          state
          | "status" => "awaiting_ball_in_hand",
            "turn" => opponent,
            "ball_in_hand" => true,
            "foul" => foul_reason,
            "called_pocket" => nil,
            "shot_count" => state["shot_count"] + 1,
            "current_shot" => nil
        }

      true ->
        # Legal shot without foul
        # Check group assignment if table is open
        {table_open, updated_groups} =
          if state["table_open"] and length(object_pockets) > 0 do
            # Assign groups from first legally pocketed ball
            first_pocketed = hd(object_pockets)
            first_bid = first_pocketed["ballId"]

            if first_bid in 1..7 do
              {false, %{to_string(shooter) => "solids", to_string(opponent) => "stripes"}}
            else
              if first_bid in 9..15 do
                {false, %{to_string(shooter) => "stripes", to_string(opponent) => "solids"}}
              else
                {state["table_open"], state["groups"]}
              end
            end
          else
            {state["table_open"], state["groups"]}
          end

        active_shooter_group = updated_groups[to_string(shooter)]

        # Turn retention check: did shooter pocket at least one of their own balls?
        retains_turn? =
          if table_open do
            length(object_pockets) > 0
          else
            Enum.any?(object_pockets, fn p -> ball_group(p["ballId"]) == active_shooter_group end)
          end

        next_turn = if retains_turn?, do: shooter, else: opponent

        %{
          state
          | "status" => "aiming",
            "turn" => next_turn,
            "ball_in_hand" => false,
            "table_open" => table_open,
            "groups" => updated_groups,
            "called_pocket" => nil,
            "shot_count" => state["shot_count"] + 1,
            "current_shot" => nil
        }
    end
  end

  # Spots a pocketed ball (e.g. 8-ball on break) back onto the foot spot
  defp spot_ball(state, ball_id) do
    balls = state["physics"]["balls"]
    str_id = to_string(ball_id)
    ball = balls[str_id]

    if ball == nil do
      state
    else
      foot_x = 0.56
      foot_z = 0.0

      spotted = %{
        ball
        | "x" => foot_x,
          "z" => foot_z,
          "vx" => 0.0,
          "vz" => 0.0,
          "wx" => 0.0,
          "wz" => 0.0,
          "wy" => 0.0,
          "state" => "in_play"
      }

      updated_physics = %{
        state["physics"]
        | "balls" => Map.put(balls, str_id, spotted)
      }

      %{state | "physics" => updated_physics}
    end
  end

  @doc """
  Returns the group ("solids", "stripes", "eight", or "cue") for a ball ID.
  """
  def ball_group(bid) do
    cond do
      bid in 1..7 -> "solids"
      bid == 8 -> "eight"
      bid in 9..15 -> "stripes"
      true -> "cue"
    end
  end

  @doc """
  Checks if all balls of a group have been pocketed.
  """
  def is_group_cleared?(balls, group) do
    target_ids = if group == "solids", do: 1..7, else: 9..15

    Enum.all?(target_ids, fn id ->
      b = balls[to_string(id)]
      b == nil or b["state"] == "pocketed"
    end)
  end

  @doc """
  Returns true if the current player is on the 8-ball and must call pocket.
  """
  def needs_called_pocket?(state, player) do
    if state["table_open"] do
      false
    else
      group = state["groups"][to_string(player)]
      if group, do: is_group_cleared?(state["physics"]["balls"], group), else: false
    end
  end
end
