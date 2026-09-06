// Dense-slot entity store for the realtime data plane (contract §2/§4).
// Server ids are sparse u32; rendering wants dense u16 slots with a free
// list. GuestId strings ride spawn frames once and are kept here so
// setPlayer()-shaped output preserves identity continuity.

import { LIMITS } from './constants.js';

const DEFAULT_MAX_SLOTS = LIMITS.MAX_SLOTS ?? 8192;

// Entity flag bits (contract §2): the compat projection of today's
// presence_update booleans.
export const FLAG_WALKING = 1;
export const FLAG_SITTING = 2;
export const FLAG_AIRBORNE = 4;

export class EntityStore {
  constructor(maxSlots = DEFAULT_MAX_SLOTS) {
    this.maxSlots = maxSlots;
    this.slotOf = new Map(); // u32 id -> u16 slot
    this.idOf = new Array(maxSlots).fill(0);
    this.guestIdOf = new Array(maxSlots).fill(null); // players only
    this.free = [];
    for (let s = maxSlots - 1; s >= 0; s--) this.free.push(s);
    this.generation = new Uint16Array(maxSlots); // guards GPU slot reuse
    this.count = 0;
    // component columns (contract §2)
    this.x = new Float32Array(maxSlots);
    this.y = new Float32Array(maxSlots);
    this.z = new Float32Array(maxSlots);
    this.yaw = new Float32Array(maxSlots);
    this.vx = new Float32Array(maxSlots);
    this.vy = new Float32Array(maxSlots);
    this.vz = new Float32Array(maxSlots);
    this.animState = new Uint8Array(maxSlots);
    this.emote = new Uint8Array(maxSlots);
    this.flags = new Uint8Array(maxSlots);
    this.archetype = new Uint16Array(maxSlots);
    this.variant = new Uint16Array(maxSlots);
    // string table from the most recent spawn-carrying frame (transient)
    this.strings = [];
  }

  spawn(id, init) {
    if (this.slotOf.has(id)) return { ok: false, reason: 'duplicate_id' };
    if (this.free.length === 0) return { ok: false, reason: 'store_full' };
    const slot = this.free.pop();
    this.slotOf.set(id, slot);
    this.idOf[slot] = id;
    this.generation[slot] = (this.generation[slot] + 1) & 0xffff; // new life
    this.x[slot] = init.x ?? 0; this.y[slot] = init.y ?? 0;
    this.z[slot] = init.z ?? 0; this.yaw[slot] = init.yaw ?? 0;
    this.vx[slot] = 0; this.vy[slot] = 0; this.vz[slot] = 0;
    this.animState[slot] = init.animState ?? 0;
    this.emote[slot] = init.emote ?? 0;
    this.flags[slot] = init.flags ?? 0;
    this.archetype[slot] = init.archetype ?? 0;
    this.variant[slot] = init.variant ?? 0;
    this.guestIdOf[slot] = init.guestId ?? null;
    this.count++;
    return { ok: true, slot };
  }

  despawn(id) {
    const slot = this.slotOf.get(id);
    if (slot === undefined) return false;
    this.slotOf.delete(id);
    this.guestIdOf[slot] = null;
    this.free.push(slot);
    this.count--;
    return true;
  }

  slot(id) {
    const s = this.slotOf.get(id);
    return s === undefined ? -1 : s;
  }

  reset() {
    this.slotOf.clear();
    this.free.length = 0;
    for (let s = this.maxSlots - 1; s >= 0; s--) this.free.push(s);
    this.guestIdOf.fill(null);
    this.count = 0;
    this.strings = [];
  }

  // Flips-only projection consumed by the legacy avatar path:
  // {id: guestId-string-or-id, x, z, rotY, walking, sitting, airborne}
  entryFor(slot) {
    const f = this.flags[slot];
    return {
      id: this.guestIdOf[slot] ?? this.idOf[slot],
      x: this.x[slot],
      z: this.z[slot],
      rotY: this.yaw[slot],
      walking: !!(f & FLAG_WALKING),
      sitting: !!(f & FLAG_SITTING),
      airborne: !!(f & FLAG_AIRBORNE),
    };
  }
}

// Legacy-path projection helpers.
export function flagsToPresence(flags) {
  return {
    walking: !!(flags & FLAG_WALKING),
    sitting: !!(flags & FLAG_SITTING),
    airborne: !!(flags & FLAG_AIRBORNE),
  };
}

export function presenceToFlags(walking, sitting, airborne) {
  return (walking ? FLAG_WALKING : 0) | (sitting ? FLAG_SITTING : 0) | (airborne ? FLAG_AIRBORNE : 0);
}
