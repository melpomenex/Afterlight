/**
 * Summit Run authoritative kinematics (add-multiplayer-snowboard-arcade 3.2,
 * design D5): one fixed-step arcade course model, pure and renderer-free.
 *
 * The SAME step math runs in three places: this module (browser predictor and
 * Node golden fixtures), the Elixir authority
 * (Afterlight.Activities.Snowboard, ported op-for-op in 4.1), and the tuning
 * contract in tests/fixtures/snowboard/contract.json. Any tuning change must
 * update the contract fixtures, both runtimes and the golden vectors
 * together, and bump rulesVersion when simulation semantics change.
 *
 * Step evaluation order (D5, normative):
 *   input/watchdog → recovery or motion integration → boundary/obstacle
 *   swept collision → terrain contact → ordered gate crossing → terminal.
 * Keep the arithmetic flat and in this exact order: JS and Elixir must agree
 * to ≤1cm position / 0.01 m/s velocity over a 180-second fixture (D10).
 *
 * Coordinate convention: s downhill meters, u lateral from centerline,
 * y surface height + BOARD_CLEARANCE. World placement: x = centerX(s) + u,
 * z = -s.
 */

export const DT = 1 / 30;
export const TICK_HZ = 30;

// Tuning constants — contract.json simulation block (frozen, rulesVersion 1).
export const TUNING = Object.freeze({
  gradeGravity: 9.81,
  gradeMax: 0.6,
  tuckAccel: 4,
  cruiseAccel: 1.5,
  dragCoefficient: 0.006,
  brakeDecel: 12,
  shoulderDecel: 6,
  speedMin: 0,
  speedMax: 45,
  startSpeed: 8,
  steerSpeedGroomed: 10,
  steerSpeedTuck: 7,
  lateralGroundApproach: 8,
  lateralAirApproach: 2,
  carveDrag: 1.5,
  corridorHalfWidth: 24,
  groomedHalfWidth: 18,
  boundarySpeedLossFraction: 0.2,
  boundaryCooldownSeconds: 0.5,
  gravity: 20,
  jumpBase: 7,
  jumpChargeBonus: 6,
  jumpChargeSeconds: 0.75,
  rampBoost: 3,
  crashImpactNormalSpeed: 16,
  crashResetSpeed: 8,
  crashRecoverySeconds: 0.75,
  riderCapsuleRadius: 0.6,
  boardClearance: 0.5,
  groundDropLaunchMeters: 1.2,
  gateAltitudeCeiling: 30,
});

/** Integer recovery length in ticks: ceil(0.75s / dt) = 23. */
export const RECOVERY_TICKS = Math.ceil(TUNING.crashRecoverySeconds / DT);

/**
 * A fresh rider state at the start gate. `slot` spreads riders laterally so
 * the start line never stacks a field of eight at one point.
 */
export function initialState(slot = 0, slotCount = 1) {
  const spread = 3;
  const offset = slotCount > 1 ? (slot - (slotCount - 1) / 2) * spread : 0;
  return {
    s: 0,
    u: Math.max(-12, Math.min(12, offset)),
    v: TUNING.startSpeed,
    vu: 0,
    y: 0,
    vy: 0,
    grounded: true,
    jumpCharge: 0,
    recoveryTicks: 0,
    nextCheckpoint: 1,
    finishTick: null,
    finishMs: null,
    finishKey: null,
    dnfReason: null,
    crossedRampIds: [],
    boundaryCooldownSeconds: 0,
    splitKeys: [],
    resetSeq: 0,
  };
}

/** Strict D7 control shape, already validated at the protocol boundary. */
export function neutralControls() {
  return { kind: 'neutral' };
}

export function normalizeControls(controls) {
  if (!controls || typeof controls !== 'object' || controls.kind === 'neutral') {
    return { steer: 0, tuck: false, brake: true, jumpHeld: false };
  }
  const steer = Number.isFinite(controls.steer) ? Math.max(-1, Math.min(1, controls.steer)) : 0;
  return {
    steer,
    tuck: controls.tuck === true,
    brake: controls.brake !== false,
    jumpHeld: controls.jumpHeld === true,
  };
}

