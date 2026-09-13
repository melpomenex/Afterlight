import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorldState, resolveBootstrapWorldState } from '../src/worlds/state.js';
import { createAtmosphereStateClient } from '../src/atmosphere/stateClient.js';
import { defaultAtmosphereState } from '../shared/atmosphereModel.js';
import { MSG_TYPES } from '../shared/protocol.js';

class MockStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
}

test('canonical World state maintains personal selection independently of room snapshots', () => {
  const storage = new MockStorage();
  const worldState = createWorldState({
    storage,
    initialSelection: { worldId: 'desert', variantId: 'golden' },
  });

  assert.equal(worldState.selection.worldId, 'desert');
  assert.equal(worldState.selection.variantId, 'golden');

  // Set up mock network to simulate incoming atmosphere messages
  const handlers = new Map();
  const sentMessages = [];
  const mockNet = {
    on: (type, handler) => handlers.set(type, handler),
    send: (type, payload) => sentMessages.push({ type, payload }),
    joinRoom: () => {},
  };

  const stateClient = createAtmosphereStateClient({ net: mockNet });
  stateClient.activate({
    roomId: 'theater',
    generation: 1,
    def: { atmosphere: { preset: 'rain' } },
  });

  // Simulate server sending an ATMOSPHERE_STATE snapshot from another client
  // e.g. An old client switched the room to coastal or rain
  const stateHandler = handlers.get(MSG_TYPES.ATMOSPHERE_STATE);
  assert.ok(typeof stateHandler === 'function');

  stateHandler({
    type: 'atmosphere_state',
    schemaVersion: 1,
    roomId: 'theater',
    epoch: 1,
    revision: 1,
    serverNow: 1000,
    state: defaultAtmosphereState('env-coastal-sunset', { seed: 1 }),
  });

  // State client accepted the server snapshot
  assert.equal(stateClient.getState().preset, 'env-coastal-sunset');

  // Verify personal World state was NOT overwritten by the room snapshot
  assert.equal(worldState.selection.worldId, 'desert');
  assert.equal(worldState.selection.variantId, 'golden');

  // Verify personal selection update does NOT emit atmosphere_set to room
  worldState.select({ worldId: 'alpine', variantId: 'aurora' });
  assert.equal(worldState.selection.worldId, 'alpine');
  assert.equal(worldState.selection.variantId, 'aurora');

  const atmosphereSetCalls = sentMessages.filter(m => m.type === 'atmosphere_set');
  assert.equal(atmosphereSetCalls.length, 0);

  // Even another broadcast cannot clobber Alpine
  stateHandler({
    type: 'atmosphere_state',
    schemaVersion: 1,
    roomId: 'theater',
    epoch: 2,
    revision: 1,
    serverNow: 2000,
    state: defaultAtmosphereState('env-redwood-fog', { seed: 2 }),
  });

  assert.equal(worldState.selection.worldId, 'alpine');
  assert.equal(worldState.selection.variantId, 'aurora');
});

test('reconnect and token renewal preserve personal selection without reroll', () => {
  const storage = new MockStorage();
  const worldState = createWorldState({
    storage,
    initialSelection: { worldId: 'cloud', variantId: 'sunrise' },
  });

  assert.equal(worldState.selection.worldId, 'cloud');
  const originalRevision = worldState.revision;

  // Re-instantiating state with same storage preserves cloud
  const reconnectedState = createWorldState({
    storage,
  });

  assert.equal(reconnectedState.selection.worldId, 'cloud');
  assert.equal(reconnectedState.selection.variantId, 'sunrise');
});
