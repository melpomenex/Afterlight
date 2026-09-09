/**
 * Summit Run race controller — the ALPINE RUSH integration
 * (integrate-ssxtricky-snowboard 4.1–4.6, built on the
 * add-multiplayer-snowboard-arcade lifecycle that remains in force).
 * Lazy-loaded by the lightweight module when a rider presses E: owns the
 * mountain scene (through the view lease), prediction, remote interpolation,
 * the countdown clock, input capture, the ported race HUD and the source
 * audio voices.
 *
 * Source input contract preserved (SSXTricky controls): A/D or ←/→ carve,
 * SPACE hold-charge/release-jump, Q/E/X hold-or-tap tricks (E is INDY GRAB —
 * inside the leased view it never reaches world interactions), SHIFT tuck,
 * W/↑ lean, B boost, S/↓ brake. Multiplayer phase scoping: R is Ready
 * (lobby) / Rematch (results) only — during racing R can never restart the
 * shared match; Escape exits safely; local typing/blur neutralizes inputs
 * without pausing the shared clock. Touch equivalents ride the same action
 * path through the HUD's touch sink.
 *
 * Guarantees carried over from the prior controller (unchanged):
 *   - entry is CANCELLABLE while loading (attempt token rejects late
 *     completion; nothing captures controls or the camera after exit);
 *   - the load handshake follows the exact seat identity (fresh seat, re-seat,
 *     promotion, rotation) with paced retries, so the FIRST Ready/Rematch
 *     press succeeds once assets are ready;
 *   - inputs ride the 30Hz held-state heartbeat; chat focus/blur/typing
 *     neutralize and cancel the jump charge;
 *   - exit/travel/error release the view, restore world input and dispose
 *     scene instances without evicting shared cache resources;
 *   - authoritative events own the HUD outcome (finish/results); predicted
 *     effects stay cosmetic. Sound stays opt-in behind the HUD toggle.
 */

import { loadCourse, COURSE_ID } from '../../../shared/snowboard/course.js';
import { TICK_HZ, TRICKS, awardCombo, initialState } from '../../../shared/snowboard/rules.js';
import { createPredictor } from './prediction.js';
import { createRemoteRiderBuffer } from './interpolation.js';
import { createRaceClock } from './clock.js';
import { createRaceAudio } from './audio.js';
import { createRaceHud } from './hud.js';

const HEARTBEAT_MS = 33;
const NEUTRAL = Object.freeze({ kind: 'neutral' });
const TOAST_SECONDS = 2.2;
const BEAT_SECONDS = 0.43;

/** Source toast copy (engine.js tick) for each predicted event. */
const EVENT_TOASTS = {
  speed_zone: 'SPEED LANE  •  FULL SEND!',
  carve_reward: 'FLOW CARVE  •  +12 BOOST',
  ramp_launch: 'BIG AIR  •  Q SPIN / E GRAB / X FLIP',
  super_pop: 'SUPER POP!  •  SEND A BIG COMBO',
  bail: 'BAIL!  •  Finish your trick before landing',
  pickup: 'BOOST PICKUP  +250',
};

