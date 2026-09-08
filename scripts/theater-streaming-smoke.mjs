#!/usr/bin/env node
/**
 * Theater streaming smoke (fix-theater-streaming-after-elixir-cutover, task 3.1).
 *
 * WS-level pass over the live dev stack: joins The Orpheum through the
 * Phoenix gateway and proves the server side of every streaming path —
 * bill ops for each source kind (YouTube / .mp4 / .m3u8), live broadcasts,
 * readable rejections, and state restoration. Torrent playback additionally
 * needs a granted Range stream from the sidecar; the resolve error path is
 * checked here, the live swarm path belongs to the manual browser pass
 * (scripts/theater-streaming-pass.md).
 *
 * Usage: node scripts/theater-streaming-smoke.mjs
 * Env:   GATEWAY_URL (default http://127.0.0.1:4000)
 *
 * Hygiene: runs as a dedicated probe guest, adds only clearly named probe
 * items, removes everything it added, and never issues `clear`.
 */

import { Socket } from '../node_modules/phoenix/priv/static/phoenix.mjs';

const BASE = (process.env.GATEWAY_URL || 'http://127.0.0.1:4000').replace(/\/+$/, '');
const WS_URL = BASE.replace(/^http/, 'ws') + '/ws';
const GUEST_ID = `smoke-${Math.random().toString(36).slice(2, 10)}`;
const TAG = `smoke-probe-item ${(Date.now()).toString(36)}`;

const results = [];
const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const authRes = await fetch(`${BASE}/api/auth/guest`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
  body: JSON.stringify({ guestId: GUEST_ID, nickname: 'SmokeProbe' }),
});
if (!authRes.ok) {
  console.error(`✗ guest auth failed (HTTP ${authRes.status}) — is the gateway up on ${BASE}?`);
  process.exit(1);
}
const { token } = await authRes.json();

const socket = new Socket(WS_URL, { params: { token } });
socket.connect();

const frames = [];
let errors = [];
const channel = socket.channel('game:v1', { guestId: GUEST_ID });

channel.onMessage = (event, payload) => {
  if (event === 'theater_state') frames.push(payload);
  if (event === 'iptv_state') frames.push({ __iptv: true });
  if (event === 'error') errors.push(payload?.message || '');
  return payload;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Wait until cond() is true or the timeout elapses; returns cond()'s last value. */
async function waitFor(cond, timeoutMs = 5000, stepMs = 100) {
  const deadline = Date.now() + timeoutMs;
  let value = cond();
  while (!value && Date.now() < deadline) {
    await sleep(stepMs);
    value = cond();
  }
  return value;
}

const latest = () => frames.at(-1)?.__iptv ? frames.at(-2) : frames.at(-1);
const bill = () => latest()?.theater || null;
const queueTitles = () => (bill()?.queue || []).map((i) => i.title);
// A TAG item can sit in `now` (an add on an idle screen starts playback —
// shared/theaterModel.js) or in the queue; both are found here.
const allItems = () => [...(bill()?.queue || []), ...(bill()?.now ? [bill().now] : [])];
const findTagged = (title) => allItems().find((i) => i.title === title);

channel.join().receive('ok', () => {
  channel.push('hello', { guestId: GUEST_ID, nickname: 'SmokeProbe' });
  setTimeout(() => channel.push('join_room', { roomId: 'theater' }), 200);
}).receive('error', (r) => {
  console.error('✗ channel join refused:', JSON.stringify(r));
  process.exit(1);
});

// 1. Join snapshot: the bill arrives over the gateway.
const joined = await waitFor(() => bill());
record('join: theater_state snapshot arrives', !!joined, joined ? `queue=${queueTitles().length}` : 'no snapshot within 5s');

// 2. IPTV catalog snapshot (booth library path).
const sawIptv = await waitFor(() => frames.some((f) => f.__iptv), 5000);
record('join: iptv_state catalog arrives', sawIptv);

async function addAndRemove(kind, url) {
  const before = queueTitles().length;
  errors = [];
  channel.push('theater_queue', { op: 'add', url, title: `${TAG} ${kind}` });
  const item = await waitFor(() => findTagged(`${TAG} ${kind}`), 5000);
  record(
    `${kind}: add is accepted and broadcast`,
    !!item,
    item ? (bill()?.now?.title === `${TAG} ${kind}` ? 'starts playing (screen was idle)' : 'queued') : errors.join('; ') || 'no broadcast within 5s',
  );

  if (item) {
    record(`${kind}: classified as ${kind}`, item.kind === kind, `kind=${item.kind}`);
    channel.push('theater_queue', { op: 'remove', itemId: item.id });
    const removed = await waitFor(() => !findTagged(`${TAG} ${kind}`) && queueTitles().length === before, 5000);
    record(`${kind}: remove restores the bill`, !!removed);
  } else {
    record(`${kind}: remove restores the bill`, false, 'added item not found');
  }
}

// 3. Every URL source kind is accepted, classified, broadcast — and cleaned up.
await addAndRemove('youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
await addAndRemove('file', 'https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4');
await addAndRemove('hls', 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8');

// 4. Readable rejection, no state change.
{
  const before = queueTitles().length;
  errors = [];
  channel.push('theater_queue', { op: 'add', url: 'definitely not a url', title: `${TAG} bad` });
  await waitFor(() => errors.length > 0, 5000);
  const stayed = queueTitles().length === before;
  record('invalid URL: readable error, bill unchanged', errors.length > 0 && stayed, errors[0] || 'no error frame');
}

// 5. Torrent resolve error path: a structurally invalid magnet is refused
//    with a readable message instead of hanging or crashing the channel.
{
  errors = [];
  channel.push('torrent_resolve', { requestId: `smoke-${Date.now()}`, magnet: 'magnet:?xt=urn:btih:zzzz' });
  await waitFor(() => errors.length > 0, 5000);
  record('invalid magnet: resolve refused with readable error', errors.length > 0, errors[0] || 'no error within 5s');
}

// 6. Leave the bill exactly as we found it (queue AND a live item).
const taggedLeft = () => allItems().filter((i) => i.title?.startsWith(TAG));
for (const item of taggedLeft()) channel.push('theater_queue', { op: 'remove', itemId: item.id });
await waitFor(() => taggedLeft().length === 0, 5000);
record('cleanup: no probe items left on the bill', taggedLeft().length === 0);

socket.disconnect();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) {
  console.error('FAILED:', failed.map((f) => f.name).join(', '));
  process.exit(1);
}
process.exit(0);
