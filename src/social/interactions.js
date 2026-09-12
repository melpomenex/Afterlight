/**
 * A bounded interaction registry for the generalized item types the social
 * place framework owns: seats, travel gates, field notes and specialized
 * screen delegation. Handlers receive the item plus the injected active
 * context, so the registry itself stays free of game state.
 *
 * This is deliberately not a plugin loader: the known types are a fixed,
 * small set, unknown types return { handled: false } and main.js's existing
 * legacy dispatch runs exactly as before.
 */

const KNOWN_CONTEXT_KEYS = ['travel', 'seatControl', 'readFieldNote', 'openScreen'];

export function createInteractionRegistry() {
  const handlers = new Map();
  return {
    register(type, handler) {
      if (typeof type !== 'string' || type.length === 0) throw new Error('Interaction types must be non-empty strings');
      if (typeof handler !== 'function') throw new Error(`Interaction handler for "${type}" must be a function`);
      if (handlers.has(type)) throw new Error(`Duplicate interaction handler: ${type}`);
      handlers.set(type, handler);
      return handler;
    },
    has(type) {
      return handlers.has(type);
    },
    types() {
      return [...handlers.keys()];
    },
    /** Unknown item types return unhandled so legacy dispatch runs. */
    dispatch(item, context) {
      const handler = handlers.get(item?.type);
      if (!handler) return { handled: false };
      return { handled: true, result: handler(item, context) };
    },
  };
}

/**
 * Register the framework-owned types against injected context:
 * - travel(targetRoomId): the runtime transition (same seam setRoom uses)
 * - seatControl: the seat controller from src/social/seating.js
 * - readFieldNote(item): legacy field-note presentation
 * - openScreen(item): specialized screen delegation (active venue adapter)
 */
export function registerCoreInteractions(registry, context) {
  for (const key of KNOWN_CONTEXT_KEYS) {
    if (!(key in context)) throw new Error(`registerCoreInteractions requires context.${key}`);
  }
  registry.register('district_gate', (item) => context.travel(item.targetDistrict));
  registry.register('market_gate', () => context.travel('market'));
  registry.register('seat', (item) => context.seatControl.sit(item));
  registry.register('field-note', (item) => context.readFieldNote(item));
  registry.register('theater_screen', (item) => context.openScreen(item));
  if (context.activityControl) {
    registry.register('activity', (item) => context.activityControl.interact(item));
  }
  return registry;
}

export function registerActivityInteraction(registry, activityControl) {
  registry.register('activity', (item) => activityControl.interact(item));
  return registry;
}
