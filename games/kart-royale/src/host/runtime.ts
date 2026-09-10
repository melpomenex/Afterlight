import * as THREE from 'three';
import { IncrementalBatchRunner, type BatchRunResult } from '../core/IncrementalBatch';
import { RaceState, type BatchStep, type Ctx, type System } from '../types';
import { Bus } from '../core/Bus';
import { createSettings, device, type SettingsOverrides } from '../core/Settings';
import { Input } from '../core/Input';
import { prewarm } from '../core/Prewarm';
import { FrameWatch } from '../core/FrameWatch';
import { Diagnostics } from '../core/Diagnostics';
import { RenderPipeline } from '../render/Renderer';
import { DrawBudget } from '../render/DrawBudget';
import { Sky } from '../render/Sky';
import { Materials } from '../render/Materials';
import { Track } from '../world/Track';
import { Scenery } from '../world/Scenery';
import { Effects } from '../fx/Effects';
import { Items } from '../game/Items';
import { Race } from '../game/Race';
import { ChaseCamera } from '../game/Camera';
import { HUD } from '../ui/HUD';
import { Audio } from '../audio/Audio';

/**
 * The Kart Royale runtime, extracted from `src/main.ts`
 * (integrate-kart-royale-arcade) so the game can be driven by a HOST instead
 * of its own page:
 *
 *   - `main.ts` remains the standalone shell: it creates the renderer parent
 *     (#app), owns the requestAnimationFrame loop, the boot curtain, the
 *     `window.__*` harness hooks, context recovery and the Recorder.
 *   - a host (Afterlight's arcade cabinet) calls `createKartRoyaleRuntime`
 *     directly with an external renderer and a viewport provider, and drives
 *     `update(dt)` / `present()` / `resize()` from ITS frame loop.
 *
 * Everything below is moved verbatim from the old `main.ts` unless a comment
 * says otherwise; the load-bearing comments came with it. The boot order, the
 * adaptive-resolution ladder, the present-skip watchdog and the resize
 * coalescing semantics are part of the game's feel and its harness contracts
 * and must not drift between the two compositions.
 */

const MIN_SURFACE = 16;

export interface KartRoyaleRuntimeOptions {
  /** Hosted composition: external renderer, no own DOM/canvas/globals. */
  hosted?: boolean;
  /** Hosted: the host's single WebGLRenderer. */
  renderer?: THREE.WebGLRenderer;
  /** Standalone: the element the game's own canvas is appended into (#app). */
  canvasParent?: HTMLElement | null;
  /** CSS-pixel viewport provider; null return means "no usable surface yet". */
  viewport: () => { w: number; h: number } | null;
  /** Hosted quality overrides; hosted never reads `location.search`. */
  settingsOverrides?: SettingsOverrides;
  /** Hosted HUD mounting + cabinet-exit wiring (see HUD/Menus). */
  hudOptions?: {
    hostElement?: HTMLElement | null;
    onExitCabinet?: (() => void) | null;
    hosted?: boolean;
    startScreen?: 'title' | 'select';
  };
  /** Hosted audio: host context/bus; never closed or suspended by the game. */
  audioExternal?: { context?: BaseAudioContext | null; destination?: AudioNode | null } | null;
  /** Standalone only: FrameWatch + Diagnostics (console wrap) install. */
  diagnostics?: boolean;
  /** Standalone only: the `?scaler=` pin value (null when unpinned). */
  scalerParam?: string | null;
  /** Standalone only: own the webglcontextlost/restored recovery path. */
  contextRecovery?: boolean;
  /** Boot progress (0..1, label) for the host's loading UI or the curtain. */
  onBootProgress?: (frac: number, label: string) => void;
  /** Standalone: runs between systems init and resize/prewarm (feel, listeners). */
  onSystemsReady?: () => void;
  /** Irrecoverable pipeline failure; hosted routes this to session exit. */
  onFatal?: (title: string, detail: string) => void;
  /** Optional perf reporting hooks (fix-kart-royale-instant-entry D10) */
  perfSpan?: (name: string, action: 'start' | 'end', meta?: Record<string, unknown>) => void;
  perfMark?: (phase: string, data?: unknown) => void;
  /** Host frame-bound graphics transaction (fix-kart-royale-instant-entry D4). */
  runGraphicsTransaction?: ((fn: (ctx: {
    renderer: THREE.WebGLRenderer;
    viewport: { width: number; height: number };
  }) => void | Promise<void>) => Promise<void>) | null;
}

