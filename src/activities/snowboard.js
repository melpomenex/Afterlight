/**
 * Summit Run (multiplayer snowboard arcade) — lightweight registry bootstrap
 * and public cabinet display (add-multiplayer-snowboard-arcade 2.4, design
 * D1/D2).
 *
 * This module is deliberately small and synchronous. `initialize()` returns
 * hooks immediately; the mountain scene, race controller, prediction and HUD
 * live in lazy modules (src/activities/snowboard/*) imported only when a
 * rider actually enters the activity — never for passive bystanders. Nothing
 * here may import or dynamically load the mountain.
 *
 * What this module owns:
 *   - The canonical cabinet instance for `summit-run` (shared GLB + summit
 *     skin, primitive fallback with hot-swap).
 *   - The bounded public summary/attract screen: idle attract, lobby rider/
 *     ready counts, countdown, live ranked progress dots and checkpoint
 *     counts, and final results — driven ONLY by `audience:'summary'`
 *     activity_state frames (server-capped at ≤2 Hz plus immediate phase and
 *     result changes). Full participant snapshots are never consumed here and
 *     never reach this display.
 *   - Session-local result display with honest `session_only` labeling.
 */

import { registerActivityModule } from './registry.js';
import {
  createScreenPipeline,
  createVisibilityThrottler,
} from './cabinetRenderer.js';
import { createArcadeCabinet } from '../arcade/cabinet.js';

const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 384;

/** D7: progress summaries never exceed the eight-rider capacity. */
const MAX_SUMMARY_RIDERS = 8;
/** D7: clients dedupe events by eventId. */
const EVENT_DEDUPE_CAP = 64;

const ACCENT = '#7acbd4';
const GLOW = '#edb66c';
const INK = '#ecf2ec';

function sanitizeName(name) {
  const text = typeof name === 'string' && name.length > 0 ? name : 'RIDER';
  return text.slice(0, 16);
}

function formatTime(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '--.--';
  const seconds = ms / 1000;
  return `${seconds.toFixed(2)}s`;
}

/** Pure reduction of one summary frame into the bounded display state. */
export function summaryToDisplayState(frame, previous = null) {
  const summary = frame?.summary;
  if (!summary || typeof summary !== 'object') return previous;
  const progress = Array.isArray(summary.progress) ? summary.progress : [];
  const riders = progress.slice(0, MAX_SUMMARY_RIDERS).map((r) => ({
    playerId: typeof r?.playerId === 'string' ? r.playerId : '',
    nickname: sanitizeName(r?.nickname),
    nextCheckpoint: Number.isInteger(r?.nextCheckpoint) ? r.nextCheckpoint : 0,
    normalizedProgress: Number.isFinite(r?.normalizedProgress)
      ? Math.max(0, Math.min(1, r.normalizedProgress))
      : 0,
    status: typeof r?.status === 'string' ? r.status : 'racing',
    dnfReason: typeof r?.dnfReason === 'string' ? r.dnfReason : null,
  }));
  riders.sort((a, b) => b.normalizedProgress - a.normalizedProgress);
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
    capacity: Number.isInteger(summary.capacity) ? summary.capacity : 8,
    riders,
    result,
    countdownStartAt: previous?.countdownStartAt ?? null,
    abortedReason: null,
  };
}

