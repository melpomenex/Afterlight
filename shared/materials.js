/**
 * Shared materials catalog, processed goods, gather-node placement, and machine
 * definitions for the crafting/gathering loop.
 *
 * Gather nodes follow the garden-bed pattern: definitions live here in shared
 * code, depletion state lives on the server, and the client renders whatever
 * state the server reports. Node positions are hand-placed inside each
 * district's existing walkable bounds with clear standing spots on at least
 * two sides (AGENTS.md §6 contracts).
 */

export const MATERIALS = {
  copper: {
    id: 'copper',
    name: 'Copper Scrap',
    tagline: 'Pipe stubs and verdigris sheeting pried from the foundry floor.',
    color: '#c07840',
    glowColor: '#e8934a',
    district: 'foundry',
  },
  timber: {
    id: 'timber',
    name: 'Trestle Timber',
    tagline: 'Sound oak beams cut free of the overgrown viaduct.',
    color: '#7a5a38',
    glowColor: '#c9a05e',
    district: 'trestle',
  },
  glass: {
    id: 'glass',
    name: 'Glass Shards',
    tagline: 'Thick panes of uncracked glass swept from the frost-line benches.',
    color: '#9fc4d8',
    glowColor: '#cfeaf7',
    district: 'frost-spire',
  },
};

export const MATERIAL_LIST = Object.values(MATERIALS);

/**
 * Processed goods: crafted items that trade like produce but have no growth
 * stages and (in this slice) no quality grades. Flour is milled from wheat
 * 1:1; its base price sits above wheat's (9) so milling is net-positive
 * before fees without making raw-wheat sales obsolete.
 */
export const GOODS = {
  flour: {
    id: 'flour',
    name: 'Stone-Ground Flour',
    tagline: 'Fine milled flour from the Great Mill. Bakers pay a premium.',
    basePrice: 14,
  },
};

export const GOOD_LIST = Object.values(GOODS);

/**
 * The Great Mill's restoration bill. Any player may contribute; the server
 * clamps contributions to the remaining need per material.
 */
export const MILL_REQUIREMENT = {
  copper: 4,
  timber: 4,
  glass: 4,
};

/**
 * Craftable garden fixture. Placed on a bed tile; covers the occupied bed
 * plus its orthogonal neighbors in the 4x3 bed grid.
 */
export const SPRINKLER = {
  id: 'sprinkler',
  name: 'Garden Sprinkler',
  cost: { copper: 2, glass: 2 },
  maxPerGarden: 3,
};

/**
 * Server-owned gather nodes. `position` is [x, z] on the district floor.
 * `respawnMs` is the fixed interval before a depleted node becomes available
 * again; depletion timestamps are persisted so restarts cannot be used to
 * farm a node repeatedly.
 */
export const MATERIAL_NODES = [
  // Rustfall Foundry (foundry) — copper between the slag troughs and hearth
  { id: 'foundry_copper_1', district: 'foundry', material: 'copper', position: [4, 2.5], respawnMs: 180000 },
  { id: 'foundry_copper_2', district: 'foundry', material: 'copper', position: [8.5, 1], respawnMs: 180000 },
  { id: 'foundry_copper_3', district: 'foundry', material: 'copper', position: [-3.5, 2.5], respawnMs: 180000 },
  // Overgrown Trestle (trestle) — timberfallen beams clear of the viaduct piers
  { id: 'trestle_timber_1', district: 'trestle', material: 'timber', position: [6.5, 2], respawnMs: 180000 },
  { id: 'trestle_timber_2', district: 'trestle', material: 'timber', position: [2.5, -2], respawnMs: 180000 },
  { id: 'trestle_timber_3', district: 'trestle', material: 'timber', position: [-3.5, -2], respawnMs: 180000 },
  // Glacial Glasshouse (frost-spire) — glass shards off the conservatory arches
  { id: 'glasshouse_glass_1', district: 'frost-spire', material: 'glass', position: [8.5, 2.5], respawnMs: 180000 },
  { id: 'glasshouse_glass_2', district: 'frost-spire', material: 'glass', position: [-3, 0.5], respawnMs: 180000 },
  { id: 'glasshouse_glass_3', district: 'frost-spire', material: 'glass', position: [2.5, 3.5], respawnMs: 180000 },
];
