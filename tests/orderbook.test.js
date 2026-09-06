import test from 'node:test';
import assert from 'node:assert/strict';
import { Storage } from '../server/storage.js';
import { OrderBook } from '../server/orderbook.js';

test('order book price-time priority sorting', () => {
  const storage = new Storage(`/tmp/test-ob-${Date.now()}.json`);
  const ob = new OrderBook(storage);

  // Place sell orders
  ob.placeOrder({ id: 's1', playerId: 'p1', side: 'sell', cropId: 'basil', price: 20, quantity: 5 });
  ob.placeOrder({ id: 's2', playerId: 'p2', side: 'sell', cropId: 'basil', price: 18, quantity: 5 });
  ob.placeOrder({ id: 's3', playerId: 'p3', side: 'sell', cropId: 'basil', price: 22, quantity: 5 });

  // Asks should be sorted ascending by price: 18, 20, 22
  assert.equal(ob.asks[0].id, 's2');
  assert.equal(ob.asks[0].price, 18);
  assert.equal(ob.asks[1].id, 's1');
  assert.equal(ob.asks[2].id, 's3');

  // Place buy orders
  ob.placeOrder({ id: 'b1', playerId: 'p4', side: 'buy', cropId: 'basil', price: 12, quantity: 3 });
  ob.placeOrder({ id: 'b2', playerId: 'p5', side: 'buy', cropId: 'basil', price: 15, quantity: 3 });

  // Bids should be sorted descending by price: 15, 12
  assert.equal(ob.bids[0].id, 'b2');
  assert.equal(ob.bids[0].price, 15);
  assert.equal(ob.bids[1].id, 'b1');
});

test('order matching: full fills and partial fills with maker price and fee', () => {
  const storage = new Storage(`/tmp/test-ob-matching-${Date.now()}.json`);
  const ob = new OrderBook(storage);

  // Seller lists 10 carrots @ 20 coins
  ob.placeOrder({ id: 's_carrot', playerId: 'seller_1', side: 'sell', cropId: 'carrot', price: 20, quantity: 10 });

  // Buyer arrives with bid @ 22 for 6 carrots (crosses spread)
  const matchResult = ob.placeOrder({
    id: 'b_carrot',
    playerId: 'buyer_1',
    side: 'buy',
    cropId: 'carrot',
    price: 22,
    quantity: 6,
  });

  assert.equal(matchResult.success, true);
  assert.equal(matchResult.trades.length, 1);
  const trade = matchResult.trades[0];

  // Matched at maker price (20) for 6 units
  assert.equal(trade.price, 20);
  assert.equal(trade.quantity, 6);
  assert.equal(trade.value, 120);
  assert.ok(trade.fee >= 1); // 2% fee

  // Seller's ask should still have 4 remaining
  assert.equal(ob.asks.length, 1);
  assert.equal(ob.asks[0].quantity - ob.asks[0].filled, 4);

  // Buyer order completely filled, not in bids
  assert.equal(ob.bids.length, 0);

  // Buyer 2 comes in wanting 10 carrots @ 20
  const match2 = ob.placeOrder({
    id: 'b2_carrot',
    playerId: 'buyer_2',
    side: 'buy',
    cropId: 'carrot',
    price: 20,
    quantity: 10,
  });

  // Fills remaining 4 from seller
  assert.equal(match2.trades.length, 1);
  assert.equal(match2.trades[0].quantity, 4);
  assert.equal(ob.asks.length, 0); // Seller order completely filled

  // Remaining 6 of buyer 2 rests as an active bid @ 20
  assert.equal(ob.bids.length, 1);
  assert.equal(ob.bids[0].quantity - ob.bids[0].filled, 6);
});

test('order cancellation removes order from book', () => {
  const storage = new Storage(`/tmp/test-ob-cancel-${Date.now()}.json`);
  const ob = new OrderBook(storage);

  ob.placeOrder({ id: 'order_to_cancel', playerId: 'p1', side: 'sell', cropId: 'tomato', price: 30, quantity: 5 });
  assert.equal(ob.asks.length, 1);

  // Wrong player cannot cancel
  const failCancel = ob.cancelOrder('order_to_cancel', 'wrong_player');
  assert.equal(failCancel.success, false);

  // Right player cancels
  const cancelRes = ob.cancelOrder('order_to_cancel', 'p1');
  assert.equal(cancelRes.success, true);
  assert.equal(ob.asks.length, 0);
});
