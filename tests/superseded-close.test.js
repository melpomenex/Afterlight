import test from 'node:test';
import assert from 'node:assert/strict';
import { flatFrameFromChannelEvent } from '../src/net/phoenixClient.js';
import { NetworkClient } from '../src/net/client.js';

// Terminal supersession close (add-world-room-runtime, Duplicate-connect
// resolution): `error {message: "superseded"}` is a TERMINAL close reason —
// the losing transport's facade must stop retrying entirely, because a
// reconnect would make two live tabs (or an adversarial guestId holder)
// evict each other forever. Any OTHER error or close stays retryable.

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

function stubBrowserGlobals() {
  FakeWebSocket.instances = []; // per-test socket accounting
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

// The facade keeps its REAL scheduleReconnect here: the whole point is
// whether the reconnect timer gets armed or not.
function makeClient() {
  return new NetworkClient('ws://127.0.0.1:3999/ws');
}

function clearReconnectTimer(client) {
  if (client.reconnectTimer) {
    clearTimeout(client.reconnectTimer);
    client.reconnectTimer = null;
  }
}

test('phoenix adapter: the error event is game traffic — superseded reaches the facade handler', () => {
  // The gateway pushes the terminal close reason as event "error" with
  // {message: "superseded"}; the envelope unwrap must flatten it exactly
  // like a Node frame (it is NOT phoenix bookkeeping).
  assert.deepEqual(flatFrameFromChannelEvent('error', { message: 'superseded' }), {
    type: 'error',
    message: 'superseded',
  });
  // Other relayed errors surface the same way.
  assert.deepEqual(flatFrameFromChannelEvent('error', { message: 'relay_down' }), {
    type: 'error',
    message: 'relay_down',
  });
});

test('facade: superseded error sets the terminal flag before handlers and stops reconnection', async () => {
  stubBrowserGlobals();
  const client = makeClient();
  const seen = [];
  client.on('error', (msg) => seen.push(msg.message));

  client.connect();
  const ws = FakeWebSocket.instances.at(-1);
  ws.serverOpen();

  // What the gateway sends to the losing transport of a duplicate-connect
  // race, in order: the error push, then the socket close.
  ws.serverFrame({ type: 'error', message: 'superseded' });
  ws.serverClose();

  // The flag was set when the frame arrived (before the close), and the
  // handler still saw the frame (client surfaces it to the game UI too).
  assert.equal(client.superseded, true);
  assert.deepEqual(seen, ['superseded']);
  assert.equal(client.connected, false);

  // The close path ran, but NO reconnect timer was armed: reconnecting
  // would fight the winner forever (spec: Supersession cannot loop).
  assert.equal(client.reconnectTimer, null, 'no reconnect after a superseded close');
  await new Promise((r) => setTimeout(r, 150)); // longer than the smallest retry delay start
  assert.equal(FakeWebSocket.instances.length, 1, 'no new socket was created');
});

test('facade: a superseded transport stays dead even when close handlers re-fire', () => {
  stubBrowserGlobals();
  const client = makeClient();
  client.connect();
  const ws = FakeWebSocket.instances.at(-1);
  ws.serverOpen();
  ws.serverFrame({ type: 'error', message: 'superseded' });

  // Phoenix transport teardown also drives handleClose (socket.onClose ->
  // wasJoined -> client.handleClose); a deliberate or late close must not
  // sneak a retry past the terminal flag.
  client.handleClose();
  client.handleClose();
  assert.equal(client.reconnectTimer, null);

  // Even the facade's own connect path refuses to resurrect the session.
  client.connect();
  assert.equal(FakeWebSocket.instances.length, 1, 'connect() does not reopen a superseded transport');
});

test('facade: other errors and ordinary closes still reconnect as before', async () => {
  stubBrowserGlobals();
  const client = makeClient();
  client.connect();
  const ws = FakeWebSocket.instances.at(-1);
  ws.serverOpen();

  // A retryable error (relay_down from the gateway proxy) then close: the
  // standard auto-reconnect must still arm.
  ws.serverFrame({ type: 'error', message: 'relay_down' });
  ws.serverClose();
  assert.notEqual(client.reconnectTimer, null, 'retryable close still schedules a reconnect');
  assert.equal(client.superseded, false);
  clearReconnectTimer(client);

  // A silent drop (no error frame at all) reconnects too.
  client.connect();
  const second = FakeWebSocket.instances.at(-1);
  second.serverOpen();
  second.serverClose();
  assert.notEqual(client.reconnectTimer, null, 'plain drop still schedules a reconnect');
  clearReconnectTimer(client);
});
