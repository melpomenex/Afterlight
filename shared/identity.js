/**
 * Player identity utilities: guest tokens, atmospheric nickname generation, sanitization, and color derivation.
 */

const ADJECTIVES = [
  'Quiet', 'Copper', 'Rainy', 'Amber', 'Misty', 'Rust', 'Golden', 'Silver',
  'Cobble', 'Breezy', 'Dusky', 'Dappled', 'Gilded', 'Pebble', 'Gleaming', 'Iron',
  'Slate', 'Cinder', 'Ember', 'Tidal', 'Steady', 'Bright', 'Hollow', 'Autumnal',
];

// Machine/urban nouns only: Afterlight is a city of lanterns, signals and
// foundries, not a garden.
const MACHINE_NOUNS = [
  'Lantern', 'Kestrel', 'Compass', 'Signal', 'Beacon', 'Relay', 'Foundry', 'Quarry',
  'Anvil', 'Cog', 'Piston', 'Whistle', 'Prism', 'Sparrow', 'Tram', 'Bellows',
  'Lattice', 'Sprocket', 'Gantry', 'Conduit',
];

export function generateDefaultNickname(seed = Math.random()) {
  const adjIdx = Math.floor(Math.abs(Math.sin(seed * 999)) * ADJECTIVES.length);
  const nounIdx = Math.floor(Math.abs(Math.cos(seed * 888)) * MACHINE_NOUNS.length);
  const num = Math.floor(Math.abs(Math.sin(seed * 777)) * 90) + 10;
  return `${ADJECTIVES[adjIdx]}${MACHINE_NOUNS[nounIdx]}${num}`;
}

export function sanitizeNickname(input) {
  if (typeof input !== 'string') return generateDefaultNickname();
  // Strip HTML tags and control characters
  let clean = input.replace(/<[^>]*>/g, '').replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
  // Remove multiple adjacent spaces and non-word characters except dashes and underscores
  clean = clean.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
  if (clean.length > 20) {
    clean = clean.slice(0, 20).trim();
  }
  if (clean.length < 3) {
    return generateDefaultNickname();
  }
  return clean;
}

export function resolveDuplicateNickname(desired, activeNicknames = new Set()) {
  const base = sanitizeNickname(desired);
  if (!activeNicknames.has(base.toLowerCase())) {
    return base;
  }
  for (let i = 2; i <= 99; i++) {
    const candidate = `${base}${i}`;
    if (!activeNicknames.has(candidate.toLowerCase())) {
      return candidate;
    }
  }
  return `${base}${Math.floor(Math.random() * 900 + 100)}`;
}

export function generatePlayerPalette(id = '') {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  const palettes = [
    { coat: '#7a4e32', apron: '#b8a682', hat: '#473d32', boots: '#2b231c' },
    { coat: '#3a5449', apron: '#c2bca3', hat: '#2d3f37', boots: '#202924' },
    { coat: '#3d4b60', apron: '#b5b29c', hat: '#2a3547', boots: '#1c222e' },
    { coat: '#634b6b', apron: '#bfb5a3', hat: '#44324a', boots: '#251c29' },
    { coat: '#806835', apron: '#ccc4a7', hat: '#544320', boots: '#2e2411' },
    { coat: '#445e38', apron: '#b8b498', hat: '#314427', boots: '#1f2b18' },
  ];
  return palettes[hash % palettes.length];
}
