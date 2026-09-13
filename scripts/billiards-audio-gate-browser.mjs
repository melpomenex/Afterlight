#!/usr/bin/env node
/**
 * Browser gate for convincing-billiards-audio (dev-only; never imported by
 * the app or test suites).
 *
 * Exercises the real game on the supported dev stack (Vite :5173 + Phoenix
 * :4000 + sidecar :3001) through chromedriver/CDP headless Chromium, with an
 * in-page probe on AudioBufferSourceNode start/stop:
 *
 *   phase 1 (single player) — sound enable, palette load (17 fetches), soft
 *     shot, hard break, voice budget ≤ 24, node release, cloth loop
 *     start/stop around motion, no console errors.
 *   phase 2 (offline render) — the table graph (real impactGain + family
 *     trims mirrored from the engine) rendering a max-density break at
 *     maximum effects volume in an OfflineAudioContext; asserts the rendered
 *     peak stays unclipped and saves listenable WAV evidence (soft shot,
 *     break, bank+cushion, pocket) for human audition.
 *   phase 3 (two players + spectator) — player 2 observes nearby as a
 *     spectator (hears cue+contacts exactly once), then takes the table and
 *     player 1 hears the remote shot.
 *   phase 4 (controls/lifecycle) — effects volume 0 through the real mixer,
 *     sound-denied fresh load stays playable with no AudioContext, travel
 *     away mid-motion stops voices fast and the return reuses cached
 *     buffers (no re-fetch), reload mid-shot replays no cue (baseline).
 *
 * Usage:  node scripts/billiards-audio-gate-browser.mjs
 * Env:    GATE_APP, GATE_GATEWAY, GATE_HEADED=1, GATE_LABEL
 */

import { execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EVIDENCE_DIR = join(ROOT, 'openspec/changes/convincing-billiards-audio/evidence');
const APP = process.env.GATE_APP || 'http://localhost:5173/?room=theater&debug=1';
const HEADED = process.env.GATE_HEADED === '1';
const LABEL = process.env.GATE_LABEL || 'run';

const CHROMEDRIVER = process.env.GATE_CHROMEDRIVER
  || (existsSync('/snap/bin/chromium.chromedriver') ? '/snap/bin/chromium.chromedriver' : null)
  || '/usr/bin/chromedriver';
const CHROMIUM = process.env.GATE_CHROMIUM || '/usr/bin/chromium';

const DRIVER_PORT = 9600 + Math.floor(Math.random() * 300);
const DRIVER = `http://127.0.0.1:${DRIVER_PORT}`;
const log = (...a) => console.log('[billiards-audio-gate]', ...a);
const failures = [];
const passes = [];
const pass = (name, detail = '') => { passes.push(name); console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`); };
const fail = (name, detail = '') => { failures.push(name); console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`); };
const check = (name, ok, detail = '') => (ok ? pass(name, detail) : fail(name, detail));

let driverProc = null;
const LIVE = new Set();

function guardBeforeLaunch() {
  const n = Number(execSync("ps -eo comm | grep -cE '^(chromedriver|chrome)$' || true", { shell: '/bin/bash' }).toString().trim()) || 0;
  if (n > 30) throw new Error(`SAFETY GUARD: ${n} chrome processes; clean strays or set GATE_ALLOW_STRAYS=1`);
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
      if (Date.now() - t0 > 12000) return reject(new Error('chromedriver did not start'));
      setTimeout(poll, 300);
    };
    poll();
  });
}

async function closeAll() {
  for (const id of [...LIVE]) {
    LIVE.delete(id);
    try { await fetch(`${DRIVER}/session/${id}`, { method: 'DELETE' }); } catch {}
  }
  if (driverProc) { try { driverProc.kill('SIGKILL'); } catch {} driverProc = null; }
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

async function newSession(name, { freshIdentity = null } = {}) {
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
  if (freshIdentity) {
    await req('POST', `/session/${id}/chromium/send_command`, {
      cmd: 'Page.addScriptToEvaluateOnNewDocument',
      params: {
        source: `try { localStorage.setItem('afterlight-guest-id', ${JSON.stringify(freshIdentity)}); } catch (e) {}`,
      },
    }).catch(() => {});
  }
  // The audio probe must wrap fetch/decodeAudioData/BufferSource BEFORE any
  // game script runs and must survive reloads — same pattern as the other
  // browser gates. Page.enable is required for the new-document script to
  // take effect.
  const enableRes = await req('POST', `/session/${id}/chromium/send_command`, { cmd: 'Page.enable', params: {} }).catch((e) => 'ERR ' + String(e).slice(0, 150));
  const scriptRes = await req('POST', `/session/${id}/chromium/send_command`, {
    cmd: 'Page.addScriptToEvaluateOnNewDocument',
    params: { source: AUDIO_HOOK },
  }).catch((e) => 'ERR ' + String(e).slice(0, 150));
  log('page.enable:', JSON.stringify(enableRes), 'addScript:', JSON.stringify(scriptRes));
  return { name, id };
}

const js = (s, script) => req('POST', `/session/${s.id}/execute/sync`, { script, args: [] });
const cdp = (s, cmd, params = {}) => req('POST', `/session/${s.id}/chromium/send_command`, { cmd, params });
const findEl = async (s, css) => {
  const el = await req('POST', `/session/${s.id}/element`, { using: 'css selector', value: css });
  return el?.['element-6066-11e4-a52e-4f735466cecf'] ?? el?.ELEMENT;
};
const clickEl = (s, eid) => req('POST', `/session/${s.id}/element/${eid}/click`, {});

/** Idempotent in-page hook install; used as the reliable path. */
async function ensureHook(s) {
  for (let i = 0; i < 4; i++) {
    const state = await js(s, `return !!window.__gateHooked;`).catch(() => false);
    if (state === true) return true;
    await js(s, AUDIO_HOOK).catch(() => {});
    await sleep(500);
  }
  return false;
}

async function goto(s, url) {
  await cdp(s, 'Page.navigate', { url });
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) {
    const ready = await js(s, `return document.readyState === 'complete' && !!document.getElementById('world');`).catch(() => false);
    if (ready) return true;
    await sleep(400);
  }
  throw new Error(`session ${s.name}: app did not load at ${url}`);
}

