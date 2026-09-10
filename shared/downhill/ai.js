/**
 * Downhill Mayhem deterministic AI (integrate-multiplayer-downhill-mayhem-arcade
 * 3.2/3.4). Faithful extraction of the frozen source `aiThink`/`aiBoostWant`/
 * `predictAirRemaining`/`rampAheadFor` from
 * `games/downhill-mayhem/standalone.html`.
 *
 * The source used `Math.random()` for AI decisions; every one of those draws is
 * replaced by `ctx.rng()`, a deterministic per-match stream, so the authority
 * and its replay fixtures are reproducible. AI produce the same control shape a
 * human produces and are stepped by the same `stepRider` physics.
 *
 * `aiControl(course, rider, ctx)` returns a control object and may mutate the
 * rider's windup/cooldown state and emit strike events through `ctx.events`.
 */

import { clamp, FINISH_S } from './course.js';
import {
  G, DIFFS, TRICKS, PUNCH_S, PUNCH_LAT, PUNCH_DY,
  startTrick, tryStrike,
} from './rules.js';

export function predictAirRemaining(course, r) {
  let t = 0.3;
  for (let k = 0; k < 3; k++) {
    const h = r.y - course.heightAt(r.s + r.vs * t, r.lat);
    t = (r.vy + Math.sqrt(Math.max(0.01, r.vy * r.vy + 2 * G * Math.max(0.1, h)))) / G;
  }
  return t;
}

export function rampAheadFor(course, r) {
  for (const rp of course.ramps) {
    const d = rp.s0 - r.s;
    if (d > 3 && d < 32 && Math.abs((rp.latC || 0) - r.lat) < (rp.halfW || 6) + 2.5) return true;
  }
  return false;
}

export function aiBoostWant(course, r, maxV, cAhead, hunt) {
  const inp = r.inp;
  if (inp.brake || !r.grounded || r.vs >= maxV * 1.02 || r.meter <= 4) return false;
  const finalKick = r.s > FINISH_S - 400;
  if (r.boosting) return r.meter > (finalKick ? 4 : 8);
  if (finalKick) return true;
  let want = 999;
  if (hunt) want = Math.min(want, 12);
  if (rampAheadFor(course, r)) want = Math.min(want, 14);
  if (r.draftT > 0.3) want = Math.min(want, 17);
  if (r.rubber > 0.4) want = Math.min(want, 24);
  if (Math.abs(cAhead) < 0.02) want = Math.min(want, 30 + (r.slot % 3) * 7);
  if (r.meter > 76) want = Math.min(want, r.meter);
  return r.meter >= want;
}

/**
 * Generate one AI rider's control for this tick. `ctx` carries the field and
 * deterministic environment:
 *   { riders, difficulty, elapsed, reference, rng(), events, state, stats }
 */
