import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWorldPresentationHost, intersectsExclusion } from '../src/worlds/host.js';

test('intersectsExclusion detects overlaps with clearance margin', () => {
  const exclusion = { x: 0, z: 0, w: 2, d: 2 }; // spans -1..1 in X and Z
  // Prop at 1.2 with width 0.4 spans 1.0..1.4 -> touches boundary at margin 0
  assert.equal(intersectsExclusion({ x: 1.2, z: 0, w: 0.4, d: 0.4 }, exclusion, 0), true);
  // Prop at 2.0 with width 0.4 spans 1.8..2.2 -> no overlap at margin 0
  assert.equal(intersectsExclusion({ x: 2.0, z: 0, w: 0.4, d: 0.4 }, exclusion, 0), false);
  // But at actor margin 0.38 (2.0 - 0.2 - 0.38 = 1.42), still clear
  assert.equal(intersectsExclusion({ x: 2.0, z: 0, w: 0.4, d: 0.4 }, exclusion, 0.38), false);
  // At x = 1.5, bounds: 1.3 - 0.38 = 0.92 < 1.0 -> overlap detected!
  assert.equal(intersectsExclusion({ x: 1.5, z: 0, w: 0.4, d: 0.4 }, exclusion, 0.38), true);
});

test('host canPlaceProp rejects props overlapping exclusions and accepts clear ones', () => {
  const container = new THREE.Group();
  const spawnExclusion = { id: 'player-spawn', x: -9, z: 0, w: 1, d: 1, reason: 'spawn' };
  const seatExclusion = { id: 'front-seat', x: 0, z: 2, w: 1.2, d: 1.2, reason: 'seat' };

  const host = createWorldPresentationHost({
    containerGroup: container,
    viewId: 'place:theater',
    exclusions: [spawnExclusion, seatExclusion],
  });

  // Attempt to place a prop right on the player spawn
  const res1 = host.canPlaceProp({ x: -9, z: 0, w: 0.5, d: 0.5 });
  assert.equal(res1.allowed, false);
  assert.equal(res1.conflictingExclusion?.id, 'player-spawn');

  // Attempt to place a prop nearby the seat violating margin
  const res2 = host.canPlaceProp({ x: 0, z: 2.8, w: 0.5, d: 0.5 });
  assert.equal(res2.allowed, false);
  assert.equal(res2.conflictingExclusion?.id, 'front-seat');

  // Attempt to place a prop in an open corner
  const res3 = host.canPlaceProp({ x: 8, z: -8, w: 0.5, d: 0.5 });
  assert.equal(res3.allowed, true);
  assert.equal(res3.conflictingExclusion, null);
});

test('host mountPresentation fences against stale generations', async () => {
  const container = new THREE.Group();
  const host = createWorldPresentationHost({
    containerGroup: container,
    viewId: 'place:theater',
  });

  const gen1 = host.activeGeneration;
  host.nextGeneration(); // Bumps active generation to gen1 + 1

  // Mounting with stale gen1 should fail and not attach
  const mounted = await host.mountPresentation({
    plan: { worldId: 'coastal', variantId: 'sunset', atmosphere: {} },
    generation: gen1,
    buildCosmetics: ({ stagingGroup }) => {
      stagingGroup.add(new THREE.Mesh());
    },
  });

  assert.equal(mounted, false);
  assert.equal(host.isAttached, false);
  assert.equal(container.children.length, 0);
});

test('host mountPresentation atomically swaps cosmetic root and applies setters', async () => {
  const container = new THREE.Group();
  let appliedAtmosphere = null;
  let appliedAudio = null;

  const host = createWorldPresentationHost({
    containerGroup: container,
    viewId: 'place:theater',
    applyAtmosphere: (atmo) => { appliedAtmosphere = atmo; },
    applyAudio: (aud) => { appliedAudio = aud; },
  });

  const gen = host.activeGeneration;
  const mounted = await host.mountPresentation({
    plan: {
      worldId: 'desert',
      variantId: 'golden',
      atmosphere: { fog: { color: '#d9a469' } },
      audioProfile: 'desert',
    },
    generation: gen,
    buildCosmetics: ({ stagingGroup }) => {
      const prop = new THREE.Mesh();
      prop.name = 'oasis-palm';
      stagingGroup.add(prop);
    },
  });

  assert.equal(mounted, true);
  assert.equal(host.isAttached, true);
  assert.equal(container.children.length, 1);
  assert.equal(appliedAtmosphere?.fog?.color, '#d9a469');
  assert.equal(appliedAudio, 'desert');

  // Mount a second presentation: should swap root without leaving duplicate
  const nextGen = host.nextGeneration();
  await host.mountPresentation({
    plan: {
      worldId: 'alpine',
      variantId: 'aurora',
      atmosphere: { fog: { color: '#16243a' } },
      audioProfile: 'alpine',
    },
    generation: nextGen,
    buildCosmetics: ({ stagingGroup }) => {
      const prop = new THREE.Mesh();
      prop.name = 'snow-peak';
      stagingGroup.add(prop);
    },
  });

  assert.equal(container.children.length, 1);
  assert.equal(container.children[0].name, 'world-cosmetics-alpine-aurora');
  assert.equal(appliedAudio, 'alpine');
});

test('host teardown is idempotent and clears attachments', () => {
  const container = new THREE.Group();
  const host = createWorldPresentationHost({
    containerGroup: container,
    viewId: 'place:theater',
  });

  // Call teardown multiple times
  host.teardown();
  host.teardown();
  host.teardown();

  assert.equal(host.isAttached, false);
  assert.equal(container.children.length, 0);
});
