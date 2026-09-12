import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { createServer } from '../server/index.js';
import { Storage } from '../server/storage.js';
import { MSG_TYPES, ROOMS, parse, serialize } from '../shared/protocol.js';
import {
  generateDefaultNickname,
  sanitizeNickname,
  resolveDuplicateNickname,
} from '../shared/identity.js';

// Chat relay binds its own TCP port; tests use an ephemeral one.
process.env.IRC_PORT = '0';

test('nickname generation, sanitization, and duplicate resolution', () => {
  const nick = generateDefaultNickname();
  assert.ok(nick.length >= 6);

  // Sanitization strips HTML and control characters
  const dirty = '<script>alert("hack")</script><b>Copper</b>\x00\x1b';
  const clean = sanitizeNickname(dirty);
  assert.ok(!clean.includes('<'));
  assert.ok(!clean.includes('>'));
  assert.ok(!clean.includes('\x00'));

  // Length capping
  const longNick = 'SuperExtraLongNicknameForTheSleepyCityThatIsTooLong';
  assert.ok(sanitizeNickname(longNick).length <= 20);

  // Duplicate resolution
  const active = new Set(['copperlantern42']);
  const unique = resolveDuplicateNickname('CopperLantern42', active);
  assert.notEqual(unique.toLowerCase(), 'copperlantern42');
  assert.ok(unique.startsWith('CopperLantern42'));
});

test('default nicknames use industrial word banks with no gardening terms', () => {
  const GARDENING_TERMS = /radish|turnip|basil|leek|carrot|kale|tomato|berry|sorrel|chive|sprout|fennel|parsnip|pepper|clover|borage|sage|mint|beet|chard|mossy|fern|bramble|thistle|dewy|hedge|orchard|verdant|garden|grow|crop|seed/i;
  const seen = new Set();
  for (let i = 0; i < 250; i += 1) {
    const name = generateDefaultNickname(i / 250);
    seen.add(name);
    assert.doesNotMatch(name, GARDENING_TERMS, `nickname ${name} contains a gardening term`);
  }
  assert.ok(seen.size > 100, 'seeded generation covers a broad slice of the word banks');
});

test('multiplayer server presence, room partitioning, and movement', async () => {
  // Use custom in-memory-like storage with temp path
  const tempPath = `/tmp/test-game-state-${Date.now()}.json`;
  const storage = new Storage(tempPath);
  const { server, close } = createServer(storage);

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const wsUrl = `ws://127.0.0.1:${port}`;

  function createClient(guestId, nickname) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      const messages = [];
      ws.on('message', data => messages.push(parse(data)));
      ws.on('open', () => {
        ws.send(serialize({ type: MSG_TYPES.HELLO, guestId, nickname }));
      });
      const checkWelcome = setInterval(() => {
        const welcome = messages.find(m => m.type === MSG_TYPES.WELCOME);
        if (welcome) {
          clearInterval(checkWelcome);
          resolve({ ws, messages, player: welcome.player });
        }
      }, 20);
      ws.on('error', reject);
    });
  }

  // 1. Client A joins
  let clientA, clientB, clientA2;
  try {
    clientA = await createClient('guest_A', 'QuietLantern');
    assert.equal(clientA.player.nickname, 'QuietLantern');

    // 2. Client B joins
    clientB = await createClient('guest_B', 'SignalKeeper');
    assert.equal(clientB.player.nickname, 'SignalKeeper');

    // Allow a moment for presence messages
    await new Promise(r => setTimeout(r, 150));

    // Client A should see Client B's join
    const bJoinMsg = clientA.messages.find(m => m.type === MSG_TYPES.PRESENCE_JOIN && m.player.id === 'guest_B');
    assert.ok(bJoinMsg, 'Client A received presence_join for Client B');

  // 3. Client A moves
  clientA.ws.send(serialize({
    type: MSG_TYPES.MOVEMENT,
    x: 4.5,
    z: -2.0,
    rotY: 1.2,
    walking: true,
  }));

  // Wait for 10 Hz broadcast
  await new Promise(r => setTimeout(r, 200));

  const movementMsg = clientB.messages.findLast(m => m.type === MSG_TYPES.PRESENCE_UPDATE && m.players.some(p => p.id === 'guest_A' && p.x === 4.5));
  assert.ok(movementMsg, 'Client B received presence_update for Client A movement');
  const pA = movementMsg.players.find(p => p.id === 'guest_A');
  assert.equal(pA.x, 4.5);
  assert.equal(pA.z, -2.0);

  // 4. Client A travels to a retained public district room
  clientA.ws.send(serialize({
    type: MSG_TYPES.JOIN_ROOM,
    roomId: 'foundry',
  }));

  await new Promise(r => setTimeout(r, 150));

  // Client B receives Client A's leave from Market
  const leaveMsg = clientB.messages.find(m => m.type === MSG_TYPES.PRESENCE_LEAVE && m.playerId === 'guest_A');
  assert.ok(leaveMsg, 'Client B received presence_leave when Client A switched rooms');

  // 5. Client A disconnects and reconnects with same guest token
  clientA.ws.close();
  await new Promise(r => setTimeout(r, 100));

  const clientA2 = await createClient('guest_A', 'QuietLantern');
  assert.equal(clientA2.player.id, 'guest_A', 'Reconnection preserves player ID');
  assert.equal(clientA2.player.nickname, 'QuietLantern', 'Reconnection preserves nickname');

    clientA2.ws.close();
    clientB.ws.close();
  } finally {
    try { clientA?.ws.close(); } catch {}
    try { clientB?.ws.close(); } catch {}
    try { clientA2?.ws.close(); } catch {}
    close();
  }
});
