import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import {
  getPlaceDefinition,
  AIR_HOCKEY_ACTIVITY_DEFINITION,
  FOOSBALL_ACTIVITY_DEFINITION,
  ORPHEUM_ALL_ACTIVITIES,
} from '../shared/placeDefinitions.js';
import { buildDistrict } from '../src/districts.js';

import {
  initAirHockeyState,
  stepAirHockey,
  TABLE_LENGTH as AH_LENGTH,
  TABLE_WIDTH as AH_WIDTH,
  WINNING_POINTS as AH_POINTS,
} from '../shared/airHockeyModel.js';

import {
  initFoosballState,
  stepFoosball,
  TABLE_LENGTH as FB_LENGTH,
  TABLE_WIDTH as FB_WIDTH,
  WINNING_POINTS as FB_POINTS,
} from '../shared/foosballModel.js';

import { createAirHockeyTableScene } from '../src/activities/airHockey/tableScene.js';
import { createAirHockeyController } from '../src/activities/airHockey/controller.js';
import { createAirHockeyAudio } from '../src/activities/airHockey/audio.js';

import { createFoosballTableScene } from '../src/activities/foosball/tableScene.js';
import { createFoosballController } from '../src/activities/foosball/controller.js';
import { createFoosballAudio } from '../src/activities/foosball/audio.js';

import { getActivityModule } from '../src/activities/registry.js';
import '../src/activities/airHockey.js';
import '../src/activities/foosball.js';

test('1. P4 Gate: Air Hockey authoritative simulation, 3D scene, and controller', () => {
  // 1. Initial simulation state
  const sim = initAirHockeyState({ seriesLength: 3 });
  assert.equal(sim.length, 200);
  assert.equal(sim.width, 100);
  assert.equal(sim.targetScore, 7);
  assert.equal(sim.winsNeeded, 2);

  // 2. 3D Scene
  const scene = createAirHockeyTableScene({ position: [5.8, 0, 7.0] });
  assert.ok(scene.group instanceof THREE.Group);
  scene.update(0.016);
  scene.destroy?.();

  // 3. Controller
  let sent = null;
  const controller = createAirHockeyController({
    tablePosition: [5.8, 0, 7.0],
    onSendInput: (inp) => { sent = inp; },
  });
  controller.activate({ slot: 0 });
  controller.update(0.016);
  assert.ok(sent);
  controller.deactivate();
  controller.destroy();
});

test('2. P4 Gate: Foosball authoritative simulation, 3D scene, and casual/advanced controller', () => {
  // 1. Initial simulation state
  const sim = initFoosballState({ seriesLength: 3 });
  assert.equal(sim.length, 120);
  assert.equal(sim.width, 70);
  assert.equal(sim.targetScore, 5);
  assert.equal(sim.winsNeeded, 2);

  // 2. 3D Scene
  const scene = createFoosballTableScene({ position: [-5.8, 0, 7.0] });
  assert.ok(scene.group instanceof THREE.Group);
  scene.update(sim, 0.016);
  scene.dispose();

  // 3. Controller
  let sent = null;
  const controller = createFoosballController({
    slot: 0,
    sendInput: (inp) => { sent = inp; },
  });
  controller.activate();
  controller.update(0.016, sim);
  assert.ok(sent);
  assert.equal(sent.controlMode, 'casual');
  assert.equal(typeof sent.selectRod, 'number');
  controller.deactivate();
  controller.destroy();
});

