//! Slot-based entity store (contract §2): dense u16 client slots, sparse u32
//! server ids, id→slot open-addressing map, free-list slot allocator.
//!
//! Safety posture: every growth path uses `try_reserve` and maps failure to
//! `E_NO_MEMORY`; nothing here panics on hostile input. Single-threaded by
//! contract (§7: one worker per socket).

pub const MAX_SLOTS_HARD: u32 = 65_536; // slots are u16 on the wire (§2)

/// Open-addressing u32→u32 map with tombstones.
///
/// Sentinels: `EMPTY = u32::MAX` marks a never-used bucket, `TOMB = u32::MAX-1`
/// a deleted one. Ids equal to either sentinel are not storable (spawn of such
/// an id is rejected) — real id spaces here start at ~100, so this is safe and
/// documented. Load factor is kept ≤ 3/4 counting tombstones; the store
/// rebuilds the map from its slot array when pressure is too high.
pub struct IdMap {
    keys: Vec<u32>,
    vals: Vec<u32>, // client slot
    shift: u32,     // hash top bits -> index
    live: usize,
    tombs: usize,
}

const EMPTY: u32 = u32::MAX;
const TOMB: u32 = u32::MAX - 1;

#[inline]
fn hash(id: u32) -> u32 {
    // Fibonacci-ish finalizer; cheap and good enough for gap-y id spaces.
    id.wrapping_mul(0x9E37_79B1).rotate_left(13) ^ (id >> 15)
}

impl IdMap {
    pub fn new(cap_pow2: usize) -> Result<Self, ()> {
        debug_assert!(cap_pow2.is_power_of_two());
        let mut m = IdMap { keys: Vec::new(), vals: Vec::new(), shift: 0, live: 0, tombs: 0 };
        m.reset(cap_pow2)?;
        Ok(m)
    }

    fn reset(&mut self, cap_pow2: usize) -> Result<(), ()> {
        self.keys.clear();
        self.vals.clear();
        self.keys.try_reserve(cap_pow2).map_err(|_| ())?;
        self.vals.try_reserve(cap_pow2).map_err(|_| ())?;
        self.keys.resize(cap_pow2, EMPTY);
        self.vals.resize(cap_pow2, 0);
        self.shift = 32 - cap_pow2.trailing_zeros(); // cap_pow2 is a power of two
        self.live = 0;
        self.tombs = 0;
        Ok(())
    }

    pub fn clear(&mut self) {
        self.keys.fill(EMPTY);
        self.live = 0;
        self.tombs = 0;
    }

    #[inline]
    fn idx(&self, id: u32) -> usize {
        ((hash(id) >> self.shift) as usize) & (self.keys.len() - 1)
    }

    /// Probe for `id`. Returns (insert_index, found).
    #[inline]
    fn probe(&self, id: u32) -> (usize, bool) {
        let mask = self.keys.len() - 1;
        let mut i = self.idx(id);
        loop {
            let k = self.keys[i];
            if k == EMPTY || k == id {
                return (i, k == id);
            }
            i = (i + 1) & mask;
        }
    }

    #[inline]
    pub fn get(&self, id: u32) -> Option<u32> {
        if id >= TOMB {
            return None; // sentinel values are unfindable by design
        }
        let (i, found) = self.probe(id);
        if found {
            Some(self.vals[i])
        } else {
            None
        }
    }

    #[inline]
    pub fn contains(&self, id: u32) -> bool {
        self.probe(id).1 && id < TOMB
    }

    /// Returns false if the id was already present (or is a sentinel).
    pub fn insert(&mut self, id: u32, slot: u32) -> bool {
        if id >= TOMB {
            return false;
        }
        let (i, found) = self.probe(id);
        if found {
            return false;
        }
        if self.keys[i] == TOMB {
            self.tombs -= 1;
        } else if self.keys[i] != EMPTY {
            // bucket holds a different live id (probe should not return it)
            return false;
        }
        self.keys[i] = id;
        self.vals[i] = slot;
        self.live += 1;
        true
    }

    /// Returns the previous slot if the id was present.
    pub fn remove(&mut self, id: u32) -> Option<u32> {
        let (i, found) = self.probe(id);
        if !found {
            return None;
        }
        let prev = self.vals[i];
        self.keys[i] = TOMB;
        self.live -= 1;
        self.tombs += 1;
        Some(prev)
    }

