/**
 * P2 gate browser harness (task 3.11) — STRICT SINGLE-SESSION MODE.
 *
 * Exactly one Chromium session exists at any moment. A startup guard refuses
 * to launch when leftover chrome processes exist. Every phase closes its
 * session in `finally`, on signals, and on exit.
 *
 * Navigation uses the opt-in ?debug=1 hook (window.__afterlight) and an
 * adaptive walker that probes which movement key reduces distance — robust
 * under any camera mode and under heavy headless fps variance.
 *
 * Usage: node scripts/p2-gate-browser.mjs <phase>
 * Phases: boot | crawl
 *
 * Dev-only tool: never imported by the app or the test suites.
 */

import { execSync } from 'node:child_process';

const DRIVER = 'http://127.0.0.1:9515';
const APP = 'http://localhost:4173/?room=theater&debug=1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log('[gate]', ...a);

let LIVE = null;
let closing = false;

function chromeProcessCount() {
  try {
    return Number(execSync("ps -eo comm | grep -cE '^(chromedriver|chrome)$' || true", { shell: '/bin/bash' }).toString().trim()) || 0;
  } catch {
    return -1;
  }
}

function guardBeforeLaunch() {
  const n = chromeProcessCount();
  if (n > 1) {
    throw new Error(
      `SAFETY GUARD: ${n} chrome/chromedriver processes exist (expected <= 1). ` +
        'Clean up strays first: pkill -9 -f chromedriver; pkill -9 -f "chrome"',
    );
  }
}

async function closeAll() {
  const id = LIVE;
  LIVE = null;
  if (id == null) return;
  try {
    await fetch(`${DRIVER}/session/${id}`, { method: 'DELETE' });
  } catch {}
}

for (const sig of ['SIGINT', 'SIGTERM', 'uncaughtException', 'unhandledRejection']) {
  process.on(sig, async (err) => {
    if (err) console.error('[gate] fatal:', err?.message || err);
    await closeAll();
    process.exit(1);
  });
}
process.on('exit', () => {
  if (LIVE != null) {
    try {
      execSync(`curl -s -X DELETE ${DRIVER}/session/${LIVE} -o /dev/null`, { timeout: 3000 });
    } catch {}
  }
});

async function req(method, path, body = null, allowFail = false) {
  const res = await fetch(`${DRIVER}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : null,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status >= 400 && !allowFail) {
    throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return data.value;
}

async function newSession(name, { webgpu = true } = {}) {
  guardBeforeLaunch();
  const res = await fetch(`${DRIVER}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      capabilities: {
        browserName: 'chrome',
        'goog:chromeOptions': {
          args: [
            '--headless=new',
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--use-gl=angle',
            '--use-angle=swiftshader',
            '--window-size=800,600',
            '--mute-audio',
            ...(webgpu ? [] : ['--disable-webgpu']),
          ],
          binary: '/usr/bin/chromium-browser',
        },
      },
    }),
  });
  const data = await res.json();
  const id = data.value?.sessionId ?? data.sessionId;
  if (!id) throw new Error(`session ${name}: ${JSON.stringify(data).slice(0, 200)}`);
  LIVE = id;
  log(`session ${name} = ${id}`);
  return { name, id };
}

async function js(s, script) {
  return req('POST', `/session/${s.id}/execute/sync`, { script, args: [] });
}

async function go(s, url = APP) {
  await req('POST', `/session/${s.id}/url`, { url });
}

const KEYDOWN = (code, key) => `
  document.body.dispatchEvent(new KeyboardEvent('keydown', { code: ${JSON.stringify(code)}, key: ${JSON.stringify(key ?? code.slice(3).toLowerCase())}, bubbles: true, cancelable: true })); return true;`;
const KEYUP = (code, key) => `
  document.body.dispatchEvent(new KeyboardEvent('keyup', { code: ${JSON.stringify(code)}, key: ${JSON.stringify(key ?? code.slice(3).toLowerCase())}, bubbles: true })); return true;`;

const keyDown = (s, code, key) => js(s, KEYDOWN(code, key));
const keyUp = (s, code, key) => js(s, KEYUP(code, key));

async function tap(s, code, holdMs = 60) {
  await keyDown(s, code);
  await sleep(holdMs);
  await keyUp(s, code);
}

async function readAction(s) {
  const t = await js(s, `return (document.getElementById('action-title')?.textContent || '') + ' || ' + (document.getElementById('action-sub')?.textContent || '');`);
  return t || '';
}

const readToast = (s) => js(s, `return { t: document.getElementById('toast-title')?.textContent, b: document.getElementById('toast-body')?.textContent, k: document.getElementById('toast-type')?.textContent };`);
const chatText = (s) => js(s, `return document.getElementById('chat-log')?.innerText.slice(-400);`);

