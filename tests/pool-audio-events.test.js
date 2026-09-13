import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizePoolAudioEvent,
  ballImpactLayer,
  cueLayer,
  impactGain,
  cuePowerFromBallSpeed,
  createShotEventReconciler,
  createCueStrikeTracker,
  POOL_AUDIO_LIMITS,
} from '../src/activities/pool/audioEvents.js';
import { initRack, strikeCueBall, step as physicsStep } from '../shared/pool/physics.js';

function fakeClock() {
  let t = 0;
  return { now: () => t, advance: (ms) => { t += ms; } };
}

/** Runs a real break and returns the physics state plus all emitted events. */
function runBreak(power = 1.0) {
  let state = strikeCueBall(initRack(), 0, 32 * power, 0, 0);
  const events = [];
  for (let i = 0; i < 600 && !state.settled; i++) {
    const res = physicsStep(state, 1 / 60);
    state = res.state;
    events.push(...res.events);
  }
  return { state, events };
}

test('normalization: real physics payloads normalize with identity intact', () => {
  const { events } = runBreak(1.0);
  assert.ok(events.length > 10, 'a break produces many contacts');
  const kinds = new Set();
  for (const raw of events) {
    const ev = normalizePoolAudioEvent(raw);
    assert.ok(ev, `event normalizes: ${JSON.stringify(raw)}`);
    assert.ok(['ball', 'cushion', 'pocket'].includes(ev.kind));
    assert.ok(Number.isFinite(ev.speed) && ev.speed >= 0);
    assert.equal(ev.shot, 1, 'break events carry the strike identity');
    assert.ok(Number.isInteger(ev.step));
    assert.ok(Number.isFinite(ev.t));
    assert.ok(typeof ev.key === 'string' && ev.key.length > 0);
    kinds.add(ev.kind);
  }
  assert.ok(kinds.has('ball') && kinds.has('cushion'), 'break registers balls and cushions');
});

test('normalization: ball events keep positions, keys are order-independent', () => {
  const a = normalizePoolAudioEvent({ type: 'ball_collision', ballA: 3, ballB: 0, speed: 4.5, x: 0.1, z: -0.2 });
  const b = normalizePoolAudioEvent({ type: 'ball_hit', ballA: 0, ballB: 3, relativeSpeed: 4.5, x: 0.1, z: -0.2 });
  assert.equal(a.key, b.key, 'same pair, any argument order, aliases included');
  assert.equal(a.speed, b.speed);
  assert.equal(a.x, 0.1);
  assert.equal(a.z, -0.2);
});

test('normalization: zero intensity preserved, absurd values capped, malformed rejected', () => {
  const zero = normalizePoolAudioEvent({ type: 'ball_collision', ballA: 0, ballB: 1, speed: 0 });
  assert.ok(zero);
  assert.equal(zero.speed, 0, 'zero closing speed is a valid grazing touch');

  const capped = normalizePoolAudioEvent({ type: 'ball_collision', ballA: 0, ballB: 1, speed: 1e6 });
  assert.equal(capped.speed, POOL_AUDIO_LIMITS.MAX_SPEED);

  assert.equal(normalizePoolAudioEvent({ type: 'ball_collision', ballA: 0, ballB: 1, speed: NaN }), null);
  assert.equal(normalizePoolAudioEvent({ type: 'ball_collision', ballA: 0, ballB: 'x', speed: 1 }), null);
  assert.equal(normalizePoolAudioEvent({ type: 'ball_collision', ballA: 2, ballB: 2, speed: 1 }), null);
  assert.equal(normalizePoolAudioEvent({ type: 'rail_collision', ballId: -1 }), null);
  assert.equal(normalizePoolAudioEvent({ type: 'explosion' }), null);
  assert.equal(normalizePoolAudioEvent(null), null);
  assert.equal(normalizePoolAudioEvent('pocket'), null);
});