    #[inline]
    pub fn needs_rehash(&self) -> bool {
        let cap = self.keys.len();
        (self.live + self.tombs) * 4 > cap * 3
    }

    #[allow(dead_code)]
    pub fn len(&self) -> usize {
        self.live
    }
}

/// Dense-slot entity store. Columns and field layout follow contract §2.
pub struct Store {
    pub max_slots: u32,
    // slot-indexed columns
    pub(crate) slot_id: Vec<u32>,
    pub(crate) slot_alive: Vec<bool>,
    pub(crate) x: Vec<f32>,
    pub(crate) y: Vec<f32>,
    pub(crate) z: Vec<f32>,
    pub(crate) yaw: Vec<f32>,
    pub(crate) vx: Vec<f32>,
    pub(crate) vy: Vec<f32>,
    pub(crate) vz: Vec<f32>,
    pub(crate) anim_state: Vec<u8>,
    pub(crate) emote: Vec<u8>,
    pub(crate) flags: Vec<u8>,
    pub(crate) archetype: Vec<u16>,
    pub(crate) variant: Vec<u16>,
    pub(crate) string_ref: Vec<u32>,
    // slot allocator
    pub(crate) free: Vec<u32>, // all free slots; pop() = next allocation
    pub(crate) idmap: IdMap,
    live: usize,
    // session state (§4)
    pub epoch: u32,
    pub seq: u32,
    pub server_tick: u32,
    pub has_baseline: bool,
    pub poisoned: bool,
    // per-frame output staging handed to JS as (ptr, len) pairs. Cleared at
    // the start of every applied frame; capacity is retained, so a steady
    // tick stream performs no allocation.
    pub out_ids: Vec<u32>,
    pub out_x: Vec<f32>,
    pub out_y: Vec<f32>,
    pub out_z: Vec<f32>,
    pub out_yaw: Vec<f32>,
    pub out_flag_ids: Vec<u32>,
    pub out_flag_vals: Vec<u8>,
    pub out_spawn_ids: Vec<u32>,
    pub out_spawn_arch: Vec<u16>,
    pub out_spawn_variant: Vec<u16>,
    pub out_spawn_sref: Vec<u32>,
    pub out_spawn_x: Vec<f32>,
    pub out_spawn_y: Vec<f32>,
    pub out_spawn_z: Vec<f32>,
    pub out_spawn_yaw: Vec<f32>,
    pub out_despawn_ids: Vec<u32>,
}

macro_rules! alloc_col {
    ($s:expr, $field:ident, $n:expr) => {
        if $s.$field.try_reserve($n).is_err() {
            return None;
        }
        $s.$field.resize($n, Default::default());
    };
}

impl Store {
    pub fn new(max_slots: u32) -> Option<Store> {
        if max_slots == 0 || max_slots > MAX_SLOTS_HARD {
            return None;
        }
        let table_cap = (max_slots as usize).next_power_of_two() * 2;
        let mut free = Vec::new();
        free.try_reserve(max_slots as usize).ok()?;
        // Pop order = ascending slots for a fresh store (required so a
        // snapshot's DENSE sections address slots 0..count-1 in row order).
        free.extend((0..max_slots).rev());
        let idmap = IdMap::new(table_cap).ok()?;
        let n = max_slots as usize;
        let mut s = Store {
            max_slots,
            slot_id: Vec::new(),
            slot_alive: Vec::new(),
            x: Vec::new(),
            y: Vec::new(),
            z: Vec::new(),
            yaw: Vec::new(),
            vx: Vec::new(),
            vy: Vec::new(),
            vz: Vec::new(),
            anim_state: Vec::new(),
            emote: Vec::new(),
            flags: Vec::new(),
            archetype: Vec::new(),
            variant: Vec::new(),
            string_ref: Vec::new(),
            free,
            idmap,
            live: 0,
            epoch: 0,
            seq: 0,
            server_tick: 0,
            has_baseline: false,
            poisoned: false,
            out_ids: Vec::new(),
            out_x: Vec::new(),
            out_y: Vec::new(),
            out_z: Vec::new(),
            out_yaw: Vec::new(),
            out_flag_ids: Vec::new(),
            out_flag_vals: Vec::new(),
            out_spawn_ids: Vec::new(),
            out_spawn_arch: Vec::new(),
            out_spawn_variant: Vec::new(),
            out_spawn_sref: Vec::new(),
            out_spawn_x: Vec::new(),
            out_spawn_y: Vec::new(),
            out_spawn_z: Vec::new(),
            out_spawn_yaw: Vec::new(),
            out_despawn_ids: Vec::new(),
        };
        alloc_col!(s, slot_id, n);
        alloc_col!(s, slot_alive, n);
        alloc_col!(s, x, n);
        alloc_col!(s, y, n);
        alloc_col!(s, z, n);
        alloc_col!(s, yaw, n);
        alloc_col!(s, vx, n);
        alloc_col!(s, vy, n);
        alloc_col!(s, vz, n);
        alloc_col!(s, anim_state, n);
        alloc_col!(s, emote, n);
        alloc_col!(s, flags, n);
        alloc_col!(s, archetype, n);
        alloc_col!(s, variant, n);
        alloc_col!(s, string_ref, n);
        Some(s)
    }

