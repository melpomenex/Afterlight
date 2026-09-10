defmodule Afterlight.Activities.DownhillMayhem.Daily do
  @moduledoc """
  Server-side Daily course generator
  (integrate-multiplayer-downhill-mayhem-arcade 4.3, design D5).

  A faithful Elixir port of the bounded JS generator in
  `shared/downhill/course.js` (`buildTrack` + `buildColliders` +
  `generateCourseDocument`). The Daily document cannot be precommitted, so the
  SERVER is the sole runtime generator: it bakes the document for the UTC date,
  publishes its hash, and delivers the exact bytes clients race. A client never
  generates the Daily independently.

  The port preserves, in order:

  - every `rng()`/`vr()` draw (the `mulberry32` stream is bit-for-bit),
  - the source's `Float32Array` storage rounding (the `f32/1` cast — profile
    stores, blur passes, centreline integration and drop carving all round to
    float32 exactly as the source arrays do),
  - the source branch order (including the quirk that a Daily whose `YYYYMMDD`
    seed equals a crafted mountain's seed builds that mountain).

  Golden fixtures (`test/fixtures/downhill/daily_*.json`) pin representative
  seeds against the JS oracle: structural lists exactly equal, the physics
  arrays (`cy`, `ccurv`, `cgrade`) exactly equal, and render-only arrays
  (`cx`, `cz`, `ch`) within tolerance (they depend on `sin`/`cos`, the one
  libm-boundary surface).

  The canonical-form hash is Elixir-canonical (sorted keys, no whitespace,
  shortest-round-trip floats); it only ever needs to be self-consistent, since
  the server both generates the document and validates client-echoed hashes.
  """

  import Bitwise

  alias Afterlight.Activities.DownhillMayhem.Course

  @ds 2
  @s_min -80
  @s_max 2_520
  @finish_s 2_300
  @half_w 8
  @ride_w 26
  @lat_clamp 27.5
  @nsamp div(@s_max - @s_min, @ds) + 1
  @start_lats [1.25, -6.25, -3.75, -1.25, 3.75, 6.25]
  @course_version 1
  @rules_version 1

  # Source MOUNTAINS seeds (classic/timber/rock). A Daily date that lands on
  # one builds that mountain's knobs, exactly like the source's
  # `Object.values(MOUNTAINS).find(t => t.seed === seed)` lookup.
  @seed_classic 20_030_723
  @seed_timber 19_770_527
  @seed_rock 19_930_211

  # --- public API -------------------------------------------------------------

  @doc "The UTC-date seed the source `dailySeed()` uses."
  def seed_for_date(%Date{} = date),
    do: date.year * 10_000 + date.month * 100 + date.day

  @doc """
  Generate the canonical Daily document for `seed` (a `YYYYMMDD` integer, or
  any seed for fixture generation). Deterministic: the same seed always bakes
  the same document.
  """
  def generate_document(seed) when is_integer(seed) do
    built = build_track(seed)

    colliders =
      build_colliders(%{
        seed: seed,
        tree_d: built.tree_d,
        rock_d: built.rock_d,
        ramps: built.ramps,
        drops: built.drops,
        ccurv: built.ccurv
      })

    doc = %{
      "id" => "daily",
      "version" => @course_version,
      "rulesVersion" => @rules_version,
      "mountain" => "daily",
      "seed" => seed,
      "ds" => @ds,
      "sMin" => @s_min,
      "sMax" => @s_max,
      "finishS" => @finish_s,
      "halfW" => @half_w,
      "rideW" => @ride_w,
      "latClamp" => @lat_clamp,
      "knobs" => %{
        "twist" => built.v.twist,
        "rhythm" => built.v.rhythm,
        "chute" => built.v.chute,
        "cold" => built.cold_edge,
        "warm" => built.warm_edge,
        "trees" => q6(built.tree_d),
        "rocks" => q6(built.rock_d)
      },
      "startLats" => @start_lats,
      "cgrade" => built.cgrade,
      "ccurv" => built.ccurv,
      "cy" => built.cy,
      "cx" => Enum.map(built.cx, &q6/1),
      "cz" => Enum.map(built.cz, &q6/1),
      "ch" => Enum.map(built.ch, &q6/1),
      "ramps" =>
        Enum.map(built.ramps, fn r ->
          %{"s0" => r.s0, "len" => r.len, "h" => r.h, "latC" => r.latC, "halfW" => r.halfW}
        end),
      "drops" => Enum.map(built.drops, fn d -> %{"s0" => d.s0, "depth" => d.depth} end),
      "colliders" =>
        Enum.map(colliders, fn c ->
          %{"kind" => c.kind, "s" => q6(c.s), "lat" => q6(c.lat), "r" => q6(c.r)}
        end)
    }

    Map.put(doc, "hash", canonical_sha256(doc))
  end

  @doc """
  The current UTC day's course, cached in `:persistent_term` until the date
  rolls over (design D5's UTC-midnight cache). Returns a loaded
  `DownhillMayhem.Course` struct.

  A single slot holds `{date, course}`: the UTC date is re-checked on every
  call, so crossing midnight replaces the cached document instead of
  accumulating one permanent entry per day.
  """
  def daily do
    date = Date.utc_today()
    key = {__MODULE__, :daily_course}

    case :persistent_term.get(key, :missing) do
      {^date, %Course{} = course} ->
        course

      _stale_or_missing ->
        course = date |> seed_for_date() |> generate_document() |> Course.load_any()
        :persistent_term.put(key, {date, course})
        course
    end
  end

  # --- buildTrack port ----------------------------------------------------------

  defp build_track(seed) do
    rng0 = u32(seed)
    noff = rem(seed, 977) * 13.7
    vr0 = u32(bxor(seed, 0x9E3779))

    {v, cold_edge, warm_edge, tree_d, rock_d} = track_knobs(seed, vr0)

    # Curvature profile: the segment closure carries lastTurn/wasTurn/hEst
    # state, and the initial lastTurn draw happens before any segment.
    {r_lt, rng} = rng_next(u32(seed))
    last_turn0 = if r_lt < 0.5, do: 1, else: -1

    curv_seg = fn s, {last_turn, was_turn, h_est}, rng ->
      cond do
        s < -20 ->
          {60.0, 0.0, {last_turn, was_turn, h_est}, rng}

        was_turn or s < 40 ->
          {r_len, rng} = rng_next(rng)
          {r_val, rng} = rng_next(rng)
          {(50 + r_len * 80) * v.rhythm, (r_val * 2 - 1) * 0.0008, {last_turn, false, h_est}, rng}

        true ->
          {dir, rng} =
            if abs(h_est) > 0.9 do
              {-js_sign(h_est), rng}
            else
              {r_dir, rng} = rng_next(rng)
              {if(r_dir < 0.72, do: -last_turn, else: last_turn), rng}
            end

          {r_mag, rng} = rng_next(rng)
          {r_len, rng} = rng_next(rng)
          mag = (0.0045 + r_mag * 0.004) * v.twist
          len = (80 + r_len * 110) * v.rhythm
          h_est2 = h_est + dir * mag * len
          {len, dir * mag, {dir, true, h_est2}, rng}
      end
    end

    {rng, _, curv} = build_profile(rng, {last_turn0, false, 0.0}, curv_seg)

    grade_seg = fn s, :ok, rng ->
      cond do
        s < 30 ->
          {110.0, -0.08, :ok, rng}

        s > @finish_s - 60 ->
          {400.0, -0.06, :ok, rng}

        true ->
          {r, rng} = rng_next(rng)

          cond do
            r < 0.10 ->
              {r_len, rng} = rng_next(rng)
              {r_val, rng} = rng_next(rng)
              {25 + r_len * 20, -0.04 - r_val * 0.03, :ok, rng}

            r < 0.34 ->
              {r_len, rng} = rng_next(rng)
              {r_val, rng} = rng_next(rng)
              {55 + r_len * 45, (-0.26 - r_val * 0.09) * v.chute, :ok, rng}

            true ->
              {r_len, rng} = rng_next(rng)
              {r_val, rng} = rng_next(rng)
              {80 + r_len * 70, (-0.11 - r_val * 0.08) * v.chute, :ok, rng}
          end
      end
    end

    {rng, _, grade} = build_profile(rng, :ok, grade_seg)

    curv = blur(curv, 7, 2)
    grade = blur(grade, 7, 2)
    curv_t = List.to_tuple(curv)
    grade_t = List.to_tuple(grade)

    # Centreline integration (Float32Array stores round each sample).
    {cx, cz, cy, ch, ccurv, cgrade} = integrate(curv_t, grade_t)

    # Drops carve the centreline height.
    {rng, drops_rev} =
      Enum.reduce(1..v.drop_n, {rng, []}, fn k, {rng, acc} ->
        {r_s, rng} = rng_next(rng)
        {r_d, rng} = rng_next(rng)
        s0 = 420 + (k - 1) * (1560 / v.drop_n) + r_s * 150
        depth = 2.4 + r_d * 1.0
        {rng, [%{s0: s0, depth: depth} | acc]}
      end)

    drops = Enum.reverse(drops_rev)
    cy = Enum.reduce(drops, cy, fn d, acc -> carve_drop(acc, d.s0, d.depth) end)
    cy_t = List.to_tuple(cy)

    # Ramps sit on the flattest clear stretch inside each window.
    {rng, ramps_rev} = place_ramps(rng, 170.0, [], v, curv_t, drops)
    ramps = Enum.sort_by(Enum.reverse(ramps_rev), & &1.s0)

    %{
      v: v,
      cold_edge: cold_edge,
      warm_edge: warm_edge,
      tree_d: tree_d,
      rock_d: rock_d,
      noff: noff,
      cx: cx,
      cz: cz,
      cy: cy_t |> Tuple.to_list(),
      ch: ch,
      ccurv: ccurv,
      cgrade: cgrade,
      ramps: ramps,
      drops: drops
    }
  end

  # Source knob selection: crafted mountains match by seed (classic has no v
  # row and keeps default knobs with zero vr draws); everything else — the
  # Daily — draws its knobs from the vr stream in source order.
  defp track_knobs(seed, vr0) do
    case seed do
      @seed_classic ->
        {%{twist: 1.0, rhythm: 1.0, chute: 1.0, drop_n: 4, ramp_n: 12}, 0.32, 0.68, 1.0, 0.0}

      @seed_timber ->
        {%{twist: 1.18, rhythm: 0.78, chute: 0.92, drop_n: 3, ramp_n: 12}, 0.12, 0.9, 1.8, 0.0}

      @seed_rock ->
        {%{twist: 0.82, rhythm: 1.22, chute: 1.16, drop_n: 6, ramp_n: 8}, 0.14, 0.52, 0.35, 1.0}

      _other ->
        {r_tw, vr} = rng_next(vr0)
        {r_rh, vr} = rng_next(vr)
        {r_ch, vr} = rng_next(vr)
        {r_dn, vr} = rng_next(vr)
        {r_rn, vr} = rng_next(vr)
        {r_cold, vr} = rng_next(vr)
        {r_warm, vr} = rng_next(vr)
        {r_tree, vr} = rng_next(vr)
        {r_rock_gate, vr} = rng_next(vr)

        {rock, _vr} =
          if r_rock_gate < 0.35 do
            rng_next(vr)
          else
            {0.0, vr}
          end

        v = %{
          twist: 0.72 + r_tw * 0.75,
          rhythm: 0.68 + r_rh * 0.85,
          chute: 0.85 + r_ch * 0.5,
          drop_n: 2 + trunc(r_dn * 5),
          ramp_n: 7 + trunc(r_rn * 6)
        }

        {v, 0.18 + r_cold * 0.34, 0.55 + r_warm * 0.35, 0.55 + r_tree * 1.1, rock}
    end
  end

  defp build_profile(rng0, seg0, make_seg) do
    do_profile(rng0, seg0, 0, [], make_seg)
  end

  defp do_profile(rng, seg, i, acc, _make) when i >= @nsamp do
    {rng, seg, Enum.reverse(acc)}
  end

  defp do_profile(rng0, seg0, i0, acc, make) do
    s = i0 * @ds + @s_min
    {len, val, seg1, rng1} = make.(s, seg0, rng0)
    n = max(2, js_round(len / @ds))
    {rng2, seg2, i, acc2} = fill_profile(rng1, seg1, n, i0, acc, val)
    do_profile(rng2, seg2, i, acc2, make)
  end

  defp fill_profile(rng, seg, k, i, acc, _val) when k <= 0, do: {rng, seg, i, acc}

  defp fill_profile(rng, seg, k, i, acc, val) when i < @nsamp do
    fill_profile(rng, seg, k - 1, i + 1, [f32(val) | acc], val)
  end

  defp fill_profile(rng, seg, _k, i, acc, _val), do: {rng, seg, i, acc}

  defp blur(arr, _win, 0), do: arr

  defp blur(arr, win, passes) do
    src = List.to_tuple(arr)

    blurred =
      for i <- 0..(@nsamp - 1) do
        {sum, c} =
          Enum.reduce(-win..win, {0.0, 0}, fn k, {sum, c} ->
            j = i + k

            if j >= 0 and j < @nsamp do
              {sum + elem(src, j), c + 1}
            else
              {sum, c}
            end
          end)

        f32(sum / c)
      end

    blur(blurred, win, passes - 1)
  end

  defp integrate(curv_t, grade_t) do
    do_integrate(curv_t, grade_t, 0, 0.0, 0.0, 0.0, 0.0, [], [], [], [], [], [])
  end

  defp do_integrate(curv_t, grade_t, i, x, z, y, h, cx, cz, cy, ch, ccurv, cgrade)
       when i < @nsamp do
    s = @s_min + i * @ds
    g = elem(grade_t, i)

    cg =
      if s > @finish_s do
        lerp(g, 0.03, smoothstep((s - @finish_s) / 70))
      else
        g
      end

    c = elem(curv_t, i)

    # Store the sample (Float32Array rounding), then advance the accumulators
    # in source order: h, then x/z/y.
    do_integrate(
      curv_t,
      grade_t,
      i + 1,
      x + :math.sin(h + c * @ds) * @ds,
      z + :math.cos(h + c * @ds) * @ds,
      y + cg * @ds,
      h + c * @ds,
      [f32(x) | cx],
      [f32(z) | cz],
      [f32(y) | cy],
      [f32(h) | ch],
      [c | ccurv],
      [f32(cg) | cgrade]
    )
  end

  defp do_integrate(_curv_t, _grade_t, _i, _x, _z, _y, _h, cx, cz, cy, ch, ccurv, cgrade) do
    {Enum.reverse(cx), Enum.reverse(cz), Enum.reverse(cy), Enum.reverse(ch), Enum.reverse(ccurv),
     Enum.reverse(cgrade)}
  end

  defp carve_drop(cy, s0, depth) do
    cy
    |> Enum.with_index()
    |> Enum.map(fn {y, i} ->
      s = @s_min + i * @ds
      f32(y - depth * smoothstep((s - s0) / 4))
    end)
  end

  defp place_ramps(rng, s_try, acc, v, curv_t, drops)
       when s_try < 2200 and length(acc) < v.ramp_n do
    best = best_ramp_window(curv_t, drops, acc, -55, s_try, nil)

    {rng, acc} =
      if best != nil and best.c < 0.0062 do
        {r_full, rng} = rng_next(rng)
        full = r_full < 0.4
        {r_len, rng} = rng_next(rng)
        {r_h, rng} = rng_next(rng)
        len = 9 + r_len * 4
        h = 1.25 + r_h * 1.0

        {lat_c, half_w, rng} =
          if full do
            {0.0, 8.5, rng}
          else
            {r_lat, rng} = rng_next(rng)
            {r_hw, rng} = rng_next(rng)
            {(r_lat * 2 - 1) * 3.2, 3.4 + r_hw * 2.6, rng}
          end

        {rng, [%{s0: best.s, len: len, h: h, latC: lat_c, halfW: half_w} | acc]}
      else
        {rng, acc}
      end

    {r, rng} = rng_next(rng)
    place_ramps(rng, s_try + 140 + r * 55, acc, v, curv_t, drops)
  end

  defp place_ramps(rng, _s_try, acc, _v, _curv_t, _drops), do: {rng, acc}

  defp best_ramp_window(_curv_t, _drops, _ramps, d, _s_try, best) when d > 55, do: best

  defp best_ramp_window(curv_t, drops, ramps, d, s_try, best) do
    s = s_try + d

    if s < 150 or s > 2200 do
      best_ramp_window(curv_t, drops, ramps, d + 6, s_try, best)
    else
      c = abs(sample_curv_t(curv_t, s))
      near_drop = Enum.any?(drops, fn dr -> abs(dr.s0 - s) < 70 end)
      near_ramp = Enum.any?(ramps, fn rp -> abs(rp.s0 - s) < 110 end)

      best2 =
        if not near_drop and not near_ramp and (best == nil or c < best.c) do
          %{s: s, c: c}
        else
          best
        end

      best_ramp_window(curv_t, drops, ramps, d + 6, s_try, best2)
    end
  end

  defp sample_curv_t(ccurv_t, s) do
    f = clamp((s - @s_min) / @ds, 0, @nsamp - 1.001)
    i = trunc(Float.floor(f))
    t = f - i
    lerp(elem(ccurv_t, i), elem(ccurv_t, i + 1), t)
  end

  # --- buildColliders port ------------------------------------------------------

  defp build_colliders(%{
         seed: seed,
         tree_d: tree_d,
         rock_d: rock_d,
         ramps: ramps,
         drops: drops,
         ccurv: ccurv
       }) do
    rng0 = u32(seed + 31)
    ccurv_t = List.to_tuple(ccurv)

    # Slalom trees on the racing line.
    {rng, slalom} = slalom_trees(rng0, 200.0, tree_d, ramps, drops, ccurv_t, [])

    # Rock gardens (boulders on the line).
    {rng, rocks} =
      if rock_d > 0 do
        rock_gardens(rng, max(230.0, @finish_s * 0.32 + 40), rock_d, ramps, drops, ccurv_t, [])
      else
        {rng, []}
      end

    # Scattered trees on the open hillside + forest on the slopes.
    {rng, scattered} = scattered_trees(rng, 60.0, tree_d, [])

    # Boulders outside the corridor (draws preserved, never colliders).
    {_rng, _} = hillside_boulders(rng, 40.0, [])

    (slalom ++ rocks ++ scattered)
    |> Enum.sort_by(&{&1.s, &1.lat})
  end

  defp slalom_trees(rng, s, tree_d, ramps, drops, ccurv_t, acc) when s < @finish_s - 80 do
    {r_s, rng} = rng_next(rng)
    s_t = s + r_s * 30

    near_feature =
      Enum.any?(ramps, fn r -> s_t > r.s0 - 30 and s_t < r.s0 + r.len + 45 end) or
        Enum.any?(drops, fn d -> abs(d.s0 - s_t) < 45 end)

    {rng, acc} =
      if near_feature do
        {rng, acc}
      else
        {r_lat, rng} = rng_next(rng)
        lat = (r_lat * 2 - 1) * 6.2
        {rng, _fol} = pick_fol(rng)
        add_tree(rng, s_t, lat, acc)
      end

    {r, rng} = rng_next(rng)
    slalom_trees(rng, s + (130 + r * 90) / max(tree_d, 0.05), tree_d, ramps, drops, ccurv_t, acc)
  end

  defp slalom_trees(rng, _s, _tree_d, _ramps, _drops, _ccurv_t, acc), do: {rng, acc}

  defp rock_gardens(rng, s, rock_d, ramps, drops, ccurv_t, acc) when s < @finish_s - 110 do
    {rng, s0} = rock_find_spot(rng, s, 0, ramps, drops, ccurv_t)

    {rng, acc} =
      if s0 < 0 do
        {rng, acc}
      else
        {r_lat, rng} = rng_next(rng)
        c_lat = (r_lat * 2 - 1) * 4.6
        {r_n, rng} = rng_next(rng)
        n = 2 + trunc(r_n * 3.2)
        rock_row(rng, s0, 0, n, c_lat, ramps, drops, ccurv_t, acc)
      end

    {r, rng} = rng_next(rng)
    rock_gardens(rng, s + (88 + r * 70) / rock_d, rock_d, ramps, drops, ccurv_t, acc)
  end

  defp rock_gardens(rng, _s, _rock_d, _ramps, _drops, _ccurv_t, acc), do: {rng, acc}

  defp rock_find_spot(rng, _s, t, _ramps, _drops, _ccurv_t) when t >= 6, do: {rng, -1}

  defp rock_find_spot(rng, s, t, ramps, drops, ccurv_t) do
    {r, rng} = rng_next(rng)
    c = s + r * 26 + t * 34

    if c < @finish_s - 80 and rock_clear?(c, ramps, drops, ccurv_t) and
         rock_clear?(c + 17, ramps, drops, ccurv_t) do
      {rng, c}
    else
      rock_find_spot(rng, s, t + 1, ramps, drops, ccurv_t)
    end
  end

  defp rock_row(rng, _s0, i, n, _c_lat, _ramps, _drops, _ccurv_t, acc) when i >= n, do: {rng, acc}

  defp rock_row(rng, s0, i, n, c_lat, ramps, drops, ccurv_t, acc) do
    {r_t, rng} = rng_next(rng)
    s_t = s0 + i * (3.5 + r_t * 4)

    {rng, acc} =
      if rock_clear?(s_t, ramps, drops, ccurv_t) do
        {r_lat, rng} = rng_next(rng)
        lat = clamp(c_lat + (r_lat * 2 - 1) * 2.4, -6.6, 6.6)
        {r_sc, rng} = rng_next(rng)
        sc = 0.65 + r_sc * 0.55

        # rock rotation x/y/z
        {_, rng} = rng_next(rng)
        {_, rng} = rng_next(rng)
        {_, rng} = rng_next(rng)

        # scale x/z
        {_, rng} = rng_next(rng)
        {_, rng} = rng_next(rng)

        {rng, [%{kind: "rock", s: s_t, lat: lat, r: 0.8 * sc} | acc]}
      else
        {rng, acc}
      end

    rock_row(rng, s0, i + 1, n, c_lat, ramps, drops, ccurv_t, acc)
  end

  defp rock_clear?(s_t, ramps, drops, ccurv_t) do
    not (Enum.any?(ramps, fn r -> s_t > r.s0 - 26 and s_t < r.s0 + r.len + 45 end) or
           Enum.any?(drops, fn d -> s_t > d.s0 - 18 and s_t < d.s0 + 50 end)) and
      abs(sample_curv_t(ccurv_t, s_t)) < 0.010
  end

  defp scattered_trees(rng, s, tree_d, acc) when s < @s_max - 40 do
    {r_main, rng} = rng_next(rng)

    {rng, acc} =
      if r_main < min(0.4 * tree_d, 0.85) do
        {r_side, rng} = rng_next(rng)
        side = if r_side < 0.5, do: 1, else: -1
        {r_s, rng} = rng_next(rng)
        s_t = s + r_s * 4
        {r_lat, rng} = rng_next(rng)
        lat = side * (9.5 + r_lat * 15.5)
        {rng, _fol} = pick_fol(rng)
        add_tree(rng, s_t, lat, acc)
      else
        {rng, acc}
      end

    {rng, acc} = scattered_k(rng, tree_d, s, acc)
    {rng, acc} = scattered_k(rng, tree_d, s, acc)

    {r, rng} = rng_next(rng)
    scattered_trees(rng, s + 8 + r * 10, tree_d, acc)
  end

  defp scattered_trees(rng, _s, _tree_d, acc), do: {rng, acc}

  defp scattered_k(rng, tree_d, s, acc) do
    {r_gate, rng} = rng_next(rng)

    if r_gate < min(0.8 * max(tree_d, 0.45), 0.95) do
      {r_side, rng} = rng_next(rng)
      side = if r_side < 0.5, do: 1, else: -1
      {r_s, rng} = rng_next(rng)
      s_t = s + r_s * 8
      {r_lat, rng} = rng_next(rng)
      lat = side * (28 + r_lat * 36)
      {rng, _fol} = pick_fol(rng)
      add_tree(rng, s_t, lat, acc)
    else
      {rng, acc}
    end
  end

  defp hillside_boulders(rng, s, acc) when s < @s_max - 40 do
    # side, lat, scale, rotation x/y/z, scale x/z, rocks1/rocks2 pick
    draws = 8
    {rng, _} = draw_n(rng, draws, [])
    {r, rng} = rng_next(rng)
    hillside_boulders(rng, s + 26 + r * 34, acc)
  end

  defp hillside_boulders(rng, _s, acc), do: {rng, acc}

  defp draw_n(rng, 0, acc), do: {rng, Enum.reverse(acc)}

  defp draw_n(rng, n, acc) do
    {v, rng} = rng_next(rng)
    draw_n(rng, n - 1, [v | acc])
  end

  defp add_tree(rng, s, lat, acc) do
    {r_sc, rng} = rng_next(rng)
    sc = 0.75 + r_sc * 0.7
    # yaw
    {_, rng} = rng_next(rng)

    if abs(lat) < @ride_w + 1 do
      {rng, [%{kind: "tree", s: s, lat: lat, r: 0.75 * sc} | acc]}
    else
      {rng, acc}
    end
  end

  # One cosmetic draw (foliage kind); only the draw order matters.
  defp pick_fol(rng) do
    {v, rng} = rng_next(rng)
    {rng, v}
  end

  # --- deterministic primitives (bit-for-bit with shared/downhill/course.js) -----

  defp rng_next(a0) do
    a = to_i32(a0)
    a = to_i32(a + 0x6D2B79F5)
    t = imul32(bxor(a, ushr(a, 15)), bor(1, a))
    t = bxor(to_i32(t + imul32(bxor(t, ushr(t, 7)), bor(61, t))), t)
    {u32(bxor(t, ushr(t, 14))) / 4_294_967_296.0, a}
  end

  defp imul32(a, b), do: to_i32(a * b)

  defp to_i32(n) do
    n = band(n, 0xFFFFFFFF)
    if n >= 0x80000000, do: n - 0x100000000, else: n
  end

  defp u32(n), do: band(n, 0xFFFFFFFF)

  # JS `>>>`: logical (zero-filling) right shift on the u32 view.
  defp ushr(n, bits), do: bsr(u32(n), bits)

  defp js_sign(x) when x > 0.0, do: 1
  defp js_sign(x) when x < 0.0, do: -1
  defp js_sign(_x), do: 0

  defp clamp(v, a, b), do: if(v < a, do: a, else: if(v > b, do: b, else: v))
  defp lerp(a, b, t), do: a + (b - a) * t

  defp smoothstep(t0) do
    t = clamp(t0, 0.0, 1.0)
    t * t * (3 - 2 * t)
  end

  # JS Math.round: round half toward +Infinity.
  defp js_round(x), do: trunc(Float.floor(x + 0.5))

  defp q6(v) do
    v = js_round(v * 1_000_000.0) / 1_000_000.0
    if v == 0.0, do: 0.0, else: v
  end

  # JS Float32Array store: round a double to the nearest float32.
  defp f32(v) do
    <<r::float-size(32)>> = <<v::float-size(32)>>
    r
  end

  # --- canonical hash -----------------------------------------------------------

  defp canonical_sha256(doc) do
    :crypto.hash(:sha256, canonical_json(doc)) |> Base.encode16(case: :lower)
  end

  defp canonical_json(v) when is_binary(v), do: Jason.encode!(v)
  defp canonical_json(v) when is_integer(v), do: Integer.to_string(v)
  defp canonical_json(v) when is_float(v), do: float_json(v)
  defp canonical_json(true), do: "true"
  defp canonical_json(false), do: "false"
  defp canonical_json(nil), do: "null"

  defp canonical_json(v) when is_list(v),
    do: "[#{v |> Enum.map(&canonical_json/1) |> Enum.join(",")}]"

  defp canonical_json(v) when is_map(v) do
    entries =
      v
      |> Enum.sort_by(fn {k, _} -> k end)
      |> Enum.map(fn {k, value} -> "#{Jason.encode!(to_string(k))}:#{canonical_json(value)}" end)
      |> Enum.join(",")

    "{#{entries}}"
  end

  # Shortest round-trip float, JS-number-shaped (integral floats keep no ".0").
  defp float_json(v) do
    if v == Float.floor(v) and abs(v) < 1.0e15 do
      Integer.to_string(trunc(v))
    else
      String.replace(:erlang.float_to_binary(v, [:short]), ".0e", "e")
    end
  end
end
