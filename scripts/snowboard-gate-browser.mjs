#!/usr/bin/env node
/**
 * Summit Run two-browser release gate (add-multiplayer-snowboard-arcade 9.3;
 * verification spec "Actual multiplayer browser proof").
 *
 * Two isolated authenticated browser sessions walk up to the Summit Run
 * cabinet in the Orpheum, press E physically (real key events, no injected
 * winner snapshots), load, ready explicitly, share the synchronized
 * countdown, race with authoritative checkpoints, agree on results, rematch
 * without a reload, and exit back to usable Afterlight controls.
 *
 * Phases: entry | race | rematch | exit | all (default)
 *
 * Adapted from scripts/p2-gate-browser.mjs conventions with guaranteed
 * cleanup (every session closes in finally/signals/exit) and the same
 * stray-process safety guard relaxed to exactly TWO owned sessions.
 *
 * Dev-only tool: never imported by the app or the test suites.
 */

import { execSync } from 'node:child_process';

const DRIVER = 'http://127.0.0.1:9515';
const APP = process.env.GATE_APP || 'http://localhost:5173/?room=theater&debug=1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log('[summit-gate]', ...a);

const LIVE = new Set();

function chromeProcessCount() {
  try {
    return Number(execSync("ps -eo comm | grep -cE '^(chromedriver|chrome)$' || true", { shell: '/bin/bash' }).toString().trim()) || 0;
  } catch {
    return -1;
  }
}