    pub fn live_count(&self) -> usize {
        self.live
    }
    pub fn free_len(&self) -> usize {
        self.free.len()
    }

    #[inline]
    pub(crate) fn alive(&self, slot: u32) -> bool {
        matches!(self.slot_alive.get(slot as usize), Some(true))
    }

    #[inline]
    pub(crate) fn id_at(&self, slot: u32) -> u32 {
        self.slot_id[slot as usize]
    }

    #[inline]
    pub(crate) fn get_slot(&self, id: u32) -> Option<u32> {
        let slot = self.idmap.get(id)?;
        if self.alive(slot) {
            Some(slot)
        } else {
            None
        }
    }

    #[inline]
    pub(crate) fn contains_id(&self, id: u32) -> bool {
        self.idmap.contains(id)
    }

    /// Allocate a slot for `id`. Caller must ensure the id is new and capacity
    /// exists (the protocol layer pre-checks both).
    #[inline]
    pub(crate) fn alloc_slot(&mut self, id: u32) -> Option<u32> {
        let slot = self.free.pop()?;
        let s = slot as usize;
        self.slot_id[s] = id;
        self.slot_alive[s] = true;
        // defaults for optional components (§4: spawn row + defaults)
        self.vx[s] = 0.0;
        self.vy[s] = 0.0;
        self.vz[s] = 0.0;
        self.anim_state[s] = 0;
        self.emote[s] = 0;
        self.flags[s] = 0;
        if !self.idmap.insert(id, slot) {
            // cannot happen post-pre-check; keep invariants anyway
            self.slot_alive[s] = false;
            self.free.push(slot);
            return None;
        }
        self.live += 1;
        Some(slot)
    }

    /// Free a slot (generation-checked despawn, §4). No-op if not alive.
    pub(crate) fn free_slot(&mut self, slot: u32) {
        if !self.alive(slot) {
            return;
        }
        let s = slot as usize;
        let id = self.slot_id[s];
        self.slot_alive[s] = false;
        self.slot_id[s] = 0;
        self.idmap.remove(id);
        self.free.push(slot);
        self.live -= 1;
    }

    /// FULL_SNAPSHOT semantics (§4): reset all state to the frame's contents.
    pub(crate) fn reset_to(&mut self, epoch: u32, seq: u32, tick: u32, has_baseline: bool) {
        self.slot_alive.fill(false);
        self.free.clear();
        self.free.extend((0..self.max_slots).rev());
        self.idmap.clear();
        self.live = 0;
        self.epoch = epoch;
        self.seq = seq;
        self.server_tick = tick;
        self.has_baseline = has_baseline;
        self.poisoned = false;
    }

    /// Rebuild the id map from live slots after tombstone pressure.
    pub(crate) fn rehash_idmap(&mut self) {
        if self.idmap.reset((self.max_slots as usize).next_power_of_two() * 2).is_err() {
            // keep whatever we have; further inserts fail -> poison path
            self.idmap.clear();
        }
        for slot in 0..self.max_slots {
            if self.alive(slot) {
                let id = self.slot_id[slot as usize];
                self.idmap.insert(id, slot);
            }
        }
    }

    // ---- per-frame output staging ----

    pub(crate) fn clear_outputs(&mut self) {
        self.out_ids.clear();
        self.out_x.clear();
        self.out_y.clear();
        self.out_z.clear();
        self.out_yaw.clear();
        self.out_flag_ids.clear();
        self.out_flag_vals.clear();
        self.out_spawn_ids.clear();
        self.out_spawn_arch.clear();
        self.out_spawn_variant.clear();
        self.out_spawn_sref.clear();
        self.out_spawn_x.clear();
        self.out_spawn_y.clear();
        self.out_spawn_z.clear();
        self.out_spawn_yaw.clear();
        self.out_despawn_ids.clear();
    }

