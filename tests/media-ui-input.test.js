/**
 * Floating media input-guard tests (add-floating-minigame-media, task 5.1).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MEDIA_UI_SELECTOR,
  isMediaUiEvent,
  mediaUiHasFocus,
} from '../src/activities/inputSeam.js';

const mediaNode = { id: 'floating-media' };
const chipNode = { id: 'floating-media-restore' };
const insideNode = {
  id: 'floating-media-speaker',
  closest: (sel) => (sel === MEDIA_UI_SELECTOR ? {} : null),
};
const gameNode = { id: 'world', closest: () => null };

test('isMediaUiEvent detects composedPath membership and closest targets', () => {
  assert.equal(isMediaUiEvent({ composedPath: () => [{ nodeType: 1 }, { nodeType: 1 }, mediaNode] }), true);
  assert.equal(isMediaUiEvent({ composedPath: () => [chipNode] }), true);
  assert.equal(isMediaUiEvent({ composedPath: () => [insideNode] }), true);
  assert.equal(isMediaUiEvent({ composedPath: () => [gameNode], target: gameNode }), false);
  assert.equal(isMediaUiEvent({ target: insideNode }), true);
  assert.equal(isMediaUiEvent({ target: gameNode }), false);
  assert.equal(isMediaUiEvent(null), false);
  assert.equal(isMediaUiEvent({ composedPath: () => { throw new Error('detached'); }, target: gameNode }), false);
});

test('mediaUiHasFocus resolves the active element against the media chrome', () => {
  assert.equal(mediaUiHasFocus({ activeElement: insideNode }), true);
  assert.equal(mediaUiHasFocus({ activeElement: mediaNode }), true);
  assert.equal(mediaUiHasFocus({ activeElement: gameNode }), false);
  assert.equal(mediaUiHasFocus({ activeElement: null }), false);
  assert.equal(mediaUiHasFocus(null), false);
});

test('a plain game event is never classified as media UI', () => {
  const event = {
    composedPath: () => [{ nodeType: 1 }, documentLike(), { id: 'world' }],
    target: { id: 'world', closest: () => null },
  };
  assert.equal(isMediaUiEvent(event), false);
});

function documentLike() {
  return { nodeType: 9, closest: undefined };
}

test('pool: media chrome F events never charge or fire; normal F still shoots', async () => {
  const { createPoolInstance } = await import('../src/activities/pool.js');
  const listeners = [];
  const previousWindow = globalThis.window;
  globalThis.window = {
    addEventListener: (type, fn, capture) => listeners.push({ type, fn, capture }),
    removeEventListener: () => {},
  };
  const mediaTarget = {
    tagName: 'BUTTON',
    closest: (sel) => (String(sel).includes('floating-media') ? {} : null),
  };
  const gameTarget = { tagName: 'CANVAS', closest: () => null };
  const fakeKeyEvent = (target) => ({
    code: 'KeyF',
    target,
    preventDefault() {},
    stopImmediatePropagation() {},
    stopPropagation() {},
  });
  try {
    const inputs = [];
    const activityDef = { id: 'pool', type: 'pool' };
    const instance = createPoolInstance({
      activityDef,
      getParticipation: () => ({
        isParticipating: true,
        currentActivity: activityDef,
        currentSlot: 0,
        sessionId: 'session',
        lease: 'lease',
      }),
      net: { sendActivityInput: (input) => inputs.push(input) },
    });
    try {
      instance.update(0, 0);
      instance.acceptResult({ result: 'ready' });
      const keydowns = listeners.filter((l) => l.type === 'keydown').map((l) => l.fn);
      const keyups = listeners.filter((l) => l.type === 'keyup').map((l) => l.fn);
      assert.ok(keydowns.length > 0, 'the controller capture listeners are attached');

      // Hold F while the media chrome owns the key: no charge accrues.
      for (const fn of keydowns) fn(fakeKeyEvent(mediaTarget));
      instance.update(0.4, 0.4);
      for (const fn of keyups) fn(fakeKeyEvent(mediaTarget));
      assert.equal(inputs.length, 0, 'suppressed media-chrome F never releases a shot');

      // A normal gameplay F still charges and releases one shot.
      for (const fn of keydowns) fn(fakeKeyEvent(gameTarget));
      instance.update(0.8, 0.4);
      for (const fn of keyups) fn(fakeKeyEvent(gameTarget));
      assert.equal(inputs.length, 1, 'ordinary F charge/shoot still works');
      assert.equal(inputs[0].controls.action, 'shoot');
    } finally {
      instance.dispose();
    }
  } finally {
    globalThis.window = previousWindow;
  }
});