const round6 = (value) => Object.is(value, -0) ? 0 : Math.round(value * 1e6) / 1e6;

/**
 * Advance one 30 Hz tick. `course` is the sampler object from
 * loadCourse(); `prev` is the pre-step state (swept collision/gates);
 * `tick` is the caller's monotonic tick index (finish key identity, D6).
 * Returns `{ state, events }`.
 */
export function step(course, state, controlsRaw, prev = null, tick = 0) {
  const controls = normalizeControls(controlsRaw);
  const events = [];
  const next = { ...state };

  // --- recovery: frozen, no motion, no charge, no gate evaluation -----------
  if (next.recoveryTicks > 0) {
    next.recoveryTicks -= 1;
    if (next.recoveryTicks === 0) {
      events.push({ type: 'recovery_complete' });
    }
    return { state: next, events };
  }

  const dt = DT;
  const stepMeters = next.v * dt;

  // --- grade acceleration ----------------------------------------------------
  // Tangent downhill grade at the rider's lateral position, from the same
  // sampled grid the renderer draws (D5). Forward/backward sampling clamped
  // to the route.
  const sBack = Math.max(0, next.s - 2);
  const sAhead = Math.min(course.lengthMeters, next.s + 2);
  const span = Math.max(1e-6, sAhead - sBack);
  const slope = (course.heightAt(sAhead, next.u) - course.heightAt(sBack, next.u)) / span;
  const gSlope = Math.max(0, Math.min(TUNING.gradeMax, -slope));

  const outsideGroomed = Math.abs(next.u) > TUNING.groomedHalfWidth;
  const drive = controls.tuck ? TUNING.tuckAccel : TUNING.cruiseAccel;
  const a = TUNING.gradeGravity * gSlope
    + drive
    - TUNING.dragCoefficient * next.v * next.v
    - (controls.brake ? TUNING.brakeDecel : 0)
    - (outsideGroomed ? TUNING.shoulderDecel : 0);

  if (next.grounded) {
    next.v = Math.max(TUNING.speedMin, Math.min(TUNING.speedMax, next.v + a * dt));
  } else {
    // Air drag only — no drive, no brake, no shoulder on airborne boards.
    next.v = Math.max(TUNING.speedMin, Math.min(TUNING.speedMax,
      next.v - TUNING.dragCoefficient * next.v * next.v * dt));
  }

  // --- progress: speed before position, then lateral (D5 order) --------------
  const prevS = next.s;
  next.s = next.s + next.v * dt;

  const desiredVu = controls.steer * (controls.tuck ? TUNING.steerSpeedTuck : TUNING.steerSpeedGroomed);
  const approachFactor = Math.min(1, (next.grounded ? TUNING.lateralGroundApproach : TUNING.lateralAirApproach) * dt);
  next.vu = next.vu + (desiredVu - next.vu) * approachFactor;
  // Carve drag bleeds speed while carving hard on the ground.
  if (next.grounded) {
    next.v = Math.max(TUNING.speedMin, next.v - Math.abs(controls.steer) * TUNING.carveDrag * dt);
  }
  next.u = next.u + next.vu * dt;

  // --- boundary: clamp, zero outward lateral velocity, one 20% hit -----------
  if (next.boundaryCooldownSeconds > 0) {
    next.boundaryCooldownSeconds = Math.max(0, next.boundaryCooldownSeconds - dt);
  }
  if (next.u > TUNING.corridorHalfWidth) {
    next.u = TUNING.corridorHalfWidth;
    next.vu = Math.min(0, next.vu);
    if (next.boundaryCooldownSeconds === 0) {
      next.v = next.v * (1 - TUNING.boundarySpeedLossFraction);
      next.boundaryCooldownSeconds = TUNING.boundaryCooldownSeconds;
      events.push({ type: 'boundary_hit', side: 'right' });
    }
  } else if (next.u < -TUNING.corridorHalfWidth) {
    next.u = -TUNING.corridorHalfWidth;
    next.vu = Math.max(0, next.vu);
    if (next.boundaryCooldownSeconds === 0) {
      next.v = next.v * (1 - TUNING.boundarySpeedLossFraction);
      next.boundaryCooldownSeconds = TUNING.boundaryCooldownSeconds;
      events.push({ type: 'boundary_hit', side: 'left' });
    }
  }

  // --- jump charge / release and ramp lips ------------------------------------
  const groundY = course.heightAt(next.s, next.u) + TUNING.boardClearance;
  if (next.grounded) {
    const crossed = rampCrossed(course, prevS, next.s, next.u);
    if (crossed) {
      // Lip launch: one 3 m/s boost per forward crossing, plus the jump
      // (charge held now converts into the launch, base 7 when neutral).
      applyRamp(course, next, crossed, events);
    } else if (controls.jumpHeld) {
      next.jumpCharge = Math.min(1, next.jumpCharge + dt / TUNING.jumpChargeSeconds);
    } else if (next.jumpCharge > 0) {
      if (controls.brake) {
        // Neutralization cancels the charge (D4/D5) — it never launches.
        next.jumpCharge = 0;
        events.push({ type: 'charge_cancelled' });
      } else {
        launch(next, course, events, 'release');
      }
    }
  }

  // --- swept obstacle collision (crash on capsule contact) -------------------
  // Expanded-box sweep of the rider center (capsule radius) along this tick's
  // motion. Runs before terrain contact (D5 order); the sweep endpoints are
  // remembered so a crash teleport later in the tick can never credit a gate
  // beyond the pre-impact segment. Airborne riders pass over obstacles whose
  // tops sit below the board.
  const sPreImpact = next.s;
  const uPreImpact = next.u;
  const obstacleHit = findObstacleHit(course, state, next, sPreImpact, uPreImpact);
  if (obstacleHit) {
    crash(next, course, events, `obstacle:${obstacleHit.obstacle.id}`);
  }

  // --- vertical motion and terrain contact ------------------------------------
  if (next.grounded) {
    const candidate = course.heightAt(next.s, next.u) + TUNING.boardClearance;
    const drop = next.y - candidate;
    if (drop > TUNING.groundDropLaunchMeters) {
      // Ground fell away (cliff edge): launch with the descent rate.
      next.grounded = false;
      next.vy = -(drop / dt);
      next.y = candidate + drop;
    } else {
      next.y = candidate;
      next.vy = 0;
    }
  } else {
    next.vy = next.vy - TUNING.gravity * dt;
    next.y = next.y + next.vy * dt;
    if (next.y <= groundY) {
      // Swept downward crossing of the current ground: land, snap, project.
      // Crash tests the impact speed along the surface NORMAL (D5), so
      // downslope landings that fall away with the rider stay forgiving.
      const gSlopeLanding = localGrade(course, next.s, next.u);
      const norm = Math.sqrt(1 + gSlopeLanding * gSlopeLanding);
      const normalSpeed = Math.abs((next.v * gSlopeLanding + next.vy) / norm);
      const impactSpeed = -next.vy;
      next.y = groundY;
      next.vy = 0;
      next.grounded = true;
      next.jumpCharge = 0;
      if (normalSpeed > TUNING.crashImpactNormalSpeed) {
        crash(next, course, events, 'impact');
      } else {
        events.push({ type: 'landing', impactSpeed: round6(impactSpeed), normalSpeed: round6(normalSpeed) });
      }
    }
  }

  // --- ordered gate crossing and terminal state (D6) --------------------------
  // Gates evaluate along the valid pre-impact swept segment only: neither an
  // obstacle teleport nor a landing reset can credit a gate.
  const sweepEnd = Math.min(next.s, sPreImpact);
  applyGates(course, next, state, sweepEnd, uPreImpact, tick, events);

  // Numerical hygiene: keep the wire shape stable.
  next.s = round6(next.s);
  next.u = round6(next.u);
  next.v = round6(next.v);
  next.vu = round6(next.vu);
  next.y = round6(next.y);
  next.vy = round6(next.vy);
  next.jumpCharge = round6(next.jumpCharge);
  next.boundaryCooldownSeconds = round6(next.boundaryCooldownSeconds);

  return { state: next, events };
}

