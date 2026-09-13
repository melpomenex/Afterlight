import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { PLACE_DEFINITIONS, getPlaceDefinition } from '../shared/placeDefinitions.js';
import { WORLD_IDS, getWorldDefinition } from '../shared/worldDefinitions.js';
import {
  getPlaceExclusions,
  computeBoundedAmbientLighting,
  createAmbientPlaceManager,
} from '../src/worlds/ambientPlace.js';
import { resolveWorldPresentation } from '../src/worlds/resolver.js';
import { getViewWorldSupport } from '../src/worlds/registry.js';

test('every non-theater place resolves to ambient mode with lighting and audio slots', () => {
  const placeIds = [...PLACE_DEFINITIONS.map((p) => p.id), 'market'].filter((id) => id !== 'theater');

  for (const placeId of placeIds) {
    const viewId = `place:${placeId}`;
    const support = getViewWorldSupport(viewId);
    assert.equal(support.mode, 'ambient', `${viewId} should have mode ambient`);
    assert.equal(support.host, 'self', `${viewId} should have host self`);
    assert.deepEqual(support.slots, ['lighting', 'audio'], `${viewId} slots should strictly be lighting and audio`);
    assert.equal(support.adapterKey, 'place:ambient');

    const plan = resolveWorldPresentation({
      selection: { worldId: 'coastal', variantId: 'sunset' },
      viewId,
    });
    assert.equal(plan.mode, 'ambient');
    assert.equal(plan.fallbackLevel, 'generic');
    assert.ok(plan.atmosphere?.lighting, 'lighting must be populated');
    assert.equal(plan.atmosphere?.sky, undefined, 'sky must be omitted');
    assert.equal(plan.atmosphere?.fog, undefined, 'fog must be omitted');
    assert.equal(plan.atmosphere?.particles, undefined, 'particles must be omitted');
    assert.ok(plan.audioProfile, 'audio profile must be populated');
  }
});

test('getPlaceExclusions includes obstacles, landmarks, notes, spawns, and gates', () => {
  const fakeWorld = {
    obstacles: [
      { x: 5, z: 10, w: 2, d: 3 },
      { x: -2, z: -4, w: 1.5, d: 1.5 },
    ],
  };
  const fakeDef = {
    id: 'test-place',
    landmark: [7, -5],
    note: [-7, 5],
    spawn: [-9, 0],
    exits: [
      { id: 'east', target: 'canal', position: [12, 0] },
      { id: 'west', target: 'market', position: [-12, 0] },
    ],
  };

  const exclusions = getPlaceExclusions(fakeWorld, fakeDef);
  assert.ok(exclusions.length >= 6, 'must contain obstacles, landmark, note, spawn, and gates');

  const landmarkExcl = exclusions.find((e) => e.role === 'landmark');
  assert.ok(landmarkExcl);
  assert.equal(landmarkExcl.x, 7);
  assert.equal(landmarkExcl.z, -5);

  const noteExcl = exclusions.find((e) => e.role === 'note');
  assert.ok(noteExcl);
  assert.equal(noteExcl.x, -7);
  assert.equal(noteExcl.z, 5);

  const spawnExcl = exclusions.find((e) => e.role === 'spawn');
  assert.ok(spawnExcl);
  assert.equal(spawnExcl.x, -9);
  assert.equal(spawnExcl.z, 0);

  const obstacleExcl = exclusions.find((e) => e.role === 'obstacle');
  assert.ok(obstacleExcl);
});

test('all six World profiles produce distinct, bounded ambient lighting and audio', () => {
  const baseline = {
    sunColor: '#ffe0a5',
    sunIntensity: 3.0,
    hemiSky: '#c5d9d4',
    hemiGround: '#343a2b',
    hemiIntensity: 2.2,
    exposure: 1.0,
  };

  const results = {};

  for (const worldId of WORLD_IDS) {
    const worldDef = getWorldDefinition(worldId);
    const plan = resolveWorldPresentation({
      selection: { worldId },
      viewId: 'place:court',
    });

    assert.ok(plan.atmosphere?.lighting);
    const blended = computeBoundedAmbientLighting({
      baseline,
      lighting: plan.atmosphere.lighting,
    });

    results[worldId] = {
      sunHex: blended.sunColor.getHexString(),
      hemiSkyHex: blended.hemiSky.getHexString(),
      hemiGroundHex: blended.hemiGround.getHexString(),
      sunIntensity: blended.sunIntensity,
      hemiIntensity: blended.hemiIntensity,
      exposure: blended.exposure,
      audioProfile: plan.audioProfile,
    };
  }

  // Verify all 6 audio profiles match their world signatures
  assert.equal(results.coastal.audioProfile, 'coastal');
  assert.equal(results.rainforest.audioProfile, 'rainforest');
  assert.equal(results.alpine.audioProfile, 'alpine');
  assert.equal(results.desert.audioProfile, 'desert');
  assert.equal(results.redwood.audioProfile, 'redwood-night');
  assert.equal(results.cloud.audioProfile, 'cloud');

  // Verify that all 6 sunHex colors are distinct
  const sunHexes = new Set(Object.values(results).map((r) => r.sunHex));
  assert.equal(sunHexes.size, 6, 'all six world profiles must produce distinct sun colors');

  // Verify bounded values do not drastically diverge from baseline
  for (const [id, r] of Object.entries(results)) {
    assert.ok(r.sunIntensity >= 2.0 && r.sunIntensity <= 4.0, `${id} sun intensity bounded`);
    assert.ok(r.hemiIntensity >= 1.5 && r.hemiIntensity <= 3.0, `${id} hemi intensity bounded`);
    assert.ok(r.exposure >= 0.8 && r.exposure <= 1.3, `${id} exposure bounded`);
  }
});

