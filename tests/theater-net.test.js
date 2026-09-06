import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { createServer } from '../server/index.js';
import { Storage } from '../server/storage.js';
import { MSG_TYPES, ROOMS, parse, serialize } from '../shared/protocol.js';

// Chat relay binds its own TCP port; tests use an ephemeral one.
process.env.IRC_PORT = '0';

function tempPath(label) {
  return `/tmp/test-theater-net-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
}

async function waitFor(predicate, description, timeout = 5000, step = 25) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (predicate()) return;
    await new Promise(r => setTimeout(r, step));
  }
  assert.ok(predicate(), `Timed out waiting for: ${description}`);
}

async function listen(label) {
  const storage = new Storage(tempPath(label));
  const handle = createServer(storage);
  await new Promise(resolve => handle.server.listen(0, '127.0.0.1', resolve));
  return { handle, wsUrl: `ws://127.0.0.1:${handle.server.address().port}` };
}

/**
 * A minimal raw-socket theater patron: HELLOs on open (and optionally joins
 * a room right away, like a page that lands straight in the Orpheum),
 * records every message, and exposes small lookup helpers.
 */
function makeClient(wsUrl, guestId, nickname, autoJoinRoom = null) {
  const ws = new WebSocket(wsUrl);
  const client = { ws, guestId, inbox: [] };
  ws.on('message', data => client.inbox.push(parse(data)));
  ws.on('error', () => {});
  ws.on('open', () => {
    ws.send(serialize({ type: MSG_TYPES.HELLO, guestId, nickname }));
    if (autoJoinRoom) ws.send(serialize({ type: MSG_TYPES.JOIN_ROOM, roomId: autoJoinRoom }));
  });
  client.send = msg => ws.send(serialize(msg));
  client.joinTheater = () => ws.send(serialize({ type: MSG_TYPES.JOIN_ROOM, roomId: ROOMS.THEATER }));
  client.ofType = type => client.inbox.filter(m => m.type === type);
  client.last = type => client.inbox.filter(m => m.type === type).at(-1);
  client.states = () => client.ofType(MSG_TYPES.THEATER_STATE).map(m => m.theater);
  client.lastState = () => client.last(MSG_TYPES.THEATER_STATE)?.theater;
  client.close = () => { try { ws.close(); } catch {} };
  return client;
}

async function bootPair(label) {
  const { handle, wsUrl } = await listen(label);
  const a = makeClient(wsUrl, `guest_${label}_a`, 'ReelKeeper');
  const b = makeClient(wsUrl, `guest_${label}_b`, 'BalconyMouse');
  await Promise.all([
    waitFor(() => a.last(MSG_TYPES.WELCOME), 'client A welcomed'),
    waitFor(() => b.last(MSG_TYPES.WELCOME), 'client B welcomed'),
  ]);
  return { handle, a, b };
}

async function closeAll(handle, ...clients) {
  for (const c of clients) c.close();
  await new Promise(r => setTimeout(r, 50));
  handle.close();
}

test('queue, pause, and channel flips broadcast one shared state to the room', async () => {
  const { handle, a, b } = await bootPair('flow');
  try {
    a.joinTheater();
    b.joinTheater();
    await waitFor(() => a.lastState(), 'A join snapshot');
    await waitFor(() => b.lastState(), 'B join snapshot');
    assert.equal(a.lastState().now, null, 'the room starts idle');

    // A queues a direct file: idle screen -> it starts playing at once,
    // and BOTH A and B receive the new shared state.
    a.send({ type: MSG_TYPES.THEATER_QUEUE, op: 'add', url: 'https://example.com/a.mp4' });
    await waitFor(() => a.lastState()?.now, 'A sees playback start');
    await waitFor(() => b.lastState()?.now, 'B sees playback start');
    const nowA = a.lastState().now;
    assert.equal(nowA.kind, 'file');
    assert.ok(typeof nowA.title === 'string' && nowA.title.length > 0, 'a title is present');
    assert.deepEqual(b.lastState().now, nowA, 'both clients see the same now-playing');

    // A queues a second item while the screen is busy: it rides the queue.
    a.send({ type: MSG_TYPES.THEATER_QUEUE, op: 'add', url: 'https://example.com/b.mp4' });
    await waitFor(() => a.lastState()?.queue?.length === 1, 'second item queued');

    // B pauses from its own seat: A sees the shared clock freeze.
    b.send({ type: MSG_TYPES.THEATER_CONTROL, op: 'pause', itemId: nowA.id });
    await waitFor(() => a.lastState()?.now?.playing === false, 'A sees the pause');
    assert.equal(b.lastState().now.playing, false);

    // A flips to an IPTV channel: resolved URL shared, queue intact.
    a.send({ type: MSG_TYPES.THEATER_CHANNEL, url: 'https://example.com/live.m3u8', title: 'News' });
    await waitFor(() => a.lastState()?.now?.kind === 'hls', 'A sees the channel flip');
    const flipped = a.lastState();
    assert.equal(flipped.now.title, 'News');
    assert.equal(flipped.now.url, 'https://example.com/live.m3u8');
    assert.equal(flipped.queue.length, 1, 'queue survives the flip');
    assert.equal(flipped.queue[0].url, 'https://example.com/b.mp4');
    assert.equal(b.lastState().now.id, flipped.now.id, 'B flipped with the room');
  } finally {
    await closeAll(handle, a, b);
  }
});

