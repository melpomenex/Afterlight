import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initRack,
  strikeCueBall,
  step,
  BALL_RADIUS,
  BALL_DIAMETER,
  HALF_LENGTH,
  HALF_WIDTH,
  POCKETS,
} from '../shared/pool/physics.js';

test('pool physics: initial rack setup and frozen bounds', () => {
  const table = initRack();
  assert.equal(table.settled, true);
  assert.equal(table.tick, 0);
  assert.equal(Object.keys(table.balls).length, 16); // cue + 15 object balls

  const cue = table.balls['0'];
  assert.equal(cue.id, 0);
  assert.equal(cue.state, 'in_play');
  assert.equal(cue.x, -0.56);
  assert.equal(cue.z, 0.0);

  // 8-ball is ball 8, positioned in center of 3rd row
  const eight = table.balls['8'];
  assert.ok(eight);
  assert.equal(eight.id, 8);
  assert.equal(eight.state, 'in_play');
  assert.ok(eight.x > 0.56); // downstream from apex
});

test('pool physics: sliding to rolling transition under cloth friction', () => {
  // Pure sliding shot (stun shot: no initial roll wx/wz/wy) on isolated table
  let table = {
    balls: {
      '0': { id: 0, x: -0.8, z: 0.0, vx: 0.0, vz: 0.0, wx: 0.0, wz: 0.0, wy: 0.0, state: 'in_play' },
    },
    settled: false,
    events: [],
    tick: 0,
  };
  table = strikeCueBall(table, 0.0, 1.0, 0.0, 0.0);

  let cue = table.balls['0'];
  assert.equal(table.settled, false);
  assert.equal(cue.vx, 1.0);
  assert.equal(cue.wz, 0.0); // initially no rolling rotation

  // Step 20 ticks (~0.33s) — enough time to reach rolling regime
  for (let i = 0; i < 20; i++) {
    const res = step(table, 1 / 60);
    table = res.state;
  }

  cue = table.balls['0'];
  // Cloth friction generates forward rolling torque (wz > 0) until wz * R ~= vx
  assert.ok(cue.wz > 0, 'wz should be positive from forward sliding friction torque');
  const rollDiff = Math.abs(cue.vx - cue.wz * BALL_RADIUS);
  assert.ok(rollDiff < 0.001, `rolling difference ${rollDiff} should be zero in pure rolling regime`);
});

test('pool physics: head-on elastic ball-ball collision', () => {
  // Set cue ball at (-0.2, 0) moving towards ball 1 at (0, 0)
  let table = {
    balls: {
      '0': { id: 0, x: -0.2, z: 0.0, vx: 2.0, vz: 0.0, wx: 0.0, wz: 0.0, wy: 0.0, state: 'in_play' },
      '1': { id: 1, x: 0.0, z: 0.0, vx: 0.0, vz: 0.0, wx: 0.0, wz: 0.0, wy: 0.0, state: 'in_play' },
    },
    settled: false,
    events: [],
    tick: 0,
  };

  let collisionEvent = null;
  for (let i = 0; i < 20; i++) {
    const res = step(table, 1 / 60);
    table = res.state;
    const hit = res.events.find((e) => e.type === 'ball_collision');
    if (hit) {
      collisionEvent = hit;
      break;
    }
  }

  assert.ok(collisionEvent, 'Ball collision event must be generated');
  assert.equal(collisionEvent.ballA, 0);
  assert.equal(collisionEvent.ballB, 1);

  // Ball 1 should now be moving forward with the majority of cue velocity
  const b0 = table.balls['0'];
  const b1 = table.balls['1'];
  assert.ok(b1.vx > 1.5, 'Target ball should receive forward momentum');
  assert.ok(b0.vx < 0.5, 'Cue ball should transfer most momentum in head-on collision');
});

