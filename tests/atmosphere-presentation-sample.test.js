import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { sampleWorldPresentationVisuals } from '../src/worlds/presentationSample.js';
import { createAtmosphereController } from '../src/atmosphere/controller.js';
import { defaultActivityEnvironment } from '../shared/activityEnvironment.js';

test('sampleWorldPresentationVisuals composes permitted slots for full theater view', () => {
  const sample = sampleWorldPresentationVisuals({
    worldSelection: { worldId: 'desert', variantId: 'golden' },
    viewId: 'place:theater',
    semanticPresetId: 'rain',
  });

  assert.ok(sample.plan);
  assert.equal(sample.plan.worldId, 'desert');
  assert.equal(sample.plan.variantId, 'golden');
  assert.equal(sample.plan.mode, 'full');
  assert.ok(sample.visuals);
  assert.ok(sample.visuals.fogColor);
  assert.ok(sample.visuals.sunColor);
  assert.ok(sample.audioProfile);
});

test('sampleWorldPresentationVisuals restricts slots for ambient views', () => {
  const sample = sampleWorldPresentationVisuals({
    worldSelection: { worldId: 'alpine', variantId: 'aurora' },
    viewId: 'place:court',
    semanticPresetId: 'rain',
  });

  assert.equal(sample.plan.mode, 'ambient');
  // Ambient slot is lighting, not sky or fog
  assert.ok(sample.plan.atmosphere.lighting);
  assert.equal(sample.plan.atmosphere.sky, undefined);
  assert.equal(sample.plan.atmosphere.fog, undefined);
});

test('sampleWorldPresentationVisuals returns semantic visuals untouched for mode none', () => {
  const sample = sampleWorldPresentationVisuals({
    worldSelection: { worldId: 'alpine', variantId: 'aurora' },
    viewId: 'activity:pong',
    semanticPresetId: 'rain',
  });

  assert.equal(sample.plan.mode, 'none');
  assert.equal(sample.plan.atmosphere, null);
  // Returns semantic preset visuals unmodified
  assert.ok(sample.visuals.fogColor);
});

test('controller with personal world selection updates visuals without mutating stateClient or activityEnvironment', () => {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x112233, 0.01);
  scene.background = new THREE.Color(0x000000);

  const renderer = { toneMappingExposure: 1.0 };
  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  const hemisphere = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);

  // Mock semantic stateClient with authoritative state
  const authoritativeState = Object.freeze({
    preset: 'rain',
    transition: null,
  });

  const stateClient = {
    getState: () => authoritativeState,
    isSynced: () => true,
    sample: (out) => {
      out.serverNow = 1000;
      out.timePhase = 0.5;
      out.cloud = 0.4;
      out.rain = 0.8;
      out.windX = 0.3;
      out.windZ = -0.5;
      out.wetness = 0.9;
    },
  };

  const mockSky = {
    mesh: new THREE.Mesh(),
    setState: () => {},
    setCamera: () => {},
    setDrift: () => {},
    dispose: () => {},
  };
  const mockPrecipitation = {
    object3D: new THREE.Group(),
    update: () => {},
    setTier: () => {},
    dispose: () => {},
  };
  const mockSurfaces = {
    object3D: new THREE.Group(),
    apply: () => {},
    setTier: () => {},
    dispose: () => {},
  };

  let personalSelection = { worldId: 'desert', variantId: 'golden' };

  const controller = createAtmosphereController({
    scene,
    renderer,
    sun,
    hemisphere,
    stateClient,
    getWorldSelection: () => personalSelection,
    skyFactory: () => mockSky,
    precipitationFactory: () => mockPrecipitation,
    surfacesFactory: () => mockSurfaces,
  });

  // Activate in theater
  const activated = controller.activate({
    roomId: 'theater',
    generation: 1,
    def: {
      atmosphere: { preset: 'rain' },
      bounds: [-20, -20, 20, 20],
      seed: 42,
    },
    world: { environment: {} },
  });

  assert.equal(activated, true);

  // Run update
  controller.update(16);

  // Scene visuals should reflect desert presentation, not rain preset visuals
  const desertSample = sampleWorldPresentationVisuals({
    worldSelection: personalSelection,
    viewId: 'place:theater',
    semanticPresetId: 'rain',
  });
  const expectedFogColor = new THREE.Color(desertSample.visuals.fogColor);
  assert.equal(scene.fog.color.getHexString(), expectedFogColor.getHexString());

  // Verify stateClient accepted state was NOT mutated
  assert.equal(stateClient.getState(), authoritativeState);
  assert.equal(authoritativeState.preset, 'rain');

  // Verify activityEnvironment frozen/live defaults remain untouched
  const activityEnv = defaultActivityEnvironment('frozen', { presetId: 'rain' });
  assert.equal(activityEnv.policy, 'frozen');
  assert.ok(activityEnv.rain > 0);

  // Verify switching personal selection updates on next frame without stateClient mutation
  personalSelection = { worldId: 'cloud', variantId: 'sunrise' };
  controller.update(16);

  const cloudSample = sampleWorldPresentationVisuals({
    worldSelection: personalSelection,
    viewId: 'place:theater',
    semanticPresetId: 'rain',
  });
  const expectedCloudFog = new THREE.Color(cloudSample.visuals.fogColor);
  assert.equal(scene.fog.color.getHexString(), expectedCloudFog.getHexString());
  assert.equal(stateClient.getState().preset, 'rain');

  controller.dispose();
});