export function aiControl(course, r, ctx) {
  const DIFF = DIFFS[ctx.difficulty] ?? DIFFS.mayhem;
  const riders = ctx.riders;
  const reference = ctx.reference ?? riders[0];
  const rng = ctx.rng ?? (() => 0.5);
  const dt = ctx.dt ?? (1 / 30);
  const elapsed = ctx.elapsed ?? 0;
  const control = { pedal: 0, brake: 0, steer: 0, hop: false, boost: false, punch: false, kick: false, trick: null };

  if (r.finished) { control.brake = 1; return control; }
  if (r.reactT > 0) { r.reactT -= dt; return control; }
  if (r.crashed) return control;

  // rubber-band vs the reference human.
  const gap = reference.s - r.s;
  r.rubber = gap >= 0 ? clamp(gap / DIFF.rubSat, 0, 1) * DIFF.rubP : clamp(gap / 160, -1, 0) * DIFF.leash;
  // comeback company: keep a struggling reference in sight.
  if (DIFF.company && gap < -70 && elapsed < 120 && (ctx.referenceCrashes ?? 0) < 6 && !r.finished) {
    const ahead = riders.filter((o) => o.isAI && !o.finished && o.s > reference.s);
    if (ahead.length === riders.filter((o) => o.isAI).length) {
      ahead.sort((a, b) => a.s - b.s);
      if (r === ahead[0] || r === ahead[1]) r.rubber = Math.min(r.rubber, -0.28);
    }
  }

  if (r.revengeT > 0) {
    r.revengeT -= dt;
    if (reference.finished || r.s > FINISH_S - 100) r.revengeT = 0;
  }
  const hunting = r.revengeT > 0;
  if (hunting && gap > 0) r.rubber = Math.max(r.rubber, Math.min(0.5 * DIFF.rev, 1.0));

  const look = 16 + r.vs * 0.9;
  const cAhead = course.sampleTrack(r.s + look).curv;
  const maxV = Math.sqrt((DIFF.corner + r.rubber * 2.6) * r.def.corner / Math.max(Math.abs(cAhead), 0.0004));
  control.brake = r.vs > maxV * 1.06 ? 1 : 0;
  control.pedal = control.brake ? 0 : 1;

  let target;
  if (hunting && DIFF.huntRace) {
    if (aiBoostWant(course, r, maxV, cAhead, true)) control.boost = true;
    target = reference.lat;
  } else if (hunting) {
    if (gap > 2.5) {
      const closeV = reference.vs + 1.5 * DIFF.rev + gap * 0.55;
      if (r.vs > closeV) { control.brake = 1; control.pedal = 0; }
      else if (gap > 3 && aiBoostWant(course, r, maxV, cAhead, true)) control.boost = true;
    } else if (gap < -3) { control.pedal = 0; control.brake = 1; }
    else {
      const want = gap > 1.2 ? reference.vs + Math.min(2.8 * DIFF.rev, Math.max(0.8, gap * 1.1)) : reference.vs;
      control.pedal = r.vs < want - 0.4 ? 1 : 0;
      control.brake = r.vs > want + 0.4 ? 1 : 0;
    }
    target = reference.lat;
  } else {
    target = clamp(-cAhead * 260, -3.3, 3.3) + r.lineBias
      + Math.sin(elapsed * r.wf + r.phase) * r.wamp * Math.max(0, 1 - r.rubber * 1.6);
    for (const o of riders) {
      if (o === r) continue;
      const ds = o.s - r.s;
      if (ds > 0.5 && ds < 7 && Math.abs(o.lat - r.lat) < 1.6) target += (r.lat >= o.lat ? 1.9 : -1.9);
    }
    for (const o of riders) {
      if (o === r || o.crashed || o.finished) continue;
      const ds = o.s - r.s;
      if (ds > -3 && ds < 0.5 && Math.abs(o.lat - r.lat) < 1.5 && (o.windupT >= 0 || (o.isHuman && r.punchCd > 0.4))) {
        target += (r.lat >= o.lat ? 2.2 : -2.2);
      }
    }
    if (aiBoostWant(course, r, maxV, cAhead, false)) control.boost = true;
  }

  // obstacle avoidance.
  const b0 = Math.floor(r.s / 10), obs = [];
  for (let bi = b0; bi <= b0 + 4; bi++) {
    const list = course.colliderBuckets.get(bi);
    if (!list) continue;
    for (const t of list) { const ds = t.s - r.s; if (ds > 2 && ds < 34) obs.push(t); }
  }
  if (obs.length) {
    const blockers = obs.filter((t) => Math.abs(t.lat - target) < 1.55);
    if (blockers.length) {
      let lo = 99, hi = -99;
      for (const t of blockers) { lo = Math.min(lo, t.lat); hi = Math.max(hi, t.lat); }
      const clearOf = (lat) => obs.every((t) => Math.abs(t.lat - lat) >= 1.55);
      let cand = [lo - 2.1, hi + 2.1].filter((c) => clearOf(c) && Math.abs(c) <= 7.2);
      if (!cand.length) {
        let glo = 99, ghi = -99;
        for (const t of obs) { glo = Math.min(glo, t.lat); ghi = Math.max(ghi, t.lat); }
        cand = [glo - 2.1, ghi + 2.1];
      }
      target = cand.reduce((a, b) => Math.abs(b - r.lat) < Math.abs(a - r.lat) ? b : a);
      if (!hunting && r.vs > 18 + DIFF.corner * 0.9) { control.brake = true; control.boost = false; }
    }
  }
  target = clamp(target, -7.2, 7.2);
  const desiredVlat = clamp((target - r.lat) * (hunting ? 2.4 : 1.8), -6, 6);
  control.steer = clamp((desiredVlat - r.vlat) * 0.45, -1, 1);

  if (r.grounded) {
    r.trickRolled = false;
    const rampH = course.rampHeightAt(r.s, r.lat);
    if (rampH > 0.05 && r.def.trick > 0.4 && !hunting) {
      let onLip = false;
      for (const rp of course.ramps) {
        if (r.s >= rp.s0 && r.s <= rp.s0 + rp.len && (r.s - rp.s0) / rp.len > 0.72) { onLip = true; break; }
      }
      if (onLip) control.hop = rng() < dt * (1.2 + r.def.trick * 2.4);
    }
  } else if (!r.trick && !r.trickRolled && r.airTime > 0.24 && !hunting) {
    r.trickRolled = true;
    const rem = predictAirRemaining(course, r) - (0.12 - r.def.crashy * 0.05);
    if (rem > TRICKS.nohander.dur && rng() < 0.36 + r.def.trick * 0.58) {
      const menu = r.def.trick > 0.7 ? ['heel', 'backflip', 'superman', 'nohander']
        : r.def.trick > 0.45 ? ['superman', 'backflip', 'nohander']
          : ['nohander', 'superman'];
      let pick = null;
      for (const k of menu) if (TRICKS[k].dur < rem) { pick = k; break; }
      if (pick) startTrick(r, pick);
    }
  }

  // punching/kicking with windup tell.
  if (!ctx.state) ctx.state = { lastPunchOnHumanAt: -99 };
  const state = ctx.state;
  if (r.windupT >= 0) {
    r.windupT += dt;
    if (r.windupT >= (r.windupDur || 0.45)) {
      r.windupT = -1;
      const t = r.windupTarget;
      if (t && !t.crashed && t.invuln <= 0 && Math.abs(t.s - r.s) < PUNCH_S && Math.abs(t.lat - r.lat) < PUNCH_LAT) {
        tryStrike(r, r.strikeKind, riders, ctx, ctx.events);
      }
      r.punchCd = (r.revengeT > 0 ? 0.7 + rng() * 0.5 : r.grudge ? 2.5 + rng() * 2 : 4 + rng() * 3) * DIFF.cd;
    }
  } else if (r.punchCd <= 0 && r.grounded) {
    if (hunting) {
      const dsP = Math.abs(reference.s - r.s), dlP = Math.abs(reference.lat - r.lat);
      if (dsP < 2.0 && dlP < 1.3 && Math.abs(reference.y - r.y) < PUNCH_DY
        && !reference.crashed && reference.invuln <= 0 && !reference.finished) {
        r.windupT = 0; r.windupTarget = reference; r.strikeKind = rng() < 0.5 ? 'kick' : 'punch';
        if (ctx.stats) ctx.stats[r.strikeKind === 'kick' ? 'aiKick' : 'aiPunch']++;
        r.windupDur = Math.max(0.26, 0.45 / DIFF.rev);
        r.strikeSide = Math.sign(reference.lat - r.lat) || 1;
      }
    } else {
      for (const o of riders) {
        if (o === r || o.crashed || o.invuln > 0 || o.finished) continue;
        const ds = Math.abs(o.s - r.s), dl = Math.abs(o.lat - r.lat);
        if (ds < 2.0 && dl < 1.3 && Math.abs(o.y - r.y) < PUNCH_DY) {
          const isHuman = o.isHuman;
          if (isHuman && elapsed - state.lastPunchOnHumanAt < 2) continue;
          if (rng() < r.def.aggr * (isHuman ? (r.grudge ? 4 : 2.6) : 0.45 * (1 - r.rubber)) * DIFF.aggr * dt * 2.2) {
            r.windupT = 0; r.windupTarget = o; r.strikeKind = rng() < 0.45 ? 'kick' : 'punch';
            if (ctx.stats) ctx.stats[r.strikeKind === 'kick' ? 'aiKick' : 'aiPunch']++;
            r.windupDur = 0.45;
            r.strikeSide = Math.sign(o.lat - r.lat) || 1;
            if (isHuman) state.lastPunchOnHumanAt = elapsed;
            break;
          }
        }
      }
    }
  }
  return control;
}