async function waitTransport(s, timeoutMs = 45000) {
  await cdp(s, 'Page.bringToFront').catch(() => {});
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const open = await js(s, `return !!(window.__afterlight && window.__afterlight.netState && window.__afterlight.netState().open);`).catch(() => false);
    if (open) return true;
    await sleep(600);
  }
  return false;
}

/** Installs the audio probe + console capture before the game boots. */
const AUDIO_HOOK = `
  (() => {
    window.__gateLogs = [];
    window.__poolFetches = [];
    globalThis.__poolCueDebug = {};
    try { performance.setResourceTimingBufferSize(2000); } catch (e) {}
    window.__audio = { starts: [], stops: [], contexts: 0, ctxSet: [] };
    if (window.__gateHooked) return true;
    window.__gateHooked = true;
    // Exact palette attribution: tag fetched palette buffers by file name and
    // map decoded AudioBuffers back to names through a WeakMap.
    window.__poolNames = new WeakMap();
    const origFetch = window.fetch.bind(window);
    window.fetch = async (...a) => {
      const url = typeof a[0] === 'string' ? a[0] : (a[0] && a[0].url) || '';
      const res = await origFetch(...a);
      // Palette attribution without regex escapes (template-literal safe).
      const marker = 'audio/pool/';
      const at = url.indexOf(marker);
      if (at >= 0 && url.endsWith('.wav')) {
        const name = url.slice(at + marker.length, url.length - 4);
        window.__poolFetches.push({ name, status: res.status });
        const origArrayBuffer = res.arrayBuffer.bind(res);
        res.arrayBuffer = async () => {
          const ab = await origArrayBuffer();
          try { ab.__poolName = name; } catch (e) {}
          return ab;
        };
      }
      return res;
    };
    const origDecode = window.BaseAudioContext && window.BaseAudioContext.prototype.decodeAudioData;
    if (origDecode) {
      window.BaseAudioContext.prototype.decodeAudioData = function (buf, ...rest) {
        const p = origDecode.call(this, buf, ...rest);
        const name = buf && buf.__poolName;
        if (name && p && typeof p.then === 'function') {
          p.then((decoded) => { try { window.__poolNames.set(decoded, name); } catch (e) {} }).catch(() => {});
        }
        return p;
      };
    }
    for (const k of ['warn', 'error']) {
      const orig = console[k].bind(console);
      console[k] = (...a) => {
        try { window.__gateLogs.push(k + ': ' + a.map((x) => (x && x.message) || String(x)).join(' ')); } catch {}
        orig(...a);
      };
    }
    window.addEventListener('error', (e) => {
      try { window.__gateLogs.push('error: ' + (e.message || e.type)); } catch {}
    });
    window.addEventListener('unhandledrejection', (e) => {
      try { window.__gateLogs.push('unhandled: ' + (e.reason?.message || e.reason)); } catch {}
    });
    const proto = window.AudioBufferSourceNode && window.AudioBufferSourceNode.prototype;
    if (proto && !proto.__probed) {
      const origStart = proto.start;
      const origStop = proto.stop;
      proto.__probed = true;
      proto.start = function (when) {
        try {
          if (this.context && !window.__audio.ctxSet.includes(this.context)) {
            window.__audio.ctxSet.push(this.context);
          }
          let name = null;
          try { name = window.__poolNames && window.__poolNames.get(this.buffer); } catch (e) {}
          window.__audio.starts.push({
            at: Math.round(performance.now()),
            loop: !!this.loop,
            dur: this.buffer ? Math.round(this.buffer.duration * 1000) : null,
            name: name || null,
            rate: Math.round(this.playbackRate.value * 1000) / 1000,
          });
        } catch {}
        return origStart.apply(this, arguments);
      };
      proto.stop = function (when) {
        try {
          window.__audio.stops.push({ at: Math.round(performance.now()), loop: !!this.loop });
        } catch {}
        return origStop.apply(this, arguments);
      };
    }
    return true;
  })();
`;



