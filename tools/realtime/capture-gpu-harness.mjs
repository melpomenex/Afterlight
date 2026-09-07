// Headless capture of tools/realtime/gpu-harness.html → JSON + PNG.
// Usage: node tools/realtime/capture-gpu-harness.mjs [baseUrl]
import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { createConnection } from 'node:net';
import WebSocket from 'ws';

const BASE = process.argv[2] || 'http://127.0.0.1:5180';
const OUT = new URL('../../openspec/changes/add-realtime-gpu-rendering/evidence/', import.meta.url);
const PORT = 9334;
const CHROME = process.env.CHROME || '/snap/bin/chromium';

function waitPort(port, ms = 8000) {
  const t0 = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const s = createConnection({ host: '127.0.0.1', port }, () => { s.end(); resolve(); });
      s.on('error', () => {
        if (Date.now() - t0 > ms) reject(new Error('cdp port timeout'));
        else setTimeout(tryOnce, 80);
      });
    };
    tryOnce();
  });
}

const headed = process.env.HEADED === '1';
const chrome = spawn(CHROME, [
  ...(headed ? [] : ['--headless=new']),
  '--no-sandbox',
  '--window-size=1280,900',
  '--enable-unsafe-webgpu', '--use-angle=swiftshader', '--use-gl=angle',
  `--remote-debugging-port=${PORT}`,
  '--user-data-dir=/tmp/al-gpu-harness-profile',
  `${BASE}/tools/realtime/gpu-harness.html?capture=1${process.argv[3] || ''}`,
], { stdio: ['ignore', 'pipe', 'pipe'] });

await waitPort(PORT);
const targets = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
const page = targets.find((t) => t.type === 'page' && t.url.includes('gpu-harness'))
  || targets.find((t) => t.type === 'page') || targets[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.once('open', r); ws.once('error', j); });

let id = 0;
const pending = new Map();
ws.on('message', (raw) => {
  const msg = JSON.parse(raw);
  if (msg.id && pending.has(msg.id)) pending.get(msg.id)(msg);
});
const send = (method, params = {}) => new Promise((resolve) => {
  const n = ++id;
  pending.set(n, resolve);
  ws.send(JSON.stringify({ id: n, method, params }));
});

await send('Runtime.enable');
let harness = null;
for (let i = 0; i < 80; i++) {
  const r = await send('Runtime.evaluate', {
    expression: 'window.__gpuHarness && (window.__gpuHarness.frames && window.__gpuHarness.frames.count || window.__gpuHarness.error) ? JSON.stringify(window.__gpuHarness) : null',
    returnByValue: true,
  });
  if (r.result?.result?.value) {
    harness = JSON.parse(r.result.result.value);
    break;
  }
  await new Promise((res) => setTimeout(res, 150));
}
const shot = await send('Page.captureScreenshot', { format: 'png' });
await mkdir(OUT, { recursive: true });
if (shot.result?.data) {
  await writeFile(new URL('harness-fifty.png', OUT), Buffer.from(shot.result.data, 'base64'));
}
await writeFile(new URL('harness.json', OUT), JSON.stringify(harness ?? { error: 'timeout' }, null, 2));
ws.close();
chrome.kill('SIGKILL');
console.log(JSON.stringify(harness ?? { error: 'timeout' }, null, 2));
