import test from 'node:test';
import assert from 'node:assert/strict';

import * as THREE from 'three';
import {
  DOWNHILL_WORLD_AMBIENT_PROFILES,
  getDownhillAmbientProfile,
  createRendering,
} from '../games/downhill-mayhem/src/game/rendering.js';
import { createDownhillMayhemRuntime } from '../games/downhill-mayhem/src/host/runtime.js';
import { createDownhillMayhemHost } from '../games/downhill-mayhem/src/host/index.js';
import { createDownhillSceneAdapter } from '../src/activities/downhill/scene.js';
import { createDownhillController } from '../src/activities/downhill/controller.js';
import { generateCourseDocument, loadCourse } from '../games/downhill-mayhem/src/game/course.js';
import { initialRiderState, stepRider, TICK_HZ, DT } from '../shared/downhill/rules.js';

const COURSE = generateCourseDocument({ mountain: 'classic' });

function makeStubRenderer() {
  return {
    render() {},
    domElement: {},
    setSize() {},
    setPixelRatio() {},
    dispose() {},
  };
}

test('DOWNHILL_WORLD_AMBIENT_PROFILES defines all six authored worlds with valid colors', () => {
  const worlds = ['coastal', 'rainforest', 'alpine', 'desert', 'redwood', 'cloud'];
  assert.equal(Object.keys(DOWNHILL_WORLD_AMBIENT_PROFILES).length, 6);

  for (const w of worlds) {
    const p = DOWNHILL_WORLD_AMBIENT_PROFILES[w];
    assert.ok(p, `profile exists for ${w}`);
    assert.equal(p.id, w);
    assert.ok(typeof p.sky === 'number');
    assert.ok(typeof p.fog === 'number');
    assert.ok(typeof p.hemiSky === 'number');
    assert.ok(typeof p.hemiGround === 'number');
    assert.ok(typeof p.sun === 'number');
    assert.ok(typeof p.sunIntensity === 'number');
    assert.ok(typeof p.fill === 'number');
    assert.ok(typeof p.glow === 'number');
    assert.ok(typeof p.sunCold === 'number');
    assert.ok(typeof p.sunMid === 'number');
    assert.ok(typeof p.sunWarm === 'number');
  }
});

test('getDownhillAmbientProfile resolves string, presentation object, and defaults to alpine', () => {
  assert.equal(getDownhillAmbientProfile('desert').id, 'desert');
  assert.equal(getDownhillAmbientProfile({ worldId: 'rainforest' }).id, 'rainforest');
  assert.equal(getDownhillAmbientProfile({ atmosphereProfile: 'cloud' }).id, 'cloud');
  assert.equal(getDownhillAmbientProfile('unknown-id').id, 'alpine');
  assert.equal(getDownhillAmbientProfile(null).id, 'alpine');
  assert.equal(getDownhillAmbientProfile(undefined).id, 'alpine');
});

test('createRendering applies ambient profile and updates dynamically without breaking scene', () => {
  const rendering = createRendering({
    viewport: () => ({ width: 800, height: 600 }),
    initialWorldPresentation: 'desert',
  });

  const desert = DOWNHILL_WORLD_AMBIENT_PROFILES.desert;
  assert.equal(rendering.scene.background.getHex(), desert.sky);
  assert.equal(rendering.scene.fog.color.getHex(), desert.fog);
  assert.equal(rendering.hemi.color.getHex(), desert.hemiSky);
  assert.equal(rendering.hemi.groundColor.getHex(), desert.hemiGround);
  assert.equal(rendering.sun.color.getHex(), desert.sun);
  assert.equal(rendering.fill.color.getHex(), desert.fill);
  assert.equal(rendering.getCurrentAmbientProfile().id, 'desert');

  // Update profile dynamically to coastal
  rendering.setAmbientProfile('coastal');
  const coastal = DOWNHILL_WORLD_AMBIENT_PROFILES.coastal;
  assert.equal(rendering.scene.background.getHex(), coastal.sky);
  assert.equal(rendering.scene.fog.color.getHex(), coastal.fog);
  assert.equal(rendering.hemi.color.getHex(), coastal.hemiSky);
  assert.equal(rendering.hemi.groundColor.getHex(), coastal.hemiGround);
  assert.equal(rendering.sun.color.getHex(), coastal.sun);
  assert.equal(rendering.fill.color.getHex(), coastal.fill);
  assert.equal(rendering.getCurrentAmbientProfile().id, 'coastal');

  // updateSun shifts color towards profile sunCold/sunWarm
  rendering.updateSun(0.0, 0.3, 0.7); // cold altitude
  const sunColdColor = rendering.sun.color.clone();
  assert.ok(sunColdColor.r > 0, 'sun has valid color in cold altitude');

  rendering.updateSun(1.0, 0.3, 0.7); // warm altitude
  const sunWarmColor = rendering.sun.color.clone();
  assert.notEqual(sunColdColor.getHex(), sunWarmColor.getHex(), 'sun color warms as altitude changes');

  rendering.dispose();
});

