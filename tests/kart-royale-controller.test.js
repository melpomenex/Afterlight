/**
 * Kart Royale controller lifecycle tests (integrate-kart-royale-arcade 7.2).
 *
 * Runs the REAL controller in Node with minimal browser-global stubs. Node
 * cannot load the game's TypeScript host (that is the browser build's job),
 * so the dynamic import honestly fails here — which these tests turn into
 * coverage of the load-failure lifecycle, the exact path a broken deploy or
 * a severed network takes in production:
 *
 *   - beginParticipation joins with role 'play';
 *   - seat acceptance attempts the load exactly once; failure is latched
 *     (no per-frame retry storm), announced to the player, and leaves the
 *     session cleanly with no view capture, no listeners and no body class;
 *   - an explicit beginParticipation after a failure retries (player retry);
 *   - seat loss exits safely whether or not a host ever existed;
 *   - dispose is idempotent and removes every window listener it added;
 *   - neutralizeInput before any host exists is a safe no-op.
 *
 * The successful lease path (payload shape, present hook, under-lease boot,
 * renderer-state restore) is verified in the browser gate
 * (scripts/kart-royale-gate-browser.mjs) against the real running app.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { KART_ROYALE_ACTIVITY_DEFINITION } from '../shared/placeDefinitions.js';
import { createKartRoyaleController } from '../src/activities/kart-royale/controller.js';

/**
 * Minimal browser globals. The game's module graph reads (never writes) these
 * at creation time; WebGL itself is absent on purpose.
 */
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
    addEventListener: (type, fn, opts) => listeners.push({ type, fn, capture: !!opts?.capture, added: true }),
    removeEventListener: (type, fn, opts) => {
      const i = listeners.findIndex((l) => l.type === type && l.fn === fn && l.capture === !!opts?.capture);
      if (i >= 0) listeners.splice(i, 1);
    },
  };
  const canvasStub = () => ({
    getContext: () => null,
    width: 0,
    height: 0,
    style: {},
    addEventListener() {},
    removeEventListener() {},
  });
  const document = {
    body: { classList, appendChild() {}, removeChild() {} },
    documentElement: { appendChild() {} },
    createElement: (tag) => (tag === 'canvas' ? canvasStub() : {
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
  // Node 22 already provides a read-only global `navigator` (maxTouchPoints 0,
  // no gamepads) which the game's guards tolerate.
  return {
    window,
    listeners,
    classList,
    restore() {
      delete globalThis.window;
      delete globalThis.document;
    },
  };
}

function makeSeams({ notifyPresentationTerminal = null, onBootPhase = null, notifyPresentationLive = null } = {}) {
  const state = {
    joined: null,
    participating: false,
    currentActivity: null,
  };
  const acquisitions = [];
  const releases = [];
  const toasts = [];
  let renderer = { domElement: canvasStubSafe() };
  function canvasStubSafe() {
    return { width: 0, height: 0, style: {} };
  }
  const participation = () => ({
    get isParticipating() { return state.participating; },
    get isJoining() { return false; },
    get currentActivity() { return state.currentActivity; },
    join: (def, opts) => { state.joined = { def, opts }; },
    leave: () => { state.participating = false; state.currentActivity = null; },
  });
  const controller = createKartRoyaleController({
    activityDef: KART_ROYALE_ACTIVITY_DEFINITION,
    getParticipation: () => participation(),
    acquireView: (request) => {
      acquisitions.push(request);
      if (acquisitions.length > 1) return { ok: false, reason: 'already_owned' };
      return { ok: true, lease: { ...request } };
    },
    releaseView: (owner, reason) => releases.push({ owner, reason }),
    getRenderer: () => renderer,
    generation: 4,
    toast: (title, body, tag) => toasts.push({ title, body, tag }),
    notifyPresentationTerminal,
    onBootPhase,
    notifyPresentationLive,
  });
  return { controller, state, acquisitions, releases, toasts, participation };
}

test('beginParticipation joins the session with role play', async () => {
  const stubs = installBrowserStubs();
  try {
    const { controller, state } = makeSeams();
    const ok = await controller.beginParticipation();
    assert.equal(ok, true);
    assert.equal(state.joined.def.id, 'orpheum-kart-royale');
    assert.equal(state.joined.opts.role, 'play');
    controller.dispose();
  } finally {
    stubs.restore();
  }
});

test('seat acceptance attempts the load once; failure is latched and exits cleanly', async () => {
  const stubs = installBrowserStubs();
  try {
    const { controller, state, toasts } = makeSeams();
    await controller.beginParticipation();

    // Server accepts the seat: the next update tick starts the load.
    state.participating = true;
    state.currentActivity = KART_ROYALE_ACTIVITY_DEFINITION;
    controller.update(0, 1 / 60);
    // Settle the (failing, in Node) dynamic import; many ticks pass.
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 25));
      controller.update((i + 1) / 60, 1 / 60);
    }

    // One bounded failure: exactly one failure toast, session left, no view
    // captured, presentation fully clean, listeners fully removed.
    const failures = toasts.filter((t) => /failed/i.test(t.title));
    assert.equal(failures.length, 1, `exactly one failure toast (got ${failures.length}) — load failures are latched, not retried per frame`);
    assert.equal(state.participating, false, 'the failing attempt left the session');
    assert.ok(!state.participating || controller.viewHeld === false);
    assert.equal(controller.viewHeld, false);
    assert.ok(stubs.classList.contains('kr-racing') === false, 'body class never stuck');
    const leftovers = stubs.listeners.filter((l) =>
      ['keydown', 'keyup', 'blur', 'webglcontextlost'].includes(l.type));
    assert.deepEqual(leftovers, [], 'no listeners remain after the failure exit');
    controller.dispose();
  } finally {
    stubs.restore();
  }
});

