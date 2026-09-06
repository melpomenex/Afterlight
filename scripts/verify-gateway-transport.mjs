#!/usr/bin/env node
/**
 * P2 exit gate (add-phoenix-gateway-transport): drives a scripted client
 * through the FULL Phoenix→Node relay chain — token issuance, channel join,
 * hello/welcome ordering, desiredRoom roster, gateway-terminated ping,
 * movement relay, chat relay, proxied health, and reconnect with fresh
 * token + welcome replay.
 *
 * Boots both real servers (Node :PORT, Phoenix :GW_PORT) with throwaway
 * state and a boundary secret. Not part of npm test: it is the recorded
 * two-server evidence for the phase gate.
 *
 * Usage: node scripts/verify-gateway-transport.mjs
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { Socket } from 'phoenix';

const NODE_PORT = 3901;
const GW_PORT = 4101;
const SECRET = 'verify-boundary-secret';
const TOKEN_SECRET = 'verify-token-secret';

const REPO = process.cwd();

function waitFor(path, tries = 80, ms = 250) {
  return new Promise((resolve, reject) => {
    const attempt = async (n) => {
      try {
        const res = await fetch(path);
        if (res.ok) return resolve(res);
      } catch {}
      if (n <= 0) return reject(new Error(`never healthy: ${path}`));
      setTimeout(() => attempt(n - 1), ms);
    };
    attempt(tries);
  });
}

function waitForPort(port, tries = 120, ms = 250) {
  return new Promise((resolve, reject) => {
    const attempt = async (n) => {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/auth/guest`, { method: 'POST' });
        void res; // any HTTP answer means the listener is up (400 expected)
        return resolve();
      } catch {}
      if (n <= 0) return reject(new Error(`gateway never came up on :${port}`));
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

/** One frame awaited by predicate, with the frames seen so far. */
function nextFrame(socket, channel, predicate, label, ms = 8000) {
  return withDeadline(
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        channel.offMessage && channel.offMessage(handler);
        reject(new Error(`timeout waiting for ${label}`));
      }, ms);
      const handler = (event, payload) => {
        const frame = { type: event, ...(payload && typeof payload === 'object' ? payload : {}) };
        seen.push(frame);
        if (predicate(frame)) {
          clearTimeout(timer);
          channel.offMessage(handler);
          resolve(frame);
        }
      };
      const seen = [];
      channel.onMessage = ((orig) => (event, payload, next) => {
        handler(event, payload);
        return orig(event, payload, next);
      })(channel.onMessage);
      void socket;
    }),
    ms + 2000,
    label,
  );
}

function connectGateway(token, guestId) {
  return new Promise((resolve, reject) => {
    const socket = new Socket(`ws://127.0.0.1:${GW_PORT}/ws`, { params: { token } });
    const channel = socket.channel('game:v1', { guestId });
    channel
      .join()
      .receive('ok', () => resolve({ socket, channel }))
      .receive('error', (resp) => reject(new Error(`join refused: ${JSON.stringify(resp)}`)));
    socket.connect();
  });
}