test('pool physics: cushion rail bounces with spin deflection', () => {
  // Shot towards foot rail (+X) with right-hand english spin (spinX > 0)
  let table = {
    balls: {
      '0': { id: 0, x: 0.9, z: 0.0, vx: 3.0, vz: 0.0, wx: 0.0, wz: 0.0, wy: 10.0, state: 'in_play' },
    },
    settled: false,
    events: [],
    tick: 0,
  };

  let railEvent = null;
  for (let i = 0; i < 20; i++) {
    const res = step(table, 1 / 60);
    table = res.state;
    const rail = res.events.find((e) => e.type === 'rail_collision');
    if (rail) {
      railEvent = rail;
      break;
    }
  }

  assert.ok(railEvent, 'Rail collision event must be generated');
  assert.equal(railEvent.rail, 'foot');

  const cue = table.balls['0'];
  assert.ok(cue.vx < 0, 'Cue ball should reverse X direction after hitting foot rail');
  // English spin should deflect Z velocity away from 0
  assert.notEqual(cue.vz, 0.0, 'Side spin should impart deflection along the rail plane');
});

test('pool physics: pocket capture transitions ball state', () => {
  // Shot directed directly into corner_tl pocket (-1.12, -0.56)
  let table = {
    balls: {
      '0': { id: 0, x: -1.0, z: -0.50, vx: -1.5, vz: -0.75, wx: 0.0, wz: 0.0, wy: 0.0, state: 'in_play' },
    },
    settled: false,
    events: [],
    tick: 0,
  };

  let pocketEvent = null;
  for (let i = 0; i < 30; i++) {
    const res = step(table, 1 / 60);
    table = res.state;
    const pkt = res.events.find((e) => e.type === 'pocketed');
    if (pkt) {
      pocketEvent = pkt;
      break;
    }
  }

  assert.ok(pocketEvent, 'Pocket event must be emitted');
  assert.equal(pocketEvent.ballId, 0);
  assert.equal(pocketEvent.pocketId, 'corner_tl');
  assert.equal(table.balls['0'].state, 'pocketed');
  assert.equal(table.balls['0'].vx, 0.0);
  assert.equal(table.balls['0'].vz, 0.0);
});

test('pool physics: maximum-power break shot (15 m/s) does not tunnel', () => {
  // Maximum power break straight into the full 15-ball rack
  let table = initRack({ cueX: -0.56, cueZ: 0.0 });
  table = strikeCueBall(table, 0.0, 15.0, 0.0, 0.0);

  assert.equal(table.balls['0'].vx, 15.0);

  let collisionOccurred = false;
  // Step through the break impact (approx 0.1s -> 6 ticks)
  for (let i = 0; i < 20; i++) {
    const res = step(table, 1 / 60);
    table = res.state;
    if (res.events.some((e) => e.type === 'ball_collision')) {
      collisionOccurred = true;
    }

    // Check no ball is outside table boundary
    for (const b of Object.values(table.balls)) {
      if (b.state === 'in_play') {
        assert.ok(
          b.x >= -HALF_LENGTH - 0.05 && b.x <= HALF_LENGTH + 0.05,
          `Ball ${b.id} X ${b.x} out of bounds without being pocketed`
        );
        assert.ok(
          b.z >= -HALF_WIDTH - 0.05 && b.z <= HALF_WIDTH + 0.05,
          `Ball ${b.id} Z ${b.z} out of bounds without being pocketed`
        );
      }
    }
  }

  assert.ok(collisionOccurred, 'Maximum power break must register ball collisions without tunneling');
});

test('pool physics: settling detection zeroes micro-velocities', () => {
  // Gentle roll that will quickly slow down and settle
  let table = {
    balls: {
      '0': { id: 0, x: 0.0, z: 0.0, vx: 0.02, vz: 0.0, wx: 0.0, wz: 0.0, wy: 0.0, state: 'in_play' },
    },
    settled: false,
    events: [],
    tick: 0,
  };

  for (let i = 0; i < 60; i++) {
    const res = step(table, 1 / 60);
    table = res.state;
    if (table.settled) break;
  }

  assert.equal(table.settled, true);
  assert.equal(table.balls['0'].vx, 0.0);
  assert.equal(table.balls['0'].vz, 0.0);
  assert.equal(table.balls['0'].wx, 0.0);
  assert.equal(table.balls['0'].wz, 0.0);
  assert.equal(table.balls['0'].wy, 0.0);
});

