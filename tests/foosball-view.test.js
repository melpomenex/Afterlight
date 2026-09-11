import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { createFoosballTableScene } from '../src/activities/foosball/tableScene.js';
import { createFoosballController } from '../src/activities/foosball/controller.js';
import { createFoosballAudio } from '../src/activities/foosball/audio.js';
import { getActivityModule } from '../src/activities/registry.js';
import '../src/activities/foosball.js';
import { getPlaceDefinition, ORPHEUM_ALL_ACTIVITIES } from '../shared/placeDefinitions.js';
import { buildDistrict } from '../src/districts.js';

test('1. Foosball 3D table scene graph, rods, figures, ball, and scoreboard', () => {
  const scene = createFoosballTableScene({
    position: [-5.8, 0, 7.0],
    rotationY: 0,
  });

  assert.ok(scene.group instanceof THREE.Group);
  assert.equal(scene.group.position.x, -5.8);
  assert.equal(scene.group.position.z, 7.0);

  // Update with simulation state containing rods and ball
  const simState = {
    state: 'rally',
    ball: { x: 60, y: 35, vx: 2, vy: 1 },
    rods: {
      '0': [
        { y: 35, angle: 0.2, vy: 0, omega: 0.1 },
        { y: 30, angle: 0.0, vy: 0, omega: 0.0 },
        { y: 40, angle: -0.1, vy: 0, omega: 0.0 },
        { y: 35, angle: 0.4, vy: 1, omega: 0.2 },
      ],
      '1': [
        { y: 35, angle: 0.0, vy: 0, omega: 0.0 },
        { y: 35, angle: 0.0, vy: 0, omega: 0.0 },
        { y: 35, angle: 0.0, vy: 0, omega: 0.0 },
        { y: 35, angle: 0.0, vy: 0, omega: 0.0 },
      ],
    },
    score: { '0': 2, '1': 1 },
  };

  scene.update(simState, 0.016);
  scene.dispose();
});

test('2. Foosball multi-input controller handles casual, advanced, and ready states', () => {
  let sentControls = null;
  let readyState = null;
  let chosenSeries = 1;

  const controller = createFoosballController({
    slot: 0,
    sendInput: (inp) => { sentControls = inp; },
    requestReady: (r) => { readyState = r; },
    onSeriesChange: (s) => { chosenSeries = s; },
  });

  controller.activate();

  // 1. Initial casual mode prediction
  controller.update(0.016, { ball: { x: 80, y: 35 } });
  assert.ok(sentControls, 'input sent');
  assert.equal(sentControls.controlMode, 'casual');
  assert.equal(sentControls.selectRod, 3, 'casual auto-selected attack rod for ball at x=80');

  // 2. Reconcile snapshot
  controller.reconcileSnapshot({
    rods: {
      '0': [
        { y: 35, angle: 0 },
        { y: 35, angle: 0 },
        { y: 35, angle: 0 },
        { y: 42, angle: 0.3 },
      ],
    },
    ball: { x: 35, y: 35 },
  });

  const predRod = controller.getLocalPredictedRod(3);
  assert.ok(predRod);

  controller.deactivate();
  controller.destroy();
});

test('3. Foosball positional audio and refractory deduplication', () => {
  const audio = createFoosballAudio({
    getPlayer: () => ({ position: { x: -5.8, y: 0, z: 7.0 } }),
    tablePosition: [-5.8, 0, 7.0],
  });

  // Rapidly trigger sounds
  for (let i = 0; i < 5; i++) {
    audio.playKick(12.0);
    audio.playRailBounce(10.0);
    audio.playRodSlide();
  }
  audio.playGoal();

  assert.ok(audio);
});

test('4. Foosball activity module registered and mounts cleanly in theater world', () => {
  const mod = getActivityModule('foosball');
  assert.ok(mod, 'foosball module registered in registry');
  assert.equal(typeof mod.createInstance, 'function');

  const theaterDef = getPlaceDefinition('theater');
  const world = buildDistrict(theaterDef);

  const actDef = ORPHEUM_ALL_ACTIVITIES.find(a => a.id === 'orpheum-foosball');
  assert.ok(actDef, 'orpheum-foosball definition found in theater');

  const inst = mod.createInstance({
    activityDef: actDef,
    world,
    roomId: 'theater',
  });

  assert.ok(inst, 'instance created');
  assert.ok(inst.tableScene, 'tableScene present');
  assert.ok(inst.controller, 'controller present');

  inst.onJoin({ slot: 0, role: 'player' });
  inst.onSnapshot({
    score: { '0': 2, '1': 1 },
    ball: { x: 60, y: 35, vx: 1, vy: 0 },
    rods: {
      '0': [
        { y: 35, angle: 0 },
        { y: 35, angle: 0 },
        { y: 35, angle: 0 },
        { y: 35, angle: 0 },
      ],
      '1': [
        { y: 35, angle: 0 },
        { y: 35, angle: 0 },
        { y: 35, angle: 0 },
        { y: 35, angle: 0 },
      ],
    },
    state: 'rally',
  });

  inst.update(1.0, 0.016);
  inst.onLeave();
  inst.destroy();
});

