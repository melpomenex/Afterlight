import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { WebSocket } from 'ws';

// Chat relay binds its own TCP port; tests use an ephemeral one.
process.env.IRC_PORT = '0';

import { createServer } from '../server/index.js';
import { IrcServer } from '../server/irc.js';
import { Storage } from '../server/storage.js';
import { MSG_TYPES, parse, serialize } from '../shared/protocol.js';

if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = WebSocket;
}

// --- helpers -----------------------------------------------------------------

async function waitFor(predicate, description, timeout = 5000, step = 25) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (predicate()) return;
    await new Promise(r => setTimeout(r, step));
  }
  assert.ok(predicate(), `Timed out waiting for: ${description}`);
}

async function listen({ ircDisabled = false } = {}) {
  const previous = process.env.IRC_DISABLED;
  if (ircDisabled) process.env.IRC_DISABLED = '1';
  const handle = createServer(new Storage(`/tmp/test-irc-chat-${Date.now()}-${Math.random().toString(36).slice(2)}.json`));
  if (ircDisabled) {
    if (previous === undefined) delete process.env.IRC_DISABLED;
    else process.env.IRC_DISABLED = previous;
  } else {
    assert.ok(handle.irc.enabled, 'IRC relay should be enabled by default');
    const port = await handle.irc.ready;
    assert.ok(Number.isFinite(port) && port > 0, 'IRC relay bound an ephemeral port');
  }
  await new Promise(resolve => handle.server.listen(0, '127.0.0.1', resolve));
  return {
    handle,
    wsUrl: `ws://127.0.0.1:${handle.server.address().port}`,
    ircPort: handle.irc.boundPort,
  };
}

