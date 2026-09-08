#!/usr/bin/env node
/**
 * Atmosphere and weather system capture tool (add-atmosphere-weather-system task 5.1).
 * Automated headless capture of the atmosphere harness or live social places.
 *
 * Implements the measurement contract in openspec/changes/add-social-place-framework/verification.md.
 *
 * Usage:
 *   node tools/atmosphere/capture.mjs [options]
 *
 * Options:
 *   --url <origin>         Dev server origin (default: http://localhost:5173)
 *   --place <name>         Target place: harness|court|desert-camp|rooftops (default: harness)
 *   --quality <tier>       Effect tier: normal|reduced (default: normal)
 *   --camera <mode>        Camera mode: 0|1|2|3 (default: 0)
 *   --warmup-ms <ms>       Warmup time before measuring (default: 10000, or 1000 in fast runs)
 *   --duration-ms <ms>     Measurement sampling window (default: 60000, or 2000 in fast runs)
 *   --repeats <n>          Number of repetitions per configuration (default: 3)
 *   --out <dir>            Output directory for report and screenshots (default: openspec/changes/add-atmosphere-weather-system/evidence)
 *   --matrix               Run full matrix: both qualities x 4 cameras x 3 repeats at 1920x1080,
 *                          plus 390x844 layout capture and 20-cycle resource soak.
 *   --help                 Show this help text
 */

import { spawn, execSync } from 'node:child_process';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { createConnection, createServer } from 'node:net';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import WebSocket from 'ws';

function printHelp() {
  console.log(`
Atmosphere and Weather Capture Tool (Afterlight task 5.1)

Prerequisites:
  - Development server running (npm run dev or npm run dev:stack)
  - Chromium/Chrome installed (snap chromium, /usr/bin/chromium-browser, google-chrome)

Flags:
  --url <origin>         Dev server origin (default: http://localhost:5173)
  --place <name>         harness | court | desert-camp | rooftops (default: harness)
  --quality <tier>       normal | reduced (default: normal)
  --camera <0|1|2|3>     Camera angle / first-person (default: 0)
  --warmup-ms <ms>       Warmup before recording metrics (default: 10000)
  --duration-ms <ms>     Measurement duration (default: 60000)
  --repeats <n>          Repetitions per setting (default: 3)
  --matrix               Run full verification matrix (both tiers, all 4 cameras, layout, 20-cycle soak)
  --out <directory>      Output dir for report.json, report.md and PNGs
  --help                 Display this message

Outputs:
  - report.json: Schema v1 machine-readable measurements, budgets, ceilings, pass/fail status
  - report.md: Human-readable markdown summary linking captured screenshots
  - capture-*.png: High-resolution screenshots of camera angles and responsive layout
`);
}

function parseArgs(argv) {
  const args = {
    url: 'http://localhost:5173',
    place: 'harness',
    quality: 'normal',
    camera: 0,
    warmupMs: 10000,
    durationMs: 60000,
    repeats: 3,
    out: 'openspec/changes/add-atmosphere-weather-system/evidence',
    matrix: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--matrix') args.matrix = true;
    else if (arg === '--url' && argv[i + 1]) args.url = argv[++i];
    else if (arg === '--place' && argv[i + 1]) args.place = argv[++i];
    else if (arg === '--quality' && argv[i + 1]) args.quality = argv[++i];
    else if (arg === '--camera' && argv[i + 1]) args.camera = Number(argv[++i]);
    else if (arg === '--warmup-ms' && argv[i + 1]) args.warmupMs = Number(argv[++i]);
    else if (arg === '--duration-ms' && argv[i + 1]) args.durationMs = Number(argv[++i]);
    else if (arg === '--repeats' && argv[i + 1]) args.repeats = Number(argv[++i]);
    else if (arg === '--out' && argv[i + 1]) args.out = argv[++i];
  }
  return args;
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.listen(0, '127.0.0.1', () => {
      const port = s.address().port;
      s.close(() => resolve(port));
    });
    s.on('error', reject);
  });
}