test('a late joiner receives exactly one snapshot mid-playback', async () => {
  const { handle, wsUrl } = await listen('late');
  const a = makeClient(wsUrl, 'guest_late_a', 'Projectionist');
  try {
    await waitFor(() => a.last(MSG_TYPES.WELCOME), 'A welcomed');
    a.joinTheater();
    await waitFor(() => a.lastState(), 'A join snapshot');
    a.send({ type: MSG_TYPES.THEATER_QUEUE, op: 'add', url: 'https://example.com/feature.mp4' });
    await waitFor(() => a.lastState()?.now, 'feature playing');
    a.send({ type: MSG_TYPES.THEATER_QUEUE, op: 'add', url: 'https://example.com/trailer.mp4' });
    await waitFor(() => a.lastState()?.queue?.length === 1, 'trailer queued');
    const live = a.lastState();

    // C walks in mid-feature without sending any theater action.
    const c = makeClient(wsUrl, 'guest_late_c', 'Latecomer', ROOMS.THEATER);
    try {
      await waitFor(() => c.last(MSG_TYPES.WELCOME), 'C welcomed');
      await waitFor(() => c.lastState(), 'C join snapshot');
      const snap = c.lastState();
      assert.equal(snap.now.id, live.now.id, 'same item is playing for the latecomer');
      assert.equal(snap.now.playing, true);
      assert.deepEqual(snap.queue, live.queue, 'queue arrives intact');

      // Only the join snapshot: no duplicate THEATER_STATE follows.
      await new Promise(r => setTimeout(r, 250));
      assert.equal(c.ofType(MSG_TYPES.THEATER_STATE).length, 1, 'exactly one join-triggered snapshot');
    } finally {
      c.close();
    }
  } finally {
    await closeAll(handle, a);
  }
});

test('a rejected action errors only the sender and leaves the room state untouched', async () => {
  const { handle, a, b } = await bootPair('reject');
  try {
    a.joinTheater();
    b.joinTheater();
    await waitFor(() => a.lastState(), 'A join snapshot');
    await waitFor(() => b.lastState(), 'B join snapshot');
    a.send({ type: MSG_TYPES.THEATER_QUEUE, op: 'add', url: 'https://example.com/a.mp4' });
    await waitFor(() => b.lastState()?.now, 'feature playing');

    const bCount = b.ofType(MSG_TYPES.THEATER_STATE).length;
    const bSnapshot = b.lastState();

    a.send({ type: MSG_TYPES.THEATER_QUEUE, op: 'add', url: 'javascript:alert(1)' });
    await waitFor(() => a.last(MSG_TYPES.ERROR), 'A rejection error');
    assert.match(a.last(MSG_TYPES.ERROR).message, /projector/i);

    // B must not see any broadcast for the rejected action.
    await new Promise(r => setTimeout(r, 250));
    assert.equal(b.ofType(MSG_TYPES.THEATER_STATE).length, bCount, 'B sees no new theater state');
    assert.deepEqual(b.lastState(), bSnapshot, 'the shared state is unchanged');

    // The room still works: a skip on the untouched state idles the screen.
    const aCount = a.ofType(MSG_TYPES.THEATER_STATE).length;
    a.send({ type: MSG_TYPES.THEATER_QUEUE, op: 'skip' });
    await waitFor(() => a.ofType(MSG_TYPES.THEATER_STATE).length > aCount, 'skip broadcast');
    assert.equal(a.lastState().now, null, 'skip landed on the untouched single item');
    assert.equal(a.ofType(MSG_TYPES.ERROR).length, 1, 'the rejection was the only error');
  } finally {
    await closeAll(handle, a, b);
  }
});

test('the projector is unreachable from outside The Orpheum', async () => {
  const { handle, wsUrl } = await listen('guard');
  // D never leaves the default Market Court.
  const d = makeClient(wsUrl, 'guest_guard_d', 'LobbyLurker');
  try {
    await waitFor(() => d.last(MSG_TYPES.WELCOME), 'D welcomed');
    d.send({ type: MSG_TYPES.THEATER_QUEUE, op: 'add', url: 'https://example.com/x.mp4' });
    await waitFor(() => d.last(MSG_TYPES.ERROR), 'D guard error');
    assert.match(d.last(MSG_TYPES.ERROR).message, /Orpheum/);

    await new Promise(r => setTimeout(r, 150));
    assert.equal(d.ofType(MSG_TYPES.THEATER_STATE).length, 0, 'no theater state leaks outside the room');
  } finally {
    await closeAll(handle, d);
  }
});

test('the sitting flag rides the presence updates', async () => {
  const { handle, a, b } = await bootPair('sitting');
  try {
    a.joinTheater();
    b.joinTheater();
    await waitFor(() => a.lastState(), 'A join snapshot');
    await waitFor(() => b.lastState(), 'B join snapshot');

    // A settles into a seat; the 10 Hz batched presence broadcast carries it.
    a.send({ type: MSG_TYPES.MOVEMENT, x: 1, z: 1, rotY: 0, walking: false, sitting: true });
    await waitFor(() => b.ofType(MSG_TYPES.PRESENCE_UPDATE).some(m =>
      Array.isArray(m.players) &&
      m.players.some(p => p.id === a.guestId && p.sitting === true),
    ), 'B sees A seated');
  } finally {
    await closeAll(handle, a, b);
  }
});
