/**
 * Idle Kart Royale module prefetch scheduling (fix-kart-royale-instant-entry 5.1).
 *
 * Import audit: `kart-royale/controller.js` evaluates with zero static imports and
 * one lazy host import; it does not inject CSS or mutate globals. The game host and
 * Three chunks load only when boot() runs, not during controller module prefetch.
 */

/**
 * @param {object} [options]
 * @param {boolean} [options.documentHidden]
 * @param {boolean} [options.saveData]
 * @param {string|null} [options.effectiveType]
 * @param {string|null} [options.roomId]
 * @param {string} [options.theaterRoomId]
 */
export function canScheduleKartRoyalePrefetch({
  documentHidden = false,
  saveData = false,
  effectiveType = null,
  roomId = null,
  theaterRoomId = 'theater',
} = {}) {
  if (roomId && roomId !== theaterRoomId) return false;
  if (documentHidden) return false;
  if (saveData) return false;
  if (effectiveType && ['slow-2g', '2g'].includes(effectiveType)) return false;
  return true;
}

/**
 * Schedule a single idle controller-module prefetch after the current frame.
 *
 * @param {object} [options]
 * @param {{ prefetch: (args?: object) => Promise<unknown> }|null} [options.preparation]
 * @param {string} [options.roomId]
 * @param {string} [options.theaterRoomId]
 * @param {typeof canScheduleKartRoyalePrefetch} [options.canPrefetch]
 * @param {() => { connection?: { saveData?: boolean, effectiveType?: string } }} [options.getNetwork]
 * @param {() => { hidden?: boolean }} [options.getDocument]
 * @param {((cb: () => void, opts?: { timeout?: number }) => number)|null} [options.requestIdle]
 * @param {((cb: () => void) => number)|null} [options.requestFrame]
 * @param {(delay: number, cb: () => void) => number} [options.setTimeoutFn]
 * @param {() => void} [options.onRun]
 */
export function scheduleKartRoyaleModulePrefetch({
  preparation = null,
  roomId = 'theater',
  theaterRoomId = 'theater',
  canPrefetch = canScheduleKartRoyalePrefetch,
  getNetwork = () => (typeof navigator !== 'undefined' ? navigator : {}),
  getDocument = () => (typeof document !== 'undefined' ? document : { hidden: false }),
  requestIdle = typeof requestIdleCallback !== 'undefined' ? requestIdleCallback : null,
  requestFrame = typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : null,
  setTimeoutFn = typeof setTimeout !== 'undefined' ? setTimeout : null,
  onRun = null,
} = {}) {
  if (!preparation || typeof preparation.prefetch !== 'function') {
    return { scheduled: false, reason: 'no_preparation' };
  }

  const readNetwork = () => {
    const nav = getNetwork();
    return nav.connection || nav.mozConnection || nav.webkitConnection;
  };

  const evaluate = () => {
    const conn = readNetwork();
    const doc = getDocument();
    return canPrefetch({
      documentHidden: Boolean(doc.hidden),
      saveData: Boolean(conn?.saveData),
      effectiveType: conn?.effectiveType ?? null,
      roomId,
      theaterRoomId,
    });
  };

  if (!evaluate()) {
    return { scheduled: false, reason: 'constraints' };
  }

  const runPrefetch = () => {
    if (!evaluate()) return;
    onRun?.();
    preparation.prefetch().catch(() => {});
  };

  const scheduleIdle = () => {
    if (requestIdle) {
      requestIdle(runPrefetch, { timeout: 5000 });
      return;
    }
    if (setTimeoutFn) {
      setTimeoutFn(runPrefetch, 2000);
    } else {
      runPrefetch();
    }
  };

  if (requestFrame) {
    requestFrame(() => {
      if (!evaluate()) return;
      scheduleIdle();
    });
  } else {
    scheduleIdle();
  }

  return { scheduled: true };
}
