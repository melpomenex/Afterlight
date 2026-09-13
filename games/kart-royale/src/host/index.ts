import type {
  KartRoyaleHost,
  KartRoyaleHostOptions,
} from './types';
import { createKartRoyaleRuntime } from './runtime';
import { runHostedGpuWorkSyncFromOptions } from './graphicsWork';

export type { KartRoyaleHost, KartRoyaleHostOptions } from './types';

/**
 * The hosted composition of Kart Royale (integrate-kart-royale-arcade).
 *
 * `createKartRoyaleHost` is CHEAP and synchronous: it constructs the runtime's
 * scene, camera and systems without touching the GPU, so a host can create it,
 * lease presentation against `host.ctx.scene`/`host.ctx.camera` (an empty dark
 * scene — a fine loading backdrop), and only then `await host.boot()`. That
 * ordering is the whole renderer-ownership story: every GL-state mutation the
 * boot makes (renderer settings, composer construction, PMREM bake, prewarm)
 * happens while the HOST is not presenting its own world, and the host's
 * lease-time snapshot/restore brackets the session.
 *
 * After `boot()` resolves the game is on its character-select screen; the host
 * drives `update(dt)` + `present()` from its own frame loop and forwards real
 * KeyboardEvents through `input`. Teardown is `dispose()` — idempotent, and it
 * walks every system's dispose (the standalone page never needed them; a host
 * that re-enters the cabinet does).
 */
export function createKartRoyaleHost(options: KartRoyaleHostOptions): KartRoyaleHost {
  let disposed = false;
  let dead = false;
  let booted = false;
  let selectionReady = false;
  let bootPromise: Promise<void> | null = null;
  let bootGeneration = 0;

  const markDead = (title: string, detail: string) => {
    if (dead || disposed) return;
    dead = true;
    options.onFatal?.(title, detail);
  };

  // The lease hands `resize(w, h)` concrete numbers; the runtime reads its
  // viewport through this per-instance cell, falling back to the host's own
  // provider (e.g. a live element measurement) until the first lease resize.
  let viewportOverride: { width: number; height: number } | null = null;

  const runtime = createKartRoyaleRuntime({
    hosted: true,
    renderer: options.renderer,
    // fix-kart-royale-render-sharpness D8: the overrides field was declared on
    // KartRoyaleHostOptions for the whole of the instant-entry round but never
    // FORWARDED — the runtime silently ran with `settingsOverrides: undefined`,
    // so no host policy could ever reach createSettings. Wired now. Absent
    // `params`, behaviour is exactly what it was: pure device detection.
    settingsOverrides: options.params,
    viewport: () => {
      if (viewportOverride) return { w: viewportOverride.width, h: viewportOverride.height };
      const size = options.viewport();
      if (!size) return null;
      return { w: size.width, h: size.height };
    },
    hudOptions: {
      hostElement: options.hudHost,
      onExitCabinet: options.onExitRequest ?? null,
      hosted: true,
      startScreen: options.startScreen === 'title' ? 'title' : 'select',
    },
    audioExternal: options.audio ?? null,
    diagnostics: false,
    scalerParam: null,
    contextRecovery: false,
    onBootProgress: options.onBootProgress,
    onFatal: markDead,
    perfSpan: options.perfSpan,
    perfMark: options.perfMark,
    runGraphicsTransaction: options.runGraphicsTransaction ?? null,
    initialWorldPresentation: options.initialWorldPresentation ?? null,
  });

  const guard = <A extends unknown[]>(fn: (...a: A) => void) =>
    (...a: A) => {
      if (disposed || dead) return;
      try {
        fn(...a);
      } catch (err) {
        console.error('[kart-royale] host frame threw', err);
        markDead('Kart Royale stopped', String((err as Error)?.message ?? err));
      }
    };

  const host: KartRoyaleHost = {
    ctx: runtime.ctx,
    race: {
      selectKart: (i) => runtime.race.selectKart(i),
      reset: () => runtime.race.reset(),
      setPaused: (p) => runtime.race.setPaused(p),
      state: () => runtime.race.state,
    },
    input: {
      handleKeyDown: (e) => runtime.input.handleKeyDown(e),
      handleKeyUp: (e) => runtime.input.handleKeyUp(e),
      neutralize: () => runtime.input.neutralize(),
    },
    prepareWorldSlice(budgetMs, signal = null) {
      if (disposed || dead) return { done: false, cancelled: false, stepsRun: 0, stepId: null };
      return runtime.prepareWorldSlice(budgetMs, signal);
    },
    isWorldPrepared() {
      return runtime.isWorldBatchesComplete();
    },
    async boot() {
      if (disposed || dead) return;
      if (booted) return;
      if (bootPromise) return bootPromise;

      const gen = ++bootGeneration;
      bootPromise = (async () => {
        try {
          await runtime.boot();
          if (disposed || dead || gen !== bootGeneration) return;
          booted = true;
        } catch (err) {
          if (gen === bootGeneration) {
            markDead('Kart Royale failed to start', String((err as Error)?.message ?? err));
          }
          throw err;
        } finally {
          if (gen === bootGeneration) bootPromise = null;
        }
      })();
      return bootPromise;
    },
    prepareSelectionReadiness() {
      if (disposed || dead || !booted) return false;
      runtime.race.resetToSelectionSession(runtime.ctx);
      runtime.hud.resetSelectionPresentation();
      const posed = runtime.race.prepareSelectionReadiness(runtime.ctx, runtime.camera);
      if (!posed) {
        selectionReady = false;
        return false;
      }
      let hidden = { ok: false, sceneCalls: 0 };
      const viewport = viewportOverride ?? options.viewport() ?? { width: 1280, height: 720 };
      runHostedGpuWorkSyncFromOptions(
        options,
        runtime.ctx.renderer,
        viewport,
        'selection:hidden-frame',
        () => {
          hidden = runtime.pipeline.renderHiddenSelectionFrame(runtime.ctx);
        },
      );
      selectionReady = hidden.ok;
      if (selectionReady) options.perfMark?.('ready');
      else options.perfMark?.('ready-failed', hidden);
      return selectionReady;
    },
    isSelectionReady() {
      return selectionReady && booted && !disposed && !dead;
    },
    update: guard((dt: number) => runtime.update(dt)),
    present: guard(() => {
      if (!selectionReady) return;
      runtime.present();
    }),
    resize(w, h, force) {
      viewportOverride = { width: w, height: h };
      try {
        runtime.resize(force === true);
      } catch (err) {
        console.warn('[kart-royale] resize failed', err);
      }
    },
    beginSession() {
      runtime.beginSession();
    },
    endSession() {
      runtime.endSession();
    },
    setMuted(m) {
      runtime.setMuted(m);
    },
    setWorldPresentation(presentation) {
      if (disposed || dead) return;
      runtime.setWorldPresentation(presentation);
    },
    getWorldPresentation() {
      return runtime.getWorldPresentation();
    },
    getRenderStats() {
      return runtime.renderStats();
    },
    get dead() { return dead; },
    dispose() {
      if (disposed) return;
      disposed = true;
      const ledger = (globalThis as { __kartAllocationLedger?: { release?: (owner: string) => void } })
        .__kartAllocationLedger;
      ledger?.release?.('kart-host');
      bootGeneration += 1;
      bootPromise = null;
      booted = false;
      selectionReady = false;
      runtime.endSession();
      runtime.setMuted(true);
      try {
        runtime.dispose();
      } catch (err) {
        console.warn('[kart-royale] dispose threw', err);
      }
    },
  };

  return host;
}
