/**
 * Room atmosphere state client (add-atmosphere-weather-system task 2.2,
 * design D1/D2/D3): consumes full-replacement `atmosphere_state` snapshots
 * from the EXISTING game:v1 connection with room, revision and generation
 * protection. Semantic only — the rain, sky, surfaces and audio it feeds
 * are renderer concerns (tasks 3.x/4.x).
 *
 * Contract highlights:
 *   - ONE instance registers on the shared connection (never a socket or
 *     listener per cached world); the transport's room filter
 *     (src/net/roomEpoch.js — wrong room rejected BEFORE epoch
 *     bookkeeping) runs first, and this module re-checks the activated
 *     room + place generation so only the CURRENT place can ever apply.
 *   - Ordering is the shared model's: higher epoch (a new room owner) or
 *     higher revision (same epoch) REPLACES state whole; duplicates only
 *     refresh the bounded clock; stale epoch/revision frames are
 *     discarded. An invalid/unsupported frame marks synchronization
 *     unavailable and applies NOTHING — last valid state survives whole.
 *   - Server time is anchored at frame receipt (serverNow + local
 *     monotonic clock), deliberately separate from the paused game `t`.
 *     A detected >5s discontinuity requests one fresh snapshot and
 *     suppresses shared events until resynchronization.
 *   - Resnapshot requests (`atmosphere_get`) are membership-gated by the
 *     server and locally capped at one per 5 seconds.
 *   - Disconnect keeps the last semantic state rendering benignly, cancels
 *     every pending shared one-shot and marks the state unsynchronized;
 *     reconnect requests a resnapshot so the new owner's epoch (and new
 *     event ids) install fresh. Resume from pause seeks CURRENT state and
 *     skips events that started or expired while paused — no catch-up
 *     storms.
 *   - The room's manifest atmosphere (def.atmosphere.preset) owns the
 *     presentation for the whole visit: while active, the legacy
 *     agricultural weather display must not write scene fog or the weather
 *     caption (see legacyWeatherDisplaySuppressed). Rooms whose manifest
 *     has no preset never activate — their legacy presentation stands.
 */

import {
  ATMOSPHERE_TYPE,
  compareAtmosphereFrames,
  defaultAtmosphereState,
  detectTimeDiscontinuity,
  eventPhase,
  initialWetness,
  sampleAtmosphere,
  sampleWetness,
  validateAtmosphereEnvelope,
} from '../../shared/atmosphereModel.js';
import { MSG_TYPES } from '../../shared/protocol.js';

/** Server-gated resnapshot cadence (D2): at most one `atmosphere_get` per 5s. */
export const ATMOSPHERE_RESNAPSHOT_MS = 5_000;

/** Seen shared-event ids retained per epoch (D3). */
export const ATMOSPHERE_SEEN_EVENT_CAP = 32;

/**
 * Pure presentation rule main.js applies in updateWeatherDisplay: while the
 * manifest atmosphere owns the active place, the legacy agricultural weather
 * (WEATHER_UPDATE / WELCOME weather) must not write scene fog or caption.
 */
export function legacyWeatherDisplaySuppressed(client) {
  return typeof client?.isActive === 'function' && client.isActive();
}

