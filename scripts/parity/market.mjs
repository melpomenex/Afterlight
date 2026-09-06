/**
 * Parity fixtures for shared/economy.js (price math — pins Math.round and
 * toFixed(3)) and server/orderbook.js (matching scripts with injected clock).
 */

import {
  calculateNpcSeedPrice,
  calculateNpcSellPrice,
  clampMultiplier,
  getSellableGood,
  updateMarketMultiplier,
} from '../../shared/economy.js';
import { CROP_LIST } from '../../shared/crops.js';
import { GOODS } from '../../shared/materials.js';
import { OrderBook } from '../../server/orderbook.js';
import { recordCall, recordScript } from './harness.mjs';

const T0 = 1_700_000_000_000;

function stubStorage() {
  return { state: { orders: [], trades: [] }, save() {} };
}

function withFrozen(nowMs, fn) {
  const real = Date.now;
  Date.now = () => nowMs;
  try {
    return fn();
  } finally {
    Date.now = real;
  }
}

function build() {
  const cases = [];

  // ------------------------------------------------------------------
  // Price math over the full goods × qualities × multipliers matrix
  // ------------------------------------------------------------------
  const sellables = [...CROP_LIST.map((c) => c.id), ...Object.keys(GOODS)];
  const multipliers = [0.4, 0.85, 1.0, 1.0005, 1.5, 2.5];
  for (const good of sellables) {
    for (const quality of ['C', 'B', 'A', 'A+']) {
      for (const mult of multipliers) {
        cases.push(recordCall({
          id: `sell-price/${good}-${quality}-${mult}`,
          fn: calculateNpcSellPrice,
          args: [good, quality, mult],
        }));
      }
    }
  }
  for (const crop of CROP_LIST) {
    for (const mult of multipliers) {
      cases.push(recordCall({ id: `seed-price/${crop.id}-${mult}`, fn: calculateNpcSeedPrice, args: [crop.id, mult] }));
    }
  }
  cases.push(recordCall({ id: 'sell-good/unknown', fn: getSellableGood, args: ['mystic_orb'] }));
  cases.push(recordCall({ id: 'sell-good/flour', fn: getSellableGood, args: ['flour'] }));
  cases.push(recordCall({ id: 'clamp/low', fn: clampMultiplier, args: [0.1] }));
  cases.push(recordCall({ id: 'clamp/high', fn: clampMultiplier, args: [9.9] }));
  cases.push(recordCall({ id: 'clamp/mid', fn: clampMultiplier, args: [1.23456] }));

  // updateMarketMultiplier chains — pins toFixed(3) binary-float behavior
  const chains = [
    ['buy-push-up', 1.0, [4, 4, 4, -2, -10, -10, -10]],
    ['sell-push-down', 2.5, [-6, -6, -6, 2, 10, 10, 10]],
    ['oscillate', 1.377, [3, -3, 3, -3, 1, -1, 0]],
    ['at-floor', 0.4, [-10, -10, 5, 5]],
    ['at-ceiling', 2.5, [10, 10, -5, -5]],
  ];
  for (const [name, start, demands] of chains) {
    const steps = [
      { fn: passThrough, args: [start] },
      ...demands.map((d) => ({ fn: updateMarketMultiplier, args: ['<prev>', d] })),
    ];
    cases.push(recordScript({ id: `multiplier/${name}`, steps, keepPrev: true }));
  }

  // ------------------------------------------------------------------
  // OrderBook matching scripts (price-time priority, fees, self-match)
  // ------------------------------------------------------------------
  cases.push(recordScript({
    id: 'book/price-time-priority',
    steps: [
      { fn: seedBook, args: [[
        { id: 'a1', playerId: 's1', side: 'sell', cropId: 'radish', price: 14, quantity: 5, quality: 'B' },
        { id: 'a2', playerId: 's2', side: 'sell', cropId: 'radish', price: 12, quantity: 5, quality: 'B' },
        { id: 'a3', playerId: 's3', side: 'sell', cropId: 'radish', price: 12, quantity: 5, quality: 'A' },
      ]] },
      { fn: placeOnPrev, args: ['<prev>', { id: 't1', playerId: 'b1', side: 'buy', cropId: 'radish', price: 15, quantity: 8, quality: 'B' }] },
      { fn: snapshotPrev, args: ['<prev>', 'radish'] },
    ],
    keepPrev: true,
  }));

  cases.push(recordScript({
    id: 'book/partial-fill-and-rest',
    steps: [
      { fn: seedBook, args: [[
        { id: 'a1', playerId: 's1', side: 'sell', cropId: 'kale', price: 10, quantity: 3, quality: 'B' },
      ]] },
      { fn: placeOnPrev, args: ['<prev>', { id: 't1', playerId: 'b1', side: 'buy', cropId: 'kale', price: 10, quantity: 9, quality: 'B' }] },
      { fn: snapshotPrev, args: ['<prev>', 'kale'] },
    ],
    keepPrev: true,
  }));

  cases.push(recordScript({
    id: 'book/min-fee-boundary-tv25',
    steps: [
      { fn: seedBook, args: [[
        { id: 'a1', playerId: 's1', side: 'sell', cropId: 'carrot', price: 5, quantity: 5, quality: 'B' },
      ]] },
      // tradeValue = 25 → fee = max(1, round(0.5)) = 1
      { fn: placeOnPrev, args: ['<prev>', { id: 't1', playerId: 'b1', side: 'buy', cropId: 'carrot', price: 5, quantity: 5, quality: 'B' }] },
    ],
    keepPrev: true,
  }));

  cases.push(recordScript({
    id: 'book/fee-half-even-divergence-tv125',
    steps: [
      { fn: seedBook, args: [[
        { id: 'a1', playerId: 's1', side: 'sell', cropId: 'carrot', price: 25, quantity: 5, quality: 'B' },
      ]] },
      // tradeValue = 125 → fee = max(1, round(2.5)) = 3 in JS (half toward +inf);
      // half-even rounding would give 2 — this case catches the divergence.
      { fn: placeOnPrev, args: ['<prev>', { id: 't1', playerId: 'b1', side: 'buy', cropId: 'carrot', price: 25, quantity: 5, quality: 'B' }] },
    ],
    keepPrev: true,
  }));

  cases.push(recordScript({
    id: 'book/crop-mismatch-breaks',
    steps: [
      { fn: seedBook, args: [[
        { id: 'a1', playerId: 's1', side: 'sell', cropId: 'flour', price: 10, quantity: 5, quality: 'B' },
        { id: 'a2', playerId: 's2', side: 'sell', cropId: 'carrot', price: 10, quantity: 5, quality: 'B' },
      ]] },
      // Best ask is flour; the carrot buy must break, not skip to a2.
      { fn: placeOnPrev, args: ['<prev>', { id: 't1', playerId: 'b1', side: 'buy', cropId: 'carrot', price: 10, quantity: 5, quality: 'B' }] },
      { fn: snapshotPrev, args: ['<prev>', null] },
    ],
    keepPrev: true,
  }));

  cases.push(recordScript({
    id: 'book/self-match-allowed',
    steps: [
      { fn: seedBook, args: [[
        { id: 'a1', playerId: 'same', side: 'sell', cropId: 'basil', price: 7, quantity: 4, quality: 'B' },
      ]] },
      { fn: placeOnPrev, args: ['<prev>', { id: 't1', playerId: 'same', side: 'buy', cropId: 'basil', price: 7, quantity: 4, quality: 'B' }] },
      { fn: snapshotPrev, args: ['<prev>', 'basil'] },
    ],
    keepPrev: true,
  }));

  cases.push(recordScript({
    id: 'book/sell-into-bids',
    steps: [
      { fn: seedBook, args: [[
        { id: 'b1', playerId: 'x1', side: 'buy', cropId: 'tomato', price: 20, quantity: 6, quality: 'A+' },
        { id: 'b2', playerId: 'x2', side: 'buy', cropId: 'tomato', price: 18, quantity: 6, quality: 'B' },
      ]] },
      { fn: placeOnPrev, args: ['<prev>', { id: 't1', playerId: 's1', side: 'sell', cropId: 'tomato', price: 15, quantity: 10, quality: 'A' }] },
      { fn: snapshotPrev, args: ['<prev>', 'tomato'] },
    ],
    keepPrev: true,
  }));

  cases.push(recordScript({
    id: 'book/cancel-and-invalid',
    steps: [
      { fn: seedBook, args: [[
        { id: 'keep1', playerId: 'p1', side: 'buy', cropId: 'lettuce', price: 9, quantity: 4, quality: 'B' },
        { id: 'kill1', playerId: 'p2', side: 'sell', cropId: 'lettuce', price: 11, quantity: 4, quality: 'B' },
      ]] },
      { fn: cancelOnPrev, args: ['<prev>', 'kill1', 'p2'] },
      { fn: cancelOnPrev, args: ['<prev>', 'kill1', 'p3'] },
      { fn: cancelOnPrev, args: ['<prev>', 'missing', 'p1'] },
      { fn: placeOnPrev, args: ['<prev>', { id: '', playerId: 'p1', side: 'buy', cropId: 'lettuce', price: 1, quantity: 1, quality: 'B' }] },
      { fn: placeOnPrev, args: ['<prev>', { id: 'x', playerId: 'p1', side: 'sideways', cropId: 'lettuce', price: 1, quantity: 1, quality: 'B' }] },
      { fn: placeOnPrev, args: ['<prev>', { id: 'x2', playerId: 'p1', side: 'buy', cropId: 'lettuce', price: 0, quantity: 1, quality: 'B' }] },
      { fn: snapshotPrev, args: ['<prev>', 'lettuce'] },
    ],
    keepPrev: true,
  }));

  cases.push(recordScript({
    id: 'book/rounds-price-and-quantity',
    steps: [
      { fn: newBook, args: [] },
      { fn: placeOnPrev, args: ['<prev>', { id: 'r1', playerId: 'p1', side: 'buy', cropId: 'strawberry', price: 10.5, quantity: 2.5, quality: 'B' }] },
      { fn: snapshotPrev, args: ['<prev>', 'strawberry'] },
    ],
    keepPrev: true,
  }));

  return cases;
}

// Script helpers (not exported cases themselves)
function newBook() {
  return new OrderBook(stubStorage());
}
const passThrough = (v) => v;
function seedBook(orders) {
  const book = newBook();
  withFrozen(T0, () => {
    for (const o of orders) book.placeOrder(o);
  });
  return book;
}
function placeOnPrev(book, order) {
  return withFrozen(T0, () => book.placeOrder(order));
}
function cancelOnPrev(book, orderId, playerId) {
  return withFrozen(T0, () => book.cancelOrder(orderId, playerId));
}
function snapshotPrev(book, cropId) {
  return book.getBookSnapshot(cropId);
}

export const marketCases = build();
export const marketHazards = {
  'rounding': ['sell-price/*', 'seed-price/*', 'multiplier/*', 'book/fee-half-even-divergence-tv125', 'book/rounds-price-and-quantity'],
  'tofixed': ['multiplier/*'],
  'sorting': ['book/price-time-priority'],
  'error-strings': ['book/cancel-and-invalid'],
  'int-float-fields': ['book/rounds-price-and-quantity'],
  'generated-ids': ['book/*'],
};
