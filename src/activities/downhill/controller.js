/**
 * Downhill Mayhem controller (integrate-multiplayer-downhill-mayhem-arcade
 * 6.2, design D2/D4/D7/D8/D9/D12–D18).
 *
 * Lazy-loaded by the bystander module only when a rider enters the cabinet.
 * Owns participation networking, the view lease (with a `present` hook, since
 * the hosted game draws through its own scene), capture-phase input, the local
 * prediction/reconciliation path, remote interpolation, the shared clock, the
 * scoped HUD, session audio and the exit funnel.
 *
 * It NEVER creates a renderer, canvas, requestAnimationFrame loop or socket:
 * the layout, terrain, riders, camera and drawing belong to the game host
 * runtime (`games/downhill-mayhem/src/host/index.js`), imported only on entry.
 *
 * Input (source contract): A/D or ←/→ steer, W/↑ pedal, S/↓ brake, SHIFT boost,
 * SPACE hop, E punch, F kick, 1–4 trick, R ready/rematch in lobby/results only,
 * Escape exits. E is consumed in the capture phase so it never reaches world
 * interaction.
 */

import { loadCourse } from '../../../shared/downhill/course.js';
import { TICK_HZ, initialRiderState } from '../../../shared/downhill/rules.js';
import { createPredictor } from './prediction.js';
import { createRemoteInterpolator } from './interpolation.js';
import { createRaceClock } from './clock.js';
import { createDownhillAudio } from './audio.js';
import { createDownhillHud } from './hud.js';
import { createDownhillSceneAdapter } from './scene.js';
import { recordEntrySample } from '../downhillReadinessMetrics.js';

const HEARTBEAT_MS = 33;
const LOADED_RETRY_MS = 1500;
const TOAST_SECONDS = 2.4;
const BUFFER_TICKS = Math.round((100 / 1000) * TICK_HZ); // ~two 20 Hz snapshots
const NEUTRAL_WIRE = Object.freeze({ kind: 'neutral' });

const TRICK_KEYS = Object.freeze({
  Digit1: 'nohander',
  Digit2: 'superman',
  Digit3: 'heel',
  Digit4: 'backflip',
});

function nowPerf() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function defaultLoadHostModule() {
  return import('../../../games/downhill-mayhem/src/host/index.js');
}

function defaultLoadCourseDocument() {
  // Vite bundles the committed JSON documents. The Daily document is
  // server-owned (design D5): the controller fetches it from the gateway and
  // never generates it locally. Tests inject `activityDef.courseDocument` or
  // `loadCourseDocument`.
  return import('../../../shared/downhill/courseDocument.js');
}

/** Normalize the server's rider map/array into a slot-indexed object. */
function normalizeRiders(frame) {
  const raw = frame?.state?.sim?.riders ?? frame?.state?.riders ?? null;
  if (!raw) return {};
  if (Array.isArray(raw)) {
    const out = {};
    for (const rider of raw) {
      const slot = rider?.slot ?? rider?.playerId;
      if (slot !== undefined && slot !== null) out[String(slot)] = rider;
    }
    return out;
  }
  return raw;
}

/** Map the authoritative session status onto the host runtime's phase names. */
function hostPhase(status) {
  if (status === 'racing') return 'racing';
  if (status === 'countdown') return 'countdown';
  if (status === 'results' || status === 'ended') return 'results';
  return 'lobby';
}