/** Minimal scripted IRC client over a real TCP socket. */
function ircClient(port, { floodLines = false } = {}) {
  const sock = net.connect(port, '127.0.0.1');
  sock.setEncoding('utf8');
  const lines = [];
  sock.lines = lines; // exposed for assertions on already-received traffic
  let buffer = '';
  const waiters = [];
  sock.on('data', (chunk) => {
    buffer += chunk;
    let idx;
    while ((idx = buffer.indexOf('\r\n')) >= 0) {
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      lines.push(line);
      for (let i = waiters.length - 1; i >= 0; i--) {
        if (waiters[i].pred(line)) {
          const w = waiters.splice(i, 1)[0];
          clearTimeout(w.timer);
          w.resolve(line);
        }
      }
    }
  });
  sock.on('error', () => {});
  sock.waitFor = (needle, timeout = 5000) => {
    const found = lines.find(l => l.includes(needle));
    if (found) return Promise.resolve(found);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timeout waiting for "${needle}"`)), timeout);
      waiters.push({ pred: l => l.includes(needle), resolve, timer });
    });
  };
  sock.send = (...outLines) => sock.write(floodLines ? outLines.join('\n') + '\n' : outLines.join('\r\n') + '\r\n');
  return sock;
}

async function gamePlayer(wsUrl, guestId, nickname) {
  const ws = new WebSocket(wsUrl);
  const inbox = [];
  ws.on('message', (data) => inbox.push(parse(data)));
  ws.on('error', () => {});
  await new Promise((resolve) => ws.on('open', resolve));
  ws.send(serialize({ type: MSG_TYPES.HELLO, guestId, nickname }));
  await waitFor(() => inbox.some(m => m.type === MSG_TYPES.WELCOME), `${guestId} welcome`);
  await waitFor(() => inbox.some(m => m.type === MSG_TYPES.CHAT_HISTORY), `${guestId} chat history`);
  const sendChat = (text) => ws.send(serialize({ type: MSG_TYPES.CHAT_SEND, text }));
  return { ws, inbox, sendChat, nickname };
}

function messages(inbox, type) {
  return inbox.filter(m => m.type === type);
}

function closeIrc(sock) {
  try { sock.end(); } catch {}
}

// --- IRC server core (raw TCP) -------------------------------------------------

test('IRC registration, collision, and pre-registration rejection', async () => {
  const { handle, ircPort } = await listen();
  const a = ircClient(ircPort);
  try {
    a.send('NICK MossyRadish', 'USER mossy 0 * :Mossy Radish');
    await a.waitFor(' 001 ');
    await a.waitFor(' 004 ');
    assert.ok(linesInclude(a, 'MossyRadish'), 'welcome carries the nickname');

    // Pre-registration commands are rejected with 451, connection stays.
    const b = ircClient(ircPort);
    b.send('PRIVMSG #afterlight :hello?');
    await b.waitFor(' 451 ');
    b.send('NICK MossyRadish', 'USER b 0 * :Second'); // collision with a
    await b.waitFor(' 433 ');
    b.send('NICK QuietLeek', 'USER b 0 * :Second');
    await b.waitFor(' 001 ');
    closeIrc(b);
  } finally {
    closeIrc(a);
    handle.close();
  }
});

test('JOIN delivers topic and names; members see joins and parts', async () => {
  const { handle, ircPort } = await listen();
  const a = ircClient(ircPort);
  const b = ircClient(ircPort);
  try {
    a.send('NICK FirstFan', 'USER a 0 * :A');
    await a.waitFor(' 001 ');
    b.send('NICK SecondFan', 'USER b 0 * :B');
    await b.waitFor(' 001 ');

    a.send('JOIN #afterlight');
    await a.waitFor(' 332 '); // topic
    await a.waitFor(' 353 '); // names
    await a.waitFor(' 366 '); // end of names

    b.send('JOIN #afterlight');
    await b.waitFor(' 353 ');
    assert.ok(linesInclude(b, 'JOIN #afterlight'), 'joiner sees their own JOIN line');
    await a.waitFor(':SecondFan!b@'); // announcement to the existing member
  } finally {
    closeIrc(a);
    closeIrc(b);
    handle.close();
  }
});

test('PRIVMSG fans out to the channel but never echoes the sender', async () => {
  const { handle, ircPort } = await listen();
  const a = ircClient(ircPort);
  const b = ircClient(ircPort);
  try {
    a.send('NICK ChanA', 'USER a 0 * :A', 'JOIN #afterlight');
    b.send('NICK ChanB', 'USER b 0 * :B', 'JOIN #afterlight');
    await a.waitFor(':ChanB!b@');
    await b.waitFor(' 366 ');

    a.send('PRIVMSG #afterlight :the mill turns again');
    await b.waitFor('PRIVMSG #afterlight :the mill turns again');
    await new Promise(r => setTimeout(r, 150));
    assert.ok(!linesInclude(a, 'the mill turns again'), 'sender receives no echo of their own line');

    // Direct message reaches only the target.
    a.send('PRIVMSG ChanB :psst, secretly');
    await b.waitFor('PRIVMSG ChanB :psst, secretly');

    // Errors without killing the connection.
    a.send('PRIVMSG');
    await a.waitFor(' 411 ');
    a.send('PRIVMSG NobodyHere :echo?');
    await a.waitFor(' 401 ');
    a.send('FLYINGCARPET now');
    await a.waitFor(' 421 ');
  } finally {
    closeIrc(a);
    closeIrc(b);
    handle.close();
  }
});

test('garbage and over-long input do not break the server', async () => {
  const { handle, ircPort } = await listen();
  const a = ircClient(ircPort);
  try {
    a.send('NICK SturdySock', 'USER a 0 * :A');
    await a.waitFor(' 001 ');
    a.send('\u0000\u0001\u0002 garbage !!!');
    a.send(`PRIVMSG #afterlight :${'x'.repeat(2000)}`);
    a.send('JOIN #afterlight');
    await a.waitFor(' 366 ');
    assert.ok(true, 'connection survived malformed and oversized lines');
  } finally {
    closeIrc(a);
    handle.close();
  }
});

test('idle connections are pinged and dead ones reaped', async () => {
  const irc = new IrcServer({
    port: 0,
    pingIntervalMs: 40,
    idlePingAfterMs: 60,
    pingTimeoutMs: 60,
  });
  const port = await irc.ready;
  const sock = ircClient(port);
  sock.send('NICK SleepyBot', 'USER b 0 * :B');
  await sock.waitFor(' 001 ');
  await sock.waitFor(`PING `);
  // Never answer the ping: the server must reap the connection.
  await waitFor(() => sock.destroyed || sock.readyState === 'closed', 'dead client reaped', 4000);
  irc.close();
});

test('OPER authenticates with the configured credentials only', async () => {
  const irc = new IrcServer({ port: 0, operName: 'warden', operPass: 'lantern' });
  const port = await irc.ready;
  const a = ircClient(port);
  try {
    a.send('NICK Warden1', 'USER w 0 * :W');
    await a.waitFor(' 001 ');
    a.send('OPER warden wrongpass');
    await a.waitFor(' 464 ');
    a.send('OPER warden lantern');
    await a.waitFor(' 381 ');
  } finally {
    closeIrc(a);
    irc.close();
  }
});

// --- Bridge: game <-> IRC -------------------------------------------------------

