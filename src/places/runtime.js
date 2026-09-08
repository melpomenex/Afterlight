/**
 * The place runtime: one tested transition coordinator around setRoom.
 *
 * It owns the prepare-before-commit travel order (design D2): resolve the
 * destination, prepare its world while the previous place stays fully
 * playable, then commit — swap groups, reset transient input, place the
 * actors, apply the destination presentation, bind the room through the
 * existing network seam and activate the place's controller with the current
 * generation. There is exactly one active runtime and no second animation
 * loop: main.js keeps its single rAF and calls the runtime from setRoom.
 *
 * Every environment touch is an injected seam (build, resetInput,
 * placeActors, bindNetwork, present, controllerFor, callAdapter), so
 * headless tests drive the production coordinator instead of matching
 * source strings.
 */

import {
  TRAVEL_PHASES,
  NETWORK_PHASES,
  createGenerationCounter,
  createNetworkStatus,
  isCurrentGeneration,
  nextGeneration,
  actorSpawnsFor,
  resolveRoomRequest as resolveRoom,
} from './travelState.js';

function isPromiseLike(value) {
  return !!value && typeof value.then === 'function';
}

export function createPlaceRuntime({
  // Resolve a requested room id to a travelState resolution. Receives the
  // raw requested id; defaults to a manifest lookup against `hasDefinition`.
  resolve = null,
  hasDefinition = () => false,
  theaterId,
  // Prepare the destination world (hidden, not yet committed). May return a
  // promise; must not touch the HUD, membership or group visibility.
  build,
  // Optional specialized controller lookup for the destination (the Theater
  // adapter registers itself under its place id in the places registry).
  controllerFor = null,
  // Optional P8 conferencing adapter: onPlaceLeaving(roomId) and
  // onPlaceReady({ roomId, zones, seatGroup }). Absent is a no-op; travel
  // never starts capture.
  callAdapter = null,
  // Optional seat control: standUp() ends a seated pose locally before the
  // commit (travel always spawns grounded, never stuck in a chair).
  seatControl = null,
  // Commit seams (all required except where a default is noted).
  resetInput,       // () -> void: clear nearest/keys/press/target/jump/emote/marker
  placeActors,      // (resolution, spawns) -> void: safe player/Kiln placement
  bindNetwork,      // (roomId) -> void: net.joinRoom (realtime interception preserved)
  present,          // { destination, fallback, travelError, network, arrived? }
  persistVisit = null,  // (resolution) -> void: visited/current exploration save
  clearRoster = null,   // () -> void: drop the previous room's remote players
  adoptWorld = null,    // (world, resolution) -> void: replace the game's active world/bounds
}) {
  if (typeof build !== 'function') throw new Error('createPlaceRuntime requires a build seam');
  if (typeof resetInput !== 'function') throw new Error('createPlaceRuntime requires a resetInput seam');
  if (typeof placeActors !== 'function') throw new Error('createPlaceRuntime requires a placeActors seam');
  if (typeof bindNetwork !== 'function') throw new Error('createPlaceRuntime requires a bindNetwork seam');
  if (!present || typeof present !== 'object') throw new Error('createPlaceRuntime requires a present surface');

  const resolveDestination = typeof resolve === 'function'
    ? (requested) => resolve(requested)
    : (requested) => resolveRoom(requested, hasDefinition, theaterId);

  const state = {
    activeId: null,
    activeWorld: null,
    activeResolution: null,
    activeController: null,
    generation: createGenerationCounter(),
    phase: TRAVEL_PHASES.IDLE,
    network: createNetworkStatus(null),
    lastError: null,
    buildCount: 0,
  };

  function deactivateActive() {
    // Specialized lifecycle first (Theater: close owned dialogs, cancel
    // pending resolves, drop cinema) — the adapter is idempotent, so
    // repeated teardown is safe.
    const controller = state.activeController;
    state.activeController = null;
    try {
      controller?.deactivate?.();
    } catch {
      // A failing venue controller must never block travel.
    }
    // An active call stops capturing immediately; the server-side leave is
    // asynchronous and cannot block travel (design D7). The very first
    // travel has no prior place to leave.
    try {
      if (state.activeId != null) callAdapter?.onPlaceLeaving?.(state.activeId);
    } catch { /* optional adapter failure does not prevent gameplay */ }
    // Stand the actor up locally (no-op when not seated).
    try {
      seatControl?.standUp?.();
    } catch { /* seat control stays best-effort during travel */ }
  }

  function activateController(resolution, world, generation) {
    const controller = typeof controllerFor === 'function' ? controllerFor(resolution) : null;
    state.activeController = controller ?? null;
    try {
      controller?.activate?.({ roomId: resolution.roomId, world, generation, def: resolution.def ?? null });
    } catch {
      // Controller activation failure corrupts nothing: the world stays
      // playable and membership is already committed.
      state.activeController = null;
    }
  }

  function commit(resolution, world, generation) {
    // 3. Leave the previous place cleanly (controller, call, seat).
    deactivateActive();
    if (state.activeWorld && state.activeWorld !== world) {
      state.activeWorld.group.visible = false;
    }

    // 4. Swap the active world and reset transient travel state.
    state.activeWorld = world;
    state.activeId = resolution.roomId;
    state.activeResolution = resolution;
    state.lastError = null;
    world.group.visible = true;
    adoptWorld?.(world, resolution);
    resetInput();
    placeActors(resolution, actorSpawnsFor(resolution));

    // 5. Presentation, identity/save, roster and network binding.
    present.destination?.(resolution);
    persistVisit?.(resolution);
    clearRoster?.();
    state.network = createNetworkStatus(resolution.roomId);
    state.network.phase = NETWORK_PHASES.JOINING;
    present.network?.(state.network);
    bindNetwork(resolution.roomId);

    // 6. Activate optional systems with the current generation, then
    // announce local readiness. Network acceptance arrives separately.
    activateController(resolution, world, generation);
    try {
      callAdapter?.onPlaceReady?.({
        roomId: resolution.roomId,
        zones: world.environment?.zones ?? [],
        seatGroup: null,
      });
    } catch { /* optional adapter failure does not prevent gameplay */ }
    present.arrived?.(resolution);
    state.phase = TRAVEL_PHASES.ACTIVE;
  }

  function handleBuildError(resolution, error, generation) {
    if (!isCurrentGeneration(state.generation, generation)) {
      return { status: 'stale', generation };
    }
    // Preparation failed: the previous place keeps the screen, membership
    // and HUD; the error is surfaced as a retryable travel failure.
    state.phase = TRAVEL_PHASES.FAILED;
    state.lastError = error;
    present.travelError?.(resolution, error);
    return { status: 'build-failed', roomId: state.activeId, requested: resolution.requested, error };
  }

  function completePreparation(resolution, world, generation) {
    if (!isCurrentGeneration(state.generation, generation)) {
      // A newer travel superseded this attempt: the stale world stays
      // cached and hidden, and nothing it did may touch audio, media, HUD
      // or the active place.
      return { status: 'stale', generation };
    }
    if (!world || !world.group) {
      return handleBuildError(resolution, new Error(`Destination "${resolution.requested ?? resolution.roomId}" could not be prepared.`), generation);
    }
    // An unknown deep link visibly falls back: explain it before the
    // Theater commit so the announcement and the rendered place agree.
    if (resolution.fallback) present.fallback?.(resolution);
    commit(resolution, world, generation);
    return {
      status: resolution.fallback ? 'fallback' : 'ok',
      roomId: resolution.roomId,
      requested: resolution.requested,
      resolution,
    };
  }

  return {
    /** Full prepare-before-commit transition. Safe to call re-entrantly; the
     * newest attempt always wins and stale asynchronous builds are ignored. */
    travel(requested) {
      const resolution = resolveDestination(requested);
      const generation = nextGeneration(state.generation);

      let prepared;
      try {
        state.phase = TRAVEL_PHASES.PREPARING;
        prepared = build(resolution);
        state.buildCount += 1;
      } catch (error) {
        return handleBuildError(resolution, error, generation);
      }

      if (isPromiseLike(prepared)) {
        return prepared.then(
          (world) => completePreparation(resolution, world, generation),
          (error) => handleBuildError(resolution, error, generation),
        );
      }
      return completePreparation(resolution, prepared, generation);
    },

    /** Server acceptance evidence for the active room (WELCOME). */
    markNetworkOnline() {
      const status = state.network;
      const next = { phase: NETWORK_PHASES.ONLINE, roomId: state.activeId };
      const changed = status.phase !== next.phase || status.roomId !== next.roomId;
      state.network = next;
      if (changed) present.network?.(next);
      return next;
    },

    /** The socket dropped or the join was not accepted: the destination
     * keeps rendering locally, shared actions are unavailable. */
    markNetworkOffline() {
      const status = state.network;
      if (status.phase === NETWORK_PHASES.OFFLINE) return status;
      state.network = { phase: NETWORK_PHASES.OFFLINE, roomId: state.activeId };
      present.network?.(state.network);
      return state.network;
    },

    /** Retry membership for the current place without rebuilding anything. */
    retry() {
      if (!state.activeId) return state.network;
      state.network = { phase: NETWORK_PHASES.JOINING, roomId: state.activeId };
      present.network?.(state.network);
      bindNetwork(state.activeId);
      return state.network;
    },

    /** Seat-change notification surface: routed to the active controller
     * only, so a bench outside a venue can never open its cinema view. */
    notifySeatChanged(detail) {
      try {
        state.activeController?.onSeatChanged?.(detail);
      } catch { /* seat presentation stays best-effort */ }
    },

    /** Observation surface for tests and HUD: never a second authority. */
    snapshot() {
      return {
        activeId: state.activeId,
        activeWorld: state.activeWorld,
        activeController: state.activeController,
        resolution: state.activeResolution,
        generation: state.generation.value,
        phase: state.phase,
        network: { ...state.network },
        lastError: state.lastError,
        buildCount: state.buildCount,
      };
    },
  };
}