async function waitWorld(s, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ok = await js(s, `return !!document.querySelector('canvas') && !!document.getElementById('action-title') && !document.getElementById('loading');`);
      if (ok) return true;
    } catch {}
    await sleep(1500);
  }
  return false;
}

const pos = async (s) => {
  try {
    const p = await js(s, `return window.__afterlight ? window.__afterlight.player() : null;`);
    return Array.isArray(p) ? p : null;
  } catch {
    return null;
  }
};

// Adaptive walker: probe which movement key reduces distance (works under
// any camera mode), then hold it with progress checks and re-probe on stalls.
async function runTo(s, tx, tz, timeoutMs = 240000) {
  const start = Date.now();
  const path = [];
  const dist = (p) => Math.hypot(tx - p[0], tz - p[1]);

  while (Date.now() - start < timeoutMs) {
    let p = await pos(s);
    if (!p) {
      await sleep(1200);
      continue;
    }
    path.push(p);
    if (dist(p) <= 1.0) return { ok: true, path, final: p };

    let bestKey = null;
    let bestDist = dist(p);
    for (const code of ['KeyW', 'KeyA', 'KeyS', 'KeyD']) {
      await keyDown(s, 'ShiftLeft');
      await keyDown(s, code);
      await sleep(650);
      await keyUp(s, code);
      await keyUp(s, 'ShiftLeft');
      const q = await pos(s);
      if (!q) continue;
      const d = dist(q);
      if (d < bestDist) {
        bestDist = d;
        bestKey = code;
      }
      p = q;
      if (d <= 1.0) return { ok: true, path, final: q };
    }

    if (!bestKey) {
      // Wedged: no key improves. Nudge sideways to shake loose.
      for (const code of ['KeyA', 'KeyD', 'KeyS', 'KeyW']) {
        await keyDown(s, 'ShiftLeft');
        await keyDown(s, code);
        await sleep(500);
        await keyUp(s, code);
        await keyUp(s, 'ShiftLeft');
      }
      continue;
    }

    let stalls = 0;
    await keyDown(s, 'ShiftLeft');
    await keyDown(s, bestKey);
    try {
      while (Date.now() - start < timeoutMs) {
        await sleep(900);
        const q = await pos(s);
        if (!q) continue;
        path.push(q);
        const d = dist(q);
        if (d <= 1.0) return { ok: true, path, final: q };
        if (d < bestDist - 0.05) {
          bestDist = d;
          stalls = 0;
        } else if (++stalls >= 3) break;
      }
    } finally {
      await keyUp(s, bestKey).catch(() => {});
      await keyUp(s, 'ShiftLeft').catch(() => {});
    }
  }
  return { ok: false, path, final: path[path.length - 1] ?? null };
}

async function shot(s, file) {
  const b64 = await req('GET', `/session/${s.id}/screenshot`);
  const { writeFileSync } = await import('node:fs');
  writeFileSync(`/tmp/opencode/p2/${file}.png`, Buffer.from(b64, 'base64'));
  return `/tmp/opencode/p2/${file}.png`;
}

const consoleErrors = (s) => req('GET', `/session/${s.id}/se/log/console`, null, true).catch(() => []);
const fatalErrors = (entries) =>
  (Array.isArray(entries) ? entries : (entries?.value ?? []))
    .filter((e) => e.level === 'SEVERE')
    .map((e) => e.message)
    .filter((m) => !/net::ERR|favicon|fonts\.gstatic|googleapis|ExtensionService|GroupMarkerNotSet/.test(m));

async function recordsFor(s, game) {
  await js(s, `document.getElementById('btn-records')?.click(); return true;`);
  await sleep(500);
  const okTab = await js(s, `
    const tabs = [...document.querySelectorAll('.leaderboard-tab')];
    const tab = tabs.find(t => t.textContent.toLowerCase().includes(${JSON.stringify(game)}));
    if (tab) { tab.click(); return true; } return false;`);
  await sleep(2000);
  const rows = await js(s, `return [...document.querySelectorAll('#leaderboard-rows .leaderboard-row, #leaderboard-rows .leaderboard-empty, #leaderboard-rows .leaderboard-note')].map(r => r.innerText.replace(/\\n/g, ' · '));`);
  const page = await js(s, `return document.getElementById('leaderboard-page')?.textContent;`);
  await js(s, `document.getElementById('close-leaderboard')?.click(); return true;`);
  await sleep(300);
  return { okTab, rows, page };
}

async function chatSend(s, text) {
  await js(s, `
    const input = document.getElementById('chat-input');
    const form = document.getElementById('chat-form');
    if (!input || !form) return false;
    input.focus();
    input.value = ${JSON.stringify(text)};
    form.requestSubmit();
    return true;`);
}

// --- phases (each exactly one session) ---

