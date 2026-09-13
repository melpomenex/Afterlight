#!/usr/bin/env node
/**
 * Global World System visual capture (introduce-global-world-system 8.3).
 *
 * Captures, in a real browser on the running app:
 *   theater        all 18 theater variants at low and high environment tier
 *   first-person   each World's default variant from the first-person camera
 *   table          the lounge pool table camera under two Worlds
 *   kart           Kart Royale under all six World profiles
 *   summit         Summit Run under all six World profiles
 *   downhill       Downhill Mayhem under all six World profiles
 *   dialogs        World/Places dialogs at desktop and narrow viewports
 *
 * Screenshots land in
 *   openspec/changes/introduce-global-world-system/evidence/screenshots/
 * with a JSON manifest recording the applied selection, palette, draw counts
 * and viewport per shot. The environment tier for the theater variants comes
 * from the real `afterlight-environment-v1` preference record; hosted adapters
 * keep their native quality policy (recorded where the host exposes it).
 *
 * Usage: node scripts/capture-world-variants.mjs [sections|all]
 * Env:   GATE_APP (default http://localhost:5274/?debug=1&room=theater)
 *        CAPTURE_LABEL (default "run")
 */

import { execSync, spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

import { WORLD_IDS, getWorldDefinition } from '../shared/worldDefinitions.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EVIDENCE_DIR = join(ROOT, 'openspec/changes/introduce-global-world-system/evidence');
const SHOT_DIR = join(EVIDENCE_DIR, 'screenshots');

const APP = process.env.GATE_APP || 'http://localhost:5274/?debug=1&room=theater';
const LABEL = process.env.CAPTURE_LABEL || 'run';
const HEADED = process.env.GATE_HEADED === '1';
const CHROMEDRIVER = process.env.GATE_CHROMEDRIVER || '/usr/bin/chromedriver';
const CHROMIUM = process.env.GATE_CHROMIUM || '/usr/bin/chromium';
const DRIVER_PORT = 9750 + Math.floor(Math.random() * 200);
const DRIVER = `http://127.0.0.1:${DRIVER_PORT}`;
const log = (...a) => console.log('[world-capture]', ...a);

let driverProc = null;
const LIVE = new Set();
const manifest = [];

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
  if (n > 30) throw new Error(`SAFETY GUARD: ${n} chrome/chromedriver processes exist — clean up strays first.`);
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

async function startDriver() {
  driverProc = spawn(CHROMEDRIVER, [`--port=${DRIVER_PORT}`, '--whitelisted-ips=127.0.0.1'], { stdio: 'ignore' });
  const t0 = Date.now();
  while (Date.now() - t0 < 12000) {
    try {
      const res = await fetch(`${DRIVER}/status`);
      if (res.ok) return;
    } catch {}
    await sleep(300);
  }
  throw new Error('chromedriver did not start');
}

async function closeSessions() {
  for (const id of [...LIVE]) {
    LIVE.delete(id);
    try { await fetch(`${DRIVER}/session/${id}`, { method: 'DELETE' }); } catch {}
  }
}

async function shutdown() {
  await closeSessions();
  if (driverProc) {
    try { driverProc.kill('SIGKILL'); } catch {}
    driverProc = null;
  }
}

async function newSession(name, { width = 1920, height = 1080 } = {}) {
  guardBeforeLaunch();
  const args = [
    '--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader',
    `--window-size=${width},${height}`, '--mute-audio', '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding', '--disable-hang-monitor',
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
const go = (s, url = APP) => req('POST', `/session/${s.id}/url`, { url });
const cdp = (s, cmd, params = {}) => req('POST', `/session/${s.id}/chromium/send_command`, { cmd, params });
const KEY = (type, code) => `document.body.dispatchEvent(new KeyboardEvent('${type}', { code: '${code}', key: '${code.slice(3).toLowerCase()}', bubbles: true, cancelable: true })); return true;`;
async function tap(s, code, holdMs = 70) {
  await js(s, KEY('keydown', code));
  await sleep(holdMs);
  await js(s, KEY('keyup', code));
}

async function waitFor(s, script, timeoutMs = 90000, label = 'condition') {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const v = await js(s, script);
      if (v) return v;
    } catch {}
    await sleep(400);
  }
  throw new Error(`timeout waiting for ${label}`);
}

const APP_READY = `return !!(window.__afterlight && document.querySelector('canvas') && window.__afterlight.world);`;

async function setViewport(s, width, height) {
  await cdp(s, 'Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
}

/** Seed the preference record before the app boots (quality + World). */
async function seedPreferences(s, record) {
  if (s.seedIdentifier) {
    await cdp(s, 'Page.removeScriptToEvaluateOnNewDocument', { identifier: s.seedIdentifier }).catch(() => {});
    s.seedIdentifier = null;
  }
  const source = `try { localStorage.setItem('afterlight-environment-v1', ${JSON.stringify(JSON.stringify(record))}); } catch {}`;
  const result = await cdp(s, 'Page.addScriptToEvaluateOnNewDocument', { source });
  s.seedIdentifier = result?.identifier ?? null;
}

async function shot(s, name, meta = {}) {
  mkdirSync(SHOT_DIR, { recursive: true });
  const b64 = await req('GET', `/session/${s.id}/screenshot`);
  const file = join(SHOT_DIR, `${LABEL}-${name}.png`);
  writeFileSync(file, Buffer.from(b64, 'base64'));
  const stats = await js(s, `return window.__afterlight ? { scene: window.__afterlight.sceneInfo(), stats: window.__afterlight.renderStats(), env: window.__afterlight.environment(), world: window.__afterlight.world() } : null;`).catch(() => null);
  manifest.push({
    file: file.replace(`${ROOT}/`, ''),
    name,
    ...meta,
    viewport: await js(s, `return { w: innerWidth, h: innerHeight, dpr: devicePixelRatio };`).catch(() => null),
    scene: stats?.scene ?? null,
    stats: stats?.stats ?? null,
    selection: stats?.env?.selection ?? stats?.world ?? null,
  });
  log(`shot ${name}`);
  return file;
}

async function loadTheater(s, { quality, worldId, variantId }) {
  await seedPreferences(s, { version: 2, quality, worldId, variantId });
  await go(s, APP);
  await waitFor(s, APP_READY, 90000, 'app ready');
  await waitFor(s, `
    const env = window.__afterlight.environment();
    return env && env.selection && env.selection.worldId === ${JSON.stringify(worldId)} && env.selection.variantId === ${JSON.stringify(variantId)} ? env : null;
  `, 60000, `${worldId}/${variantId}`);
  await leaveCinema(s);
  await sleep(1000);
  // Remove transient toasts so they do not cover the composition.
  await js(s, `document.querySelectorAll('.toast').forEach((t) => t.remove()); return true;`).catch(() => {});
  await sleep(400);
}

async function sectionTheater() {
  const s = await newSession('theater-variants');
  try {
    for (const tier of ['low', 'high']) {
      for (const worldId of WORLD_IDS) {
        const def = getWorldDefinition(worldId);
        for (const variantId of Object.keys(def.variants)) {
          await loadTheater(s, { quality: tier, worldId, variantId });
          const key = `${worldId}-${variantId}-${tier}`;
          await shot(s, `theater-${key}`, { section: 'theater', worldId, variantId, tier, camera: 'isometric' });
        }
      }
    }
  } finally {
    await closeSessions();
  }
}

async function sectionFirstPerson() {
  const s = await newSession('first-person');
  try {
    for (const worldId of WORLD_IDS) {
      const def = getWorldDefinition(worldId);
      await loadTheater(s, { quality: 'high', worldId, variantId: def.defaultVariant });
      // Cycle the four camera modes to first person (3 iso -> FP).
      for (let i = 0; i < 3; i++) {
        await tap(s, 'KeyC', 60);
        await sleep(350);
      }
      const mode = await js(s, `return window.__afterlight.cameraMode();`);
      if (mode !== 3) throw new Error(`expected first person for ${worldId}, got mode ${mode}`);
      await sleep(700);
      await shot(s, `first-person-${worldId}`, { section: 'first-person', worldId, variantId: def.defaultVariant, camera: 'first-person' });
      for (let i = 0; i < 3; i++) {
        await tap(s, 'KeyC', 60);
        await sleep(300);
      }
    }
  } finally {
    await closeSessions();
  }
}

/** Leave the theater cinema view if (and only if) it is engaged. */
async function leaveCinema(s) {
  try {
    await waitFor(s, `return document.body.classList.contains('theater-watching') ? true : null;`, 12000, 'cinema view');
  } catch {}
  await js(s, `document.querySelectorAll('dialog[open]').forEach((d) => d.close()); return true;`).catch(() => {});
  const watching = await js(s, `return document.body.classList.contains('theater-watching');`);
  if (watching) {
    await tap(s, 'Escape', 80);
    await sleep(900);
  }
  await js(s, `const d = document.getElementById('settings-dialog'); if (d?.open) d.close(); return true;`).catch(() => {});
}

async function enterActivity(s, { x, z, liveScript, tries = 8 }) {
  await js(s, `
    window.__gateLogs = window.__gateLogs || [];
    if (!window.__gateHooked) {
      window.__gateHooked = true;
      for (const k of ['warn', 'error']) {
        const orig = console[k].bind(console);
        console[k] = (...a) => { try { window.__gateLogs.push(k + ': ' + a.map((x) => (x && x.message) || String(x)).join(' ').slice(0, 200)); } catch {} orig(...a); };
      }
      window.addEventListener('error', (e) => { try { window.__gateLogs.push('error: ' + String(e.message).slice(0, 200)); } catch {} });
      window.addEventListener('unhandledrejection', (e) => { try { window.__gateLogs.push('unhandled: ' + (e.reason?.message || e.reason)); } catch {} });
    }
    return true;
  `).catch(() => {});
  await leaveCinema(s);
  await tap(s, 'KeyC', 60); // camera mode 1: pure axes
  await sleep(400);
  await js(s, `return window.__afterlight.tp(${x}, ${z});`);
  await sleep(700);
  let state = 'idle';
  for (let attempt = 1; attempt <= tries && state === 'idle'; attempt++) {
    await tap(s, 'KeyE', 90);
    for (let i = 0; i < 10; i++) {
      state = await js(s, `return window.__afterlight.participation();`);
      if (state !== 'idle') break;
      const toast = await js(s, `return (document.getElementById('toast-body')?.textContent || '');`).catch(() => '');
      if (/full/i.test(toast)) {
        await sleep(9000);
        break;
      }
      await sleep(1800);
    }
  }
  if (state === 'idle') {
    const diag = await js(s, `return {
      prompt: (document.getElementById('action-title')?.textContent || '') + ' || ' + (document.getElementById('action-sub')?.textContent || ''),
      toast: (document.getElementById('toast-body')?.textContent || ''),
      pos: window.__afterlight.player(),
      camera: window.__afterlight.cameraMode(),
      watching: document.body.classList.contains('theater-watching'),
      participation: window.__afterlight.participation(),
    };`).catch(() => null);
    throw new Error(`E at the cabinet did not start participation: ${JSON.stringify(diag)}`);
  }
  try {
    await waitFor(s, liveScript, 300000, 'activity live');
  } catch (err) {
    const diag = await js(s, `return {
      toast: (document.getElementById('toast-body')?.textContent || ''),
      participation: window.__afterlight.participation(),
      racing: document.body.classList.contains('kr-racing'),
      errors: (window.__gateLogs || []).slice(-5).join(' || '),
    };`).catch(() => null);
    throw new Error(`${err.message}; diag=${JSON.stringify(diag)}`);
  }
  await sleep(1500);
  return state;
}

async function captureAdapterWorlds(s, { game, selectionScript }) {
  for (const worldId of WORLD_IDS) {
    const def = getWorldDefinition(worldId);
    await js(s, `return window.__afterlight.setWorld({ worldId: ${JSON.stringify(worldId)}, variantId: ${JSON.stringify(def.defaultVariant)}, persist: false });`);
    await sleep(1800);
    const env = await js(s, `return window.__afterlight.environment();`);
    const facts = selectionScript ? await js(s, selectionScript).catch(() => null) : null;
    await shot(s, `${game}-${worldId}`, {
      section: game,
      worldId,
      variantId: def.defaultVariant,
      camera: 'game-native',
      appliedWorld: env?.selection?.worldId ?? null,
      adapterFacts: facts,
    });
  }
}

async function sectionKart() {
  const s = await newSession('kart', { width: 1280, height: 720 });
  try {
    await go(s, APP);
    await waitFor(s, APP_READY, 90000, 'app ready');
    await enterActivity(s, {
      x: 9.3, z: -1.8,
      liveScript: `return document.body.classList.contains('kr-racing') && !!document.querySelector('.kr-activity .kr');`,
    });
    await captureAdapterWorlds(s, {
      game: 'kart',
      selectionScript: `const d = window.__kartDebug; return d ? { quality: d.getQualityName?.() ?? null, camera: d.getCamera?.() ?? null } : null;`,
    });
  } finally {
    await closeSessions();
  }
}

async function sectionSummit() {
  const s = await newSession('summit', { width: 1280, height: 720 });
  try {
    await go(s, APP);
    await waitFor(s, APP_READY, 90000, 'app ready');
    await enterActivity(s, {
      x: 9.3, z: 2.6,
      liveScript: `return window.__afterlight.participation() === 'participating';`,
    });
    await captureAdapterWorlds(s, { game: 'summit' });
  } finally {
    await closeSessions();
  }
}

async function sectionDownhill() {
  const s = await newSession('downhill', { width: 1280, height: 720 });
  try {
    await go(s, APP);
    await waitFor(s, APP_READY, 90000, 'app ready');
    await enterActivity(s, {
      x: 8.45, z: -3.8,
      liveScript: `const d = window.__afterlight.downhill?.(); return d ? true : (window.__afterlight.participation() === 'participating');`,
    });
    await captureAdapterWorlds(s, { game: 'downhill' });
  } finally {
    await closeSessions();
  }
}

async function sectionTable() {
  for (const worldId of ['coastal', 'alpine']) {
    const s = await newSession(`table-${worldId}`);
    try {
      const def = getWorldDefinition(worldId);
      await seedPreferences(s, { version: 2, quality: 'high', worldId, variantId: def.defaultVariant });
      await go(s, APP);
      await waitFor(s, APP_READY, 90000, 'app ready');
      await sleep(1500);
      await enterActivity(s, {
        x: -8.6, z: -6.1,
        liveScript: `return window.__afterlight.participation() === 'participating';`,
      });
      await sleep(2500);
      await shot(s, `table-pool-${worldId}`, { section: 'table', worldId, camera: 'table' });
    } finally {
      await closeSessions();
    }
  }
}

async function sectionDialogs() {
  const s = await newSession('dialogs');
  try {
    await go(s, APP);
    await waitFor(s, APP_READY, 90000, 'app ready');
    await tap(s, 'Escape', 80);
    await sleep(500);

    await setViewport(s, 1440, 900);
    await js(s, `document.getElementById('btn-world').click(); return true;`);
    await sleep(800);
    const wide = await js(s, `
      const d = document.getElementById('world-dialog');
      return { open: d.open, clientH: d.clientHeight, scrollH: d.scrollHeight, scrollW: d.scrollWidth, clientW: d.clientWidth, status: document.getElementById('world-status')?.textContent ?? null };
    `);
    await shot(s, 'dialog-world-desktop', { section: 'dialogs', dialog: 'world', viewportLabel: 'desktop', metrics: wide });
    await js(s, `document.getElementById('close-world').click(); return true;`);
    await sleep(500);

    await setViewport(s, 560, 720);
    await sleep(500);
    await js(s, `document.getElementById('btn-world').click(); return true;`);
    await sleep(800);
    const narrow = await js(s, `
      const d = document.getElementById('world-dialog');
      return { open: d.open, clientH: d.clientHeight, scrollH: d.scrollHeight, scrollW: d.scrollWidth, clientW: d.clientWidth };
    `);
    await shot(s, 'dialog-world-narrow', { section: 'dialogs', dialog: 'world', viewportLabel: 'narrow', metrics: narrow });
    // The modal must scroll rather than overflow the viewport.
    const fitsNarrow = narrow.open && narrow.scrollH >= narrow.clientH && narrow.clientW <= 560;
    if (!narrow.open) throw new Error('world dialog did not open at narrow width');
    manifest.push({ name: 'dialog-world-narrow-fit', fitsNarrow, ...narrow });
    await js(s, `document.getElementById('close-world').click(); return true;`);
    await sleep(500);

    await setViewport(s, 560, 720);
    await js(s, `document.getElementById('btn-travel').click(); return true;`);
    await sleep(900);
    const places = await js(s, `
      const d = document.getElementById('district-dialog');
      return { open: d.open, clientH: d.clientHeight, scrollH: d.scrollHeight, scrollW: d.scrollWidth, clientW: d.clientWidth };
    `);
    await shot(s, 'dialog-places-narrow', { section: 'dialogs', dialog: 'places', viewportLabel: 'narrow', metrics: places });
    if (!places.open) throw new Error('places dialog did not open at narrow width');
    await js(s, `document.getElementById('close-districts').click(); return true;`);
  } finally {
    await closeSessions();
  }
}

const SECTIONS = {
  theater: sectionTheater,
  'first-person': sectionFirstPerson,
  table: sectionTable,
  kart: sectionKart,
  summit: sectionSummit,
  downhill: sectionDownhill,
  dialogs: sectionDialogs,
};

const requested = process.argv.slice(2);
const names = requested.length && requested[0] !== 'all' ? requested : Object.keys(SECTIONS);

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    await shutdown();
    process.exit(1);
  });
}

try {
  await startDriver();
  for (const name of names) {
    const fn = SECTIONS[name];
    if (!fn) {
      console.error(`unknown section ${name}; known: ${Object.keys(SECTIONS).join(', ')}, all`);
      process.exit(1);
    }
    let ok = false;
    for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
      try {
        log(`--- section ${name} attempt ${attempt} ---`);
        await fn();
        ok = true;
      } catch (e) {
        log(`section ${name} attempt ${attempt} FAILED: ${e.message}`);
        await closeSessions().catch(() => {});
        if (attempt === 2) throw e;
        await sleep(2000);
      }
    }
  }
} finally {
  await shutdown().catch(() => {});
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const out = join(EVIDENCE_DIR, `world-capture-${LABEL}.json`);
  let previous = [];
  try {
    previous = JSON.parse(readFileSync(out, 'utf8')).shots ?? [];
  } catch {}
  const byName = new Map(previous.map((s) => [s.name, s]));
  for (const s of manifest) byName.set(s.name, s);
  const shots = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
  writeFileSync(out, JSON.stringify({ label: LABEL, app: APP, generatedAt: new Date().toISOString(), shots }, null, 2));
  log(`manifest written: ${out} (${shots.length} shots)`);
}

log('capture complete');
