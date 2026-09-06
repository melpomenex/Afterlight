/**
 * Shared crop catalog and configuration for the multiplayer market-gardening system.
 */

export const CROPS = {
  radish: {
    id: 'radish',
    name: 'Red Radish',
    tagline: 'Crisp peppery roots, fast to harvest.',
    seedCost: 4,
    basePrice: 8,
    growDuration: 25, // seconds for prototype testing
    waterDemand: 1.0,
    yield: 2,
    repeatHarvest: false,
    color: '#4d8050',
    produceColor: '#c93b4a',
    xp: 12,
    unlockLevel: 1,
  },
  lettuce: {
    id: 'lettuce',
    name: 'Rain Crisp Lettuce',
    tagline: 'Tender layered greens favored by market cafes.',
    seedCost: 6,
    basePrice: 12,
    growDuration: 40,
    waterDemand: 1.2,
    yield: 2,
    repeatHarvest: false,
    color: '#65a759',
    produceColor: '#83cf72',
    xp: 18,
    unlockLevel: 1,
  },
  carrot: {
    id: 'carrot',
    name: 'Amber Carrot',
    tagline: 'Deep sweet orange taproots grown in dark tilled soil.',
    seedCost: 8,
    basePrice: 17,
    growDuration: 60,
    waterDemand: 0.9,
    yield: 2,
    repeatHarvest: false,
    color: '#498845',
    produceColor: '#e07a2a',
    xp: 25,
    unlockLevel: 1,
  },
  kale: {
    id: 'kale',
    name: 'Winter Kale',
    tagline: 'Hearty ruffled brassica that thrives in cold rain.',
    seedCost: 12,
    basePrice: 24,
    growDuration: 80,
    waterDemand: 0.8,
    yield: 3,
    repeatHarvest: false,
    color: '#2d6148',
    produceColor: '#3d785a',
    xp: 32,
    unlockLevel: 2,
  },
  basil: {
    id: 'basil',
    name: 'Copper Basil',
    tagline: 'Aromatic dark purple-green leaves prized by the apothecary.',
    seedCost: 15,
    basePrice: 32,
    growDuration: 100,
    waterDemand: 1.3,
    yield: 3,
    repeatHarvest: false,
    color: '#425a40',
    produceColor: '#7b3e64',
    xp: 40,
    unlockLevel: 2,
  },
  tomato: {
    id: 'tomato',
    name: 'Lantern Tomato',
    tagline: 'Heavy climbing vine with glowing scarlet fruit. Continues bearing.',
    seedCost: 22,
    basePrice: 28,
    growDuration: 120,
    waterDemand: 1.1,
    yield: 3,
    repeatHarvest: true,
    regrowDuration: 45,
    color: '#3f7842',
    produceColor: '#d6422f',
    xp: 50,
    unlockLevel: 3,
  },
  strawberry: {
    id: 'strawberry',
    name: 'Dew Strawberry',
    tagline: 'Low creeping runners with bright sweet red berries.',
    seedCost: 28,
    basePrice: 38,
    growDuration: 140,
    waterDemand: 1.4,
    yield: 4,
    repeatHarvest: true,
    regrowDuration: 50,
    color: '#39784b',
    produceColor: '#e6324b',
    xp: 65,
    unlockLevel: 3,
  },
};

export const CROP_LIST = Object.values(CROPS);

export const GROWTH_STAGES = {
  EMPTY: 0,
  PREPARED: 1,
  SEED: 2,
  SPROUT: 3,
  JUVENILE: 4,
  MATURE: 5,
  HARVESTABLE: 6,
};

export function getGrowthStage(plantedAt, duration, now = Date.now()) {
  if (!plantedAt) return GROWTH_STAGES.PREPARED;
  const elapsed = (now - plantedAt) / 1000;
  const progress = Math.min(elapsed / duration, 1.0);

  if (progress < 0.15) return GROWTH_STAGES.SEED;
  if (progress < 0.45) return GROWTH_STAGES.SPROUT;
  if (progress < 0.75) return GROWTH_STAGES.JUVENILE;
  if (progress < 1.0) return GROWTH_STAGES.MATURE;
  return GROWTH_STAGES.HARVESTABLE;
}

export function calculateQuality(moistureHistory = 1.0, health = 1.0) {
  const score = moistureHistory * 0.6 + health * 0.4;
  if (score >= 0.9) return 'A+';
  if (score >= 0.75) return 'A';
  if (score >= 0.55) return 'B';
  return 'C';
}

export const QUALITY_MULTIPLIERS = {
  'C': 0.8,
  'B': 1.0,
  'A': 1.35,
  'A+': 1.8,
};
