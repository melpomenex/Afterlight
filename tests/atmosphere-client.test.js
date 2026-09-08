import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createAtmosphereStateClient,
  legacyWeatherDisplaySuppressed,
  ATMOSPHERE_RESNAPSHOT_MS,
} from '../src/atmosphere/stateClient.js';
import { shouldApplyRoomFrame } from '../src/net/roomEpoch.js';
import { MSG_TYPES } from '../shared/protocol.js';

// --- fakes -------------------------------------------------------------------

function createFakeNet() {
  const handlers = new Map();
  const connectListeners = [];
  const disconnectListeners = [];
  const sent = [];
  return {
    sent,
    on(type, fn) {
      if (!handlers.has(type)) handlers.set(type, []);
      handlers.get(type).push(fn);
    },
    onConnect(fn) { connectListeners.push(fn); },
    onDisconnect(fn) { disconnectListeners.push(fn); },
    send(type, payload) { sent.push({ type, payload }); },
    emit(type, msg) {
      for (const fn of handlers.get(type) ?? []) fn(msg);
    },
    connect() { for (const fn of [...connectListeners]) fn(); },
    disconnect() { for (const fn of [...disconnectListeners]) fn(); },
  };
}

function createClock(start = 10_000) {
  return {
    nowMs: start,
    advance(ms) { this.nowMs += ms; },
  };
}

const T0 = 1_772_000_000_000;

function makeFrame({
  roomId = 'court',
  epoch = 7,
  revision = 4,
  serverNow = T0,
  events = [],
  intensity = 0.8,
} = {}) {
  return {
    type: 'atmosphere_state',
    roomId,
    schemaVersion: 1,
    epoch,
    revision,
    serverNow,
    state: {
      seed: 123,
      mode: 'fixed',
      preset: 'rain',
      intensity,
      wind: [0.2, 0.05],
      startedAt: serverNow,
      transition: null,
      time: { mode: 'fixed', phase: 0.82, anchorAt: serverNow, rate: 0 },
      events,
    },
  };
}

function makeEvent({ id, at, kind = 'lightning', durationMs = 800 } = {}) {
  return { id, kind, at, durationMs, intensity: 0.5, origin: [-30, 12, -40] };
}

function rainDef() {
  return { atmosphere: { preset: 'rain', weatherMode: 'fixed', timeMode: 'fixed' } };
}

function gardenDef() {
  return { atmosphere: { preset: null, weatherMode: 'fixed', timeMode: 'fixed' } };
}

function createClient(clock, net = createFakeNet()) {
  const client = createAtmosphereStateClient({
    net,
    clock: () => clock.nowMs,
    requestTag: () => 'req-test',
  });
  return { client, net };
}

// --- activation / room + generation protection -------------------------------

test('wrong-room frames with a HIGH epoch never alter the active place', () => {
  const clock = createClock();
  const { client, net } = createClient(clock);
  client.activate({ roomId: 'court', generation: 3, def: rainDef() });

  // The transport-level filter rejects wrong-room atmosphere before any
  // epoch bookkeeping, even with a wildly higher epoch.
  const epochs = new Map();
  assert.equal(
    shouldApplyRoomFrame(epochs, 'court', { type: 'atmosphere_state', roomId: 'theater', epoch: 99, revision: 1 }),
    false,
  );
  assert.equal(epochs.size, 0, 'the wrong room recorded nothing');

  // Defense in depth: the state client itself drops it too.
  net.emit(MSG_TYPES.ATMOSPHERE_STATE, makeFrame({ roomId: 'theater', epoch: 99 }));
  assert.equal(client.getState()?.preset, 'rain', 'still the deterministic fallback');
  assert.equal(client.status(), 'unsynchronized');
  assert.equal(client.isActive(), true, 'the manifest atmosphere still owns the presentation');
});

