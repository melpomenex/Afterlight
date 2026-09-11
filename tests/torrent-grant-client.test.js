/**
 * NetworkClient torrent grant store + first-request gate helpers
 * (fix-torrent-playback-grant-regression, tasks 6.1/6.6).
 *
 * The real facade is constructed with stubbed browser globals (the pattern
 * from tests/transport-adapter.test.js); no transport is connected.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { NetworkClient } from '../src/net/client.js';
import { shouldApplyRoomFrame } from '../src/net/roomEpoch.js';

const INFOHASH = '08ada5a7a6183aae1e09d831df6748d566095a10';
const OTHER_INFOHASH = 'f'.repeat(40);
const ITEM = { kind: 'torrent', infohash: INFOHASH, fileIndex: 0 };

function stubGlobals() {
  globalThis.localStorage = {
    store: new Map(),
    getItem(k) {
      return this.store.has(k) ? this.store.get(k) : null;
    },
    setItem(k, v) {
      this.store.set(k, String(v));
    },
  };
}

function makeClient() {
  stubGlobals();
  const client = new NetworkClient('ws://127.0.0.1:3999/ws');
  client.scheduleReconnect = () => {};
  return client;
}

test('hasUsableTorrentGrant matches infohash + file and honors expiry skew', () => {
  const client = makeClient();
  client.storeTorrentGrant({ infohash: INFOHASH, fileIndex: 0, grant: 'tok', expiresAtMs: 100_000 });

  assert.equal(client.hasUsableTorrentGrant(ITEM, { nowMs: 50_000 }), true);
  assert.equal(client.hasUsableTorrentGrant(ITEM, { nowMs: 95_001 }), false, 'inside the default skew');
  assert.equal(client.hasUsableTorrentGrant(ITEM, { nowMs: 95_001, skewMs: 0 }), true, 'skew override');
  assert.equal(client.hasUsableTorrentGrant({ ...ITEM, fileIndex: 1 }, { nowMs: 50_000 }), false);
  assert.equal(client.hasUsableTorrentGrant({ ...ITEM, infohash: OTHER_INFOHASH }, { nowMs: 50_000 }), false);
  assert.equal(client.hasUsableTorrentGrant(ITEM, { nowMs: 150_000 }), false, 'expired');

  client.storeTorrentGrant({ infohash: INFOHASH, fileIndex: 0, grant: 'tok', expiresAtMs: null });
  assert.equal(client.hasUsableTorrentGrant(ITEM, { nowMs: 50_000 }), false, 'no expiry is not usable');
});

test('torrentStreamUrl carries the grant only when one is stored', () => {
  const client = makeClient();

  const unsigned = client.torrentStreamUrl(ITEM);
  assert.equal(unsigned, `http://127.0.0.1:3999/api/theater/torrent/${INFOHASH}/0`);
  assert.doesNotMatch(unsigned, /grant=/);

  client.storeTorrentGrant({ infohash: INFOHASH, fileIndex: 0, grant: 'signed-token', expiresAtMs: 9_999_999_999_999 });
  const signed = client.torrentStreamUrl(ITEM);
  assert.match(signed, /^http:\/\/127\.0\.0\.1:3999\/api\/theater\/torrent\//);
  assert.match(signed, /[?&]grant=signed-token/);
});

test('handleFrame stores a torrent_grant before dispatching handlers', () => {
  const client = makeClient();
  let seen = null;
  client.on('torrent_grant', (msg) => {
    seen = {
      canPlay: client.hasUsableTorrentGrant(ITEM, { nowMs: Date.now() }),
      grant: msg.grant,
    };
  });

  client.handleFrame({
    type: 'torrent_grant',
    infohash: INFOHASH,
    fileIndex: 0,
    grant: 'from-frame',
    expiresAtMs: Date.now() + 300_000,
  });

  assert.deepEqual(seen, { canPlay: true, grant: 'from-frame' });
});

test('clearTorrentGrants forgets every stored grant', () => {
  const client = makeClient();
  client.storeTorrentGrant({ infohash: INFOHASH, fileIndex: 0, grant: 'tok', expiresAtMs: Date.now() + 300_000 });
  assert.equal(client.hasUsableTorrentGrant(ITEM), true);

  client.clearTorrentGrants();
  assert.equal(client.hasUsableTorrentGrant(ITEM), false);
  assert.equal(client.torrentStreamUrl(ITEM).includes('grant='), false);
});

test('torrent_grant is room-scoped so a stale-room grant cannot apply', () => {
  const epochs = new Map();
  assert.equal(
    shouldApplyRoomFrame(epochs, 'market', { type: 'torrent_grant', roomId: 'theater' }),
    false,
  );
  assert.equal(
    shouldApplyRoomFrame(epochs, 'theater', { type: 'torrent_grant', roomId: 'theater' }),
    true,
  );
  assert.equal(
    shouldApplyRoomFrame(epochs, 'theater', { type: 'torrent_grant' }),
    true,
    'untagged legacy frames keep applying',
  );
});
