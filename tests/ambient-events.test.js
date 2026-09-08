/**
 * Tests for bounded shared lightning/event envelopes
 * (src/atmosphere/events.js, add-atmosphere-weather-system task 4.2, D3).
 *
 * Covered: duplicate ids fire once, old snapshots never replay (join after
 * the start), future-join timing, the 250ms late edge, pause/visibility
 * resume without catch-up storms, travel-before-thunder cancellation, the
 * flash-off comfort mode, the 32-id seen cap, and the single smooth
 * (non-strobing) pulse shape. Runs against the REAL atmosphere state client
 * over a scripted connection, plus a small scripted client for envelope
 * edge cases.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createAtmosphereEvents,
  eventEpochOf,
  EVENT_SEEN_CAP,
  LIGHTNING_PULSE_MAX_MS,
  FLASH_EXPOSURE_ADD,
  FLASH_SUN_ADD,
  FLASH_REDUCED_SCALE,
} from '../src/atmosphere/events.js';
import { createAtmosphereStateClient } from '../src/atmosphere/stateClient.js';
import { MSG_TYPES } from '../shared/protocol.js';
import { thunderDelayMs } from '../shared/atmosphereModel.js';

const T0 = 1_772_000_000_000;

// --- fakes ---------------------------------------------------------------------

function createFakeNet() {
  const handlers = new Map();
  const connectListeners = [];
  const disconnectListeners = [];
  return {
    sent: [],
    on(type, fn) { (handlers.get(type) ?? handlers.set(type, []).get(type)).push(fn); },
    onConnect(fn) { connectListeners.push(fn); },
    onDisconnect(fn) { disconnectListeners.push(fn); },
    send(type, payload) { this.sent.push({ type, payload }); },
    emit(type, msg) { for (const fn of handlers.get(type) ?? []) fn(msg); },
    connect() { for (const fn of [...connectListeners]) fn(); },
    disconnect() { for (const fn of [...disconnectListeners]) fn(); },
  };
}

function createClock(start = 0) {
  return {
    nowMs: start,
    advance(ms) { this.nowMs += ms; },
  };
}

/** Scripted client: events are queued exactly as consumeDueEvents delivers. */
function createScriptedClient() {
  const queue = [];
  return {
    queue,
    feed(event, progress = 0) { queue.push({ event, progress }); },
    consumeDueEvents() { return queue.splice(0); },
  };
}

function makeEvent({ id = '7:4:0', kind = 'lightning', at = T0, durationMs = 800, intensity = 0.5, origin = [-30, 12, -40] } = {}) {
  return { id, kind, at, durationMs, intensity, origin };
}

function createRecordingAudio() {
  const scheduled = [];
  return {
    scheduled,
    thunder({ delayMs, intensity }) {
      const handle = { delayMs, intensity, canceled: false };
      scheduled.push(handle);
      return { cancel: () => { handle.canceled = true; } };
    },
  };
}

function createEvents({
  client,
  clock,
  audio = createRecordingAudio(),
  flashMode = 'reduced',
  listener = () => ({ x: 0, z: 0 }),
} = {}) {
  return createAtmosphereEvents({
    stateClient: client,
    clock: () => clock.nowMs,
    audio,
    listenerPosition: listener,
    flashMode,
    thunderDelay: thunderDelayMs,
  });
}

// --- scripted envelope tests ---------------------------------------------------

test('duplicate event ids produce at most one local effect', () => {
  const client = createScriptedClient();
  const clock = createClock(100);
  const events = createEvents({ client, clock });
  client.feed(makeEvent({ id: '7:4:0' }));
  client.feed(makeEvent({ id: '7:4:0' }));
  client.feed(makeEvent({ id: '7:4:0', intensity: 0.9 })); // even with different payload
  events.update();
  assert.equal(events.stats.consumed, 3);
  assert.equal(events.stats.lightning, 1, 'the duplicate was a no-op');
  assert.equal(events.stats.deduped, 2);
  assert.equal(events.stats.thunderScheduled, 1, 'thunder scheduled once');
  assert.equal(events.seenCount, 1);
});

