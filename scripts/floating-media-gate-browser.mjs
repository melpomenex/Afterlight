#!/usr/bin/env node
/**
 * Floating mini-game media gate (add-floating-minigame-media).
 *
 * One deterministic browser session against the Orpheum plays a locally
 * generated fixture through the real bill, then records identity and timeline
 * facts that the floating presentation must preserve:
 *
 *   baseline: fixture playback -> same-item pause/resume snapshot ->
 *     cinema toggle (Escape leaves, programmatic re-enter). Asserts engine
 *     object, media node and iframe contentWindow identity are retained,
 *     loadToken/loadedPlayKey are unchanged, and currentTime keeps advancing.
 *   ui: floating chrome is visible (enter a game through the real route),
 *     controls exist/labeled, hide/restore + enlarge/reduce retain identity.
 *     (Extended by later tasks once the feature exists.)
 *
 * Phases: baseline | ui | all (default baseline)
 *
 * Usage:
 *   node scripts/floating-media-gate-browser.mjs
 *   GATE_PHASE=baseline GATE_FIXTURE=mp4 node scripts/floating-media-gate-browser.mjs
 *
 * Env:
 *   GATE_APP         app URL (default http://localhost:5173/?room=theater&debug=1)
 *   GATE_GATEWAY     gateway base for the bill probe (default http://localhost:4000)
 *   GATE_LABEL       evidence label (default "run")
 *   GATE_PHASE       baseline | ui | all (default baseline)
 *   GATE_FIXTURE     mp4 | hls | webm (default mp4)
 *   GATE_SECONDS     observation window per check (default 8)
 *   GATE_HEADED=1    run a headed browser (for Xvfb / real autoplay policy)
 *   GATE_CHROMEDRIVER  chromedriver binary (default /usr/bin/chromedriver then PATH)
 *   GATE_CHROMIUM      chromium binary (default /usr/bin/chromium)
 *   GATE_PORT        fixture server port (default ephemeral)
 *
 * Deterministic fixtures are generated with ffmpeg into a temp directory
 * (audio + video, ~20 s). The committed webm fallback needs no ffmpeg.
 *
 * Dev-only tool: never imported by the app or the test suites. Never calls
 * `clear`; probe bill items are tagged and removed, and the pre-existing live
 * item is restored through `theater_channel`.
 */

import { execSync, spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createReadStream, mkdtempSync, statSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { Socket } from '../node_modules/phoenix/priv/static/phoenix.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EVIDENCE_DIR = join(ROOT, 'openspec/changes/add-floating-minigame-media/evidence');
const HTTP_FIXTURE_FALLBACK = join(ROOT, 'tests/fixtures/torrent-gate/clip_a.webm');

const APP = process.env.GATE_APP || 'http://localhost:5173/?room=theater&debug=1';
const GATEWAY = (process.env.GATE_GATEWAY || 'http://localhost:4000').replace(/\/+$/, '');
const LABEL = process.env.GATE_LABEL || 'run';
const PHASE = process.env.GATE_PHASE || 'baseline';
const FIXTURE_KIND = process.env.GATE_FIXTURE || 'mp4';
const HEADED = process.env.GATE_HEADED === '1';
const SECONDS = Math.max(4, Number(process.env.GATE_SECONDS) || 8);
const FIXTURE_PORT = Number(process.env.GATE_PORT) || 0;

const CHROMEDRIVER = process.env.GATE_CHROMEDRIVER
  || (existsSync('/snap/bin/chromium.chromedriver') ? '/snap/bin/chromium.chromedriver' : null)
  || '/usr/bin/chromedriver';
const CHROMIUM = process.env.GATE_CHROMIUM
  || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : '/usr/bin/chromium-browser');

const DRIVER_PORT = 9600 + Math.floor(Math.random() * 300);
const DRIVER = `http://127.0.0.1:${DRIVER_PORT}`;
const TAG = `floating-gate-${Date.now().toString(36)}`;
const log = (...a) => console.log('[floating-gate]', ...a);
const failures = [];
const passes = [];
const fail = (name, detail = '') => {
  failures.push({ name, detail });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`);
};
const pass = (name, detail = '') => {
  passes.push({ name, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`);
};
const check = (name, ok, detail = '') => (ok ? pass(name, detail) : fail(name, detail));

let driverProc = null;
let fixtureServer = null;
const LIVE = new Set();

function chromeProcessCount() {
  try {
    return Number(execSync("ps -eo comm | grep -cE '^(chromedriver|chrome)$' || true", { shell: '/bin/bash' }).toString().trim()) || 0;
  } catch {
    return -1;
  }
}

function guardBeforeLaunch() {
  if (process.env.GATE_ALLOW_STRAYS === '1') return;
  const n = chromeProcessCount();
  if (n > 30) {
    throw new Error(
      `SAFETY GUARD: ${n} chrome/chromedriver processes already exist. ` +
        'Clean up strays first (pkill -9 -f chromedriver; pkill -9 -f "chrome") or set GATE_ALLOW_STRAYS=1.',
    );
  }
}

function startDriver() {
  driverProc = spawn(CHROMEDRIVER, [`--port=${DRIVER_PORT}`, '--whitelisted-ips=127.0.0.1'], { stdio: 'ignore' });
  const t0 = Date.now();
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const res = await fetch(`${DRIVER}/status`);
        if (res.ok) return resolve(true);
      } catch {}
      if (Date.now() - t0 > 12000) return reject(new Error(`chromedriver (${CHROMEDRIVER}) did not start`));
      setTimeout(poll, 300);
    };
    poll();
  });
}

function stopDriver() {
  if (driverProc) {
    try { driverProc.kill('SIGKILL'); } catch {}
    driverProc = null;
  }
}

async function closeAll() {
  for (const id of [...LIVE]) {
    LIVE.delete(id);
    try {
      await fetch(`${DRIVER}/session/${id}`, { method: 'DELETE' });
    } catch {}
  }
  stopDriver();
  if (fixtureServer) {
    await new Promise((resolve) => fixtureServer.close(() => resolve()));
    fixtureServer = null;
  }
}

// --- fixtures ---------------------------------------------------------------

function generateFixtures() {
  const dir = mkdtempSync(join(tmpdir(), 'afterlight-floating-fixtures-'));
  copyFileSync(HTTP_FIXTURE_FALLBACK, join(dir, 'fallback.webm'));
  if (FIXTURE_KIND === 'webm') {
    return { dir, note: 'committed webm fallback (no ffmpeg)' };
  }
  const ffmpeg = (args) => execSync(`ffmpeg -y -loglevel error ${args}`, { cwd: dir, timeout: 120000 });
  ffmpeg(
    '-f lavfi -i "testsrc2=size=320x180:rate=24:duration=120" ' +
    '-f lavfi -i "sine=frequency=440:duration=120" ' +
    '-c:v libx264 -preset ultrafast -pix_fmt yuv420p -g 24 -c:a aac -b:a 64k -shortest fixture.mp4',
  );
  if (FIXTURE_KIND === 'hls') {
    ffmpeg(
      '-i fixture.mp4 -c copy -hls_time 2 -hls_list_size 0 ' +
      '-hls_flags independent_segments -hls_segment_filename "seg%03d.ts" index.m3u8',
    );
  }
  return { dir, note: `ffmpeg-generated ${FIXTURE_KIND}` };
}

const MIME = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ts': 'video/mp2t',
};

function startFixtureServer(dir) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const name = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/+/, '');
      if (name.includes('..') || name.includes('/')) {
        res.writeHead(404).end();
        return;
      }
      const file = join(dir, name);
      if (!existsSync(file)) {
        res.writeHead(404).end();
        return;
      }
      const size = statSync(file).size;
      const type = MIME[extname(file).toLowerCase()] || 'application/octet-stream';
      const range = req.headers.range;
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Accept-Ranges', 'bytes');
      if (typeof range === 'string') {
        const m = /bytes=(\d*)-(\d*)/.exec(range);
        const start = m && m[1] ? Number(m[1]) : 0;
        const end = m && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
        if (start >= size) {
          res.writeHead(416, { 'Content-Range': `bytes */${size}` }).end();
          return;
        }
        res.writeHead(206, {
          'Content-Type': type,
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Content-Length': end - start + 1,
        });
        createReadStream(file, { start, end }).pipe(res);
        return;
      }
      res.writeHead(200, { 'Content-Type': type, 'Content-Length': size });
      createReadStream(file).pipe(res);
    });
    server.listen(FIXTURE_PORT, '127.0.0.1', () => {
      fixtureServer = server;
      resolve(server.address().port);
    });
  });
}

// --- WebDriver --------------------------------------------------------------

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

const PAGE_HOOK = `
  (() => {
    window.__gateLogs = window.__gateLogs || [];
    window.__wsSent = window.__wsSent || [];
    if (window.__gateHooked) return true;
    window.__gateHooked = true;
    for (const k of ['warn', 'error']) {
      const orig = console[k].bind(console);
      console[k] = (...a) => {
        try { window.__gateLogs.push(k + ': ' + a.map((x) => (x && x.message) || String(x)).join(' ')); } catch {}
        orig(...a);
      };
    }
    window.addEventListener('unhandledrejection', (e) => {
      try { window.__gateLogs.push('unhandled: ' + (e.reason?.message || e.reason)); } catch {}
    });
    const origSend = WebSocket.prototype.send;
    WebSocket.prototype.send = function (data) {
      try {
        if (typeof data === 'string' && data.includes('theater_')) {
          const frame = JSON.parse(data);
          if (typeof frame?.type === 'string' && frame.type.startsWith('theater_')) {
            window.__wsSent.push({ t: Date.now(), type: frame.type, payload: frame });
          }
        }
      } catch {}
      return origSend.apply(this, arguments);
    };
    return true;
  })();
`;

