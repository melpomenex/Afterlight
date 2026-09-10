/**
 * Downhill Mayhem pure simulation (integrate-multiplayer-downhill-mayhem-arcade
 * 3.1/3.3). Faithful, renderer-free extraction of the frozen source game's
 * `riderStep`/`handleLanding`/`crashRider`/trick and `tryStrike`/
 * `pairCollisions` logic (`games/downhill-mayhem/standalone.html`, commit
 * recorded in baseline.md).
 *
 * No Three.js, DOM, Web Audio, requestAnimationFrame, Date.now,
 * performance.now or Math.random. All randomness a rider needs is injected as a
 * deterministic value. Cosmetic presentation (popups, shake, audio, analytics,
 * rank stamps) is removed; gameplay-relevant outcomes are returned as events
 * so the caller can render them and the server can broadcast them.
 *
 * Track-space state: `s` along the course, `lat` lateral, `y` ground height,
 * `vs`/`vlat`/`vy` velocities, plus trick/boost/crash/combat/finish state.
 */

import { clamp, mulberry32 } from './course.js';

export const RULES_VERSION = 1;
export const TICK_HZ = 30;
export const DT = 1 / 30;

// Source physics constants (standalone.html config).
export const G = 11.5;
export const VT_FALL = 17.5;
export const DRAG = 0.0030, SOFTCAP_V = 33, SLOPE_K = 1.48;
export const PEDAL_A = 5.8, PEDAL_VMAX = 18, BRAKE_A = 10.5, ROLL_F = 0.35;
export const STEER_BASE = 2.6, STEER_VK = 0.21, STEER_RESP = 7.5, CENTRIF_K = 1.35, AIR_CTRL = 0.32;
export const WALL_GRIND_T = 0.8, WALL_SLAM_V = 5.0;
export const DRIFT_AUTH = 0.55, DRIFT_SCRUB = 1.3;
export const HOP_VY = 3.3, RAMP_HOP_BONUS = 1.9, DETACH_G = 2.6;
export const STUMBLE_IMPACT = 12, CRASH_IMPACT = 19.5, CRASH_TIME = 1.8, INVULN_TIME = 2.6;
export const BOOST_A = 9.0, BOOST_DRAIN = 27, BOOST_MIN = 4;
export const METER_TRICKLE = 3.5;
export const HIT_METER = 6, AIR_STRIKE_METER = 14, BOOST_STRIKE_METER = 10;
export const PUNCH_S = 2.2, PUNCH_LAT = 1.6, PUNCH_DY = 1.4, PLAYER_PUNCH_CD = 0.75;
export const REVENGE_HUNT_T = 30;
export const TRICK_GRACE = 0.22, BIGAIR_T = 1.15, BIGAIR_METER = 8;
export const HALF_W = 8, RIDE_W = 26, LAT_CLAMP = 27.5;

export const TRICKS = Object.freeze({
  nohander: Object.freeze({ dur: 0.55, meter: 14, name: 'NO HANDER' }),
  superman: Object.freeze({ dur: 0.85, meter: 24, name: 'SUPERMAN' }),
  backflip: Object.freeze({ dur: 0.95, meter: 30, name: 'BACKFLIP', forgive: 0.90, save: 0.85 }),
  heel: Object.freeze({ dur: 1.15, meter: 38, name: 'HEEL CLICKER' }),
});
export const TRICK_FORGIVE = 0.78;
export const TRICK_SAVE = 0.6;
export const trickForgive = (t) => TRICKS[t].forgive || TRICK_FORGIVE;
export const trickSave = (t) => TRICKS[t].save || TRICK_SAVE;

export const RIDER_DEFS = Object.freeze([
  Object.freeze({ name: 'YOU', color: 0xff7f27, skin: 0xd9a066, top: 1.00, corner: 1.00, aggr: 0, trick: 0, crashy: 0 }),
  Object.freeze({ name: 'BLAZE', color: 0xe0392b, skin: 0x8a5a33, top: 1.03, corner: 0.94, aggr: 0.85, trick: 0.45, crashy: 0.35 }),
  Object.freeze({ name: 'RHONDA', color: 0xe259b5, skin: 0xe8b98a, top: 1.00, corner: 1.02, aggr: 0.40, trick: 0.85, crashy: 0.30 }),
  Object.freeze({ name: 'DIESEL', color: 0x4a7d2b, skin: 0x6b4226, top: 1.02, corner: 0.87, aggr: 1.00, trick: 0.20, crashy: 0.40 }),
  Object.freeze({ name: 'KAZU', color: 0x2f66d0, skin: 0xcf9f6f, top: 0.99, corner: 1.06, aggr: 0.30, trick: 0.95, crashy: 0.22 }),
  Object.freeze({ name: 'SIERRA', color: 0xeac435, skin: 0xa06a3b, top: 1.01, corner: 0.98, aggr: 0.55, trick: 0.60, crashy: 0.28 }),
]);

