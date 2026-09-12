/**
 * Downhill Mayhem (integrate-multiplayer-downhill-mayhem-arcade) — lightweight
 * registry bootstrap and public cabinet display.
 *
 * Deliberately small and synchronous. `initialize()` returns hooks
 * immediately; the race controller and the game host live behind a single
 * lazy dynamic import (`./downhill/controller.js`) taken only when a rider
 * presses E — never for passive bystanders. Nothing here may statically import
 * or dynamically load the game (the bystander-economy audit in
 * tests/downhill-mayhem-cabinet.test.js enforces exactly one dynamic import).
 *
 * What this module owns:
 *   - the canonical cabinet instance for `orpheum-downhill-mayhem` at the
 *     repurposed Signal Lost transform (shared GLB + `downhill` skin,
 *     primitive fallback with hot-swap);
 *   - a bounded public display painted from `audience:'summary'` frames only:
 *     animated attract, lobby roster (humans + AI, mountain, difficulty,
 *     captain, ready), countdown, ranked racing progress with a human/AI
 *     distinction, and final results. Full participant snapshots never change
 *     this display and never instantiate a 3D mountain.
 */

import { registerActivityModule } from './registry.js';
import {
  createScreenPipeline,
  createVisibilityThrottler,
} from './cabinetRenderer.js';
import { createArcadeCabinet } from '../arcade/cabinet.js';
import { createResourceCache } from './resourceCache.js';
import { createDownhillMayhemPreparation } from './downhillMayhemPreparation.js';
import {
  createDownhillMayhemPrepareScheduler,
  resolveCraftedCourseDocument,
} from './downhillMayhemPrepareScheduler.js';
import { scheduleKartRoyaleModulePrefetch } from './kartRoyalePrefetch.js';

const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 384;

/** Six-rider field (design D4). */
const MAX_SUMMARY_RIDERS = 6;
/** Clients dedupe events by eventId (design D7). */
const EVENT_DEDUPE_CAP = 64;

const ACCENT = '#ff7a3c';
const GLOW = '#ffd166';
const INK = '#f2ecd9';

function sanitizeName(name) {
  const text = typeof name === 'string' && name.length > 0 ? name : 'RIDER';
  return text.slice(0, 16);
}

function formatTime(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '--.--';
  return `${(ms / 1000).toFixed(2)}s`;
}

/** Pure reduction of one `audience:'summary'` frame into bounded display state. */
export function summaryToDisplayState(frame, previous = null) {
  const summary = frame?.summary;
  if (!summary || typeof summary !== 'object') return previous;
  const source = Array.isArray(summary.riders)
    ? summary.riders
    : Array.isArray(summary.progress)
      ? summary.progress
      : [];
  const riders = source.slice(0, MAX_SUMMARY_RIDERS).map((r) => ({
    playerId: typeof r?.playerId === 'string' ? r.playerId : '',
    slot: Number.isInteger(r?.slot) ? r.slot : null,
    nickname: sanitizeName(r?.nickname),
    isAI: r?.isAI === true,
    ready: r?.ready === true,
    place: Number.isInteger(r?.place) ? r.place : null,
    timeMs: Number.isFinite(r?.timeMs) ? r.timeMs : null,
    finished: r?.finished === true || r?.status === 'finished',
    status: typeof r?.status === 'string' ? r.status : 'racing',
    dnfReason: typeof r?.dnfReason === 'string' ? r.dnfReason : null,
    normalizedProgress: Number.isFinite(r?.normalizedProgress)
      ? Math.max(0, Math.min(1, r.normalizedProgress))
      : 0,
    distanceS: Number.isFinite(r?.distanceS) ? r.distanceS : null,
  }));
  riders.sort((a, b) => {
    if (a.finished !== b.finished) return a.finished ? -1 : 1;
    if (a.place != null && b.place != null && a.place !== b.place) return a.place - b.place;
    return b.normalizedProgress - a.normalizedProgress;
  });
  const result = summary.result && typeof summary.result === 'object' ? {
    kind: summary.result.kind,
    recordingStatus: summary.result.recordingStatus,
    reason: summary.result.reason,
    standings: Array.isArray(summary.result.standings)
      ? summary.result.standings.slice(0, MAX_SUMMARY_RIDERS)
      : [],
  } : null;
  return {
    status: typeof frame.status === 'string' ? frame.status : previous?.status ?? 'idle',
    matchId: typeof frame.matchId === 'string' ? frame.matchId : previous?.matchId ?? null,
    riderCount: Math.min(MAX_SUMMARY_RIDERS, Number.isInteger(summary.riderCount) ? summary.riderCount : riders.length),
    readyCount: Math.min(MAX_SUMMARY_RIDERS, Number.isInteger(summary.readyCount) ? summary.readyCount : 0),
    capacity: Number.isInteger(summary.capacity) ? summary.capacity : 6,
    mountain: typeof summary.mountain === 'string' ? summary.mountain : previous?.mountain ?? 'classic',
    difficulty: typeof summary.difficulty === 'string' ? summary.difficulty : previous?.difficulty ?? 'mayhem',
    captainName: typeof summary.captainName === 'string' ? summary.captainName : previous?.captainName ?? null,
    riders,
    result,
    countdownStartAt: previous?.countdownStartAt ?? null,
    abortedReason: null,
  };
}