/** Local downhill grade (clamped) at (s, u), forward/backward sampled. */
function localGrade(course, s, u) {
  const sBack = Math.max(0, s - 2);
  const sAhead = Math.min(course.lengthMeters, s + 2);
  const span = Math.max(1e-6, sAhead - sBack);
  const slope = (course.heightAt(sAhead, u) - course.heightAt(sBack, u)) / span;
  return Math.max(0, Math.min(TUNING.gradeMax, -slope));
}

function launch(state, course, events, cause, { withTangent = true } = {}) {  // Jump release adds the vertical tangent speed of the ground just ridden
  // (positive only — downhill ground contributes nothing). Ramp lips launch
  // from the base formula alone (D5: "initiate launch with base 7").
  let tangentVy = 0;
  if (withTangent) {
    const sBack = Math.max(0, state.s - 2);
    const rise = (course.heightAt(state.s, state.u) - course.heightAt(sBack, state.u)) / Math.max(1e-6, state.s - sBack);
    tangentVy = state.v * Math.max(0, rise);
  }
  state.vy = TUNING.jumpBase + TUNING.jumpChargeBonus * state.jumpCharge + tangentVy;
  state.grounded = false;
  state.jumpCharge = 0;
  events.push({ type: 'launch', cause });
}

function rampCrossed(course, prevS, s, u) {
  for (const ramp of course.ramps) {
    if (ramp.s > prevS && ramp.s <= s && u >= ramp.uMin && u <= ramp.uMax) {
      return ramp;
    }
  }
  return null;
}

