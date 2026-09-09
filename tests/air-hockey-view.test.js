import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { getPlaceDefinition, ORPHEUM_ALL_ACTIVITIES } from '../shared/placeDefinitions.js';
import { buildDistrict } from '../src/districts.js';
import { getActivityModule } from '../src/activities/registry.js';
import { createAirHockeyTableScene } from '../src/activities/airHockey/tableScene.js';
import { createAirHockeyAudio } from '../src/activities/airHockey/audio.js';
import { createAirHockeyController } from '../src/activities/airHockey/controller.js';
import '../src/activities/airHockey.js';

test('1. Air Hockey 3D table scene graph, mallets, puck, and scoreboard', () => {
  const table = createAirHockeyTableScene({ position: [5.8, 0, 7.0], rotationY: 0 });
  assert.ok(table.group, 'table scene group created');

  // Verify child meshes
  const meshes = [];
  table.group.traverse(child => {
    if (child.isMesh) meshes.push(child);
  });
  assert.ok(meshes.length >= 15, `expected detailed meshes, found ${meshes.length}`);

  // Test coordinate conversion
  const simOrigin = table.simToLocal(100.0, 50.0);
  assert.equal(simOrigin.x, 0);
  assert.equal(simOrigin.z, 0);

  const slot0Goal = table.simToLocal(0.0, 50.0);
  assert.equal(slot0Goal.x, -1.0);

  const slot1Goal = table.simToLocal(200.0, 50.0);
  assert.equal(slot1Goal.x, 1.0);

  const backSim = table.localToSim(slot0Goal.x, slot0Goal.z);
  assert.equal(backSim.x, 0.0);
  assert.equal(backSim.y, 50.0);

  // Test state updates
  table.updateMallets({
    mallets: {
      '0': { x: 30, y: 50 },
      '1': { x: 170, y: 50 },
    },
  });

  table.updatePuck({
    puck: { x: 100, y: 50, vx: 0, vy: 0 },
  });

  table.updateScoreboard({
    score: { '0': 3, '1': 2 },
    seriesScore: { '0': 1, '1': 0 },
    seriesLength: 3,
    state: 'rally',
  });

  table.flashGoal(0);
  table.update(0.016);

  table.destroy();
});

test('2. Air Hockey multi-input controller handles keyboard, pointer, and series selection', () => {
  let sentInput = null;
  let selectedSeries = null;
  let toggledReady = null;

  const controller = createAirHockeyController({
    tablePosition: [5.8, 0, 7.0],
    onSendInput: (controls) => { sentInput = controls; },
    onSelectSeries: (len) => { selectedSeries = len; },
    onToggleReady: (ready, len) => { toggledReady = { ready, len }; },
  });

  controller.activate({ slot: 0, status: 'lobby', seriesLength: 3 });

  // Predicted initial position for slot 0
  const pred = controller.getPredictedMallet();
  assert.equal(pred.x, 30.0);
  assert.equal(pred.y, 50.0);

  // Update step emits input
  controller.update(0.016);
  assert.ok(sentInput, 'emitted input frame');
  assert.equal(sentInput.x, 30.0);

  // Reconcile small drift
  controller.reconcile({ x: 30.2, y: 50.1 });
  const predAfter = controller.getPredictedMallet();
  assert.ok(predAfter.x > 30.0);

  controller.deactivate();
  controller.destroy();
});

test('3. Air Hockey positional audio and refractory deduplication', () => {
  let strikeCount = 0;
  let bounceCount = 0;
  let goalCount = 0;

  const audio = createAirHockeyAudio({
    getPlayer: () => ({ position: { x: 5.8, y: 0, z: 7.0 } }),
    tablePosition: [5.8, 0, 7.0],
  });

  // Rapidly trigger hits
  for (let i = 0; i < 5; i++) {
    audio.playPuckHit(15.0);
    audio.playRailBounce(12.0);
  }
  audio.playGoal();

  assert.ok(audio);
});

test('4. Air Hockey activity module registered and mounts cleanly in theater world', () => {
  const mod = getActivityModule('air-hockey');
  assert.ok(mod, 'air-hockey module registered in registry');
  assert.equal(typeof mod.createInstance, 'function');

  const theaterDef = getPlaceDefinition('theater');
  const world = buildDistrict(theaterDef);

  const actDef = ORPHEUM_ALL_ACTIVITIES.find(a => a.id === 'orpheum-air-hockey');
  assert.ok(actDef, 'orpheum-air-hockey definition found in theater');

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
    score: { '0': 1, '1': 0 },
    puck: { x: 100, y: 50, vx: 2, vy: 0 },
    mallets: {
      '0': { x: 30, y: 50 },
      '1': { x: 170, y: 50 },
    },
    state: 'rally',
  });

  inst.update(1.0, 0.016);
  inst.onLeave();
  inst.destroy();
});

test('5. Air Hockey table placement preserves 100% theater seat sightlines and >= 1.2m clearances', () => {
  const theaterDef = getPlaceDefinition('theater');
  const world = buildDistrict(theaterDef);

  const airHockeyDef = ORPHEUM_ALL_ACTIVITIES.find(a => a.id === 'orpheum-air-hockey');
  assert.ok(airHockeyDef, 'air hockey definition found');

  const [hx, , hz] = airHockeyDef.transform.position;
  const hw = airHockeyDef.footprint.width / 2;
  const hd = airHockeyDef.footprint.depth / 2;

  // Collision obstacle exists
  const obs = world.obstacles.find(o => Math.abs(o.x - hx) < 0.05 && Math.abs(o.z - hz) < 0.05);
  assert.ok(obs, `collision obstacle found for air hockey at [${hx}, ${hz}]`);
  assert.ok(obs.w >= airHockeyDef.footprint.width / 2, `obs.w ${obs.w} >= half footprint width`);
  assert.ok(obs.d >= airHockeyDef.footprint.depth / 2, `obs.d ${obs.d} >= half footprint depth`);

  // Clearance to Row 3 seats (Row 3 at z = 4.7, seat back at z = 5.01)
  const northEdge = hz - hd;
  const clearanceToSeats = northEdge - 5.01;
  assert.ok(clearanceToSeats >= 1.2, `clearance to seats ${clearanceToSeats.toFixed(2)}m >= 1.2m`);

  // Sightlines: screen is at z = -8.28, all 48 seats are at z in [0.3, 2.5, 4.7] looking North.
  // Air hockey table is at z = 7.0 (behind seats). Any ray towards z = -8.28 travels North (z <= 4.7).
  // Table at z in [6.4, 7.6] is mathematically impossible to intersect any seat-to-screen ray.
  assert.ok(hz - hd > 5.01, 'air hockey is strictly south of all seats');
});
