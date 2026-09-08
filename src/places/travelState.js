/**
 * Pure travel-transition state for the place runtime: destination
 * resolution, typed world-update inputs, transient input resets,
 * activation generations and network phase bookkeeping.
 *
 * Everything here is plain data and free of Three.js and DOM imports so
 * headless tests can drive the exact transition rules the game runs. The
 * runtime (src/places/runtime.js) applies these helpers against injected
 * seams; main.js keeps renderer, actors and UI orchestration.
 */

import { ROOMS } from '../../shared/protocol.js';

// Local travel phases: preparing covers "destination chosen, world not yet
// committed"; active means the destination owns the screen; failed marks a
// preparation error while the previous place stays playable.
export const TRAVEL_PHASES = Object.freeze({
  IDLE: 'idle',
  PREPARING: 'preparing',
  ACTIVE: 'active',
  FAILED: 'failed',
});

// Network phases are deliberately separate from local readiness: a place is
// locally ready the moment its world is committed, but shared actions wait
// for server acceptance evidence (WELCOME) and render offline when the
// socket is down.
export const NETWORK_PHASES = Object.freeze({
  OFFLINE: 'offline',
  JOINING: 'joining',
  ONLINE: 'online',
});

/**
 * Resolve a requested room id against the known destinations.
 * - Absent/empty request stays the default place (The Orpheum).
 * - Market and personal gardens keep their existing adapters.
 * - A known public place definition resolves to itself.
 * - Anything else is unknown: the fallback is Theater — never market under
 *   a mismatched wire id — and `status: 'unknown'` lets the runtime explain
 *   the fallback to the player.
 */
export function resolveRoomRequest(requested, { hasDefinition = () => false, theaterId = ROOMS.THEATER } = {}) {
  if (typeof requested !== 'string' || requested.length === 0) {
    return { status: 'ok', requested: null, roomId: theaterId, kind: 'place', def: null, fallback: false };
  }
  if (requested === ROOMS.MARKET) {
    return { status: 'ok', requested, roomId: requested, kind: 'market', def: null, fallback: false };
  }
  if (ROOMS.isGarden(requested)) {
    return { status: 'ok', requested, roomId: requested, kind: 'garden', def: null, fallback: false };
  }
  const def = hasDefinition(requested);
  if (def) {
    return { status: 'ok', requested, roomId: requested, kind: 'place', def, fallback: false };
  }
  return { status: 'unknown', requested, roomId: theaterId, kind: 'place', def: null, fallback: true };
}

/**
 * The typed second argument a world's update() receives. A garden bed
 * snapshot must never masquerade as a district completion flag: garden rooms
 * receive their beds (possibly null before the first GARDEN_STATE), and
 * every other room receives a strict boolean completion value.
 */
export function worldUpdateInput({ isGardenRoom = false, gardenBeds = null, completed = false } = {}) {
  if (isGardenRoom) {
    return { kind: 'garden', value: gardenBeds ?? null };
  }
  return { kind: 'district', value: completed === true };
}

/**
 * The transient per-frame input a travel transition must clear: the nearest
 * interactable, the walk target and its marker, held keys, the pointer
 * gesture, the queued jump and the seated pose. This is the plain-shaped
 * mirror of main.js's mutable state; the runtime calls resetTransientInput
 * through its injected resetInput seam.
 */
export function createTransientInput() {
  return {
    nearest: null,
    target: null,
    markerVisible: false,
    keys: new Set(),
    press: null,
    jumpQueued: false,
    seated: null,
  };
}

export function resetTransientInput(input) {
  if (!input) return input;
  input.nearest = null;
  input.target = null;
  input.markerVisible = false;
  input.keys?.clear();
  input.press = null;
  input.jumpQueued = false;
  input.seated = null;
  return input;
}

/**
 * Monotonic activation generation. Every travel attempt takes the next
 * value when it starts; an asynchronous preparation compares against the
 * counter after its await and discards itself when a newer attempt exists.
 */
export function createGenerationCounter() {
  return { value: 0 };
}

export function nextGeneration(counter) {
  counter.value += 1;
  return counter.value;
}

export function isCurrentGeneration(counter, generation) {
  return counter.value === generation;
}

/**
 * Network membership status for the active room. JOINING is set locally on
 * commit; only server evidence moves it to ONLINE, and a dropped socket
 * moves it back to OFFLINE without touching the rendered world.
 */
export function createNetworkStatus(roomId = null) {
  return { phase: NETWORK_PHASES.OFFLINE, roomId };
}

/**
 * Safe spawn points for the player and Kiln in a resolved destination.
 * Places declare their own spawns; market and the personal garden keep
 * their historical entrance coordinates (identical to the legacy
 * hard-coded values and the world bounds' spawn fields).
 */
export function actorSpawnsFor(resolution) {
  if (resolution?.kind === 'place' && resolution.def) {
    const spawn = resolution.def.spawn ?? [-9, 0];
    const companion = resolution.def.companionSpawn ?? [spawn[0] + 0.8, spawn[1] + 1];
    return { spawn, companionSpawn: companion };
  }
  if (resolution?.kind === 'garden') {
    return { spawn: [-9.5, 0], companionSpawn: [-8.7, 1] };
  }
  return { spawn: [0, 3], companionSpawn: [0.8, 4] };
}