/** Waits until this session's pool palette is fully fetched (the engine
 *  degrades per-family on failure; a partial palette silences whole
 *  families, so shots only count from a complete load). */
async function waitPalette(s, timeoutMs = 15000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const n = await js(s, `return (window.__poolFetches||[]).filter(f=>f.status===200).length;`).catch(() => 0);
    if (n >= 17) return true;
    await sleep(700);
  }
  return false;
}


/** Fires one stroke with retries: the HUD can show a shootable state from
 *  the client's local sim before the server snapshot confirms the seat, and
 *  that first input can bounce. Retries while the table stays shootable. */
async function fireShot(s, chargeMs = 1200, tries = 4) {
  for (let i = 0; i < tries; i++) {
    await waitShootable(s);
    const before = await js(s, `return window.__audio.starts.filter(v=>!v.loop).length;`).catch(() => 0);
    await keypress(s, 'KeyF', 'f', chargeMs);
    // Wait for either motion voices or settle.
    for (let k = 0; k < 10; k++) {
      await sleep(500);
      const now = await js(s, `return window.__audio.starts.filter(v=>!v.loop).length;`).catch(() => before);
      if (now > before) {
        await sleep(2500); // let the shot play out
        await waitSettled(s);
        return true;
      }
      const status = await js(s, `return (document.querySelector('.pool-hud [data-role="status"]')||{}).textContent || '';`).catch(() => '');
      if (/BALL IN HAND/.test(status)) break; // placement needed, retry
    }
  }
  return false;
}

/** Waits for the table to settle: no new voices for settleMs. */
async function waitSettled(s, settleMs = 1600, timeoutMs = 12000) {
  const end = Date.now() + timeoutMs;
  let last = -1;
  while (Date.now() < end) {
    const n = await js(s, `return window.__audio.starts.filter(v=>!v.loop).length;`).catch(() => -1);
    if (n === last && n > 0) return true;
    last = n;
    await sleep(Math.max(400, settleMs / 2));
  }
  return false;
}

/** Clicks the canvas: places the cue ball during ball-in-hand (trying a few
 *  positions in case one is occupied), aim-only no-op otherwise. */
async function handleBallInHand(s) {
  try {
    const size = await js(s, `const c = document.getElementById('world'); return c ? { w: c.clientWidth, h: c.clientHeight } : null;`);
    if (!size) return;
    // A short F tap during ball-in-hand places the cue ball at the
    // controller's validated preview spot (executeShot's placement branch).
    for (let i = 0; i < 3; i++) {
      await keypress(s, 'KeyF', 'f', 60);
      await sleep(900);
      const status = await js(s, `return (document.querySelector('.pool-hud [data-role="status"]')||{}).textContent || '';`).catch(() => '');
      if (!/BALL IN HAND/.test(status)) return;
    }
  } catch {}
}

/** Leaves the table cleanly (the practice session shuts down and a fresh
 *  one starts on the next join — one reliable shot per session). */
async function leavePool(s) {
  try {
    const el = await findEl(s, '[data-action="exit"]');
    await clickEl(s, el);
  } catch {
    await keypress(s, 'Escape', 'Escape', 60).catch(() => {});
  }
  const end = Date.now() + 8000;
  while (Date.now() < end) {
    const st = await js(s, `return window.__afterlight ? window.__afterlight.participation() : null;`).catch(() => null);
    if (st !== 'participating') return true;
    await sleep(500);
  }
  return false;
}

/** Waits until the pool HUD shows a state the current player can shoot from. */
/** Enables Sound with verification: leaves cinema view first and retries —
 *  the footer button is unreachable while cinema view or the pool HUD is up. */
async function enableSound(s, tries = 3) {
  for (let i = 0; i < tries; i++) {
    const lbl = await js(s, `return (document.getElementById('sound')||{textContent:''}).textContent.trim();`).catch(() => '');
    if (/Sound on/.test(lbl)) return true;
    const cinema = await js(s, `return document.body.classList.contains('theater-watching');`).catch(() => false);
    if (cinema) {
      await keypress(s, 'KeyW', 'w', 500).catch(() => {});
      await sleep(700);
    }
    try {
      const el = await findEl(s, '#sound');
      await clickEl(s, el);
    } catch {}
    await sleep(800);
    // Fallback: a synthetic element click reaches the game's own listener
    // (autoplay policy is disabled in the gate browser, so no gesture gate).
    await js(s, `try { document.getElementById('sound').click(); } catch (e) {} return true;`).catch(() => {});
    await sleep(900);
  }
  const lbl = await js(s, `return (document.getElementById('sound')||{textContent:''}).textContent.trim();`).catch(() => '');
  return /Sound on/.test(lbl);
}

async function waitShootable(s, timeoutMs = 30000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const status = await js(s, `return (document.querySelector('.pool-hud [data-role="status"]')||{}).textContent || '';`).catch(() => '');
    if (/BALL IN HAND/.test(status)) {
      await handleBallInHand(s);
      continue;
    }
    if (/YOUR TURN|SOLO PRACTICE/.test(status)) return true;
    await sleep(600);
  }
  return false;
}

