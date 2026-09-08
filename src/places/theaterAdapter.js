/**
 * The specialized Theater controller: a thin lifecycle wrapper around the
 * existing TheaterScreenUI singleton. The UI object is never destroyed or
 * reconstructed — its DOM, playback engines, pending resolutions, personal
 * lists and snapshot handling all stay exactly as shipped; the adapter only
 * drives the public lifecycle methods on activate/deactivate and owns the
 * closing of the venue's own dialogs.
 *
 * Only this adapter may open cinema view, and only while it is the active
 * controller of the theater room: an external bench's seat-change
 * notification reaches a controller that is not active (or does not exist)
 * and can never invoke the cinema methods.
 */

import {
  registerPlaceController,
  unregisterPlaceController,
} from './registry.js';

export const THEATER_PLACE_ID = 'theater';

// The venue's owned dialogs. setRoomActive(false) already cancels pending
// torrent/playlist resolves and closes the playlist dialogs; the booth
// (controls), guide and torrent picker close here through their own close()
// so their existing 'close' handlers (EPG interval stop, focus return) run.
const OWNED_DIALOG_KEYS = Object.freeze([
  'controlsDialog',
  'guideDialog',
  'torrentDialog',
  'playlistDialog',
  'playlistChoiceDialog',
]);

export function createTheaterAdapter({ ui }) {
  if (!ui || typeof ui.setRoomActive !== 'function') {
    throw new Error('The theater adapter requires the TheaterScreenUI instance');
  }

  let active = false;

  function closeOwnedDialogs() {
    for (const key of OWNED_DIALOG_KEYS) {
      const dialog = ui.dom?.[key];
      if (dialog?.open) dialog.close();
    }
  }

  return {
    get active() { return active; },

    /** Entering the Orpheum: overlay on, cinema view is the default
     * presentation — Esc, movement, or the watch bar steps back out. */
    activate() {
      if (active) return;
      active = true;
      ui.setRoomActive(true);
      ui.setWatchMode(true);
    },

    /** Leaving (or re-entering) the room: seat and cinema end, the overlay
     * detaches from the projected quad, pending resolves cancel and the
     * venue's open dialogs close. Repeated teardown is safe. */
    deactivate() {
      if (!active) return;
      active = false;
      ui.setSeated(false);
      ui.setWatchMode(false);
      ui.setRoomActive(false);
      ui.updateScreenQuad(null);
      closeOwnedDialogs();
    },

    /** Seat-change notification routed from the seat controller. Ignored
     * unless this adapter is active: external benches never open cinema.
     * Sitting opens cinema view; standing reverses it (Esc, E, movement,
     * walk-click and travel all land here or in deactivate). */
    onSeatChanged({ seated } = {}) {
      if (!active) return;
      ui.setSeated(!!seated);
      ui.setWatchMode(!!seated);
    },

    /** Projection-booth delegation for the theater_screen interaction. */
    openScreen() {
      if (!active) return;
      ui.openControls();
    },
  };
}

/**
 * Register the adapter under the theater place id so the place runtime's
 * controller lookup finds it. Re-registration replaces the previous
 * adapter (isolated tests, hot reload).
 */
export function registerTheaterAdapter(adapter) {
  unregisterPlaceController(THEATER_PLACE_ID);
  return registerPlaceController(THEATER_PLACE_ID, adapter);
}