export const DIFFS = Object.freeze({
  chill: Object.freeze({ label: 'CHILL', suffix: '-e', pace: 1.0, rubP: 0.26, rubSat: 60, leash: 0.09, corner: 4.9, aggr: 0.5, cd: 1.4, meter0: [5, 18], rev: 0.8, company: true }),
  mayhem: Object.freeze({ label: 'MAYHEM', suffix: '', pace: 1.035, rubP: 0.42, rubSat: 45, leash: 0.075, corner: 5.2, aggr: 1, cd: 1, meter0: [15, 35], rev: 1, company: true }),
  brutal: Object.freeze({ label: 'BRUTAL', suffix: '-b', pace: 1.145, rubP: 0.62, rubSat: 30, leash: 0.02, corner: 5.95, aggr: 2.9, cd: 0.45, meter0: [50, 85], rev: 3, company: false, huntRace: true }),
});

/** The source `START_LATS`; slot index selects the start lane. */
export const START_LATS = Object.freeze([1.25, -6.25, -3.75, -1.25, 3.75, 6.25]);

/**
 * Build a fresh rider. `isAI` selects the difficulty-scaled def and seeded
 * wander fields; humans get a neutral def and zeroed AI fields.
 */
export function initialRiderState(slot, { difficulty = 'mayhem', isAI = false, seed = 1, humanDef = null } = {}) {
  const diff = DIFFS[difficulty] ?? DIFFS.mayhem;
  const rng = mulberry32((seed ^ (slot * 0x9e3779b1)) >>> 0);
  const def = isAI ? RIDER_DEFS[slot % RIDER_DEFS.length] : (humanDef ?? { name: 'RIDER', color: 0xffffff, top: 1, corner: 1, aggr: 0, trick: 0, crashy: 0 });
  const meter0 = isAI ? diff.meter0[0] + rng() * (diff.meter0[1] - diff.meter0[0]) : 0;
  return {
    slot, isAI, isHuman: !isAI, def,
    // physics
    s: 0, lat: START_LATS[slot % START_LATS.length], y: 0, vs: 0, vlat: 0, vy: 0, grounded: true,
    steerPos: 0, lean: 0, pitch: 0, airTime: 0, wasOnRamp: false, driftT: 0, wallT: 0, draftT: 0, grudge: false, revengeT: 0,
    // race
    finished: false, finishTime: null, racePos: slot + 1, rubber: 0, photo: false,
    // trick/boost
    trick: null, trickT: 0, chain: 0, pendingMeter: 0, pendingNames: [], meter: meter0, boosting: false, boostLatch: false,
    // crash/combat
    crashed: false, crashT: 0, invuln: 0,
    punchAnimT: -1, kickAnimT: -1, strikeKind: 'punch', strikeSide: 1, windupT: -1, windupTarget: null,
    punchCd: isAI ? 3 + slot * 1.7 : 0,
    // ai
    phase: isAI ? rng() * 6.28 : 0, wf: isAI ? 0.25 + rng() * 0.3 : 0, wamp: isAI ? 1.2 + rng() * 1.6 : 0,
    lineBias: isAI ? (rng() * 2 - 1) * 3.2 : 0, reactT: isAI ? 0.08 + rng() * 0.3 : 0, pedalPhase: 0,
    // runtime scratch
    inp: neutralControls(), groundedPrev: true, hitTrick: false,
  };
}

export function neutralControls() {
  return { pedal: 0, brake: 0, steer: 0, hop: false, boost: false, punch: false, kick: false, trick: null };
}

const TRICK_IDS = new Set(Object.keys(TRICKS));

/** Clamp raw wire controls into the accepted intent shape. */
export function normalizeControls(raw) {
  const c = raw && typeof raw === 'object' ? raw : {};
  const steer = Number.isFinite(c.steer) ? clamp(c.steer, -1, 1) : 0;
  return {
    pedal: c.pedal ? 1 : 0,
    brake: c.brake ? 1 : 0,
    steer,
    hop: !!(c.hop ?? c.hopPressed),
    boost: !!c.boost,
    punch: !!(c.punch ?? c.punchPressed),
    kick: !!(c.kick ?? c.kickPressed),
    trick: typeof c.trick === 'string' && TRICK_IDS.has(c.trick) ? c.trick : null,
  };
}

