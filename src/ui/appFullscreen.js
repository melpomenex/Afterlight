/**
 * Focused application fullscreen helper (add-floating-minigame-media D6).
 *
 * Requests fullscreen on `document.documentElement` — the app root that owns
 * the canvas, the body-level floating media surface AND native dialogs — so
 * one browser fullscreen session keeps the whole game (media, controls and
 * menus) usable. Never requests on the canvas or a provider iframe: those
 * exclude the rest of the application and are explicitly outside the
 * supported combined-game mode. A denied/unsupported request leaves the
 * in-window layout untouched and reports it locally.
 */

export function createAppFullscreen({
  document: doc = typeof document !== 'undefined' ? document : null,
  getRoot = null,
  onChange = null,
} = {}) {
  if (!doc) throw new Error('app fullscreen requires a document');
  const root = () => (typeof getRoot === 'function' ? getRoot() : null) || doc.documentElement;
  let active = false;
  let lastError = null;

  const sync = () => {
    const next = !!doc.fullscreenElement;
    if (next !== active) {
      active = next;
      try {
        onChange?.(active);
      } catch (err) {
        console.warn('[AppFullscreen] change handler failed:', err);
      }
    }
    return active;
  };

  const onFullscreenError = (event) => {
    lastError = event?.error?.name || 'denied';
  };

  doc.addEventListener?.('fullscreenchange', sync);
  doc.addEventListener?.('fullscreenerror', onFullscreenError);

  return {
    get active() {
      return !!doc.fullscreenElement;
    },
    get supported() {
      return typeof root()?.requestFullscreen === 'function';
    },
    get lastError() {
      return lastError;
    },
    /** The element fullscreen is requested on: always the application root. */
    get target() {
      return root();
    },

    /** Request app-root fullscreen. Returns { ok, active, reason? }. */
    async request() {
      const element = root();
      if (typeof element?.requestFullscreen !== 'function') {
        return { ok: false, active: false, reason: 'unsupported' };
      }
      try {
        await element.requestFullscreen({ navigationUI: 'hide' });
        sync();
        return { ok: true, active: true };
      } catch (err) {
        lastError = err?.name || 'denied';
        return { ok: false, active: false, reason: lastError };
      }
    },

    /** Exit fullscreen; the in-window layout remains fully functional. */
    async exit() {
      if (typeof doc.exitFullscreen !== 'function' || !doc.fullscreenElement) {
        return { ok: true, active: false };
      }
      try {
        await doc.exitFullscreen();
        sync();
        return { ok: true, active: false };
      } catch (err) {
        lastError = err?.name || 'exit_failed';
        return { ok: false, active: !!doc.fullscreenElement, reason: lastError };
      }
    },

    async toggle() {
      return this.active ? this.exit() : this.request();
    },

    /** Resync after external changes (orientation, Esc, browser UI). */
    refresh() {
      return sync();
    },

    destroy() {
      doc.removeEventListener?.('fullscreenchange', sync);
      doc.removeEventListener?.('fullscreenerror', onFullscreenError);
    },
  };
}