test('createDownhillMayhemRuntime and host expose ambient profile setters and getters', async () => {
  const renderer = makeStubRenderer();
  const host = await createDownhillMayhemHost({
    renderer,
    viewport: () => ({ width: 800, height: 400 }),
    courseDocument: COURSE,
    initialWorldPresentation: 'cloud',
    authority: 'local',
  });

  assert.equal(typeof host.setAmbientProfile, 'function');
  assert.equal(typeof host.getAmbientProfile, 'function');
  assert.equal(typeof host.setWorldPresentation, 'function');
  assert.equal(typeof host.getWorldPresentation, 'function');

  assert.equal(host.getAmbientProfile().id, 'cloud');
  assert.equal(host.getWorldPresentation().id, 'cloud');

  // Scene adapter forwarding
  const adapter = createDownhillSceneAdapter(host);
  assert.equal(adapter.getAmbientProfile().id, 'cloud');
  assert.equal(adapter.getWorldPresentation().id, 'cloud');

  adapter.setAmbientProfile('rainforest');
  assert.equal(adapter.getAmbientProfile().id, 'rainforest');
  assert.equal(host.getAmbientProfile().id, 'rainforest');

  adapter.setWorldPresentation({ worldId: 'redwood' });
  assert.equal(adapter.getWorldPresentation().id, 'redwood');
  assert.equal(host.getWorldPresentation().id, 'redwood');

  host.dispose();
});

test('ambient profile changes do NOT affect course geometry or simulation determinism', () => {
  const course = loadCourse(COURSE);
  const riderA = initialRiderState(0, { difficulty: 'mayhem', isAI: false, seed: 42 });
  const riderB = initialRiderState(0, { difficulty: 'mayhem', isAI: false, seed: 42 });

  riderA.inp = { pedal: 1, brake: 0, steer: 0.5, hop: false, boost: false, punch: false, trick: null };
  riderB.inp = { pedal: 1, brake: 0, steer: 0.5, hop: false, boost: false, punch: false, trick: null };

  // Step rider A
  for (let i = 0; i < 60; i++) {
    stepRider(course, riderA, DT, { finishS: course.finishS, elapsed: i * DT, riders: [riderA] });
  }

  // Resolving or changing ambient profiles does not touch simulation state
  getDownhillAmbientProfile('desert');
  getDownhillAmbientProfile('coastal');

  // Step rider B
  for (let i = 0; i < 60; i++) {
    stepRider(course, riderB, DT, { finishS: course.finishS, elapsed: i * DT, riders: [riderB] });
  }

  assert.equal(riderA.s, riderB.s);
  assert.equal(riderA.vs, riderB.vs);
  assert.equal(riderA.lat, riderB.lat);
  assert.equal(riderA.y, riderB.y);
});

test('createDownhillController handles world presentation options, methods, and subscription', () => {
  let unsubCalled = false;
  const originalState = globalThis.__afterlightWorldState;
  globalThis.__afterlightWorldState = {
    selection: { worldId: 'rainforest', variantId: 'rainforest-dusk' },
    subscribe(cb) {
      return () => { unsubCalled = true; };
    },
  };

  try {
    const controller = createDownhillController({
      activityDef: { type: 'downhill-mayhem', course: { id: 'classic' } },
      getWorldSelection: () => ({ worldId: 'cloud' }),
    });

    assert.equal(typeof controller.setAmbientProfile, 'function');
    assert.equal(typeof controller.getAmbientProfile, 'function');
    assert.equal(typeof controller.setWorldPresentation, 'function');
    assert.equal(typeof controller.getWorldPresentation, 'function');

    const wp = controller.getWorldPresentation();
    assert.equal(wp.worldId, 'cloud');

    controller.dispose();
    assert.equal(unsubCalled, true, 'unsubscribed from world state on controller dispose');
  } finally {
    globalThis.__afterlightWorldState = originalState;
  }
});
