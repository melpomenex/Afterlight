/**
 * Floating presentation selection tests for TheaterScreenUI
 * (add-floating-minigame-media, task 2.1; design D1/D4).
 *
 * Instantiates the UI headlessly (no DOM at construction) and attaches a
 * minimal fake overlay so the class/selector logic can be asserted without a
 * browser. The real browser surfaces are covered by the gate script.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { TheaterScreenUI } from '../src/ui/theaterScreen.js';
import { PRESENTATION_MODE } from '../src/ui/mediaPresentationState.js';

function fakeClassList(el) {
  const set = new Set(String(el.className || '').split(/\s+/).filter(Boolean));
  return {
    add(...c) { for (const x of c) set.add(x); },
    remove(...c) { for (const x of c) set.delete(x); },
    contains: (c) => set.has(c),
    toggle(c, force) {
      const on = force === undefined ? !set.has(c) : !!force;
      if (on) set.add(c);
      else set.delete(c);
      return on;
    },
  };
}

function fakeElement(tag = 'div') {
  const el = {
    tagName: tag.toUpperCase(),
    children: [],
    hidden: false,
    style: {
      setProperty(key, value) { this[key] = value; },
      removeProperty(key) { delete this[key]; },
    },
    append(child) { this.children.push(child); },
    remove() { this.removed = true; },
    querySelector: () => null,
  };
  el.classList = fakeClassList(el);
  return el;
}

function makeUI() {
  const net = {
    handlers: new Map(),
    sent: [],
    on() {},
    send(type, payload) { this.sent.push({ type, payload }); },
    clearTorrentGrants() {},
  };
  const ui = new TheaterScreenUI(net);
  const overlay = fakeElement('div');
  ui.dom = {
    overlay,
    mediaHost: fakeElement('div'),
    playBadge: fakeElement('button'),
    caption: fakeElement('span'),
  };
  ui.roomActive = true;
  return { ui, overlay, net };
}

const item = (id = 'itm_1') => ({
  id,
  kind: 'file',
  url: 'http://example.com/a.mp4',
  title: 'A',
  playing: true,
  positionSec: 0,
  updatedAt: Date.now(),
});

const QUAD = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }];

/** Record a bill item without creating a playback engine (headless UI). */
function setItem(ui, now) {
  const was = ui.roomActive;
  ui.roomActive = false;
  ui.applyState({ now, queue: [] }, Date.now());
  ui.roomActive = was;
  if (ui.dom?.overlay) ui.syncOverlay();
}

test('primary: quad or cinema shows the world surface; neither hides it', () => {
  const { ui, overlay } = makeUI();
  ui.updateScreenQuad(QUAD);
  assert.equal(overlay.classList.contains('ts-hidden'), false);
  assert.equal(overlay.classList.contains('ts-floating'), false);

  ui.updateScreenQuad(null);
  assert.equal(overlay.classList.contains('ts-hidden'), true, 'no quad in the world hides the surface');

  ui.watching = true;
  ui.syncOverlay();
  assert.equal(overlay.classList.contains('ts-hidden'), false, 'cinema still shows the surface');
  assert.equal(overlay.classList.contains('ts-floating'), false);
});

test('floating: activity + current item floats even with a null quad', () => {
  const { ui, overlay } = makeUI();
  setItem(ui, item());
  ui.updateScreenQuad(QUAD);
  ui.beginActivityPresentation({ id: 'pool', generation: 3, attempt: 1 });
  assert.equal(ui.presentationMode(), PRESENTATION_MODE.FLOATING);
  assert.equal(overlay.classList.contains('ts-floating'), true);
  assert.equal(overlay.classList.contains('ts-hidden'), false);

  // Hosted racers clear the projected quad: floating must survive it.
  ui.updateScreenQuad(null);
  assert.equal(overlay.classList.contains('ts-hidden'), false, 'null quad must not hide floating media');
  assert.equal(overlay.classList.contains('ts-floating'), true);
});

test('floating mode never rewrites the world homography or inline geometry', () => {
  const { ui, overlay } = makeUI();
  setItem(ui, item());
  ui.updateScreenQuad(QUAD);
  ui.beginActivityPresentation({ id: 'pool', generation: 1, attempt: 1 });
  overlay.style.width = '321px';
  overlay.style.height = '123px';
  const transform = overlay.style.transform;
  ui.updateScreenQuad(QUAD, 1);
  assert.equal(overlay.style.width, '321px', 'floating keeps CSS geometry');
  assert.equal(overlay.style.height, '123px');
  assert.equal(overlay.style.transform, transform);
  assert.equal(ui.quad != null, true, 'world geometry is still recorded for the return to primary');
});

