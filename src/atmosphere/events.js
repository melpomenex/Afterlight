/**
 * Shared lightning and event envelopes (add-atmosphere-weather-system task
 * 4.2, design D3/D4). This module is the CLIENT half of the shared event
 * contract: it pulls due events from the atmosphere state client
 * (`consumeDueEvents()` — there is deliberately NO second local scheduler)
 * and turns them into bounded local envelopes.
 *
 * Hard bounds enforced here:
 *   - ONE pooled active visual envelope: a new lightning replaces whatever
     envelope was active, never accumulates scene objects;
 *   - at most 32 seen event ids for the CURRENT epoch (ids are
 *     `epoch:revision:slot` — an epoch change clears the set);
 *   - lightning is a SINGLE smooth pulse of at most 800ms — the shape is
 *     sin(pi * progress), which starts and ends at zero and can never
 *     strobe. The HUD flash layer is never touched;
 *   - thunder is distance-delayed (distance/343 m/s clamped 0.5–4s) and
 *     routed through the environment audio handle, which returns a
 *     cancellable handle — travel, disconnect and mute cancel every
 *     scheduled thunder;
 *   - meteors are recorded and deduplicated only: the handler slot is
 *     prepared and owned by the desert-place change (D).
 *
 * Flash comfort (D8, task 4.3 supplies the preference): 'reduced' halves
 * the pulse amplitude; 'off' renders no flash at all but still permits the
 * optional thunder. Consumers map the pulse to at most FLASH_EXPOSURE_ADD
 * tone-mapping exposure and FLASH_SUN_ADD directional intensity — the
 * envelope itself stays dimensionless so the ceilings live in one place.
 */

import { thunderDelayMs } from '../../shared/atmosphereModel.js';

/** Seen-id cap for the current epoch (D3). */
export const EVENT_SEEN_CAP = 32;

/** A single smooth pulse, never a multi-strobe (D3). */
export const LIGHTNING_PULSE_MAX_MS = 800;

/** Consumer ceilings for a full-amplitude (normal tier) pulse (D8). */
export const FLASH_EXPOSURE_ADD = 0.2;
export const FLASH_SUN_ADD = 0.2;

/** Reduced flashes keep the event readable but half amplitude (D8). */
export const FLASH_REDUCED_SCALE = 0.5;

export const FLASH_MODES = Object.freeze(['reduced', 'off']);

/** The epoch part of a stable `epoch:revision:slot` id, or null. */
export function eventEpochOf(id) {
  const str = typeof id === 'string' ? id : '';
  const sep = str.indexOf(':');
  if (sep <= 0) return null;
  const epoch = Number(str.slice(0, sep));
  return Number.isSafeInteger(epoch) && epoch >= 0 ? epoch : null;
}