// --- tricks ------------------------------------------------------------------

export function startTrick(r, type) {
  if (!TRICKS[type] || r.trick || r.grounded || r.crashed || r.airTime < TRICK_GRACE) return false;
  r.trick = type; r.trickT = 0;
  return true;
}

export function completeTrick(r, events) {
  const def = TRICKS[r.trick];
  const bonus = r.chain > 0 ? 0.5 : 0;
  r.pendingMeter += def.meter * (1 + bonus * r.chain);
  r.pendingNames.push(def.name);
  r.chain++;
  events?.push({ type: 'trick_complete', slot: r.slot, name: def.name, chain: r.chain });
  r.trick = null; r.trickT = 0;
}

export function updateTrick(r, dt, events) {
  if (!r.trick) return;
  r.trickT += dt;
  if (r.trickT >= TRICKS[r.trick].dur) completeTrick(r, events);
}

// --- crash & landing ---------------------------------------------------------

export function groundSlopeVy(course, r) {
  const dS = (course.heightAt(r.s + 1.6, r.lat) - course.heightAt(r.s - 1.6, r.lat)) / 3.2;
  const dL = (course.heightAt(r.s, r.lat + 0.5) - course.heightAt(r.s, r.lat - 0.5));
  return dS * r.vs + dL * r.vlat;
}

export function crashRider(r, cause, events) {
  if (r.crashed || r.invuln > 0 || r.finished) return false;
  r.crashed = true; r.crashT = 0; r.trick = null; r.pendingMeter = 0; r.pendingNames.length = 0; r.chain = 0;
  r.boosting = false; r.windupT = -1;
  r.meter *= 0.4;
  r.vs *= 0.35; r.vy = Math.min(r.vy, 1.5);
  events?.push({ type: 'crash', slot: r.slot, cause });
  return true;
}

export function handleLanding(r, impact, events) {
  if (r.finished || r.s >= (r.finishS ?? Infinity)) { r.airTime = 0; r.wasOnRamp = false; r.trick = null; return; }
  const air = r.airTime;
  r.airTime = 0; r.wasOnRamp = false;
  if (r.trick) {
    const done = r.trickT / TRICKS[r.trick].dur;
    if (done >= trickForgive(r.trick)) {
      completeTrick(r, events);
      events?.push({ type: 'landing', slot: r.slot, impact, air, grade: done >= 0.92 ? 'AMAZING!' : 'CLOSE ONE!', trick: true });
    } else if (done >= trickSave(r.trick)) {
      r.trick = null; r.trickT = 0; r.pendingMeter = 0; r.pendingNames.length = 0; r.chain = 0;
      r.vs *= 0.72;
      events?.push({ type: 'landing', slot: r.slot, impact, air, saved: true });
    } else { crashRider(r, 'bail', events); return; }
  } else if (r.pendingNames.length && air > 0.3) {
    events?.push({ type: 'landing', slot: r.slot, impact, air, grade: 'PERFECT!' });
  }
  if (impact > CRASH_IMPACT) { crashRider(r, 'hard', events); return; }
  if (impact > STUMBLE_IMPACT) r.vs *= 0.72;
  let gain = r.pendingMeter;
  if (air > BIGAIR_T) gain += BIGAIR_METER;
  if (r.isHuman && air > 0.45 && impact < 2.8) gain += 5;
  if (gain > 0) r.meter = clamp(r.meter + gain, 0, 100);
  r.pendingMeter = 0; r.pendingNames.length = 0; r.chain = 0;
}

// --- combat ------------------------------------------------------------------

/**
 * Resolve a punch/kick from `attacker` against the field. Returns the hit
 * victim slot or null. `ctx.difficulty` scales the revenge timer.
 */
