/**
 * Kart Royale hosted controller (integrate-kart-royale-arcade 4.2, design D2–D12).
 *
 * Choreography (all through existing Afterlight seams — this file owns NO
 * renderer, NO RAF loop and NO second canvas):
 *
 *   E at cabinet → beginParticipation(): toast + join (server session).
 *   seat accepted → createKartRoyaleHost (cheap: scene/camera exist, no GL)
 *                   → acquireView(scene, camera, present, resize) — the empty
 *                     game scene is the loading backdrop, and from this moment
 *                     the Theater is not presenting, so the game's boot-time
 *                     GL mutations cannot touch a live host frame.
 *                   → await host.boot() (systems + prewarm; cancellable via
 *                     the attempt token — a stale completion is discarded).
 *                   → host.beginSession(): capture-phase input routing, game
 *                     HUD mounted in the lifecycle-owned root, roster select.
 *   exit paths (all funnel into exit()): pause "Leave cabinet", results
 *     "Back to the arcade" (both via the host's onExitRequest), travel
 *     (lease revoke → onRelease), seat loss/disconnect, fatal error,
 *     WebGL context loss. Exit releases the lease, tears the game down
 *     (dispose walks every system dispose — v1 does not warm-retain the
 *     world) and leaves the session with a safe dismount.
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
} = {}) {
  if (!activityDef || activityDef.type !== 'kart-royale') {
    throw new Error('kart-royale controller requires a kart-royale activity definition');
  }

  const attempt = { token: Symbol('kart-royale-attempt'), disposed: false, cancelled: false };
  let viewHeld = false;
  let host = null;
  let booting = false;
  let booted = false;
  let hudRoot = null;
  let attached = false;
  let exiting = false;
  // A failed load must not be retried on every frame while the participation
  // state lags behind the leave (D12: bounded failure, never a loop).
  let loadFailed = false;

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

  /**
   * While the game is live it owns the whole keyboard: consume every key at
   * window-capture so the host's own handlers (E = interact/exit, Escape
   * hierarchy, movement keys) never see them. Without the stop, main.js's
   * bubble-phase E exits the race instead of firing the item — the exact
   * conflict this capture layer exists to resolve.
   */
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
    host.input.handleKeyUp(event);
    consume(event);
  }

  function onBlur() {
    // Losing focus mid-corner must not leave controls stuck; a blur mid-race
    // pauses so the player never misses a race they cannot see.
    host?.input.neutralize();
    if (booted) host.race.setPaused(true);
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

  // --- context loss (D12: no false recovery — exit with an honest message) -----

  function onContextLost() {
    if (!viewHeld) return;
    pushToast('Graphics Reset', 'The graphics context was lost. Reload the page if the world looks wrong.');
    exit('context-lost');
  }

  function installContextWatch() {
    if (typeof window === 'undefined') return;
    window.addEventListener('webglcontextlost', onContextLost);
  }

  function removeContextWatch() {
    if (typeof window === 'undefined') return;
    window.removeEventListener('webglcontextlost', onContextLost);
  }

  // --- host lifecycle -------------------------------------------------------------

  function mixerAudioOptions() {
    const mixer = typeof audioMixer === 'function' ? audioMixer() : audioMixer;
    if (mixer?.context) {
      return { context: mixer.context, destination: mixer.buses?.effects ?? null };
    }
    return {};
  }

  async function createAndBootHost() {
    if (host || booting) return;
    booting = true;
    try {
      // THE lazy boundary: the entire game (≈65k lines of TS + its CSS) loads
      // here, split into its own chunk by this dynamic import. Bystanders
      // never fetch it.
      const module = await import('../../../games/kart-royale/src/host/index.ts');
      if (attempt.disposed || attempt.cancelled) {
        return; // stale load (canceled/traveled while fetching): discard
      }
      const nextHost = module.createKartRoyaleHost({
        renderer: getRenderer(),
        viewport: () => ({
          width: typeof window !== 'undefined' ? window.innerWidth : 1280,
          height: typeof window !== 'undefined' ? window.innerHeight : 720,
        }),
        hudHost: ensureHudRoot(),
        audio: mixerAudioOptions(),
        startScreen: 'select',
        onFatal: (title, detail) => {
          pushToast(title || 'Kart Royale Stopped', String(detail || 'The game could not continue.'));
          exit('fatal');
        },
        onExitRequest: () => {
          exiting = true; // the leave below is player-intended
          exit('menu');
        },
      });
      if (attempt.disposed || attempt.cancelled) {
        nextHost.dispose();
        return;
      }
      host = nextHost;
      if (!acquireTheView()) return;
      // Boot UNDER the lease: the Theater is no longer presenting, so the
      // game's renderer mutations (state, composer, PMREM, prewarm) are
      // bracketed by the lease's snapshot/restore.
      await host.boot();
      if (attempt.disposed || attempt.cancelled) return;
      if (host.dead) {
        exit('fatal');
        return;
      }
      booted = true;
      host.beginSession();
      attachControls();
    } catch (error) {
      console.error('[KartRoyale] load/boot failed:', error);
      loadFailed = true;
      pushToast('Kart Royale Failed to Start', 'The cabinet could not load the game. Please try again.');
      exit('load-failed');
    } finally {
      booting = false;
    }
  }

  function acquireTheView() {
    if (!acquireView || viewHeld || !host) return Boolean(viewHeld);
    const result = acquireView({
      owner: attempt.token,
      generation,
      scene: host.ctx.scene,
      camera: host.ctx.camera,
      resize: (w, h) => host.resize(w, h),
      present: () => host.present(),
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
    return false;
  }

  function handleViewRelease(reason) {
    viewHeld = false;
    detachControls();
    removeContextWatch();
    document.body.classList.remove('kr-racing');
    if (host) {
      host.endSession();
      // v1: full teardown on every exit — the world is rebuilt on re-entry.
      // A warm cache is a permitted future refinement (spec: "may retain").
      host.dispose();
      host = null;
    }
    booted = false;
    removeHudRoot();
    if (reason === 'travel' || reason === 'dispose') {
      dispose();
    }
  }

  // --- frame update ------------------------------------------------------------------

  function update(time, dt) {
    if (attempt.disposed || attempt.cancelled) return;

    const p = participation();

    // Seat released while the game view is still up (server ejection,
    // disconnect): restore the social world.
    if (viewHeld && p && p.currentActivity?.id === activityDef.id && !p.isParticipating && !p.isJoining) {
      exit('seat-lost');
      return;
    }

    // Seat accepted: take the view, then boot the game under it (once).
    if (p?.isParticipating && p.currentActivity?.id === activityDef.id && !viewHeld && !booting && !host && !loadFailed) {
      void createAndBootHost();
    }

    // Before boot completes the systems are uninitialized (their GPU state
    // does not exist yet) — the lease-held empty scene plus the loading toast
    // is the presentation; present() is a safe no-op on an unbooted pipeline.
    if (!viewHeld || !host || !booted) return;

    // The game simulates from the HOST frame loop's delta; present() is
    // invoked by main.js through the lease after this update returns.
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
    if (attempt.disposed && !viewHeld) return;
    if (mine() || exiting) {
      try {
        participation()?.leave?.();
      } catch {}
    }
    exiting = false;
    if (viewHeld && releaseView) {
      releaseView(attempt.token, reason);
    } else {
      handleViewRelease(reason);
    }
  }

  function dispose() {
    if (attempt.disposed) return;
    attempt.disposed = true;
    attempt.cancelled = true;
    detachControls();
    removeContextWatch();
    removeHudRoot();
    if (viewHeld && releaseView) {
      releaseView(attempt.token, 'dispose');
    }
    if (host) {
      host.dispose();
      host = null;
    }
    booted = false;
  }

  async function beginParticipation() {
    if (attempt.disposed) return false;
    loadFailed = false;
    pushToast('Kart Royale', 'Loading the race… Press E or Esc to cancel.');
    if (!mine()) {
      participation()?.join?.(activityDef, { role: 'play' });
    }
    return true;
  }

  return {
    beginParticipation,
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
  };
}