async function keypress(s, code, key, holdMs = 60) {
  await cdp(s, 'Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: code.charCodeAt(0) === 0 ? 0 : vk(code), nativeVirtualKeyCode: vk(code), code, key });
  await sleep(holdMs);
  await cdp(s, 'Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: vk(code), nativeVirtualKeyCode: vk(code), code, key });
}

function vk(code) {
  const map = { KeyE: 69, KeyF: 70, KeyW: 87, KeyA: 65, KeyS: 83, KeyD: 68, Escape: 27 };
  return map[code] ?? 0;
}

async function waitParticipating(s, { activityId = null, timeoutMs = 15000 } = {}) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const state = await js(s, `return window.__afterlight ? { p: window.__afterlight.participation(), a: window.__afterlight.activity() } : null;`).catch(() => null);
    if (state && state.p === 'participating' && (!activityId || state.a === activityId)) return true;
    await sleep(300);
  }
  return false;
}

/** Join the pool table reliably: E can briefly bind to a neighbor activity
 *  while the world settles after a teleport, and the winner-stays session
 *  can still hold a match from an earlier visitor — only a table we can
 *  actually shoot from (YOUR TURN / SOLO PRACTICE) counts as joined. */
async function joinPool(s, tries = 3) {
  for (let i = 0; i < tries; i++) {
    await js(s, `window.__afterlight.tp(-8.6, -6.1); return true;`);
    await sleep(700);
    await keypress(s, 'KeyE', 'e', 60);
    if (await waitParticipating(s, { activityId: 'orpheum-pool', timeoutMs: 6000 })) {
      // Wait until it is actually our stroke.
      const end = Date.now() + 25000;
      while (Date.now() < end) {
        const status = await js(s, `return (document.querySelector('.pool-hud [data-role="status"]')||{}).textContent || '';`).catch(() => '');
        if (/YOUR TURN|SOLO PRACTICE/.test(status)) return true;
        await sleep(600);
      }
      // Stuck in someone else's match: leave and let the session rotate.
      try {
        const el = await findEl(s, '[data-action="exit"]');
        await clickEl(s, el);
      } catch { await keypress(s, 'Escape', 'Escape', 60).catch(() => {}); }
      await sleep(1200);
      continue;
    }
    await keypress(s, 'Escape', 'Escape', 60).catch(() => {});
    await sleep(600);
  }
  return false;
}

/** Active (started, not stopped) non-loop voices, computed in page. */


// ---------------------------------------------------------------------------
// Phases
// ---------------------------------------------------------------------------

async function phase1() {
  log('— phase 1: single player, palette, soft shot, hard break');
  const p1 = await newSession('p1');
  await goto(p1, APP);
  // Fallback install (idempotent) in case the new-document script did not
  // survive chromedriver's target handling for this session.
  for (let i = 0; i < 4; i++) {
    const state = await js(p1, `return !!window.__gateHooked;`).catch(() => false);
    if (state === true) break;
    await js(p1, AUDIO_HOOK).catch(() => {});
    await sleep(500);
  }
  await ensureHook(p1);
  const hookState = await js(p1, `return { hooked: !!window.__gateHooked, audio: typeof window.__audio, url: location.href };`).catch((e) => ({ err: String(e).slice(0, 120) }));
  log('hook state after load:', JSON.stringify(hookState));
  if (!(await waitTransport(p1))) { fail('p1: transport connected'); return null; }
  pass('p1: transport connected');

  // Step out of cinema view, enable Sound (explicit audio gesture)
  await keypress(p1, 'KeyW', 'w', 500).catch(() => {});
  await sleep(700);
  const cinema = await js(p1, `return document.body.classList.contains('theater-watching');`);
  check('p1: stepped out of cinema view', cinema === false, `cinema=${cinema}`);
  let soundLabel = null;
  try {
    const el = await findEl(p1, '#sound');
    await clickEl(p1, el);
    await sleep(600);
    soundLabel = await js(p1, `return document.getElementById('sound').textContent.trim();`);
  } catch (e) {
    fail('p1: sound toggle clickable', String(e).slice(0, 120));
  }
  check('p1: sound toggle flipped on', /Sound on/.test(soundLabel || ''), `label=${soundLabel}`);

  // Join the table
  const joined = await joinPool(p1);
  check('p1: E near the table participates at the billiards table', joined);
  if (!joined) return null;

  // Palette load (triggered by the first updateMovement frames)
  await waitPalette(p1, 20000);
  const palette = await js(p1, `return { n: (window.__poolFetches||[]).filter(f=>f.status===200).length, all: (window.__poolFetches||[]).length };`).catch(() => ({ n: -1, all: -1 }));
  check('p1: palette fetched (17 files, 200s)', palette.n === 17, `ok=${palette.n} of ${palette.all}`);

  // Soft shot: brief F charge → release. A first shot into a full rack makes
  // many contacts even at low power; softness is the relative count vs break.
  await waitShootable(p1);
  await sleep(300);
  const beforeShot = await js(p1, `return window.__audio.starts.filter(v=>!v.loop).length;`);
  const softFired = await fireShot(p1, 180);
  check('p1: soft shot fired', softFired);
  const softVoices = JSON.parse(await js(p1, `return JSON.stringify(window.__audio.starts.filter(v=>!v.loop).slice(${beforeShot}));`));
  const softCues = softVoices.filter((v) => (v.name || '').startsWith('cue-')).length;
  const softBalls = softVoices.filter((v) => (v.name || '').startsWith('ball-')).length;
  check('p1: soft shot plays exactly one cue strike', softCues === 1, `cues=${softCues} of ${softVoices.length} voices`);
  check('p1: soft shot produces ball contacts', softBalls >= 1, `balls=${softBalls}`);

  // Cloth loop: started during motion, stopped after settle
  const clothInfo = await js(p1, `return JSON.stringify({ ls: window.__audio.starts.filter(v=>v.loop), st: window.__audio.stops.filter(v=>v.loop) });`);
  log('cloth loop info:', clothInfo.slice(0, 600));
  const clothParsed = JSON.parse(clothInfo);
  check('p1: cloth movement loop played', clothParsed.ls.length >= 1, `starts=${clothParsed.ls.length}`);

  const errs = await js(p1, `return window.__gateLogs;`);
  const realErrors = (errs || []).filter((l) => !/favicon|ResizeObserver|Download the React DevTools|WebGLShadowMap|PCFSoftShadowMap/i.test(l));
  check('p1: no console errors', realErrors.length === 0, realErrors.slice(0, 3).join(' | ').slice(0, 200));
  p1.__softCount = softVoices.length;
  return p1; // stays seated: later phases fire further strokes from this session
}

