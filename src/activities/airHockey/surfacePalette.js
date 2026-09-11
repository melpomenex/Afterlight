export const AIR_HOCKEY_SURFACE_PALETTE = Object.freeze({
  bed: '#8fa3b0',
  dots: '#7c909d',
  red: '#971d22',
  cyan: '#0a5374',
});

export const AIR_HOCKEY_SURFACE_BOUNDS = Object.freeze({
  bedLuminanceMin: 0.22,
  bedLuminanceMax: 0.42,
  minRoughness: 0.45,
  maxMetalness: 0.1,
  minMarkingContrast: 3.0,
});

export const AIR_HOCKEY_BED_FINISH = Object.freeze({
  roughness: 0.55,
  metalness: 0.02,
});

function hexToRgb(hex) {
  const value = String(hex ?? '').trim().replace(/^#/, '');
  const full = value.length === 3
    ? value.split('').map((channel) => channel + channel).join('')
    : value;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function srgbToLinear(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

export function contrastRatio(hexA, hexB) {
  const a = relativeLuminance(hexA);
  const b = relativeLuminance(hexB);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}