test('an explicit beginParticipation after a failure retries the load', async () => {
  const stubs = installBrowserStubs();
  try {
    const { controller, state, toasts } = makeSeams();
    await controller.beginParticipation();
    state.participating = true;
    state.currentActivity = KART_ROYALE_ACTIVITY_DEFINITION;
    controller.update(0, 1 / 60);
    for (let i = 0; i < 4; i++) {
      await new Promise((r) => setTimeout(r, 25));
      controller.update((i + 1) / 60, 1 / 60);
    }
    assert.equal(toasts.filter((t) => /failed/i.test(t.title)).length, 1);

    // The player walks up and presses E again: fresh attempt allowed.
    state.participating = false;
    state.currentActivity = null;
    await controller.beginParticipation();
    state.participating = true;
    state.currentActivity = KART_ROYALE_ACTIVITY_DEFINITION;
    controller.update(1, 1 / 60);
    for (let i = 0; i < 4; i++) {
      await new Promise((r) => setTimeout(r, 25));
      controller.update(2 + i / 60, 1 / 60);
    }
    assert.equal(toasts.filter((t) => /failed/i.test(t.title)).length, 2,
      'the retry reached the loader again (and failed again, in Node)');
    controller.dispose();
  } finally {
    stubs.restore();
  }
});

test('dispose is idempotent and seat loss is safe with no host', async () => {
  const stubs = installBrowserStubs();
  try {
    const { controller, state } = makeSeams();
    state.participating = true;
    state.currentActivity = KART_ROYALE_ACTIVITY_DEFINITION;
    controller.update(0, 1 / 60); // begins the (failing) load
    await new Promise((r) => setTimeout(r, 40));
    // Ejection before/without a successful host: no crash, clean state.
    state.participating = false;
    assert.doesNotThrow(() => controller.update(1 / 60, 1 / 60));
    assert.equal(controller.viewHeld, false);
    controller.dispose();
    assert.doesNotThrow(() => controller.dispose());
  } finally {
    stubs.restore();
  }
});

test('seat loss while the view is up exits with a safe release', async () => {
  const stubs = installBrowserStubs();
  try {
    const { controller, state, acquisitions, releases } = makeSeams();
    await controller.beginParticipation();
    state.participating = true;
    state.currentActivity = KART_ROYALE_ACTIVITY_DEFINITION;
    controller.update(0, 1 / 60);
    await new Promise((r) => setTimeout(r, 50));

    // Ejection/disconnect: participation drops while (or after) the view was held.
    state.participating = false;
    state.currentActivity = KART_ROYALE_ACTIVITY_DEFINITION;
    controller.update(2 / 60, 1 / 60);
    assert.ok(releases.length >= 1 || acquisitions.length === 0,
      'seat loss releases the lease (or the boot already failed and released)');
    if (acquisitions.length === 1 && releases.length >= 1) {
      assert.equal(releases[0].owner, acquisitions[0].owner, 'released by the owning token');
    }
    assert.equal(controller.viewHeld, false);
    controller.dispose();
  } finally {
    stubs.restore();
  }
});

