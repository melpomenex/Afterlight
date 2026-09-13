#!/usr/bin/env node
/**
 * Dream Loop capture harness for the Theater Environment campaign.
 *
 * Deterministic, headless Chromium screenshots of the running game through
 * the raw CDP protocol (no Playwright dependency). Used by the visual
 * iteration loop to compare the live implementation against a target image
 * at a fixed viewport and camera pose.
 *
 * Dev-only tool: never imported by the app or the test suites.
 *
 * Usage:
 *   node tools/dream-loop/capture.mjs --out .dream-loop/iterations/001/screenshot.png
 *
 * Options:
 *   --url <url>        Page URL (default http://localhost:5173/?room=theater&debug=1)
 *   --out <file>       Output PNG path (required)
 *   --width/--height   Viewport (default 1920x1080)
 *   --camera <0|1|2|3> Orthographic angle / first person (default 0)
 *   --eval <js>        Extra expression evaluated after pose, before capture
 *   --wait-ms <ms>     Warm-up before the capture (default 6000)
 *   --settle-ms <ms>   Wait after camera/eval changes (default 1200)
 *   --no-pose          Do not leave cinema view / set camera mode
 *   --leave-settings   Press Escape once more to open settings? (never)
 *   --json             Print a JSON result line (default: true)
 */

import { spawn, execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { createConnection, createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import os from 'node:os';
import WebSocket from 'ws';

function parseArgs(argv) {
  const args = {
    url: 'http://localhost:5173/?room=theater&debug=1',
    out: null,
    width: 1920,
    height: 1080,
    camera: 0,
    eval: null,
    waitMs: 6000,
    settleMs: 1200,
    pose: true,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--no-pose') args.pose = false;
    else if (a === '--url') args.url = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--width') args.width = Number(argv[++i]);
    else if (a === '--height') args.height = Number(argv[++i]);
    else if (a === '--camera') args.camera = Number(argv[++i]);
    else if (a === '--eval') args.eval = argv[++i];
    else if (a === '--wait-ms') args.waitMs = Number(argv[++i]);
    else if (a === '--settle-ms') args.settleMs = Number(argv[++i]);
  }
  return args;
}

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
  const args = parseArgs(process.argv.slice(2));
  if (!args.out) { console.error('--out is required'); process.exit(2); }
  const chromeBin = findChrome();
  if (!chromeBin) { console.error('No chromium binary found'); process.exit(2); }

  const outPath = resolve(process.cwd(), args.out);
  mkdirSync(dirname(outPath), { recursive: true });
  const cdpPort = await getFreePort();
  const profileDir = `${os.tmpdir()}/al-dl-profile-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  const chrome = spawn(chromeBin, [
    '--headless=new', '--no-sandbox', '--disable-setuid-sandbox',
    `--window-size=${args.width},${args.height}`,
    '--enable-unsafe-swiftshader', '--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader',
    `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${profileDir}`,
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'ignore'] });

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
      width: args.width, height: args.height, deviceScaleFactor: 1, mobile: false,
    });

    // Collect console errors for honest reporting.
    const consoleErrors = [];
    cdp.ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw);
        if (msg.method === 'Runtime.exceptionThrown') {
          consoleErrors.push(msg.params?.exceptionDetails?.exception?.description || 'exception');
        } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params?.type === 'error') {
          consoleErrors.push((msg.params.args || []).map(a => a.value ?? a.description ?? '').join(' '));
        }
      } catch {}
    });

    await cdp.send('Page.navigate', { url: args.url });
    // Wait for the debug hook and the first rendered frames.
    const t0 = Date.now();
    let ready = false;
    while (Date.now() - t0 < 30000) {
      const probe = await evaluate(cdp, 'return !!(window.__afterlight && document.querySelector("canvas"));');
      if (probe === true) { ready = true; break; }
      await sleep(300);
    }
    if (!ready) throw new Error('Timed out waiting for window.__afterlight');
    await sleep(Math.max(800, args.waitMs));

    if (args.pose) {
      // Leave cinema view (Escape) without opening settings, then choose the
      // requested camera mode by pressing C the right number of times.
      await evaluate(cdp, `
        const fire = (code, key) => {
          document.body.dispatchEvent(new KeyboardEvent('keydown', { code, key, bubbles: true, cancelable: true }));
          document.body.dispatchEvent(new KeyboardEvent('keyup', { code, key, bubbles: true, cancelable: true }));
        };
        fire('Escape', 'Escape');
        return document.body.className;
      `);
      await sleep(400);
      if (args.camera > 0) {
        for (let i = 0; i < args.camera; i++) {
          await evaluate(cdp, `
            document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyC', key: 'c', bubbles: true, cancelable: true }));
            document.body.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyC', key: 'c', bubbles: true, cancelable: true }));
            return true;
          `);
          await sleep(300);
        }
      }
    }

    let evalResult = null;
    if (args.eval) {
      evalResult = await evaluate(cdp, args.eval);
      if (evalResult && evalResult.__error) console.error('[capture] eval error:', evalResult.__error);
    }
    await sleep(args.settleMs);

    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    if (!shot.result?.data) throw new Error('Screenshot returned no data');
    writeFileSync(outPath, Buffer.from(shot.result.data, 'base64'));

    const stats = await evaluate(cdp, `
      const r = window.__afterlight;
      return {
        room: r ? r.room() : null,
        player: r ? r.player() : null,
        camera: window.__afterlight ? true : false,
      };
    `);

    console.log(JSON.stringify({
      ok: true, out: outPath, url: args.url, width: args.width, height: args.height,
      camera: args.camera, stats, evalResult, consoleErrors: consoleErrors.slice(0, 10),
    }));
  } finally {
    cdp?.close();
    chrome.kill('SIGKILL');
    try { rmSync(profileDir, { recursive: true, force: true }); } catch {}
  }
}

main().catch((error) => {
  console.error('[capture] fatal:', error.message);
  process.exit(1);
});