test('players and IRC clients share the channel both directions', async () => {
  const { handle, wsUrl, ircPort } = await listen();
  try {
    const bot = ircClient(ircPort);
    bot.send('NICK KilnBot', 'USER bot 0 * :Kiln Bot', 'JOIN #afterlight');
    await bot.waitFor(' 366 ');

    const p1 = await gamePlayer(wsUrl, 'guest_chat_a', 'MossyRadish42');
    // The player must appear on IRC under their game nickname.
    await bot.waitFor(':MossyRadish42!gardener@afterlight JOIN');

    // Game -> IRC.
    p1.sendChat('the mill is restored!');
    await bot.waitFor('PRIVMSG #afterlight :the mill is restored!');

    // IRC -> Game, attributed to the IRC nickname.
    bot.send('PRIVMSG #afterlight :bots online and listening');
    await waitFor(() => messages(p1.inbox, MSG_TYPES.CHAT_MESSAGE)
      .some(m => m.from === 'KilnBot' && m.fromKind === 'irc' && /bots online/.test(m.text)),
      'IRC message reaches the player');

    // /me arrives as an action line, not raw CTCP.
    bot.send('PRIVMSG #afterlight :\u0001ACTION polishes a lantern\u0001');
    await waitFor(() => messages(p1.inbox, MSG_TYPES.CHAT_MESSAGE)
      .some(m => m.from === 'KilnBot' && m.action && /lantern/.test(m.text)),
      'CTCP ACTION becomes an action message');

    // The sender sees their own message exactly once (echo via broadcast).
    await waitFor(() => messages(p1.inbox, MSG_TYPES.CHAT_MESSAGE)
      .filter(m => m.text === 'the mill is restored!').length === 1,
      'exactly-once echo for the sender');
  } finally {
    handle.close();
  }
});

test('direct messages stay private in both directions', async () => {
  const { handle, wsUrl, ircPort } = await listen();
  try {
    const bot = ircClient(ircPort);
    bot.send('NICK KilnBot', 'USER bot 0 * :Kiln Bot', 'JOIN #afterlight');
    await bot.waitFor(' 366 ');

    const p1 = await gamePlayer(wsUrl, 'guest_dm_a', 'QuietLeek');
    const p2 = await gamePlayer(wsUrl, 'guest_dm_b', 'FernWatcher');
    await bot.waitFor('FernWatcher!gardener@afterlight JOIN');

    // Player -> IRC bot, private.
    p1.sendChat('/msg KilnBot ping');
    await bot.waitFor('PRIVMSG KilnBot :ping');
    await new Promise(r => setTimeout(r, 120));
    assert.ok(!messages(p2.inbox, MSG_TYPES.CHAT_DM).length, 'bystander sees no DM');

    // IRC bot -> player, private.
    bot.send('PRIVMSG QuietLeek :pong, gardener');
    await waitFor(() => messages(p1.inbox, MSG_TYPES.CHAT_DM)
      .some(m => m.from === 'KilnBot' && m.text === 'pong, gardener'),
      'bot DM reaches the player');
    assert.ok(!messages(p2.inbox, MSG_TYPES.CHAT_DM).length, 'still nothing to the bystander');

    // Player -> player by game nickname.
    p1.sendChat('/msg FernWatcher meet you at the mill');
    await waitFor(() => messages(p2.inbox, MSG_TYPES.CHAT_DM)
      .some(m => m.from === 'QuietLeek' && m.text === 'meet you at the mill'),
      'player-to-player DM delivered');
    assert.ok(messages(p1.inbox, MSG_TYPES.CHAT_DM)
      .some(m => m.to === 'FernWatcher' && m.echo), 'sender gets an echo copy');

    // Unknown target: clear failure, delivered to nobody.
    const dmCountP2 = messages(p2.inbox, MSG_TYPES.CHAT_DM).length;
    p1.sendChat('/msg Nobody around?');
    await waitFor(() => messages(p1.inbox, MSG_TYPES.CHAT_ERROR)
      .some(m => /No one called Nobody/.test(m.message)), 'unknown target feedback');
    assert.equal(messages(p2.inbox, MSG_TYPES.CHAT_DM).length, dmCountP2, 'no stray delivery');
  } finally {
    handle.close();
  }
});

