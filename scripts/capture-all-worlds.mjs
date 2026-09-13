#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { createConnection, createServer } from 'node:net';
import { dirname, resolve, join } from 'node:path';
import os from 'node:os';
import WebSocket from 'ws';

const ROOT = resolve(import.meta.dirname, '..');
const OUT_DIR = process.env.OUT_DIR || '/tmp/world-captures';

const TARGETS = [
  { id: 'coastal', name: 'Coastal Dusk', preset: 'env-coastal-sunset' },
  { id: 'coastal-midnight', name: 'Coastal Dusk (Midnight)', preset: 'env-coastal-midnight' },
  { id: 'rainforest', name: 'Rainforest Canopy', preset: 'env-rainforest-mist' },
  { id: 'rainforest-afternoon', name: 'Rainforest Canopy (Afternoon)', preset: 'env-rainforest-afternoon' },
  { id: 'alpine', name: 'Alpine Aurora', preset: 'env-alpine-aurora' },
  { id: 'alpine-morning', name: 'Alpine Aurora (Morning)', preset: 'env-alpine-morning' },
  { id: 'desert', name: 'Desert Oasis', preset: 'env-desert-golden' },
  { id: 'desert-night', name: 'Desert Oasis (Night)', preset: 'env-desert-night' },
  { id: 'redwood', name: 'Ancient Redwood Forest', preset: 'env-redwood-firefly' },
  { id: 'redwood-sunshafts', name: 'Ancient Redwood Forest (Sunshafts)', preset: 'env-redwood-sunshafts' },
  { id: 'cloud', name: 'Cloud Garden', preset: 'env-cloud-sunrise' },
  { id: 'cloud-day', name: 'Cloud Garden (Day)', preset: 'env-cloud-day' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getFreePort() {
  return new Promise((resolvePort, reject) => {
    const s = createServer();
    s.listen(0, '127.0.0.1', () => {
      const port = s.address().port;
      s.close(() => resolvePort(port));
    });
    s.on('error', reject);
  });
}

function waitPort(port, ms = 15000) {
  const t0 = Date.now();
  return new Promise((resolvePort, reject) => {
    const tryOnce = () => {
      const s = createConnection({ host: '127.0.0.1', port }, () => { s.end(); resolvePort(); });
      s.on('error', () => {
        if (Date.now() - t0 > ms) reject(new Error(`CDP port ${port} timed out`));
        else setTimeout(tryOnce, 120);
      });
    };
    tryOnce();
  });
}

function findChrome() {
  if (process.env.CHROME && existsSync(process.env.CHROME)) return process.env.CHROME;
  for (const c of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/snap/bin/chromium']) {
    if (existsSync(c)) return c;
  }
  return null;
}

class Cdp {
  constructor(wsUrl) { this.ws = new WebSocket(wsUrl); this.id = 0; this.pending = new Map(); }
  async connect() {
    await new Promise((res, rej) => { this.ws.once('open', res); this.ws.once('error', rej); });
    this.ws.on('message', (raw) => {
      const msg = JSON.parse(raw);
      if (msg.id && this.pending.has(msg.id)) this.pending.get(msg.id)(msg);
    });
  }
  send(method, params = {}) {
    return new Promise((resolveSend) => {
      const n = ++this.id;
      this.pending.set(n, resolveSend);
      this.ws.send(JSON.stringify({ id: n, method, params }));
    });
  }
  close() { try { this.ws.close(); } catch {} }
}

async function evaluate(cdp, expression) {
  const r = await cdp.send('Runtime.evaluate', {
    expression: `(() => { try { return JSON.stringify((() => { ${expression} })()); } catch (e) { return JSON.stringify({ __error: String(e && e.message || e) }); } })()`,
    returnByValue: true,
    awaitPromise: true,
  });
  const value = r.result?.result?.value;
  if (!value) return null;
  try { return JSON.parse(value); } catch { return value; }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const chromeBin = findChrome();
  if (!chromeBin) throw new Error('No chrome found');

  const cdpPort = await getFreePort();
  const profileDir = `${os.tmpdir()}/al-shots-${Date.now()}`;

  const width = 1920;
  const height = 1080;

  const chrome = spawn(chromeBin, [
    '--headless=new', '--no-sandbox', '--disable-setuid-sandbox',
    `--window-size=${width},${height}`,
    '--enable-unsafe-swiftshader', '--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader',
    `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${profileDir}`,
    'about:blank',
  ], { stdio: 'ignore' });

  let cdp = null;
  try {
    await waitPort(cdpPort);
    const targets = await fetch(`http://127.0.0.1:${cdpPort}/json/list`).then((r) => r.json());
    const page = targets.find((t) => t.type === 'page') || targets[0];
    cdp = new Cdp(page.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width, height, deviceScaleFactor: 1, mobile: false,
    });

    console.log('Navigating to game...');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/?room=theater&debug=1' });

    const t0 = Date.now();
    let ready = false;
    while (Date.now() - t0 < 30000) {
      const probe = await evaluate(cdp, 'return !!(window.__afterlight && document.querySelector("canvas"));');
      if (probe === true) { ready = true; break; }
      await sleep(300);
    }
    if (!ready) throw new Error('Timed out waiting for window.__afterlight');
    console.log('Game loaded, warming up...');
    await sleep(6000);

    // Leave cinema view (Escape)
    await evaluate(cdp, `
      const fire = (code, key) => {
        document.body.dispatchEvent(new KeyboardEvent('keydown', { code, key, bubbles: true, cancelable: true }));
        document.body.dispatchEvent(new KeyboardEvent('keyup', { code, key, bubbles: true, cancelable: true }));
      };
      fire('Escape', 'Escape');
    `);
    await sleep(800);

    // Clean up UI
    await evaluate(cdp, `
      const toast = document.getElementById('toast');
      if (toast) toast.remove();
      const toasts = document.querySelectorAll('.toast');
      toasts.forEach(t => t.remove());

      const chat = document.getElementById('chat-panel') || document.getElementById('chat-container');
      if (chat) chat.style.display = 'none';

      const interact = document.getElementById('interact');
      if (interact) interact.style.display = 'none';

      const netInd = document.getElementById('net-indicator');
      if (netInd) {
        netInd.textContent = '● ONLINE';
        netInd.className = 'live';
      }
    `);
    await sleep(500);

    for (const target of TARGETS) {
      console.log(`Setting environment: ${target.name} (${target.preset})...`);
      await evaluate(cdp, `window.__afterlight.setEnvironment('${target.preset}');`);
      // Wait for environment transition and particles to settle
      await sleep(2500);

      // Re-clean any toasts that might have triggered on preset switch
      await evaluate(cdp, `
        const toasts = document.querySelectorAll('.toast');
        toasts.forEach(t => t.remove());
      `);

      const outPath = join(OUT_DIR, `${target.id}.png`);
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(outPath, Buffer.from(shot.result.data, 'base64'));
      console.log(`Saved: ${outPath}`);
    }

    console.log('All screenshots captured successfully!');
  } finally {
    cdp?.close();
    chrome.kill('SIGKILL');
    try { rmSync(profileDir, { recursive: true, force: true }); } catch {}
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