function applyRamp(course, state, ramp, events) {
  if (state.crossedRampIds.includes(ramp.id)) return;
  state.crossedRampIds = [...state.crossedRampIds, ramp.id];
  state.v = Math.min(TUNING.speedMax, state.v + TUNING.rampBoost);
  launch(state, course, events, `ramp:${ramp.id}`, { withTangent: false });
}

/** Crash: bounded recovery, speed reset, reposition to a safe recovery point. */
function crash(state, course, events, cause) {
  state.recoveryTicks = RECOVERY_TICKS;
  state.v = TUNING.crashResetSpeed;
  state.vu = 0;
  state.vy = 0;
  state.jumpCharge = 0;
  state.grounded = true;
  state.resetSeq += 1;

  const point = pickRecoveryPoint(course, state);
  if (point) {
    state.s = point.s;
    state.u = point.u;
    state.y = course.heightAt(point.s, point.u) + TUNING.boardClearance;
  }
  events.push({ type: 'crash', cause, resetSeq: state.resetSeq });
}

/**
 * The safe recovery point nearest behind the crash site that never requires
 * crossing an unearned gate (D5). All riders keep their earned gates: a
 * point before the next unearned gate plane is always recoverable.
 */
export function pickRecoveryPoint(course, state) {
  const nextGate = course.gates[state.nextCheckpoint - 1];
  const nextUnearnedS = nextGate ? nextGate.s : course.finish.s;
  let best = null;
  let bestDistance = Infinity;
  for (const point of course.recoveryPoints || []) {
    if (point.s > state.s || point.s >= nextUnearnedS) continue;
    const distance = state.s - point.s;
    if (distance < bestDistance) {
      best = point;
      bestDistance = distance;
    }
  }
  // Degenerate fallback (crash right at the start): the first authored point.
  if (!best) best = (course.recoveryPoints || [])[0] ?? null;
  return best;
}

/**
 * Swept capsule-vs-obstacle test along this tick's motion segment. The rider
 * is a disc of radius TUNING.riderCapsuleRadius in (s, u) space; obstacle
 * boxes expand by that radius (no tunneling: the segment is clipped against
 * the box, not sampled). A hit only registers when the board is below the
 * obstacle top — airborne riders clear low hazards honestly.
 */
