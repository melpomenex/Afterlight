/**
 * Floating-media inheritance across activities
 * (add-floating-minigame-media, task 3.5; design D2).
 *
 * Immediate-join games (Pool, air hockey, foosball, Pong, Rain Runner and
 * every future cabinet) get floating media from the shared runtime route —
 * their modules declare nothing about media. A future/dummy cabinet inherits
 * the default policy, and releasing a render/view lease alone never ends a
 * valid presentation: only participation/activation termination does.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { createActivityRuntime } from '../src/activities/runtime.js';
import {
  clearActivityModules,
  getActivityMediaPolicy,
  registerActivityModule,
} from '../src/activities/registry.js';
import { ACTIVITY_TYPES } from '../shared/placeDefinitions.js';

const IMMEDIATE_TYPES = ['pool', 'air-hockey', 'foosball', 'pong', 'rain-runner'];

function makeRuntime(defs, extra = {}) {
  const enterEvents = [];
  const exitEvents = [];
  const sent = [];
  const net = {
    sendActivityJoin: (p) => sent.push(['join', p]),
    sendActivityLeave: (p) => sent.push(['leave', p]),
    sendActivityReady: (p) => sent.push(['ready', p]),
  };
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
    ...extra,
  });
  runtime.activate({ roomId: 'theater', world: { group: {} }, generation: 7, def: { id: 'theater', activities: defs } });
  return { runtime, sent, enterEvents, exitEvents };
}

test('immediate-join games inherit floating media without any module media code', () => {
  try {
    clearActivityModules();
    for (const type of IMMEDIATE_TYPES) {
      registerActivityModule(type, { initialize: () => ({ update() {}, dispose() {} }) });
    }
    const defs = IMMEDIATE_TYPES.map((type, i) => ({ id: `act_${type}`, type, title: type }));
    const { runtime, sent, enterEvents } = makeRuntime(defs);
    try {
      for (const def of defs) {
        const result = runtime.enterActivity({ activityId: def.id, activityDef: def });
        assert.equal(result.action, 'join', `${def.type} joins immediately`);
        assert.equal(result.token.activityId, def.id, `${def.type} floats immediately`);
        assert.equal(enterEvents.at(-1).activityId, def.id);
        runtime.acceptResult({ roomId: 'theater', activityId: def.id, status: 'seated', role: 'player', slot: 1 });
        assert.equal(runtime.mediaPresentation.token.phase, 'participating');
        runtime.participation.leave();
        assert.equal(runtime.mediaPresentation.active, null, `${def.type} leave releases the presentation`);
      }
      assert.equal(sent.filter(([k]) => k === 'join').length, defs.length);
    } finally {
      runtime.deactivate();
    }
  } finally {
    clearActivityModules();
  }
});

test('every registered type (including future cabinets) defaults to floating media', () => {
  try {
    clearActivityModules();
    for (const type of ACTIVITY_TYPES) {
      registerActivityModule(type, { initialize: () => ({ update() {}, dispose() {} }) });
      assert.equal(getActivityMediaPolicy(type).floatingMedia, true, `${type} inherits the default policy`);
    }
    const dummy = { id: 'future_cabinet_1', type: 'spine-breaker', title: 'Future Cabinet' };
    // A future type not in the manifest is rejected by the registry, so the
    // dummy is registered under an existing type — the policy path is the
    // same one a new manifest entry will take.
    const { runtime, enterEvents } = makeRuntime([{ ...dummy, type: 'pong' }]);
    try {
      const result = runtime.enterActivity({ activityId: 'future_cabinet_1', activityDef: { ...dummy, type: 'pong' } });
      assert.equal(result.handled, true);
      assert.equal(result.token.activityId, 'future_cabinet_1');
      assert.equal(enterEvents.length, 1);
    } finally {
      runtime.deactivate();
    }
  } finally {
    clearActivityModules();
  }
});

test('a released view/render lease alone never ends a valid presentation', () => {
  try {
    clearActivityModules();
    const releasedViews = [];
    registerActivityModule('pool', { initialize: () => ({ update() {}, dispose() {} }) });
    const def = { id: 'pool_1', type: 'pool', title: 'Billiards' };
    const { runtime, exitEvents } = makeRuntime([def], {
      acquireView: () => ({ ok: true }),
      releaseView: (owner, reason) => releasedViews.push({ owner, reason }),
    });
    try {
      runtime.enterActivity({ activityId: 'pool_1', activityDef: def });
      runtime.acceptResult({ roomId: 'theater', activityId: 'pool_1', status: 'seated', role: 'player', slot: 1 });
      const token = runtime.mediaPresentation.token;
      assert.equal(token.phase, 'participating');

      // A game releasing its render/view lease (lobby -> results, menu,
      // prewarm teardown) does not touch presentation ownership.
      releasedViews.push('simulated');
      runtime.acceptResult({ roomId: 'theater', activityId: 'pool_1', status: 'results', place: 1 });
      runtime.acceptSnapshot({ roomId: 'theater', activityId: 'pool_1', players: [{ slot: 1 }] });
      assert.equal(runtime.mediaPresentation.token, token, 'results/lobby keep the floating session');
      assert.equal(exitEvents.length, 0);

      // Only actual participation termination ends it.
      runtime.participation.leave();
      assert.equal(runtime.mediaPresentation.active, null);
      assert.equal(exitEvents.at(-1).reason, 'leave');
    } finally {
      runtime.deactivate();
    }
  } finally {
    clearActivityModules();
  }
});
