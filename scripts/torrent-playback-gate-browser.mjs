#!/usr/bin/env node
/**
 * Deterministic seeded-torrent playback gate
 * (fix-torrent-playback-grant-regression, task 10).
 *
 * Seeds a tiny committed fixture (`tests/fixtures/torrent-gate/`) with a local
 * `bittorrent-tracker` instance and a Node WebTorrent seeder, then drives real
 * Chrome sessions (chromedriver) through the full Orpheum flow:
 *
 *   A: paste magnet -> resolve -> pick clip_a.webm -> playback starts
 *      (first stream URL carries a grant; no video-error event)
 *   A: pause / resume / forward seek / backward seek
 *   B: joins mid-stream and reaches playback with its own distinct grant
 *   A: re-picks clip_b.webm from the same torrent (file change -> new grant)
 *   B: leaves to The Rain Court and returns (grants clear, then re-mint)
 *
 * Writes JSON + Markdown evidence under the change directory and exits
 * non-zero when a core assertion fails.
 *
 * Usage:
 *   node scripts/torrent-playback-gate-browser.mjs
 *   GATE_LABEL=local GATE_SECONDS=14 node scripts/torrent-playback-gate-browser.mjs
 *
 * Env:
 *   GATE_APP       app URL (default http://localhost:5173/?room=theater&debug=1)
 *   GATE_GATEWAY   gateway base for the bill probe (default http://localhost:4000)
 *   GATE_LABEL     evidence label (default "run")
 *   GATE_SECONDS   playback observation seconds (default 14)
 *   GATE_HEADED=1  run a headed browser (Xvfb / real autoplay policy)
 *   GATE_TRACKER_PORT  local tracker port (default ephemeral)
 *
 * Dev-only tool: never imported by the app or the test suites. Never calls
 * `clear`; probe bill items are tagged and removed.
 *
 * Dependency note: `webtorrent` is a direct devDependency; the local tracker
 * is imported from `bittorrent-tracker`, a locked transitive dependency of
 * webtorrent's torrent-discovery. The script fails loudly if either is
 * missing (run `npm install` if so).
 */

import { execSync, spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { Server as TrackerServer } from 'bittorrent-tracker';
import WebTorrent from 'webtorrent';
import { Socket } from '../node_modules/phoenix/priv/static/phoenix.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EVIDENCE_DIR = join(ROOT, 'openspec/changes/fix-torrent-playback-grant-regression/evidence');
const FIXTURE_DIR = join(ROOT, 'tests/fixtures/torrent-gate');

const APP = process.env.GATE_APP || 'http://localhost:5173/?room=theater&debug=1';
const GATEWAY = (process.env.GATE_GATEWAY || 'http://localhost:4000').replace(/\/+$/, '');
const LABEL = process.env.GATE_LABEL || 'run';
const HEADED = process.env.GATE_HEADED === '1';
const SECONDS = Math.max(6, Number(process.env.GATE_SECONDS) || 14);
const TRACKER_PORT = Number(process.env.GATE_TRACKER_PORT) || 0;

const DRIVER_PORT = 9600 + Math.floor(Math.random() * 300);
const DRIVER = `http://127.0.0.1:${DRIVER_PORT}`;
const TAG = `torrent-gate-${Date.now().toString(36)}`;
const log = (...a) => console.log('[torrent-gate]', ...a);

let driverProc = null;
let tracker = null;
let seeder = null;
const LIVE = new Set();
const failures = [];
const fail = (name, detail = '') => {
  failures.push({ name, detail });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`);
};
const pass = (name, detail = '') => console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`);

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
        'Clean up strays first (pkill -9 -f chromedriver; pkill -9 -f "chrome") ' +
        'or set GATE_ALLOW_STRAYS=1 to proceed anyway (the gate still cleans up its own sessions).',
    );
  }
}

function startDriver() {
  driverProc = spawn('/snap/bin/chromium.chromedriver', [`--port=${DRIVER_PORT}`, '--whitelisted-ips=127.0.0.1'], {
    stdio: 'ignore',
  });
  const t0 = Date.now();
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const res = await fetch(`${DRIVER}/status`);
        if (res.ok) return resolve(true);
      } catch {}
      if (Date.now() - t0 > 12000) return reject(new Error('chromedriver did not start'));
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
}

async function shutdown() {
  await closeAll();
  try { seeder?.destroy(); } catch {}
  if (tracker) {
    await new Promise((resolve) => {
      try { tracker.close(() => resolve()); } catch { resolve(); }
      setTimeout(resolve, 1500);
    });
  }
}

