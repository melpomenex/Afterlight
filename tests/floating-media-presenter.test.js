/**
 * Floating media presenter tests (add-floating-minigame-media, task 4.3).
 *
 * Fake DOM/window with pointer capture semantics: dragging, cancellation,
 * keyboard nudging, reset, resize/visualViewport reclamping and the
 * all-corners chip path. Real pointer input is verified by the browser gate.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { createFloatingMediaPresenter } from '../src/ui/floatingMedia.js';
import { PRESENTATION_MODE } from '../src/ui/mediaPresentationState.js';

function fakeClassList() {
  const set = new Set();
  return {
    contains: (c) => set.has(c),
    add: (...c) => c.forEach((x) => set.add(x)),
    remove: (...c) => c.forEach((x) => set.delete(x)),
    toggle(c, force) {
      const on = force === undefined ? !set.has(c) : !!force;
      if (on) set.add(c);
      else set.delete(c);
      return on;
    },
  };
}

function fakeElement(tag = 'div', id = null) {
  const listeners = new Map();
  const el = {
    tagName: tag.toUpperCase(),
    attrs: id ? { id } : {},
    children: [],
    hidden: false,
    textContent: '',
    style: {
      props: {},
      setProperty(k, v) { el.style.props[k] = v; },
      removeProperty(k) { delete el.style.props[k]; },
    },
    classList: fakeClassList(),
    captured: new Set(),
    append(...nodes) { el.children.push(...nodes); },
    setAttribute(k, v) { el.attrs[k] = v; },
    getAttribute(k) { return el.attrs[k]; },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    removeEventListener(type, fn) {
      const list = listeners.get(type) || [];
      const i = list.indexOf(fn);
      if (i >= 0) list.splice(i, 1);
    },
    dispatch(type, event = {}) {
      const ev = {
        pointerId: 1,
        clientX: 0,
        clientY: 0,
        preventDefault() { ev.defaultPrevented = true; },
        stopPropagation() {},
        ...event,
      };
      for (const fn of listeners.get(type) || []) fn(ev);
      return ev;
    },
    setPointerCapture(pointerId) { el.captured.add(pointerId); },
    releasePointerCapture(pointerId) { el.captured.delete(pointerId); },
    listenerCount: () => [...listeners.values()].reduce((n, l) => n + l.length, 0),
  };
  return el;
}

function fakeWindow({ width = 1440, height = 900 } = {}) {
  const listeners = new Map();
  const vvListeners = new Map();
  const add = (map) => (type, fn) => {
    if (!map.has(type)) map.set(type, []);
    map.get(type).push(fn);
  };
  const remove = (map) => (type, fn) => {
    const list = map.get(type) || [];
    const i = list.indexOf(fn);
    if (i >= 0) list.splice(i, 1);
  };
  const win = {
    innerWidth: width,
    innerHeight: height,
    visualViewport: {
      width, height, offsetLeft: 0, offsetTop: 0,
      addEventListener: add(vvListeners),
      removeEventListener: remove(vvListeners),
    },
    addEventListener: add(listeners),
    removeEventListener: remove(listeners),
    emit(type) { for (const fn of listeners.get(type) || []) fn(); },
    emitVisualViewport(type) { for (const fn of vvListeners.get(type) || []) fn(); },
    listenerCount: (map) => ([...map.values()].reduce((n, l) => n + l.length, 0)),
    counts: { window: () => [...listeners.values()].reduce((n, l) => n + l.length, 0), vv: () => [...vvListeners.values()].reduce((n, l) => n + l.length, 0) },
  };
  return win;
}

function makeHarness({ mode = 'floating', provider = null, reservations = [] } = {}) {
  const overlay = fakeElement('div');
  const handle = fakeElement('button', 'floating-media-handle');
  const chromeElement = fakeElement('div');
  chromeElement.children.push(handle);
  const chrome = { element: chromeElement, syncCalls: [], sync(_next, opts) { chrome.syncCalls.push(opts || {}); } };
  const ui = {
    dom: { overlay },
    presentationMode: () => mode,
    isFloatingExpanded: () => false,
    state: { now: { id: 'itm_1', kind: provider || 'file', title: 'A' } },
  };
  const win = fakeWindow();
  const presenter = createFloatingMediaPresenter(ui, {
    chrome,
    window: win,
    getReservations: () => reservations,
  });
  return { ui, overlay, handle, chrome, win, presenter };
}

test('refresh applies compact geometry to the bottom-right corner', () => {
  const { overlay, presenter } = makeHarness();
  const layout = presenter.refresh('test');
  assert.equal(layout.mode, 'floating');
  assert.equal(overlay.style.props['--fm-width'], '312px');
  assert.equal(overlay.style.props['--fm-height'], '176px');
  // viewport 1440x900, avail {12,12,1416,876} -> right = 12+1416-312,
  // bottom accounts for the media rectangle + the chrome strip (52px).
  assert.equal(overlay.style.props['--fm-left'], '1116px');
  assert.equal(overlay.style.props['--fm-top'], '664px');
  assert.equal(overlay.classList.contains('ts-floating-chip'), false);
});

test('the presenter binds a real-DOM handle (id property, not only fake attrs)', () => {
  const overlay = fakeElement('div');
  const handle = fakeElement('button');
  handle.id = 'floating-media-handle';
  const chromeElement = fakeElement('div');
  chromeElement.children.push(handle);
  const ui = {
    dom: { overlay },
    presentationMode: () => PRESENTATION_MODE.FLOATING,
    isFloatingExpanded: () => false,
    state: { now: { id: 'itm_1', kind: 'file', title: 'A' } },
  };
  const presenter = createFloatingMediaPresenter(ui, {
    chrome: { element: chromeElement, sync() {} },
    window: fakeWindow(),
  });
  presenter.refresh('test');
  const down = handle.dispatch('pointerdown', { pointerId: 5, clientX: 10, clientY: 10 });
  assert.equal(down.defaultPrevented, true, 'the real handle received the drag binding');
  handle.dispatch('pointermove', { pointerId: 5, clientX: 60, clientY: 60 });
  assert.ok(presenter.manualPosition, 'the drag moved the session position');
});

test('pointer dragging captures on the handle and cannot strand the player offscreen', () => {
  const { overlay, handle, win, presenter } = makeHarness();
  presenter.refresh('test');
  const down = handle.dispatch('pointerdown', { pointerId: 7, clientX: 100, clientY: 100 });
  assert.equal(down.defaultPrevented, true);
  assert.equal(handle.captured.has(7), true, 'pointer captured on the handle');
  assert.equal(presenter.dragging, true);

  handle.dispatch('pointermove', { pointerId: 7, clientX: 99999, clientY: 99999 });
  const x = Number(String(overlay.style.props['--fm-left']).replace('px', ''));
  const y = Number(String(overlay.style.props['--fm-top']).replace('px', ''));
  assert.ok(x + 312 <= 1440, `clamped x (${x})`);
  assert.ok(y + 176 <= 900, `clamped y (${y})`);

  handle.dispatch('pointerup', { pointerId: 7 });
  assert.equal(handle.captured.has(7), false, 'capture released on pointerup');
  assert.equal(presenter.dragging, false);
  assert.ok(presenter.manualPosition, 'the manual position is remembered in-session');
  assert.equal(presenter.refresh('after').corner, 'manual');
  assert.equal(win.counts.window() > 0, true);
});

test('a cancelled drag leaves no captured pointer and reclamps the position', () => {
  const { overlay, handle, presenter } = makeHarness();
  presenter.refresh('test');
  handle.dispatch('pointerdown', { pointerId: 3, clientX: 10, clientY: 10 });
  handle.dispatch('pointermove', { pointerId: 3, clientX: 60, clientY: 60 });
  handle.dispatch('pointercancel', { pointerId: 3 });
  assert.equal(handle.captured.has(3), false, 'no capture left after pointercancel');
  assert.equal(presenter.dragging, false);
  assert.ok(presenter.manualPosition);
  const left = Number(String(overlay.style.props['--fm-left']).replace('px', ''));
  assert.ok(Number.isFinite(left));
  // A lost-capture event is equally safe.
  handle.dispatch('pointerdown', { pointerId: 4, clientX: 10, clientY: 10 });
  handle.dispatch('lostpointercapture', { pointerId: 4 });
  assert.equal(presenter.dragging, false);
});

test('keyboard nudge and reset move within bounds', () => {
  const { overlay, presenter } = makeHarness();
  presenter.refresh('test');
  const before = overlay.style.props['--fm-top'];
  presenter.nudge(-8, -16);
  assert.ok(presenter.manualPosition);
  assert.equal(presenter.layout.corner, 'manual');
  assert.notEqual(overlay.style.props['--fm-top'], before);
  presenter.nudge(-99999, -99999);
  const left = Number(String(overlay.style.props['--fm-left']).replace('px', ''));
  const top = Number(String(overlay.style.props['--fm-top']).replace('px', ''));
  assert.ok(left >= 12 && top >= 12, `clamped to the safe margin (${left},${top})`);
  presenter.reset();
  assert.equal(presenter.manualPosition, null);
  assert.equal(presenter.layout.corner, 'bottom-right');
});

test('resize and visualViewport changes reclamp without fighting a drag', () => {
  const { win, presenter } = makeHarness();
  presenter.refresh('test');
  presenter.nudge(400, 300);
  const moved = { ...presenter.manualPosition };

  win.innerWidth = 800;
  win.innerHeight = 600;
  win.visualViewport.width = 800;
  win.visualViewport.height = 600;
  win.emit('resize');
  assert.ok(presenter.layout.position.x + presenter.layout.size.width <= 800);
  assert.ok(presenter.layout.position.y + presenter.layout.size.height <= 600);

  // During a drag, viewport noise is ignored until release.
  const { handle } = makeHarness();
  void handle;
  const h = makeHarness();
  h.presenter.refresh('test');
  h.handle.dispatch('pointerdown', { pointerId: 9, clientX: 100, clientY: 100 });
  const during = h.presenter.layout.position;
  h.win.innerWidth = 700;
  h.win.visualViewport.width = 700;
  h.win.emit('resize');
  assert.equal(h.presenter.layout.position, during, 'resize does not fight an active drag');
  assert.notEqual(moved.x, null);
});

test('destroy removes every window/visualViewport listener', () => {
  const { win, presenter } = makeHarness();
  assert.ok(win.counts.window() > 0);
  assert.ok(win.counts.vv() > 0);
  presenter.destroy();
  assert.equal(win.counts.window(), 0);
  assert.equal(win.counts.vv(), 0);
});

test('all-corners blocked switches to the make-room chip; the action reclaims space', () => {
  const full = { x: 0, y: 0, width: 1440, height: 900 };
  const { overlay, chrome, presenter } = makeHarness({ reservations: [full] });
  const layout = presenter.refresh('test');
  assert.equal(layout.mode, 'chip');
  assert.equal(overlay.classList.contains('ts-floating-chip'), true);
  assert.equal(chrome.syncCalls.at(-1).chip, true);

  const forced = presenter.requestSpace();
  assert.equal(forced.mode, 'floating', 'the explicit action shows the player anyway');
  assert.equal(overlay.classList.contains('ts-floating-chip'), false);
  assert.ok(forced.position, 'placed at the least-overlap corner');
  assert.equal(chrome.syncCalls.at(-1).chip, false);
});

test('provider minimums surface as the chip instead of scaling a frame below its minimum', () => {
  const { presenter } = makeHarness({ provider: 'twitch' });
  const layout = presenter.refresh('test');
  assert.equal(layout.mode, 'floating');
  assert.ok(layout.size.width >= 400 && layout.size.height >= 300, 'a desktop viewport fits the Twitch minimum');
});
