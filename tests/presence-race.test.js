import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { createServer } from '../server/index.js';
import { Storage } from '../server/storage.js';
import { MSG_TYPES, ROOMS, parse, serialize } from '../shared/protocol.js';
import { NetworkClient } from '../src/net/client.js';

// Chat relay binds its own TCP port; tests use an ephemeral one.
process.env.IRC_PORT = '0';

// NetworkClient targets the browser's global WebSocket; supply the ws
// implementation when running on a Node build that does not ship one.
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = WebSocket;
}

const TRACKED_TYPES = [
  MSG_TYPES.WELCOME,
  MSG_TYPES.GARDEN_STATE,
  MSG_TYPES.PRESENCE_JOIN,
  MSG_TYPES.PRESENCE_LEAVE,
  MSG_TYPES.PRESENCE_UPDATE,
];

function recordMessages(client, inbox) {
  for (const type of TRACKED_TYPES) {
    client.on(type, (msg) => inbox.push(msg));
  }
}

function joinsFor(inbox, playerId) {
  return inbox.filter(m => m.type === MSG_TYPES.PRESENCE_JOIN && m.player?.id === playerId);
}

function seesPlayer(inbox, playerId) {
  return inbox.some(m =>
    m.type === MSG_TYPES.PRESENCE_UPDATE &&
    Array.isArray(m.players) &&
    m.players.some(p => p.id === playerId)
  );
}

function sawMovement(inbox, playerId, x) {
  return inbox.some(m =>
    m.type === MSG_TYPES.PRESENCE_UPDATE &&
    m.players.some(p => p.id === playerId && p.x === x)
  );
}

async function waitFor(predicate, description, timeout = 5000, step = 25) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (predicate()) return;
    await new Promise(r => setTimeout(r, step));
  }
  assert.ok(predicate(), `Timed out waiting for: ${description}`);
}

function stopReconnecting(client) {
  client.scheduleReconnect = () => {};
  if (client.reconnectTimer) {
    clearTimeout(client.reconnectTimer);
    client.reconnectTimer = null;
  }
}

async function listen(storage) {
  const handle = createServer(storage);
  await new Promise(resolve => handle.server.listen(0, '127.0.0.1', resolve));
  return { handle, wsUrl: `ws://127.0.0.1:${handle.server.address().port}` };
}

test('re-joining the current room does not duplicate presence joins', async () => {
  const storage = new Storage(`/tmp/test-presence-dup-${Date.now()}.json`);
  const { handle, wsUrl } = await listen(storage);

  // Client B behaves like an already-loaded page: a plain socket that only
  // says HELLO, so the server's default Market Court assignment covers it.
  const wsB = new WebSocket(wsUrl);
  const inboxB = [];
  wsB.on('message', data => inboxB.push(parse(data)));
  wsB.on('error', () => {});

  // Client C races a join to the default room before its socket opens —
  // the page-load sequence of setRoom() followed by connect().
  const clientC = new NetworkClient(wsUrl);
  clientC.guestId = 'guest_dup_c';
  const inboxC = [];
  recordMessages(clientC, inboxC);

  try {
    wsB.on('open', () => {
      wsB.send(serialize({ type: MSG_TYPES.HELLO, guestId: 'guest_dup_b', nickname: 'BridgeKeeper' }));
    });
    await waitFor(() => inboxB.some(m => m.type === MSG_TYPES.WELCOME), 'client B welcome');

    clientC.joinRoom(ROOMS.MARKET);
    clientC.connect();
    await waitFor(() => clientC.connected, 'client C connected');
    await waitFor(() => joinsFor(inboxB, 'guest_dup_c').length > 0, 'B sees C join market');
    await new Promise(r => setTimeout(r, 250)); // settle: any duplicate would arrive by now

    // The server-side default join plus the client replay are one logical
    // join: the room must not see two presence_join packets.
    assert.equal(joinsFor(inboxB, 'guest_dup_c').length, 1, 'no duplicate presence_join for C');

    // C ended up a member of the market room and learned B is there.
    await waitFor(() => seesPlayer(inboxC, 'guest_dup_b'), 'C sees B in market roster');

    // Movement is relayed to room members.
    clientC.sendMovement(2.5, 3.5, 0.2, true);
    await waitFor(() => sawMovement(inboxB, 'guest_dup_c', 2.5), 'B receives C movement');
  } finally {
    stopReconnecting(clientC);
    try { clientC.ws?.close(); } catch {}
    try { wsB.close(); } catch {}
    await new Promise(r => setTimeout(r, 50));
    handle.close();
  }
});

