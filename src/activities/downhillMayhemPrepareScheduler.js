/**
 * Downhill Mayhem idle/proximity background preparation scheduler
 * (integrate-multiplayer-downhill-mayhem-arcade 7.2/7.3/7.4, Kart pattern).
 *
 * After the controller-module prefetch, continues low-priority incremental work
 * on the host frame loop budget (2 ms idle / 4 ms near the cabinet) and builds
 * one hidden, prepared game host in the shared resource cache. Hidden work is
 * wrapped in the host's graphics-job renderer transaction so the visible
 * Theater policy is restored in `finally` before any await. Cancelled/stale
 * preparation attaches to nothing and is disposed exactly once (the factory
 * disposes an aborted host; `downhillMayhemPreparation` releases a stale cache
 * handle).
 */

import { PrepReadiness } from './downhillMayhemPreparation.js';
import { createKartRoyaleProximityTracker } from './kartRoyaleProximity.js';

const HOST_MODULE_URL = '../../../games/downhill-mayhem/src/host/index.js';

/**
 * Lazy crafted-document resolver for background preparation. Lives here (not
 * in the bystander module) so the bystander keeps exactly one dynamic import
 * and passive visitors never download the baked terrain.
 */
export function resolveCraftedCourseDocument(mountain = 'classic') {
  return import('../../shared/downhill/courseDocument.js').then(
    (docs) => docs?.craftedCourseDocument?.(mountain)
      ?? docs?.craftedCourseDocument?.('classic')
      ?? null,
  );
}

export function createDownhillMayhemPrepareScheduler({
  preparation = null,
  getDistance = () => Infinity,
  shouldRun = () => true,
  isInputPending = () => false,
  createBackgroundHost = null,
  resolveCourseDocument = () => resolveCraftedCourseDocument('classic'),
  runTransaction = null,
  importModule = (url) => import(url),
} = {}) {
  const proximity = createKartRoyaleProximityTracker({ getDistance });
  let warmingEnabled = false;
  let hostModulePromise = null;
  let hostModuleLoaded = false;
  /** @type {object|null} */
  let hostModuleRef = null;
  let prepareInFlight = null;
  let abortController = null;
  let pausedReason = null;
  let disposed = false;

  function canWarm() {
    if (!preparation || !warmingEnabled || disposed) return false;
    if (pausedReason) return false;
    if (!shouldRun()) return false;
    if (isInputPending()) return false;
    const readiness = preparation.readiness;
    return readiness === PrepReadiness.prefetched
      || readiness === PrepReadiness.warming
      || readiness === PrepReadiness.ready
      || readiness === PrepReadiness.suspended;
  }

  function preparedHost() {
    const slot = preparation?.getRetainedHost?.() ?? null;
    return slot && !slot.disposed && slot.host ? slot.host : null;
  }

  function startPrepare(mod) {
    const controller = new AbortController();
    abortController = controller;

    const promise = preparation
      .prepare({
        signal: controller.signal,
        factory: async ({ signal }) => {
          const doc = typeof resolveCourseDocument === 'function'
            ? await resolveCourseDocument()
            : null;
          if (!doc || signal?.aborted || disposed) return { host: null, ready: false };

          const host = createBackgroundHost?.(mod, { signal, courseDocument: doc }) ?? null;
          if (!host) return { host: null, ready: false };

          const result = await host.prepare({ signal, runTransaction });
          if (signal?.aborted || disposed || result?.ok === false) {
            try { host.dispose(); } catch { /* best effort */ }
            return { host: null, ready: false };
          }
          return { host, ready: true };
        },
      })
      .catch(() => null);

    prepareInFlight = promise;
    promise.finally(() => {
      if (abortController === controller) abortController = null;
      if (prepareInFlight === promise) prepareInFlight = null;
    });
    return promise;
  }

  return {
    get proximity() { return proximity; },
    get hostModuleLoaded() { return hostModuleLoaded; },
    get prepared() { return preparedHost() != null; },
    get preparing() { return prepareInFlight != null; },

    enableAfterModulePrefetch() {
      warmingEnabled = true;
    },

    pause(reason = 'paused') {
      pausedReason = reason;
    },

    resume() {
      pausedReason = null;
    },

    get paused() {
      return pausedReason;
    },

    disable() {
      disposed = true;
      pausedReason = null;
      warmingEnabled = false;
      hostModulePromise = null;
      hostModuleLoaded = false;
      hostModuleRef = null;
      try { abortController?.abort(); } catch { /* best effort */ }
      abortController = null;
      prepareInFlight = null;
      proximity.reset();
    },

    reset() {
      disposed = false;
    },

    getFrameBudgetMs() {
      proximity.update();
      return canWarm() ? proximity.getFrameBudgetMs() : 0;
    },

    /**
     * @param {{ maxMs?: number, viewLeaseHeld?: boolean, framePressure?: boolean }} [opts]
     */
    tick({
      maxMs = proximity.getFrameBudgetMs(),
      viewLeaseHeld = false,
      framePressure = false,
    } = {}) {
      proximity.update();
      if (disposed) return { ran: false, reason: 'disposed', near: proximity.near };
      if (viewLeaseHeld) return { ran: false, reason: 'view-lease', near: proximity.near };
      if (framePressure) return { ran: false, reason: 'frame-pressure', near: proximity.near };
      if (!shouldRun()) return { ran: false, reason: 'place-inactive', near: proximity.near };
      if (!canWarm() || maxMs <= 0) {
        return { ran: false, reason: pausedReason ? 'paused' : 'inactive', near: proximity.near };
      }

      let ran = false;

      if (!hostModuleLoaded && !hostModulePromise) {
        hostModulePromise = importModule(HOST_MODULE_URL)
          .then((mod) => {
            hostModuleLoaded = Boolean(mod);
            hostModuleRef = mod ?? null;
            return mod;
          })
          .catch(() => {
            hostModulePromise = null;
            hostModuleRef = null;
            return null;
          });
        ran = true;
      }

      if (hostModuleLoaded && hostModuleRef && !prepareInFlight && !preparedHost()
        && typeof createBackgroundHost === 'function') {
        startPrepare(hostModuleRef);
        ran = true;
      }

      return {
        ran,
        near: proximity.near,
        hostModuleLoaded,
        prepared: preparedHost() != null,
        readiness: preparation?.readiness ?? PrepReadiness.unloaded,
        budgetMs: maxMs,
      };
    },
  };
}