test('an event begun before join (old snapshot) never replays — not even its thunder', () => {
  // The real state client drops started events on a full replacement; the
  // events module additionally refuses anything the state client did not
  // deliver. Feed the "expired" case through the real client below; here we
  // prove the module itself never renders an envelope without delivery.
  const client = createScriptedClient();
  const clock = createClock(10_000);
  const events = createEvents({ client, clock });
  events.update();
  assert.equal(events.getPulse().active, false, 'no delivery: no envelope');
  assert.equal(events.stats.thunderScheduled, 0, 'no delivery: no thunder');
});

test('a future event executes exactly once when its shared time arrives', () => {
  const clock = createClock(0);
  const client = createScriptedClient();
  const events = createEvents({ client, clock });
  // Not yet delivered by the state client: nothing happens.
  events.update();
  assert.equal(events.getPulse().active, false);

  clock.advance(5000); // the shared start time arrived; the state client delivers it
  client.feed(makeEvent({ id: '7:4:1', at: 5000 }));
  events.update();
  const pulse = events.getPulse();
  assert.equal(pulse.active, true, 'the flash envelope is live at start');
  assert.ok(Math.abs(pulse.amplitude) < 1e-9, 'sin(0) — the pulse starts at zero, not at a flash');
});

test('the 250ms late edge: inside the tolerance samples the remaining envelope, beyond it is skipped', () => {
  // Beyond tolerance: the state client classifies the event as expired and
  // never delivers it (contract tested against the real client further
  // below). The envelope module mirrors the same rule on progress: a live
  // delivery with progress 0.25 keeps only the remaining 75% of the pulse.
  const clock = createClock(0);
  const client = createScriptedClient();
  const events = createEvents({ client, clock });
  clock.advance(200); // 200ms into an 800ms pulse — inside the 250ms tolerance
  client.feed(makeEvent({ id: '7:4:2', at: 0 }), 0.25);
  events.update();
  const pulse = events.getPulse();
  assert.equal(pulse.active, true);
  assert.ok(Math.abs(pulse.progress - 0.25) < 1e-9, 'the remaining envelope is sampleable');
  assert.ok(pulse.amplitude > 0 && pulse.amplitude <= 0.5 * FLASH_REDUCED_SCALE + 1e-9, 'mid-pulse amplitude is bounded');

  clock.advance(600); // progress reaches 1: the pulse ENDS by itself
  const ended = events.getPulse();
  assert.equal(ended.active, false, 'the single pulse ends, it never loops or restrikes');
});

test('lightning is ONE smooth bounded pulse — no rapid strobing', () => {
  const clock = createClock(0);
  const client = createScriptedClient();
  const events = createEvents({ client, clock, flashMode: 'reduced' });
  client.feed(makeEvent({ id: '7:4:3', at: 0, durationMs: 5000, intensity: 1 }));
  events.update();
  // A 5s server event is clamped to the 800ms client pulse.
  let last = -1;
  let peaks = 0;
  let rising = true;
  for (let ms = 0; ms <= 800; ms += 20) {
    clock.nowMs = ms;
    const pulse = events.getPulse();
    assert.ok(pulse.amplitude >= 0 && pulse.amplitude <= FLASH_REDUCED_SCALE + 1e-9, 'reduced amplitude stays half');
    if (pulse.amplitude < last && rising) { peaks += 1; rising = false; }
    if (pulse.amplitude > last && !rising) rising = true;
    last = pulse.amplitude;
  }
  assert.equal(peaks, 1, 'exactly one peak: a single smooth pulse');
  clock.nowMs = LIGHTNING_PULSE_MAX_MS + 1;
  assert.equal(events.getPulse().active, false, 'the envelope is bounded by 800ms even for a longer server event');
  // Consumer ceilings: a full-amplitude normal pulse maps to <= 0.2 exposure / sun.
  assert.equal(FLASH_EXPOSURE_ADD, 0.2);
  assert.equal(FLASH_SUN_ADD, 0.2);
});

