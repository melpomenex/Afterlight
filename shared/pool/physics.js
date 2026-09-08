/**
 * Authoritative specialist planar pool/billiards physics engine (Tasks 4.1, 4.2; Design D5).
 * Matches server_elixir/lib/afterlight/activities/pool/physics.ex op-for-op.
 *
 * Guarantees:
 * - Strict 2D table mechanics: cloth sliding/rolling friction, spin dynamics, ball-ball collisions,
 *   cushion rail bounces, pocket capture, and settling detection.
 * - Zero tunneling: adaptive substepping ensures maximum displacement per substep <= 0.25 * R (7 mm)
 *   even at maximum break speed (15 m/s).
 * - Spin physics: follow (topspin), draw (backspin), and english (side spin) cushion deflections.
 * - Deterministic stepping: returns updated state and discrete event list (ball collisions, rail hits, pockets).
 */

// Table dimensions (tournament 8ft ratio 2:1 in meters)
export const TABLE_LENGTH = 2.24;
export const TABLE_WIDTH = 1.12;
export const HALF_LENGTH = 1.12;
export const HALF_WIDTH = 0.56;

// Ball specifications
export const BALL_RADIUS = 0.0285;
export const BALL_DIAMETER = 0.057;
export const BALL_MASS = 0.170;
export const GRAVITY = 9.81;

// Friction coefficients
export const MU_SLIDING = 0.20;
export const MU_ROLLING = 0.015;
export const MU_SPIN = 0.025;

// Restitution coefficients
export const BALL_RESTITUTION = 0.95;
export const RAIL_RESTITUTION = 0.75;
export const CUSHION_SPIN_FACTOR = 0.20;

// Pocket radii
export const CORNER_POCKET_RADIUS = 0.065;
export const SIDE_POCKET_RADIUS = 0.060;

// Velocity thresholds
export const SETTLE_LINEAR_THRESHOLD = 0.002;
export const SETTLE_ANGULAR_THRESHOLD = 0.05;
export const MAX_SUBSTEP_DISPLACEMENT = 0.007;

// Pocket centers in table coordinate system: X in [-1.12, 1.12], Z in [-0.56, 0.56]
export const POCKETS = Object.freeze([
  { id: 'corner_tl', x: -HALF_LENGTH, z: -HALF_WIDTH, radius: CORNER_POCKET_RADIUS },
  { id: 'corner_tr', x: -HALF_LENGTH, z: HALF_WIDTH, radius: CORNER_POCKET_RADIUS },
  { id: 'side_l', x: 0.0, z: -HALF_WIDTH, radius: SIDE_POCKET_RADIUS },
  { id: 'side_r', x: 0.0, z: HALF_WIDTH, radius: SIDE_POCKET_RADIUS },
  { id: 'corner_bl', x: HALF_LENGTH, z: -HALF_WIDTH, radius: CORNER_POCKET_RADIUS },
  { id: 'corner_br', x: HALF_LENGTH, z: HALF_WIDTH, radius: CORNER_POCKET_RADIUS },
]);

/**
 * Initializes standard 8-ball rack and cue ball state.
 */
export function initRack(opts = {}) {
  const cueX = opts.cueX !== undefined ? opts.cueX : -0.56;
  const cueZ = opts.cueZ !== undefined ? opts.cueZ : 0.0;

  const cueBall = {
    id: 0,
    x: cueX,
    z: cueZ,
    vx: 0.0,
    vz: 0.0,
    wx: 0.0,
    wz: 0.0,
    wy: 0.0,
    state: 'in_play',
  };

  const rackBalls = generateTriangularRack(0.56, 0.0);
  rackBalls['0'] = cueBall;

  return {
    balls: rackBalls,
    settled: true,
    events: [],
    tick: 0,
  };
}

/**
 * Generates standard triangular 8-ball rack positions (balls 1..15).
 */
export function generateTriangularRack(apexX, apexZ) {
  const r = BALL_RADIUS + 0.0005;
  const dx = r * Math.sqrt(3);

  const layout = [
    // Row 1 (apex)
    [1, 0, 0],
    // Row 2
    [9, 1, -1], [2, 1, 1],
    // Row 3
    [10, 2, -2], [8, 2, 0], [3, 2, 2],
    // Row 4
    [4, 3, -3], [11, 3, -1], [5, 3, 1], [12, 3, 3],
    // Row 5
    [13, 4, -4], [6, 4, -2], [14, 4, 0], [7, 4, 2], [15, 4, 4],
  ];

  const balls = {};
  for (const [id, row, col] of layout) {
    const bx = apexX + row * dx;
    const bz = apexZ + col * r;

    balls[String(id)] = {
      id,
      x: Number(bx.toFixed(5)),
      z: Number(bz.toFixed(5)),
      vx: 0.0,
      vz: 0.0,
      wx: 0.0,
      wz: 0.0,
      wy: 0.0,
      state: 'in_play',
    };
  }

  return balls;
}

