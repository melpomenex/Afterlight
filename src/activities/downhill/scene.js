/**
 * Downhill Mayhem scene adapter (integrate-multiplayer-downhill-mayhem-arcade
 * 5/6). The hosted game owns its THREE.Scene, PerspectiveCamera, terrain,
 * riders and effects (design D2/D18); this adapter is the thin seam the
 * controller uses to talk to that host runtime without ever creating a
 * renderer, canvas, RAF loop or socket of its own.
 *
 * The frozen host contract exposes `update/present/resize`; some hosts also
 * publish `scene`/`camera` (directly or on a `ctx` object) so the view lease
 * can forward them to the shared composer. When they are absent `present()`
 * does the drawing, exactly like the foreign-composer path in the lease.
 */

export function createDownhillSceneAdapter(host) {
  if (!host) return null;
  return {
    get scene() {
      return host.scene ?? host.ctx?.scene ?? null;
    },

    get camera() {
      return host.camera ?? host.ctx?.camera ?? null;
    },

    update(dt, authoritative = null) {
      host.update?.(dt, authoritative);
    },

    present() {
      host.present?.();
    },

    resize(width, height) {
      host.resize?.(width, height);
    },
  };
}
