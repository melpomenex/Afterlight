/**
 * Canonical World Definitions (introduce-global-world-system D1).
 *
 * This module is pure, deep-frozen data — no Three.js, no DOM, no network imports.
 * It defines the six global Worlds, their 18 variants, reusable asset kits,
 * and view interpretation mappings.
 *
 * World identity is a persistent personal environmental choice that follows
 * the player across compatible places and activities.
 */

const freeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) freeze(value[key]);
  }
  return value;
};

function visuals(row) {
  return {
    sunDisc: 0,
    sunElevation: 0.3,
    sunAzimuth: 0.5,
    ambientColor: null,
    moonDisc: 0,
    aurora: 0,
    auroraColor: '#4be0a6',
    horizonGlow: 0,
    horizonGlowColor: '#ffb46a',
    cloudSharpness: 0.5,
    cloudDrift: 1,
    starDensity: 0,
    milkyWay: 0,
    ...row,
  };
}

const fixedEvents = (lightning, meteor) => ({ lightning: !!lightning, meteor: !!meteor });

const FEATURE_DEFAULTS = Object.freeze({
  water: 0,
  snow: 0,
  fireflies: 0,
  spores: 0,
  dust: 0,
  sandstorm: 0,
  mist: 0,
  birds: 0,
  windStrength: 1,
  grassWind: 1,
  rainParticles: 0,
  lightningDistant: 0,
  cloudDeck: 0,
  cloudSea: 0,
  heatShimmer: 0,
  leafFall: 0,
});

const variant = (row) => freeze({
  weather: 'fixed',
  intensity: 0,
  wind: [0, 0],
  rain: 0,
  cloud: 0.2,
  wetness: 0,
  events: null,
  atmospherePreset: row.preset,
  ...row,
  preset: row.preset,
  visuals: visuals(row.visuals),
  features: { ...FEATURE_DEFAULTS, ...(row.features ?? {}) },
  audio: { rain: 0, roof: 0, wind: 0.1, lowpassHz: 6000, ambience: row.audio?.ambience ?? 'calm', ...(row.audio ?? {}) },
});

