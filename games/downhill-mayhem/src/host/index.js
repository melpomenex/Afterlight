/**
 * Downhill Mayhem hosted entry point
 * (integrate-multiplayer-downhill-mayhem-arcade 5.1). `createDownhillMayhemHost`
 * composes the runtime behind the frozen host contract (see `types.js`).
 *
 * It never creates a renderer, canvas, RAF loop, socket or resize observer: the
 * Afterlight activity controller owns all of those and drives this host from its
 * own frame loop and view lease. `dispose()` is idempotent, leaves the injected
 * renderer untouched and never closes an injected AudioContext.
 */

import { createDownhillMayhemRuntime } from './runtime.js';

export { createDownhillMayhemRuntime } from './runtime.js';
export { loadCourse, generateCourseDocument } from '../game/course.js';

/**
 * @param {import('./types.js').DownhillMayhemHostOptions} options
 * @returns {Promise<import('./types.js').DownhillMayhemHost>}
 */
export async function createDownhillMayhemHost(options) {
  if (!options || !options.renderer) throw new Error('createDownhillMayhemHost requires a renderer');
  if (!options.courseDocument) throw new Error('createDownhillMayhemHost requires a courseDocument');

  let disposed = false;
  let entered = false;

  const runtime = createDownhillMayhemRuntime({
    renderer: options.renderer,
    viewport: options.viewport || null,
    hudHost: options.hudHost || null,
    audio: options.audio || null,
    params: options.params || {},
    courseDocument: options.courseDocument,
    standalone: options.standalone === true,
    streakCanvas: options.streakCanvas || null,
    authority: options.authority || (options.standalone ? 'local' : 'remote'),
    matchSeed: options.matchSeed,
    initialWorldPresentation: options.initialWorldPresentation || null,
  });

  const host = {
    ready: runtime.ready,
    runtime,
    // Diagnostics (read-only): the controller may use these to pose a lease
    // backdrop before the first presented frame.
    get scene() { return runtime.scene; },
    get camera() { return runtime.camera; },
    get riders() { return runtime.riders; },
    get phase() { return runtime.phase; },

    async prepare({ signal = null, runTransaction = null } = {}) {
      if (disposed) return { ok: false, reason: 'disposed' };
      if (signal && signal.aborted) return { ok: false, reason: 'aborted' };
      return runtime.prepare({
        signal,
        runTransaction,
        viewport: options.viewport || null,
      });
    },

    enter(sessionContext = null) {
      if (disposed) return;
      entered = true;
      if (sessionContext && sessionContext.mode) runtime.setMode(sessionContext.mode);
      if (sessionContext && sessionContext.difficulty) runtime.setDifficulty(sessionContext.difficulty);
      runtime.enter(sessionContext);
    },

    update(dt, authoritative = false) {
      if (disposed) return;
      runtime.update(dt, authoritative === true);
    },

    present() {
      if (disposed) return;
      runtime.present();
    },

    resize(width, height) {
      if (disposed) return;
      runtime.resize(width, height);
    },

    input: {
      handleKeyDown(event) { if (!disposed) runtime.input.handleKeyDown(event); },
      handleKeyUp(event) { if (!disposed) runtime.input.handleKeyUp(event); },
      neutralize() { if (!disposed) runtime.input.neutralize(); },
      /** Extra (beyond the frozen contract): sample the current control intent. */
      read(active = true) { return disposed ? null : runtime.buildHumanControls(active); },
      queue(action) { if (!disposed) runtime.queue(action); },
      pollGamepad() { if (!disposed) runtime.input.pollGamepad(); },
    },

    // Extra lifecycle helpers (beyond the frozen contract) used by the
    // standalone shell and the hosted lobby/countdown controller.
    startRace(opts) { if (!disposed) runtime.startRace(opts); },
    resetToLobby() { if (!disposed) runtime.resetToLobby(); },
    setMode(mode) { if (!disposed) runtime.setMode(mode); },
    setDifficulty(d) { if (!disposed) runtime.setDifficulty(d); },
    setAmbientProfile(profile) { if (!disposed) runtime.setAmbientProfile(profile); },
    getAmbientProfile() { return runtime.getAmbientProfile(); },
    setWorldPresentation(p) { if (!disposed) runtime.setWorldPresentation(p); },
    getWorldPresentation() { return runtime.getWorldPresentation(); },

    session: {
      acceptSnapshot(frame) { if (!disposed) runtime.applySnapshot(frame); },
      acceptEvent(frame) { if (!disposed) runtime.applyEvent(frame); },
      acceptResult(frame) { if (!disposed) runtime.applyResult(frame); },
      setMuted(muted) { if (!disposed) runtime.setMuted(!!muted); },
      requestExit(reason) {
        if (disposed) return;
        if (typeof options.onExitRequest === 'function') options.onExitRequest(reason ?? 'requested');
      },
      state() {
        return {
          phase: runtime.phase,
          mode: runtime.course && runtime.course.mountain,
          difficulty: 'mayhem',
          raceTime: runtime.raceTime,
          tick: runtime.tick,
        };
      },
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      entered = false;
      runtime.dispose();
    },
    get disposed() { return disposed; },
    get entered() { return entered; },
  };

  return host;
}
