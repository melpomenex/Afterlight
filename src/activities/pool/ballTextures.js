/**
 * Procedural billiard ball texture generator for Three.js.
 * Generates accurate, readable canvas textures for balls 0 through 15:
 *   - 0: Cue ball (ivory with red orientation dot)
 *   - 1..7: Solids (Yellow, Blue, Red, Purple, Orange, Green, Maroon)
 *   - 8: Eight-ball (Solid Black)
 *   - 9..15: Stripes (matching colors on white field)
 *
 * Each ball features dual equatorial number badges with high-contrast digits.
 * Safe in browser and headless Node/Three test environments.
 */

import * as THREE from 'three';

export const BALL_COLORS = Object.freeze({
  0: '#f5f5f0', // Cue ball
  1: '#f2be22', // 1: Yellow
  2: '#1a56b0', // 2: Blue
  3: '#c72c3b', // 3: Red
  4: '#62357a', // 4: Purple
  5: '#db5a23', // 5: Orange
  6: '#22783e', // 6: Green
  7: '#591e2b', // 7: Maroon
  8: '#141416', // 8: Black
  9: '#f2be22', // 9: Yellow Stripe
  10: '#1a56b0', // 10: Blue Stripe
  11: '#c72c3b', // 11: Red Stripe
  12: '#62357a', // 12: Purple Stripe
  13: '#db5a23', // 13: Orange Stripe
  14: '#22783e', // 14: Green Stripe
  15: '#591e2b', // 15: Maroon Stripe
});

const TEXTURE_WIDTH = 256;
const TEXTURE_HEIGHT = 128;

const textureCache = new Map();

/**
 * Creates or retrieves a cached CanvasTexture for a ball number (0..15).
 * @param {number} ballNumber
 * @returns {THREE.CanvasTexture|THREE.Texture}
 */
export function getBallTexture(ballNumber) {
  const num = Math.max(0, Math.min(15, Math.floor(ballNumber)));
  if (textureCache.has(num)) {
    return textureCache.get(num);
  }

  // Headless / SSR safety check
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    const fallback = new THREE.DataTexture(new Uint8Array([240, 240, 240, 255]), 1, 1);
    fallback.needsUpdate = true;
    textureCache.set(num, fallback);
    return fallback;
  }

  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_WIDTH;
  canvas.height = TEXTURE_HEIGHT;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    const fallback = new THREE.Texture();
    textureCache.set(num, fallback);
    return fallback;
  }

  const color = BALL_COLORS[num] || '#ffffff';
  const isStripe = num >= 9 && num <= 15;
  const isCue = num === 0;

  if (isCue) {
    // Ivory base
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

    // Red aim/spin dot
    ctx.fillStyle = '#cc2222';
    ctx.beginPath();
    ctx.arc(TEXTURE_WIDTH * 0.25, TEXTURE_HEIGHT * 0.5, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (isStripe) {
    // White background
    ctx.fillStyle = '#f8f8f6';
    ctx.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

    // Wide equatorial color stripe
    ctx.fillStyle = color;
    const stripeTop = TEXTURE_HEIGHT * 0.22;
    const stripeHeight = TEXTURE_HEIGHT * 0.56;
    ctx.fillRect(0, stripeTop, TEXTURE_WIDTH, stripeHeight);

    // Number badges (left and right hemispheres)
    drawNumberBadge(ctx, num, TEXTURE_WIDTH * 0.25, TEXTURE_HEIGHT * 0.5);
    drawNumberBadge(ctx, num, TEXTURE_WIDTH * 0.75, TEXTURE_HEIGHT * 0.5);
  } else {
    // Solid color
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

    // Number badges
    drawNumberBadge(ctx, num, TEXTURE_WIDTH * 0.25, TEXTURE_HEIGHT * 0.5);
    drawNumberBadge(ctx, num, TEXTURE_WIDTH * 0.75, TEXTURE_HEIGHT * 0.5);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(num, texture);
  return texture;
}

/**
 * Draws a circular white badge with black ball number.
 */
function drawNumberBadge(ctx, num, x, y) {
  const radius = 18;

  // White circular badge
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Thin outer border
  ctx.strokeStyle = '#222222';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Number text
  ctx.fillStyle = '#0a0a0c';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(num), x, y + 0.5);

  // Underline for 6 and 9
  if (num === 6 || num === 9) {
    ctx.strokeStyle = '#0a0a0c';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 5, y + 8);
    ctx.lineTo(x + 5, y + 8);
    ctx.stroke();
  }
}

/**
 * Clears cached ball textures (useful in tests or when cleaning up).
 */
export function clearBallTextureCache() {
  for (const tex of textureCache.values()) {
    try {
      tex.dispose?.();
    } catch {}
  }
  textureCache.clear();
}