export function createAtmosphereStateClient({
  net,
  // Injectable monotonic clock (ms) — performance.now in the browser.
  clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
  // Injectable epoch for the requestId tag only; never used for ordering.
  requestTag = () => `atmo-${Math.random().toString(36).slice(2, 10)}`,
  resnapshotIntervalMs = ATMOSPHERE_RESNAPSHOT_MS,
  seenEventCap = ATMOSPHERE_SEEN_EVENT_CAP,
}) {
  if (!net || typeof net.on !== 'function' || typeof net.send !== 'function') {
    throw new Error('createAtmosphereStateClient requires a net facade with on/send');
  }

  // --- activation (one binding, current place generation only) ---
  let activeRoomId = null;
  let activeGeneration = null;
  let fallbackPresetId = null;
  // The place's manifest preset, kept so a local override can be released
  // back to it (Theater environment picker previewing offline).
  let declaredFallbackPresetId = null;

  // --- accepted semantic state ---
  let accepted = null; // the last VALID full frame (envelope included)
  let state = null; // accepted.state (semantic body)
  let synced = false; // false = deterministic default / unsynchronized
  let suppressEvents = false; // until the clock resynchronizes
  let pendingEvents = []; // future shared events for the current epoch
  const seenEvents = new Map(); // id -> true (insertion-ordered, capped)

  // --- server-time anchor (receipt offset; independent of paused t) ---
  let serverBase = 0;
  let localBase = clock();

  // --- resnapshot limiter ---
  let lastRequestAt = -Infinity;

  function serverNow() {
    return serverBase + (clock() - localBase);
  }

  function anchor(serverNowMs) {
    serverBase = serverNowMs;
    localBase = clock();
  }

  function markSeen(id) {
    if (seenEvents.has(id)) return;
    seenEvents.set(id, true);
    while (seenEvents.size > seenEventCap) {
      const oldest = seenEvents.keys().next().value;
      seenEvents.delete(oldest);
    }
  }

  function resetEventWindow() {
    pendingEvents = [];
    seenEvents.clear();
  }

  /**
   * Bind to the current place. `def` is the place manifest definition: its
   * atmosphere.preset is the deterministic fallback while the server has
   * not answered (unknown preset = no atmosphere, never an invented one).
   * A new activation of a DIFFERENT room invalidates the previous room's
   * state outright; re-activating the same room keeps state (travel A→A
   * after a failed build must not black out the sky).
   */
  function activate({ roomId, generation, def } = {}) {
    if (typeof roomId !== 'string' || roomId.length === 0) return;
    const preset = def?.atmosphere?.preset;
    declaredFallbackPresetId = typeof preset === 'string' ? preset : null;
    fallbackPresetId = declaredFallbackPresetId;

    if (activeRoomId !== roomId || !state) {
      // A fresh place starts from its deterministic fallback, marked
      // unsynchronized until the owner's snapshot arrives.
      accepted = null;
      state = fallbackPresetId
        ? defaultAtmosphereState(fallbackPresetId, { seed: 0, now: serverNow() }) ?? null
        : null;
      synced = false;
      resetEventWindow();
      wetness = 0;
      wetnessAt = null;
      if (state) anchor(serverNow());
    }

    activeRoomId = roomId;
    activeGeneration = generation ?? null;
    requestResnapshot('activate');
  }

  function deactivate() {
    // Travel away: stop routing entirely. Cached worlds never hold listeners;
    // the single registration lives on the shared connection and is gated by
    // this binding.
    activeRoomId = null;
    activeGeneration = null;
    accepted = null;
    state = null;
    synced = false;
    resetEventWindow();
  }

  // --- resnapshot (server answers atmosphere_state or atmosphere_unavailable) ---

  function requestResnapshot(reason = 'manual') {
    if (activeRoomId == null) return false;
    const now = clock();
    if (now - lastRequestAt < resnapshotIntervalMs) return false;
    lastRequestAt = now;
    net.send(MSG_TYPES.ATMOSPHERE_GET, { requestId: requestTag(reason).slice(0, 64) });
    return true;
  }

  // --- frame intake (registered ONCE on the shared connection) ---

  function handleState(frame) {
    // Generation routing: only the CURRENT activation applies, so frames
    // processed late (queued in the shared socket's path across travel)
    // can never alter the new place — the binding was replaced wholesale.
    if (activeRoomId == null) return;
    if (frame?.roomId !== activeRoomId) return;

    // Whole-rejection validation (D2): malformed/unsupported frames mark
    // the synchronization unavailable and change NOTHING.
    const verdict = validateAtmosphereEnvelope(frame);
    if (!verdict.ok) {
      synced = false;
      return;
    }

    const next = verdict.value;

    // Ordering (D2). The transport already dropped wrong-room and stale
    // epoch frames for the desired room; this is the atmosphere-specific
    // epoch/revision discipline.
    const relation = compareAtmosphereFrames(accepted, next);
    if (relation === 'stale-epoch' || relation === 'stale-revision') return;

    if (relation === 'duplicate') {
      // No-op apart from the bounded clock refresh: same state, same event
      // ids, so nothing one-shot can replay.
      anchor(next.serverNow);
      return;
    }

    // Clock discontinuity (D3): a >5s jump against our previous anchor
    // asks for one fresh snapshot and holds shared events until the
    // resnapshot resynchronizes us (its reply clears the suppression).
    const discontinuous = accepted != null && detectTimeDiscontinuity(serverNow(), next.serverNow);
    if (discontinuous) {
      resetEventWindow();
      requestResnapshot('clock-jump');
    }
    suppressEvents = discontinuous;

    const isFullReplacement = relation === 'new-epoch';
    accepted = next;
    state = next.state;
    synced = true;
    anchor(next.serverNow);

    if (isFullReplacement) {
      // A new room owner: local event dedup and transition state reset (D2).
      resetEventWindow();
    }

    // Schedule the snapshot's shared events under their stable ids:
    //   - already-seen ids never reschedule (duplicate defense, D3);
    //   - on a full replacement (first join / new owner) an event already
    //     started is skipped ENTIRELY, including its delayed thunder;
    //   - on a revision replacement, still-live events (within the 250ms
    //     tolerance) stay consumable with their remaining envelope; the
    //     phase check at consumption drops anything older.
    const nowMs = serverNow();
    pendingEvents = state.events.filter((event) => {
      if (seenEvents.has(event.id)) return false;
      if (isFullReplacement && event.at < nowMs) return false;
      return true;
    });
  }

  function handleUnavailable(msg) {
    if (activeRoomId == null) return;
    if (msg?.roomId && msg.roomId !== activeRoomId) return;
    // Unknown / unsupported room: the room truthfully has no atmosphere.
    // The manifest fallback (if any) keeps rendering, marked unsynchronized.
    synced = false;
  }

  // --- lifecycle of the shared connection ---

  net.on(MSG_TYPES.ATMOSPHERE_STATE, handleState);
  net.on(MSG_TYPES.ATMOSPHERE_UNAVAILABLE, handleUnavailable);

  net.onDisconnect?.(() => {
    // Benign local rendering continues from the last semantic state; shared
    // one-shots are canceled and the state is marked unsynchronized (D2).
    synced = false;
    suppressEvents = false;
    resetEventWindow();
  });

  net.onConnect?.(() => {
    // Reconnect: the desiredRoom replay re-joins the room; a fresh snapshot
    // (possibly a NEW owner epoch) must install before events flow again.
    requestResnapshot('reconnect');
  });

  // --- pause / resume (settings): server time continues, sampling doesn't ---

  function resume() {
    // Seek CURRENT state: drop events that started or expired while paused
    // so resuming neither replays nor bursts them (D3 "skips expired
    // events"); still-future events keep their shared ids.
    const nowMs = serverNow();
    pendingEvents = pendingEvents.filter((event) => event.at > nowMs);
  }

  // --- sampling (hot path; writes into the retained out) ---

  let wetness = 0;
  let wetnessAt = null;

  /**
   * Sample the semantic atmosphere at the anchored server time. `out` is
   * retained by the caller and filled in place (no per-frame allocation):
   * { intensity, windX, windZ, rain, cloud, wetnessTarget, wetness,
   *   timePhase, transitionU, synced, active, serverNow }.
   */
  function sample(out = {}) {
    const nowMs = serverNow();
    if (!state) {
      out.intensity = 0;
      out.windX = 0;
      out.windZ = 0;
      out.rain = 0;
      out.cloud = 0;
      out.wetnessTarget = 0;
      out.wetness = wetness;
      out.timePhase = 0;
      out.transitionU = null;
      out.synced = false;
      out.active = false;
      out.serverNow = nowMs;
      return out;
    }

    sampleAtmosphere(state, nowMs, out);

    // Analytic wetness approach from the previous sample (D3). The baseline
    // is derived from the preset/schedule history — never from local entry
    // time — so a late joiner of fixed rain arrives already wet.
    if (wetnessAt == null) {
      wetness = initialWetness(state, nowMs);
    } else {
      wetness = sampleWetness(wetness, out.wetnessTarget, nowMs - wetnessAt);
    }
    wetnessAt = nowMs;
    out.wetness = wetness;

    out.synced = synced;
    out.active = true;
    out.serverNow = nowMs;
    return out;
  }

  // --- shared events (pull-based: the frame loop owns the only schedule) ---

  /**
   * Events whose shared start time has arrived, classified against the
   * 250ms late tolerance: `[{ event, progress }]`. Already-started events
   * beyond the tolerance are dropped silently (never replayed, no thunder);
   * future events stay pending. Returns [] while suppressed or disconnected.
   */
  function consumeDueEvents() {
    if (suppressEvents || activeRoomId == null) return [];
    const nowMs = serverNow();
    const due = [];
    pendingEvents = pendingEvents.filter((event) => {
      const phase = eventPhase(event, nowMs);
      if (phase.state === 'pending') return true;
      if (phase.state === 'live') {
        markSeen(event.id);
        due.push({ event, progress: phase.progress });
        return false;
      }
      return false; // expired: skipped entirely, including delayed thunder
    });
    return due;
  }

  /** Observed shared-event ids for the current epoch (duplicate defense). */
  function hasSeenEvent(id) {
    return seenEvents.has(id);
  }

  /** True while the activated place's atmosphere owns the presentation. */
  function isActive() {
    return activeRoomId != null && state != null;
  }

  function status() {
    if (activeRoomId == null) return 'inactive';
    if (!state) return 'unsupported';
    return synced ? 'synchronized' : 'unsynchronized';
  }

  function getState() {
    return state;
  }

  /**
   * Local environment preview: while no authoritative snapshot has been
   * accepted, render the chosen preset's deterministic defaults instead of
   * the manifest fallback. Passing null restores the manifest preset. No
   * effect once synced — the room's state always wins.
   */
  function setLocalFallback(presetId) {
    fallbackPresetId = (typeof presetId === 'string' && presetId.length > 0)
      ? presetId
      : declaredFallbackPresetId;
    if (!synced && fallbackPresetId) {
      state = defaultAtmosphereState(fallbackPresetId, { seed: 0, now: serverNow() }) ?? state;
    }
    return fallbackPresetId;
  }

  return {
    activate,
    deactivate,
    sample,
    consumeDueEvents,
    hasSeenEvent,
    requestResnapshot,
    resume,
    isActive,
    status,
    getState,
    setLocalFallback,
    // True only once a room-authoritative snapshot was accepted; false while
    // rendering the deterministic manifest fallback.
    isSynced: () => synced,
    serverNow,
  };
}
