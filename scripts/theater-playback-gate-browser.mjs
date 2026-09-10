#!/usr/bin/env node
/**
 * Two-client theater playback gate (fix-theater-second-player-playback, task 1.1).
 *
 * Opens two isolated browser sessions against a configurable origin: client B
 * starts a YouTube item through the projection booth (real clicks), client A
 * observes without interacting. Records, per second: each client's theater
 * screen state, console diagnostics, the WebSocket frames that client actually
 * sent (`theater_*`), and the authoritative bill from an independent gateway
 * probe. Writes JSON + Markdown evidence under the change directory.
 *
 * Usage:
 *   node scripts/theater-playback-gate-browser.mjs
 *   GATE_APP='https://…/?room=theater&debug=1' GATE_GATEWAY='https://…' \
 *     GATE_LABEL=deployed node scripts/theater-playback-gate-browser.mjs
 *
 * Env:
 *   GATE_APP       app URL (default http://localhost:5173/?room=theater&debug=1)
 *   GATE_GATEWAY   gateway base for the billing probe (default http://localhost:4000)
 *   GATE_LABEL     evidence label (default "run")
 *   GATE_HEADED=1  run a headed browser (for Xvfb / real autoplay policy)
 *   GATE_AUTOPLAY_STRICT=1  add --autoplay-policy=document-user-activation-required
 *   GATE_SOUND=on  attempt to turn the game Sound toggle on before the action
 *   GATE_SECONDS   observation seconds after the action (default 18)
 *   GATE_URL       YouTube URL to play (default a stable, embeddable video)
 *
 * Dev-only tool: never imported by the app or the test suites. Never calls
 * `clear`; probe bill items are tagged and removed, and the pre-existing live
 * item is restored through `theater_channel`.
 */

import { execSync, spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Socket } from '../node_modules/phoenix/priv/static/phoenix.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EVIDENCE_DIR = join(ROOT, 'openspec/changes/fix-theater-second-player-playback/evidence');

const APP = process.env.GATE_APP || 'http://localhost:5173/?room=theater&debug=1';
const GATEWAY = (process.env.GATE_GATEWAY || 'http://localhost:4000').replace(/\/+$/, '');
const LABEL = process.env.GATE_LABEL || 'run';
const HEADED = process.env.GATE_HEADED === '1';
const AUTOPLAY_STRICT = process.env.GATE_AUTOPLAY_STRICT === '1';
const SOUND = process.env.GATE_SOUND || 'off';
const SECONDS = Math.max(5, Number(process.env.GATE_SECONDS) || 18);
const VIDEO_URL = process.env.GATE_URL || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

const DRIVER_PORT = 9600 + Math.floor(Math.random() * 300);
const DRIVER = `http://127.0.0.1:${DRIVER_PORT}`;
const TAG = `gate-${Date.now().toString(36)}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log('[theater-gate]', ...a);

let driverProc = null;
const LIVE = new Set();

function chromeProcessCount() {
  try {
    return Number(execSync("ps -eo comm | grep -cE '^(chromedriver|chrome)$' || true", { shell: '/bin/bash' }).toString().trim()) || 0;
  } catch {
    return -1;
  }
}

function guardBeforeLaunch() {
  const n = chromeProcessCount();
  if (n > 30) {
    throw new Error(
      `SAFETY GUARD: ${n} chrome/chromedriver processes already exist. ` +
        'Clean up strays first (pkill -9 -f chromedriver; pkill -9 -f "chrome") or set GATE_ALLOW_STRAYS=1.',
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

for (const sig of ['SIGINT', 'SIGTERM', 'uncaughtException', 'unhandledRejection']) {
  process.on(sig, async (err) => {
    if (err) console.error('[theater-gate] fatal:', err?.message || err);
    await closeAll();
    process.exit(1);
  });
}

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
    '--disable-backgrounding-occluded-windows',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-hang-monitor',
  ];
  if (!HEADED) args.push('--headless=new');
  if (AUTOPLAY_STRICT) args.push('--autoplay-policy=document-user-activation-required');
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
const findEl = async (s, css) => {
  const el = await req('POST', `/session/${s.id}/element`, { using: 'css selector', value: css });
  return el?.['element-6066-11e4-a52e-4f735466cecf'] ?? el?.ELEMENT;
};
const clickEl = (s, eid) => req('POST', `/session/${s.id}/element/${eid}/click`, {});
const cdp = (s, cmd, params = {}) => req('POST', `/session/${s.id}/chromium/send_command`, { cmd, params });

async function preloadHook(s) {
  await cdp(s, 'Page.addScriptToEvaluateOnNewDocument', { source: PAGE_HOOK }).catch(() => {});
}

async function waitTransport(s, timeoutMs = 60000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const open = await js(s, `return !!(window.__afterlight && window.__afterlight.netState && window.__afterlight.netState().open);`).catch(() => false);
    if (open) return true;
    await sleep(700);
  }
  return false;
}

const screenState = (s) => js(s, `
  const el = document.getElementById('theater-screen');
  const media = el?.querySelector('.ts-media');
  const first = media?.firstElementChild || null;
  const badge = el?.querySelector('.ts-play-badge');
  let mediaState = null;
  if (first?.tagName === 'VIDEO') {
    mediaState = 'VIDEO/' + (Number.isFinite(first.currentTime) ? first.currentTime.toFixed(1) : '?') +
      '/' + (first.paused ? 'paused' : 'playing') + '/rs' + first.readyState +
      (first.error ? '/err' + first.error.code : '');
  } else if (first?.tagName === 'IFRAME') {
    mediaState = 'IFRAME';
  }
  return {
    cls: el?.className || null,
    caption: el?.querySelector('.ts-caption-text')?.textContent || '',
    badge: badge ? !badge.hidden : null,
    media: mediaState,
    logs: (window.__gateLogs || []).slice(-10),
    sent: (window.__wsSent || []).map((f) => f.type + ':' + (f.payload?.op || '') + ':' + (f.payload?.itemId || f.payload?.url?.slice?.(0, 40) || '')).slice(-12),
    sound: document.getElementById('sound')?.textContent || null,
  };
