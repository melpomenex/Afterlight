defmodule Afterlight.Activities.DownhillMayhem.AI do
  @moduledoc """
  Server-owned Downhill Mayhem AI
  (integrate-multiplayer-downhill-mayhem-arcade 8.3).

  Server-only control generation: a racing line with corner braking, obstacle
  avoidance, situational boost, ramp hops/tricks, rubber-banding against a
  reference human, revenge hunting after being decked, and combat expressed as
  `punch`/`kick` control edges (the shared physics resolves the actual hit).
  Randomness uses the BEAM process-local `:rand` state, seeded deterministically
  by the session, so a match is reproducible.
  """

  alias Afterlight.Activities.DownhillMayhem
  alias Afterlight.Activities.DownhillMayhem.Course

  @g 11.5
  @finish_s 2300.0

  defp clamp(v, a, b), do: if(v < a, do: a, else: if(v > b, do: b, else: v))
  defp rnd, do: :rand.uniform()
  defp sign(v), do: if(v < 0, do: -1, else: if(v > 0, do: 1, else: 0))

  def predict_air_remaining(course, r) do
    Enum.reduce(0..2, 0.3, fn _k, t ->
      h = r.y - Course.height_at(course, r.s + r.vs * t, r.lat)
      (r.vy + :math.sqrt(max(0.01, r.vy * r.vy + 2 * @g * max(0.1, h)))) / @g
    end)
  end

  def ramp_ahead_for(course, r) do
    Enum.any?(course.ramps, fn rp ->
      d = rp["s0"] - r.s
      d > 3 and d < 32 and abs((rp["latC"] || 0) - r.lat) < (rp["halfW"] || 6) + 2.5
    end)
  end

  defp ai_boost_want(course, r, max_v, c_ahead, hunt) do
    cond do
      r.inp.brake == 1 or not r.grounded or r.vs >= max_v * 1.02 or r.meter <= 4 -> false
      r.boosting -> r.meter > (if r.s > @finish_s - 400, do: 4, else: 8)
      r.s > @finish_s - 400 -> true
      true ->
        want =
          Enum.min([
            if(hunt, do: 12, else: 999),
            if(ramp_ahead_for(course, r), do: 14, else: 999),
            if(r.draft_t > 0.3, do: 17, else: 999),
            if(r.rubber > 0.4, do: 24, else: 999),
            if(abs(c_ahead) < 0.02, do: 30 + rem(r.slot, 3) * 7, else: 999),
            if(r.meter > 76, do: r.meter, else: 999)
          ])

        r.meter >= want
    end
  end

  @doc "Return a control map for one AI rider this tick."
  def control(course, r, ctx) do
    diff = DownhillMayhem.diff(Map.get(ctx, :difficulty, "mayhem"))
    riders = Map.values(Map.get(ctx, :riders, %{}))
    reference = Map.get(ctx, :reference) || List.first(riders) || r
    dt = Map.get(ctx, :dt, 1 / 30)
    elapsed = Map.get(ctx, :elapsed, 0.0)
    control = DownhillMayhem.neutral_controls()

    cond do
      r.finished -> %{control | brake: 1}
      r.react_t > 0 -> control
      r.crashed -> control
      true -> think(course, r, ctx, diff, riders, reference, dt, elapsed)
    end
  end

  defp think(course, r, _ctx, diff, riders, reference, dt, elapsed) do
    gap = reference.s - r.s
    rubber = if gap >= 0, do: clamp(gap / diff.rub_sat, 0.0, 1.0) * diff.rub_p, else: clamp(gap / 160, -1.0, 0.0) * diff.leash
    r = %{r | rubber: rubber}

    r =
      if r.revenge_t > 0 do
        if reference.finished or r.s > @finish_s - 100, do: %{r | revenge_t: 0.0}, else: %{r | revenge_t: r.revenge_t - dt}
      else
        r
      end

    hunting = r.revenge_t > 0
    r = if hunting and gap > 0, do: %{r | rubber: max(r.rubber, min(0.5 * diff.rev, 1.0))}, else: r

    look = 16 + r.vs * 0.9
    c_ahead = Course.sample_track(course, r.s + look).curv
    max_v = :math.sqrt((diff.corner + r.rubber * 2.6) * r.def.corner / max(abs(c_ahead), 0.0004))

    braking = r.vs > max_v * 1.06
    control = %{DownhillMayhem.neutral_controls() | brake: if(braking, do: 1, else: 0), pedal: if(braking, do: 0, else: 1)}

    target =
      cond do
        hunting -> reference.lat
        true ->
          base = clamp(-c_ahead * 260, -3.3, 3.3) + r.line_bias + :math.sin(elapsed * r.wf + r.phase) * r.wamp * max(0, 1 - r.rubber * 1.6)

          base =
            Enum.reduce(riders, base, fn o, acc ->
              ds = o.s - r.s
              cond do
                o.slot == r.slot -> acc
                ds > 0.5 and ds < 7 and abs(o.lat - r.lat) < 1.6 -> acc + (if r.lat >= o.lat, do: 1.9, else: -1.9)
                ds > -3 and ds < 0.5 and abs(o.lat - r.lat) < 1.5 and (o.windup_t >= 0 or (o.is_human and r.punch_cd > 0.4)) -> acc + (if r.lat >= o.lat, do: 2.2, else: -2.2)
                true -> acc
              end
            end)

          base
      end

    target = avoid_obstacles(course, r, target)
    target = clamp(target, -7.2, 7.2)
    desired_vlat = clamp((target - r.lat) * (if hunting, do: 2.4, else: 1.8), -6.0, 6.0)
    control = %{control | steer: clamp((desired_vlat - r.vlat) * 0.45, -1.0, 1.0)}

    control =
      if Map.get(diff, :hunt_race, false) and hunting do
        if ai_boost_want(course, r, max_v, c_ahead, true), do: %{control | boost: true}, else: control
      else
        if ai_boost_want(course, r, max_v, c_ahead, hunting), do: %{control | boost: true}, else: control
      end

    {r, control} = jump_and_tricks(course, r, control, hunting, dt)
    combat(r, control, diff, riders, reference, elapsed)
  end

  defp avoid_obstacles(course, r, target) do
    b0 = trunc(Float.floor(r.s / 10))

    obs =
      Enum.flat_map(b0..(b0 + 4), fn bi -> Map.get(course.collider_buckets, bi, []) end)
      |> Enum.filter(&(&1["s"] - r.s > 2 and &1["s"] - r.s < 34))

    blockers = Enum.filter(obs, &(abs(&1["lat"] - target) < 1.55))

    if obs != [] and blockers != [] do
      lo = blockers |> Enum.map(& &1["lat"]) |> Enum.min()
      hi = blockers |> Enum.map(& &1["lat"]) |> Enum.max()
      clear_of = fn lat -> Enum.all?(obs, &(abs(&1["lat"] - lat) >= 1.55)) end
      cand = Enum.filter([lo - 2.1, hi + 2.1], fn c -> clear_of.(c) and abs(c) <= 7.2 end)

      cand =
        if cand == [] do
          [Enum.min(Enum.map(obs, & &1["lat"])) - 2.1, Enum.max(Enum.map(obs, & &1["lat"])) + 2.1]
        else
          cand
        end

      Enum.min_by(cand, &abs(&1 - r.lat))
    else
      target
    end
  end

  defp jump_and_tricks(course, r, control, hunting, dt) do
    cond do
      r.grounded ->
        r = %{r | trick_rolled: false}
        ramph = Course.ramp_height_at(course, r.s, r.lat)

        if ramph > 0.05 and r.def.trick > 0.4 and not hunting do
          on_lip =
            Enum.any?(course.ramps, fn rp ->
              r.s >= rp["s0"] and r.s <= rp["s0"] + rp["len"] and (r.s - rp["s0"]) / rp["len"] > 0.72
            end)

          if on_lip, do: {r, %{control | hop: rnd() < dt * (1.2 + r.def.trick * 2.4)}}, else: {r, control}
        else
          {r, control}
        end

      r.trick == nil and not r.trick_rolled and r.air_time > 0.24 and not hunting ->
        r = %{r | trick_rolled: true}
        rem_t = predict_air_remaining(course, r) - (0.12 - r.def.crashy * 0.05)
        tricks = DownhillMayhem.tricks()

        if rem_t > tricks["nohander"].dur and rnd() < 0.36 + r.def.trick * 0.58 do
          menu =
            cond do
              r.def.trick > 0.7 -> ["heel", "backflip", "superman", "nohander"]
              r.def.trick > 0.45 -> ["superman", "backflip", "nohander"]
              true -> ["nohander", "superman"]
            end

          pick = Enum.find(menu, fn k -> tricks[k].dur < rem_t end)
          if pick, do: {%{r | trick: pick, trick_t: 0.0}, control}, else: {r, control}
        else
          {r, control}
        end

      true ->
        {r, control}
    end
  end

  # Combat as control edges: the shared physics performs the strike, cooldown and
  # grudge/revenge bookkeeping, so AI and humans share one resolution path.
  defp combat(r, control, diff, riders, reference, elapsed) do
    cond do
      r.punch_cd > 0 -> control
      not r.grounded -> control
      r.revenge_t > 0 ->
        if in_reach?(reference, r) and not reference.crashed and reference.invuln <= 0 and not reference.finished do
          kind = if rnd() < 0.5, do: :kick, else: :punch
          Map.put(control, kind, true)
        else
          control
        end

      true ->
        target =
          Enum.find(riders, fn o ->
            o.slot != r.slot and not o.crashed and o.invuln <= 0 and not o.finished and in_reach?(o, r)
          end)

        roll = r.def.aggr * (if target, do: (if target.is_human, do: (if r.grudge, do: 4, else: 2.6), else: 0.45 * (1 - r.rubber)), else: 0) * diff.aggr * 0.12

        if target != nil and :rand.uniform() < roll and elapsed > 0 do
          kind = if rnd() < 0.45, do: :kick, else: :punch
          Map.put(control, kind, true)
        else
          control
        end
    end
  end

  defp in_reach?(o, r) do
    abs(o.s - r.s) < 2.0 and abs(o.lat - r.lat) < 1.3 and abs(o.y - r.y) < 1.4
  end
end
