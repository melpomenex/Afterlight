/**
 * Summit Run authoritative rules — the ALPINE RUSH port
 * (integrate-ssxtricky-snowboard 3.1).
 *
 * Fixed-step (30 Hz), seeded-free, renderer-free port of the frozen user-owned
 * source simulation: `SSXTricky/lib/game/rules.mjs` (motion/trick helpers) and
 * the `phase==='running'` section of `SSXTricky/lib/game/engine.js` tick()
 * (speed zones, charge, ramp-edge launches, airborne tricks, landings,
 * pickups, finish), both at rev e87f6c7d (see the change's baseline.md).
 *
 * The SAME step math runs in three places: this module (browser predictor and
 * Node golden fixtures), the Elixir authority
 * (Afterlight.Activities.Snowboard, op-for-op port), and the tuning contract
 * in tests/fixtures/snowboard/contract.json. Any change must update all three
 * plus the golden vectors and bump rulesVersion.
 *
 * Source mechanics preserved: tuck/lean/aero target speeds, brake, pad/manual
 * boost with depletion and regen, flow-carve boost reward, lateral carve
 * approach, edge clamp ±35 with 0.65^dt bleed, charge/super-pop jumps
 * (popVelocity 7+6·charge, +4 super pop), ramp-edge launches
 * (10+0.17·speed+4·charge), gravity 20, Q/E/X tricks with hold chains and a
 * 0.8 s tap buffer, combo scoring with the ×1..×3 multiplier, bail below 82%
 * trick completion, speed-lane entry bursts (2.4 s, ≥46 m/s) and +250/+10
 * pickups.
 *
 * Intentional multiplayer adaptations (documented, from the change design —
 * never silent substitutions): the source's five AI rivals and rival-bump
 * collisions are replaced by human riders (no racer-racer collision), and the
 * source's per-run pickup respawns become per-rider per-race claims so one
 * racer cannot remove another's source-game opportunities. Terminal riders
 * stop simulating; the finish records a deterministic within-tick crossing
 * key for shared ordering.
 *
 * State uses the source's own coordinates: `s` downhill meters (world z=-s),
 * `x` ABSOLUTE world lateral, `lateral` lateral velocity, `y` contact/ballistic
 * height. Held-input edges (jump release, trick taps) are detected from
 * held-field snapshots carried in the state, so a pure held-state control
 * stream reproduces the source's keydown/keyup semantics deterministically on
 * both runtimes.
 */

import { courseCenter, groundHeight, surfaceHeight, rampHeight, onRamp, clamp } from './course.js';

export const DT = 1 / 30;
export const TICK_HZ = 30;

// Source tuning (rules.mjs constants) — contract.json simulation block.
export const TUNING = Object.freeze({
  baseSpeed: 29, // source tuckSpeed base
  tuckBonus: 6,
  leanBonus: 4,
  tuckLeanBonus: 3,
  brakeSpeed: 10,
  padBoostSpeed: 56,
  boostSpeed: 48,
  boostMinSpeed: 8, // manual boost requires speed > 8
  boostSpendPerSecond: 23,
  boostRegenPerSecond: 1.8,
  boostStart: 45,
  boostMax: 100,
  carveBoostReward: 12,
  carveChargeRate: 0.5, // per second to full
  carveSpeedMin: 20,
  carveSteerMin: 0.5,
  carveHalfWidth: 20, // source carve window |x-center| < 20
  lateralGround: 20,
  lateralAir: 13,
  lateralTuck: 14,
  lateralApproach: 5, // dt multiplier
  speedApproach: 0.8, // dt multiplier
  edgeBleedHalfWidth: 23,
  edgeBleedFactor: 0.65, // ^dt
  corridorHalfWidth: 35,
  chargeRate: 1.2, // per second
  jumpBase: 7,
  jumpChargeBonus: 6,
  superPopBonus: 4, // tuck + charge >= 0.8
  superPopCharge: 0.8,
  gravity: 20,
  rampLaunchBase: 10,
  rampLaunchSpeedFactor: 0.17,
  rampLaunchChargeBonus: 4,
  bailTrickProgress: 0.82, // below this fraction at landing → bail
  bailSeconds: 1.2,
  bailSpeedFactor: 0.3,
  boostPerLandingPoint: 75, // boost += points / 75
  zoneBoostSeconds: 2.4,
  zoneMinSpeed: 46,
  pickupScore: 250,
  pickupBoost: 10,
  pickupDistanceWindow: 2.2,
  pickupLateralWindow: 2.1,
  pickupHeightWindow: 3,
  airTimePointsPerSecond: 100,
  comboStepBonus: 0.5, // per extra trick, capped
  comboMaxExtra: 4,
  bankedTricksCap: 8, // bounded wire (source unbounded; multiplier caps at +4)
  startSpeed: 12, // source sets speed=12 at GO
});

