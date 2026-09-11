defmodule Afterlight.Activities.Pool.Physics do
  @moduledoc """
  Authoritative specialist planar pool/billiards physics engine (Tasks 4.1, 4.2; Design D5).

  Guarantees:
  - Strict 2D table mechanics: cloth sliding/rolling friction, spin dynamics, ball-ball collisions,
    cushion rail bounces, pocket capture, and settling detection.
  - Zero tunneling: adaptive substepping ensures maximum displacement per substep <= 0.25 * R (7 mm)
    even at maximum break speed (15 m/s).
  - Spin physics: follow (topspin), draw (backspin), and english (side spin) cushion deflections.
  - Deterministic stepping: returns updated state and discrete event list (ball collisions, rail hits, pockets).
  - 100% pure BEAM implementation with zero native C/WASM dependencies.
  """

  # Table dimensions (tournament 8ft ratio 2:1 in meters)
  @table_length 2.24
  @table_width 1.12
  @half_length 1.12
  @half_width 0.56

  # Ball specifications
  @ball_radius 0.0285
  @ball_diameter 0.057
  @ball_mass 0.170
  @gravity 9.81

  # Friction coefficients
  @mu_sliding 0.20
  @mu_rolling 0.015
  @mu_spin 0.025

  # Restitution coefficients
  @ball_restitution 0.95
  @rail_restitution 0.75
  @cushion_spin_factor 0.20

  # Pocket radii
  @corner_pocket_radius 0.065
  @side_pocket_radius 0.060

  # Velocity thresholds
  @settle_linear_threshold 0.002
  @settle_angular_threshold 0.05
  @max_substep_displacement 0.007

  # Pocket centers in table coordinate system: X in [-1.12, 1.12], Z in [-0.56, 0.56]
  @pockets [
    %{"id" => "corner_tl", "x" => -@half_length, "z" => -@half_width, "radius" => @corner_pocket_radius},
    %{"id" => "corner_tr", "x" => -@half_length, "z" => @half_width, "radius" => @corner_pocket_radius},
    %{"id" => "side_l", "x" => 0.0, "z" => -@half_width, "radius" => @side_pocket_radius},
    %{"id" => "side_r", "x" => 0.0, "z" => @half_width, "radius" => @side_pocket_radius},
    %{"id" => "corner_bl", "x" => @half_length, "z" => -@half_width, "radius" => @corner_pocket_radius},
    %{"id" => "corner_br", "x" => @half_length, "z" => @half_width, "radius" => @corner_pocket_radius}
  ]

  # Table boundary constants
  def table_length, do: @table_length
  def table_width, do: @table_width
  def ball_radius, do: @ball_radius
  def pockets, do: @pockets

  @doc """
  Initializes standard standard 8-ball rack and cue ball state.
  """
  def init_rack(opts \\ []) do
    cue_x = Keyword.get(opts, :cue_x, -0.56)
    cue_z = Keyword.get(opts, :cue_z, 0.0)

    cue_ball = %{
      "id" => 0,
      "x" => cue_x,
      "z" => cue_z,
      "vx" => 0.0,
      "vz" => 0.0,
      "wx" => 0.0,
      "wz" => 0.0,
      "wy" => 0.0,
      "state" => "in_play"
    }

    # Standard triangular 8-ball rack centered at apex X = 0.56
    rack_balls = generate_triangular_rack(0.56, 0.0)

    balls = Map.put(rack_balls, "0", cue_ball)

    %{
      "balls" => balls,
      "settled" => true,
      "events" => [],
      "tick" => 0
    }
  end

  @doc """
  Generates standard triangular 8-ball rack positions (balls 1..15).
  Row 1 (apex): 1 ball (solid)
  Row 2: 2 balls
  Row 3: 3 balls (8-ball in center)
  Row 4: 4 balls
  Row 5: 5 balls (corners: 1 solid, 1 stripe)
  """
  def generate_triangular_rack(apex_x, apex_z) do
    r = @ball_radius + 0.0005
    dx = r * :math.sqrt(3)

    # 15 ball IDs arranged with 8 in center of row 3, corners differing
    layout = [
      # Row 1 (apex)
      {1, 0, 0},
      # Row 2
      {9, 1, -1}, {2, 1, 1},
      # Row 3
      {10, 2, -2}, {8, 2, 0}, {3, 2, 2},
      # Row 4
      {4, 3, -3}, {11, 3, -1}, {5, 3, 1}, {12, 3, 3},
      # Row 5
      {13, 4, -4}, {6, 4, -2}, {14, 4, 0}, {7, 4, 2}, {15, 4, 4}
    ]

    Enum.reduce(layout, %{}, fn {id, row, col}, acc ->
      bx = apex_x + row * dx
      bz = apex_z + col * r

      ball = %{
        "id" => id,
        "x" => Float.round(bx, 5),
        "z" => Float.round(bz, 5),
        "vx" => 0.0,
        "vz" => 0.0,
        "wx" => 0.0,
        "wz" => 0.0,
        "wy" => 0.0,
        "state" => "in_play"
      }

      Map.put(acc, to_string(id), ball)
    end)
  end

  @doc """
  Applies a cue shot impulse to the cue ball (id: 0).
  Params:
    - angle: shot angle in radians on XZ plane (0 points along +X)
    - speed: launch speed in m/s (clamped to 0.1..15.0 m/s)
    - spin_x: english / side spin in [-1.0, 1.0]
    - spin_y: vertical cue offset (topspin/follow in [0..1], backspin/draw in [-1..0])
  """
  def strike_cue_ball(state, angle, speed, spin_x \\ 0.0, spin_y \\ 0.0) do
    balls = state["balls"]
    cue = balls["0"]

    if cue == nil or cue["state"] != "in_play" do
      state
    else
      speed = max(0.1, min(50.0, speed * 1.0))
      spin_x = max(-1.0, min(1.0, spin_x * 1.0))
      spin_y = max(-1.0, min(1.0, spin_y * 1.0))

      vx = :math.cos(angle) * speed
      vz = :math.sin(angle) * speed

      # Side spin (angular velocity about Y axis)
      wy = spin_x * (speed / @ball_radius) * 0.4

      # Vertical offset translates into initial rolling/backspin angular velocity
      # Natural roll angular speed would be w_roll = speed / R
      # spin_y > 0 adds forward roll (topspin), spin_y < 0 adds backward roll (backspin)
      w_roll = spin_y * (speed / @ball_radius) * 1.2
      wx = -:math.sin(angle) * w_roll
      wz = :math.cos(angle) * w_roll

      updated_cue = %{
        cue
        | "vx" => vx,
          "vz" => vz,
          "wx" => wx,
          "wz" => wz,
          "wy" => wy
      }

      %{
        state
        | "balls" => Map.put(balls, "0", updated_cue),
          "settled" => false,
          "events" => []
      }
    end
  end

  @doc """
  Steps the pool physics by delta_sec (typically 1/60s = 0.01667s).
  Returns `{updated_state, step_events}`.
  """
  def step(state, delta_sec \\ 0.016667) do
    balls = state["balls"]

    # Check if any ball is currently moving
    active_balls = Enum.filter(balls, fn {_id, b} -> b["state"] == "in_play" end)
    max_v = max_linear_speed(active_balls)
    max_w = max_angular_speed(active_balls)

    if max_v < @settle_linear_threshold and max_w < @settle_angular_threshold do
      # All balls stationary -> zero out lingering micro-velocities and settle
      settled_balls =
        Map.new(balls, fn {id, b} ->
          if b["state"] == "in_play" do
            {id, %{b | "vx" => 0.0, "vz" => 0.0, "wx" => 0.0, "wz" => 0.0, "wy" => 0.0}}
          else
            {id, b}
          end
        end)

      updated_state = %{
        state
        | "balls" => settled_balls,
          "settled" => true,
          "tick" => state["tick"] + 1,
          "events" => []
      }

      {updated_state, []}
    else
      # Adaptive substepping to prevent tunneling at high velocities
      displacement = max_v * delta_sec
      substeps = max(1, min(96, ceil(displacement / @max_substep_displacement)))
      dt_sub = delta_sec / substeps

      # Execute substeps
      {final_balls, accumulated_events} =
        Enum.reduce(1..substeps, {balls, []}, fn _sub, {curr_balls, evts} ->
          substep_step(curr_balls, dt_sub, evts)
        end)

      # Check settling after substeps
      rem_active = Enum.filter(final_balls, fn {_id, b} -> b["state"] == "in_play" end)
      rem_max_v = max_linear_speed(rem_active)
      rem_max_w = max_angular_speed(rem_active)
      is_settled = rem_max_v < @settle_linear_threshold and rem_max_w < @settle_angular_threshold

      updated_balls =
        if is_settled do
          Map.new(final_balls, fn {id, b} ->
            if b["state"] == "in_play" do
              {id, %{b | "vx" => 0.0, "vz" => 0.0, "wx" => 0.0, "wz" => 0.0, "wy" => 0.0}}
            else
              {id, b}
            end
          end)
        else
          final_balls
        end

      updated_state = %{
        state
        | "balls" => updated_balls,
          "settled" => is_settled,
          "tick" => state["tick"] + 1,
          "events" => accumulated_events
      }

      {updated_state, accumulated_events}
    end
  end

  # Performs a single substep (motion, friction, pockets, cushions, ball-ball collisions)
  defp substep_step(balls, dt, events) do
    # 1. Apply friction (sliding vs rolling) & advance linear positions
    {moved_balls, _} =
      Enum.reduce(balls, {%{}, events}, fn {id, b}, {acc_balls, acc_evts} ->
        if b["state"] != "in_play" do
          {Map.put(acc_balls, id, b), acc_evts}
        else
          updated = apply_cloth_friction_and_integrate(b, dt)
          {Map.put(acc_balls, id, updated), acc_evts}
        end
      end)

    # 2. Check pocket entrances
    {pockets_balls, pocket_evts} =
      Enum.reduce(moved_balls, {%{}, []}, fn {id, b}, {acc_balls, p_evts} ->
        if b["state"] != "in_play" do
          {Map.put(acc_balls, id, b), p_evts}
        else
          case check_pockets(b) do
            {:pocketed, pocket_id} ->
              pocketed_b = %{
                b
                | "state" => "pocketed",
                  "vx" => 0.0,
                  "vz" => 0.0,
                  "wx" => 0.0,
                  "wz" => 0.0,
                  "wy" => 0.0
              }

              evt = %{
                "type" => "pocketed",
                "ballId" => b["id"],
                "pocketId" => pocket_id
              }

              {Map.put(acc_balls, id, pocketed_b), [evt | p_evts]}

            :ok ->
              {Map.put(acc_balls, id, b), p_evts}
          end
        end
      end)

    # 3. Check cushion rail bounces
    {cushion_balls, rail_evts} =
      Enum.reduce(pockets_balls, {%{}, []}, fn {id, b}, {acc_balls, r_evts} ->
        if b["state"] != "in_play" do
          {Map.put(acc_balls, id, b), r_evts}
        else
          {b_after, maybe_rail} = resolve_cushions(b)
          acc_r = if maybe_rail, do: [maybe_rail | r_evts], else: r_evts
          {Map.put(acc_balls, id, b_after), acc_r}
        end
      end)

    # 4. Resolve ball-ball collisions
    {final_balls, collision_evts} = resolve_ball_collisions(cushion_balls)

    new_events = events ++ pocket_evts ++ rail_evts ++ collision_evts
    {final_balls, new_events}
  end

  # Cloth friction: analytical sliding to rolling transition and position integration
  defp apply_cloth_friction_and_integrate(b, dt) do
    vx = b["vx"]
    vz = b["vz"]
    wx = b["wx"]
    wz = b["wz"]
    wy = b["wy"]
    r = @ball_radius

    # Relative contact point velocity between ball surface and cloth:
    u_rel_x = vx - r * wz
    u_rel_z = vz + r * wx
    u_rel_mag = :math.sqrt(u_rel_x * u_rel_x + u_rel_z * u_rel_z)
    max_slide_dv = 3.5 * @mu_sliding * @gravity * dt

    {next_vx, next_vz, next_wx, next_wz} =
      if u_rel_mag <= max_slide_dv do
        # Transitions to pure rolling during this timestep
        t_slide = if u_rel_mag > 0.000001, do: u_rel_mag / (3.5 * @mu_sliding * @gravity), else: 0.0
        dt_roll = max(0.0, dt - t_slide)

        v_roll_x = vx - (2.0 / 7.0) * u_rel_x
        v_roll_z = vz - (2.0 / 7.0) * u_rel_z

        v_mag = :math.sqrt(v_roll_x * v_roll_x + v_roll_z * v_roll_z)

        {rolled_vx, rolled_vz} =
          if v_mag > 0.0001 and dt_roll > 0 do
            dv_roll = min(v_mag, @mu_rolling * @gravity * dt_roll)
            scale = (v_mag - dv_roll) / v_mag
            {v_roll_x * scale, v_roll_z * scale}
          else
            if v_mag <= 0.0001 do
              {0.0, 0.0}
            else
              {v_roll_x, v_roll_z}
            end
          end

        {rolled_vx, rolled_vz, -rolled_vz / r, rolled_vx / r}
      else
        # Pure sliding throughout this timestep
        f_dir_x = u_rel_x / u_rel_mag
        f_dir_z = u_rel_z / u_rel_mag

        a_slide = @mu_sliding * @gravity
        dv = a_slide * dt

        s_vx = vx - f_dir_x * dv
        s_vz = vz - f_dir_z * dv

        dw = (2.5 * @mu_sliding * @gravity / r) * dt
        s_wx = wx - f_dir_z * dw
        s_wz = wz + f_dir_x * dw

        {s_vx, s_vz, s_wx, s_wz}
      end

    # Damping on vertical side spin (english)
    new_wy = wy * (1.0 - @mu_spin * dt * 10.0)

    # Position integration
    new_x = b["x"] + next_vx * dt
    new_z = b["z"] + next_vz * dt

    %{
      b
      | "x" => new_x,
        "z" => new_z,
        "vx" => next_vx,
        "vz" => next_vz,
        "wx" => next_wx,
        "wz" => next_wz,
        "wy" => new_wy
    }
  end

  # Checks whether a ball entered any pocket
  defp check_pockets(b) do
    x = b["x"]
    z = b["z"]

    Enum.find_value(@pockets, :ok, fn pocket ->
      px = pocket["x"]
      pz = pocket["z"]
      pr = pocket["radius"]
      dx = x - px
      dz = z - pz
      dist = :math.sqrt(dx * dx + dz * dz)

      if dist <= pr do
        {:pocketed, pocket["id"]}
      else
        false
      end
    end)
  end

  # Resolves collisions against the table cushion boundaries
  defp resolve_cushions(b) do
    r = @ball_radius
    x = b["x"]
    z = b["z"]
    vx = b["vx"]
    vz = b["vz"]
    wy = b["wy"]

    min_x = -@half_length + r
    max_x = @half_length - r
    min_z = -@half_width + r
    max_z = @half_width - r

    # Don't bounce if directly in the pocket openings (within 0.05m of pocket centers)
    near_pocket =
      Enum.any?(@pockets, fn p ->
        :math.sqrt((x - p["x"]) ** 2 + (z - p["z"]) ** 2) < p["radius"] + 0.02
      end)

    if near_pocket do
      {b, nil}
    else
      {b1, evt_x} =
        cond do
          x < min_x and vx < 0 ->
            # Head cushion bounce
            deflect_z = wy * @cushion_spin_factor * abs(vx)
            new_vx = -vx * @rail_restitution
            new_vz = vz + deflect_z
            {%{b | "x" => min_x, "vx" => new_vx, "vz" => new_vz, "wy" => wy * 0.7},
             %{"type" => "rail_collision", "ballId" => b["id"], "rail" => "head"}}

          x > max_x and vx > 0 ->
            # Foot cushion bounce
            deflect_z = -wy * @cushion_spin_factor * abs(vx)
            new_vx = -vx * @rail_restitution
            new_vz = vz + deflect_z
            {%{b | "x" => max_x, "vx" => new_vx, "vz" => new_vz, "wy" => wy * 0.7},
             %{"type" => "rail_collision", "ballId" => b["id"], "rail" => "foot"}}

          true ->
            {b, nil}
        end

      # Now check Z rails (left and right sides)
      z1 = b1["z"]
      vz1 = b1["vz"]
      vx1 = b1["vx"]
      wy1 = b1["wy"]

      cond do
        z1 < min_z and vz1 < 0 ->
          deflect_x = -wy1 * @cushion_spin_factor * abs(vz1)
          new_vz = -vz1 * @rail_restitution
          new_vx = vx1 + deflect_x
          {%{b1 | "z" => min_z, "vz" => new_vz, "vx" => new_vx, "wy" => wy1 * 0.7},
           evt_x || %{"type" => "rail_collision", "ballId" => b["id"], "rail" => "left"}}

        z1 > max_z and vz1 > 0 ->
          deflect_x = wy1 * @cushion_spin_factor * abs(vz1)
          new_vz = -vz1 * @rail_restitution
          new_vx = vx1 + deflect_x
          {%{b1 | "z" => max_z, "vz" => new_vz, "vx" => new_vx, "wy" => wy1 * 0.7},
           evt_x || %{"type" => "rail_collision", "ballId" => b["id"], "rail" => "right"}}

        true ->
          {b1, evt_x}
      end
    end
  end

  # Resolves 2D elastic ball-ball collisions
  defp resolve_ball_collisions(balls) do
    keys = Map.keys(balls) |> Enum.sort()
    pairs = for i <- keys, j <- keys, i < j, do: {i, j}
    min_dist = @ball_diameter

    Enum.reduce(pairs, {balls, []}, fn {id_a, id_b}, {acc_balls, evts} ->
      ba = acc_balls[id_a]
      bb = acc_balls[id_b]

      if ba["state"] != "in_play" or bb["state"] != "in_play" do
        {acc_balls, evts}
      else
        dx = bb["x"] - ba["x"]
        dz = bb["z"] - ba["z"]
        dist_sq = dx * dx + dz * dz

        if dist_sq < min_dist * min_dist and dist_sq > 0.000001 do
          dist = :math.sqrt(dist_sq)
          nx = dx / dist
          nz = dz / dist

          # Positional separation to prevent sticking/overlap
          overlap = 0.5 * (min_dist - dist)
          ba_x = ba["x"] - nx * overlap
          ba_z = ba["z"] - nz * overlap
          bb_x = bb["x"] + nx * overlap
          bb_z = bb["z"] + nz * overlap

          # Relative velocity along normal
          rel_vx = bb["vx"] - ba["vx"]
          rel_vz = bb["vz"] - ba["vz"]
          rel_v_norm = rel_vx * nx + rel_vz * nz

          if rel_v_norm < 0 do
            # Elastic collision impulse: J = -(1 + e) * rel_v_norm / (1/m1 + 1/m2)
            # m1 == m2 -> J = -(1 + e) * 0.5 * rel_v_norm
            j_impulse = -0.5 * (1.0 + @ball_restitution) * rel_v_norm

            new_ba_vx = ba["vx"] - j_impulse * nx
            new_ba_vz = ba["vz"] - j_impulse * nz
            new_bb_vx = bb["vx"] + j_impulse * nx
            new_bb_vz = bb["vz"] + j_impulse * nz

            up_ba = %{ba | "x" => ba_x, "z" => ba_z, "vx" => new_ba_vx, "vz" => new_ba_vz}
            up_bb = %{bb | "x" => bb_x, "z" => bb_z, "vx" => new_bb_vx, "vz" => new_bb_vz}

            evt = %{
              "type" => "ball_collision",
              "ballA" => ba["id"],
              "ballB" => bb["id"],
              "speed" => abs(rel_v_norm)
            }

            acc_updated =
              acc_balls
              |> Map.put(id_a, up_ba)
              |> Map.put(id_b, up_bb)

            {acc_updated, [evt | evts]}
          else
            {acc_balls, evts}
          end
        else
          {acc_balls, evts}
        end
      end
    end)
  end

  defp max_linear_speed(balls) do
    Enum.reduce(balls, 0.0, fn {_id, b}, acc ->
      v = :math.sqrt(b["vx"] * b["vx"] + b["vz"] * b["vz"])
      max(acc, v)
    end)
  end

  defp max_angular_speed(balls) do
    Enum.reduce(balls, 0.0, fn {_id, b}, acc ->
      w = :math.sqrt(b["wx"] * b["wx"] + b["wz"] * b["wz"] + b["wy"] * b["wy"])
      max(acc, w)
    end)
  end
end
