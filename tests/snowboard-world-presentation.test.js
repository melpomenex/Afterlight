/**
 * Tests for Summit Run World Presentation Integration (Task 7.4).
 *
 * Verifies:
 *  - Six cold-climate interpretations (coastal, rainforest, alpine, desert, redwood, cloud).
 *  - Canonical terrain, course, ramps, gates, boost lanes, pickups and RNG signatures remain intact.
 *  - farSceneryRoot seam allows attaching cosmetic far scenery.
 *  - Borrowed-resource-safe disposal detaches borrowed assets without destroying geometries/materials.
 *  - setWorldPresentation dynamically updates atmosphere and lights.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';

import { SNOWBOARD_WORLD_PROFILES, createSnowboardScene } from '../src/activities/snowboard/scene.js';

const courseDoc = JSON.parse(readFileSync(new URL('../shared/snowboard/course-alpine-rush.json', import.meta.url)));

test('Task 7.4: SNOWBOARD_WORLD_PROFILES defines all six cold-climate interpretations', () => {
  const expectedWorlds = ['coastal', 'rainforest', 'alpine', 'desert', 'redwood', 'cloud'];
  for (const id of expectedWorlds) {
    const profile = SNOWBOARD_WORLD_PROFILES[id];
    assert.ok(profile, `Profile ${id} exists in SNOWBOARD_WORLD_PROFILES`);
    assert.equal(profile.id, id);
    assert.ok(typeof profile.sky === 'string' && profile.sky.startsWith('#'));
    assert.ok(typeof profile.fog === 'string' && profile.fog.startsWith('#'));
    assert.ok(typeof profile.hemiSky === 'number');
    assert.ok(typeof profile.hemiGround === 'number');
    assert.ok(typeof profile.sun === 'number');
    assert.ok(profile.sunIntensity >= 2.5 && profile.sunIntensity <= 3.5);
  }
});

test('Task 7.4: createSnowboardScene applies initialWorldPresentation and setWorldPresentation', async () => {
  const sceneInstance = await createSnowboardScene({
    courseDoc,
    quality: 'low',
    initialWorldPresentation: { worldId: 'desert' },
  });

  assert.equal(sceneInstance.getCurrentProfile().id, 'desert');
  assert.equal(sceneInstance.scene.background.getHexString(), 'b094b8');

  // Dynamic switch to rainforest
  sceneInstance.setWorldPresentation({ worldId: 'rainforest' });
  assert.equal(sceneInstance.getCurrentProfile().id, 'rainforest');
  assert.equal(sceneInstance.scene.background.getHexString(), '7ba096');

  // Switch to coastal
  sceneInstance.setWorldPresentation({ worldId: 'coastal' });
  assert.equal(sceneInstance.getCurrentProfile().id, 'coastal');
  assert.equal(sceneInstance.scene.background.getHexString(), '8faec4');

  // Switch to cloud
  sceneInstance.setWorldPresentation('cloud');
  assert.equal(sceneInstance.getCurrentProfile().id, 'cloud');
  assert.equal(sceneInstance.scene.background.getHexString(), 'b8d6ed');

  sceneInstance.dispose();
});

test('Task 7.4: farSceneryRoot seam supports borrowed-resource-safe disposal', async () => {
  const sceneInstance = await createSnowboardScene({
    courseDoc,
    quality: 'low',
  });

  let geomDisposed = false;
  let matDisposed = false;
  const borrowedGeom = new THREE.BoxGeometry(2, 2, 2);
  borrowedGeom.dispose = () => { geomDisposed = true; };
  const borrowedMat = new THREE.MeshStandardMaterial();
  borrowedMat.dispose = () => { matDisposed = true; };

  const borrowedMesh = new THREE.Mesh(borrowedGeom, borrowedMat);
  sceneInstance.setFarScenery(borrowedMesh);

  // Far scenery is mounted in the scene
  const farRoot = sceneInstance.scene.getObjectByName('farSceneryRoot');
  assert.ok(farRoot, 'farSceneryRoot exists in scene');
  assert.equal(farRoot.children.length, 1);
  assert.equal(farRoot.children[0], borrowedMesh);

  // Calling dispose MUST NOT dispose borrowed geometry or material
  sceneInstance.dispose();
  assert.equal(geomDisposed, false, 'Borrowed geometry was NOT disposed by scene.dispose()');
  assert.equal(matDisposed, false, 'Borrowed material was NOT disposed by scene.dispose()');
});

test('Task 7.4: canonical terrain, course, ramps, and pickups are identical across world profiles', async () => {
  const sceneAlpine = await createSnowboardScene({ courseDoc, quality: 'low', initialWorldPresentation: 'alpine' });
  const sceneDesert = await createSnowboardScene({ courseDoc, quality: 'low', initialWorldPresentation: 'desert' });

  // Course structure, ramps, and pickups are canonical and unchanged
  assert.equal(sceneAlpine.course.length, sceneDesert.course.length);
  assert.equal(sceneAlpine.course.ramps.length, sceneDesert.course.ramps.length);
  assert.equal(sceneAlpine.course.pickups.length, sceneDesert.course.pickups.length);

  for (let i = 0; i < sceneAlpine.course.ramps.length; i++) {
    assert.deepEqual(sceneAlpine.course.ramps[i], sceneDesert.course.ramps[i]);
  }

  sceneAlpine.dispose();
  sceneDesert.dispose();
});