async function boot() {
  const p1 = await newSession('p1');
  try {
    await go(p1);
    await sleep(13000);
    await waitWorld(p1);
    const out = {
      canvas: await js(p1, `return !!document.querySelector('canvas');`),
      hud: await js(p1, `return document.body.dataset.hudContext || 'none';`),
      title: await js(p1, `return document.title;`),
      action: await readAction(p1),
      player: await pos(p1),
      fatal: fatalErrors(await consoleErrors(p1)),
      records: await recordsFor(p1, 'records'),
    };
    await chatSend(p1, 'p2-gate: single-client boot check');
    await sleep(1500);
    out.chatEcho = (await chatText(p1)).includes('p2-gate: single-client boot check');
    console.log(JSON.stringify(out, null, 2));
  } finally {
    await closeAll();
  }
}

// Play one cabinet: join via E, drive to a terminal state, read Records.
async function playOne(p1, name) {
  const out = { joined: null, terminal: null, records: null };
  await tap(p1, 'KeyE');
  await sleep(3500);
  out.joined = {
    action: await readAction(p1),
    toast: await readToast(p1),
    state: await js(p1, `return window.__afterlight ? window.__afterlight.participation() : null;`),
  };

  const deadline = Date.now() + 240000;
  if (name === 'Sporefall') {
    while (Date.now() < deadline) {
      await keyDown(p1, 'Space');
      await sleep(140);
      await keyUp(p1, 'Space');
      await sleep(300);
      const action = await readAction(p1);
      if (!action.includes('stop playing')) break;
    }
  } else if (name === 'Signal Lost') {
    // Stationary ship: drifting asteroids drain the three lives to the end.
    while (Date.now() < deadline) {
      await keyDown(p1, 'Space');
      await sleep(120);
      await keyUp(p1, 'Space');
      await sleep(400);
      const action = await readAction(p1);
      if (!action.includes('stop playing')) break;
    }
  } else if (name === 'Rain Runner') {
    await keyDown(p1, 'KeyW');
    while (Date.now() < deadline) {
      const action = await readAction(p1);
      if (!action.includes('stop playing')) break;
      await sleep(800);
    }
    await keyUp(p1, 'KeyW').catch(() => {});
  } else {
    out.terminal = { action: await readAction(p1), note: 'solo seat only' };
    await tap(p1, 'Escape');
    await sleep(1500);
    return out;
  }

  out.terminal = {
    action: await readAction(p1),
    toast: await readToast(p1),
    state: await js(p1, `return window.__afterlight ? window.__afterlight.participation() : null;`),
  };
  await sleep(6000);
  const game = name === 'Signal Lost' ? 'signal' : name.split(' ')[0].toLowerCase();
  out.records = await recordsFor(p1, game).catch((e) => ({ error: String(e) }));
  await shot(p1, `crawl-${name.replace(/\s+/g, '-').toLowerCase()}`).catch(() => {});

  // Leave the cabinet (safe dismount).
  await tap(p1, 'Escape');
  await sleep(2000);
  return out;
}

// Arcade crawl (ONE session): visit each authored cabinet anchor, play the
// run to a terminal state, check its records, continue.
async function arcadeCrawl() {
  const p1 = await newSession('p1');
  try {
    await go(p1);
    await sleep(14000);
    await waitWorld(p1);

    const evidence = { cabinets: {}, fatal: null };

    // Camera mode 1: WASD become pure axes, so the adaptive walker's probes
    // map directly to world directions.
    await tap(p1, 'KeyC');
    await sleep(400);

    const ANCHORS = [
      { name: 'Sporefall', x: 9.9, z: -1.8 },
      { name: 'Signal Lost', x: 9.3, z: -3.85 },
      { name: 'Rain Runner', x: 9.3, z: -5.9 },
    ];

    for (const anchor of ANCHORS) {
      const start = await pos(p1);
      log('walking to', anchor.name, 'from', JSON.stringify(start));
      const walk = await runTo(p1, anchor.x, anchor.z, 240000);
      log('walked:', JSON.stringify({ ok: walk.ok, final: walk.final }));
      const action = await readAction(p1);
      if (!walk.ok || !action.includes(anchor.name)) {
        evidence.cabinets[anchor.name] = { error: 'prompt not found', action, final: walk.final };
        continue;
      }
      const played = await playOne(p1, anchor.name);
      evidence.cabinets[anchor.name] = played;
      log(anchor.name, '->', JSON.stringify(played.terminal));
    }

    evidence.fatal = fatalErrors(await consoleErrors(p1));
    console.log(JSON.stringify(evidence, null, 2));
  } finally {
    await closeAll();
  }
}

const phase = process.argv[2];

if (phase === 'boot') await boot();
else if (phase === 'crawl') await arcadeCrawl();
else {
  console.log('phases: boot | crawl');
  process.exit(1);
}
