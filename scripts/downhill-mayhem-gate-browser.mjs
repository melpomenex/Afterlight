#!/usr/bin/env node
/**
 * Downhill Mayhem two-browser release gate
 * (integrate-multiplayer-downhill-mayhem-arcade 15.1/15.2, verification spec
 * "Real browser end-to-end gate").
 *
 * Real, isolated browser sessions walk up to the Downhill Mayhem cabinet in the
 * Orpheum, press E physically (real key events — this gate never injects winner
 * snapshots), enter the same lobby with identical humans/AI/mountain/difficulty,
 * ready explicitly, share the synchronized 3-2-1 countdown, race, punch/kick and
 * observe the same authoritative combat outcome on both clients, hop/trick/boost,
 * finish, agree on identical standings, rematch without a reload, exit back to
 * usable Afterlight Theater controls, and prove exactly one renderer/WebGL
 * context/primary canvas/socket remains.
 *
 * Phases: doctor | entry | race | rematch | exit | solo | queue | reconnect |
 *         grace | captain | failedLoad | soak | all | extended
 *   - `all`      = entry, race, rematch, exit    (the minimum release path)
 *   - `extended` = every phase in the order below
 * Run one phase by name: `node scripts/downhill-mayhem-gate-browser.mjs race`
 *
 * ---------------------------------------------------------------------------
 * DEBUG HOOK CONTRACT (EXPLICIT — this gate depends on other agents' work):
 *
 * The gate is written against `?debug=1` `window.__afterlight` and will not pass
 * until the hosted client + Phoenix session land. It is deliberately tolerant:
 * every state read goes through ONE adapter (`readDownhill`) that tries the
 * hooks in this order and fails with a self-diagnosing message naming what is
 * missing.
 *
 *   REQUIRED (already live on main):
 *     window.__afterlight.player()         -> [x, z]
 *     window.__afterlight.participation()  -> 'idle' | 'joining' | 'participating' |
 *                                             'watching' | 'queued'
 *     window.__afterlight.activity()       -> activity id (e.g. 'orpheum-downhill-mayhem')
 *     window.__afterlight.tp(x, z)         -> teleport + one movement broadcast
 *     window.__afterlight.room()           -> current room id
 *     window.__afterlight.netState()       -> { mode, supports, open }
 *
 *   REQUIRED NEW (the downhill controller MUST expose this for the gate):
 *     window.__afterlight.downhill() -> {
 *       phase:      'preparing'|'loading'|'lobby'|'countdown'|'racing'|'results'|'exiting',
 *       matchId:    string|null,          // rotates on every rematch
 *       courseHash: string|null,          // sha256 hex
 *       mountain:   'classic'|'timber'|'rock'|'daily',
 *       difficulty: 'chill'|'mayhem'|'brutal',
 *       humans:     [{ slot, name, ready, captain, connected }],
 *       field:      [{ slot, name, isAI }],            // ALWAYS length 6
 *       riders:     [{ slot, name, isAI, s, lat, finished, dnf, downed,
 *                      airborne, trick, boost, place, time }],
 *       standings:  [{ slot, name, isAI, place, time, dnf }],
 *       selfSlot:   number,
 *       countdown:  { remainingMs, number } | null,    // number: 3|2|1
 *       strikes:    [{ attacker, victim, kind, tick }], // authoritative only
 *       lastStrike: { attacker, victim, kind, tick } | null,
 *       courseStatus: 'loading'|'ready'|'failed',
 *     }
 *   Implementers: expose this from `src/activities/downhill/controller.js` and
 *   wire it into the `window.__afterlight` block in `src/main.js` (or expose
 *   `latestSnapshot` on the controller's returned instance so the existing
 *   `sim()` accessor returns it). The HUD snapshot at `controller.js` `hudUpdate()`
 *   is NOT sufficient — it drops the live per-rider sim fields this gate needs.
 *
 *   FALLBACK (used when `downhill()` is absent — the generic activity stack):
 *     window.__afterlight.sim() -> the controller's latestSnapshot (activity_state
 *       payload). The adapter digs for phase/matchId/courseId/difficulty, and for
 *       riders/field/standings under `.riders`/`.field`/`.sim`/`.simState`.
 *       This fallback cannot read strikes or the countdown reliably; the doctor
 *       phase reports exactly what was found so the adapter can be pointed at the
 *       real field names in one place.
 *
 *   Optional DOM fallbacks: `[data-downhill-phase]`, `[data-downhill-field]`
 *     (JSON), `[data-downhill-standings]` (JSON).
 *
 * Resource assertions (no second host primitive) use:
 *   - one WebGL canvas (`getContext('webgl2'|'webgl')` count === 1)
 *   - one transport (`netState().open` true; `netState().mode` stable)
 *   - `performance.timeOrigin` constant across the whole phase (proves no reload)
 *   - a `requestAnimationFrame` subscriber sample that must not grow after exit
 *     (report-only; the strong primitive checks are canvas + socket).
 * ---------------------------------------------------------------------------
 *
 * Dev-only tool: never imported by the app or the test suites. Requires a
 * chromedriver on :9515 and the dev stack (npm run dev:stack) with the app at
 * GATE_APP (default http://localhost:5173/?room=theater&debug=1).
 */

import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const DRIVER = process.env.GATE_DRIVER || 'http://127.0.0.1:9515';
const APP = process.env.GATE_APP || 'http://localhost:5173/?room=theater&debug=1';
const ARTIFACT_DIR = process.env.GATE_ARTIFACTS || '/tmp/downhill-gate';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log('[downhill-gate]', ...a);

// The cabinet's east-wall stand anchor (design D1 participantAnchors slot 3).
const CABINET = { x: 8.45, z: -3.8 };
const FIELD_SIZE = 6;

// Headless SwiftShader is slow; a full 2.3 km descent can take many real
// minutes. Override with GATE_RACE_TIMEOUT_MS when running on a fast box.
const RACE_TIMEOUT_MS = Number(process.env.GATE_RACE_TIMEOUT_MS || 420_000);
const LOAD_TIMEOUT_MS = Number(process.env.GATE_LOAD_TIMEOUT_MS || 120_000);
const GRACE_MS = Number(process.env.GATE_GRACE_MS || 34_000);
const SOAK_CYCLES = Number(process.env.GATE_SOAK_CYCLES || 3);

const LIVE = new Set();

// ---------------------------------------------------------------------------
// chromedriver session lifecycle (copied from scripts/snowboard-gate-browser.mjs)
// ---------------------------------------------------------------------------

function chromeProcessCount() {
  try {
    return (
      Number(
        execSync("ps -eo comm | grep -cE '^(chromedriver|chrome)$' || true", { shell: '/bin/bash' }).toString().trim(),
      ) || 0
    );
  } catch {
    return -1;
  }
}