/** Source TRICKS table (Q/E/X), with code + axis for the rig port. */
export const TRICKS = Object.freeze({
  Q: Object.freeze({ code: 'KeyQ', name: '360 SPIN', points: 800, duration: 0.72, axis: 'y' }),
  E: Object.freeze({ code: 'KeyE', name: 'INDY GRAB', points: 500, duration: 0.58, axis: 'grab' }),
  X: Object.freeze({ code: 'KeyX', name: 'BACKFLIP', points: 1200, duration: 0.92, axis: 'x' }),
});
export const TRICK_CODES = Object.freeze(['Q', 'E', 'X']);
const TRICK_BUFFER_SECONDS = 0.8;
const TRICK_AIRTIME_MARGIN = 0.2;
const RAMP_EDGE_DROP = 0.6; // y > ground + this after leaving a ramp → fall launch

// --- source helpers (verbatim ports, test-parity with the source suite) --------

export const jumpVelocity = (charge) => 7 + clamp(charge, 0, 1) * 6;

export const popVelocity = (s) => jumpVelocity(s.charge) + (s.tucking && s.charge >= TUNING.superPopCharge ? TUNING.superPopBonus : 0);

export const rampLaunchVelocity = (speed, charge = 0) => TUNING.rampLaunchBase + speed * TUNING.rampLaunchSpeedFactor + clamp(charge, 0, 1) * TUNING.rampLaunchChargeBonus;

export function awardCombo(tricks, airTime) {
  return tricks.length ? Math.round(tricks.reduce((sum, t) => sum + t.points, 0) * (1 + Math.min(tricks.length - 1, TUNING.comboMaxExtra) * TUNING.comboStepBonus) + airTime * TUNING.airTimePointsPerSecond) : 0;
}

export const racePlace = (distance, rivals) => 1 + rivals.filter((d) => d > distance).length;