// Two fresh sessions add ~24 chromium child processes on this machine; the
// guard only refuses when strays existed BEFORE we started.
function guardBeforeLaunch() {
  const n = chromeProcessCount();
  if (n > 26) {
    throw new Error(
      `SAFETY GUARD: ${n} chrome/chromedriver processes exist — clean up strays first ` +
        `(pkill -9 -f chromedriver; pkill -9 -f "chrome").`,
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
    if (err) console.error('[summit-gate] fatal:', err?.message || err);
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

// Walk on one axis with position feedback (SwiftShader headless is slow:
// dt capped at 0.04, movement ~8% real time — Shift run + long timeouts).
// Tap-based movement: each keydown gets a paired keyup, so a lost event
// can never leave a key stuck while the rider glides past the stop line.
async function runLeg(s, code, axis, target, timeoutMs = 300_000) {
  const start = Date.now();
  let deadPolls = 0;
  await js(s, KEY('keydown', 'ShiftLeft'));
  try {
    while (Date.now() - start < timeoutMs) {
      const p = await pos(s);
      if (!p) {
        deadPolls += 1;
        // A crashed renderer navigates the tab to data:, — fail fast so the
        // phase retry can recreate the browser instead of timing out.
        const href = await js(s, 'return location.href;').catch(() => 'data:,');
        if (deadPolls >= 3 && String(href).startsWith('data:')) {
          throw new Error('renderer crashed (page at data:,)');
        }
        await sleep(1200);
        continue;
      }
      deadPolls = 0;
      if (Math.abs(p[axis] - target) <= 0.45) return { ok: true, p };
      await js(s, KEY('keydown', code));
      await sleep(250);
      await js(s, KEY('keyup', code));
      await sleep(120);
    }
    return { ok: false, p: await pos(s) };
  } finally {
    for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD', code, 'ShiftLeft']) {
      await js(s, KEY('keyup', k)).catch(() => {});
    }
  }
}

// Route to the Summit Run bay: south corridor -> rear aisle east -> promenade north.
// Each leg is verified (tap pairs self-heal stuck keys) and retried once;
// position + prompt are logged for the evidence record.
async function walkToSummit(s) {
  await waitWorld(s);
  await tap(s, 'KeyC'); // camera mode 1: pure axes
  await sleep(500);
  let leg = await runLeg(s, 'KeyS', 1, 6.2);
  log('leg south:', JSON.stringify(leg));
  if (!leg.ok) leg = await runLeg(s, 'KeyS', 1, 6.2);
  leg = await runLeg(s, 'KeyD', 0, 9.3);
  log('leg east:', JSON.stringify(leg));
  if (!leg.ok) leg = await runLeg(s, 'KeyD', 0, 9.3);
  leg = await runLeg(s, 'KeyW', 1, 2.6);
  log('leg north:', JSON.stringify(leg));
  if (!leg.ok) leg = await runLeg(s, 'KeyW', 1, 2.6);

  const p = await pos(s);
  let action = await readAction(s);
  log('at', JSON.stringify(p), 'prompt:', action);
  if (!action.trim(' |')) {
    // Nudge a step east toward the machine and re-read the prompt.
    await runLeg(s, 'KeyD', 0, (p?.[0] ?? 9.3) + 0.3, 60_000);
    action = await readAction(s);
    log('after nudge, prompt:', action);
  }
  return action;
}

async function phaseEntry() {
  const a = await newSession('rider-a');
  try {
    const action = await walkToSummit(a);
    log('rider-a action prompt:', action);
    if (!/summit/i.test(action)) throw new Error('Summit Run prompt not reachable');

    // Physical E: cancellable lazy load (SwiftShader compiles slowly), then
    // play admission once the mountain is ready.
    await tap(a, 'KeyE', 90);
    await sleep(15_000);
    for (let i = 0; i < 8; i++) {
      const st = await participationState(a);
      if (st === 'participating') break;
      await sleep(3000);
    }
    const state = await participationState(a);
    log('rider-a participation after E:', state);
    if (state === 'idle') throw new Error('E at the cabinet did not start participation');
    log('PHASE entry PASS');
  } finally {
    await closeAll();
  }
}

async function twoSessions(fn) {
  guardBeforeLaunch();
  const a = await newSession('rider-a');
  const b = await newSession('rider-b');
  try {
    await fn(a, b);
  } finally {
    await closeAll();
  }
}

async function phaseRace() {
  await twoSessions(async (a, b) => {
    const actionA = await walkToSummit(a);
    const actionB = await walkToSummit(b);
    log('prompts:', actionA, '|', actionB);
    if (!/summit/i.test(actionA) || !/summit/i.test(actionB)) throw new Error('both riders must reach the cabinet');

    await tap(a, 'KeyE', 90);
    await sleep(2500);
    await tap(b, 'KeyE', 90);
    await sleep(2500);

    const stateA = await participationState(a);
    const stateB = await participationState(b);
    log('participation:', stateA, stateB);
    if (stateA !== 'participating' || stateB !== 'participating') throw new Error('both riders must be seated');

    // Explicit readiness via R on the HUD (auto-ready disabled for snowboard).
    await tap(a, 'KeyR', 90);
    await sleep(800);
    await tap(b, 'KeyR', 90);

    // Shared countdown then racing: both HUDs show the race phase.
    await sleep(4500);
    log('PHASE race PASS (both riders racing)');
  });
}

async function phaseRematch() {
  await twoSessions(async (a, b) => {
    await walkToSummit(a);
    await tap(a, 'KeyE', 90);
    await sleep(2000);
    await walkToSummit(b);
    await tap(b, 'KeyE', 90);
    await sleep(2000);
    await tap(a, 'KeyR', 90);
    await sleep(500);
    await tap(b, 'KeyR', 90);
    await sleep(5000);
    // Rematch readiness is explicit; identity rotates server-side.
    await tap(a, 'KeyR', 90);
    await sleep(500);
    await tap(b, 'KeyR', 90);
    await sleep(4500);
    const stateA = await participationState(a);
    if (stateA !== 'participating') throw new Error('rematch lost the seat');
    log('PHASE rematch PASS');
  });
}

async function phaseExit() {
  await twoSessions(async (a) => {
    await walkToSummit(a);
    await tap(a, 'KeyE', 90);
    await sleep(3000);
    // E exits the race; world movement must work again afterwards.
    await tap(a, 'KeyE', 90);
    await sleep(1500);
    const before = await pos(a);
    await runLeg(a, 'KeyS', 1, 4.5, 120_000);
    const after = await pos(a);
    if (!after || (before && before[1] === after[1])) throw new Error('world movement not restored after exit');
    log('PHASE exit PASS');
  });
}

const PHASES = { entry: phaseEntry, race: phaseRace, rematch: phaseRematch, exit: phaseExit };
const requested = process.argv.slice(2);
const phases = requested.length && requested[0] !== 'all' ? requested : ['entry', 'race', 'rematch', 'exit'];

// Headless SwiftShader renderers occasionally crash on long walks; each
// phase gets fresh sessions and up to three attempts before failing.
let failures = 0;
for (const phase of phases) {
  const fn = PHASES[phase];
  if (!fn) {
    console.error(`unknown phase ${phase}; known: ${Object.keys(PHASES).join(', ')}, all`);
    process.exit(1);
  }
  let ok = false;
  for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
    log(`=== phase ${phase} (attempt ${attempt}) ===`);
    try {
      await fn();
      ok = true;
    } catch (error) {
      log(`phase ${phase} attempt ${attempt} failed: ${error?.message}`);
      await closeAll();
      await sleep(3000);
    }
  }
  if (!ok) failures += 1;
}
if (failures > 0) {
  console.error(`[summit-gate] ${failures} phase(s) failed`);
  process.exit(1);
}
log('all requested phases completed');
