/**
 * Kart cabinet proximity hysteresis (fix-kart-royale-instant-entry D3 / 5.2).
 *
 * Distances use the same x/z world frame as cabinet interaction detection.
 */

export const KART_PROXIMITY_ENTER_UNITS = 8;
export const KART_PROXIMITY_EXIT_UNITS = 10;
export const KART_PREPARE_BUDGET_IDLE_MS = 2;
export const KART_PREPARE_BUDGET_NEAR_MS = 4;

/**
 * @param {object} [options]
 * @param {() => number} [options.getDistance]
 */
export function createKartRoyaleProximityTracker({
  getDistance = () => Infinity,
} = {}) {
  let near = false;

  return {
    get near() {
      return near;
    },

    getDistance() {
      const d = getDistance();
      return Number.isFinite(d) ? d : Infinity;
    },

    getFrameBudgetMs() {
      return near ? KART_PREPARE_BUDGET_NEAR_MS : KART_PREPARE_BUDGET_IDLE_MS;
    },

    update() {
      const distance = this.getDistance();
      if (!near && distance <= KART_PROXIMITY_ENTER_UNITS) {
        near = true;
      } else if (near && distance > KART_PROXIMITY_EXIT_UNITS) {
        near = false;
      }
      return { distance, near };
    },

    reset() {
      near = false;
    },
  };
}