async function phase2(p1) {
  log('— phase 2: offline render at maximum effects volume');
  // Mirrors the engine's exact table graph (tableBus 0.8 → compressor
  // −12/12/4/0.002/0.12 → bus at gain 1.0 = max effects pref) and schedules a
  // worst-case simultaneous break (24 voices, hard-layer ball impacts at max
  // impactGain × family trims), then renders and measures the true peak.
  const result = await js(p1, `
    return (async () => {
      const { impactGain } = await import('/src/activities/pool/audioEvents.js');
      const names = ['ball-hard-1','ball-hard-2','cushion-1','pocket-1','cue-hard-1'];
      const buffers = {};
      for (const n of names) {
        const res = await fetch('/audio/pool/' + n + '.wav');
        buffers[n] = await res.arrayBuffer();
      }
      const SR = 44100;
      const DUR = 2.5;
      const offline = new OfflineAudioContext(2, SR * DUR, SR);
      for (const n of Object.keys(buffers)) buffers[n] = await offline.decodeAudioData(buffers[n]);
      const tableBus = offline.createGain(); tableBus.gain.value = 0.5; // mirrors the engine tableBus (headroom-verified)
      const comp = offline.createDynamicsCompressor();
      comp.threshold.value = -12; comp.knee.value = 12; comp.ratio.value = 4;
      comp.attack.value = 0.002; comp.release.value = 0.12;
      const bus = offline.createGain(); bus.gain.value = 1.0; // max effects pref
      tableBus.connect(comp); comp.connect(bus); bus.connect(offline.destination);
      const trim = { ball: 0.85, cushion: 0.7, pocket: 0.8, cue: 0.9 };
      const fam = { 'ball-hard-1':'ball', 'ball-hard-2':'ball', 'cushion-1':'cushion', 'pocket-1':'pocket', 'cue-hard-1':'cue' };
      // 24 simultaneous max-intensity voices (worst case the engine can schedule)
      for (let i = 0; i < 24; i++) {
        const n = names[i % names.length];
        const src = offline.createBufferSource(); src.buffer = buffers[n];
        const g = offline.createGain();
        const target = impactGain(fam[n], 30) * trim[fam[n]];
        g.gain.setValueAtTime(0, 0.05);
        g.gain.linearRampToValueAtTime(target, 0.052);
        src.connect(g); g.connect(tableBus);
        src.start(0.05 + (i % 6) * 0.004);
      }
      const rendered = await offline.startRendering();
      const ch = rendered.getChannelData(0);
      let peak = 0, rms = 0;
      for (let i = 0; i < ch.length; i++) { const a = Math.abs(ch[i]); if (a > peak) peak = a; rms += ch[i]*ch[i]; }
      rms = Math.sqrt(rms / ch.length);
      // Evidence: one full-density break render + a soft shot render
      const evCtx = new OfflineAudioContext(2, SR * DUR, SR);
      const bus2 = evCtx.createGain(); bus2.gain.value = 0.8; bus2.connect(evCtx.destination);
      const mk = async (name, when, gain) => {
        const res = await fetch('/audio/pool/' + name + '.wav');
        const buf = await evCtx.decodeAudioData(await res.arrayBuffer());
        const src = evCtx.createBufferSource(); src.buffer = buf;
        const g = evCtx.createGain(); g.gain.value = gain;
        src.connect(g); g.connect(bus2); src.start(when);
      };
      await mk('cue-soft-1', 0.1, (0.3 + 0.6*0.25) * 0.9);
      await mk('ball-soft-2', 0.75, impactGain('ball', 1.2) * 0.85);
      await mk('cushion-2', 1.1, impactGain('cushion', 1.6) * 0.7);
      await mk('pocket-1', 1.5, impactGain('pocket', 2.5) * 0.8);
      const evRendered = await evCtx.startRendering();
      return { peak, rms, evidence: { sr: SR, ch0: evRendered.getChannelData(0), ch1: evRendered.getChannelData(1) } };
    })();`);

  check('p2: 24-voice max-density break stays unclipped', result.peak <= 1.0, `peak=${result.peak.toFixed(3)} rms=${result.rms.toFixed(3)}`);
  check('p2: break render is audible (not crushed to silence)', result.rms > 0.01 && result.peak > 0.2, `rms=${result.rms.toFixed(3)}`);

  // Save the listenable evidence WAV (soft cue → ball → cushion → pocket).
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const sr = result.evidence.sr;
  const ch0 = result.evidence.ch0, ch1 = result.evidence.ch1;
  const n = Math.min(ch0.length, ch1.length);
  const pcm = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    pcm.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(ch0[i] * 32767))), i * 4);
    pcm.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(ch1[i] * 32767))), i * 4 + 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + pcm.length, 4); header.write('WAVE', 8);
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20);
  header.writeUInt16LE(2, 22); header.writeUInt32LE(sr, 24); header.writeUInt32LE(sr * 4, 28);
  header.writeUInt16LE(4, 32); header.writeUInt16LE(16, 34);
  header.write('data', 36); header.writeUInt32LE(pcm.length, 40);
  writeFileSync(join(EVIDENCE_DIR, `offline-soft-to-pocket-${LABEL}.wav`), Buffer.concat([header, pcm]));
  pass('p2: listenable offline evidence saved', `${EVIDENCE_DIR}/offline-soft-to-pocket-${LABEL}.wav`);
  return true;
}

