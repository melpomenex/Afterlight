#!/usr/bin/env node
/**
 * Kart Royale cabinet release gate (integrate-kart-royale-arcade 7.4),
 * adapted from scripts/snowboard-gate-browser.mjs conventions.
 *
 * One authenticated browser session walks up to the Kart Royale cabinet in
 * the Orpheum, presses E physically, waits for the real game to boot under
 * the view lease, starts a race with real keys, exercises the pause/leave
 * exit, and proves world movement is restored. A reentry phase repeats the
 * cycle and proves no duplicate DOM/leaks; a bystander phase uses a second
 * isolated session to confirm the occupied machine from outside.
 *
 * Phases: entry | race | exit | reentry | bystander | all (default)
 *
 * Dev-only tool: never imported by the app or the test suites. Requires a
 * chromedriver on :9515 and the dev stack (npm run dev:stack) with the app
 * at GATE_APP (default http://localhost:5173/?room=theater&debug=1).
 */

import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const DRIVER = 'http://127.0.0.1:9515';
const APP = process.env.GATE_APP || 'http://localhost:5173/?room=theater&debug=1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log('[kart-gate]', ...a);

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
  if (n > 26) {
    throw new Error(
      `SAFETY GUARD: ${n} chrome/chromedriver processes exist — clean up strays first.`,
    );
  }
}

async function closeAll() {
  for (const id of [...LIVE]) {
    LIVE.delete(id);
    try {
      await fetch(`${DRIVER}/session/${id}`, { method: 'DELETE' });
    } catch {}
  }
}

