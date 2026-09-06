#!/usr/bin/env node
/**
 * P0 baseline measurement: boots the real Node server against a throwaway
 * data directory, drives two scripted WebSocket clients through
 * hello/join/movement, and records room broadcast frame sizes over a fixed
 * window. Optionally runs the AFTERLIGHT_BASELINE_PROBE to capture
 * save-latency and event-loop diagnostics, plus a no-probe control run.
 *
 * Prints a summary; full distributions land in
 * docs/architecture/elixir/baseline-node.md (paste raw output there).
 *
 * Usage: node scripts/measure-node-baseline.mjs [--seconds 15] [--no-probe-run]
 */

import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const SECONDS = Number(arg('seconds', 15));
const SKIP_CONTROL = process.argv.includes('--no-control-run');

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

function summarize(samples) {
  const sizes = samples.map((s) => s.bytes).sort((a, b) => a - b);
  const perSecond = new Map();
  for (const s of samples) {
    const bucket = Math.floor(s.t / 1000);
    perSecond.set(bucket, (perSecond.get(bucket) ?? 0) + s.bytes);
  }
  const seconds = [...perSecond.values()].sort((a, b) => a - b);
  return {
    frames: samples.length,
    bytesP50: percentile(sizes, 50),
    bytesP95: percentile(sizes, 95),
    bytesMax: sizes.at(-1) ?? 0,
    perSecondP50: percentile(seconds, 50),
    perSecondMax: seconds.at(-1) ?? 0,
  };
}

function startServer({ cwd, port, probe }) {
  const child = spawn(process.execPath, [path.join(REPO_ROOT, 'server', 'index.js')], {
    cwd,
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      IRC_DISABLED: '1',
      ...(probe ? { AFTERLIGHT_BASELINE_PROBE: '1' } : {}),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const probeLines = [];
  child.stderr.on('data', (chunk) => {
    for (const line of chunk.toString().split('\n')) {
      if (line.startsWith('{')) probeLines.push(line);
    }
  });
  return { child, probeLines };
}

async function waitHealthy(port, tries = 50) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`server on :${port} never became healthy`);
}

/** One scripted client: hello → join market → movement at ~10 Hz. */
function client(port, id, x0, onFrame) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const send = (obj) => ws.send(JSON.stringify(obj));
    ws.addEventListener('error', (err) => reject(new Error(`ws error: ${err.message ?? err}`)));
    ws.addEventListener('open', () => {
      send({ type: 'hello', guestId: `baseline_${id}`, nickname: `Baseliner ${id}` });
      send({ type: 'join_room', roomId: 'market' });
      let n = 0;
      const mover = setInterval(() => {
        const t = n++ / 10;
        send({ type: 'movement', x: x0 + Math.sin(t) * 2, z: 0.5 * Math.cos(t), rotY: t, walking: true, sitting: false, airborne: false });
      }, 100);
      ws.addEventListener('close', () => clearInterval(mover));
      resolve({ ws, send });
    });
    ws.addEventListener('message', (event) => {
      const data = event.data;
      try {
        const text = typeof data === 'string' ? data : Buffer.from(data).toString('utf8');
        const msg = JSON.parse(text);
        if (msg.type === 'presence_update') {
          const bytes = typeof data === 'string' ? Buffer.byteLength(data) : data.byteLength;
          onFrame({ t: Date.now(), bytes });
        }
      } catch {}
    });
  });
}

async function runOnce({ port, probe, seconds }) {
  const cwd = await mkdtemp(path.join(tmpdir(), 'afterlight-baseline-'));
  const { child, probeLines } = startServer({ cwd, port, probe });
  try {
    await waitHealthy(port);
    const frames = [];
    const a = await client(port, 'a', -2, (f) => frames.push(f));
    await client(port, 'b', 2, (f) => frames.push(f));
    await new Promise((r) => setTimeout(r, seconds * 1000));
    a.ws.close();
    return { frames, probeLines };
  } finally {
    child.kill('SIGTERM');
    await rm(cwd, { recursive: true, force: true });
  }
}

function parseProbe(lines) {
  const saves = [];
  const loops = [];
  for (const line of lines) {
    try {
      const rec = JSON.parse(line);
      if (rec.event === 'save') saves.push(rec.ms);
      if (rec.event === 'loop') loops.push(rec);
    } catch {}
  }
  const sorted = [...saves].sort((a, b) => a - b);
  return {
    saveCount: saves.length,
    saveP50: percentile(sorted, 50),
    saveP95: percentile(sorted, 95),
    saveMax: sorted.at(-1) ?? 0,
    loopP95: percentile(loops.map((l) => l.p95).sort((a, b) => a - b), 95),
    loopMax: Math.max(0, ...loops.map((l) => l.max)),
  };
}

const PORT = Number(arg('port', 3947));

console.log(`# measurement window: ${SECONDS}s, 2 clients @ ~10 Hz movement, market room`);
const main = await runOnce({ port: PORT, probe: true, seconds: SECONDS });
const mainSummary = summarize(main.frames);
const probe = parseProbe(main.probeLines);
console.log('## with probe', JSON.stringify(mainSummary));
console.log('## probe', JSON.stringify(probe));

if (!SKIP_CONTROL) {
  const control = await runOnce({ port: PORT + 1, probe: false, seconds: SECONDS });
  console.log('## no-probe control', JSON.stringify(summarize(control.frames)));
}