export function tryStrike(attacker, kind, riders, ctx, events) {
  let best = null, bestD = 99;
  for (const o of riders) {
    if (o === attacker || o.crashed || o.invuln > 0 || o.finished) continue;
    const ds = Math.abs(o.s - attacker.s), dl = Math.abs(o.lat - attacker.lat), dy = Math.abs(o.y - attacker.y);
    if (ds < PUNCH_S && dl < PUNCH_LAT && dy < PUNCH_DY && ds + dl < bestD) { best = o; bestD = ds + dl; }
  }
  attacker.strikeSide = best ? (Math.sign(best.lat - attacker.lat) || 1)
    : ((attacker.inp && attacker.inp.steer) ? Math.sign(attacker.inp.steer) : (attacker.strikeSide || 1));
  if (kind === 'kick') attacker.kickAnimT = 0; else attacker.punchAnimT = 0;
  const diff = ctx?.difficulty ? DIFFS[ctx.difficulty] : DIFFS.mayhem;
  if (!best) {
    events?.push({ type: 'strike', slot: attacker.slot, kind, landed: false });
    return null;
  }
  best.vlat += attacker.strikeSide * (kind === 'kick' ? 4.5 : 3);
  crashRider(best, kind === 'kick' ? 'kicked' : 'punched', events);
  if (attacker.isHuman) {
    const gain = HIT_METER + (!attacker.grounded ? AIR_STRIKE_METER : 0) + (attacker.boosting ? BOOST_STRIKE_METER : 0);
    attacker.meter = Math.min(100, attacker.meter + gain);
  }
  if (attacker.isHuman && best.isAI) {
    best.grudge = true;
    best.revengeT = REVENGE_HUNT_T * diff.rev;
  }
  if (best.isHuman && attacker.revengeT > 0) attacker.revengeT = 0;
  events?.push({ type: 'strike', slot: attacker.slot, targetSlot: best.slot, kind, landed: true });
  return best.slot;
}

export function pairCollisions(riders, dt) {
  for (let i = 0; i < riders.length; i++) {
    for (let j = i + 1; j < riders.length; j++) {
      const a = riders[i], b = riders[j];
      if (a.crashed || b.crashed || (a.finished && b.finished)) continue;
      const ds = b.s - a.s, dl = b.lat - a.lat;
      if (Math.abs(ds) < 1.7 && Math.abs(dl) < 1.0 && Math.abs(a.y - b.y) < 1.2) {
        const push = (1.0 - Math.abs(dl)) * 6 * dt, sgn = dl >= 0 ? 1 : -1;
        a.vlat -= sgn * push; b.vlat += sgn * push;
        const dv = (b.vs - a.vs) * 0.12; a.vs += dv; b.vs -= dv;
      }
    }
  }
}

export function updatePositions(riders) {
  const order = riders.slice().sort((a, b) => {
    if (a.finished && b.finished) return a.finishTime - b.finishTime;
    if (a.finished) return -1;
    if (b.finished) return 1;
    return b.s - a.s;
  });
  order.forEach((r, i) => { r.racePos = i + 1; });
}

/** Apply an already-normalized control set, consuming action edges. */
function applyControl(r, control, events, ctx) {
  const active = !r.crashed && !r.finished;
  const inp = r.inp;
  inp.pedal = active ? (control.pedal ? 1 : 0) : 0;
  inp.brake = active ? (control.brake ? 1 : 0) : 0;
  inp.steer = active ? control.steer : 0;
  inp.boost = active && !!control.boost;
  inp.hop = active && !!control.hop;
  inp.trick = active && control.trick ? control.trick : null;
  if (active && control.punch && r.punchCd <= 0) { r.punchCd = PLAYER_PUNCH_CD; tryStrike(r, 'punch', ctx.riders, ctx, events); }
  if (active && control.kick && r.punchCd <= 0) { r.punchCd = PLAYER_PUNCH_CD; tryStrike(r, 'kick', ctx.riders, ctx, events); }
  if (inp.trick) startTrick(r, inp.trick);
  if (r.finished) { inp.pedal = 0; inp.steer = 0; inp.brake = r.s > (r.finishS ?? Infinity) + 25 ? 1 : 0.25; inp.boost = false; }
}

function finishRider(r, elapsed, events) {
  r.finished = true; r.finishTime = elapsed; r.revengeT = 0;
  r.crashed = false; r.trick = null; r.pendingMeter = 0; r.pendingNames.length = 0;
  events?.push({ type: 'finish', slot: r.slot, time: elapsed });
}

/**
 * One fixed step for a single rider. `ctx = { riders, difficulty, elapsed,
 * finishS }`. Returns an events array (never null).
 */
