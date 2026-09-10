/**
 * Renderer policy capture/restore (fix-kart-royale-instant-entry 3.1).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  captureRendererPolicy,
  restoreRendererPolicy,
  applyLeasedRendererOverrides,
  rendererPolicyMatches,
} from '../src/activities/rendererPolicy.js';

function makeStubRenderer() {
  const canvas = { width: 1920, height: 1080 };
  const renderer = {
    domElement: canvas,
    toneMappingExposure: 1.15,
    toneMapping: THREE.ACESFilmicToneMapping,
    outputColorSpace: THREE.SRGBColorSpace,
    autoClear: true,
    autoClearColor: true,
    autoClearDepth: true,
    autoClearStencil: false,
    shadowMap: {
      enabled: true,
      type: THREE.PCFSoftShadowMap,
      autoUpdate: true,
      needsUpdate: false,
    },
    getPixelRatio: () => 1.5,
    getScissorTest: () => false,
    getScissor: (v) => v.set(0, 0, 1, 1),
    getViewport: (v) => v.set(0, 0, 1920, 1080),
    getRenderTarget: () => null,
    getActiveCubeFace: () => 0,
    getActiveMipmapLevel: () => 0,
    getClearColor: (c) => c.set(0x222d2a),
    getClearAlpha: () => 1,
    setPixelRatio: () => {},
    setSize: () => {},
    setScissorTest: () => {},
    setScissor: () => {},
    setViewport: () => {},
    setClearColor: () => {},
    setRenderTarget: () => {},
  };
  return renderer;
}

test('capture and restore round-trips host presentation fields', () => {
  const renderer = makeStubRenderer();
  const snap = captureRendererPolicy(renderer);
  assert.ok(snap);
  assert.equal(snap.toneMappingExposure, 1.15);
  assert.equal(snap.pixelRatio, 1.5);

  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = false;
  restoreRendererPolicy(renderer, snap, { width: 1280, height: 720 });
  assert.equal(renderer.toneMappingExposure, 1.15);
  assert.equal(renderer.shadowMap.enabled, true);
});

test('rendererPolicyMatches detects post-restore drift', () => {
  const renderer = makeStubRenderer();
  const snap = captureRendererPolicy(renderer);
  assert.equal(rendererPolicyMatches(renderer, snap), true);
  renderer.toneMappingExposure = 2.0;
  assert.equal(rendererPolicyMatches(renderer, snap), false);
});

test('applyLeasedRendererOverrides sets exposure only', () => {
  const renderer = makeStubRenderer();
  applyLeasedRendererOverrides(renderer, { toneMappingExposure: 1.25 });
  assert.equal(renderer.toneMappingExposure, 1.25);
});