for (const sig of ['SIGINT', 'SIGTERM', 'uncaughtException', 'unhandledRejection']) {
  process.on(sig, async (err) => {
    if (err) console.error('[torrent-gate] fatal:', err?.message || err);
    await shutdown();
    process.exit(1);
  });
}

// --- webdriver plumbing (same pattern as theater-playback-gate-browser.mjs) ---

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
        'goog:chromeOptions': { args, binary: '/usr/bin/chromium-browser', excludeSwitches: ['enable-automation'] },
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
const cdp = (s, cmd, params = {}) => req('POST', `/session/${s.id}/chromium/send_command`, { cmd, params });

async function preloadHook(s) {
  await cdp(s, 'Page.addScriptToEvaluateOnNewDocument', { source: PAGE_HOOK }).catch(() => {});
}

const CODE = (fn) => `return (${fn.toString()})();`;

async function waitFor(probe, timeoutMs, stepMs = 500) {
  const end = Date.now() + timeoutMs;
  let value = null;
  while (Date.now() < end) {
    value = await probe().catch(() => null);
    if (value) return value;
    await sleep(stepMs);
  }
  return value;
}

async function waitTransport(s, timeoutMs = 60000) {
  const open = await waitFor(
    () => js(s, 'return !!(window.__afterlight && window.__afterlight.netState && window.__afterlight.netState().open);'),
    timeoutMs,
    700,
  );
  return !!open;
}

/** Bounded per-client torrent state: media element + ?debug=1 event ring. */
const clientState = (s) => js(s, `
  const el = document.getElementById('theater-screen');
  const video = el?.querySelector('video') || null;
  const ring = (window.__afterlight && window.__afterlight.theaterPlayback) ? window.__afterlight.theaterPlayback() : [];
  return {
    room: (window.__afterlight && window.__afterlight.room) ? window.__afterlight.room() : null,
    cls: el?.className || null,
    caption: el?.querySelector('.ts-caption-text')?.textContent || '',
    video: video ? {
      src: video.src.replace(/([?&]grant=)[^&]+/, '$1[redacted]'),
      signed: /[?&]grant=/.test(video.src),
      currentTime: Number.isFinite(video.currentTime) ? video.currentTime : null,
      paused: video.paused,
      readyState: video.readyState,
      error: video.error?.code ?? null,
    } : null,
    events: ring.map((e) => ({
      type: e.type,
      itemId: e.itemId || null,
      infohash: e.infohash || null,
      fileIndex: e.fileIndex ?? null,
      signed: e.signed ?? null,
      fingerprint: e.fingerprint || null,
      mediaError: e.mediaError ?? null,
    })),
    logs: (window.__gateLogs || []).slice(-8),
  };
`);

async function openBooth(s) {
  // The booth button lives in the watch bar; leave cinema view first so the
  // footer row is clickable, then open the dialog directly if the click
  // misses (the dialog itself is a plain <dialog>).
  await js(s, `
    document.activeElement?.blur?.();
    document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true, cancelable: true }));
    document.getElementById('theater-watchbar-controls')?.click();
    return true;`).catch(() => {});
  await sleep(500);
  return js(s, `
    const d = document.getElementById('theater-dialog');
    if (d && !d.open) { try { d.showModal(); } catch {} }
    return !!d?.open;`);
}

async function submitMagnet(s, magnet) {
  await js(s, `
    const i = document.getElementById('theater-url-input');
    if (i) { i.value = ${JSON.stringify(magnet)}; i.dispatchEvent(new Event('input', { bubbles: true })); }
    document.getElementById('theater-btn-play-url')?.click();
    return true;`);
}

async function pickTorrentFile(s, needle) {
  return waitFor(
    () => js(s, `
      const rows = [...document.querySelectorAll('#theater-torrent-files .theater-torrent-file')];
      const row = rows.find((b) => b.textContent.includes(${JSON.stringify(needle)}));
      if (!row) return null;
      row.click();
      return row.textContent;`),
    60000,
    500,
  );
}

async function clickTransport(s, id) {
  return js(s, `const b = document.getElementById(${JSON.stringify(id)}); if (!b) return false; b.click(); return true;`);
}

/** Leave/re-enter helpers via the real Places selector (T / Travel). */
async function travelViaSelector(s, cardText) {
  await js(s, `
    document.activeElement?.blur?.();
    document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyT', key: 't', bubbles: true, cancelable: true }));
    return true;`);
  await sleep(400);
  return waitFor(
    () => js(s, `
      const d = document.getElementById('district-dialog');
      if (!d?.open) return null;
      const card = [...d.querySelectorAll('button.place-card')].find((b) => b.textContent.includes(${JSON.stringify(cardText)}));
      if (!card) return null;
      card.click();
      return true;`),
    5000,
    300,
  );
}