`);

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

async function runActors() {
  guardBeforeLaunch();
  await startDriver();

  const scenario = {
    label: LABEL,
    app: APP,
    gateway: GATEWAY,
    headed: HEADED,
    autoplayStrict: AUTOPLAY_STRICT,
    soundRequested: SOUND,
    videoUrl: VIDEO_URL,
    startedAt: new Date().toISOString(),
    tag: TAG,
    billProbe: { itemIds: [], advances: [] },
    A: { name: 'A-observer', samples: [] },
    B: { name: 'B-actor', samples: [] },
    errors: [],
  };

  const probe = await connectBillProbe();
  const originalNow = probe.latest()?.now ? { url: probe.latest().now.url, title: probe.latest().now.title } : null;
  scenario.billProbe.originalNow = originalNow;
  log('original bill now:', originalNow ? originalNow.title : '(idle)');

  const A = await newSession('A');
  const B = await newSession('B');
  try {
    for (const s of [A, B]) {
      await preloadHook(s);
      await req('POST', `/session/${s.id}/url`, { url: APP });
    }
    for (const s of [A, B]) {
      const open = await waitTransport(s);
      log(`${s.name} transport open = ${open}`);
      if (!open) scenario.errors.push(`${s.name} transport never opened`);
    }

    if (SOUND === 'on') {
      // The footer (and its Sound toggle) is hidden in cinema view; step out
      // of cinema view first so a real WebDriver click can hit it (the click
      // is what lets the AudioContext and autoplay policy actually engage).
      await js(B, `
        document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true, cancelable: true }));
        return true;`).catch(() => {});
      await sleep(800);
      let soundLabel = null;
      const soundBtn = await findEl(B, '#sound').catch(() => null);
      if (soundBtn) {
        await clickEl(B, soundBtn).catch(() => {});
        soundLabel = await js(B, `return document.getElementById('sound')?.textContent || null;`).catch(() => null);
      }
      if (!/on/i.test(soundLabel || '')) {
        soundLabel = await js(B, `document.getElementById('sound')?.click(); return document.getElementById('sound')?.textContent || null;`).catch(() => null);
      }
      scenario.billProbe.soundLabel = soundLabel;
      log('B sound label after click:', soundLabel);
      await sleep(500);
    }

    // B opens the booth and starts the item with real clicks where possible.
    const booth = await findEl(B, '#theater-watchbar-controls').catch(() => null);
    if (booth) await clickEl(B, booth).catch(() => {});
    await sleep(800);
    const dialogOpen = await js(B, `return !!document.getElementById('theater-dialog')?.open;`).catch(() => false);
    if (!dialogOpen) {
      await js(B, `document.getElementById('theater-dialog')?.showModal(); return true;`).catch(() => {});
      await sleep(300);
    }
    await js(B, `
      const i = document.getElementById('theater-url-input');
      if (i) { i.value = ${JSON.stringify(VIDEO_URL)}; i.dispatchEvent(new Event('input', { bubbles: true })); }
      return i ? i.value : null;`).catch(() => {});
    const playBtn = await findEl(B, '#theater-btn-play-url').catch(() => null);
    if (playBtn) {
      await clickEl(B, playBtn).catch(async () => {
        await js(B, `document.getElementById('theater-btn-play-url')?.click(); return true;`).catch(() => {});
      });
    } else {
      await js(B, `document.getElementById('theater-btn-play-url')?.click(); return true;`).catch(() => {});
    }
    scenario.actionAt = new Date().toISOString();
    log('B clicked Play now with', VIDEO_URL);

    for (let i = 0; i < SECONDS; i++) {
      await sleep(1000);
      const [sa, sb] = await Promise.all([screenState(A).catch(() => null), screenState(B).catch(() => null)]);
      scenario.A.samples.push({ t: i + 1, ...sa });
      scenario.B.samples.push({ t: i + 1, ...sb });
      const bill = probe.latest();
      scenario.billProbe.itemIds.push({ t: i + 1, nowId: bill?.now?.id || null, nowTitle: bill?.now?.title || null, playing: bill?.now?.playing ?? null });
      log(`t+${i + 1}s A=${sa?.cls}/${sa?.media}/badge:${sa?.badge} B=${sb?.cls}/${sb?.media}/badge:${sb?.badge}`);
    }

    // Cleanup: remove tagged items (never `clear`), restore the original live item.
    for (let pass = 0; pass < 4; pass++) {
      const bill = probe.latest();
      for (const item of [...(bill?.queue || []), ...(bill?.now ? [bill.now] : [])]) {
        if (item.title?.includes(TAG) || item.title?.includes('Rick Astley') || item.url === VIDEO_URL) {
          probe.channel.push('theater_queue', { op: 'remove', itemId: item.id });
        }
      }
      await sleep(700);
    }
    if (originalNow) {
      probe.channel.push('theater_channel', { url: originalNow.url, title: originalNow.title });
      await sleep(1200);
    }
    for (let pass = 0; pass < 2; pass++) {
      const bill = probe.latest();
      for (const item of [...(bill?.queue || []), ...(bill?.now ? [bill.now] : [])]) {
        if (item.title?.includes(TAG) || item.url === VIDEO_URL) {
          probe.channel.push('theater_queue', { op: 'remove', itemId: item.id });
        }
      }
      await sleep(700);
    }
    scenario.billProbe.finalNow = probe.latest()?.now?.title || null;
  } finally {
    probe.disconnect();
    await closeAll();
  }

  writeEvidence(scenario);
  return scenario;
}

function writeEvidence(scenario) {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = `${stamp}-${LABEL}`;
  writeFileSync(join(EVIDENCE_DIR, `${base}.json`), `${JSON.stringify(scenario, null, 2)}\n`);

  const aStalled = scenario.A.samples.some((s) => s && s.cls?.includes('ts-state-playing') === false && s.media === 'IFRAME');
  const aBadge = scenario.A.samples.some((s) => s && s.badge === true);
  const aPlayed = scenario.A.samples.some((s) => s && s.cls?.includes('ts-state-playing'));
  const bPlayed = scenario.B.samples.some((s) => s && s.cls?.includes('ts-state-playing'));
  const aReports = scenario.A.samples.flatMap((s) => s?.sent || []).filter((x) => /(ended|failed)/.test(x));
  const bReports = scenario.B.samples.flatMap((s) => s?.sent || []).filter((x) => /(ended|failed)/.test(x));
  const nowIds = [...new Set(scenario.billProbe.itemIds.map((x) => x.nowId).filter(Boolean))];

  const md = [
    `# Theater playback gate — ${scenario.label}`,
    '',
    `- When: ${scenario.startedAt}`,
    `- App: ${scenario.app}`,
    `- Gateway: ${scenario.gateway}`,
    `- Headed: ${scenario.headed} · autoplay strict: ${scenario.autoplayStrict} · sound: ${scenario.soundRequested}`,
    `- Video: ${scenario.videoUrl}`,
    `- Pre-existing live item: ${scenario.billProbe.originalNow ? scenario.billProbe.originalNow.title : '(idle)'}`,
    `- Final live item: ${scenario.billProbe.finalNow || '(idle)'}`,
    '',
    '## Result',
    '',
    `- B (actor) reached playing: ${bPlayed}`,
    `- A (observer) reached playing: ${aPlayed}`,
    `- A showed the start control at some point: ${aBadge}`,
    `- A sent ended/failed frames: ${aReports.length ? aReports.join(', ') : 'none'}`,
    `- B sent ended/failed frames: ${bReports.length ? bReports.join(', ') : 'none'}`,
    `- Bill now-item ids observed: ${nowIds.join(', ') || 'none'}`,
    '',
    '## Raw',
    '',
    `- JSON evidence: \`${base}.json\``,
    '',
  ].join('\n');
  writeFileSync(join(EVIDENCE_DIR, `${base}.md`), md);
  log(`evidence written: ${join(EVIDENCE_DIR, `${base}.json`)}`);
}

log(`gate start — app=${APP} gateway=${GATEWAY} headed=${HEADED} strict=${AUTOPLAY_STRICT}`);
const result = await runActors();
const aPlayed = result.A.samples.some((s) => s?.cls?.includes('ts-state-playing'));
const bPlayed = result.B.samples.some((s) => s?.cls?.includes('ts-state-playing'));
const aBadge = result.A.samples.some((s) => s?.badge === true);
log(`done — A played=${aPlayed} badge=${aBadge} B played=${bPlayed}`);
process.exit(0);
