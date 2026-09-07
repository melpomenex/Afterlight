import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { WebSocket } from 'ws';

const REPO = '$(git rev-parse --show-toplevel)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function oneRun(i) {
  const dir = mkdtempSync(path.join(tmpdir(), 'flake-'));
  const srv = spawn(process.execPath, [path.join(REPO, 'server', 'index.js')], {
    cwd: dir,
    env: { ...process.env, PORT: '3977', HOST: '127.0.0.1', IRC_DISABLED: '1' },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  await sleep(1500);
  const mk = (gid, nick) =>
    new Promise((res) => {
      const ws = new WebSocket('ws://127.0.0.1:3977');
      const frames = [];
      ws.on('message', (m) => {
        const f = JSON.parse(String(m));
        frames.push({ type: f.type, players: f.players?.length, ids: f.players?.map((p) => p.id)?.join('|')?.slice(0, 80) });
      });
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'hello', guestId: gid, nickname: nick }));
        setTimeout(() => res({ ws, frames }), 200);
      });
      ws.on('close', () => frames.push({ type: '<<CLOSED>>' }));
      ws.on('error', (e) => frames.push({ type: '<<ERR>>', players: e.message }));
    });
  const obs = await mk(`guest_obs_${i}`, 'Obs');
  const main = await mk(`guest_main_${i}`, 'Main');
  // main connects ~0 ms after obs (harness-like: no settle)
  const push = (c, type, fields) => c.ws.send(JSON.stringify({ type, ...fields }));

  push(obs, 'join_room', { roomId: 'market' });
  push(obs, 'movement', { x: 5.5, z: 2.5, rotY: 0.5, walking: false, sitting: false, airborne: false });
  await sleep(150);
  push(main, 'movement', { x: -2.5, z: 4.5, rotY: 0.25, walking: false, sitting: false, airborne: false });
  await sleep(120);
  push(main, 'join_room', { roomId: 'market' });
  const burst = [1, 2, 3, 4, 5].map((k) => ({ x: k * 0.5, z: -1 - k * 0.25, rotY: 0.1 * k, walking: true, sitting: false, airborne: false }));
  push(main, 'movement', burst[0]);
  await sleep(90);
  for (let k = 1; k < 5; k++) {
    push(main, 'movement', burst[k]);
    await sleep(15);
  }
  await sleep(500);
  const obsFlushes = obs.frames.filter((f) => f.type === 'presence_update');
  const sawMain = obsFlushes.some((f) => f.ids?.includes('main'));
  if (!sawMain) {
    console.log(`RUN ${i}: FLAKE — obs never saw main in a flush`);
    console.log('obs frames:', JSON.stringify(obs.frames));
    console.log('main frames:', JSON.stringify(main.frames.map((f) => f.type)));
  } else {
    console.log(`RUN ${i}: ok (${obsFlushes.length} flushes)`);
  }
  srv.kill();
  await sleep(150);
}

for (let i = 0; i < 8; i++) await oneRun(i);
process.exit(0);