test('normalization: legacy payloads (no speed/position, old pocket type) stay usable', () => {
  const rail = normalizePoolAudioEvent({ type: 'rail_collision', ballId: 5, rail: 'left' });
  assert.equal(rail.kind, 'cushion');
  assert.equal(rail.speed, POOL_AUDIO_LIMITS.DEFAULT_RAIL_SPEED);
  assert.equal(rail.x, null);

  const pocketLegacy = normalizePoolAudioEvent({ type: 'pocket', ballId: 8, pocketId: 'corner_tl' });
  assert.equal(pocketLegacy.kind, 'pocket');
  assert.equal(pocketLegacy.speed, POOL_AUDIO_LIMITS.DEFAULT_POCKET_SPEED);
  assert.equal(pocketLegacy.x, -1.12, 'legacy pocket position falls back to the pocket center');
  assert.equal(pocketLegacy.z, -0.56);

  const pocketCurrent = normalizePoolAudioEvent({ type: 'pocketed', ballId: 8, pocketId: 'side_r', speed: 1.7 });
  assert.equal(pocketCurrent.x, 0.0);
  assert.equal(pocketCurrent.z, 0.56);
  assert.equal(pocketCurrent.speed, 1.7);

  const ballNoPos = normalizePoolAudioEvent({ type: 'ball_collision', ballA: 1, ballB: 2, relativeSpeed: 3 });
  assert.equal(ballNoPos.x, null);
  assert.equal(ballNoPos.speed, 3, 'relativeSpeed accepted as the legacy speed alias');
});

test('velocity layers and gains: soft stays softer than hard', () => {
  assert.equal(ballImpactLayer(0.5), 'soft');
  assert.equal(ballImpactLayer(4), 'med');
  assert.equal(ballImpactLayer(12), 'hard');
  assert.equal(cueLayer(0.2), 'soft');
  assert.equal(cueLayer(0.8), 'hard');

  assert.ok(impactGain('ball', 0.3) < impactGain('ball', 3) * 0.5);
  assert.ok(impactGain('ball', 3) < impactGain('ball', 12));
  assert.ok(impactGain('cushion', 1) < impactGain('cushion', 5));
  assert.ok(impactGain('ball', 1e6) <= 1);

  // Witness cue power inversion: launch speed maps back into the power curve.
  assert.ok(cuePowerFromBallSpeed(0.65) <= cuePowerFromBallSpeed(8) + 1e-9);
  assert.ok(cuePowerFromBallSpeed(8) < cuePowerFromBallSpeed(20));
  assert.equal(cuePowerFromBallSpeed('nope'), 0.5, 'non-finite speed maps to a medium estimate');
});

test('reconciliation: predicted contact followed by authoritative correction is heard once', () => {
  const clock = fakeClock();
  const rec = createShotEventReconciler({ now: clock.now });
  rec.scope({ shot: 1, status: 'shooting' });

  const predicted = rec.admitPredicted([
    { type: 'ball_collision', ballA: 0, ballB: 1, speed: 5, shot: 1, step: 12, t: 0.2 },
  ]);
  assert.equal(predicted.length, 1, 'prediction presents immediately');

  clock.advance(120); // snapshot latency
  const authoritative = rec.admitAuthoritative([
    { type: 'ball_collision', ballA: 0, ballB: 1, speed: 5.1, shot: 1, step: 14, t: 0.21 },
  ]);
  assert.equal(authoritative.length, 0, 'the corrected copy does not replay');

  // A later, genuinely distinct recontact between the same pair still sounds.
  clock.advance(300);
  const recontact = rec.admitAuthoritative([
    { type: 'ball_collision', ballA: 0, ballB: 1, speed: 2, shot: 1, step: 40, t: 0.7 },
  ]);
  assert.equal(recontact.length, 1, 'distinct later same-pair contact stays eligible');
});

test('reconciliation: duplicate and delayed snapshots stay silent, out-of-order arrives intact', () => {
  const clock = fakeClock();
  const rec = createShotEventReconciler({ now: clock.now });
  rec.scope({ shot: 3, status: 'shooting' });

  rec.admitPredicted([
    { type: 'rail_collision', ballId: 4, rail: 'head', speed: 2 },
    { type: 'ball_collision', ballA: 4, ballB: 9, speed: 6 },
  ]);

  const delayed = rec.admitAuthoritative([
    { type: 'ball_collision', ballA: 4, ballB: 9, speed: 6 },
    { type: 'rail_collision', ballId: 4, rail: 'head', speed: 2 },
  ]);
  assert.equal(delayed.length, 0, 'delayed out-of-order authoritative copies match by key');

  const duplicate = rec.admitAuthoritative([
    { type: 'ball_collision', ballA: 4, ballB: 9, speed: 6 },
  ]);
  assert.equal(duplicate.length, 0, 'a duplicate snapshot does not replay either');
});