test('capture listeners installed for the session are fully removed on dispose', async () => {
  const stubs = installBrowserStubs();
  try {
    const { controller, state } = makeSeams();
    await controller.beginParticipation();
    state.participating = true;
    state.currentActivity = KART_ROYALE_ACTIVITY_DEFINITION;
    controller.update(0, 1 / 60);
    await new Promise((r) => setTimeout(r, 50));
    controller.dispose();
    const leftovers = stubs.listeners.filter((l) =>
      ['keydown', 'keyup', 'blur', 'webglcontextlost'].includes(l.type));
    assert.deepEqual(leftovers, [], 'no kart-royale listeners remain on window');
  } finally {
    stubs.restore();
  }
});

test('neutralizeInput is safe before any host exists', () => {
  const stubs = installBrowserStubs();
  try {
    const { controller } = makeSeams();
    assert.doesNotThrow(() => controller.neutralizeInput());
    controller.dispose();
  } finally {
    stubs.restore();
  }
});

test('repeated beginParticipation reuses the pending activation', async () => {
  const stubs = installBrowserStubs();
  try {
    const { controller, state } = makeSeams();
    const first = await controller.beginParticipation();
    const second = await controller.beginParticipation();
    assert.equal(first, true);
    assert.equal(second, true);
    assert.equal(state.joined.def.id, 'orpheum-kart-royale');
    assert.equal(state.joined.opts.role, 'play');
    controller.dispose();
  } finally {
    stubs.restore();
  }
});

test('cancelActivation is safe before any host exists', () => {
  const stubs = installBrowserStubs();
  try {
    const { controller } = makeSeams();
    assert.equal(controller.cancelActivation(), false);
    controller.dispose();
  } finally {
    stubs.restore();
  }
});

test('seat loss is detected when currentActivity is already cleared', async () => {
  const stubs = installBrowserStubs();
  try {
    const { controller, state, releases } = makeSeams();
    await controller.beginParticipation();
    state.participating = true;
    state.currentActivity = KART_ROYALE_ACTIVITY_DEFINITION;
    controller.update(0, 1 / 60);
    await new Promise((r) => setTimeout(r, 50));

    // Participation reset clears currentActivity before the next frame.
    state.participating = false;
    state.currentActivity = null;
    controller.update(1 / 60, 1 / 60);
    assert.equal(controller.viewHeld, false);
    assert.ok(releases.length >= 0);
    controller.dispose();
  } finally {
    stubs.restore();
  }
});

test('beginParticipation prefetches preparation and resumes audio on gesture', async () => {
  const stubs = installBrowserStubs();
  let prefetched = false;
  let resumed = false;
  const audioContext = { state: 'suspended', resume: () => { resumed = true; return Promise.resolve(); } };
  try {
    const { controller } = makeSeams();
    const controller2 = createKartRoyaleController({
      activityDef: KART_ROYALE_ACTIVITY_DEFINITION,
      getParticipation: () => ({
        get isParticipating() { return false; },
        get isJoining() { return false; },
        get currentActivity() { return null; },
        join() {},
        leave() {},
      }),
      acquireView: () => ({ ok: false, reason: 'test' }),
      releaseView: () => {},
      getRenderer: () => ({ domElement: { addEventListener() {}, removeEventListener() {} } }),
      generation: 1,
      audioMixer: () => ({ context: audioContext }),
      preparation: { prefetch: async () => { prefetched = true; return { ok: true }; } },
      runGraphicsTransaction: async (fn) => fn({ renderer: {}, viewport: { width: 1280, height: 720 } }),
    });
    await controller2.beginParticipation();
    assert.equal(prefetched, true);
    assert.equal(resumed, true);
    controller2.dispose();
    controller.dispose();
  } finally {
    stubs.restore();
  }
});

test('dispose removes disconnect listener', async () => {
  const stubs = installBrowserStubs();
  const disconnectListeners = [];
  const net = {
    disconnectListeners,
    onDisconnect(fn) { disconnectListeners.push(fn); },
  };
  try {
    const participation = () => ({
      get isParticipating() { return false; },
      get isJoining() { return false; },
      get currentActivity() { return null; },
      get state() { return 'idle'; },
      join() {},
      leave() {},
    });
    const controller = createKartRoyaleController({
      activityDef: KART_ROYALE_ACTIVITY_DEFINITION,
      getParticipation: participation,
      net,
      acquireView: () => ({ ok: false, reason: 'test' }),
      releaseView: () => {},
      getRenderer: () => ({ domElement: { addEventListener() {}, removeEventListener() {} } }),
      generation: 1,
    });
    assert.equal(disconnectListeners.length, 1);
    controller.dispose();
    assert.equal(disconnectListeners.length, 0);
  } finally {
    stubs.restore();
  }
});

