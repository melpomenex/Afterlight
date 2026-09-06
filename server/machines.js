import { GOODS, MILL_REQUIREMENT, SPRINKLER } from '../shared/materials.js';

const MATERIAL_IDS = Object.keys(MILL_REQUIREMENT);
const QUALITY_ORDER = ['C', 'B', 'A', 'A+']; // Milling consumes the lowest grade first

/**
 * Reads the persisted mill status straight from storage without requiring a
 * MachinesManager instance (used by contract generation, which may run before
 * machines state has been normalized).
 */
export function isMillRestoredInState(state) {
  return state?.machines?.mill?.status === 'restored';
}

/**
 * The Market Court machine shop. Machines have restore/consume lifecycles
 * rather than prices, so this lives beside gardens.js instead of economy.js.
 * All economically meaningful mutations are validated here on the server and
 * persisted to storage.state.machines = { mill: {...} }.
 */
export class MachinesManager {
  constructor(storage) {
    this.storage = storage;
    const saved = this.storage.state.machines;
    this.mill = saved && saved.mill && typeof saved.mill === 'object'
      ? this.normalizeMill(saved.mill)
      : this.createDefaultMill();
    this.persist();
  }

  createDefaultMill() {
    return {
      status: 'broken',
      required: { ...MILL_REQUIREMENT },
      contributed: { copper: 0, timber: 0, glass: 0 },
      restoredAt: null,
    };
  }

  normalizeMill(mill) {
    const base = this.createDefaultMill();
    mill.status = mill.status === 'restored' ? 'restored' : 'broken';
    if (!mill.required || typeof mill.required !== 'object') mill.required = { ...base.required };
    if (!mill.contributed || typeof mill.contributed !== 'object') mill.contributed = { ...base.contributed };
    for (const id of MATERIAL_IDS) {
      const required = Number.isFinite(Number(mill.required[id])) && Number(mill.required[id]) > 0
        ? Math.floor(Number(mill.required[id]))
        : base.required[id];
      const contributed = Number(mill.contributed[id]);
      mill.required[id] = required;
      mill.contributed[id] = Number.isFinite(contributed) && contributed > 0 ? Math.floor(contributed) : 0;
    }
    if (mill.restoredAt !== null && !Number.isFinite(Number(mill.restoredAt))) mill.restoredAt = null;
    return mill;
  }

  persist() {
    this.storage.state.machines = { mill: this.mill };
    this.storage.save();
  }

  getStatus() {
    return {
      mill: {
        status: this.mill.status,
        required: { ...this.mill.required },
        contributed: { ...this.mill.contributed },
        restoredAt: this.mill.restoredAt,
      },
    };
  }

  isMillRestored() {
    return this.mill.status === 'restored';
  }

  remainingNeed(material) {
    const required = this.mill.required[material];
    if (!Number.isFinite(required)) return 0;
    return Math.max(0, required - (this.mill.contributed[material] || 0));
  }

  /**
   * Applies a material contribution atomically: the request is clamped to
   * both the player's stock and the mill's remaining need, materials leave
   * the inventory only when at least one unit is accepted, and restoration
   * completes in the same step that receives the final unit. Runs
   * synchronously, so concurrent messages are naturally serialized.
   */
  contribute(player, material, quantity, now = Date.now()) {
    if (this.mill.status !== 'broken') return { success: false, reason: 'mill_already_restored' };
    if (!(material in this.mill.required)) return { success: false, reason: 'material_not_needed' };

    const requested = Math.floor(Number(quantity));
    if (!Number.isFinite(requested) || requested <= 0) {
      return { success: false, reason: 'invalid_quantity' };
    }

    if (!player.materials || typeof player.materials !== 'object') player.materials = {};
    const held = Math.floor(Number(player.materials[material]) || 0);
    const remaining = this.remainingNeed(material);
    if (remaining <= 0) return { success: false, reason: 'material_fulfilled' };
    if (held <= 0) return { success: false, reason: 'insufficient_materials' };

    const applied = Math.min(requested, held, remaining);
    player.materials[material] = held - applied;
    if (player.materials[material] <= 0) delete player.materials[material];
    this.mill.contributed[material] += applied;

    let restored = false;
    if (MATERIAL_IDS.every(id => this.remainingNeed(id) <= 0)) {
      this.mill.status = 'restored';
      this.mill.restoredAt = now;
      restored = true;
    }
    this.persist();

    return { success: true, material, applied, restored, machine: this.getStatus() };
  }

  /**
   * Milled goods: a restored mill converts wheat into flour 1:1 (no quality
   * grades in this slice), consuming the player's lowest-grade wheat first.
   */
  millWheat(player, quantity = 1) {
    if (!this.isMillRestored()) return { success: false, reason: 'mill_broken' };

    const requested = Math.floor(Number(quantity));
    if (!Number.isFinite(requested) || requested <= 0) {
      return { success: false, reason: 'invalid_quantity' };
    }
    if (!player.inventory || typeof player.inventory.produce !== 'object') {
      return { success: false, reason: 'no_wheat' };
    }

    let available = 0;
    for (const quality of QUALITY_ORDER) {
      available += player.inventory.produce[`wheat_${quality}`] || 0;
    }
    if (available <= 0) return { success: false, reason: 'no_wheat' };

    const milled = Math.min(requested, available);
    let leftToTake = milled;
    for (const quality of QUALITY_ORDER) {
      if (leftToTake <= 0) break;
      const key = `wheat_${quality}`;
      const take = Math.min(player.inventory.produce[key] || 0, leftToTake);
      if (take <= 0) continue;
      player.inventory.produce[key] -= take;
      if (player.inventory.produce[key] <= 0) delete player.inventory.produce[key];
      leftToTake -= take;
    }

    player.inventory.produce[`${GOODS.flour.id}_B`] = (player.inventory.produce[`${GOODS.flour.id}_B`] || 0) + milled;
    return { success: true, milled, good: GOODS.flour };
  }

  /**
   * Crafts a garden fixture from gathered materials. The sprinkler kit is
   * added to the player's inventory; placement onto a bed tile is a separate
   * validated garden action.
   */
  craft(player, fixture) {
    if (fixture !== SPRINKLER.id) return { success: false, reason: 'unknown_fixture' };
    if (!player.materials || typeof player.materials !== 'object') player.materials = {};

    for (const [material, cost] of Object.entries(SPRINKLER.cost)) {
      const held = Math.floor(Number(player.materials[material]) || 0);
      if (held < cost) return { success: false, reason: 'insufficient_materials', material };
    }
    for (const [material, cost] of Object.entries(SPRINKLER.cost)) {
      player.materials[material] -= cost;
      if (player.materials[material] <= 0) delete player.materials[material];
    }

    if (!player.inventory || typeof player.inventory !== 'object') player.inventory = {};
    player.inventory.sprinklers = (Math.floor(Number(player.inventory.sprinklers)) || 0) + 1;

    return { success: true, fixture: SPRINKLER.id, name: SPRINKLER.name };
  }
}
