/**
 * Activity runtime entry route + media presentation lease integration tests
 * (add-floating-minigame-media, task 3.2; design D2).
 *
 * Exercises immediate joins, queue/watch, promotion, rejection, ejection and
 * deactivation through the runtime's single entry route with a stub net, so
 * no renderer or network is needed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { createActivityRuntime } from '../src/activities/runtime.js';
import {
  clearActivityModules,
  registerActivityModule,
} from '../src/activities/registry.js';

const ACTIVITIES = [
  { id: 'pool_1', type: 'pool', title: 'Billiards', participantAnchors: [{ slot: 1, position: [0, 0, 1], facing: 0 }] },
  { id: 'kart_1', type: 'kart', title: 'Kart Royale' },
];

function makeHarness({ modules = {}, enterEvents = [], exitEvents = [], replaceEvents = [], phaseEvents = [] } = {}) {
  const sent = [];
  const net = {
    sendActivityJoin: (p) => sent.push(['join', p]),
    sendActivityLeave: (p) => sent.push(['leave', p]),
    sendActivityReady: (p) => sent.push(['ready', p]),
    send: (type, payload) => sent.push([type, payload]),
  };
  for (const [type, moduleDef] of Object.entries(modules)) {
    registerActivityModule(type, moduleDef);
  }
  const runtime = createActivityRuntime({
    net,
    applyAnchor: () => {},
    applyDismount: () => {},
    worldFacts: () => ({ bounds: null, obstacles: [], isWalkable: () => true, spawn: [0, 0] }),
    sendMovement: () => {},
    clearMovement: () => {},
    toast: () => {},
    onMediaPresentationEnter: (lease) => enterEvents.push(lease.token),
    onMediaPresentationExit: (lease, reason) => exitEvents.push({ token: lease.token, reason }),
    onMediaPresentationReplace: (lease, previous) => replaceEvents.push({ next: lease.token, previous: previous.token }),
    onMediaPresentationPhase: (lease, phase) => phaseEvents.push({ token: lease.token, phase }),
  });
  runtime.activate({
    roomId: 'theater',
    world: { group: {} },
    generation: 42,
    def: { id: 'theater', activities: ACTIVITIES },
  });
  return { runtime, sent };
}

const destroy = () => clearActivityModules();

test('immediate entry: token before join, participation joins, entry fires once', () => {
  const enterEvents = [];
  const { runtime, sent } = makeHarness({
    modules: { pool: { initialize: () => ({ update() {}, dispose() {} }) } },
    enterEvents,
  });
  try {
    const result = runtime.enterActivity({ activityId: 'pool_1', activityDef: ACTIVITIES[0] });
    assert.equal(result.handled, true);
    assert.equal(result.action, 'join');
    assert.equal(result.token.activityId, 'pool_1');
    assert.equal(runtime.participation.state, 'joining');
    assert.deepEqual(sent.at(-1), ['join', { roomId: 'theater', activityId: 'pool_1', role: 'play', requestedSlot: null }]);
    assert.equal(enterEvents.length, 1, 'the theater UI entered floating once');

    // Server accepts: the same token advances phase, no second entry.
    runtime.acceptResult({ roomId: 'theater', activityId: 'pool_1', status: 'seated', role: 'player', slot: 1 });
    assert.equal(runtime.participation.state, 'participating');
    assert.equal(runtime.mediaPresentation.active.token.phase, 'participating');
    assert.equal(enterEvents.length, 1);
  } finally {
    runtime.deactivate();
    destroy();
  }
});

test('load-before-join modules keep the provisional token through the lazy load', () => {
  const enterEvents = [];
  let beginCalls = 0;
  const { runtime, sent } = makeHarness({
    modules: {
      pool: {
        initialize: ({ getParticipation }) => ({
          update() {},
          dispose() {},
          beginParticipation() {
            beginCalls += 1;
            getParticipation().join(ACTIVITIES[0], { role: 'play' });
          },
        }),
      },
    },
    enterEvents,
  });
  try {
    const result = runtime.enterActivity({ activityId: 'pool_1', activityDef: ACTIVITIES[0] });
    assert.equal(result.action, 'begin');
    assert.equal(beginCalls, 1);
    // The module's own join ran through beforeJoin and reused the token.
    assert.equal(runtime.participation.state, 'joining');
    assert.equal(enterEvents.length, 1);
    assert.equal(enterEvents[0].attempt, result.token.attempt);

    // A repeated E while joining reuses the pending attempt and token.
    const again = runtime.enterActivity({ activityId: 'pool_1', activityDef: ACTIVITIES[0] });
    assert.equal(again.handled, true);
    assert.equal(again.token, result.token);
    assert.equal(enterEvents.length, 1, 'duplicate entry never re-mutes');
    assert.equal(sent.filter(([kind]) => kind === 'join').length, 1);
  } finally {
    runtime.deactivate();
    destroy();
  }
});

test('queue and watch results release the provisional token', () => {
  const exitEvents = [];
  const { runtime } = makeHarness({
    modules: { pool: { initialize: () => ({ update() {}, dispose() {} }) } },
    exitEvents,
  });
  try {
    runtime.enterActivity({ activityId: 'pool_1', activityDef: ACTIVITIES[0] });
    runtime.acceptResult({ roomId: 'theater', activityId: 'pool_1', status: 'queued', queuePosition: 2 });
    assert.equal(runtime.participation.state, 'queued');
    assert.equal(runtime.mediaPresentation.active, null);
    assert.equal(exitEvents.at(-1).reason, 'queued');

    runtime.participation.leave();
    runtime.enterActivity({ activityId: 'pool_1', activityDef: ACTIVITIES[0] });
    runtime.acceptResult({ roomId: 'theater', activityId: 'pool_1', status: 'spectating', role: 'spectator' });
    assert.equal(runtime.participation.state, 'watching');
    assert.equal(runtime.mediaPresentation.active, null);
    assert.equal(exitEvents.at(-1).reason, 'watching');
  } finally {
    runtime.deactivate();
    destroy();
  }
});

test('promotion from the queue starts a fresh entry with a new attempt', () => {
  const enterEvents = [];
  const { runtime } = makeHarness({
    modules: { pool: { initialize: () => ({ update() {}, dispose() {} }) } },
    enterEvents,
  });
  try {
    const first = runtime.enterActivity({ activityId: 'pool_1', activityDef: ACTIVITIES[0] });
    runtime.acceptResult({ roomId: 'theater', activityId: 'pool_1', status: 'queued' });
    assert.equal(runtime.mediaPresentation.active, null);
    runtime.acceptResult({ roomId: 'theater', activityId: 'pool_1', status: 'seated', role: 'player', slot: 1 });
    assert.equal(runtime.participation.state, 'participating');
    assert.equal(enterEvents.length, 2, 'promotion is a new entry');
    assert.ok(enterEvents[1].attempt > first.token.attempt, 'promotion gets a fresh attempt');
    assert.equal(runtime.mediaPresentation.active.token.attempt, enterEvents[1].attempt);
  } finally {
    runtime.deactivate();
    destroy();
  }
});

test('terminal rejection and ejection release the lease', () => {
  const exitEvents = [];
  const { runtime } = makeHarness({
    modules: { pool: { initialize: () => ({ update() {}, dispose() {} }) } },
    exitEvents,
  });
  try {
    runtime.enterActivity({ activityId: 'pool_1', activityDef: ACTIVITIES[0] });
    runtime.acceptError({ roomId: 'theater', activityId: 'pool_1', error: 'slot_full', message: 'Full' });
    assert.equal(runtime.participation.state, 'idle');
    assert.equal(runtime.mediaPresentation.active, null);
    assert.equal(exitEvents.at(-1).reason, 'idle');

    runtime.enterActivity({ activityId: 'pool_1', activityDef: ACTIVITIES[0] });
    runtime.acceptResult({ roomId: 'theater', activityId: 'pool_1', status: 'seated', role: 'player', slot: 1 });
    runtime.acceptSnapshot({ roomId: 'theater', activityId: 'pool_1', players: [{ slot: 2 }] });
    assert.equal(runtime.participation.state, 'idle');
    assert.equal(runtime.mediaPresentation.active, null);
    assert.equal(exitEvents.at(-1).reason, 'snapshot_ejection');
  } finally {
    runtime.deactivate();
    destroy();
  }
});

test('a rejected join releases the provisional token', () => {
  const exitEvents = [];
  const { runtime } = makeHarness({
    modules: { pool: { initialize: () => ({ update() {}, dispose() {} }) } },
    exitEvents,
  });
  try {
    runtime.enterActivity({ activityId: 'pool_1', activityDef: ACTIVITIES[0] });
    // A second, different activity while the first join is pending is not
    // allowed to steal the span; the runtime declines without acquiring.
    const stolen = runtime.enterActivity({ activityId: 'kart_1', activityDef: ACTIVITIES[1] });
    assert.equal(stolen.handled, false);
    assert.equal(runtime.mediaPresentation.active.token.activityId, 'pool_1');
    assert.equal(exitEvents.length, 0);
  } finally {
    runtime.deactivate();
    destroy();
  }
});

test('runtime deactivation releases the lease exactly once', () => {
  const exitEvents = [];
  const { runtime } = makeHarness({
    modules: { pool: { initialize: () => ({ update() {}, dispose() {} }) } },
    exitEvents,
  });
  try {
    runtime.enterActivity({ activityId: 'pool_1', activityDef: ACTIVITIES[0] });
    runtime.acceptResult({ roomId: 'theater', activityId: 'pool_1', status: 'seated', role: 'player', slot: 1 });
    const token = runtime.mediaPresentation.token;
    runtime.deactivate();
    assert.equal(runtime.mediaPresentation.active, null);
    assert.equal(exitEvents.filter((e) => e.token === token).length, 1);
    runtime.deactivate();
    assert.equal(exitEvents.length, 1, 'idempotent deactivation');
  } finally {
    destroy();
  }
});

test('modules opting out still play; they simply never acquire a floating token', () => {
  const enterEvents = [];
  const { runtime, sent } = makeHarness({
    modules: { pool: { initialize: () => ({ update() {}, dispose() {} }), mediaPolicy: { floatingMedia: false } } },
    enterEvents,
  });
  try {
    const result = runtime.enterActivity({ activityId: 'pool_1', activityDef: ACTIVITIES[0] });
    assert.equal(result.handled, true);
    assert.equal(result.token, null);
    assert.equal(runtime.participation.state, 'joining');
    assert.equal(enterEvents.length, 0);
    assert.equal(sent.some(([kind]) => kind === 'join'), true, 'the game itself still joins');
  } finally {
    runtime.deactivate();
    destroy();
  }
});

test('a newer place generation releases the old span', () => {
  const exitEvents = [];
  const { runtime } = makeHarness({
    modules: { pool: { initialize: () => ({ update() {}, dispose() {} }) } },
    exitEvents,
  });
  try {
    runtime.enterActivity({ activityId: 'pool_1', activityDef: ACTIVITIES[0] });
    assert.ok(runtime.mediaPresentation.active);
    runtime.activate({ roomId: 'theater', world: { group: {} }, generation: 43, def: { id: 'theater', activities: ACTIVITIES } });
    assert.equal(runtime.mediaPresentation.active, null);
    assert.equal(exitEvents.at(-1).reason, 'deactivate');
  } finally {
    runtime.deactivate();
    destroy();
  }
});

// --- lazy adapter terminal notifications (task 3.3) --------------------------

test('a false beginParticipation completion releases the provisional token', async () => {
  const exitEvents = [];
  const { runtime } = makeHarness({
    modules: { pool: { initialize: () => ({ update() {}, dispose() {}, beginParticipation: () => Promise.resolve(false) }) } },
    exitEvents,
  });
  try {
    const result = runtime.enterActivity({ activityId: 'pool_1', activityDef: ACTIVITIES[0] });
    assert.equal(result.action, 'begin');
    assert.ok(runtime.mediaPresentation.active, 'acquired before the lazy work');
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(runtime.mediaPresentation.active, null, 'failed boot releases immediately');
    assert.equal(exitEvents.at(-1).reason, 'failed');
  } finally {
    runtime.deactivate();
    destroy();
  }
});

test('a rejecting beginParticipation releases the provisional token without an unhandled rejection', async () => {
  const exitEvents = [];
  const { runtime } = makeHarness({
    modules: {
      pool: {
        initialize: () => ({
          update() {},
          dispose() {},
          beginParticipation: () => { throw new Error('chunk import failed'); },
        }),
      },
    },
    exitEvents,
  });
  try {
    runtime.enterActivity({ activityId: 'pool_1', activityDef: ACTIVITIES[0] });
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(runtime.mediaPresentation.active, null);
    assert.equal(exitEvents.at(-1).reason, 'failed');
  } finally {
    runtime.deactivate();
    destroy();
  }
});

test('initialize context exposes a terminal notification that ends only the matching token', () => {
  const exitEvents = [];
  let notify = null;
  const { runtime } = makeHarness({
    modules: {
      pool: {
        initialize: ({ notifyPresentationTerminal }) => {
          notify = notifyPresentationTerminal;
          return { update() {}, dispose() {} };
        },
      },
    },
    exitEvents,
  });
  try {
    runtime.enterActivity({ activityId: 'pool_1', activityDef: ACTIVITIES[0] });
    assert.equal(typeof notify, 'function');
    runtime.endActivityPresentationFor('kart_1', 'other'); // mismatched id: inert
    assert.ok(runtime.mediaPresentation.active);
    notify('cancelled');
    assert.equal(runtime.mediaPresentation.active, null);
    assert.equal(exitEvents.at(-1).reason, 'cancelled');
    notify('cancelled'); // idempotent / stale-safe
    assert.equal(exitEvents.length, 1);
  } finally {
    runtime.deactivate();
    destroy();
  }
});

test('repeated entry and background preparation never acquire spurious tokens', () => {
  const enterEvents = [];
  const exitEvents = [];
  const { runtime } = makeHarness({
    modules: {
      pool: {
        initialize: () => ({
          update() {},
          dispose() {},
          beginParticipation: () => Promise.resolve(true),
          getPrepareFrameBudgetMs: () => 4,
          tickBackgroundPreparation: () => ({ ran: true }),
          scheduleIdleModulePrefetch: () => ({ scheduled: true }),
        }),
      },
    },
    enterEvents,
    exitEvents,
  });
  try {
    // Retained-resource preparation and idle prefetch touch no presentation.
    runtime.tickBackgroundPreparation();
    runtime.getBackgroundPrepareFrameBudgetMs();
    runtime.scheduleTheaterIdlePrefetches();
    assert.equal(enterEvents.length, 0);
    assert.equal(runtime.mediaPresentation.active, null);

    runtime.enterActivity({ activityId: 'pool_1', activityDef: ACTIVITIES[0] });
    const token = runtime.mediaPresentation.token;
    runtime.tickBackgroundPreparation();
    runtime.scheduleTheaterIdlePrefetches();
    assert.equal(enterEvents.length, 1, 'preparation never re-enters');
    assert.equal(runtime.mediaPresentation.token, token, 'preparation never replaces the token');

    const again = runtime.enterActivity({ activityId: 'pool_1', activityDef: ACTIVITIES[0] });
    assert.equal(again.handled, true);
    assert.equal(runtime.mediaPresentation.token, token);
    assert.equal(enterEvents.length, 1, 'repeated entry reuses the token');
  } finally {
    runtime.deactivate();
    destroy();
  }
});

test('the developer rollback disables acquisition without breaking the game', () => {
  let enabled = false;
  try {
    clearActivityModules();
    registerActivityModule('pool', { initialize: () => ({ update() {}, dispose() {} }) });
    const sent = [];
    const net = {
      sendActivityJoin: (p) => sent.push(['join', p]),
      sendActivityLeave: (p) => sent.push(['leave', p]),
      sendActivityReady: (p) => sent.push(['ready', p]),
    };
    const runtime = createActivityRuntime({
      net,
      isFloatingMediaEnabled: () => enabled,
      applyAnchor: () => {},
      applyDismount: () => {},
      worldFacts: () => ({ bounds: null, obstacles: [], isWalkable: () => true, spawn: [0, 0] }),
      sendMovement: () => {},
      clearMovement: () => {},
      toast: () => {},
    });
    runtime.activate({ roomId: 'theater', world: { group: {} }, generation: 9, def: { id: 'theater', activities: ACTIVITIES } });
    try {
      const result = runtime.enterActivity({ activityId: 'pool_1', activityDef: ACTIVITIES[0] });
      assert.equal(result.handled, true);
      assert.equal(result.token, null, 'rollback: no presentation token acquired');
      assert.equal(runtime.mediaPresentation.active, null);
      assert.equal(runtime.participation.state, 'joining', 'the game itself still joins');
      assert.equal(sent.some(([kind]) => kind === 'join'), true);
      enabled = true;
      runtime.participation.leave();
      const enabledResult = runtime.enterActivity({ activityId: 'pool_1', activityDef: ACTIVITIES[0] });
      assert.ok(enabledResult.token, 're-enabling restores floating on the same runtime');
    } finally {
      runtime.deactivate();
    }
  } finally {
    clearActivityModules();
  }
});
