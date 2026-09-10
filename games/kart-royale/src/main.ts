import type { Ctx } from './types';
import { Recorder } from './core/Recorder';
import { installFeel } from './core/Feel';
import { createKartRoyaleRuntime } from './host/runtime';

/**
 * STANDALONE SHELL (integrate-kart-royale-arcade). Everything the game does
 * used to live here; the systems, boot sequence, frame watchdog, adaptive
 * ladder and resize logic now live in `host/runtime.ts` so a HOST (Afterlight's
 * arcade cabinet) can drive the same runtime without a second renderer or RAF
 * loop. What remains here is exclusively the composition that owns the PAGE:
 *
 *   - the `#app` / `#ui` / `#boot` DOM from index.html,
 *   - the game's own canvas parent and thus its renderer,
 *   - the requestAnimationFrame loop,
 *   - resize / orientation / visualViewport listeners,
 *   - context-loss ownership on its own canvas,
 *   - the standalone harness surface (`window.__ctx`, `__gameReady`,
 *     `__loopHealth`, `__drawBudget`, `__camRig`, `__render` via the pipeline),
 *   - the Recorder and the feel-tuning globals.
 */

const parent = document.getElementById('app')!;

/**
 * The size the canvas will actually be displayed at, in CSS pixels.
 *
 * Measured off `#app` (which is `position: fixed; inset: 0`) rather than read
 * from `innerWidth`/`innerHeight`, and that is a mobile correctness fix, not a
 * tidy-up. On iOS Safari `innerHeight` tracks the VISUAL viewport — it shrinks
 * and grows as the URL bar collapses, mid-gesture, by ~60 px — while a
 * `position: fixed` element is laid out against the LAYOUT viewport and does
 * not move. `renderer.setSize(w, h, true)` writes inline `style.width/height`
 * in pixels, which beats the stylesheet's `width: 100%`, so sizing from
 * `innerHeight` pinned the canvas to the smaller of the two and left an
 * unpainted strip along the bottom of the screen. Measuring the element we are
 * about to fill has no such ambiguity.
 *
 * A degenerate measurement is not a size — it is the absence of one. Return
 * null and let the caller keep what it had.
 */
const MIN_SURFACE = 16;

function viewportSize(): { w: number; h: number } | null {
  let w = Math.round(parent.clientWidth || 0);
  let h = Math.round(parent.clientHeight || 0);
  // The element measuring zero does not mean the window has; fall back before
  // giving up, which covers being read mid-layout.
  if (w < MIN_SURFACE || h < MIN_SURFACE) {
    w = Math.round(innerWidth || 0);
    h = Math.round(innerHeight || 0);
  }
  if (w < MIN_SURFACE || h < MIN_SURFACE) return null;
  return { w, h };
}

function bootProgress(frac: number, label: string) {
  const bar = document.querySelector<HTMLElement>('.boot-bar i');
  const step = document.querySelector<HTMLElement>('.boot-step');
  if (bar) bar.style.width = `${Math.round(frac * 100)}%`;
  if (step) step.textContent = label;
}

const runtime = createKartRoyaleRuntime({
  hosted: false,
  canvasParent: parent,
  viewport: viewportSize,
  diagnostics: true,
  scalerParam: new URLSearchParams(location.search).get('scaler'),
  contextRecovery: true,
  onBootProgress: bootProgress,
  onSystemsReady: () => {
    installFeel();
    installResizeListeners();
  },
});

const ctx: Ctx = runtime.ctx;

/** Fades the boot curtain once a real frame is actually on screen. */
function dismissBootScreen() {
  const boot = document.getElementById('boot');
  if (!boot) return;
  boot.classList.add('done');
  setTimeout(() => boot.remove(), 700);
}

let last = performance.now();
function frame(now: number) {
  requestAnimationFrame(frame);
  const rawDt = (now - last) / 1000;
  last = now;
  runtime.update(rawDt);
  runtime.present();

  if (ctx.frame === 8) {
    (window as any).__gameReady = true;
    dismissBootScreen();
  }
}

/**
 * Resize events are coalesced to one per animation frame and dropped entirely
 * when the size has not moved.
 *
 * iOS Safari fires `resize` continuously — dozens of events — while the URL bar
 * animates, on rotation, and whenever the on-screen keyboard appears. Each one
 * used to reach `composer.setSize`, which reallocates the HDR input and output
 * buffers. `visualViewport` is listened to as well as `window`, because on iOS
 * it is the one that reports the URL-bar movement — and a `ResizeObserver` on
 * `#app` catches anything neither of them announces.
 */
let resizeQueued = false;
function queueResize() {
  if (resizeQueued) return;
  resizeQueued = true;
  requestAnimationFrame(() => { resizeQueued = false; runtime.resize(); });
}

function installResizeListeners() {
  addEventListener('resize', queueResize);
  addEventListener('orientationchange', queueResize);
  visualViewport?.addEventListener('resize', queueResize);
  if (typeof ResizeObserver === 'function') new ResizeObserver(queueResize).observe(parent);
}

async function boot() {
  await runtime.boot();
  // Press R to record. Deliberately not a System: it owns no scene state and
  // must keep working while the game is paused or on a menu. STANDALONE ONLY —
  // hosted, the R key belongs to the host application.
  new Recorder().install();
  requestAnimationFrame(frame);
  (window as any).__gameReady = false;
}

boot().catch((err) => {
  console.error('[boot] failed', err);
  document.body.innerHTML =
    `<pre style="color:#f66;padding:24px;font:13px ui-monospace">Boot failed:\n${err?.stack || err}</pre>`;
});

// Expose for the screenshot harness / debugging.
(window as any).__ctx = ctx;
// tools/perf.mjs turns this off to measure the un-LODed field for a before/after.
(window as any).__drawBudget = runtime.drawBudget;
(window as any).__camRig = runtime.camera; // TEMP-PROBE
// Watchdog state, for the perf and soak harnesses: how many frames overran, and
// what resolution rung the adaptive scaler has settled on.
(window as any).__loopHealth = runtime.loopHealth;