export function createSnowboardInstance({
  activityDef,
  world,
  generation,
  getPlayer = null,
} = {}) {
  if (!activityDef || activityDef.type !== 'snowboard-race') {
    throw new Error('snowboard module requires a snowboard-race activity definition');
  }

  const transform = activityDef.transform || { position: [10.42, 0, 2.6], rotationY: 0 };
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

  // Bounded display state — ONLY from summary-audience frames.
  let displayState = {
    status: 'idle',
    matchId: null,
    riderCount: 0,
    readyCount: 0,
    capacity: activityDef.capacities?.players ?? 8,
    riders: [],
    result: null,
    countdownStartAt: null,
    abortedReason: null,
  };
  let disposed = false;
  const seenEventIds = new Set();
  let needsPaint = true;

  // --- screen painting -------------------------------------------------------

  function paintBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    grad.addColorStop(0, '#0b1420');
    grad.addColorStop(1, activityDef.cabinet.skin.palette.base);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  function paintHeader(text, color = ACCENT) {
    ctx.fillStyle = 'rgba(6, 12, 18, 0.85)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, 34);
    ctx.fillStyle = color;
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, CANVAS_WIDTH / 2, 17);
  }

  function paintAttract(time) {
    paintBackground();
    const pulse = 0.55 + Math.sin(time * 3) * 0.35;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = GLOW;
    ctx.shadowBlur = 14;
    ctx.fillStyle = INK;
    ctx.font = `bold ${Math.round(CANVAS_WIDTH * 0.115)}px monospace`;
    ctx.fillText('SUMMIT RUN', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.36);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#8fb4c4';
    ctx.font = '14px monospace';
    ctx.fillText('2–8 RIDERS · ONE MOUNTAIN', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.36 + 34);
    ctx.fillStyle = `rgba(255, 202, 122, ${pulse.toFixed(2)})`;
    ctx.font = 'bold 17px monospace';
    ctx.fillText('PRESS E TO RIDE', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.82);
  }

  function paintLobby() {
    paintBackground();
    paintHeader('SUMMIT RUN · LOBBY');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = INK;
    ctx.font = 'bold 26px monospace';
    ctx.fillText(`${displayState.riderCount} / ${displayState.capacity} RIDERS`, CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.38);
    ctx.fillStyle = ACCENT;
    ctx.font = '16px monospace';
    ctx.fillText(`${displayState.readyCount} READY`, CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.38 + 32);
    ctx.fillStyle = displayState.riderCount >= 2 ? GLOW : '#8fb4c4';
    ctx.font = '14px monospace';
    ctx.fillText(
      displayState.riderCount < 2 ? 'WAITING FOR ANOTHER RIDER' : 'ALL READY STARTS THE RUN',
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT * 0.78,
    );
  }

  function paintCountdown(time) {
    paintBackground();
    paintHeader('SUMMIT RUN · STARTING');
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
    paintHeader('SUMMIT RUN · LIVE RACE');
    const rows = displayState.riders.slice(0, 6);
    const rowHeight = 38;
    let y = 64;
    ctx.textBaseline = 'middle';
    for (const [index, rider] of rows.entries()) {
      ctx.textAlign = 'left';
      ctx.fillStyle = rider.status === 'dnf' ? '#6c7a86' : INK;
      ctx.font = '13px monospace';
      const place = rider.status === 'dnf' ? 'DNF' : `${index + 1}`;
      ctx.fillText(place, 26, y);
      ctx.fillStyle = rider.status === 'dnf' ? '#6c7a86' : ACCENT;
      ctx.fillText(rider.nickname, 66, y);
      // Progress bar + checkpoint count.
      const barX = 190;
      const barW = CANVAS_WIDTH - barX - 110;
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(barX, y - 5, barW, 10);
      ctx.fillStyle = rider.status === 'dnf' ? '#4a545c' : GLOW;
      ctx.fillRect(barX, y - 5, Math.round(barW * rider.normalizedProgress), 10);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#8fb4c4';
      ctx.fillText(`CP ${rider.nextCheckpoint}`, CANVAS_WIDTH - 22, y);
      y += rowHeight;
    }
    if (displayState.riders.length > 6) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#8fb4c4';
      ctx.font = '12px monospace';
      ctx.fillText(`+${displayState.riders.length - 6} MORE RIDERS`, CANVAS_WIDTH / 2, y);
    }
  }

  function paintResults() {
    paintBackground();
    paintHeader('SUMMIT RUN · RESULTS', GLOW);
    const standings = displayState.result?.standings ?? [];
    const finished = standings.filter((s) => s.status === 'finished');
    const winners = finished.filter((s) => finished[0] && s.timeMs != null && finished[0].timeMs != null && Math.abs(s.timeMs - finished[0].timeMs) < 1);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (winners.length > 0) {
      ctx.shadowColor = GLOW;
      ctx.shadowBlur = 12;
      ctx.fillStyle = INK;
      ctx.font = 'bold 22px monospace';
      ctx.fillText(
        winners.length > 1
          ? `${winners.map((w) => sanitizeName(w.nickname)).join(' & ')} TIE`
          : `${sanitizeName(winners[0].nickname)} WINS`,
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT * 0.26,
      );
      ctx.shadowBlur = 0;
      ctx.fillStyle = ACCENT;
      ctx.font = '17px monospace';
      ctx.fillText(`${formatTime(winners[0].timeMs)}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.26 + 30);
    } else {
      ctx.fillStyle = INK;
      ctx.font = 'bold 20px monospace';
      ctx.fillText('NO FINISHERS', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.26);
    }
    const dnf = standings.filter((s) => s.status === 'dnf').length;
    ctx.fillStyle = '#8fb4c4';
    ctx.font = '13px monospace';
    ctx.fillText(
      `${finished.length} FINISHED${dnf > 0 ? ` · ${dnf} DNF` : ''}`,
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT * 0.56,
    );
    ctx.fillStyle = '#6c7a86';
    ctx.font = '11px monospace';
    ctx.fillText('SESSION RECORDS ONLY — NOT SAVED', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.86);
  }

  function paintAborted() {
    paintBackground();
    paintHeader('SUMMIT RUN', '#e8563f');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = INK;
    ctx.font = 'bold 22px monospace';
    ctx.fillText('RACE ABORTED', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.4);
    ctx.fillStyle = '#8fb4c4';
    ctx.font = '13px monospace';
    ctx.fillText(displayState.abortedReason ? String(displayState.abortedReason).slice(0, 40) : 'THE MOUNTAIN WILL WAIT', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.56);
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

    /** Test/verification seam: the current bounded summary display state. */
    getDisplayState() {
      return displayState;
    },

    /**
     * Summary frames drive the cabinet display. Full participant snapshots
     * (`audience:'participants'`) are ignored here: they belong to the
     * riders' prediction path inside the lazy mountain modules, never to the
     * public display, and consuming them would risk importing mountain code
     * for bystanders.
     */
    acceptSnapshot(frame) {
      if (disposed || !frame) return;
      if (frame.activityId && frame.activityId !== activityDef.id) return;
      if (frame.audience !== 'summary') return;
      const next = summaryToDisplayState(frame, displayState);
      if (!next || next === displayState) return;
      displayState = next.status === 'countdown'
        ? next
        : { ...next, countdownStartAt: null };
      needsPaint = true;
    },

    /**
     * Events are public phases and (private) queue offers. Only countdown
     * start times and aborts matter to the bystander display; both are
     * deduped by eventId per D7.
     */
    acceptEvent(frame) {
      if (disposed || !frame) return;
      if (frame.activityId && frame.activityId !== activityDef.id) return;
      const eventId = typeof frame.eventId === 'string' ? frame.eventId : null;
      if (eventId) {
        if (seenEventIds.has(eventId)) return;
        seenEventIds.add(eventId);
        if (seenEventIds.size > EVENT_DEDUPE_CAP) {
          const oldest = seenEventIds.values().next().value;
          if (oldest !== undefined) seenEventIds.delete(oldest);
        }
      }
      if (frame.eventType === 'countdown' && frame.payload && Number.isFinite(frame.payload.startAt)) {
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

    /** Terminal results also repaint the display (event-loss recovery path). */
    acceptResult(frame) {
      if (disposed || !frame) return;
      if (frame.activityId && frame.activityId !== activityDef.id) return;
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

    acceptError() {
      // Bystander display stays honest: errors never fabricate a race state.
    },

    neutralizeInput() {
      // The lightweight module owns no input capture.
    },

    update(time) {
      if (disposed) return;
      const player = getPlayer?.();
      const visible = throttler.shouldRender(false, true);
      if (needsPaint || (displayState.status === 'idle' && visible)) {
        if (visible) {
          repaint(time);
          needsPaint = false;
        }
      }
      void player;
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      seenEventIds.clear();
      screenPipeline.dispose();
      cabinet.dispose();
    },
  };

  return instance;
}

registerActivityModule('snowboard-race', {
  initialize(context) {
    return createSnowboardInstance(context);
  },
});
