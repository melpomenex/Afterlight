/**
 * Authoritative authored-avatar definitions manifest and validation.
 * Pure ES module: no Three.js or DOM dependencies.
 *
 * Single editable source of truth for the avatar catalog (D2).
 */

export const VALID_RIG_KINDS = Object.freeze(['humanoid', 'humanoid-heavy', 'floating']);
export const VALID_RARITIES = Object.freeze(['common', 'uncommon', 'rare']);
export const VALID_EFFECTS = Object.freeze(['crt-static', 'glow-pulse', 'spin', 'flicker', 'float']);

function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    deepFreeze(obj[key]);
  }
  return obj;
}

const RAW_AVATAR_DEFINITIONS = [
  // --- Wave 1 (Easy / Base humanoid) ---
  {
    id: 'moon-head',
    name: 'Moon Head',
    assetPath: 'avatars/moon-head/moon-head.glb',
    rig: 'humanoid',
    scale: 1.0,
    nameplateY: 2.3,
    tintMaterials: ['MAT_Accent'],
    effect: null,
    rarity: 'common',
    weight: 10,
    tags: ['wanderer', 'celestial'],
  },
  {
    id: 'traffic-cone-guy',
    name: 'Traffic Cone Guy',
    assetPath: 'avatars/traffic-cone-guy/traffic-cone-guy.glb',
    rig: 'humanoid',
    scale: 1.0,
    nameplateY: 2.45,
    tintMaterials: ['MAT_Accent'],
    effect: null,
    rarity: 'common',
    weight: 10,
    tags: ['workwear', 'cone'],
  },
  {
    id: 'skeleton-tourist',
    name: 'Skeleton Tourist',
    assetPath: 'avatars/skeleton-tourist/skeleton-tourist.glb',
    rig: 'humanoid',
    scale: 1.0,
    nameplateY: 2.3,
    tintMaterials: ['MAT_Accent'],
    effect: null,
    rarity: 'common',
    weight: 10,
    tags: ['undead', 'tourist'],
  },
  {
    id: 'alien-tourist',
    name: 'Alien Tourist',
    assetPath: 'avatars/alien-tourist/alien-tourist.glb',
    rig: 'humanoid',
    scale: 1.0,
    nameplateY: 2.3,
    tintMaterials: ['MAT_Accent'],
    effect: null,
    rarity: 'common',
    weight: 10,
    tags: ['alien', 'tourist'],
  },
  {
    id: 'disco-ball-head',
    name: 'Disco Ball Head',
    assetPath: 'avatars/disco-ball-head/disco-ball-head.glb',
    rig: 'humanoid',
    scale: 1.0,
    nameplateY: 2.35,
    tintMaterials: ['MAT_Accent'],
    effect: 'glow-pulse',
    rarity: 'uncommon',
    weight: 5,
    tags: ['party', 'mirror'],
  },
  {
    id: 'low-poly-knight',
    name: 'Low-Poly Knight',
    assetPath: 'avatars/low-poly-knight/low-poly-knight.glb',
    rig: 'humanoid',
    scale: 1.0,
    nameplateY: 2.3,
    tintMaterials: ['MAT_Accent'],
    effect: null,
    rarity: 'common',
    weight: 10,
    tags: ['armor', 'medieval'],
  },

  // --- Wave 2 (Medium / First FX) ---
  {
    id: 'crt-head',
    name: 'CRT Head',
    assetPath: 'avatars/crt-head/crt-head.glb',
    rig: 'humanoid',
    scale: 1.0,
    nameplateY: 2.3,
    tintMaterials: ['MAT_Accent'],
    effect: 'crt-static',
    rarity: 'common',
    weight: 10,
    tags: ['screen-face', 'retro'],
  },
  {
    id: 'cassette-punk',
    name: 'Cassette Punk',
    assetPath: 'avatars/cassette-punk/cassette-punk.glb',
    rig: 'humanoid',
    scale: 1.0,
    nameplateY: 2.3,
    tintMaterials: ['MAT_Accent'],
    effect: 'spin',
    rarity: 'uncommon',
    weight: 5,
    tags: ['music', 'retro'],
  },
  {
    id: 'walking-mushroom',
    name: 'Walking Mushroom',
    assetPath: 'avatars/walking-mushroom/walking-mushroom.glb',
    rig: 'humanoid',
    scale: 1.0,
    nameplateY: 2.35,
    tintMaterials: ['MAT_Accent'],
    effect: 'glow-pulse',
    rarity: 'common',
    weight: 10,
    tags: ['nature', 'fungus'],
  },
  {
    id: 'garden-gnome',
    name: 'Garden Gnome',
    assetPath: 'avatars/garden-gnome/garden-gnome.glb',
    rig: 'humanoid',
    scale: 1.0,
    nameplateY: 2.35,
    tintMaterials: ['MAT_Accent'],
    effect: null,
    rarity: 'common',
    weight: 10,
    tags: ['folk', 'garden'],
  },
  {
    id: 'old-computer',
    name: 'Old Computer',
    assetPath: 'avatars/old-computer/old-computer.glb',
    rig: 'humanoid',
    scale: 1.0,
    nameplateY: 2.3,
    tintMaterials: ['MAT_Accent'],
    effect: 'crt-static',
    rarity: 'uncommon',
    weight: 5,
    tags: ['screen-face', 'vintage'],
  },
  {
    id: 'eyeball-creature',
    name: 'Eyeball Creature',
    assetPath: 'avatars/eyeball-creature/eyeball-creature.glb',
    rig: 'humanoid',
    scale: 1.0,
    nameplateY: 2.3,
    tintMaterials: ['MAT_Accent'],
    effect: 'spin',
    rarity: 'uncommon',
    weight: 5,
    tags: ['creature', 'surreal'],
  },

  // --- Wave 3 (Humanoid Heavy / Complex) ---
  {
    id: 'deep-sea-diver',
    name: 'Deep-Sea Diver',
    assetPath: 'avatars/deep-sea-diver/deep-sea-diver.glb',
    rig: 'humanoid-heavy',
    scale: 1.0,
    nameplateY: 2.35,
    tintMaterials: ['MAT_Accent'],
    effect: 'glow-pulse',
    rarity: 'uncommon',
    weight: 5,
    tags: ['heavy', 'aquatic'],
  },
  {
    id: 'porcelain-doll',
    name: 'Porcelain Doll',
    assetPath: 'avatars/porcelain-doll/porcelain-doll.glb',
    rig: 'humanoid',
    scale: 1.0,
    nameplateY: 2.3,
    tintMaterials: ['MAT_Accent'],
    effect: null,
    rarity: 'rare',
    weight: 2,
    tags: ['antique', 'kintsugi'],
  },
  {
    id: 'cloud-person',
    name: 'Cloud Person',
    assetPath: 'avatars/cloud-person/cloud-person.glb',
    rig: 'humanoid',
    scale: 1.0,
    nameplateY: 2.35,
    tintMaterials: ['MAT_Accent'],
    effect: 'flicker',
    rarity: 'uncommon',
    weight: 5,
    tags: ['elemental', 'weather'],
  },
  {
    id: 'tiny-kaiju',
    name: 'Tiny Kaiju',
    assetPath: 'avatars/tiny-kaiju/tiny-kaiju.glb',
    rig: 'humanoid',
    scale: 1.0,
    nameplateY: 2.3,
    tintMaterials: ['MAT_Accent'],
    effect: null,
    rarity: 'common',
    weight: 10,
    tags: ['monster', 'chibi'],
  },
  {
    id: 'sentient-street-lamp',
    name: 'Sentient Street Lamp',
    assetPath: 'avatars/sentient-street-lamp/sentient-street-lamp.glb',
    rig: 'humanoid-heavy',
    scale: 1.0,
    nameplateY: 2.9,
    tintMaterials: ['MAT_Accent'],
    effect: 'glow-pulse',
    rarity: 'uncommon',
    weight: 5,
    tags: ['urban', 'light'],
  },
  {
    id: 'vending-machine',
    name: 'Vending Machine',
    assetPath: 'avatars/vending-machine/vending-machine.glb',
    rig: 'humanoid-heavy',
    scale: 1.0,
    nameplateY: 2.4,
    tintMaterials: ['MAT_Accent'],
    effect: 'glow-pulse',
    rarity: 'uncommon',
    weight: 5,
    tags: ['heavy', 'urban'],
  },

  // --- Wave 4 (Floating / Specialized) ---
  {
    id: 'neon-jellyfish',
    name: 'Neon Jellyfish',
    assetPath: 'avatars/neon-jellyfish/neon-jellyfish.glb',
    rig: 'floating',
    scale: 1.0,
    nameplateY: 2.4,
    tintMaterials: ['MAT_Accent'],
    effect: 'glow-pulse',
    rarity: 'rare',
    weight: 2,
    tags: ['aquatic', 'luminous'],
  },
  {
    id: 'living-arcade-cabinet',
    name: 'Living Arcade Cabinet',
    assetPath: 'avatars/living-arcade-cabinet/living-arcade-cabinet.glb',
    rig: 'humanoid-heavy',
    scale: 1.0,
    nameplateY: 2.35,
    tintMaterials: ['MAT_Accent'],
    effect: 'crt-static',
    rarity: 'uncommon',
    weight: 5,
    tags: ['arcade', 'retro'],
  },
  {
    id: 'astronaut-fishbowl',
    name: 'Astronaut Fishbowl',
    assetPath: 'avatars/astronaut-fishbowl/astronaut-fishbowl.glb',
    rig: 'humanoid',
    scale: 1.0,
    nameplateY: 2.35,
    tintMaterials: ['MAT_Accent'],
    effect: 'float',
    rarity: 'uncommon',
    weight: 5,
    tags: ['space', 'aquatic'],
  },
  {
    id: 'origami-person',
    name: 'Origami Person',
    assetPath: 'avatars/origami-person/origami-person.glb',
    rig: 'humanoid',
    scale: 1.0,
    nameplateY: 2.3,
    tintMaterials: ['MAT_Accent'],
    effect: null,
    rarity: 'uncommon',
    weight: 5,
    tags: ['paper', 'geometric'],
  },
  {
    id: 'black-hole',
    name: 'Black Hole',
    assetPath: 'avatars/black-hole/black-hole.glb',
    rig: 'floating',
    scale: 1.0,
    nameplateY: 2.35,
    tintMaterials: ['MAT_Accent'],
    effect: 'flicker',
    rarity: 'rare',
    weight: 2,
    tags: ['cosmic', 'abstract'],
  },
  {
    id: 'rubber-duck-mech',
    name: 'Rubber Duck Mech',
    assetPath: 'avatars/rubber-duck-mech/rubber-duck-mech.glb',
    rig: 'humanoid-heavy',
    scale: 1.0,
    nameplateY: 2.4,
    tintMaterials: ['MAT_Accent'],
    effect: null,
    rarity: 'rare',
    weight: 2,
    tags: ['mech', 'playful'],
  },
];

