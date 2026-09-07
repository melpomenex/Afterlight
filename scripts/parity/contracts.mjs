/**
 * Parity fixtures for contract generation and fulfillment
 * (`server/economy.js` generateContracts / fulfillContract / tickContracts).
 */

import { EconomyManager } from '../../server/economy.js';
import { recordCall, recordScript, withFrozenClock, withFrozenRandom } from './harness.mjs';

const T0 = 1_700_000_000_000;

function stubStorage(extra = {}) {
  return {
    state: {
      marketMultipliers: {},
      machines: { mill: { status: 'broken', required: { copper: 4, timber: 4, glass: 4 }, contributed: { copper: 0, timber: 0, glass: 0 }, restoredAt: null } },
      ...extra,
    },
    save() {},
  };
}

function newEconomy(state, seed) {
  return withFrozenRandom(seed, () =>
    withFrozenClock(T0, () => new EconomyManager(stubStorage(state))),
  );
}

function generateContracts(state, seed) {
  const economy = newEconomy(state, seed);
  return economy.contracts;
}

function fulfillOnBoard(contracts, player, contractId) {
  const economy = newEconomy({}, 0);
  economy.contracts = contracts;
  return economy.fulfillContract(player, contractId);
}

function tickBoard(contracts, lastRefreshAt, now, seed) {
  return withFrozenClock(now, () =>
    withFrozenRandom(seed, () => {
      const economy = newEconomy({}, seed);
      economy.contracts = contracts;
      economy.lastContractRefresh = lastRefreshAt;
      const refreshed = economy.tickContracts();
      return {
        refreshed,
        contracts: economy.contracts,
        lastContractRefresh: economy.lastContractRefresh,
      };
    }),
  );
}

function build() {
  const cases = [];

  cases.push(recordCall({ id: 'generate/broken-mill-seed-0.42', fn: generateContracts, args: [{}, 0.42], nowMs: T0 }));
  cases.push(recordCall({ id: 'generate/broken-mill-seed-0.77', fn: generateContracts, args: [{}, 0.77], nowMs: T0 }));

  cases.push(recordCall({
    id: 'generate/restored-mill-seed-0.42',
    fn: generateContracts,
    args: [{ machines: { mill: { status: 'restored', required: { copper: 4, timber: 4, glass: 4 }, contributed: { copper: 4, timber: 4, glass: 4 }, restoredAt: T0 } } }, 0.42],
    nowMs: T0,
  }));

  const board = generateContracts({}, 0.42);
  const contract = board[0];

  const emptyPlayer = {
    id: 'p1',
    coins: 50,
    reputation: 5,
    xp: 80,
    level: 1,
    inventory: { seeds: {}, produce: {} },
  };

  cases.push(recordCall({
    id: 'fulfill/insufficient',
    fn: fulfillOnBoard,
    args: [board, emptyPlayer, contract.id],
    nowMs: T0,
  }));

  cases.push(recordCall({
    id: 'fulfill/wrong-quality',
    fn: fulfillOnBoard,
    args: [board, {
      ...emptyPlayer,
      inventory: { seeds: {}, produce: { [`${contract.cropId}_C`]: contract.quantity + 5 } },
    }, contract.id],
    nowMs: T0,
  }));

  // Acquisition order: A+ listed before A in the object — A+ must be consumed first.
  const orderPlayer = {
    ...emptyPlayer,
    inventory: {
      seeds: {},
      produce: {
        [`${contract.cropId}_A+`]: 2,
        [`${contract.cropId}_A`]: 2,
      },
    },
  };
  cases.push(recordCall({
    id: 'fulfill/acquisition-order',
    fn: fulfillOnBoard,
    args: [board, orderPlayer, contract.id],
    nowMs: T0,
  }));

  cases.push(recordCall({
    id: 'fulfill/not-found',
    fn: fulfillOnBoard,
    args: [board, orderPlayer, 'contract_missing'],
    nowMs: T0,
  }));

  cases.push(recordCall({
    id: 'tick/no-refresh-before-5m',
    fn: tickBoard,
    args: [board, T0, T0 + 4 * 60 * 1000, 0.42],
    nowMs: T0,
  }));

  cases.push(recordCall({
    id: 'tick/refresh-after-5m',
    fn: tickBoard,
    args: [board, T0, T0 + 5 * 60 * 1000 + 1, 0.55],
    nowMs: T0,
  }));

  return cases;
}

export const contractCases = build();
export const contractHazards = {
  rounding: ['generate/*', 'fulfill/acquisition-order'],
  'generated-ids': ['generate/*'],
  'key-order': ['fulfill/acquisition-order'],
  timestamps: ['generate/*', 'tick/*'],
  'error-strings': ['fulfill/*'],
};
