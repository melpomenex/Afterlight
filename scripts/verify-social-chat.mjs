#!/usr/bin/env node
/**
 * Social chat verification (add-social-chat-relay tasks 5.3 + 6.1):
 * two Phoenix clients exercise channel chat, DM, /me, history, presence.
 *
 * Usage: node scripts/verify-social-chat.mjs [--gw-port 4000]
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { Socket } from 'phoenix';

const GW_PORT = Number(process.env.GW_PORT || 4000);
const NODE_PORT = Number(process.env.NODE_PORT || 3001);
const SECRET = process.env.AFTERLIGHT_BOUNDARY_SECRET || 'verify-boundary-secret';
const TOKEN_SECRET = process.env.AFTERLIGHT_TOKEN_SECRET || 'verify-token-secret';
const REPO = process.cwd();

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitFor(url, tries = 80) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status < 500) return;
    } catch {}
    await wait(250);
  }
  throw new Error(`never healthy: ${url}`);
}

async function postGuest(guestId, nickname) {
  const res = await fetch(`http://127.0.0.1:${GW_PORT}/api/auth/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guestId, nickname }),
  });
  if (!res.ok) throw new Error(`token ${res.status}`);
  return res.json();
}

function connect(token, guestId) {
  return new Promise((resolve, reject) => {
    const frames = [];
    const socket = new Socket(`ws://127.0.0.1:${GW_PORT}/ws`, { params: { token } });
    const channel = socket.channel('game:v1', { guestId });
    const prev = channel.onMessage;
    channel.onMessage = (event, payload) => {
      frames.push({ type: event, ...payload });
      return prev(event, payload);
    };
    channel
      .join()
      .receive('ok', () => resolve({ socket, channel, frames, push: (e, p) => channel.push(e, p) }))
      .receive('error', reject);
    socket.connect();
  });
}

function nextFrame(frames, type, timeout = 8000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const i = frames.findIndex((f) => f.type === type);
      if (i >= 0) return resolve(frames.splice(i, 1)[0]);
      if (Date.now() - start > timeout) return reject(new Error(`timeout: ${type}`));
      setTimeout(tick, 50);
    };
    tick();
  });
}

const nodeProc = spawn(process.execPath, ['server/index.js'], {
  cwd: REPO,
  env: { ...process.env, PORT: String(NODE_PORT), IRC_DISABLED: '1', CHAT_RELAY_DISABLED: '1', AFTERLIGHT_BOUNDARY_SECRET: SECRET },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const gwProc = spawn('mix', ['phx.server'], {
  cwd: path.join(REPO, 'server_elixir'),
  env: {
    ...process.env,
    PHX_SERVER: 'true',
    PORT: String(GW_PORT),
    AFTERLIGHT_NODE_WS_URL: `ws://127.0.0.1:${NODE_PORT}/ws`,
    AFTERLIGHT_NODE_HTTP_URL: `http://127.0.0.1:${NODE_PORT}`,
    AFTERLIGHT_BOUNDARY_SECRET: SECRET,
    AFTERLIGHT_TOKEN_SECRET: TOKEN_SECRET,
    AFTERLIGHT_WORLD_OWNER: 'phoenix',
    AFTERLIGHT_CHAT_OWNER: 'phoenix',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

try {
  await waitFor(`http://127.0.0.1:${NODE_PORT}/api/health`);
  await waitFor(`http://127.0.0.1:${GW_PORT}/health`);
  console.log('ok  servers up');

  const { token: t1 } = await postGuest('guest_chat_a', 'Alice');
  const { token: t2 } = await postGuest('guest_chat_b', 'Bob');
  const a = await connect(t1, 'guest_chat_a');
  const b = await connect(t2, 'guest_chat_b');

  a.push('hello', { guestId: 'guest_chat_a', nickname: 'Alice' });
  b.push('hello', { guestId: 'guest_chat_b', nickname: 'Bob' });
  await nextFrame(a.frames, 'welcome');
  await nextFrame(b.frames, 'welcome');
  console.log('ok  hello → welcome');

  a.push('join_room', { roomId: 'market' });
  b.push('join_room', { roomId: 'market' });
  await nextFrame(a.frames, 'presence_update');
  await nextFrame(b.frames, 'presence_update');
  // chat_history follows garden_state when chat is Phoenix-owned
  await Promise.race([
    nextFrame(a.frames, 'garden_state'),
    wait(2000).then(() => null),
  ]);
  await Promise.race([
    nextFrame(b.frames, 'garden_state'),
    wait(2000).then(() => null),
  ]);
  const histA = await nextFrame(a.frames, 'chat_history');
  const histB = await nextFrame(b.frames, 'chat_history');
  assert(Array.isArray(histA.messages));
  assert(Array.isArray(histB.messages));
  console.log('ok  chat_history after join snapshots');

  a.push('chat_send', { text: 'hello from Alice' });
  const msgB = await nextFrame(b.frames, 'chat_message');
  const msgA = await nextFrame(a.frames, 'chat_message');
  assert(msgA.text === 'hello from Alice' && msgB.text === 'hello from Alice');
  console.log('ok  channel message both directions');

  a.push('chat_send', { text: '/me waves' });
  const meB = await nextFrame(b.frames, 'chat_message');
  assert(meB.action === true);
  console.log('ok  /me action flag');

  a.push('chat_send', { text: '/msg Bob secret dm' });
  const dmB = await nextFrame(b.frames, 'chat_dm');
  const dmA = await nextFrame(a.frames, 'chat_dm');
  assert(dmA.echo === true);
  assert(!dmB.echo);
  console.log('ok  DM echo semantics');

  a.channel.leave();
  b.channel.leave();
  a.socket.disconnect();
  b.socket.disconnect();
  console.log('PASS social chat verification');
} catch (e) {
  console.error('FAIL', e.message);
  process.exitCode = 1;
} finally {
  nodeProc.kill('SIGTERM');
  gwProc.kill('SIGTERM');
}

function assert(cond) {
  if (!cond) throw new Error('assertion failed');
}
