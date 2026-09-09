import test from 'node:test';
import assert from 'node:assert/strict';
import { initNearbyActivities } from '../src/ui/nearbyActivities.js';

function el(tag) {
  const node = {
    tagName: tag.toUpperCase(),
    className: '',
    hidden: false,
    children: [],
    attributes: new Map(),
    parentNode: null,
    setAttribute(name, value) { node.attributes.set(name, String(value)); },
    removeAttribute(name) { node.attributes.delete(name); },
    getAttribute(name) { return node.attributes.get(name) ?? null; },
    querySelector() { return null; },
    append(...kids) {
      for (const kid of kids) {
        kid.parentNode = node;
        node.children.push(kid);
      }
    },
  };
  let text = '';
  Object.defineProperty(node, 'textContent', {
    get: () => text,
    set(value) {
      text = value;
      if (value === '') node.children.length = 0;
    },
  });
  return node;
}

function createNet() {
  return {
    handlers: new Map(),
    on(type, fn) {
      if (!this.handlers.has(type)) this.handlers.set(type, []);
      this.handlers.get(type).push(fn);
    },
    onDisconnect() {},
    onConnect() {},
    desiredRoom: 'theater',
  };
}

test('nearby HUD shows occupied tables and unknown when stale', () => {
  const root = el('aside');
  const hud = initNearbyActivities({
    net: createNet(),
    root,
    now: () => 1_000,
    createEl: el,
    getRoomId: () => 'theater',
  });

  hud.applySummaries([{ id: 'pool-1', type: 'pool', playing: 2, watching: 1, queued: 0 }], 1_000);
  const snap = hud.snapshot();
  assert.equal(snap.occupied, true);
  assert.equal(snap.fresh, true);
  assert.equal(root.getAttribute('data-occupied'), 'true');
  assert.match(root.children[1].children[0].textContent, /2 playing/);
});
