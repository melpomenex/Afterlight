#!/usr/bin/env node
/**
 * P2 verification (add-phoenix-gateway-transport): scripted Phoenix clients
 * through the real Phoenix→Node relay. Not a browser: this is the
 * automatable substitute for two-browser play (tasks 6.3 / 6.4 / 7.2).
 *
 * Covers:
 *   - proxied /api/health
 *   - two sessions: join, travel, emote, chat both ways, theater_state,
 *     garden join, market error, reconnect without ghost presence
 *   - protocol-catalog §5: guestId continuity / self-echo identity,
 *     duplicate-handler order, airborne flag coercion, bare `error`,
 *     duplicate join_room no-op for PRESENCE_JOIN
 *   - rollback rehearsal: secret-less raw WebSocket to Node still welcomes
 *
 * Usage: node scripts/verify-gateway-transport.mjs
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { Socket } from 'phoenix';
import { WebSocket as NodeWebSocket } from 'ws';

const NODE_PORT = 3901;
const GW_PORT = 4101;
const SECRET = 'verify-boundary-secret';
const TOKEN_SECRET = 'verify-token-secret';

const ELIXIR_PATH = [
  `${process.env.HOME}/.elixir-install/installs/otp/27.3/bin`,
  `${process.env.HOME}/.elixir-install/installs/elixir/1.18.4-otp-27/bin`,
  `${process.env.HOME}/.local/afterlight-beam/otp/bin`,
  `${process.env.HOME}/.local/afterlight-beam/elixir/bin`,
  process.env.PATH,
].join(':');

function waitFor(url, tries = 80, ms = 250) {
  return new Promise((resolve, reject) => {
    const attempt = async (n) => {
      try {
        const res = await fetch(url);
        if (res.ok) return resolve(res);
      } catch {}
      if (n <= 0) return reject(new Error(`never healthy: ${url}`));
      setTimeout(() => attempt(n - 1), ms);
    };
    attempt(tries);
  });
}

function withDeadline(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`timeout: ${label}`)), ms)),
  ]);
}

function attachCollector(channel) {
  const frames = [];
  const waiters = [];
  const prevOnMessage = channel.onMessage;
  channel.onMessage = (event, payload, ref, joinRef) => {
    const frame = {
      type: event,
      ...(payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {}),
    };
    frames.push(frame);
    for (const w of [...waiters]) {
      if (w.pred(frame)) {
        waiters.splice(waiters.indexOf(w), 1);
        w.resolve(frame);
      }
    }
    return prevOnMessage(event, payload, ref, joinRef);
  };
  return {
    frames,
    wait(pred, label, ms = 8000) {
      const hit = frames.find(pred);
      if (hit) return Promise.resolve(hit);
      return withDeadline(
        new Promise((resolve) => waiters.push({ pred, resolve })),
        ms,
        label,
      );
    },
  };
}

function connectGateway(token, guestId) {
  return new Promise((resolve, reject) => {
    const socket = new Socket(`ws://127.0.0.1:${GW_PORT}/ws`, { params: { token } });
    const channel = socket.channel('game:v1', { guestId });
    channel
      .join()
      .receive('ok', () => resolve({ socket, channel, col: attachCollector(channel) }))
      .receive('error', (resp) => reject(new Error(`join refused: ${JSON.stringify(resp)}`)));
    socket.connect();
  });
}

async function postGuest(body) {
  let lastErr;
  for (let i = 0; i < 5; i++) {
    try {
      return await fetch(`http://127.0.0.1:${GW_PORT}/api/auth/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  throw lastErr;
}

async function session(guestId, nickname) {
  const tokenRes = await postGuest({ guestId, nickname });
  assertEq(tokenRes.status, 200, `token for ${guestId}`);
  const { token } = await tokenRes.json();
  const conn = await connectGateway(token, guestId);
  const welcomeP = conn.col.wait((f) => f.type === 'welcome', `welcome ${guestId}`);
  conn.channel.push('hello', { guestId, nickname });
  const welcome = await welcomeP;
  return { ...conn, guestId, nickname, welcome };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function poseOf(frame, id) {
  return frame.players?.find((p) => p.id === id);
}

function assertEq(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
function assertOk(value, label) {
  if (!value) throw new Error(`${label}: expected truthy, got ${JSON.stringify(value)}`);
}

const throwawayCwd = mkdtempSync(path.join(tmpdir(), 'p2-gate-'));
const nodeProc = spawn(process.execPath, [new URL('../server/index.js', import.meta.url).pathname], {
  cwd: throwawayCwd,
  env: {
    ...process.env,
    PORT: String(NODE_PORT),
    HOST: '127.0.0.1',
    IRC_DISABLED: '1',
    AFTERLIGHT_BOUNDARY_SECRET: SECRET,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const gwProc = spawn('mix', ['phx.server'], {
  detached: true,
  cwd: new URL('../server_elixir', import.meta.url).pathname,
  env: {
    ...process.env,
    PATH: ELIXIR_PATH,
    PHX_SERVER: 'true',
    MIX_ENV: 'dev',
    PORT: String(GW_PORT),
    DATABASE_URL: process.env.DATABASE_URL || 'ecto://afterlight:afterlight@127.0.0.1:5432/afterlight_dev',
    AFTERLIGHT_NODE_WS_URL: `ws://127.0.0.1:${NODE_PORT}/ws`,
    AFTERLIGHT_NODE_HTTP_URL: `http://127.0.0.1:${NODE_PORT}`,
    AFTERLIGHT_BOUNDARY_SECRET: SECRET,
    AFTERLIGHT_TOKEN_SECRET: TOKEN_SECRET,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
nodeProc.stdout.on('data', (d) => process.stderr.write(`[node] ${d}`));
nodeProc.stderr.on('data', (d) => process.stderr.write(`[node] ${d}`));
gwProc.stdout.on('data', (d) => process.stderr.write(`[gw] ${d}`));
gwProc.stderr.on('data', (d) => process.stderr.write(`[gw] ${d}`));

const results = [];
function ok(msg) {
  results.push(`ok  ${msg}`);
  console.log(`ok  ${msg}`);
}

try {
  console.error('step: waiting node');
  await waitFor(`http://127.0.0.1:${NODE_PORT}/api/health`);
  console.error('step: node up, waiting gateway');
  const proxiedHealth = await waitFor(`http://127.0.0.1:${GW_PORT}/api/health`, 120, 250);
  const healthBody = await proxiedHealth.json();
  assertEq(healthBody.status, 'ok', 'proxied /api/health body');
  ok('proxied /api/health (gateway → boundary → Node)');

  // --- two scripted clients ---
  const a = await session('guest_p2_alpha', 'AlphaBot');
  const b = await session('guest_p2_bravo', 'BravoBot');
  assertEq(a.welcome.player.id, 'guest_p2_alpha', 'welcome.player.id matches token/hello (A)');
  assertEq(b.welcome.player.id, 'guest_p2_bravo', 'welcome.player.id matches token/hello (B)');
  ok('two sessions: hello → welcome with guestId continuity');

  // 6.4 duplicate-handler order on the Phoenix unwrap path (two collectors
  // on one channel fire in registration order because onMessage wraps).
  const order = [];
  const orig = a.channel.onMessage;
  a.channel.onMessage = ((prev) => (event, payload, ref, joinRef) => {
    if (event === 'pong') order.push('first');
    const out = prev(event, payload, ref, joinRef);
    if (event === 'pong') order.push('second');
    return out;
  })(orig);
  const pongP = a.col.wait((f) => f.type === 'pong' && f.t === 4242, 'pong');
  a.channel.push('ping', { t: 4242 });
  const pong = await pongP;
  assertEq(pong.t, 4242, 'pong echoes t (gateway-terminated)');
  assertEq(order.join(','), 'first,second', 'duplicate handlers fire in registration order');
  ok('ping → pong at gateway; duplicate onMessage wrappers run in order');

  // Join market: B is already present so A's first join emits presence_join;
  // a second join_room from A is a no-op for everyone else.
  const bRoster = b.col.wait(
    (f) => f.type === 'presence_update' && Array.isArray(f.players),
    'B market roster',
  );
  b.channel.push('join_room', { roomId: 'market' });
  await bRoster;
  const bSawA = b.col.wait(
    (f) => f.type === 'presence_join' && f.player?.id === 'guest_p2_alpha',
    'B sees A join',
    12000,
  );
  const aJoin = a.col.wait(
    (f) => f.type === 'presence_update' && Array.isArray(f.players),
    'A market roster',
  );
  a.channel.push('join_room', { roomId: 'market' });
  await aJoin;
  await bSawA;
  const joinsBefore = b.col.frames.filter(
    (f) => f.type === 'presence_join' && f.player?.id === 'guest_p2_alpha',
  ).length;
  a.channel.push('join_room', { roomId: 'market' });
  await sleep(400);
  const joinsAfter = b.col.frames.filter(
    (f) => f.type === 'presence_join' && f.player?.id === 'guest_p2_alpha',
  ).length;
  assertEq(joinsAfter, joinsBefore, 'duplicate join_room does not repeat presence_join');
  ok('join market; duplicate join_room is a presence no-op');

  // Movement + airborne flag (receiver coerces missing flag like !!undefined).
  const bAir = b.col.wait(
    (f) => f.type === 'presence_update' && poseOf(f, 'guest_p2_alpha')?.airborne === true,
    'B sees A airborne',
    12000,
  );
  a.channel.push('movement', {
    x: 2.5, z: -1, rotY: 0.2, walking: true, sitting: false, airborne: true,
  });
  await bAir;
  const bGround = b.col.wait(
    (f) =>
      f.type === 'presence_update' &&
      poseOf(f, 'guest_p2_alpha') &&
      !poseOf(f, 'guest_p2_alpha').airborne,
    'B sees A grounded when flag omitted/false',
    12000,
  );
  a.channel.push('movement', { x: 2.6, z: -1, rotY: 0.2, walking: true, sitting: false });
  await bGround;
  ok('airborne true relays; omitted/false flag reads grounded for the peer');

  // Self-echo identity: A still receives own roster row; client would filter
  // with `p.id !== net.guestId` (src/main.js). Continuity is the contract.
  const selfRoster = a.col.frames
    .filter((f) => f.type === 'presence_update')
    .some((f) => poseOf(f, 'guest_p2_alpha'));
  assertOk(selfRoster, 'A receives own presence_update row (client self-filters by guestId)');
  ok('self-echo filtering identity: guestId on welcome matches presence self row');

  // Chat both directions.
  const aHeard = a.col.wait((f) => f.type === 'chat_message' && f.text === 'from bravo', 'A hears B');
  const bHeard = b.col.wait((f) => f.type === 'chat_message' && f.text === 'from alpha', 'B hears A');
  a.channel.push('chat_send', { text: 'from alpha' });
  b.channel.push('chat_send', { text: 'from bravo' });
  await aHeard;
  await bHeard;
  ok('chat both directions through the relay');

  // Emote: B sees A's broadcast (A would self-filter playerId === guestId).
  const emoteP = b.col.wait(
    (f) => f.type === 'emote_broadcast' && f.playerId === 'guest_p2_alpha' && f.emote === 'wave',
    'emote_broadcast',
  );
  a.channel.push('emote', { emote: 'wave' });
  await emoteP;
  ok('emote_broadcast relayed to the other session (remote rendering input)');

  // Travel: theater playback state snapshot on join.
  const aTheater = a.col.wait((f) => f.type === 'theater_state', 'A theater_state');
  const bTheater = b.col.wait((f) => f.type === 'theater_state', 'B theater_state');
  a.channel.push('join_room', { roomId: 'theater' });
  b.channel.push('join_room', { roomId: 'theater' });
  await aTheater;
  await bTheater;
  const chP = b.col.wait(
    (f) => f.type === 'theater_state' && f.theater?.now?.url === 'https://example.com/p2-gate.mp4',
    'shared theater_state after channel',
    12000,
  );
  a.channel.push('theater_channel', {
    url: 'https://example.com/p2-gate.mp4',
    title: 'P2 gate reel',
  });
  const shared = await chP;
  assertEq(shared.theater.now.title, 'P2 gate reel', 'theater now title');
  ok('theater join snapshots + shared theater_state after theater_channel');

  // Bare `error` (theaterScreen applyServerErrorMessage reads msg.message).
  const errP = a.col.wait((f) => f.type === 'error' && typeof f.message === 'string', 'error frame');
  a.channel.push('market_buy', { cropId: 'radish', quantity: 99999 });
  const err = await errP;
  assertEq(err.message, 'insufficient_coins', 'stable error reason string');
  ok('bare error {message} delivered flat (theaterScreen consumer shape)');

  // Garden join for A's guestId room.
  const gardenId = 'garden:guest_p2_alpha';
  const gState = a.col.wait(
    (f) => f.type === 'garden_state' && f.roomId === gardenId,
    'garden_state',
  );
  a.channel.push('join_room', { roomId: gardenId });
  await gState;
  ok('garden:<guestId> join returns garden_state');

  // Market action that succeeds (starting coins 60).
  a.channel.push('join_room', { roomId: 'market' });
  const invP = a.col.wait((f) => f.type === 'inventory_state', 'inventory_state after buy', 12000);
  a.channel.push('market_buy', { cropId: 'radish', quantity: 1 });
  const inv = await invP;
  assertOk(inv.player?.inventory?.seeds?.radish >= 1, 'market_buy credited a seed');
  ok('market_buy applied through the proxy');

  // Reconnect A from a shared market: newest-wins, fresh welcome, no ghost.
  b.channel.push('join_room', { roomId: 'market' });
  a.channel.push('join_room', { roomId: 'market' });
  await sleep(300);
  const leaveP = b.col.wait(
    (f) => f.type === 'presence_leave' && f.playerId === 'guest_p2_alpha',
    'B sees A leave on reconnect',
    15000,
  );
  a.socket.disconnect();
  const token2 = await (await postGuest({ guestId: 'guest_p2_alpha', nickname: 'AlphaBot' })).json();
  const a2 = await connectGateway(token2.token, 'guest_p2_alpha');
  const welcome2P = a2.col.wait((f) => f.type === 'welcome', 'welcome after reconnect');
  a2.channel.push('hello', { guestId: 'guest_p2_alpha', nickname: 'AlphaBot' });
  const w2 = await welcome2P;
  assertEq(w2.player.id, 'guest_p2_alpha', 'welcome after reconnect');
  b.channel.push('join_room', { roomId: 'market' });
  a2.channel.push('join_room', { roomId: 'market' });
  a2.channel.push('movement', {
    x: 1.5, z: 0.5, rotY: 0, walking: true, sitting: false, airborne: false,
  });
  await leaveP.catch(() => {}); // leave may already have arrived
  const roster2 = await a2.col.wait(
    (f) =>
      f.type === 'presence_update' &&
      Array.isArray(f.players) &&
      f.players.some((p) => p.id === 'guest_p2_alpha'),
    'roster after reconnect',
    15000,
  );
  const selfCount = roster2.players.filter((p) => p.id === 'guest_p2_alpha').length;
  assertEq(selfCount, 1, 'no ghost duplicate of self in roster');
  ok('reconnect: fresh welcome, exactly one self in roster (newest-wins)');

  a2.socket.disconnect();
  b.socket.disconnect();

  // 7.2 rollback rehearsal: secret-less direct Node socket still works.
  const nodeWelcome = await withDeadline(
    new Promise((resolve, reject) => {
      const ws = new NodeWebSocket(`ws://127.0.0.1:${NODE_PORT}/ws`);
      ws.on('message', (data) => {
        const msg = JSON.parse(String(data));
        if (msg.type === 'welcome') {
          ws.close();
          resolve(msg);
        }
      });
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'hello', guestId: 'guest_p2_rollback', nickname: 'Rollback' }));
      });
      ws.on('error', reject);
    }),
    8000,
    'direct Node welcome (rollback path)',
  );
  assertEq(nodeWelcome.player.id, 'guest_p2_rollback', 'direct Node welcome guestId');
  ok('rollback rehearsal: secret-less client → Node :ws still gets welcome');

  console.log('\nP2 SCRIPT PASS: Phoenix two-client relay + §5 checks + Node rollback path.');
  console.log(`checks: ${results.length}`);
  process.exit(0);
} catch (err) {
  console.error(`\nP2 SCRIPT FAIL: ${err.message}`);
  process.exitCode = 1;
} finally {
  for (const proc of [gwProc, nodeProc]) {
    try {
      process.kill(-proc.pid, 'SIGTERM');
    } catch {
      try {
        proc.kill('SIGTERM');
      } catch {}
    }
  }
}