// ---------------------------------------------------------------------------
// 1. COASTAL DUSK
// ---------------------------------------------------------------------------
const coastal = freeze({
  id: 'coastal',
  name: 'Coastal Dusk',
  version: 1,
  district: 'COASTAL DISTRICT / 21',
  subtitle: 'WHERE THE LIGHT MEETS THE WATER',
  description: 'The Orpheum stands on a headland while the sun goes down over an open sea.',
  defaultVariant: 'sunset',
  assetKit: ['kit:coastal-rocks', 'kit:coastal-water', 'kit:coastal-vegetation'],
  interpretations: {
    'place:theater': { adapterKey: 'theater:coastal', assetIds: ['kit:coastal-rocks', 'kit:coastal-water'] },
    'activity:kart-royale': { adapterKey: 'kart:coastal', assetIds: [] },
    'activity:snowboard-race': { adapterKey: 'snowboard:coastal', assetIds: [] },
  },
  variants: {
    sunset: variant({
      preset: 'env-coastal-sunset',
      label: 'Coastal Dusk · Sunset',
      intensity: 0.25,
      wind: [0.24, 0.06],
      rain: 0,
      cloud: 0.05,
      wetness: 0.22,
      events: fixedEvents(false, false),
      visuals: {
        fogColor: '#c07d5a', fogDensity: 0.0065, skyColor: '#27386f', groundColor: '#463327',
        hemisphereIntensity: 0.62, ambientColor: '#ffab63',
        sunColor: '#ff8c3a', sunIntensity: 2, exposure: 1.02, skyPhase: 0.68,
        sunDisc: 1, sunElevation: 0.19, sunAzimuth: 3.55, cloudSharpness: 0.45,
        horizonGlow: 1, horizonGlowColor: '#ff6f2e',
      },
      features: { water: 1, mist: 0.45, birds: 0.6, windStrength: 0.85, grassWind: 0.9, cloudDeck: 0.35 },
      audio: { rain: 0, wind: 0.3, lowpassHz: 5200, ambience: 'coastal' },
    }),
    storm: variant({
      preset: 'env-coastal-storm',
      label: 'Coastal Dusk · Tropical Storm',
      intensity: 1,
      wind: [-0.72, 0.38],
      rain: 1,
      cloud: 0.95,
      wetness: 1,
      events: fixedEvents(true, false),
      visuals: {
        fogColor: '#3c4a55', fogDensity: 0.05, skyColor: '#2e3a46', groundColor: '#31404a',
        hemisphereIntensity: 0.5, sunColor: '#9fb0bd', sunIntensity: 0.55, exposure: 0.82, skyPhase: 0.9,
        sunDisc: 0.15, sunElevation: 0.32, sunAzimuth: 3.6, cloudSharpness: 0.85,
        horizonGlow: 0.15, horizonGlowColor: '#7d8c98',
      },
      features: { water: 1, mist: 0.8, birds: 0.1, windStrength: 1.5, grassWind: 1.6, rainParticles: 1, cloudDeck: 1, lightningDistant: 0.3 },
      audio: { rain: 1, wind: 0.7, lowpassHz: 4200, ambience: 'coastal' },
    }),
    midnight: variant({
      preset: 'env-coastal-midnight',
      label: 'Coastal Dusk · Bioluminescent Midnight',
      intensity: 0.15,
      wind: [0.14, 0.04],
      rain: 0,
      cloud: 0.18,
      wetness: 0.4,
      events: fixedEvents(false, true),
      visuals: {
        fogColor: '#0e2233', fogDensity: 0.016, skyColor: '#101c33', groundColor: '#12242c',
        hemisphereIntensity: 0.75, sunColor: '#8fb4d8', sunIntensity: 0.85, exposure: 0.95, skyPhase: 0.86,
        moonDisc: 0.8, sunElevation: 0.5, sunAzimuth: 3.5, starDensity: 1, milkyWay: 0.55,
        horizonGlow: 0.12, horizonGlowColor: '#2e6f86',
      },
      features: { water: 1, mist: 0.55, birds: 0, windStrength: 0.6, fireflies: 0.35, waterGlow: 1, cloudDeck: 0.15 },
      audio: { rain: 0, wind: 0.25, lowpassHz: 4600, ambience: 'coastal-night' },
    }),
  },
});