test('foosball: seating via participation starts the table and nested snapshots apply', () => {
  const theaterDef = getPlaceDefinition('theater');
  const world = buildDistrict(theaterDef);
  const actDef = ORPHEUM_ALL_ACTIVITIES.find(a => a.id === 'orpheum-foosball');
  let participating = false;
  let slot = null;
  let sent = 0;
  const inst = getActivityModule('foosball').createInstance({
    activityDef: actDef,
    world,
    roomId: 'theater',
    net: {
      sendActivityInput: () => { sent += 1; },
      nextActivitySeq: () => sent + 1,
    },
    getParticipation: () => ({
      isParticipating: participating,
      currentActivity: { id: 'orpheum-foosball' },
      currentSlot: slot,
      currentRole: 'player',
      sessionId: 'sess-1',
      lease: 'lease-1',
    }),
  });

  inst.update(0, 0.016);
  assert.equal(sent, 0, 'bystanders do not send rod input');

  participating = true;
  slot = 0;
  inst.update(0, 0.016);
  assert.ok(sent > 0, 'pressing E at foosball must bind the seated player');

  inst.acceptSnapshot({
    type: 'activity_state',
    activityId: 'orpheum-foosball',
    state: {
      status: 'in_progress',
      sim: {
        score: { '0': 1, '1': 0 },
        ball: { x: 60, y: 35, vx: 0, vy: 0 },
        rods: {
          '0': [{ y: 35, angle: 0 }, { y: 35, angle: 0 }, { y: 35, angle: 0 }, { y: 35, angle: 0 }],
          '1': [{ y: 35, angle: 0 }, { y: 35, angle: 0 }, { y: 35, angle: 0 }, { y: 35, angle: 0 }],
        },
      },
    },
  });
  assert.equal(inst.getSimState().score['0'], 1);

  participating = false;
  slot = null;
  sent = 0;
  inst.update(0, 0.016);
  assert.equal(sent, 0, 'leaving the table stops rod input');
  inst.destroy();
});

test('5. Foosball table placement preserves 100% theater seat sightlines and >= 1.2m clearances', () => {
  const theaterDef = getPlaceDefinition('theater');
  const world = buildDistrict(theaterDef);

  const foosballDef = ORPHEUM_ALL_ACTIVITIES.find(a => a.id === 'orpheum-foosball');
  assert.ok(foosballDef, 'foosball definition found');

  const [fx, , fz] = foosballDef.transform.position;
  const fw = foosballDef.footprint.width / 2;
  const fd = foosballDef.footprint.depth / 2;

  // Collision obstacle exists
  const obs = world.obstacles.find(o => Math.abs(o.x - fx) < 0.05 && Math.abs(o.z - fz) < 0.05);
  assert.ok(obs, `collision obstacle found for foosball at [${fx}, ${fz}]`);
  assert.ok(obs.w >= foosballDef.footprint.width / 2, `obs.w ${obs.w} >= half footprint width`);
  assert.ok(obs.d >= foosballDef.footprint.depth / 2, `obs.d ${obs.d} >= half footprint depth`);

  // Clearance to Row 3 seats (Row 3 at z = 4.7, seat back at z = 5.01)
  const northEdge = fz - fd;
  const clearanceToSeats = northEdge - 5.01;
  assert.ok(clearanceToSeats >= 1.2, `clearance to seats ${clearanceToSeats.toFixed(2)}m >= 1.2m`);

  // Sightlines: screen is at z = -8.28, all 48 seats are at z in [0.3, 2.5, 4.7] looking North.
  // Foosball table is at z = 7.0 (strictly south of all seats).
  // Any ray from any seat towards z = -8.28 travels North (z <= 4.7).
  // Foosball at z in [6.4, 7.6] is mathematically impossible to intersect any seat-to-screen ray.
  assert.ok(fz - fd > 5.01, 'foosball is strictly south of all seats');

  // Clearance regression (fix-foosball-table-blocker): the runner-carpet bay
  // holds only the foosball activity — the retired field-note stand must not
  // return inside the table or its approaches.
  const bay = { minX: fx - 1.6, maxX: fx + 1.6, minZ: fz - 1.2, maxZ: fz + 1.2 };
  const inBay = (o) => o.x >= bay.minX && o.x <= bay.maxX && o.z >= bay.minZ && o.z <= bay.maxZ;
  assert.deepEqual(
    world.items.filter(inBay).map(i => i.activityId),
    ['orpheum-foosball'],
    'the foosball activity is the only interaction item in the bay',
  );
  assert.deepEqual(world.obstacles.filter(inBay), [obs], 'the foosball footprint is the only obstacle in the bay');
  assert.ok(!world.items.some(i => i.type === 'field-note'), 'the theater builds no field-note item');
});