    /// Reserve staging capacity for a section before any mutation so the
    /// apply loop cannot hit an aborting allocation. Err -> E_NO_MEMORY.
    pub(crate) fn reserve_outputs(&mut self, sid: u8, count: u32) -> Result<(), ()> {
        let c = count as usize;
        match sid {
            crate::protocol::SEC_TRANSFORM => {
                self.out_ids.try_reserve(c).map_err(|_| ())?;
                for v in [&mut self.out_x, &mut self.out_y, &mut self.out_z, &mut self.out_yaw] {
                    v.try_reserve(c).map_err(|_| ())?;
                }
            }
            crate::protocol::SEC_FLAGS => {
                self.out_flag_ids.try_reserve(c).map_err(|_| ())?;
                self.out_flag_vals.try_reserve(c).map_err(|_| ())?;
            }
            crate::protocol::SEC_SPAWN => {
                self.out_spawn_ids.try_reserve(c).map_err(|_| ())?;
                self.out_spawn_arch.try_reserve(c).map_err(|_| ())?;
                self.out_spawn_variant.try_reserve(c).map_err(|_| ())?;
                self.out_spawn_sref.try_reserve(c).map_err(|_| ())?;
                for v in [
                    &mut self.out_spawn_x,
                    &mut self.out_spawn_y,
                    &mut self.out_spawn_z,
                    &mut self.out_spawn_yaw,
                ] {
                    v.try_reserve(c).map_err(|_| ())?;
                }
            }
            crate::protocol::SEC_DESPAWN => {
                self.out_despawn_ids.try_reserve(c).map_err(|_| ())?;
            }
            _ => {}
        }
        Ok(())
    }

    // ---- read access for tests and tools ----
    /// Slot currently holding server id `id` (alive only).
    pub fn find_slot(&self, id: u32) -> Option<u32> {
        self.get_slot(id)
    }
    /// Server id of a live slot.
    pub fn id_of(&self, slot: u32) -> Option<u32> {
        if self.alive(slot) {
            Some(self.id_at(slot))
        } else {
            None
        }
    }
    pub fn x_at(&self, slot: u32) -> Option<f32> {
        if self.alive(slot) { Some(self.x[slot as usize]) } else { None }
    }
    pub fn y_at(&self, slot: u32) -> Option<f32> {
        if self.alive(slot) { Some(self.y[slot as usize]) } else { None }
    }
    pub fn z_at(&self, slot: u32) -> Option<f32> {
        if self.alive(slot) { Some(self.z[slot as usize]) } else { None }
    }
    pub fn yaw_at(&self, slot: u32) -> Option<f32> {
        if self.alive(slot) { Some(self.yaw[slot as usize]) } else { None }
    }
    pub fn flags_at(&self, slot: u32) -> Option<u8> {
        if self.alive(slot) { Some(self.flags[slot as usize]) } else { None }
    }
    pub fn archetype_at(&self, slot: u32) -> Option<u16> {
        if self.alive(slot) { Some(self.archetype[slot as usize]) } else { None }
    }
    pub fn variant_at(&self, slot: u32) -> Option<u16> {
        if self.alive(slot) { Some(self.variant[slot as usize]) } else { None }
    }
    pub fn string_ref_at(&self, slot: u32) -> Option<u32> {
        if self.alive(slot) { Some(self.string_ref[slot as usize]) } else { None }
    }
    pub fn motion_at(&self, slot: u32) -> Option<(f32, f32, f32)> {
        if self.alive(slot) {
            let s = slot as usize;
            Some((self.vx[s], self.vy[s], self.vz[s]))
        } else {
            None
        }
    }
    pub fn anim_at(&self, slot: u32) -> Option<(u8, u8)> {
        if self.alive(slot) {
            let s = slot as usize;
            Some((self.anim_state[s], self.emote[s]))
        } else {
            None
        }
    }

    /// Tombstone-pressure GC hook for the protocol layer.
    pub(crate) fn maybe_rehash(&mut self) {
        if self.idmap.needs_rehash() {
            self.rehash_idmap();
        }
    }
}
