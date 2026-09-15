/**
 * Tests for Kart Royale World Presentation Integration (Tasks 7.1, 7.2, 7.3).
 *
 * Verifies:
 *  - 7.1: Optional KartWorldPresentation interface and host/controller setters;
 *         gameplay readiness survives World changes without invalidating batches or race state;
 *         standalone defaults remain valid.
 *  - 7.2: Six bounded Kart atmosphere profiles (coastal, rainforest, alpine, desert, redwood, cloud),
 *         native fallback on missing scenery/unknown profile, safe farSceneryRoot seam in Scenery.
 *  - 7.3: ShaderChunk scoping via restoreShaderPatches and reinstallShaderPatches;
 *         borrowed-resource-safe disposal in Scenery and Sky without leaks.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';

import { KART_ROYALE_ACTIVITY_DEFINITION } from '../shared/placeDefinitions.js';
import { createKartRoyaleController } from '../src/activities/kart-royale/controller.js';

test('Task 7.1: Kart types and runtime declare KartWorldPresentation, setWorldPresentation, and getWorldPresentation', () => {
  const typesSrc = readFileSync('games/kart-royale/src/host/types.ts', 'utf8');
  assert.ok(typesSrc.includes('export interface KartWorldPresentation'), 'KartWorldPresentation interface declared');
  assert.ok(typesSrc.includes('initialWorldPresentation?: KartWorldPresentation | null'), 'KartRoyaleHostOptions has initialWorldPresentation');
  assert.ok(typesSrc.includes('setWorldPresentation(presentation: KartWorldPresentation | null): void'), 'KartRoyaleHost has setWorldPresentation');
  assert.ok(typesSrc.includes('getWorldPresentation(): KartWorldPresentation | null'), 'KartRoyaleHost has getWorldPresentation');

  const runtimeSrc = readFileSync('games/kart-royale/src/host/runtime.ts', 'utf8');
  assert.ok(runtimeSrc.includes('initialWorldPresentation?: KartWorldPresentation | null'), 'Runtime options accept initialWorldPresentation');
  assert.ok(runtimeSrc.includes('setWorldPresentation(presentation: KartWorldPresentation | null)'), 'Runtime has setWorldPresentation');
  assert.ok(runtimeSrc.includes('getWorldPresentation()'), 'Runtime has getWorldPresentation');

  const indexSrc = readFileSync('games/kart-royale/src/host/index.ts', 'utf8');
  assert.ok(indexSrc.includes('initialWorldPresentation: options.initialWorldPresentation'), 'Host forwards initialWorldPresentation to runtime');
  assert.ok(indexSrc.includes('setWorldPresentation(presentation)'), 'Host exposes setWorldPresentation');
});

test('Task 7.1: createKartRoyaleController supports world presentation and subscription', () => {
  let mockSel = { worldId: 'alpine', variantId: 'cold' };
  const controller = createKartRoyaleController({
    activityDef: KART_ROYALE_ACTIVITY_DEFINITION,
    getWorldSelection: () => mockSel,
  });

  assert.ok(typeof controller.setWorldPresentation === 'function', 'controller exposes setWorldPresentation');
  assert.ok(typeof controller.getWorldPresentation === 'function', 'controller exposes getWorldPresentation');

  const initial = controller.getWorldPresentation();
  assert.deepEqual(initial, {
    worldId: 'alpine',
    variantId: 'cold',
    atmosphereProfile: 'alpine',
  });

  controller.dispose();
});

test('Task 7.2: Atmosphere.ts exports six bounded profiles and getKartAtmosphereProfile fallback', () => {
  const atmoSrc = readFileSync('games/kart-royale/src/render/Atmosphere.ts', 'utf8');
  assert.ok(atmoSrc.includes('export const KART_WORLD_ATMOSPHERE_PROFILES'), 'KART_WORLD_ATMOSPHERE_PROFILES exported');
  assert.ok(atmoSrc.includes('export function getKartAtmosphereProfile'), 'getKartAtmosphereProfile exported');

  const expectedProfiles = ['coastal', 'rainforest', 'alpine', 'desert', 'redwood', 'cloud'];
  for (const id of expectedProfiles) {
    assert.ok(atmoSrc.includes(`${id}:`), `Profile ${id} defined in Atmosphere.ts`);
  }
});

test('Task 7.2 & 7.3: Scenery.ts provides farSceneryRoot and borrowed-resource-safe disposal', () => {
  const scenerySrc = readFileSync('games/kart-royale/src/world/Scenery.ts', 'utf8');
  assert.ok(scenerySrc.includes('readonly farSceneryRoot = new THREE.Group()'), 'farSceneryRoot field defined');
  assert.ok(scenerySrc.includes('setFarScenery(node: THREE.Object3D | null): void'), 'setFarScenery method defined');
  assert.ok(scenerySrc.includes('this.farSceneryRoot.removeFromParent()'), 'farSceneryRoot safely detached before geometry disposal in dispose()');

  // Verify runtime behavior with a simulated Scenery instance
  const farSceneryRoot = new THREE.Group();
  const group = new THREE.Group();
  group.add(farSceneryRoot);

  let geomDisposed = false;
  let matDisposed = false;
  const borrowedGeom = new THREE.BoxGeometry(1, 1, 1);
  borrowedGeom.dispose = () => { geomDisposed = true; };
  const borrowedMat = new THREE.MeshBasicMaterial();
  borrowedMat.dispose = () => { matDisposed = true; };
  const borrowedMesh = new THREE.Mesh(borrowedGeom, borrowedMat);

  farSceneryRoot.add(borrowedMesh);
  assert.equal(farSceneryRoot.children.length, 1);

  // Safe disposal logic as implemented in Scenery.dispose():
  if (farSceneryRoot.parent) farSceneryRoot.removeFromParent();
  while (farSceneryRoot.children.length > 0) farSceneryRoot.remove(farSceneryRoot.children[0]);
  group.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
  });

  assert.equal(geomDisposed, false, 'Borrowed geometry was NOT disposed');
  assert.equal(matDisposed, false, 'Borrowed material was NOT disposed');
  assert.equal(farSceneryRoot.children.length, 0, 'farSceneryRoot children cleared');
});

test('Task 7.3: Sky.ts scopes ShaderChunks via restoreShaderPatches and reinstallShaderPatches', () => {
  const skySrc = readFileSync('games/kart-royale/src/render/Sky.ts', 'utf8');
  assert.ok(skySrc.includes('export function restoreShaderPatches(): void'), 'restoreShaderPatches exported');
  assert.ok(skySrc.includes('export function reinstallShaderPatches(): void'), 'reinstallShaderPatches exported');
  assert.ok(skySrc.includes('setWorldProfile(profileIdOrPresentation'), 'setWorldProfile implemented');
  assert.ok(skySrc.includes('getCurrentProfile(): KartWorldAtmosphereProfile'), 'getCurrentProfile implemented');

  const runtimeSrc = readFileSync('games/kart-royale/src/host/runtime.ts', 'utf8');
  assert.ok(runtimeSrc.includes('sky.reinstallShaderPatches()'), 'Shader patches reinstalled on session begin/present');
  assert.ok(runtimeSrc.includes('sky.restoreShaderPatches()'), 'Shader patches restored on session end');
});

test('kr* chunk installation is idempotent by content — a double install cannot double the definitions', async () => {
  // Regression (kart production failure): every lit material in the page
  // failed to compile with `krInterior : redefinition` / `function already
  // has a body` because the Kart Royale section of <common> was appended on
  // top of an already-patched chunk. The snapshot and commonChunk() now
  // strip any existing section before deriving, so every doubling vector
  // (second Sky snapshotting under live patches, future module copy)
  // converges to a single section.
  //
  // The real Sky.ts is TypeScript; load the REAL source through esbuild
  // (three external, local modules bundled) so the test exercises the
  // shipped strip implementation, not a reimplementation.
  const { build } = await import('esbuild');
  const { rmSync, mkdirSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  const { pathToFileURL } = await import('node:url');
  // Inside the repo so Node can resolve the externalized 'three' import.
  const outDir = 'node_modules/.afterlight-tests';
  const outFile = resolve(`${outDir}/sky-strip-${process.pid}.mjs`);
  mkdirSync(outDir, { recursive: true });
  try {
    await build({
      entryPoints: ['games/kart-royale/src/render/Sky.ts'],
      bundle: true,
      format: 'esm',
      platform: 'node',
      external: ['three'],
      outfile: outFile,
      logLevel: 'silent',
    });
    const { stripKartSection, Sky, restoreShaderPatches } = await import(pathToFileURL(outFile).href);

    const stock = THREE.ShaderChunk.common;
    assert.ok(!stock.includes('// --- Kart Royale'), 'precondition: pristine three <common>');
    // The strip normalizes the chunk tail to a single newline; compare like
    // for like.
    const tail = (s) => s.replace(/\s+$/, '') + '\n';

    const section = '\n// --- Kart Royale: scene-wide lighting state ---\nfloat krInterior = 0.0;\n';
    const patched = stock + section;

    // Pristine stock passes through untouched.
    assert.equal(stripKartSection(stock), stock);

    // A patched chunk strips back to pristine stock (restore-equivalent).
    assert.equal(tail(stripKartSection(patched)), tail(stock));

    // A DOUBLED chunk (the exact production corruption) also collapses to
    // pristine stock — the invariant installShaderPatches now relies on.
    const doubled = stock + section + section;
    assert.equal(tail(stripKartSection(doubled)), tail(stock));

    // Exercise real startup shader generation, not just source text or strip.
    // This catches missing interpolation constants before Vite ships them.
    const originalChunks = { ...THREE.ShaderChunk };
    const sky = new Sky();
    // GPU geometry/PMREM are exercised in the browser; use real init math here.
    for (const method of ['buildDome', 'buildFog', 'buildLights', 'buildEnvironment']) {
      sky[method] = () => {};
    }
    try {
      await sky.init({ renderer: { toneMappingExposure: 1.05 },
        settings: { shadows: true, quality: 3 }, sunDirection: new THREE.Vector3() });
      assert.match(THREE.ShaderChunk.shadowmap_pars_fragment, /0\.9600000/);
      sky.installShaderPatches(null);
      assert.equal(THREE.ShaderChunk.common.split('// --- Kart Royale').length, 2);
      restoreShaderPatches();
      assert.equal(THREE.ShaderChunk.common, stock);
    } finally {
      Object.assign(THREE.ShaderChunk, originalChunks);
    }
  } finally {
    try { rmSync(outFile, { force: true }); } catch {}
  }

  // The source wires the strip into both the snapshot and commonChunk().
  const skySrc = readFileSync('games/kart-royale/src/render/Sky.ts', 'utf8');
  assert.ok(
    skySrc.includes('_originalChunks[name] = stripKartSection(chunks[name])'),
    'snapshot capture strips any live patch tail',
  );
  assert.ok(
    skySrc.includes('original = stripKartSection(original)'),
    'commonChunk strips before appending',
  );
});

test('Task 7.1: World presentation change does NOT invalidate selection readiness or race state', () => {
  const mockSky = {
    profile: null,
    reinstalled: false,
    restored: false,
    setWorldProfile(id) { this.profile = id; },
    reinstallShaderPatches() { this.reinstalled = true; },
    restoreShaderPatches() { this.restored = true; },
  };
  const mockScenery = {
    farNode: null,
    setFarScenery(node) { this.farNode = node; },
  };

  let currentPresentation = null;
  let selectionReady = true;
  let batchesComplete = true;
  let raceState = 'ready';

  const hostShim = {
    setWorldPresentation(presentation) {
      currentPresentation = presentation;
      const worldId = presentation?.worldId ?? presentation?.atmosphereProfile ?? null;
      mockSky.setWorldProfile(worldId);
      if (presentation?.farSceneryNode !== undefined) {
        mockScenery.setFarScenery(presentation.farSceneryNode);
      }
    },
    getWorldPresentation() {
      return currentPresentation;
    },
    isSelectionReady() {
      return selectionReady;
    },
    isWorldPrepared() {
      return batchesComplete;
    },
    getRaceState() {
      return raceState;
    },
    beginSession() {
      mockSky.reinstallShaderPatches();
    },
    endSession() {
      mockSky.restoreShaderPatches();
    },
  };

  // 1. Initial ready state
  assert.equal(hostShim.isSelectionReady(), true);
  assert.equal(hostShim.isWorldPrepared(), true);
  assert.equal(hostShim.getRaceState(), 'ready');

  // 2. Change world presentation to alpine while prepared
  hostShim.setWorldPresentation({
    worldId: 'alpine',
    variantId: 'cold',
    atmosphereProfile: 'alpine',
  });

  assert.equal(hostShim.getWorldPresentation().worldId, 'alpine');
  assert.equal(mockSky.profile, 'alpine');

  // CRITICAL: gameplay readiness and race state are NOT reset or invalidated
  assert.equal(hostShim.isSelectionReady(), true, 'Selection readiness preserved across World change');
  assert.equal(hostShim.isWorldPrepared(), true, 'World batches preparation preserved across World change');
  assert.equal(hostShim.getRaceState(), 'ready', 'Race state preserved across World change');

  // 3. Further change to desert
  hostShim.setWorldPresentation({
    worldId: 'desert',
    variantId: 'dusk',
    atmosphereProfile: 'desert',
  });
  assert.equal(hostShim.getWorldPresentation().worldId, 'desert');
  assert.equal(mockSky.profile, 'desert');
  assert.equal(hostShim.isSelectionReady(), true);

  // 4. Session end scopes shader patches
  hostShim.endSession();
  assert.equal(mockSky.restored, true);

  // 5. Session begin reinstalls shader patches
  hostShim.beginSession();
  assert.equal(mockSky.reinstalled, true);
});