// ---------------------------------------------------------------------------
// 2. RAINFOREST CANOPY
// ---------------------------------------------------------------------------
const rainforest = freeze({
  id: 'rainforest',
  name: 'Rainforest Canopy',
  version: 1,
  district: 'CANOPY DISTRICT / 22',
  subtitle: 'THE GREEN CATHEDRAL BREATHES',
  description: 'Huge trees close over the Orpheum; mist drifts between the layers and water never stops falling.',
  defaultVariant: 'mist',
  assetKit: ['kit:rainforest-trees', 'kit:rainforest-vegetation', 'kit:rainforest-mist'],
  interpretations: {
    'place:theater': { adapterKey: 'theater:rainforest', assetIds: ['kit:rainforest-trees', 'kit:rainforest-vegetation'] },
    'activity:kart-royale': { adapterKey: 'kart:rainforest', assetIds: [] },
    'activity:snowboard-race': { adapterKey: 'snowboard:rainforest', assetIds: [] },
  },
  variants: {
    mist: variant({
      preset: 'env-rainforest-mist',
      label: 'Rainforest · Morning Mist',
      intensity: 0.2,
      wind: [0.08, 0.03],
      rain: 0.08,
      cloud: 0.5,
      wetness: 0.85,
      events: fixedEvents(false, false),
      visuals: {
        fogColor: '#7fa083', fogDensity: 0.016, skyColor: '#b9d3ad', groundColor: '#33452e',
        hemisphereIntensity: 1.35, sunColor: '#f4e6b4', sunIntensity: 1.7, exposure: 1.0, skyPhase: 0.42,
        sunDisc: 0.35, sunElevation: 0.52, sunAzimuth: 0.38, cloudSharpness: 0.3,
        horizonGlow: 0.35, horizonGlowColor: '#d8e7b0',
      },
      features: { mist: 1, birds: 0.7, spores: 0.5, fireflies: 0.15, windStrength: 0.5, grassWind: 0.7, cloudDeck: 0.2, rainParticles: 0.15 },
      audio: { rain: 0.2, wind: 0.12, lowpassHz: 4200, ambience: 'rainforest' },
    }),
    afternoon: variant({
      preset: 'env-rainforest-afternoon',
      label: 'Rainforest · Afternoon Rain',
      intensity: 0.55,
      wind: [0.18, 0.05],
      rain: 0.62,
      cloud: 0.72,
      wetness: 1,
      events: fixedEvents(false, false),
      visuals: {
        fogColor: '#4f6d5c', fogDensity: 0.018, skyColor: '#7c9880', groundColor: '#2c3d2a',
        hemisphereIntensity: 1.0, sunColor: '#dfe3b4', sunIntensity: 1.25, exposure: 0.95, skyPhase: 0.6,
        sunDisc: 0.12, sunElevation: 0.6, sunAzimuth: 0.45, cloudSharpness: 0.55,
        horizonGlow: 0.18, horizonGlowColor: '#c9d8a8',
      },
      features: { mist: 0.7, birds: 0.3, spores: 0.35, rainParticles: 1, windStrength: 0.75, grassWind: 1, cloudDeck: 0.7 },
      audio: { rain: 0.85, wind: 0.25, lowpassHz: 4200, ambience: 'rainforest-rain' },
    }),
    thunderstorm: variant({
      preset: 'env-rainforest-thunderstorm',
      label: 'Rainforest · Thunderstorm',
      intensity: 1,
      wind: [-0.6, 0.3],
      rain: 1,
      cloud: 1,
      wetness: 1,
      events: fixedEvents(true, true),
      visuals: {
        fogColor: '#33413a', fogDensity: 0.026, skyColor: '#242f2b', groundColor: '#1e2a20',
        hemisphereIntensity: 0.55, sunColor: '#9fb0a0', sunIntensity: 0.4, exposure: 0.78, skyPhase: 0.94,
        sunDisc: 0, cloudSharpness: 0.9, horizonGlow: 0.1, horizonGlowColor: '#6f8a74',
      },
      features: { mist: 0.9, birds: 0, spores: 0.2, rainParticles: 1, windStrength: 1.7, grassWind: 1.8, cloudDeck: 1, lightningDistant: 0.6, leafFall: 0.5 },
      audio: { rain: 1, wind: 0.75, lowpassHz: 3400, ambience: 'rainforest-rain' },
    }),
  },
});

