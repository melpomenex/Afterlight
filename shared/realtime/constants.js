// afterlight-soa-v1 constants — see docs/architecture/realtime/contract.md.
// Pure module: no imports, Node- and browser-safe.

export const MAGIC = 0x414c5254; // "ALRT" little-endian
export const PROTOCOL_VERSION = 1;
export const HEADER_SIZE = 24;

export const FRAME_TYPE = { FULL_SNAPSHOT: 0, DELTA: 1, RESYNC_REQUIRED: 2 };

export const FRAME_FLAG = { HAS_STRING_TABLE: 1 };

export const SECTION = {
  SPAWN: 1,
  DESPAWN: 2,
  TRANSFORM: 3,
  MOTION: 4,
  ANIM: 5,
  FLAGS: 6,
  VISUAL: 7,
  STRING_TABLE: 8,
};

export const ENCODING = {
  DENSE: 0,
  SORTED_IDS: 1,
  ROARING: 2,
  BITSET: 3,
  ARROW_RECORD_BATCH: 4,
};

// Component field layouts (contract §2). Order matters: columns are written
// in this order after the mask/ids.
export const SECTION_FIELDS = {
  [SECTION.TRANSFORM]: [
    { name: 'x', type: 'f32' },
    { name: 'y', type: 'f32' },
    { name: 'z', type: 'f32' },
    { name: 'yaw', type: 'f32' },
  ],
  [SECTION.MOTION]: [
    { name: 'vx', type: 'f32' },
    { name: 'vy', type: 'f32' },
    { name: 'vz', type: 'f32' },
  ],
  [SECTION.ANIM]: [
    { name: 'state', type: 'u8' },
    { name: 'emote', type: 'u8' },
  ],
  [SECTION.FLAGS]: [{ name: 'flags', type: 'u8' }],
  [SECTION.VISUAL]: [
    { name: 'archetype', type: 'u16' },
    { name: 'variant', type: 'u16' },
  ],
};

export const TYPE_SIZE = { f32: 4, u8: 1, u16: 2, u32: 4 };

// Hard limits enforced by every decoder BEFORE allocating (contract §3).
export const LIMITS = {
  MAX_FRAME_BYTES: 1024 * 1024,
  MAX_SECTIONS: 16,
  MAX_SECTION_ROWS: 100000,
  MAX_STRING_BYTES: 4096,
};

// Negotiation (contract §5) — additive JSON fields only.
export const RT_PROTOCOL = 'afterlight-soa-v1';
