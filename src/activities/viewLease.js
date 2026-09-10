/**
 * Activity view lease (add-multiplayer-snowboard-arcade 6.1, design D1).
 *
 * The ONE renderer/render-pass/frame-loop stay host-owned; a 3D activity
 * (Summit Run) borrows the render pass's SCENE and the ACTIVE CAMERA
 * together through this lease. Guarantees:
 *   - `acquireView` rejects a second owner or a stale generation (travel
 *     supersedes everything);
 *   - `lease.release(reason)` is idempotent and only its owner can release;
 *   - the host resolves renderPass.scene + activeCamera from the lease each
 *     frame and restores the social presentation on release (camera
 *     preference and first-person player visibility ride the existing
 *     camera seam — the lease never mutates it).
 *
 * Pure state machine: the host supplies setters; nothing here touches
 * Three.js.
 */

export function createActivityViewLease({
  generation = () => 0,
  apply = () => {},
  restore = () => {},
  onRelease = null,
  now = () => 0,
} = {}) {
  let lease = null; // { owner, generation: g, scene, camera, resize, onRelease, acquiredAt }
  let released = null; // tombstone of the last released lease { owner, reason, at }

  return {
    /**
     * Borrow the render view. Returns `{ ok, lease }` or
     * `{ ok: false, reason }` with 'stale_generation' | 'already_owned'.
     *
     * `present` (integrate-kart-royale-arcade D3): optional presenter for an
     * activity whose rendering cannot go through the host composer — e.g. a
     * game with its own `postprocessing`-package effect chain. While the lease
     * is held the host frame loop calls `lease.present()` instead of its own
     * composer. Omitted by every existing lessee (Summit Run renders through
     * the host composer's swapped render pass).
     */
    acquireView({
      owner,
      generation: requestedGeneration,
      scene,
      camera,
      resize = null,
      onRelease: releaseHook = null,
      present = null,
      toneMappingExposure = null,
    }) {
      if (lease) return { ok: false, reason: 'already_owned', owner: lease.owner };
      if (typeof requestedGeneration === 'number' && requestedGeneration < generation()) {
        return { ok: false, reason: 'stale_generation' };
      }

      lease = {
        owner,
        generation: requestedGeneration,
        scene,
        camera,
        resize,
        onRelease: releaseHook,
        present: typeof present === 'function' ? present : null,
        toneMappingExposure,
        acquiredAt: now(),
      };

      // The full lease request (including `resize`) is forwarded: the host
      // sizes a freshly borrowed camera to the CURRENT window immediately —
      // scenes construct with a placeholder aspect and a portrait window
      // would otherwise render squeezed until the next window resize.
      apply({ scene, camera, owner, resize, onRelease: releaseHook, present: lease.present, toneMappingExposure });
      return { ok: true, lease: this.lease };
    },

    get lease() {
      return lease ? { ...lease } : null;
    },

    get held() {
      return lease !== null;
    },

    get owner() {
      return lease?.owner ?? null;
    },

    /** Release only by the owning activity; idempotent; hooks run once. */
    release(owner, reason = 'exit') {
      if (!lease || lease.owner !== owner) return { released: false, reason: 'not_owner' };

      const hook = lease.onRelease;
      lease = null;
      released = { owner, reason, at: now() };

      restore({ owner, reason });
      if (hook) {
        try {
          hook(reason);
        } catch (error) {
          console.warn('[ActivityViewLease] onRelease hook failed:', error);
        }
      }
      if (onRelease) {
        try {
          onRelease({ owner, reason });
        } catch (error) {
          console.warn('[ActivityViewLease] release callback failed:', error);
        }
      }
      return { released: true, reason };
    },

    /** Force-release regardless of owner (travel, disposal, host teardown). */
    revoke(reason = 'revoked') {
      if (!lease) return { released: false, reason: 'not_held' };
      return this.release(lease.owner, reason);
    },

    lastReleased() {
      return released ? { ...released } : null;
    },
  };
}
