import test from 'node:test';
import assert from 'node:assert/strict';
import { Storage } from '../server/storage.js';
import { EconomyManager } from '../server/economy.js';
import { calculateNpcSellPrice, calculateNpcSeedPrice, clampMultiplier, updateMarketMultiplier } from '../shared/economy.js';

test('NPC reference pricing scales with quality and market multiplier', () => {
  // Radish basePrice = 8
  // Grade B at 1.0x mult: 8 * 1.0 * 1.0 * 0.85 = 6.8 -> rounded to 7
  const priceB = calculateNpcSellPrice('radish', 'B', 1.0);
  assert.equal(priceB, 7);

  // Grade A+ at 1.0x mult: 8 * 1.0 * 1.8 * 0.85 = 12.24 -> rounded to 12
  const priceAPlus = calculateNpcSellPrice('radish', 'A+', 1.0);
  assert.equal(priceAPlus, 12);

  // High market demand (1.5x)
  const priceHigh = calculateNpcSellPrice('radish', 'B', 1.5);
  assert.ok(priceHigh > priceB);
});

test('NPC seed purchase price calculation and bounds', () => {
  // Radish seedCost = 4
  const seedPriceBase = calculateNpcSeedPrice('radish', 1.0);
  assert.equal(seedPriceBase, 4);

  const clampedMin = clampMultiplier(0.1);
  assert.equal(clampedMin, 0.4);

  const clampedMax = clampMultiplier(99.0);
  assert.equal(clampedMax, 2.5);
});

test('EconomyManager NPC buy seeds and sell produce transactions', () => {
  const tempPath = `/tmp/test-economy-${Date.now()}.json`;
  const storage = new Storage(tempPath);
  const manager = new EconomyManager(storage);

  const player = {
    id: 'eco_tester_1',
    coins: 100,
    xp: 0,
    inventory: {
      seeds: {},
      produce: {
        'radish_B': 10,
      },
    },
  };

  // 1. Buy seeds
  const buyRes = manager.npcBuySeed(player, 'radish', 5);
  assert.equal(buyRes.success, true);
  assert.equal(player.inventory.seeds.radish, 5);
  assert.ok(player.coins < 100);

  // Insufficient coins
  player.coins = 2;
  const failBuy = manager.npcBuySeed(player, 'strawberry', 5);
  assert.equal(failBuy.success, false);
  assert.equal(failBuy.reason, 'insufficient_coins');

  // 2. Sell produce
  player.coins = 10;
  const sellRes = manager.npcSell(player, 'radish', 'B', 4);
  assert.equal(sellRes.success, true);
  assert.equal(player.inventory.produce['radish_B'], 6);
  assert.ok(player.coins > 10);

  // Insufficient produce
  const failSell = manager.npcSell(player, 'radish', 'B', 20);
  assert.equal(failSell.success, false);
  assert.equal(failSell.reason, 'insufficient_produce');
});

test('market multiplier dynamics and mean reversion', () => {
  let mult = 1.0;
  // Heavy selling drops price
  mult = updateMarketMultiplier(mult, -10);
  assert.ok(mult < 1.0);

  // Inactive period drifts toward 1.0
  const drifted = updateMarketMultiplier(mult, 0);
  assert.ok(drifted > mult);
  assert.ok(drifted <= 1.0);
});