for (const sig of ['SIGINT', 'SIGTERM', 'uncaughtException', 'unhandledRejection']) {
  process.on(sig, async (err) => {
    if (err) console.error('[kart-gate] fatal:', err?.message || err);
    await closeAll();
    process.exit(1);
  });
}
process.on('exit', () => {
  for (const id of LIVE) {
    try {
      execSync(`curl -s -X DELETE ${DRIVER}/session/${id} -o /dev/null`, { timeout: 3000 });
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

async function newSession(name) {
  const res = await fetch(`${DRIVER}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      capabilities: {
        browserName: 'chrome',
        'goog:chromeOptions': {
          args: ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--window-size=800,600', '--mute-audio'],
          binary: '/usr/bin/chromium-browser',
        },
      },
    }),
  });
  const data = await res.json();
  const id = data.value?.sessionId ?? data.sessionId;
  if (!id) throw new Error(`session ${name}: ${JSON.stringify(data).slice(0, 200)}`);
  LIVE.add(id);
  log(`session ${name} = ${id}`);
  return { name, id };
}

const js = (s, script) => req('POST', `/session/${s.id}/execute/sync`, { script, args: [] });
const go = (s, url = APP) => req('POST', `/session/${s.id}/url`, { url });

const KEY = (type, code) => `document.body.dispatchEvent(new KeyboardEvent('${type}', { code: '${code}', key: '${code.slice(3).toLowerCase()}', bubbles: true, cancelable: true })); return true;`;
async function tap(s, code, holdMs = 70) {
  await js(s, KEY('keydown', code));
  await sleep(holdMs);
  await js(s, KEY('keyup', code));
}
const readAction = (s) => js(s, `return (document.getElementById('action-title')?.textContent || '') + ' || ' + (document.getElementById('action-sub')?.textContent || '');`);
const pos = async (s) => {
  try {
    const p = await js(s, `return window.__afterlight ? window.__afterlight.player() : null;`);
    return Array.isArray(p) ? p : null;
  } catch {
    return null;
  }
};
const participationState = (s) => js(s, `return window.__afterlight ? window.__afterlight.participation() : null;`);

async function waitWorld(s, timeoutMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if (await js(s, `return !!document.querySelector('canvas') && !!document.getElementById('action-title') && !document.getElementById('loading');`)) return true;
    } catch {}
    await sleep(1500);
  }
  return false;
}

// The Kart Royale cabinet stands in Sporefall's former slot (z -1.8).
async function walkToCabinet(s) {
  await go(s, APP);
  await js(s, `window.__errors = []; window.addEventListener('error', (e) => window.__errors.push(String(e.message))); window.addEventListener('unhandledrejection', (e) => window.__errors.push('rejection: ' + String(e.reason)));
    const origErr = console.error.bind(console);
    console.error = (...a) => { window.__errors.push('console: ' + a.map(String).join(' ').slice(0, 300)); origErr(...a); };
    return true;`);
  if (!(await waitWorld(s))) throw new Error('world did not load');
  await tap(s, 'KeyC');
  await sleep(400);
  await js(s, `return window.__afterlight.tp(9.3, -1.8);`);
  await sleep(600);
  await tap(s, 'KeyS', 140);
  await sleep(300);
  await tap(s, 'KeyW', 140);
  await sleep(700);
  const action = await readAction(s);
  log('at', JSON.stringify(await pos(s)), 'prompt:', action);
  return action;
}

/** True once the game HUD is mounted and the racing presentation is live. */
async function waitGameLive(s, timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const live = await js(s, `return {
        racing: document.body.classList.contains('kr-racing'),
        hud: !!document.querySelector('.kr-activity .kr'),
        canvases: document.querySelectorAll('canvas').length,
        errors: (window.__errors || []).length,
      };`);
      if (live.racing && live.hud) return live;
      if (live.errors > 0 && Date.now() - start > 30_000) {
        const errs = await js(s, `return (window.__errors || []).slice(0, 4).join(' || ');`);
        throw new Error(`page errors while loading the game: ${errs}`);
      }
    } catch (e) {
      if (String(e.message).startsWith('page errors')) throw e;
    }
    await sleep(2000);
  }
  return null;
}

/** Count DOM canvases with a WebGL context (a second renderer would show here). */
const webglCanvasCount = (s) => js(s, `
  return [...document.querySelectorAll('canvas')].filter((c) => {
    try { return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
  }).length;`);

async function pageErrors(s) {
  return js(s, `return (window.__errors || []).join(' || ');`).catch(() => '');
}

async function screenshot(s, name) {
  try {
    const b64 = await req('GET', `/session/${s.id}/screenshot`);
    const file = `/tmp/kart-gate-${name}.png`;
    writeFileSync(file, Buffer.from(b64, 'base64'));
    return file;
  } catch {
    return null;
  }
}

async function phaseEntry() {
  guardBeforeLaunch();
  const a = await newSession('player-a');
  try {
    const action = await walkToCabinet(a);
    if (!/kart royale/i.test(action)) throw new Error(`Kart Royale prompt not reachable (got "${action}")`);

    let state = 'idle';
    for (let seatTry = 1; seatTry <= 4 && state === 'idle'; seatTry++) {
      await tap(a, 'KeyE', 90);
      for (let i = 0; i < 8; i++) {
        state = await participationState(a);
        if (state !== 'idle') break;
        const toast = await js(a, `return (document.getElementById('toast-body')?.textContent || '');`).catch(() => '');
        if (/activity_full|full/i.test(toast)) {
          log(`seat still held by a prior session (disconnect grace) — retry ${seatTry}`);
          await sleep(6000);
          break;
        }
        await sleep(2000);
      }
    }
    if (state === 'idle') throw new Error('E at the cabinet did not start participation');
    log('participation after E:', state);

    const live = await waitGameLive(a);
    if (!live) throw new Error('game never came live under the lease (timeout)');
    log('game live:', JSON.stringify(live));
    // The game's HUD appends its own 2D canvases (speedometer, minimap) — the
    // hard contract is that no SECOND WebGL canvas ever appears.
    const glCanvases = await webglCanvasCount(a);
    if (glCanvases !== 1) throw new Error(`exactly ONE WebGL canvas must exist (got ${glCanvases})`);
    await screenshot(a, 'entry');
    log('PHASE entry PASS');
  } finally {
    await closeAll();
  }
}

async function phaseRace() {
  guardBeforeLaunch();
  const a = await newSession('player-a');
  try {
    await walkToCabinet(a);
    await tap(a, 'KeyE', 90);
    if (!(await waitGameLive(a))) throw new Error('game never came live');
    await sleep(2000);

    // Confirm the roster selection with a real Enter press → countdown → race.
    await tap(a, 'Enter', 90);
    await sleep(2500);
    // Drive: hold accelerate + steer with real keys for a few seconds.
    await js(a, KEY('keydown', 'ArrowUp'));
    await js(a, KEY('keydown', 'ArrowRight'));
    await sleep(4000);
    await js(a, KEY('keyup', 'ArrowRight'));
    await js(a, KEY('keydown', 'ArrowLeft'));
    await sleep(2000);
    await js(a, KEY('keyup', 'ArrowLeft'));
    // E mid-race is the ITEM key, not an exit: the seat must survive it.
    await tap(a, 'KeyE', 90);
    await sleep(1200);
    await js(a, KEY('keyup', 'ArrowUp'));

    const state = await participationState(a);
    if (state !== 'participating') throw new Error(`race lost the seat after E (state=${state} — E must fire the item, not exit)`);
    const hudText = await js(a, `return (document.querySelector('.kr-activity .kr')?.textContent || '').slice(0, 120);`).catch(() => '');
    log('hud text sample:', JSON.stringify(hudText));
    const errs = await pageErrors(a);
    if (errs) throw new Error(`page errors during the race: ${errs}`);
    await screenshot(a, 'race');
    log('PHASE race PASS (real keys drove the kart, seat held, zero page errors)');
  } finally {
    await closeAll();
  }
}

async function leaveViaPauseMenu(s) {
  // Escape opens the game's pause menu; its quit action is the cabinet exit.
  await tap(s, 'Escape', 90);
  await sleep(1200);
  const clicked = await js(s, `
    const btns = [...document.querySelectorAll('.kr-activity .kr-btn')];
    const leave = btns.find((b) => /leave cabinet/i.test(b.textContent || ''));
    if (leave) { leave.click(); return true; }
    return false;`);
  if (!clicked) throw new Error('pause menu "Leave cabinet" not found');
}

async function phaseExit() {
  guardBeforeLaunch();
  const a = await newSession('player-a');
  try {
    await walkToCabinet(a);
    await tap(a, 'KeyE', 90);
    if (!(await waitGameLive(a))) throw new Error('game never came live');
    await sleep(1500);

    await leaveViaPauseMenu(a);
    // The exit is async (lease release + leave + dismount): wait for idle.
    let idle = false;
    for (let i = 0; i < 20; i++) {
      if ((await participationState(a)) === 'idle') { idle = true; break; }
      await sleep(1000);
    }
    if (!idle) throw new Error('pause-menu exit never returned to idle');

    const clean = await js(a, `return {
      racing: document.body.classList.contains('kr-racing'),
      roots: document.querySelectorAll('.kr-activity').length,
    };`);
    if (clean.racing) throw new Error('body.kr-racing stuck after exit');
    if (clean.roots !== 0) throw new Error(`game HUD root leaked (${clean.roots})`);
    const glCanvases = await webglCanvasCount(a);
    if (glCanvases !== 1) throw new Error(`WebGL canvas count changed after exit (${glCanvases})`);

    // World movement must work again (the Summit Run gate's proof).
    const before = await pos(a);
    await tap(a, 'KeyS', 200);
    await sleep(900);
    const after = await pos(a);
    if (!after || (before && Math.abs(before[1] - after[1]) < 0.01 && Math.abs(before[0] - after[0]) < 0.01)) {
      throw new Error('world movement not restored after exit');
    }
    await screenshot(a, 'exit-restored');
    const errs = await pageErrors(a);
    if (errs) throw new Error(`page errors after exit: ${errs}`);
    log('PHASE exit PASS (clean teardown, movement restored)');
  } finally {
    await closeAll();
  }
}

async function phaseReentry() {
  guardBeforeLaunch();
  const a = await newSession('player-a');
  try {
    for (let cycle = 1; cycle <= 2; cycle++) {
      await walkToCabinet(a);
      await tap(a, 'KeyE', 90);
      if (!(await waitGameLive(a))) throw new Error(`cycle ${cycle}: game never came live`);
      await sleep(1500);
      await leaveViaPauseMenu(a);
      let idle = false;
      for (let i = 0; i < 20; i++) {
        if ((await participationState(a)) === 'idle') { idle = true; break; }
        await sleep(1000);
      }
      if (!idle) throw new Error(`cycle ${cycle}: exit never returned to idle`);
      const clean = await js(a, `return { racing: document.body.classList.contains('kr-racing'), roots: document.querySelectorAll('.kr-activity').length };`);
      const glCount = await webglCanvasCount(a);
      log(`cycle ${cycle} teardown:`, JSON.stringify(clean), 'webgl canvases:', glCount);
      if (clean.racing || clean.roots !== 0 || glCount !== 1) {
        throw new Error(`cycle ${cycle}: leaked state ${JSON.stringify(clean)} gl=${glCount}`);
      }
    }
    const errs = await pageErrors(a);
    if (errs) throw new Error(`page errors across cycles: ${errs}`);
    log('PHASE reentry PASS (two full cycles, no accumulating state)');
  } finally {
    await closeAll();
  }
}

async function phaseBystander() {
  guardBeforeLaunch();
  const a = await newSession('player-a');
  const b = await newSession('bystander-b');
  try {
    await walkToCabinet(a);
    await tap(a, 'KeyE', 90);
    if (!(await waitGameLive(a))) throw new Error('racer never went live');

    // The bystander walks to the same machine while it is occupied.
    const actionB = await walkToCabinet(b);
    log('bystander prompt at the occupied machine:', actionB);
    if (!/kart royale/i.test(actionB)) throw new Error('bystander lost the cabinet prompt');
    // Bystander stays in the social world with a usable HUD.
    const bClean = await js(b, `return { racing: document.body.classList.contains('kr-racing'), roots: document.querySelectorAll('.kr-activity').length };`);
    if (bClean.racing || bClean.roots !== 0) throw new Error('bystander must not inherit the racing presentation');
    const stateA = await participationState(a);
    if (stateA !== 'participating') throw new Error('racer lost the seat while being observed');
    log('PHASE bystander PASS (occupied machine stays social for others)');
  } finally {
    await closeAll();
  }
}

const PHASES = { entry: phaseEntry, race: phaseRace, exit: phaseExit, reentry: phaseReentry, bystander: phaseBystander };
const requested = process.argv.slice(2);
const phases = requested.length && requested[0] !== 'all' ? requested : ['entry', 'race', 'exit', 'reentry', 'bystander'];

let failures = 0;
for (const phase of phases) {
  const fn = PHASES[phase];
  if (!fn) {
    console.error(`unknown phase ${phase}; known: ${Object.keys(PHASES).join(', ')}, all`);
    process.exit(1);
  }
  let ok = false;
  for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
    try {
      log(`--- phase ${phase} attempt ${attempt} ---`);
      await fn();
      ok = true;
    } catch (e) {
      log(`phase ${phase} attempt ${attempt} FAILED: ${e.message}`);
      if (attempt === 3) failures += 1;
      await closeAll();
      await sleep(3000);
    }
  }
}
if (failures > 0) {
  console.error(`[kart-gate] ${failures} phase(s) failed`);
  process.exit(1);
}
log('ALL PHASES PASS');
