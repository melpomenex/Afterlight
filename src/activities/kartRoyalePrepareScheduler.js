/**
 * Idle/proximity background preparation scheduler (fix-kart-royale-instant-entry 5.2).
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
 * @param {(url: string) => Promise<unknown>} [options.importModule]
 * @param {() => number} [options.now]
 */
export function createKartRoyalePrepareScheduler({
  preparation = null,
  getDistance = () => Infinity,
  shouldRun = () => true,
  isInputPending = () => false,
  importModule = (url) => import(url),
  now = () => performance.now(),
} = {}) {
  const proximity = createKartRoyaleProximityTracker({ getDistance });
  let warmingEnabled = false;
  let hostModulePromise = null;
  let hostModuleLoaded = false;

  function canWarm() {
    if (!preparation || !warmingEnabled) return false;
    if (!shouldRun()) return false;
    if (isInputPending()) return false;
    const readiness = preparation.readiness;
    return readiness === PrepReadiness.prefetched
      || readiness === PrepReadiness.warming
      || readiness === PrepReadiness.ready
      || readiness === PrepReadiness.suspended;
  }

  return {
    get proximity() {
      return proximity;
    },

    get hostModuleLoaded() {
      return hostModuleLoaded;
    },

    enableAfterModulePrefetch() {
      warmingEnabled = true;
    },

    disable() {
      warmingEnabled = false;
      hostModulePromise = null;
      hostModuleLoaded = false;
      proximity.reset();
    },

    getFrameBudgetMs() {
      proximity.update();
      return canWarm() ? proximity.getFrameBudgetMs() : 0;
    },

    /**
     * @param {{ maxMs?: number }} [opts]
     */
    tick({ maxMs = proximity.getFrameBudgetMs() } = {}) {
      proximity.update();
      if (!canWarm() || maxMs <= 0) {
        return { ran: false, reason: 'inactive' };
      }

      const deadline = now() + maxMs;
      let ran = false;

      if (!hostModuleLoaded && !hostModulePromise) {
        hostModulePromise = importModule(HOST_MODULE_URL)
          .then((mod) => {
            hostModuleLoaded = Boolean(mod);
            return mod;
          })
          .catch(() => {
            hostModulePromise = null;
            return null;
          });
        ran = true;
      }

      while (now() < deadline) {
        if (hostModulePromise && !hostModuleLoaded) {
          break;
        }
        break;
      }

      return {
        ran,
        near: proximity.near,
        hostModuleLoaded,
        readiness: preparation?.readiness ?? PrepReadiness.unloaded,
        budgetMs: maxMs,
      };
    },
  };
}