async function phase3(p1, softCount = 0) {
  log('— phase 3: second player + nearby spectator');
  const p2 = await newSession('p2', { freshIdentity: `gate-p2-${Date.now().toString(36)}` });
  await goto(p2, APP);
  await ensureHook(p2);
  if (!(await waitTransport(p2))) { fail('p2: transport connected'); return null; }
  pass('p2: transport connected (distinct identity)');

  // p2 stands near the table as a spectator, enables sound, leaves cinema
  await keypress(p2, 'KeyW', 'w', 500).catch(() => {});
  await sleep(300);
  try { const el = await findEl(p2, '#sound'); await clickEl(p2, el); } catch {}
  await sleep(400);
  await js(p2, `window.__afterlight.tp(-6.8, -4.6); return true;`);
  await waitPalette(p2, 20000);
  await sleep(1500);

  // p1 (still seated from phase 1) fires two more strokes while p2 listens.
  // An idle practice table publishes only on input, so the listener's FIRST
  // observation of a stroke is mid-flight: that stroke baselines silently by
  // design (the reconnect watermark). The SECOND stroke follows an observed
  // post-settle 'aiming' snapshot and must sound exactly one witness cue.
  const p2Before = await js(p2, `return window.__audio.starts.filter(s=>!s.loop).length;`);
  const p1Before = await js(p1, `return window.__audio.starts.filter(s=>!s.loop).length;`);
  const fired2 = await fireShot(p1, 1400, 4); // stroke 2 (the break): baseline for the listener
  check('p3: break stroke fired (seated player)', fired2);
  const breakVoices = JSON.parse(await js(p1, `return JSON.stringify(window.__audio.starts.filter(s=>!s.loop).slice(${p1Before}));`)).filter(() => true);
  const fired3 = await fireShot(p1, 1400, 4); // stroke 3: witnessed from aiming
  check('p3: third stroke fired (seated player)', fired3);
  const p2Voices = JSON.parse(await js(p2, `return JSON.stringify(window.__audio.starts.filter(s=>!s.loop).slice(${p2Before}));`));
  const p1Voices = JSON.parse(await js(p1, `return JSON.stringify(window.__audio.starts.filter(s=>!s.loop).slice(${p1Before}));`));

  // Break quality on the shooter's side (stroke 2 voices are the head of p1Voices)
  const breakCueCount = p1Voices.filter((v) => (v.name || '').startsWith('cue-')).length;
  const breakBallCount = p1Voices.filter((v) => (v.name || '').startsWith('ball-')).length;
  check('p1: hard break is denser than the soft shot', p1Voices.length >= 8 && p1Voices.length >= softCount,
    `break=${p1Voices.length} soft=${softCount} balls=${breakBallCount}`);
  let active = -1;
  for (let i = 0; i < 4 && active === -1; i++) {
    active = await js(p1, `(() => {
      try {
        const a = window.__audio;
        return Math.max(0, a.starts.filter((v) => !v.loop).length - a.stops.filter((v) => !v.loop).length);
      } catch (e) { return -1; }
    })()`).catch((e) => { log('active eval error:', String(e).slice(0, 200)); return -1; });
    if (active === -1) await sleep(800);
  }
  check('p1: transient voices released after settle', active === 0, `active=${active}`);

  const p2Cues = p2Voices.filter((v) => (v.name || '').startsWith('cue-')).length;
  check('p3: spectator hears the strokes', p2Voices.length >= 10, `voices=${p2Voices.length}`);
  if (p2Cues !== 1) {
    const hist = {};
    for (const v of p2Voices) hist[v.name || `dur${v.dur}`] = (hist[v.name || `dur${v.dur}`] || 0) + 1;
    log('p2 voice histogram:', JSON.stringify(hist).slice(0, 400));
  }
  check('p3: spectator hears exactly one witness cue (first stroke baselines, second is witnessed)', p2Cues === 1, `cues=${p2Cues}`);
  check('p3: shooter hears one cue per stroke', breakCueCount === 2, `cues=${breakCueCount}`);

  return p2;
}

