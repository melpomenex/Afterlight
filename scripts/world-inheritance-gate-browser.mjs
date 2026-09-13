#!/usr/bin/env node
/**
 * Global World System inheritance gate (introduce-global-world-system 8.2).
 *
 * One self-contained chromedriver + chromium harness drives the real app
 * through the design verification matrix for personal World presentation:
 *
 *   contract      debug data contract + forced World/View resolution over
 *                 the six Worlds with no identity tokens in any payload.
 *   hot-switch    live World/variant switching in the theater: selection,
 *                 scene palette, asset plan, revision, one WebGL canvas,
 *                 first-person camera view, no rebuilt theater.
 *   travel        place navigation (theater -> court -> canal -> theater)
 *                 keeps the World selection and activates the ambient host.
 *   two-client    two isolated sessions with different Worlds share the same
 *                 room, see each other and keep their own presentation.
 *   storage       denied browser storage keeps the selection for the visit
 *                 (both at startup and at selection time) and says so.
 *   offline       selecting a World works with the network emulated offline.
 *   assets        blocked optional GLB/HDR requests do not gate the world or
 *                 gameplay: the theater World still renders.
 *   context-loss  a lost/restored WebGL context does not reroll the World,
 *                 restart membership or break the frame loop.
 *   rapid         rapid A->B->C->D World choices apply the latest selection
 *                 only, with no leaked hosts or canvases.
 *
 * Phases: contract | hot-switch | travel | two-client | storage | offline |
 *         assets | context-loss | rapid | all (default)
 *
 * Env:
 *   GATE_APP          app URL (default http://localhost:5173/?debug=1&room=theater)
 *   GATE_CHROMEDRIVER chromedriver binary (default /usr/bin/chromedriver)
 *   GATE_CHROMIUM     chromium binary (default /usr/bin/chromium)
 *   GATE_LABEL        evidence label (default "run")
 *   GATE_HEADED=1     run headed (for a real display)
 *
 * Dev-only tool: never imported by the app or the test suites. Writes
 * evidence under openspec/changes/introduce-global-world-system/evidence/.
 */

import { execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

import { WORLD_IDS, getWorldDefinition } from '../shared/worldDefinitions.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EVIDENCE_DIR = join(ROOT, 'openspec/changes/introduce-global-world-system/evidence');
const SHOT_DIR = join(EVIDENCE_DIR, 'gate-shots');

const APP = process.env.GATE_APP || 'http://localhost:5173/?debug=1&room=theater';
const LABEL = process.env.GATE_LABEL || 'run';
const HEADED = process.env.GATE_HEADED === '1';
const CHROMEDRIVER = process.env.GATE_CHROMEDRIVER || '/usr/bin/chromedriver';
const CHROMIUM = process.env.GATE_CHROMIUM || '/usr/bin/chromium';
const DRIVER_PORT = 9300 + Math.floor(Math.random() * 400);
const DRIVER = `http://127.0.0.1:${DRIVER_PORT}`;
const log = (...a) => console.log('[world-gate]', ...a);

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
        'Clean up strays first or set GATE_ALLOW_STRAYS=1.',
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

async function closeSessions() {
  for (const id of [...LIVE]) {
    LIVE.delete(id);
    try {
      await fetch(`${DRIVER}/session/${id}`, { method: 'DELETE' });
    } catch {}
  }
}

async function shutdown() {
  await closeSessions();
  stopDriver();
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
    if (window.__gateHooked) return true;
    window.__gateHooked = true;
    for (const k of ['warn', 'error']) {
      const orig = console[k].bind(console);
      console[k] = (...a) => {
        try { window.__gateLogs.push(k + ': ' + a.map((x) => (x && x.message) || String(x)).join(' ').slice(0, 300)); } catch {}
        orig(...a);
      };
    }
    window.addEventListener('error', (e) => {
      try { window.__gateLogs.push('error: ' + String(e.message).slice(0, 300)); } catch {}
    });
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
const go = (s, url = APP) => req('POST', `/session/${s.id}/url`, { url });
const cdp = (s, cmd, params = {}) => req('POST', `/session/${s.id}/chromium/send_command`, { cmd, params });
const KEY = (type, code) => `document.body.dispatchEvent(new KeyboardEvent('${type}', { code: '${code}', key: '${code.slice(3).toLowerCase()}', bubbles: true, cancelable: true })); return true;`;
async function tap(s, code, holdMs = 70) {
  await js(s, KEY('keydown', code));
  await sleep(holdMs);
  await js(s, KEY('keyup', code));
}

async function waitFor(s, script, timeoutMs = 60000, label = 'condition') {
  const t0 = Date.now();
  let last = null;
  while (Date.now() - t0 < timeoutMs) {
    try {
      last = await js(s, script);
      if (last) return last;
    } catch {}
    await sleep(400);
  }
  return null;
}

const WORLD_READY = `return !!(window.__afterlight && document.querySelector('canvas') && window.__afterlight.world);`;

async function loadApp(s, url = APP) {
  await go(s, url);
  await js(s, PAGE_HOOK).catch(() => {});
  const ready = await waitFor(s, WORLD_READY, 90000, 'app ready');
  if (!ready) throw new Error('app did not become ready');
  // Leave cinema view first (theater spawn) so movement/camera are interactive.
  await tap(s, 'Escape', 80);
  await sleep(700);
  return true;
}

async function screenshot(s, name) {
  try {
    mkdirSync(SHOT_DIR, { recursive: true });
    const b64 = await req('GET', `/session/${s.id}/screenshot`);
    const file = join(SHOT_DIR, `${LABEL}-${name}.png`);
    writeFileSync(file, Buffer.from(b64, 'base64'));
    return file;
  } catch {
    return null;
  }
}

const webglCanvasCount = (s) => js(s, `
  return [...document.querySelectorAll('canvas')].filter((c) => {
    try { return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
  }).length;`);

const pageErrors = (s) => js(s, `return (window.__gateLogs || []).join(' || ');`).catch(() => '');

async function environmentOf(s) {
  return js(s, `return window.__afterlight ? window.__afterlight.environment() : null;`);
}
async function sceneInfoOf(s) {
  return js(s, `return window.__afterlight ? window.__afterlight.sceneInfo() : null;`);
}
async function renderStatsOf(s) {
  return js(s, `return window.__afterlight ? window.__afterlight.renderStats() : null;`);
}
async function worldSnapshot(s) {
  return js(s, `return window.__afterlight ? window.__afterlight.world() : null;`);
}

function paletteOf(env, sceneInfo) {
  return {
    worldId: env?.selection?.worldId ?? null,
    variantId: env?.selection?.variantId ?? null,
    background: sceneInfo?.background ?? null,
    fog: sceneInfo?.fog ?? null,
    hemiSky: sceneInfo?.hemiSky ?? null,
    sun: sceneInfo?.sun ?? null,
  };
}

async function setWorld(s, worldId, variantId = null, persist = false) {
  const def = getWorldDefinition(worldId);
  return js(s, `
    return window.__afterlight.setWorld({
      worldId: ${JSON.stringify(worldId)},
      variantId: ${JSON.stringify(variantId || def?.defaultVariant || null)},
      persist: ${persist ? 'true' : 'false'},
    });
  `);
}

async function waitEnvironmentWorld(s, worldId, timeoutMs = 30000) {
  return waitFor(s, `
    const env = window.__afterlight.environment();
    return env && env.selection && env.selection.worldId === ${JSON.stringify(worldId)} ? env : null;
  `, timeoutMs, `world ${worldId}`);
}

const IGNORED_ERROR_PATTERNS = [
  /favicon/i,
  /net::ERR_(BLOCKED_BY_CLIENT|INTERNET_DISCONNECTED|NAME_NOT_RESOLVED)/i,
  /Failed to load resource/i,
  /WebGL.*context lost/i,
  /THREE\.WebGLRenderer: Context Lost/i,
  /SwiftShader/i,
  // Transport failure against the local sidecar is an environment condition
  // (the World system is browser-local) and must not mask app errors.
  /NetworkClient transport error/i,
  /Failed to fetch/i,
];

function relevantErrors(raw) {
  if (!raw) return '';
  return raw
    .split(' || ')
    .filter((line) => line && !IGNORED_ERROR_PATTERNS.some((re) => re.test(line)))
    .join(' || ');
}

// ---------------------------------------------------------------------------
// Phases
// ---------------------------------------------------------------------------

const MATRIX_VIEWS = [
  'place:theater',
  'place:court',
  'place:market',
  'place:canal',
  'activity:pong',
  'activity:pool',
  'activity:kart-royale',
  'activity:snowboard-race',
  'activity:downhill-mayhem',
  'place:does-not-exist',
];

async function phaseContract() {
  const s = await newSession('contract');
  try {
    await loadApp(s);

    const env = await environmentOf(s);
    check('contract: environment() exposes selection/host/revision/fallback/assets/bytes', !!(
      env
      && typeof env.selection === 'object'
      && typeof env.actualHost === 'string'
      && typeof env.appliedRevision === 'number'
      && typeof env.fallback === 'boolean'
      && Array.isArray(env.assets)
      && env.byteEstimate
      && env.byteEstimate.total === env.byteEstimate.cpu + env.byteEstimate.gpu
    ), JSON.stringify({ selection: env?.selection, host: env?.actualHost, revision: env?.appliedRevision, fallback: env?.fallback, assets: env?.assets }));

    check('contract: theater resolves a full plan with kit assets', env.actualHost === 'self' && env.fallback === false && env.assets.length > 0,
      `host=${env.actualHost} fallback=${env.fallback} assets=${JSON.stringify(env.assets)}`);

    let matrixOks = 0;
    let matrixFails = [];
    for (const worldId of WORLD_IDS) {
      for (const viewId of MATRIX_VIEWS) {
        const plan = await js(s, `
          return window.__afterlight.resolveWorldView(${JSON.stringify(worldId)}, ${JSON.stringify(viewId)});
        `);
        const ok = plan
          && plan.selection?.worldId === worldId
          && typeof plan.mode === 'string'
          && typeof plan.actualHost === 'string'
          && typeof plan.fallback === 'boolean'
          && Array.isArray(plan.assets)
          && plan.byteEstimate?.total === plan.byteEstimate?.cpu + plan.byteEstimate?.gpu;
        if (ok) matrixOks += 1;
        else matrixFails.push(`${worldId}/${viewId}=${JSON.stringify(plan)}`);
      }
    }
    check(`contract: forced matrix ${WORLD_IDS.length}x${MATRIX_VIEWS.length} resolves with labeled estimates`, matrixFails.length === 0,
      `${matrixOks}/${WORLD_IDS.length * MATRIX_VIEWS.length}${matrixFails.length ? `; first: ${matrixFails[0]}` : ''}`);

    const plans = [];
    for (const worldId of WORLD_IDS) {
      plans.push(await js(s, `return window.__afterlight.resolveWorldView(${JSON.stringify(worldId)}, 'place:theater');`));
    }
    const serialized = JSON.stringify({ env, plans });
    const tokenLike = /(?:bearer\s+[A-Za-z0-9-_.]+)|(?:eyJ[A-Za-z0-9_-]{10,})|(?:token["']?\s*[:=]\s*["'][A-Za-z0-9-_.]{16,})/i;
    check('contract: debug payloads contain no identity tokens', !tokenLike.test(serialized));

    const errs = relevantErrors(await pageErrors(s));
    check('contract: zero page errors', !errs, errs.slice(0, 200));
  } finally {
    await closeSessions();
  }
}

async function phaseHotSwitch() {
  const s = await newSession('hot-switch');
  try {
    await loadApp(s);
    const seen = new Map();
    const revisionStart = (await worldSnapshot(s))?.revision ?? 0;
    const initialWorld = (await worldSnapshot(s))?.worldId ?? null;
    let revisionAfter = revisionStart;
    let prevBackground = (await sceneInfoOf(s))?.background ?? null;

    for (const worldId of WORLD_IDS) {
      const def = getWorldDefinition(worldId);
      const variantId = def.defaultVariant;
      await setWorld(s, worldId, variantId, false);
      const env = await waitEnvironmentWorld(s, worldId);
      if (!env) throw new Error(`world ${worldId} never became active`);
      if (worldId !== initialWorld) {
        // The frame loop samples and applies the new palette after the
        // selection commits; wait for the rendered background to change.
        await waitFor(s, `
          const info = window.__afterlight.sceneInfo();
          return info.background !== ${JSON.stringify(prevBackground)} ? info : null;
        `, 20000, `palette ${worldId}`);
        await sleep(250);
      }
      const info = await sceneInfoOf(s);
      const stats = await renderStatsOf(s);
      seen.set(worldId, paletteOf(env, info));
      revisionAfter = (await worldSnapshot(s))?.revision ?? revisionAfter;
      prevBackground = info.background;
      check(`hot-switch: ${worldId}/${variantId} active with assets`, env.selection.worldId === worldId && env.selection.variantId === variantId && env.assets.length > 0,
        `bg=${info.background} fog=${info.fog} assets=${env.assets.length}`);
      check(`hot-switch: ${worldId} renders (draws > 0)`, (stats?.calls ?? 0) > 0, `calls=${stats?.calls}`);
      await screenshot(s, `theater-${worldId}-${variantId}`);
    }

    check('hot-switch: all six World palettes are distinct', new Set([...seen.values()].map((p) => p.background)).size === WORLD_IDS.length,
      [...seen.values()].map((p) => `${p.worldId}:${p.background}`).join(' '));

    check('hot-switch: revision advanced across explicit selections', revisionAfter > revisionStart, `${revisionStart} -> ${revisionAfter}`);

    // Variant-only change within the same World keeps the built environment.
    await setWorld(s, 'cloud', 'storm', false);
    await waitEnvironmentWorld(s, 'cloud');
    const stormEnv = await environmentOf(s);
    check('hot-switch: variant switch within a World applies', stormEnv.selection.worldId === 'cloud' && stormEnv.selection.variantId === 'storm',
      JSON.stringify(stormEnv.selection));

    const canvases = await webglCanvasCount(s);
    check('hot-switch: exactly one WebGL canvas after five switches', canvases === 1, `canvases=${canvases}`);

    // First-person view keeps the World and renders.
    const modeBefore = await js(s, `return window.__afterlight.cameraMode();`);
    await tap(s, 'KeyC', 70);
    await tap(s, 'KeyC', 70);
    await tap(s, 'KeyC', 70);
    await sleep(900);
    const modeAfter = await js(s, `return window.__afterlight.cameraMode();`);
    const fpStats = await renderStatsOf(s);
    check('hot-switch: first-person camera mode renders the same World', modeAfter !== modeBefore && (fpStats?.calls ?? 0) > 0,
      `mode ${modeBefore} -> ${modeAfter}, calls=${fpStats?.calls}`);
    await screenshot(s, 'theater-cloud-storm-first-person');
    const errs = relevantErrors(await pageErrors(s));
    check('hot-switch: zero page errors', !errs, errs.slice(0, 200));
  } finally {
    await closeSessions();
  }
}

async function phaseTravel() {
  const s = await newSession('travel');
  try {
    await loadApp(s);
    await setWorld(s, 'coastal', 'sunset', false);
    await waitEnvironmentWorld(s, 'coastal');

    const rooms = [];
    for (const roomId of ['court', 'canal', 'market', 'theater']) {
      await js(s, `return window.__afterlight.travel(${JSON.stringify(roomId)});`);
      const room = await waitFor(s, `
        const r = window.__afterlight.room();
        return r === ${JSON.stringify(roomId)} ? r : null;
      `, 30000, `room ${roomId}`);
      if (!room) throw new Error(`travel to ${roomId} did not settle`);
      await sleep(600);
      const snap = await worldSnapshot(s);
      const env = await environmentOf(s);
      rooms.push({ roomId, world: snap.worldId, variant: snap.variantId });
      check(`travel: ${roomId} keeps coastal/sunset selection`, snap.worldId === 'coastal' && snap.variantId === 'sunset',
        `now ${snap.worldId}/${snap.variantId}`);
      if (roomId !== 'theater') {
        const ambient = await js(s, `return window.__afterlight.ambientPlace();`);
        check(`travel: ${roomId} ambient host active`, ambient.active === true && ambient.roomId === roomId,
          JSON.stringify(ambient));
      } else {
        const info = await sceneInfoOf(s);
        check('travel: return to theater restores the coastal environment', info.background === seenPalette.coastal.background,
          `bg=${info.background}`);
      }
      await screenshot(s, `travel-${roomId}`);
    }
    const errs = relevantErrors(await pageErrors(s));
    check('travel: zero page errors', !errs, errs.slice(0, 200));
  } finally {
    await closeSessions();
  }
}

async function phaseTwoClient() {
  const a = await newSession('world-a');
  const b = await newSession('world-b');
  try {
    await loadApp(a);
    await setWorld(a, 'coastal', 'sunset', false);
    await waitEnvironmentWorld(a, 'coastal');

    await loadApp(b);
    await setWorld(b, 'rainforest', 'mist', false);
    await waitEnvironmentWorld(b, 'rainforest');

    const netA = await waitFor(a, `const n = window.__afterlight.netState(); return n.open ? n : null;`, 30000, 'A online');
    const netB = await waitFor(b, `const n = window.__afterlight.netState(); return n.open ? n : null;`, 30000, 'B online');
    check('two-client: both clients connect', !!netA && !!netB, `A=${JSON.stringify(netA)} B=${JSON.stringify(netB)}`);

    const roomA = await js(a, `return window.__afterlight.room();`);
    const roomB = await js(b, `return window.__afterlight.room();`);
    check('two-client: both share the same room', roomA === roomB && roomA === 'theater', `${roomA} vs ${roomB}`);

    const seenByA = await waitFor(a, `
      const n = window.__afterlight.remotePlayers().players.size;
      return n > 0 ? n : null;
    `, 30000, 'A sees B');
    const seenByB = await waitFor(b, `
      const n = window.__afterlight.remotePlayers().players.size;
      return n > 0 ? n : null;
    `, 30000, 'B sees A');
    check('two-client: each client sees the other', !!seenByA && !!seenByB, `A sees ${seenByA}, B sees ${seenByB}`);

    const worldA = (await worldSnapshot(a)).worldId;
    const worldB = (await worldSnapshot(b)).worldId;
    check('two-client: personal Worlds stay distinct', worldA === 'coastal' && worldB === 'rainforest', `${worldA} vs ${worldB}`);

    // Move A and prove B receives the shared coordinate update.
    await js(a, `return window.__afterlight.tp(3.5, 1.5);`);
    const observed = await waitFor(b, `
      const mgr = window.__afterlight.remotePlayers();
      const poses = [...mgr.players.values()].map((p) => [p.targetX, p.targetZ]);
      const hit = poses.find(([x, z]) => Math.abs(x - 3.5) < 0.2 && Math.abs(z - 1.5) < 0.2);
      return hit || null;
    `, 30000, 'B receives A pose');
    check('two-client: shared coordinates reach the other World', !!observed, JSON.stringify(observed));

    // A hot switch must not touch membership.
    await setWorld(a, 'desert', 'night', false);
    await waitEnvironmentWorld(a, 'desert');
    const netA2 = await js(a, `return window.__afterlight.netState();`);
    check('two-client: World switch does not restart membership', netA2.open === true && netA2.mode === netA?.mode, JSON.stringify(netA2));
    await screenshot(a, 'two-client-a-desert');
    await screenshot(b, 'two-client-b-rainforest');
    const errs = relevantErrors(`${await pageErrors(a)} || ${await pageErrors(b)}`);
    check('two-client: zero page errors', !errs, errs.slice(0, 200));
  } finally {
    await closeSessions();
  }
}

async function phaseStorage() {
  // 1) Storage denied at selection time: session-only, honest status.
  const s = await newSession('storage-denied');
  try {
    await loadApp(s);
    await js(s, `
      const deny = () => { throw new Error('storage denied by gate'); };
      try { Object.defineProperty(Storage.prototype, 'setItem', { configurable: true, value: deny }); } catch {}
      try { Object.defineProperty(Storage.prototype, 'removeItem', { configurable: true, value: deny }); } catch {}
      return true;
    `);
    await setWorld(s, 'alpine', 'aurora', true);
    await waitEnvironmentWorld(s, 'alpine');
    const snap = await worldSnapshot(s);
    check('storage: denied write keeps the session selection', snap.worldId === 'alpine' && snap.saved === false && snap.storageAvailable === false,
      JSON.stringify(snap));

    await js(s, `document.getElementById('btn-world').click(); return true;`);
    await sleep(500);
    const status = await js(s, `return (document.getElementById('world-status')?.textContent || '');`);
    check('storage: picker says the choice applies for this visit', /visit/i.test(status), JSON.stringify(status));
    await screenshot(s, 'storage-denied-picker');
    await js(s, `const d = document.getElementById('world-dialog'); if (d?.open) d.close(); return true;`);

    // Selection survives travel for the session.
    await js(s, `return window.__afterlight.travel('court');`);
    await waitFor(s, `return window.__afterlight.room() === 'court' ? 'court' : null;`, 30000, 'court');
    const snap2 = await worldSnapshot(s);
    check('storage: session selection survives travel', snap2.worldId === 'alpine', JSON.stringify(snap2));
    const errs = relevantErrors(await pageErrors(s));
    check('storage: denied storage never throws', !/storage denied by gate/.test(errs), errs.slice(0, 200));
  } finally {
    await closeSessions();
  }

  // 2) Storage denied before the app boots: the one-time assignment still
  // happens for the session, honestly reported as unsaved.
  const s2 = await newSession('storage-denied-startup');
  try {
    await cdp(s2, 'Page.addScriptToEvaluateOnNewDocument', {
      source: `
        (() => {
          const deny = () => { throw new Error('storage denied by gate'); };
          try { Object.defineProperty(Storage.prototype, 'getItem', { configurable: true, value: deny }); } catch {}
          try { Object.defineProperty(Storage.prototype, 'setItem', { configurable: true, value: deny }); } catch {}
        })();
      `,
    });
    await go(s2, `${APP}&world=desert`);
    await waitFor(s2, WORLD_READY, 90000, 'app ready (startup denial)');
    const snap3 = await worldSnapshot(s2);
    check('storage: startup with denied storage assigns a session World', !!snap3?.worldId && snap3.saved === false && snap3.storageAvailable === false,
      JSON.stringify(snap3));
    const env3 = await environmentOf(s2);
    check('storage: startup denial still resolves the requested World', env3?.selection?.worldId === 'desert',
      JSON.stringify(env3?.selection));
    const errs3 = relevantErrors(await pageErrors(s2));
    check('storage: startup denial produces no fatal error', !/Uncaught|TypeError|ReferenceError/.test(errs3), errs3.slice(0, 200));
  } finally {
    await closeSessions();
  }
}

async function phaseOffline() {
  const s = await newSession('offline');
  try {
    await loadApp(s);
    await cdp(s, 'Network.enable').catch(() => {});
    await cdp(s, 'Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    }).catch(() => {});
    await js(s, `window.dispatchEvent(new Event('offline')); return true;`).catch(() => {});
    await setWorld(s, 'redwood', 'firefly', false);
    const env = await waitEnvironmentWorld(s, 'redwood');
    check('offline: World selection applies without the network', !!env && env.selection.worldId === 'redwood',
      JSON.stringify(env?.selection));
    await screenshot(s, 'offline-redwood');
    await cdp(s, 'Network.emulateNetworkConditions', {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    }).catch(() => {});
  } finally {
    await closeSessions();
  }
}

async function phaseAssets() {
  const s = await newSession('assets-blocked');
  try {
    await cdp(s, 'Network.enable').catch(() => {});
    await cdp(s, 'Network.setBlockedURLs', { urls: ['*.glb', '*.gltf', '*.hdr', '*.ktx2'] }).catch(() => {});
    await loadApp(s);
    await setWorld(s, 'desert', 'golden', false);
    const env = await waitEnvironmentWorld(s, 'desert');
    const stats = await renderStatsOf(s);
    check('assets: blocked optional GLB/HDR still activate the World', !!env && (stats?.calls ?? 0) > 0,
      `bg-assets=${env?.assets?.length} calls=${stats?.calls}`);
    await screenshot(s, 'assets-blocked-desert');
    const errs = relevantErrors(await pageErrors(s));
    // Blocked-resource console noise is expected; app errors are not.
    check('assets: no fatal application error with blocked assets', !/Uncaught|TypeError|ReferenceError|is not a function/.test(errs), errs.slice(0, 200));
  } finally {
    await closeSessions();
  }
}

async function phaseContextLoss() {
  const s = await newSession('context-loss');
  try {
    await loadApp(s);
    await setWorld(s, 'cloud', 'day', false);
    await waitEnvironmentWorld(s, 'cloud');
    const before = await worldSnapshot(s);

    const lost = await js(s, `
      const canvas = document.querySelector('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      const ext = gl && gl.getExtension('WEBGL_lose_context');
      if (!ext) return 'no-extension';
      window.__gateLoseExt = ext;
      ext.loseContext();
      return true;
    `);
    check('context-loss: WEBGL_lose_context is available', lost === true, String(lost));
    await sleep(1500);
    await js(s, `window.__gateLoseExt.restoreContext(); return true;`);
    const recovered = await waitFor(s, `
      const env = window.__afterlight.environment();
      const stats = window.__afterlight.renderStats();
      return env && env.selection.worldId === 'cloud' && stats.calls > 0 ? { env, stats } : null;
    `, 30000, 'context restored');
    const after = await worldSnapshot(s);
    check('context-loss: context recovers with the same World', !!recovered && after.worldId === 'cloud' && after.revision === before.revision,
      `world=${after.worldId} rev ${before.revision}->${after.revision} calls=${recovered?.stats?.calls}`);
    const env = await environmentOf(s);
    check('context-loss: environment host still active after restore', env.actualHost === 'self' && !env.fallback, JSON.stringify({ host: env.actualHost, fallback: env.fallback }));
    await screenshot(s, 'context-loss-restored');
  } finally {
    await closeSessions();
  }
}

async function phaseRapid() {
  const s = await newSession('rapid');
  try {
    await loadApp(s);
    // Record each World's applied palette from a stable selection first.
    const palettes = {};
    for (const worldId of ['desert', 'cloud', 'alpine', 'redwood']) {
      const def = getWorldDefinition(worldId);
      await setWorld(s, worldId, def.defaultVariant, false);
      await waitEnvironmentWorld(s, worldId);
      await sleep(300);
      palettes[worldId] = paletteOf(await environmentOf(s), await sceneInfoOf(s));
    }

    // Rapid A -> B -> C -> D; only the last may attach.
    const sequence = ['coastal', 'rainforest', 'alpine', 'redwood'];
    await js(s, `
      const seq = ${JSON.stringify(sequence)};
      for (const worldId of seq) {
        window.__afterlight.setWorld({ worldId, persist: false });
      }
      return true;
    `);
    const finalWorld = sequence[sequence.length - 1];
    const finalEnv = await waitEnvironmentWorld(s, finalWorld);
    await sleep(1200);
    const finalPalette = paletteOf(finalEnv, await sceneInfoOf(s));
    check('rapid: latest of four rapid choices is the applied World', finalEnv.selection.worldId === finalWorld,
      JSON.stringify(finalEnv.selection));
    check('rapid: applied palette matches the recorded final World', finalPalette.background === palettes[finalWorld].background,
      `${finalPalette.background} vs ${palettes[finalWorld].background}`);
    const canvases = await webglCanvasCount(s);
    check('rapid: no extra WebGL canvas or host leaked', canvases === 1, `canvases=${canvases}`);
    const errs = relevantErrors(await pageErrors(s));
    check('rapid: zero page errors', !errs, errs.slice(0, 200));
    await screenshot(s, 'rapid-final-redwood');
  } finally {
    await closeSessions();
  }
}

// Shared palette cache for the travel phase's return-to-theater check.
const seenPalette = {};

async function recordPalettes() {
  const s = await newSession('palettes');
  try {
    await loadApp(s);
    for (const worldId of WORLD_IDS) {
      const def = getWorldDefinition(worldId);
      await setWorld(s, worldId, def.defaultVariant, false);
      await waitEnvironmentWorld(s, worldId);
      seenPalette[worldId] = paletteOf(await environmentOf(s), await sceneInfoOf(s));
    }
  } finally {
    await closeSessions();
  }
}

// ---------------------------------------------------------------------------
// Evidence + runner
// ---------------------------------------------------------------------------

function writeEvidence() {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const stamp = new Date().toISOString();
  const result = {
    gate: 'world-inheritance',
    change: 'introduce-global-world-system',
    label: LABEL,
    generatedAt: stamp,
    app: APP,
    passes: passes.length,
    failures: failures.length,
    checks: { passes, failures },
  };
  writeFileSync(join(EVIDENCE_DIR, `world-inheritance-gate-${LABEL}.json`), JSON.stringify(result, null, 2));

  const md = `# World inheritance browser gate (task 8.2)

Generated by \`scripts/world-inheritance-gate-browser.mjs\` at ${stamp}.

- App: ${APP}
- Result: ${failures.length === 0 ? 'PASS' : `FAIL (${failures.length})`} — ${passes.length} checks passed
- Screenshots: \`evidence/gate-shots/${LABEL}-*.png\`

## Checks

${passes.map((p) => `- PASS ${p.name}${p.detail ? ` — ${p.detail}` : ''}`).join('\n')}
${failures.map((f) => `- FAIL ${f.name}${f.detail ? ` — ${f.detail}` : ''}`).join('\n')}
`;
  writeFileSync(join(EVIDENCE_DIR, `world-inheritance-gate-${LABEL}.md`), md);
  log(`evidence written: world-inheritance-gate-${LABEL}.{json,md}`);
}

const PHASES = {
  contract: phaseContract,
  'hot-switch': phaseHotSwitch,
  travel: phaseTravel,
  'two-client': phaseTwoClient,
  storage: phaseStorage,
  offline: phaseOffline,
  assets: phaseAssets,
  'context-loss': phaseContextLoss,
  rapid: phaseRapid,
};

const requested = process.argv.slice(2);
const phaseNames = requested.length && requested[0] !== 'all'
  ? requested
  : Object.keys(PHASES);

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    await closeSessions();
    process.exit(1);
  });
}

try {
  await startDriver();
  // Baseline palettes are needed by the travel phase's theater return check.
  if (phaseNames.includes('travel')) await recordPalettes();

  for (const phase of phaseNames) {
    const fn = PHASES[phase];
    if (!fn) {
      console.error(`unknown phase ${phase}; known: ${Object.keys(PHASES).join(', ')}, all`);
      process.exit(1);
    }
    let ok = false;
    for (let attempt = 1; attempt <= 2 && !ok; attempt++) {
      try {
        log(`--- phase ${phase} attempt ${attempt} ---`);
        await fn();
        ok = true;
      } catch (e) {
        log(`phase ${phase} attempt ${attempt} FAILED: ${e.message}`);
        await closeSessions().catch(() => {});
        if (attempt === 2) fail(`phase ${phase} aborted`, e.message);
        await sleep(2000);
      }
    }
  }
} catch (err) {
  fail('gate fatal', err?.stack || String(err));
} finally {
  await shutdown().catch(() => {});
  writeEvidence();
}

if (failures.length > 0) {
  console.error(`[world-gate] ${failures.length} check(s) failed`);
  process.exit(1);
}
log(`ALL CHECKS PASS (${passes.length})`);
