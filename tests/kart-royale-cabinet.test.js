/**
 * Kart Royale bystander-module tests (integrate-kart-royale-arcade 7.1).
 *
 * The module behind `kart-royale` must stay a synchronous registry bootstrap
 * plus a bounded occupancy/attract cabinet display, exactly like the Summit
 * Run bystander module. These tests prove:
 *   - registration and synchronous initialization at the manifest transform
 *     (the repurposed fourth row slot);
 *   - occupancy frames drive the display (idle ↔ occupied with queue count),
 *     capped at the single seat, and ignoring non-object frames;
 *   - disposal is idempotent and leaves the world group empty;
 *   - the BYSTANDER ECONOMY: no static import of game code, exactly one
 *     dynamic import (the lazy controller), and the controller itself holds
 *     exactly one dynamic import (the game host) and no static game imports —
 *     bystanders never download the game.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { getActivityModule } from '../src/activities/registry.js';
import { injectArcadeCabinetTemplate } from '../src/arcade/cabinet.js';
import {
  KART_ROYALE_ACTIVITY_DEFINITION,
  ORPHEUM_ACTIVITIES,
} from '../shared/placeDefinitions.js';
import { occupancyToDisplayState, createKartRoyaleInstance } from '../src/activities/kart-royale.js';
import '../src/activities/kart-royale.js';

function makeFakeTemplate() {
  const root = new THREE.Group();
  root.name = 'ARC_Cabinet_ROOT';
  const named = (name) => new THREE.MeshStandardMaterial({ name, color: 0x888888 });
  const add = (name, mat) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 0.1), mat);
    mesh.name = name;
    root.add(mesh);
    return mesh;
  };
  add('Cabinet_Body', named('MAT_Cabinet_Black'));
  add('Screen_Display', named('MAT_ScreenContent'));
  add('Screen_Glass', named('MAT_Glass'));
  add('Artwork_Marquee', named('MAT_Skin_Marquee'));
  add('Trim_ControlDeck', named('MAT_LED_Emissive'));
  add('P1_Joystick_Ball', named('MAT_Plastic_Blue'));
  add('P2_Joystick_Ball', named('MAT_Plastic_Red'));
  const stand = new THREE.Object3D();
  stand.name = 'INT_PlayerStand';
  stand.position.set(0, 0, 1.05);
  root.add(stand);
  return root;
}

const occupancyFrame = (players, overrides = {}) => ({
  type: 'activity_state',
  version: 1,
  roomId: 'theater',
  roomEpoch: 3,
  activityId: 'orpheum-kart-royale',
  sessionId: 'kr-1',
  revision: 5,
  players,
  queueLength: 0,
  spectatorCount: 0,
  status: 'in_progress',
  ...overrides,
});

function makeInstance() {
  injectArcadeCabinetTemplate(makeFakeTemplate());
  const worldGroup = new THREE.Group();
  const instance = getActivityModule('kart-royale').initialize({
    activityDef: KART_ROYALE_ACTIVITY_DEFINITION,
    world: { group: worldGroup },
    net: null,
    generation: 1,
    roomId: 'theater',
    getPlayer: () => ({ position: new THREE.Vector3(9.3, 0, -1.8) }),
  });
  return { instance, worldGroup };
}

// --- pure display reduction -----------------------------------------------------

test('occupancyToDisplayState derives idle/occupied from the seated players', () => {
  const idle = occupancyToDisplayState(occupancyFrame([]), null);
  assert.equal(idle.status, 'idle');
  assert.equal(idle.playerCount, 0);

  const seated = occupancyToDisplayState(occupancyFrame([{ slot: 0, playerId: 'u1' }]), null);
  assert.equal(seated.status, 'occupied');
  assert.equal(seated.playerCount, 1);
  assert.equal(seated.seated[0].nickname, 'RACER'); // server sends no nickname in v1

  // More seats than the cabinet has are capped, never trusted.
  const capped = occupancyToDisplayState(
    occupancyFrame([{ slot: 0, playerId: 'a' }, { slot: 1, playerId: 'b' }]), null,
  );
  assert.equal(capped.playerCount, 1);

  // Queue count is bounded and honest.
  const queued = occupancyToDisplayState(occupancyFrame([{ slot: 0, playerId: 'a' }], { queueLength: 3 }), null);
  assert.equal(queued.queueCount, 3);

  // Non-object frames keep the previous state.
  const prev = { status: 'occupied', playerCount: 1, queueCount: 0, seated: [] };
  assert.equal(occupancyToDisplayState(null, prev), prev);
  assert.equal(occupancyToDisplayState({ players: 'garbage' }, prev), prev);
});

// --- module registration + cabinet lifecycle ------------------------------------

test('kart-royale module registers and initializes synchronously at the row slot', () => {
  const mod = getActivityModule('kart-royale');
  assert.ok(mod, 'kart-royale is registered');
  assert.equal(typeof mod.initialize, 'function');

  const { instance, worldGroup } = makeInstance();
  assert.equal(instance.id, 'orpheum-kart-royale');
  assert.equal(instance.type, 'kart-royale');
  assert.ok(instance.group instanceof THREE.Group);
  assert.ok(worldGroup.children.includes(instance.group));
  const [tx, , tz] = KART_ROYALE_ACTIVITY_DEFINITION.transform.position;
  assert.ok(Math.abs(instance.group.position.x - tx) < 1e-6);
  assert.ok(Math.abs(instance.group.position.z - tz) < 1e-6);
  instance.dispose();
});

test('occupancy snapshots drive the bystander display and strangers do not', () => {
  const { instance } = makeInstance();
  assert.equal(instance.getDisplayState().status, 'idle');

  instance.acceptSnapshot(occupancyFrame([{ slot: 0, playerId: 'u1' }], { queueLength: 2 }));
  const occupied = instance.getDisplayState();
  assert.equal(occupied.status, 'occupied');
  assert.equal(occupied.queueCount, 2);

  instance.acceptSnapshot(occupancyFrame([]));
  assert.equal(instance.getDisplayState().status, 'idle');

  // Another activity's frame must never touch this display.
  instance.acceptSnapshot(occupancyFrame([{ slot: 0, playerId: 'x' }], { activityId: 'orpheum-pong' }));
  assert.equal(instance.getDisplayState().status, 'idle');

  // Frames without a players array (snowboard-style summaries) are ignored.
  instance.acceptSnapshot({ activityId: 'orpheum-kart-royale', audience: 'summary', summary: {} });
  assert.equal(instance.getDisplayState().status, 'idle');
  instance.dispose();
});

test('update runs without a DOM canvas and disposal is idempotent', () => {
  const { instance, worldGroup } = makeInstance();
  instance.acceptSnapshot(occupancyFrame([{ slot: 0, playerId: 'u1' }]));
  assert.doesNotThrow(() => {
    instance.update(1.5, 1 / 60);
    instance.update(3.2, 1 / 60);
  });
  instance.dispose();
  instance.dispose();
  assert.equal(worldGroup.children.length, 0, 'world group empty after dispose');
});

test('beginParticipation forwards to the lazy controller when loaded', async () => {
  const { instance } = makeInstance();
  let begun = 0;
  // Pre-seed the controller promise path by importing the real controller
  // module once; then drive beginParticipation through a stubbed load by
  // monkey-patching the instance's private path is not possible — instead
  // assert the contract on a fresh instance where the import resolves to the
  // real module (join is observable via the participation seam below).
  const participations = [];
  const worldGroup = new THREE.Group();
  const fresh = createKartRoyaleInstance({
    activityDef: KART_ROYALE_ACTIVITY_DEFINITION,
    world: { group: worldGroup },
    getParticipation: () => ({
      currentActivity: null,
      isParticipating: false,
      join: (def, opts) => participations.push({ def, opts }),
    }),
  });
  void instance;
  // The real dynamic import runs here (Node-safe: the controller module has
  // no side effects beyond definitions).
  const ok = await fresh.beginParticipation();
  assert.equal(ok, true, 'beginParticipation resolves true');
  assert.equal(participations.length, 1, 'join requested through the controller');
  assert.equal(participations[0].opts.role, 'play');
  fresh.dispose();
});

// --- bystander economy: the source audits ---------------------------------------

test('bystander module never statically imports game code and has exactly one dynamic import', () => {
  const source = readFileSync(new URL('../src/activities/kart-royale.js', import.meta.url), 'utf8');
  const imports = [...source.matchAll(/import\s+(?:[\s\S]*?from\s+)?['"]([^'"]+)['"]/g)].map((m) => m[1]);
  for (const spec of imports) {
    assert.ok(!spec.includes('games/kart-royale'), `static import "${spec}" must not reach the game`);
    assert.ok(!spec.includes('./kart-royale/'), `static import "${spec}" must not reach the controller`);
  }
  const dynamicImports = [...source.matchAll(/import\((['"])([^'"]+)\1\)/g)].map((m) => m[2]);
  assert.deepEqual(dynamicImports, ['./kart-royale/controller.js'],
    'exactly one dynamic import: the lazy controller');
});

test('controller holds exactly one dynamic import (the game host) and no static game imports', () => {
  const source = readFileSync(new URL('../src/activities/kart-royale/controller.js', import.meta.url), 'utf8');
  const imports = [...source.matchAll(/import\s+(?:[\s\S]*?from\s+)?['"]([^'"]+)['"]/g)].map((m) => m[1]);
  assert.equal(imports.length, 0, 'controller is dependency-free by design (seams only)');
  const dynamicImports = [...source.matchAll(/import\((['"])([^'"]+)\1\)/g)].map((m) => m[2]);
  assert.equal(dynamicImports.length, 1, 'exactly one dynamic import');
  assert.ok(dynamicImports[0].includes('games/kart-royale/src/host/index.ts'),
    `the one dynamic import is the game host (got ${dynamicImports[0]})`);
});

test('the Orpheum row places Kart Royale in Sporefall\'s former slot', () => {
  const ids = ORPHEUM_ACTIVITIES.map((d) => d.id);
  assert.deepEqual(ids, [
    'orpheum-pong',
    'orpheum-rain-runner',
    'orpheum-downhill-mayhem',
    'orpheum-kart-royale',
    'summit-run',
  ]);
  assert.equal(KART_ROYALE_ACTIVITY_DEFINITION.cabinet.skin.motif, 'kart');
  assert.equal(KART_ROYALE_ACTIVITY_DEFINITION.capacities.players, 1);
});

// --- entry-loading indicator (add-kart-royale-loading-indicator) -----------------

test('entry-loading session starts on beginParticipation and clears on dispose', async () => {
  const participations = [];
  const worldGroup = new THREE.Group();
  const fresh = createKartRoyaleInstance({
    activityDef: KART_ROYALE_ACTIVITY_DEFINITION,
    world: { group: worldGroup },
    generation: 1,
    roomId: 'theater',
    getParticipation: () => ({
      currentActivity: null,
      isParticipating: false,
      join: (def, opts) => participations.push({ def, opts }),
    }),
  });
  const ok = await fresh.beginParticipation();
  assert.equal(ok, true);
  const loading = fresh.getLoadingState();
  assert.equal(loading.active, true, 'the loading session is active during the boot');
  assert.equal(loading.phase, 'modules', 'the first phase is module loading');
  assert.ok(!loading.elapsedLabel.includes('%'), 'no completion percentage, ever');
  fresh.dispose();
  assert.equal(fresh.getLoadingState().active, false, 'dispose clears the loading session');
});

test('a failed load clears the entry-loading session through the terminal wrapper', async () => {
  injectArcadeCabinetTemplate(makeFakeTemplate());
  const worldGroup = new THREE.Group();
  let participating = false;
  let currentActivity = null;
  const fresh = createKartRoyaleInstance({
    activityDef: KART_ROYALE_ACTIVITY_DEFINITION,
    world: { group: worldGroup },
    net: null,
    generation: 1,
    roomId: 'theater',
    getPlayer: () => ({ position: new THREE.Vector3(9.3, 0, -1.8) }),
    getParticipation: () => ({
      get isParticipating() { return participating; },
      get currentActivity() { return currentActivity; },
      get isOccupied() { return false; },
      state: 'admitted',
      join: (def) => { participating = true; currentActivity = def; },
      leave: () => { participating = false; currentActivity = null; },
    }),
  });
  await fresh.beginParticipation();
  assert.equal(fresh.getLoadingState().active, true);

  // The seat is accepted: the controller boots, and the (Node-failing) host
  // import exits with load-failed — through the single terminal wrapper.
  participating = true;
  currentActivity = KART_ROYALE_ACTIVITY_DEFINITION;
  for (let i = 0; i < 12 && fresh.getLoadingState().active; i++) {
    await new Promise((r) => setTimeout(r, 25));
    fresh.update(i / 60, 1 / 60);
  }
  assert.equal(fresh.getLoadingState().active, false, 'terminal wrapper cleared the session');
  assert.equal(fresh.getLoadingState().visible, false);
  fresh.dispose();
});

test('cancelActivation finishes the loading session immediately', async () => {
  injectArcadeCabinetTemplate(makeFakeTemplate());
  const worldGroup = new THREE.Group();
  const fresh = createKartRoyaleInstance({
    activityDef: KART_ROYALE_ACTIVITY_DEFINITION,
    world: { group: worldGroup },
    generation: 1,
    roomId: 'theater',
    getParticipation: () => ({
      currentActivity: null,
      isParticipating: false,
      isOccupied: false,
      join: () => {},
    }),
  });
  await fresh.beginParticipation();
  assert.equal(fresh.getLoadingState().active, true);
  fresh.cancelActivation();
  assert.equal(fresh.getLoadingState().active, false, 'cancel clears the session');
  fresh.dispose();
});
