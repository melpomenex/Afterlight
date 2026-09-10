/**
 * Downhill Mayhem lifecycle soak
 * (integrate-multiplayer-downhill-mayhem-arcade 12.3).
 *
 * Repeated enter/exit and rematch cycles must not accumulate listeners, DOM
 * presentation state, hosts, prediction samples or interpolation buffers. The
 * real controller and real prediction/interpolation modules run in Node with
 * minimal browser stubs and a stubbed host module.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { generateCourseDocument } from '../shared/downhill/course.js';
import { initialRiderState } from '../shared/downhill/rules.js';
import { DOWNHILL_MAYHEM_ACTIVITY_DEFINITION } from '../shared/placeDefinitions.js';
import { createDownhillController } from '../src/activities/downhill/controller.js';
import { createPredictor } from '../src/activities/downhill/prediction.js';
import { createRemoteInterpolator } from '../src/activities/downhill/interpolation.js';
import { createResourceCache } from '../src/activities/resourceCache.js';
import { createDownhillMayhemPreparation } from '../src/activities/downhillMayhemPreparation.js';

const COURSE_DOCUMENT = Object.freeze({
  ...generateCourseDocument({ mountain: 'classic' }),
  hash: 'a'.repeat(64),
});
const ACTIVITY_DEF = Object.freeze({
  ...DOWNHILL_MAYHEM_ACTIVITY_DEFINITION,
  courseDocument: COURSE_DOCUMENT,
});

function installBrowserStubs() {
  const listeners = [];
  const classList = {
    classes: new Set(),
    add(c) { this.classes.add(c); },
    remove(c) { this.classes.delete(c); },
    contains(c) { return this.classes.has(c); },
  };
  const window = {
    innerWidth: 1280,
    innerHeight: 720,
    addEventListener: (type, fn, opts) => listeners.push({ scope: 'window', type, fn, capture: !!opts?.capture }),
    removeEventListener: (type, fn, opts) => {
      const i = listeners.findIndex((l) => l.scope === 'window' && l.type === type && l.fn === fn && l.capture === !!opts?.capture);
      if (i >= 0) listeners.splice(i, 1);
    },
  };
  const canvas = {
    width: 0,
    height: 0,
    style: {},
    addEventListener: (type, fn) => listeners.push({ scope: 'canvas', type, fn }),
    removeEventListener: (type, fn) => {
      const i = listeners.findIndex((l) => l.scope === 'canvas' && l.type === type && l.fn === fn);
      if (i >= 0) listeners.splice(i, 1);
    },
  };
  const document = {
    activeElement: null,
    body: { classList, appendChild() {}, removeChild() {} },
    createElement: (tag) => (tag === 'canvas' ? canvas : {
      className: '',
      children: [],
      appendChild() {},
      remove() {},
      setAttribute() {},
      addEventListener() {},
      style: { setProperty() {}, cssText: '' },
    }),
    getElementById: () => null,
  };
  globalThis.window = window;
  globalThis.document = document;
  return {
    window, document, listeners, classList, canvas,
    restore() { delete globalThis.window; delete globalThis.document; },
  };
}

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function makeController({ record, acquisitions, releases, stubs, state, loadHostModule = null }) {
  return createDownhillController({
    activityDef: ACTIVITY_DEF,
    net: {
      nextActivitySeq: () => 1,
      sendActivityInput: () => ({ ok: true }),
      sendActivityReady: () => ({ ok: true }),
      on: () => () => {},
      onDisconnect: () => {},
      disconnectListeners: [],
    },
    getParticipation: () => ({
      get isParticipating() { return state.participating; },
      get isJoining() { return state.joining; },
      get currentActivity() { return state.currentActivity; },
      get state() { return state.participating ? 'participating' : 'idle'; },
      get sessionId() { return 'sess-1'; },
      get lease() { return 'lease-a'; },
      get currentSlot() { return 0; },
      get currentMatchId() { return 'match-1'; },
      get playerId() { return 'me'; },
      get isQueued() { return false; },
      get isWatching() { return false; },
      join: (def, opts) => { state.joined = { def, opts }; state.joining = true; },
      leave: () => { state.participating = false; state.joining = false; },
    }),
    acquireView: (request) => { acquisitions.push(request); return { ok: true, lease: { ...request } }; },
    releaseView: (owner, reason) => {
      releases.push({ owner, reason });
      acquisitions[acquisitions.length - 1]?.onRelease?.(reason);
    },
    getRenderer: () => ({ domElement: stubs.canvas }),
    generation: 5,
    getHudHost: () => null,
    loadHostModule: loadHostModule ?? (async () => ({
      createDownhillMayhemHost() {
        record.created += 1;
        return {
          ready: true,
          dispose() { record.disposed += 1; },
          prepare: async () => { record.prepared += 1; },
          enter() {},
          update() {},
          present() {},
          resize() {},
          input: { handleKeyDown() {}, handleKeyUp() {}, neutralize() {} },
          session: { acceptSnapshot() {}, acceptEvent() {}, acceptResult() {}, setMuted() {}, requestExit() {}, state: {} },
        };
      },
    })),
  });
}

test('twenty controller enter/exit cycles return listeners and body state to baseline', async () => {
  const stubs = installBrowserStubs();
  try {
    const record = { created: 0, disposed: 0, prepared: 0 };
    const state = { participating: false, joining: false, currentActivity: null, joined: null };
    const acquisitions = [];
    const releases = [];
    const controller = makeController({ record, acquisitions, releases, stubs, state });
    const baseline = stubs.listeners.length;

    for (let cycle = 0; cycle < 20; cycle++) {
      state.participating = false;
      state.currentActivity = null;
      await controller.beginParticipation();
      state.participating = true;
      state.currentActivity = ACTIVITY_DEF;
      controller.update(0, 1 / 60);
      await flush();
      await flush();
      controller.update(1 / 60, 1 / 60);
      assert.equal(controller.viewHeld, true, `cycle ${cycle} holds the view`);
      assert.equal(stubs.classList.contains('dm-racing'), true);

      controller.exit('menu');
      assert.equal(controller.viewHeld, false, `cycle ${cycle} released the view`);
      assert.equal(stubs.classList.contains('dm-racing'), false, `cycle ${cycle} removed the body class`);
      assert.equal(stubs.listeners.length, baseline, `cycle ${cycle} left no listeners`);
    }

    assert.equal(record.created, 20);
    assert.equal(record.disposed, 20, 'every cycle disposed its host exactly once');
    controller.dispose();
    assert.equal(stubs.listeners.length, baseline);
  } finally {
    stubs.restore();
  }
});

test('a rematch never rebuilds the host and prediction buffers stay bounded', async () => {
  const stubs = installBrowserStubs();
  try {
    const record = { created: 0, disposed: 0, prepared: 0 };
    const state = { participating: false, joining: false, currentActivity: null, joined: null };
    const controller = makeController({ record, acquisitions: [], releases: [], stubs, state });
    state.participating = true;
    state.currentActivity = ACTIVITY_DEF;
    controller.update(0, 1 / 60);
    await flush();
    await flush();
    controller.update(1 / 60, 1 / 60);
    assert.equal(record.created, 1);

    const racingFrame = (matchId, serverTick) => ({
      activityId: 'orpheum-downhill-mayhem',
      matchId,
      status: 'racing',
      serverTick,
      serverNow: Date.now(),
      self: { slot: 0, playerId: 'me', appliedSeq: 0, heldControls: { kind: 'neutral' } },
      state: {
        riders: {
          0: { ...initialRiderState(0, { isAI: false }), playerId: 'me', loaded: true },
          1: { ...initialRiderState(1, { isAI: true }), playerId: 'ai-1', loaded: true },
        },
      },
    });

    controller.acceptSnapshot(racingFrame('match-1', 10));
    for (let i = 1; i <= 300; i++) controller.acceptSnapshot(racingFrame('match-1', 10 + i));
    controller.acceptResult({
      activityId: 'orpheum-downhill-mayhem',
      matchId: 'match-1',
      result: { kind: 'downhill-mayhem', standings: [], raceTime: 30 },
    });
    controller.acceptSnapshot(racingFrame('match-2', 5000));
    controller.acceptSnapshot(racingFrame('match-2', 5001));

    assert.equal(record.created, 1, 'the same host survives a rematch');
    assert.equal(record.disposed, 0);
    controller.dispose();
    assert.equal(record.disposed, 1);
  } finally {
    stubs.restore();
  }
});

test('prediction and interpolation buffers are bounded and reset', () => {
  const course = {
    finishS: 2300,
    heightAt: () => 0,
    sampleTrack: () => ({ x: 0, z: 0, y: 0, h: 0, curv: 0, grade: 0 }),
    worldPosition: (s, lat, y, out) => out,
    startLats: [0],
  };
  const predictor = createPredictor(course);
  predictor.reset(initialRiderState(0, { isAI: false }), 0, { kind: 'neutral' }, 0, 0);
  for (let i = 0; i < 500; i++) predictor.submit(i, { kind: 'ride', steer: 0, pedal: true });
  assert.ok(predictor.bufferedSamples <= 60, 'prediction history is capped');
  predictor.reset(initialRiderState(0, { isAI: false }), 0, { kind: 'neutral' }, 0, 0);
  assert.equal(predictor.bufferedSamples, 0, 'reset clears the prediction buffer');

  const interpolator = createRemoteInterpolator();
  for (let tick = 1; tick <= 500; tick++) {
    interpolator.push({ serverTick: tick, riders: { 0: { s: tick, lat: 0, y: 0 } }, resetSeqs: { 0: 0 } });
  }
  assert.ok(interpolator.bufferedCount <= 12, 'interpolation history is capped');
  interpolator.clear();
  assert.equal(interpolator.bufferedCount, 0);
});

test('preparation retain/release cycles dispose the host exactly once and keep one cache slot', async () => {
  const timers = [];
  const cache = createResourceCache({
    schedule: {
      after: (_ms, fn) => { timers.push(fn); return timers.length; },
      cancel: (id) => { timers[id - 1] = null; },
    },
  });
  const preparation = createDownhillMayhemPreparation({ cache });
  let disposed = 0;

  for (let cycle = 0; cycle < 20; cycle++) {
    await preparation.prepare({
      factory: async () => ({
        host: { dispose() { disposed += 1; } },
        ready: true,
      }),
    });
    assert.equal(cache.size(), 1);
    preparation.activate();
    preparation.suspend();
    preparation.retainHost(preparation.getRetainedHost()?.host, { ready: true });
    preparation.releaseRetainedHost();
    timers.filter(Boolean).forEach((fn) => fn());
    assert.equal(cache.size(), 0);
  }

  assert.equal(disposed, 20, 'one disposal per released host');
  preparation.dispose();
  assert.equal(cache.size(), 0);
});

test('the shared frame loop suspends world simulation, raycasts and HUD during a lease', () => {
  const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const leaseIndex = source.indexOf('const lease = activityView.lease;');
  assert.ok(leaseIndex > 0, 'the lease branch exists in the frame loop');
  const branch = source.slice(leaseIndex, source.indexOf('if (!paused) {', leaseIndex));

  // Required work only: the activity update, the lease presenter / composer
  // and hiding the theater overlay anchor.
  assert.match(branch, /activityRuntime\.update\(/);
  assert.match(branch, /lease\.present\(\);|composer\.render\(\);/);
  assert.match(branch, /theaterUI\.updateScreenQuad\(null\)/);

  // World simulation, world raycasts, world HUD and the minimap live after the
  // lease branch's early return and never run while leased.
  const returnIndex = branch.indexOf('return;');
  assert.ok(returnIndex > 0, 'the lease branch returns before world work');
  const tail = branch.slice(returnIndex + 'return;'.length);
  for (const forbidden of ['currentWorld.update', 'updateMinimap', 'raycaster', 'nearest =']) {
    assert.ok(!tail.includes(forbidden), `after the lease return there must be no ${forbidden}`);
  }
});