export function createDownhillController({
  activityDef,
  net = null,
  getParticipation = null,
  getRoomId = null,
  acquireView = null,
  releaseView = null,
  getRenderer = null,
  generation = 0,
  getHudHost = () => (typeof document !== 'undefined' ? document.body : null),
  preparation = null,
  audioMixer = null,
  toast = null,
  onExit = null,
  retentionEnabled = false,
  runGraphicsTransaction = null,
  getDistance = null,
  loadHostModule = defaultLoadHostModule,
  loadCourseDocument = defaultLoadCourseDocument,
} = {}) {
  if (!activityDef || activityDef.type !== 'downhill-mayhem') {
    throw new Error('downhill controller requires a downhill-mayhem activity definition');
  }

  let controllerDisposed = false;
  let activationEpoch = 0;
  let resourceGeneration = 0;

  function createAttempt(epoch) {
    return {
      token: Symbol(`downhill-attempt-${epoch}`),
      epoch,
      generation: resourceGeneration,
      signal: null,
      disposed: false,
      cancelled: false,
    };
  }

  let attempt = createAttempt(0);
  let viewHeld = false;
  let host = null;
  let sceneAdapter = null;
  let bootPromise = null;
  let booted = false;
  let presentationReady = false;
  let hud = null;
  let attached = false;
  let pendingActivation = false;
  let loadFailed = false;
  let hadAdmission = false;
  let contextCanvas = null;
  let exiting = false;

  // Course + prediction state.
  let courseDoc = null;
  let course = null;
  let predictor = null;
  // The lobby-selected mountain (design D12/D5). The captain may change it
  // while the lobby is unlocked; a change invalidates the loaded course and
  // forces a reload of the matching document before readiness can lock.
  let desiredMountain = activityDef.course?.id ?? 'classic';
  let desiredDifficulty = activityDef.course?.difficulty ?? 'mayhem';
  let reloadPending = false;
  const interpolator = createRemoteInterpolator();
  const clock = createRaceClock();
  let audio = null;
  let myState = null;
  let myPlayerId = null;
  let raceStarted = false;
  let lastStatus = null;
  let currentMatchId = null;
  let countdownStartAt = null;
  let goAtMs = null;
  let lastHeartbeat = 0;
  let lastServerTick = 0;
  let resultsStandings = null;
  // Lobby roster and live field rows for the HUD (server-authored; never
  // fabricated locally).
  let lastRoster = [];
  let lastRiderRows = [];
  let captainName = null;
  let toastState = { text: '', untilMs: 0 };
  let lastCountdownWhole = null;
  // Queue/spectator/slot-offer state (11.5). The server is authoritative; the
  // client only mirrors the offer window for display.
  let offerState = null;
  let queuePosition = null;
  // Entry-readiness metrics (17.2): anonymous timing only.
  let entryStartedAtMs = null;
  let entryRetained = false;
  let entryRecorded = false;
  const strikeLog = [];
  let lastFrameInfo = null;

  // Load handshake (D7): follows the seat identity; the server resets `loaded`
  // on every new seat record, so a page-lifetime flag would go stale.
  let loadedConfirmed = false;
  let loadedSeatKey = null;
  let loadedLastAttemptMs = -Infinity;
  let loadedAttemptSeq = null;

  const participation = () => getParticipation?.() ?? null;
  const roomId = () => getRoomId?.() || participation()?.roomId || '';
  const mine = () => participation()?.currentActivity?.id === activityDef.id;

  function isAttemptCurrent(local) {
    return local && local === attempt && !local.cancelled && !local.disposed && !controllerDisposed;
  }

  function invalidateAttempt() {
    attempt.cancelled = true;
    resourceGeneration += 1;
  }

  function pushToast(text) { toastState = { text, untilMs: nowPerf() + TOAST_SECONDS * 1000 }; }

  function report(message, detail = null) {
    if (typeof toast === 'function') {
      if (detail === null) toast(activityDef.title ?? 'Downhill Mayhem', message, 'ACTIVITY');
      else toast(message, detail, 'ACTIVITY');
    } else if (detail === null) {
      pushToast(message);
    } else {
      pushToast(`${message} — ${detail}`);
    }
  }

  // --- lifecycle-owned DOM -----------------------------------------------------

  function removeHudRoot() {
    if (typeof document !== 'undefined') document.body.classList.remove('dm-racing');
  }

  function buildHud() {
    if (hud || typeof document === 'undefined') return hud;
    const mount = getHudHost();
    if (!mount) return null;
    hud = createDownhillHud({
      host: mount,
      onReady: () => sendReady(true),
      onExit: () => exit('exit'),
      onSoundToggle: (muted) => audio?.setMuted?.(muted),
      onConfig: (config) => sendConfig(config),
      onJoinRole: (role) => joinAsRole(role),
      onLeaveRole: () => exit('leave-role'),
      onOffer: (accept) => respondOffer(accept),
    });
    if (hud) {
      hud.setTouchSink(touchInput);
      hud.hide();
    }
    return hud;
  }

  function showHud() { buildHud()?.show(); }

  function hideHud() {
    hud?.dispose();
    hud = null;
  }

  // --- input (capture phase; attached only while the game is live) ------------

  const keys = new Set();
  let smoothSteer = 0;
  let hopEdge = false;
  let punchEdge = false;
  let kickEdge = false;
  let trickEdge = null;
  let listenersAttached = false;

  function isTyping() {
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    return !!active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
  }

  function consume(event) {
    event.stopPropagation();
    if (event.cancelable) event.preventDefault();
  }

  function onKeyDown(event) {
    if (!viewHeld || isTyping()) return;
    if (event.code === 'Escape') {
      consume(event);
      exit('exit');
      return;
    }
    if (event.code === 'KeyR') {
      consume(event);
      if (offerState) {
        respondOffer(true);
        return;
      }
      if (lastStatus === 'lobby' || lastStatus === 'results' || lastStatus === 'ended' || lastStatus === null) {
        sendReady(true);
      }
      return;
    }
    keys.add(event.code);
    if (event.code === 'Space') hopEdge = true;
    if (event.code === 'KeyE') punchEdge = true;
    if (event.code === 'KeyF') kickEdge = true;
    if (TRICK_KEYS[event.code]) trickEdge = TRICK_KEYS[event.code];
    consume(event);
  }

  function onKeyUp(event) {
    if (!viewHeld) return;
    keys.delete(event.code);
    if (event.code === 'Space') hopEdge = false;
    if (event.code === 'KeyE') punchEdge = false;
    if (event.code === 'KeyF') kickEdge = false;
  }

  function onBlur() {
    keys.clear();
    smoothSteer = 0;
    hopEdge = punchEdge = kickEdge = false;
    trickEdge = null;
    submitControls(NEUTRAL_WIRE);
  }

  function attachControls() {
    if (listenersAttached || typeof window === 'undefined') return;
    listenersAttached = true;
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', onBlur);
  }

  function detachControls() {
    keys.clear();
    smoothSteer = 0;
    hopEdge = punchEdge = kickEdge = false;
    trickEdge = null;
    if (!listenersAttached || typeof window === 'undefined') return;
    listenersAttached = false;
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('keyup', onKeyUp, true);
    window.removeEventListener('blur', onBlur);
  }

  /** Same action path as the keyboard; touch buttons route here. */
  function touchInput(code, down) {
    if (!viewHeld || isTyping()) return;
    if (down) keys.add(code); else keys.delete(code);
    if (down && code === 'Space') hopEdge = true;
    if (down && code === 'KeyE') punchEdge = true;
    if (down && code === 'KeyF') kickEdge = true;
  }

  function currentControls() {
    const controls = {
      kind: 'ride',
      steer: smoothSteer,
      pedal: keys.has('KeyW') || keys.has('ArrowUp'),
      brake: keys.has('KeyS') || keys.has('ArrowDown'),
      boost: keys.has('ShiftLeft') || keys.has('ShiftRight'),
      hopPressed: hopEdge,
      punchPressed: punchEdge,
      kickPressed: kickEdge,
      trick: trickEdge,
    };
    hopEdge = punchEdge = kickEdge = false;
    trickEdge = null;
    return controls;
  }

  // --- networking -------------------------------------------------------------

  function seatHold() {
    const p = participation();
    if (!p?.sessionId || !p.lease) return null;
    return p;
  }

  function resolveMatchId() {
    const fromParticipation = participation()?.currentMatchId;
    return (typeof fromParticipation === 'string' && fromParticipation) || currentMatchId || null;
  }

  function sendFrame(controls) {
    const p = seatHold();
    const matchId = resolveMatchId();
    if (!p || !matchId) return false;
    const seq = net?.nextActivitySeq?.(activityDef.id) ?? (Date.now() % 1e9);
    try {
      net?.sendActivityInput?.({
        roomId: roomId(),
        activityId: activityDef.id,
        activityType: activityDef.type,
        sessionId: p.sessionId,
        lease: typeof p.lease === 'string' ? p.lease : p.lease.id,
        seq,
        matchId,
        controls,
      });
      predictor?.submit?.(seq, controls);
      return true;
    } catch {
      return false;
    }
  }

  function submitControls(controls = currentControls()) {
    return sendFrame(controls);
  }

  function loadedKeyFor(p) {
    if (!p?.sessionId || !p.lease) return null;
    const lease = typeof p.lease === 'string' ? p.lease : p.lease.id;
    return `${p.sessionId}|${lease}|${p.currentSlot ?? ''}`;
  }

  function sendLoaded({ force = false } = {}) {
    const p = seatHold();
    const seatKey = loadedKeyFor(p);
    if (!seatKey || !courseDoc) return false;
    if (seatKey !== loadedSeatKey) {
      loadedSeatKey = seatKey;
      loadedConfirmed = false;
      loadedLastAttemptMs = -Infinity;
    }
    if (loadedConfirmed) return false;
    const nowMs = nowPerf();
    if (!force && nowMs - loadedLastAttemptMs < LOADED_RETRY_MS) return false;
    loadedLastAttemptMs = nowMs;
    const matchId = resolveMatchId();
    if (!matchId) return false;

    const seq = net?.nextActivitySeq?.(activityDef.id) ?? (Date.now() % 1e9);
    loadedAttemptSeq = seq;
    try {
      const result = net?.sendActivityInput?.({
        roomId: roomId(),
        activityId: activityDef.id,
        activityType: activityDef.type,
        sessionId: p.sessionId,
        lease: typeof p.lease === 'string' ? p.lease : p.lease.id,
        seq,
        matchId,
        controls: {
          kind: 'loaded',
          courseId: courseDoc.id ?? 'classic',
          courseVersion: courseDoc.version ?? 1,
          courseHash: courseDoc.hash,
        },
      });
      return result?.ok !== false;
    } catch {
      return false;
    }
  }

  // Request a full addressed snapshot once per seat record (D7/D14): recovers
  // enough state after admission/reconnect without a state-echo per frame.
  let resnapshotSeatKey = null;
  function sendResnapshot({ force = false } = {}) {
    const p = seatHold();
    if (!p) return false;
    const key = loadedKeyFor(p);
    if (!force && key === resnapshotSeatKey) return false;
    resnapshotSeatKey = key;
    try {
      net?.sendActivityResnapshot?.({ activityId: activityDef.id, sessionId: p.sessionId });
    } catch {}
    return true;
  }

  /**
   * Captain lobby settings (11.2). Only the server decides; the client waits
   * for the authoritative `lobby_config` event/snapshot before reloading.
   */
  function sendConfig(config) {
    const matchId = resolveMatchId();
    if (!matchId) return false;
    try {
      net?.sendActivityConfig?.({ activityId: activityDef.id, matchId, config });
      return true;
    } catch {
      return false;
    }
  }

  /** Queue/watch entry used when the cabinet is already racing (11.5). */
  function joinAsRole(role) {
    const p = participation();
    if (!p) return false;
    try {
      if (p.isOccupied) p.leave?.();
      p.join?.(activityDef, { role });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Accept/decline a queued slot offer. The server resolves acceptance from
   * authoritative membership/proximity; the client only sends the readiness
   * edge its offer window expects.
   */
  function respondOffer(accept) {
    if (!offerState) return false;
    const matchId = resolveMatchId();
    try {
      net?.sendActivityReady?.({ activityId: activityDef.id, ready: accept === true, matchId });
    } catch {
      return false;
    }
    if (accept) offerState = { ...offerState, pending: true };
    else offerState = null;
    return true;
  }

  function sendReady(ready) {
    const p = participation();
    if (!p) return;
    const matchId = resolveMatchId();
    if (!matchId) {
      report('Still syncing the session — try Ready again in a moment.');
      return;
    }
    if (ready) {
      if (!courseDoc || courseDoc.mountain !== desiredMountain) {
        report('Loading the selected mountain — try Ready again in a moment.');
        return;
      }
      const sent = sendLoaded({ force: true });
      if (!loadedConfirmed && !sent) {
        report('Still loading the mountain — try Ready again in a moment.');
        return;
      }
    }
    try {
      net?.sendActivityReady?.({ activityId: activityDef.id, ready, matchId });
    } catch {}
  }

  let unsubscribeLoaded = null;
  if (typeof net?.on === 'function') {
    unsubscribeLoaded = net.on('activity_result', (frame) => {
      if (frame?.result === 'loaded' && frame.ackSeq === loadedAttemptSeq
        && loadedSeatKey === loadedKeyFor(seatHold())) {
        loadedConfirmed = true;
      }
    });
  }

  function onTransportDisconnect() {
    if (viewHeld || pendingActivation || hadAdmission) exit('disconnect');
  }
  const disconnectListeners = net?.disconnectListeners;
  if (typeof net?.onDisconnect === 'function') net.onDisconnect(onTransportDisconnect);
  function removeDisconnectWatch() {
    if (Array.isArray(disconnectListeners)) {
      const idx = disconnectListeners.indexOf(onTransportDisconnect);
      if (idx >= 0) disconnectListeners.splice(idx, 1);
    }
  }

  // --- context loss -----------------------------------------------------------

  function onContextLost(event) {
    if (event?.cancelable) event.preventDefault();
    if (!viewHeld && !pendingActivation) return;
    report('Graphics Reset', 'The graphics context was lost. Reload the page if the world looks wrong.');
    invalidateAttempt();
    exit('context-lost');
  }

  function installContextWatch() {
    const canvas = getRenderer?.()?.domElement;
    if (!canvas || canvas === contextCanvas) return;
    removeContextWatch();
    contextCanvas = canvas;
    canvas.addEventListener?.('webglcontextlost', onContextLost);
  }

  function removeContextWatch() {
    if (contextCanvas) {
      contextCanvas.removeEventListener?.('webglcontextlost', onContextLost);
      contextCanvas = null;
    }
  }

  // --- host lifecycle ---------------------------------------------------------

  function mixerAudioOptions() {
    const mixer = typeof audioMixer === 'function' ? audioMixer() : audioMixer;
    if (mixer?.context) return { context: mixer.context, destination: mixer.buses?.effects ?? null };
    return {};
  }

  function unlockAudioFromGesture() {
    const mixer = typeof audioMixer === 'function' ? audioMixer() : audioMixer;
    const ctx = mixer?.context;
    if (ctx && ctx.state !== 'running') ctx.resume?.().catch?.(() => {});
  }

  async function resolveCourseDocument({ mountain = desiredMountain } = {}) {
    if (activityDef.courseDocument && mountain === (activityDef.course?.id ?? 'classic')) {
      return activityDef.courseDocument;
    }
    const docs = await loadCourseDocument();
    const crafted = docs?.craftedCourseDocument?.(mountain)
      ?? docs?.default?.craftedCourseDocument?.(mountain)
      ?? null;
    if (crafted) return crafted;
    if (mountain === 'daily') {
      const daily = await net?.fetchDownhillDailyCourse?.();
      if (!daily || typeof daily !== 'object' || typeof daily.hash !== 'string') {
        throw new Error('daily_course_unavailable');
      }
      return daily;
    }
    return docs?.craftedCourseDocument?.('classic')
      ?? docs?.default?.craftedCourseDocument?.('classic')
      ?? null;
  }

  async function bootHost() {
    if (!isAttemptCurrent(attempt)) return null;
    if (bootPromise) return bootPromise;
    const local = attempt;

    bootPromise = (async () => {
      try {
        // Fast path (7.2/7.4): adopt a hidden host prepared by the background
        // scheduler when it matches the selected mountain. Adopting a stale
        // document is never allowed; an unmatched retained host is released.
        const retained = retentionEnabled ? preparation?.getRetainedHost?.() : null;
        if (retained?.host && retained.ready !== false && !retained.disposed && !retained.host.disposed) {
          const retainedDoc = retained.host.runtime?.course?.doc ?? null;
          const retainedMountain = retainedDoc?.mountain ?? retainedDoc?.id ?? null;
          if (retainedDoc && retainedDoc.hash && retainedMountain === desiredMountain) {
            courseDoc = retainedDoc;
            course = loadCourse(courseDoc);
            predictor = createPredictor(course);
            audio = createDownhillAudio({
              mixer: typeof audioMixer === 'function' ? audioMixer() : audioMixer,
            });
            host = retained.host;
            sceneAdapter = createDownhillSceneAdapter(host);
            presentationReady = true;
            loadFailed = false;
            entryRetained = true;
            booted = true;
            if (mine()) acquireTheView();
            return host;
          }
          preparation.releaseRetainedHost();
        }

        const [module, doc] = await Promise.all([loadHostModule(), resolveCourseDocument({ mountain: desiredMountain })]);
        if (!isAttemptCurrent(local)) return null;
        if (!doc) throw new Error('no_course_document');

        courseDoc = doc;
        course = loadCourse(doc);
        predictor = createPredictor(course);
        audio = createDownhillAudio({ mixer: typeof audioMixer === 'function' ? audioMixer() : audioMixer });

        const nextHost = await module?.createDownhillMayhemHost?.({
          renderer: getRenderer?.() ?? null,
          viewport: () => ({
            width: typeof window !== 'undefined' ? window.innerWidth : 1280,
            height: typeof window !== 'undefined' ? window.innerHeight : 720,
          }),
          // The multiplayer controller owns the HUD, including Ready and
          // results. Match retained hosts: do not mount the standalone menu.
          hudHost: null,
          audio: mixerAudioOptions(),
          params: {
            mountain: courseDoc.mountain ?? activityDef.course?.id ?? 'classic',
            difficulty: activityDef.course?.difficulty ?? 'mayhem',
          },
          courseDocument: courseDoc,
          onFatal: (title, detail) => {
            report(title || 'Downhill Mayhem stopped', String(detail || 'The game could not continue.'));
            exit('fatal');
          },
          onExitRequest: () => {
            exiting = true;
            exit('menu');
          },
        });
        if (!nextHost) throw new Error('host_unavailable');
        if (!isAttemptCurrent(local)) {
          nextHost.dispose?.();
          return null;
        }
        host = nextHost;
        sceneAdapter = createDownhillSceneAdapter(host);

        if (typeof host.prepare === 'function') {
          await host.prepare({ signal: local.signal, runTransaction: runGraphicsTransaction });
        }
        if (!isAttemptCurrent(local)) {
          host.dispose?.();
          host = null;
          return null;
        }
        presentationReady = true;
        loadFailed = false;
        // If the seat is already held, take the view as soon as preparation is
        // valid; otherwise `update()` acquires once admission lands.
        if (mine()) acquireTheView();
        return host;
      } catch (error) {
        if (!isAttemptCurrent(local)) return null;
        loadFailed = true;
        console.error('[DownhillMayhem] load/boot failed:', error);
        report('Downhill Mayhem failed to start', 'The cabinet could not load the game. Please try again.');
        exit('load-failed');
        return null;
      } finally {
        bootPromise = null;
      }
    })();

    return bootPromise;
  }

  /**
   * D12: tear the current host down so the normal loop rebuilds it from the
   * newly selected mountain document. Only called while the lobby is unlocked
   * (never mid-race), so no rider sees an unfinished world.
   */
  function reloadCourseForMountain() {
    if (!host && !bootPromise) {
      loadFailed = false;
      return false;
    }
    presentationReady = false;
    loadFailed = false;
    loadedConfirmed = false;
    loadedLastAttemptMs = -Infinity;
    lastRoster = [];
    raceStarted = false;
    if (viewHeld && releaseView) {
      releaseView(attempt.token, 'mountain-change');
    } else {
      const localHost = host;
      host = null;
      sceneAdapter = null;
      predictor = null;
      booted = false;
      localHost?.dispose?.();
    }
    return true;
  }

  function acquireTheView() {
    if (viewHeld || !host || !presentationReady || !acquireView) return false;    const local = attempt;
    const result = acquireView({
      owner: local.token,
      generation,
      scene: sceneAdapter?.scene ?? null,
      camera: sceneAdapter?.camera ?? null,
      resize: (width, height) => host.resize?.(width, height),
      present: () => { if (presentationReady && host) host.present?.(); },
      onRelease: (reason) => handleViewRelease(reason),
    });
    if (!result?.ok) {
      report('Downhill Mayhem could not start', 'The game view could not be prepared. Please try again.');
      loadFailed = true;
      return false;
    }
    viewHeld = true;
    if (typeof document !== 'undefined') document.body.classList.add('dm-racing');
    installContextWatch();
    attachControls();
    showHud();
    host.enter?.();
    sendLoaded();
    sendResnapshot();
    if (!entryRecorded) {
      entryRecorded = true;
      recordEntrySample({
        ready: true,
        retained: entryRetained,
        prepSeconds: entryStartedAtMs != null ? (nowPerf() - entryStartedAtMs) / 1000 : 0,
        distance: typeof getDistance === 'function' ? (getDistance() ?? 0) : 0,
      });
    }
    return true;
  }

  function handleViewRelease(reason) {
    viewHeld = false;
    presentationReady = false;
    detachControls();
    removeContextWatch();
    if (typeof document !== 'undefined') document.body.classList.remove('dm-racing');
    hideHud();
    const localHost = host;
    const retain = retentionEnabled && preparation && booted
      && reason !== 'travel' && reason !== 'dispose'
      && reason !== 'context-lost' && reason !== 'fatal' && reason !== 'load-failed'
      && reason !== 'mountain-change';
    if (localHost) {
      localHost.session?.requestExit?.();
      if (retain) {
        preparation.suspend?.();
        preparation.retainHost?.(localHost, { ready: true });
      } else {
        preparation?.releaseRetainedHost?.();
        localHost.dispose?.();
      }
      host = null;
    } else {
      preparation?.releaseRetainedHost?.();
    }
    sceneAdapter = null;
    booted = false;
    hadAdmission = false;
    if (!retain) removeHudRoot();
    if (reason === 'travel' || reason === 'dispose') dispose();
  }

  // --- authoritative frames ---------------------------------------------------

  function seedRace(frame) {
    if (!predictor || !course) return;
    const startAt = frame.startAt
      ?? (Number.isFinite(frame.serverNow) && Number.isFinite(frame.serverTick)
        ? frame.serverNow - (frame.serverTick * 1000) / TICK_HZ
        : null);
    clock.seedFromSnapshot(frame.serverNow ?? 0, nowPerf());
    goAtMs = startAt != null ? (clock.toPerf(startAt, nowPerf())?.perfMs ?? nowPerf()) : nowPerf();
    const slot = participation()?.currentSlot ?? 0;
    const rows = normalizeRiders(frame);
    const selfRow = frame.self?.playerId
      ? rows[frame.self.playerId] ?? Object.values(rows).find((r) => r?.playerId === frame.self.playerId)
      : null;
    predictor.reset(selfRow ?? initialRiderState(slot, { difficulty: 'mayhem', isAI: false }), frame.serverTick ?? 0, NEUTRAL_WIRE, frame.self?.appliedSeq ?? 0, selfRow?.resetSeq ?? 0);
    myState = predictor.visualState?.(0) ?? predictor.state;
    audio?.event?.('go');
    pushToast('DROP IN!');
  }

  function acceptSnapshot(frame) {
    if (controllerDisposed || !frame) return;
    if (frame.audience === 'summary') return; // the cabinet display owns summaries
    if (frame.activityId && frame.activityId !== activityDef.id) return;
    if (typeof frame.matchId === 'string' && frame.matchId) currentMatchId = frame.matchId;
    lastFrameInfo = {
      audience: typeof frame.audience === 'string' ? frame.audience : null,
      hasRiders: Array.isArray(frame.riders),
      riders: Array.isArray(frame.riders) ? frame.riders.length : null,
      players: Array.isArray(frame.state?.players) ? frame.state.players.length : null,
      hasSim: !!frame.state?.sim,
    };

    // Lobby roster (humans + projected AI filler slots) for the HUD. The
    // presentation snapshot carries the projected six-rider field with
    // nicknames; readiness/captain identity ride the generic player rows.
    const playerRows = Array.isArray(frame.state?.players)
      ? frame.state.players
      : Array.isArray(frame.players) ? frame.players : null;
    const fieldRows = Array.isArray(frame.riders) ? frame.riders : null;
    if (fieldRows) {
      const mySlot = participation()?.currentSlot;
      const readyBySlot = new Map((playerRows ?? []).map((row) => [row?.slot, row?.ready === true]));
      lastRoster = fieldRows.map((row, index) => ({
        slot: Number.isInteger(row?.slot) ? row.slot : index,
        playerId: typeof row?.playerId === 'string' ? row.playerId : null,
        nickname: row?.nickname ?? row?.name,
        isAI: row?.isAI === true,
        ready: readyBySlot.size > 0 ? readyBySlot.get(row?.slot) === true : row?.ready === true,
        status: row?.status,
        self: row?.slot === mySlot,
        normalizedProgress: Number.isFinite(row?.normalizedProgress) ? row.normalizedProgress : 0,
      }));
    } else if (playerRows) {
      // Generic fallback (no projected field): keep the presentation roster
      // (names + AI fillers) and update readiness/self from the player rows so
      // a generic resnapshot can never erase the six-rider lobby.
      const mySlot = participation()?.currentSlot;
      const bySlot = new Map(lastRoster.map((row) => [row.slot, row]));
      for (const row of playerRows) {
        if (!Number.isInteger(row?.slot)) continue;
        const prev = bySlot.get(row.slot);
        bySlot.set(row.slot, {
          slot: row.slot,
          playerId: row?.playerId ?? prev?.playerId ?? null,
          nickname: row?.nickname ?? prev?.nickname ?? null,
          isAI: false,
          ready: row?.ready === true,
          status: row?.status ?? prev?.status ?? null,
          self: row.slot === mySlot,
          normalizedProgress: prev?.normalizedProgress ?? 0,
        });
      }
      lastRoster = [...bySlot.values()].sort((a, b) => a.slot - b.slot);
    }
    if (playerRows || fieldRows) {
      const captainId = frame.state?.captainPlayerId ?? frame.captainPlayerId ?? null;
      if (captainId) {
        captainName = lastRoster.find((row) => row.playerId === captainId)?.nickname ?? captainName;
      }
    }

    const status = frame.status === 'ended' ? 'results' : frame.status;
    lastStatus = typeof status === 'string' ? status : lastStatus;
    if (typeof frame.serverTick === 'number') lastServerTick = frame.serverTick;
    if (Number.isFinite(frame.serverNow)) clock.seedFromSnapshot(frame.serverNow, nowPerf());
    if (Number.isFinite(frame.startAt)) countdownStartAt = frame.startAt;

    // D12/D5: the captain may change the mountain while the lobby is unlocked;
    // the server then invalidates every rider's loaded course. Reload the
    // matching document (Daily included) before readiness can lock.
    if (typeof frame.mountain === 'string' && frame.mountain && frame.mountain !== desiredMountain) {
      desiredMountain = frame.mountain;
      if (!raceStarted && lastStatus === 'lobby') reloadPending = true;
    }
    if (typeof frame.difficulty === 'string' && frame.difficulty) desiredDifficulty = frame.difficulty;

    if (lastStatus === 'racing' && !raceStarted) {
      raceStarted = true;
      seedRace(frame);
    } else if (lastStatus !== 'racing') {
      raceStarted = false;
    }

    // Remote interpolation from the authoritative snapshot (AI + other humans).
    const riders = normalizeRiders(frame);
    if (Object.keys(riders).length > 0) {
      const mySlot = participation()?.currentSlot;
      lastRiderRows = Object.values(riders).map((r) => ({
        slot: r?.slot,
        playerId: r?.playerId,
        nickname: r?.nickname ?? r?.def?.name,
        isAI: r?.isAI === true,
        finished: r?.finished === true,
        grounded: r?.grounded === true,
        crashed: r?.crashed === true,
        trick: r?.trick ?? null,
        boosting: r?.boosting === true,
        status: r?.finished ? 'finished' : r?.crashed ? 'crashed' : 'racing',
        place: r?.racePos ?? null,
        timeMs: Number.isFinite(r?.finishTime) ? r.finishTime * 1000 : null,
        dnfReason: r?.dnfReason ?? null,
        normalizedProgress: Number.isFinite(r?.normalizedProgress)
          ? Math.max(0, Math.min(1, r.normalizedProgress))
          : (course && Number.isFinite(r?.s) ? Math.max(0, Math.min(1, r.s / course.finishS)) : 0),
        self: r?.slot === mySlot,
      }));
      interpolator.push({
        serverTick: frame.serverTick ?? 0,
        riders,
        resetSeqs: frame.resetSeqs ?? Object.fromEntries(
          Object.entries(riders).map(([slot, r]) => [slot, r?.resetSeq ?? 0]),
        ),
      });
    }

    // Feed the authoritative field to the host runtime (renderer-owned riders).
    if (Object.keys(riders).length > 0) {
      host?.session?.acceptSnapshot?.({
        riders: Object.values(riders),
        phase: hostPhase(lastStatus),
        raceTime: elapsedMs() / 1000,
      });
    }

    // Self reconciliation: snapshots are never rendered for the local rider.
    if (predictor) {
      const p = participation();
      const selfPlayerId = frame.self?.playerId ?? frame.selfPlayerId ?? null;
      const slot = p?.currentSlot;
      let selfRow = null;
      if (selfPlayerId) {
        selfRow = Object.values(riders).find((r) => r?.playerId === selfPlayerId) ?? null;
      }
      if (!selfRow && slot !== undefined && slot !== null) selfRow = riders[String(slot)] ?? null;
      if (selfRow) {
        myPlayerId = selfRow.playerId ?? selfPlayerId ?? myPlayerId;
        predictor.reconcile(
          selfRow,
          frame.serverTick ?? 0,
          frame.self?.heldControls ?? NEUTRAL_WIRE,
          frame.self?.appliedSeq ?? 0,
          selfRow.resetSeq ?? 0,
        );
        myState = predictor.visualState?.(0) ?? predictor.state;
      }
      const ownRow = slot !== undefined && slot !== null ? riders[String(slot)] : null;
      if (ownRow && loadedKeyFor(participation()) === loadedSeatKey) {
        loadedConfirmed = ownRow.loaded === true || loadedConfirmed;
      }
    }

    if (lastStatus === 'results') {
      const standings = frame.result?.standings ?? frame.state?.standings ?? [];
      resultsStandings = Array.isArray(standings) ? standings : [];
    }
  }

  function acceptEvent(frame) {
    if (controllerDisposed || !frame) return;
    if (frame.activityId && frame.activityId !== activityDef.id) return;
    if (frame.matchId) currentMatchId = frame.matchId;
    host?.session?.acceptEvent?.(frame);
    switch (frame.eventType) {
      case 'countdown':
        if (Number.isFinite(frame.payload?.startAt)) countdownStartAt = frame.payload.startAt;
        clock.seedFromSnapshot(frame.serverNow ?? 0, nowPerf());
        audio?.event?.('countdown');
        break;
      case 'lobby_config':
        if (typeof frame.payload?.mountain === 'string' && frame.payload.mountain
          && frame.payload.mountain !== desiredMountain) {
          desiredMountain = frame.payload.mountain;
          if (!raceStarted && lastStatus === 'lobby') reloadPending = true;
        }
        if (typeof frame.payload?.difficulty === 'string' && frame.payload.difficulty) {
          desiredDifficulty = frame.payload.difficulty;
        }
        break;
      case 'slot_offered': {
        // Addressed to the queued rider only (11.5). The server owns the
        // window; the client mirrors it for display and sends the accept edge.
        const data = frame.payload ?? frame.data ?? {};
        offerState = {
          slot: data.slot ?? null,
          timeoutMs: Number.isFinite(data.timeoutMs) ? data.timeoutMs : 30_000,
          receivedAt: nowPerf(),
          pending: false,
        };
        pushToast('SLOT OPEN — PRESS ACCEPT TO RIDE');
        break;
      }
      case 'offer_expired': {
        const data = frame.payload ?? frame.data ?? {};
        if (offerState && (data.slot == null || data.slot === offerState.slot)) offerState = null;
        pushToast('THE SLOT WENT TO THE NEXT RIDER');
        break;
      }
      case 'match_started':
        pushToast('GO!');
        break;
      case 'strike':
        audio?.event?.('strike');
        if (frame.payload) {
          strikeLog.push({
            attacker: frame.payload.attackerSlot ?? null,
            victim: frame.payload.targetSlot ?? null,
            kind: frame.payload.kind ?? null,
          });
          if (strikeLog.length > 32) strikeLog.shift();
        }
        break;
      case 'rider_finished': {
        const rider = frame.payload?.nickname;
        if (rider) pushToast(`${String(rider).slice(0, 16)} FINISHED`);
        break;
      }
      case 'rider_dnf': {
        const rider = frame.payload?.nickname;
        if (rider) pushToast(`${String(rider).slice(0, 16)} DNF`);
        audio?.event?.('dnf');
        break;
      }
      case 'race_aborted':
        lastStatus = 'aborted';
        audio?.event?.('crash');
        break;
      default:
        break;
    }
  }

  function acceptResult(frame) {
    if (controllerDisposed || !frame) return;
    if (frame.activityId && frame.activityId !== activityDef.id) return;
    if (typeof frame.matchId === 'string' && frame.matchId) currentMatchId = frame.matchId;
    if (typeof frame.queuePosition === 'number') queuePosition = frame.queuePosition;
    if (frame.result === 'seated' || frame.result === 'accepted_offer') queuePosition = null;
    if (frame.result === 'loaded') {
      loadedConfirmed = true;
      return;
    }
    if (frame.result === 'accepted_offer') {
      offerState = null;
      pushToast('SEAT TAKEN — PRESS R WHEN READY');
      return;
    }
    if (frame.result === 'declined_offer') {
      offerState = null;
      pushToast('OFFER DECLINED — YOU ARE STILL QUEUED');
      return;
    }
    if (frame.result?.kind === 'downhill-mayhem' || frame.result?.kind === 'downhill_mayhem') {
      lastStatus = 'results';
      raceStarted = false;
      audio?.event?.('finish');
      const standings = Array.isArray(frame.result.standings) ? frame.result.standings : [];
      host?.session?.acceptResult?.({ standings, raceTime: frame.result.raceTime });
      const myId = participation()?.playerId ?? null;
      resultsStandings = standings.map((row) => ({ ...row, self: row.playerId === myId || row.self === true }));
    }
  }

  function acceptError(frame) {
    if (controllerDisposed || !frame) return;
    if (frame.error === 'race_in_progress') {
      // D13/11.5: a cabinet already racing offers watch/queue instead of a
      // seat. Auto-queue (the HUD then offers "watch live" or "leave queue");
      // no rider is ever inserted mid-race.
      const p = participation();
      if (!p?.isOccupied && !mine()) {
        joinAsRole('queue');
        report('Race In Progress', 'Queued for the next race — watch live or leave from the panel.');
      }
      return;
    }
    if (frame.error === 'not_loaded') {
      loadedConfirmed = false;
      sendLoaded({ force: true });
      report('Course still loading — wait a moment, then press Ready again.');
    } else if (frame.error === 'course_mismatch') {
      // The loaded document no longer matches the session's course (for
      // example, the captain selected another mountain). Clear the handshake
      // so the throttled loop re-sends once the matching document is loaded.
      loadedConfirmed = false;
      loadedLastAttemptMs = -Infinity;
      report('Course Mismatch', 'Reload the mountain and try again.');
    }
  }

  // --- HUD snapshot -----------------------------------------------------------

  /** The field is always six riders (design D4/D15). */
  function fieldSize() { return 6; }

  function elapsedMs() { return goAtMs != null ? nowPerf() - goAtMs : 0; }

  function hudUpdate() {
    if (!hud) return;
    const p = participation();
    let phase = 'lobby';
    if (offerState) phase = 'offer';
    else if (p?.isWatching) phase = 'watching';
    else if (p?.isQueued) phase = 'queued';
    else if (!viewHeld) phase = 'loading';
    else if (lastStatus === 'countdown') phase = 'countdown';
    else if (lastStatus === 'racing') phase = raceStarted ? 'racing' : 'syncing';
    else if (lastStatus === 'results') phase = 'results';
    else if (lastStatus === 'aborted') phase = 'aborted';

    const riders = resultsStandings
      ? resultsStandings.map((row) => ({
        slot: row.slot, nickname: row.nickname, isAI: row.isAI === true,
        place: row.place, status: row.status, timeMs: row.timeMs,
        dnfReason: row.dnfReason, normalizedProgress: row.normalizedProgress ?? 0,
        self: row.self === true,
      }))
      : (lastStatus === 'racing' || lastStatus === 'countdown')
        ? lastRiderRows
        : lastRoster;

    const countdown = countdownStartAt != null ? clock.countdown(countdownStartAt, nowPerf()) : null;
    const snapshot = {
      phase,
      riders,
      riderCount: riders.length,
      readyCount: riders.filter((r) => r.ready).length,
      capacity: activityDef.capacities?.players ?? 6,
      mountain: desiredMountain ?? courseDoc?.mountain ?? activityDef.course?.id ?? 'classic',
      difficulty: desiredDifficulty,
      captainName: captainName ?? p?.captainName ?? null,
      isCaptain: !!(captainName && lastRoster.find((r) => r.self)?.nickname === captainName),
      queued: p?.isQueued === true,
      queuePosition,
      watching: p?.isWatching === true,
      offer: offerState
        ? {
          slot: offerState.slot,
          remainingMs: Math.max(0, offerState.timeoutMs - (nowPerf() - offerState.receivedAt)),
          pending: offerState.pending === true,
        }
        : null,
      countdownLeft: countdown?.ready ? countdown.remainingMs / 1000 : (countdown?.remainingMs != null ? countdown.remainingMs / 1000 : null),
      place: myState ? provisionalPlace() : null,
      field: Math.max(1, fieldSize()),
      timeMs: myState ? (myState.finishTime != null ? myState.finishTime * 1000 : elapsedMs()) : 0,
      speed: myState?.vs ?? 0,
      boost: myState?.meter ?? 0,
      progress: myState?.s != null && course ? Math.max(0, Math.min(1, myState.s / course.finishS)) : 0,
      results: resultsStandings ? { standings: resultsStandings } : null,
      abortedReason: null,
      reconnecting: predictor?.reconnecting === true,
      toast: toastState.text,
      toastTime: Math.max(0, (toastState.untilMs - nowPerf()) / 1000),
    };
    hud.update(snapshot);
  }

  /** Debug/gate countdown projection (bounded; local clock only). */
  function debugCountdown() {
    if (countdownStartAt == null) return null;
    const c = clock.countdown(countdownStartAt, nowPerf());
    return {
      startAt: countdownStartAt,
      remainingMs: c?.remainingMs ?? null,
      number: c?.ready ? Math.max(1, Math.ceil(c.remainingMs / 1000)) : null,
    };
  }

  /** Debug/gate projection: bounded, additive aliases only (15.1). */
  function debugRiderRow(r) {
    return {
      ...r,
      name: r.nickname ?? r.name ?? null,
      airborne: r.airborne ?? r.grounded === false,
      boost: r.boost ?? r.boosting === true,
      downed: r.downed ?? r.crashed === true,
      dnf: r.dnf ?? (r.status === 'dnf' || r.dnfReason != null),
      time: r.time ?? r.timeMs ?? null,
    };
  }

  function provisionalPlace() {
    let place = 1;
    const sample = interpolator.sample(lastServerTick - BUFFER_TICKS);
    if (sample?.riders) {
      for (const rider of Object.values(sample.riders)) {
        if (rider && (rider.s ?? 0) > (myState?.s ?? 0)) place += 1;
      }
    }
    return place;
  }

  // --- frame update -----------------------------------------------------------

  function update(time, dt) {
    if (!isAttemptCurrent(attempt)) return;
    const p = participation();

    if (p?.isParticipating && p.currentActivity?.id === activityDef.id) hadAdmission = true;

    // Join cancelled before/during boot — fence async work.
    if ((pendingActivation || bootPromise) && p?.state === 'idle') {
      pendingActivation = false;
      invalidateAttempt();
      if (host || viewHeld || bootPromise) exit('cancel');
      return;
    }

    // Seat released while the view is up — restore the world.
    if (viewHeld && hadAdmission && !p?.isParticipating && !p?.isJoining) {
      exit('seat-lost');
      return;
    }

    if (p?.isParticipating && p.currentActivity?.id === activityDef.id) {
      if (reloadPending && !raceStarted && lastStatus === 'lobby') {
        reloadPending = false;
        reloadCourseForMountain();
      }
      if (!host && !bootPromise && !loadFailed) void bootHost();
      if (host && presentationReady && !viewHeld) acquireTheView();
    }

    // Queue/watch/slot-offer UX (11.5): the HUD is lifecycle-owned and lives
    // without a view while waiting for the next race.
    if (!viewHeld) {
      const audience = p?.isQueued || p?.isWatching || offerState != null;
      if (audience) {
        showHud();
        hudUpdate();
      } else if (hud && !p?.isJoining && !p?.isParticipating && !pendingActivation) {
        hideHud();
      }
    }

    if (!viewHeld || !host) return;

    const steerTarget = (keys.has('KeyA') || keys.has('ArrowLeft') ? -1 : 0)
      + (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0);
    smoothSteer += (steerTarget - smoothSteer) * (1 - Math.exp(-Math.min(dt, 0.05) * 7.5));
    if (Math.abs(smoothSteer) < 0.001) smoothSteer = 0;

    if (p?.sessionId) sendLoaded();

    const nowMs = nowPerf();
    if (lastStatus === 'racing' && raceStarted && nowMs - lastHeartbeat >= HEARTBEAT_MS) {
      lastHeartbeat = nowMs;
      submitControls();
    }

    if (raceStarted && predictor) {
      const result = predictor.update(nowMs, dt * 1000);
      if (result?.state && !result.frozen) {
        myState = predictor.visualState?.(dt * 1000) ?? result.state;
      }
      if (result?.events?.length) {
        for (const event of result.events) {
          if (event.type === 'landing') audio?.event?.('landing');
          else if (event.type === 'crash') audio?.event?.('crash');
          else if (event.type === 'trick_complete') audio?.event?.('trick');
        }
      }
    }

    if (lastStatus === 'countdown' && countdownStartAt != null) {
      const countdown = clock.countdown(countdownStartAt, nowMs);
      const whole = countdown.ready ? Math.max(1, Math.ceil(countdown.remainingMs / 1000)) : null;
      if (whole != null && whole !== lastCountdownWhole) {
        lastCountdownWhole = whole;
        audio?.event?.('countdown');
      }
    }

    // Remote riders at the interpolation delay, then the host renders them.
    // The local human is rendered at the PREDICTED pose (never a raw server
    // transform) and remotes at the interpolated pose; the host receives the
    // merged field through its snapshot session.
    const sample = interpolator.sample(lastServerTick - BUFFER_TICKS);
    const mySlot = participation()?.currentSlot ?? 0;
    const merged = [];
    if (myState) merged.push({ ...myState, slot: myState.slot ?? mySlot });
    for (const [slot, rider] of Object.entries(sample?.riders ?? {})) {
      const riderSlot = rider?.slot ?? Number(slot);
      if (String(riderSlot) === String(mySlot)) continue;
      merged.push({ ...rider, slot: riderSlot });
    }
    if (merged.length > 0) {
      host.session?.acceptSnapshot?.({
        riders: merged,
        phase: hostPhase(lastStatus),
        raceTime: elapsedMs() / 1000,
      });
    }
    const authoritative = {
      self: myState,
      myPlayerId,
      riders: sample?.riders ?? null,
      tick: predictor?.tick ?? 0,
      stale: sample?.stale === true,
    };
    try {
      sceneAdapter?.update(dt, authoritative);
      if (raceStarted && myState) audio?.update?.(myState);
    } catch (error) {
      console.error('[DownhillMayhem] host frame threw:', error);
      report('Downhill Mayhem stopped', 'The race could not continue.');
      exit('frame-error');
      return;
    }
    hudUpdate();
    void time;
  }

  // --- exit / dispose ---------------------------------------------------------

  function exit(reason = 'exit') {
    if (controllerDisposed && !viewHeld && !pendingActivation && !bootPromise) return;
    invalidateAttempt();
    pendingActivation = false;
    const p = participation();
    const shouldLeave = mine() || exiting || hadAdmission || p?.isQueued || p?.isWatching;
    exiting = false;
    hadAdmission = false;
    offerState = null;
    if (shouldLeave) {
      try { participation()?.leave?.(); } catch {}
    }
    if (viewHeld && releaseView) {
      releaseView(attempt.token, reason);
    } else {
      handleViewRelease(reason);
    }
    if (!entryRecorded && entryStartedAtMs != null) {
      entryRecorded = true;
      recordEntrySample({
        ready: false,
        retained: entryRetained,
        cancelled: true,
        prepSeconds: (nowPerf() - entryStartedAtMs) / 1000,
        distance: typeof getDistance === 'function' ? (getDistance() ?? 0) : 0,
      });
    }
    if (typeof onExit === 'function') onExit(reason);
  }

  function cancelActivation() {
    if (!pendingActivation && !viewHeld && !hadAdmission && !bootPromise) return false;
    exit('cancel');
    return true;
  }

  function dispose() {
    if (controllerDisposed) return;
    controllerDisposed = true;
    attempt.disposed = true;
    attempt.cancelled = true;
    resourceGeneration += 1;
    pendingActivation = false;
    unsubscribeLoaded?.();
    removeDisconnectWatch();
    detachControls();
    removeContextWatch();
    hideHud();
    if (viewHeld && releaseView) {
      releaseView(attempt.token, 'dispose');
    } else {
      preparation?.releaseRetainedHost?.();
      host?.dispose?.();
      host = null;
    }
    sceneAdapter = null;
    presentationReady = false;
    booted = false;
    bootPromise = null;
    hadAdmission = false;
    audio?.dispose?.();
    audio = null;
    interpolator.clear?.();
  }

  async function beginParticipation() {
    if (controllerDisposed) return false;
    if (pendingActivation) return true;
    loadFailed = false;
    activationEpoch += 1;
    attempt = createAttempt(activationEpoch);
    pendingActivation = true;
    entryStartedAtMs = nowPerf();
    entryRetained = false;
    entryRecorded = false;
    unlockAudioFromGesture();
    preparation?.prefetch?.().catch?.(() => {});
    report('Loading the mountain… Press Escape to cancel.');
    if (!mine()) {
      try { participation()?.join?.(activityDef, { role: 'play' }); } catch {}
    }
    return true;
  }

  return {
    beginParticipation,
    cancelActivation,
    update,
    acceptSnapshot,
    acceptEvent,
    acceptResult,
    acceptError,
    neutralizeInput() {
      keys.clear();
      smoothSteer = 0;
      host?.input?.neutralize?.();
    },
    exit,
    dispose,
    configure: (config) => sendConfig(config),
    respondOffer: (accept) => respondOffer(accept),
    joinAsRole: (role) => joinAsRole(role),
    get attemptToken() { return attempt.token; },
    get viewHeld() { return viewHeld; },
    get pendingActivation() { return pendingActivation; },
    /**
     * Read-only projection for the automated browser gate (`?debug=1` only).
     * Bounded, local, and never used by gameplay code.
     */
    debugState() {
      const p = participation();
      const racing = lastStatus === 'racing' || lastStatus === 'countdown';
      const rows = racing ? lastRiderRows : lastRoster;
      let phase = lastStatus === 'ended' ? 'results' : (lastStatus ?? (viewHeld ? 'lobby' : 'idle'));
      if (!lastStatus && p?.isWatching) phase = 'watching';
      else if (!lastStatus && p?.isQueued) phase = 'queued';
      return {
        phase,
        matchId: currentMatchId,
        courseHash: courseDoc?.hash ?? null,
        mountain: desiredMountain,
        difficulty: desiredDifficulty,
        humans: lastRoster.filter((r) => !r.isAI).map((r) => ({
          ...r,
          name: r.nickname ?? null,
          captain: captainName != null && r.nickname === captainName,
          connected: true,
        })),
        field: rows.map(debugRiderRow),
        riders: rows.map(debugRiderRow),
        standings: (resultsStandings ?? []).map((row) => ({
          slot: row.slot,
          place: row.place,
          name: row.nickname ?? row.name ?? null,
          time: row.timeMs != null ? row.timeMs : (row.time ?? null),
          dnf: row.status === 'dnf' || row.dnfReason != null,
          isAI: row.isAI === true,
          status: row.status,
          dnfReason: row.dnfReason,
        })),
        selfSlot: p?.currentSlot ?? 0,
        countdown: debugCountdown(),
        strikes: [...strikeLog],
        lastStrike: strikeLog[strikeLog.length - 1] ?? null,
        queued: p?.isQueued === true,
        watching: p?.isWatching === true,
        offer: offerState ? { slot: offerState.slot, timeoutMs: offerState.timeoutMs } : null,
        frameInfo: lastFrameInfo,
      };
    },
  };
}
