/**
 * Temporary activity mute + provider audio acknowledgment tests
 * (add-floating-minigame-media, task 2.2; design D3).
 *
 * Controlled providers are represented by fake engine adapters; no SDKs,
 * DOM or network are involved. Degraded adapters must be reported as
 * unavailable, never simulated.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { TheaterScreenUI } from '../src/ui/theaterScreen.js';

function makeUI() {
  const net = { handlers: new Map(), sent: [], on() {}, send(type, payload) { this.sent.push({ type, payload }); }, clearTorrentGrants() {} };
  return new TheaterScreenUI(net);
}

function controlledEngine({ kind = 'youtube', ready = true } = {}) {
  return {
    kind,
    ready,
    degraded: false,
    volumes: [],
    setVolume(v) { this.volumes.push(v); },
  };
}

test('controlled engine: entry mute is applied and marked pending until ready', () => {
  const ui = makeUI();
  ui.setMasterSound(true);
  const engine = controlledEngine({ ready: false });
  ui.engine = engine;
  ui.beginActivityPresentation({ id: 'pool', generation: 1, attempt: 1 });
  assert.deepEqual(engine.volumes, [0], 'entry mute reached the adapter before readiness');
  assert.equal(ui.audioControlState().supported, true);
  assert.equal(ui.audioControlState().status, 'pending');
  engine.ready = true;
  assert.equal(ui.acknowledgeAudio(engine), true);
  assert.equal(ui.audioControlState().status, 'applied');
  assert.equal(ui.audioControlState().reason, null);
});

test('a stale ready callback from a replaced engine is ignored', () => {
  const ui = makeUI();
  ui.setMasterSound(true);
  const oldEngine = controlledEngine({ ready: false });
  ui.engine = oldEngine;
  ui.beginActivityPresentation({ id: 'pool', generation: 1, attempt: 1 });
  const newEngine = controlledEngine({ ready: true });
  ui.engine = newEngine;
  ui.applyEffectiveVolume();
  const before = ui.audioControlState();
  oldEngine.ready = true;
  assert.equal(ui.acknowledgeAudio(oldEngine), false, 'a replaced engine never updates bookkeeping');
  assert.deepEqual(ui.audioControlState(), before);
  assert.deepEqual(newEngine.volumes, [0], 'the current engine still holds the activity mute');
});

test('degraded providers are reported unavailable, never simulated', () => {
  const ui = makeUI();
  ui.setMasterSound(true);
  const engine = { kind: 'twitch', ready: true, degraded: true };
  ui.engine = engine;
  assert.equal(ui.applyEffectiveVolume(), false);
  assert.deepEqual(
    { supported: ui.audioControlState().supported, status: ui.audioControlState().status, reason: ui.audioControlState().reason },
    { supported: false, status: 'unavailable', reason: 'provider' },
  );
  ui.teardownEngine();
  assert.equal(ui.audioControlState().status, 'idle');
  assert.equal(ui.audioControlState().supported, null);
});

test('master gate and zero volume are distinct from the activity entry mute', () => {
  const ui = makeUI();
  const engine = controlledEngine();
  ui.engine = engine;
  assert.equal(ui.setMasterSound(true), true);
  assert.deepEqual(engine.volumes.at(-1), 1);
  ui.setUserVolume(0.5);
  assert.deepEqual(engine.volumes.at(-1), 0.5);
  ui.setMasterSound(false);
  assert.deepEqual(engine.volumes.at(-1), 0, 'master off silences the live engine');
  assert.equal(ui.audioControlState().status, 'applied', 'a successful command is acknowledged');
  ui.setMasterSound(true);
  assert.deepEqual(engine.volumes.at(-1), 0.5, 'the slider preference survives the master gate');
});

test('explicit unmute applies the master and restores a remembered nonzero volume', () => {
  const ui = makeUI();
  const engine = controlledEngine();
  ui.engine = engine;
  ui.setUserVolume(0.4);
  ui.setUserVolume(0);
  let soundCalls = 0;
  ui.requestMasterSound = () => {
    soundCalls += 1;
    ui.setMasterSound(true);
    return true;
  };
  const result = ui.requestUnmute();
  assert.equal(soundCalls, 1, 'the one action turns the app Sound gate on');
  assert.deepEqual(result, { applied: true });
  assert.equal(ui.volume, 0.4, 'the remembered nonzero volume is restored');
  assert.equal(engine.volumes.at(-1), 0.4);
  assert.equal(ui.audioControlState().status, 'applied');
});

test('unmute without an available Sound control reports honestly', () => {
  const ui = makeUI();
  const engine = controlledEngine();
  ui.engine = engine;
  ui.requestMasterSound = null;
  const result = ui.requestUnmute();
  assert.deepEqual(result, { applied: false, reason: 'sound_unavailable' });
  assert.equal(ui.effectiveVolume(), 0, 'no false audibility claim while the master gate is off');
});

test('explicit mute and unmute reach the adapter with the activity mute respected', () => {
  const ui = makeUI();
  ui.setMasterSound(true);
  const engine = controlledEngine();
  ui.engine = engine;
  ui.beginActivityPresentation({ id: 'pool', generation: 1, attempt: 1 });
  assert.deepEqual(engine.volumes, [0]);
  assert.equal(ui.setMuted(false), true, 'explicit unmute clears the activity mute');
  assert.deepEqual(engine.volumes.at(-1), 1);
  assert.equal(ui.setMuted(true), true);
  assert.deepEqual(engine.volumes.at(-1), 0);
});

test('a source replacement inherits the current activity audio choice', () => {
  const ui = makeUI();
  ui.setMasterSound(true);
  ui.engine = controlledEngine();
  ui.beginActivityPresentation({ id: 'kart', generation: 2, attempt: 1 });
  ui.setMuted(false);
  assert.equal(ui.effectiveVolume(), 1);
  const replacement = controlledEngine({ kind: 'file', ready: true });
  ui.engine = replacement;
  assert.equal(ui.applyEffectiveVolume(), true);
  assert.deepEqual(replacement.volumes, [1], 'same activity span keeps the explicit unmute');
  ui.endActivityPresentation();
  const nextGame = controlledEngine();
  ui.engine = nextGame;
  ui.beginActivityPresentation({ id: 'pool', generation: 2, attempt: 5 });
  assert.deepEqual(nextGame.volumes, [0], 'a NEW game forces silence regardless of the last choice');
});

// --- Documented native-control exception (task 2.3; AC3/AC4/AC12) ----------

function fakeElement(tag = 'div') {
  return { tagName: tag.toUpperCase(), children: [], append(c) { this.children.push(c); }, remove() {}, innerHTML: '' };
}

test('degraded clip/embed: honest notice, no false mute indicator, native controls stay usable', () => {
  const ui = makeUI();
  ui.setMasterSound(true);
  const clip = { kind: 'twitch', ready: true, degraded: true, iframe: fakeElement('iframe'), setVolume: undefined };
  ui.engine = clip;
  ui.dom = { mediaHost: fakeElement('div') };
  ui.dom.mediaHost.append(clip.iframe);
  ui.beginActivityPresentation({ id: 'pool', generation: 1, attempt: 1 });

  assert.equal(ui.audioControlAvailable(), false);
  assert.equal(ui.audioControlState().supported, false, 'no invented mute state');
  assert.equal(ui.audioControlState().status, 'unavailable');
  assert.match(ui.audioLimitationNotice(), /automatic mute unavailable/);
  assert.equal(ui.setMuted(false), false, 'the labeled action reports it cannot control this provider');
  assert.equal(ui.dom.mediaHost.children[0], clip.iframe, 'the same frame stays in place');
});

test('presentation-only transitions never reload a degraded frame or send a shared action', () => {
  const ui = makeUI();
  ui.setMasterSound(true);
  const clip = { kind: 'twitch', ready: true, degraded: true, iframe: fakeElement('iframe') };
  ui.engine = clip;
  ui.dom = { mediaHost: fakeElement('div') };
  ui.dom.mediaHost.append(clip.iframe);
  ui.state = { now: { id: 'itm_clip', kind: 'twitch', twitchType: 'clip', title: 'A clip' }, queue: [] };
  const sentBefore = ui.net.sent.length;

  ui.beginActivityPresentation({ id: 'pool', generation: 1, attempt: 1 });
  ui.setFloatingHidden(true);
  ui.setFloatingExpanded(true);
  ui.setFloatingHidden(false);
  ui.endActivityPresentation();

  assert.equal(ui.engine, clip, 'engine identity is retained across presentation changes');
  assert.equal(ui.dom.mediaHost.children.length, 1, 'no DOM reinsertion or reload');
  assert.equal(ui.net.sent.length, sentBefore, 'no theater action is emitted by local presentation');
  assert.doesNotMatch(String(ui.net.sent.map((m) => m.type).join(',')), /theater_/);
});
