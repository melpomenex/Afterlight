/**
 * Downhill Mayhem controller lifecycle tests
 * (integrate-multiplayer-downhill-mayhem-arcade 6.2/10).
 *
 * The REAL controller runs in Node with minimal browser-global stubs and a
 * stubbed host module injected through `loadHostModule`, so the frozen host
 * contract (requested, not implemented here) is exercised exactly:
 *   - beginParticipation joins the session with role 'play';
 *   - seat acceptance boots the host once and binds the view lease to the
 *     attempt token + place generation, with a `present` hook;
 *   - a cancelled attempt's late host load attaches to nothing;
 *   - every window/canvas listener is removed by dispose;
 *   - the exit funnel releases the view and leaves the seat;
 *   - the controller never creates a renderer, canvas or RAF loop and speaks
 *     the downhill activity protocol.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generateCourseDocument } from '../shared/downhill/course.js';
import { initialRiderState } from '../shared/downhill/rules.js';
import { DOWNHILL_MAYHEM_ACTIVITY_DEFINITION } from '../shared/placeDefinitions.js';
import { createDownhillController } from '../src/activities/downhill/controller.js';

const COURSE_DOCUMENT = Object.freeze({
  ...generateCourseDocument({ mountain: 'classic' }),
  hash: 'a'.repeat(64),
});

const ACTIVITY_DEF = Object.freeze({ ...DOWNHILL_MAYHEM_ACTIVITY_DEFINITION, courseDocument: COURSE_DOCUMENT });

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

function makeHostModule(record) {
  return {
    createDownhillMayhemHost(options) {
      record.created += 1;
      record.options = options;
      return {
        ready: true,
        prepare: async () => { record.prepared += 1; },
        enter: () => { record.entered += 1; },
        update: (dt, authoritative) => { record.updates += 1; record.authoritative = authoritative; },
        present: () => { record.presents += 1; },
        resize: () => { record.resizes += 1; },
        input: { handleKeyDown() {}, handleKeyUp() {}, neutralize() {} },
        session: { acceptSnapshot() {}, acceptEvent() {}, acceptResult() {}, setMuted() {}, requestExit() {}, state: {} },
        dispose: () => { record.disposed += 1; },
      };
    },
  };
}

function makeState() {
  return {
    participating: false,
    joining: false,
    currentActivity: null,
    state: 'idle',
    sessionId: 'sess-1',
    lease: 'lease-a',
    slot: 0,
    matchId: 'match-1',
    playerId: 'me',
    joined: null,
    left: 0,
  };
}

function makeParticipation(state) {
  return () => ({
    get isParticipating() { return state.participating; },
    get isJoining() { return state.joining; },
    get currentActivity() { return state.currentActivity; },
    get state() { return state.state; },
    get sessionId() { return state.sessionId; },
    get lease() { return state.lease; },
    get currentSlot() { return state.slot; },
    get currentMatchId() { return state.matchId; },
    get playerId() { return state.playerId; },
    join: (def, opts) => { state.joined = { def, opts }; state.state = 'joining'; },
    leave: () => { state.left += 1; state.participating = false; state.state = 'idle'; },
  });
}

function makeNet(calls) {
  const listeners = [];
  return {
    calls,
    disconnectListeners: listeners,
    on: () => () => {},
    onDisconnect: (fn) => listeners.push(fn),
    nextActivitySeq: () => calls.length + 1,
    sendActivityInput: (frame) => { calls.push({ type: 'input', frame }); return { ok: true }; },
    sendActivityReady: (frame) => { calls.push({ type: 'ready', frame }); return { ok: true }; },
  };
}

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function bootToView(stubs, overrides = {}) {
  const state = makeState();
  const calls = [];
  const net = makeNet(calls);
  const acquisitions = [];
  const releases = [];
  const record = { created: 0, prepared: 0, entered: 0, updates: 0, presents: 0, resizes: 0, disposed: 0 };
  const module = makeHostModule(record);
  let lastRequest = null;
  const controller = createDownhillController({
    activityDef: ACTIVITY_DEF,
    net,
    getParticipation: makeParticipation(state),
    acquireView: (request) => { acquisitions.push(request); lastRequest = request; return { ok: true, lease: { ...request } }; },
    releaseView: (owner, reason) => {
      releases.push({ owner, reason });
      lastRequest?.onRelease?.(reason);
    },
    getRenderer: () => ({ domElement: stubs.canvas }),
    generation: 7,
    getHudHost: () => null,
    loadHostModule: async () => module,
    ...overrides,
  });
  await controller.beginParticipation();
  state.participating = true;
  state.state = 'participating';
  state.currentActivity = ACTIVITY_DEF;
  controller.update(0, 1 / 60);
  await flush();
  await flush();
  controller.update(1 / 60, 1 / 60);
  return { controller, state, calls, net, acquisitions, releases, record };
}

test('beginParticipation joins the session with role play', async () => {
  const stubs = installBrowserStubs();
  try {
    const state = makeState();
    const controller = createDownhillController({
      activityDef: ACTIVITY_DEF,
      getParticipation: makeParticipation(state),
      getHudHost: () => null,
    });
    const ok = await controller.beginParticipation();
    assert.equal(ok, true);
    assert.equal(state.joined.def.id, 'orpheum-downhill-mayhem');
    assert.equal(state.joined.opts.role, 'play');
    controller.dispose();
  } finally {
    stubs.restore();
  }
});

test('seat acceptance binds the lease to the attempt token and generation with present', async () => {
  const stubs = installBrowserStubs();
  try {
    const { controller, acquisitions, record } = await bootToView(stubs);
    assert.equal(record.created, 1, 'host created exactly once');
    assert.equal(record.entered, 1, 'host entered');
    assert.equal(acquisitions.length, 1, 'view acquired once');
    const request = acquisitions[0];
    assert.equal(request.owner, controller.attemptToken, 'lease owner is the attempt token');
    assert.equal(request.generation, 7, 'lease carries the place generation');
    assert.equal(typeof request.present, 'function', 'foreign-composer present hook supplied');
    assert.equal(controller.viewHeld, true);
    assert.equal(stubs.classList.contains('dm-racing'), true, 'body presentation class applied');
    controller.dispose();
  } finally {
    stubs.restore();
  }
});

test('a cancelled attempt discards a late host load and never takes the view', async () => {
  const stubs = installBrowserStubs();
  try {
    const state = makeState();
    const calls = [];
    const acquisitions = [];
    const record = { created: 0 };
    const module = makeHostModule(record);
    let releaseLoad;
    const deferred = new Promise((resolve) => { releaseLoad = resolve; });
    const controller = createDownhillController({
      activityDef: ACTIVITY_DEF,
      net: makeNet(calls),
      getParticipation: makeParticipation(state),
      acquireView: (request) => { acquisitions.push(request); return { ok: true }; },
      releaseView: () => {},
      getRenderer: () => ({ domElement: stubs.canvas }),
      generation: 2,
      getHudHost: () => null,
      loadHostModule: () => deferred,
    });
    await controller.beginParticipation();
    state.participating = true;
    state.state = 'participating';
    state.currentActivity = ACTIVITY_DEF;
    controller.update(0, 1 / 60); // boot starts, blocks on the deferred load
    controller.exit('cancel');    // fences the attempt
    releaseLoad(module);          // late completion
    await flush();
    await flush();
    assert.equal(record.created, 0, 'the stale load never creates a host');
    assert.equal(acquisitions.length, 0, 'the stale load never takes the lease');
    assert.equal(controller.viewHeld, false);
  } finally {
    stubs.restore();
  }
});

test('dispose removes every window and canvas listener it installed', async () => {
  const stubs = installBrowserStubs();
  try {
    const { controller } = await bootToView(stubs);
    const installed = stubs.listeners.filter((l) => ['keydown', 'keyup', 'blur', 'webglcontextlost'].includes(l.type));
    assert.ok(installed.length >= 4, 'capture-phase input and context listeners were installed');
    controller.dispose();
    const leftovers = stubs.listeners.filter((l) => ['keydown', 'keyup', 'blur', 'webglcontextlost'].includes(l.type));
    assert.deepEqual(leftovers, [], 'no listeners remain after dispose');
  } finally {
    stubs.restore();
  }
});

test('the exit funnel releases the view and leaves the seat once', async () => {
  const stubs = installBrowserStubs();
  try {
    const { controller, state, releases } = await bootToView(stubs);
    controller.exit('menu');
    assert.equal(releases.length, 1, 'view released exactly once');
    assert.equal(releases[0].owner, controller.attemptToken);
    assert.equal(releases[0].reason, 'menu');
    assert.equal(state.left, 1, 'seat left exactly once');
    // A second exit is a no-op (idempotent funnel).
    controller.exit('menu');
    assert.equal(releases.length, 1);
  } finally {
    stubs.restore();
  }
});

test('the controller never creates a renderer, canvas or RAF loop', () => {
  const source = readFileSync(new URL('../src/activities/downhill/controller.js', import.meta.url), 'utf8');
  assert.ok(!/new\s+THREE\.WebGLRenderer/.test(source), 'no WebGLRenderer');
  assert.ok(!/WebGLRenderer\s*\(/.test(source), 'no WebGLRenderer construction');
  assert.ok(!/requestAnimationFrame\s*\(/.test(source), 'no RAF loop');
  assert.ok(!/createElement\(\s*['"]canvas['"]\s*\)/.test(source), 'no canvas creation');
  assert.ok(!/new\s+WebSocket\s*\(/.test(source), 'no socket');
  // The one dynamic import is the frozen game host.
  const dynamicImports = [...source.matchAll(/import\((['"])([^'"]+)\1\)/g)].map((m) => m[2]);
  assert.deepEqual(dynamicImports, [
    '../../../games/downhill-mayhem/src/host/index.js',
    '../../../shared/downhill/courseDocument.js',
  ], 'only the game host and the crafted-course documents are dynamically imported');
});

test('the controller speaks the downhill protocol: loaded handshake then ride heartbeat', async () => {
  const stubs = installBrowserStubs();
  try {
    const { controller, calls } = await bootToView(stubs);

    const loaded = calls.find((c) => c.type === 'input' && c.frame.controls?.kind === 'loaded');
    assert.ok(loaded, 'loaded handshake sent on entry');
    assert.equal(loaded.frame.activityType, 'downhill-mayhem');
    assert.equal(loaded.frame.controls.courseId, 'classic');
    assert.equal(loaded.frame.controls.courseVersion, 1);
    assert.equal(loaded.frame.controls.courseHash, 'a'.repeat(64));

    // Authoritative racing snapshot seeds prediction.
    controller.acceptSnapshot({
      activityId: 'orpheum-downhill-mayhem',
      matchId: 'match-1',
      status: 'racing',
      serverTick: 30,
      serverNow: Date.now(),
      self: { slot: 0, playerId: 'me', appliedSeq: 0, heldControls: { kind: 'neutral' } },
      state: {
        riders: {
          0: { ...initialRiderState(0, { isAI: false }), playerId: 'me', loaded: true },
          1: { ...initialRiderState(1, { isAI: true }), playerId: 'ai-1', loaded: true },
        },
      },
    });
    controller.update(2 / 60, 1 / 60);

    const ride = [...calls].reverse().find((c) => c.type === 'input' && c.frame.controls?.kind === 'ride');
    assert.ok(ride, 'ride heartbeat sent while racing');
    assert.equal(ride.frame.activityType, 'downhill-mayhem');
    for (const key of ['steer', 'pedal', 'brake', 'boost', 'hopPressed', 'punchPressed', 'kickPressed', 'trick']) {
      assert.ok(key in ride.frame.controls, `ride controls carry ${key}`);
    }
    assert.deepEqual([...new Set(calls.map((c) => c.frame?.activityType ?? c.frame?.activityId))],
      ['downhill-mayhem']);
    controller.dispose();
  } finally {
    stubs.restore();
  }
});
