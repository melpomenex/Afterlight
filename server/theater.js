import { applyTheaterAction, normalizeTheaterState } from '../shared/theaterModel.js';

/**
 * Server-side home of the shared Orpheum screen (mirrors GardensManager's
 * thin-manager style). Every rule — validation, limits, the shared clock —
 * lives in the shared reducer so the client and the tests run the exact
 * same code; this class only holds state and persists accepted changes.
 * The server never fetches URLs: it validates and relays them.
 */
export class TheaterManager {
  constructor(storage) {
    this.storage = storage;
    // A missing or corrupt persisted section starts an idle screen instead
    // of throwing (normalizeTheaterState repairs untrusted data).
    this.state = normalizeTheaterState(storage.getTheater?.());
  }

  /** Payload for THEATER_STATE broadcasts and the WELCOME snapshot. */
  snapshot() {
    return { now: this.state.now, queue: this.state.queue };
  }

  /**
   * Apply a validated-or-not action. Returns `{ success, reason?, report? }`;
   * accepted actions are persisted and the caller broadcasts the new
   * snapshot to the theater room, rejected ones change nothing. Batch
   * imports (`addMany`) carry the reducer's honest
   * `report: { queued, skipped, didNotFit }` for the actor.
   */
  applyAction(actor, action) {
    const { state, error, report } = applyTheaterAction(this.state, action, actor, Date.now());
    if (error) return { success: false, reason: error };
    this.state = state;
    this.storage.saveTheater(state);
    return report ? { success: true, report } : { success: true };
  }
}
