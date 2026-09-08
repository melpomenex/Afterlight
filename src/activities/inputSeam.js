/**
 * Input ownership seam for activities.
 *
 * Implements the exclusive control, neutralization, and escape hierarchy specified in:
 *   - openspec/changes/add-place-activities-program/specs/place-activities/spec.md
 *   - openspec/changes/add-place-activities-program/design.md (D2)
 *
 * Guarantees:
 *   - Priority: focused native dialog/chat -> activity controls -> cinema -> world input
 *   - Chat/dialog focus neutralizes activity input; typing never controls activity
 *   - Window blur neutralizes activity input
 *   - Escape hierarchy: focused input blur -> open dialog -> activity leave -> seat stand -> cinema exit -> settings toggle
 *   - Jumps are neutralized while participating; Space does not trigger avatar jump
 *   - Travel during join immediately releases pending membership and resets input
 */

export const ESCAPE_TARGETS = Object.freeze({
  FOCUSED_INPUT: 'focused_input',
  OPEN_DIALOG: 'open_dialog',
  ACTIVITY: 'activity',
  SEAT: 'seat',
  CINEMA: 'cinema',
  SETTINGS: 'settings',
  NONE: 'none',
});

/**
 * Determine what action Escape should take based on the strict hierarchy.
 *
 * @param {object} context
 * @param {boolean} [context.hasOpenDialog]
 * @param {boolean} [context.hasInputFocused]
 * @param {boolean} [context.isActivityOccupied]
 * @param {boolean} [context.isSeated]
 * @param {boolean} [context.isCinemaWatching]
 * @param {boolean} [context.isPaused]
 * @returns {string} One of ESCAPE_TARGETS
 */
export function resolveEscapeAction({
  hasInputFocused = false,
  hasOpenDialog = false,
  isActivityOccupied = false,
  isSeated = false,
  isCinemaWatching = false,
  isPaused = false,
} = {}) {
  // 1. Focused input / chat field gets blurred first
  if (hasInputFocused) return ESCAPE_TARGETS.FOCUSED_INPUT;

  // 2. Open native dialog gets closed
  if (hasOpenDialog) return ESCAPE_TARGETS.OPEN_DIALOG;

  // 3. Activity mode exits locally immediately with safe dismount
  if (isActivityOccupied) return ESCAPE_TARGETS.ACTIVITY;

  // 4. Seated player stands up
  if (isSeated) return ESCAPE_TARGETS.SEAT;

  // 5. Cinema view exits
  if (isCinemaWatching) return ESCAPE_TARGETS.CINEMA;

  // 6. Otherwise toggles settings dialog (if not paused by something else)
  if (!isPaused) return ESCAPE_TARGETS.SETTINGS;

  return ESCAPE_TARGETS.NONE;
}

/**
 * Checks whether user typing should be neutralized (ignored by game/activity controls).
 *
 * @param {object} target DOM element or mock
 * @returns {boolean}
 */
export function isTypingTarget(target) {
  if (!target || typeof target !== 'object') return false;
  if (typeof target.closest === 'function') {
    return !!(target.closest('input,select,textarea,[contenteditable="true"]') || target.closest('#call-panel'));
  }
  const tag = String(target.tagName || target.nodeName || '').toLowerCase();
  return ['input', 'select', 'textarea'].includes(tag) || !!target.isContentEditable;
}

/**
 * Manages activity input buffering, sequence numbering, and neutralization.
 */
export function createActivityInputManager({
  onInput = null,
  watchdogMs = 250,
} = {}) {
  let seq = 0;
  let activeControls = {};
  let lastSampleTime = 0;
  let neutralized = false;

  return {
    get seq() { return seq; },
    get activeControls() { return { ...activeControls }; },
    get isNeutralized() { return neutralized; },

    /**
     * Submit raw controls from player input.
     * @param {object} controls e.g. { moveY: -1, fire: true }
     * @param {number} [now=Date.now()]
     */
    sampleInput(controls, now = Date.now()) {
      if (neutralized) return null;
      seq += 1;
      activeControls = { ...controls };
      lastSampleTime = now;
      onInput?.(activeControls, seq);
      return { controls: activeControls, seq };
    },

    /**
     * Neutralize all controls (e.g. on blur, chat focus, leave).
     */
    neutralize() {
      if (Object.keys(activeControls).length === 0 && neutralized) return null;
      neutralized = true;
      activeControls = {};
      seq += 1;
      onInput?.(activeControls, seq);
      return { controls: {}, seq };
    },

    /**
     * Resume accepting input (un-neutralize).
     */
    resume() {
      neutralized = false;
    },

    /**
     * Check if watchdog has expired (no fresh sample within watchdogMs).
     */
    checkWatchdog(now = Date.now()) {
      if (neutralized || Object.keys(activeControls).length === 0) return false;
      if (now - lastSampleTime > watchdogMs) {
        this.neutralize();
        return true;
      }
      return false;
    },

    /**
     * Reset sequence and active controls.
     */
    reset() {
      seq = 0;
      activeControls = {};
      lastSampleTime = 0;
      neutralized = false;
    },
  };
}
