import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { createAtmosphereController } from '../src/atmosphere/controller.js';
import { getPreset } from '../shared/atmospherePresets.js';

// Fake handles over REAL Three.js light/fog/color math: the controller's
// capture/restore contract is numeric, so real Colors prove exactness while
// the renderer stays a plain object (Node never constructs a WebGL context).

function createSceneFixture() {
  const scene = {
    fog: new THREE.FogExp2('#54645d', 0.018),
    background: new THREE.Color('#222d2a'),
    children: [],
  };
  // Minimal parent surface: real add/remove semantics so the controller's
  // owned-group attach/detach behaves exactly as against the live scene.
  scene.add = (object) => {
    object.parent = scene;
    scene.children.push(object);
  };
  scene.remove = (object) => {
    const at = scene.children.indexOf(object);
    if (at !== -1) scene.children.splice(at, 1);
    if (object.parent === scene) object.parent = null;
  };
  return scene;
}

function createFixture({ world = null, stateClient = null, factories = {} } = {}) {
  const scene = createSceneFixture();
  const renderer = { toneMappingExposure: 1.15 };
  const sun = new THREE.DirectionalLight('#ffe0a5', 3.0);
  const hemisphere = new THREE.HemisphereLight('#c5d9d4', '#343a2b', 2.2);
  const client = stateClient ?? createFakeStateClient();
  const controller = createAtmosphereController({
    scene,
    renderer,
    sun,
    hemisphere,
    stateClient: client,
    world: () => world,
    ...factories,
  });
  return { controller, scene, renderer, sun, hemisphere, client };
}

function createFakeStateClient({ preset = 'rain' } = {}) {
  let samples = 0;
  const state = {
    seed: 7,
    mode: 'fixed',
    preset,
    intensity: 0.8,
    wind: [0.2, 0.05],
    startedAt: 0,
    transition: null,
    time: { mode: 'fixed', phase: 0.4, anchorAt: 0, rate: 0 },
    events: [],
  };
  const client = {
    get sampleCount() { return samples; },
    getState: () => state,
    isActive: () => true,
    status: () => 'synchronized',
    sample(out = {}) {
      samples += 1;
      const visuals = getPreset(state.preset)?.visuals ?? getPreset('clear').visuals;
      out.intensity = state.intensity;
      out.windX = state.wind[0];
      out.windZ = state.wind[1];
      out.rain = getPreset(state.preset)?.rain ?? 0;
      out.cloud = getPreset(state.preset)?.cloud ?? 0;
      out.wetnessTarget = getPreset(state.preset)?.wetness ?? 0;
      out.wetness = getPreset(state.preset)?.wetness ?? 0;
      out.timePhase = state.time.phase;
      out.transitionU = null;
      out.synced = true;
      out.active = true;
      out.serverNow = 1_772_000_000_000;
      void visuals;
      return out;
    },
  };
  return client;
}

function rainDef() {
  return {
    id: 'rain-court',
    seed: 37,
    bounds: { minX: -11.3, maxX: 11.3, minZ: -9.5, maxZ: 10.3 },
    atmosphere: { preset: 'rain', weatherMode: 'fixed', timeMode: 'fixed' },
  };
}

function clearDef() {
  return { id: 'court', seed: 0, atmosphere: { preset: null, weatherMode: 'fixed', timeMode: 'fixed' } };
}

const BASELINE = Object.freeze({
  fogColor: new THREE.Color('#54645d').getHex(),
  fogDensity: 0.018,
  background: new THREE.Color('#222d2a').getHex(),
  sunColor: new THREE.Color('#ffe0a5').getHex(),
  sunIntensity: 3.0,
  hemiSky: new THREE.Color('#c5d9d4').getHex(),
  hemiGround: new THREE.Color('#343a2b').getHex(),
  hemiIntensity: 2.2,
  exposure: 1.15,
});