/**
 * Validates a single avatar definition.
 * Throws an Error with descriptive message if validation fails.
 */
export function validateAvatarDefinition(def) {
  if (!def || typeof def !== 'object') {
    throw new Error('Avatar definition must be an object');
  }

  const { id, name, assetPath, rig, scale, nameplateY, tintMaterials, effect, rarity, weight, tags } = def;

  if (typeof id !== 'string' || !/^[a-z0-9-]+$/.test(id)) {
    throw new Error(`Invalid avatar id "${id}": must be non-empty kebab-case string`);
  }

  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new Error(`Avatar ${id}: name must be a non-empty string`);
  }

  const expectedAssetPath = `avatars/${id}/${id}.glb`;
  if (assetPath !== expectedAssetPath) {
    throw new Error(
      `Avatar ${id}: assetPath "${assetPath}" must be confined to "avatars/${id}/${id}.glb" (no parent traversal)`
    );
  }

  if (!VALID_RIG_KINDS.includes(rig)) {
    throw new Error(`Avatar ${id}: unknown rig kind "${rig}". Must be one of: ${VALID_RIG_KINDS.join(', ')}`);
  }

  if (typeof scale !== 'number' || !Number.isFinite(scale) || scale <= 0) {
    throw new Error(`Avatar ${id}: scale must be a positive finite number`);
  }

  if (typeof nameplateY !== 'number' || !Number.isFinite(nameplateY) || nameplateY <= 0) {
    throw new Error(`Avatar ${id}: nameplateY must be a positive finite number`);
  }

  if (!Array.isArray(tintMaterials) || tintMaterials.some((m) => typeof m !== 'string' || m.length === 0)) {
    throw new Error(`Avatar ${id}: tintMaterials must be an array of strings`);
  }

  if (effect !== null && !VALID_EFFECTS.includes(effect)) {
    throw new Error(`Avatar ${id}: unknown effect "${effect}". Must be null or one of: ${VALID_EFFECTS.join(', ')}`);
  }

  if (!VALID_RARITIES.includes(rarity)) {
    throw new Error(`Avatar ${id}: unknown rarity "${rarity}". Must be one of: ${VALID_RARITIES.join(', ')}`);
  }

  if (typeof weight !== 'number' || !Number.isInteger(weight) || weight <= 0) {
    throw new Error(`Avatar ${id}: weight must be a positive integer`);
  }

  if (!Array.isArray(tags) || tags.some((t) => typeof t !== 'string' || t.length === 0)) {
    throw new Error(`Avatar ${id}: tags must be an array of strings`);
  }

  return true;
}

