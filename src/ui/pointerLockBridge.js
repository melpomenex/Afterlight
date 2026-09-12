/**
 * Pointer-lock integration contract (add-floating-minigame-media D6).
 *
 * No shipped activity uses pointer lock today. This bridge defines the
 * FUTURE contract so a game can opt in without the floating system ever
 * fighting it:
 *
 *   - Automatic presentation changes (game entry, hide/restore, enlarge,
 *     resize, source changes) NEVER request or release pointer lock.
 *   - Only an explicit canvas action requests lock; `requestFromGesture()`
 *     must be called inside a real user gesture (a canvas pointerdown).
 *   - The browser's own unlock gesture (usually Escape) releases lock; the
 *     same Escape must not also leave the activity. `consumeUnlockEscape()`
 *     lets the activity input hierarchy skip that one key.
 *   - A locked user unlocks normally, interacts with the media chrome, and
 *     clicks the canvas again to reacquire; nothing is automatic.
 */

export function createPointerLockBridge({
  document: doc = typeof document !== 'undefined' ? document : null,
  getCanvas = null,
  onChange = null,
  unlockEscapeWindowMs = 350,
  now = () => Date.now(),
} = {}) {
  if (!doc) throw new Error('pointer lock bridge requires a document');
  const canvas = () => (typeof getCanvas === 'function' ? getCanvas() : null);
  let unlockedAt = 0;
  let lastError = null;
  let wasLocked = false;

  const isLocked = () => !!doc.pointerLockElement && doc.pointerLockElement === canvas();

  const handleChange = () => {
    const locked = isLocked();
    if (wasLocked && !locked) unlockedAt = now();
    wasLocked = locked;
    try {
      onChange?.(locked);
    } catch (err) {
      console.warn('[PointerLock] change handler failed:', err);
    }
  };

  const handleError = () => {
    lastError = 'pointerlockerror';
  };

  doc.addEventListener?.('pointerlockchange', handleChange);
  doc.addEventListener?.('pointerlockerror', handleError);

  return {
    get locked() {
      return isLocked();
    },
    get supported() {
      return typeof canvas()?.requestPointerLock === 'function';
    },
    get lastError() {
      return lastError;
    },

    /**
     * Explicit reacquire, only valid from a user gesture (call it in a
     * canvas pointerdown/click handler). Never called automatically.
     */
    requestFromGesture() {
      const element = canvas();
      if (typeof element?.requestPointerLock !== 'function') {
        return { ok: false, reason: 'unsupported' };
      }
      try {
        const result = element.requestPointerLock();
        if (result && typeof result.catch === 'function') {
          result.catch((err) => {
            lastError = err?.name || 'denied';
          });
        }
        return { ok: true };
      } catch (err) {
        lastError = err?.name || 'denied';
        return { ok: false, reason: lastError };
      }
    },

    /**
     * Exit lock. Only a deliberate game/host action (or the browser's own
     * gesture) should call this; automatic presentation changes must not.
     */
    exit() {
      try {
        doc.exitPointerLock?.();
        return true;
      } catch {
        return false;
      }
    },

    /**
     * Whether an Escape event is the browser's unlock gesture rather than a
     * gameplay/menu Escape. Consumes the flag so one unlock never triggers a
     * second action (leaving the game or opening settings).
     */
    consumeUnlockEscape(nowMs = now()) {
      if (!unlockedAt) return false;
      if (nowMs - unlockedAt > unlockEscapeWindowMs) return false;
      unlockedAt = 0;
      return true;
    },

    /**
     * Documentation hook: automatic presentation changes call this (or do
     * nothing) and it MUST stay a no-op. It exists so tests can prove the
     * floating system never requests or releases lock on its own.
     */
    noteAutomaticPresentationChange() {
      return { locked: isLocked() };
    },

    destroy() {
      doc.removeEventListener?.('pointerlockchange', handleChange);
      doc.removeEventListener?.('pointerlockerror', handleError);
    },
  };
}
