import { ECONOMY } from '../shared/economy.js';

export class OrderBook {
  constructor(storage) {
    this.storage = storage;
    this.bids = []; // buy orders: sorted by price desc, then createdAt asc
    this.asks = []; // sell orders: sorted by price asc, then createdAt asc
    this.trades = [];
    this.loadState();
  }

  loadState() {
    if (this.storage && Array.isArray(this.storage.state.orders)) {
      for (const order of this.storage.state.orders) {
        if (order.side === 'buy') this.bids.push(order);
        else if (order.side === 'sell') this.asks.push(order);
      }
      this.sortBooks();
    }
    if (this.storage && Array.isArray(this.storage.state.trades)) {
      this.trades = [...this.storage.state.trades];
    }
  }

  saveState() {
    if (this.storage) {
      this.storage.state.orders = [...this.bids, ...this.asks];
      this.storage.state.trades = this.trades.slice(-100); // keep recent 100
      this.storage.save();
    }
  }

  sortBooks() {
    this.bids.sort((a, b) => b.price - a.price || a.createdAt - b.createdAt);
    this.asks.sort((a, b) => a.price - b.price || a.createdAt - b.createdAt);
  }

  placeOrder({ id, playerId, side, cropId, price, quantity, quality = 'B' }) {
    if (!id || !playerId || !side || !cropId || price <= 0 || quantity <= 0) {
      return { success: false, reason: 'invalid_order_params' };
    }

    const order = {
      id,
      playerId,
      side,
      cropId,
      price: Math.round(price),
      quantity: Math.round(quantity),
      filled: 0,
      quality,
      createdAt: Date.now(),
    };

    const trades = [];

    if (side === 'buy') {
      // Match against asks
      while (order.filled < order.quantity && this.asks.length > 0) {
        const bestAsk = this.asks[0];
        if (bestAsk.cropId !== cropId) {
          // If different crop, continue searching asks for matching crop
          break;
        }
        if (bestAsk.price > order.price) {
          break; // Price not crossing
        }

        // Execution price is maker's price (the resting ask)
        const execPrice = bestAsk.price;
        const availableInAsk = bestAsk.quantity - bestAsk.filled;
        const remainingToBuy = order.quantity - order.filled;
        const matchQty = Math.min(availableInAsk, remainingToBuy);

        order.filled += matchQty;
        bestAsk.filled += matchQty;

        const tradeValue = matchQty * execPrice;
        const fee = Math.max(1, Math.round(tradeValue * ECONOMY.FEE_RATE));

        const trade = {
          id: `trade_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          buyerId: order.playerId,
          sellerId: bestAsk.playerId,
          cropId,
          price: execPrice,
          quantity: matchQty,
          quality: bestAsk.quality,
          value: tradeValue,
          fee,
          executedAt: Date.now(),
        };

        trades.push(trade);
        this.trades.unshift(trade);

        if (bestAsk.filled >= bestAsk.quantity) {
          this.asks.shift();
        }
      }

      if (order.filled < order.quantity) {
        this.bids.push(order);
        this.sortBooks();
      }
    } else if (side === 'sell') {
      // Match against bids
      while (order.filled < order.quantity && this.bids.length > 0) {
        const bestBid = this.bids[0];
        if (bestBid.cropId !== cropId) {
          break;
        }
        if (bestBid.price < order.price) {
          break; // Price not crossing
        }

        // Execution price is maker's price (the resting bid)
        const execPrice = bestBid.price;
        const availableInBid = bestBid.quantity - bestBid.filled;
        const remainingToSell = order.quantity - order.filled;
        const matchQty = Math.min(availableInBid, remainingToSell);

        order.filled += matchQty;
        bestBid.filled += matchQty;

        const tradeValue = matchQty * execPrice;
        const fee = Math.max(1, Math.round(tradeValue * ECONOMY.FEE_RATE));

        const trade = {
          id: `trade_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          buyerId: bestBid.playerId,
          sellerId: order.playerId,
          cropId,
          price: execPrice,
          quantity: matchQty,
          quality: order.quality,
          value: tradeValue,
          fee,
          executedAt: Date.now(),
        };

        trades.push(trade);
        this.trades.unshift(trade);

        if (bestBid.filled >= bestBid.quantity) {
          this.bids.shift();
        }
      }

      if (order.filled < order.quantity) {
        this.asks.push(order);
        this.sortBooks();
      }
    }

    this.saveState();
    return {
      success: true,
      order,
      trades,
    };
  }

  cancelOrder(orderId, playerId) {
    let index = this.bids.findIndex(o => o.id === orderId && o.playerId === playerId);
    if (index >= 0) {
      const removed = this.bids.splice(index, 1)[0];
      this.saveState();
      return { success: true, order: removed };
    }

    index = this.asks.findIndex(o => o.id === orderId && o.playerId === playerId);
    if (index >= 0) {
      const removed = this.asks.splice(index, 1)[0];
      this.saveState();
      return { success: true, order: removed };
    }

    return { success: false, reason: 'not_found' };
  }

  getBookSnapshot(cropId = null) {
    const filterCrop = (list) => cropId ? list.filter(o => o.cropId === cropId) : list;
    return {
      bids: filterCrop(this.bids).map(b => ({
        id: b.id,
        playerId: b.playerId,
        price: b.price,
        quantity: b.quantity - b.filled,
        cropId: b.cropId,
      })),
      asks: filterCrop(this.asks).map(a => ({
        id: a.id,
        playerId: a.playerId,
        price: a.price,
        quantity: a.quantity - a.filled,
        cropId: a.cropId,
      })),
      trades: this.trades.slice(0, 20),
    };
  }
}