export function createAtmosphereEvents({
  stateClient,
  clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
  // { thunder({ delayMs, intensity }) -> { cancel() } | null } — the 4.1
  // environment audio. Absent audio means silent flashes, never a crash.
  audio = null,
  // () => {x, z} or {x, y, z} — the sampled listener for thunder distance.
  listenerPosition = null,
  flashMode = 'reduced',
  seenCap = EVENT_SEEN_CAP,
  thunderDelay = thunderDelayMs,
} = {}) {
  if (!stateClient || typeof stateClient.consumeDueEvents !== 'function') {
    throw new Error('createAtmosphereEvents requires the atmosphere state client');
  }

  let mode = FLASH_MODES.includes(flashMode) ? flashMode : 'reduced';
  let seenEpoch = null;
  const seenIds = new Set();
  const thunderHandles = new Set();

  // The ONE pooled active visual envelope (retained record, no scene churn).
  let pulse = null; // { id, start, duration, intensity }
  const pulseOut = { active: false, kind: null, id: null, progress: 0, amplitude: 0, exposureAdd: 0, sunAdd: 0 };

  const stats = { consumed: 0, deduped: 0, lightning: 0, meteors: 0, thunderScheduled: 0, replaced: 0 };

  function markSeen(id) {
    const epoch = eventEpochOf(id);
    if (epoch !== seenEpoch) {
      seenEpoch = epoch;
      seenIds.clear();
    }
    if (seenIds.has(id)) return false;
    seenIds.add(id);
    while (seenIds.size > seenCap) {
      // Set iteration is insertion-ordered: drop the oldest id.
      seenIds.delete(seenIds.values().next().value);
    }
    return true;
  }

  function endPulse() {
    pulse = null;
  }

  function scheduleThunder(event, startedAtServerMs) {
    if (!audio || typeof audio.thunder !== 'function') return;
    const listener = typeof listenerPosition === 'function' ? listenerPosition() : null;
    let delay = thunderDelay(0);
    if (listener && Array.isArray(event.origin)) {
      const dx = (event.origin[0] ?? 0) - (listener.x ?? 0);
      const dy = (event.origin[1] ?? 0) - (listener.y ?? 0);
      const dz = (event.origin[2] ?? 0) - (listener.z ?? 0);
      delay = thunderDelay(Math.hypot(dx, dy, dz));
    }
    // An event delivered live (progress > 0) has already spent part of its
    // thunder wait on the way here; only the remainder is scheduled.
    const elapsed = Math.max(0, (clock() - startedAtServerMs));
    const remaining = Math.max(0, delay - elapsed);
    const handle = audio.thunder({ delayMs: remaining, intensity: event.intensity ?? 0.6 });
    if (handle) {
      thunderHandles.add(handle);
      stats.thunderScheduled += 1;
    }
  }

  function dispatchLightning(event, progress) {
    stats.lightning += 1;
    const startedAt = clock() - progress * event.durationMs;
    scheduleThunder(event, startedAt);
    if (mode === 'off') {
      // No flash at all; the optional thunder above still plays (D8).
      endPulse();
      return;
    }
    if (pulse) stats.replaced += 1; // one pooled slot: the newer strike wins
    pulse = {
      id: event.id,
      start: startedAt,
      duration: Math.min(event.durationMs, LIGHTNING_PULSE_MAX_MS),
      intensity: Math.min(1, Math.max(0, event.intensity ?? 0.5)),
    };
  }

  /**
   * Consume due shared events. Call once per frame from the EXISTING game
   * loop; while paused nobody calls it, so expired events are skipped by the
   * state client's resume() and never replay.
   */
  function update() {
    const due = stateClient.consumeDueEvents();
    for (const { event, progress } of due) {
      stats.consumed += 1;
      if (!markSeen(event.id)) {
        stats.deduped += 1;
        continue;
      }
      if (event.kind === 'lightning') dispatchLightning(event, Math.min(1, Math.max(0, progress ?? 0)));
      else if (event.kind === 'meteor') stats.meteors += 1; // slot prepared; D owns the visual
    }
  }

  /**
   * The current flash envelope, written into the retained `out`:
   * { active, kind, id, progress, amplitude, exposureAdd, sunAdd }.
   * amplitude = intensity * sin(pi * progress) * modeScale — a single
   * smooth bounded pulse. Consumers add exposureAdd to the tone-mapping
   * exposure and sunAdd (a fraction of current intensity) to the sun; both
   * are zero at the envelope ends, so the atmosphere controller's own
   * per-frame write restores the exact presentation afterwards.
   */
  function getPulse(out = pulseOut) {
    if (!pulse) {
      out.active = false;
      out.kind = null;
      out.id = null;
      out.progress = 0;
      out.amplitude = 0;
      out.exposureAdd = 0;
      out.sunAdd = 0;
      return out;
    }
    const progress = (clock() - pulse.start) / pulse.duration;
    if (progress >= 1) {
      endPulse();
      return getPulse(out);
    }
    const shape = Math.sin(Math.PI * Math.min(1, Math.max(0, progress)));
    const scale = mode === 'off' ? 0 : FLASH_REDUCED_SCALE;
    out.active = true;
    out.kind = 'lightning';
    out.id = pulse.id;
    out.progress = progress;
    out.amplitude = pulse.intensity * shape * scale;
    out.exposureAdd = out.amplitude * FLASH_EXPOSURE_ADD;
    out.sunAdd = out.amplitude * FLASH_SUN_ADD;
    return out;
  }

  /** Comfort preference (task 4.3). Switching to 'off' ends any live flash. */
  function setFlashMode(next) {
    if (!FLASH_MODES.includes(next) || next === mode) return false;
    mode = next;
    if (mode === 'off') endPulse();
    return true;
  }

  /**
   * Cancel every local handle: scheduled thunder and any live pulse. Wired
   * to place exit, disconnect and mute — and to resume-from-pause/visibility
   * returns (resync), where thunder scheduled against the old clock is no
   * longer trustworthy. Seen ids are KEPT: a resnapshot must not replay.
   */
  function cancelAll() {
    for (const handle of thunderHandles) {
      try { handle.cancel(); } catch { /* a stale handle must never throw */ }
    }
    thunderHandles.clear();
    endPulse();
  }

  /** Clock-discontinuity path: drop clock-dependent handles, keep dedup. */
  function resync() {
    cancelAll();
  }

  return {
    update,
    getPulse,
    setFlashMode,
    cancelAll,
    resync,
    get flashMode() { return mode; },
    get seenCount() { return seenIds.size; },
    get stats() { return stats; },
  };
}