// --- local deterministic seeding ------------------------------------------------

async function startSeeder() {
  tracker = new TrackerServer({ udp: false, http: true, ws: false, stats: false });
  await new Promise((resolve, reject) => {
    tracker.once('error', reject);
    tracker.listen(TRACKER_PORT, '127.0.0.1', resolve);
  });
  const port = tracker.http.address().port;
  const announce = `http://127.0.0.1:${port}/announce`;

  seeder = new WebTorrent();
  const torrent = await new Promise((resolve, reject) => {
    const t = seeder.seed(FIXTURE_DIR, { name: 'AfterlightTorrentGate', announce: [announce] }, resolve);
    t.once('error', reject);
    setTimeout(() => reject(new Error('seeder did not become ready')), 15000);
  });

  const files = torrent.files.map((f) => f.path);
  log(`seeded ${torrent.infoHash} (${files.join(', ')}) via ${announce}`);
  return {
    announce,
    infohash: torrent.infoHash,
    name: torrent.name,
    files,
    magnet: torrent.magnetURI,
    seededTorrent: torrent,
  };
}

// --- independent bill probe -----------------------------------------------------

async function connectBillProbe() {
  const guestId = `${TAG}-probe`;
  const res = await fetch(`${GATEWAY}/api/auth/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
    body: JSON.stringify({ guestId, nickname: 'GateProbe' }),
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
  channel.push('hello', { guestId, nickname: 'GateProbe' });
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

// --- the run ---------------------------------------------------------------------

async function removeTagged(probe) {
  for (let pass = 0; pass < 3; pass++) {
    const bill = probe.latest();
    for (const item of [...(bill?.queue || []), ...(bill?.now ? [bill.now] : [])]) {
      if (item.title?.includes(TAG) || item.title?.includes('AfterlightTorrentGate')) {
        probe.channel.push('theater_queue', { op: 'remove', itemId: item.id });
      }
    }
    await sleep(600);
  }
}

function torrentEvents(events, infohash, fileIndex) {
  return events.filter(
    (e) => e.type === 'torrent-grant-received' && e.infohash === infohash &&
      (fileIndex === undefined || e.fileIndex === fileIndex),
  );
}

function lastGrants(events, infohash) {
  const first = torrentEvents(events, infohash);
  return first.at(-1) || null;
}

async function run() {
  const scenario = {
    label: LABEL,
    app: APP,
    gateway: GATEWAY,
    headed: HEADED,
    startedAt: new Date().toISOString(),
    tag: TAG,
    seeding: null,
    A: { samples: [] },
    B: { samples: [] },
    phases: {},
    failures: failures,
  };

  const seed = await startSeeder();
  scenario.seeding = { infohash: seed.infohash, name: seed.name, files: seed.files, announce: seed.announce };

  const probe = await connectBillProbe();
  const originalNow = probe.latest()?.now ? { url: probe.latest().now.url, title: probe.latest().now.title } : null;
  scenario.originalNow = originalNow;

  await guardBeforeLaunch();
  await startDriver();

  const A = await newSession('A');
  const B = await newSession('B');
  try {
    for (const s of [A, B]) {
      await preloadHook(s);
      await req('POST', `/session/${s.id}/url`, { url: APP });
    }
    for (const s of [A, B]) {
      const open = await waitTransport(s);
      if (!open) fail(`session ${s.name} transport never opened`);
    }

    // --- A: resolve -> pick -> play ---
    await openBooth(A);
    await submitMagnet(A, seed.magnet);
    const pickedA = await pickTorrentFile(A, 'clip_a.webm');
    if (pickedA) pass('A resolved the magnet and picked clip_a.webm', pickedA.trim());
    else fail('A never saw the torrent picker', `add-status=${await js(A, `return document.getElementById('theater-add-status')?.textContent || '';`).catch(() => '')}`);

    const aPlaying = await waitFor(async () => {
      const st = await clientState(A);
      scenario.A.samples.push({ t: Date.now(), ...st });
      return st?.cls?.includes('ts-state-playing') && (st.video?.currentTime ?? 0) > 0.15 ? st : null;
    }, 60000, 1000);

    if (aPlaying) pass('A reached playing', `t=${aPlaying.video.currentTime.toFixed(1)}s signed=${aPlaying.video.signed}`);
    else fail('A never reached playing');

    const aState = await clientState(A);
    const aSourceSet = aState.events.find((e) => e.type === 'torrent-source-set' && e.fileIndex === 0);
    const aErrors = aState.events.filter((e) => e.type === 'video-error');
    const aGrant = lastGrants(aState.events, seed.infohash);

    if (aSourceSet?.signed) pass('A first stream URL was signed (grant present)');
    else fail('A first stream URL was not signed', JSON.stringify(aSourceSet || null));

    if (!aErrors.length) pass('A saw no video-error event');
    else fail('A saw video errors', JSON.stringify(aErrors));

    if (aGrant) pass('A received a participant grant', `fingerprint=${aGrant.fingerprint} fileIndex=${aGrant.fileIndex}`);
    else fail('A never received a torrent-grant-received event');
    scenario.phases.A_first_grant = aGrant?.fingerprint || null;

    // --- pause / resume ---
    const before = (await clientState(A)).video?.currentTime ?? 0;
    await sleep(1200);
    const progressed = (await clientState(A)).video?.currentTime ?? 0;
    await clickTransport(A, 'theater-btn-toggle');
    await sleep(800);
    const pausedAt = (await clientState(A)).video?.currentTime ?? before;
    await sleep(1200);
    const pausedHeld = (await clientState(A)).video?.currentTime ?? pausedAt;

    if (pausedHeld - pausedAt < 0.35 && progressed > before) {
      pass('pause holds playback', `${pausedAt.toFixed(1)}s -> ${pausedHeld.toFixed(1)}s`);
    } else {
      fail('pause did not hold', `${pausedAt.toFixed(1)} -> ${pausedHeld.toFixed(1)}`);
    }

    await clickTransport(A, 'theater-btn-toggle');
    const resumed = await waitFor(async () => {
      const ct = (await clientState(A)).video?.currentTime ?? 0;
      return ct > pausedHeld + 0.4 ? ct : null;
    }, 10000, 500);
    if (resumed) pass('resume advances playback', `${resumed.toFixed(1)}s`);
    else fail('resume did not advance playback');
    scenario.phases.pause_resume = { progressed, pausedAt, pausedHeld, resumed };

    // --- seek forward into an unmapped region, then backward ---
    await js(A, `const v = document.querySelector('#theater-screen video'); if (v) v.currentTime = 8; return true;`);
    const seekedForward = await waitFor(async () => {
      const ct = (await clientState(A)).video?.currentTime ?? 0;
      return ct >= 7.5 ? ct : null;
    }, 15000, 500);
    if (seekedForward) pass('forward seek reached the target', `${seekedForward.toFixed(1)}s`);
    else fail('forward seek did not reach the target');

    await js(A, `const v = document.querySelector('#theater-screen video'); if (v) v.currentTime = 1; return true;`);
    const seekedBack = await waitFor(async () => {
      const ct = (await clientState(A)).video?.currentTime ?? 0;
      return ct >= 0.9 && ct <= 3.5 ? ct : null;
    }, 15000, 500);
    if (seekedBack) pass('backward seek reached the target', `${seekedBack.toFixed(1)}s`);
    else fail('backward seek did not reach the target');
    scenario.phases.seek = { forward: seekedForward, back: seekedBack };

    // --- B joins mid-stream ---
    const bOpen = await waitTransport(B);
    if (!bOpen) fail('B transport never opened');
    const bPlaying = await waitFor(async () => {
      const st = await clientState(B);
      scenario.B.samples.push({ t: Date.now(), ...st });
      return st?.cls?.includes('ts-state-playing') && (st.video?.currentTime ?? 0) > 0.15 ? st : null;
    }, 60000, 1000);
    if (bPlaying) pass('B reached playback after joining mid-stream', `t=${bPlaying.video.currentTime.toFixed(1)}s`);
    else fail('B never reached playback while A was streaming');

    const bState = await clientState(B);
    const bGrant = lastGrants(bState.events, seed.infohash);
    if (bGrant) pass('B received its own grant', `fingerprint=${bGrant.fingerprint} fileIndex=${bGrant.fileIndex}`);
    else fail('B never received a grant');

    if (aGrant?.fingerprint && bGrant?.fingerprint && aGrant.fingerprint !== bGrant.fingerprint) {
      pass('A and B hold distinct participant-scoped grants');
    } else {
      fail('A/B grant fingerprints are missing or identical', `A=${aGrant?.fingerprint} B=${bGrant?.fingerprint}`);
    }
    scenario.phases.grants = { A: aGrant?.fingerprint || null, B: bGrant?.fingerprint || null };

    for (let i = 0; i < SECONDS; i++) {
      await sleep(1000);
      const [sa, sb] = await Promise.all([clientState(A).catch(() => null), clientState(B).catch(() => null)]);
      if (sa) scenario.A.samples.push({ t: Date.now(), ...sa });
      if (sb) scenario.B.samples.push({ t: Date.now(), ...sb });
    }

    // --- file change: same torrent, clip_b.webm ---
    await openBooth(A);
    await submitMagnet(A, seed.magnet);
    const pickedB = await pickTorrentFile(A, 'clip_b.webm');
    if (pickedB) pass('A re-picked clip_b.webm (file change)', pickedB.trim());
    else fail('A could not re-pick clip_b.webm');

    const changed = await waitFor(async () => {
      const st = await clientState(A);
      const sourceSet = st?.events.filter((e) => e.type === 'torrent-source-set').at(-1);
      const grant = lastGrants(st?.events || [], seed.infohash);
      return sourceSet?.fileIndex === 1 && grant?.fileIndex === 1 ? { sourceSet, grant, st } : null;
    }, 60000, 1000);
    if (changed) {
      pass('file change produced a new grant and source for fileIndex=1', `fingerprint=${changed.grant.fingerprint}`);
    } else {
      fail('file change did not produce a fileIndex=1 grant/source');
    }
    scenario.phases.file_change = changed ? { fileIndex: 1, fingerprint: changed.grant.fingerprint } : null;

    // --- leave / re-enter on B ---
    const left = await travelViaSelector(B, 'The Rain Court');
    if (left) {
      await waitFor(async () => {
        const st = await clientState(B);
        return st?.room === 'court' ? st : null;
      }, 15000, 500);
      pass('B traveled out to The Rain Court');
    } else {
      fail('B could not travel out via the Places selector');
    }

    const returned = await travelViaSelector(B, 'The Orpheum');
    if (returned) {
      const back = await waitFor(async () => {
        const st = await clientState(B);
        const grant = lastGrants(st?.events || [], seed.infohash);
        return st?.room === 'theater' && grant?.fileIndex === 1 ? { st, grant } : null;
      }, 45000, 1000);
      if (back) {
        pass('B re-entered the theater and received a fresh grant', `fingerprint=${back.grant.fingerprint}`);
      } else {
        fail('B re-entered but never received a fresh grant');
      }
      scenario.phases.reenter = back ? { fingerprint: back.grant.fingerprint } : null;
    } else {
      fail('B could not travel back to The Orpheum');
    }
  } finally {
    await removeTagged(probe);
    if (originalNow) {
      probe.channel.push('theater_channel', { url: originalNow.url, title: originalNow.title });
      await sleep(1200);
    }
    scenario.finalNow = probe.latest()?.now?.title || null;
    probe.disconnect();
    await shutdown();
  }

  writeEvidence(scenario);
  return scenario;
}

function writeEvidence(scenario) {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = `${stamp}-${LABEL}`;
  writeFileSync(join(EVIDENCE_DIR, `${base}.json`), `${JSON.stringify(scenario, null, 2)}\n`);

  const md = [
    `# Seeded-torrent playback gate — ${scenario.label}`,
    '',
    `- When: ${scenario.startedAt}`,
    `- App: ${scenario.app}`,
    `- Gateway: ${scenario.gateway}`,
    `- Seeded torrent: \`${scenario.seeding.infohash}\` (${scenario.seeding.files.join(', ')})`,
    `- Announce: ${scenario.seeding.announce}`,
    `- Failures: ${scenario.failures.length}`,
    '',
    '## Phases',
    '',
    `- A first grant fingerprint: ${scenario.phases.A_first_grant || 'none'}`,
    `- A/B grant fingerprints: ${JSON.stringify(scenario.phases.grants || null)}`,
    `- Pause/resume: ${JSON.stringify(scenario.phases.pause_resume || null)}`,
    `- Seek: ${JSON.stringify(scenario.phases.seek || null)}`,
    `- File change: ${JSON.stringify(scenario.phases.file_change || null)}`,
    `- Leave/re-enter: ${JSON.stringify(scenario.phases.reenter || null)}`,
    '',
    '## Failures',
    '',
    scenario.failures.length
      ? scenario.failures.map((f) => `- ${f.name}${f.detail ? `: ${f.detail}` : ''}`).join('\n')
      : '- none',
    '',
    `## Raw`,
    '',
    `- JSON evidence: \`${base}.json\``,
    '',
  ].join('\n');
  writeFileSync(join(EVIDENCE_DIR, `${base}.md`), md);
  log(`evidence written: ${join(EVIDENCE_DIR, `${base}.json`)}`);
}

log(`gate start — app=${APP} gateway=${GATEWAY} headed=${HEADED}`);
await run();
log(`done — failures=${failures.length}`);
process.exit(failures.length ? 1 : 0);
