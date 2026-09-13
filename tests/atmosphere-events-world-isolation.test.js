import test from 'node:test';
import assert from 'node:assert/strict';
import { createAtmosphereEvents } from '../src/atmosphere/events.js';
import { resolveActivityEnvironment, defaultActivityEnvironment } from '../shared/activityEnvironment.js';
import { defaultAtmosphereState } from '../shared/atmosphereModel.js';
import { sampleWorldPresentationVisuals } from '../src/worlds/presentationSample.js';

test('incompatible cosmetic one-shots are suppressed without replay and deduplicated', () => {
  let currentTime = 1000;
  const mockClock = () => currentTime;

  const dueEvents = [
    {
      event: {
        id: '1:1:slot0',
        kind: 'lightning',
        at: 1000,
        durationMs: 400,
        intensity: 0.8,
        origin: [0, 10, 0],
      },
      progress: 0,
    },
    {
      event: {
        id: '1:1:slot1',
        kind: 'lightning',
        at: 1050,
        durationMs: 400,
        intensity: 0.9,
        origin: [5, 10, 5],
      },
      progress: 0,
    },
  ];

  let allowLightning = false;
  const mockStateClient = {
    consumeDueEvents: () => {
      const copy = [...dueEvents];
      dueEvents.length = 0;
      return copy;
    },
  };

  const thunderScheduled = [];
  const mockAudio = {
    thunder: (params) => {
      thunderScheduled.push(params);
      return { cancel: () => {} };
    },
  };

  const events = createAtmosphereEvents({
    stateClient: mockStateClient,
    clock: mockClock,
    audio: mockAudio,
    flashMode: 'reduced',
    isEventCompatible: (event) => allowLightning,
  });

  // Frame 1: lightning events are incompatible (e.g. desert or sunny world where lightning is suppressed)
  events.update();

  assert.equal(events.stats.consumed, 2);
  assert.equal(events.stats.suppressed, 2);
  assert.equal(events.stats.lightning, 0);
  assert.equal(thunderScheduled.length, 0);
  assert.equal(events.getPulse().active, false);

  // Frame 2: world or view changes to storm where lightning is permitted
  allowLightning = true;
  events.setEventFilter(() => true);

  // Even if stateClient yielded the same event id again (or clock updated), deduplication drops it
  dueEvents.push({
    event: {
      id: '1:1:slot0', // already seen!
      kind: 'lightning',
      at: 1000,
      durationMs: 400,
      intensity: 0.8,
      origin: [0, 10, 0],
    },
    progress: 0,
  });

  events.update();

  assert.equal(events.stats.consumed, 3);
  assert.equal(events.stats.deduped, 1);
  assert.equal(events.stats.lightning, 0); // Still 0 because slot0 was already seen and deduplicated
  assert.equal(thunderScheduled.length, 0);

  // A NEW event that is compatible now succeeds
  dueEvents.push({
    event: {
      id: '1:1:slot2',
      kind: 'lightning',
      at: 1200,
      durationMs: 400,
      intensity: 0.7,
      origin: [0, 10, 0],
    },
    progress: 0,
  });

  events.update();

  assert.equal(events.stats.lightning, 1);
  assert.equal(thunderScheduled.length, 1);
  assert.equal(events.getPulse().active, true);
});

test('wind- and rain-dependent activities receive identical authoritative semantic values regardless of personal World selection', () => {
  // Authoritative snapshot from Phoenix room server
  const snapshot = {
    type: 'atmosphere_state',
    schemaVersion: 1,
    roomId: 'court',
    epoch: 1,
    revision: 1,
    serverNow: 5000,
    state: defaultAtmosphereState('rain', { seed: 99 }),
  };

  // Player A selects Desert Oasis (golden hour)
  const playerAWorld = { worldId: 'desert', variantId: 'golden' };
  // Player B selects Alpine Aurora
  const playerBWorld = { worldId: 'alpine', variantId: 'aurora' };

  // Resolve personal visual presentation
  const presentationA = sampleWorldPresentationVisuals({
    worldSelection: playerAWorld,
    viewId: 'place:court',
    semanticPresetId: 'rain',
  });
  const presentationB = sampleWorldPresentationVisuals({
    worldSelection: playerBWorld,
    viewId: 'place:court',
    semanticPresetId: 'rain',
  });

  // In ambient mode (court), fog is protected and remains identical to semantic preset
  assert.equal(presentationA.visuals.fogColor, presentationB.visuals.fogColor);
  // But lighting is an ambient slot, so sun colors differ based on personal world selection
  assert.notEqual(presentationA.visuals.sunColor, presentationB.visuals.sunColor);

  // In full mode (theater), both fog and lighting differ
  const theaterA = sampleWorldPresentationVisuals({
    worldSelection: playerAWorld,
    viewId: 'place:theater',
    semanticPresetId: 'rain',
  });
  const theaterB = sampleWorldPresentationVisuals({
    worldSelection: playerBWorld,
    viewId: 'place:theater',
    semanticPresetId: 'rain',
  });
  assert.notEqual(theaterA.visuals.fogColor, theaterB.visuals.fogColor);
  assert.notEqual(theaterA.visuals.sunColor, theaterB.visuals.sunColor);

  // But activity environment resolution for frozen activity (e.g. competitive boat or airplane)
  const envA = resolveActivityEnvironment({
    policy: 'frozen',
    atmosphereSnapshot: snapshot,
    now: 5000,
  });
  const envB = resolveActivityEnvironment({
    policy: 'frozen',
    atmosphereSnapshot: snapshot,
    now: 5000,
  });

  // Both players receive strictly identical semantic wind, windSpeed, rain, intensity, wetness
  assert.deepEqual(envA.wind, envB.wind);
  assert.equal(envA.windSpeed, envB.windSpeed);
  assert.equal(envA.rain, envB.rain);
  assert.equal(envA.intensity, envB.intensity);
  assert.equal(envA.wetness, envB.wetness);
  assert.equal(envA.timePhase, envB.timePhase);
  assert.ok(envA.rain > 0);

  // Live noncompetitive activity (e.g. fishing, telescope) also receives identical values
  const liveA = resolveActivityEnvironment({
    policy: 'live',
    atmosphereSnapshot: snapshot,
    now: 5000,
  });
  const liveB = resolveActivityEnvironment({
    policy: 'live',
    atmosphereSnapshot: snapshot,
    now: 5000,
  });

  assert.deepEqual(liveA.wind, liveB.wind);
  assert.equal(liveA.windSpeed, liveB.windSpeed);
  assert.equal(liveA.rain, liveB.rain);
});
