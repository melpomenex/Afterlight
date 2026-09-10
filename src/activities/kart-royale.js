/**
 * Kart Royale (integrate-kart-royale-arcade) — lightweight registry bootstrap
 * and public cabinet display, modeled on the Summit Run bystander module
 * (add-multiplayer-snowboard-arcade 2.4).
 *
 * This module is deliberately small and synchronous. `initialize()` returns
 * hooks immediately; the game itself lives in games/kart-royale/src/host/ and
 * is imported ONLY by the lazy controller (./kart-royale/controller.js) when a
 * player actually enters the cabinet — never for passive bystanders. Nothing
 * here may statically import or dynamically load game code (the
 * bystander-economy audit in tests/kart-royale-cabinet.test.js enforces it).
 *
 * What this module owns:
 *   - The canonical cabinet instance for `orpheum-kart-royale` (shared GLB +
 *     `kart` skin, primitive fallback with hot-swap) at the repurposed fourth
 *     row slot.
 *   - The bounded public screen: an animated attract mode (title, drifting
 *     kart silhouette, sparks, "PRESS E TO RACE") painted on the 2D composite
 *     canvas, and an occupied state derived ONLY from activity occupancy —
 *     v1 races are client-local, so there is no live telemetry to show and
 *     the display never fabricates standings.
 */

import { registerActivityModule } from './registry.js';
import {
  createScreenPipeline,
  createVisibilityThrottler,
} from './cabinetRenderer.js';
import { createArcadeCabinet } from '../arcade/cabinet.js';
import { startSpan as startPerfSpan, endSpan as endPerfSpan } from './kartPerf.js';
import { createResourceCache } from './resourceCache.js';
import { createKartRoyalePreparation } from './kartRoyalePreparation.js';
import { scheduleKartRoyaleModulePrefetch } from './kartRoyalePrefetch.js';
import { createKartRoyalePrepareScheduler } from './kartRoyalePrepareScheduler.js';
import { readKartPrepRollout } from './kartRoyaleRollout.js';
import './kartReadinessMetrics.js';
import './kartAllocationLedger.js';

const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 384;

const ACCENT = '#ffb347';
const GLOW = '#ff7a3c';
const INK = '#f6ead2';

/** Occupancy display never trusts more than the cabinet's one seat. */
const MAX_DISPLAY_PLAYERS = 1;

function sanitizeName(name) {
  return (typeof name === 'string' && name.length > 0 ? name : 'RACER').slice(0, 16);
}

/**
 * Pure reduction of one activity_state frame into the bounded display state.
 * Kart Royale sessions are admission-only (no server race sim), so the only
 * honest signals are occupancy (players/queue) and session status.
 */
export function occupancyToDisplayState(frame, previous = null) {
  if (!frame || typeof frame !== 'object') return previous;
  const players = Array.isArray(frame.players) ? frame.players : null;
  if (!players) return previous;
  const seated = players.slice(0, MAX_DISPLAY_PLAYERS).map((p) => ({
    playerId: typeof p?.playerId === 'string' ? p.playerId : '',
    nickname: sanitizeName(p?.nickname),
  }));
  return {
    status: seated.length > 0 ? 'occupied' : 'idle',
    playerCount: Math.min(MAX_DISPLAY_PLAYERS, seated.length),
    queueCount: Number.isInteger(frame.queueLength) ? Math.min(16, frame.queueLength) : 0,
    seated,
  };
}