test('JOIN_ROOM racing the handshake still joins the requested room', async () => {
  const storage = new Storage(`/tmp/test-presence-race-${Date.now()}.json`);
  const { handle, wsUrl } = await listen(storage);
  const gardenRoom = ROOMS.gardenFor('guest_race_a');

  // Client B visits A's garden through a plain socket and settles there.
  const wsB = new WebSocket(wsUrl);
  const inboxB = [];
  wsB.on('message', data => inboxB.push(parse(data)));
  wsB.on('error', () => {});

  // Client C stays in the default Market Court.
  const wsC = new WebSocket(wsUrl);
  const inboxC = [];
  wsC.on('message', data => inboxC.push(parse(data)));
  wsC.on('error', () => {});

  // Client A reproduces the page-load race: it requests the garden room
  // while its socket does not exist yet, then connects.
  const clientA = new NetworkClient(wsUrl);
  clientA.guestId = 'guest_race_a';
  const inboxA = [];
  recordMessages(clientA, inboxA);

  try {
    wsB.on('open', () => {
      wsB.send(serialize({ type: MSG_TYPES.HELLO, guestId: 'guest_race_b', nickname: 'QuietLeek' }));
      wsB.send(serialize({ type: MSG_TYPES.JOIN_ROOM, roomId: gardenRoom }));
    });
    wsC.on('open', () => {
      wsC.send(serialize({ type: MSG_TYPES.HELLO, guestId: 'guest_race_c', nickname: 'CompostKing' }));
    });
    await waitFor(
      () => inboxB.some(m => m.type === MSG_TYPES.GARDEN_STATE && m.roomId === gardenRoom),
      'B settled in the garden room'
    );
    await waitFor(() => inboxC.some(m => m.type === MSG_TYPES.WELCOME), 'C connected');

    clientA.joinRoom(gardenRoom);
    clientA.connect();
    await waitFor(() => clientA.connected, 'client A connected');

    // The raced join reaches the server anyway: B, already in the garden,
    // sees A arrive. Without the onopen replay A would be stuck in the
    // default room and invisible to the garden.
    await waitFor(() => joinsFor(inboxB, 'guest_race_a').length > 0, 'B sees A join the garden');
    assert.equal(joinsFor(inboxB, 'guest_race_a').length, 1, 'exactly one presence_join for A');
    await waitFor(() => seesPlayer(inboxA, 'guest_race_b'), 'A sees B in the garden roster');

    // Presence is mutual and live in the requested room.
    clientA.sendMovement(-4.0, 2.0, 1.0, true);
    await waitFor(() => sawMovement(inboxB, 'guest_race_a', -4.0), 'B receives A movement');
    wsB.send(serialize({ type: MSG_TYPES.MOVEMENT, x: 3.0, z: -1.5, rotY: 0.3, walking: true }));
    await waitFor(() => sawMovement(inboxA, 'guest_race_b', 3.0), 'A receives B movement');

    // The market court does not overhear the garden, and vice versa.
    wsC.send(serialize({ type: MSG_TYPES.MOVEMENT, x: 1.0, z: 1.0, rotY: 0.0, walking: true }));
    await new Promise(r => setTimeout(r, 250)); // several 10 Hz broadcast ticks
    assert.ok(!sawMovement(inboxA, 'guest_race_c', 1.0), 'market movement does not reach the garden');
    assert.ok(!sawMovement(inboxB, 'guest_race_c', 1.0), 'market movement does not reach the garden');
    assert.ok(!sawMovement(inboxC, 'guest_race_a', -4.0), 'garden movement does not reach the market');
  } finally {
    stopReconnecting(clientA);
    try { clientA.ws?.close(); } catch {}
    try { wsB.close(); } catch {}
    try { wsC.close(); } catch {}
    await new Promise(r => setTimeout(r, 50));
    handle.close();
  }
});