test('waiting: activity with no current item shows no empty frame or chip', () => {
  const { ui, overlay } = makeUI();
  setItem(ui, null);
  ui.beginActivityPresentation({ id: 'kart', generation: 1, attempt: 1 });
  assert.equal(ui.presentationMode(), PRESENTATION_MODE.WAITING);
  assert.equal(overlay.classList.contains('ts-hidden'), true);
  assert.equal(overlay.classList.contains('ts-floating'), false);
  assert.equal(overlay.classList.contains('ts-floating-hidden'), false);

  // A source arriving later floats automatically without a new entry event.
  setItem(ui, item('itm_late'));
  assert.equal(ui.presentationMode(), PRESENTATION_MODE.FLOATING);
  assert.equal(overlay.classList.contains('ts-floating'), true);
});

test('hidden presentation keeps the surface connected and non-displayed without teardown', () => {
  const { ui, overlay } = makeUI();
  setItem(ui, item());
  ui.beginActivityPresentation({ id: 'pool', generation: 1, attempt: 1 });
  ui.setFloatingHidden(true);
  assert.equal(ui.presentationMode(), PRESENTATION_MODE.HIDDEN);
  assert.equal(overlay.classList.contains('ts-floating-hidden'), true);
  assert.equal(overlay.classList.contains('ts-hidden'), false, 'hidden is a presentation, not a teardown');
  assert.equal(ui.engine, null, 'no engine is created by presentation changes');
  ui.setFloatingHidden(false);
  assert.equal(ui.presentationMode(), PRESENTATION_MODE.FLOATING);
  assert.equal(overlay.classList.contains('ts-floating-hidden'), false);
});

test('expanded is floating-only and resets when the activity span ends', () => {
  const { ui, overlay } = makeUI();
  setItem(ui, item());
  ui.beginActivityPresentation({ id: 'pool', generation: 1, attempt: 1 });
  ui.setFloatingExpanded(true);
  assert.equal(ui.isFloatingExpanded(), true);
  assert.equal(overlay.classList.contains('ts-floating-expanded'), true);
  ui.endActivityPresentation();
  assert.equal(ui.isFloatingExpanded(), false);
  assert.equal(ui.presentationMode(), PRESENTATION_MODE.PRIMARY);
  assert.equal(overlay.classList.contains('ts-floating'), false);
});

test('the drift/supervision tick still runs while floating and while hidden', () => {
  const { ui } = makeUI();
  setItem(ui, item());
  ui.beginActivityPresentation({ id: 'pool', generation: 1, attempt: 1 });
  let checks = 0;
  ui.enforceSync = () => { checks += 1; };
  ui.tickClipGuard = () => {};
  ui.engine = { kind: 'file', degraded: false, ready: true };
  ui.lastDriftCheckMs = 0;
  ui.tickDriftCheck();
  assert.equal(checks, 1, 'floating keeps the shared-clock supervision alive');
  ui.setFloatingHidden(true);
  ui.lastDriftCheckMs = 0;
  ui.tickDriftCheck();
  assert.equal(checks, 2, 'hidden presentation keeps supervision alive');
  ui.updateScreenQuad(null);
  assert.equal(checks, 2);
});

test('room teardown ends the presentation once and restores baseline audio', () => {
  const { ui } = makeUI();
  setItem(ui, item());
  ui.setMasterSound(true);
  ui.beginActivityPresentation({ id: 'pool', generation: 1, attempt: 1 });
  assert.equal(ui.effectiveVolume(), 0, 'entry mute active');
  assert.equal(ui.setRoomActive(false), undefined);
  assert.equal(ui.presentationMode(), PRESENTATION_MODE.PRIMARY);
  assert.equal(ui.effectiveVolume(), 1, 'baseline audio restored under the still-on master gate');
  assert.equal(ui.engine, null);
  // Idempotent: a second deactivation changes nothing.
  ui.setRoomActive(false);
  assert.equal(ui.presentationMode(), PRESENTATION_MODE.PRIMARY);
});

test('a same-room game replacement re-mutes and resets hidden/expanded without dropping the span', () => {
  const { ui } = makeUI();
  ui.setMasterSound(true);
  setItem(ui, item());
  ui.beginActivityPresentation({ id: 'pool', generation: 2, attempt: 1 });
  ui.setUserVolume(0.6);
  ui.setMuted(false);
  ui.setFloatingHidden(true);
  ui.setFloatingExpanded(true);
  assert.equal(ui.effectiveVolume(), 0.6);

  ui.replaceActivityPresentation({ id: 'kart', generation: 2, attempt: 9 });
  assert.equal(ui.presentationMode(), PRESENTATION_MODE.FLOATING);
  assert.equal(ui.isFloatingHidden(), false);
  assert.equal(ui.isFloatingExpanded(), false);
  assert.equal(ui.effectiveVolume(), 0, 'new game entry mute');
  ui.endActivityPresentation();
  assert.equal(ui.volume, 0.6, 'explicit volume edit survives exit');
});
