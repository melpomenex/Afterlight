import test from 'node:test';
import assert from 'node:assert/strict';
import { Storage } from '../server/storage.js';
import { EconomyManager } from '../server/economy.js';

test('rotating contracts generation and structure', () => {
  const storage = new Storage(`/tmp/test-contracts-${Date.now()}.json`);
  const economy = new EconomyManager(storage);

  assert.equal(economy.contracts.length, 3);
  for (const c of economy.contracts) {
    assert.ok(c.id);
    assert.ok(c.client);
    assert.ok(c.cropId);
    assert.ok(c.quantity >= 3);
    assert.ok(['A', 'B'].includes(c.minQuality));
    assert.ok(c.reward > 0);
    assert.ok(c.reputation > 0);
    assert.ok(c.xp > 0);
    assert.ok(c.expiresAt > Date.now());
  }
});

test('fulfilling contracts validates quality grade and awards rewards', () => {
  const storage = new Storage(`/tmp/test-contract-fulfill-${Date.now()}.json`);
  const economy = new EconomyManager(storage);

  const contract = economy.contracts[0];
  const requiredCrop = contract.cropId;
  const minQual = contract.minQuality; // 'A' or 'B'

  const player = {
    id: 'contract_tester',
    coins: 50,
    reputation: 5,
    xp: 80,
    level: 1,
    inventory: {
      seeds: {},
      produce: {},
    },
  };

  // 1. Trying to fulfill without produce fails
  const failRes = economy.fulfillContract(player, contract.id);
  assert.equal(failRes.success, false);
  assert.equal(failRes.reason, 'insufficient_qualifying_produce');

  // 2. Add produce with inferior quality (Grade C)
  player.inventory.produce[`${requiredCrop}_C`] = contract.quantity + 5;
  const failQual = economy.fulfillContract(player, contract.id);
  assert.equal(failQual.success, false);
  assert.equal(failQual.reason, 'insufficient_qualifying_produce');

  // 3. Add produce with exact or higher quality
  player.inventory.produce[`${requiredCrop}_A+`] = contract.quantity;
  const successRes = economy.fulfillContract(player, contract.id);
  assert.equal(successRes.success, true);
  assert.ok(player.coins > 50);
  assert.ok(player.reputation > 5);
  assert.ok(player.xp > 80);
  // Level should advance since XP >= 100
  assert.ok(player.level >= 2);
  assert.equal(player.inventory.produce[`${requiredCrop}_A+`] || 0, 0);

  // Contract list still has 3 contracts (new one generated or remaining)
  assert.ok(economy.contracts.length >= 2);
});