// ---------------------------------------------------------------------------
// 3. ALPINE AURORA
// ---------------------------------------------------------------------------
const alpine = freeze({
  id: 'alpine',
  name: 'Alpine Aurora',
  version: 1,
  district: 'ALPINE DISTRICT / 23',
  subtitle: 'COLD LIGHT OVER THE SNOW',
  description: 'Snow peaks and a frozen basin; the aurora moves above while the Orpheum burns warm.',
  defaultVariant: 'aurora',
  assetKit: ['kit:alpine-conifers', 'kit:alpine-rocks', 'kit:alpine-snow'],
  interpretations: {
    'place:theater': { adapterKey: 'theater:alpine', assetIds: ['kit:alpine-conifers', 'kit:alpine-rocks'] },
    'activity:kart-royale': { adapterKey: 'kart:alpine', assetIds: [] },
    'activity:snowboard-race': { adapterKey: 'snowboard:alpine', assetIds: [] },
  },
  variants: {
    aurora: variant({
      preset: 'env-alpine-aurora',
      label: 'Alpine · Aurora Night',
      intensity: 0.2,
      wind: [0.16, -0.05],
      rain: 0,
      cloud: 0.16,
      wetness: 0,
      events: fixedEvents(false, false),
      visuals: {
        fogColor: '#16243a', fogDensity: 0.009, skyColor: '#0b1730', groundColor: '#5a6b82',
        hemisphereIntensity: 0.9, sunColor: '#b9d2f2', sunIntensity: 0.75, exposure: 1.0, skyPhase: 0.84,
        moonDisc: 0.9, sunElevation: 0.36, sunAzimuth: 0.22, aurora: 1, auroraColor: '#4fe0b0',
        starDensity: 1, milkyWay: 0.7, horizonGlow: 0.14, horizonGlowColor: '#2d5a7a',
      },
      features: { snow: 0.35, windStrength: 0.7, grassWind: 0, cloudDeck: 0.1, aurora: 1, fireflies: 0 },
      audio: { rain: 0, wind: 0.35, lowpassHz: 5000, ambience: 'alpine' },
    }),
    morning: variant({
      preset: 'env-alpine-morning',
      label: 'Alpine · Clear Morning',
      intensity: 0.1,
      wind: [0.12, -0.03],
      rain: 0,
      cloud: 0.08,
      wetness: 0,
      events: fixedEvents(false, false),
      visuals: {
        fogColor: '#c8d8ea', fogDensity: 0.007, skyColor: '#6f9bd8', groundColor: '#b8c6d6',
        hemisphereIntensity: 1.5, sunColor: '#fff1d6', sunIntensity: 2.8, exposure: 1.05, skyPhase: 0.3,
        sunDisc: 0.9, sunElevation: 0.34, sunAzimuth: 0.42, cloudSharpness: 0.6,
        horizonGlow: 0.4, horizonGlowColor: '#ffe6bd',
      },
      features: { snow: 0.25, windStrength: 0.5, grassWind: 0, cloudDeck: 0.25, aurora: 0 },
      audio: { rain: 0, wind: 0.22, lowpassHz: 6000, ambience: 'alpine' },
    }),
    snowfall: variant({
      preset: 'env-alpine-snowfall',
      label: 'Alpine · Snowfall',
      intensity: 0.55,
      wind: [-0.4, 0.2],
      rain: 0,
      cloud: 0.8,
      wetness: 0,
      events: fixedEvents(false, false),
      visuals: {
        fogColor: '#7d8ba0', fogDensity: 0.016, skyColor: '#4a5a72', groundColor: '#8d9aac',
        hemisphereIntensity: 1.05, sunColor: '#cfd9e6', sunIntensity: 1.1, exposure: 0.95, skyPhase: 0.72,
        moonDisc: 0.25, sunElevation: 0.3, sunAzimuth: 0.3, cloudSharpness: 0.45,
        horizonGlow: 0.2, horizonGlowColor: '#aebccb',
      },
      features: { snow: 1, windStrength: 1.15, grassWind: 0, cloudDeck: 0.75 },
      audio: { rain: 0, wind: 0.5, lowpassHz: 5200, ambience: 'alpine-snow' },
    }),
  },
});

