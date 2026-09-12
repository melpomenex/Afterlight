/**
 * Pointer-lock integration contract tests
 * (add-floating-minigame-media, task 5.4; design D6).
 *
 * Proves the bridge never touches lock automatically, requests only from an
 * explicit gesture, and consumes the browser's unlock Escape so it cannot
 * double as a game action.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { createPointerLockBridge } from '../src/ui/pointerLockBridge.js';

function fakeEnvironment() {
  const listeners = new Map();
  const canvas = {
    id: 'world',
    requestPointerLock() {
      doc.pointerLockElement = canvas;
      doc.dispatch('pointerlockchange');
      return Promise.resolve();
    },
  };
  const doc = {
    pointerLockElement: null,
    exitPointerLock() {
      doc.pointerLockElement = null;
      doc.dispatch('pointerlockchange');
    },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    removeEventListener(type, fn) {
      const list = listeners.get(type) || [];
      const i = list.indexOf(fn);
      if (i >= 0) list.splice(i, 1);
    },
    dispatch(type) {
      for (const fn of listeners.get(type) || []) fn();
    },
    listenerCount: () => [...listeners.values()].reduce((n, l) => n + l.length, 0),
  };
  return { doc, canvas };
}

test('explicit canvas request locks; unlock reports the change', () => {
  const { doc, canvas } = fakeEnvironment();
  const changes = [];
  const bridge = createPointerLockBridge({ document: doc, getCanvas: () => canvas, onChange: (l) => changes.push(l) });
  assert.equal(bridge.locked, false);
  assert.equal(bridge.supported, true);
  assert.deepEqual(bridge.requestFromGesture(), { ok: true });
  assert.equal(bridge.locked, true);
  doc.exitPointerLock();
  assert.equal(bridge.locked, false);
  assert.deepEqual(changes, [true, false]);
  bridge.destroy();
});

test('automatic presentation changes never release or reacquire lock', () => {
  const { doc, canvas } = fakeEnvironment();
  const bridge = createPointerLockBridge({ document: doc, getCanvas: () => canvas });
  bridge.requestFromGesture();
  assert.equal(bridge.locked, true);
  // The floating system's automatic hooks are inert.
  assert.deepEqual(bridge.noteAutomaticPresentationChange(), { locked: true });
  assert.equal(bridge.locked, true, 'game entry/hide/expand/resize never touches lock');
  assert.equal(typeof bridge.autoRelease, 'undefined');
  assert.equal(typeof bridge.reacquire, 'undefined');
  bridge.destroy();
});

test('the unlock Escape is consumed once and never leaves the activity', () => {
  const { doc, canvas } = fakeEnvironment();
  let clock = 1000;
  const bridge = createPointerLockBridge({ document: doc, getCanvas: () => canvas, now: () => clock });
  bridge.requestFromGesture();
  doc.exitPointerLock(); // recorded at clock 1000
  assert.equal(bridge.consumeUnlockEscape(clock + 100), true, 'the unlock Escape is swallowed');
  assert.equal(bridge.consumeUnlockEscape(clock + 200), false, 'only one Escape is attributed to the unlock');
  // A later Escape is ordinary gameplay/menu input again.
  bridge.requestFromGesture();
  clock += 5000;
  doc.exitPointerLock();
  assert.equal(bridge.consumeUnlockEscape(clock + 100), true);
  clock += 5000;
  assert.equal(bridge.consumeUnlockEscape(clock + 100), false, 'outside the unlock window it is gameplay input');
  bridge.destroy();
});

test('an unsupported canvas reports unsupported instead of requesting', () => {
  const { doc } = fakeEnvironment();
  const bridge = createPointerLockBridge({ document: doc, getCanvas: () => ({ id: 'plain' }) });
  assert.equal(bridge.supported, false);
  assert.deepEqual(bridge.requestFromGesture(), { ok: false, reason: 'unsupported' });
  assert.equal(bridge.locked, false);
  bridge.destroy();
});

test('destroy removes the pointerlockchange listener', () => {
  const { doc, canvas } = fakeEnvironment();
  const bridge = createPointerLockBridge({ document: doc, getCanvas: () => canvas });
  assert.ok(doc.listenerCount() >= 1);
  bridge.destroy();
  assert.equal(doc.listenerCount(), 0);
});