export function stepRider(course, r, dt, ctx = {}, events = []) {
  r.invuln = Math.max(0, r.invuln - dt);
  r.punchCd = Math.max(0, r.punchCd - dt);
  const finishS = ctx.finishS ?? r.finishS ?? course.finishS;
  r.finishS = finishS;
  const diff = ctx.difficulty ? DIFFS[ctx.difficulty] : DIFFS.mayhem;

  if (r.crashed) {
    r.crashT += dt;
    r.vs = Math.max(0, r.vs - 6 * dt); r.vlat *= Math.pow(0.05, dt);
    r.s += r.vs * dt; r.lat += r.vlat * dt;
    if (!r.finished && r.s >= finishS) { finishRider(r, ctx.elapsed ?? 0, events); return events; }
    const gnd = course.heightAt(r.s, r.lat);
    if (!r.grounded) { r.vy -= G * dt; r.y += r.vy * dt; if (r.y <= gnd) { r.y = gnd; r.grounded = true; r.vy = 0; } }
    else r.y = gnd;
    if (r.crashT >= CRASH_TIME) { r.crashed = false; r.invuln = INVULN_TIME; r.vs = Math.max(r.vs, 2.5); r.grounded = true; r.airTime = 0; }
    return events;
  }

  const inp = r.inp;
  const zone = Math.abs(r.lat) < HALF_W + 0.4 ? 0 : (Math.abs(r.lat) < RIDE_W ? 1 : 2);
  const offTrack = zone > 0;
  const rampH = course.rampHeightAt(r.s, r.lat);

  if (r.grounded) {
    const track = course.sampleTrack(r.s);
    let a = -track.grade * 9.81 * SLOPE_K * (1 + r.rubber * 0.5);
    a += inp.pedal * PEDAL_A * Math.max(0, 1 - r.vs / PEDAL_VMAX) * (1 + r.rubber * 0.6);
    a -= inp.brake * BRAKE_A;
    const dragMult = zone === 0 ? 1 : (zone === 1 ? 1.55 : 5.5);
    a -= DRAG * dragMult * r.vs * r.vs * (1 - r.rubber * 0.55) * (1 - 0.32 * r.draftT);
    a += 0.8 * r.draftT;
    a -= zone === 0 ? ROLL_F : (zone === 1 ? 1.1 : 3.4);
    if (!inp.boost || r.meter <= 0) r.boostLatch = false;
    else if (r.meter > BOOST_MIN) r.boostLatch = true;
    r.boosting = r.boostLatch && inp.boost && r.meter > 0;
    if (r.boosting) { a += BOOST_A; r.meter = Math.max(0, r.meter - BOOST_DRAIN * dt); }
    else if (!r.finished && r.vs > 10) r.meter = Math.min(100, r.meter + METER_TRICKLE * (r.isHuman ? 1 : 0.85 + r.rubber * 0.9) * dt);
    const cap = SOFTCAP_V * r.def.top * (r.isHuman ? 1 : diff.pace) * (1 + r.rubber * 0.5) + (r.boosting ? 4 : 0);
    if (r.vs > cap) a -= (r.vs - cap) * 0.9;
    r.vs = Math.max(0, r.vs + a * dt);

    const target = inp.steer;
    const rate = (Math.abs(target) > Math.abs(r.steerPos) && Math.sign(target) === Math.sign(r.steerPos || target)) ? 6 : 8;
    r.steerPos += clamp(target - r.steerPos, -rate * dt, rate * dt);
    const hardTurn = Math.abs(r.steerPos) > 0.82 && r.vs > 15;
    r.driftT = clamp(r.driftT + (hardTurn ? dt / 0.45 : -dt / 0.3), 0, 1);
    const centrif = track.curv * r.vs * r.vs * CENTRIF_K;
    const targetVlat = r.steerPos * (STEER_BASE + r.vs * STEER_VK) * (1 + DRIFT_AUTH * r.driftT) + centrif;
    r.vlat += (targetVlat - r.vlat) * Math.min(1, STEER_RESP * dt);
    r.vs = Math.max(0, r.vs - DRIFT_SCRUB * r.driftT * dt);
    if (Math.abs(r.lat) > RIDE_W) r.vlat -= Math.sign(r.lat) * 5 * dt;
    if (inp.hop) {
      const onRampTop = rampH > 0.05;
      r.grounded = false;
      r.vy = Math.max(r.vy, 0) + HOP_VY + (onRampTop ? RAMP_HOP_BONUS : 0);
      r.y += 0.02; r.airTime = 0.001; r.wasOnRamp = onRampTop;
      events.push({ type: 'hop', slot: r.slot, ramp: onRampTop });
    }
  } else {
    r.airTime += dt;
    r.vlat += inp.steer * (STEER_BASE + r.vs * STEER_VK) * AIR_CTRL * dt * 3;
    r.vlat *= Math.pow(0.6, dt);
    r.vs = Math.max(0, r.vs - DRAG * 0.4 * r.vs * r.vs * dt);
    r.boosting = false;
    if (inp.trick) startTrick(r, inp.trick);
    r.vy = Math.max(r.vy - G * dt, -VT_FALL);
  }

  updateTrick(r, dt, events);

  const prevY = r.y, prevVy = r.vy;
  r.s += r.vs * dt;
  const vlatIn = r.vlat;
  r.lat = clamp(r.lat + r.vlat * dt, -LAT_CLAMP, LAT_CLAMP);
  if (Math.abs(r.lat) >= LAT_CLAMP - 0.01) {
    if (Math.abs(vlatIn) > WALL_SLAM_V && r.grounded) crashRider(r, 'wall', events);
    r.vlat *= -0.35; r.vs *= 0.985;
  }
  if (r.grounded && !r.crashed && Math.abs(r.lat) > RIDE_W + 0.4 && r.vs > 7) {
    r.wallT += dt;
    if (r.wallT > WALL_GRIND_T) crashRider(r, 'wall', events);
  } else r.wallT = 0;
  if (r.s > 2460) { r.s = 2460; r.vs = 0; }
  const gnd = course.heightAt(r.s, r.lat);
  if (r.grounded) {
    const impliedVy = (gnd - prevY) / dt;
    if (impliedVy - r.vy < -G * DETACH_G * dt) {
      r.grounded = false; r.airTime = 0.001; r.wasOnRamp = rampH > 0.05;
      r.y = prevY + r.vy * dt; r.vy -= G * dt;
    } else { r.y = gnd; r.vy = impliedVy; }
  } else {
    r.y += r.vy * dt;
    if (r.y <= gnd) {
      const slopeVy = groundSlopeVy(course, r);
      const impact = Math.max(0, slopeVy - prevVy);
      r.y = gnd; r.grounded = true; r.vy = slopeVy;
      handleLanding(r, impact, events);
    }
  }

  if (!r.crashed && r.invuln <= 0 && (r.y - gnd) < 2.5) {
    const b = Math.floor(r.s / 10);
    for (let bi = b - 1; bi <= b + 1 && !r.crashed; bi++) {
      const list = course.colliderBuckets?.get(bi);
      if (!list) continue;
      for (const t of list) {
        if (t.kind === 'tree') {
          if (Math.abs(t.s - r.s) < 1.1 && Math.abs(t.lat - r.lat) < 0.9) { crashRider(r, 'tree', events); break; }
        } else if ((r.y - gnd) < 1.1) {
          if (Math.abs(t.s - r.s) < 1.0 && Math.abs(t.lat - r.lat) < t.r) { crashRider(r, 'rock', events); break; }
        }
      }
    }
  }

  if (r.isHuman && offTrack && r.grounded && r.vs > 4) events.push({ type: 'rough', slot: r.slot, zone });
  if (!r.finished && r.s >= finishS) finishRider(r, ctx.elapsed ?? 0, events);
  return events;
}

