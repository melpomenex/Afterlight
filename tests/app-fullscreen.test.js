/**
 * Application-root fullscreen helper tests
 * (add-floating-minigame-media, task 5.3; design D6).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { createAppFullscreen } from '../src/ui/appFullscreen.js';

function fakeDocument({ allow = true, deny = false } = {}) {
  const listeners = new Map();
  const mediaNode = { id: 'theater-screen' };
  const documentElement = {
    id: 'root',
    mediaNode,
    async requestFullscreen() {
      if (!allow) throw new DOMExceptionLike('NotAllowedError');
      if (deny) throw new DOMExceptionLike('TypeError');
      doc.fullscreenElement = documentElement;
    },
  };
  const doc = {
    documentElement,
    fullscreenElement: null,
    mediaNode,
    async exitFullscreen() {
      doc.fullscreenElement = null;
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
    dispatch(type, event = {}) {
      for (const fn of listeners.get(type) || []) fn(event);
    },
    listenerCount: () => [...listeners.values()].reduce((n, l) => n + l.length, 0),
  };
  mediaNode.parent = documentElement;
  return doc;
}

function DOMExceptionLike(name) {
  const err = new Error(name);
  err.name = name;
  return err;
}

test('request targets the application root, not the canvas or a provider frame', async () => {
  const doc = fakeDocument();
  const fs = createAppFullscreen({ document: doc });
  assert.equal(fs.target, doc.documentElement);
  const result = await fs.request();
  assert.deepEqual(result, { ok: true, active: true });
  assert.equal(fs.active, true);
  assert.equal(doc.mediaNode.parent, doc.documentElement, 'the media node was never reparented');
  fs.destroy();
});

test('successful request and exit report changes without touching the media node', async () => {
  const doc = fakeDocument();
  const changes = [];
  const fs = createAppFullscreen({ document: doc, onChange: (active) => changes.push(active) });
  await fs.request();
  await fs.exit();
  assert.deepEqual(changes, [true, false]);
  assert.equal(fs.active, false);
  assert.equal(doc.mediaNode.parent, doc.documentElement);
  fs.destroy();
});

test('a denied request leaves the in-window layout working and reports locally', async () => {
  const doc = fakeDocument({ allow: false });
  const fs = createAppFullscreen({ document: doc });
  const result = await fs.request();
  assert.equal(result.ok, false);
  assert.equal(result.active, false);
  assert.equal(result.reason, 'NotAllowedError');
  assert.equal(fs.active, false);
  assert.equal(doc.mediaNode.parent, doc.documentElement, 'media keeps its position');
  fs.destroy();
});

test('unsupported browsers report unsupported instead of throwing', async () => {
  const doc = fakeDocument();
  delete doc.documentElement.requestFullscreen;
  const fs = createAppFullscreen({ document: doc });
  assert.equal(fs.supported, false);
  const result = await fs.request();
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'unsupported');
  // exit when not fullscreen is a harmless no-op
  assert.deepEqual(await fs.exit(), { ok: true, active: false });
  fs.destroy();
});

test('toggle uses the current state and destroy removes every listener', async () => {
  const doc = fakeDocument();
  const fs = createAppFullscreen({ document: doc });
  assert.ok(doc.listenerCount() >= 2);
  await fs.toggle();
  assert.equal(fs.active, true);
  await fs.toggle();
  assert.equal(fs.active, false);
  fs.destroy();
  assert.equal(doc.listenerCount(), 0);
});