/**
 * Applies a cue shot impulse to the cue ball (id: 0).
 */
export function strikeCueBall(state, angle, power, spinX = 0.0, spinY = 0.0) {
  const cue = state.balls['0'];
  if (!cue || cue.state !== 'in_play') {
    return state;
  }

  const p = Math.max(0.1, Math.min(15.0, Number(power)));
  const sx = Math.max(-1.0, Math.min(1.0, Number(spinX)));
  const sy = Math.max(-1.0, Math.min(1.0, Number(spinY)));

  const vx = Math.cos(angle) * p;
  const vz = Math.sin(angle) * p;

  const wy = sx * (p / BALL_RADIUS) * 0.4;
  const wRoll = sy * (p / BALL_RADIUS) * 1.2;
  const wx = -Math.sin(angle) * wRoll;
  const wz = Math.cos(angle) * wRoll;

  const updatedCue = {
    ...cue,
    vx,
    vz,
    wx,
    wz,
    wy,
  };

  return {
    ...state,
    balls: {
      ...state.balls,
      '0': updatedCue,
    },
    settled: false,
    events: [],
  };
}

/**
 * Steps the pool physics by deltaSec.
 * Returns { state, events }.
 */
export function step(state, deltaSec = 0.016667) {
  const balls = state.balls;
  const activeBalls = Object.values(balls).filter((b) => b.state === 'in_play');

  const maxV = maxLinearSpeed(activeBalls);
  const maxW = maxAngularSpeed(activeBalls);

  if (maxV < SETTLE_LINEAR_THRESHOLD && maxW < SETTLE_ANGULAR_THRESHOLD) {
    const settledBalls = {};
    for (const [id, b] of Object.entries(balls)) {
      if (b.state === 'in_play') {
        settledBalls[id] = { ...b, vx: 0.0, vz: 0.0, wx: 0.0, wz: 0.0, wy: 0.0 };
      } else {
        settledBalls[id] = b;
      }
    }

    const updatedState = {
      ...state,
      balls: settledBalls,
      settled: true,
      tick: state.tick + 1,
      events: [],
    };
    return { state: updatedState, events: [] };
  }

  const displacement = maxV * deltaSec;
  const substeps = Math.max(1, Math.min(36, Math.ceil(displacement / MAX_SUBSTEP_DISPLACEMENT)));
  const dtSub = deltaSec / substeps;

  let currentBalls = balls;
  let accumulatedEvents = [];

  for (let s = 0; s < substeps; s++) {
    const res = substepStep(currentBalls, dtSub, accumulatedEvents);
    currentBalls = res.balls;
    accumulatedEvents = res.events;
  }

  const remActive = Object.values(currentBalls).filter((b) => b.state === 'in_play');
  const remMaxV = maxLinearSpeed(remActive);
  const remMaxW = maxAngularSpeed(remActive);
  const isSettled = remMaxV < SETTLE_LINEAR_THRESHOLD && remMaxW < SETTLE_ANGULAR_THRESHOLD;

  let updatedBalls = currentBalls;
  if (isSettled) {
    updatedBalls = {};
    for (const [id, b] of Object.entries(currentBalls)) {
      if (b.state === 'in_play') {
        updatedBalls[id] = { ...b, vx: 0.0, vz: 0.0, wx: 0.0, wz: 0.0, wy: 0.0 };
      } else {
        updatedBalls[id] = b;
      }
    }
  }

  const updatedState = {
    ...state,
    balls: updatedBalls,
    settled: isSettled,
    tick: state.tick + 1,
    events: accumulatedEvents,
  };

  return { state: updatedState, events: accumulatedEvents };
}