function assertBaselineRestored({ scene, renderer, sun, hemisphere }, message = 'baseline restored exactly') {
  assert.equal(scene.fog.color.getHex(), BASELINE.fogColor, `${message}: fog color`);
  assert.equal(scene.fog.density, BASELINE.fogDensity, `${message}: fog density`);
  assert.equal(scene.background.getHex(), BASELINE.background, `${message}: background`);
  assert.equal(sun.color.getHex(), BASELINE.sunColor, `${message}: sun color`);
  assert.equal(sun.intensity, BASELINE.sunIntensity, `${message}: sun intensity`);
  assert.equal(hemisphere.color.getHex(), BASELINE.hemiSky, `${message}: hemisphere sky`);
  assert.equal(hemisphere.groundColor.getHex(), BASELINE.hemiGround, `${message}: hemisphere ground`);
  assert.equal(hemisphere.intensity, BASELINE.hemiIntensity, `${message}: hemisphere intensity`);
  assert.equal(renderer.toneMappingExposure, BASELINE.exposure, `${message}: exposure`);
}

test('hidden worlds cost zero updates: 600 hidden frames touch nothing', () => {
  const world = { group: new THREE.Group() }; // invisible: group.visible defaults true — hide it
  world.group.visible = false;
  const { controller, client } = createFixture({ world });
  controller.activate({ roomId: 'rain-court', generation: 1, def: rainDef(), world });
  assert.ok(controller.isActive(), 'controller is active');

  for (let i = 0; i < 600; i++) controller.update(16);
  assert.equal(controller.stats.updates, 0, 'no updates ran while the world was hidden');
  assert.equal(controller.stats.skippedFrames, 600, 'all 600 frames were skipped');
  assert.equal(client.sampleCount, 0, 'the state client was never sampled');
});

test('inactive controllers cost zero updates and activation applies the preset presentation', () => {
  const { controller, client, scene, renderer, sun, hemisphere } = createFixture();
  for (let i = 0; i < 100; i++) controller.update(16);
  assert.equal(controller.stats.updates, 0, 'inactive controller never updates');
  assert.equal(client.sampleCount, 0, 'inactive controller never samples');

  const world = { group: new THREE.Group() };
  world.group.visible = true;
  controller.activate({ roomId: 'rain-court', generation: 1, def: rainDef(), world });
  controller.update(16);
  assert.equal(controller.stats.updates, 1, 'one active update ran');
  const rain = getPreset('rain').visuals;
  assert.equal(scene.fog.density, rain.fogDensity, 'fog density follows the preset');
  assert.equal(sun.intensity, rain.sunIntensity, 'sun intensity follows the preset');
  assert.equal(hemisphere.intensity, rain.hemisphereIntensity, 'hemisphere intensity follows the preset');
  assert.equal(renderer.toneMappingExposure, rain.exposure, 'exposure follows the preset');
  assert.ok(scene.fog.color.getHex() !== BASELINE.fogColor, 'fog color left the baseline');
});

test('deactivation restores every captured global exactly and is idempotent', () => {
  const fixture = createFixture();
  const { controller } = fixture;
  const world = { group: new THREE.Group() };
  controller.activate({ roomId: 'rain-court', generation: 1, def: rainDef(), world });
  controller.update(16);
  controller.update(16);
  assert.ok(controller.deactivate(), 'first deactivate tears down');
  assertBaselineRestored(fixture);
  assert.equal(controller.deactivate(), false, 'second deactivate is a no-op');
  assertBaselineRestored(fixture, 'still intact after double deactivate');
  assert.equal(controller.isActive(), false);
});

test('double dispose is safe and leaves no owned objects in the scene', () => {
  const fixture = createFixture();
  const { controller, scene } = fixture;
  const world = { group: new THREE.Group() };
  controller.activate({ roomId: 'rain-court', generation: 1, def: rainDef(), world });
  assert.equal(scene.children.length, 1, 'the owned group is attached');
  controller.dispose();
  controller.dispose();
  assert.equal(scene.children.length, 0, 'the owned group is detached');
  assertBaselineRestored(fixture);
  controller.update(16);
  assert.equal(controller.stats.updates, 0, 'disposed controller never updates');
});

