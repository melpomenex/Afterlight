import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWorldPresentationHost } from '../src/worlds/host.js';

test('Task 6.4: A->B->C out-of-order completion - latest request wins, earlier stale completions are discarded', async () => {
  const container = new THREE.Group();
  const host = createWorldPresentationHost({
    containerGroup: container,
    viewId: 'place:theater',
  });

  const planA = { worldId: 'coastal', variantId: 'sunset', atmosphere: {} };
  const planB = { worldId: 'rainforest', variantId: 'canopy', atmosphere: {} };
  const planC = { worldId: 'desert', variantId: 'golden', atmosphere: {} };

  const gen = host.activeGeneration;

  // Launch A (slowest, 50ms)
  const promiseA = host.mountPresentation({
    plan: planA,
    generation: gen,
    buildCosmetics: async ({ stagingGroup }) => {
      await new Promise((r) => setTimeout(r, 50));
      const m = new THREE.Mesh();
      m.name = 'propA';
      stagingGroup.add(m);
    },
  });

  // Launch B (medium, 30ms)
  const promiseB = host.mountPresentation({
    plan: planB,
    generation: gen,
    buildCosmetics: async ({ stagingGroup }) => {
      await new Promise((r) => setTimeout(r, 30));
      const m = new THREE.Mesh();
      m.name = 'propB';
      stagingGroup.add(m);
    },
  });

  // Launch C (fastest, 10ms)
  const promiseC = host.mountPresentation({
    plan: planC,
    generation: gen,
    buildCosmetics: async ({ stagingGroup }) => {
      await new Promise((r) => setTimeout(r, 10));
      const m = new THREE.Mesh();
      m.name = 'propC';
      stagingGroup.add(m);
    },
  });

  const [resA, resB, resC] = await Promise.all([promiseA, promiseB, promiseC]);

  // C finished first and committed
  assert.equal(resC, true);
  // B and A finished later and were superseded by C
  assert.equal(resB, false);
  assert.equal(resA, false);

  // Active plan is C
  assert.equal(host.currentPlan, planC);
  assert.equal(container.children.length, 1);
  assert.equal(container.children[0].name, 'world-cosmetics-desert-golden');
  assert.equal(container.children[0].children[0].name, 'propC');
});

test('Task 6.4: travel during async load bumps generation and cleanly discards staging', async () => {
  const container = new THREE.Group();
  let stagingDisposed = false;

  const host = createWorldPresentationHost({
    containerGroup: container,
    viewId: 'place:courtyard',
  });

  const gen = host.activeGeneration;

  const mountPromise = host.mountPresentation({
    plan: { worldId: 'alpine', variantId: 'aurora', atmosphere: {} },
    generation: gen,
    buildCosmetics: async ({ stagingGroup }) => {
      await new Promise((r) => setTimeout(r, 30));
      const geo = new THREE.BoxGeometry();
      const origDispose = geo.dispose.bind(geo);
      geo.dispose = () => {
        stagingDisposed = true;
        origDispose();
      };
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
      stagingGroup.add(mesh);
    },
  });

  // Travel occurs during load
  host.nextGeneration();

  const result = await mountPromise;
  assert.equal(result, false);
  assert.equal(host.isAttached, false);
  assert.equal(container.children.length, 0);
  assert.equal(stagingDisposed, true, 'Discarded staging group should have its owned resources disposed');
});

test('Task 6.4: cosmetic/asset build failure preserves existing playable scene and reports fallback', async () => {
  const container = new THREE.Group();
  const host = createWorldPresentationHost({
    containerGroup: container,
    viewId: 'place:theater',
  });

  // 1. Mount initial valid scene
  const initialPlan = { worldId: 'coastal', variantId: 'sunset', atmosphere: {} };
  const initialSuccess = await host.mountPresentation({
    plan: initialPlan,
    generation: host.activeGeneration,
    buildCosmetics: ({ stagingGroup }) => {
      const mesh = new THREE.Mesh();
      mesh.name = 'initial-rock';
      stagingGroup.add(mesh);
    },
  });
  assert.equal(initialSuccess, true);
  assert.equal(container.children.length, 1);
  assert.equal(container.children[0].children[0].name, 'initial-rock');
  assert.equal(host.currentPlan, initialPlan);
  assert.equal(host.fallbackStatus, null);

  // 2. Attempt to mount a failing plan (e.g. GLB network failure)
  const failedPlan = { worldId: 'redwood', variantId: 'mist', atmosphere: {} };
  const failedSuccess = await host.mountPresentation({
    plan: failedPlan,
    generation: host.activeGeneration,
    buildCosmetics: async () => {
      throw new Error('GLB 404 Not Found: redwood_trunk.glb');
    },
  });

  assert.equal(failedSuccess, false);
  // Preserves existing valid scene!
  assert.equal(container.children.length, 1);
  assert.equal(container.children[0].children[0].name, 'initial-rock');
  // Does NOT falsely claim new plan is current
  assert.equal(host.currentPlan, initialPlan);

  // Reports fallback status
  assert.ok(host.fallbackStatus);
  assert.equal(host.fallbackStatus.inFallback, true);
  assert.equal(host.fallbackStatus.level, 'retained_scene');
  assert.equal(host.fallbackStatus.reason, 'cosmetic_build_failed');
  assert.equal(host.fallbackStatus.attemptedPlan, failedPlan);
  assert.match(host.fallbackStatus.error, /redwood_trunk\.glb/);

  // Reports lastFailure
  assert.ok(host.lastFailure);
  assert.equal(host.lastFailure.plan, failedPlan);
});

test('Task 6.4: explicit host.retry() successfully applies previously failed presentation once fixed', async () => {
  const container = new THREE.Group();
  const host = createWorldPresentationHost({
    containerGroup: container,
    viewId: 'place:theater',
  });

  let networkAvailable = false;
  const targetPlan = { worldId: 'cloud', variantId: 'overcast', atmosphere: {} };

  const firstAttempt = await host.mountPresentation({
    plan: targetPlan,
    generation: host.activeGeneration,
    buildCosmetics: async ({ stagingGroup }) => {
      if (!networkAvailable) {
        throw new Error('Network offline');
      }
      const m = new THREE.Mesh();
      m.name = 'cloud-island';
      stagingGroup.add(m);
    },
  });

  assert.equal(firstAttempt, false);
  assert.ok(host.fallbackStatus);

  // Fix network and call explicit retry
  networkAvailable = true;
  const retrySuccess = await host.retry();

  assert.equal(retrySuccess, true);
  assert.equal(host.fallbackStatus, null);
  assert.equal(host.lastFailure, null);
  assert.equal(host.currentPlan, targetPlan);
  assert.equal(container.children.length, 1);
  assert.equal(container.children[0].children[0].name, 'cloud-island');
});