test('nicknames are reserved for online players', async () => {
  const { handle, wsUrl, ircPort } = await listen();
  try {
    // An IRC client squats on the player's would-be handle before they join.
    const squatter = ircClient(ircPort);
    squatter.send('NICK AmberTomato', 'USER s 0 * :Squatter', 'JOIN #afterlight');
    await squatter.waitFor(' 366 ');

    // 'Amber Tomato' derives to 'Amber_Tomato' on IRC (spaces are illegal).
    const p1 = await gamePlayer(wsUrl, 'guest_nick_a', 'Amber Tomato');
    await waitFor(() => messages(p1.inbox, MSG_TYPES.CHAT_MESSAGE)
      .some(m => m.fromKind === 'system' && /handle/.test(m.text)),
      'player told about the derived IRC handle');

    // The suffixed handle still relays channel traffic fine.
    p1.sendChat('hello from the derived side');
    await squatter.waitFor('PRIVMSG #afterlight :hello from the derived side');

    // While the player is online, their IRC handle cannot be taken.
    const impostor = ircClient(ircPort);
    impostor.send('NICK Impostor', 'USER i 0 * :I');
    await impostor.waitFor(' 001 ');
    impostor.send('NICK Amber_Tomato');
    await impostor.waitFor(' 433 ');

    // After the player leaves, the handle is released again.
    p1.ws.close();
    await waitFor(() => !handle.chat.sessions.has('guest_nick_a'), 'player session torn down');
    await new Promise(r => setTimeout(r, 120));
    impostor.send('NICK Amber_Tomato');
    await impostor.waitFor(' 001 ');
    assert.ok(impostor.lines.some(l => l.includes('Welcome')), 'released handle can be claimed');
  } finally {
    handle.close();
  }
});

test('presence, history, and clean shutdown', async () => {
  const { handle, wsUrl, ircPort } = await listen();
  try {
    const bot = ircClient(ircPort);
    bot.send('NICK HistoryBot', 'USER b 0 * :B', 'JOIN #afterlight');
    await bot.waitFor(' 366 ');

    const p1 = await gamePlayer(wsUrl, 'guest_hist_a', 'EarlyBird');
    p1.sendChat('chatting before anyone arrives');
    await bot.waitFor('chatting before anyone arrives');

    // An external client joining later is announced to players.
    const late = ircClient(ircPort);
    late.send('NICK LateLantern', 'USER l 0 * :L', 'JOIN #afterlight');
    await late.waitFor(' 366 ');
    await waitFor(() => messages(p1.inbox, MSG_TYPES.CHAT_PRESENCE)
      .some(m => m.event === 'join' && m.who === 'LateLantern' && m.fromKind === 'irc'),
      'IRC join surfaces in-game');

    p1.ws.close();
    await bot.waitFor('QUIT');

    // A later player still catches up on history, including IRC traffic.
    bot.send('PRIVMSG #afterlight :history will remember this');
    await new Promise(r => setTimeout(r, 100));
    const p2 = await gamePlayer(wsUrl, 'guest_hist_b', 'LateComer');
    const history = messages(p2.inbox, MSG_TYPES.CHAT_HISTORY)[0]?.messages || [];
    assert.ok(history.some(m => /chatting before anyone arrives/.test(m.text)), 'player message in history');
    assert.ok(history.some(m => /history will remember/.test(m.text)), 'IRC message in history');

    // Clean shutdown disconnects IRC clients with a QUIT line.
    const closing = ircClient(ircPort);
    closing.send('NICK DyingEmber', 'USER d 0 * :D');
    await closing.waitFor(' 001 ');
    const quitPromise = closing.waitFor(':afterlight QUIT');
    handle.close();
    await quitPromise;
  } finally {
    handle.close();
  }
});

test('chat works with the IRC listener disabled', async () => {
  const { handle, wsUrl } = await listen({ ircDisabled: true });
  try {
    assert.equal(handle.irc.boundPort, null, 'no IRC port bound');
    const p1 = await gamePlayer(wsUrl, 'guest_off_a', 'LoneGardener');
    const p2 = await gamePlayer(wsUrl, 'guest_off_b', 'Sidekick');
    p1.sendChat('can anyone hear me?');
    await waitFor(() => messages(p2.inbox, MSG_TYPES.CHAT_MESSAGE)
      .some(m => m.from === 'LoneGardener' && /can anyone hear/.test(m.text)),
      'in-game relay works without IRC');
    assert.ok(messages(p1.inbox, MSG_TYPES.CHAT_MESSAGE)
      .filter(m => m.text?.includes('can anyone hear')).length === 1, 'echo still exactly once');
  } finally {
    handle.close();
  }
});

test('health endpoint reports the IRC port additively', async () => {
  const { handle, wsUrl } = await listen();
  try {
    const res = await fetch(`http://127.0.0.1:${handle.server.address().port}/api/health`);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.ircPort, handle.irc.boundPort);
  } finally {
    handle.close();
  }
});

// --- small helpers for the tests above ------------------------------------------

function linesInclude(sock, needle) {
  return sock && Array.isArray(sock.lines)
    ? sock.lines.some(l => l.includes(needle))
    : false;
}
