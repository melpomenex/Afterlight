/**
 * Summit Run race controller (add-multiplayer-snowboard-arcade 6.4–6.6,
 * design D1). Lazy-loaded by the lightweight module when a rider presses E:
 * owns the mountain scene (through the view lease), prediction, remote
 * interpolation, the countdown clock, input capture and the race HUD.
 *
 * Guarantees:
 *   - entry is CANCELLABLE while loading (attempt token rejects late
 *     completion; nothing captures controls or the camera after exit);
 *   - the scene instance + resources come from the application-owned cache
 *     and survive disposal for warm rematches;
 *   - inputs ride the 30Hz held-state heartbeat; chat focus/blur/typing
 *     neutralize and cancel the jump charge;
 *   - exit/travel/error release the view, restore world input and dispose
 *     scene instances without evicting shared cache resources;
 *   - authoritative events own the HUD outcome (checkpoint/finish/DNF);
 *     predicted effects stay cosmetic.
 */

import { loadCourse } from '../../../shared/snowboard/course.js';
import { createPredictor } from './prediction.js';
import { createRemoteRiderBuffer } from './interpolation.js';
import { createRaceClock } from './clock.js';
import { createRaceAudio } from './audio.js';

const HEARTBEAT_MS = 33;
const NEUTRAL = Object.freeze({ kind: 'neutral' });

function emptyRiderState(slot = 0) {
  return {
    s: 0, u: 0, v: 0, vu: 0, y: 0, vy: 0,
    grounded: true, jumpCharge: 0, recoveryTicks: 0,
    nextCheckpoint: 1, finishTick: null, finishMs: null,
    finishKey: null, dnfReason: null, crossedRampIds: [],
    boundaryCooldownSeconds: 0, splitKeys: [], resetSeq: 0,
    slot,
  };
}