/**
 * Validates a list of avatar definitions, ensuring unique IDs and complete validity.
 */
export function validateAvatarDefinitions(defs) {
  if (!Array.isArray(defs)) {
    throw new Error('Avatar definitions must be an array');
  }

  const seenIds = new Set();
  for (const def of defs) {
    validateAvatarDefinition(def);
    if (seenIds.has(def.id)) {
      throw new Error(`Duplicate avatar id "${def.id}"`);
    }
    seenIds.add(def.id);
  }

  return true;
}

// Self-validate at module evaluation
validateAvatarDefinitions(RAW_AVATAR_DEFINITIONS);

export const AVATAR_DEFINITIONS = deepFreeze(RAW_AVATAR_DEFINITIONS);

const BY_ID = new Map(AVATAR_DEFINITIONS.map((def) => [def.id, def]));

/**
 * Lookup definition by ID. Returns undefined or null if unknown.
 */
export function getAvatarDefinition(id) {
  if (!id || typeof id !== 'string') return null;
  return BY_ID.get(id) || null;
}

/**
 * Normalize avatar ID: returns the id if valid in the manifest, otherwise null.
 */
export function normalizeAvatarId(id) {
  if (!id || typeof id !== 'string') return null;
  return BY_ID.has(id) ? id : null;
}