test('frames for the current room apply; a stale activation generation cannot', () => {
  const clock = createClock();
  const { client, net } = createClient(clock);
  client.activate({ roomId: 'court', generation: 1, def: rainDef() });

  net.emit(MSG_TYPES.ATMOSPHERE_STATE, makeFrame({ epoch: 7, revision: 4 }));
  assert.equal(client.status(), 'synchronized');
  assert.equal(client.getState().intensity, 0.8);

  // Travel away: the binding is replaced wholesale — a late queued frame
  // for the old room must not resurrect anything on the new place.
  client.activate({ roomId: 'theater', generation: 2, def: { atmosphere: { preset: null } } });
  net.emit(MSG_TYPES.ATMOSPHERE_STATE, makeFrame({ epoch: 8, revision: 1, roomId: 'court' }));
  assert.equal(client.getState(), null, 'theater (no atmosphere) has no state');
  assert.equal(client.isActive(), false);
  assert.equal(client.status(), 'unsupported');
});

// --- ordering: duplicates, revision gaps, epochs ------------------------------

test('duplicates only refresh the clock and never replay events; revision gaps replace whole', () => {
  const clock = createClock();
  const { client, net } = createClient(clock);
  client.activate({ roomId: 'court', generation: 1, def: rainDef() });

  const events = [makeEvent({ id: '7:4:0', at: T0 + 5_000 })];
  net.emit(MSG_TYPES.ATMOSPHERE_STATE, makeFrame({ serverNow: T0, events }));

  // A duplicate (same epoch+revision): no event churn — the pending window
  // keeps its single entry instead of doubling.
  net.emit(MSG_TYPES.ATMOSPHERE_STATE, makeFrame({ serverNow: T0 + 100, events }));
  assert.equal(client.getState().events.length, 1, 'duplicate did not duplicate the window');

  // Revision GAP (4 -> 9): replaces state completely, no missing deltas.
  net.emit(MSG_TYPES.ATMOSPHERE_STATE, makeFrame({ revision: 9, serverNow: T0 + 200, intensity: 0.2 }));
  assert.equal(client.getState().intensity, 0.2, 'the gap did not block full replacement');
  assert.equal(client.getState().events.length, 0, 'the replacement window travels whole');

  // Stale revision and stale epoch after a newer epoch are discarded.
  net.emit(MSG_TYPES.ATMOSPHERE_STATE, makeFrame({ revision: 3, intensity: 0.9 }));
  assert.equal(client.getState().intensity, 0.2, 'stale revision discarded');

  net.emit(MSG_TYPES.ATMOSPHERE_STATE, makeFrame({ epoch: 9, revision: 1, intensity: 0.5 }));
  net.emit(MSG_TYPES.ATMOSPHERE_STATE, makeFrame({ epoch: 8, revision: 50, intensity: 0.9 }));
  assert.equal(client.getState().intensity, 0.5, 'lower epoch discarded even with a higher revision');
});

test('a new epoch resets event dedup: the same slot id fires again once, old frames stay stale', () => {
  const clock = createClock();
  const { client, net } = createClient(clock);
  client.activate({ roomId: 'court', generation: 1, def: rainDef() });

  net.emit(MSG_TYPES.ATMOSPHERE_STATE, makeFrame({ epoch: 7, revision: 1, serverNow: T0 }));
  clock.advance(ATMOSPHERE_RESNAPSHOT_MS + 1);

  // Reconnect installs the NEW owner's full snapshot.
  net.connect();
  net.emit(MSG_TYPES.ATMOSPHERE_STATE, makeFrame({ epoch: 9, revision: 1, serverNow: T0 + 6_000 }));
  assert.equal(client.status(), 'synchronized');
  assert.equal(client.getState().intensity, 0.8);

  // A delayed OLD-owner frame (higher revision, lower epoch) changes nothing.
  net.emit(MSG_TYPES.ATMOSPHERE_STATE, makeFrame({ epoch: 7, revision: 42, intensity: 0.1 }));
  assert.equal(client.getState().intensity, 0.8, 'the old owner cannot win a revision race');
});