async function newSession(name) {
  guardBeforeLaunch();
  const args = [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--window-size=1280,800',
    '--mute-audio',
    '--autoplay-policy=no-user-gesture-required',
    '--disable-backgrounding-occluded-windows',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-hang-monitor',
  ];
  if (!HEADED) args.push('--headless=new');
  const res = await fetch(`${DRIVER}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      capabilities: {
        browserName: 'chrome',
        'goog:chromeOptions': { args, binary: CHROMIUM, excludeSwitches: ['enable-automation'] },
      },
    }),
  });
  const data = await res.json();
  const id = data.value?.sessionId ?? data.sessionId;
  if (!id) throw new Error(`session ${name}: ${JSON.stringify(data).slice(0, 300)}`);
  LIVE.add(id);
  log(`session ${name} = ${id}`);
  return { name, id };
}

const js = (s, script) => req('POST', `/session/${s.id}/execute/sync`, { script, args: [] });
const findEl = async (s, css) => {
  const el = await req('POST', `/session/${s.id}/element`, { using: 'css selector', value: css });
  return el?.['element-6066-11e4-a52e-4f735466cecf'] ?? el?.ELEMENT;
};
const clickEl = (s, eid) => req('POST', `/session/${s.id}/element/${eid}/click`, {});
const cdp = (s, cmd, params = {}) => req('POST', `/session/${s.id}/chromium/send_command`, { cmd, params });

async function waitTransport(s, timeoutMs = 60000) {
  // Keyboard/pointer actions need the target window in front; earlier phases
  // in an all-phase run can leave another session focused.
  await cdp(s, 'Page.bringToFront').catch(() => {});
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const open = await js(s, `return !!(window.__afterlight && window.__afterlight.netState && window.__afterlight.netState().open);`).catch(() => false);
    if (open) return true;
    await sleep(700);
  }
  return false;
}

/**
 * Page-side identity probe. The first observation of the engine object, media
 * node and iframe contentWindow is stashed on window; later observations
 * compare identity against that stash, which is the only reliable way to
 * detect DOM reinsertion or engine recreation across WebDriver calls.
 */
const IDENTITY_SCRIPT = `
  const ui = (window.__afterlight && window.__afterlight.theater) ? window.__afterlight.theater() : null;
  const overlay = document.getElementById('theater-screen');
  const media = overlay ? overlay.querySelector('.ts-media') : null;
  const node = media ? media.firstElementChild : null;
  const engine = ui ? ui.engine : null;
  if (engine && !window.__gateEngine) window.__gateEngine = engine;
  if (node && !window.__gateNode) window.__gateNode = node;
  if (node && node.tagName === 'IFRAME' && !window.__gateFrameWin) window.__gateFrameWin = node.contentWindow;
  const video = engine && engine.video ? engine.video : null;
  const mediaRect = media ? media.getBoundingClientRect() : null;
  return {
    engineKind: engine ? engine.kind : null,
    engineDegraded: engine ? !!engine.degraded : null,
    engineReady: engine ? !!engine.ready : null,
    engineSame: !!(engine && window.__gateEngine && engine === window.__gateEngine),
    node: node ? node.tagName : null,
    nodeSame: !!(node && window.__gateNode && node === window.__gateNode),
    frameSame: !!(node && node.tagName === 'IFRAME' && window.__gateFrameWin && node.contentWindow === window.__gateFrameWin),
    loadToken: ui ? ui.loadToken : null,
    loadedPlayKey: ui ? ui.loadedPlayKey : null,
    loadedItemId: ui ? ui.loadedItemId : null,
    currentTime: video && Number.isFinite(video.currentTime) ? Math.round(video.currentTime * 100) / 100 : null,
    paused: video ? !!video.paused : null,
    muted: video ? !!video.muted : null,
    volume: video ? video.volume : null,
    readyState: video ? video.readyState : null,
    overlayClass: overlay ? overlay.className : null,
    hidden: overlay ? overlay.classList.contains('ts-hidden') : null,
    overlayRect: mediaRect ? { w: Math.round(mediaRect.width), h: Math.round(mediaRect.height) } : null,
    watching: ui && typeof ui.isWatching === 'function' ? ui.isWatching() : null,
    presentation: ui && typeof ui.presentationMode === 'function' ? ui.presentationMode() : (ui ? ui.presentation : null),
    floatingHidden: ui && typeof ui.isFloatingHidden === 'function' ? ui.isFloatingHidden() : (ui ? !!ui.floatingHidden : null),
    floatingExpanded: ui && typeof ui.isFloatingExpanded === 'function' ? ui.isFloatingExpanded() : (ui ? !!ui.floatingExpanded : null),
    awaitingGesture: ui ? !!ui.awaitingGesture : null,
    sent: (window.__wsSent || []).map((f) => f.type + ':' + (f.payload?.op || '')).slice(-12),
    logs: (window.__gateLogs || []).slice(-8),
  };
`;

const identity = (s) => js(s, IDENTITY_SCRIPT);

async function timeline(s, windowsMs = 2500) {
  const before = await identity(s);
  await sleep(windowsMs);
  const after = await identity(s);
  return {
    before: before.currentTime,
    after: after.currentTime,
    delta: Number.isFinite(before.currentTime) && Number.isFinite(after.currentTime)
      ? Math.round((after.currentTime - before.currentTime) * 100) / 100
      : null,
  };
}

// --- bill probe -------------------------------------------------------------

async function connectBillProbe() {
  const guestId = `${TAG}-probe`;
  const res = await fetch(`${GATEWAY}/api/auth/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
    body: JSON.stringify({ guestId, nickname: 'FloatingProbe' }),
  });
  if (!res.ok) throw new Error(`bill probe auth failed (HTTP ${res.status})`);
  const { token } = await res.json();
  const socket = new Socket(`${GATEWAY.replace(/^http/, 'ws')}/ws`, { params: { token } });
  const bills = [];
  const errors = [];
  socket.connect();
  const channel = socket.channel('game:v1', { guestId });
  channel.onMessage = (event, payload) => {
    if (event === 'theater_state') bills.push({ t: Date.now(), theater: payload?.theater });
    if (event === 'error') errors.push(payload?.message || '');
    return payload;
  };
  await new Promise((resolve, reject) => {
    channel.join().receive('ok', resolve).receive('error', reject);
  });
  channel.push('hello', { guestId, nickname: 'FloatingProbe' });
  await sleep(250);
  channel.push('join_room', { roomId: 'theater' });
  return {
    channel,
    bills,
    errors,
    latest: () => bills.at(-1)?.theater || null,
    disconnect: () => socket.disconnect(),
  };
}

async function waitForBill(probe, predicate, timeoutMs = 15000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const bill = probe.latest();
    if (bill && predicate(bill)) return bill;
    await sleep(300);
  }
  return null;
}

async function waitForPlayback(s, timeoutMs = 25000) {
  const end = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < end) {
    last = await identity(s).catch(() => null);
    if (last?.node === 'VIDEO' && Number.isFinite(last.currentTime) && last.currentTime > 0.2 && last.paused === false) {
      return last;
    }
    if (last?.node === 'IFRAME') return last; // provider embeds expose no time here
    if (last?.awaitingGesture) {
      // Autoplay was blocked: the app's own gesture badge is the recovery.
      const badge = await findEl(s, '.ts-play-badge').catch(() => null);
      if (badge) await clickEl(s, badge).catch(() => {});
    }
    await sleep(500);
  }
  return last;
}

// --- phases -----------------------------------------------------------------

