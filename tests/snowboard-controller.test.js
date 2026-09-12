/**
 * ALPINE RUSH controller tests (integrate-ssxtricky-snowboard 4.1-4.4).
 *
 * The load handshake / seat identity / Phoenix snapshot plumbing is carried
 * over unchanged from the add-multiplayer-snowboard-arcade controller; these
 * checks pin it against the new rules state shape plus the phase-scoped
 * Ready behavior (R in lobby/results only — never a mid-race restart).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { blendRiderState, createSnowboardController, easeSteer } from '../src/activities/snowboard/controller.js';
import { resultRenderKey } from '../src/activities/snowboard/hud.js';
import { initialState } from '../shared/snowboard/rules.js';

const courseDocument = JSON.parse(readFileSync(new URL('../shared/snowboard/course-alpine-rush.json', import.meta.url)));

test('digital steering eases toward input and back to center', () => {
  const first = easeSteer(0, 1, 1 / 60);
  assert.ok(first > 0 && first < 1, 'first frame does not snap to full lock');
  let held = first;
  for (let i = 0; i < 60; i++) held = easeSteer(held, 1, 1 / 60);
  assert.ok(held > 0.99, 'held steering still reaches full lock');
  const released = easeSteer(held, 0, 1 / 60);
  assert.ok(released > 0 && released < held, 'release returns smoothly toward center');
});

test('visual rider state blends between 30 Hz simulation ticks', () => {
  const visual = { x: 0, y: 1, s: 10, lateral: 0, v: 12, score: 0 };
  const target = { ...visual, x: 2, s: 11, lateral: 4, score: 50 };
  blendRiderState(visual, target, 1 / 60);
  assert.ok(visual.x > 0 && visual.x < 2, 'lateral position does not snap');
  assert.ok(visual.lateral > 0 && visual.lateral < 4, 'board angle does not snap');
  assert.equal(visual.score, 50, 'non-positional authoritative fields stay current');
});

test('unchanged results keep a stable render key so rematch controls stay mounted', () => {
  const rows = [{ playerId: 'me', place: 1, score: 1200, self: true }];
  const snap = { score: 1200, bestCombo: 800, landings: 2 };
  assert.equal(resultRenderKey(snap, rows), resultRenderKey({ ...snap }, [{ ...rows[0] }]));
  assert.notEqual(resultRenderKey(snap, rows), resultRenderKey({ ...snap, score: 1300 }, rows));
});

test('load retries until acknowledged, follows seat identity, and accepts Phoenix race snapshots', async () => {
  const calls = [];
  let ack;
  let disposed = false;
  let seq = 0;
  const activityDef = { id: 'summit-run', courseDocument, capacities: { players: 8 } };
  const p = { isParticipating: true, currentActivity: activityDef, sessionId: 's', lease: 'a', currentSlot: 0 };
  const c = await createSnowboardController({
    activityDef, getParticipation: () => p,
    acquireView: () => ({ ok: true }), releaseView: () => {},
    net: {
      on: (_type, fn) => { ack = fn; return () => { disposed = true; }; },
      nextActivitySeq: () => ++seq,
      sendActivityInput: frame => { calls.push(frame); return {ok:true}; },
      sendActivityReady: frame => calls.push(frame),
    },
  });
  try {
    c.acceptSnapshot({matchId:'m',status:'lobby',state:{players:[]}});
    await c.beginParticipation();
    await new Promise(r => setTimeout(r, 1510));
    c.update(0, 0.016);
    assert.equal(calls.at(-1).controls.kind, 'loaded');
    // The loaded handshake carries the Alpine Rush course identity (v2).
    assert.equal(calls.at(-1).controls.courseId, 'alpine-rush');
    assert.equal(calls.at(-1).controls.courseVersion, 2);
    const first = calls.at(-1);
    ack({result:'loaded',ackSeq:first.seq}); // no activityId, like the gateway
    const count = calls.length;
    c.update(0, 0.016);
    assert.equal(calls.length, count, 'accepted load stops retries');
    p.lease = 'b';
    await new Promise(r => setTimeout(r, 1510));
    c.update(0, 0.016);
    assert.equal(calls.at(-1).lease, 'b', 're-seat gets a new handshake');
    ack({result:'loaded',ackSeq:first.seq}); // stale previous seat reply
    await new Promise(r => setTimeout(r, 1510));
    c.update(0, 0.016);
    assert.ok(calls.length > count + 1, 'stale ack cannot stop current seat retry');
    ack({result:'loaded',ackSeq:calls.at(-1).seq});
    c.acceptSnapshot({
      matchId:'m', status:'racing', startAt:null, serverNow:Date.now(), serverTick:30,
      self:{slot:0,appliedSeq:0,heldControls:{kind:'neutral'}},
      state:{players:[{slot:0,playerId:'me',loaded:true}],sim:{riders:{'0':{
        ...initialState(0,2), s:40, v:20,
      }}}},
    });
    c.update(1, 0.016);
    assert.equal(calls.at(-1).controls.kind, 'ride', 'race starts without startAt or self.playerId');
    // The ride heartbeat carries the full source control vocabulary.
    const ride = calls.at(-1).controls;
    for (const key of ['steer','tuck','lean','brake','boost','jumpHeld','trickQ','trickE','trickX']) {
      assert.ok(key in ride, `ride controls carry ${key}`);
    }
  } finally { c.dispose(); }
  assert.equal(disposed, true, 'ack listener is removed');
});

test('presentation terminal notification fires once on dispose without a seat', async () => {
  const terminals = [];
  const activityDef = { id: 'summit-run', courseDocument, capacities: { players: 8 } };
  const p = { isParticipating: false, isJoining: false, currentActivity: null, state: 'idle' };
  const c = await createSnowboardController({
    activityDef,
    getParticipation: () => p,
    acquireView: () => ({ ok: true }),
    releaseView: () => {},
    notifyPresentationTerminal: (reason) => terminals.push(reason),
  });
  c.exit('load-cancelled');
  c.dispose();
  assert.deepEqual(terminals, ['load-cancelled', 'dispose'], 'the provisional floating token is released exactly once per terminal path');
});