export async function createSnowboardController({
  activityDef,
  net,
  getParticipation,
  getRoomId = null,
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
    await import('../../../shared/snowboard/courseDocument.js')
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
  const remotes = new Map(); // playerId -> { buffer, accent, last }
  const myState = initialState(0, 1);

  let viewHeld = false;
  // D7 load handshake state: the server resets a seat's `loaded` flag on
  // EVERY new seat record (join, queue promotion, winner-stays rotation), so
  // the handshake has to follow the seat identity. A page-lifetime "sent"
  // flag goes stale on re-seat and every Ready/Rematch is then rejected with
  // not_loaded.
  let loadedConfirmed = false;
  let loadedSeatKey = null;
  let loadedLastAttemptMs = 0;
  let loadedAttemptSeq = null;
  // Older gateways omit activityId on command replies, so the activity
  // router cannot deliver this ack. Correlate it to our exact seat/send.
  const unsubscribeLoaded = net?.on?.('activity_result', (frame) => {
    if (frame.result === 'loaded' && frame.ackSeq === loadedAttemptSeq &&
        loadedSeatKey === loadedKeyFor(participation())) loadedConfirmed = true;
  });
  let lastHeartbeat = 0;
  let hud = null;
  let countdownStartAt = null;
  let raceStarted = false;
  // Local feedback state (never authoritative): toast + audio beat.
  let toastState = { text: '', untilMs: 0 };
  let beatAccumulator = 0;
  let lastCountdownWhole = null;

  const participation = () => getParticipation?.() ?? null;
  const activityRoomId = () => getRoomId?.() || participation()?.roomId || '';
  const seatActive = () => {
    const p = participation();
    if (!p) return viewHeld;
    const activityId = p.currentActivity?.id ?? p.currentActivity?.activityId;
    if (activityId && activityId !== activityDef.id) return false;
    return p.isParticipating || p.isJoining || viewHeld;
  };
  const mine = () => seatActive() && participation()?.isParticipating;

  // --- input (source controls; 4.3) ---------------------------------------------
  const keys = new Set();
  let chargeHeld = false;
  let listenersAttached = false;

  function isTyping() {
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    return !!active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
  }

  function onKeyDown(event) {
    if (!viewHeld || isTyping()) return;
    // Capture-phase R (explicit readiness/rematch, lobby/results ONLY — a
    // racing R can never restart the shared match) and Escape (exit the
    // race; the world's Escape opens settings only once the view released).
    if (event.code === 'KeyR') {
      event.preventDefault();
      event.stopPropagation();
      if (lastStatus === 'lobby' || lastStatus === 'results' || lastStatus === null) sendReady(true);
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

  /** The same action path the keyboard uses — touch buttons route here. */
  function touchInput(code, down) {
    if (!viewHeld || isTyping()) return;
    if (down) keys.add(code);
    else keys.delete(code);
    if (code === 'Space') chargeHeld = down;
  }

  function currentControls() {
    if (!viewHeld) return NEUTRAL;
    const steer = (keys.has('KeyA') || keys.has('ArrowLeft') ? -1 : 0) + (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0);
    const tuck = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const lean = keys.has('KeyW') || keys.has('ArrowUp');
    const brake = keys.has('KeyS') || keys.has('ArrowDown');
    const boost = keys.has('KeyB');
    return {
      kind: 'ride',
      steer,
      tuck,
      lean,
      brake,
      boost,
      jumpHeld: chargeHeld,
      trickQ: keys.has('KeyQ'),
      trickE: keys.has('KeyE'),
      trickX: keys.has('KeyX'),
    };
  }

  function submitControls(controls = currentControls()) {
    const p = participation();
    if (!p?.sessionId || !p.lease) return;
    const matchId = resolveMatchId();
    if (!matchId) return;
    const seq = net?.nextActivitySeq?.(activityDef.id) ?? Date.now() % 1e9;
    try {
      net?.sendActivityInput({
        roomId: activityRoomId(),
        activityId: activityDef.id,
        sessionId: p.sessionId,
        lease: typeof p.lease === 'string' ? p.lease : p.lease.id,
        seq,
        matchId,
        controls,
      });
      predictor.submit(seq, controls, performance.now());
    } catch {}
  }

  // --- HUD (2.4 port; snapshot-driven) ---------------------------------------------
  function buildHud() {
    if (hud || typeof document === 'undefined') return hud;
    const host = getHudHost();
    if (!host) return null;
    hud = createRaceHud({
      host,
      onReady: () => sendReady(true),
      onExit: () => exit('exit'),
      onSoundToggle: (muted) => audio.setMuted(muted),
    });
    if (hud) {
      hud.setTouchSink(touchInput);
      hud.hide();
    }
    return hud;
  }

  function showHud() {
    if (buildHud()) hud.show();
  }

  function hideHud() {
    hud?.dispose();
    hud = null;
  }

  function provisionalPosition() {
    let place = 1;
    for (const [, remote] of remotes) {
      const their = remote.last?.state;
      if (their && (their.s ?? 0) > (myState.s ?? 0)) place += 1;
    }
    return place;
  }

  function fieldSize() {
    return 1 + remotes.size;
  }

  function elapsedMs() {
    return goAtMs ? performance.now() - goAtMs : 0;
  }

  /** Trick names for the callout: banked codes + the live trick (source). */
  function trickName(state) {
    const banked = (state.tricks ?? []).map((t) => TRICKS[t.code]?.name ?? '').filter(Boolean);
    if (state.trick) banked.push(state.trick.name);
    return banked.join(' + ');
  }

  function hudUpdate(extra = {}) {
    if (!hud) return;
    const p = participation();
    const state = raceStarted ? myState : null;
    const serverStatus = lastStatus;

    let phase = 'lobby';
    if (!seatActive()) phase = 'loading';
    else if (serverStatus === 'countdown') phase = 'countdown';
    else if (serverStatus === 'racing') phase = raceStarted ? 'racing' : 'syncing';
    else if (serverStatus === 'results') phase = 'results';
    else if (serverStatus === 'aborted') phase = 'aborted';

    const nowMs = performance.now();
    const snapshot = {
      phase,
      place: state ? provisionalPosition() : null,
      field: Math.max(2, fieldSize()),
      timeMs: state ? (myState.finishMs ?? elapsedMs()) : 0,
      score: state?.score ?? 0,
      bestCombo: state?.bestCombo ?? 0,
      landings: state?.landings ?? 0,
      boost: state?.boost ?? 45,
      speed: state?.v ?? 0,
      progress: state ? Math.max(0, Math.min(1, (state.s ?? 0) / course.lengthMeters)) : 0,
      airborne: state?.airborne === true,
      trickName: state ? trickName(state) : '',
      combo: state ? awardCombo(state.tricks ?? [], state.airTime ?? 0) : 0,
      comboMultiplier: state ? 1 + Math.min(Math.max(0, (state.tricks?.length ?? 0)), 4) * 0.5 : 1,
      toast: toastState.text,
      toastTime: Math.max(0, (toastState.untilMs - nowMs) / 1000),
      charge: state?.charge ?? 0,
      tucking: state?.tucking === true,
      leaning: state?.leaning === true,
      carving: state?.carving === true,
      carveCharge: state?.carveCharge ?? 0,
      zoneBoost: state?.zoneBoost ?? 0,
      boosting: state?.boosting === true,
      riderCount: readyCountForHud(p),
      capacity: activityDef.capacities?.players ?? 8,
      countdownLeft: countdownStartAt != null ? Math.max(0, (countdownStartAt - nowMs) / 1000) : null,
      results: resultsStandings,
      ...extra,
    };
    hud.update(snapshot);
  }

  let resultsStandings = null;

  function readyCountForHud(p) {
    const players = lastPlayerRows ?? [];
    if (players.length > 0) return players.filter((row) => row.ready).length;
    return p?.isParticipating ? 1 : 0;
  }

  let lastStatus = null;
  let goAtMs = null;
  let currentMatchId = null;
  let lastPlayerRows = null;

  function resolveMatchId() {
    const fromParticipation = participation()?.currentMatchId;
    return (typeof fromParticipation === 'string' && fromParticipation)
      || currentMatchId
      || null;
  }

  // --- network framing -----------------------------------------------------------
  const LOADED_RETRY_MS = 1500;

  // Identifies the seat record a load handshake belongs to. Changing any
  // part (new lease on rejoin, promotion, rotation) forces a fresh handshake.
  function loadedKeyFor(p) {
    if (!p?.sessionId || !p.lease) return null;
    const lease = typeof p.lease === 'string' ? p.lease : p.lease.id;
    return `${p.sessionId}|${lease}|${p.currentSlot ?? ''}`;
  }

  function sendLoaded({ force = false } = {}) {
    const p = participation();
    const seatKey = loadedKeyFor(p);
    if (!seatKey) return false;
    if (seatKey !== loadedSeatKey) {
      loadedSeatKey = seatKey;
      loadedConfirmed = false;
      loadedLastAttemptMs = 0;
    }
    if (loadedConfirmed) return false;
    // Paced retry: heals a silently dropped send (transport not yet joined)
    // and readiness races without per-frame spam.
    const nowMs = performance.now();
    if (!force && nowMs - loadedLastAttemptMs < LOADED_RETRY_MS) return false;
    loadedLastAttemptMs = nowMs;
    const matchId = resolveMatchId();
    if (!matchId) return false;

    const seq = net?.nextActivitySeq?.(activityDef.id) ?? Date.now() % 1e9;
    loadedAttemptSeq = seq;
    try {
      const result = net?.sendActivityInput({
        roomId: activityRoomId(),
        activityId: activityDef.id,
        sessionId: p.sessionId,
        lease: typeof p.lease === 'string' ? p.lease : p.lease.id,
        seq,
        matchId,
        controls: {
          kind: 'loaded',
          courseId: COURSE_ID,
          courseVersion: course.doc.version,
          courseHash: course.hash,
        },
      });
      if (result?.ok === false) return false;
      return true;
    } catch {
      return false;
    }
  }

  function sendReady(ready) {
    const p = participation();
    if (!p) return;
    const matchId = resolveMatchId();
    if (!matchId) {
      toast?.('Summit Run', 'Still syncing the session — try Ready again in a moment.', 'ACTIVITY');
      return;
    }
    if (ready) {
      // Validate the current seat even when the previous seat was loaded.
      // The ordered transport delivers loaded before the following ready.
      const sent = sendLoaded({ force: true });
      if (!loadedConfirmed && !sent) {
        toast?.('Summit Run', 'Still loading the mountain — try Ready again in a moment.', 'ACTIVITY');
        return;
      }
    }
    try {
      const result = net?.sendActivityReady?.({
        activityId: activityDef.id,
        ready,
        matchId,
      });
      if (result && result.ok === false) {
        toast?.('Summit Run', result.details || 'Could not send ready.', 'ACTIVITY');
        return;
      }
    } catch {}
  }

  // --- local feedback (source toasts + tones; never authoritative) ------------------
  function pushToast(text) {
    toastState = { text, untilMs: performance.now() + TOAST_SECONDS * 1000 };
  }

  function handleEvents(events) {
    for (const event of events) {
      const copy = EVENT_TOASTS[event.type];
      if (copy) pushToast(copy);
      switch (event.type) {
        case 'launch':
          audio.event(event.cause === 'super_pop' ? 'superPop' : 'jump');
          break;
        case 'trick_complete':
          audio.event('trick');
          break;
        case 'bail':
          audio.event('bail');
          break;
        case 'clean_landing':
          pushToast(`CLEAN LANDING  +${event.points.toLocaleString()}  •  BOOST EARNED`);
          audio.event('landing');
          break;
        case 'nice_air':
          pushToast('NICE AIR  •  Hold Q / E / X to chain tricks');
          break;
        case 'speed_zone':
          audio.event('speedLane');
          break;
        case 'carve_reward':
          audio.event('carve');
          break;
        case 'pickup':
          audio.event('pickup');
          break;
        case 'finish':
          audio.event('finish');
          break;
        default:
          break;
      }
    }
  }

  // --- frame update ----------------------------------------------------------------
  function update(time, dt) {
    if (attempt.disposed || attempt.cancelled) return;

    const p = participation();

    // Seat released while the mountain view is still up — restore the social world.
    if (viewHeld && p && p.currentActivity?.id === activityDef.id && !p.isParticipating && !p.isJoining) {
      releaseView?.(attempt.token, 'exit');
      handleViewRelease('exit');
      return;
    }

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
    if (p?.sessionId) sendLoaded();

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
        if (result.events?.length) handleEvents(result.events);
        // Source beat while racing (audible only when sound is enabled).
        beatAccumulator += dt;
        if (beatAccumulator >= BEAT_SECONDS) {
          beatAccumulator = 0;
          audio.event(myState.boosting ? 'beatBoost' : 'beat');
        }
      }
    }

    // Countdown ticks (audio only; the authoritative start stays server-owned).
    if (lastStatus === 'countdown' && countdownStartAt != null) {
      const whole = Math.max(1, Math.ceil((countdownStartAt - nowMs) / 1000));
      if (whole !== lastCountdownWhole) {
        lastCountdownWhole = whole;
        audio.event('countdown');
      }
    }

    const remoteList = [];
    for (const [playerId, remote] of remotes) {
      const sample = remote.buffer.sample(nowMs);
      if (sample) remoteList.push({ playerId, state: sample.state, accent: remote.accent });
    }

    scene.update(time, dt, raceStarted ? myState : null, remoteList);
    if (raceStarted) audio.update({ ...myState, airborne: myState.airborne });
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

    if (typeof frame.matchId === 'string' && frame.matchId) {
      currentMatchId = frame.matchId;
    }

    lastStatus = typeof frame.status === 'string' ? frame.status : lastStatus;
    if (lastStatus !== 'racing') raceStarted = false;
    if (frame.status === 'racing' && !raceStarted) {
      raceStarted = true;
      const startAt = frame.startAt ?? (frame.serverNow - (frame.serverTick ?? 0) * 1000 / TICK_HZ);
      clock.seedFromSnapshot(frame.serverNow ?? 0, performance.now());
      goAtMs = clock.toPerf(startAt, performance.now()) ?? performance.now();
      const slot = participation()?.currentSlot ?? 0;
      const playerRows = Array.isArray(frame.state?.players) ? frame.state.players : [];
      predictor.reset(initialState(slot, Math.max(2, playerRows.length)), frame.serverTick ?? 0, NEUTRAL, 0, 0);
      Object.assign(myState, predictor.visualState?.() ?? initialState(slot, Math.max(2, playerRows.length)));
      audio.event('go');
      pushToast('DROP IN!');
    }

    if (clock.sampleCount < 8 || frame.serverNow) {
      clock.seedFromSnapshot(frame.serverNow ?? 0, performance.now());
    }
    if (frame.eventType === 'countdown' || frame.startAt) countdownStartAt = frame.startAt ?? countdownStartAt;

    const riders = frame.state?.sim?.riders;
    const playerRows = Array.isArray(frame.state?.players) ? frame.state.players : [];
    lastPlayerRows = playerRows;
    // Phoenix's simulator keys riders by slot; older snapshots carry an
    // array with playerId. Normalize both before prediction/interpolation.
    const rows = Array.isArray(riders) ? riders : Object.entries(riders ?? {}).map(([slot, rider]) => ({
      ...rider, playerId: playerRows.find((player) => String(player.slot) === slot)?.playerId,
    }));
    const self = frame.self;
    const p = participation();
    const ownPlayer = playerRows.find((row) => row.slot === p?.currentSlot);
    const selfPlayerId = self?.playerId ?? ownPlayer?.playerId;
    if (loadedKeyFor(p) === loadedSeatKey && ownPlayer) {
      loadedConfirmed = ownPlayer.loaded === true;
    }

    for (const rider of rows) {
      const playerRow = playerRows.find((row) => row.playerId === rider.playerId);
      if (self && rider.playerId === selfPlayerId) continue; // handled below
      if (!rider.playerId) continue;
      let remote = remotes.get(rider.playerId);
      if (!remote) {
        remote = { buffer: createRemoteRiderBuffer(), accent: playerRow?.accent ?? null, last: null };
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
      const mineRow = rows.find((r) => r.playerId === selfPlayerId) ?? null;
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
    } else if (frame.eventType === 'race_aborted') {
      lastStatus = 'aborted';
      audio.event('bail');
      hudUpdate();
    }
  }

  function acceptResult(frame) {
    if (attempt.disposed) return;
    if (typeof frame?.matchId === 'string' && frame.matchId) {
      currentMatchId = frame.matchId;
    }
    if (frame?.result === 'loaded') {
      loadedConfirmed = true;
      return;
    }
    if (frame.result?.kind === 'snowboard_race') {
      lastStatus = 'results';
      raceStarted = false;
      audio.event('finish');
      // Authoritative standings (server): display with the self marker.
      const standings = Array.isArray(frame.result.standings) ? frame.result.standings : [];
      const myPlayerId = participation()?.playerId ?? null;
      resultsStandings = standings.map((row) => ({
        ...row,
        self: row.playerId === myPlayerId,
      }));
      hudUpdate();
    }
  }

  function acceptError(frame) {
    if (attempt.disposed) return;
    if (frame.error === 'not_loaded') {
      loadedConfirmed = false;
      sendLoaded({ force: true });
      toast?.('Summit Run', 'Course still loading — wait a moment, then press Ready again.', 'ACTIVITY');
      return;
    }
    if (frame.error === 'course_mismatch') {
      loadedConfirmed = false; // force a fresh handshake after a course drift
      toast?.('Course Mismatch', 'Reload the mountain and try again.', 'ACTIVITY');
    }
  }

  // --- exit / dispose (4.6) --------------------------------------------------------------
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
    unsubscribeLoaded?.();
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
    // New attempt: the seat handshake starts clean — the server creates a
    // fresh seat record (loaded: false) on every join.
    loadedConfirmed = false;
    loadedSeatKey = null;
    loadedLastAttemptMs = 0;
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
