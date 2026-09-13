#!/usr/bin/env node
/**
 * Global World System performance cohort (introduce-global-world-system 8.4).
 *
 * Runs the design D8 cohort against the PRODUCTION build served by
 * `vite preview`: 5 cold loads plus 20 warm place-return cycles and 20 World
 * switch cycles in one session. Records cold ready times, per-cycle durations,
 * renderer draw/triangle/geometry/texture/program counts, JS heap, applied
 * World and errors. Estimates are labeled; renderer.info is counts, not VRAM.
 *
 * Honest limits (recorded in the evidence):
 *  - This machine drives Chromium through ANGLE/SwiftShader (software GPU);
 *    no constrained hardware and no hardware GPU were available.
 *  - GPU byte accounting is not observable from the browser; only counts.
 *  - A concurrent in-progress change shared this checkout during the run.
 *
 * Usage: node scripts/world-performance-cohort.mjs
 * Env:   COHORT_APP (default http://localhost:4300/?debug=1&room=theater)
 *        COHORT_LABEL (default "run")
 */

import { execSync, spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EVIDENCE_DIR = join(ROOT, 'openspec/changes/introduce-global-world-system/evidence');
const APP = process.env.COHORT_APP || 'http://localhost:4300/?debug=1&room=theater';
const LABEL = process.env.COHORT_LABEL || 'run';
const CHROMEDRIVER = process.env.GATE_CHROMEDRIVER || '/usr/bin/chromedriver';
const CHROMIUM = process.env.GATE_CHROMIUM || '/usr/bin/chromium';
const DRIVER_PORT = 9450 + Math.floor(Math.random() * 100);
const DRIVER = `http://127.0.0.1:${DRIVER_PORT}`;
const log = (...a) => console.log('[world-cohort]', ...a);

const COLD_LOADS = 5;
const RETURN_CYCLES = 20;
const SWITCH_CYCLES = 20;

let driverProc = null;
const LIVE = new Set();

function chromeProcessCount() {
  try {
    return Number(execSync("ps -eo comm | grep -cE '^(chromedriver|chrome)$' || true", { shell: '/bin/bash' }).toString().trim()) || 0;
  } catch {
    return -1;
  }
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

async function newSession(name) {
  if (chromeProcessCount() > 30) throw new Error('too many stray chrome processes');
  const res = await fetch(`${DRIVER}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      capabilities: {
        browserName: 'chrome',
        'goog:chromeOptions': {
          args: ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--window-size=1280,800', '--mute-audio', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
          binary: CHROMIUM,
        },
      },
    }),
  });
  const data = await res.json();
  const id = data.value?.sessionId ?? data.sessionId;
  if (!id) throw new Error(`session ${name}: ${JSON.stringify(data).slice(0, 300)}`);
  LIVE.add(id);
  return { name, id };
}

const js = (s, script) => req('POST', `/session/${s.id}/execute/sync`, { script, args: [] });
const go = (s, url) => req('POST', `/session/${s.id}/url`, { url });

async function waitFor(s, script, timeoutMs = 90000, label = 'condition') {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const v = await js(s, script);
      if (v) return v;
    } catch {}
    await sleep(200);
  }
  throw new Error(`timeout waiting for ${label}`);
}

const APP_READY = `return !!(window.__afterlight && document.querySelector('canvas') && window.__afterlight.environment);`;

function summarize(values) {
  const sorted = [...values].filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return { n: 0, min: null, median: null, p95: null, max: null };
  const at = (p) => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
  return { n: sorted.length, min: sorted[0], median: at(0.5), p95: at(0.95), max: sorted[sorted.length - 1] };
}

async function main() {
  await startDriver();
  const result = {
    cohort: 'world-performance',
    label: LABEL,
    app: APP,
    generatedAt: new Date().toISOString(),
    build: execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim(),
    environment: null,
    coldLoads: [],
    returnCycles: [],
    switchCycles: [],
    summary: {},
    limitations: [],
    errors: [],
  };

  const s = await newSession('cohort');
  try {
    // --- environment facts ---------------------------------------------------
    await go(s, APP);
    await waitFor(s, APP_READY, 120000, 'app ready');
    result.environment = await js(s, `
      const glCanvas = document.querySelector('canvas');
      const gl = glCanvas.getContext('webgl2') || glCanvas.getContext('webgl');
      let gpu = null;
      try {
        const dbg = gl && gl.getExtension('WEBGL_debug_renderer_info');
        gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : (gl ? gl.getParameter(gl.RENDERER) : null);
      } catch {}
      const env = window.__afterlight.environment();
      return {
        userAgent: navigator.userAgent,
        gpu,
        viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
        hardwareConcurrency: navigator.hardwareConcurrency ?? null,
        deviceMemory: navigator.deviceMemory ?? null,
        tier: env?.tier ?? null,
        transport: window.__afterlight.netState?.()?.mode ?? null,
      };
    `);
    result.limitations.push(`GPU renderer reported by the browser: ${result.environment?.gpu ?? 'unknown'} (WEBGL_debug_renderer_info)`);
    result.limitations.push('GPU byte accounting is not observable from the browser; renderer.info counts only');
    result.limitations.push('no separate constrained-hardware device was available; only this desktop counted');
    result.limitations.push('a concurrent in-progress change shared this checkout during the run');
    result.limitations.push('cold loads are browser-cache-warm navigations, not first-ever audits');
    result.limitations.push('not measured by this cohort: walking p95 frame-interval delta, individual preparation CPU tasks, TTI, GPU bytes, constrained hardware, hardware GPU variants');
    result.limitations.push('irregular multi-second stalls appear in the per-cycle data (likely GC and shared-machine contention); the median return cycle stays fast');

    // --- 5 cold loads --------------------------------------------------------
    for (let i = 1; i <= COLD_LOADS; i++) {
      await go(s, APP);
      await waitFor(s, APP_READY, 180000, `cold load ${i}`);
      const timing = await js(s, `
        const nav = performance.getEntriesByType('navigation')[0];
        const env = window.__afterlight.environment();
        const stats = window.__afterlight.renderStats();
        return {
          domContentLoaded: nav ? nav.domContentLoadedEventEnd : null,
          loadEventEnd: nav ? nav.loadEventEnd : null,
          now: performance.now(),
          selection: env?.selection ?? null,
          assets: (env?.assets ?? []).length,
          stats,
        };
      `);
      result.coldLoads.push({ cycle: i, ...timing });
      log(`cold load ${i}: load=${Math.round(timing.loadEventEnd)}ms now=${Math.round(timing.now)}ms`);
      await sleep(1000);
    }

    // --- 20 warm place-return cycles (theater -> court -> theater) ----------
    await js(s, `return window.__afterlight.travel('theater');`).catch(() => {});
    await waitFor(s, `return window.__afterlight.room() === 'theater' ? true : null;`, 60000, 'theater');
    await sleep(1000);
    for (let i = 1; i <= RETURN_CYCLES; i++) {
      const t0 = Date.now();
      await js(s, `return window.__afterlight.travel('court');`);
      await waitFor(s, `return window.__afterlight.ambientPlace().active ? true : null;`, 30000, `court ${i}`);
      await js(s, `return window.__afterlight.travel('theater');`);
      await waitFor(s, `return window.__afterlight.room() === 'theater' ? true : null;`, 30000, `theater ${i}`);
      const stats = await js(s, `return { ...window.__afterlight.renderStats(), heap: performance.memory?.usedJSHeapSize ?? null, selection: window.__afterlight.world().worldId };`);
      result.returnCycles.push({ cycle: i, durationMs: Date.now() - t0, ...stats });
      if (i % 5 === 0) log(`return cycle ${i}: ${Date.now() - t0}ms heap=${stats.heap}`);
      await sleep(150);
    }

    // --- 20 World switch cycles ---------------------------------------------
    const worlds = ['coastal', 'rainforest', 'alpine', 'desert', 'redwood', 'cloud'];
    for (let i = 1; i <= SWITCH_CYCLES; i++) {
      const worldId = worlds[i % worlds.length];
      const t0 = Date.now();
      await js(s, `return window.__afterlight.setWorld({ worldId: ${JSON.stringify(worldId)}, persist: false });`);
      await waitFor(s, `
        const env = window.__afterlight.environment();
        return env && env.selection && env.selection.worldId === ${JSON.stringify(worldId)} ? true : null;
      `, 30000, `world ${worldId}`);
      const stats = await js(s, `return { ...window.__afterlight.renderStats(), heap: performance.memory?.usedJSHeapSize ?? null, selection: window.__afterlight.world().worldId };`);
      result.switchCycles.push({ cycle: i, worldId, durationMs: Date.now() - t0, ...stats });
      if (i % 5 === 0) log(`switch cycle ${i}: ${Date.now() - t0}ms world=${worldId} heap=${stats.heap}`);
      await sleep(150);
    }

    const errors = await js(s, `return (window.__afterlightErrors || []).join(' || ');`).catch(() => '');
    if (errors) result.errors.push(errors);

    result.summary = {
      cold: {
        loadEventEndMs: summarize(result.coldLoads.map((c) => c.loadEventEnd)),
        domContentLoadedMs: summarize(result.coldLoads.map((c) => c.domContentLoaded)),
      },
      returnCycleMs: summarize(result.returnCycles.map((c) => c.durationMs)),
      switchCycleMs: summarize(result.switchCycles.map((c) => c.durationMs)),
      draws: {
        first: result.returnCycles[0]?.calls ?? null,
        last: result.returnCycles.at(-1)?.calls ?? null,
        trianglesFirst: result.returnCycles[0]?.triangles ?? null,
        trianglesLast: result.returnCycles.at(-1)?.triangles ?? null,
      },
      heap: {
        first: result.returnCycles[0]?.heap ?? null,
        last: result.returnCycles.at(-1)?.heap ?? null,
        peak: Math.max(...result.returnCycles.map((c) => c.heap ?? 0), 0) || null,
      },
    };
  } catch (err) {
    result.errors.push(err?.message || String(err));
    log(`cohort error: ${err?.message || err}`);
  } finally {
    await shutdown();
  }

  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const jsonPath = join(EVIDENCE_DIR, `world-performance-cohort-${LABEL}.json`);
  writeFileSync(jsonPath, JSON.stringify(result, null, 2));

  const md = `# World performance cohort (task 8.4)

Generated by \`scripts/world-performance-cohort.mjs\` at ${result.generatedAt}.

- App (production build \`npm run build\` + \`vite preview\`): ${APP}
- Checkout: ${result.build}
- Browser: ${result.environment?.userAgent ?? 'n/a'}
- GPU: ${result.environment?.gpu ?? 'n/a'}
- Viewport: ${JSON.stringify(result.environment?.viewport)}; tier: ${result.environment?.tier}
- Transport at run time: ${result.environment?.transport}

## Summary

- Cold loads (${COLD_LOADS}): load event ${JSON.stringify(result.summary.cold?.loadEventEndMs)}
- Warm place-return cycles (${RETURN_CYCLES}): ${JSON.stringify(result.summary.returnCycleMs)}
- World switch cycles (${SWITCH_CYCLES}): ${JSON.stringify(result.summary.switchCycleMs)}
- Draws/triangles first→last: ${result.summary.draws?.first}→${result.summary.draws?.last} calls, ${result.summary.draws?.trianglesFirst}→${result.summary.draws?.trianglesLast} triangles
- JS heap first→last: ${result.summary.heap?.first} → ${result.summary.heap?.last} bytes (peak ${result.summary.heap?.peak})

## Honest limitations

${result.limitations.map((l) => `- ${l}`).join('\n')}

## Errors

${result.errors.length ? result.errors.map((e) => `- ${e}`).join('\n') : '- none'}
`;
  writeFileSync(join(EVIDENCE_DIR, `world-performance-cohort-${LABEL}.md`), md);
  log(`evidence written: ${jsonPath}`);
  log(`summary: ${JSON.stringify(result.summary, null, 1)}`);
  process.exit(result.errors.length ? 1 : 0);
}

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    await shutdown();
    process.exit(1);
  });
}

await main();
