import type * as THREE from 'three';
import type { Ctx, RaceState, Quality } from '../types';

/**
 * Host boundary for Kart Royale (integrate-kart-royale-arcade).
 *
 * The game can run in two compositions:
 *
 *  - STANDALONE (`src/main.ts`): the shell creates the renderer through the
 *    pipeline's own canvas parent, owns the RAF loop, the boot curtain, the
 *    `window.__*` harness hooks and context recovery.
 *  - HOSTED (Afterlight's arcade cabinet): the host owns the single
 *    WebGLRenderer, canvas, RAF loop and resize events, and drives the game
 *    through `createKartRoyaleHost`. The game keeps its scene, camera,
 *    post-processing composer, input parsing, HUD, audio and race state.
 *
 * When hosted, the game MUST NOT:
 *  - create a second WebGLRenderer or canvas,
 *  - start its own requestAnimationFrame loop,
 *  - install context-loss listeners on the host canvas,
 *  - read `location.search` (host URL params belong to the host),
 *  - patch `console`, publish `window.__*` globals, or install the Recorder.
 */

/** Quality/feature overrides a host may clamp; see `core/Settings.ts`. */
export interface HostSettingsOverrides {
  quality?: Quality;
  /** Clamp the tier's `maxPixelRatio` (e.g. a host-side DPR policy). */
  maxPixelRatio?: number;
  renderScale?: number;
}

export interface HostAudioOptions {
  /** Host-owned AudioContext. When present the game never closes it. */
  context?: AudioContext | null;
  /** Bus the game's master gain connects into (defaults to context.destination). */
  destination?: AudioNode | null;
}

export interface KartRoyaleHostOptions {
  /** REQUIRED when hosted: the host's single WebGLRenderer. */
  renderer: THREE.WebGLRenderer;
  /** CSS-pixel viewport provider; `null` return means "no usable surface yet". */
  viewport: () => { width: number; height: number } | null;
  /** Explicit HUD host element (the game must not touch other DOM roots). */
  hudHost: HTMLElement;
  audio?: HostAudioOptions;
  /** Host quality overrides; hosted mode never reads `location.search`. */
  params?: HostSettingsOverrides;
  /** First screen the player lands on. Hosted uses 'select' (cabinet = title). */
  startScreen?: 'title' | 'select';
  /** Boot progress for the host's loading UI (0..1 with a step label). */
  onBootProgress?: (frac: number, label: string) => void;
  /** Irrecoverable failure inside the game; the host exits the session. */
  onFatal?: (title: string, detail: string) => void;
  /**
   * The player chose to leave through the game's own UI (pause menu
   * "Leave cabinet" / results "Back to the arcade"). The host tears the
   * session down through its normal exit path.
   */
  onExitRequest?: () => void;
  /** Optional perf reporting hooks (fix-kart-royale-instant-entry D10) */
  perfSpan?: (name: string, action: 'start' | 'end', meta?: Record<string, unknown>) => void;
  perfMark?: (phase: string, data?: unknown) => void;
  /** Host frame-bound graphics transaction (fix-kart-royale-instant-entry D4). */
  runGraphicsTransaction?: ((fn: (ctx: {
    renderer: THREE.WebGLRenderer;
    viewport: { width: number; height: number };
  }) => void | Promise<void>) => Promise<void>) | null;
}

/** Thin, host-safe race controls (pass-throughs to `game/Race.ts`). */
export interface KartRoyaleRaceControls {
  selectKart(index: number): void;
  reset(): void;
  setPaused(paused: boolean): void;
  state(): RaceState;
}

export interface KartRoyaleInput {
  /** Route a trusted KeyboardEvent (host capture-phase listener). */
  handleKeyDown(event: KeyboardEvent): void;
  handleKeyUp(event: KeyboardEvent): void;
  /** Drop all held state (blur, pause, exit). */
  neutralize(): void;
}

export interface KartRoyaleHost {
  /**
   * Initialize every system and prewarm shaders. GL-state mutations happen in
   * here, so the host MUST have leased presentation (and stopped presenting
   * its own world) BEFORE calling this — see design.md D3.
   */
  boot(): Promise<void>;
  /** Pose the selection grid and camera without advancing simulation. */
  prepareSelectionReadiness(): boolean;
  /** True once grid support and menu camera pose have been validated. */
  isSelectionReady(): boolean;
  /** The game context (scene/camera exist before boot; boot fills the scene). */
  ctx: Ctx;
  /** Advance the simulation by `rawDt` seconds (host clamps/derives it). */
  update(rawDt: number): void;
  /** Present one frame through the game's own composer on the host renderer. */
  present(): void;
  /** Apply the game's renderer/pixel-ratio policy for a new surface size. */
  resize(width: number, height: number, force?: boolean): void;
  race: KartRoyaleRaceControls;
  input: KartRoyaleInput;
  /** Session begin/end: touch pad mount/unmount + key neutralization. */
  beginSession(): void;
  endSession(): void;
  setMuted(muted: boolean): void;
  /** True when the runtime has failed irrecoverably (host must exit). */
  dead: boolean;
  /**
   * Tear the world down: run every system's dispose, drop the Materials
   * singleton so a later re-init re-allocates, free GPU resources. Safe to
   * call once; the host must not use the instance afterwards.
   */
  dispose(): void;
}
