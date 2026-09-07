import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { createConnection } from 'node:net';
import WebSocket from 'ws';

const PORT = 9336;
const OUT = '/tmp/wt-gpu-rendering/openspec/changes/add-realtime-gpu-rendering/evidence';

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

const chrome = spawn('/snap/bin/chromium', [
  '--headless=new', '--no-sandbox', '--window-size=1280,800',
  '--use-angle=swiftshader', '--use-gl=angle',
  `--remote-debugging-port=${PORT}`,
  '--user-data-dir=/tmp/al-live-parity-profile',
  'http://127.0.0.1:5173/',
], { stdio: ['ignore', 'pipe', 'pipe'] });

await waitPort(PORT);
await new Promise((r) => setTimeout(r, 2000));
const targets = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
const page = targets.find((t) => t.type === 'page' && String(t.url).includes('5173'))
  || targets.find((t) => t.type === 'page');
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
for (let i = 0; i < 40; i++) {
  const ready = await send('Runtime.evaluate', {
    expression: `!document.body?.innerText.includes('INITIALIZING') && !!document.querySelector('canvas')`,
    returnByValue: true,
  });
  if (ready.result?.result?.value) break;
  await new Promise((r) => setTimeout(r, 250));
}
const info = await send('Runtime.evaluate', {
  expression: `({ title: document.title, loc: document.getElementById('location')?.textContent, hud: document.body?.className })`,
  returnByValue: true,
});
const shot = await send('Page.captureScreenshot', { format: 'png' });
await mkdir(OUT, { recursive: true });
if (shot.result?.data) await writeFile(`${OUT}/live-default.png`, Buffer.from(shot.result.data, 'base64'));
await writeFile(`${OUT}/live-default.json`, JSON.stringify(info.result?.result?.value ?? info, null, 2));
console.log(JSON.stringify(info.result?.result?.value ?? info, null, 2));
ws.close();
chrome.kill('SIGKILL');