export function createKartRoyaleInstance({
  activityDef,
  world,
  generation,
  getPlayer = null,
  getParticipation = null,
  roomId = null,
  acquireView = null,
  releaseView = null,
  getRenderer = null,
  net = null,
  audioMixer = null,
  toast = null,
  scheduleGraphicsJob = null,
  runGraphicsTransaction = null,
  cancelGraphicsJobs = null,
} = {}) {
  if (!activityDef || activityDef.type !== 'kart-royale') {
    throw new Error('kart-royale module requires a kart-royale activity definition');
  }

  const transform = activityDef.transform || { position: [10.42, 0, -1.8], rotationY: 0 };
  const pos = transform.position;
  const posX = pos[0];
  const posY = pos.length === 3 ? pos[1] : 0;
  const posZ = pos.length === 3 ? pos[2] : pos[1];
  const rotY = transform.rotationY || 0;

  const screenPipeline = createScreenPipeline({
    defaultWidth: CANVAS_WIDTH,
    defaultHeight: CANVAS_HEIGHT,
    focusedWidth: 1024,
    focusedHeight: 768,
  });
  const { canvas, ctx } = screenPipeline;

  const cabinet = createArcadeCabinet({
    activityDef,
    world,
    screenSource: canvas,
  });

  const group = cabinet.group;
  group.name = `activity-${activityDef.id}`;
  group.position.set(posX, posY, posZ);
  group.rotation.y = rotY;
  if (world?.group && group.parent !== world.group) {
    world.group.add(group);
  }

  const throttler = createVisibilityThrottler({
    getPosition: () => [posX, posY, posZ],
    getPlayer,
  });

  let displayState = {
    status: 'idle',
    playerCount: 0,
    queueCount: 0,
    seated: [],
  };
  let disposed = false;
  let needsPaint = true;
  // Lazy race controller: loaded ONLY on E entry — never for bystanders.
  let controllerPromise = null;
  let controller = null;
  let activationEpoch = 0;
  let pendingActivation = false;
  const prepRolloutEnabled = readKartPrepRollout({
    hasGraphicsTransactions: typeof runGraphicsTransaction === 'function',
  });
  const resourceCache = createResourceCache({
    idleEvictMs: 60_000,
    schedule: typeof setTimeout !== 'undefined' ? {
      after: (ms, fn) => setTimeout(fn, ms),
      cancel: (id) => clearTimeout(id),
    } : null,
  });
  const preparation = createKartRoyalePreparation({
    cache: resourceCache,
    placeGeneration: generation,
  });
  let backgroundHudRoot = null;
  function ensureBackgroundHudRoot() {
    if (backgroundHudRoot || typeof document === 'undefined') return backgroundHudRoot;
    backgroundHudRoot = document.createElement('div');
    backgroundHudRoot.className = 'kr-activity';
    backgroundHudRoot.hidden = true;
    document.body.appendChild(backgroundHudRoot);
    return backgroundHudRoot;
  }

  const prepareScheduler = createKartRoyalePrepareScheduler({
    preparation,
    getDistance: () => throttler.getDistance(),
    shouldRun: () => prepRolloutEnabled && !disposed && roomId === 'theater',
    isInputPending: () => pendingActivation,
    createBackgroundHost: (mod) => {
      const renderer = getRenderer?.();
      const hudHost = ensureBackgroundHudRoot();
      if (!renderer || !hudHost || !mod?.createKartRoyaleHost) return null;
      return mod.createKartRoyaleHost({
        renderer,
        viewport: () => ({
          width: typeof window !== 'undefined' ? window.innerWidth : 1280,
          height: typeof window !== 'undefined' ? window.innerHeight : 720,
        }),
        hudHost,
        startScreen: 'select',
        runGraphicsTransaction,
      });
    },
  });

  function loadController() {
    if (!controllerPromise) {
      startPerfSpan('controller-import');
      controllerPromise = preparation.prefetch()
        .catch(() => {})
        .then(() => import('./kart-royale/controller.js'))
        .then((module) => {
          endPerfSpan('controller-import');
          if (disposed) return null;
          const instance = module.createKartRoyaleController({
            activityDef,
            net,
            getParticipation,
            getRoomId: () => roomId,
            acquireView,
            releaseView,
            getRenderer,
            generation,
            getPlayer,
            audioMixer,
            toast,
            scheduleGraphicsJob,
            runGraphicsTransaction,
            cancelGraphicsJobs,
            preparation,
            retentionEnabled: prepRolloutEnabled,
            getDistance: () => throttler.getDistance(),
          });
          if (disposed) {
            instance.dispose();
            return null;
          }
          controller = instance;
          return instance;
        })
        .catch((error) => {
          endPerfSpan('controller-import', { error: String(error) });
          console.warn('[KartRoyale] controller load failed:', error);
          controllerPromise = null;
          return null;
        });
    }
    return controllerPromise;
  }

  // --- screen painting -------------------------------------------------------

  function paintBackground() {
    // Golden-hour dusk: warm gradient into the skin's deep base.
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    grad.addColorStop(0, '#3d1f0a');
    grad.addColorStop(1, activityDef.cabinet.skin.palette.base);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  /** Low sun with a haze band; cheap, deterministic, time-animated. */
  function paintSun(time) {
    const sunY = CANVAS_HEIGHT * 0.3;
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.06 * Math.sin(time * 1.7);
    ctx.fillStyle = GLOW;
    ctx.fillRect(0, sunY - CANVAS_HEIGHT * 0.05, CANVAS_WIDTH, CANVAS_HEIGHT * 0.1);
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(CANVAS_WIDTH * 0.7, sunY, CANVAS_WIDTH * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** A checkered road ribbon scrolling toward the player. */
  function paintRoad(time) {
    const horizon = CANVAS_HEIGHT * 0.52;
    const scroll = (time * 40) % 64;
    ctx.fillStyle = '#1c0f06';
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH * 0.44, horizon);
    ctx.lineTo(CANVAS_WIDTH * 1.06, CANVAS_HEIGHT);
    ctx.lineTo(-CANVAS_WIDTH * 0.06, CANVAS_HEIGHT);
    ctx.closePath();
    ctx.fill();
    // Centerline dashes running into the distance.
    ctx.strokeStyle = 'rgba(246,234,210,0.75)';
    ctx.lineWidth = 6;
    ctx.setLineDash([26, 22]);
    ctx.lineDashOffset = -scroll;
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH * 0.485, horizon + 8);
    ctx.lineTo(CANVAS_WIDTH * 0.5, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /** Drifting kart silhouette with spark particles (pure canvas, ~20 shapes). */
  function paintKart(time) {
    const kx = CANVAS_WIDTH * 0.38 + Math.sin(time * 0.9) * CANVAS_WIDTH * 0.05;
    const ky = CANVAS_HEIGHT * 0.72;
    ctx.save();
    ctx.translate(kx, ky);
    ctx.rotate(-0.14 + Math.sin(time * 1.3) * 0.03);
    ctx.fillStyle = ACCENT;
    ctx.beginPath();
    ctx.moveTo(-CANVAS_WIDTH * 0.13, 0);
    ctx.quadraticCurveTo(-CANVAS_WIDTH * 0.04, -CANVAS_HEIGHT * 0.08, CANVAS_WIDTH * 0.11, -CANVAS_HEIGHT * 0.02);
    ctx.lineTo(CANVAS_WIDTH * 0.13, CANVAS_HEIGHT * 0.02);
    ctx.lineTo(-CANVAS_WIDTH * 0.1, CANVAS_HEIGHT * 0.04);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(-CANVAS_WIDTH * 0.015, -CANVAS_HEIGHT * 0.065, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#120a04';
    for (const [wx, wy] of [[-0.105, 0.028], [0.095, 0.018]]) {
      ctx.beginPath();
      ctx.arc(CANVAS_WIDTH * wx, CANVAS_HEIGHT * wy, 12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Sparks kick off the rear wheel.
    for (let i = 0; i < 7; i++) {
      const t = ((time * 1.6 + i * 0.14) % 1);
      ctx.globalAlpha = 0.85 - t * 0.6;
      ctx.fillStyle = i % 2 ? GLOW : INK;
      ctx.beginPath();
      ctx.arc(kx - CANVAS_WIDTH * (0.16 + t * 0.16), ky + CANVAS_HEIGHT * (0.025 + Math.sin(i * 2.1) * 0.015), 2.5 * (1 + t), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function paintAttract(time) {
    paintBackground();
    paintSun(time);
    paintRoad(time);
    paintKart(time);
    const pulse = 0.55 + Math.sin(time * 3) * 0.35;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = GLOW;
    ctx.shadowBlur = 16;
    ctx.fillStyle = INK;
    ctx.font = `bold ${Math.round(CANVAS_WIDTH * 0.115)}px monospace`;
    ctx.fillText('KART ROYALE', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.2);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#d8b98a';
    ctx.font = '14px monospace';
    ctx.fillText('DRIFT • BOOST • WIN', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.2 + 30);
    ctx.fillStyle = `rgba(255, 209, 102, ${pulse.toFixed(2)})`;
    ctx.font = 'bold 17px monospace';
    ctx.fillText('PRESS E TO RACE', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.9);
  }

  function paintOccupied() {
    paintBackground();
    paintSun(0);
    // Speed lines convey "racing" without fabricating live standings.
    ctx.strokeStyle = ACCENT;
    for (let i = 0; i < 5; i++) {
      ctx.globalAlpha = 0.2 + i * 0.1;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH * (0.1 + i * 0.04), CANVAS_HEIGHT * 0.12);
      ctx.lineTo(CANVAS_WIDTH * (0.3 + i * 0.05), CANVAS_HEIGHT * 0.55);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(36, 20, 8, 0.85)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, 36);
    ctx.fillStyle = ACCENT;
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('KART ROYALE · RACING', CANVAS_WIDTH / 2, 18);
    ctx.fillStyle = INK;
    ctx.font = 'bold 24px monospace';
    ctx.fillText(displayState.seated[0]?.nickname ?? 'RACER', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.42);
    if (displayState.queueCount > 0) {
      ctx.fillStyle = '#d8b98a';
      ctx.font = '14px monospace';
      ctx.fillText(`${displayState.queueCount} IN QUEUE`, CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.6);
    }
  }

  function repaint(time) {
    if (!ctx) return;
    if (displayState.status === 'occupied') paintOccupied();
    else paintAttract(time);
    screenPipeline.update();
  }

  // --- snapshot / event / result routing -------------------------------------

  const instance = {
    id: activityDef.id,
    type: activityDef.type,
    group,
    get cabinetMesh() { return cabinet.bodyMesh; },
    get screenMesh() { return cabinet.screenMesh; },
    get activityCamera() { return cabinet.activityCamera; },
    usingModel: cabinet.usingModel,

    /** Test/verification seam: the current bounded display state. */
    getDisplayState() {
      return displayState;
    },

    /** Preparation handle (fix-kart-royale-instant-entry D2). */
    get preparation() {
      return preparation;
    },

    /** One idle controller-module prefetch after Theater interactivity (5.1). */
    scheduleIdleModulePrefetch({ roomId: prefetchRoomId = roomId } = {}) {
      if (disposed || !prepRolloutEnabled) {
        return { scheduled: false, reason: disposed ? 'disposed' : 'rollout-disabled' };
      }
      return scheduleKartRoyaleModulePrefetch({
        preparation,
        roomId: prefetchRoomId,
        onRun: () => {
          prepareScheduler.enableAfterModulePrefetch();
        },
      });
    },

    getPrepareFrameBudgetMs() {
      if (disposed || (typeof document !== 'undefined' && document.hidden)) return 0;
      return prepareScheduler.getFrameBudgetMs();
    },

    tickBackgroundPreparation({
      maxMs = null,
      viewLeaseHeld = false,
      framePressure = false,
    } = {}) {
      if (disposed) return { ran: false, reason: 'disposed' };
      if (typeof document !== 'undefined' && document.hidden) {
        prepareScheduler.pause('hidden-tab');
        return { ran: false, reason: 'hidden-tab' };
      }
      prepareScheduler.resume();
      const budget = maxMs ?? prepareScheduler.getFrameBudgetMs();
      return prepareScheduler.tick({
        maxMs: budget,
        viewLeaseHeld,
        framePressure,
      });
    },

    /**
     * Optional pre-join participation flow: route E here BEFORE the generic
     * join. Loads the game controller (cancellable), which then requests play
     * admission and takes over presentation when its seat is accepted.
     */
    beginParticipation() {
      if (disposed) return Promise.resolve(false);
      if (pendingActivation) {
        return controllerPromise
          ? controllerPromise.then((inst) => inst?.beginParticipation() ?? true)
            .catch((error) => {
              console.warn('[KartRoyale] beginParticipation failed:', error);
              return false;
            })
          : Promise.resolve(true);
      }
      const epoch = ++activationEpoch;
      pendingActivation = true;
      return loadController().then((inst) => {
        if (disposed || activationEpoch !== epoch) {
          pendingActivation = false;
          inst?.cancelActivation?.();
          return false;
        }
        if (!inst) {
          pendingActivation = false;
          return false;
        }
        return inst.beginParticipation().then((ok) => {
          if (disposed || activationEpoch !== epoch) {
            pendingActivation = false;
            inst.cancelActivation?.();
            return false;
          }
          pendingActivation = inst.pendingActivation ?? false;
          return ok;
        });
      })
        .catch((error) => {
          // A start can fail mid-init (a graphics reset kills PMREM inside the
          // environment bake, a stale deploy kills the chunk import). It must
          // never leak an unhandled rejection or leave this bystander stuck
          // believing an activation is still pending.
          console.warn('[KartRoyale] beginParticipation failed:', error);
          pendingActivation = false;
          cancelActivation();
          toast?.('Kart Royale', 'The cabinet could not start — try again in a moment.');
          return false;
        });
    },

    cancelActivation() {
      activationEpoch += 1;
      pendingActivation = false;
      cancelGraphicsJobs?.();
      controller?.cancelActivation?.();
    },

    /** Occupancy frames drive the cabinet display; nothing else is consumed. */
    acceptSnapshot(frame) {
      if (disposed || !frame) return;
      if (frame.activityId && frame.activityId !== activityDef.id) return;
      if (controller) controller.acceptSnapshot(frame);
      const next = occupancyToDisplayState(frame, displayState);
      if (!next || next === displayState) return;
      displayState = next;
      needsPaint = true;
    },

    acceptEvent(frame) {
      if (disposed || !frame) return;
      if (frame.activityId && frame.activityId !== activityDef.id) return;
      controller?.acceptEvent?.(frame);
    },

    acceptResult(frame) {
      if (disposed || !frame) return;
      if (frame.activityId && frame.activityId !== activityDef.id) return;
      controller?.acceptResult?.(frame);
    },

    acceptError(frame) {
      if (disposed || !frame) return;
      if (frame.activityId && frame.activityId !== activityDef.id) return;
      controller?.acceptError?.(frame);
    },

    neutralizeInput() {
      // The lightweight module owns no input capture.
      controller?.neutralizeInput?.();
    },

    update(time, delta) {
      if (disposed) return;
      if (controller) controller.update(time, delta);
      const visible = throttler.shouldRender(false, true);
      // The attract mode is time-animated, so repaint whenever the machine is
      // visible; occupied/idle transitions repaint via needsPaint.
      if (needsPaint || (displayState.status === 'idle' && visible)) {
        if (visible) {
          repaint(time);
          needsPaint = false;
        }
      }
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      activationEpoch += 1;
      pendingActivation = false;
      controller?.cancelActivation?.();
      if (controller) controller.dispose();
      controller = null;
      controllerPromise = null;
      prepareScheduler.disable();
      backgroundHudRoot?.remove();
      backgroundHudRoot = null;
      preparation.dispose();
      screenPipeline.dispose();
      cabinet.dispose();
    },
  };

  return instance;
}

registerActivityModule('kart-royale', {
  initialize(context) {
    return createKartRoyaleInstance(context);
  },
});