test('reconciliation: contacts the prediction missed are presented authoritatively', () => {
  const clock = fakeClock();
  const rec = createShotEventReconciler({ now: clock.now });
  rec.scope({ shot: 1, status: 'shooting' });

  const fresh = rec.admitAuthoritative([
    { type: 'ball_collision', ballA: 2, ballB: 7, speed: 4 },
  ]);
  assert.equal(fresh.length, 1, 'an unmatched authoritative contact is presented');

  const replay = rec.admitAuthoritative([
    { type: 'ball_collision', ballA: 2, ballB: 7, speed: 4 },
  ]);
  assert.equal(replay.length, 0, 'and is not presented twice');
});

test('reconciliation: genuine rapid same-pair recontacts each match their own copy', () => {
  const clock = fakeClock();
  const rec = createShotEventReconciler({ now: clock.now });
  rec.scope({ shot: 2, status: 'shooting' });

  rec.admitPredicted([
    { type: 'ball_collision', ballA: 1, ballB: 2, speed: 5, t: 0.5 },
    { type: 'ball_collision', ballA: 1, ballB: 2, speed: 3, t: 0.65 },
  ]);

  clock.advance(100);
  const authoritative = rec.admitAuthoritative([
    { type: 'ball_collision', ballA: 1, ballB: 2, speed: 5, t: 0.51 },
    { type: 'ball_collision', ballA: 1, ballB: 2, speed: 3, t: 0.66 },
  ]);
  assert.equal(authoritative.length, 0, 'both rapid recontacts are consumed, neither replayed');
});

test('reconciliation: a real break reconciles its snapshot copies without losing distinct contacts', () => {
  const clock = fakeClock();
  const rec = createShotEventReconciler({ now: clock.now });
  const { events } = runBreak(1.0);
  rec.scope({ shot: events[0]?.shot ?? 1, status: 'shooting' });

  const presented = rec.admitPredicted(events);
  assert.ok(presented.length > 10);

  // The snapshot carries a partial duplicate subset (server steps 60 Hz,
  // snapshots 20 Hz): every key already presented is consumed silently.
  const duplicatedSubset = events.filter((_, i) => i % 3 === 0);
  const echoed = rec.admitAuthoritative(duplicatedSubset);
  assert.equal(echoed.length, 0, 'break contacts are not replayed by the snapshot');

  // A distinct new pair the prediction never saw still sounds.
  const unseen = rec.admitAuthoritative([
    { type: 'ball_collision', ballA: 13, ballB: 14, speed: 1.5, shot: 1 },
  ]);
  assert.equal(unseen.length, 1);
});

test('reconciliation: shot/status transitions and rerack clear history; joins baseline', () => {
  const clock = fakeClock();
  const rec = createShotEventReconciler({ now: clock.now });

  // Shot 1 contacts, then the shot settles.
  rec.scope({ shot: 1, status: 'shooting' });
  rec.admitPredicted([{ type: 'ball_collision', ballA: 0, ballB: 5, speed: 4, shot: 1 }]);
  rec.scope({ shot: 1, status: 'aiming' }); // settled
  // New rack, new shot 1 (ids reset on rerack).
  rec.scope({ shot: 1, status: 'shooting' });
  const afterRerack = rec.admitAuthoritative([
    { type: 'ball_collision', ballA: 0, ballB: 5, speed: 4, shot: 1 },
  ]);
  assert.equal(afterRerack.length, 1, 'the reracked shot does not inherit the old history');

  // Reconnect mid-shot: baseline swallows the snapshot's historical events.
  rec.scope({ shot: 9, status: 'shooting' });
  rec.baseline([
    { type: 'ball_collision', ballA: 0, ballB: 5, speed: 4, shot: 9 },
  ]);
  const afterReconnect = rec.admitAuthoritative([
    { type: 'ball_collision', ballA: 0, ballB: 5, speed: 4, shot: 9 },
  ]);
  assert.equal(afterReconnect.length, 0, 'reconnect replays no historical contacts');
});

test('reconciliation: history stays bounded across a long session', () => {
  const clock = fakeClock();
  const rec = createShotEventReconciler({ now: clock.now, maxHistory: 32 });
  rec.scope({ shot: 1, status: 'shooting' });

  for (let i = 0; i < 500; i++) {
    rec.admitPredicted([{ type: 'ball_collision', ballA: i % 15, ballB: (i + 1) % 15, speed: 1 }]);
    clock.advance(1);
  }
  assert.ok(rec.size <= 32, `bounded history (got ${rec.size})`);
});