// ---------------------------------------------------------------------------
// 4. DESERT OASIS
// ---------------------------------------------------------------------------
const desert = freeze({
  id: 'desert',
  name: 'Desert Oasis',
  version: 1,
  district: 'DUNE DISTRICT / 24',
  subtitle: 'STONE AND LIGHT AND A LONG HORIZON',
  description: 'Mesas rise over the Orpheum; palms and still water gather at the spring.',
  defaultVariant: 'golden',
  assetKit: ['kit:desert-mesas', 'kit:desert-palms', 'kit:desert-sand'],
  interpretations: {
    'place:theater': { adapterKey: 'theater:desert', assetIds: ['kit:desert-mesas', 'kit:desert-palms'] },
    'activity:kart-royale': { adapterKey: 'kart:desert', assetIds: [] },
    'activity:snowboard-race': { adapterKey: 'snowboard:desert', assetIds: [] },
  },
  variants: {
    golden: variant({
      preset: 'env-desert-golden',
      label: 'Desert · Golden Hour',
      intensity: 0.15,
      wind: [0.22, -0.08],
      rain: 0,
      cloud: 0.12,
      wetness: 0,
      events: fixedEvents(false, false),
      visuals: {
        fogColor: '#d9a469', fogDensity: 0.007, skyColor: '#6f7fb0', groundColor: '#a37347',
        hemisphereIntensity: 1.2, sunColor: '#ffcf87', sunIntensity: 3.0, exposure: 1.02, skyPhase: 0.58,
        sunDisc: 1, sunElevation: 0.12, sunAzimuth: 0.72, cloudSharpness: 0.65,
        horizonGlow: 0.8, horizonGlowColor: '#ff9e55',
      },
      features: { water: 0.6, dust: 0.35, birds: 0.3, windStrength: 0.9, grassWind: 0.8, heatShimmer: 0.25, cloudDeck: 0.2 },
      audio: { rain: 0, wind: 0.3, lowpassHz: 5400, ambience: 'desert' },
    }),
    sandstorm: variant({
      preset: 'env-desert-sandstorm',
      label: 'Desert · Sandstorm',
      intensity: 0.9,
      wind: [-0.85, 0.4],
      rain: 0,
      cloud: 0.5,
      wetness: 0,
      events: fixedEvents(false, false),
      visuals: {
        fogColor: '#b07a44', fogDensity: 0.03, skyColor: '#8a6a3e', groundColor: '#8a6236',
        hemisphereIntensity: 0.95, sunColor: '#e8a860', sunIntensity: 1.5, exposure: 0.9, skyPhase: 0.68,
        sunDisc: 0.35, sunElevation: 0.3, sunAzimuth: 0.5, cloudSharpness: 0.4,
        horizonGlow: 0.3, horizonGlowColor: '#c98a4e',
      },
      features: { water: 0.6, dust: 1, sandstorm: 1, birds: 0, windStrength: 1.8, grassWind: 1.6, heatShimmer: 0.4, cloudDeck: 0.8 },
      audio: { rain: 0, wind: 0.85, lowpassHz: 2800, ambience: 'desert-storm' },
    }),
    night: variant({
      preset: 'env-desert-night',
      label: 'Desert · Clear Starry Night',
      intensity: 0.1,
      wind: [0.1, -0.03],
      rain: 0,
      cloud: 0.04,
      wetness: 0,
      events: fixedEvents(false, true),
      visuals: {
        fogColor: '#141b2b', fogDensity: 0.008, skyColor: '#0d1526', groundColor: '#3d3a44',
        hemisphereIntensity: 0.75, sunColor: '#a9c2e4', sunIntensity: 0.8, exposure: 1.0, skyPhase: 0.8,
        moonDisc: 0.85, sunElevation: 0.4, sunAzimuth: 0.2, starDensity: 1, milkyWay: 0.65,
        horizonGlow: 0.1, horizonGlowColor: '#28405f',
      },
      features: { water: 0.6, dust: 0.15, birds: 0, windStrength: 0.5, grassWind: 0.4, cloudDeck: 0.05, fireflies: 0.1 },
      audio: { rain: 0, wind: 0.18, lowpassHz: 5000, ambience: 'desert-night' },
    }),
  },
});

