/**
 * Frame-bound graphics job queue (fix-kart-royale-instant-entry 3.2).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createGraphicsJobQueue } from '../src/activities/graphicsJobs.js';
import { createActivityViewLease } from '../src/activities/viewLease.js';

function makeRenderer() {
  return {
    domElement: { width: 800, height: 600 },
    toneMappingExposure: 1.0,
    toneMapping: THREE.NoToneMapping,
    outputColorSpace: THREE.SRGBColorSpace,
    autoClear: true,
    autoClearColor: true,
    autoClearDepth: true,
    autoClearStencil: false,
    shadowMap: { enabled: false, type: 0, autoUpdate: true, needsUpdate: false },
    getPixelRatio: () => 1,
    getScissorTest: () => false,
    getScissor: (v) => v.set(0, 0, 1, 1),
    getViewport: (v) => v.set(0, 0, 800, 600),
    getRenderTarget: () => null,
    getActiveCubeFace: () => 0,
    getActiveMipmapLevel: () => 0,
    getClearColor: (c) => c.set(0),
    getClearAlpha: () => 1,
    setPixelRatio: () => {},
    setSize: () => {},
    setScissorTest: () => {},
    setScissor: () => {},
    setViewport: () => {},
    setClearColor: () => {},
    setRenderTarget: () => {},
  };
}

test('graphics jobs drain restores renderer policy after mutation', () => {
  const renderer = makeRenderer();
  let blocked = false;
  const queue = createGraphicsJobQueue({
    getRenderer: () => renderer,
    isBlocked: () => blocked,
    getViewport: () => ({ width: 800, height: 600 }),
  });
  queue.schedule({
    id: 'mutate',
    run: ({ renderer: r }) => { r.toneMappingExposure = 9; },
  });
  const result = queue.drain({ maxMs: 10 });
  assert.equal(result.ran, 1);
  assert.equal(result.remaining, 0);
  assert.equal(renderer.toneMappingExposure, 1.0);
});

test('graphics jobs do not run while blocked', () => {
  const renderer = makeRenderer();
  const queue = createGraphicsJobQueue({
    getRenderer: () => renderer,
    isBlocked: () => true,
  });
  queue.schedule({ id: 'x', run: () => {} });
  const result = queue.drain({ maxMs: 10 });
  assert.equal(result.blocked, true);
  assert.equal(result.ran, 0);
  assert.equal(result.remaining, 1);
});

test('runTransaction rejects while view lease blocks graphics work', async () => {
  const renderer = makeRenderer();
  const queue = createGraphicsJobQueue({
    getRenderer: () => renderer,
    isBlocked: () => true,
  });
  await assert.rejects(
    () => queue.runTransaction(() => {}),
    /graphics_transaction_blocked/,
  );
});

test('runTransaction restores policy after async work', async () => {
  const renderer = makeRenderer();
  const queue = createGraphicsJobQueue({
    getRenderer: () => renderer,
    isBlocked: () => false,
    getViewport: () => ({ width: 640, height: 480 }),
  });
  await queue.runTransaction(async ({ renderer: r }) => {
    r.toneMappingExposure = 2.5;
    await Promise.resolve();
  });
  assert.equal(renderer.toneMappingExposure, 1.0);
});

test('graphics work stays blocked while an activity view lease is held', async () => {
  const renderer = makeRenderer();
  const view = createActivityViewLease({ generation: () => 0 });
  const acquired = view.acquireView({ owner: 'kart', generation: 0, scene: {}, camera: {} });
  assert.equal(acquired.ok, true);
  const queue = createGraphicsJobQueue({
    getRenderer: () => renderer,
    isBlocked: () => view.held,
    getViewport: () => ({ width: 800, height: 600 }),
  });
  queue.schedule({ id: 'prep', run: () => {} });
  const drained = queue.drain({ maxMs: 10 });
  assert.equal(drained.blocked, true);
  assert.equal(drained.ran, 0);
  await assert.rejects(
    () => queue.runTransaction(() => {}),
    /graphics_transaction_blocked/,
  );
  view.release('kart', 'exit');
  assert.equal(view.held, false);
});
