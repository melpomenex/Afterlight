import { MATERIAL_NODES } from '../shared/materials.js';

const NODES_BY_ID = new Map(MATERIAL_NODES.map(node => [node.id, node]));

/**
 * Server-authoritative gather-node state. Depletion timestamps are persisted
 * in storage.state.nodes as { [nodeId]: depletedAt }; a node is depleted
 * while `now < depletedAt + respawnMs`, and its depletion entry is reaped
 * (deleted) once the interval has elapsed. Because the timestamp is absolute,
 * the remaining respawn time survives server restarts untouched.
 */
export class NodesManager {
  constructor(storage) {
    this.storage = storage;
    if (!this.storage.state.nodes || typeof this.storage.state.nodes !== 'object') {
      this.storage.state.nodes = {};
    }
    this.depletions = this.storage.state.nodes;
  }

  persist() {
    this.storage.state.nodes = this.depletions;
    this.storage.save();
  }

  isDepleted(nodeId, now = Date.now()) {
    const def = NODES_BY_ID.get(nodeId);
    if (!def) return false;
    const depletedAt = this.depletions[nodeId];
    if (depletedAt === undefined || depletedAt === null) return false;
    return now < depletedAt + def.respawnMs;
  }

  /** District a node belongs to, or null for unknown ids. */
  nodeDistrict(nodeId) {
    const def = NODES_BY_ID.get(nodeId);
    return def ? def.district : null;
  }

  respawnAt(nodeId) {
    const def = NODES_BY_ID.get(nodeId);
    const depletedAt = this.depletions[nodeId];
    if (!def || depletedAt === undefined || depletedAt === null) return null;
    return depletedAt + def.respawnMs;
  }

  /**
   * Harvests a node: rejects unknown or still-depleted nodes without side
   * effects, otherwise marks it depleted at `now` and reports the material
   * yielded. The caller grants the material to the player inside the same
   * server-validated action.
   */
  harvest(nodeId, now = Date.now()) {
    const def = NODES_BY_ID.get(nodeId);
    if (!def) return { success: false, reason: 'unknown_node' };
    if (this.isDepleted(nodeId, now)) {
      return { success: false, reason: 'node_depleted', respawnAt: this.respawnAt(nodeId) };
    }
    this.depletions[nodeId] = now;
    this.persist();
    return { success: true, nodeId, material: def.material, district: def.district };
  }

  /**
   * Deletes (reaps) depletion entries whose respawn interval has elapsed.
   * Returns true when at least one entry was reaped.
   */
  reapExpired(now = Date.now()) {
    let reaped = false;
    for (const nodeId of Object.keys(this.depletions)) {
      const def = NODES_BY_ID.get(nodeId);
      const depletedAt = this.depletions[nodeId];
      if (!def || depletedAt === undefined || now >= depletedAt + def.respawnMs) {
        delete this.depletions[nodeId];
        reaped = true;
      }
    }
    if (reaped) this.persist();
    return reaped;
  }

  /**
   * Snapshot of every node in a district for wire transfer. Reaps expired
   * entries first so the snapshot reflects respawns. Returns null for
   * districts without nodes.
   */
  getStatesForDistrict(districtId, now = Date.now()) {
    const defs = MATERIAL_NODES.filter(node => node.district === districtId);
    if (defs.length === 0) return null;
    this.reapExpired(now);
    return defs.map(def => ({
      nodeId: def.id,
      material: def.material,
      available: !this.isDepleted(def.id, now),
      depletedAt: this.isDepleted(def.id, now) ? this.depletions[def.id] : null,
      respawnAt: this.respawnAt(def.id),
    }));
  }

  /**
     * Advances respawn timers and returns the ids of districts where a node
     * transitioned from depleted to available, so the caller can broadcast
     * NODE_STATE to the players standing there.
     */
  tick(now = Date.now()) {
    const changed = [];
    for (const districtId of new Set(MATERIAL_NODES.map(node => node.district))) {
      let districtChanged = false;
      for (const node of MATERIAL_NODES) {
        if (node.district !== districtId) continue;
        const depletedAt = this.depletions[node.id];
        if (depletedAt !== undefined && depletedAt !== null && now >= depletedAt + node.respawnMs) {
          delete this.depletions[node.id];
          districtChanged = true;
        }
      }
      if (districtChanged) changed.push(districtId);
    }
    if (changed.length > 0) this.persist();
    return changed;
  }
}
