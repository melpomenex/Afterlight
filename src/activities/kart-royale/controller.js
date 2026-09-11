/**
 * Kart Royale hosted controller (integrate-kart-royale-arcade 4.2, design D2–D12).
 *
 * Choreography (all through existing Afterlight seams — this file owns NO
 * renderer, NO RAF loop and NO second canvas):
 *
 *   E at cabinet → beginParticipation(): toast + join (server session).
 *   seat accepted → createKartRoyaleHost (cheap: scene/camera exist, no GL)
 *                   → await host.boot() (systems + prewarm; cancellable via
 *                     the attempt token — a stale completion is discarded)
 *                   → prepare selection readiness (grid pose + camera)
 *                   → acquireView(scene, camera, present, resize) — only after
 *                     the destination is posed; present is a no-op until ready.
 *   exit paths (all funnel into exit()): pause "Leave cabinet", results
 *     "Back to the arcade" (both via the host's onExitRequest), travel
 *     (lease revoke → onRelease), seat loss/disconnect, fatal error,
 *     WebGL context loss. Exit releases the lease; when retention is enabled
 *     the prepared host is suspended and retained for fast re-entry.
 */

export function createKartRoyaleController({
  activityDef,
  net = null,
  getParticipation = null,
  getRoomId = null,
  acquireView = null,
  releaseView = null,
  getRenderer = null,
  generation = 0,
  getPlayer = null,
  audioMixer = null,
  toast = null,
  scheduleGraphicsJob = null,
  runGraphicsTransaction = null,
  cancelGraphicsJobs = null,
  preparation = null,
  retentionEnabled = false,
  getDistance = null,
} = {}) {
  if (!activityDef || activityDef.type !== 'kart-royale') {
    throw new Error('kart-royale controller requires a kart-royale activity definition');
  }

  /**
   * Boot-before-lease cold preparation (fix-kart-royale-instant-entry D4/D6).
   * Requires frame-bound graphics transactions so Theater stays presentable.
   */
  const coldPreparationEnabled = typeof runGraphicsTransaction === 'function';

  let controllerDisposed = false;
  /** Bumps on every new E press; invalidates in-flight wrapper continuations. */
  let activationEpoch = 0;
  /** Bumps on cancel/exit/dispose; fences host boot and import continuations. */
  let resourceGeneration = 0;

  function createAttempt(epoch) {
    return {
      token: Symbol(`kart-royale-attempt-${epoch}`),
      epoch,
      generation: resourceGeneration,
      disposed: false,
      cancelled: false,
    };
  }

  let attempt = createAttempt(0);
  let viewHeld = false;
  let host = null;
  let bootPromise = null;
  let booted = false;
  let presentationReady = false;
  let hudRoot = null;
  let attached = false;
  let exiting = false;
  let pendingActivation = false;
  let loadFailed = false;
  /** Tracks admission for this controller even after participation clears currentActivity. */
  let hadAdmission = false;
  let contextCanvas = null;
  let consumeEntryKeyUp = false;

  function isAttemptCurrent(local) {
    return local
      && local === attempt
      && !local.cancelled
      && !local.disposed
      && !controllerDisposed;
  }

  function bumpResourceGeneration() {
    resourceGeneration += 1;
    return resourceGeneration;
  }

  function invalidateAttempt() {
    attempt.cancelled = true;
    bumpResourceGeneration();
  }

  function onTransportDisconnect() {
    if (viewHeld || pendingActivation || hadAdmission) {
      exit('disconnect');
    }
  }

  function installDisconnectWatch() {
    if (typeof net?.onDisconnect === 'function') {
      net.onDisconnect(onTransportDisconnect);
    }
  }

  function removeDisconnectWatch() {
    if (Array.isArray(net?.disconnectListeners)) {
      const idx = net.disconnectListeners.indexOf(onTransportDisconnect);
      if (idx >= 0) net.disconnectListeners.splice(idx, 1);
    }
  }

  installDisconnectWatch();

  function getPerf() {
    return (typeof globalThis !== 'undefined' && globalThis.__kartPerf) || null;
  }
  function perfSpan(name, action, meta) {
    const p = getPerf();
    if (!p) return;
    if (action === 'start') p.startSpan(name, meta);
    else p.endSpan(name, meta);
  }
  function perfMark(phase, data) {
    getPerf()?.recordMark(phase, data);
  }

  function participation() {
    return typeof getParticipation === 'function' ? getParticipation() : null;
  }

  function mine() {
    const p = participation();
    return Boolean(p && p.currentActivity?.id === activityDef.id);
  }

  function pushToast(title, body) {
    toast?.(title, body, 'ACTIVITY');
  }

  // --- lifecycle-owned DOM + presentation -------------------------------------

  function ensureHudRoot() {
    if (hudRoot || typeof document === 'undefined') return hudRoot;
    hudRoot = document.createElement('div');
    hudRoot.className = 'kr-activity';
    document.body.appendChild(hudRoot);
    return hudRoot;
  }

  function removeHudRoot() {
    if (typeof document !== 'undefined') {
      hudRoot?.remove();
      document.body.classList.remove('kr-racing');
    }
    hudRoot = null;
  }

  // --- input (capture-phase, attached only while the game is live) -------------

  function consume(event) {
    event.stopPropagation();
    if (event.cancelable) event.preventDefault();
  }

  function onKeyDown(event) {
    if (!host) return;
    host.input.handleKeyDown(event);
    consume(event);
  }

  function onKeyUp(event) {
    if (!host) return;
    if (consumeEntryKeyUp && (event.code === 'KeyE' || event.key === 'e' || event.key === 'E')) {
      consumeEntryKeyUp = false;
      consume(event);
      return;
    }
    host.input.handleKeyUp(event);
    consume(event);
  }

  function onBlur() {
    host?.input.neutralize();
    if (booted) host?.race.setPaused(true);
  }

  function attachControls() {
    if (attached || typeof window === 'undefined') return;
    attached = true;
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', onBlur);
  }

  function detachControls() {
    if (!attached || typeof window === 'undefined') return;
    attached = false;
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('keyup', onKeyUp, true);
    window.removeEventListener('blur', onBlur);
    host?.input.neutralize();
  }

  // --- context loss (D12: attach to the actual renderer canvas) ----------------

  function onContextLost(event) {
    if (event?.cancelable) event.preventDefault();
    if (!viewHeld && !pendingActivation) return;
    pushToast('Graphics Reset', 'The graphics context was lost. Reload the page if the world looks wrong.');
    bumpResourceGeneration();
    exit('context-lost');
  }

  function installContextWatch() {
    const canvas = getRenderer?.()?.domElement;
    if (!canvas || canvas === contextCanvas) return;
    removeContextWatch();
    contextCanvas = canvas;
    canvas.addEventListener('webglcontextlost', onContextLost);
  }

  function removeContextWatch() {
    if (contextCanvas) {
      contextCanvas.removeEventListener('webglcontextlost', onContextLost);
      contextCanvas = null;
    }
  }

  // --- host lifecycle -------------------------------------------------------------

  function mixerAudioOptions() {
    const mixer = typeof audioMixer === 'function' ? audioMixer() : audioMixer;
    if (mixer?.context) {
      return { context: mixer.context, destination: mixer.buses?.effects ?? null };
    }
    return {};
  }

  function unlockAudioFromGesture() {
    const mixer = typeof audioMixer === 'function' ? audioMixer() : audioMixer;
    const ctx = mixer?.context;
    if (ctx && ctx.state !== 'running') {
      ctx.resume().catch(() => {});
    }
  }

  let firstVisibleFramePresented = false;

  async function createAndBootHost() {
    if (!isAttemptCurrent(attempt)) return;
    if (bootPromise) return bootPromise;

    const localAttempt = attempt;
    const localGen = localAttempt.generation;

    bootPromise = (async () => {
      try {
        const retained = retentionEnabled ? preparation?.getRetainedHost?.() : null;
        if (retained?.host && retained.ready && !retained.disposed) {
          host = retained.host;
          perfSpan('boot', 'start');
          perfSpan('boot', 'end', { retained: true });
          if (!isAttemptCurrent(localAttempt) || localGen !== resourceGeneration) return;
          if (!coldPreparationEnabled && !acquireTheView()) return;
          const ready = host.prepareSelectionReadiness();
          if (!ready) {
            preparation?.releaseRetainedHost?.();
            host = null;
            loadFailed = true;
            exit('load-failed');
            return;
          }
          if (coldPreparationEnabled && !acquireTheView()) return;
          booted = true;
          presentationReady = true;
          perfMark('ready');
          preparation?.activate?.();
          host.beginSession();
          attachControls();
          consumeEntryKeyUp = true;
          perfMark('input-ready');
          recordEntryReadiness(true, { retained: true });
          return;
        }

        perfSpan('host-import', 'start');
        const module = await import('../../../games/kart-royale/src/host/index.ts');
        perfSpan('host-import', 'end');
        if (!isAttemptCurrent(localAttempt) || localGen !== resourceGeneration) return;

        perfSpan('construct', 'start');
        const nextHost = module.createKartRoyaleHost({
          renderer: getRenderer(),
          viewport: () => ({
            width: typeof window !== 'undefined' ? window.innerWidth : 1280,
            height: typeof window !== 'undefined' ? window.innerHeight : 720,
          }),
          hudHost: ensureHudRoot(),
          audio: mixerAudioOptions(),
          startScreen: 'select',
          // Hosted render policy (fix-kart-royale-render-sharpness D8): the
          // desktop floors and blur strength this change commits to. The
          // policy can only TIGHTEN device detection inside the game, so this
          // is a commitment, not a bypass; standalone Kart Royale is
          // untouched and keeps its own defaults and harness knobs.
          params: {
            renderPolicy: {
              normalScaleFloor: 0.85,
              emergencyScaleFloor: 0.72,
            },
          },
          perfSpan: (name, action, meta) => perfSpan(name, action, meta),
          perfMark: (phase, data) => perfMark(phase, data),
          onFatal: (title, detail) => {
            pushToast(title || 'Kart Royale Stopped', String(detail || 'The game could not continue.'));
            exit('fatal');
          },
        onExitRequest: () => {
          exiting = true;
          exit('menu');
        },
        runGraphicsTransaction: typeof runGraphicsTransaction === 'function'
          ? runGraphicsTransaction
          : null,
      });
        perfSpan('construct', 'end');
        if (!isAttemptCurrent(localAttempt) || localGen !== resourceGeneration) {
          nextHost.dispose();
          return;
        }
        host = nextHost;
        // Render diagnostics are ALWAYS published (fix-kart-royale-render-
        // sharpness D10): read-only field reads, no DOM, no frame cost. The
        // heavier probe hooks stay behind the ?debug gate.
        if (typeof window !== 'undefined') {
          const existing = window.__kartDebug;
          window.__kartDebug = {
            ...existing,
            getRenderStats: () => (host && !host.dead ? host.getRenderStats() : null),
            isBooted: () => booted,
            isReady: () => presentationReady,
          };
        }
        if (typeof window !== 'undefined' && Array.from(new URLSearchParams(location.search).keys()).includes('debug')) {
          window.__kartDebug = {
            ...window.__kartDebug,
            getCamera: () => {
              if (!host?.ctx?.camera) return null;
              const c = host.ctx.camera;
              return {
                position: [c.position.x, c.position.y, c.position.z],
                rotation: [c.rotation.x, c.rotation.y, c.rotation.z],
                quaternion: [c.quaternion.x, c.quaternion.y, c.quaternion.z, c.quaternion.w],
                isOrigin: c.position.x === 0 && c.position.y === 0 && c.position.z === 0,
              };
            },
            getKarts: () => {
              const karts = host?.ctx?.race?.karts;
              if (!karts) return null;
              return karts.map((k) => ({
                pos: [k.object.position.x, k.object.position.y, k.object.position.z],
                y: k.object.position.y,
              }));
            },
          };
        }

        if (!coldPreparationEnabled && !acquireTheView()) return;

        perfSpan('boot', 'start');
        await host.boot();
        perfSpan('boot', 'end');
        if (!isAttemptCurrent(localAttempt) || localGen !== resourceGeneration) return;
        if (host.dead) {
          exit('fatal');
          return;
        }

        perfSpan('spawn-valid', 'start');
        const ready = host.prepareSelectionReadiness();
        perfSpan('spawn-valid', 'end', { ready });
        if (!ready) {
          pushToast('Kart Royale Failed to Start', 'The race grid could not be prepared. Please try again.');
          loadFailed = true;
          exit('load-failed');
          return;
        }
        perfMark('pose-valid');

        if (coldPreparationEnabled && !acquireTheView()) return;

        booted = true;
        presentationReady = true;
        perfMark('ready');
        await preparation?.prepare?.({
          factory: async () => ({ host, ready: true }),
        });
        preparation?.activate?.();
        host.beginSession();
        attachControls();
        consumeEntryKeyUp = true;
        perfMark('input-ready');
        recordEntryReadiness(true);
      } catch (error) {
        if (!isAttemptCurrent(localAttempt)) return;
        console.error('[KartRoyale] load/boot failed:', error);
        loadFailed = true;
        recordEntryReadiness(false);
        pushToast('Kart Royale Failed to Start', 'The cabinet could not load the game. Please try again.');
        exit('load-failed');
      } finally {
        bootPromise = null;
      }
    })();

    return bootPromise;
  }

  function acquireTheView() {
    if (!acquireView || viewHeld || !host) return Boolean(viewHeld);
    firstVisibleFramePresented = false;
    const localAttempt = attempt;
    const result = acquireView({
      owner: localAttempt.token,
      generation,
      scene: host.ctx.scene,
      camera: host.ctx.camera,
      resize: (w, h) => host.resize(w, h),
      present: () => {
        if (!presentationReady || !host || host.dead) return;
        if (!firstVisibleFramePresented) {
          firstVisibleFramePresented = true;
          perfMark('first-visible-frame');
          getPerf()?.endAttempt?.('success');
        }
        host.present();
      },
      toneMappingExposure: 1.05,
      onRelease: (reason) => handleViewRelease(reason),
    });
    if (result.ok) {
      viewHeld = true;
      if (typeof document !== 'undefined') document.body.classList.add('kr-racing');
      installContextWatch();
      return true;
    }
    console.warn('[KartRoyale] view lease rejected:', result.reason);
    host.dispose();
    host = null;
    loadFailed = true;
    return false;
  }

  function recordEntryReadiness(ready, { retained = false } = {}) {
    const record = globalThis.__kartReadinessMetrics?.recordArrivalSample;
    if (!record) return;
    const distance = typeof getDistance === 'function' ? getDistance() : 0;
    const prepSeconds = retained ? 0 : (preparation?.prepLeadSeconds ?? 0);
    record({
      ready: Boolean(ready),
      mode: 'walk',
      prepSeconds,
      distance,
    });
  }

  function handleViewRelease(reason) {
    const wasPresenting = presentationReady;
    viewHeld = false;
    presentationReady = false;
    detachControls();
    removeContextWatch();
    if (typeof document !== 'undefined') {
      document.body.classList.remove('kr-racing');
    }
    const localHost = host;
    const retain = retentionEnabled
      && preparation
      && booted
      && wasPresenting
      && reason !== 'travel'
      && reason !== 'dispose'
      && reason !== 'context-lost'
      && reason !== 'fatal'
      && reason !== 'load-failed';
    if (localHost) {
      localHost.endSession();
      if (retain) {
        preparation.suspend();
        preparation.retainHost(localHost, { ready: true });
        host = null;
      } else {
        preparation?.releaseRetainedHost?.();
        localHost.dispose();
        host = null;
      }
    }
    booted = false;
    bootPromise = null;
    hadAdmission = false;
    if (!retain) removeHudRoot();
    if (reason === 'travel' || reason === 'dispose') {
      dispose();
    }
  }

  // --- frame update ------------------------------------------------------------------

  function update(time, dt) {
    if (!isAttemptCurrent(attempt)) return;

    const p = participation();

    if (p?.isParticipating && p.currentActivity?.id === activityDef.id) {
      hadAdmission = true;
    }

    // Join cancelled (Escape / travel) before or during boot — fence async work.
    if ((pendingActivation || bootPromise) && p?.state === 'idle') {
      pendingActivation = false;
      invalidateAttempt();
      if (host || viewHeld || bootPromise) {
        exit('cancel');
      }
      return;
    }

    // Seat released while the game view is still up (server ejection,
    // disconnect): restore the social world. currentActivity may already be
    // null after participation reset — hadAdmission covers that race.
    if (viewHeld && hadAdmission && !p?.isParticipating && !p?.isJoining) {
      exit('seat-lost');
      return;
    }

    if (p?.isParticipating && p.currentActivity?.id === activityDef.id && !viewHeld && !bootPromise && !host && !loadFailed) {
      perfSpan('admission', 'end');
      void createAndBootHost();
    }

    if (!viewHeld || !host || !booted || !presentationReady) return;

    try {
      host.update(dt);
    } catch (error) {
      console.error('[KartRoyale] host frame threw:', error);
      pushToast('Kart Royale Stopped', 'The race could not continue.');
      exit('frame-error');
    }
    if (host.dead) {
      exit('fatal');
    }
    void time;
  }

  // --- exit / dispose ----------------------------------------------------------------

  function exit(reason = 'exit') {
    if (attempt.disposed && !viewHeld && !pendingActivation) return;
    const p = getPerf();
    if (p?.getActiveAttempt?.()?.status === 'pending') {
      p.endAttempt(reason === 'exit' || reason === 'menu' ? 'cancelled' : 'failed', reason);
    }
    invalidateAttempt();
    cancelGraphicsJobs?.();
    pendingActivation = false;
    if (mine() || exiting || hadAdmission) {
      try {
        participation()?.leave?.();
      } catch {}
    }
    exiting = false;
    hadAdmission = false;
    if (viewHeld && releaseView) {
      releaseView(attempt.token, reason);
    } else {
      handleViewRelease(reason);
    }
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
    bumpResourceGeneration();
    pendingActivation = false;
    const p = getPerf();
    if (p?.getActiveAttempt?.()?.status === 'pending') {
      p.endAttempt('cancelled', 'dispose');
    }
    removeDisconnectWatch();
    detachControls();
    removeContextWatch();
    removeHudRoot();
    if (viewHeld && releaseView) {
      releaseView(attempt.token, 'dispose');
    } else if (host) {
      preparation?.releaseRetainedHost?.();
      host.dispose();
      host = null;
    }
    preparation?.releaseRetainedHost?.();
    booted = false;
    presentationReady = false;
    bootPromise = null;
    hadAdmission = false;
  }

  async function beginParticipation() {
    if (controllerDisposed) return false;
    if (pendingActivation) return true;
    loadFailed = false;
    activationEpoch += 1;
    attempt = createAttempt(activationEpoch);
    pendingActivation = true;
    unlockAudioFromGesture();
    preparation?.prefetch?.().catch(() => {});
    pushToast('Kart Royale', 'Loading the race… Press Esc to cancel.');
    perfSpan('admission', 'start');
    if (!mine()) {
      participation()?.join?.(activityDef, { role: 'play' });
    }
    if (coldPreparationEnabled) {
      void createAndBootHost();
    }
    return true;
  }

  return {
    beginParticipation,
    cancelActivation,
    update,
    acceptSnapshot() { /* admission-only: the bystander module owns the display */ },
    acceptEvent() { /* no server race events in v1 */ },
    acceptResult() { /* no durable results in v1 */ },
    acceptError() { /* server errors surface via participation toasts */ },
    neutralizeInput() {
      host?.input.neutralize();
    },
    exit,
    dispose,
    get attemptToken() {
      return attempt.token;
    },
    get viewHeld() {
      return viewHeld;
    },
    get pendingActivation() {
      return pendingActivation;
    },
  };
}