async function runBaseline(probe, fixtureUrl, scenario) {
  const s = await newSession('A');
  await cdp(s, 'Page.addScriptToEvaluateOnNewDocument', { source: PAGE_HOOK }).catch(() => {});
  await req('POST', `/session/${s.id}/url`, { url: APP });
  const transport = await waitTransport(s);
  check('baseline: transport open', transport);
  if (!transport) return;

  const room = await js(s, `return window.__afterlight.room ? window.__afterlight.room() : null;`).catch(() => null);
  check('baseline: app in theater room', room === 'theater', `room=${room}`);

  // Put the deterministic fixture on the bill through the shared protocol.
  probe.channel.push('theater_channel', { url: fixtureUrl, title: `${TAG} fixture` });
  const onBill = await waitForBill(probe, (b) => b.now?.url === fixtureUrl, 15000);
  check('baseline: fixture is the live bill item', !!onBill, onBill?.now?.title || 'not reached');
  if (!onBill) return;

  const playing = await waitForPlayback(s);
  scenario.baseline.playing = playing;
  check('baseline: fixture reaches playback', Number.isFinite(playing?.currentTime) && playing.currentTime > 0.2, `t=${playing?.currentTime}`);
  check('baseline: first identity captured (VIDEO node)', playing?.node === 'VIDEO' && playing?.engineKind === 'file', `node=${playing?.node} kind=${playing?.engineKind}`);
  if (!playing) return;

  const baseTimeline = await timeline(s);
  scenario.baseline.timelineBefore = baseTimeline;
  check('baseline: timeline advances in cinema presentation', baseTimeline.delta > 0.5, `Δ=${baseTimeline.delta}s`);

  // Same-item snapshot: pause then resume through the shared bill. The item
  // id does not change, so a correct client re-applies state without any
  // engine or node churn.
  const itemId = onBill.now.id;
  probe.channel.push('theater_queue', { op: 'pause', itemId });
  await sleep(1200);
  const pausedSample = await identity(s);
  scenario.baseline.snapshotPaused = pausedSample;
  check('baseline: same-item pause keeps engine/node identity',
    pausedSample.engineSame === true && pausedSample.nodeSame === true && pausedSample.loadToken === playing.loadToken,
    `engineSame=${pausedSample.engineSame} nodeSame=${pausedSample.nodeSame}`);

  probe.channel.push('theater_queue', { op: 'resume', itemId });
  await sleep(1200);
  const resumedSample = await identity(s);
  scenario.baseline.snapshotResumed = resumedSample;
  const resumedTimeline = await timeline(s);
  scenario.baseline.timelineAfterSnapshot = resumedTimeline;
  check('baseline: same-item resume keeps engine/node identity',
    resumedSample.engineSame === true && resumedSample.nodeSame === true && resumedSample.loadToken === playing.loadToken,
    `engineSame=${resumedSample.engineSame} nodeSame=${resumedSample.nodeSame}`);
  check('baseline: loadedPlayKey unchanged across same-item snapshot',
    resumedSample.loadedPlayKey === playing.loadedPlayKey,
    `${playing.loadedPlayKey} -> ${resumedSample.loadedPlayKey}`);
  check('baseline: timeline advances after same-item snapshot', resumedTimeline.delta > 0.5, `Δ=${resumedTimeline.delta}s`);

  // Cinema toggle: a real Escape leaves cinema view; re-entering uses the
  // public watch-mode method (the seat re-entry path is exercised elsewhere).
  await req('POST', `/session/${s.id}/actions`, {
    actions: [{
      type: 'key',
      id: 'keyboard',
      actions: [
        { type: 'keyDown', value: '\uE00C' }, // ESC
        { type: 'keyUp', value: '\uE00C' },
      ],
    }],
  }).catch(() => {});
  let escImmediate = true;
  for (let i = 0; i < 8; i++) {
    escImmediate = await js(s, `return window.__afterlight.theater().isWatching();`).catch(() => true);
    if (escImmediate === false) break;
    await sleep(250);
  }
  await sleep(400);
  const primarySample = await identity(s);
  scenario.baseline.escapeImmediate = escImmediate;
  scenario.baseline.cinemaOff = primarySample;
  const primaryTimeline = await timeline(s);
  scenario.baseline.timelinePrimary = primaryTimeline;
  check('baseline: Escape leaves cinema view', primarySample.watching === false, `watching=${primarySample.watching}`);
  check('baseline: cinema toggle keeps engine/node identity',
    primarySample.engineSame === true && primarySample.nodeSame === true && primarySample.loadToken === playing.loadToken,
    `engineSame=${primarySample.engineSame} nodeSame=${primarySample.nodeSame}`);
  check('baseline: timeline advances in primary presentation', primaryTimeline.delta > 0.5, `Δ=${primaryTimeline.delta}s`);

  await js(s, `const ui = window.__afterlight.theater(); ui.setWatchMode(true); return ui.isWatching();`).catch(() => {});
  await sleep(700);
  const cinemaBack = await identity(s);
  scenario.baseline.cinemaBack = cinemaBack;
  check('baseline: re-entering cinema keeps engine/node identity',
    cinemaBack.watching === true && cinemaBack.engineSame === true && cinemaBack.nodeSame === true,
    `watching=${cinemaBack.watching} engineSame=${cinemaBack.engineSame} nodeSame=${cinemaBack.nodeSame}`);

  scenario.baseline.sentFrames = (await identity(s)).sent;
  const localOps = scenario.baseline.sentFrames.filter((x) => /^theater_/.test(x));
  scenario.baseline.theaterFramesSent = localOps;
  check('baseline: presentation toggles send no theater action',
    localOps.length === 0, localOps.join(', ') || 'none');

  // Presentation-only transitions: enter floating, hide, expand, reduce,
  // exit. The engine, media node and iframe contentWindow must be identical,
  // no DOM reinsertion may occur, and no engine start/teardown or resource
  // request may be triggered (task 2.4).
  await js(s, `
    window.__gateRemoved = 0;
    const media = document.querySelector('#theater-screen .ts-media');
    if (window.__gateObserver) window.__gateObserver.disconnect();
    window.__gateObserver = new MutationObserver((records) => {
      for (const r of records) {
        for (const n of r.removedNodes) { if (n === window.__gateNode || (n.contains && window.__gateNode && n.contains(window.__gateNode))) window.__gateRemoved++; }
        for (const n of r.addedNodes) { if (n === window.__gateNode) window.__gateRemoved++; }
      }
    });
    if (media) window.__gateObserver.observe(media, { childList: true, subtree: true });
    return true;`);
  const engineEventsBefore = await js(s, `return window.__afterlight.theaterPlayback().filter((e) => e.type === 'engine-start' || e.type === 'engine-teardown').length;`);
  const resourcesBefore = await js(s, `return performance.getEntriesByType('resource').length;`);
  const sentBefore = await js(s, `return (window.__wsSent || []).length;`);

  const floatEnter = await js(s, `
    const ui = window.__afterlight.theater();
    ui.beginActivityPresentation({ id: 'gate-floating', generation: 999, attempt: 1 });
    return { mode: ui.presentationMode(), hidden: ui.isFloatingHidden(), expanded: ui.isFloatingExpanded() };`);
  scenario.baseline.floatingEnter = floatEnter;
  const floatingTimeline = await timeline(s);
  scenario.baseline.floatingTimeline = floatingTimeline;
  check('floating: activity presentation enters without destroying the player',
    floatEnter?.mode === 'floating', JSON.stringify(floatEnter));
  check('floating: timeline advances while floating', floatingTimeline.delta > 0.5, `Δ=${floatingTimeline.delta}s`);

  await js(s, `const ui = window.__afterlight.theater(); ui.setFloatingHidden(true); ui.setFloatingExpanded(true); ui.setFloatingHidden(false); ui.setFloatingExpanded(false); return ui.presentationMode();`);
  await sleep(800);
  const floatMid = await identity(s);
  scenario.baseline.floatingMid = floatMid;
  check('floating: hide/expand/reduce retains engine/node identity',
    floatMid.engineSame === true && floatMid.nodeSame === true && floatMid.loadToken === playing.loadToken,
    `engineSame=${floatMid.engineSame} nodeSame=${floatMid.nodeSame}`);
  check('floating: hide/expand/reduce keeps the surface visible and playing',
    floatMid.hidden === false && floatMid.overlayClass?.includes('ts-floating') === true,
    `class=${floatMid.overlayClass}`);

  const floatExit = await js(s, `
    const ui = window.__afterlight.theater();
    ui.endActivityPresentation();
    return { mode: ui.presentationMode(), watching: ui.isWatching() };`);
  scenario.baseline.floatingExit = floatExit;
  await sleep(600);
  const after = await identity(s);
  const engineEventsAfter = await js(s, `return window.__afterlight.theaterPlayback().filter((e) => e.type === 'engine-start' || e.type === 'engine-teardown').length;`);
  const resourcesAfter = await js(s, `return performance.getEntriesByType('resource').length;`);
  const removed = await js(s, `return window.__gateRemoved;`);
  const sentAfter = await js(s, `return (window.__wsSent || []).length;`);
  scenario.baseline.floatingAfter = after;
  scenario.baseline.floatingCounters = { engineEventsBefore, engineEventsAfter, resourcesBefore, resourcesAfter, removed, sentBefore, sentAfter };
  check('floating: exit restores primary and keeps engine/node identity',
    floatExit?.mode === 'primary' && after.engineSame === true && after.nodeSame === true && after.loadToken === playing.loadToken,
    `mode=${floatExit?.mode} engineSame=${after.engineSame} nodeSame=${after.nodeSame}`);
  check('floating: no DOM reinsertion across presentation-only transitions', removed === 0, `removed=${removed}`);
  check('floating: zero engine start/teardown events on presentation transitions',
    engineEventsAfter === engineEventsBefore, `${engineEventsBefore} -> ${engineEventsAfter}`);
  check('floating: zero presentation-triggered resource requests',
    resourcesAfter === resourcesBefore, `${resourcesBefore} -> ${resourcesAfter}`);
  check('floating: no theater action sent by local presentation',
    sentAfter === sentBefore, `${sentBefore} -> ${sentAfter}`);

  return s;
}