// --- shared events: delayed delivery, duplicates, pause/resume ----------------

test('delayed callbacks: pending waits, within-tolerance late fires with progress, later is skipped', () => {
  const clock = createClock();
  const { client, net } = createClient(clock);
  client.activate({ roomId: 'court', generation: 1, def: rainDef() });

  const at = T0 + 1_000;
  net.emit(MSG_TYPES.ATMOSPHERE_STATE, makeFrame({ serverNow: T0, events: [makeEvent({ id: '7:4:0', at })] }));

  assert.deepEqual(client.consumeDueEvents(), [], 'not due yet');

  // 700ms after start: within the 250ms envelope tolerance only while the
  // event is still running (at+duration = T+1800) — sampleable remainder.
  clock.advance(1_700);
  let due = client.consumeDueEvents();
  assert.equal(due.length, 1);
  assert.equal(due[0].event.id, '7:4:0');
  assert.ok(due[0].progress > 0.8 && due[0].progress <= 1);

  // Duplicate delivery of the same id: at most one local effect.
  assert.deepEqual(client.consumeDueEvents(), []);
  assert.equal(client.hasSeenEvent('7:4:0'), true);

  // Far-later delivery of another copy in a fresh snapshot: skipped whole.
  const late = makeEvent({ id: '7:5:1', at: T0 + 2_000 });
  net.emit(MSG_TYPES.ATMOSPHERE_STATE, makeFrame({ revision: 5, serverNow: T0 + 1_700, events: [late] }));
  // at + duration + tolerance = T+3050; T+3200 is beyond it.
  clock.advance(1_500);
  assert.deepEqual(client.consumeDueEvents(), [], 'beyond the tolerance it is never replayed');
});

test('a snapshot join skips events that already started, including their thunder slot', () => {
  const clock = createClock();
  const { client, net } = createClient(clock);
  client.activate({ roomId: 'court', generation: 1, def: rainDef() });

  const started = makeEvent({ id: '7:1:0', at: T0 - 4_000 });
  const future = makeEvent({ id: '7:1:1', at: T0 + 6_000 });
  net.emit(MSG_TYPES.ATMOSPHERE_STATE, makeFrame({ epoch: 7, revision: 1, serverNow: T0, events: [started, future] }));

  clock.advance(6_100);
  const due = client.consumeDueEvents();
  assert.deepEqual(due.map(({ event }) => event.id), ['7:1:1'], 'only the not-yet-started event fires');
});

test('settings pause: resume seeks current state and skips events that started while paused', () => {
  const clock = createClock();
  const { client, net } = createClient(clock);
  client.activate({ roomId: 'court', generation: 1, def: rainDef() });

  const duringPause = makeEvent({ id: '7:4:0', at: T0 + 1_000 });
  const later = makeEvent({ id: '7:4:1', at: T0 + 60_000 });
  net.emit(MSG_TYPES.ATMOSPHERE_STATE, makeFrame({ serverNow: T0, events: [duringPause, later] }));

  // Settings open for 5s: the pulse starts and ends unseen.
  clock.advance(5_000);
  client.resume();

  assert.deepEqual(client.consumeDueEvents(), [], 'no catch-up storm on resume');
  assert.equal(client.hasSeenEvent('7:4:0'), false);

  // The still-future event keeps its shared id and fires exactly once.
  clock.advance(55_000);
  const due = client.consumeDueEvents();
  assert.deepEqual(due.map(({ event }) => event.id), ['7:4:1']);
  assert.deepEqual(client.consumeDueEvents(), []);
});

// --- disconnect / reconnect ---------------------------------------------------

