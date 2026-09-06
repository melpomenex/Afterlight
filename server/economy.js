import { CROPS, CROP_LIST } from '../shared/crops.js';
import { GOODS, GOOD_LIST } from '../shared/materials.js';
import {
  calculateNpcSellPrice,
  calculateNpcSeedPrice,
  updateMarketMultiplier,
} from '../shared/economy.js';
import { isMillRestoredInState } from './machines.js';

export class EconomyManager {
  constructor(storage) {
    this.storage = storage;
    this.multipliers = {};
    for (const crop of CROP_LIST) {
      this.multipliers[crop.id] = (this.storage.state.marketMultipliers && this.storage.state.marketMultipliers[crop.id])
        ? this.storage.state.marketMultipliers[crop.id]
        : 1.0;
    }
    for (const good of GOOD_LIST) {
      this.multipliers[good.id] = (this.storage.state.marketMultipliers && this.storage.state.marketMultipliers[good.id])
        ? this.storage.state.marketMultipliers[good.id]
        : 1.0;
    }
    this.contracts = this.generateContracts();
    this.lastContractRefresh = Date.now();
  }

  saveMultipliers() {
    this.storage.state.marketMultipliers = { ...this.multipliers };
    this.storage.save();
  }

  getPricesSnapshot() {
    const prices = {};
    for (const crop of CROP_LIST) {
      const mult = this.multipliers[crop.id] || 1.0;
      prices[crop.id] = {
        cropId: crop.id,
        name: crop.name,
        basePrice: crop.basePrice,
        multiplier: mult,
        instantBid: calculateNpcSellPrice(crop.id, 'B', mult),
        instantAskSeed: calculateNpcSeedPrice(crop.id, mult),
        seedCost: crop.seedCost,
      };
    }
    // Processed goods trade alongside crops; they have no seed side.
    for (const good of GOOD_LIST) {
      const mult = this.multipliers[good.id] || 1.0;
      prices[good.id] = {
        cropId: good.id,
        name: good.name,
        basePrice: good.basePrice,
        multiplier: mult,
        instantBid: calculateNpcSellPrice(good.id, 'B', mult),
        isGood: true,
      };
    }
    return prices;
  }

  npcSell(player, cropId, quality = 'B', quantity = 1) {
    if (!player || quantity <= 0) return { success: false, reason: 'invalid_request' };
    const isGood = !!GOODS[cropId];
    // Processed goods have no quality grades; they always trade as grade B.
    const effectiveQuality = isGood ? 'B' : quality;
    const inv = player.inventory;
    const produceKey = `${cropId}_${effectiveQuality}`;
    const available = inv.produce[produceKey] || 0;
    if (available < quantity) {
      return { success: false, reason: 'insufficient_produce' };
    }

    const mult = this.multipliers[cropId] || 1.0;
    const unitPrice = calculateNpcSellPrice(cropId, effectiveQuality, mult);
    const totalEarnings = unitPrice * quantity;

    inv.produce[produceKey] -= quantity;
    if (inv.produce[produceKey] === 0) delete inv.produce[produceKey];

    player.coins += totalEarnings;
    player.xp += Math.round(quantity * 3);

    // Selling shifts price down (net demand negative)
    this.multipliers[cropId] = updateMarketMultiplier(mult, -quantity * 0.5);
    this.saveMultipliers();

    return {
      success: true,
      cropId,
      quality: effectiveQuality,
      quantity,
      unitPrice,
      totalEarnings,
      coins: player.coins,
      inventory: player.inventory,
    };
  }

  npcBuySeed(player, cropId, quantity = 1) {
    if (!player || quantity <= 0) return { success: false, reason: 'invalid_request' };
    const crop = CROPS[cropId];
    if (!crop) return { success: false, reason: 'unknown_crop' };

    const mult = this.multipliers[cropId] || 1.0;
    const unitCost = calculateNpcSeedPrice(cropId, mult);
    const totalCost = unitCost * quantity;

    if (player.coins < totalCost) {
      return { success: false, reason: 'insufficient_coins' };
    }

    player.coins -= totalCost;
    player.inventory.seeds[cropId] = (player.inventory.seeds[cropId] || 0) + quantity;

    // Buying seeds raises demand slightly
    this.multipliers[cropId] = updateMarketMultiplier(mult, quantity * 0.2);
    this.saveMultipliers();

    return {
      success: true,
      cropId,
      quantity,
      unitCost,
      totalCost,
      coins: player.coins,
      inventory: player.inventory,
    };
  }