// ---------------------------------------------------------------------------
// 5. ANCIENT REDWOOD FOREST
// ---------------------------------------------------------------------------
const redwood = freeze({
  id: 'redwood',
  name: 'Ancient Redwood Forest',
  version: 1,
  district: 'OLD GROWTH DISTRICT / 25',
  subtitle: 'THE QUIET BETWEEN GIANTS',
  description: 'Trunks wider than rooms rise past the roofline; the Orpheum is small, warm and ancient too.',
  defaultVariant: 'firefly',
  assetKit: ['kit:redwood-trunks', 'kit:redwood-ferns', 'kit:redwood-moss'],
  interpretations: {
    'place:theater': { adapterKey: 'theater:redwood', assetIds: ['kit:redwood-trunks', 'kit:redwood-ferns'] },
    'activity:kart-royale': { adapterKey: 'kart:redwood', assetIds: [] },
    'activity:snowboard-race': { adapterKey: 'snowboard:redwood', assetIds: [] },
  },
  variants: {
    firefly: variant({
      preset: 'env-redwood-firefly',
      label: 'Redwood · Firefly Night',
      intensity: 0.12,
      wind: [0.06, 0.02],
      rain: 0,
      cloud: 0.12,
      wetness: 0.35,
      events: fixedEvents(false, false),
      visuals: {
        fogColor: '#6c7c78', fogDensity: 0.015, skyColor: '#68828c', groundColor: '#283228',
        hemisphereIntensity: 0.90, sunColor: '#c4d8da', sunIntensity: 1.0, exposure: 0.98, skyPhase: 0.85,
        moonDisc: 0.7, sunElevation: 0.42, sunAzimuth: 0.24, starDensity: 0.8, milkyWay: 0.3,
        horizonGlow: 0.08, horizonGlowColor: '#445a56',
      },
      features: { fireflies: 1, spores: 0.4, mist: 0.75, birds: 0, windStrength: 0.45, grassWind: 0.5, cloudDeck: 0.05, water: 0.5 },
      audio: { rain: 0, wind: 0.15, lowpassHz: 4200, ambience: 'redwood-night' },
    }),
    fog: variant({
      preset: 'env-redwood-fog',
      label: 'Redwood · Morning Fog',
      intensity: 0.18,
      wind: [0.05, 0.02],
      rain: 0.04,
      cloud: 0.35,
      wetness: 0.8,
      events: fixedEvents(false, false),
      visuals: {
        fogColor: '#9aa89a', fogDensity: 0.024, skyColor: '#c2cdbd', groundColor: '#37402f',
        hemisphereIntensity: 1.2, sunColor: '#f0e8c8', sunIntensity: 1.5, exposure: 0.98, skyPhase: 0.36,
        sunDisc: 0.3, sunElevation: 0.42, sunAzimuth: 0.4, cloudSharpness: 0.25,
        horizonGlow: 0.4, horizonGlowColor: '#d9dfc0',
      },
      features: { mist: 1, spores: 0.6, birds: 0.5, windStrength: 0.4, grassWind: 0.6, cloudDeck: 0.15, water: 0.5 },
      audio: { rain: 0.1, wind: 0.12, lowpassHz: 3600, ambience: 'redwood' },
    }),
    sunshafts: variant({
      preset: 'env-redwood-sunshafts',
      label: 'Redwood · Afternoon Sunshafts',
      intensity: 0.15,
      wind: [0.1, 0.03],
      rain: 0,
      cloud: 0.15,
      wetness: 0.25,
      events: fixedEvents(false, false),
      visuals: {
        fogColor: '#7d7f5e', fogDensity: 0.013, skyColor: '#8fa88a', groundColor: '#3c4429',
        hemisphereIntensity: 1.25, sunColor: '#ffe2a0', sunIntensity: 2.1, exposure: 1.02, skyPhase: 0.52,
        sunDisc: 0.5, sunElevation: 0.34, sunAzimuth: 0.55, cloudSharpness: 0.5,
        horizonGlow: 0.5, horizonGlowColor: '#e8cf92',
      },
      features: { mist: 0.55, spores: 0.8, birds: 0.4, windStrength: 0.5, grassWind: 0.7, cloudDeck: 0.1, water: 0.5, leafFall: 0.3 },
      audio: { rain: 0, wind: 0.14, lowpassHz: 4600, ambience: 'redwood' },
    }),
  },
});