const { mkdtempSync } = await import('node:fs');
const { tmpdir } = await import('node:os');
const throwawayCwd = mkdtempSync(path.join(tmpdir(), 'p2-gate-'));
const nodeProc = spawn(process.execPath, [new URL('../server/index.js', import.meta.url).pathname], {
  cwd: throwawayCwd, // data/game-state.json resolves here, not in the repo
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
  detached: true, // mix is a shell wrapper: kill the whole group on cleanup
  cwd: new URL('../server_elixir', import.meta.url).pathname,
  env: {
    ...process.env,
    PATH: `${process.env.HOME}/.local/afterlight-beam/otp/bin:${process.env.HOME}/.local/afterlight-beam/elixir/bin:${process.env.PATH}`,
    PHX_SERVER: 'true',
    PORT: String(GW_PORT),
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

try {
  // 1. Both listeners up; /api/health THROUGH the gateway proves
  //    HTTPProxy + boundary secret + Node hop in one hop.
  console.error('step: waiting node');
  await waitFor(`http://127.0.0.1:${NODE_PORT}/api/health`);
  console.error('step: node up, waiting gateway');
  const proxiedHealth = await waitFor(`http://127.0.0.1:${GW_PORT}/api/health`);
  console.error('step: gateway up');
  const healthBody = await proxiedHealth.json();
  assertEq(healthBody.status, 'ok', 'proxied /api/health body');
  console.log('ok  proxied /api/health (gateway → boundary → Node)');

  // 2. Token + connect + join.
  // Undici can surface 'terminated' when a keep-alive socket is closed
  // between the readiness probe and the first real request — retry.
  async function postGuest(body) {
    let lastErr;
    for (let i = 0; i < 3; i++) {
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
  const tokenRes = await postGuest({ guestId: 'guest_verify_gateway', nickname: 'Verifier' });
  console.error('step: token fetched');
  assertEq(tokenRes.status, 200, 'token issuance');
  const { token } = await tokenRes.json();
  assertOk(token, 'token issued');

  console.error('step: connecting gateway socket');
  const { socket, channel } = await connectGateway(token, 'guest_verify_gateway');
  console.error('step: joined');
  console.log('ok  channel join with signed token');

  // 3. hello → welcome; assert the gateway relayed it with Node's player.
  const welcome = nextFrame(socket, channel, (f) => f.type === 'welcome', 'welcome');
  channel.push('hello', { guestId: 'guest_verify_gateway', nickname: 'Verifier' });
  const w = await welcome;
  assertEq(w.player.id, 'guest_verify_gateway', 'welcome.player.id is the hello guestId');
  assertOk(Array.isArray(w.prices), 'welcome carries Node-owned prices');
  console.log('ok  hello → welcome relayed (player.id matches token/hello identity)');

  // 4. desiredRoom: join market → roster contains us.
  const roster = nextFrame(
    socket,
    channel,
    (f) => f.type === 'presence_update' && f.players?.some((p) => p.id === 'guest_verify_gateway'),
    'presence_update roster',
  );
  channel.push('join_room', { roomId: 'market' });
  await roster;
  console.log('ok  join_room → presence_update roster includes self');

  // 5. ping terminated at the gateway (pong with echoed t).
  const pong = nextFrame(socket, channel, (f) => f.type === 'pong', 'pong');
  channel.push('ping', { t: 1234 });
  const p = await pong;
  assertEq(p.t, 1234, 'pong echoes t');
  console.log('ok  ping → pong terminated at gateway');

  // 6. Movement relayed: room flush reflects our coordinates.
  channel.push('movement', { x: 3.5, z: -1.25, rotY: 0.4, walking: true, sitting: false, airborne: false });
  const moved = nextFrame(
    socket,
    channel,
    (f) =>
      f.type === 'presence_update' &&
      f.players?.some((p2) => p2.id === 'guest_verify_gateway' && Math.abs(p2.x - 3.5) < 0.01),
    'movement reflected in presence_update',
    10000,
  );
  await moved;
  console.log('ok  movement relayed → 10 Hz flush carries the new pose');

  // 7. Chat relayed both ways semantics: our send comes back as chat_message.
  const chat = nextFrame(
    socket,
    channel,
    (f) => f.type === 'chat_message' && f.text === 'gateway round trip',
    'chat_message',
  );
  channel.push('chat_send', { text: 'gateway round trip' });
  const c = await chat;
  assertEq(c.from, 'Verifier', 'chat_message.from is our nickname');
  console.log('ok  chat_send → chat_message relayed (IRC bridge path intact)');

  // 8. Reconnect: newest-wins, fresh welcome, roster again, no ghosts.
  socket.disconnect();
  const token2 = await (await postGuest({ guestId: 'guest_verify_gateway', nickname: 'Verifier' })).json();
  const conn2 = await connectGateway(token2.token, 'guest_verify_gateway');
  const welcome2 = nextFrame(conn2.socket, conn2.channel, (f) => f.type === 'welcome', 'welcome after reconnect');
  conn2.channel.push('hello', { guestId: 'guest_verify_gateway', nickname: 'Verifier' });
  const w2 = await welcome2;
  assertEq(w2.player.id, 'guest_verify_gateway', 'welcome after reconnect');
  const roster2 = nextFrame(
    conn2.socket,
    conn2.channel,
    (f) => f.type === 'presence_update' && f.players?.some((p3) => p3.id === 'guest_verify_gateway'),
    'roster after reconnect',
  );
  conn2.channel.push('join_room', { roomId: 'market' });
  const r2 = await roster2;
  const selfCount = r2.players.filter((p4) => p4.id === 'guest_verify_gateway').length;
  assertEq(selfCount, 1, 'no ghost duplicate of self in roster');
  console.log('ok  reconnect: fresh welcome, roster clean (newest-wins, no ghosts)');

  conn2.socket.disconnect();
  console.log('\nP2 GATE PASS: full Phoenix→Node relay verified end to end.');
  process.exit(0);
} catch (err) {
  console.error(`\nP2 GATE FAIL: ${err.message}`);
  process.exitCode = 1;
} finally {
  // mix is a shell wrapper around beam: signal the whole process group so
  // no orphaned beam keeps the gateway port bound between runs.
  for (const proc of [gwProc, nodeProc]) {
    try {
      process.kill(-proc.pid, 'SIGTERM');
    } catch {
      try { proc.kill('SIGTERM'); } catch {}
    }
  }
}

function assertEq(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
function assertOk(value, label) {
  if (!value) throw new Error(`${label}: expected truthy, got ${JSON.stringify(value)}`);
}