test('cue ownership: shooter strikes once, authoritative echo is silent, witness strikes once', () => {
  const clock = fakeClock();
  const cue = createCueStrikeTracker({ now: clock.now });

  // Both parties first observe the aiming table.
  assert.equal(cue.observedSim({ status: 'aiming' }).play, false);

  // Shooter: animation impact plays exactly one strike.
  assert.equal(cue.localStrike(0.6).play, true);
  clock.advance(150); // authoritative shot start arrives
  assert.equal(cue.observedSim({ status: 'shooting', cueBallSpeed: 9 }).play, false, 'no echo for the shooter');

  // Shot settles, next shooter is someone else (the former witness).
  cue.observedSim({ status: 'aiming' });
  clock.advance(2000);
  const witness = cue.observedSim({ status: 'shooting', cueBallSpeed: 20 });
  assert.equal(witness.play, true, 'witness hears the remote accepted shot start');
  assert.ok(witness.power > 0.5, 'witness power estimated from the cue ball launch speed');

  // Continued shooting snapshots are the same shot: silent.
  assert.equal(cue.observedSim({ status: 'shooting', cueBallSpeed: 5 }).play, false);
});

test('cue ownership: canceled aiming and pre-impact refusal stay silent; post-strike refusal adds nothing', () => {
  const clock = fakeClock();
  const cue = createCueStrikeTracker({ now: clock.now });
  cue.observedSim({ status: 'aiming' });

  // Canceled charge: no strike was played, nothing pending.
  cue.cancelPending();
  assert.equal(cue.observedSim({ status: 'shooting', cueBallSpeed: 6 }).play, true,
    'a shot nobody struck locally is a witness shot');

  cue.observedSim({ status: 'aiming' });

  // Refusal BEFORE the animation impact: pending cleared, no strike sounds.
  cue.localStrike(0.5);
  cue.cancelPending();
  assert.equal(cue.observedSim({ status: 'shooting', cueBallSpeed: 6 }).play, true,
    'refused stroke never registered its strike');

  cue.observedSim({ status: 'aiming' });

  // Refusal AFTER the local strike: sound already played; the refusal must
  // not add a second strike, and the stale pending claim expires on its own.
  cue.localStrike(0.5);
  clock.advance(8500); // pending timeout passes with no accepted shot
  assert.equal(cue.observedSim({ status: 'shooting', cueBallSpeed: 6 }).play, true,
    'an unrelated later shot still sounds for the witness');
});

test('cue ownership: mid-shot join and reconnect never replay the historical cue', () => {
  const clock = fakeClock();
  const cue = createCueStrikeTracker({ now: clock.now });

  // First-ever observation is already mid-shot: baseline, no cue.
  assert.equal(cue.observedSim({ status: 'shooting', cueBallSpeed: 8 }).play, false);
  // Continued motion of the same shot: still silent.
  assert.equal(cue.observedSim({ status: 'shooting', cueBallSpeed: 3 }).play, false);
  // The NEXT shot start is audible.
  cue.observedSim({ status: 'aiming' });
  assert.equal(cue.observedSim({ status: 'shooting', cueBallSpeed: 8 }).play, true);
});

test('cue ownership: rerack reusing shot numbers still counts as a new shot', () => {
  const clock = fakeClock();
  const cue = createCueStrikeTracker({ now: clock.now });
  cue.observedSim({ status: 'aiming' });
  assert.equal(cue.observedSim({ status: 'shooting', cueBallSpeed: 8 }).play, true);
  cue.observedSim({ status: 'game_over' });
  cue.observedSim({ status: 'aiming' }); // fresh rack (practice re-init)
  assert.equal(cue.observedSim({ status: 'shooting', cueBallSpeed: 8 }).play, true,
    'status transitions, not shot numbers, define shot starts');
});

test('cue ownership: snapshot arriving before the animation impact yields exactly one strike', () => {
  const clock = fakeClock();
  const cue = createCueStrikeTracker({ now: clock.now });
  cue.observedSim({ status: 'aiming' });

  // The server wins the race: the shooting snapshot lands first.
  const witness = cue.observedSim({ status: 'shooting', cueBallSpeed: 9 });
  assert.equal(witness.play, true, 'the shot start is heard once immediately');

  // The lagging animation impact is the echo: suppressed within the grace.
  assert.equal(cue.localStrike(0.6).play, false, 'no second strike for the animation echo');

  clock.advance(600); // grace expires
  cue.observedSim({ status: 'aiming' });
  assert.equal(cue.localStrike(0.6).play, true,
    'a later animation impact outside the grace plays (and pends against its echo)');
});