test('a failed activation restores the baseline, stays inactive, and the controller recovers', () => {
  let precipitations = 0;
  const factories = {
    precipitationFactory: () => {
      precipitations += 1;
      if (precipitations === 1) throw new Error('emitter allocation failed');
      return {
        object3D: new THREE.Group(),
        batchCount: 3,
        counts: { drops: 1024, splashes: 32, runoff: 0 },
        setZones() {}, setAnchors() {}, setTier() { return false; }, setVisible() {},
        update() {}, dispose() {},
      };
    },
  };
  const fixture = createFixture({ factories });
  const { controller, scene } = fixture;
  const world = { group: new THREE.Group() };
  assert.throws(
    () => controller.activate({ roomId: 'rain-court', generation: 1, def: rainDef(), world }),
    /emitter allocation failed/,
  );
  assert.equal(controller.isActive(), false, 'failed activation leaves the controller inactive');
  assertBaselineRestored(fixture, 'baseline intact after failed activation');
  assert.equal(scene.children.length, 0, 'no partially created effects remain attached');
  assert.equal(controller.stats.failedActivations, 1, 'the failure is counted');

  // Recovery: the next activation works normally.
  controller.activate({ roomId: 'rain-court', generation: 2, def: rainDef(), world });
  controller.update(16);
  assert.equal(controller.stats.updates, 1, 'the controller recovered after the transient failure');
  controller.deactivate();
  assertBaselineRestored(fixture, 'baseline intact after recovery teardown');
});

test('rapid generations keep one retained controller: no growth, exact final restore', () => {
  const fixture = createFixture();
  const { controller, scene } = fixture;
  const worlds = [0, 1, 2, 3].map(i => ({ group: new THREE.Group(), environment: { zones: [], materialFamilies: [], emitterAnchors: [] }, id: `w${i}` }));
  worlds.forEach(w => { w.group.visible = true; });

  for (const [gen, world] of worlds.entries()) {
    controller.activate({ roomId: `room-${gen}`, generation: gen + 1, def: rainDef(), world });
    controller.update(16);
    assert.equal(controller.roomId, `room-${gen}`);
    assert.equal(controller.generation, gen + 1);
  }
  assert.equal(controller.stats.activations, 4, 'each generation activated once');
  assert.equal(scene.children.length, 1, 'exactly one owned group remains attached');
  assert.equal(scene.children[0].children.length, 3, 'sky + precipitation + surfaces, never duplicated');
  controller.deactivate();
  assertBaselineRestored(fixture, 'rapid generations restore the exact pre-activation baseline');
});

test('places without an atmosphere preset never take presentation ownership', () => {
  const fixture = createFixture();
  const { controller, client } = fixture;
  const world = { group: new THREE.Group() };
  assert.equal(controller.activate({ roomId: 'court', generation: 1, def: clearDef(), world }), false,
    'activation declines a preset-less place');
  assert.equal(controller.isActive(), false);
  controller.update(16);
  assert.equal(controller.stats.updates, 0);
  assertBaselineRestored(fixture, 'legacy presentation untouched');
  void client;
});

test('setQuality switches tiers once and same-tier calls do nothing', () => {
  let tierChanges = 0;
  const factories = {
    precipitationFactory: () => ({
      object3D: new THREE.Group(),
      setTier(next) { tierChanges += 1; return next; },
      setZones() {}, setAnchors() {}, setVisible() {}, update() {}, dispose() {},
    }),
  };
  const { controller } = createFixture({ factories });
  const world = { group: new THREE.Group() };
  controller.activate({ roomId: 'rain-court', generation: 1, def: rainDef(), world });
  assert.equal(controller.setQuality('reduced'), true, 'tier switch applies');
  assert.equal(controller.tier, 'reduced');
  assert.equal(controller.setQuality('reduced'), false, 'same tier is a no-op');
  assert.equal(controller.setQuality('bogus'), false, 'unknown tier rejected');
  assert.equal(tierChanges, 1, 'exactly one downstream reallocation');
});