export function findObstacleHit(course, prev, next, sweepEndS, sweepEndU) {
  const radius = TUNING.riderCapsuleRadius;
  const s0 = prev.s;
  const u0 = prev.u;
  const ds = sweepEndS - s0;
  const du = sweepEndU - u0;

  for (const obstacle of course.obstacles || []) {
    const sMin = obstacle.s - obstacle.halfS - radius;
    const sMax = obstacle.s + obstacle.halfS + radius;
    const uMin = obstacle.u - obstacle.halfU - radius;
    const uMax = obstacle.u + obstacle.halfU + radius;

    // Liang–Barsky clip of the motion segment against the expanded box.
    let tEnter = 0;
    let tExit = 1;
    let missed = false;
    for (const [p0, d, lo, hi] of [[s0, ds, sMin, sMax], [u0, du, uMin, uMax]]) {
      if (Math.abs(d) < 1e-9) {
        if (p0 < lo || p0 > hi) { missed = true; break; }
        continue;
      }
      let t0 = (lo - p0) / d;
      let t1 = (hi - p0) / d;
      if (t0 > t1) [t0, t1] = [t1, t0];
      tEnter = Math.max(tEnter, t0);
      tExit = Math.min(tExit, t1);
      if (tEnter > tExit) { missed = true; break; }
    }
    if (missed || tEnter > 1 || tExit < 0) continue;

    // Height gate: the board clears the obstacle when the rider's underside
    // at the entry point sits above its top surface.
    const hitS = s0 + ds * tEnter;
    const hitU = u0 + du * tEnter;
    const top = course.heightAt(obstacle.s, obstacle.u) + obstacle.height;
    const riderBottom = (next.grounded
      ? course.heightAt(hitS, hitU)
      : next.y - TUNING.boardClearance);
    if (riderBottom > top) continue;

    return { obstacle, tEnter };
  }
  return null;
}

/**
 * Ordered gate crossing, checkpoint splits and the finish (D6). A gate only
 * credits on a forward sweep of its plane within one tick, below the
 * altitude ceiling, inside the corridor (u is pre-clamped, so the sweep end
 * governs). Multiple crossings in one tick credit in order. The finish
 * requires every checkpoint and records the exact monotonic key
 * `(tick + fraction) * 1000/30` — never a client clock.
 */
export function applyGates(course, next, prev, sweepEndS, sweepEndU, tick, events) {
  if (next.finishTick !== null || next.dnfReason !== null) return;
  const sweepStartS = prev.s;
  if (!(sweepEndS > sweepStartS)) return;

  const corridorOK = Math.abs(sweepEndU) <= TUNING.corridorHalfWidth;

  while (next.nextCheckpoint <= course.gates.length) {
    const gate = course.gates[next.nextCheckpoint - 1];
    if (!(sweepStartS < gate.s && gate.s <= sweepEndS)) break;
    if (!corridorOK) break;
    // Altitude acceptance: surface at the gate up to +ceiling.
    const surface = course.heightAt(gate.s, sweepEndU);
    if (next.y > surface + TUNING.gateAltitudeCeiling) break;
    const fraction = (gate.s - sweepStartS) / (sweepEndS - sweepStartS);
    const key = (tick + fraction) * (1000 / 30);
    next.splitKeys = [...(next.splitKeys ?? []), key];
    events.push({ type: 'checkpoint', index: next.nextCheckpoint, key: round6(key) });
    next.nextCheckpoint += 1;
  }

  if (next.nextCheckpoint > course.gates.length) {
    const finish = course.finish;
    if (sweepStartS < finish.s && finish.s <= sweepEndS && corridorOK) {
      const fraction = (finish.s - sweepStartS) / (sweepEndS - sweepStartS);
      const key = (tick + fraction) * (1000 / 30);
      next.finishTick = tick;
      next.finishKey = key;
      next.finishMs = Math.round(key);
      events.push({ type: 'finish', key, finishMs: next.finishMs });
    }
  }
}

/**
 * World-space placement for render and remote interpolation:
 * x = centerX(s) + u, y = height + clearance, z = -s.
 */
export function worldPosition(course, state, out = {}) {
  out.x = course.centerXAt(state.s) + state.u;
  out.y = state.grounded
    ? course.heightAt(state.s, state.u) + TUNING.boardClearance
    : state.y;
  out.z = -state.s;
  return out;
}

/**
 * Run `ticks` fixed steps from a fresh state. Fixture/golden helper and the
 * server scheduler's core: at most `maxCatchUpSteps` per frame is enforced by
 * callers, never here.
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
