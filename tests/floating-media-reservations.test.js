/**
 * Floating media reservation tests (add-floating-minigame-media, task 4.4).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HOST_RESERVATION_SELECTORS,
  MAX_FLOATING_RESERVATIONS,
  collectFloatingReservations,
  rectFromElement,
} from '../src/ui/floatingMediaReservations.js';
import { getActivityMediaPolicy } from '../src/activities/registry.js';

// Importing the modules registers their policies (side-effect registration).
import '../src/activities/pool.js';
import '../src/activities/kart-royale.js';
import '../src/activities/snowboard.js';
import '../src/activities/downhill-mayhem.js';

function element({ x = 0, y = 0, width = 100, height = 50, hidden = false } = {}) {
  return {
    hidden,
    getBoundingClientRect: () => ({ x, y, width, height, left: x, top: y }),
  };
}

function fakeDoc(map) {
  return {
    querySelectorAll(selector) {
      return map[selector] || [];
    },
  };
}

test('rectFromElement skips hidden and zero-size nodes', () => {
  assert.deepEqual(rectFromElement(element({ x: 10, y: 20, width: 30, height: 40 })), { x: 10, y: 20, width: 30, height: 40 });
  assert.equal(rectFromElement(element({ hidden: true })), null);
  assert.equal(rectFromElement(element({ width: 0, height: 0 })), null);
  assert.equal(rectFromElement(null), null);
  assert.equal(rectFromElement({}), null);
});

test('host selectors, extra measured rects, dedupe and the eight-rect bound', () => {
  const chat = element({ x: 1000, y: 400, width: 260, height: 380 });
  const interact = element({ x: 500, y: 700, width: 200, height: 60 });
  const doc = fakeDoc({
    '#chat-panel': [chat],
    '#interact': [interact],
    '.challenge-invite': [element({ width: 1, height: 1 })], // too small -> skipped
  });
  const extra = [
    { x: 1000, y: 400, width: 260, height: 380 }, // duplicate of chat
    { x: 0, y: 0, width: 40, height: 40 },
    { x: 'nope', y: 0 },
  ];
  const rects = collectFloatingReservations(doc, { selectors: HOST_RESERVATION_SELECTORS, extra });
  assert.equal(rects.length, 3, 'chat, interact and the valid extra (dedupe + invalid dropped)');

  const many = fakeDoc({ '.x': Array.from({ length: 20 }, (_, i) => element({ x: i * 10, width: 20, height: 20 })) });
  const bounded = collectFloatingReservations(many, { selectors: ['.x'] });
  assert.equal(bounded.length, MAX_FLOATING_RESERVATIONS);
});

test('activity modules declare their critical HUD/touch reservation selectors', () => {
  const expectations = {
    pool: ['.pool-hud-top', '.pool-hud-bottom'],
    'kart-royale': ['.kr-hud', '.kr-bottom'],
    'snowboard-race': ['.sbx-top-hud', '.sbx-bottom-hud', '.sbx-actions', '.sbx-touch'],
    'downhill-mayhem': ['.dm-panel', '.dm-actions', '.dm-audience-actions'],
  };
  for (const [type, selectors] of Object.entries(expectations)) {
    const policy = getActivityMediaPolicy(type);
    assert.equal(policy.floatingMedia, true, `${type} still floats`);
    assert.deepEqual([...policy.reservedSelectors], selectors, type);
  }
});

test('a declined selector or missing document never throws', () => {
  const doc = { querySelectorAll() { throw new Error('bad selector'); } };
  assert.deepEqual(collectFloatingReservations(doc, { selectors: ['::bad'] }), []);
  assert.deepEqual(collectFloatingReservations(null), []);
});
