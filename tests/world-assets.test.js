import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createResourceCache } from '../src/activities/resourceCache.js';
import {
  WORLD_ASSET_DEFINITIONS,
  getWorldAssetDefinition,
  listWorldAssetDefinitions,
  isBorrowedResource,
  markBorrowedResource,
  disposeLocalGroup,
  createWorldAssetLedger,
} from '../src/worlds/assets.js';
import { WORLD_DEFINITIONS } from '../shared/worldDefinitions.js';

test('Task 6.3: asset catalog covers all 18 environment kit declarations with valid metadata', () => {
  // Collect all assetKit IDs from WORLD_DEFINITIONS
  const allDeclaredKits = new Set();
  for (const world of Object.values(WORLD_DEFINITIONS)) {
    for (const kitId of world.assetKit) {
      allDeclaredKits.add(kitId);
    }
  }

  assert.equal(allDeclaredKits.size, 18);

  for (const kitId of allDeclaredKits) {
    const def = getWorldAssetDefinition(kitId);
    assert.ok(def, `Missing asset definition for ${kitId}`);
    assert.equal(def.id, kitId);
    assert.ok(def.name && typeof def.name === 'string');
    assert.equal(typeof def.revision, 'number');
    assert.equal(typeof def.tier, 'string');
    assert.equal(typeof def.kind, 'string');
    assert.ok(def.estimatedBytes, `Missing estimatedBytes for ${kitId}`);
    assert.ok(def.estimatedBytes.cpu > 0, `CPU bytes must be positive for ${kitId}`);
    assert.ok(def.estimatedBytes.gpu > 0, `GPU bytes must be positive for ${kitId}`);
    assert.equal(typeof def.create, 'function');
    assert.equal(typeof def.dispose, 'function');

    // Verify factory creation and disposal
    const resource = def.create({ tier: 'high' });
    assert.ok(resource, `Factory returned null for ${kitId}`);
    assert.equal(typeof resource.dispose, 'function');
    def.dispose(resource);
  }

  assert.equal(listWorldAssetDefinitions().length, 18);
});

test('Task 6.3: borrowed-resource ledger acquires via ResourceCache and manages handle lifecycle', () => {
  const cache = createResourceCache();
  const ledgerA = createWorldAssetLedger({ cache, owner: 'view:theater' });
  const ledgerB = createWorldAssetLedger({ cache, owner: 'view:lounge' });

  // Both borrow the same rock asset
  const rockA = ledgerA.borrow('kit:coastal-rocks');
  assert.ok(rockA);
  assert.equal(isBorrowedResource(rockA), true);
  assert.equal(cache.refCount('world-asset:kit:coastal-rocks:high:1'), 1);

  const rockB = ledgerB.borrow('kit:coastal-rocks');
  assert.equal(rockA, rockB); // Shared instance
  assert.equal(cache.refCount('world-asset:kit:coastal-rocks:high:1'), 2);

  // Ledger A releases its borrowed asset
  ledgerA.disposeAll();
  assert.equal(cache.refCount('world-asset:kit:coastal-rocks:high:1'), 1);

  // Ledger B releases
  ledgerB.disposeAll();
  assert.equal(cache.refCount('world-asset:kit:coastal-rocks:high:1'), 0);
});

test('Task 6.3: disposeLocalGroup NEVER disposes borrowed geometry or materials, but disposes owned ones', () => {
  const cache = createResourceCache();
  const ledger = createWorldAssetLedger({ cache, owner: 'view:test' });

  const borrowedGeo = ledger.borrow('kit:alpine-rocks');
  let borrowedGeoDisposed = false;
  const origGeoDispose = borrowedGeo.dispose.bind(borrowedGeo);
  borrowedGeo.dispose = () => {
    borrowedGeoDisposed = true;
    origGeoDispose();
  };

  // Create an owned local material and geometry
  const ownedGeo = new THREE.BoxGeometry(1, 1, 1);
  let ownedGeoDisposed = false;
  ownedGeo.dispose = () => {
    ownedGeoDisposed = true;
  };

  const ownedMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  let ownedMatDisposed = false;
  ownedMat.dispose = () => {
    ownedMatDisposed = true;
  };

  // Group containing one mesh with borrowed geo + owned mat, and another with owned geo + owned mat
  const group = new THREE.Group();
  const meshWithBorrowed = new THREE.Mesh(borrowedGeo, ownedMat);
  const meshWithOwned = new THREE.Mesh(ownedGeo, ownedMat);
  group.add(meshWithBorrowed);
  group.add(meshWithOwned);

  // Traverse and dispose group using disposeLocalGroup
  disposeLocalGroup(group);

  // Borrowed geometry MUST NOT have been disposed
  assert.equal(borrowedGeoDisposed, false, 'Borrowed geometry must NEVER be disposed by group traversal');

  // Owned geometry and owned material MUST have been disposed
  assert.equal(ownedGeoDisposed, true, 'Owned geometry should be disposed by group traversal');
  assert.equal(ownedMatDisposed, true, 'Owned material should be disposed by group traversal');

  // Group should be cleared
  assert.equal(group.children.length, 0);

  // Clean up ledger
  ledger.disposeAll();
});

test('Task 6.3: owned resources tracked in ledger are disposed, while borrowed resources are released to cache', () => {
  const cache = createResourceCache();
  const ledger = createWorldAssetLedger({ cache, owner: 'host:coastal' });

  const borrowedMesh = ledger.borrow('kit:coastal-vegetation');
  assert.equal(ledger.borrowedCount, 1);

  let ownedDisposed = false;
  const ownedMat = ledger.trackOwned({
    name: 'custom-instanced-mat',
    dispose: () => {
      ownedDisposed = true;
    },
  });
  assert.equal(ledger.ownedCount, 1);

  assert.equal(cache.refCount('world-asset:kit:coastal-vegetation:high:1'), 1);

  // Teardown
  ledger.disposeAll();

  assert.equal(ledger.borrowedCount, 0);
  assert.equal(ledger.ownedCount, 0);
  assert.equal(ownedDisposed, true);
  assert.equal(cache.refCount('world-asset:kit:coastal-vegetation:high:1'), 0);
});