test('joinRoom while disconnected re-binds the desired room and replays it on reconnect', async () => {
  // The travel runtime's retry path: the socket is down, the player (or an
  // automatic reconnect) lands in a DIFFERENT room than the one originally
  // joined. The facade must replay the newest desiredRoom, not the stale one.
  const storage = new Storage(`/tmp/test-presence-rebind-${Date.now()}.json`);
  const { handle, wsUrl } = await listen(storage);
  const gardenRoom = ROOMS.gardenFor('guest_rebind_a');

  // Client B waits in A's garden.
  const wsB = new WebSocket(wsUrl);
  const inboxB = [];
  wsB.on('message', data => inboxB.push(parse(data)));
  wsB.on('error', () => {});

  const clientA = new NetworkClient(wsUrl);
  clientA.guestId = 'guest_rebind_a';
  const inboxA = [];
  recordMessages(clientA, inboxA);

  try {
    wsB.on('open', () => {
      wsB.send(serialize({ type: MSG_TYPES.HELLO, guestId: 'guest_rebind_b', nickname: 'RebindWatch' }));
      wsB.send(serialize({ type: MSG_TYPES.JOIN_ROOM, roomId: gardenRoom }));
    });
    await waitFor(() => inboxB.some(m => m.type === MSG_TYPES.WELCOME), 'B connected');

    // A joins the market, then loses the socket before ever being seen.
    clientA.joinRoom(ROOMS.MARKET);
    clientA.connect();
    await waitFor(() => clientA.connected, 'A connected to market');
    // Drop the socket; the client schedules its own reconnect.
    clientA.ws.close();
    await waitFor(() => !clientA.connected, 'A disconnected');

    // While disconnected, travel re-binds the desired room to the garden.
    clientA.joinRoom(gardenRoom);
    await waitFor(() => clientA.connected, 'A reconnected', 8000);

    // The replayed JOIN_ROOM carried the garden, not the stale market.
    await waitFor(() => joinsFor(inboxB, 'guest_rebind_a').length === 1, 'B sees A join the garden exactly once', 8000);
    await waitFor(() => seesPlayer(inboxA, 'guest_rebind_b'), 'A sees the garden roster', 8000);
    assert.ok(
      !inboxB.some(m => m.type === MSG_TYPES.PRESENCE_JOIN && m.player?.id === 'guest_rebind_a' && m.roomId === ROOMS.MARKET),
      'no stale market join was replayed',
    );
  } finally {
    stopReconnecting(clientA);
    try { clientA.ws?.close(); } catch {}
    try { wsB.close(); } catch {}
    await new Promise(r => setTimeout(r, 50));
    handle.close();
  }
});

test('reconnect restores room membership and presence flow without a reload', async () => {
  const storage = new Storage(`/tmp/test-presence-reconnect-${Date.now()}.json`);
  const { handle, wsUrl } = await listen(storage);
  const gardenRoom = ROOMS.gardenFor('guest_rec_a');

  // Client A races its garden join before the socket opens, like a fresh page.
  const clientA = new NetworkClient(wsUrl);
  clientA.guestId = 'guest_rec_a';
  const inboxA = [];
  recordMessages(clientA, inboxA);
  clientA.joinRoom(gardenRoom);
  clientA.connect();
  await waitFor(() => clientA.connected, 'client A connected');

  // Client B visits the same room through a plain socket.
  const wsB = new WebSocket(wsUrl);
  const inboxB = [];
  wsB.on('message', data => inboxB.push(parse(data)));
  wsB.on('error', () => {});

  try {
    wsB.on('open', () => {
      wsB.send(serialize({ type: MSG_TYPES.HELLO, guestId: 'guest_rec_b', nickname: 'FernWatcher' }));
      wsB.send(serialize({ type: MSG_TYPES.JOIN_ROOM, roomId: gardenRoom }));
    });
    await waitFor(() => joinsFor(inboxA, 'guest_rec_b').length > 0, 'A sees B join garden');
    await waitFor(() => seesPlayer(inboxB, 'guest_rec_a'), 'B sees A in garden roster');

    // Drop A's connection; the client must reconnect and re-join on its own.
    clientA.ws.close();
    await waitFor(
      () => inboxB.some(m => m.type === MSG_TYPES.PRESENCE_LEAVE && m.playerId === 'guest_rec_a'),
      'B sees A leave after the drop'
    );

    // Default retry delay is ~1s; the replayed JOIN_ROOM restores membership.
    await waitFor(() => clientA.connected, 'A reconnected', 8000);
    await waitFor(() => joinsFor(inboxB, 'guest_rec_a').length === 1, 'B sees A rejoin exactly once', 8000);
    await waitFor(() => seesPlayer(inboxA, 'guest_rec_b'), 'A sees refreshed garden roster', 8000);

    // Presence flow is functional again.
    clientA.sendMovement(2.0, 5.0, 0.0, true);
    await waitFor(() => sawMovement(inboxB, 'guest_rec_a', 2.0), 'movement relayed after reconnect', 8000);
  } finally {
    stopReconnecting(clientA);
    try { clientA.ws?.close(); } catch {}
    try { wsB.close(); } catch {}
    await new Promise(r => setTimeout(r, 50));
    handle.close();
  }
});
