/**
 * Composite place controller: composes a venue-specific place controller
 * (such as the Theater adapter) with the activity runtime.
 *
 * Ensures:
 *   - Both receive the activation seam ({ roomId, world, generation, def })
 *   - Deactivation is executed in order and is safe / idempotent
 *   - Venue-specific methods (onSeatChanged, openScreen) delegate cleanly
 *   - No duplicate controller registration in the places registry
 */

export function createCompositePlaceController({
  placeController = null,
  activityRuntime,
}) {
  if (!activityRuntime || typeof activityRuntime.activate !== 'function') {
    throw new Error('createCompositePlaceController requires an activityRuntime instance');
  }

  let active = false;

  return {
    get active() {
      return active;
    },

    get placeController() {
      return placeController;
    },

    get activityRuntime() {
      return activityRuntime;
    },

    activate(seam) {
      if (active) return;
      active = true;

      try {
        placeController?.activate?.(seam);
      } catch (err) {
        console.warn('[CompositeController] Error activating placeController:', err);
      }

      try {
        activityRuntime.activate(seam);
      } catch (err) {
        console.warn('[CompositeController] Error activating activityRuntime:', err);
      }
    },

    deactivate() {
      if (!active) {
        // Idempotent teardown: safe to call repeatedly
        try { activityRuntime.deactivate?.(); } catch {}
        try { placeController?.deactivate?.(); } catch {}
        return;
      }

      active = false;

      try {
        activityRuntime.deactivate?.();
      } catch (err) {
        console.warn('[CompositeController] Error deactivating activityRuntime:', err);
      }

      try {
        placeController?.deactivate?.();
      } catch (err) {
        console.warn('[CompositeController] Error deactivating placeController:', err);
      }
    },

    onSeatChanged(detail) {
      if (!active) return;
      placeController?.onSeatChanged?.(detail);
    },

    openScreen() {
      if (!active) return;
      placeController?.openScreen?.();
    },
  };
}
