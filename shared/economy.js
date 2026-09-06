/**
 * Shared economy math, price bounds, fees, and supply/demand modifiers.
 */

import { CROPS, QUALITY_MULTIPLIERS } from './crops.js';

export const ECONOMY = {
  FEE_RATE: 0.02, // 2% trading fee on order book sales
  MIN_PRICE_MULTIPLIER: 0.4,
  MAX_PRICE_MULTIPLIER: 2.5,
  MEAN_REVERSION_RATE: 0.05, // Drifts 5% back toward 1.0 each market cycle
  VOLUME_SENSITIVITY: 0.03, // Price impact per net unit traded
};

/**
 * Calculates current NPC instant sell price (bid) given base price, market multiplier, and quality.
 */
export function calculateNpcSellPrice(cropId, quality = 'B', marketMultiplier = 1.0) {
  const crop = CROPS[cropId];
  if (!crop) return 0;
  const qualMult = QUALITY_MULTIPLIERS[quality] ?? 1.0;
  // NPC instant buyback operates with a 15% liquidity spread discount below market spot
  const unitPrice = Math.max(1, Math.round(crop.basePrice * marketMultiplier * qualMult * 0.85));
  return unitPrice;
}

/**
 * Calculates current NPC seed purchase price.
 */
export function calculateNpcSeedPrice(cropId, marketMultiplier = 1.0) {
  const crop = CROPS[cropId];
  if (!crop) return 0;
  // Seeds scale gently with market demand (damped by 0.5)
  const dampedMultiplier = 1.0 + (marketMultiplier - 1.0) * 0.4;
  return Math.max(1, Math.round(crop.seedCost * dampedMultiplier));
}

/**
 * Bounds market multipliers to keep price swings reasonable.
 */
export function clampMultiplier(mult) {
  return Math.max(ECONOMY.MIN_PRICE_MULTIPLIER, Math.min(ECONOMY.MAX_PRICE_MULTIPLIER, mult));
}

/**
 * Computes updated multiplier based on net volume traded and mean reversion.
 */
export function updateMarketMultiplier(currentMult, netDemand) {
  // netDemand: positive means buyers/demand > supply; negative means oversupply
  let mult = currentMult + netDemand * ECONOMY.VOLUME_SENSITIVITY;
  // Mean reversion step
  mult = mult + (1.0 - mult) * ECONOMY.MEAN_REVERSION_RATE;
  return Number(clampMultiplier(mult).toFixed(3));
}