// ---------------------------------------------------------------------------
// 6. CLOUD GARDEN
// ---------------------------------------------------------------------------
const cloud = freeze({
  id: 'cloud',
  name: 'Cloud Garden',
  version: 1,
  district: 'SKY GARDEN DISTRICT / 26',
  subtitle: 'AN ISLAND IN AN OCEAN OF CLOUD',
  description: 'Grass and flowers on floating stone, high above a cloud sea that never ends.',
  defaultVariant: 'sunrise',
  assetKit: ['kit:cloud-islands', 'kit:cloud-sea', 'kit:cloud-flora'],
  interpretations: {
    'place:theater': { adapterKey: 'theater:cloud', assetIds: ['kit:cloud-islands', 'kit:cloud-sea'] },
    'activity:kart-royale': { adapterKey: 'kart:cloud', assetIds: [] },
    'activity:snowboard-race': { adapterKey: 'snowboard:cloud', assetIds: [] },
  },
  variants: {
    sunrise: variant({
      preset: 'env-cloud-sunrise',
      label: 'Cloud Garden · Sunrise',
      intensity: 0.18,
      wind: [0.28, 0.08],
      rain: 0,
      cloud: 0.4,
      wetness: 0.5,
      events: fixedEvents(false, false),
      visuals: {
        fogColor: '#f4ceb8', fogDensity: 0.0052, skyColor: '#788ed6', groundColor: '#4a6e34',
        hemisphereIntensity: 1.52, sunColor: '#ffd6a8', sunIntensity: 2.65, exposure: 1.04, skyPhase: 0.62,
        sunDisc: 0.9, sunElevation: 0.17, sunAzimuth: 0.42, cloudSharpness: 0.65,
        horizonGlow: 0.82, horizonGlowColor: '#ffa266',
      },
      features: { cloudSea: 1, mist: 0.5, birds: 0.7, windStrength: 0.8, grassWind: 1.05, cloudDeck: 0.5, water: 0.7, spores: 0.25 },
      audio: { rain: 0, wind: 0.32, lowpassHz: 5600, ambience: 'cloud' },
    }),
    day: variant({
      preset: 'env-cloud-day',
      label: 'Cloud Garden · Bright Day',
      intensity: 0.22,
      wind: [0.32, 0.1],
      rain: 0,
      cloud: 0.3,
      wetness: 0.3,
      events: fixedEvents(false, false),
      visuals: {
        fogColor: '#cfe0ea', fogDensity: 0.007, skyColor: '#5f8fd8', groundColor: '#7fa05e',
        hemisphereIntensity: 1.6, sunColor: '#fff2cf', sunIntensity: 3.1, exposure: 1.06, skyPhase: 0.4,
        sunDisc: 0.85, sunElevation: 0.62, sunAzimuth: 0.3, cloudSharpness: 0.62,
        horizonGlow: 0.45, horizonGlowColor: '#ffe9bd',
      },
      features: { cloudSea: 1, mist: 0.35, birds: 0.9, windStrength: 0.9, grassWind: 1.15, cloudDeck: 0.35, water: 0.7, spores: 0.3 },
      audio: { rain: 0, wind: 0.28, lowpassHz: 6200, ambience: 'cloud' },
    }),
    storm: variant({
      preset: 'env-cloud-storm',
      label: 'Cloud Garden · Storm Below',
      intensity: 0.6,
      wind: [-0.5, 0.25],
      rain: 0.25,
      cloud: 0.85,
      wetness: 0.9,
      events: fixedEvents(false, false),
      visuals: {
        fogColor: '#4a5468', fogDensity: 0.012, skyColor: '#2f3a52', groundColor: '#42504a',
        hemisphereIntensity: 0.85, sunColor: '#c0c8d4', sunIntensity: 1.2, exposure: 0.9, skyPhase: 0.88,
        sunDisc: 0.15, sunElevation: 0.3, sunAzimuth: 0.2, cloudSharpness: 0.5,
        horizonGlow: 0.15, horizonGlowColor: '#8d94a8',
      },
      features: { cloudSea: 1, mist: 0.8, birds: 0.15, windStrength: 1.6, grassWind: 1.7, rainParticles: 0.6, cloudDeck: 1, lightningDistant: 1, stormBelow: 1 },
      audio: { rain: 0.4, wind: 0.8, lowpassHz: 3600, ambience: 'cloud-storm' },
    }),
  },
});

export const WORLD_DEFINITIONS = freeze({
  coastal,
  rainforest,
  alpine,
  desert,
  redwood,
  cloud,
});

export const WORLD_IDS = Object.freeze(Object.keys(WORLD_DEFINITIONS));
export const DEFAULT_WORLD_ID = 'coastal';
export const DEFAULT_WORLD_VARIANT = 'sunset';

