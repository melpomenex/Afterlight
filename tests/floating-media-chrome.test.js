/**
 * Floating media chrome tests (add-floating-minigame-media, task 4.1).
 *
 * A minimal fake DOM drives the chrome module's labels, announcements, tab
 * order and control actions without a browser. The real DOM/geometry is
 * exercised by scripts/floating-media-gate-browser.mjs.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FLOATING_MEDIA_IDS,
  createFloatingMediaChrome,
  floatingMediaChromeState,
} from '../src/ui/floatingMedia.js';
import { PRESENTATION_MODE } from '../src/ui/mediaPresentationState.js';

function fakeClassList() {
  const set = new Set();
  return {
    add: (...c) => c.forEach((x) => set.add(x)),
    remove: (...c) => c.forEach((x) => set.delete(x)),
    contains: (c) => set.has(c),
    toggle(c, force) {
      const on = force === undefined ? !set.has(c) : !!force;
      if (on) set.add(c);
      else set.delete(c);
      return on;
    },
  };
}

function fakeElement(tag) {
  const el = {
    tagName: tag.toUpperCase(),
    children: [],
    attrs: {},
    listeners: new Map(),
    hidden: false,
    textContent: '',
    title: '',
    style: {},
    classList: fakeClassList(),
    append(...nodes) { for (const n of nodes) { n.parent = el; el.children.push(n); } },
    setAttribute(k, v) { el.attrs[k] = v; },
    getAttribute(k) { return el.attrs[k]; },
    addEventListener(type, fn) {
      if (!el.listeners.has(type)) el.listeners.set(type, []);
      el.listeners.get(type).push(fn);
    },
    dispatch(type, event = {}) {
      const ev = { preventDefault() { ev.defaultPrevented = true; }, stopPropagation() {}, shiftKey: false, ...event };
      for (const fn of el.listeners.get(type) || []) fn(ev);
      return ev;
    },
    click() { el.dispatch('click'); },
  };
  return el;
}

const makeDoc = () => ({ createElement: (tag) => fakeElement(tag), body: fakeElement('body') });

function makeDocAndUI(overrides = {}) {
  const doc = makeDoc();
  return { doc, ui: fakeUI(overrides) };
}

function fakeUI(overrides = {}) {
  const ui = {
    dom: { overlay: fakeElement('div'), mediaHost: fakeElement('div'), playBadge: fakeElement('button') },
    presentationState: { masterSound: true, volume: 1, userMuted: false, activityMuted: false },
    state: { now: { id: 'itm_1', kind: 'file', title: 'A film', playing: true } },
    overlayState: 'playing',
    mutedCalls: [],
    unmuteCalls: 0,
    hiddenCalls: [],
    expandCalls: [],
    presentationMode: () => PRESENTATION_MODE.FLOATING,
    isFloatingExpanded: () => false,
    audioControlAvailable: () => true,
    audioControlState: () => ({ supported: true, status: 'applied' }),
    audioLimitationNotice: () => null,
    effectiveVolume: () => 1,
    setMuted(value) { ui.mutedCalls.push(value); return true; },
    requestUnmute() { ui.unmuteCalls += 1; return { applied: true }; },
    setFloatingHidden(value) { ui.hiddenCalls.push(value); },
    setFloatingExpanded(value) { ui.expandCalls.push(value); },
    ...overrides,
  };
  return ui;
}

const byId = (root, id) => {
  const stack = [...root.children];
  while (stack.length) {
    const node = stack.shift();
    if (node.attrs?.id === id) return node;
    stack.push(...(node.children || []));
  }
  return null;
};

test('chrome state table: primary, floating, hidden, waiting and degraded providers', () => {
  const base = fakeUI();
  assert.equal(floatingMediaChromeState(base).visible, true);
  assert.equal(floatingMediaChromeState(base).speakerLabel, 'Mute stream');

  const primary = fakeUI({ presentationMode: () => PRESENTATION_MODE.PRIMARY });
  assert.equal(floatingMediaChromeState(primary).visible, false);

  const waiting = fakeUI({ presentationMode: () => PRESENTATION_MODE.WAITING, state: { now: null } });
  const waitingState = floatingMediaChromeState(waiting);
  assert.equal(waitingState.visible, false, 'no empty player or restore chip without media');
  assert.equal(waitingState.hasItem, false);

  const hidden = fakeUI({ presentationMode: () => PRESENTATION_MODE.HIDDEN });
  assert.equal(floatingMediaChromeState(hidden).hidden, true);

  const degraded = fakeUI({
    audioControlAvailable: () => false,
    audioLimitationNotice: () => 'Use the player\u2019s own audio controls \u2014 automatic mute unavailable',
  });
  const degradedState = floatingMediaChromeState(degraded);
  assert.equal(degradedState.audioSupported, false);
  assert.match(degradedState.speakerLabel, /Automatic mute unavailable/);
  assert.match(degradedState.limitation, /native|player/i);

  const mutedNeedsMaster = fakeUI({
    presentationState: { masterSound: false, volume: 1, userMuted: false, activityMuted: true },
    effectiveVolume: () => 0,
  });
  assert.equal(floatingMediaChromeState(mutedNeedsMaster).speakerLabel, 'Turn on sound and unmute stream');

  const mutedZeroVolume = fakeUI({
    presentationState: { masterSound: true, volume: 0, userMuted: false, activityMuted: true },
    effectiveVolume: () => 0,
  });
  assert.equal(floatingMediaChromeState(mutedZeroVolume).speakerLabel, 'Turn on sound and unmute stream');
});

test('chrome is created once inside the overlay and never touches the media host', () => {
  const { doc, ui } = makeDocAndUI();
  const chrome = createFloatingMediaChrome(ui, { document: doc });
  assert.equal(ui.dom.overlay.children.length, 1, 'chrome appended once inside the overlay');
  assert.equal(doc.body.children.length, 1, 'restore chip appended once at body level');
  assert.equal(ui.dom.mediaHost.children.length, 0, 'media ancestry untouched');
  const second = createFloatingMediaChrome(ui, { document: doc });
  assert.notEqual(second.element, chrome.element);
  assert.equal(ui.dom.overlay.children.length, 2, 'each call appends its own chrome (the UI creates it once)');
});

test('controls carry accessible names, pressed states and labels', () => {
  const { doc, ui } = makeDocAndUI();
  const chrome = createFloatingMediaChrome(ui, { document: doc });
  const speaker = byId(ui.dom.overlay, FLOATING_MEDIA_IDS.speaker);
  const enlarge = byId(ui.dom.overlay, FLOATING_MEDIA_IDS.enlarge);
  const hide = byId(ui.dom.overlay, FLOATING_MEDIA_IDS.hide);
  const handle = byId(ui.dom.overlay, FLOATING_MEDIA_IDS.handle);
  const restore = byId(doc.body, FLOATING_MEDIA_IDS.restore);
  assert.equal(speaker.textContent, 'Mute stream');
  assert.equal(speaker.attrs['aria-pressed'], 'false', 'audible: mute is not engaged');
  assert.equal(enlarge.textContent, 'Enlarge stream');
  assert.equal(enlarge.attrs['aria-pressed'], 'false');
  assert.equal(hide.textContent, 'Hide stream');
  assert.equal(handle.attrs['aria-label'], 'Move stream with the arrow keys');
  assert.equal(restore.attrs['aria-label'], 'Restore stream');
  assert.equal(restore.hidden, true);

  // Tab order inside the chrome: handle, speaker, enlarge, hide, reset, back.
  const buttons = chrome.element.children.find((c) => c.classList.contains?.('fm-buttons') || c.tagName === 'DIV');
  const ids = buttons.children.map((b) => b.attrs.id);
  assert.deepEqual(ids, [
    FLOATING_MEDIA_IDS.handle,
    FLOATING_MEDIA_IDS.speaker,
    FLOATING_MEDIA_IDS.enlarge,
    FLOATING_MEDIA_IDS.hide,
    FLOATING_MEDIA_IDS.reset,
    FLOATING_MEDIA_IDS.back,
  ]);
});

test('speaker action: mute when audible, one-action unmute when silent, announcements', () => {
  const { doc, ui } = makeDocAndUI();
  const chrome = createFloatingMediaChrome(ui, { document: doc });
  const speaker = byId(ui.dom.overlay, FLOATING_MEDIA_IDS.speaker);

  speaker.click();
  assert.deepEqual(ui.mutedCalls, [true]);
  assert.equal(chrome.lastAnnouncement, 'Stream muted.');

  // Silent state: the same control performs the labeled explicit unmute.
  ui.effectiveVolume = () => 0;
  ui.presentationState = { masterSound: false, volume: 1, userMuted: false, activityMuted: true };
  chrome.sync();
  assert.equal(speaker.textContent, 'Turn on sound and unmute stream');
  speaker.click();
  assert.equal(ui.unmuteCalls, 1);
  assert.equal(chrome.lastAnnouncement, 'Stream unmuted.');
});

test('hidden mode shows the compact restore control only while media is current', () => {
  const { doc, ui } = makeDocAndUI();
  const chrome = createFloatingMediaChrome(ui, { document: doc });
  const hide = byId(ui.dom.overlay, FLOATING_MEDIA_IDS.hide);
  const restore = byId(doc.body, FLOATING_MEDIA_IDS.restore);

  hide.click();
  assert.deepEqual(ui.hiddenCalls, [true]);
  ui.presentationMode = () => PRESENTATION_MODE.HIDDEN;
  chrome.sync();
  assert.equal(restore.hidden, false);
  assert.equal(chrome.element.classList.contains('is-hidden'), true);

  restore.click();
  assert.deepEqual(ui.hiddenCalls, [true, false]);
  assert.equal(chrome.lastAnnouncement, 'Stream restored.');

  // Empty bill while hidden: no restore chip.
  ui.presentationMode = () => PRESENTATION_MODE.WAITING;
  ui.state = { now: null };
  chrome.sync();
  assert.equal(restore.hidden, true);
});

test('enlarge/reduce toggles the label and pressed state without pausing', () => {
  let expanded = false;
  const { doc, ui } = makeDocAndUI({
    isFloatingExpanded: () => expanded,
    setFloatingExpanded: (v) => { expanded = v; },
  });
  const chrome = createFloatingMediaChrome(ui, { document: doc });
  const enlarge = byId(ui.dom.overlay, FLOATING_MEDIA_IDS.enlarge);
  enlarge.click();
  assert.equal(expanded, true);
  assert.equal(enlarge.textContent, 'Reduce stream');
  assert.equal(enlarge.attrs['aria-pressed'], 'true');
  assert.equal(chrome.lastAnnouncement, 'Stream enlarged.');
  enlarge.click();
  assert.equal(expanded, false);
  assert.equal(enlarge.textContent, 'Enlarge stream');
});

test('the move handle supports arrow keys and reset, and never acts like a game key', () => {
  const moves = [];
  let resets = 0;
  const { doc, ui } = makeDocAndUI();
  createFloatingMediaChrome(ui, { document: doc, onMove: (dx, dy) => moves.push([dx, dy]), onReset: () => { resets += 1; } });
  const handle = byId(ui.dom.overlay, FLOATING_MEDIA_IDS.handle);
  const reset = byId(ui.dom.overlay, FLOATING_MEDIA_IDS.reset);
  const ev = handle.dispatch('keydown', { code: 'ArrowLeft' });
  assert.deepEqual(moves, [[-8, 0]]);
  assert.equal(ev.defaultPrevented, true, 'the arrow key never reaches the game');
  handle.dispatch('keydown', { code: 'ArrowDown', shiftKey: true });
  assert.deepEqual(moves[1], [0, 24]);
  handle.dispatch('keydown', { code: 'KeyW' });
  assert.equal(moves.length, 2, 'unrelated keys are not consumed');
  reset.click();
  assert.equal(resets, 1);
  assert.equal(moves.length, 2, 'reset does not move by itself');
});

test('degraded providers replace the speaker action with the honest notice', () => {
  const { doc, ui } = makeDocAndUI({
    audioControlAvailable: () => false,
    audioLimitationNotice: () => 'Use the player\u2019s own audio controls \u2014 automatic mute unavailable',
  });
  createFloatingMediaChrome(ui, { document: doc });
  const speaker = byId(ui.dom.overlay, FLOATING_MEDIA_IDS.speaker);
  const notice = byId(ui.dom.overlay, FLOATING_MEDIA_IDS.notice);
  assert.equal(speaker.hidden, true, 'no false mute indicator');
  assert.equal(notice.hidden, false);
  assert.match(notice.textContent, /automatic mute unavailable/);
});

test('existing gesture/error affordances are untouched by chrome sync', () => {
  const { doc, ui } = makeDocAndUI();
  ui.dom.playBadge.hidden = false; // autoplay blocked badge
  const chrome = createFloatingMediaChrome(ui, { document: doc });
  chrome.sync();
  assert.equal(ui.dom.playBadge.hidden, false, 'the start-gesture badge is not hidden');
  assert.equal(ui.dom.mediaHost.children.length, 0, 'no media nodes are created by presentation');
});