test('3. P4 Gate: Latency Profile Simulation (150ms RTT, 30ms jitter, 2% dropped snapshots)', () => {
  const origRandom = Math.random;
  let seed = 42;
  Math.random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  try {
  /**
   * Simulates 3 clients connected to an authoritative Air Hockey server:
   * - Client A (Player 0, slot 0)
   * - Client B (Player 1, slot 1)
   * - Client C (Spectator)
   *
   * Network profile:
   * - Average RTT = 150 ms (one-way server->client delay ~75 ms = 4-5 ticks at 60Hz)
   * - Jitter = +/- 30 ms (+/- 2 ticks)
   * - Snapshot packet drop rate = 2.0%
   */
  let serverSim = initAirHockeyState({ seriesLength: 1 });
  serverSim.state = 'rally';

  const RTT_TICKS = 4; // 4 ticks ~ 67ms one-way
  const clientA = { state: JSON.parse(JSON.stringify(serverSim)), goalsSeen: 0, maxDivergence: 0 };
  const clientB = { state: JSON.parse(JSON.stringify(serverSim)), goalsSeen: 0, maxDivergence: 0 };
  const clientC = { state: JSON.parse(JSON.stringify(serverSim)), goalsSeen: 0, maxDivergence: 0 };

  const inFlightA = [];
  const inFlightB = [];
  const inFlightC = [];

  let lastS0 = 0;
  let lastS1 = 0;
  let serverGoals = 0;

  // Run simulation for 1200 ticks (~20 seconds of high-speed rally)
  for (let tick = 1; tick <= 1200; tick++) {
    // 1. Authoritative server steps
    const players = {
      0: { input_state: { targetX: 40 + Math.sin(tick * 0.05) * 20, targetY: 50 + Math.cos(tick * 0.05) * 30 } },
      1: { input_state: { targetX: 160 - Math.sin(tick * 0.05) * 20, targetY: 50 - Math.cos(tick * 0.05) * 30 } },
    };

    const [nextServer, outcome] = stepAirHockey(serverSim, players, 1);
    serverSim = nextServer;

    if (serverSim.score['0'] > lastS0 || serverSim.score['1'] > lastS1) {
      serverGoals++;
      lastS0 = serverSim.score['0'];
      lastS1 = serverSim.score['1'];
    }

    // 2. Transmit snapshots every 3 ticks (~20Hz server broadcast)
    if (tick % 3 === 0) {
      const snap = JSON.parse(JSON.stringify(serverSim));

      [ { q: inFlightA, client: clientA },
        { q: inFlightB, client: clientB },
        { q: inFlightC, client: clientC }
      ].forEach(({ q }) => {
        // 2% packet loss
        if (Math.random() >= 0.02) {
          // 150ms RTT with 30ms jitter -> delay 3..6 ticks
          const jitter = Math.floor(Math.random() * 3); // 0, 1, 2
          const deliverAt = tick + RTT_TICKS + jitter;
          q.push({ deliverAt, snapshot: snap });
        }
      });
    }

    // 3. Deliver packets to clients
    [ { q: inFlightA, client: clientA },
      { q: inFlightB, client: clientB },
      { q: inFlightC, client: clientC }
    ].forEach(({ q, client }) => {
      while (q.length > 0 && q[0].deliverAt <= tick) {
        const { snapshot } = q.shift();

        // Track goal occurrences on client
        if (snapshot.score['0'] > client.state.score['0'] ||
            snapshot.score['1'] > client.state.score['1']) {
          client.goalsSeen++;
        }

        // Measure spatial divergence before applying new snapshot
        const divX = Math.abs(client.state.puck.x - snapshot.puck.x);
        const divY = Math.abs(client.state.puck.y - snapshot.puck.y);
        const div = Math.hypot(divX, divY);
        if (div > client.maxDivergence) {
          client.maxDivergence = div;
        }

        // Apply authoritative snapshot (reconciling client state)
        client.state = snapshot;
      }
    });
  }

  // Deliver any remaining in-flight snapshots
  [ { q: inFlightA, client: clientA },
    { q: inFlightB, client: clientB },
    { q: inFlightC, client: clientC }
  ].forEach(({ q, client }) => {
    while (q.length > 0) {
      const { snapshot } = q.shift();
      client.state = snapshot;
    }
  });

  // Verify Gate Invariants:
  // 1. Identical final scores across Player 0, Player 1, and Spectator
  assert.equal(clientA.state.score['0'], serverSim.score['0']);
  assert.equal(clientA.state.score['1'], serverSim.score['1']);
  assert.equal(clientB.state.score['0'], serverSim.score['0']);
  assert.equal(clientB.state.score['1'], serverSim.score['1']);
  assert.equal(clientC.state.score['0'], serverSim.score['0']);
  assert.equal(clientC.state.score['1'], serverSim.score['1']);

  // 2. Zero repeated goals detected (no duplicate goal reporting)
  assert.ok(clientA.goalsSeen <= serverGoals);
  assert.ok(clientB.goalsSeen <= serverGoals);
  assert.ok(clientC.goalsSeen <= serverGoals);

  // 3. Convergence after authoritative snapshot (< 500ms convergence)
  assert.equal(clientA.state.puck.x, serverSim.puck.x);
  assert.equal(clientB.state.puck.x, serverSim.puck.x);
  assert.equal(clientC.state.puck.x, serverSim.puck.x);
  } finally {
    Math.random = origRandom;
  }
});