function substepStep(balls, dt, events) {
  // 1. Friction & integration
  const movedBalls = {};
  for (const [id, b] of Object.entries(balls)) {
    if (b.state !== 'in_play') {
      movedBalls[id] = b;
    } else {
      movedBalls[id] = applyClothFrictionAndIntegrate(b, dt);
    }
  }

  // 2. Check pockets
  const pocketEvents = [];
  const pocketedBalls = {};
  for (const [id, b] of Object.entries(movedBalls)) {
    if (b.state !== 'in_play') {
      pocketedBalls[id] = b;
    } else {
      const pocketId = checkPockets(b);
      if (pocketId) {
        pocketedBalls[id] = {
          ...b,
          state: 'pocketed',
          vx: 0.0,
          vz: 0.0,
          wx: 0.0,
          wz: 0.0,
          wy: 0.0,
        };
        pocketEvents.push({
          type: 'pocketed',
          ballId: b.id,
          pocketId,
        });
      } else {
        pocketedBalls[id] = b;
      }
    }
  }

  // 3. Cushion rail bounces
  const railEvents = [];
  const cushionBalls = {};
  for (const [id, b] of Object.entries(pocketedBalls)) {
    if (b.state !== 'in_play') {
      cushionBalls[id] = b;
    } else {
      const { ball: bAfter, event: railEvt } = resolveCushions(b);
      if (railEvt) railEvents.push(railEvt);
      cushionBalls[id] = bAfter;
    }
  }

  // 4. Ball-ball collisions
  const { balls: finalBalls, events: collisionEvents } = resolveBallCollisions(cushionBalls);

  const newEvents = events.concat(pocketEvents, railEvents, collisionEvents);
  return { balls: finalBalls, events: newEvents };
}

function applyClothFrictionAndIntegrate(b, dt) {
  const vx = b.vx;
  const vz = b.vz;
  const wx = b.wx;
  const wz = b.wz;
  const wy = b.wy;
  const r = BALL_RADIUS;

  const uRelX = vx - r * wz;
  const uRelZ = vz + r * wx;
  const uRelMag = Math.sqrt(uRelX * uRelX + uRelZ * uRelZ);
  const maxSlideDv = 3.5 * MU_SLIDING * GRAVITY * dt;

  let nextVx, nextVz, nextWx, nextWz;

  if (uRelMag <= maxSlideDv) {
    // Transitions to pure rolling during this timestep
    const tSlide = uRelMag > 1e-6 ? uRelMag / (3.5 * MU_SLIDING * GRAVITY) : 0.0;
    const dtRoll = Math.max(0.0, dt - tSlide);

    const vRollX = vx - (2.0 / 7.0) * uRelX;
    const vRollZ = vz - (2.0 / 7.0) * uRelZ;

    const vMag = Math.sqrt(vRollX * vRollX + vRollZ * vRollZ);

    let rolledVx, rolledVz;
    if (vMag > 0.0001 && dtRoll > 0) {
      const dvRoll = Math.min(vMag, MU_ROLLING * GRAVITY * dtRoll);
      const scale = (vMag - dvRoll) / vMag;
      rolledVx = vRollX * scale;
      rolledVz = vRollZ * scale;
    } else if (vMag <= 0.0001) {
      rolledVx = 0.0;
      rolledVz = 0.0;
    } else {
      rolledVx = vRollX;
      rolledVz = vRollZ;
    }

    nextVx = rolledVx;
    nextVz = rolledVz;
    nextWx = -rolledVz / r;
    nextWz = rolledVx / r;
  } else {
    // Pure sliding throughout this timestep
    const fDirX = uRelX / uRelMag;
    const fDirZ = uRelZ / uRelMag;

    const aSlide = MU_SLIDING * GRAVITY;
    const dv = aSlide * dt;

    nextVx = vx - fDirX * dv;
    nextVz = vz - fDirZ * dv;

    const dw = (2.5 * MU_SLIDING * GRAVITY / r) * dt;
    nextWx = wx - fDirZ * dw;
    nextWz = wz + fDirX * dw;
  }

  const newWy = wy * (1.0 - MU_SPIN * dt * 10.0);
  const newX = b.x + nextVx * dt;
  const newZ = b.z + nextVz * dt;

  return {
    ...b,
    x: newX,
    z: newZ,
    vx: nextVx,
    vz: nextVz,
    wx: nextWx,
    wz: nextWz,
    wy: newWy,
  };
}

function checkPockets(b) {
  const x = b.x;
  const z = b.z;

  for (const pocket of POCKETS) {
    const dx = x - pocket.x;
    const dz = z - pocket.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist <= pocket.radius) {
      return pocket.id;
    }
  }
  return null;
}