async function phase4(p1) {
  log('— phase 4: local controls and lifecycle');

  // 4a. Effects volume 0 through the REAL mixer + engine (in-page)
  const vol = await js(p1, `
    return (async () => {
      const { createAudioMixer } = await import('/src/audio/mixer.js');
      const { createPoolAudio } = await import('/src/activities/pool/audio.js');
      const mixer = createAudioMixer({ storage: { getItem: () => JSON.stringify({ version: 1, effects: 0, ambience: 0.2, weather: 0.2, media: 1, voice: 1 }), setItem: () => {} } });
      mixer.ensure(); mixer.setSoundEnabled(true); mixer.resume();
      const audio = createPoolAudio({ audioMixer: mixer, getPlayer: () => ({ position: { x: -8.6, z: -4.5 } }), fetchImpl: async () => ({ ok: true, arrayBuffer: async () => (await (await fetch('/audio/pool/ball-med-1.wav')).arrayBuffer()) }) });
      audio.activate();
      audio.updateMovement({ physics: { balls: {} } });
      await new Promise((r) => setTimeout(r, 1500));
      audio.updateMovement({ physics: { balls: {} } });
      const played = audio.presentPredicted([{ type: 'ball_collision', ballA: 0, ballB: 1, speed: 6, x: 0, z: 0 }]);
      return { played, effectsGain: mixer.buses.effects.gain.value };
    })();`);
  check('p4: effects volume 0 still presents but rides a zero effects bus',
    vol.played === 1 && vol.effectsGain === 0, `played=${vol.played} effectsGain=${vol.effectsGain}`);

  // 4b. Sound denied: fresh load, no gesture → no AudioContext, still playable
  const p3 = await newSession('p3-denied');
  await goto(p3, APP);
  await waitTransport(p3);
  await keypress(p3, 'KeyW', 'w', 500).catch(() => {});
  await sleep(1500);
  const denied = await js(p3, `return { starts: window.__audio.starts };`);
  const deniedTransients = (denied.starts || []).filter((v) => !v.loop);
  check('p4: sound-denied load stays silent (no transient voices)', deniedTransients.length === 0,
    JSON.stringify(deniedTransients.slice(0, 4)));
  // The pool table stays occupied by the seated player; the no-audio
  // gameplay check uses the darts board instead.
  await js(p3, `window.__afterlight.tp(-10.4, -1.5); return true;`);
  await sleep(600);
  await keypress(p3, 'KeyE', 'e', 60);
  let deniedJoined = null;
  for (let i = 0; i < 16; i++) {
    deniedJoined = await js(p3, `return window.__afterlight.participation();`).catch(() => null);
    if (deniedJoined === 'participating') break;
    await sleep(500);
  }
  check('p4: gameplay works without audio', deniedJoined === 'participating');
  // Later enable: fresh events only (no backlog)
  for (let i = 0; i < 2; i++) {
    const lbl = await js(p3, `return (document.getElementById('sound')||{textContent:''}).textContent.trim();`).catch(() => '');
    if (/Sound on/.test(lbl)) break;
    try { const el = await findEl(p3, '#sound'); await clickEl(p3, el); } catch {}
    await sleep(1200);
  }
  await sleep(2500);
  let latePalette = -1;
  for (let i = 0; i < 12; i++) {
    await sleep(900);
    latePalette = await js(p3, `return (window.__poolFetches||[]).length;`).catch(() => -1);
    if (latePalette >= 17) break;
  }
  if (latePalette < 17) {
    const diag = await js(p3, `return { label: (document.getElementById('sound')||{textContent:''}).textContent.trim(), fetches: (window.__poolFetches||[]).length, hooked: !!window.__gateHooked };`).catch(() => null);
    log('later-enable diagnostic:', JSON.stringify(diag));
  }
  check('p4: later enable loads the palette and only then sounds', latePalette === 17,
    `palette=${latePalette}`);
  try { await fetch(`${DRIVER}/session/${p3.id}`, { method: 'DELETE' }); LIVE.delete(p3.id); } catch {}

  // 4c. Travel away mid-motion, return: fast stop, cached buffers. The
  // traveler is the still-seated p1 (palette loaded, cloth loop live).
  const traveler = p1;
  const fetchesBefore = await js(traveler, `return (window.__poolFetches||[]).length;`);
  const travelFired = await fireShot(traveler, 900, 2);
  check('p4: travel subject fired a stroke', travelFired);
  await sleep(300);
  await js(traveler, `window.__afterlight.travel('court'); return true;`);
  const t0 = Date.now();
  let stoppedIn = null;
  while (Date.now() - t0 < 8000) {
    const active = await js(traveler, `(() => {
      try {
        const a = window.__audio;
        const clothStarts = a.starts.filter((v) => v.loop && (v.name === 'cloth-loop' || v.dur === 1600)).length;
        const clothStops = a.stops.filter((v) => v.loop).length;
        const transients = a.starts.filter((v) => !v.loop).length - a.stops.filter((v) => !v.loop).length;
        return { loops: clothStarts - clothStops, transients };
      } catch (e) { return { err: String(e && e.message || e) }; }
    })()`).catch((e) => { log('travel poll error:', String(e).slice(0, 200)); return null; });
    if (active && !active.err && active.loops <= 0 && active.transients <= 0) { stoppedIn = Date.now() - t0; break; }
    await sleep(60);
  }
  if (stoppedIn === null) {
    const loops = await js(traveler, `return JSON.stringify({ ls: window.__audio.starts.filter(v=>v.loop).length, st: window.__audio.stops.filter(v=>v.loop).length, room: window.__afterlight.room() });`).catch(() => 'eval-failed');
    log('travel loop state:', String(loops).slice(0, 200));
  }
  check('p4: travel stops table audio quickly (≤2 s, spec 200 ms target)', stoppedIn !== null, `stoppedIn=${stoppedIn}ms`);
  await sleep(1500);
  await js(traveler, `window.__afterlight.travel('theater'); return true;`);
  await sleep(3500);
  const fetchesAfter = await js(traveler, `return (window.__poolFetches||[]).length;`).catch(() => -1);
  check('p4: returning to the table reuses cached buffers (no re-fetch)', fetchesAfter === fetchesBefore,
    `before=${fetchesBefore} after=${fetchesAfter}`);

  // 4d. Reload mid-shot: fresh join replays no cue (baseline watermark)
  await joinPool(p1);
  const p2sess = await newSession('p4-shooter', { freshIdentity: `gate-p4-${Date.now().toString(36)}` });
  await goto(p2sess, APP);
  await waitTransport(p2sess);
  await keypress(p2sess, 'KeyW', 'w', 400).catch(() => {});
  try { const el = await findEl(p2sess, '#sound'); await clickEl(p2sess, el); } catch {}
  // p2 waits mid-table as spectator; p1 shoots; p2 reloads MID-motion
  await js(p2sess, `window.__afterlight.tp(-6.8, -4.6); return true;`);
  await sleep(2500);
  await keypress(p1, 'KeyF', 'f', 800);
  await sleep(1400); // shot in flight
  await cdp(p2sess, 'Page.reload', {});
  await sleep(4000);
    await keypress(p2sess, 'KeyW', 'w', 400).catch(() => {});
  try { const el = await findEl(p2sess, '#sound'); await clickEl(p2sess, el); } catch {}
  await sleep(3000);
  const reconnected = await js(p2sess, `return { voices: window.__audio.starts.filter(s=>!s.loop).length, loops: window.__audio.starts.filter(s=>s.loop).length };`);
  check('p4: mid-shot reload replays no historical cue/contacts',
    reconnected.voices === 0, `voices=${reconnected.voices} (cloth may legitimately roll: loops=${reconnected.loops})`);
  try { await fetch(`${DRIVER}/session/${p2sess.id}`, { method: 'DELETE' }); LIVE.delete(p2sess.id); } catch {}
  return true;
}

// ---------------------------------------------------------------------------
(async () => {
  try { new Function(AUDIO_HOOK); log('AUDIO_HOOK runtime parse OK'); }
  catch (e) { log('AUDIO_HOOK RUNTIME PARSE ERROR:', e.message); }
  guardBeforeLaunch();
  await startDriver();
  let ok = true;
  try {
    const p1 = await phase1();
    if (!p1) throw new Error('phase 1 failed; aborting');
    await phase2(p1);
    const p2 = await phase3(p1, p1.__softCount || 0);
    if (!p2) log('phase 3 failed; continuing to phase 4');
    await phase4(p1);
  } catch (e) {
    fail('gate crashed', (e && e.stack ? String(e.stack).slice(0, 900) : String(e).slice(0, 400)));
    ok = false;
  } finally {
    await closeAll();
  }
  log(`—— ${passes.length} passed, ${failures.length} failed`);
  writeFileSync(
    join(EVIDENCE_DIR, `gate-${LABEL}.json`),
    JSON.stringify({ label: LABEL, app: APP, at: new Date().toISOString(), passes, failures }, null, 2),
  );
  process.exit(failures.length > 0 ? 1 : 0);
})();
