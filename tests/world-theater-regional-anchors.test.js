import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createResourceCache } from '../src/activities/resourceCache.js';
import {
  THEATER_COSMETIC_ANCHORS,
  THEATER_SOLID_VOLUMES,
  THEATER_FLOOR_PADS,
} from '../src/world/theaterWorld.js';
import { createWorldAssetLedger } from '../src/worlds/assets.js';
import { intersectsExclusion } from '../src/worlds/host.js';

test('Task 6.8: THEATER_COSMETIC_ANCHORS exposes safe exterior arcade and lounge anchors', () => {
  assert.ok(THEATER_COSMETIC_ANCHORS.arcadeExteriorNorth);
  assert.ok(THEATER_COSMETIC_ANCHORS.arcadeExteriorSouth);
  assert.ok(THEATER_COSMETIC_ANCHORS.loungeExteriorNorth);
  assert.ok(THEATER_COSMETIC_ANCHORS.loungeExteriorSouth);
  assert.ok(THEATER_COSMETIC_ANCHORS.distantBackdrop);

  for (const [key, anchor] of Object.entries(THEATER_COSMETIC_ANCHORS)) {
    assert.equal(typeof anchor.x, 'number', `${key}.x must be number`);
    assert.equal(typeof anchor.y, 'number', `${key}.y must be number`);
    assert.equal(typeof anchor.z, 'number', `${key}.z must be number`);
    assert.ok(anchor.region, `${key} must have region`);
    assert.ok(Object.isFrozen(anchor), `${key} must be frozen`);
  }
});

test('Task 6.8: anchors maintain clearance from all interior obstacles and pads (unchanged functional signatures)', () => {
  const propMargin = 0.38;

  for (const [name, anchor] of Object.entries(THEATER_COSMETIC_ANCHORS)) {
    const propBox = {
      x: anchor.x,
      z: anchor.z,
      w: 1.0,
      d: 1.0,
    };

    // Verify does not intersect any interior solid volumes
    for (const solid of THEATER_SOLID_VOLUMES) {
      const hit = intersectsExclusion(propBox, solid, propMargin);
      assert.equal(hit, false, `Anchor "${name}" intersects interior solid volume "${solid.id}"`);
    }

    // Verify does not intersect interior carpet/runners
    for (const pad of THEATER_FLOOR_PADS) {
      const hit = intersectsExclusion(propBox, pad, propMargin);
      assert.equal(hit, false, `Anchor "${name}" intersects interior floor pad "${pad.id}"`);
    }
  }
});

test('Task 6.8: reuse existing kit factories in both regions with shared resource identity and independent lifecycle', () => {
  const cache = createResourceCache();
  const arcadeLedger = createWorldAssetLedger({ cache, owner: 'theater-arcade-exterior' });
  const loungeLedger = createWorldAssetLedger({ cache, owner: 'theater-lounge-exterior' });

  // 1. Borrow rock geometry from existing kit in both regions
  const arcadeRockGeo = arcadeLedger.borrow('kit:alpine-rocks');
  const loungeRockGeo = loungeLedger.borrow('kit:alpine-rocks');

  // Shared resource identity
  assert.equal(arcadeRockGeo, loungeRockGeo, 'Both regions must share the same geometry instance in cache');
  assert.equal(cache.refCount('world-asset:kit:alpine-rocks:high:1'), 2);

  // 2. Independent placement transforms
  const arcadeMesh = new THREE.Mesh(arcadeRockGeo, new THREE.MeshBasicMaterial());
  arcadeMesh.position.set(
    THEATER_COSMETIC_ANCHORS.arcadeExteriorNorth.x,
    THEATER_COSMETIC_ANCHORS.arcadeExteriorNorth.y,
    THEATER_COSMETIC_ANCHORS.arcadeExteriorNorth.z,
  );

  const loungeMesh = new THREE.Mesh(loungeRockGeo, new THREE.MeshBasicMaterial());
  loungeMesh.position.set(
    THEATER_COSMETIC_ANCHORS.loungeExteriorNorth.x,
    THEATER_COSMETIC_ANCHORS.loungeExteriorNorth.y,
    THEATER_COSMETIC_ANCHORS.loungeExteriorNorth.z,
  );

  assert.notEqual(arcadeMesh.position.x, loungeMesh.position.x);
  assert.equal(arcadeMesh.position.x, 12.8);
  assert.equal(loungeMesh.position.x, -12.8);

  // 3. Independent release: arcade releases, lounge still holds valid resource
  arcadeLedger.disposeAll();
  assert.equal(cache.refCount('world-asset:kit:alpine-rocks:high:1'), 1);
  assert.equal(loungeMesh.geometry, loungeRockGeo);

  // Lounge releases
  loungeLedger.disposeAll();
  assert.equal(cache.refCount('world-asset:kit:alpine-rocks:high:1'), 0);
});
