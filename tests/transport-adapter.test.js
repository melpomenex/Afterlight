import test from 'node:test';
import assert from 'node:assert/strict';
import { flatFrameFromChannelEvent } from '../src/net/phoenixClient.js';
import { NetworkClient } from '../src/net/client.js';

// -- phoenixClient: envelope unwrap -----------------------------------------

test('phoenix adapter: flattens channel events to {type, ...payload}', () => {
  assert.deepEqual(
    flatFrameFromChannelEvent('presence_update', { players: [{ id: 'a', x: 1 }], extra: true }),
    { type: 'presence_update', players: [{ id: 'a', x: 1 }], extra: true },
  );
  assert.deepEqual(flatFrameFromChannelEvent('pong', { t: 5 }), { type: 'pong', t: 5 });
});

test('phoenix adapter: drops phoenix bookkeeping events', () => {
  assert.equal(flatFrameFromChannelEvent('phoenix_reply', {}), null);
  assert.equal(flatFrameFromChannelEvent('phx_reply', {}), null);
  assert.equal(flatFrameFromChannelEvent('chan_reply_3', { status: 'ok' }), null);
  assert.equal(flatFrameFromChannelEvent(undefined, {}), null);
});

// -- facade semantics (node transport with a stubbed WebSocket) --------------

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  readyState = FakeWebSocket.CONNECTING;
  sent = [];
  constructor(url) {
    FakeWebSocket.instances.push(this);
  }
  send(data) {
    this.sent.push(JSON.parse(data));
  }
  close() {
    this.readyState = FakeWebSocket.CLOSED;
    if (this.onclose) this.onclose();
  }
  // Test helpers
  serverOpen() {
    this.readyState = FakeWebSocket.OPEN;
    if (this.onopen) this.onopen();
  }
  serverFrame(obj) {
    if (this.onmessage) this.onmessage({ data: JSON.stringify(obj) });
  }
  serverClose() {
    this.readyState = FakeWebSocket.CLOSED;
    if (this.onclose) this.onclose();
  }
}
FakeWebSocket.instances = [];

function stubWebSocket() {
  globalThis.WebSocket = FakeWebSocket;
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
  const client = new NetworkClient('ws://127.0.0.1:3999/ws');
  client.scheduleReconnect = () => {}; // never reconnect in unit tests
  return client;
}

test('facade: hello then desiredRoom replay on connect, in order', () => {
  stubWebSocket();
  const client = makeClient();
  client.desiredRoom = 'theater';
  client.connect();
  const ws = FakeWebSocket.instances.at(-1);
  ws.serverOpen();
  assert.deepEqual(ws.sent[0], { type: 'hello', guestId: client.guestId, nickname: client.nickname });
  assert.deepEqual(ws.sent[1], { type: 'join_room', roomId: 'theater' });
  assert.equal(client.connected, true);
});

test('facade: multiple handlers per type fire in registration order', () => {
  stubWebSocket();
  const client = makeClient();
  const order = [];
  client.on('welcome', () => order.push('first'));
  client.on('welcome', () => order.push('second'));
  client.connect();
  const ws = FakeWebSocket.instances.at(-1);
  ws.serverOpen();
  ws.serverFrame({ type: 'welcome', player: { id: 'x' } });
  assert.deepEqual(order, ['first', 'second']);
});

test('facade: send silently drops when transport closed', () => {
  stubWebSocket();
  const client = makeClient();
  client.send('emote', { emote: 'wave' }); // no socket yet
  client.connect();
  const ws = FakeWebSocket.instances.at(-1);
  ws.serverOpen();
  client.send('emote', { emote: 'wave' });
  assert.equal(ws.sent.filter((f) => f.type === 'emote').length, 1, 'drop while closed, deliver when open');
});

test('facade: movement throttle caps at ~80ms spacing', () => {
  stubWebSocket();
  const client = makeClient();
  client.connect();
  const ws = FakeWebSocket.instances.at(-1);
  ws.serverOpen();
  client.sendMovement(1, 2, 0, true);
  client.sendMovement(2, 3, 0, true); // within 80ms → dropped
  assert.equal(ws.sent.filter((f) => f.type === 'movement').length, 1);
  // Force the clock past the throttle window.
  const original = client.lastMovementSend;
  client.lastMovementSend = original - 81;
  client.sendMovement(3, 4, 0, true);
  assert.equal(ws.sent.filter((f) => f.type === 'movement').length, 2);
  assert.deepEqual(ws.sent.at(-1), { type: 'movement', x: 3, z: 4, rotY: 0, walking: true, sitting: false, airborne: false });
});

test('facade: close fires disconnect listeners and reconnect restores hello', () => {
  stubWebSocket();
  const client = makeClient();
  let disconnects = 0;
  let connects = 0;
  client.onDisconnect(() => disconnects++);
  client.onConnect(() => connects++);
  client.joinRoom('garden:whatever');
  client.connect();
  const first = FakeWebSocket.instances.at(-1);
  first.serverOpen();
  first.serverClose();
  assert.equal(disconnects, 1);
  assert.equal(client.connected, false);
  client.connect(); // what scheduleReconnect would do after backoff
  const second = FakeWebSocket.instances.at(-1);
  assert.notEqual(second, first, 'a fresh socket is created');
  second.serverOpen();
  assert.equal(connects, 2, 'one per open: initial + reconnect');
  assert.deepEqual(second.sent[0].type, 'hello', 'welcome path starts with hello after reconnect');
  assert.deepEqual(second.sent[1], { type: 'join_room', roomId: 'garden:whatever' }, 'desiredRoom replayed');
});