/**
 * Advance the whole field one fixed 1/30 tick. `controlsBySlot` maps slot ->
 * normalized controls; `ctx.aiControl(rider, ctx)` returns controls for AI
 * (server-owned). The source substeps physics at ~1/60, preserved here.
 */
export function stepField(course, riders, controlsBySlot, ctx = {}) {
  const events = [];
  const full = { ...ctx, riders };
  const aiControl = ctx.aiControl;
  for (const r of riders) {
    const control = r.isAI && aiControl ? aiControl(course, r, full) : (controlsBySlot?.[r.slot] ?? neutralControls());
    applyControl(r, control, events, full);
  }
  // slipstream
  for (const r of riders) {
    let tow = false;
    if (!r.crashed && r.grounded) {
      for (const o of riders) {
        if (o === r || o.crashed) continue;
        const ds = o.s - r.s;
        if (ds > 1.2 && ds < 6.5 && Math.abs(o.lat - r.lat) < 1.1 && o.vs > 6) { tow = true; break; }
      }
    }
    r.draftT = clamp(r.draftT + (tow ? DT / 0.5 : -DT / 0.4), 0, 1);
  }
  const sub = DT > 0.022 ? 2 : 1, h = DT / sub;
  for (let k = 0; k < sub; k++) for (const r of riders) stepRider(course, r, h, full, events);
  pairCollisions(riders, DT);
  updatePositions(riders);
  return events;
}