export const formatTime = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}.${Math.floor((seconds % 1) * 100).toString().padStart(2, '0')}`;

/** Source stepMotion, verbatim (absolute-x convention; mutates `s`). */
export function stepMotion(s, input, dt) {
  s.zoneBoost = Math.max(0, (s.zoneBoost || 0) - dt);
  const padBoost = s.zoneBoost > 0 && !input.brake;
  const manualBoost = input.boost && s.boost > 0 && s.speed > TUNING.boostMinSpeed && !input.brake;
  const boosting = padBoost || manualBoost;
  s.tucking = !!input.crouch && !s.airborne && !input.brake;
  s.leaning = !!input.lean && !s.airborne && !input.brake;
  const tuckSpeed = TUNING.baseSpeed + (s.tucking ? TUNING.tuckBonus : 0) + (s.leaning ? TUNING.leanBonus : 0) + (s.tucking && s.leaning ? TUNING.tuckLeanBonus : 0);
  const targetSpeed = input.brake ? TUNING.brakeSpeed : padBoost ? TUNING.padBoostSpeed : boosting ? TUNING.boostSpeed : tuckSpeed;
  s.carving = !s.airborne && !input.brake && Math.abs(input.steer) > TUNING.carveSteerMin && s.speed > TUNING.carveSpeedMin && Math.abs(s.x - courseCenter(s.distance)) < TUNING.carveHalfWidth;
  s.carveCharge = s.carving ? Math.min(1, (s.carveCharge || 0) + dt * TUNING.carveChargeRate) : 0;
  if (s.carveCharge >= 1) {
    s.boost = clamp(s.boost + TUNING.carveBoostReward, 0, TUNING.boostMax);
    s.carveCharge = 0;
    s.carveReward = (s.carveReward || 0) + 1;
  }
  s.speed += (targetSpeed - s.speed) * Math.min(1, dt * TUNING.speedApproach);
  s.speed = Math.max(0, s.speed);
  s.boost = clamp(s.boost + (manualBoost && !padBoost ? -TUNING.boostSpendPerSecond : TUNING.boostRegenPerSecond) * dt, 0, TUNING.boostMax);
  s.lateral += (input.steer * (s.airborne ? TUNING.lateralAir : s.tucking ? TUNING.lateralTuck : TUNING.lateralGround) - s.lateral) * Math.min(1, dt * TUNING.lateralApproach);
  s.x += s.lateral * dt;
  s.distance += s.speed * dt;
  const edge = courseCenter(s.distance);
  if (Math.abs(s.x - edge) > TUNING.edgeBleedHalfWidth) s.speed *= Math.pow(TUNING.edgeBleedFactor, dt);
  s.x = clamp(s.x, edge - TUNING.corridorHalfWidth, edge + TUNING.corridorHalfWidth);
  return boosting;
}

/** Source enterSpeedZone (absolute x; mutates `s`). */
export function enterSpeedZone(s, zone) {
  if (s.airborne || s.bail > 0 || s.distance < zone.start || s.distance > zone.end || Math.abs(s.x - zone.x) > zone.width / 2) return false;
  s.zoneBoost = TUNING.zoneBoostSeconds;
  s.speed = Math.max(s.speed, TUNING.zoneMinSpeed);
  return true;
}

/** Source launch (mutates `s`). */
export function launch(s, velocity) {
  s.airborne = true;
  s.vy = velocity;
  s.airTime = 0;
  s.charge = 0;
  s.tricks = [];
  s.trick = null;
}

/** Source remainingAirTime, including the downhill landing-surface term. */
export function remainingAirTime(s, ground) {
  const v = s.vy + s.speed * .18;
  return (v + Math.sqrt(v * v + 40 * Math.max(0, s.y - ground))) / 20;
}

/** Source beginTrick (mutates `s`). */
export function beginTrick(s, code) {
  if (!s.airborne || s.trick || !TRICKS[code]) return false;
  s.trick = { code, ...TRICKS[code], elapsed: 0 };
  return true;
}

/** Source advanceTrick (mutates `s`). Returns true when the trick banks.
 * Bounded-wire deviation: at most bankedTricksCap+1 tricks bank per air
 * (unreachable in practice — the shortest trick is .58 s). */
export function advanceTrick(s, dt) {
  if (!s.trick) return false;
  s.trick.elapsed += dt;
  if (s.trick.elapsed < s.trick.duration) return false;
  if (s.tricks.length <= TUNING.bankedTricksCap) {
    s.tricks.push({ code: s.trick.code, points: s.trick.points });
  }
  s.trick = null;
  return true;
}

/** Source land (mutates `s`). Returns { bailed, points }. */
export function land(s) {
  const bailed = !!s.trick && s.trick.elapsed / s.trick.duration < TUNING.bailTrickProgress;
  if (!bailed && s.trick) s.tricks.push({ code: s.trick.code, points: s.trick.points });
  const points = bailed ? 0 : awardCombo(s.tricks, s.airTime);
  if (bailed) {
    s.speed *= TUNING.bailSpeedFactor;
    s.bail = TUNING.bailSeconds;
  } else if (points) {
    s.score += points;
    s.bestCombo = Math.max(s.bestCombo, points);
    s.boost = clamp(s.boost + points / TUNING.boostPerLandingPoint, 0, TUNING.boostMax);
    s.landings += 1;
  }
  s.airborne = false;
  s.tricks = [];
  s.trick = null;
  s.charge = 0;
  return { bailed, points };
}

// --- shared-race state and step ---------------------------------------------------

/**
 * A fresh rider state at the start gate. `slot` spreads riders laterally
 * across the source-wide start line (the source's six-rider field spans
 * ±12; eight riders spread ±19.25, inside the ±35 corridor).
 */
export function initialState(slot = 0, slotCount = 1) {
  const spread = 5.5;
  const x = slotCount > 1 ? clamp((slot - (slotCount - 1) / 2) * spread, -19, 19) : 0;
  return {
    slot,
    s: 0,
    x,
    lateral: 0,
    v: TUNING.startSpeed,
    boost: TUNING.boostStart,
    y: groundHeight(x, 0),
    vy: 0,
    airborne: false,
    airTime: 0,
    charge: 0,
    tricks: [],
    trick: null,
    trickQueue: null,
    trickBuffer: 0,
    trickHeld: { Q: false, E: false, X: false },
    jumpWasHeld: false,
    score: 0,
    bestCombo: 0,
    landings: 0,
    bail: 0,
    time: 0,
    zoneBoost: 0,
    boosting: false,
    tucking: false,
    leaning: false,
    carving: false,
    carveCharge: 0,
    carveReward: 0,
    pickupsClaimed: [],
    finishTick: null,
    finishMs: null,
    finishKey: null,
    dnfReason: null,
    resetSeq: 0,
  };
}

/** Strict D7 control shape, already validated at the protocol boundary. */
export function neutralControls() {
  return { kind: 'neutral' };
}

/**
 * Normalizes wire controls into the strict ride tuple. Neutral becomes a
 * braking rider (source semantics: no input coasts toward base speed; brake
 * fully slows; charge is cancelled by neutralization at the controller).
 */
export function normalizeControls(controls) {
  if (!controls || typeof controls !== 'object' || controls.kind === 'neutral') {
    return { steer: 0, tuck: false, lean: false, brake: true, boost: false, jumpHeld: false, trick: { Q: false, E: false, X: false } };
  }
  const steer = Number.isFinite(controls.steer) ? Math.max(-1, Math.min(1, controls.steer)) : 0;
  return {
    steer,
    tuck: controls.tuck === true,
    lean: controls.lean === true,
    brake: controls.brake !== false,
    boost: controls.boost === true,
    jumpHeld: controls.jumpHeld === true,
    trick: {
      Q: controls.trickQ === true,
      E: controls.trickE === true,
      X: controls.trickX === true,
    },
  };
}

const round6 = (value) => (Object.is(value, -0) ? 0 : Math.round(value * 1e6) / 1e6);

/**
 * Advance one 30 Hz tick — the source tick() running-section port.
 * `course` is the sampler object from loadCourse(); `prev` is the pre-step
 * state (ramp-edge sweeps); `tick` is the caller's monotonic tick index
 * (finish key identity). Returns `{ state, events }`.
 *
 * Events: speed_zone, carve_reward, super_pop, launch{cause},
 * ramp_launch{rampId}, trick_complete{code,name,points}, bail, clean_landing
 * {points}, pickup{id}, finish{finishMs,score,bestCombo}.
 */
export function step(course, state, controlsRaw, prev = null, tick = 0) {
  const controls = normalizeControls(controlsRaw);
  const events = [];
  const next = { ...state, trick: state.trick ? { ...state.trick } : null, trickHeld: { ...state.trickHeld } };
  const previous = prev ?? state;

  // Terminal riders stop simulating (authoritative order already recorded).
  if (next.finishTick !== null || next.dnfReason !== null) {
    return { state: next, events };
  }

  const dt = DT;
  const ramps = course.ramps;
  const zones = course.speedZones;

  // 1. Timers (source: time/toastTime/bail/trickBuffer decay).
  next.time += dt;
  next.bail = Math.max(0, next.bail - dt);
  next.trickBuffer = Math.max(0, next.trickBuffer - dt);

  // 2. Speed zones — entering toast fires only when zoneBoost was empty.
  //    The source helpers speak the source field names (distance/speed); the
  //    shared adapter presents the wire state (s/v) to them.
  const motionState = toSourceMotionState(next);
  for (const zone of zones) {
    const entering = next.zoneBoost <= 0;
    if (enterSpeedZone(motionState, zone) && entering) {
      events.push({ type: 'speed_zone', zoneId: zone.id });
    }
  }

  // 3. Motion (bail zeroes steering and forces brake, like the source tick).
  const previousCarveReward = next.carveReward;
  next.boosting = stepMotion(motionState, {
    steer: next.bail > 0 ? 0 : controls.steer,
    brake: controls.brake || next.bail > 0,
    crouch: controls.tuck,
    lean: controls.lean,
    boost: controls.boost,
  }, dt);

  if (next.carveReward > previousCarveReward) {
    events.push({ type: 'carve_reward', count: next.carveReward });
  }

  // 4. Charge while Space is held on the ground (source allows it during bail).
  if (controls.jumpHeld && !next.airborne) {
    next.charge = clamp(next.charge + dt * TUNING.chargeRate, 0, 1);
  }

  // 5. Jump release edge → pop (source jump() on Space keyup).
  if (next.jumpWasHeld && !controls.jumpHeld && !next.airborne && next.bail <= 0) {
    const superPop = next.tucking && next.charge >= TUNING.superPopCharge;
    launch(next, popVelocity(next));
    events.push({ type: 'launch', cause: superPop ? 'super_pop' : 'release' });
    if (superPop) events.push({ type: 'super_pop' });
  }
  next.jumpWasHeld = controls.jumpHeld;

  // 6. Trick key edges: press in the air starts immediately (if free),
  //    otherwise queues with the source 0.8 s buffer.
  for (const code of TRICK_CODES) {
    const wasHeld = next.trickHeld[code];
    const isHeld = controls.trick[code];
    if (!wasHeld && isHeld) {
      if (!beginTrick(next, code)) {
        next.trickQueue = code;
        next.trickBuffer = TRICK_BUFFER_SECONDS;
      }
    }
    next.trickHeld[code] = isHeld;
  }

  // 7. Ramp-edge launches: swept crossing of ramp.end within the ramp's line.
  const before = previous.s ?? next.s;
  const previousX = previous.x ?? next.x;
  const ground = surfaceHeight(next.x, next.s, ramps);
  if (!next.airborne && next.bail <= 0) {
    for (const ramp of ramps) {
      if (before <= ramp.end && next.s > ramp.end) {
        const span = next.s - before;
        const t = span > 1e-9 ? (ramp.end - before) / span : 1;
        const crossingX = previousX + (next.x - previousX) * t;
        if (Math.abs(crossingX - ramp.x) <= ramp.width / 2) {
          next.y = rampHeight(ramp, ramp.end);
          launch(next, rampLaunchVelocity(next.v, next.charge));
          events.push({ type: 'ramp_launch', rampId: ramp.id });
          events.push({ type: 'launch', cause: `ramp:${ramp.id}` });
          break;
        }
      }
    }
  }

  // 8. Airborne / ground contact (source order: ballistic → trick start →
  //    advance → landing; off-ramp drop; grounded snap).
  if (next.airborne) {
    next.airTime += dt;
    next.vy -= TUNING.gravity * dt;
    next.y += next.vy * dt;
    if (!next.trick) {
      const buffered = next.trickBuffer > 0 ? next.trickQueue : null;
      const held = TRICK_CODES.find((code) => controls.trick[code] && remainingAirTime(motionState, ground) > TRICKS[code].duration + TRICK_AIRTIME_MARGIN);
      if (beginTrick(next, buffered || held)) {
        next.trickQueue = null;
        next.trickBuffer = 0;
      }
    }
    if (advanceTrick(next, dt)) {
      const banked = next.tricks[next.tricks.length - 1];
      events.push({ type: 'trick_complete', code: banked?.code, points: banked?.points });
    }
    if (next.y <= ground) {
      next.y = ground;
      const { bailed, points } = land(motionState);
      next.trickQueue = null;
      next.trickBuffer = 0;
      if (bailed) events.push({ type: 'bail' });
      else if (points > 0) events.push({ type: 'clean_landing', points });
      else if (next.airTime > 1) events.push({ type: 'nice_air', airTime: round6(next.airTime) });
    }
  } else if (next.y > ground + RAMP_EDGE_DROP && ramps.some((r) => onRamp(r, previousX, before))) {
    // Rode off a ramp's side/back edge: fall with zero pop (source).
    launch(next, 0);
    events.push({ type: 'launch', cause: 'edge' });
  } else {
    next.y = ground;
  }

  // 9. Pickups: per-rider claims (multiplayer adaptation), source windows.
  if (next.y - ground < TUNING.pickupHeightWindow) {
    for (const p of course.pickups) {
      if (next.pickupsClaimed.includes(p.id)) continue;
      if (Math.abs(p.d - next.s) < TUNING.pickupDistanceWindow && Math.abs(p.x - next.x) < TUNING.pickupLateralWindow) {
        next.pickupsClaimed = [...next.pickupsClaimed, p.id];
        next.score += TUNING.pickupScore;
        next.boost = clamp(next.boost + TUNING.pickupBoost, 0, TUNING.boostMax);
        events.push({ type: 'pickup', id: p.id });
      }
    }
  }

  // 10. Finish: swept crossing of the finish plane records the deterministic
  // within-tick key (tick + fraction) * 1000/30 — never a client clock.
  if (next.finishTick === null && next.s >= course.finish.s) {
    const span = next.s - before;
    const fraction = span > 1e-9 ? clamp((course.finish.s - before) / span, 0, 1) : 1;
    const key = (tick + fraction) * (1000 / 30);
    next.s = course.finish.s;
    next.finishTick = tick;
    next.finishKey = key;
    next.finishMs = Math.round(key);
    events.push({ type: 'finish', key, finishMs: next.finishMs, score: next.score, bestCombo: next.bestCombo });
  }

  // Numerical hygiene: keep the wire shape stable and damp cross-runtime
  // last-ulp drift without disturbing source feel (≤5e-7 per tick).
  next.s = round6(next.s);
  next.x = round6(next.x);
  next.v = round6(next.v);
  next.lateral = round6(next.lateral);
  next.y = round6(next.y);
  next.vy = round6(next.vy);
  next.charge = round6(next.charge);
  next.bail = round6(next.bail);
  next.airTime = round6(next.airTime);
  next.zoneBoost = round6(next.zoneBoost);
  next.carveCharge = round6(next.carveCharge);
  next.trickBuffer = round6(next.trickBuffer);
  next.boost = round6(next.boost);

  return { state: next, events };
}

/**
 * The step's source-shaped helpers (stepMotion, enterSpeedZone,
 * remainingAirTime, land) speak the source field names (`distance`/`speed`);
 * the wire state uses `s`/`v`. This adapter presents the wire state to them
 * without copying, so every source helper runs its verbatim arithmetic.
 */
function toSourceMotionState(next) {
  const proxy = new Proxy(next, {
    get(target, prop) {
      if (prop === 'distance') return target.s;
      if (prop === 'speed') return target.v;
      return target[prop];
    },
    set(target, prop, value) {
      if (prop === 'distance') target.s = value;
      else if (prop === 'speed') target.v = value;
      else target[prop] = value;
      return true;
    },
  });
  return proxy;
}

/**
 * World-space placement for render and remote interpolation (source
 * convention): x is already absolute, z = -s.
 */
export function worldPosition(course, state, out = {}) {
  out.x = state.x;
  out.y = state.y;
  out.z = -state.s;
  return out;
}

/**
 * Run `ticks` fixed steps from a fresh (or given) state. Fixture/golden
 * helper and the server scheduler's core: at most `maxCatchUpSteps` per
 * frame is enforced by callers, never here.
 */
export function simulate(course, controls, ticks, start = null, slotCount = 1) {
  let state = start ?? initialState(0, slotCount);
  let prev = null;
  const trace = [];
  for (let tick = 0; tick < ticks; tick++) {
    const result = step(course, state, typeof controls === 'function' ? controls(tick, state) : controls, prev, tick);
    state = result.state;
    trace.push({ tick, events: result.events, state });
    prev = state;
  }
  return { state, trace };
}