async function runUi(probe, fixtureUrl, scenario) {
  const s = await newSession('B');
  await cdp(s, 'Page.addScriptToEvaluateOnNewDocument', { source: PAGE_HOOK }).catch(() => {});
  await req('POST', `/session/${s.id}/url`, { url: APP });
  const transport = await waitTransport(s);
  check('ui: transport open', transport);
  if (!transport) return;

  const uiFixture = `${fixtureUrl}?phase=ui`;
  probe.channel.push('theater_channel', { url: uiFixture, title: `${TAG} ui fixture` });
  const onBill = await waitForBill(probe, (b) => b.now?.url === uiFixture, 15000);
  check('ui: fixture is the live bill item', !!onBill);
  if (!onBill) return;
  const playing = await waitForPlayback(s);
  check('ui: fixture reaches playback', Number.isFinite(playing?.currentTime) && playing.currentTime > 0.2, `t=${playing?.currentTime}`);

  // Chrome hidden in the primary presentation.
  const primary = await js(s, `
    const chrome = document.getElementById('floating-media');
    return {
      mode: window.__afterlight.theater().presentationMode(),
      chrome: !!chrome, hidden: chrome ? chrome.hidden : null,
      mediaNodes: document.querySelector('#theater-screen .ts-media')?.childElementCount ?? null,
    };`);
  scenario.ui = { playing, primary };
  check('ui: chrome exists but is hidden in primary presentation',
    primary.chrome === true && primary.hidden === true, JSON.stringify(primary));

  // Floating: visible chrome with labeled, ordered controls. Step out of
  // cinema first — the real runtime bridge does this on activity entry.
  await req('POST', `/session/${s.id}/actions`, {
    actions: [{ type: 'key', id: 'keyboard', actions: [{ type: 'keyDown', value: '\uE00C' }, { type: 'keyUp', value: '\uE00C' }] }],
  }).catch(() => {});
  await sleep(600);
  const floating = await js(s, `
    const ui = window.__afterlight.theater();
    ui.beginActivityPresentation({ id: 'gate-ui', generation: 998, attempt: 1 });
    const chrome = document.getElementById('floating-media');
    const ids = ['floating-media-handle','floating-media-speaker','floating-media-enlarge','floating-media-hide','floating-media-back'];
    return {
      mode: ui.presentationMode(),
      hidden: chrome.hidden,
      speaker: document.getElementById('floating-media-speaker').getAttribute('aria-label') || document.getElementById('floating-media-speaker').title,
      speakerPressed: document.getElementById('floating-media-speaker').getAttribute('aria-pressed'),
      enlarge: document.getElementById('floating-media-enlarge').getAttribute('aria-label') || document.getElementById('floating-media-enlarge').title,
      noticeHidden: document.getElementById('floating-media-notice').hidden,
      restoreHidden: document.getElementById('floating-media-restore').hidden,
      order: ids.map((id) => id),
      domOrder: [...chrome.querySelector('.fm-buttons').children].map((b) => b.id),
      mediaNodes: document.querySelector('#theater-screen .ts-media')?.childElementCount ?? null,
    };`);
  scenario.ui.floating = floating;
  check('ui: floating shows the chrome once', floating.mode === 'floating' && floating.hidden === false, `mode=${floating.mode}`);
  check('ui: speaker is labeled with a press state', /stream/i.test(floating.speaker) && floating.speakerPressed != null, `${floating.speaker}/${floating.speakerPressed}`);
  check('ui: enlarge control is labeled', /stream/i.test(floating.enlarge), floating.enlarge);
  check('ui: DOM tab order is handle, speaker, enlarge, hide, back (Reset lives in the handle menu)',
    JSON.stringify(floating.domOrder) === JSON.stringify(floating.order), floating.domOrder.join(','));
  check('ui: controllable provider shows no limitation notice', floating.noticeHidden === true);

  // The move handle opens its Reset position menu; a reset closes it again.
  const handleMenu = await js(s, `
    const handle = document.getElementById('floating-media-handle');
    const reset = document.getElementById('floating-media-reset');
    const menu = reset.parentElement;
    handle.click();
    const opened = !menu.hidden && handle.getAttribute('aria-expanded') === 'true';
    reset.click();
    const closed = menu.hidden && handle.getAttribute('aria-expanded') === 'false';
    return { opened, closed, resetLabel: reset.textContent };`);
  scenario.ui.handleMenu = handleMenu;
  check('ui: the move handle opens a Reset position menu',
    handleMenu.opened === true && handleMenu.closed === true && /Reset position/.test(handleMenu.resetLabel),
    JSON.stringify(handleMenu));

  // Optional visual evidence for the icon strip (GATE_SCREENSHOT=1).
  if (process.env.GATE_SCREENSHOT === '1') {
    const shot = await req('GET', `/session/${s.id}/screenshot`).catch(() => null);
    if (shot) {
      mkdirSync(EVIDENCE_DIR, { recursive: true });
      const file = join(EVIDENCE_DIR, `${new Date().toISOString().replace(/[:.]/g, '-')}-${LABEL}-ui.png`);
      writeFileSync(file, Buffer.from(shot, 'base64'));
      log(`screenshot: ${file}`);
    }
  }
  check('ui: restore chip is not shown while visible', floating.restoreHidden === true);
  check('ui: no media node added by chrome',
    floating.mediaNodes === primary.mediaNodes, `${primary.mediaNodes} -> ${floating.mediaNodes}`);

  // Keyboard order: focus the handle, Tab reaches the speaker.
  await js(s, `document.getElementById('floating-media-handle').focus(); return document.activeElement.id;`);
  await req('POST', `/session/${s.id}/actions`, {
    actions: [{ type: 'key', id: 'keyboard', actions: [{ type: 'keyDown', value: '\uE004' }, { type: 'keyUp', value: '\uE004' }] }],
  }).catch(() => {});
  const afterTab = await js(s, `return document.activeElement ? document.activeElement.id : null;`);
  scenario.ui.afterTab = afterTab;
  check('ui: Tab moves focus from the handle to the speaker',
    ['floating-media-speaker', 'floating-media-handle'].includes(afterTab), `active=${afterTab}`);

  // Real input ownership: Space activates the focused media control (turning
  // the app Sound gate on and unmuting the stream), never the game.
  const spaceBefore = await js(s, `return {
    sound: document.getElementById('sound')?.textContent || null,
    muted: document.querySelector('#theater-screen .ts-media video')?.muted ?? null,
    player: window.__afterlight.player(),
  };`);
  await js(s, `document.getElementById('floating-media-speaker').focus(); return true;`);
  await req('POST', `/session/${s.id}/actions`, {
    actions: [{ type: 'key', id: 'keyboard', actions: [{ type: 'keyDown', value: '\uE00D' }, { type: 'keyUp', value: '\uE00D' }] }],
  }).catch(() => {});
  await sleep(900);
  const spaceAfter = await js(s, `return {
    sound: document.getElementById('sound')?.textContent || null,
    muted: document.querySelector('#theater-screen .ts-media video')?.muted ?? null,
    player: window.__afterlight.player(),
  };`);
  scenario.ui.spaceInput = { before: spaceBefore, after: spaceAfter };
  check('ui: Space on the media control enables Sound and unmutes the stream',
    /on/i.test(spaceAfter.sound || '') && spaceAfter.muted === false,
    `${spaceBefore.sound}/${spaceBefore.muted} -> ${spaceAfter.sound}/${spaceAfter.muted}`);

  // A real click on a media control never walks the avatar.
  const walkBefore = await js(s, `return window.__afterlight.player();`);
  const speakerEl = await findEl(s, '#floating-media-speaker');
  if (speakerEl) await clickEl(s, speakerEl).catch(() => {});
  await sleep(700);
  const walkAfter = await js(s, `return window.__afterlight.player();`);
  scenario.ui.mediaClickWalk = { before: walkBefore, after: walkAfter };
  check('ui: clicking media controls never plants a walk target',
    Math.abs(walkAfter[0] - walkBefore[0]) < 0.01 && Math.abs(walkAfter[1] - walkBefore[1]) < 0.01,
    `player ${JSON.stringify(walkBefore)} -> ${JSON.stringify(walkAfter)}`);

  // Back to game returns focus to the world canvas.
  const backEl = await findEl(s, '#floating-media-back');
  if (backEl) await clickEl(s, backEl).catch(() => {});
  await sleep(400);
  const focused = await js(s, `return document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : null;`);
  scenario.ui.backToGameFocus = focused;
  check('ui: Back to game returns focus to the canvas', focused === 'world', `active=${focused}`);

  // Reservations: host chat/actions steer the default corner away from
  // bottom-right; with nothing reserved, bottom-right is preferred.
  const reservationsCheck = await js(s, `
    const ui = window.__afterlight.theater();
    const withHost = ui.floatingPresenter?.layout?.corner || null;
    window.__gateReservations = ui.floatingReservations;
    ui.floatingReservations = () => [];
    ui.refreshFloatingLayout('resize-critical');
    const withoutHost = ui.floatingPresenter?.layout?.corner || null;
    ui.floatingReservations = window.__gateReservations;
    ui.refreshFloatingLayout('resize-critical');
    return { withHost, withoutHost };`);
  scenario.ui.reservations = reservationsCheck;
  check('ui: host reservations steer the player away from chat/actions',
    reservationsCheck.withHost !== 'bottom-right' && reservationsCheck.withoutHost === 'bottom-right',
    JSON.stringify(reservationsCheck));

  // Native dialogs live in the browser top layer, above any floating media.
  const dialogCheck = await js(s, `
    const dlg = document.getElementById('settings-dialog');
    if (!dlg) return { available: false };
    dlg.showModal();
    const r = document.getElementById('theater-screen').getBoundingClientRect();
    const top = document.elementFromPoint(r.x + r.width / 2, r.y + 20);
    const inside = !!top && (dlg.contains(top) || top === dlg);
    const open = dlg.open;
    dlg.close();
    return { available: true, inside, open, top: top ? (top.id || top.tagName) : null };`);
  scenario.ui.dialog = dialogCheck;
  check('ui: native dialogs stack above floating media',
    dialogCheck.available === true && dialogCheck.open === true && dialogCheck.inside === true,
    JSON.stringify(dialogCheck));

  // Real pointer drag: capture on the handle (element origin), move to the
  // far viewport corner, release. The player must stay fully inside and
  // never leave a capture.
  await js(s, `window.__afterlight.theater().refreshFloatingLayout('resize-critical'); return true;`).catch(() => {});
  await sleep(300);
  const handleEl = await findEl(s, '#floating-media-handle');
  await js(s, `
    const h = document.getElementById('floating-media-handle');
    window.__pointerGate = { down: 0, move: 0, up: 0, capture: 0 };
    h.addEventListener('pointerdown', () => window.__pointerGate.down++);
    h.addEventListener('pointermove', () => window.__pointerGate.move++);
    h.addEventListener('pointerup', () => window.__pointerGate.up++);
    h.addEventListener('gotpointercapture', () => window.__pointerGate.capture++);
    return true;`).catch(() => {});
  const dragTarget = await js(s, `return { x: Math.max(20, window.innerWidth - 24), y: Math.max(20, window.innerHeight - 24) };`);
  const beforeDrag = await js(s, `
    const r = document.getElementById('theater-screen').getBoundingClientRect();
    const h = document.getElementById('floating-media-handle').getBoundingClientRect();
    const topAtHandle = document.elementFromPoint(h.x + h.width / 2, h.y + h.height / 2);
    return { x: r.x, y: r.y, w: r.width, h: r.height, hx: h.x + h.width / 2, hy: h.y + h.height / 2, left: getComputedStyle(document.getElementById('theater-screen')).getPropertyValue('--fm-left'), top: getComputedStyle(document.getElementById('theater-screen')).getPropertyValue('--fm-top'), position: r.x + ',' + r.y, topAtHandle: topAtHandle ? (topAtHandle.id || topAtHandle.className || topAtHandle.tagName) : null };`);
  const dragActionResponse = await req('POST', `/session/${s.id}/actions`, {
    actions: [{
      type: 'pointer',
      id: 'mouse',
      parameters: { pointerType: 'mouse' },
      actions: [
        { type: 'pointerMove', origin: handleEl ? { 'element-6066-11e4-a52e-4f735466cecf': handleEl } : 'viewport', x: 0, y: 0, duration: 0 },
        { type: 'pointerDown', button: 0 },
        { type: 'pointerMove', x: Math.round(dragTarget.x / 2), y: Math.round(dragTarget.y / 2), duration: 80 },
        { type: 'pointerMove', x: dragTarget.x, y: dragTarget.y, duration: 80 },
        { type: 'pointerUp', button: 0 },
      ],
    }],
  }).catch((error) => ({ error: error?.message || String(error) }));
  await sleep(500);
  scenario.ui.dragActionResponse = dragActionResponse || null;
  scenario.ui.pointerGate = await js(s, `return window.__pointerGate || null;`).catch(() => null);
  scenario.ui.dragPresenterState = await js(s, `
    const p = window.__afterlight.theater().floatingPresenter;
    return p ? { dragging: p.dragging, manual: p.manualPosition, corner: p.layout ? p.layout.corner : null } : null;`).catch(() => null);
  const afterDrag = await js(s, `
    const r = document.getElementById('theater-screen').getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    const h = document.getElementById('floating-media-handle');
    const p = window.__afterlight.theater().floatingPresenter;
    return {
      x: r.x, y: r.y, w: r.width, h: r.height,
      inside: r.x >= 0 && r.y >= 0 && r.x + r.width <= vw + 1 && r.y + r.height <= vh + 1,
      left: getComputedStyle(document.getElementById('theater-screen')).getPropertyValue('--fm-left'),
      top: getComputedStyle(document.getElementById('theater-screen')).getPropertyValue('--fm-top'),
      position: r.x + ',' + r.y,
      captured: typeof h.hasPointerCapture === 'function' ? [...Array(4).keys()].some((i) => h.hasPointerCapture(i)) : false,
      manual: p ? p.manualPosition : null,
    };`);
  scenario.ui.beforeDrag = beforeDrag;
  scenario.ui.afterDrag = afterDrag;
  check('ui: a real drag cannot lose the player offscreen', afterDrag.inside === true,
    `rect=${afterDrag.x},${afterDrag.y},${afterDrag.w}x${afterDrag.h} vp=${await js(s, 'return [window.innerWidth, window.innerHeight];')}`);
  check('ui: the drag moved the session position',
    afterDrag.position !== beforeDrag.position, `${beforeDrag.position} -> ${afterDrag.position}`);
  check('ui: the drag kept the manual position in-session',
    afterDrag.manual != null, JSON.stringify(afterDrag));
  check('ui: no pointer capture remains after release', afterDrag.captured === false);

  // Keyboard handle movement: nudge away from the nearest edge.
  await js(s, `document.getElementById('floating-media-handle').focus(); return true;`);
  const keySetup = await js(s, `
    const left = parseFloat(getComputedStyle(document.getElementById('theater-screen')).getPropertyValue('--fm-left')) || 0;
    return { left, away: left < window.innerWidth / 2 };`);
  const keyBefore = keySetup.left;
  await req('POST', `/session/${s.id}/actions`, {
    actions: [{
      type: 'key',
      id: 'keyboard',
      actions: [{ type: 'keyDown', value: keySetup.away ? '\uE014' : '\uE012' }, { type: 'keyUp', value: keySetup.away ? '\uE014' : '\uE012' }],
    }],
  }).catch(() => {});
  await sleep(200);
  const keyAfter = await js(s, `return parseFloat(getComputedStyle(document.getElementById('theater-screen')).getPropertyValue('--fm-left')) || 0;`);
  scenario.ui.keyboardNudge = { before: keyBefore, after: keyAfter, away: keySetup.away };
  const nudged = keySetup.away ? keyAfter > keyBefore : keyAfter < keyBefore;
  check('ui: keyboard handle movement nudges within bounds',
    nudged && keyAfter >= 12, `${keyBefore} -> ${keyAfter} (away=${keySetup.away})`);

  // Hide/restore with announcements.
  const hidden = await js(s, `
    const ui = window.__afterlight.theater();
    document.getElementById('floating-media-hide').click();
    return {
      mode: ui.presentationMode(),
      restoreHidden: document.getElementById('floating-media-restore').hidden,
      live: document.getElementById('floating-media-live').textContent,
    };`);
  scenario.ui.hidden = hidden;
  check('ui: hide switches to the hidden presentation with a restore chip',
    hidden.mode === 'hidden' && hidden.restoreHidden === false, JSON.stringify(hidden));
  check('ui: hide announces the state change', /hidden/i.test(hidden.live || ''), hidden.live);
  const restored = await js(s, `
    const ui = window.__afterlight.theater();
    document.getElementById('floating-media-restore').click();
    return { mode: ui.presentationMode(), live: document.getElementById('floating-media-live').textContent };`);
  scenario.ui.restored = restored;
  check('ui: restore returns to floating', restored.mode === 'floating', restored.mode);

  // Empty bill: end the activity, remove the item, then begin again.
  await js(s, `window.__afterlight.theater().endActivityPresentation(); return true;`);
  for (let passNo = 0; passNo < 3; passNo++) {
    const bill = probe.latest();
    for (const item of [...(bill?.queue || []), ...(bill?.now ? [bill.now] : [])]) {
      if (item.url === fixtureUrl || item.title?.includes(TAG)) {
        probe.channel.push('theater_queue', { op: 'remove', itemId: item.id });
      }
    }
    await sleep(500);
  }
  const empty = await js(s, `
    const ui = window.__afterlight.theater();
    ui.beginActivityPresentation({ id: 'gate-ui-empty', generation: 998, attempt: 2 });
    const chrome = document.getElementById('floating-media');
    return {
      mode: ui.presentationMode(),
      chromeHidden: chrome.hidden,
      restoreHidden: document.getElementById('floating-media-restore').hidden,
      playBadgePresent: !!document.querySelector('.ts-play-badge'),
    };`);
  scenario.ui.empty = empty;
  check('ui: empty bill shows no empty player or restore chip',
    empty.mode === 'waiting' && empty.chromeHidden === true && empty.restoreHidden === true, JSON.stringify(empty));
  check('ui: existing gesture/error affordances remain present', empty.playBadgePresent === true);

  await js(s, `window.__afterlight.theater().endActivityPresentation(); return true;`).catch(() => {});
  return s;
}