test('disconnect keeps benign local rendering, cancels shared events and marks unsynchronized', () => {
  const clock = createClock();
  const { client, net } = createClient(clock);
  client.activate({ roomId: 'court', generation: 1, def: rainDef() });

  net.emit(
    MSG_TYPES.ATMOSPHERE_STATE,
    makeFrame({ serverNow: T0, events: [makeEvent({ id: '7:4:0', at: T0 + 2_000 })] }),
  );
  assert.equal(client.status(), 'synchronized');

  net.disconnect();
  assert.equal(client.status(), 'unsynchronized');
  assert.equal(client.isActive(), true, 'the rain keeps rendering benignly');

  clock.advance(60_000);
  assert.deepEqual(client.consumeDueEvents(), [], 'shared one-shots are canceled after disconnect');

  // Resume: a resnapshot is requested (rate limit permitting) and the new
  // owner's epoch installs fresh.
  clock.advance(ATMOSPHERE_RESNAPSHOT_MS + 1);
  net.connect();
  const getRequest = net.sent.at(-1);
  assert.equal(getRequest.type, MSG_TYPES.ATMOSPHERE_GET);
  net.emit(MSG_TYPES.ATMOSPHERE_STATE, makeFrame({ epoch: 11, revision: 1, serverNow: T0 + 66_000 }));
  assert.equal(client.status(), 'synchronized');
  assert.equal(client.isActive(), true);
});

test('resnapshot requests are capped at one per five seconds', () => {
  const clock = createClock();
  const { client, net } = createClient(clock);

  client.activate({ roomId: 'court', generation: 1, def: rainDef() });
  const initial = net.sent.filter((f) => f.type === MSG_TYPES.ATMOSPHERE_GET).length;
  assert.equal(initial, 1, 'activation requests exactly one snapshot');

  assert.equal(client.requestResnapshot('spam'), false, 'inside the window it is refused');
  clock.advance(ATMOSPHERE_RESNAPSHOT_MS - 100);
  assert.equal(client.requestResnapshot('still-soon'), false);
  clock.advance(200);
  assert.equal(client.requestResnapshot('later'), true);
});

// --- clock anchoring ----------------------------------------------------------

test('server time is anchored at receipt and separate from the local paused clock', () => {
  const clock = createClock();
  const { client, net } = createClient(clock);
  client.activate({ roomId: 'court', generation: 1, def: rainDef() });

  net.emit(MSG_TYPES.ATMOSPHERE_STATE, makeFrame({ serverNow: T0 }));
  assert.equal(client.serverNow(), T0, 'anchored to the frame, not the local epoch');

  clock.advance(2_500);
  assert.equal(client.serverNow(), T0 + 2_500, 'advances on the local monotonic clock');

  // A discontinuity >5s requests one fresh snapshot and suppresses events
  // until the resnapshot resynchronizes.
  const event = makeEvent({ id: '7:5:0', at: T0 + 75_000 });
  net.emit(MSG_TYPES.ATMOSPHERE_STATE, makeFrame({ revision: 5, serverNow: T0 + 70_000, events: [event] }));
  clock.advance(100);
  assert.deepEqual(client.consumeDueEvents(), [], 'suppressed until resync');

  const resync = makeFrame({ revision: 6, serverNow: T0 + 70_100 });
  net.emit(MSG_TYPES.ATMOSPHERE_STATE, resync);
  clock.advance(5_000);
  const due = client.consumeDueEvents();
  assert.equal(due.length, 0, 'the superseded window stays canceled');

  const resynced = makeFrame({ revision: 7, serverNow: T0 + 75_100, events: [makeEvent({ id: '7:7:0', at: T0 + 80_000 })] });
  net.emit(MSG_TYPES.ATMOSPHERE_STATE, resynced);
  clock.advance(5_000);
  assert.equal(client.consumeDueEvents().length, 1, 'events flow again after resync');
});

// --- invalid frames: no partial apply -----------------------------------------

