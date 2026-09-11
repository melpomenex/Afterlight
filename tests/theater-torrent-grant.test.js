/**
 * Theater screen torrent first-request gate
 * (fix-torrent-playback-grant-regression, tasks 6.3-6.5/6.7).
 *
 * Headless TheaterScreenUI (the tests/theater-report-isolation.test.js
 * pattern): the player must not create its media element for a live torrent
 * until a matching usable grant is stored, and the first constructed stream
 * URL must carry the grant.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { TheaterScreenUI } from '../src/ui/theaterScreen.js';

const INFOHASH = '08ada5a7a6183aae1e09d831df6748d566095a10';
const OTHER_INFOHASH = 'f'.repeat(40);

const ITEM = {
  id: 'itm_torrent_1',
  kind: 'torrent',
  infohash: INFOHASH,
  fileIndex: 0,
  url: `magnet:?xt=urn:btih:${INFOHASH}&dn=Sintel`,
  title: 'Sintel',
  playing: true,
  positionSec: 0,
  updatedAt: Date.now(),
  by: 'Someone',
  queuedBy: 'Someone',
};

function makeUI({ grantReady = false } = {}) {
  const net = {
    handlers: new Map(),
    sent: [],
    cleared: 0,
    on(type, fn) {
      if (!this.handlers.has(type)) this.handlers.set(type, []);
      this.handlers.get(type).push(fn);
      return () => {};
    },
    send(type, payload) {
      this.sent.push({ type, payload });
    },
    hasUsableTorrentGrant() {
      return grantReady;
    },
    torrentStreamUrl(item) {
      return `http://game.test/api/theater/torrent/${item.infohash}/${item.fileIndex}?grant=signed-token`;
    },
    clearTorrentGrants() {
      this.cleared += 1;
    },
  };

  const ui = new TheaterScreenUI(net);
  ui.roomActive = true;
  return { ui, net };
}

function fakeVideo() {
  return {
    autoplay: false,
    preload: '',
    volume: 1,
    muted: false,
    src: '',
    currentTime: 0,
    readyState: 0,
    paused: true,
    ended: false,
    error: null,
    setAttribute() {},
    removeAttribute() {},
    load() {},
    pause() {},
    addEventListener() {},
    removeEventListener() {},
    play() {
      return Promise.resolve();
    },
  };
}

function installMediaHost(ui) {
  const children = [];
  ui.dom = {
    mediaHost: {
      children,
      append(child) {
        children.push(child);
      },
      querySelector() {
        return null;
      },
      set innerHTML(_v) {
        children.length = 0;
      },
      get innerHTML() {
        return '';
      },
    },
    overlay: null,
  };
  return children;
}

test('no usable grant: applyState waits and creates no media element', () => {
  const { ui } = makeUI({ grantReady: false });
  const children = installMediaHost(ui);

  ui.applyState({ now: ITEM, queue: [] }, Date.now());

  assert.deepEqual(ui.awaitingTorrentGrant, {
    infohash: INFOHASH,
    fileIndex: 0,
    itemId: ITEM.id,
  });
  assert.equal(ui.overlayState, 'loading');
  assert.equal(ui.engine, null);
  assert.equal(children.length, 0, 'no <video> before the grant');
  assert.equal(ui.loadedItemId, null);
});

test('matching grant clears the wait and loads the player', () => {
  const { ui } = makeUI({ grantReady: false });
  let loads = 0;
  ui.loadCurrent = () => {
    loads += 1;
  };

  ui.applyState({ now: ITEM, queue: [] }, Date.now());
  assert.equal(loads, 0);

  ui.applyTorrentGrant({
    infohash: INFOHASH,
    fileIndex: 0,
    grant: 'signed-token',
    expiresAtMs: Date.now() + 300_000,
  });

  assert.equal(ui.awaitingTorrentGrant, null);
  assert.equal(loads, 1, 'the grant resumes the waiting player');
});

test('a grant for another file or torrent never opens the gate', () => {
  const { ui } = makeUI({ grantReady: false });
  let loads = 0;
  ui.loadCurrent = () => {
    loads += 1;
  };

  ui.applyState({ now: ITEM, queue: [] }, Date.now());

  ui.applyTorrentGrant({ infohash: INFOHASH, fileIndex: 3, grant: 'other-file', expiresAtMs: Date.now() + 300_000 });
  assert.equal(loads, 0);
  assert.ok(ui.awaitingTorrentGrant);

  ui.applyTorrentGrant({ infohash: OTHER_INFOHASH, fileIndex: 0, grant: 'other-hash', expiresAtMs: Date.now() + 300_000 });
  assert.equal(loads, 0);
  assert.ok(ui.awaitingTorrentGrant);
});

test('with a usable grant the first stream URL is signed', () => {
  const { ui } = makeUI({ grantReady: true });
  const children = installMediaHost(ui);

  // startFileEngine builds its <video> through document.createElement; the
  // global exists only for this call so the UI constructor stays headless.
  globalThis.document = { createElement: () => fakeVideo() };
  try {
    ui.applyState({ now: ITEM, queue: [] }, Date.now());
  } finally {
    delete globalThis.document;
  }

  assert.equal(ui.awaitingTorrentGrant, null);
  assert.equal(children.length, 1, 'one media element after the gate opens');
  assert.match(children[0].src, /[?&]grant=signed-token/);
});

test('leaving the theater clears pending wait state and stored grants', () => {
  const { ui, net } = makeUI({ grantReady: false });
  ui.applyState({ now: ITEM, queue: [] }, Date.now());
  assert.ok(ui.awaitingTorrentGrant);

  ui.setRoomActive(false);

  assert.equal(ui.awaitingTorrentGrant, null);
  assert.equal(net.cleared, 1, 'grants are cleared on room deactivation');
});
