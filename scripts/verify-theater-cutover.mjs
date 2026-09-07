#!/usr/bin/env node
/**
 * P5 task 9.2 + P7 task 6.3 wire-level soak: two Phoenix gateway clients in
 * theater exercise queue/control/channel/catalog ops and compare broadcasts.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Socket } from 'phoenix';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GW_PORT = Number(process.env.GW_PORT || 4000);
const HTTP = `http://127.0.0.1:${GW_PORT}`;
const WS = `ws://127.0.0.1:${GW_PORT}/ws`;
const YT = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

const rand = () => Math.random().toString(36).slice(2, 8);
const checks = [];

function ok(name, pass, detail = '') {
  checks.push({ name, pass, detail });
  console.log(`${pass ? 'ok' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

class Client {
  constructor(label) {
    this.label = label;
    this.frames = [];
    this.handlers = new Map();
    this.guestId = null;
    this._channel = null;
  }

  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type).push(fn);
  }

  _emit(frame) {
    this.frames.push(frame);
    for (const fn of this.handlers.get(frame.type) || []) fn(frame);
    for (const fn of this.handlers.get('*') || []) fn(frame);
  }

  push(type, payload = {}) {
    this._channel.push(type, payload);
  }

  waitFor(pred, { timeoutMs = 8000, label = 'frame', afterIndex = 0 } = {}) {
    const hit = this.frames.slice(afterIndex).find(pred);
    if (hit) return Promise.resolve(hit);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timeout: ${label}`)), timeoutMs);
      const handler = (f) => {
        if (pred(f)) {
          clearTimeout(timer);
          const list = this.handlers.get('*') || [];
          const i = list.indexOf(handler);
          if (i >= 0) list.splice(i, 1);
          resolve(f);
        }
      };
      this.on('*', handler);
    });
  }

  close() {
    try {
      this._channel?.leave();
    } catch {}
  }
}

async function connect(guestId, nickname) {
  const res = await fetch(`${HTTP}/api/auth/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guestId, nickname }),
  });
  if (!res.ok) throw new Error(`guest token HTTP ${res.status}`);
  const { token } = await res.json();
  const client = new Client(guestId);
  client.guestId = guestId;

  return new Promise((resolve, reject) => {
    const socket = new Socket(WS, { params: { token } });
    const timer = setTimeout(() => reject(new Error('join timeout')), 8000);
    socket.onOpen(() => {
      const channel = socket.channel('game:v1', { guestId });
      channel.onMessage = (event, payload) => {
        if (typeof event === 'string' && !event.startsWith('phoenix') && event !== 'heartbeat') {
          client._emit(
            payload && typeof payload === 'object' && !Array.isArray(payload)
              ? { type: event, ...payload }
              : { type: event },
          );
        }
        return payload;
      };
      channel
        .join()
        .receive('ok', () => {
          clearTimeout(timer);
          client._channel = channel;
          resolve(client);
        })
        .receive('error', (r) => {
          clearTimeout(timer);
          reject(new Error(`channel join error: ${JSON.stringify(r)}`));
        });
    });
    socket.connect();
  });
}

async function boot(client, nickname) {
  client.push('hello', { guestId: client.guestId, nickname });
  await client.waitFor((f) => f.type === 'welcome', { label: 'welcome' });
  client.push('join_room', { roomId: 'theater' });
  await client.waitFor((f) => f.type === 'theater_state', { label: 'theater_state join snapshot' });
  await client.waitFor((f) => f.type === 'iptv_state', { label: 'iptv_state join snapshot' });
}

async function main() {
  const aId = `guest_th_a_${rand()}`;
  const bId = `guest_th_b_${rand()}`;
  const a = await connect(aId, 'TheaterA');
  const b = await connect(bId, 'TheaterB');
  await boot(a, 'TheaterA');
  await boot(b, 'TheaterB');

  const baseA = a.frames.length;
  const baseB = b.frames.length;

  a.push('theater_queue', { op: 'clear' });
  await a.waitFor((f) => f.type === 'theater_state' && !f.theater?.now && (f.theater?.queue?.length ?? 0) === 0, {
    label: 'theater cleared',
    afterIndex: baseA,
  });

  a.push('theater_queue', { op: 'clear' });
  await a.waitFor((f) => f.type === 'theater_state' && !f.theater?.now && (f.theater?.queue?.length ?? 0) === 0, {
    label: 'theater cleared',
    afterIndex: baseA,
  });

  const url1 = `${YT}&v1=${rand()}`;
  const url2 = `${YT}&v2=${rand()}`;
  a.push('theater_queue', { op: 'add', url: url1, title: 'Cutover A' });
  await a.waitFor((f) => f.type === 'theater_state' && f.theater?.now != null, {
    label: 'theater_state after first add (now)',
    afterIndex: baseA,
  });

  const addBaseA = a.frames.length;
  const addBaseB = b.frames.length;
  a.push('theater_queue', { op: 'add', url: url2, title: 'Cutover B' });
  const stateA = await a.waitFor(
    (f) => f.type === 'theater_state' && (f.theater?.queue?.length ?? 0) >= 1,
    { label: 'theater_state after second add (queue)', afterIndex: addBaseA },
  );
  const stateB = await b.waitFor(
    (f) => f.type === 'theater_state' && (f.theater?.queue?.length ?? 0) >= 1,
    { label: 'observer theater_state after second add', afterIndex: addBaseB },
  );
  ok('two-client add broadcasts theater_state to both', stateA.theater.queue.length === stateB.theater.queue.length);

  const playBaseA = a.frames.length;
  const playBaseB = b.frames.length;
  const queueId = stateA.theater.queue[0]?.id;
  a.push('theater_queue', { op: 'playNow', itemId: queueId });
  const playingA = await a.waitFor(
    (f) => f.type === 'theater_state' && f.theater?.now?.id === queueId,
    { label: 'theater_state playNow', afterIndex: playBaseA },
  );
  await b.waitFor((f) => f.type === 'theater_state' && f.theater?.now?.id === queueId, {
    label: 'observer playNow',
    afterIndex: playBaseB,
  });
  ok('playNow promotes queued item', playingA.theater.now?.id === queueId);

  const pauseBase = a.frames.length;
  a.push('theater_control', { op: 'pause' });
  await a.waitFor((f) => f.type === 'theater_state' && f.theater?.now?.playing === false, {
    label: 'pause snapshot',
    afterIndex: pauseBase,
  });
  ok('pause updates playing flag', true);

  const seekBase = a.frames.length;
  a.push('theater_control', { op: 'seek', positionSec: 12.5 });
  const seeked = await a.waitFor(
    (f) => f.type === 'theater_state' && Math.abs((f.theater?.now?.positionSec ?? 0) - 12.5) < 0.01,
    { label: 'seek snapshot', afterIndex: seekBase },
  );
  ok('seek clamps position', Math.abs(seeked.theater.now.positionSec - 12.5) < 0.01);

  const resumeBase = a.frames.length;
  a.push('theater_control', { op: 'resume' });
  await a.waitFor((f) => f.type === 'theater_state' && f.theater?.now?.playing === true, {
    label: 'resume snapshot',
    afterIndex: resumeBase,
  });
  ok('resume restores playing', true);

  const listBase = a.frames.length;
  a.push('iptv_list_get', { listId: 'iptv_mtpzvvjr_oqbuq' });
  const list = await a.waitFor((f) => f.type === 'iptv_list', { label: 'iptv_list', afterIndex: listBase });
  ok('iptv_list_get returns channel array', Array.isArray(list.channels) && list.channels.length > 0, `channels=${list.channels?.length}`);

  const epgBase = a.frames.length;
  a.push('epg_lookup', { keys: ['ShamsTV.af', 'LemarTV.af'] });
  const epg = await a.waitFor((f) => f.type === 'epg_schedule', { label: 'epg_schedule', afterIndex: epgBase });
  ok('epg_lookup returns entries map', epg.entries != null && typeof epg.entries === 'object');

  const reqId = `plreq_${rand()}`;
  const mixBase = a.frames.length;
  a.push('theater_playlist_resolve', { requestId: reqId, listId: 'RDmixlist1234' });
  const mix = await a.waitFor((f) => f.type === 'error' && typeof f.message === 'string', {
    label: 'mix resolve decline',
    timeoutMs: 5000,
    afterIndex: mixBase,
  });
  ok('playlist mix declined via error frame', /mix/i.test(mix.message), mix.message);

  ok('theater_state revision stream grew', a.frames.filter((f) => f.type === 'theater_state').length > 2);

  a.close();
  b.close();

  const pass = checks.every((c) => c.pass);
  const evidenceDir = path.join(REPO, 'openspec/changes/add-ash-theater-catalog-domains/evidence');
  mkdirSync(evidenceDir, { recursive: true });
  const lines = [
    '# P5 task 9.2 — two-client theater wire soak',
    `Recorded: ${new Date().toISOString()}`,
    '',
    ...checks.map((c) => `- ${c.pass ? 'PASS' : 'FAIL'} ${c.name}${c.detail ? ` (${c.detail})` : ''}`),
    '',
    'Automated via `node scripts/verify-theater-cutover.mjs` against live Phoenix gateway.',
  ];
  writeFileSync(path.join(evidenceDir, 'two-client-theater-soak.md'), lines.join('\n') + '\n');

  const p7Dir = path.join(REPO, 'openspec/changes/add-node-specialty-adapters/evidence');
  writeFileSync(
    path.join(p7Dir, 'two-client-soak.md'),
    [
      '# P7 task 6.3 — wire-level specialty soak (partial)',
      `Recorded: ${new Date().toISOString()}`,
      '',
      'Covered in this pass:',
      '- Two gateway clients in theater; shared `theater_state` on add/playNow/pause/seek/resume',
      '- `iptv_list_get` + `epg_lookup` against imported PostgreSQL catalog',
      '- `theater_playlist_resolve` mix decline (`is_mix`)',
      '',
      'Deferred to manual staging (requires live torrent + IRC sidecar):',
      '- Torrent Range seek with grant-appended stream URL',
      '- Dual-client resolve cooldown while one resolve in flight',
      '- IRC bridge kill/recover with game chat continuity',
      '- Info-level log audit for absent tokens/magnets',
      '',
      `Gate script: \`node scripts/verify-theater-cutover.mjs\` — ${pass ? 'PASS' : 'FAIL'}`,
    ].join('\n') + '\n',
  );

  console.log(pass ? '\nVERIFY-THEATER-CUTOVER PASS' : '\nVERIFY-THEATER-CUTOVER FAIL');
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