// convincing-billiards-audio: additive presentation metadata. These cases are
// mirrored op-for-op in server_elixir/test/afterlight/activities/pool_physics_test.exs
// — the two engines must stamp identical event identity (shot/step/t),
// positions and pre-impact speeds.

function metaBall(id, x, z, vx = 0, vz = 0) {
  return { id, x, z, vx, vz, wx: 0.0, wz: 0.0, wy: 0.0, state: 'in_play' };
}

test('pool physics: strike stamps monotonic shot identity and shot clock', () => {
  const table = {
    balls: { '0': metaBall(0, -0.6, 0), '1': metaBall(1, 0.6, 0) },
    settled: true,
    events: [],
    tick: 0,
  };

  const shot1 = strikeCueBall(table, 0, 3, 0, 0);
  assert.equal(shot1.shot, 1);
  assert.equal(shot1.shotTime, 0.0);
  const shot2 = strikeCueBall(shot1, 0, 3, 0, 0);
  assert.equal(shot2.shot, 2, 'shot identity increments per strike');
});

test('pool physics: collision events carry shot/step/t identity and contact midpoint', () => {
  let table = strikeCueBall(
    {
      balls: { '0': metaBall(0, -0.3, 0, 0, 0), '1': metaBall(1, 0.0, 0) },
      settled: true,
      events: [],
      tick: 4,
    },
    0,
    2.0,
    0,
    0,
  );

  let collision = null;
  for (let i = 0; i < 30 && !collision; i++) {
    const res = step(table, 1 / 60);
    table = res.state;
    collision = res.events.find((e) => e.type === 'ball_collision') || null;
  }

  assert.ok(collision, 'head-on shot must collide');
  assert.equal(collision.shot, 1, 'collision carries the strike identity');
  assert.equal(collision.step, table.tick, 'collision step is the step tick that produced it');
  assert.ok(Number.isFinite(collision.t) && collision.t >= 0, 'collision t is a finite shot time');
  assert.ok(Math.abs(collision.x) < 0.2 && Math.abs(collision.z) < 0.2, 'contact midpoint is on the table');
  assert.ok(collision.speed > 0, 'closing speed is present');
});

test('pool physics: rail events carry pre-impact normal speed and clamped contact position', () => {
  let table = {
    balls: { '0': metaBall(0, 1.08, 0.0, 1.5, 0) },
    settled: false,
    events: [],
    tick: 0,
    shot: 7,
    shotTime: 0.25,
  };

  let rail = null;
  for (let i = 0; i < 10 && !rail; i++) {
    const res = step(table, 1 / 60);
    table = res.state;
    rail = res.events.find((e) => e.type === 'rail_collision') || null;
  }

  assert.ok(rail, 'ball heading into the foot cushion must bounce');
  assert.equal(rail.rail, 'foot');
  assert.ok(Math.abs(rail.speed - 1.5) < 0.05, `pre-impact speed preserved (got ${rail.speed})`);
  assert.ok(Math.abs(rail.x - (HALF_LENGTH - BALL_RADIUS)) < 1e-9, 'contact x is the clamped cushion plane');
  assert.equal(rail.shot, 7, 'legacy-extended state keeps its shot id');
  assert.equal(rail.step, table.tick);
});

test('pool physics: pocket events carry pocket center position and capture speed', () => {
  let table = {
    balls: { '0': metaBall(0, 1.05, 0.5, 1.2, 0.4) },
    settled: false,
    events: [],
    tick: 0,
  };

  let pocket = null;
  for (let i = 0; i < 30 && !pocket; i++) {
    const res = step(table, 1 / 60);
    table = res.state;
    pocket = res.events.find((e) => e.type === 'pocketed') || null;
  }

  assert.ok(pocket, 'ball entering the corner must be captured');
  assert.equal(pocket.pocketId, 'corner_br');
  const cornerBr = POCKETS.find((p) => p.id === 'corner_br');
  assert.equal(pocket.x, cornerBr.x, 'position falls back to the pocket center');
  assert.equal(pocket.z, cornerBr.z);
  assert.ok(Number.isFinite(pocket.speed) && pocket.speed >= 0, 'capture speed present');
  assert.ok(Number.isFinite(pocket.t), 'pocket t is stamped');
});