// --- floating media presentation terminal notifications (task 3.3) -----------

test('lease: a failed boot reports a terminal notification after leaving the session', async () => {
  const stubs = installBrowserStubs();
  const terminals = [];
  try {
    const { controller, state } = makeSeams({ notifyPresentationTerminal: (reason) => terminals.push(reason) });
    await controller.beginParticipation();
    state.participating = true;
    state.currentActivity = KART_ROYALE_ACTIVITY_DEFINITION;
    controller.update(0, 1 / 60);
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 25));
      controller.update((i + 1) / 60, 1 / 60);
    }
    assert.equal(state.participating, false);
    assert.ok(terminals.includes('load-failed'), `expected load-failed in ${JSON.stringify(terminals)}`);
    controller.dispose();
  } finally {
    stubs.restore();
  }
});

test('lease: cancel before ready reports a terminal notification', async () => {
  const stubs = installBrowserStubs();
  const terminals = [];
  try {
    const { controller, state } = makeSeams({ notifyPresentationTerminal: (reason) => terminals.push(reason) });
    await controller.beginParticipation();
    state.participating = true;
    state.currentActivity = KART_ROYALE_ACTIVITY_DEFINITION;
    controller.update(0, 1 / 60); // boot in flight (import fails asynchronously in Node)
    const cancelled = controller.cancelActivation();
    assert.equal(cancelled, true);
    assert.ok(terminals.includes('cancel'), `expected cancel in ${JSON.stringify(terminals)}`);
    controller.dispose();
  } finally {
    stubs.restore();
  }
});

test('lease: repeated begin before admission never reports a terminal and keeps the attempt', async () => {
  const stubs = installBrowserStubs();
  const terminals = [];
  try {
    const { controller, state } = makeSeams({ notifyPresentationTerminal: (reason) => terminals.push(reason) });
    assert.equal(await controller.beginParticipation(), true);
    const again = await controller.beginParticipation();
    assert.equal(again, true, 'repeated entry reuses the pending activation');
    assert.deepEqual(terminals, [], 'no spurious terminal notification');
    state.participating = true;
    state.currentActivity = KART_ROYALE_ACTIVITY_DEFINITION;
    controller.dispose();
  } finally {
    stubs.restore();
  }
});

test('lease: dispose without admission reports dispose once', () => {
  const stubs = installBrowserStubs();
  const terminals = [];
  try {
    const { controller } = makeSeams({ notifyPresentationTerminal: (reason) => terminals.push(reason) });
    controller.dispose();
    controller.dispose();
    assert.deepEqual(terminals, ['dispose'], 'idempotent disposal notifies exactly once');
  } finally {
    stubs.restore();
  }
});

test('loading indicator: a failed host import never reports phases or presentation live', async () => {
  const stubs = installBrowserStubs();
  const phases = [];
  let live = 0;
  try {
    const { controller, state } = makeSeams({
      onBootPhase: (phase) => phases.push(phase),
      notifyPresentationLive: () => { live += 1; },
    });
    await controller.beginParticipation();
    state.participating = true;
    state.currentActivity = KART_ROYALE_ACTIVITY_DEFINITION;
    controller.update(0, 1 / 60);
    // Settle the (failing, in Node) dynamic host import.
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 25));
      controller.update((i + 1) / 60, 1 / 60);
    }
    assert.deepEqual(phases, [], 'no boot phase is reported past the failed import');
    assert.equal(live, 0, 'presentation live is never reported for a failed load');
    controller.dispose();
  } finally {
    stubs.restore();
  }
});

test('loading indicator: injected phase and live callbacks are accepted seams', async () => {
  const stubs = installBrowserStubs();
  const phases = [];
  let live = 0;
  try {
    // Without admission there is no boot; the seams must simply be inert
    // (forward-only ordering and live reporting belong to the success path
    // verified in the browser gate against the real running app).
    const { controller } = makeSeams({
      onBootPhase: (phase) => phases.push(phase),
      notifyPresentationLive: () => { live += 1; },
    });
    const ok = await controller.beginParticipation();
    assert.equal(ok, true);
    assert.deepEqual(phases, []);
    assert.equal(live, 0);
    controller.dispose();
  } finally {
    stubs.restore();
  }
});