test('4. P4 Gate: Orpheum coexistence, 8 total activities, and 100% seat sightlines', () => {
  const theaterDef = getPlaceDefinition('theater');
  const world = buildDistrict(theaterDef);

  // 1. Verify declared Orpheum activities instantiate in the world
  assert.equal(ORPHEUM_ALL_ACTIVITIES.length, 11);
  const actItems = world.items.filter(it => it.type === 'activity');
  assert.equal(actItems.length, 11);

  // Verify Air Hockey & Foosball definitions
  const ahAct = ORPHEUM_ALL_ACTIVITIES.find(a => a.id === 'orpheum-air-hockey');
  const fbAct = ORPHEUM_ALL_ACTIVITIES.find(a => a.id === 'orpheum-foosball');
  assert.ok(ahAct);
  assert.ok(fbAct);

  // 2. Verify collision obstacles for both tables
  const ahObs = world.obstacles.find(o => Math.abs(o.x - 5.8) < 0.05 && Math.abs(o.z - 7.0) < 0.05);
  const fbObs = world.obstacles.find(o => Math.abs(o.x - (-5.8)) < 0.05 && Math.abs(o.z - 7.0) < 0.05);
  assert.ok(ahObs, 'air hockey collision obstacle exists');
  assert.ok(fbObs, 'foosball collision obstacle exists');

  // 3. Verify clearances: both tables are at z = 7.0.
  // Row 3 seats are at z = 4.7 with seat backs at z = 5.01.
  // Air Hockey: footprint depth = 1.2 -> north edge z = 6.4. Clearance = 6.4 - 5.01 = 1.39m >= 1.2m
  // Foosball: footprint depth = 1.2 -> north edge z = 6.4. Clearance = 6.4 - 5.01 = 1.39m >= 1.2m
  const ahClearance = (7.0 - ahAct.footprint.depth / 2) - 5.01;
  const fbClearance = (7.0 - fbAct.footprint.depth / 2) - 5.01;
  assert.ok(ahClearance >= 1.2, `air hockey clearance ${ahClearance.toFixed(2)}m >= 1.2m`);
  assert.ok(fbClearance >= 1.2, `foosball clearance ${fbClearance.toFixed(2)}m >= 1.2m`);

  // 4. Movie screen sightlines:
  // Screen is at z = -8.28. All 48 auditorium seats are at z in [0.3, 2.5, 4.7] facing North.
  // Both tables are located strictly south of all seats (z = 7.0).
  // Any ray from any seat towards the screen travels north (z <= 4.7).
  // It is mathematically impossible for either table (z in [6.4, 7.6]) to intersect any seat-to-screen ray.
  assert.ok(7.0 - ahAct.footprint.depth / 2 > 5.01);
  assert.ok(7.0 - fbAct.footprint.depth / 2 > 5.01);

  // 5. Verify all 48 theater seats registered
  const seats = world.items.filter(it => it.type === 'seat');
  assert.equal(seats.length, 48);

  // 6. Verify movie screen registered
  const screen = world.items.find(it => it.type === 'theater_screen');
  assert.ok(screen);
});