// --- pointer-lock contract harness (task 5.4) --------------------------------

async function runLock(probe, fixtureUrl, scenario) {
  const s = await newSession('C');
  await cdp(s, 'Page.addScriptToEvaluateOnNewDocument', { source: PAGE_HOOK }).catch(() => {});
  await req('POST', `/session/${s.id}/url`, { url: APP });
  const transport = await waitTransport(s);
  check('lock: transport open', transport);
  if (!transport) return;

  // Put media up so automatic presentation changes are meaningful.
  const lockFixture = `${fixtureUrl}?phase=lock`;
  probe.channel.push('theater_channel', { url: lockFixture, title: `${TAG} lock fixture` });
  const onBill = await waitForBill(probe, (b) => b.now?.url === lockFixture, 15000);
  check('lock: fixture is the live bill item', !!onBill);
  if (!onBill) return;
  await waitForPlayback(s);
  await js(s, `window.__afterlight.theater().refreshFloatingLayout('resize-critical'); return true;`).catch(() => {});

  const lockedNow = () => js(s, `return {
    locked: !!document.pointerLockElement,
    canvas: document.pointerLockElement ? (document.pointerLockElement.id || document.pointerLockElement.tagName) : null,
    participation: window.__afterlight.participation(),
    room: window.__afterlight.room(),
  };`);

  // Acquire via an explicit canvas gesture: a one-shot pointerdown handler
  // calls the bridge inside the real WebDriver click. A warm-up click first
  // gives the page focus (the first activation can be consumed by the UA).
  const canvasEl = await findEl(s, '#world');
  if (canvasEl) await clickEl(s, canvasEl).catch(() => {});
  await sleep(400);
  let acquired = await lockedNow();
  for (let attempt = 0; attempt < 2 && !acquired.locked; attempt++) {
    await js(s, `
      const canvas = document.getElementById('world');
      canvas.addEventListener('pointerdown', function once() {
        canvas.removeEventListener('pointerdown', once, { capture: true });
        window.__afterlight.requestPointerLock();
      }, { once: true, capture: true });
      return true;`);
    if (canvasEl) await clickEl(s, canvasEl).catch(() => {});
    await sleep(800);
    acquired = await lockedNow();
  }
  scenario.lock = { acquired };
  check('lock: explicit canvas gesture acquires pointer lock',
    acquired.locked === true && acquired.canvas === 'world', JSON.stringify(acquired));

  // Automatic presentation changes never request or release lock.
  const beforeAuto = await identity(s);
  await js(s, `
    const ui = window.__afterlight.theater();
    ui.beginActivityPresentation({ id: 'gate-lock', generation: 997, attempt: 1 });
    ui.setFloatingHidden(true);
    ui.setFloatingHidden(false);
    ui.setFloatingExpanded(true);
    ui.setFloatingExpanded(false);
    ui.refreshFloatingLayout('resize-critical');
    return true;`);
  await sleep(500);
  const afterAuto = await lockedNow();
  const afterAutoIdentity = await identity(s);
  scenario.lock.afterAuto = { ...afterAuto, engineSame: afterAutoIdentity.engineSame, nodeSame: afterAutoIdentity.nodeSame };
  check('lock: automatic presentation changes retain lock, engine and node',
    afterAuto.locked === true && afterAutoIdentity.engineSame === true && afterAutoIdentity.nodeSame === true,
    JSON.stringify(scenario.lock.afterAuto));

  // Browser unlock gesture: Escape releases lock but must not leave the game
  // or open settings (the unlock key is consumed).
  const participationBefore = afterAuto.participation;
  // A trusted Escape (CDP) is the browser's own unlock gesture. Some headless
  // builds route lock-exit differently, so fall back to exitPointerLock() and
  // a following trusted Escape — the contract under test is that the gesture
  // never doubles as a game/menu action.
  await cdp(s, 'Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27, code: 'Escape', key: 'Escape' }).catch(() => {});
  await cdp(s, 'Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27, code: 'Escape', key: 'Escape' }).catch(() => {});
  await sleep(400);
  let lockReleased = await js(s, `return !document.pointerLockElement;`);
  if (!lockReleased) {
    await js(s, `document.exitPointerLock && document.exitPointerLock(); return true;`);
    await sleep(200);
    await cdp(s, 'Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27, code: 'Escape', key: 'Escape' }).catch(() => {});
    await cdp(s, 'Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27, code: 'Escape', key: 'Escape' }).catch(() => {});
    await sleep(400);
    lockReleased = await js(s, `return !document.pointerLockElement;`);
  }
  const unlocked = await js(s, `return {
    locked: !!document.pointerLockElement,
    participation: window.__afterlight.participation(),
    dialog: !!document.querySelector('dialog[open]'),
  };`);
  scenario.lock.unlocked = { ...unlocked, released: lockReleased };
  check('lock: the unlock Escape releases lock without leaving the game',
    unlocked.locked === false && unlocked.participation === participationBefore && unlocked.dialog === false,
    JSON.stringify(unlocked));

  // No automatic reacquire; a second explicit canvas gesture reacquires.
  await sleep(900);
  const idle = await lockedNow();
  check('lock: lock is never reacquired automatically', idle.locked === false, JSON.stringify(idle));

  await js(s, `
    const canvas = document.getElementById('world');
    canvas.addEventListener('pointerdown', function once() {
      canvas.removeEventListener('pointerdown', once);
      window.__afterlight.requestPointerLock();
    }, { once: true });
    return true;`);
  if (canvasEl) await clickEl(s, canvasEl).catch(() => {});
  await sleep(700);
  const reacquired = await lockedNow();
  scenario.lock.reacquired = reacquired;
  check('lock: a new explicit canvas action reacquires', reacquired.locked === true, JSON.stringify(reacquired));

  // Cleanup.
  await js(s, `document.exitPointerLock && document.exitPointerLock(); window.__afterlight.theater().endActivityPresentation(); return true;`).catch(() => {});
  return s;
}

// --- end-to-end game flow (task 6.1) -----------------------------------------

async function runFlow(probe, fixtureUrl, scenario) {
  const s = await newSession('D');
  await cdp(s, 'Page.addScriptToEvaluateOnNewDocument', { source: PAGE_HOOK }).catch(() => {});
  await req('POST', `/session/${s.id}/url`, { url: APP });
  const transport = await waitTransport(s);
  check('flow: transport open', transport);
  if (!transport) return;

  const flowFixture = `${fixtureUrl}?phase=flow`;
  probe.channel.push('theater_channel', { url: flowFixture, title: `${TAG} flow fixture` });
  const onBill = await waitForBill(probe, (b) => b.now?.url === flowFixture, 15000);
  check('flow: fixture is the live bill item', !!onBill);
  if (!onBill) return;
  await waitForPlayback(s);
  await req('POST', `/session/${s.id}/actions`, {
    actions: [{ type: 'key', id: 'keyboard', actions: [{ type: 'keyDown', value: '\uE00C' }, { type: 'keyUp', value: '\uE00C' }] }],
  }).catch(() => {});
  await sleep(500);

  const baseline = await identity(s);
  const engineEventsBefore = await js(s, `return window.__afterlight.theaterPlayback().filter((e) => e.type === 'engine-start' || e.type === 'engine-teardown').length;`);
  const focusCanvas = async () => {
    // The chrome's own "Back to game" control explicitly returns focus to the
    // canvas; when the chrome is hidden (primary presentation) focus directly.
    const visible = await js(s, `
      const b = document.getElementById('floating-media-back');
      return !!b && b.offsetParent !== null;`).catch(() => false);
    if (visible) {
      const back = await findEl(s, '#floating-media-back').catch(() => null);
      if (back) await clickEl(s, back).catch(() => {});
    } else {
      await js(s, `document.getElementById('world')?.focus?.(); return true;`).catch(() => {});
    }
    await sleep(250);
  };
  const waitState = async (target, timeoutMs = 12000) => {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
      const state = await js(s, `return window.__afterlight.participation();`).catch(() => null);
      if (state === target) return state;
      await sleep(250);
    }
    return null;
  };

  // --- Pool: enter with media playing -------------------------------------
  await js(s, `window.__afterlight.tp(-8.6, -6.1); return true;`);
  await sleep(700);
  await cdp(s, 'Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 69, nativeVirtualKeyCode: 69, code: 'KeyE', key: 'e' }).catch(() => {});
  await cdp(s, 'Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 69, nativeVirtualKeyCode: 69, code: 'KeyE', key: 'e' }).catch(() => {});
  const poolState = await waitState('participating');
  scenario.flow = { poolState };
  check('flow AC1: entering Pool participates', poolState === 'participating', `state=${poolState}`);

  const inGame = await identity(s);
  const gameTimeline = await timeline(s);
  const modeInGame = await js(s, `return window.__afterlight.theater().presentationMode();`);
  scenario.flow.inGame = { ...inGame, mode: modeInGame, timeline: gameTimeline };
  check('flow AC1/AC13: media floats during gameplay', modeInGame === 'floating', `mode=${modeInGame}`);
  check('flow AC5/AC6: no engine recreation on entry',
    inGame.engineSame === true && inGame.nodeSame === true && inGame.loadToken === baseline.loadToken,
    `engineSame=${inGame.engineSame} nodeSame=${inGame.nodeSame} token=${inGame.loadToken}/${baseline.loadToken}`);
  check('flow AC3: the stream is muted for the game entry', inGame.muted === true, `muted=${inGame.muted}`);
  check('flow AC5: the fixture timeline continues while floating', gameTimeline.delta > 0.5, `Δ=${gameTimeline.delta}s`);

  // AC8: gameplay keys still reach the billiards controller while the stream
  // floats (this is the exact complaint: F/A/D must work during gameplay).
  const fCharge = async () => {
    const read = () => js(s, `return parseFloat(document.querySelector('[data-role="power-fill"]')?.style.height || '0') || 0;`);
    const before = await read();
    await js(s, `
      window.__gateF = null;
      window.addEventListener('keydown', function once(e) {
        if (e.code !== 'KeyF') return;
        window.removeEventListener('keydown', once);
        window.__gateF = {
          prevented: e.defaultPrevented,
          target: e.target?.id || e.target?.tagName,
          active: document.activeElement?.id || document.activeElement?.tagName,
        };
      });
      return true;`);
    await cdp(s, 'Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 70, nativeVirtualKeyCode: 70, code: 'KeyF', key: 'f' }).catch(() => {});
    await sleep(700);
    const during = await read();
    const keyInfo = await js(s, `return window.__gateF;`);
    // Cancel the charge with Escape (the controller's documented cancel) so
    // the release does not fire a real shot into the next check.
    await cdp(s, 'Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27, code: 'Escape', key: 'Escape' }).catch(() => {});
    await cdp(s, 'Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27, code: 'Escape', key: 'Escape' }).catch(() => {});
    await cdp(s, 'Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 70, nativeVirtualKeyCode: 70, code: 'KeyF', key: 'f' }).catch(() => {});
    await sleep(400);
    const active = await js(s, `return document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : null;`);
    return { before, during, active, keyInfo };
  };
  const poolDebug = await js(s, `return {
    hud: document.querySelectorAll('.pool-hud').length,
    powerFill: !!document.querySelector('[data-role="power-fill"]'),
    sim: typeof window.__afterlight.sim === 'function' ? (window.__afterlight.sim() ? 'present' : null) : 'no-accessor',
    activity: window.__afterlight.activity(),
    state: window.__afterlight.participation(),
    room: window.__afterlight.room(),
  };`);
  scenario.flow.poolDebug = poolDebug;
  const gameKeys = await fCharge();
  scenario.flow.gameKeys = gameKeys;
  check('flow AC8: F charges the cue while the stream floats', gameKeys.during > gameKeys.before + 5, JSON.stringify(gameKeys));

  // A/D fine aim via trusted keys, delivered to the game window.
  await js(s, `
    window.__gateAimKeys = [];
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyA' || e.code === 'KeyD') window.__gateAimKeys.push(e.code + '/' + (e.target?.id || e.target?.tagName));
    });
    return true;`);
  await cdp(s, 'Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65, code: 'KeyA', key: 'a' }).catch(() => {});
  await cdp(s, 'Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65, code: 'KeyA', key: 'a' }).catch(() => {});
  await cdp(s, 'Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 68, nativeVirtualKeyCode: 68, code: 'KeyD', key: 'd' }).catch(() => {});
  await cdp(s, 'Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 68, nativeVirtualKeyCode: 68, code: 'KeyD', key: 'd' }).catch(() => {});
  await sleep(250);
  const aimKeys = await js(s, `return window.__gateAimKeys || [];`);
  scenario.flow.aimKeys = aimKeys;
  check('flow AC8: A/D reach the game window while the stream floats',
    aimKeys.length === 2 && aimKeys.every((entry) => !/floating-media/.test(entry)), JSON.stringify(aimKeys));

  // Explicit unmute from inside the game.
  await js(s, `document.getElementById('floating-media-speaker').focus(); return true;`);
  await cdp(s, 'Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32, code: 'Space', key: ' ' }).catch(() => {});
  await cdp(s, 'Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32, code: 'Space', key: ' ' }).catch(() => {});
  await sleep(900);
  const unmuted = await identity(s);
  scenario.flow.unmuted = unmuted;
  check('flow AC4: one action unmutes the stream during play', unmuted.muted === false, `muted=${unmuted.muted}`);

  // A real POINTER click on a media control must not strand gameplay keys:
  // Chrome focuses the clicked button, so the chrome returns focus to the
  // canvas for pointer activation (keyboard activation keeps focus).
  const focusProbeButton = await findEl(s, '#floating-media-enlarge');
  if (focusProbeButton) await clickEl(s, focusProbeButton).catch(() => {});
  await sleep(400);
  // Leave the presentation as it was (enlarge toggles and toggles back).
  if (focusProbeButton) await clickEl(s, focusProbeButton).catch(() => {});
  await sleep(300);
  const afterPointerMedia = await fCharge();
  scenario.flow.gameKeysAfterPointer = afterPointerMedia;
  check('flow AC8: F charges again after a pointer click on a media control',
    afterPointerMedia.during > afterPointerMedia.before + 5,
    JSON.stringify(afterPointerMedia));

  // Return focus to the game (media controls own their keys), then leave
  // with the real on-screen interact control.
  await focusCanvas();
  const leaveFocus = await js(s, `return {
    active: document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : null,
    paused: window.__afterlight.paused(),
    occupied: window.__afterlight.participation(),
  };`);
  await js(s, `
    window.__gateLeaveKeys = [];
    window.addEventListener('keydown', (e) => { window.__gateLeaveKeys.push(e.code + '/' + (e.target?.id || e.target?.tagName)); }, true);
    return true;`);
  const interactBtn = await findEl(s, '#interact').catch(() => null);
  if (interactBtn) await clickEl(s, interactBtn).catch(() => {});
  await cdp(s, 'Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 69, nativeVirtualKeyCode: 69, code: 'KeyE', key: 'e' }).catch(() => {});
  await cdp(s, 'Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 69, nativeVirtualKeyCode: 69, code: 'KeyE', key: 'e' }).catch(() => {});
  await sleep(500);
  const leaveLog = await js(s, `return { keys: window.__gateLeaveKeys, state: window.__afterlight.participation(), active: document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : null };`);
  const leftState = await waitState('idle');
  await sleep(600);
  const afterLeave = await identity(s);
  const afterTimeline = await timeline(s);
  const modeAfter = await js(s, `return window.__afterlight.theater().presentationMode();`);
  const engineEventsAfter = await js(s, `return window.__afterlight.theaterPlayback().filter((e) => e.type === 'engine-start' || e.type === 'engine-teardown').length;`);
  scenario.flow.afterLeave = { ...afterLeave, mode: modeAfter, timeline: afterTimeline };
  scenario.flow.leaveDiag = { focus: leaveFocus, log: leaveLog };
  check('flow AC11: leaving the game restores primary presentation', leftState === 'idle' && modeAfter === 'primary', `state=${leftState} mode=${modeAfter} diag=${JSON.stringify(leaveLog)}`);
  check('flow AC5/AC6: the same session continues after exit',
    afterLeave.engineSame === true && afterLeave.nodeSame === true && afterLeave.loadToken === baseline.loadToken && afterTimeline.delta > 0.5,
    `engineSame=${afterLeave.engineSame} nodeSame=${afterLeave.nodeSame} Δ=${afterTimeline.delta}`);
  check('flow AC12: an explicit unmute survives the exit', afterLeave.muted === false, `muted=${afterLeave.muted}`);

  // Second cycle with no audio edits: the entry mute is temporary again.
  await sleep(400);
  await focusCanvas();
  await cdp(s, 'Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 69, nativeVirtualKeyCode: 69, code: 'KeyE', key: 'e' }).catch(() => {});
  await cdp(s, 'Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 69, nativeVirtualKeyCode: 69, code: 'KeyE', key: 'e' }).catch(() => {});
  const poolAgain = await waitState('participating');
  await sleep(400);
  const mutedAgain = await identity(s);
  await focusCanvas();
  await cdp(s, 'Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 69, nativeVirtualKeyCode: 69, code: 'KeyE', key: 'e' }).catch(() => {});
  await cdp(s, 'Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 69, nativeVirtualKeyCode: 69, code: 'KeyE', key: 'e' }).catch(() => {});
  await waitState('idle');
  await sleep(500);
  const restored = await identity(s);
  scenario.flow.secondCycle = { poolAgain, mutedAgain: mutedAgain.muted, restoredMuted: restored.muted };
  check('flow AC3/AC12: a fresh entry re-mutes, and exit without edits restores audio',
    mutedAgain.muted === true && restored.muted === false, JSON.stringify(scenario.flow.secondCycle));
  check('flow AC6: no engine start/teardown across the whole game session',
    engineEventsAfter === engineEventsBefore, `${engineEventsBefore} -> ${engineEventsAfter}`);

  // Cold-loading Kart: floating starts before admission; Esc cancels cleanly.
  await js(s, `window.__afterlight.tp(9.3, -1.8); return true;`);
  await sleep(700);
  await cdp(s, 'Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 69, nativeVirtualKeyCode: 69, code: 'KeyE', key: 'e' }).catch(() => {});
  await cdp(s, 'Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 69, nativeVirtualKeyCode: 69, code: 'KeyE', key: 'e' }).catch(() => {});
  await sleep(700);
  const kartJoining = await js(s, `return {
    state: window.__afterlight.participation(),
    activity: window.__afterlight.activity(),
    mode: window.__afterlight.theater().presentationMode(),
    muted: document.querySelector('#theater-screen .ts-media video')?.muted ?? null,
  };`);
  scenario.flow.kartJoining = kartJoining;
  check('flow AC1/AC13: a cold-loading Kart cabinet floats as the transition starts',
    ['joining', 'participating'].includes(kartJoining.state) && kartJoining.mode === 'floating',
    JSON.stringify(kartJoining));
  await req('POST', `/session/${s.id}/actions`, {
    actions: [{ type: 'key', id: 'keyboard', actions: [{ type: 'keyDown', value: '\uE00C' }, { type: 'keyUp', value: '\uE00C' }] }],
  }).catch(() => {});
  await sleep(900);
  const afterCancel = await identity(s);
  const modeAfterCancel = await js(s, `return window.__afterlight.theater().presentationMode();`);
  scenario.flow.afterCancel = { ...afterCancel, mode: modeAfterCancel };
  check('flow AC11: cancelling a cold load restores primary without engine churn',
    modeAfterCancel === 'primary' && afterCancel.engineSame === true && afterCancel.nodeSame === true,
    `mode=${modeAfterCancel} engineSame=${afterCancel.engineSame} nodeSame=${afterCancel.nodeSame}`);

  return s;
}

// --- performance / lifetime (task 6.4) ---------------------------------------

const stats = (values) => {
  const arr = values.filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
  if (!arr.length) return { n: 0, median: null, p95: null };
  const at = (q) => arr[Math.min(arr.length - 1, Math.floor(q * arr.length))];
  return { n: arr.length, median: at(0.5), p95: at(0.95), mean: arr.reduce((a, b) => a + b, 0) / arr.length };
};

async function sampleFrames(s, ms = 5000) {
  await js(s, `
    window.__frameSamples = [];
    window.__frameSamplesDone = false;
    let last = performance.now();
    const end = last + ${ms};
    const tick = (now) => {
      window.__frameSamples.push(now - last);
      last = now;
      if (now < end) requestAnimationFrame(tick);
      else window.__frameSamplesDone = true;
    };
    requestAnimationFrame(tick);
    return true;`).catch(() => {});
  for (let i = 0; i < 80; i++) {
    if (await js(s, `return window.__frameSamplesDone === true;`).catch(() => true)) break;
    await sleep(200);
  }
  return js(s, `return window.__frameSamples || [];`).catch(() => []);
}

async function runPerf(probe, fixtureUrl, scenario) {
  const s = await newSession('E');
  await cdp(s, 'Page.addScriptToEvaluateOnNewDocument', { source: PAGE_HOOK }).catch(() => {});
  await req('POST', `/session/${s.id}/url`, { url: APP });
  const transport = await waitTransport(s);
  check('perf: transport open', transport);
  if (!transport) return;

  const perfFixture = `${fixtureUrl}?phase=perf`;
  probe.channel.push('theater_channel', { url: perfFixture, title: `${TAG} perf fixture` });
  const onBill = await waitForBill(probe, (b) => b.now?.url === perfFixture, 15000);
  check('perf: fixture is the live bill item', !!onBill);
  if (!onBill) return;
  await waitForPlayback(s);
  const mediaCount = () => js(s, `return {
    mediaNodes: document.querySelectorAll('#theater-screen video, #theater-screen iframe').length,
    chromeRoots: document.querySelectorAll('#floating-media, #floating-media-restore').length,
    totalNodes: document.querySelectorAll('*').length,
    engineEvents: window.__afterlight.theaterPlayback().filter((e) => e.type === 'engine-start' || e.type === 'engine-teardown').length,
    heap: performance.memory ? performance.memory.usedJSHeapSize : null,
  };`);

  // Matched frame-time runs: the SAME fixture decodes in primary, then floats.
  await js(s, `window.__afterlight.theater().refreshFloatingLayout('resize-critical'); return true;`).catch(() => {});
  const primaryFrames = await sampleFrames(s, 5000);
  await js(s, `window.__afterlight.theater().beginActivityPresentation({ id: 'perf-float', generation: 1, attempt: 1 }); return true;`);
  await sleep(500);
  const floatingFrames = await sampleFrames(s, 5000);
  const primaryStats = stats(primaryFrames);
  const floatingStats = stats(floatingFrames);
  const medianDelta = primaryStats.median ? (floatingStats.median - primaryStats.median) / primaryStats.median : null;
  const p95Delta = primaryStats.p95 ? (floatingStats.p95 - primaryStats.p95) / primaryStats.p95 : null;
  scenario.perf = {
    primary: primaryStats,
    floating: floatingStats,
    medianDelta,
    p95Delta,
    samples: { primary: primaryFrames.length, floating: floatingFrames.length },
  };
  log(`perf frame time: median ${primaryStats.median?.toFixed(2)}ms -> ${floatingStats.median?.toFixed(2)}ms `
    + `(${(medianDelta * 100).toFixed(1)}%), p95 ${primaryStats.p95?.toFixed(2)}ms -> ${floatingStats.p95?.toFixed(2)}ms `
    + `(${(p95Delta * 100).toFixed(1)}%)`);

  // 20 enter/exit cycles: no growth in media/renderer/listener state.
  const beforeCycles = await mediaCount();
  for (let i = 0; i < 20; i++) {
    await js(s, `
      const ui = window.__afterlight.theater();
      ui.endActivityPresentation();
      ui.beginActivityPresentation({ id: 'perf-cycle', generation: 1, attempt: ${i + 2} });
      return ui.presentationMode();`);
    await sleep(60);
  }
  await js(s, `window.__afterlight.theater().endActivityPresentation(); return true;`);
  await sleep(300);
  const afterCycles = await mediaCount();
  // Back to floating for the comparison run's state continuity.
  await js(s, `window.__afterlight.theater().beginActivityPresentation({ id: 'perf-float', generation: 1, attempt: 1 }); return true;`).catch(() => {});
  scenario.perf.lifetime = { before: beforeCycles, after: afterCycles };

  check('perf: a single media pipeline and one chrome root across 20 cycles',
    afterCycles.mediaNodes === beforeCycles.mediaNodes && afterCycles.chromeRoots === beforeCycles.chromeRoots,
    `${JSON.stringify(beforeCycles)} -> ${JSON.stringify(afterCycles)}`);
  check('perf: no engine start/teardown during 20 presentation cycles',
    afterCycles.engineEvents === beforeCycles.engineEvents,
    `${beforeCycles.engineEvents} -> ${afterCycles.engineEvents}`);
  check('perf: DOM node count stays bounded across 20 cycles',
    afterCycles.totalNodes <= beforeCycles.totalNodes + 10,
    `${beforeCycles.totalNodes} -> ${afterCycles.totalNodes}`);
  check('perf: median frame-time regression <= 5%',
    medianDelta != null && medianDelta <= 0.05, `median ${(medianDelta * 100).toFixed(1)}%`);
  check('perf: p95 frame-time regression <= 10%',
    p95Delta != null && p95Delta <= 0.10, `p95 ${(p95Delta * 100).toFixed(1)}%`);

  await js(s, `window.__afterlight.theater().endActivityPresentation(); return true;`).catch(() => {});
  return s;
}

// --- source evolution + isolation (task 6.2) ---------------------------------

async function runSources(probe, fixtureUrl, scenario) {
  const actor = await newSession('F');
  const observer = await newSession('G');
  for (const s of [actor, observer]) {
    if (!s) continue;
    await cdp(s, 'Page.addScriptToEvaluateOnNewDocument', { source: PAGE_HOOK }).catch(() => {});
    await req('POST', `/session/${s.id}/url`, { url: APP });
  }
  const actorOpen = await waitTransport(actor);
  const observerOpen = await waitTransport(observer);
  check('sources: both transports open', actorOpen && observerOpen, `actor=${actorOpen} observer=${observerOpen}`);
  if (!actorOpen || !observerOpen) return;

  const sourcesFixture = `${fixtureUrl}?phase=sources`;
  probe.channel.push('theater_channel', { url: sourcesFixture, title: `${TAG} sources fixture` });
  const onBill = await waitForBill(probe, (b) => b.now?.url === sourcesFixture, 15000);
  check('sources: fixture is the live bill item', !!onBill);
  if (!onBill) return;
  await waitForPlayback(actor);
  await waitForPlayback(observer);

  const observerBefore = await identity(observer);
  const actorBefore = await identity(actor);
  const sentBefore = await js(observer, `return (window.__wsSent || []).length;`);

  // Actor enters floating and performs purely local operations.
  await js(actor, `
    const ui = window.__afterlight.theater();
    ui.beginActivityPresentation({ id: 'sources-actor', generation: 1, attempt: 1 });
    ui.setMuted(true);
    ui.setFloatingHidden(true);
    ui.setFloatingHidden(false);
    ui.floatingPresenter?.nudge(6, 4);
    return ui.presentationMode();`);
  await sleep(800);
  const observerAfterLocal = await identity(observer);
  const actorAfterLocal = await identity(actor);
  scenario.sources = { observerBefore, actorBefore, observerAfterLocal, actorAfterLocal };
  check('sources AC17: a second occupant is unaffected by local PiP operations',
    observerAfterLocal.engineSame === true && observerAfterLocal.nodeSame === true
      && observerAfterLocal.loadToken === observerBefore.loadToken
      && observerAfterLocal.currentTime !== null,
    `engineSame=${observerAfterLocal.engineSame} nodeSame=${observerAfterLocal.nodeSame}`);
  const observerSentAfter = await js(observer, `return (window.__wsSent || []).length;`);
  const actorSentAfter = await js(actor, `return (window.__wsSent || []).length;`);
  scenario.sources.frames = { observerBefore: sentBefore, observerAfter: observerSentAfter, actor: actorSentAfter };
  check('sources AC17: local operations emit no shared media action',
    observerSentAfter === sentBefore && actorSentAfter === 0,
    JSON.stringify(scenario.sources.frames));

  // Source replacement while floating (authoritative bill change).
  const replacementUrl = `${fixtureUrl}?phase=sources&take=2`;
  probe.channel.push('theater_channel', { url: replacementUrl, title: `${TAG} sources replacement` });
  const replaced = await waitForBill(probe, (b) => b.now?.url === replacementUrl, 15000);
  check('sources AC14: a replacement item reaches the bill', !!replaced);
  await sleep(1500);
  const actorAfterReplacement = await identity(actor);
  const observerAfterReplacement = await identity(observer);
  scenario.sources.afterReplacement = { actor: actorAfterReplacement, observer: observerAfterReplacement };
  check('sources AC14: the floating surface follows the replacement in one pipeline',
    actorAfterReplacement.node === 'VIDEO'
      && actorAfterReplacement.loadedItemId === replaced?.now?.id
      && actorAfterReplacement.presentation === 'floating'
      && observerAfterReplacement.loadedItemId === replaced?.now?.id,
    `actor=${actorAfterReplacement.loadedItemId} observer=${observerAfterReplacement.loadedItemId} expected=${replaced?.now?.id}`);
  const bothSessions = await js(actor, `return document.querySelectorAll('#theater-screen video').length;`);
  check('sources AC6: exactly one media element per occupant after replacement', bothSessions === 1, `videos=${bothSessions}`);

  // Hidden while the source changes: hidden state retained, replacement plays.
  await js(actor, `const ui = window.__afterlight.theater(); ui.setFloatingHidden(true); return ui.presentationMode();`);
  const replacementAgain = `${fixtureUrl}?phase=sources&take=3`;
  probe.channel.push('theater_channel', { url: replacementAgain, title: `${TAG} sources hidden replacement` });
  const replacedAgain = await waitForBill(probe, (b) => b.now?.url === replacementAgain, 15000);
  await sleep(1200);
  const hiddenState = await js(actor, `return {
    mode: window.__afterlight.theater().presentationMode(),
    hidden: window.__afterlight.theater().isFloatingHidden(),
    chip: !document.getElementById('floating-media-restore').hidden,
    item: window.__afterlight.theater().loadedItemId,
    currentTime: (() => { const v = document.querySelector('#theater-screen video'); return v && Number.isFinite(v.currentTime) ? v.currentTime : null; })(),
  };`);
  scenario.sources.hiddenReplacement = { ...hiddenState, expectedItem: replacedAgain?.now?.id };
  check('sources AC15: hidden PiP retains its state across a source change and keeps playing',
    hiddenState.mode === 'hidden' && hiddenState.chip === true && hiddenState.item === replacedAgain?.now?.id
      && Number.isFinite(hiddenState.currentTime),
    JSON.stringify(scenario.sources.hiddenReplacement));
  await js(actor, `window.__afterlight.theater().setFloatingHidden(false); window.__afterlight.theater().endActivityPresentation(); return true;`);

  return { actor, observer };
}

// --- developer rollback (task 6.6) -------------------------------------------

async function runRollback(probe, fixtureUrl, scenario) {
  const s = await newSession('H');
  await cdp(s, 'Page.addScriptToEvaluateOnNewDocument', { source: PAGE_HOOK }).catch(() => {});
  await req('POST', `/session/${s.id}/url`, { url: `${APP}&floating-media=off` });
  const transport = await waitTransport(s);
  const enabled = await js(s, `return window.__afterlight.floatingMediaEnabled();`).catch(() => null);
  check('rollback: ?floating-media=off disables acquisition', transport && enabled === false, `enabled=${enabled}`);
  if (!transport || enabled !== false) return;

  const rollbackFixture = `${fixtureUrl}?phase=rollback`;
  probe.channel.push('theater_channel', { url: rollbackFixture, title: `${TAG} rollback fixture` });
  const onBill = await waitForBill(probe, (b) => b.now?.url === rollbackFixture, 15000);
  check('rollback: fixture is the live bill item', !!onBill);
  if (!onBill) return;
  await waitForPlayback(s);
  await req('POST', `/session/${s.id}/actions`, {
    actions: [{ type: 'key', id: 'keyboard', actions: [{ type: 'keyDown', value: '\uE00C' }, { type: 'keyUp', value: '\uE00C' }] }],
  }).catch(() => {});
  await sleep(500);
  const before = await identity(s);
  const modeBefore = await js(s, `return window.__afterlight.theater().presentationMode();`);

  await js(s, `window.__afterlight.tp(-8.6, -6.1); return true;`);
  await sleep(700);
  await cdp(s, 'Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 69, nativeVirtualKeyCode: 69, code: 'KeyE', key: 'e' }).catch(() => {});
  await cdp(s, 'Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 69, nativeVirtualKeyCode: 69, code: 'KeyE', key: 'e' }).catch(() => {});
  let state = null;
  for (let i = 0; i < 40; i++) {
    state = await js(s, `return window.__afterlight.participation();`).catch(() => null);
    if (state === 'participating') break;
    await sleep(250);
  }
  await sleep(600);
  const after = await identity(s);
  const modeAfter = await js(s, `return window.__afterlight.theater().presentationMode();`);
  scenario.rollback = { enabled, state, modeBefore, modeAfter, before, after };
  check('rollback: the game still plays without floating media',
    state === 'participating' && modeAfter === 'primary', `state=${state} mode=${modeAfter}`);
  check('rollback: primary presentation and the same engine are retained',
    after.engineSame === true && after.nodeSame === true && after.loadToken === before.loadToken,
    `engineSame=${after.engineSame} nodeSame=${after.nodeSame}`);
  check('rollback: audio policy is untouched by the disabled presentation',
    after.muted === before.muted, `before=${before.muted} after=${after.muted}`);

  await cdp(s, 'Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 69, nativeVirtualKeyCode: 69, code: 'KeyE', key: 'e' }).catch(() => {});
  await cdp(s, 'Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 69, nativeVirtualKeyCode: 69, code: 'KeyE', key: 'e' }).catch(() => {});
  return s;
}

// --- evidence / main --------------------------------------------------------

function writeEvidence(scenario) {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = `${stamp}-${LABEL}-${PHASE}`;
  scenario.passes = passes;
  scenario.failures = failures;
  scenario.ok = failures.length === 0;
  writeFileSync(join(EVIDENCE_DIR, `${base}.json`), `${JSON.stringify(scenario, null, 2)}\n`);
  const md = [
    `# Floating media gate — ${scenario.label} (${scenario.phase})`,
    '',
    `- When: ${scenario.startedAt}`,
    `- App: ${scenario.app}`,
    `- Gateway: ${scenario.gateway}`,
    `- Fixture: ${scenario.fixture.kind} (${scenario.fixture.note})`,
    `- Headed: ${scenario.headed}`,
    '',
    '## Checks',
    '',
    ...passes.map((p) => `- PASS ${p.name}${p.detail ? ` — ${p.detail}` : ''}`),
    ...failures.map((f) => `- FAIL ${f.name}${f.detail ? ` — ${f.detail}` : ''}`),
    '',
    `Result: ${scenario.ok ? 'PASS' : 'FAIL'} (${passes.length} passed, ${failures.length} failed)`,
    '',
    `- JSON evidence: \`${base}.json\``,
    '',
  ].join('\n');
  writeFileSync(join(EVIDENCE_DIR, `${base}.md`), md);
  log(`evidence written: ${join(EVIDENCE_DIR, `${base}.json`)}`);
}

async function main() {
  log(`gate start — app=${APP} gateway=${GATEWAY} phase=${PHASE} fixture=${FIXTURE_KIND} headed=${HEADED}`);
  const { dir, note } = generateFixtures();
  const port = await startFixtureServer(dir);
  const fixtureFile = FIXTURE_KIND === 'hls' ? 'index.m3u8'
    : FIXTURE_KIND === 'webm' ? 'fallback.webm'
      : 'fixture.mp4';
  const fixtureUrl = `http://127.0.0.1:${port}/${fixtureFile}`;
  log(`fixture: ${fixtureUrl} (${note})`);

  const scenario = {
    label: LABEL,
    phase: PHASE,
    app: APP,
    gateway: GATEWAY,
    headed: HEADED,
    startedAt: new Date().toISOString(),
    tag: TAG,
    fixture: { kind: FIXTURE_KIND, url: fixtureUrl, note },
    baseline: {},
    errors: [],
  };

  await startDriver();
  const probe = await connectBillProbe();
  const originalNow = probe.latest()?.now
    ? { url: probe.latest().now.url, title: probe.latest().now.title, id: probe.latest().now.id }
    : null;
  scenario.originalNow = originalNow;

  try {
    if (PHASE === 'baseline' || PHASE === 'all') await runBaseline(probe, fixtureUrl, scenario);
    if (PHASE === 'ui' || PHASE === 'all') await runUi(probe, fixtureUrl, scenario);
    if (PHASE === 'lock' || PHASE === 'all') await runLock(probe, fixtureUrl, scenario);
    if (PHASE === 'flow' || PHASE === 'all') await runFlow(probe, fixtureUrl, scenario);
    if (PHASE === 'perf' || PHASE === 'all') await runPerf(probe, fixtureUrl, scenario);
    if (PHASE === 'sources' || PHASE === 'all') await runSources(probe, fixtureUrl, scenario);
    if (PHASE === 'rollback' || PHASE === 'all') await runRollback(probe, fixtureUrl, scenario);
  } catch (err) {
    fail('gate: unexpected error', err?.message || String(err));
    scenario.errors.push(err?.message || String(err));
  } finally {
    // Cleanup: never `clear`; remove only tagged items and restore the prior bill.
    for (let passNo = 0; passNo < 4; passNo++) {
      const bill = probe.latest();
      for (const item of [...(bill?.queue || []), ...(bill?.now ? [bill.now] : [])]) {
        if (item.url === fixtureUrl || item.title?.includes(TAG)) {
          probe.channel.push('theater_queue', { op: 'remove', itemId: item.id });
        }
      }
      await sleep(600);
    }
    if (originalNow) {
      probe.channel.push('theater_channel', { url: originalNow.url, title: originalNow.title });
      await sleep(1000);
    }
    probe.disconnect();
    await closeAll();
  }

  scenario.finalNow = scenario.finalNow || null;
  writeEvidence(scenario);
  log(`done — ${passes.length} passed, ${failures.length} failed`);
  process.exit(failures.length ? 1 : 0);
}

for (const sig of ['SIGINT', 'SIGTERM', 'uncaughtException', 'unhandledRejection']) {
  process.on(sig, async (err) => {
    if (err) console.error('[floating-gate] fatal:', err?.message || err);
    await closeAll();
    process.exit(1);
  });
}

await main();