test('invalid frames mark synchronization unavailable without touching the last valid state', () => {
  const clock = createClock();
  const { client, net } = createClient(clock);
  client.activate({ roomId: 'court', generation: 1, def: rainDef() });

  net.emit(MSG_TYPES.ATMOSPHERE_STATE, makeFrame({ serverNow: T0 }));
  const good = client.getState();

  // Unknown schema version.
  net.emit(MSG_TYPES.ATMOSPHERE_STATE, { ...makeFrame({ revision: 5 }), schemaVersion: 2 });
  // Non-finite intensity.
  net.emit(MSG_TYPES.ATMOSPHERE_STATE, makeFrame({ revision: 6, intensity: 'wet' }));
  // More than four events.
  const five = [0, 1, 2, 3, 4].map((slot) => makeEvent({ id: `7:7:${slot}`, at: T0 + 10_000 * (slot + 1) }));
  net.emit(MSG_TYPES.ATMOSPHERE_STATE, makeFrame({ revision: 7, events: five }));

  assert.equal(client.getState(), good, 'the last valid snapshot survives whole');
  assert.equal(client.status(), 'unsynchronized');
  assert.equal(client.isActive(), true, 'presentation continues from the last valid state');

  // And the next valid frame is accepted again (no poisoned bookkeeping).
  net.emit(MSG_TYPES.ATMOSPHERE_STATE, makeFrame({ revision: 8, serverNow: T0 + 100 }));
  assert.equal(client.status(), 'synchronized');
});

test('the server may answer atmosphere_unavailable: the room truthfully has none', () => {
  const clock = createClock();
  const { client, net } = createClient(clock);
  client.activate({ roomId: 'garden:someone', generation: 1, def: gardenDef() });

  net.emit(MSG_TYPES.ATMOSPHERE_UNAVAILABLE, { requestId: 'req-test', roomId: 'garden:someone' });
  assert.equal(client.getState(), null);
  assert.equal(client.isActive(), false, 'legacy presentation stays in charge');
  assert.equal(client.status(), 'unsupported');
});

// --- sampling -----------------------------------------------------------------

test('sampling: late join of fixed rain is already wet, defaults are deterministic and unsynchronized', () => {
  const clock = createClock();
  const { client, net } = createClient(clock);

  client.activate({ roomId: 'court', generation: 1, def: rainDef() });
  const out = client.sample({});
  assert.equal(out.active, true);
  assert.equal(out.synced, false);
  assert.equal(out.rain, 0.7, 'deterministic preset fallback (manifest rain)');
  assert.equal(out.wetness, 1, 'wetness derives from preset history, not local entry time');
  assert.equal(out.serverNow, undefined === out.serverNow ? undefined : out.serverNow);

  // The authoritative snapshot installs and the sample follows it.
  net.emit(MSG_TYPES.ATMOSPHERE_STATE, makeFrame({ serverNow: T0, intensity: 0.3 }));
  const syncedOut = client.sample({});
  assert.equal(syncedOut.synced, true);
  assert.equal(syncedOut.intensity, 0.3);
  assert.ok(Number.isFinite(syncedOut.serverNow) && syncedOut.serverNow >= T0, 'server-anchored sample time');
});

// --- legacy weather display guard ---------------------------------------------

test('legacy garden weather never overrides an active atmosphere, and stays available without one', () => {
  const clock = createClock();
  const { client, net } = createClient(clock);

  // A legacy room (garden: no manifest preset): the existing agricultural
  // weather presentation remains available.
  client.activate({ roomId: 'garden:someone', generation: 1, def: gardenDef() });
  assert.equal(legacyWeatherDisplaySuppressed(client), false);

  // A manifest atmosphere place owns fog/caption for the whole visit.
  client.activate({ roomId: 'court', generation: 2, def: rainDef() });
  assert.equal(legacyWeatherDisplaySuppressed(client), true, 'WEATHER_UPDATE must not write scene fog');

  net.emit(MSG_TYPES.ATMOSPHERE_STATE, makeFrame({ serverNow: T0 }));
  assert.equal(legacyWeatherDisplaySuppressed(client), true);

  // After travel away, the guard lifts again.
  client.deactivate();
  assert.equal(legacyWeatherDisplaySuppressed(client), false);
});