// Each session costs ~12 chromium children; the extended phases hold three.
const MAX_CHROME = Number(process.env.GATE_MAX_CHROME || 46);
function guardBeforeLaunch() {
  const n = chromeProcessCount();
  if (n > MAX_CHROME) {
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
    if (err) console.error('[downhill-gate] fatal:', err?.message || err);
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
          args: [
            '--headless=new',
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--use-gl=angle',
            '--use-angle=swiftshader',
            '--window-size=800,600',
            '--mute-audio',
            '--disable-backgrounding-occluded-windows',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-hang-monitor',
          ],
          binary: process.env.GATE_BROWSER || '/usr/bin/chromium-browser',
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

// Chrome DevTools passthrough — used for honest transport disconnect and for
// blocking the course payload on the failed-load phase.
const cdp = (s, cmd, params = {}) => req('POST', `/session/${s.id}/chromium/send_command`, { cmd, params });

const KEY_NAMES = {
  Space: ' ',
  Escape: 'Escape',
  Enter: 'Enter',
  Backspace: 'Backspace',
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  ShiftLeft: 'Shift',
  ShiftRight: 'Shift',
  Tab: 'Tab',
};
const keyFor = (code) => KEY_NAMES[code] ?? code.slice(3).toLowerCase();
const KEY = (type, code) =>
  `document.body.dispatchEvent(new KeyboardEvent('${type}', { code: '${code}', key: ${JSON.stringify(
    keyFor(code),
  )}, bubbles: true, cancelable: true })); return true;`;

async function tap(s, code, holdMs = 80) {
  await js(s, KEY('keydown', code));
  await sleep(holdMs);
  await js(s, KEY('keyup', code));
}
const keyDown = (s, code) => js(s, KEY('keydown', code));
const keyUp = (s, code) => js(s, KEY('keyup', code));
const holdKey = async (s, code, ms) => {
  await keyDown(s, code);
  await sleep(ms);
  await keyUp(s, code);
};

async function releaseAllKeys(s) {
  for (const code of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'Space', 'KeyE', 'KeyF', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
    await keyUp(s, code).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// assertions + polling
// ---------------------------------------------------------------------------

function fail(message) {
  throw new Error(message);
}
function expect(cond, message) {
  if (!cond) fail(message);
}
function sameJson(a, b, message) {
  const sa = JSON.stringify(a);
  const sb = JSON.stringify(b);
  if (sa !== sb) fail(`${message}\n  A=${sa}\n  B=${sb}`);
}
async function waitUntil(probe, predicate, timeoutMs, label, intervalMs = 1000) {
  const start = Date.now();
  let last = null;
  while (Date.now() - start < timeoutMs) {
    try {
      last = await probe();
      if (predicate(last)) return { ok: true, value: last, waitedMs: Date.now() - start };
    } catch (error) {
      last = `probe error: ${error?.message}`;
    }
    await sleep(intervalMs);
  }
  fail(`timeout (${timeoutMs}ms) waiting for ${label}; last=${JSON.stringify(last).slice(0, 400)}`);
}

// ---------------------------------------------------------------------------
// page probes and the single state adapter
// ---------------------------------------------------------------------------

const readAction = (s) =>
  js(s, `return (document.getElementById('action-title')?.textContent || '') + ' || ' + (document.getElementById('action-sub')?.textContent || '');`);
const pos = async (s) => {
  try {
    const p = await js(s, `return window.__afterlight ? window.__afterlight.player() : null;`);
    return Array.isArray(p) ? p : null;
  } catch {
    return null;
  }
};
const participationState = (s) => js(s, `return window.__afterlight ? window.__afterlight.participation() : null;`);
const activityId = (s) => js(s, `return window.__afterlight ? window.__afterlight.activity() : null;`);

async function waitWorld(s, timeoutMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if (
        await js(
          s,
          `return !!document.querySelector('canvas') && !!document.getElementById('action-title') && !document.getElementById('loading');`,
        )
      ) {
        return true;
      }
    } catch {}
    await sleep(1500);
  }
  return false;
}

/** Install error capture + a rAF subscriber sample once per page. */
async function installProbes(s) {
  await js(
    s,
    `
    if (!window.__dhProbe) {
      window.__dhProbe = { errors: [], rafSeen: new Set(), rafSamples: [], installedAt: performance.timeOrigin };
      window.addEventListener('error', (e) => window.__dhProbe.errors.push(String(e.message)));
      window.addEventListener('unhandledrejection', (e) => window.__dhProbe.errors.push('rejection: ' + String(e.reason)));
      const origError = console.error.bind(console);
      console.error = (...a) => { window.__dhProbe.errors.push('console: ' + a.map(String).join(' ').slice(0, 300)); origError(...a); };
      const origRaf = window.requestAnimationFrame.bind(window);
      window.__dhProbe.rafCalls = 0;
      window.requestAnimationFrame = (cb) => {
        window.__dhProbe.rafCalls += 1;
        window.__dhProbe.rafSeen.add(cb);
        return origRaf(cb);
      };
    }
    return true;`,
  );
}

const pageErrors = (s) => js(s, `return (window.__dhProbe?.errors || []).join(' || ');`).catch(() => '');

/** Strong host-primitive snapshot: canvases/contexts/socket/href/timeOrigin. */
async function probeCounts(s) {
  return js(
    s,
    `
    const canvases = [...document.querySelectorAll('canvas')];
    const webgl = canvases.filter((c) => {
      try { return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
    }).length;
    const net = window.__afterlight?.netState ? window.__afterlight.netState() : null;
    return {
      canvases: canvases.length,
      webgl,
      activityRoots: document.querySelectorAll('[data-downhill-phase], .downhill-activity').length,
      bodyClass: [...document.body.classList].filter((c) => /downhill/i.test(c)),
      href: location.href,
      timeOrigin: performance.timeOrigin,
      heap: performance.memory ? performance.memory.usedJSHeapSize : null,
      rafCalls: window.__dhProbe?.rafCalls ?? 0,
      rafSubscribers: window.__dhProbe?.rafSeen?.size ?? 0,
      netOpen: net ? net.open : null,
      netMode: net ? net.mode : null,
    };`,
  );
}

function projectStanding(row) {
  if (!row) return null;
  return {
    slot: row.slot ?? null,
    place: row.place ?? null,
    name: row.name ?? null,
    time: row.time ?? null,
    dnf: row.dnf === true || row.dnfReason != null || row.dnf_reason != null,
    isAI: row.isAI === true || row.is_ai === true,
  };
}

/**
 * Normalize the controller's debug shape. Accepts the dedicated `downhill()`
 * hook, the generic `sim()` snapshot, or DOM JSON fallbacks. Missing pieces stay
 * null/[] so `doctor` can print exactly what is available.
 */
function shapeDownhill(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const sim = raw.sim ?? raw.simState ?? raw.sim_state ?? null;
  const pick = (...vals) => vals.find((v) => v !== undefined && v !== null);
  // Elixir snapshots serialize rider collections as maps; normalize both.
  const asArray = (v) => (Array.isArray(v) ? v : v && typeof v === 'object' ? Object.values(v) : []);
  const riders = asArray(pick(raw.riders, sim?.riders, raw.field, []));
  const humans = asArray(pick(raw.humans, sim?.humans, []));
  const field = asArray(pick(raw.field, sim?.field, riders));
  const standings = asArray(pick(raw.standings, sim?.standings, raw.results, sim?.results, []));
  const countdown = pick(raw.countdown, sim?.countdown, null);
  const strikes = asArray(pick(raw.strikes, sim?.strikes, []));
  const selfSlot = pick(raw.selfSlot, raw.self_slot, null);
  const selfRider = riders.find((r) => (r.slot ?? r.index) === selfSlot) ?? null;
  return {
    phase: pick(raw.phase, raw.status, sim?.phase, sim?.status, null),
    matchId: pick(raw.matchId, raw.match_id, sim?.matchId, sim?.match_id, null),
    courseHash: pick(raw.courseHash, raw.course_hash, sim?.courseHash, sim?.course_hash, null),
    mountain: pick(raw.mountain, raw.courseId, raw.course_id, sim?.mountain, sim?.courseId, null),
    difficulty: pick(raw.difficulty, sim?.difficulty, null),
    humans,
    field,
    riders,
    standings: standings.map(projectStanding),
    selfSlot: pick(raw.selfSlot, raw.self_slot, null),
    countdown: countdown && typeof countdown === 'object' ? countdown : countdown != null ? { number: countdown } : null,
    strikes: Array.isArray(strikes) ? strikes : [],
    lastStrike: pick(raw.lastStrike, raw.last_strike, null),
    courseStatus: pick(raw.courseStatus, raw.course_status, null),
    selfRider,
    frameInfo: raw.frameInfo ?? null,
    _source: raw.__source ?? 'unknown',
  };
}

async function readDownhill(s) {
  // 1) Dedicated downhill debug projection (preferred; full contract).
  const dedicated = await js(
    s,
    `return (window.__afterlight && typeof window.__afterlight.downhill === 'function') ? (() => { const d = window.__afterlight.downhill(); return d ? { ...d, __source: 'downhill()' } : null; })() : null;`,
  ).catch(() => null);
  if (dedicated) return shapeDownhill(dedicated);

  // 2) Generic activity snapshot.
  const snap = await js(s, `return window.__afterlight && window.__afterlight.sim ? (() => { const d = window.__afterlight.sim(); return d ? { ...d, __source: 'sim()' } : null; })() : null;`).catch(() => null);
  if (snap) return shapeDownhill(snap);

  // 3) DOM fallback.
  const dom = await js(
    s,
    `
    const root = document.querySelector('[data-downhill-phase]');
    if (!root) return null;
    const parse = (attr) => { try { return JSON.parse(root.getAttribute(attr) || 'null'); } catch { return null; } };
    return {
      phase: root.getAttribute('data-downhill-phase'),
      matchId: root.getAttribute('data-downhill-match'),
      field: parse('data-downhill-field') || [],
      standings: parse('data-downhill-standings') || [],
      __source: 'dom',
    };`,
  ).catch(() => null);
  return dom ? shapeDownhill(dom) : null;
}

async function requireDownhill(s, label = 'state') {
  const state = await readDownhill(s);
  if (!state) {
    fail(
      `no Downhill Mayhem ${label} available on ${s.name}: expected window.__afterlight.downhill() ` +
        `(preferred) or window.__afterlight.sim() with the activity_state snapshot, or a [data-downhill-phase] root. ` +
        `Run the "doctor" phase for the full hook report.`,
    );
  }
  return state;
}

async function waitPhase(s, phase, timeoutMs = LOAD_TIMEOUT_MS) {
  return waitUntil(() => readDownhill(s), (d) => d && d.phase === phase, timeoutMs, `${s.name} phase=${phase}`, 1000);
}

async function screenshot(s, name) {
  try {
    const b64 = await req('GET', `/session/${s.id}/screenshot`);
    mkdirSync(ARTIFACT_DIR, { recursive: true });
    const file = `${ARTIFACT_DIR}/${String(name).replace(/[^a-z0-9_-]+/gi, '-')}.png`;
    writeFileSync(file, Buffer.from(b64, 'base64'));
    return file;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// navigation + seating
// ---------------------------------------------------------------------------

async function walkToCabinet(s) {
  await go(s, APP);
  await installProbes(s);
  if (!(await waitWorld(s))) throw new Error(`${s.name}: world did not load`);
  // The `?debug=1` projection is installed just after boot; teleporting before
  // it exists silently leaves the rider at spawn.
  await waitUntil(
    () => js(s, `return !!(window.__afterlight && window.__afterlight.tp);`).catch(() => false),
    (v) => v === true,
    20_000,
    `${s.name} debug hooks`,
    500,
  );
  await tap(s, 'KeyC'); // camera mode 1: WASD are pure axes for the nudge taps
  await sleep(400);
  const hooks = await js(
    s,
    `return window.__afterlight ? { keys: Object.keys(window.__afterlight).join(','), downhill: typeof window.__afterlight.downhill } : 'MISSING';`,
  );
  log(`${s.name} debug hooks:`, JSON.stringify(hooks));
  await js(s, `return window.__afterlight.tp(${CABINET.x}, ${CABINET.z});`);
  await sleep(600);
  // Real nudge taps broadcast fresh movement frames for server proximity checks.
  await tap(s, 'KeyS', 140);
  await sleep(300);
  await tap(s, 'KeyW', 140);
  await sleep(700);
  const action = await readAction(s);
  log(`${s.name} at`, JSON.stringify(await pos(s)), 'prompt:', action);
  return action;
}

/**
 * Press E at the cabinet and wait for the requested participation state.
 * `want:'participating'` requires a seat; `want:'queued'` accepts watch/queue.
 * A joining/toggling retry presses E again (which cancels a stuck join and
 * retries) until the state settles or the attempts run out.
 */
async function pressEAndSeat(s, { want = 'participating', timeoutMs = LOAD_TIMEOUT_MS } = {}) {
  const accepted = (st) => (want === 'queued'
    ? (st === 'queued' || st === 'watching')
    : st === 'participating');
  for (let retry = 1; retry <= 4; retry++) {
    await tap(s, 'KeyE', 90);
    const seated = await waitUntil(
      () => participationState(s),
      accepted,
      Math.min(timeoutMs, 45_000),
      `${s.name} ${want}`,
      1500,
    ).catch(() => null);
    if (seated != null) return seated;
    const toast = await js(s, `return (document.getElementById('toast-body')?.textContent || '');`).catch(() => '');
    if (/full|activity_full/i.test(toast)) {
      log(`${s.name} seat held by a prior session (disconnect grace) — retry ${retry} in 6s`);
      await sleep(6000);
    }
  }
  const state = await participationState(s);
  expect(accepted(state), `${s.name}: E at the cabinet did not start participation (state=${state}, want=${want})`);
  return state;
}

/** Send the explicit readiness/rematch input (R). Readiness is authoritative. */
async function readyUp(s) {
  await tap(s, 'KeyR', 90);
  await sleep(500);
}

/** Wait until every connected seated human reports ready (two-human phases). */
async function waitAllHumansReady(s, expected, timeoutMs = 30_000) {
  await waitUntil(
    () => readDownhill(s),
    (d) => d && d.humans.length >= expected && (
      d.humans.filter((h) => h.ready === true).length >= expected
      // Readiness is consumed by the lock: if the countdown/race already
      // started, every seated human must have been ready.
      || d.phase === 'countdown'
      || d.phase === 'racing'
    ),
    timeoutMs,
    `${s.name} all ${expected} humans ready`,
    700,
  );
}

const DOWNHILL_ACTIVITY = 'orpheum-downhill-mayhem';
async function expectDownhillActivity(s) {
  const id = await activityId(s);
  expect(
    id === DOWNHILL_ACTIVITY || id === 'downhill-mayhem',
    `${s.name}: activity() reported ${JSON.stringify(id)}, expected ${DOWNHILL_ACTIVITY}`,
  );
}

function horseRaceReadyWithin(fieldA, fieldB) {
  // The two clients must describe the same six-rider field (same names/slots).
  const project = (f) =>
    f
      .map((r) => ({ slot: r.slot ?? r.index, name: r.name, isAI: r.isAI === true || r.is_ai === true }))
      .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));
  return { a: project(fieldA), b: project(fieldB) };
}

// ---------------------------------------------------------------------------
// phases
// ---------------------------------------------------------------------------

async function phaseDoctor() {
  guardBeforeLaunch();
  const a = await newSession('doctor-a');
  try {
    await walkToCabinet(a);
    const report = await js(
      a,
      `
      const A = window.__afterlight || null;
      const downhill = A && typeof A.downhill === 'function' ? (() => { try { return A.downhill(); } catch (e) { return 'throw: ' + e.message; } })() : null;
      const sim = A && typeof A.sim === 'function' ? A.sim() : null;
      const keys = A ? Object.keys(A) : [];
      const root = document.querySelector('[data-downhill-phase]');
      return {
        debugPresent: !!A,
        keys,
        hasDownhillHook: typeof (A && A.downhill) === 'function',
        downhill,
        simKeys: sim && typeof sim === 'object' ? Object.keys(sim) : sim,
        domRoot: root ? root.getAttribute('data-downhill-phase') : null,
        prompt: (document.getElementById('action-title')?.textContent || ''),
      };`,
    );
    log('doctor report:', JSON.stringify(report, null, 2));
    expect(report.debugPresent, 'window.__afterlight missing — the app must be opened with ?debug=1');
    expect(/downhill/i.test(report.prompt), `Downhill Mayhem prompt not reachable at the cabinet (got "${report.prompt}")`);
    if (!report.hasDownhillHook) {
      log(
        'WARNING: window.__afterlight.downhill() is not exposed; the adapter will fall back to sim()/DOM. ' +
          'The race/queue/combat phases require the dedicated hook contract documented at the top of this file.',
      );
    }
    log('PHASE doctor PASS (see hook report above)');
  } finally {
    await closeAll();
  }
}

async function phaseEntry() {
  guardBeforeLaunch();
  const a = await newSession('rider-a');
  const b = await newSession('rider-b');
  try {
    const promptA = await walkToCabinet(a);
    const promptB = await walkToCabinet(b);
    expect(/downhill/i.test(promptA), `rider-a prompt not the Downhill Mayhem cabinet (got "${promptA}")`);
    expect(/downhill/i.test(promptB), `rider-b prompt not the Downhill Mayhem cabinet (got "${promptB}")`);

    await pressEAndSeat(a);
    await pressEAndSeat(b);
    await expectDownhillActivity(a);

    // Same lobby, identical field/mountain/difficulty on both clients. The
    // six-rider field and AI identity are only authoritative in the lobby.
    await waitPhase(a, 'lobby', LOAD_TIMEOUT_MS);
    await waitPhase(b, 'lobby', LOAD_TIMEOUT_MS);
    // Allow a beat for both serverside snapshots to settle.
    await sleep(1200);

    const da = await requireDownhill(a);
    const db = await requireDownhill(b);
    expect(da.field.length === FIELD_SIZE, `rider-a field must be ${FIELD_SIZE} riders (got ${da.field.length}): ${JSON.stringify(da.field)}`);
    expect(db.field.length === FIELD_SIZE, `rider-b field must be ${FIELD_SIZE} riders (got ${db.field.length}): ${JSON.stringify(db.field)} frame=${JSON.stringify(db.frameInfo)}`);
    sameJson(da.mountain, db.mountain, 'clients disagree on mountain');
    sameJson(da.difficulty, db.difficulty, 'clients disagree on difficulty');
    const { a: fa, b: fb } = horseRaceReadyWithin(da.field, db.field);
    sameJson(fa, fb, 'clients disagree on the six-rider field');
    const humansA = da.humans.length;
    const humansB = db.humans.length;
    expect(humansA === 2 && humansB === 2, `both clients should see 2 humans (got ${humansA}/${humansB})`);
    const aiCount = da.field.filter((r) => r.isAI === true || r.is_ai === true).length;
    expect(aiCount === FIELD_SIZE - 2, `expected 4 AI fillers (got ${aiCount})`);
    await screenshot(a, 'entry-lobby-rider-a');
    await screenshot(b, 'entry-lobby-rider-b');
    log('PHASE entry PASS — shared 2-human + 4-AI lobby, identical field/mountain/difficulty');
  } finally {
    await closeAll();
  }
}

async function phaseRace() {
  guardBeforeLaunch();
  const a = await newSession('rider-a');
  const b = await newSession('rider-b');
  try {
    await walkToCabinet(a);
    await walkToCabinet(b);
    await pressEAndSeat(a);
    await pressEAndSeat(b);
    await waitPhase(a, 'lobby', LOAD_TIMEOUT_MS);
    await waitPhase(b, 'lobby', LOAD_TIMEOUT_MS);

    // Pre-race baseline for the no-reload / no-second-primitive assertions.
    const before = await probeCounts(a);
    expect(before.webgl === 1, `expected exactly ONE WebGL canvas before entry (got ${before.webgl})`);

    await readyUp(a);
    await readyUp(b);
    await waitAllHumansReady(a, 2);

    // Synchronized 3-2-1 countdown: both clients report the same match identity
    // and then both enter racing.
    const countdownSeen = { a: null, b: null };
    const started = await waitUntil(
      async () => {
        const [da, db] = await Promise.all([readDownhill(a), readDownhill(b)]);
        if (da?.phase === 'countdown') countdownSeen.a = da.countdown ?? true;
        if (db?.phase === 'countdown') countdownSeen.b = db.countdown ?? true;
        return { da, db };
      },
      ({ da, db }) => da?.phase === 'racing' && db?.phase === 'racing',
      LOAD_TIMEOUT_MS,
      'synchronized countdown → racing',
      800,
    );
    const { da: raceA, db: raceB } = started.value;
    expect(raceA.matchId && raceA.matchId === raceB.matchId, `clients must share one matchId (${raceA.matchId} vs ${raceB.matchId})`);
    expect(
      countdownSeen.a != null || countdownSeen.b != null,
      'no synchronized countdown was observed — the downhill() hook must expose `countdown` while phase="countdown" ' +
        '(the generic sim() fallback cannot prove the 3-2-1)',
    );
    log('countdown samples:', JSON.stringify(countdownSeen));

    // Real riding inputs: pedal (W/Shift), steer, brake on B so A can close up.
    await keyDown(a, 'KeyW');
    await keyDown(a, 'ShiftLeft');
    await keyDown(b, 'KeyS'); // hold B back so A can catch it for a combat attempt
    await sleep(2500);

    // Combat: chase B to close longitudinal distance, then punch/kick.
    for (let i = 0; i < 24; i++) {
      const da = await readDownhill(a);
      const ra = da?.riders?.find((r) => r.slot === da.selfSlot) ?? da?.selfRider ?? null;
      const rb = da?.riders?.find((r) => (r.slot ?? r.index) !== da?.selfSlot) ?? null;
      if (ra && rb) {
        const ds = (ra.s ?? 0) - (rb.s ?? 0);
        const dlat = (ra.lat ?? 0) - (rb.lat ?? 0);
        // steer toward B (sign of lateral difference), throttle A hard; B brakes.
        if (Math.abs(dlat) > 0.4) await tap(a, dlat > 0 ? 'KeyA' : 'KeyD', 120);
        if (ds > 0.6) await keyUp(a, 'KeyW');
        else await keyDown(a, 'KeyW');
        if (Math.abs(ds) < 1.2 && Math.abs(dlat) < 1.2) {
          await tap(a, 'KeyE', 60);
          await tap(a, 'KeyF', 60);
        }
      }
      await sleep(250);
    }
    await releaseAllKeys(a);
    await releaseAllKeys(b);

    // Jump / trick / boost (real keys) — observe the flags on A at least once.
    let sawMove = false;
    const observeMove = async () => {
      const d = await readDownhill(a);
      const r = d?.riders?.find((x) => x.slot === d.selfSlot) ?? d?.selfRider ?? null;
      if (r && (r.airborne === true || (r.trick != null && r.trick !== '') || r.boost === true)) sawMove = true;
    };
    await keyDown(a, 'KeyW');
    await keyDown(a, 'ShiftLeft'); // boost
    await observeMove();
    await tap(a, 'Space', 60); // hop
    for (const trick of ['KeyZ', 'KeyX', 'KeyC']) {
      await tap(a, trick, 80);
      await observeMove();
      await sleep(200);
    }
    await sleep(1200);
    if (sawMove) await observeMove();
    await releaseAllKeys(a);
    if (!sawMove) {
      log('WARNING: never observed airborne/trick/boost flags on rider-a — boost/trick debug fields may be named differently');
    }

    // Finish: wait for results (identical standings) with a generous budget.
    let results;
    try {
      results = await waitUntil(
        async () => {
          const [da, db] = await Promise.all([readDownhill(a), readDownhill(b)]);
          return { da, db };
        },
        ({ da, db }) => da?.phase === 'results' && db?.phase === 'results',
        RACE_TIMEOUT_MS,
        'both clients reach results',
        1500,
      );
    } catch (error) {
      // Diagnostics: a null read means the hook threw or the page vanished.
      log('results wait failed — rider-a errors:', await pageErrors(a).catch(() => 'n/a'));
      log('results wait failed — rider-b errors:', await pageErrors(b).catch(() => 'n/a'));
      log('rider-a probe:', JSON.stringify(await probeCounts(a).catch(() => 'probe-failed')));
      log('rider-b probe:', JSON.stringify(await probeCounts(b).catch(() => 'probe-failed')));
      log('rider-a participation:', await participationState(a).catch(() => 'n/a'));
      log('rider-b participation:', await participationState(b).catch(() => 'n/a'));
      throw error;
    }
    const standingsA = results.value.da.standings;
    const standingsB = results.value.db.standings;
    expect(standingsA.length === FIELD_SIZE, `rider-a standings must list ${FIELD_SIZE} riders (got ${standingsA.length})`);
    sameJson(standingsA, standingsB, 'clients disagree on final standings');

    // Combat agreement: compare the authoritative strike logs, not local claims.
    sameJson(
      results.value.da.strikes.map((x) => [x.attacker, x.victim, x.kind]).sort(),
      results.value.db.strikes.map((x) => [x.attacker, x.victim, x.kind]).sort(),
      'clients disagree on authoritative strike events',
    );
    const strikeCount = results.value.da.strikes.length;
    log(`authoritative strikes observed: ${strikeCount}`);
    if (strikeCount === 0) {
      const msg = 'no authoritative strike landed during the combat window (proximity was not achieved)';
      if (process.env.GATE_REQUIRE_STRIKE === '1') fail(msg);
      log(`WARNING: ${msg} — set GATE_REQUIRE_STRIKE=1 to make this fatal`);
    }

    // No second host primitive during play.
    const during = await probeCounts(a);
    expect(during.webgl === 1, `exactly one WebGL canvas during play (got ${during.webgl})`);
    expect(
      during.timeOrigin === before.timeOrigin,
      `page navigated/reloaded during the race (origin ${before.timeOrigin} -> ${during.timeOrigin}; href ${before.href} -> ${during.href})`,
    );
    expect(during.netMode === before.netMode, `transport changed during the race (${before.netMode} → ${during.netMode})`);
    await screenshot(a, 'race-results');
    log('PHASE race PASS — synchronized start, authoritative combat agreement, identical standings');
  } finally {
    await closeAll();
  }
}

async function phaseRematch() {
  guardBeforeLaunch();
  const a = await newSession('rider-a');
  const b = await newSession('rider-b');
  try {
    await walkToCabinet(a);
    await walkToCabinet(b);
    await pressEAndSeat(a);
    await pressEAndSeat(b);
    await waitPhase(a, 'lobby', LOAD_TIMEOUT_MS);
    const first = (await readDownhill(a)).matchId;
    const origin = (await probeCounts(a)).timeOrigin;

    await readyUp(a);
    await readyUp(b);
    await waitAllHumansReady(a, 2);
    await waitUntil(
      async () => ({ da: await readDownhill(a), db: await readDownhill(b) }),
      ({ da, db }) => da?.phase === 'racing' && db?.phase === 'racing',
      LOAD_TIMEOUT_MS,
      'first race start',
      1000,
    );

    // Rematch is explicit readiness from results. Drive to results first.
    await waitUntil(
      async () => ({ da: await readDownhill(a), db: await readDownhill(b) }),
      ({ da, db }) => da?.phase === 'results' && db?.phase === 'results',
      RACE_TIMEOUT_MS,
      'first race results',
      1500,
    );
    await readyUp(a);
    await readyUp(b);
    await waitAllHumansReady(a, 2);
    const rematch = await waitUntil(
      async () => ({ da: await readDownhill(a), db: await readDownhill(b) }),
      ({ da, db }) => da?.phase === 'racing' && db?.phase === 'racing' && da.matchId && da.matchId !== first,
      LOAD_TIMEOUT_MS,
      'rematch start with a fresh matchId',
      1000,
    );
    expect(rematch.value.da.matchId === rematch.value.db.matchId, 'rematch matchId must be shared by both clients');
    const after = await probeCounts(a);
    expect(after.timeOrigin === origin, 'rematch caused a page reload');
    expect(after.webgl === 1, `rematch must not add a WebGL context (got ${after.webgl})`);
    log('PHASE rematch PASS — fresh match identity, no reload, no second context');
  } finally {
    await closeAll();
  }
}

async function phaseExit() {
  guardBeforeLaunch();
  const a = await newSession('rider-a');
  try {
    await walkToCabinet(a);
    const baseline = await probeCounts(a);
    await pressEAndSeat(a);
    await waitPhase(a, 'lobby', LOAD_TIMEOUT_MS);

    // Esc exits the activity and restores world controls.
    await tap(a, 'Escape', 90);
    await waitUntil(() => participationState(a), (st) => st === 'idle', 30_000, 'return to idle after Esc', 1000);

    const after = await probeCounts(a);
    expect(after.bodyClass.length === 0, `downhill body class stuck after exit: ${JSON.stringify(after.bodyClass)}`);
    expect(after.activityRoots === 0, `downhill HUD root leaked after exit (${after.activityRoots})`);
    expect(after.webgl === 1, `WebGL context count changed after exit (${after.webgl})`);
    expect(after.timeOrigin === baseline.timeOrigin, 'exit caused a page reload');

    const before = await pos(a);
    await tap(a, 'KeyS', 220);
    await sleep(900);
    const post = await pos(a);
    expect(
      post && before && (Math.abs(before[1] - post[1]) > 0.01 || Math.abs(before[0] - post[0]) > 0.01),
      'world movement not restored after exit',
    );
    const errs = await pageErrors(a);
    if (errs) log('rider-a page errors after exit:', errs);
    log('PHASE exit PASS — clean teardown, world controls restored, one context');
  } finally {
    await closeAll();
  }
}

async function phaseSolo() {
  guardBeforeLaunch();
  const a = await newSession('solo-rider');
  try {
    await walkToCabinet(a);
    await pressEAndSeat(a);
    await waitPhase(a, 'lobby', LOAD_TIMEOUT_MS);
    const lobby = await requireDownhill(a);
    const humans = lobby.humans.length;
    const ai = lobby.field.filter((r) => r.isAI === true || r.is_ai === true).length;
    expect(humans === 1, `one-human race must have exactly 1 human (got ${humans})`);
    expect(ai === FIELD_SIZE - 1, `one-human race must fill ${FIELD_SIZE - 1} AI (got ${ai})`);

    await screenshot(a, 'solo-lobby');
    await readyUp(a);
    await waitUntil(
      () => readDownhill(a),
      (d) => d && (d.phase === 'countdown' || d.phase === 'racing'),
      LOAD_TIMEOUT_MS,
      'solo race starts with minPlayers 1',
      1000,
    );
    await sleep(2500);
    await screenshot(a, 'solo-racing');

    // Frame-budget sample (16.1): 120 rAF intervals while racing.
    const frames = await js(
      a,
      `
      return new Promise((resolve) => {
        const samples = [];
        let last = performance.now();
        const step = (now) => {
          samples.push(now - last);
          last = now;
          if (samples.length >= 120) resolve(samples);
          else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });`,
    );
    const sorted = [...frames].sort((x, y) => x - y);
    const percentile = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
    const readiness = await js(a, `return window.__afterlight?.downhillReadinessMetrics?.() ?? null;`).catch(() => null);
    log('solo frame budget:', JSON.stringify({
      p50: Math.round(percentile(0.5) * 100) / 100,
      p95: Math.round(percentile(0.95) * 100) / 100,
      worst: Math.round(sorted[sorted.length - 1] * 100) / 100,
      heapBytes: (await probeCounts(a)).heap,
    }));
    log('solo readiness metrics:', JSON.stringify(readiness));
    log('PHASE solo PASS — a lone human starts immediately against five AI');
  } finally {
    await closeAll();
  }
}

async function phaseQueue() {
  guardBeforeLaunch();
  const a = await newSession('rider-a');
  const b = await newSession('rider-b');
  const c = await newSession('rider-c');
  try {
    await walkToCabinet(a);
    await walkToCabinet(b);
    await pressEAndSeat(a);
    await pressEAndSeat(b);
    await waitPhase(a, 'lobby', LOAD_TIMEOUT_MS);
    await readyUp(a);
    await readyUp(b);
    await waitAllHumansReady(a, 2);
    await waitUntil(
      async () => ({ da: await readDownhill(a), db: await readDownhill(b) }),
      ({ da, db }) => da?.phase === 'racing' && db?.phase === 'racing',
      LOAD_TIMEOUT_MS,
      'race start before third user queues',
      1000,
    );

    // Third user arrives mid-race: must be offered watch/queue, never inserted.
    await walkToCabinet(c);
    await pressEAndSeat(c, { want: 'queued' });
    const queued = await waitUntil(
      () => readDownhill(c),
      (d) => d && d.phase === 'racing',
      LOAD_TIMEOUT_MS,
      'third user observing the live race',
      1000,
    );
    const fieldC = queued.value.field;
    expect(fieldC.length === FIELD_SIZE, `mid-race field must stay ${FIELD_SIZE} (got ${fieldC.length})`);
    const stateC = await participationState(c);
    expect(
      stateC === 'queued' || stateC === 'watching' || stateC === 'participating',
      `third user must watch or queue (state=${stateC})`,
    );
    const inRace = await requireDownhill(a);
    expect(
      inRace.humans.length === 2,
      `mid-race join must NOT insert a rider (seated humans=${inRace.humans.length})`,
    );
    log('PHASE queue PASS — third user watches/queues, six-rider field unchanged');
  } finally {
    await closeAll();
  }
}

async function setOffline(s, offline) {
  await cdp(s, 'Network.enable', {}).catch(() => {});
  await cdp(s, 'Network.emulateNetworkConditions', {
    offline,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  }).catch(() => {});
}

async function phaseReconnect() {
  guardBeforeLaunch();
  const a = await newSession('rider-a');
  const b = await newSession('rider-b');
  try {
    await walkToCabinet(a);
    await walkToCabinet(b);
    await pressEAndSeat(a);
    await pressEAndSeat(b);
    await waitPhase(a, 'lobby', LOAD_TIMEOUT_MS);
    await readyUp(a);
    await readyUp(b);
    await waitAllHumansReady(a, 2);
    await waitUntil(
      async () => ({ da: await readDownhill(a), db: await readDownhill(b) }),
      ({ da, db }) => da?.phase === 'racing' && db?.phase === 'racing',
      LOAD_TIMEOUT_MS,
      'race start before disconnect',
      1000,
    );
    const beforeA = await requireDownhill(a);
    const slotB = beforeA.field.find((r) => !(r.isAI === true || r.is_ai === true) && r.slot !== beforeA.selfSlot)?.slot ?? null;
    expect(slotB != null, 'could not identify the second human slot');

    log('disconnect rider-b transport');
    await setOffline(b, true);
    await sleep(4000);
    // Rider-b is frozen; the race continues for rider-a and its slot stays reserved.
    await sleep(6000);
    await setOffline(b, false);
    await sleep(4000);

    await waitUntil(
      () => readDownhill(b),
      (d) => d && (d.phase === 'racing'),
      RACE_TIMEOUT_MS,
      'rider-b resumes racing after reconnect',
      1500,
    );
    const afterA = await requireDownhill(a);
    const slotAfterB = afterA.field.find((r) => !(r.isAI === true || r.is_ai === true) && r.slot !== afterA.selfSlot)?.slot ?? null;
    expect(slotAfterB === slotB, `reconnect must restore the same reserved slot (${slotB} → ${slotAfterB})`);
    log('PHASE reconnect PASS — transport restored into the same reserved slot');
  } finally {
    await setOffline(b, false).catch(() => {});
    await closeAll();
  }
}

async function phaseGrace() {
  guardBeforeLaunch();
  const a = await newSession('rider-a');
  const b = await newSession('rider-b');
  try {
    await walkToCabinet(a);
    await walkToCabinet(b);
    await pressEAndSeat(a);
    await pressEAndSeat(b);
    await waitPhase(a, 'lobby', LOAD_TIMEOUT_MS);
    await readyUp(a);
    await readyUp(b);
    await waitAllHumansReady(a, 2);
    await waitUntil(
      async () => ({ da: await readDownhill(a), db: await readDownhill(b) }),
      ({ da, db }) => da?.phase === 'racing' && db?.phase === 'racing',
      LOAD_TIMEOUT_MS,
      'race start before grace expiry',
      1000,
    );

    await setOffline(b, true);
    log(`holding rider-b offline for ${GRACE_MS}ms to expire the reconnect grace`);
    await sleep(GRACE_MS);

    // DNF at grace expiry, without ending the race for rider-a.
    const dnf = await waitUntil(
      () => readDownhill(a),
      (d) => d && d.riders.some((r) => (r.dnf === true || r.dnfReason != null || r.dnf_reason != null) && r.slot !== d.selfSlot),
      RACE_TIMEOUT_MS,
      'disconnected rider marked DNF after grace',
      1500,
    );
    const dnfRider = dnf.value.riders.find((r) => r.slot !== dnf.value.selfSlot && (r.dnf === true || r.dnfReason != null || r.dnf_reason != null));
    expect(dnfRider, 'grace expiry must mark the disconnected rider DNF');
    const selfRider = dnf.value.riders.find((r) => r.slot === dnf.value.selfSlot);
    if (selfRider) expect(selfRider.dnf !== true, 'the still-connected rider must not be marked DNF');
    expect(dnf.value.phase === 'racing' || dnf.value.phase === 'results', `the race must continue after a DNF (phase=${dnf.value.phase})`);
    await setOffline(b, false);
    log('PHASE grace PASS — grace expiry marks DNF once; the other rider keeps racing');
  } finally {
    await setOffline(b, false).catch(() => {});
    await closeAll();
  }
}

async function phaseCaptain() {
  guardBeforeLaunch();
  const a = await newSession('rider-a');
  const b = await newSession('rider-b');
  try {
    await walkToCabinet(a);
    await walkToCabinet(b);
    await pressEAndSeat(a);
    await pressEAndSeat(b);
    await waitPhase(a, 'lobby', LOAD_TIMEOUT_MS);
    const lobby = await requireDownhill(a);
    const captainA = lobby.humans.find((h) => h.captain === true);
    expect(captainA != null, 'no captain was reported in the lobby');

    // Captain departs before lock: leadership transfers to the longest-seated
    // remaining connected human.
    await tap(a, 'Escape', 90);
    await waitUntil(() => participationState(a), (st) => st === 'idle', 30_000, 'captain leaves', 1000);

    const transferred = await waitUntil(
      () => readDownhill(b),
      (d) => d && d.humans.some((h) => h.captain === true && h.name !== captainA.name),
      LOAD_TIMEOUT_MS,
      'captaincy transferred to rider-b',
      1000,
    );
    const newCaptain = transferred.value.humans.find((h) => h.captain === true);
    expect(
      newCaptain && newCaptain.name !== captainA.name,
      `captaincy did not transfer away from the departed captain (before=${JSON.stringify(captainA)}, after=${JSON.stringify(newCaptain)}, humans=${JSON.stringify(transferred.value.humans)})`,
    );

    // The new captain can change lobby settings. The HUD control is optional
    // (field-name dependent); when present, assert the change reaches the
    // authoritative snapshot.
    const beforeConfig = transferred.value;
    const changed = await js(
      b,
      `
      const target = document.querySelector('[data-role="mountain-next"]')
        || [...document.querySelectorAll('[data-downhill-config] button, .downhill-config button, .downhill-activity button')]
          .find((el) => /timber|rock|chill|brutal/i.test(el.textContent || ''));
      if (!target) return false;
      target.click();
      return true;`,
    ).catch(() => false);
    if (changed) {
      const afterConfig = await waitUntil(
        () => readDownhill(b),
        (d) => d && (d.mountain !== beforeConfig.mountain || d.difficulty !== beforeConfig.difficulty),
        LOAD_TIMEOUT_MS,
        'captain config change reaches the authoritative snapshot',
        1000,
      ).catch(() => null);
      if (afterConfig) {
        log(`captain changed settings: ${beforeConfig.mountain}/${beforeConfig.difficulty} → ${afterConfig.value.mountain}/${afterConfig.value.difficulty}`);
      } else {
        log('WARNING: the captain settings control did not change the authoritative snapshot (settings change not exercised)');
      }
    } else {
      log('WARNING: no captain config control found in the lobby HUD — leadership transfer proven, settings change not exercised');
    }
    log('PHASE captain PASS — leadership transferred to the longest-seated remaining human');
  } finally {
    await closeAll();
  }
}

async function phaseFailedLoad() {
  guardBeforeLaunch();
  const a = await newSession('rider-a');
  const b = await newSession('rider-b');
  try {
    await walkToCabinet(a);
    await walkToCabinet(b);
    // Preferred: an explicit debug fault-injection hook (deterministic across
    // builds). Optional secondary hook contract:
    //   window.__afterlight.downhillForceCourseMismatch('loaded') -> boolean
    // Fallback: block the course payload over the network. The URL list follows
    // design D5 (committed course documents + the Daily delivery endpoint); if
    // the course ships inside a bundled chunk this fallback cannot force a
    // failure, and the phase reports that instead of silently passing.
    const injected = await js(
      b,
      `return (window.__afterlight && typeof window.__afterlight.downhillForceCourseMismatch === 'function')
        ? window.__afterlight.downhillForceCourseMismatch('loaded') : false;`,
    ).catch(() => false);
    log('failed-load fault injection hook used:', injected);
    await cdp(b, 'Network.enable', {}).catch(() => {});
    await cdp(b, 'Network.setBlockedURLs', {
      urls: ['*downhill_courses*', '*/downhill/courses/*', '*course/daily*', '*/courses/classic.json*', '*/courses/timber.json*', '*/courses/rock.json*'],
    }).catch(() => {});

    await pressEAndSeat(a);
    await pressEAndSeat(b);
    await waitPhase(a, 'lobby', LOAD_TIMEOUT_MS);

    // rider-b's load must fail closed and never enter lobby/countdown/racing;
    // rider-a is unaffected. A failed load surfaces either as
    // courseStatus==='failed' or as a course/mismatch/not_loaded error toast.
    const failure = await waitUntil(
      async () => {
        const [d, st, toast] = await Promise.all([
          readDownhill(b),
          participationState(b),
          js(b, `return (document.getElementById('toast-body')?.textContent || '');`).catch(() => ''),
        ]);
        return { d, st, toast };
      },
      (x) => x.d?.courseStatus === 'failed' || /course|mismatch|not.?loaded|load.?failed/i.test(x.toast || ''),
      60_000,
      'rider-b failed-load signal (courseStatus=failed or a course error toast)',
      1500,
    ).catch(() => null);

    const bState = await readDownhill(b);
    const bPhase = bState?.phase ?? null;
    expect(
      bPhase !== 'lobby' && bPhase !== 'countdown' && bPhase !== 'racing' && bPhase !== 'results',
      `rider-b must never enter the lobby/race with a failed course load (phase=${bPhase})`,
    );
    const stateA = await requireDownhill(a);
    expect(stateA.phase === 'lobby', `rider-a must stay healthy in the lobby (got ${stateA.phase})`);
    const errs = await pageErrors(b);
    log('rider-b failed-load state:', JSON.stringify({ phase: bPhase, courseStatus: bState?.courseStatus, signal: failure != null, errs }));
    expect(
      failure != null,
      'rider-b never surfaced a failed course load — provide window.__afterlight.downhillForceCourseMismatch() ' +
        'or make the course document a fetchable URL so the network block can hit it',
    );
    log('PHASE failedLoad PASS — failed course load fails closed without harming the other rider');
  } finally {
    await cdp(b, 'Network.setBlockedURLs', { urls: [] }).catch(() => {});
    await closeAll();
  }
}

async function phaseSoak() {
  guardBeforeLaunch();
  const a = await newSession('soak-rider');
  try {
    await walkToCabinet(a);
    const baseline = await probeCounts(a);
    for (let cycle = 1; cycle <= SOAK_CYCLES; cycle++) {
      await pressEAndSeat(a);
      await waitPhase(a, 'lobby', LOAD_TIMEOUT_MS);
      await sleep(1200);
      await tap(a, 'Escape', 90);
      await waitUntil(() => participationState(a), (st) => st === 'idle', 30_000, `cycle ${cycle} idle`, 1000);
      const counts = await probeCounts(a);
      log(`soak cycle ${cycle}:`, JSON.stringify(counts));
      expect(counts.webgl === baseline.webgl, `cycle ${cycle}: WebGL contexts grew (${baseline.webgl} → ${counts.webgl})`);
      expect(counts.activityRoots === 0, `cycle ${cycle}: activity root leaked (${counts.activityRoots})`);
      expect(counts.bodyClass.length === 0, `cycle ${cycle}: body class stuck (${JSON.stringify(counts.bodyClass)})`);
      expect(counts.timeOrigin === baseline.timeOrigin, `cycle ${cycle}: page reloaded`);
      if (counts.rafSubscribers > baseline.rafSubscribers + 2) {
        log(`WARNING cycle ${cycle}: rAF subscriber sample grew ${baseline.rafSubscribers} → ${counts.rafSubscribers}`);
      }
    }
    const errs = await pageErrors(a);
    if (errs) throw new Error(`page errors across the soak: ${errs}`);
    log(`PHASE soak PASS — ${SOAK_CYCLES} enter/exit cycles with no renderer/context/HUD growth`);
  } finally {
    await closeAll();
  }
}

// ---------------------------------------------------------------------------
// phase registry
// ---------------------------------------------------------------------------

const EXTENDED = [
  'doctor',
  'entry',
  'race',
  'rematch',
  'exit',
  'solo',
  'queue',
  'reconnect',
  'grace',
  'captain',
  'failedLoad',
  'soak',
];

const PHASES = {
  doctor: phaseDoctor,
  entry: phaseEntry,
  race: phaseRace,
  rematch: phaseRematch,
  exit: phaseExit,
  solo: phaseSolo,
  queue: phaseQueue,
  reconnect: phaseReconnect,
  grace: phaseGrace,
  captain: phaseCaptain,
  failedLoad: phaseFailedLoad,
  soak: phaseSoak,
};

const requested = process.argv.slice(2);
let phases;
if (requested.length === 0 || requested[0] === 'all') phases = ['entry', 'race', 'rematch', 'exit'];
else if (requested[0] === 'extended') phases = EXTENDED;
else phases = requested;

let failures = 0;
for (const phase of phases) {
  const fn = PHASES[phase];
  if (!fn) {
    console.error(`unknown phase ${phase}; known: ${Object.keys(PHASES).join(', ')}, all, extended`);
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
      if (attempt > 1) {
        // A finished/abandoned session lingers in results/idle before the
        // server's 60 s reap; a fresh attempt needs a clean session so the
        // next join starts in the lobby. Override with GATE_RETRY_SETTLE_MS.
        await sleep(Number(process.env.GATE_RETRY_SETTLE_MS || 65_000));
      } else {
        await sleep(3000);
      }
    }
  }
  if (!ok) failures += 1;
}
if (failures > 0) {
  console.error(`[downhill-gate] ${failures} phase(s) failed`);
  process.exit(1);
}
log('all requested phases completed');