  generateContracts() {
    const clients = [
      'Lantern Café',
      'The Station Kitchen',
      'Old Canal Brewery',
      'Apothecary Green',
      'Harbor Commissary',
      'Rain Court Market Stand',
    ];

    const contracts = [];
    for (let i = 0; i < 3; i++) {
      // Flour contracts only generate while the mill is restored; offering
      // them from a broken mill would create unfulfillable demand.
      if (isMillRestoredInState(this.storage.state) && i === Math.floor(Math.random() * 3)) {
        contracts.push(this.generateFlourContract(clients, i));
        continue;
      }
      const crop = CROP_LIST[Math.floor(Math.random() * CROP_LIST.length)];
      const client = clients[(i * 2 + Math.floor(Math.random() * 2)) % clients.length];
      const qty = Math.floor(Math.random() * 4) + 3; // 3 - 6 units
      const minQuality = Math.random() > 0.4 ? 'A' : 'B';
      const baseVal = crop.basePrice * (minQuality === 'A' ? 1.35 : 1.0) * qty;
      const reward = Math.round(baseVal * 1.4); // 40% premium over base market
      const rep = Math.round(qty * 5);
      const xp = Math.round(qty * 8);

      contracts.push({
        id: `contract_${Date.now()}_${i}`,
        client,
        cropId: crop.id,
        cropName: crop.name,
        quantity: qty,
        minQuality,
        reward,
        reputation: rep,
        xp,
        expiresAt: Date.now() + 1000 * 60 * 10, // 10 minutes
      });
    }
    return contracts;
  }

  generateFlourContract(clients, slotIndex) {
    const client = clients[(slotIndex * 2 + Math.floor(Math.random() * 2)) % clients.length];
    const good = GOODS.flour;
    const qty = Math.floor(Math.random() * 3) + 2; // 2 - 4 units of flour
    const baseVal = good.basePrice * qty;
    const reward = Math.round(baseVal * 1.4); // same 40% contract premium
    return {
      id: `contract_${Date.now()}_${slotIndex}`,
      client,
      cropId: good.id,
      cropName: good.name,
      quantity: qty,
      minQuality: 'B', // flour has no quality grades in this slice
      reward,
      reputation: Math.round(qty * 5),
      xp: Math.round(qty * 8),
      expiresAt: Date.now() + 1000 * 60 * 10,
      tier: 'flour',
    };
  }

  /**
   * Forces a contract reroll (used when the mill is restored, so the new
   * demand signal appears without waiting for the next refresh window).
   */
  refreshContracts() {
    this.contracts = this.generateContracts();
    this.lastContractRefresh = Date.now();
    return this.contracts;
  }

  tickContracts() {
    const now = Date.now();
    if (now - this.lastContractRefresh > 1000 * 60 * 5) {
      this.contracts = this.generateContracts();
      this.lastContractRefresh = now;
      return true;
    }
    return false;
  }

  fulfillContract(player, contractId) {
    const idx = this.contracts.findIndex(c => c.id === contractId);
    if (idx < 0) return { success: false, reason: 'contract_not_found' };
    const contract = this.contracts[idx];

    // Find eligible produce in player inventory
    const produce = player.inventory.produce;
    const qualityRank = { 'C': 1, 'B': 2, 'A': 3, 'A+': 4 };
    const minRank = qualityRank[contract.minQuality] || 2;

    let availableCount = 0;
    const eligibleKeys = [];

    for (const [key, count] of Object.entries(produce)) {
      const [cId, q] = key.split('_');
      if (cId === contract.cropId && (qualityRank[q] || 1) >= minRank) {
        availableCount += count;
        eligibleKeys.push({ key, count });
      }
    }

    if (availableCount < contract.quantity) {
      return { success: false, reason: 'insufficient_qualifying_produce' };
    }

    // Deduct produce
    let remainingToDeduct = contract.quantity;
    for (const item of eligibleKeys) {
      const take = Math.min(item.count, remainingToDeduct);
      produce[item.key] -= take;
      if (produce[item.key] === 0) delete produce[item.key];
      remainingToDeduct -= take;
      if (remainingToDeduct <= 0) break;
    }

    player.coins += contract.reward;
    player.reputation = (player.reputation || 0) + contract.reputation;
    player.xp += contract.xp;

    // Check level progression (e.g. 100 XP per level)
    player.level = Math.floor(player.xp / 100) + 1;

    // Replace completed contract
    this.contracts.splice(idx, 1);

    return {
      success: true,
      contract,
      coins: player.coins,
      reputation: player.reputation,
      xp: player.xp,
      level: player.level,
      inventory: player.inventory,
    };
  }
}