test('createAmbientPlaceManager activates, applies bounded lighting & audio, and restores baseline on teardown', async () => {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x657264, 0.015);
  scene.background = new THREE.Color(0x222d2a);

  const courtDef = getPlaceDefinition('court');
  const sun = new THREE.DirectionalLight(courtDef.sun, 3.0);
  const hemisphere = new THREE.HemisphereLight('#c5d9d4', '#343a2b', 2.2);
  const renderer = { toneMappingExposure: 1.0 };

  let activeAudioProfile = null;
  const environmentAudio = {
    setAmbienceProfile(p) {
      activeAudioProfile = p;
    },
  };

  let selectedWorld = { worldId: 'alpine', variantId: 'aurora' };

  const manager = createAmbientPlaceManager({
    scene,
    renderer,
    sun,
    hemisphere,
    environmentAudio,
    getWorldSelection: () => selectedWorld,
  });

  assert.equal(manager.isActive, false);

  const courtWorld = {
    group: new THREE.Group(),
    obstacles: [{ x: 0, z: 0, w: 2, d: 2 }],
  };

  const activated = await manager.activate({
    roomId: 'court',
    def: courtDef,
    world: courtWorld,
    generation: 1,
  });

  assert.equal(activated, true);
  assert.equal(manager.isActive, true);
  assert.equal(manager.activeRoomId, 'court');
  assert.equal(activeAudioProfile, 'alpine');

  // Sun and hemisphere should have alpine-tinted lighting
  const alpineSunHex = sun.color.getHexString();
  assert.notEqual(alpineSunHex, new THREE.Color(courtDef.sun).getHexString(), 'sun color must be tinted by alpine world');

  // Preserved semantic weather: fog and background are untouched
  assert.equal(scene.fog.color.getHexString(), '657264');

  // Change world selection to desert and sync
  selectedWorld = { worldId: 'desert', variantId: 'golden' };
  await manager.sync();

  assert.equal(activeAudioProfile, 'desert');
  const desertSunHex = sun.color.getHexString();
  assert.notEqual(desertSunHex, alpineSunHex, 'desert sun color must differ from alpine');

  // Sightlines: props overlapping exclusions are rejected
  const spawnCoord = courtDef.spawns?.spawn || courtDef.spawn || [0, 0];
  const propBoxOverlappingSpawn = { x: spawnCoord[0], z: spawnCoord[1], w: 1, d: 1 };
  const placementResult = manager.host.canPlaceProp(propBoxOverlappingSpawn);
  assert.equal(placementResult.allowed, false, 'props overlapping spawn must be rejected');

  // Deactivation restores baseline
  manager.deactivate();
  assert.equal(manager.isActive, false);
  assert.equal(manager.activeRoomId, null);
  assert.equal(activeAudioProfile, null);
  assert.equal(sun.color.getHexString(), new THREE.Color(courtDef.sun).getHexString(), 'sun color must be restored to baseline');
  assert.equal(sun.intensity, 3.0, 'sun intensity must be restored to baseline');
  assert.equal(hemisphere.color.getHexString(), 'c5d9d4', 'hemisphere sky must be restored to baseline');
  assert.equal(hemisphere.intensity, 2.2, 'hemisphere intensity must be restored to baseline');
  assert.equal(renderer.toneMappingExposure, 1.0, 'exposure must be restored to baseline');
});

test('createAmbientPlaceManager refuses theater room and lets theater runtime own theater', async () => {
  const sun = new THREE.DirectionalLight('#ffe0a5', 3.0);
  const manager = createAmbientPlaceManager({
    sun,
    getWorldSelection: () => ({ worldId: 'coastal', variantId: 'sunset' }),
  });

  const activated = await manager.activate({
    roomId: 'theater',
    def: getPlaceDefinition('theater'),
    world: { group: new THREE.Group() },
  });

  assert.equal(activated, false);
  assert.equal(manager.isActive, false);
});
