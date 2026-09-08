// Gate 2.4: P2/P3 field convergence — JS encoder matches landed Phoenix BinaryFlush.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { encodeFlush } from '../../shared/realtime/nodeBinaryFlush.js';
import { MAGIC, HEADER_SIZE } from '../../shared/realtime/constants.js';
import { binaryBufferFromEnvelope, flatFrameFromChannelEvent } from '../../src/net/phoenixClient.js';
import { NetworkClient } from '../../src/net/client.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('gate 2.4: compat-report documents landed rt_binary path', () => {
  const md = readFileSync(path.join(REPO, 'docs/architecture/realtime/compat-report.md'), 'utf8');
  assert.match(md, /rt_binary|server_tick|frame_sequence/i, 'post-P2/P3 convergence section present');
  assert.match(md, /room_epoch.*0|P9/i, 'epoch fencing deferred');
});

test('gate 2.4: encodeFlush header fields match contract layout', () => {
  const bin = encodeFlush([
    { id: 'guest_a', x: 0, z: 0, rotY: 0 },
    { id: 'guest_b', x: 1, z: 2, rotY: 0.25, sitting: true },
  ], 10, 7);
  const v = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  assert.equal(v.getUint32(0, true), MAGIC);
  assert.ok(bin.length > HEADER_SIZE);
  assert.equal(v.getUint32(8, true), 0); // room_epoch
  assert.equal(v.getUint32(12, true), 10); // server_tick
  assert.equal(v.getUint32(16, true), 7); // frame_sequence
  assert.equal(v.getUint32(20, true), 6); // baseline_sequence
});

// -- task 3.2 (add-social-place-framework D3): the gateway's outer
//    rt_binary envelope carries an additive roomId; queued old-room
//    envelopes are rejected BEFORE binary consumption and the SoA bytes
//    above are untouched.

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  readyState = FakeWebSocket.CONNECTING;
  sent = [];
  constructor(url) { FakeWebSocket.instances.push(this); }
  send(data) { this.sent.push(JSON.parse(data)); }
  close() { this.readyState = FakeWebSocket.CLOSED; if (this.onclose) this.onclose(); }
  serverOpen() { this.readyState = FakeWebSocket.OPEN; if (this.onopen) this.onopen(); }
  serverFrame(obj) { if (this.onmessage) this.onmessage({ data: JSON.stringify(obj) }); }
  serverBinary(bytes) { if (this.onmessage) this.onmessage({ data: bytes }); }
  serverClose() { this.readyState = FakeWebSocket.CLOSED; if (this.onclose) this.onclose(); }
}
FakeWebSocket.instances = [];

function stubGlobals() {
  // Patched globals must be restored: this file is imported by
  // tests/realtime.test.js together with wiring.test.js in ONE process,
  // and a leaked fake WebSocket would silently break the wiring suites'
  // real NetworkClient connections.
  if (!stubGlobals.original) {
    stubGlobals.original = {
      WebSocket: globalThis.WebSocket,
      localStorage: globalThis.localStorage,
    };
  }
  globalThis.WebSocket = FakeWebSocket;
  globalThis.localStorage = { store: new Map(), getItem(k) { return this.store.get(k) ?? null; }, setItem(k, v) { this.store.set(k, String(v)); } };
}

function restoreGlobals() {
  const original = stubGlobals.original;
  if (!original) return;
  globalThis.WebSocket = original.WebSocket;
  globalThis.localStorage = original.localStorage;
  stubGlobals.original = null;
}

function makeClient() {
  stubGlobals();
  const client = new NetworkClient('ws://127.0.0.1:3999/ws');
  client.scheduleReconnect = () => {}; // never reconnect in unit tests
  return client;
}

test('queued old-room JSON frames after travel are dropped; the new room flows', () => {
  const client = makeClient();
  const seen = [];
  client.on('presence_update', (m) => seen.push(m));
  client.on('emote_broadcast', (m) => seen.push(m));

  client.joinRoom('market');
  client.connect();
  const ws = FakeWebSocket.instances.at(-1);
  ws.serverOpen();

  // Travel A→B re-points desiredRoom; old-room frames sit queued behind it.
  client.joinRoom('theater');
  ws.serverFrame({ type: 'presence_update', roomId: 'market', epoch: 99, players: [{ id: 'ghost' }] });
  ws.serverFrame({ type: 'emote_broadcast', roomId: 'market', epoch: 99, playerId: 'ghost', emote: 'wave' });
  ws.serverFrame({ type: 'presence_update', roomId: 'theater', epoch: 1, players: [{ id: 'friend' }] });

  assert.deepEqual(seen, [
    { type: 'presence_update', roomId: 'theater', epoch: 1, players: [{ id: 'friend' }] },
  ], 'only the destination roster reached the handlers');
  assert.equal(client.roomEpochs.get('theater'), 1);
  assert.equal(client.roomEpochs.get('market'), undefined, 'wrong-room high epoch never poisoned any key');
  restoreGlobals();
});

test('normal roster and reconnect: epochs survive, hello + desiredRoom replay', () => {
  const client = makeClient();
  client.joinRoom('theater');
  client.connect();
  const ws = FakeWebSocket.instances.at(-1);
  ws.serverOpen();
  ws.serverFrame({ type: 'presence_update', roomId: 'theater', epoch: 4, players: [] });
  assert.equal(client.roomEpochs.get('theater'), 4);

  ws.serverClose();
  client.connect();
  const re = FakeWebSocket.instances.at(-1);
  re.serverOpen();
  assert.deepEqual(re.sent[0].type, 'hello');
  assert.deepEqual(re.sent[1], { type: 'join_room', roomId: 'theater' });

  // Stale lower epoch after reconnect still discarded; higher applies.
  re.serverFrame({ type: 'presence_update', roomId: 'theater', epoch: 3, players: [] });
  re.serverFrame({ type: 'presence_update', roomId: 'theater', epoch: 5, players: [] });
  assert.equal(client.roomEpochs.get('theater'), 5);
  restoreGlobals();
});

test('binary envelope: wrong-room rejected before consumption, matching and untagged decode', () => {
  const b64 = (bin) => Buffer.from(bin).toString('base64');
  const payload = b64(encodeFlush([{ id: 'guest_a', x: 1, z: 2, rotY: 0 }], 10, 7));

  // Queued old-room envelope: rejected before binary consumption.
  assert.equal(binaryBufferFromEnvelope({ data: payload, roomId: 'market' }, 'theater'), null);

  // Matching room decodes to an ArrayBuffer that still parses as SoA v1.
  const buffer = binaryBufferFromEnvelope({ data: payload, roomId: 'theater' }, 'theater');
  assert.ok(buffer instanceof ArrayBuffer);
  const v = new DataView(buffer);
  assert.equal(v.getUint32(0, true), MAGIC, 'SoA payload format untouched');

  // Untagged legacy envelope (old server): decodes exactly as before.
  const legacy = binaryBufferFromEnvelope({ data: payload }, 'theater');
  assert.ok(legacy instanceof ArrayBuffer);
  assert.equal(new DataView(legacy).getUint32(0, true), MAGIC);

  // Malformed envelopes never decode.
  assert.equal(binaryBufferFromEnvelope(null, 'theater'), null);
  assert.equal(binaryBufferFromEnvelope({ data: 42 }, 'theater'), null);

  // The channel event flattening still passes the additive tag through to
  // the room filter for JSON frames.
  assert.deepEqual(flatFrameFromChannelEvent('rt_binary', { tick: 1, data: payload, roomId: 'theater' }).roomId, 'theater');
});