test('travel before thunder cancels the scheduled rumble', () => {
  const clock = createClock(0);
  const client = createScriptedClient();
  const audio = createRecordingAudio();
  const events = createEvents({ client, clock, audio, listener: () => ({ x: 0, z: 0 }) });
  client.feed(makeEvent({ id: '7:4:4', at: 0, origin: [-343, 0, 0] })); // exactly 1s of distance
  events.update();
  assert.equal(audio.scheduled.length, 1);
  assert.equal(audio.scheduled[0].delayMs, 1000, 'distance/343 m/s becomes the delay');
  assert.equal(audio.scheduled[0].canceled, false);

  events.cancelAll(); // the travel-away / disconnect / mute path
  assert.equal(audio.scheduled[0].canceled, true, 'the thunder never plays in the new place');
  assert.equal(events.getPulse().active, false, 'the visual handle is dropped too');
});

test('thunder delay clamps to 0.5–4s and a live delivery schedules only the remainder', () => {
  const clock = createClock(0);
  const client = createScriptedClient();
  const audio = createRecordingAudio();
  const events = createEvents({ client, clock, audio, listener: () => ({ x: 0, y: 0, z: 0 }) });

  client.feed(makeEvent({ id: '7:5:0', origin: [3, 0, 0] })); // ~9ms of distance
  events.update();
  assert.equal(audio.scheduled[0].delayMs, 500, 'too close clamps to 0.5s');

  client.feed(makeEvent({ id: '7:5:1', origin: [-4000, 500, 0] })); // >4s of distance
  events.update();
  assert.equal(audio.scheduled[1].delayMs, 4000, 'too far clamps to 4s');

  // An event delivered 1s late (progress 0.25 of a 4s wait): the remaining
  // wait is what gets scheduled.
  clock.advance(1000);
  client.feed(makeEvent({ id: '7:5:2', origin: [-343, 0, 0] }), 0.25);
  events.update();
  assert.ok(audio.scheduled[2].delayMs < 1000, `only the remaining wait is scheduled (${audio.scheduled[2].delayMs}ms)`);
});

test('flash off: no visual envelope, but the optional thunder still plays', () => {
  const clock = createClock(0);
  const client = createScriptedClient();
  const audio = createRecordingAudio();
  const events = createEvents({ client, clock, audio, flashMode: 'off' });
  client.feed(makeEvent({ id: '7:6:0', at: 0 }));
  events.update();
  assert.equal(events.getPulse().active, false, 'no flash is rendered');
  assert.equal(events.stats.lightning, 1, 'the event is still consumed and deduped');
  assert.equal(audio.scheduled.length, 1, 'thunder is permitted');

  // Switching to off ends a live pulse immediately.
  const client2 = createScriptedClient();
  const events2 = createEvents({ client: client2, clock, flashMode: 'reduced' });
  client2.feed(makeEvent({ id: '8:1:0', at: 0 }));
  events2.update();
  assert.equal(events2.getPulse().active, true);
  assert.equal(events2.setFlashMode('off'), true);
  assert.equal(events2.getPulse().active, false, 'the preference cancels the incompatible pending flash');
  assert.equal(events2.setFlashMode('off'), false, 'same mode: no-op');
  assert.equal(events2.setFlashMode('garbage'), false, 'unknown modes are rejected');
});

test('event seen-set is capped at 32 ids for the current epoch', () => {
  const clock = createClock(0);
  const client = createScriptedClient();
  const events = createEvents({ client, clock });
  for (let slot = 0; slot < EVENT_SEEN_CAP + 10; slot++) {
    client.feed(makeEvent({ id: `7:1:${slot}`, at: 0 }));
  }
  events.update();
  assert.equal(events.seenCount, EVENT_SEEN_CAP, 'the seen set never exceeds 32');
  assert.equal(events.stats.lightning, EVENT_SEEN_CAP + 10, 'all were consumed once');
  // The oldest id was evicted — it would replay, which is exactly why the
  // state client ALSO keeps its own epoch-scoped dedup upstream.
  client.feed(makeEvent({ id: '7:1:0', at: 0 }));
  events.update();
  assert.equal(events.stats.lightning, EVENT_SEEN_CAP + 11, 'evicted oldest id is consumable again (bounded churn)');
});