export async function createSnowboardController({
  activityDef,
  net,
  getParticipation,
  acquireView,
  releaseView,
  generation,
  getHudHost = () => (typeof document !== 'undefined' ? document.body : null),
  resourceCache = null,
  audioMixer = null,
  toast = null,
  onExit = null,
} = {}) {
  const attempt = { token: {}, cancelled: false, disposed: false };
  let controller = null;

  // --- lazy resource load (cancellable) --------------------------------------
  const { createSnowboardScene } = await import('./scene.js');
  if (attempt.cancelled) return null;

  const courseDoc = await Promise.resolve(activityDef.courseDocument ?? null) ?? (
    await import('../../../shared/snowboard/course-summit-night.json', { with: { type: 'json' } })
  ).default;
  if (attempt.cancelled) return null;

  const cache = resourceCache;
  let sceneInstance = null;
  if (cache) {
    sceneInstance = cache.acquire(attempt.token, `scene:${activityDef.id}`, () => null);
  }

  const scene = await createSnowboardScene({ courseDoc });
  if (attempt.cancelled) {
    scene.dispose();
    return null;
  }

  const course = loadCourse(courseDoc);
  const predictor = createPredictor(course);
  const clock = createRaceClock();
  const audio = createRaceAudio({ mixer: audioMixer });
  const remotes = new Map(); // playerId -> { buffer, accent }
  const myState = emptyRiderState();

  let viewHeld = false;
  let loadedSent = false;
  let readySent = false;
  let lastHeartbeat = 0;
  let hud = null;
  let countdownStartAt = null;
  let raceStarted = false;

  const participation = () => getParticipation?.() ?? null;
  const mine = () => participation()?.currentActivity?.id === activityDef.id && participation()?.isParticipating;

  // --- input (6.4) ------------------------------------------------------------
  const keys = new Set();
  let chargeHeld = false;
  let listenersAttached = false;

  function isTyping() {
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    return !!active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
  }

  function onKeyDown(event) {
    if (!viewHeld || isTyping()) return;
    // Capture-phase R (explicit readiness/rematch) and Escape (exit the
    // race; the world's Escape opens settings only once the view released).
    if (event.code === 'KeyR') {
      event.preventDefault();
      event.stopPropagation();
      sendReady(true);
      return;
    }
    if (event.code === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      exit('exit');
      return;
    }
    keys.add(event.code);
    if (event.code === 'Space') {
      event.preventDefault();
      chargeHeld = true;
    }
  }

  function onKeyUp(event) {
    keys.delete(event.code);
    if (event.code === 'Space') chargeHeld = false;
  }

  function onBlur() {
    keys.clear();
    chargeHeld = false;
    submitControls(NEUTRAL);
  }

  function attachControls() {
    if (listenersAttached || typeof window === 'undefined') return;
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', onBlur);
    listenersAttached = true;
  }

  function detachControls() {
    keys.clear();
    chargeHeld = false;
    if (!listenersAttached || typeof window === 'undefined') return;
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('keyup', onKeyUp, true);
    window.removeEventListener('blur', onBlur);
    listenersAttached = false;
  }

  function currentControls() {
    if (!viewHeld) return NEUTRAL;
    const steer = (keys.has('KeyA') || keys.has('ArrowLeft') ? -1 : 0) + (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0);
    const tuck = keys.has('KeyW') || keys.has('ArrowUp') || keys.has('ShiftLeft');
    const brake = keys.has('KeyS') || keys.has('ArrowDown');
    return { kind: 'ride', steer, tuck, brake, jumpHeld: chargeHeld };
  }

  function submitControls(controls = currentControls()) {
    const p = participation();
    if (!p?.sessionId || !p.lease) return;
    const seq = net?.nextActivitySeq?.(activityDef.id) ?? Date.now() % 1e9;
    try {
      net?.sendActivityInput({
        roomId: p.currentRoomId,
        activityId: activityDef.id,
        sessionId: p.sessionId,
        lease: typeof p.lease === 'string' ? p.lease : p.lease.id,
        seq,
        controls,
        ...(p.currentMatchId ? { matchId: p.currentMatchId } : {}),
      });
      predictor.submit(seq, controls, performance.now());
    } catch {}
  }

  // --- HUD (6.5) ---------------------------------------------------------------
  function buildHud() {
    if (hud || typeof document === 'undefined') return hud;
    const host = getHudHost();
    if (!host) return null;
    const root = document.createElement('div');
    root.className = 'sbhud';
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', 'Summit Run race');
    root.innerHTML = `
      <div class="sbhud-top">
        <div class="sbhud-phase" data-role="phase">SUMMIT RUN</div>
        <div class="sbhud-time" data-role="time">0.00s</div>
      </div>
      <div class="sbhud-info" data-role="info"></div>
      <div class="sbhud-center" data-role="center" aria-live="polite"></div>
      <div class="sbhud-actions" data-role="actions"></div>`;
    host.appendChild(root);

    const exitButton = document.createElement('button');
    exitButton.type = 'button';
    exitButton.className = 'sbhud-button';
    exitButton.textContent = 'Exit Race';
    exitButton.addEventListener('click', () => exit('exit'));
    root.querySelector('[data-role="actions"]').appendChild(exitButton);

    const rematchButton = document.createElement('button');
    rematchButton.type = 'button';
    rematchButton.className = 'sbhud-button sbhud-rematch';
    rematchButton.textContent = 'Rematch';
    rematchButton.addEventListener('click', () => sendReady(true));
    root.querySelector('[data-role="actions"]').appendChild(rematchButton);

    hud = { root };
    return hud;
  }

  function showHud() {
    if (buildHud() && hud) hud.root.classList.add('sbhud-active');
  }

  function hideHud() {
    if (hud?.root) hud.root.remove();
    hud = null;
  }

  function hudUpdate() {
    if (!hud) return;
    const phaseEl = hud.root.querySelector('[data-role="phase"]');
    const timeEl = hud.root.querySelector('[data-role="time"]');
    const infoEl = hud.root.querySelector('[data-role="info"]');
    const centerEl = hud.root.querySelector('[data-role="center"]');
    const rematchButton = hud.root.querySelector('.sbhud-rematch');

    const p = participation();
    const state = viewHeld ? predictor.visualState?.() ?? null : null;
    const rider = myState;

    let phaseText = 'SUMMIT RUN';
    let info = '';
    let center = '';
    if (!mine()) {
      phaseText = 'RETURNING…';
    } else if (p?.isParticipating) {
      const serverStatus = lastStatus;
      phaseText = { lobby: 'LOBBY', countdown: 'GET READY', racing: 'RACE', results: 'RESULTS' }[serverStatus] ?? 'SUMMIT RUN';

      if (serverStatus === 'lobby') {
        info = `Ready up at the cabinet`;
        center = 'Press Ready at the cabinet screen';
      } else if (serverStatus === 'countdown') {
        const verdict = clock.countdown(countdownStartAt ?? 0, performance.now());
        center = verdict.ready ? Math.max(1, Math.ceil(verdict.secondsLeft)) : 'SYNCING…';
      } else if (serverStatus === 'racing' && raceStarted) {
        const position = provisionalPosition();
        const checkpoint = rider.nextCheckpoint ?? 1;
        info = `POS ${position} · CP ${Math.min(checkpoint, 8)}/8`;
        timeEl.textContent = `${((rider.finishMs ?? elapsedMs()) / 1000).toFixed(2)}s`;
        center = rider.dnfReason ? 'DNF' : '';
      } else if (serverStatus === 'results') {
        info = 'Session records only — not saved';
        center = '';
        rematchButton?.classList.add('sbhud-visible');
      }
    }
    if (state?.correction) center = center || '';

    phaseEl.textContent = phaseText;
    infoEl.textContent = info;
    centerEl.textContent = center;
    if (serverStatus !== 'racing') timeEl.textContent = '0.00s';
  }

  let lastStatus = null;
  let goAtMs = null;

  function provisionalPosition() {
    let place = 1;
    for (const [, remote] of remotes) {
      const their = remote.last?.state;
      if (their && (their.s ?? 0) > (myState.s ?? 0)) place += 1;
    }
    return place;
  }

  function elapsedMs() {
    return goAtMs ? performance.now() - goAtMs : 0;
  }

  // --- network framing -----------------------------------------------------------
  function sendLoaded() {
    if (loadedSent) return;
    const p = participation();
    if (!p?.sessionId || !p.lease) return;
    const seq = net?.nextActivitySeq?.(activityDef.id) ?? Date.now() % 1e9;
    try {
      net?.sendActivityInput({
        roomId: p.currentRoomId,
        activityId: activityDef.id,
        sessionId: p.sessionId,
        lease: typeof p.lease === 'string' ? p.lease : p.lease.id,
        seq,
        controls: {
          kind: 'loaded',
          courseId: activityDef.course?.id ?? 'summit-night',
          courseVersion: activityDef.course?.version ?? 1,
          courseHash: scene.course.doc.hash,
        },
        ...(p.currentMatchId ? { matchId: p.currentMatchId } : {}),
      });
      loadedSent = true;
    } catch {}
  }

  function sendReady(ready) {
    const p = participation();
    if (!p) return;
    try {
      net?.sendActivityReady?.({
        activityId: activityDef.id,
        ready,
        ...(p.currentMatchId ? { matchId: p.currentMatchId } : {}),
      });
      readySent = ready;
    } catch {}
  }

  // --- frame update ----------------------------------------------------------------
  function update(time, dt) {
    if (attempt.disposed || attempt.cancelled) return;

    const p = participation();

    // Seat accepted: capture the view and start the load handshake.
    if (p?.isParticipating && p.currentActivity?.id === activityDef.id) {
      if (!viewHeld && acquireView) {
        const result = acquireView({
          owner: attempt.token,
          generation,
          scene: scene.scene,
          camera: scene.camera,
          resize: (width, height) => {
            scene.camera.aspect = width / Math.max(1, height);
            scene.camera.updateProjectionMatrix();
          },
          onRelease: (reason) => handleViewRelease(reason),
        });
        if (result.ok) {
          viewHeld = true;
          attachControls();
          showHud();
          sendLoaded();
        }
      }
    }

    if (!viewHeld) return;

    // Lobby load handshake as soon as the seat is known.
    if (p?.sessionId && !loadedSent) sendLoaded();

    // 30Hz held-state heartbeat while racing; else idle neutral refresh.
    const nowMs = performance.now();
    if (lastStatus === 'racing' && raceStarted && nowMs - lastHeartbeat >= HEARTBEAT_MS) {
      lastHeartbeat = nowMs;
      submitControls();
    }

    // Prediction advances from local input; authority reconciles via snapshots.
    if (raceStarted) {
      const result = predictor.update(nowMs, dt * 1000);
      const state = result?.state;
      if (state && !result.frozen) {
        Object.assign(myState, state);
      }
    }

    const remoteList = [];
    for (const [playerId, remote] of remotes) {
      const sample = remote.buffer.sample(nowMs);
      if (sample) remoteList.push({ playerId, state: sample.state, accent: remote.accent });
    }

    scene.update(time, dt, raceStarted ? myState : null, remoteList);
    if (raceStarted) audio.update({ ...myState, steer: currentControls().steer });
    hudUpdate();
  }

  function handleViewRelease(reason) {
    viewHeld = false;
    detachControls();
    hideHud();
    audio.dispose(); // stops loops; the pre-race ambience was never touched
    if (reason === 'travel' || reason === 'dispose') {
      dispose();
    }
  }

  // --- authoritative frames -----------------------------------------------------------
  function acceptSnapshot(frame) {
    if (attempt.disposed) return;
    if (frame.audience === 'summary') return; // the cabinet display owns those

    lastStatus = typeof frame.status === 'string' ? frame.status : lastStatus;
    if (frame.status === 'racing' && !raceStarted && frame.startAt) {
      raceStarted = true;
      goAtMs = clock.toPerf(frame.startAt, performance.now()) ?? performance.now();
      predictor.reset(emptyRiderState(participation()?.currentSlot ?? 0), frame.serverTick ?? 0, NEUTRAL, 0, 0);
    }

    if (clock.sampleCount < 8 || frame.serverNow) {
      clock.seedFromSnapshot(frame.serverNow ?? 0, performance.now());
    }
    if (frame.eventType === 'countdown' || frame.startAt) countdownStartAt = frame.startAt ?? countdownStartAt;

    const riders = frame.state?.sim?.riders;
    const rows = Array.isArray(riders) ? riders : Object.values(riders ?? {});
    const playerRows = frame.state?.players ?? [];
    const self = frame.self;

    for (const rider of rows) {
      const playerRow = playerRows.find((row) => row.playerId === rider.playerId);
      if (self && rider.playerId === self.playerId) continue; // handled below
      let remote = remotes.get(rider.playerId);
      if (!remote) {
        remote = { buffer: createRemoteRiderBuffer(), accent: playerRow?.accent ?? '#7acbd4', last: null };
        remotes.set(rider.playerId, remote);
      }
      remote.buffer.push({
        at: frame.serverNow ?? performance.now(),
        serverTick: frame.serverTick ?? 0,
        snapshotSeq: frame.snapshotSeq ?? 0,
        resetSeq: rider.resetSeq ?? 0,
        state: rider,
      });
      remote.last = { state: rider };
    }

    if (self) {
      const mineRow = rows.find((r) => r.playerId === self.playerId) ?? null;
      if (mineRow) {
        predictor.reconcile(
          mineRow,
          frame.serverTick ?? 0,
          self.heldControls,
          self.appliedSeq,
          mineRow.resetSeq ?? 0,
          performance.now(),
        );
        Object.assign(myState, mineRow);
      }
    } else {
      // Fallback: my row by slot match (private attachment absent).
      const slot = participation()?.currentSlot;
      const mineRow = playerRows.find((row) => row.slot === slot);
      const mineRider = rows.find((r) => mineRow && r.playerId === mineRow.playerId);
      if (mineRider) Object.assign(myState, mineRider);
    }
  }

  function acceptEvent(frame) {
    if (attempt.disposed) return;
    if (frame.eventType === 'countdown' && frame.payload?.startAt) {
      countdownStartAt = frame.payload.startAt;
      clock.seedFromSnapshot(frame.serverNow ?? 0, performance.now());
      audio.event('countdown');
    } else if (frame.eventType === 'checkpoint') {
      if (frame.payload?.playerId === participation()?.playerId) audio.event('checkpoint');
    } else if (frame.eventType === 'race_aborted') {
      lastStatus = 'aborted';
      audio.event('landing');
      hudUpdate();
    }
  }

  function acceptResult(frame) {
    if (attempt.disposed) return;
    if (frame.result?.kind === 'snowboard_race') {
      lastStatus = 'results';
      raceStarted = false;
      audio.event('finish');
      hudUpdate();
    }
  }

  function acceptError(frame) {
    if (attempt.disposed) return;
    if (frame.error === 'course_mismatch') {
      loadedSent = false; // force a fresh handshake after a course drift
      toast?.('Course Mismatch', 'Reload the mountain and try again.', 'ACTIVITY');
    }
  }

  // --- exit / dispose (6.6) --------------------------------------------------------------
  function exit(reason = 'exit') {
    if (mine()) {
      try {
        participation()?.leave?.();
      } catch {}
    }
    if (viewHeld) releaseView?.(attempt.token, reason);
    handleViewRelease(reason);
    if (onExit) onExit(reason);
  }

  function dispose() {
    if (attempt.disposed) return;
    attempt.disposed = true;
    attempt.cancelled = true;
    detachControls();
    hideHud();
    if (viewHeld) releaseView?.(attempt.token, 'dispose');
    // Scene instances are per-attempt; the course document + cached heavy
    // resources stay in the application cache for warm rematches.
    scene.dispose();
  }

  controller = {
    beginParticipation,
    update,
    acceptSnapshot,
    acceptEvent,
    acceptResult,
    acceptError,
    exit,
    dispose,
    get attemptToken() {
      return attempt.token;
    },
  };

  function cancel() {
    attempt.cancelled = true;
  }

  async function beginParticipation() {
    // Loading screen; the attempt token cancels late completion (D1).
    toast?.('Summit Run', 'Loading the mountain… Press E or Esc to cancel.', 'ACTIVITY');
    attachControls();
    if (mine()) {
      // Already seated (reconnect): reacquire directly.
      if (!viewHeld && acquireView) {
        const result = acquireView({
          owner: attempt.token,
          generation,
          scene: scene.scene,
          camera: scene.camera,
          resize: (width, height) => {
            scene.camera.aspect = width / Math.max(1, height);
            scene.camera.updateProjectionMatrix();
          },
          onRelease: (reason) => handleViewRelease(reason),
        });
        if (result.ok) {
          viewHeld = true;
          showHud();
        }
      }
      return true;
    }
    participation()?.join?.(activityDef, { role: 'play' });
    return true;
  }

  return {
    ...controller,
    cancel,
    get viewHeld() {
      return viewHeld;
    },
  };
}
