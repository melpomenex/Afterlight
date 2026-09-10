import type {
  KartRoyaleHost,
  KartRoyaleHostOptions,
} from './types';
import { createKartRoyaleRuntime } from './runtime';

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
  });

  const guard = <A extends unknown[]>(fn: (...a: A) => void) =>
    (...a: A) => {
      if (disposed || dead) return;
      try {
        fn(...a);
      } catch (err) {
        // A throwing race frame must not take the host's frame loop with it;
        // the host exits the session on the first exception (design D12).
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
    async boot() {
      if (booted || disposed) return;
      booted = true;
      try {
        await runtime.boot();
      } catch (err) {
        markDead('Kart Royale failed to start', String((err as Error)?.message ?? err));
        throw err;
      }
    },
    update: guard((dt: number) => runtime.update(dt)),
    present: guard(() => runtime.present()),
    resize(w, h, force) {
      viewportOverride = { width: w, height: h };
      // Resize is not fatal if it throws mid-session; the next lease resize
      // retries.
      try {
        runtime.resize(force === true);
      } catch (err) {
        console.warn('[kart-royale] resize failed', err);
      }
    },
    beginSession() {
      runtime.input.enter();
    },
    endSession() {
      runtime.input.leave();
    },
    setMuted(m) {
      runtime.setMuted(m);
    },
    get dead() { return dead; },
    dispose() {
      if (disposed) return;
      disposed = true;
      runtime.input.leave();
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