export function createDownhillMayhemInstance({
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
  runGraphicsTransaction = null,
  notifyPresentationTerminal = null,
} = {}) {
  if (!activityDef || activityDef.type !== 'downhill-mayhem') {
    throw new Error('downhill-mayhem module requires a downhill-mayhem activity definition');
  }

  const transform = activityDef.transform || { position: [10.42, 0, -3.85], rotationY: -Math.PI / 2 };
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
  const { ctx } = screenPipeline;

  const cabinet = createArcadeCabinet({ activityDef, world, screenSource: screenPipeline.canvas });
  const group = cabinet.group;
  group.name = `activity-${activityDef.id}`;
  group.position.set(posX, posY, posZ);
  group.rotation.y = rotY;
  if (world?.group && group.parent !== world.group) world.group.add(group);

  const throttler = createVisibilityThrottler({ getPosition: () => [posX, posY, posZ], getPlayer });

  const resourceCache = createResourceCache({
    idleEvictMs: 60_000,
    schedule: typeof setTimeout !== 'undefined' ? {
      after: (ms, fn) => setTimeout(fn, ms),
      cancel: (id) => clearTimeout(id),
    } : null,
  });
  const preparation = createDownhillMayhemPreparation({ cache: resourceCache, placeGeneration: generation });

  // Staged background preparation (7.2–7.4): only in a host that can run
  // renderer transactions (the browser); a retained prepared host makes
  // repeated entry instant.
  const prepEnabled = typeof runGraphicsTransaction === 'function';
  const prepareScheduler = createDownhillMayhemPrepareScheduler({
    preparation,
    getDistance: () => throttler.getDistance(),
    shouldRun: () => prepEnabled && !disposed && roomId === 'theater',
    isInputPending: () => pendingActivation,
    resolveCourseDocument: () => resolveCraftedCourseDocument(activityDef.course?.id ?? 'classic'),
    runTransaction: runGraphicsTransaction,
    createBackgroundHost: (mod, { courseDocument }) => {
      const renderer = getRenderer?.();
      if (!renderer || !mod?.createDownhillMayhemHost) return null;
      return mod.createDownhillMayhemHost({
        renderer,
        viewport: () => ({
          width: typeof window !== 'undefined' ? window.innerWidth : 1280,
          height: typeof window !== 'undefined' ? window.innerHeight : 720,
        }),
        hudHost: null,
        params: { difficulty: 'mayhem' },
        courseDocument,
        authority: 'remote',
      });
    },
  });

  let displayState = {
    status: 'idle',
    matchId: null,
    riderCount: 0,
    readyCount: 0,
    capacity: activityDef.capacities?.players ?? 6,
    mountain: 'classic',
    difficulty: 'mayhem',
    captainName: null,
    riders: [],
    result: null,
    countdownStartAt: null,
    abortedReason: null,
  };
  let disposed = false;
  let needsPaint = true;
  const seenEventIds = new Set();
  let controllerPromise = null;
  let controller = null;
  let activationEpoch = 0;
  let pendingActivation = false;

  function loadController() {
    if (!controllerPromise) {
      controllerPromise = preparation.prefetch()
        .catch(() => {})
        .then(() => import('./downhill/controller.js'))
        .then((module) => {
          if (disposed) return null;
          const instance = module.createDownhillController({
            activityDef,
            net,
            getParticipation,
            getRoomId: () => roomId,
            acquireView,
            releaseView,
            getRenderer,
            generation,
            getPlayer,
            preparation,
            audioMixer,
            toast,
            runGraphicsTransaction,
            retentionEnabled: prepEnabled,
            getDistance: () => throttler.getDistance(),
            notifyPresentationTerminal,
          });
          if (disposed) {
            instance.dispose();
            return null;
          }
          controller = instance;
          return instance;
        })
        .catch((error) => {
          console.warn('[DownhillMayhem] controller load failed:', error);
          controllerPromise = null;
          return null;
        });
    }
    return controllerPromise;
  }

  // --- screen painting -------------------------------------------------------

  function paintBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    grad.addColorStop(0, '#0a1a14');
    grad.addColorStop(1, activityDef.cabinet.skin.palette.base);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  function paintHeader(text, color = ACCENT) {
    ctx.fillStyle = 'rgba(4, 12, 9, 0.85)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, 34);
    ctx.fillStyle = color;
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, CANVAS_WIDTH / 2, 17);
  }

  /** Alpine ridge + a rider silhouette (cheap 2D canvas; no 3D scene). */
  function paintRidge(time) {
    const horizon = CANVAS_HEIGHT * 0.42;
    ctx.fillStyle = 'rgba(20, 44, 34, 0.9)';
    ctx.beginPath();
    ctx.moveTo(0, horizon + 40);
    for (let x = 0; x <= CANVAS_WIDTH; x += 24) {
      const y = horizon - Math.sin(x * 0.02 + time * 0.4) * 26;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.lineTo(0, CANVAS_HEIGHT);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 209, 102, 0.85)';
    ctx.beginPath();
    ctx.arc(CANVAS_WIDTH * 0.72, horizon - 22, 20, 0, Math.PI * 2);
    ctx.fill();
  }

  function paintAttract(time) {
    paintBackground();
    paintRidge(time);
    const pulse = 0.55 + Math.sin(time * 3) * 0.35;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = GLOW;
    ctx.shadowBlur = 16;
    ctx.fillStyle = INK;
    ctx.font = `bold ${Math.round(CANVAS_WIDTH * 0.1)}px monospace`;
    ctx.fillText('DOWNHILL MAYHEM', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.32);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#9fc4b4';
    ctx.font = '14px monospace';
    ctx.fillText('RIDE • TRICK • FIGHT', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.32 + 30);
    ctx.fillStyle = `rgba(255, 209, 102, ${pulse.toFixed(2)})`;
    ctx.font = 'bold 17px monospace';
    ctx.fillText('PRESS E TO RIDE', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.84);
  }

  function paintLobby() {
    paintBackground();
    paintHeader('DOWNHILL MAYHEM · LOBBY');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = INK;
    ctx.font = 'bold 22px monospace';
    ctx.fillText(`${displayState.riderCount} / ${displayState.capacity} RIDERS`, CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.3);
    ctx.fillStyle = ACCENT;
    ctx.font = '14px monospace';
    ctx.fillText(`${displayState.readyCount} READY`, CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.3 + 24);
    ctx.fillStyle = '#9fc4b4';
    ctx.font = '13px monospace';
    ctx.fillText(
      `${String(displayState.mountain).toUpperCase()} · ${String(displayState.difficulty).toUpperCase()}`,
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT * 0.52,
    );
    const rows = displayState.riders.slice(0, 6);
    let y = CANVAS_HEIGHT * 0.62;
    for (const [index, rider] of rows.entries()) {
      ctx.fillStyle = rider.isAI ? '#7d9288' : INK;
      ctx.font = '12px monospace';
      ctx.fillText(`${index + 1}  ${rider.nickname}${rider.isAI ? ' [AI]' : ''}`, CANVAS_WIDTH / 2, y);
      y += 18;
    }
  }

  function paintCountdown(time) {
    paintBackground();
    paintHeader('DOWNHILL MAYHEM · STARTING');
    const remaining = displayState.countdownStartAt
      ? Math.max(0, Math.ceil((displayState.countdownStartAt - Date.now()) / 1000))
      : null;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = GLOW;
    ctx.shadowBlur = 18;
    ctx.fillStyle = INK;
    ctx.font = `bold ${Math.round(CANVAS_WIDTH * 0.3)}px monospace`;
    ctx.fillText(remaining !== null ? String(Math.min(remaining, 9)) : '·', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.44);
    ctx.shadowBlur = 0;
    ctx.fillStyle = ACCENT;
    ctx.font = '14px monospace';
    ctx.fillText('GATES OPEN — GOOD LUCK', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.82);
    void time;
  }

  function paintRacing() {
    paintBackground();
    paintHeader('DOWNHILL MAYHEM · LIVE RACE');
    const rows = displayState.riders.slice(0, 6);
    let y = 64;
    ctx.textBaseline = 'middle';
    for (const [index, rider] of rows.entries()) {
      ctx.textAlign = 'left';
      ctx.fillStyle = rider.status === 'dnf' ? '#6c7a86' : INK;
      ctx.font = '13px monospace';
      ctx.fillText(rider.status === 'dnf' ? 'DNF' : `${index + 1}`, 26, y);
      ctx.fillStyle = rider.isAI ? '#7d9288' : ACCENT;
      ctx.fillText(rider.nickname, 66, y);
      const barX = 190;
      const barW = CANVAS_WIDTH - barX - 110;
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(barX, y - 5, barW, 10);
      ctx.fillStyle = rider.status === 'dnf' ? '#4a545c' : rider.isAI ? '#6f8f84' : GLOW;
      ctx.fillRect(barX, y - 5, Math.round(barW * rider.normalizedProgress), 10);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#9fc4b4';
      ctx.fillText(
        rider.timeMs != null ? formatTime(rider.timeMs) : `${Math.round(rider.normalizedProgress * 100)}%`,
        CANVAS_WIDTH - 22,
        y,
      );
      y += 38;
    }
  }

  function paintResults() {
    paintBackground();
    paintHeader('DOWNHILL MAYHEM · RESULTS', GLOW);
    const standings = displayState.result?.standings ?? [];
    const winner = standings.find((s) => s.place === 1 && s.status !== 'dnf');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (winner) {
      ctx.shadowColor = GLOW;
      ctx.shadowBlur = 12;
      ctx.fillStyle = INK;
      ctx.font = 'bold 22px monospace';
      ctx.fillText(`${sanitizeName(winner.nickname)} TAKES IT`, CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.2);
      ctx.shadowBlur = 0;
      ctx.fillStyle = ACCENT;
      ctx.font = '16px monospace';
      ctx.fillText(formatTime(winner.timeMs), CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.2 + 28);
    } else {
      ctx.fillStyle = INK;
      ctx.font = 'bold 20px monospace';
      ctx.fillText('NO FINISHERS', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.2);
    }
    let y = CANVAS_HEIGHT * 0.4;
    for (const row of standings.slice(0, 6)) {
      ctx.fillStyle = row.isAI ? '#7d9288' : INK;
      ctx.font = '13px monospace';
      const place = row.status === 'dnf' ? 'DNF' : `${row.place ?? '–'}`;
      const time = row.status === 'dnf' ? String(row.dnfReason ?? 'DNF') : formatTime(row.timeMs);
      ctx.fillText(`${place}  ${sanitizeName(row.nickname)}  ${time}`, CANVAS_WIDTH / 2, y);
      y += 22;
    }
    ctx.fillStyle = '#6c7a86';
    ctx.font = '11px monospace';
    ctx.fillText('SESSION RECORDS ONLY — NOT SAVED', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.92);
  }

  function paintAborted() {
    paintBackground();
    paintHeader('DOWNHILL MAYHEM', '#e8563f');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = INK;
    ctx.font = 'bold 22px monospace';
    ctx.fillText('RACE ABORTED', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.4);
    ctx.fillStyle = '#9fc4b4';
    ctx.font = '13px monospace';
    ctx.fillText(
      displayState.abortedReason ? String(displayState.abortedReason).slice(0, 40) : 'THE MOUNTAIN WILL WAIT',
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT * 0.56,
    );
  }

  function repaint(time) {
    if (!ctx) return;
    switch (displayState.status) {
      case 'lobby': paintLobby(); break;
      case 'countdown': paintCountdown(time); break;
      case 'racing': paintRacing(); break;
      case 'results': paintResults(); break;
      case 'aborted': paintAborted(); break;
      default: paintAttract(time); break;
    }
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

    /** Test/verification seam: bounded summary display state. */
    getDisplayState() { return displayState; },

    /**
     * Read-only gate projection (`?debug=1`): the live controller's state when
     * a rider is in, otherwise the bounded public summary.
     */
    getDebugState() {
      const live = controller?.debugState?.() ?? null;
      const hasLive = !!live && Array.isArray(live.field) && live.field.length > 0
        && typeof live.phase === 'string' && live.phase !== 'idle';
      if (hasLive) return live;
      return {
        phase: displayState.status,
        matchId: displayState.matchId,
        courseHash: null,
        mountain: displayState.mountain,
        difficulty: displayState.difficulty,
        humans: displayState.riders.filter((r) => !r.isAI),
        field: displayState.riders,
        riders: displayState.riders,
        standings: displayState.result?.standings ?? [],
        selfSlot: null,
        countdown: displayState.countdownStartAt != null
          ? { startAt: displayState.countdownStartAt }
          : null,
        strikes: [],
        lastStrike: null,
      };
    },

    /** Preparation handle (D17). */
    get preparation() { return preparation; },

    /** Staged background-preparation hooks (7.2), driven by the host loop. */
    scheduleIdleModulePrefetch({ roomId: prefetchRoomId = roomId } = {}) {
      if (disposed || !prepEnabled) {
        return { scheduled: false, reason: disposed ? 'disposed' : 'rollout-disabled' };
      }
      return scheduleKartRoyaleModulePrefetch({
        preparation,
        roomId: prefetchRoomId,
        onRun: () => prepareScheduler.enableAfterModulePrefetch(),
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

    beginParticipation() {
      if (disposed) {
        notifyPresentationTerminal?.('disposed');
        return Promise.resolve(false);
      }
      if (pendingActivation) {
        return controllerPromise
          ? controllerPromise.then((inst) => inst?.beginParticipation() ?? true)
            .catch((error) => {
              console.warn('[DownhillMayhem] beginParticipation failed:', error);
              return false;
            })
          : Promise.resolve(true);
      }
      const epoch = ++activationEpoch;
      pendingActivation = true;
      try {
        sessionStorage.setItem('afterlight-activity-hint', JSON.stringify({ activityId: activityDef.id }));
      } catch {}
      return loadController().then((inst) => {
        if (disposed || activationEpoch !== epoch) {
          pendingActivation = false;
          inst?.cancelActivation?.();
          notifyPresentationTerminal?.('cancelled');
          return false;
        }
        if (!inst) {
          pendingActivation = false;
          notifyPresentationTerminal?.('load-failed');
          return false;
        }
        return inst.beginParticipation().then((ok) => {
          if (disposed || activationEpoch !== epoch) {
            pendingActivation = false;
            inst.cancelActivation?.();
            notifyPresentationTerminal?.('cancelled');
            return false;
          }
          pendingActivation = inst.pendingActivation ?? false;
          return ok;
        });
      })
        .catch((error) => {
          // A start can fail mid-init (a graphics reset kills renderer work,
          // a stale deploy kills the chunk import). It must never leak an
          // unhandled rejection or leave this bystander stuck believing an
          // activation is still pending.
          console.warn('[DownhillMayhem] beginParticipation failed:', error);
          pendingActivation = false;
          cancelActivation();
          notifyPresentationTerminal?.('failed');
          toast?.('Downhill Mayhem', 'The cabinet could not start — try again in a moment.');
          return false;
        });
    },

    cancelActivation() {
      activationEpoch += 1;
      pendingActivation = false;
      controller?.cancelActivation?.();
      if (getParticipation?.()?.isOccupied !== true) {
        notifyPresentationTerminal?.('cancelled');
      }
    },

    /** Summary frames drive the cabinet; full snapshots belong to the rider. */
    acceptSnapshot(frame) {
      if (disposed || !frame) return;
      if (frame.activityId && frame.activityId !== activityDef.id) return;
      if (frame.audience !== 'summary') {
        controller?.acceptSnapshot?.(frame);
        return;
      }
      const next = summaryToDisplayState(frame, displayState);
      if (!next || next === displayState) return;
      displayState = next.status === 'countdown' ? next : { ...next, countdownStartAt: null };
      needsPaint = true;
    },

    acceptEvent(frame) {
      if (disposed || !frame) return;
      if (frame.activityId && frame.activityId !== activityDef.id) return;
      controller?.acceptEvent?.(frame);
      const eventId = typeof frame.eventId === 'string' ? frame.eventId : null;
      if (eventId) {
        if (seenEventIds.has(eventId)) return;
        seenEventIds.add(eventId);
        if (seenEventIds.size > EVENT_DEDUPE_CAP) {
          const oldest = seenEventIds.values().next().value;
          if (oldest !== undefined) seenEventIds.delete(oldest);
        }
      }
      if (frame.eventType === 'countdown' && Number.isFinite(frame.payload?.startAt)) {
        displayState = { ...displayState, countdownStartAt: frame.payload.startAt, status: 'countdown' };
        needsPaint = true;
      } else if (frame.eventType === 'race_aborted') {
        displayState = {
          ...displayState,
          status: 'aborted',
          abortedReason: typeof frame.payload?.reason === 'string' ? frame.payload.reason : 'aborted',
        };
        needsPaint = true;
      }
    },

    acceptResult(frame) {
      if (disposed || !frame) return;
      if (frame.activityId && frame.activityId !== activityDef.id) return;
      controller?.acceptResult?.(frame);
      const result = frame.result && typeof frame.result === 'object' ? frame.result : null;
      if (!result) return;
      displayState = {
        ...displayState,
        status: 'results',
        result: {
          kind: result.kind,
          recordingStatus: result.recordingStatus,
          reason: result.reason,
          standings: Array.isArray(result.standings) ? result.standings.slice(0, MAX_SUMMARY_RIDERS) : [],
        },
      };
      needsPaint = true;
    },

    acceptError(frame) {
      if (disposed || !frame) return;
      if (frame.activityId && frame.activityId !== activityDef.id) return;
      controller?.acceptError?.(frame);
    },

    neutralizeInput() { controller?.neutralizeInput?.(); },

    update(time, delta) {
      if (disposed) return;
      if (controller) controller.update(time, delta);
      const visible = throttler.shouldRender(false, true);
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
      seenEventIds.clear();
      controller?.cancelActivation?.();
      controller?.dispose?.();
      controller = null;
      controllerPromise = null;
      prepareScheduler.disable();
      preparation.dispose();
      try { sessionStorage.removeItem('afterlight-activity-hint'); } catch {}
      screenPipeline.dispose();
      cabinet.dispose();
    },
  };

  return instance;
}

registerActivityModule('downhill-mayhem', {
  initialize(context) {
    return createDownhillMayhemInstance(context);
  },
  // Downhill Mayhem HUD/touch regions (src/activities/downhill/hud.css).
  mediaPolicy: {
    reservedSelectors: ['.dm-panel', '.dm-actions', '.dm-audience-actions'],
  },
});