export const WORLD_DEFAULT_PRESETS = Object.freeze(
  WORLD_IDS.map((id) => WORLD_DEFINITIONS[id].variants[WORLD_DEFINITIONS[id].defaultVariant].preset),
);

export function getWorldDefinition(id) {
  return Object.prototype.hasOwnProperty.call(WORLD_DEFINITIONS, id) ? WORLD_DEFINITIONS[id] : null;
}

export function getWorldVariant(worldId, variantId) {
  const world = getWorldDefinition(worldId);
  if (!world) return null;
  const key = variantId ?? world.defaultVariant;
  return Object.prototype.hasOwnProperty.call(world.variants, key) ? world.variants[key] : null;
}

export function worldVariantEntries() {
  const entries = [];
  for (const [worldId, world] of Object.entries(WORLD_DEFINITIONS)) {
    for (const [variantId, row] of Object.entries(world.variants)) {
      entries.push({ worldId, variantId, row });
    }
  }
  return entries;
}

export function worldVariantPreset(worldId, variantId) {
  return getWorldVariant(worldId, variantId)?.preset ?? null;
}

export function worldForPreset(presetId) {
  if (typeof presetId !== 'string') return null;
  for (const { worldId, variantId, row } of worldVariantEntries()) {
    if (row.preset === presetId) return { worldId, variantId, row };
  }
  return null;
}

export function isWorldPreset(presetId) {
  return worldForPreset(presetId) !== null;
}

export function randomWorldSelection(rng = Math.random) {
  const worldId = WORLD_IDS[Math.floor(rng() * WORLD_IDS.length)] ?? DEFAULT_WORLD_ID;
  const def = getWorldDefinition(worldId);
  return {
    worldId,
    variantId: def?.defaultVariant ?? DEFAULT_WORLD_VARIANT,
  };
}

export function validateWorldDefinitions(definitions = WORLD_DEFINITIONS) {
  const problems = [];
  const seenPresets = new Set();
  for (const [worldId, world] of Object.entries(definitions)) {
    if (world.id !== worldId) problems.push(`${worldId}: id must match its key`);
    if (!world.name) problems.push(`${worldId}: name is required`);
    if (world.version !== 1) problems.push(`${worldId}: version must be 1`);
    if (!Array.isArray(world.assetKit)) problems.push(`${worldId}: assetKit must be an array`);
    if (!world.interpretations || typeof world.interpretations !== 'object') {
      problems.push(`${worldId}: interpretations must be an object`);
    }
    if (!world.variants || typeof world.variants !== 'object') {
      problems.push(`${worldId}: variants are required`);
      continue;
    }
    const variantIds = Object.keys(world.variants);
    if (variantIds.length < 1) problems.push(`${worldId}: at least one variant is required`);
    if (!variantIds.includes(world.defaultVariant)) problems.push(`${worldId}: defaultVariant must name a variant`);
    for (const [variantId, row] of Object.entries(world.variants)) {
      const at = (ok, message) => { if (!ok) problems.push(`${worldId}.${variantId}: ${message}`); };
      at(typeof row.preset === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(row.preset), 'preset must be kebab-case');
      at(row.atmospherePreset === row.preset, 'atmospherePreset must match preset');
      at(!seenPresets.has(row.preset), `duplicate preset id ${row.preset}`);
      seenPresets.add(row.preset);
      at(['fixed', 'scheduled'].includes(row.weather), 'weather must be fixed or scheduled');
      at(Number.isFinite(row.intensity) && row.intensity >= 0 && row.intensity <= 1, 'intensity must be in [0, 1]');
      at(Array.isArray(row.wind) && row.wind.length === 2 && row.wind.every((w) => Number.isFinite(w)), 'wind must be two finite numbers');
      at(Number.isFinite(row.rain) && row.rain >= 0 && row.rain <= 1, 'rain must be in [0, 1]');
      at(row.visuals && typeof row.visuals === 'object', 'visuals are required');
      at(row.features && typeof row.features === 'object', 'features are required');
    }
  }
  return problems;
}
