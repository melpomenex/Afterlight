/**
 * Idle/proximity background preparation scheduler (fix-kart-royale-instant-entry 5.2/5.3).
 *
 * After controller module prefetch, continues low-priority incremental work using
 * the host frame loop budget (2 ms idle / 4 ms near the cabinet).
 */

import { PrepReadiness } from './kartRoyalePreparation.js';
import { createKartRoyaleProximityTracker } from './kartRoyaleProximity.js';

const HOST_MODULE_URL = '../../../games/kart-royale/src/host/index.ts';

/**
 * @param {object} [options]
 * @param {ReturnType<import('./kartRoyalePreparation.js').createKartRoyalePreparation>} [options.preparation]
 * @param {() => number} [options.getDistance]
 * @param {() => boolean} [options.shouldRun]
 * @param {() => boolean} [options.isInputPending]
 * @param {(mod: object) => object|null} [options.createBackgroundHost]
 * @param {(url: string) => Promise<unknown>} [options.importModule]
 * @param {() => number} [options.now]
 */
export function createKartRoyalePrepareScheduler({
  preparation = null,
  getDistance = () => Infinity,
  shouldRun = () => true,
  isInputPending = () => false,
  createBackgroundHost = null,
  importModule = (url) => import(url),
  now = () => performance.now(),
} = {}) {
  const proximity = createKartRoyaleProximityTracker({ getDistance });
  let warmingEnabled = false;
  let hostModulePromise = null;
  let hostModuleLoaded = false;
  /** @type {object|null} */
  let hostModuleRef = null;
  /** @type {{ prepareWorldSlice?: Function, isWorldPrepared?: Function, dispose?: Function }|null} */
  let backgroundHost = null;

  let pausedReason = null;

  function canWarm() {
    if (!preparation || !warmingEnabled) return false;
    if (pausedReason) return false;
    if (!shouldRun()) return false;
    if (isInputPending()) return false;
    const readiness = preparation.readiness;
    return readiness === PrepReadiness.prefetched
      || readiness === PrepReadiness.warming
      || readiness === PrepReadiness.ready
      || readiness === PrepReadiness.suspended;
  }

  function disposeBackgroundHost() {
    try {
      backgroundHost?.dispose?.();
    } catch {
      // best-effort teardown
    }
    backgroundHost = null;
  }

  return {
    get proximity() {
      return proximity;
    },

    get hostModuleLoaded() {
      return hostModuleLoaded;
    },

    get worldPrepared() {
      return backgroundHost?.isWorldPrepared?.() ?? false;
    },

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
      pausedReason = null;
      warmingEnabled = false;
      hostModulePromise = null;
      hostModuleLoaded = false;
      hostModuleRef = null;
      disposeBackgroundHost();
      proximity.reset();
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
      if (viewLeaseHeld) {
        return { ran: false, reason: 'view-lease', near: proximity.near };
      }
      if (framePressure) {
        return { ran: false, reason: 'frame-pressure', near: proximity.near };
      }
      if (!shouldRun()) {
        return { ran: false, reason: 'place-inactive', near: proximity.near };
      }
      if (!canWarm() || maxMs <= 0) {
        return { ran: false, reason: pausedReason ? 'paused' : 'inactive', near: proximity.near };
      }

      let ran = false;
      let worldSteps = 0;

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

      if (hostModuleLoaded && hostModuleRef && typeof createBackgroundHost === 'function') {
        if (!backgroundHost) {
          backgroundHost = createBackgroundHost(hostModuleRef);
        }
        if (backgroundHost && !backgroundHost.isWorldPrepared?.()) {
          const slice = backgroundHost.prepareWorldSlice(maxMs);
          worldSteps = slice?.stepsRun ?? 0;
          ran = ran || worldSteps > 0;
        }
      }

      return {
        ran,
        near: proximity.near,
        hostModuleLoaded,
        worldPrepared: backgroundHost?.isWorldPrepared?.() ?? false,
        worldSteps,
        readiness: preparation?.readiness ?? PrepReadiness.unloaded,
        budgetMs: maxMs,
      };
    },
  };
}