function resolveCushions(b) {
  const r = BALL_RADIUS;
  let x = b.x;
  let z = b.z;
  let vx = b.vx;
  let vz = b.vz;
  let wy = b.wy;

  const minX = -HALF_LENGTH + r;
  const maxX = HALF_LENGTH - r;
  const minZ = -HALF_WIDTH + r;
  const maxZ = HALF_WIDTH - r;

  const nearPocket = POCKETS.some((p) => {
    const dx = x - p.x;
    const dz = z - p.z;
    return Math.sqrt(dx * dx + dz * dz) < p.radius + 0.02;
  });

  if (nearPocket) {
    return { ball: b, event: null };
  }

  let railEvt = null;

  // X rail bounces (head / foot)
  if (x < minX && vx < 0) {
    const deflectZ = wy * CUSHION_SPIN_FACTOR * Math.abs(vx);
    vx = -vx * RAIL_RESTITUTION;
    vz = vz + deflectZ;
    x = minX;
    wy = wy * 0.7;
    railEvt = { type: 'rail_collision', ballId: b.id, rail: 'head' };
  } else if (x > maxX && vx > 0) {
    const deflectZ = -wy * CUSHION_SPIN_FACTOR * Math.abs(vx);
    vx = -vx * RAIL_RESTITUTION;
    vz = vz + deflectZ;
    x = maxX;
    wy = wy * 0.7;
    railEvt = { type: 'rail_collision', ballId: b.id, rail: 'foot' };
  }

  // Z rail bounces (left / right)
  if (z < minZ && vz < 0) {
    const deflectX = -wy * CUSHION_SPIN_FACTOR * Math.abs(vz);
    vz = -vz * RAIL_RESTITUTION;
    vx = vx + deflectX;
    z = minZ;
    wy = wy * 0.7;
    railEvt = railEvt || { type: 'rail_collision', ballId: b.id, rail: 'left' };
  } else if (z > maxZ && vz > 0) {
    const deflectX = wy * CUSHION_SPIN_FACTOR * Math.abs(vz);
    vz = -vz * RAIL_RESTITUTION;
    vx = vx + deflectX;
    z = maxZ;
    wy = wy * 0.7;
    railEvt = railEvt || { type: 'rail_collision', ballId: b.id, rail: 'right' };
  }

  return {
    ball: {
      ...b,
      x,
      z,
      vx,
      vz,
      wy,
    },
    event: railEvt,
  };
}

function resolveBallCollisions(balls) {
  const keys = Object.keys(balls).sort();
  const pairs = [];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      pairs.push([keys[i], keys[j]]);
    }
  }

  const minDist = BALL_DIAMETER;
  const current = { ...balls };
  const events = [];

  for (const [idA, idB] of pairs) {
    const ba = current[idA];
    const bb = current[idB];

    if (ba.state !== 'in_play' || bb.state !== 'in_play') {
      continue;
    }

    const dx = bb.x - ba.x;
    const dz = bb.z - ba.z;
    const distSq = dx * dx + dz * dz;

    if (distSq < minDist * minDist && distSq > 1e-6) {
      const dist = Math.sqrt(distSq);
      const nx = dx / dist;
      const nz = dz / dist;

      const overlap = 0.5 * (minDist - dist);
      const baX = ba.x - nx * overlap;
      const baZ = ba.z - nz * overlap;
      const bbX = bb.x + nx * overlap;
      const bbZ = bb.z + nz * overlap;

      const relVx = bb.vx - ba.vx;
      const relVz = bb.vz - ba.vz;
      const relVNorm = relVx * nx + relVz * nz;

      if (relVNorm < 0) {
        const jImpulse = -0.5 * (1.0 + BALL_RESTITUTION) * relVNorm;

        const newBaVx = ba.vx - jImpulse * nx;
        const newBaVz = ba.vz - jImpulse * nz;
        const newBbVx = bb.vx + jImpulse * nx;
        const newBbVz = bb.vz + jImpulse * nz;

        current[idA] = {
          ...ba,
          x: baX,
          z: baZ,
          vx: newBaVx,
          vz: newBaVz,
        };

        current[idB] = {
          ...bb,
          x: bbX,
          z: bbZ,
          vx: newBbVx,
          vz: newBbVz,
        };

        events.push({
          type: 'ball_collision',
          ballA: ba.id,
          ballB: bb.id,
          speed: Math.abs(relVNorm),
        });
      }
    }
  }

  return { balls: current, events };
}

function maxLinearSpeed(balls) {
  let maxV = 0.0;
  for (const b of balls) {
    const v = Math.sqrt(b.vx * b.vx + b.vz * b.vz);
    if (v > maxV) maxV = v;
  }
  return maxV;
}

function maxAngularSpeed(balls) {
  let maxW = 0.0;
  for (const b of balls) {
    const w = Math.sqrt(b.wx * b.wx + b.wz * b.wz + b.wy * b.wy);
    if (w > maxW) maxW = w;
  }
  return maxW;
}
