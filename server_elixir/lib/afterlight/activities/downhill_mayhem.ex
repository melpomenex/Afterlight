defmodule Afterlight.Activities.DownhillMayhem do
  @moduledoc """
  Downhill Mayhem authoritative rules
  (integrate-multiplayer-downhill-mayhem-arcade 8.1).

  Pure, deterministic port of `shared/downhill/rules.js` — the same physics,
  tricks, landing, crash, combat, collisions and ordering. No IO, no clock, no
  randomness (AI randomness lives in `DownhillMayhem.AI`). The rider state is a
  map; `step_field/4` threads the whole field so strikes and pair collisions
  can mutate more than one rider.
  """

  import Bitwise

  alias Afterlight.Activities.DownhillMayhem
  alias Afterlight.Activities.DownhillMayhem.Course

  @rules_version 1
  @tick_hz 30
  @dt 1 / 30

  # Source constants (shared/downhill/rules.js).
  @g 11.5
  @vt_fall 17.5
  @drag 0.0030
  @softcap_v 33
  @slope_k 1.48
  @pedal_a 5.8
  @pedal_vmax 18
  @brake_a 10.5
  @roll_f 0.35
  @steer_base 2.6
  @steer_vk 0.21
  @steer_resp 7.5
  @centrif_k 1.35
  @air_ctrl 0.32
  @wall_grind_t 0.8
  @wall_slam_v 5.0
  @drift_auth 0.55
  @drift_scrub 1.3
  @hop_vy 3.3
  @ramp_hop_bonus 1.9
  @detach_g 2.6
  @stumble_impact 12
  @crash_impact 19.5
  @crash_time 1.8
  @invuln_time 2.6
  @boost_a 9.0
  @boost_drain 27
  @boost_min 4
  @meter_trickle 3.5
  @hit_meter 6
  @air_strike_meter 14
  @boost_strike_meter 10
  @punch_s 2.2
  @punch_lat 1.6
  @punch_dy 1.4
  @player_punch_cd 0.75
  @revenge_hunt_t 30
  @trick_grace 0.22
  @bigair_t 1.15
  @bigair_meter 8
  @half_w 8
  @ride_w 26
  @lat_clamp 27.5
  @start_lats [1.25, -6.25, -3.75, -1.25, 3.75, 6.25]

  @tricks %{
    "nohander" => %{dur: 0.55, meter: 14, name: "NO HANDER"},
    "superman" => %{dur: 0.85, meter: 24, name: "SUPERMAN"},
    "backflip" => %{dur: 0.95, meter: 30, name: "BACKFLIP", forgive: 0.90, save: 0.85},
    "heel" => %{dur: 1.15, meter: 38, name: "HEEL CLICKER"}
  }
  @trick_forgive 0.78
  @trick_save 0.6

  @rider_defs [
    %{name: "YOU", color: 0xFF7F27, top: 1.00, corner: 1.00, aggr: 0.0, trick: 0.0, crashy: 0.0},
    %{name: "BLAZE", color: 0xE0392B, top: 1.03, corner: 0.94, aggr: 0.85, trick: 0.45, crashy: 0.35},
    %{name: "RHONDA", color: 0xE259B5, top: 1.00, corner: 1.02, aggr: 0.40, trick: 0.85, crashy: 0.30},
    %{name: "DIESEL", color: 0x4A7D2B, top: 1.02, corner: 0.87, aggr: 1.00, trick: 0.20, crashy: 0.40},
    %{name: "KAZU", color: 0x2F66D0, top: 0.99, corner: 1.06, aggr: 0.30, trick: 0.95, crashy: 0.22},
    %{name: "SIERRA", color: 0xEAC435, top: 1.01, corner: 0.98, aggr: 0.55, trick: 0.60, crashy: 0.28}
  ]

  @diffs %{
    "chill" => %{label: "CHILL", pace: 1.0, rub_p: 0.26, rub_sat: 60, leash: 0.09, corner: 4.9, aggr: 0.5, cd: 1.4, meter0: {5, 18}, rev: 0.8, company: true},
    "mayhem" => %{label: "MAYHEM", pace: 1.035, rub_p: 0.42, rub_sat: 45, leash: 0.075, corner: 5.2, aggr: 1, cd: 1, meter0: {15, 35}, rev: 1, company: true},
    "brutal" => %{label: "BRUTAL", pace: 1.145, rub_p: 0.62, rub_sat: 30, leash: 0.02, corner: 5.95, aggr: 2.9, cd: 0.45, meter0: {50, 85}, rev: 3, company: false, hunt_race: true}
  }

  # --- accessors -------------------------------------------------------------

  def rules_version, do: @rules_version
  def tick_hz, do: @tick_hz
  def dt, do: @dt
  def tricks, do: @tricks
  def rider_defs, do: @rider_defs
  def diffs, do: @diffs
  def diff(id), do: Map.get(@diffs, id, @diffs["mayhem"])
  def start_lats, do: @start_lats

  def enabled? do
    Application.get_env(:afterlight, :downhill_mayhem_enabled, false)
  end

  # --- control normalisation -------------------------------------------------

  def neutral_controls do
    %{pedal: 0, brake: 0, steer: 0.0, hop: false, boost: false, punch: false, kick: false, trick: nil}
  end

  def normalize_controls(raw) when is_map(raw) do
    steer = if is_number(raw["steer"]), do: clamp(raw["steer"] * 1.0, -1.0, 1.0), else: 0.0
    trick = if Map.get(@tricks, raw["trick"]), do: raw["trick"], else: nil

    %{
      pedal: truthy(raw["pedal"]),
      brake: truthy(raw["brake"]),
      steer: steer,
      hop: truthy(raw["hop"]) or truthy(raw["hopPressed"]),
      boost: truthy(raw["boost"]),
      punch: truthy(raw["punch"]) or truthy(raw["punchPressed"]),
      kick: truthy(raw["kick"]) or truthy(raw["kickPressed"]),
      trick: trick
    }
  end

  def normalize_controls(_), do: neutral_controls()

  # --- rider construction ----------------------------------------------------

  def initial_state(slot, opts \\ []) do
    difficulty = Keyword.get(opts, :difficulty, "mayhem")
    is_ai = Keyword.get(opts, :is_ai, false)
    seed = Keyword.get(opts, :seed, 1)
    diff = diff(difficulty)
    def0 = if is_ai, do: Enum.at(@rider_defs, rem(slot, length(@rider_defs))), else: %{name: "RIDER", color: 0xFFFFFF, top: 1, corner: 1, aggr: 0, trick: 0, crashy: 0}
    meter0 = if is_ai, do: elem(diff.meter0, 0) + rand01(seed, slot, 0) * (elem(diff.meter0, 1) - elem(diff.meter0, 0)), else: 0.0

    %{
      slot: slot,
      is_ai: is_ai,
      is_human: not is_ai,
      def: def0,
      s: 0.0,
      lat: Enum.at(@start_lats, rem(slot, length(@start_lats))),
      y: 0.0,
      vs: 0.0,
      vlat: 0.0,
      vy: 0.0,
      grounded: true,
      steer_pos: 0.0,
      lean: 0.0,
      pitch: 0.0,
      air_time: 0.0,
      was_on_ramp: false,
      drift_t: 0.0,
      wall_t: 0.0,
      draft_t: 0.0,
      grudge: false,
      revenge_t: 0.0,
      finished: false,
      finish_time: nil,
      race_pos: slot + 1,
      rubber: 0.0,
      photo: false,
      trick: nil,
      trick_t: 0.0,
      chain: 0,
      pending_meter: 0.0,
      pending_names: [],
      meter: meter0,
      boosting: false,
      boost_latch: false,
      crashed: false,
      crash_t: 0.0,
      invuln: 0.0,
      punch_anim_t: -1,
      kick_anim_t: -1,
      strike_kind: "punch",
      strike_side: 1,
      windup_t: -1,
      windup_target: nil,
      windup_dur: nil,
      punch_cd: if(is_ai, do: 3 + slot * 1.7, else: 0.0),
      phase: if(is_ai, do: rand01(seed, slot, 1) * 6.28, else: 0.0),
      wf: if(is_ai, do: 0.25 + rand01(seed, slot, 2) * 0.3, else: 0.0),
      wamp: if(is_ai, do: 1.2 + rand01(seed, slot, 3) * 1.6, else: 0.0),
      line_bias: if(is_ai, do: (rand01(seed, slot, 4) * 2 - 1) * 3.2, else: 0.0),
      react_t: if(is_ai, do: 0.08 + rand01(seed, slot, 5) * 0.3, else: 0.0),
      trick_rolled: false,
      finish_s: nil,
      inp: neutral_controls()
    }
  end

  defp rand01(seed, slot, k) do
    Course.hash2(seed + slot * 7919, 104_729 + k * 31)
  end

  # --- public step -----------------------------------------------------------

  @doc "Advance the field one 1/30 tick. `controls_by_slot` is %{slot => control}."
  def step_field(%Course{} = course, riders, controls_by_slot, ctx \\ %{}) do
    ctx = Map.put_new(ctx, :difficulty, Map.get(ctx, :difficulty, "mayhem"))
    ctx = Map.put_new(ctx, :elapsed, 0.0)

    {rm, ev1} = apply_controls(course, riders, controls_by_slot, ctx)
    rm = update_draft(rm)
    {rm, ev2} = substep(course, rm, ctx)
    rm = pair_collisions(rm, @dt)
    rm = update_positions(rm)
    {rm, ev1 ++ ev2}
  end

  defp substep(course, rm, ctx) do
    sub = if @dt > 0.022, do: 2, else: 1
    h = @dt / sub
    Enum.reduce(1..sub, {rm, []}, fn _k, {acc, ev} ->
      {next, more} =
        Enum.reduce(Enum.sort_by(Map.keys(acc), & &1), {acc, []}, fn slot, {m, e} ->
          r = Map.fetch!(m, slot)
          {r2, evs} = step_rider(course, r, h, ctx)
          {Map.put(m, slot, r2), e ++ evs}
        end)

      {next, ev ++ more}
    end)
  end

  defp apply_controls(course, riders, controls_by_slot, ctx) do
    slots = Enum.sort(Map.keys(riders))

    Enum.reduce(slots, {riders, []}, fn slot, {m, ev} ->
      r = Map.fetch!(m, slot)
      # AI reaction delay is part of the rider state, advanced here each tick.
      r = if r.is_ai and r.react_t > 0, do: %{r | react_t: r.react_t - @dt}, else: r
      m = Map.put(m, slot, r)
      ai = Map.get(ctx, :ai_control)

      control =
        if r.is_ai and is_function(ai) do
          ai.(course, r, Map.put(ctx, :riders, m))
        else
          Map.get(controls_by_slot, slot, neutral_controls())
        end

      {m2, r2, more} = apply_control(course, m, r, control, ctx)
      {Map.put(m2, slot, r2), ev ++ more}
    end)
  end

  defp apply_control(course, rm, r, control, ctx) do
    control = if is_map(control), do: control, else: neutral_controls()
    active = not r.crashed and not r.finished

    inp = %{
      pedal: if(active and truthy(control.pedal), do: 1, else: 0),
      brake: if(active and truthy(control.brake), do: 1, else: 0),
      steer: if(active, do: control.steer || 0.0, else: 0.0),
      hop: active and truthy(control.hop),
      boost: active and truthy(control.boost),
      punch: active and truthy(control.punch),
      kick: active and truthy(control.kick),
      trick: if(active, do: control.trick, else: nil)
    }

    r = %{r | inp: inp}
    {rm, r, ev} = maybe_strike(rm, r, :punch, "punch", ctx, [])
    {rm, r, ev} = maybe_strike(rm, r, :kick, "kick", ctx, ev)
    r = if inp.trick, do: start_trick(r, inp.trick) |> elem(0), else: r
    r = if r.finished, do: %{r | inp: %{inp | pedal: 0, steer: 0.0, brake: if(r.s > (r.finish_s || 1.0e9) + 25, do: 1, else: 0.25), boost: false}}, else: r
    {rm, r, ev}
  end

  defp maybe_strike(rm, r, kind_atom, kind_str, ctx, ev) do
    cond do
      not r.inp[kind_atom] -> {rm, r, ev}
      r.punch_cd > 0 -> {rm, r, ev}
      true ->
        r = %{r | punch_cd: @player_punch_cd}
        {r2, rm2, more} = try_strike(r, kind_str, rm, ctx)
        {rm2, r2, ev ++ more}
    end
  end

  # --- single rider integration ---------------------------------------------

  def step_rider(%Course{} = course, r, dt, ctx) do
    finish_s = Map.get(ctx, :finish_s) || course.finish_s
    r = %{r | invuln: max(0.0, r.invuln - dt), punch_cd: max(0.0, r.punch_cd - dt), finish_s: finish_s}
    diff = diff(Map.get(ctx, :difficulty, "mayhem"))
    elapsed = Map.get(ctx, :elapsed, 0.0)

    if r.crashed do
      step_crashed(course, r, dt, finish_s, elapsed)
    else
      step_alive(course, r, dt, diff, finish_s, elapsed)
    end
  end

  defp step_crashed(course, r, dt, finish_s, elapsed) do
    r = %{r | crash_t: r.crash_t + dt, vs: max(0.0, r.vs - 6 * dt), vlat: r.vlat * :math.pow(0.05, dt)}
    e1 = if not r.finished and r.s >= finish_s, do: [%{type: "finish", slot: r.slot, time: elapsed}], else: []
    r = if not r.finished and r.s >= finish_s, do: finish_rider(r, elapsed), else: r
    r = %{r | s: r.s + r.vs * dt, lat: r.lat + r.vlat * dt}
    gnd = Course.height_at(course, r.s, r.lat)

    r =
      if not r.grounded do
        r = %{r | vy: r.vy - @g * dt}
        y = r.y + r.vy * dt
        if y <= gnd, do: %{r | y: gnd, grounded: true, vy: 0.0}, else: %{r | y: y}
      else
        %{r | y: gnd}
      end

    r =
      if r.crash_t >= @crash_time and not r.finished do
        %{r | crashed: false, invuln: @invuln_time, vs: max(r.vs, 2.5), grounded: true, air_time: 0.0}
      else
        r
      end

    {r, e1}
  end

  defp step_alive(course, r, dt, diff, finish_s, elapsed) do
    inp = r.inp
    zone = cond do
      abs(r.lat) < @half_w + 0.4 -> 0
      abs(r.lat) < @ride_w -> 1
      true -> 2
    end

    ramph = Course.ramp_height_at(course, r.s, r.lat)

    r =
      if r.grounded do
        track = Course.sample_track(course, r.s)
        a = -track.grade * 9.81 * @slope_k * (1 + r.rubber * 0.5)
        a = a + inp.pedal * @pedal_a * max(0.0, 1 - r.vs / @pedal_vmax) * (1 + r.rubber * 0.6)
        a = a - inp.brake * @brake_a
        drag_mult = case zone do
          0 -> 1.0
          1 -> 1.55
          2 -> 5.5
        end
        a = a - @drag * drag_mult * r.vs * r.vs * (1 - r.rubber * 0.55) * (1 - 0.32 * r.draft_t)
        a = a + 0.8 * r.draft_t
        a = a - (case zone do
          0 -> @roll_f
          1 -> 1.1
          2 -> 3.4
        end)

        {boost_latch, a} =
          cond do
            not inp.boost or r.meter <= 0 -> {false, a}
            r.meter > @boost_min -> {true, a}
            true -> {r.boost_latch, a}
          end

        boosting = boost_latch and inp.boost and r.meter > 0
        {meter, a} =
          if boosting do
            {max(0.0, r.meter - @boost_drain * dt), a + @boost_a}
          else
            if not r.finished and r.vs > 10 do
              {min(100.0, r.meter + @meter_trickle * (if r.is_human, do: 1.0, else: 0.85 + r.rubber * 0.9) * dt), a}
            else
              {r.meter, a}
            end
          end

        cap = @softcap_v * r.def.top * (if r.is_human, do: 1.0, else: diff.pace) * (1 + r.rubber * 0.5) + (if boosting, do: 4.0, else: 0.0)
        a = if r.vs > cap, do: a - (r.vs - cap) * 0.9, else: a
        vs = max(0.0, r.vs + a * dt)

        target = inp.steer
        rate = if abs(target) > abs(r.steer_pos) and sign(target) == sign(if r.steer_pos == 0.0, do: target, else: r.steer_pos), do: 6, else: 8
        steer_pos = r.steer_pos + clamp(target - r.steer_pos, -rate * dt, rate * dt)
        hard_turn = abs(steer_pos) > 0.82 and vs > 15
        drift_t = clamp(r.drift_t + (if hard_turn, do: dt / 0.45, else: -dt / 0.3), 0.0, 1.0)
        centrif = track.curv * vs * vs * @centrif_k
        target_vlat = steer_pos * (@steer_base + vs * @steer_vk) * (1 + @drift_auth * drift_t) + centrif
        vlat = r.vlat + (target_vlat - r.vlat) * min(1.0, @steer_resp * dt)
        vs = max(0.0, vs - @drift_scrub * drift_t * dt)
        vlat = if abs(r.lat) > @ride_w, do: vlat - sign(r.lat) * 5 * dt, else: vlat

        base = %{r | meter: meter, boosting: boosting, boost_latch: boost_latch, vs: vs, steer_pos: steer_pos, drift_t: drift_t, vlat: vlat}

        if inp.hop do
          on_ramp_top = ramph > 0.05
          %{base | grounded: false, vy: max(base.vy, 0.0) + @hop_vy + (if on_ramp_top, do: @ramp_hop_bonus, else: 0.0), y: base.y + 0.02, air_time: 0.001, was_on_ramp: on_ramp_top}
        else
          base
        end
      else
        air_time = r.air_time + dt
        vlat = (r.vlat + inp.steer * (@steer_base + r.vs * @steer_vk) * @air_ctrl * dt * 3) * :math.pow(0.6, dt)
        vs = max(0.0, r.vs - @drag * 0.4 * r.vs * r.vs * dt)
        r = %{r | air_time: air_time, vlat: vlat, vs: vs, boosting: false}
        r = if inp.trick, do: start_trick(r, inp.trick) |> elem(0), else: r
        %{r | vy: max(r.vy - @g * dt, -@vt_fall)}
      end

    {r, ev_trick} = update_trick(r, dt)

    prev_y = r.y
    prev_vy = r.vy
    r = %{r | s: r.s + r.vs * dt}
    vlat_in = r.vlat
    lat = clamp(r.lat + r.vlat * dt, -@lat_clamp, @lat_clamp)
    r = %{r | lat: lat}

    {r, ev_wall} =
      if abs(r.lat) >= @lat_clamp - 0.01 do
        r = if abs(vlat_in) > @wall_slam_v and r.grounded, do: crash(r, "wall"), else: r
        {%{r | vlat: r.vlat * -0.35, vs: r.vs * 0.985}, []}
      else
        {r, []}
      end

    r =
      if r.grounded and not r.crashed and abs(r.lat) > @ride_w + 0.4 and r.vs > 7 do
        wt = r.wall_t + dt
        if wt > @wall_grind_t, do: crash(%{r | wall_t: wt}, "wall"), else: %{r | wall_t: wt}
      else
        %{r | wall_t: 0.0}
      end

    r = if r.s > 2460, do: %{r | s: 2460.0, vs: 0.0}, else: r
    gnd = Course.height_at(course, r.s, r.lat)

    {r, ev_land} =
      if r.grounded do
        implied_vy = (gnd - prev_y) / dt

        if implied_vy - r.vy < -@g * @detach_g * dt do
          r = %{r | grounded: false, air_time: 0.001, was_on_ramp: ramph > 0.05, y: prev_y + r.vy * dt, vy: r.vy - @g * dt}
          {r, []}
        else
          {%{r | y: gnd, vy: implied_vy}, []}
        end
      else
        y = r.y + r.vy * dt

        if y <= gnd do
          slope_vy = ground_slope_vy(course, r)
          impact = max(0.0, slope_vy - prev_vy)
          r = %{r | y: gnd, grounded: true, vy: slope_vy}
          {r, ev} = handle_landing(r, impact)
          {r, ev}
        else
          {%{r | y: y}, []}
        end
      end

    {r, ev_obs} = collide(course, r, gnd)

    ev = ev_trick ++ ev_wall ++ ev_land ++ ev_obs

    r =
      if not r.finished and r.s >= finish_s do
        finish_rider(r, elapsed)
      else
        r
      end

    ev = if r.finished and not Enum.any?(ev, &(&1.type == "finish")), do: ev ++ [%{type: "finish", slot: r.slot, time: elapsed}], else: ev
    {r, ev}
  end

  defp collide(course, r, gnd) do
    if r.crashed or r.invuln > 0 or r.y - gnd >= 2.5 do
      {r, []}
    else
      b = trunc(Float.floor(r.s / 10))
      Enum.reduce_while((b - 1)..(b + 1), {r, []}, fn bi, {rr, ev} ->
        list = Map.get(course.collider_buckets, bi, [])

        hit =
          Enum.find_value(list, fn t ->
            if t["kind"] == "tree" do
              if abs(t["s"] - rr.s) < 1.1 and abs(t["lat"] - rr.lat) < 0.9, do: "tree", else: nil
            else
              if rr.y - gnd < 1.1 and abs(t["s"] - rr.s) < 1.0 and abs(t["lat"] - rr.lat) < t["r"], do: "rock", else: nil
            end
          end)

        if hit do
          {:halt, {crash(rr, hit), ev ++ [%{type: "crash", slot: rr.slot, cause: hit}]}}
        else
          {:cont, {rr, ev}}
        end
      end)
    end
  end

  def ground_slope_vy(course, r) do
    ds = (Course.height_at(course, r.s + 1.6, r.lat) - Course.height_at(course, r.s - 1.6, r.lat)) / 3.2
    dl = Course.height_at(course, r.s, r.lat + 0.5) - Course.height_at(course, r.s, r.lat - 0.5)
    ds * r.vs + dl * r.vlat
  end

  # --- tricks ----------------------------------------------------------------

  def start_trick(r, type) do
    def0 = Map.get(@tricks, type)

    if def0 == nil or r.trick != nil or r.grounded or r.crashed or r.air_time < @trick_grace do
      {r, []}
    else
      {%{r | trick: type, trick_t: 0.0}, []}
    end
  end

  defp update_trick(%{trick: nil} = r, _dt), do: {r, []}

  defp update_trick(r, dt) do
    r = %{r | trick_t: r.trick_t + dt}
    dur = @tricks[r.trick].dur

    if r.trick_t >= dur do
      {r2, names} = complete_trick(r)
      {r2, [%{type: "trick_complete", slot: r.slot, name: names, chain: r2.chain}]}
    else
      {r, []}
    end
  end

  defp complete_trick(r) do
    def0 = @tricks[r.trick]
    bonus = if r.chain > 0, do: 0.5, else: 0.0
    pending = r.pending_meter + def0.meter * (1 + bonus * r.chain)
    {%{r | pending_meter: pending, pending_names: r.pending_names ++ [def0.name], chain: r.chain + 1, trick: nil, trick_t: 0.0}, def0.name}
  end

  defp handle_landing(r, impact) do
    if r.finished or r.s >= (r.finish_s || 1.0e9) do
      {%{r | air_time: 0.0, was_on_ramp: false, trick: nil}, []}
    else
      air = r.air_time
      r = %{r | air_time: 0.0, was_on_ramp: false}

      cond do
        r.trick != nil ->
          done = r.trick_t / @tricks[r.trick].dur
          forgive = Map.get(@tricks[r.trick], :forgive, @trick_forgive)
          save = Map.get(@tricks[r.trick], :save, @trick_save)

          cond do
            done >= forgive ->
              {r1, _name} = complete_trick(r)
              {r1, [%{type: "landing", slot: r.slot, impact: impact, air: air}]}
            done >= save ->
              r = %{r | trick: nil, trick_t: 0.0, pending_meter: 0.0, pending_names: [], chain: 0, vs: r.vs * 0.72}
              {r, [%{type: "landing", slot: r.slot, impact: impact, air: air, saved: true}]}
            true ->
              {crash(r, "bail"), [%{type: "crash", slot: r.slot, cause: "bail"}]}
          end

        true ->
          if impact > @crash_impact do
            {crash(r, "hard"), [%{type: "crash", slot: r.slot, cause: "hard"}]}
          else
            r = if impact > @stumble_impact, do: %{r | vs: r.vs * 0.72}, else: r
            gain = r.pending_meter + (if air > @bigair_t, do: @bigair_meter, else: 0.0)
            gain = if r.is_human and air > 0.45 and impact < 2.8, do: gain + 5, else: gain
            r = if gain > 0, do: %{r | meter: clamp(r.meter + gain, 0.0, 100.0)}, else: r
            r = %{r | pending_meter: 0.0, pending_names: [], chain: 0}
            {r, [%{type: "landing", slot: r.slot, impact: impact, air: air}]}
          end
      end
    end
  end

  # --- combat ----------------------------------------------------------------

  def try_strike(attacker, kind, rm, ctx) do
    best =
      rm
      |> Map.values()
      |> Enum.reject(fn o -> o.slot == attacker.slot or o.crashed or o.invuln > 0 or o.finished end)
      |> Enum.filter(fn o ->
        ds = abs(o.s - attacker.s)
        dl = abs(o.lat - attacker.lat)
        dy = abs(o.y - attacker.y)
        ds < @punch_s and dl < @punch_lat and dy < @punch_dy
      end)
      |> Enum.min_by(fn o -> abs(o.s - attacker.s) + abs(o.lat - attacker.lat) end, fn -> nil end)

    strike_side =
      if best do
        sign(best.lat - attacker.lat)
      else
        if attacker.inp.steer != 0, do: sign(attacker.inp.steer), else: attacker.strike_side
      end

    attacker = %{attacker | strike_side: strike_side, strike_kind: kind}
    attacker = if kind == "kick", do: %{attacker | kick_anim_t: 0}, else: %{attacker | punch_anim_t: 0}
    diff = diff(Map.get(ctx, :difficulty, "mayhem"))

    if best do
      best = %{best | vlat: best.vlat + strike_side * (if kind == "kick", do: 4.5, else: 3.0)}
      best = crash(best, if(kind == "kick", do: "kicked", else: "punched"))

      attacker =
        if attacker.is_human do
          gain = @hit_meter + (if not attacker.grounded, do: @air_strike_meter, else: 0) + (if attacker.boosting, do: @boost_strike_meter, else: 0)
          %{attacker | meter: min(100.0, attacker.meter + gain)}
        else
          attacker
        end

      best =
        if attacker.is_human and best.is_ai do
          %{best | grudge: true, revenge_t: @revenge_hunt_t * diff.rev}
        else
          best
        end

      attacker = if best.is_human and attacker.revenge_t > 0, do: %{attacker | revenge_t: 0.0}, else: attacker
      rm = rm |> Map.put(attacker.slot, attacker) |> Map.put(best.slot, best)
      {attacker, rm, [%{type: "strike", slot: attacker.slot, target_slot: best.slot, kind: kind, landed: true}]}
    else
      rm = Map.put(rm, attacker.slot, attacker)
      {attacker, rm, [%{type: "strike", slot: attacker.slot, kind: kind, landed: false}]}
    end
  end

  defp crash(r, cause) do
    if r.crashed or r.invuln > 0 or r.finished do
      r
    else
      %{r |
        crashed: true,
        crash_t: 0.0,
        trick: nil,
        pending_meter: 0.0,
        pending_names: [],
        chain: 0,
        boosting: false,
        windup_t: -1,
        meter: r.meter * 0.4,
        vs: r.vs * 0.35,
        vy: min(r.vy, 1.5)
      }
    end
  end

  def pair_collisions(rm, dt) do
    slots = Enum.sort(Map.keys(rm))

    Enum.reduce(for(i <- slots, j <- slots, i < j, do: {i, j}), rm, fn {i, j}, acc ->
      a = Map.fetch!(acc, i)
      b = Map.fetch!(acc, j)

      if a.crashed or b.crashed or (a.finished and b.finished) do
        acc
      else
        ds = b.s - a.s
        dl = b.lat - a.lat

        if abs(ds) < 1.7 and abs(dl) < 1.0 and abs(a.y - b.y) < 1.2 do
          push = (1.0 - abs(dl)) * 6 * dt
          sgn = if dl >= 0, do: 1, else: -1
          dv = (b.vs - a.vs) * 0.12

          a = %{a | vlat: a.vlat - sgn * push, vs: a.vs + dv}
          b = %{b | vlat: b.vlat + sgn * push, vs: b.vs - dv}
          acc |> Map.put(i, a) |> Map.put(j, b)
        else
          acc
        end
      end
    end)
  end

  def update_positions(rm) do
    order =
      rm
      |> Map.values()
      |> Enum.sort(fn a, b ->
        cond do
          a.finished and b.finished -> a.finish_time <= b.finish_time
          a.finished -> true
          b.finished -> false
          true -> a.s >= b.s
        end
      end)

    order
    |> Enum.with_index(1)
    |> Enum.reduce(rm, fn {r, pos}, acc -> Map.put(acc, r.slot, %{r | race_pos: pos}) end)
  end

  defp update_draft(rm) do
    list = Map.values(rm)

    Enum.reduce(list, rm, fn r, acc ->
      tow =
        if not r.crashed and r.grounded do
          Enum.any?(list, fn o ->
            o.slot != r.slot and not o.crashed and o.s - r.s > 1.2 and o.s - r.s < 6.5 and
              abs(o.lat - r.lat) < 1.1 and o.vs > 6
          end)
        else
          false
        end

      draft = clamp(r.draft_t + (if tow, do: @dt / 0.5, else: -@dt / 0.4), 0.0, 1.0)
      Map.put(acc, r.slot, %{r | draft_t: draft})
    end)
  end

  def finish_rider(r, elapsed) do
    %{r |
      finished: true,
      finish_time: elapsed,
      revenge_t: 0.0,
      crashed: false,
      trick: nil,
      pending_meter: 0.0,
      pending_names: []
    }
  end

  # --- helpers ---------------------------------------------------------------

  defp truthy(nil), do: false
  defp truthy(false), do: false
  defp truthy(0), do: false
  defp truthy(_), do: true

  defp clamp(v, a, b), do: if(v < a, do: a, else: if(v > b, do: b, else: v))
  defp sign(v), do: if(v < 0, do: -1, else: (if(v > 0, do: 1, else: 0)))
end