test('a new epoch clears the seen set and each epoch id parses', () => {
  const clock = createClock(0);
  const client = createScriptedClient();
  const events = createEvents({ client, clock });
  client.feed(makeEvent({ id: '7:9:0', at: 0 }));
  events.update();
  assert.equal(events.seenCount, 1);
  client.feed(makeEvent({ id: '8:1:0', at: 0 })); // new owner epoch
  events.update();
  assert.equal(events.seenCount, 1, 'epoch change reset the dedup set');
  assert.equal(eventEpochOf('12:3:1'), 12);
  assert.equal(eventEpochOf('garbage'), null);
  assert.equal(eventEpochOf(':0:1'), null);
});

// --- real state client integration ---------------------------------------------

function createRealFixture(clock) {
  const net = createFakeNet();
  const client = createAtmosphereStateClient({ net, clock: () => clock.nowMs, requestTag: () => 'req-events' });
  client.activate({ roomId: 'court', generation: 1, def: { atmosphere: { preset: 'storm' } } });
  return { net, client };
}

function frameWith({ events = [], serverNow = T0, epoch = 7, revision = 4 } = {}) {
  return {
    type: 'atmosphere_state',
    roomId: 'court',
    schemaVersion: 1,
    epoch,
    revision,
    serverNow,
    state: {
      seed: 5,
      mode: 'fixed',
      preset: 'storm',
      intensity: 0.9,
      wind: [0, 0],
      startedAt: serverNow,
      transition: null,
      time: { mode: 'fixed', phase: 0.5, anchorAt: serverNow, rate: 0 },
      events,
    },
  };
}

test('real client: join after lightning started skips flash AND thunder; a future event fires once', () => {
  const clock = createClock(0); // local clock; serverNow is anchored on receipt
  const { net, client } = createRealFixture(clock);

  // The snapshot carries one event that started 2s ago and one 5s in the future.
  net.emit(MSG_TYPES.ATMOSPHERE_STATE, frameWith({
    serverNow: T0,
    events: [
      makeEvent({ id: '7:4:0', at: T0 - 2000 }),
      makeEvent({ id: '7:4:1', at: T0 + 5000 }),
    ],
  }));
  // Receipt anchors serverNow=T0 at local 0.

  const audio = createRecordingAudio();
  const events = createAtmosphereEvents({
    stateClient: client,
    clock: () => clock.nowMs,
    audio,
    listenerPosition: () => ({ x: 0, z: 0 }),
    thunderDelay: thunderDelayMs,
  });

  events.update();
  assert.equal(events.stats.lightning, 0, 'the already-started event is skipped entirely');
  assert.equal(audio.scheduled.length, 0, 'no late thunder either');

  clock.advance(5000); // the future event comes due on the shared clock
  events.update();
  assert.equal(events.stats.lightning, 1);
  assert.equal(audio.scheduled.length, 1, 'its thunder is scheduled from distance');

  // A duplicate snapshot (same epoch+revision) cannot replay the event.
  net.emit(MSG_TYPES.ATMOSPHERE_STATE, frameWith({
    serverNow: T0 + 100,
    events: [
      makeEvent({ id: '7:4:0', at: T0 - 2000 }),
      makeEvent({ id: '7:4:1', at: T0 + 5000 }),
    ],
  }));
  events.update();
  assert.equal(events.stats.lightning, 1, 'duplicate snapshot: no second flash');
  assert.equal(audio.scheduled.length, 1, 'duplicate snapshot: no second thunder');
});

