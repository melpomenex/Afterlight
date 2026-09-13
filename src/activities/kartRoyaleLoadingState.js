/**
 * Pure Kart Royale entry-loading state (add-kart-royale-loading-indicator).
 *
 * A cold entry boots the race for tens of seconds while the world stays
 * presentable, so the bystander module shows a persistent loading card and a
 * booting cabinet paint. This module owns the decision logic only — no DOM,
 * no canvas, no timers. The caller supplies the clock (`snapshot(nowMs)`),
 * which keeps the session deterministic in Node tests.
 *
 * Honesty contract: phases map to the real boot choreography and only move
 * forward; there is no completion percentage and no promised finish time.
 * Visibility is gated behind a short delay so retained-host fast re-entry
 * never flashes a card that would vanish moments later.
 */

/** Boot phases in the order the controller actually performs them. */
export const KART_LOADING_PHASES = Object.freeze(['modules', 'host', 'graphics', 'grid']);

/** Player-facing phase copy. Never implementation terminology. */
export const KART_LOADING_PHASE_LABELS = Object.freeze({
  modules: 'Loading the game…',
  host: 'Preparing the race…',
  graphics: 'Warming up the graphics…',
  grid: 'Preparing the grid…',
});

/** A retained host presents almost instantly; below this the card never shows. */
export const KART_LOADING_SHOW_DELAY_MS = 500;

function phaseRank(phase) {
  const idx = KART_LOADING_PHASES.indexOf(phase);
  return idx;
}

/**
 * An ordered loading session for one entry attempt.
 * begin() → setPhase()* → finish(); reuse requires a new begin().
 */
export function createKartLoadingSession({ showDelayMs = KART_LOADING_SHOW_DELAY_MS } = {}) {
  let active = false;
  let startMs = 0;
  let phase = KART_LOADING_PHASES[0];

  return {
    get active() {
      return active;
    },

    get phase() {
      return phase;
    },

    begin(nowMs = 0) {
      if (active) return;
      active = true;
      startMs = nowMs;
      phase = KART_LOADING_PHASES[0];
    },

    /** Forward-only: equal or earlier phases are ignored, unknown phases never land. */
    setPhase(next) {
      if (!active) return false;
      const from = phaseRank(phase);
      const to = phaseRank(next);
      if (to < 0 || to <= from) return false;
      phase = next;
      return true;
    },

    finish() {
      active = false;
    },

    /**
     * The bounded render state at `nowMs`. `visible` enforces the show delay:
     * a session that finishes under it never becomes visible at all.
     */
    snapshot(nowMs = 0) {
      const elapsedMs = active ? Math.max(0, nowMs - startMs) : 0;
      const visible = active && elapsedMs >= showDelayMs;
      const currentRank = phaseRank(phase);
      return {
        active,
        visible,
        phase,
        phaseLabel: KART_LOADING_PHASE_LABELS[phase],
        elapsedMs,
        elapsedLabel: formatKartElapsed(elapsedMs),
        phases: KART_LOADING_PHASES.map((key, rank) => ({
          key,
          label: KART_LOADING_PHASE_LABELS[key],
          state: rank < currentRank ? 'done' : rank === currentRank ? 'current' : 'pending',
        })),
      };
    },
  };
}

/** Compact m:ss elapsed readout ("0:07", "1:23"). */
export function formatKartElapsed(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Cabinet screen precedence (design D5): a visible local boot wins over the
 * occupancy display — the seated player being admitted already flips the
 * display state to "occupied", which would otherwise read as RACING while
 * the game is still loading.
 */
export function resolveKartScreenPaint({ loadingVisible = false, displayStatus = 'idle' } = {}) {
  if (loadingVisible) return 'booting';
  return displayStatus === 'occupied' ? 'occupied' : 'idle';
}
