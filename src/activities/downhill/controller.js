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
  // Vite bundles the committed JSON documents. The Daily path is server-owned
  // and not wired yet; callers inject `activityDef.courseDocument` or
  // `loadCourseDocument` for tests, and crafted mountains fall back to classic.
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
  let hudRoot = null;
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

  function ensureHudRoot() {
    if (hudRoot || typeof document === 'undefined') return hudRoot;
    hudRoot = document.createElement('div');
    hudRoot.className = 'dm-activity';
    document.body.appendChild(hudRoot);
    return hudRoot;
  }

  function removeHudRoot() {
    if (typeof document !== 'undefined') {
      hudRoot?.remove();
      document.body.classList.remove('dm-racing');
    }
    hudRoot = null;
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

  function sendReady(ready) {
    const p = participation();
    if (!p) return;
    const matchId = resolveMatchId();
    if (!matchId) {
      report('Still syncing the session — try Ready again in a moment.');
      return;
    }
    if (ready) {
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

  async function resolveCourseDocument() {
    if (activityDef.courseDocument) return activityDef.courseDocument;
    const docs = await loadCourseDocument();
    const mountain = activityDef.course?.id ?? 'classic';
    const pick = docs?.craftedCourseDocument?.(mountain)
      ?? docs?.craftedCourseDocument?.('classic')
      ?? docs?.default?.craftedCourseDocument?.(mountain)
      ?? docs?.default?.craftedCourseDocument?.('classic')
      ?? null;
    return pick;
  }

  async function bootHost() {
    if (!isAttemptCurrent(attempt)) return null;
    if (bootPromise) return bootPromise;
    const local = attempt;

    bootPromise = (async () => {
      try {
        const [module, doc] = await Promise.all([loadHostModule(), resolveCourseDocument()]);
        if (!isAttemptCurrent(local)) return null;
        if (!doc) throw new Error('no_course_document');

        courseDoc = doc;
        course = loadCourse(doc);
        predictor = createPredictor(course);
        audio = createDownhillAudio({ mixer: typeof audioMixer === 'function' ? audioMixer() : audioMixer });

        const nextHost = module?.createDownhillMayhemHost?.({
          renderer: getRenderer?.() ?? null,
          viewport: () => ({
            width: typeof window !== 'undefined' ? window.innerWidth : 1280,
            height: typeof window !== 'undefined' ? window.innerHeight : 720,
          }),
          hudHost: ensureHudRoot(),
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

        if (typeof host.prepare === 'function') await host.prepare({ signal: local.signal });
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

  function acquireTheView() {
    if (viewHeld || !host || !presentationReady || !acquireView) return false;
    const local = attempt;
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
      && reason !== 'context-lost' && reason !== 'fatal' && reason !== 'load-failed';
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

    // Lobby roster (humans + AI filler slots) for the HUD. Server-authored.
    const playerRows = Array.isArray(frame.state?.players)
      ? frame.state.players
      : Array.isArray(frame.players) ? frame.players : null;
    if (playerRows) {
      const mySlot = participation()?.currentSlot;
      lastRoster = playerRows.map((row, index) => ({
        slot: Number.isInteger(row?.slot) ? row.slot : index,
        playerId: typeof row?.playerId === 'string' ? row.playerId : null,
        nickname: row?.nickname,
        isAI: row?.isAI === true,
        ready: row?.ready === true,
        status: row?.status,
        self: row?.slot === mySlot,
        normalizedProgress: 0,
      }));
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
      case 'match_started':
        pushToast('GO!');
        break;
      case 'strike':
        audio?.event?.('strike');
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
    if (frame.result === 'loaded') {
      loadedConfirmed = true;
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
    if (frame.error === 'not_loaded') {
      loadedConfirmed = false;
      sendLoaded({ force: true });
      report('Course still loading — wait a moment, then press Ready again.');
    } else if (frame.error === 'course_mismatch') {
      loadedConfirmed = false;
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
    if (!viewHeld) phase = 'loading';
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
      mountain: courseDoc?.mountain ?? activityDef.course?.id ?? 'classic',
      difficulty: activityDef.course?.difficulty ?? 'mayhem',
      captainName: captainName ?? p?.captainName ?? null,
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
      if (!host && !bootPromise && !loadFailed) void bootHost();
      if (host && presentationReady && !viewHeld) acquireTheView();
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
    const shouldLeave = mine() || exiting || hadAdmission;
    exiting = false;
    hadAdmission = false;
    if (shouldLeave) {
      try { participation()?.leave?.(); } catch {}
    }
    if (viewHeld && releaseView) {
      releaseView(attempt.token, reason);
    } else {
      handleViewRelease(reason);
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
    get attemptToken() { return attempt.token; },
    get viewHeld() { return viewHeld; },
    get pendingActivation() { return pendingActivation; },
  };
}