export interface KartRoyaleRuntime {
  ctx: Ctx;
  systems: System[];
  pipeline: RenderPipeline;
  race: Race;
  input: Input;
  audio: Audio;
  sky: Sky;
  hud: HUD;
  camera: ChaseCamera;
  drawBudget: DrawBudget;
  /** Initialize every system (in the load-bearing order) and prewarm. */
  boot(): Promise<void>;
  /** One simulation tick. `rawDt` is seconds since the previous tick. */
  update(rawDt: number): void;
  /** Present one frame; runs the present-skip watchdog and the ladder. */
  present(): void;
  resize(force?: boolean): void;
  /** Total mute of game audio (used while warm-cached, see host/index.ts). */
  setMuted(muted: boolean): void;
  /** Watchdog state for harnesses (`__loopHealth` in the standalone shell). */
  loopHealth(): Record<string, unknown>;
  /** Mount session listeners/HUD/audio; hosted only splits resource vs session. */
  beginSession(): void;
  endSession(): void;
  /** Resumable CPU world-build slices for background preparation (5.3). */
  prepareWorldSlice(budgetMs: number, signal?: AbortSignal | null): BatchRunResult;
  isWorldBatchesComplete(): boolean;
  dispose(): void;
}

export function createKartRoyaleRuntime(options: KartRoyaleRuntimeOptions): KartRoyaleRuntime {
  const hosted = options.hosted === true;

  const pipeline = hosted
    ? new RenderPipeline(null, { renderer: options.renderer!, onFatal: options.onFatal })
    : new RenderPipeline(options.canvasParent ?? document.body);
  const input = new Input(hosted);
  const sky = new Sky();
  const materials = new Materials();
  const track = new Track();
  const scenery = new Scenery();
  const effects = new Effects();
  const items = new Items();
  const race = new Race();
  const camera = new ChaseCamera();
  const hud = new HUD(hosted ? {
    hostElement: options.hudOptions?.hostElement ?? null,
    onExitCabinet: options.hudOptions?.onExitCabinet ?? null,
    hosted: true,
    startScreen: options.hudOptions?.startScreen,
  } : {});
  const audio = new Audio(hosted ? (options.audioExternal ?? null) : null);
  const drawBudget = new DrawBudget();
  const frameWatch = new FrameWatch();
  const diagnostics = new Diagnostics();

  // At construction the surface may not be laid out yet, and the viewport
  // provider correctly refuses to invent a size. A real one arrives from
  // `resize(true)` during boot; this only has to be non-degenerate so the
  // camera can be built.
  const view0 = options.viewport() ?? {
    w: Math.max(MIN_SURFACE, globalThis.innerWidth || 1280),
    h: Math.max(MIN_SURFACE, globalThis.innerHeight || 720),
  };

  const ctx: Ctx = {
    renderer: null as any,
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(62, view0.w / view0.h, 0.2, 3000),
    time: 0,
    dt: 0,
    frame: 0,
    width: view0.w,
    height: view0.h,
    settings: createSettings(hosted ? (options.settingsOverrides ?? undefined) : undefined),
    bus: new Bus(),
    input,
    track,
    race,
    items,
    envMap: null,
    sun: null,
    sunDirection: new THREE.Vector3(0.4, 0.8, 0.3).normalize(),
    shake: (a, s = 0.3) => camera.addShake(a, s),
    speedIntensity: 0,
    fovPunch: 0,
  };
  const perfSpan = (name: string, action: 'start' | 'end', meta?: Record<string, unknown>) => {
    if (options.perfSpan) options.perfSpan(name, action, meta);
    else if (action === 'start') (globalThis as any).__kartPerf?.startSpan?.(name, meta);
    else (globalThis as any).__kartPerf?.endSpan?.(name, meta);
  };
  const perfMark = (phase: string, data?: unknown) => {
    if (options.perfMark) options.perfMark(phase, data);
    else (globalThis as any).__kartPerf?.recordMark?.(phase, data);
  };

  // `Ctx` has no slot for the shared material library, so every visual system
  // reaches it through the `getMaterials()` module singleton that `Materials`
  // registers in its constructor. Published here too — one place to look.
  (ctx as any).materials = materials;
  (ctx as any).perfSpan = perfSpan;
  (ctx as any).perfMark = perfMark;
  (ctx as any).runGraphicsTransaction = options.runGraphicsTransaction ?? null;

  // Init order matters and is load-bearing (moved verbatim from main.ts):
  //   pipeline  — sets ctx.renderer; everything that compiles a shader or reads
  //               GPU capabilities needs it first.
  //   sky       — bakes the PMREM env map into ctx.envMap and sets ctx.sun /
  //               ctx.sunDirection, all of which materials, scenery, water and
  //               the particle lighting read at their own init.
  //   materials — the shared texture/material cache; track and scenery pull from
  //               it, so it has to exist (and have seen the env map) first.
  //   track     — the world the rest of the game is placed on.
  //   scenery   — surveys the finished track to dress it.
  //   race      — builds the karts and the racing line; must be after the track.
  //   items     — reads ctx.race.karts to allocate an item slot per kart, so it
  //               must be after race.
  //   effects / camera / hud / audio — all consume the karts.
  //   drawBudget — LOD and shadow culling, measured from the posed camera, so it
  //               must be last: its lateUpdate has to run after the chase rig's.
  const systems: System[] = [
    pipeline, input, sky, materials, track, scenery, race, items, effects, camera, hud, audio,
    drawBudget,
  ];

  /** Human-readable names for the boot progress readout, indexed with `systems`. */
  const SYSTEM_LABELS = [
    'starting renderer', 'reading controls', 'raising the sun', 'mixing materials',
    'laying the circuit', 'dressing the bay', 'rolling out the grid', 'loading item boxes',
    'lighting the effects', 'mounting the camera', 'drawing the hud', 'tuning the engines',
    'balancing the frame',
  ];

  const WORLD_BATCH_SYSTEMS: System[] = [materials, track, scenery, race];
  let worldBatchRunner: IncrementalBatchRunner | null = null;
  let worldBatchesComplete = false;
  let cheapSystemsReady = false;

  function ensureCheapSystemsInited(): void {
    if (cheapSystemsReady) return;
    pipeline.init?.(ctx);
    input.init?.(ctx);
    sky.init?.(ctx);
    cheapSystemsReady = true;
  }

  function buildWorldBatchRunner(signal: AbortSignal | null = null): IncrementalBatchRunner {
    ensureCheapSystemsInited();
    const steps: BatchStep[] = [];
    for (const sys of WORLD_BATCH_SYSTEMS) {
      if (sys.initBatches) steps.push(...sys.initBatches(ctx));
      else sys.init?.(ctx);
    }
    return new IncrementalBatchRunner(steps, signal);
  }

  function resetWorldPrepareState(): void {
    worldBatchRunner = null;
    worldBatchesComplete = false;
    cheapSystemsReady = false;
  }

  function prepareWorldSlice(budgetMs: number, signal: AbortSignal | null = null): BatchRunResult {
    if (worldBatchesComplete) {
      return { done: true, cancelled: false, stepsRun: 0, stepId: null };
    }
    if (!worldBatchRunner) worldBatchRunner = buildWorldBatchRunner(signal);
    const result = worldBatchRunner.runUntil(budgetMs);
    if (result.done) worldBatchesComplete = true;
    return result;
  }

  function isWorldBatchesComplete(): boolean {
    return worldBatchesComplete || (worldBatchRunner?.done ?? false);
  }

  // ---------------------------------------------------------------------------
  //  Render-loop watchdog (moved verbatim from main.ts)
  // ---------------------------------------------------------------------------
  const STALL_MS = 220;
  const SLOW_MS = 45;
  const SCALE_RUNGS = [1, 0.85, 0.72, 0.6, 0.5];
  const FRAME_SLOW_MS = 18.0;
  const FRAME_CLEAN_MS = 17.6;
  const FRAME_EMA_ALPHA = 0.06;
  const CPU_BOUND_MS = 13.0;
  const RACING_SETTLE_FRAMES = 30;
  const CSS_FLOOR_HANDHELD = 1.0;
  const CSS_FLOOR_DEFAULT = 0.6;
  const MIN_LADDER_RUNGS = 2;
  const DESCENT_PAYOFF_MS = 0.6;
  const NO_PAYOFF_LOCKOUT = 3600;
  const MAX_JUMP_RUNGS = 2;
  const FRAME_JUMP_MS = 25.0;
  const SCALE_COOLDOWN = 60;
  const RECOVER_COOLDOWN = 120;
  const PROBE_FRAMES_MIN = 360;
  const PROBE_FRAMES_MAX = 3600;
  const PROBE_FAIL_WINDOW = 900;
  const CLEAN_LEAK = 30;
  const WATCHDOG_FROM_FRAME = 30;

  const SCALER_PINNED = options.scalerParam !== null && options.scalerParam !== undefined && options.scalerParam !== '';
  const SCALER_PIN_VALUE = (() => {
    if (!SCALER_PINNED) return 1;
    const v = parseFloat(options.scalerParam as string);
    return Number.isFinite(v) && v > 0 ? THREE.MathUtils.clamp(v, 0.5, 1) : 1;
  })();

  /** EMA of the CPU cost of frames we actually presented, milliseconds. */
  let renderCostEma = 16.7;
  /** EMA of the interval between presented frames — what the player actually sees. */
  let frameEma = 16.7;
  let cleanFrames = 0;
  let probeFrames = PROBE_FRAMES_MIN;
  let lastProbeFrame = -PROBE_FAIL_WINDOW;
  let racingFrames = 0;
  let lastTickPresented = false;
  let skipRender = 0;
  let scaleRung = 0;
  let scaleCooldown = 0;
  let descendFromRung = -1;
  let descendFromEma = 0;
  let noPayoffRung = -1;
  let noPayoffFrame = 0;
  let descentsKept = 0;
  let descentsReverted = 0;
  let stallCount = 0;
  let renderFailures = 0;
  /** Set between context loss and a completed restore; nothing runs meanwhile. */
  let suspended = false;
  /** The last `update()` tick was gated (hidden/suspended/lost): no present. */
  let tickGated = false;
  let frozenTick = false;
  let rawTickMs = 16.7;
  let simStart = 0;

  const baseMasterVolume = ctx.settings.masterVolume;
  let muted = false;

  function sceneDrawCalls(): number {
    const recorded = (pipeline as unknown as { lastSceneCalls?: number }).lastSceneCalls;
    if (typeof recorded === 'number') return recorded;
    return ctx.renderer?.info.render.calls ?? 0;
  }

  function baseCssRatio(): number {
    const gl = ctx.renderer?.getContext?.();
    const bufW = gl?.drawingBufferWidth ?? 0;
    const ds = pipeline.dynamicScale || 1;
    if (bufW <= 0 || ctx.width <= 0) return 1;
    return bufW / ctx.width / ds;
  }

  function lowestRung(): number {
    const base = baseCssRatio();
    const floor = device().handheld ? CSS_FLOOR_HANDHELD : CSS_FLOOR_DEFAULT;
    let i = SCALE_RUNGS.length - 1;
    while (i > 0 && base * SCALE_RUNGS[i] < floor - 1e-6) i--;
    i = Math.min(SCALE_RUNGS.length - 1, Math.max(i, MIN_LADDER_RUNGS));
    if (noPayoffRung > 0 && ctx.frame - noPayoffFrame < NO_PAYOFF_LOCKOUT) {
      i = Math.min(i, noPayoffRung - 1);
    }
    return Math.max(0, i);
  }

  function descendTarget(): number {
    const floor = lowestRung();
    if (scaleRung + 1 > floor) return scaleRung;
    if (frameEma <= FRAME_JUMP_MS) return scaleRung + 1;
    const pixelCost = Math.max(1, frameEma - renderCostEma);
    const budget = Math.max(2, FRAME_CLEAN_MS - renderCostEma);
    const want = SCALE_RUNGS[scaleRung] * Math.sqrt(budget / pixelCost);
    let target = scaleRung + 1;
    while (target < floor && SCALE_RUNGS[target] > want) target++;
    return Math.min(target, scaleRung + MAX_JUMP_RUNGS, floor);
  }

  function settleDescent(): boolean {
    if (descendFromRung < 0) return false;
    const from = descendFromRung;
    const before = descendFromEma;
    descendFromRung = -1;
    if (frameEma <= before - DESCENT_PAYOFF_MS) {
      descentsKept++;
      return false;
    }
    descentsReverted++;
    noPayoffRung = scaleRung;
    noPayoffFrame = ctx.frame;
    scaleRung = from;
    scaleCooldown = RECOVER_COOLDOWN;
    cleanFrames = 0;
    pipeline.setDynamicScale(SCALE_RUNGS[scaleRung]);
    console.warn(
      `[frame] render scale ${SCALE_RUNGS[noPayoffRung]} bought ` +
      `${(before - frameEma).toFixed(2)}ms of ${DESCENT_PAYOFF_MS}ms needed ` +
      `(${before.toFixed(1)} -> ${frameEma.toFixed(1)}ms); reverting to ` +
      `${SCALE_RUNGS[scaleRung]} and locking that rung out`,
    );
    return true;
  }

  /** True while the display surface is unusable (hidden pane, background tab). */
  let surfaceValid = true;

  function reportProgress(frac: number, label: string) {
    options.onBootProgress?.(frac, label);
  }

  async function boot(): Promise<void> {
    perfMark('boot:start');
    for (let i = 0; i < systems.length; i++) {
      if (i > 3 && i <= 6) continue;

      const label = SYSTEM_LABELS[i] ?? `system_${i}`;
      reportProgress(i / (systems.length + 1), label);
      perfSpan(`system-wait:${label}`, 'start');
      await new Promise((r) => requestAnimationFrame(r));
      perfSpan(`system-wait:${label}`, 'end');

      perfSpan(`system-init:${label}`, 'start');
      if (i === 3) {
        if (!worldBatchesComplete) {
          worldBatchRunner ??= buildWorldBatchRunner();
          worldBatchRunner.runAll();
          worldBatchesComplete = true;
        }
      } else {
        const sys = systems[i];
        if (sys.initBatches) {
          new IncrementalBatchRunner(sys.initBatches(ctx)).runAll();
        } else {
          await sys.init?.(ctx);
        }
      }
      perfSpan(`system-init:${label}`, 'end');
    }
  // ---------------------------------------------------------------------------
  //  WebGL context loss — standalone only. A HOST owns its canvas and its own
  //  context-loss policy (Afterlight exits the session; see host/index.ts).
  // ---------------------------------------------------------------------------
  if (options.contextRecovery) {
    pipeline.onContextLost = () => {
      suspended = true;
    };
    pipeline.onContextRestored = async () => {
      // Re-bake the sky into the environment probe; the envRT clear works
      // around the PMREMGenerator allocate-on-reuse bug documented in the old
      // main.ts (PMREMGenerator must allocate its LOD chain fresh per bake).
      try {
        (sky as unknown as { envRT: THREE.WebGLRenderTarget | null }).envRT = null;
        sky.refreshEnvironment(ctx);
      } catch (err) {
        console.error('[restore] environment re-bake failed', err);
      }

      try {
        const warm = await prewarm(ctx);
        console.info(`[restore] re-warmed ${warm.programsBefore} -> ${warm.programsAfter} programs in ${warm.ms}ms`);
      } catch (err) {
        console.error('[restore] pre-warm failed; expect compile hitches', err);
      }

      // Hand the simulation a fresh clock and reset the ladder bookkeeping.
      renderCostEma = 16.7;
      frameEma = 16.7;
      cleanFrames = 0;
      probeFrames = PROBE_FRAMES_MIN;
      lastProbeFrame = -PROBE_FAIL_WINDOW;
      lastTickPresented = false;
      racingFrames = 0;
      skipRender = 0;
      scaleRung = 0;
      scaleCooldown = 0;
      descendFromRung = -1;
      descendFromEma = 0;
      noPayoffRung = -1;
      noPayoffFrame = 0;
      pipeline.setDynamicScale(SCALER_PINNED ? SCALER_PIN_VALUE : 1);
      renderFailures = 0;
      suspended = false;
    };
  }


    if (options.diagnostics) {
      frameWatch.init(ctx);
      diagnostics.init(ctx);
    }
    options.onSystemsReady?.();
    resize(true);

    // Compile every shader before the first frame is presented. Doing it here
    // costs a moment of boot; not doing it costs a dropped frame mid-race every
    // time a new material first appears, which reads as the screen flashing black.
    reportProgress(systems.length / (systems.length + 1), 'compiling shaders');
    perfSpan('system-wait:compiling shaders', 'start');
    await new Promise((r) => requestAnimationFrame(r));
    perfSpan('system-wait:compiling shaders', 'end');
    perfSpan('GPU-prepare', 'start');
    let warm;
    if (options.runGraphicsTransaction) {
      await options.runGraphicsTransaction(async () => {
        warm = await prewarm(ctx);
      });
    } else {
      warm = await prewarm(ctx);
    }
    perfSpan('GPU-prepare', 'end', { ...warm });
    console.info(
      `[prewarm] ${warm.programsBefore} -> ${warm.programsAfter} programs ` +
      `(${warm.objectsRevealed} hidden objects included) in ${warm.ms}ms`,
    );

    // Deliberately NOT race.start(): the director already sits in RaceState.Menu,
    // which is what puts the title screen and character select on screen.
    reportProgress(1, 'ready');
    perfMark('boot:end');

    // See `?scaler=`. Applied here so that the very first presented frame is
    // already at the pinned resolution.
    if (SCALER_PINNED) {
      scaleRung = 0;
      pipeline.setDynamicScale(SCALER_PIN_VALUE);
      console.info(`[frame] adaptive scaler PINNED at dynamic scale ${SCALER_PIN_VALUE} (?scaler=)`);
    }
  }

  // ---------------------------------------------------------------------------
  //  Frame: update + present (the old `frame()` minus the rAF re-arm)
  // ---------------------------------------------------------------------------
  function update(rawDt: number): void {
    const raw = rawDt;
    rawTickMs = raw * 1000;

    // Context gone, or the tab is not being composited. Do not simulate, do not
    // draw, do not allocate. (The host stops calling us when its own rAF stops;
    // these gates cover the in-between states both compositions share.)
    if (suspended || document.hidden || pipeline.contextLost) {
      tickGated = true;
      // The next tick's delta spans however long we were away, which is not a
      // frame interval. Say so, or the ladder reads a backgrounded tab as a stall.
      lastTickPresented = false;
      return;
    }
    tickGated = false;

    // Clamp so a stalled tab or a breakpoint never teleports anything.
    // `__freeze` holds the simulation still while the screenshot harness retries
    // a torn capture: rendering continues, so the compositor can produce a clean
    // frame, but nothing advances.
    const frozen = (window as any).__freeze === true;
    frozenTick = frozen;
    const dt = frozen ? 0 : Math.min(raw, 1 / 20);
    ctx.dt = dt;
    ctx.time += dt;
    ctx.frame++;

    simStart = performance.now();

    for (const s of systems) s.update?.(ctx, dt);
    for (const s of systems) s.lateUpdate?.(ctx, dt);
  }

  function present(): void {
    if (tickGated) return;

    // The harness is entitled to a present on every frozen frame — retrying a
    // torn capture is the whole reason `__freeze` exists — and so are the first
    // few frames, which is where the boot curtain / loading overlay are decided.
    const maySkip = !frozenTick && ctx.frame > WATCHDOG_FROM_FRAME;
    let presented = false;
    // Nothing usable can be presented onto a surface that is hidden or collapsed
    // and attempting it is how a one-pixel buffer reaches the compositor. The
    // simulation keeps running; only the present is withheld.
    if (!surfaceValid && maySkip) {
      // no present this frame
    } else if (skipRender > 0 && maySkip) {
      skipRender--;
    } else {
      presented = true;
      try {
        pipeline.render(ctx);
        renderFailures = 0;
        if (options.diagnostics) frameWatch.afterPresent(ctx);
        if (options.diagnostics) diagnostics.afterPresent(ctx, sceneDrawCalls());
      } catch (err) {
        renderFailures++;
        console.error(`[frame] render threw (${renderFailures} in a row)`, err);
        // A chain that throws once per frame is a black rectangle with a busy
        // CPU. Retreat to the direct render — which is a real, legible frame —
        // rather than keep failing in a more sophisticated way.
        if (renderFailures === 4) pipeline.disablePostProcessing('render threw four frames running');
        if (renderFailures >= 24) {
          console.error('[frame] renderer is not recoverable; suspending the loop');
          pipeline.announce('Graphics stopped', 'Reload the page to start again.');
          suspended = true;
        }
      }
    }

    if (presented) {
      const cost = performance.now() - simStart;
      renderCostEma += (cost - renderCostEma) * 0.12;

      // Only a racing frame is a frame the ladder may reason about.
      const racing = ctx.race.state === RaceState.Racing;
      racingFrames = racing ? racingFrames + 1 : 0;

      const intervalMs = rawTickMs;
      const usable = racing && lastTickPresented && !frozenTick &&
        intervalMs > 1 && intervalMs < 100;
      if (usable) {
        frameEma += (intervalMs - frameEma) * FRAME_EMA_ALPHA;
        cleanFrames = intervalMs <= FRAME_CLEAN_MS && frameEma <= FRAME_CLEAN_MS
          ? cleanFrames + 1
          : Math.max(0, cleanFrames - CLEAN_LEAK);
      }

      if (cost > STALL_MS) {
        stallCount++;
        if (stallCount <= 5) {
          console.warn(`[frame] ${Math.round(cost)}ms frame; skipping the next present to drain`);
        }
        skipRender = 1;
      } else if (ctx.frame <= WATCHDOG_FROM_FRAME) {
        // Boot frames are enormous and poison the average; hold it at target
        // until the scene has actually settled.
        renderCostEma = 16.7;
        frameEma = 16.7;
        cleanFrames = 0;
      } else if (SCALER_PINNED) {
        // Pinned run: averages still maintained for `loopHealth`; the ladder
        // never spends resolution.
      } else if (racingFrames < RACING_SETTLE_FRAMES) {
        // Not racing, or not long enough yet.
      } else if (scaleCooldown > 0) {
        if (--scaleCooldown === 0) settleDescent();
      } else if ((frameEma > FRAME_SLOW_MS || renderCostEma > SLOW_MS) &&
                 (renderCostEma < CPU_BOUND_MS || renderCostEma > SLOW_MS) &&
                 scaleRung < lowestRung()) {
        if (ctx.frame - lastProbeFrame < PROBE_FAIL_WINDOW) {
          probeFrames = Math.min(PROBE_FRAMES_MAX, probeFrames * 2);
        }
        descendFromRung = scaleRung;
        descendFromEma = frameEma;
        scaleRung = descendTarget();
        scaleCooldown = SCALE_COOLDOWN;
        cleanFrames = 0;
        pipeline.setDynamicScale(SCALE_RUNGS[scaleRung]);
        console.warn(
          `[frame] ${frameEma.toFixed(1)}ms between presented frames ` +
          `(submit ${renderCostEma.toFixed(1)}ms); render scale -> ${SCALE_RUNGS[scaleRung]} ` +
          `(every frame still presented)`,
        );
      } else if (scaleRung > 0 && cleanFrames >= probeFrames) {
        scaleRung--;
        scaleCooldown = RECOVER_COOLDOWN;
        cleanFrames = 0;
        lastProbeFrame = ctx.frame;
        pipeline.setDynamicScale(SCALE_RUNGS[scaleRung]);
        console.info(
          `[frame] ${Math.round(probeFrames / 60)}s of clean frames at ${frameEma.toFixed(1)}ms; ` +
          `probing render scale -> ${SCALE_RUNGS[scaleRung]}`,
        );
      }
    }
    lastTickPresented = presented;
  }

  // ---------------------------------------------------------------------------
  //  Resize (moved verbatim; coalescing stays with the composition that owns
  //  the resize EVENTS — the shell listens in standalone, the host calls
  //  `resize()` from its own listener)
  // ---------------------------------------------------------------------------
  /**
   * @param force push the size through even when it has not changed. Boot needs
   *   this: `ctx.width`/`ctx.height` are seeded from the same measurement, so an
   *   unconditional early-out would mean no system ever received its first
   *   `resize()` and every layout that is only computed there — the HUD's safe
   *   area, the minimap box — would keep whatever it guessed at construction.
   */
  function resize(force = false) {
    const size = options.viewport();
    if (size === null) {
      // Hidden or collapsed. Deliberately do NOT resize: tearing the buffers
      // down to 1x1 is what produced the black flash.
      surfaceValid = false;
      return;
    }
    const { w, h } = size;
    const wasInvalid = !surfaceValid;
    surfaceValid = true;
    if (!force && !wasInvalid && w === ctx.width && h === ctx.height) return;
    ctx.width = w;
    ctx.height = h;
    ctx.camera.aspect = w / h;
    ctx.camera.updateProjectionMatrix();
    for (const s of systems) s.resize?.(w, h);
  }

  function setMuted(m: boolean) {
    muted = m;
    ctx.settings.masterVolume = m ? 0 : baseMasterVolume;
  }

  function loopHealth(): Record<string, unknown> {
    return {
      frame: ctx.frame,
      renderCostEma: +renderCostEma.toFixed(2),
      frameEma: +frameEma.toFixed(2),
      cleanFrames,
      probeFrames,
      racingFrames,
      renderScale: SCALE_RUNGS[scaleRung],
      scaleRung,
      lowestRung: lowestRung(),
      baseCssRatio: +baseCssRatio().toFixed(3),
      descentsKept,
      descentsReverted,
      noPayoffRung,
      scalerPinned: SCALER_PINNED,
      dynamicScale: pipeline?.dynamicScale ?? 1,
      stalls: stallCount,
      renderFailures,
      suspended,
      contextLost: pipeline.contextLost,
      muted,
    };
  }

  function beginSession() {
    if (hosted) {
      hud.enterSession();
      audio.enterSession();
    }
    input.enter();
  }

  function endSession() {
    input.leave();
    if (hosted) {
      hud.leaveSession();
      audio.leaveSession();
    }
  }

  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    endSession();
    resetWorldPrepareState();
    // Reverse order: consumers before their dependencies (drawBudget first,
    // pipeline last — mirroring the init order's "load-bearing" list).
    for (let i = systems.length - 1; i >= 0; i--) {
      try { systems[i].dispose?.(); } catch { /* keep tearing down */ }
    }
  }

  return {
    ctx, systems, pipeline, race, input, audio, sky, hud, camera, drawBudget,
    boot, update, present, resize, setMuted, loopHealth, beginSession, endSession,
    prepareWorldSlice, isWorldBatchesComplete, dispose,
  };
}