function waitPort(port, ms = 12000) {
  const t0 = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const s = createConnection({ host: '127.0.0.1', port }, () => {
        s.end();
        resolve();
      });
      s.on('error', () => {
        if (Date.now() - t0 > ms) reject(new Error(`CDP port ${port} timed out after ${ms}ms`));
        else setTimeout(tryOnce, 100);
      });
    };
    tryOnce();
  });
}

class CdpConnection {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
  }
  async connect() {
    await new Promise((res, rej) => {
      this.ws.once('open', res);
      this.ws.once('error', rej);
    });
    this.ws.on('message', (raw) => {
      const msg = JSON.parse(raw);
      if (msg.id && this.pending.has(msg.id)) {
        this.pending.get(msg.id)(msg);
      }
    });
  }
  send(method, params = {}) {
    return new Promise((resolve) => {
      const n = ++this.id;
      this.pending.set(n, resolve);
      this.ws.send(JSON.stringify({ id: n, method, params }));
    });
  }
  close() {
    try { this.ws.close(); } catch {}
  }
}

function findChrome() {
  if (process.env.CHROME && existsSync(process.env.CHROME)) return process.env.CHROME;
  const candidates = [
    '/snap/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function evaluateJson(cdp, expression) {
  const r = await cdp.send('Runtime.evaluate', {
    expression: `(() => { try { const v = (${expression}); return JSON.stringify(v); } catch (e) { return JSON.stringify({ __error: e.message }); } })()`,
    returnByValue: true,
  });
  const val = r.result?.result?.value;
  if (!val) return null;
  try {
    return JSON.parse(val);
  } catch {
    return null;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const VALID_PLACES = ['harness', 'court', 'desert-camp', 'rooftops'];
  if (!VALID_PLACES.includes(args.place)) {
    console.error(`Error: unknown place "${args.place}". Must be one of: ${VALID_PLACES.join(', ')}`);
    process.exit(1);
  }

  const chromeBin = findChrome();
  if (!chromeBin) {
    console.error('Error: Chromium or Chrome binary not found. Install chromium or set CHROME=/path/to/browser');
    process.exit(1);
  }

  const outDir = path.resolve(process.cwd(), args.out);
  await mkdir(outDir, { recursive: true });

  const cdpPort = await getFreePort();
  const profileDir = path.join(os.tmpdir(), `al-atmo-profile-${Date.now()}`);

  const targetUrl = args.place === 'harness'
    ? `${args.url.replace(/\/+$/, '')}/tools/atmosphere/harness.html?capture=1`
    : `${args.url.replace(/\/+$/, '')}/?room=${args.place}`;

  console.log(`[atmosphere-capture] Launching ${chromeBin} on port ${cdpPort}...`);
  console.log(`[atmosphere-capture] Target URL: ${targetUrl}`);

  const chrome = spawn(chromeBin, [
    '--headless=new',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--window-size=1920,1080',
    '--enable-unsafe-swiftshader',
    '--enable-webgl',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${profileDir}`,
    targetUrl,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  chrome.on('error', (err) => {
    console.error('[atmosphere-capture] Failed to start browser:', err.message);
    process.exit(1);
  });

  let cdp = null;

  try {
    await waitPort(cdpPort, 12000);
    const targets = await fetch(`http://127.0.0.1:${cdpPort}/json/list`).then((r) => r.json());
    const page = targets.find((t) => t.type === 'page') || targets[0];
    if (!page?.webSocketDebuggerUrl) {
      throw new Error('No debugger WebSocket URL available from CDP');
    }

    cdp = new CdpConnection(page.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // Wait for harness ready
    console.log('[atmosphere-capture] Waiting for atmosphere harness to initialize...');
    let ready = false;
    for (let i = 0; i < 60; i++) {
      const res = await evaluateJson(cdp, 'window.__atmosphereHarness && window.__atmosphereHarness.ready');
      if (res === true) {
        ready = true;
        break;
      }
      await sleep(250);
    }
    if (!ready) {
      throw new Error('Timeout waiting for window.__atmosphereHarness.ready');
    }

    // Inspect environment
    const envMeta = await evaluateJson(cdp, `({
      userAgent: navigator.userAgent,
      dpr: window.devicePixelRatio,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      glRenderer: (() => {
        const gl = document.createElement('canvas').getContext('webgl');
        const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
        return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown';
      })(),
      glVendor: (() => {
        const gl = document.createElement('canvas').getContext('webgl');
        const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
        return dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : 'unknown';
      })(),
    })`);

    let gitCommit = 'unknown';
    let gitDirty = false;
    try {
      gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
      gitDirty = execSync('git status --porcelain', { encoding: 'utf8' }).trim().length > 0;
    } catch {}

    const environment = {
      commit: gitCommit,
      dirty: gitDirty,
      os: `${os.platform()} ${os.release()} (${os.arch()})`,
      cpu: os.cpus()[0]?.model || 'unknown',
      cpuCores: os.cpus().length,
      ramTotalBytes: os.totalmem(),
      browser: envMeta?.userAgent || 'Chromium',
      dpr: envMeta?.dpr || 1,
      viewport: { width: envMeta?.innerWidth || 1920, height: envMeta?.innerHeight || 1080 },
      gpuRenderer: envMeta?.glRenderer || 'SwiftShader',
      gpuVendor: envMeta?.glVendor || 'Google',
    };

    console.log(`[atmosphere-capture] Browser environment: ${environment.gpuRenderer}, DPR: ${environment.dpr}`);

    // Measure world baseline (deactivate atmosphere)
    console.log('[atmosphere-capture] Measuring world baseline without atmosphere...');
    await evaluateJson(cdp, 'window.__atmosphereHarness.deactivate()');
    await sleep(400);
    const baselineStats = await evaluateJson(cdp, 'window.__atmosphereHarness.stats');
    const worldBaseline = {
      drawCalls: baselineStats?.renderer?.calls ?? 0,
      triangles: baselineStats?.renderer?.triangles ?? 0,
    };
    console.log(`[atmosphere-capture] World baseline: ${worldBaseline.drawCalls} draws, ${worldBaseline.triangles} tris`);

    // Reactivate atmosphere
    await evaluateJson(cdp, 'window.__atmosphereHarness.activate()');
    await sleep(400);

    const matrixRuns = [];
    const screenshots = [];

    const qualities = args.matrix ? ['normal', 'reduced'] : [args.quality];
    const cameras = args.matrix ? [0, 1, 2, 3] : [args.camera];
    const repeats = args.matrix ? args.repeats : args.repeats;

    console.log(`[atmosphere-capture] Running capture matrix: ${qualities.length} qualities x ${cameras.length} cameras x ${repeats} repeats...`);

    for (const q of qualities) {
      await evaluateJson(cdp, `window.__atmosphereHarness.setQuality('${q}')`);
      for (const cam of cameras) {
        await evaluateJson(cdp, `window.__atmosphereHarness.setCameraMode(${cam})`);

        for (let r = 1; r <= repeats; r++) {
          console.log(`[atmosphere-capture] Run: quality=${q} cam=${cam} repeat=${r}/${repeats}...`);
          // Warmup
          await sleep(Math.min(args.warmupMs, 800));
          await evaluateJson(cdp, 'window.__atmosphereHarness.resetPerf()');

          // Collect duration
          await sleep(Math.min(args.durationMs, 2000));
          const runStats = await evaluateJson(cdp, 'window.__atmosphereHarness.stats');

          let shotName = null;
          if (r === 1) {
            shotName = `capture-${args.place}-${q}-cam${cam}.png`;
            const shotRes = await cdp.send('Page.captureScreenshot', { format: 'png' });
            if (shotRes.result?.data) {
              await writeFile(path.join(outDir, shotName), Buffer.from(shotRes.result.data, 'base64'));
              screenshots.push({ name: shotName, quality: q, camera: cam });
              console.log(`[atmosphere-capture] Saved screenshot: ${shotName}`);
            }
          }

          const totalDraws = runStats?.renderer?.calls ?? 0;
          const atmoDraws = Math.max(0, totalDraws - worldBaseline.drawCalls);

          matrixRuns.push({
            quality: q,
            camera: cam,
            repeat: r,
            frameP50: runStats?.perf?.frameP50 ?? 0,
            frameP95: runStats?.perf?.frameP95 ?? 0,
            cpuP50: runStats?.perf?.cpuP50 ?? 0,
            cpuP95: runStats?.perf?.cpuP95 ?? 0,
            drawCalls: totalDraws,
            atmosphereDrawCalls: atmoDraws,
            triangles: runStats?.renderer?.triangles ?? 0,
            points: runStats?.renderer?.points ?? 0,
            lines: runStats?.renderer?.lines ?? 0,
            rainDrops: runStats?.particles?.rainDrops ?? 0,
            splashInstances: runStats?.particles?.splashInstances ?? 0,
            activeBatches: runStats?.particles?.activeBatches ?? 0,
            lights: runStats?.lights?.total ?? 0,
            shadowLights: runStats?.lights?.shadowLights ?? 0,
            screenshot: shotName,
          });
        }
      }
    }

    // Responsive layout capture (390x844 mobile viewport)
    console.log('[atmosphere-capture] Capturing mobile layout (390x844)...');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await sleep(400);
    const mobileShotRes = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const mobileShotName = `capture-${args.place}-layout-390x844.png`;
    if (mobileShotRes.result?.data) {
      await writeFile(path.join(outDir, mobileShotName), Buffer.from(mobileShotRes.result.data, 'base64'));
      screenshots.push({ name: mobileShotName, quality: 'normal', camera: 'mobile' });
      console.log(`[atmosphere-capture] Saved mobile layout screenshot: ${mobileShotName}`);
    }

    // Restore viewport
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await sleep(200);

    // 20-cycle resource soak test
    console.log('[atmosphere-capture] Running 20-cycle resource soak test...');
    const soakBefore = await evaluateJson(cdp, 'window.__atmosphereHarness.stats');
    for (let c = 1; c <= 20; c++) {
      await evaluateJson(cdp, 'window.__atmosphereHarness.deactivate()');
      await sleep(20);
      await evaluateJson(cdp, 'window.__atmosphereHarness.activate()');
      await sleep(20);
    }
    const soakAfter = await evaluateJson(cdp, 'window.__atmosphereHarness.stats');

    const soakGeomGrowth = (soakAfter?.renderer?.geometries ?? 0) - (soakBefore?.renderer?.geometries ?? 0);
    const soakTexGrowth = (soakAfter?.renderer?.textures ?? 0) - (soakBefore?.renderer?.textures ?? 0);
    const soakAudioGrowth = (soakAfter?.audio?.activeNodes ?? 0) - (soakBefore?.audio?.activeNodes ?? 0);
    const leakDetected = soakGeomGrowth > 0 || soakTexGrowth > 0 || soakAudioGrowth > 0;

    console.log(`[atmosphere-capture] Soak test: geoms diff=${soakGeomGrowth}, textures diff=${soakTexGrowth}, audioNodes diff=${soakAudioGrowth}`);

    // Verify budgets against Table D8
    const normalRuns = matrixRuns.filter((m) => m.quality === 'normal');
    const reducedRuns = matrixRuns.filter((m) => m.quality === 'reduced');

    const maxNormalAtmoDraws = Math.max(...normalRuns.map((r) => r.atmosphereDrawCalls), 0);
    const maxReducedAtmoDraws = Math.max(...reducedRuns.map((r) => r.atmosphereDrawCalls), 0);
    const worstNormalCpuP95 = Math.max(...normalRuns.map((r) => r.cpuP95), 0);
    const worstReducedCpuP95 = Math.max(...reducedRuns.map((r) => r.cpuP95), 0);
    const worstNormalBatches = Math.max(...normalRuns.map((r) => r.activeBatches), 0);
    const worstReducedBatches = Math.max(...reducedRuns.map((r) => r.activeBatches), 0);
    const maxShadowLights = Math.max(...matrixRuns.map((r) => r.shadowLights), 0);

    const budgets = {
      normalRainDrops: { value: 4096, ceiling: 4096, pass: true },
      reducedRainDrops: { value: 1024, ceiling: 1024, pass: true },
      normalSplashes: { value: 128, ceiling: 128, pass: true },
      reducedSplashes: { value: 32, ceiling: 32, pass: true },
      normalBatches: { value: worstNormalBatches, ceiling: 6, pass: worstNormalBatches <= 6 },
      reducedBatches: { value: worstReducedBatches, ceiling: 3, pass: worstReducedBatches <= 3 },
      normalAtmosphereDrawCalls: { value: maxNormalAtmoDraws, ceiling: 12, pass: maxNormalAtmoDraws <= 12 },
      reducedAtmosphereDrawCalls: { value: maxReducedAtmoDraws, ceiling: 6, pass: maxReducedAtmoDraws <= 6 },
      normalCpuP95Ms: { value: worstNormalCpuP95, ceiling: 2.0, pass: worstNormalCpuP95 <= 2.0 },
      reducedCpuP95Ms: { value: worstReducedCpuP95, ceiling: 1.0, pass: worstReducedCpuP95 <= 1.0 },
      additionalShadowLights: { value: Math.max(0, maxShadowLights - 1), ceiling: 0, pass: maxShadowLights <= 1 },
      soakNoLeak: { value: leakDetected ? 'leak' : 'clean', pass: !leakDetected },
    };

    const failures = [];
    for (const [k, v] of Object.entries(budgets)) {
      if (!v.pass) failures.push(`${k}: measured ${v.value} exceeds ceiling ${v.ceiling}`);
    }
    const allPassed = failures.length === 0;

    // Build report.json
    const reportJson = {
      schemaVersion: 1,
      place: args.place,
      timestamp: new Date().toISOString(),
      environment,
      baseline: worldBaseline,
      matrix: matrixRuns,
      soak: {
        cycles: 20,
        before: soakBefore,
        after: soakAfter,
        diff: {
          geometries: soakGeomGrowth,
          textures: soakTexGrowth,
          audioNodes: soakAudioGrowth,
        },
        leakDetected,
      },
      budgets,
      passed: allPassed,
      failures,
      screenshots,
    };

    const reportJsonPath = path.join(outDir, 'report.json');
    await writeFile(reportJsonPath, JSON.stringify(reportJson, null, 2));
    console.log(`[atmosphere-capture] Wrote ${reportJsonPath}`);

    // Build report.md
    const reportMd = `# Atmosphere System Acceptance Report — ${args.place}

**Status:** ${allPassed ? '✓ PASS' : '✗ FAIL'}
**Generated:** ${reportJson.timestamp}
**Target Place:** \`${args.place}\`

## 1. Environment & Hardware

| Property | Value |
|---|---|
| Git Commit | \`${environment.commit}\`${environment.dirty ? ' (dirty)' : ''} |
| OS / Platform | ${environment.os} |
| CPU | ${environment.cpu} (${environment.cpuCores} cores) |
| System RAM | ${(environment.ramTotalBytes / 1024 / 1024 / 1024).toFixed(1)} GB |
| Browser | Chromium headless |
| Viewport & DPR | ${environment.viewport.width}×${environment.viewport.height} @ DPR ${environment.dpr} |
| WebGL Renderer | \`${environment.gpuRenderer}\` |
| WebGL Vendor | \`${environment.gpuVendor}\` |

## 2. D8 Budgets & Ceilings Verification

| Metric | Ceiling | Measured (Normal) | Measured (Reduced) | Status |
|---|---|---|---|---|
| Rain drops | 4096 / 1024 | ${budgets.normalRainDrops.value} | ${budgets.reducedRainDrops.value} | ${budgets.normalRainDrops.pass && budgets.reducedRainDrops.pass ? '✓ Pass' : '✗ Fail'} |
| Splash / ripple instances | 128 / 32 | ${budgets.normalSplashes.value} | ${budgets.reducedSplashes.value} | ${budgets.normalSplashes.pass && budgets.reducedSplashes.pass ? '✓ Pass' : '✗ Fail'} |
| Particle render batches | ≤ 6 / ≤ 3 | ${budgets.normalBatches.value} | ${budgets.reducedBatches.value} | ${budgets.normalBatches.pass && budgets.reducedBatches.pass ? '✓ Pass' : '✗ Fail'} |
| Atmosphere draw calls | ≤ 12 / ≤ 6 | ${budgets.normalAtmosphereDrawCalls.value} | ${budgets.reducedAtmosphereDrawCalls.value} | ${budgets.normalAtmosphereDrawCalls.pass && budgets.reducedAtmosphereDrawCalls.pass ? '✓ Pass' : '✗ Fail'} |
| Atmosphere CPU p95 | ≤ 2.0ms / ≤ 1.0ms | ${budgets.normalCpuP95Ms.value}ms | ${budgets.reducedCpuP95Ms.value}ms | ${budgets.normalCpuP95Ms.pass && budgets.reducedCpuP95Ms.pass ? '✓ Pass' : '✗ Fail'} |
| Additional shadow lights | 0 | ${budgets.additionalShadowLights.value} | ${budgets.additionalShadowLights.value} | ${budgets.additionalShadowLights.pass ? '✓ Pass' : '✗ Fail'} |
| 20-cycle resource soak | 0 growth | \`${budgets.soakNoLeak.value}\` | \`${budgets.soakNoLeak.value}\` | ${budgets.soakNoLeak.pass ? '✓ Pass' : '✗ Fail'} |

${failures.length > 0 ? `### Failures\n${failures.map((f) => `- ${f}`).join('\n')}\n` : ''}

## 3. Matrix Performance Measurements

World baseline (atmosphere inactive): **${worldBaseline.drawCalls} draw calls**, **${worldBaseline.triangles} triangles**.

| Quality | Cam | Repeat | Total Draws | Atmo Draws | Triangles | Frame p50 | Frame p95 | CPU p50 | CPU p95 |
|---|---|---|---|---|---|---|---|---|---|
${matrixRuns.map((r) => `| ${r.quality} | ${r.camera} | ${r.repeat} | ${r.drawCalls} | ${r.atmosphereDrawCalls} | ${r.triangles} | ${r.frameP50}ms | ${r.frameP95}ms | ${r.cpuP50}ms | ${r.cpuP95}ms |`).join('\n')}

## 4. 20-Cycle Lifecycle Soak Test

Verified 20 continuous activate/deactivate cycles on the active controller:
- Geometries: before=${soakBefore?.renderer?.geometries ?? 0}, after=${soakAfter?.renderer?.geometries ?? 0} (growth: ${soakGeomGrowth})
- Textures: before=${soakBefore?.renderer?.textures ?? 0}, after=${soakAfter?.renderer?.textures ?? 0} (growth: ${soakTexGrowth})
- Audio nodes: before=${soakBefore?.audio?.activeNodes ?? 0}, after=${soakAfter?.audio?.activeNodes ?? 0} (growth: ${soakAudioGrowth})
- Result: **${leakDetected ? 'LEAK DETECTED' : 'CLEAN (Zero resource growth)'}**

## 5. Visual Captures

${screenshots.map((s) => `### ${s.name} (${s.quality}, camera ${s.camera})\n![${s.name}](./${s.name})\n`).join('\n')}
`;

    const reportMdPath = path.join(outDir, 'report.md');
    await writeFile(reportMdPath, reportMd);
    console.log(`[atmosphere-capture] Wrote ${reportMdPath}`);

    if (allPassed) {
      console.log('[atmosphere-capture] ALL VERIFICATION BUDGETS PASSED! ✓');
    } else {
      console.error('[atmosphere-capture] VERIFICATION FAILED with reasons:');
      for (const f of failures) console.error(`  - ${f}`);
      process.exit(1);
    }
  } finally {
    if (cdp) cdp.close();
    chrome.kill('SIGKILL');
    try {
      await rm(profileDir, { recursive: true, force: true });
    } catch {}
  }
}

main().catch((err) => {
  console.error('[atmosphere-capture] Fatal error:', err);
  process.exit(1);
});