test('real client: an event past its envelope + 250ms tolerance is silently skipped; the edge samples the remainder', () => {
  const clock = createClock(0);
  const { net, client } = createRealFixture(clock);
  net.emit(MSG_TYPES.ATMOSPHERE_STATE, frameWith({
    serverNow: T0,
    events: [makeEvent({ id: '7:4:2', at: T0 + 1000 })], // envelope ends T0+1800, tolerance to T0+2050
  }));
  const events = createEvents({ client, clock, audio: createRecordingAudio() });

  clock.advance(2_200); // 400ms past the full envelope tolerance
  events.update();
  assert.equal(events.stats.consumed, 0, 'the state client dropped the stale event');
  assert.equal(events.stats.lightning, 0);

  // A fresh revision carrying an event that started 200ms ago IS live: the
  // remaining envelope is sampleable, never replayed from zero.
  net.emit(MSG_TYPES.ATMOSPHERE_STATE, frameWith({
    revision: 5,
    serverNow: T0 + 2_200,
    events: [makeEvent({ id: '7:4:3', at: T0 + 2_000, durationMs: 800 })],
  }));
  events.update();
  assert.equal(events.stats.lightning, 1, '200ms late is inside the tolerance');
  const pulse = events.getPulse();
  assert.ok(pulse.progress > 0 && pulse.progress < 1, 'the remainder (not the whole pulse) plays');
});

test('real client: events that expire while paused never replay on resume; travel cancels thunder', () => {
  const clock = createClock(0);
  const { net, client } = createRealFixture(clock);
  net.emit(MSG_TYPES.ATMOSPHERE_STATE, frameWith({
    serverNow: T0,
    events: [
      makeEvent({ id: '7:4:4', at: T0 + 1000 }),
      makeEvent({ id: '7:4:5', at: T0 + 60_000 }),
    ],
  }));
  const audio = createRecordingAudio();
  const events = createAtmosphereEvents({
    stateClient: client,
    clock: () => clock.nowMs,
    audio,
    listenerPosition: () => ({ x: 0, z: 0 }),
    thunderDelay: thunderDelayMs,
  });

  clock.advance(1000);
  events.update(); // first event fires
  assert.equal(events.stats.lightning, 1);
  assert.equal(audio.scheduled[0].canceled, false);

  // Settings open (paused): no update() calls run for a long while.
  clock.advance(30_000);
  client.resume(); // the settings-close path seeks CURRENT state
  events.resync(); // clock-dependent handles are dropped, dedup kept
  assert.equal(audio.scheduled[0].canceled, true, 'resync drops thunder scheduled against the old clock');
  events.update();
  assert.equal(events.stats.lightning, 1, 'the long-expired event is not replayed');

  // The still-future event is kept by resume() and fires exactly once.
  clock.advance(30_000);
  events.update();
  assert.equal(events.stats.lightning, 2, 'future shared events survive pause with their ids intact');

  // Travel away right after a flash: its thunder must be canceled.
  net.emit(MSG_TYPES.ATMOSPHERE_STATE, frameWith({
    revision: 9,
    serverNow: T0 + 61_000,
    events: [makeEvent({ id: '7:4:6', at: T0 + 61_000 })],
  }));
  events.update();
  assert.equal(events.stats.lightning, 3);
  const pending = audio.scheduled[audio.scheduled.length - 1];
  assert.equal(pending.canceled, false);
  events.cancelAll(); // the deactivate seam
  assert.equal(pending.canceled, true, 'travel before thunder cancels it');
});

test('real client: disconnect stops shared one-shots and cancelAll is a safe no-op afterwards', () => {
  const clock = createClock(0);
  const { net, client } = createRealFixture(clock);
  net.emit(MSG_TYPES.ATMOSPHERE_STATE, frameWith({
    serverNow: T0,
    events: [makeEvent({ id: '7:4:7', at: T0 + 1000 })],
  }));
  const audio = createRecordingAudio();
  const events = createAtmosphereEvents({
    stateClient: client,
    clock: () => clock.nowMs,
    audio,
    listenerPosition: () => ({ x: 0, z: 0 }),
    thunderDelay: thunderDelayMs,
  });

  clock.advance(1000);
  events.update();
  events.cancelAll(); // disconnect path
  net.disconnect(); // the state client clears its event window
  events.update();
  assert.equal(events.stats.lightning, 1, 'nothing new fires while disconnected');
  events.cancelAll(); // idempotent teardown
  assert.equal(events.getPulse().active, false);
});
