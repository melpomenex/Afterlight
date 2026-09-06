import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { MSG_TYPES, ROOMS, WEATHER, parse, serialize } from '../shared/protocol.js';
import { sanitizeNickname, resolveDuplicateNickname } from '../shared/identity.js';
import { Storage } from './storage.js';
import { WorldManager } from './world.js';
import { GardensManager } from './gardens.js';
import { EconomyManager } from './economy.js';
import { OrderBook } from './orderbook.js';

const PORT = process.env.PORT || 3001;

export function createServer(customStorage = null) {
  const storage = customStorage || new Storage();
  const world = new WorldManager();
  const gardens = new GardensManager(storage);
  const economy = new EconomyManager(storage);
  const orderbook = new OrderBook(storage);

  let currentWeather = WEATHER.CLEAR;
  let weatherTimer = Date.now();

  const server = http.createServer((req, res) => {
    if (req.url === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', online: world.clients.size }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    let playerId = null;

    ws.on('message', (raw) => {
      const msg = parse(raw);
      if (!msg || !msg.type) return;

      if (msg.type === MSG_TYPES.PING) {
        ws.send(serialize({ type: MSG_TYPES.PONG, t: msg.t }));
        return;
      }

      if (msg.type === MSG_TYPES.HELLO) {
        playerId = msg.guestId || `guest_${Math.random().toString(36).slice(2, 9)}`;
        let player = storage.getPlayer(playerId);

        // Active nicknames set for duplicate check
        const activeNicknames = new Set();
        for (const [pid, client] of world.clients.entries()) {
          if (pid !== playerId && client.player?.nickname) {
            activeNicknames.add(client.player.nickname.toLowerCase());
          }
        }

        const rawNick = msg.nickname || player?.nickname;
        const validNick = resolveDuplicateNickname(rawNick, activeNicknames);

        if (!player) {
          player = {
            id: playerId,
            nickname: validNick,
            coins: 60,
            xp: 0,
            level: 1,
            reputation: 10,
            reservedCoins: 0,
            inventory: {
              seeds: { radish: 6, lettuce: 4, carrot: 2 },
              produce: {},
              reservedProduce: {},
            },
            currentRoom: ROOMS.MARKET,
            lastSeen: Date.now(),
          };
        } else {
          player.nickname = validNick;
          player.lastSeen = Date.now();
          if (!player.reservedCoins) player.reservedCoins = 0;
          if (!player.inventory.reservedProduce) player.inventory.reservedProduce = {};
        }

        storage.savePlayer(player);

        const clientSession = {
          ws,
          player,
          x: 0,
          z: 3,
          rotY: 0,
          walking: false,
          currentRoom: ROOMS.MARKET,
          send(m) {
            if (ws.readyState === WebSocket.OPEN) ws.send(serialize(m));
          },
        };

        world.addClient(playerId, clientSession);

        // Send welcome
        clientSession.send({
          type: MSG_TYPES.WELCOME,
          player,
          weather: currentWeather,
          prices: economy.getPricesSnapshot(),
          contracts: economy.contracts,
          orderBook: orderbook.getBookSnapshot(),
        });

        // Send initial garden state
        const garden = gardens.getOrCreateGarden(playerId);
        clientSession.send({
          type: MSG_TYPES.GARDEN_STATE,
          roomId: ROOMS.gardenFor(playerId),
          beds: garden.beds,
        });

        return;
      }

      // Remaining messages require authenticated player
      if (!playerId) return;
      const session = world.clients.get(playerId);
      if (!session) return;
      const player = session.player;

      if (msg.type === MSG_TYPES.SET_NICKNAME) {
        const clean = sanitizeNickname(msg.nickname);
        player.nickname = clean;
        storage.savePlayer(player);
        session.send({
          type: MSG_TYPES.WELCOME,
          player,
          weather: currentWeather,
          prices: economy.getPricesSnapshot(),
          contracts: economy.contracts,
          orderBook: orderbook.getBookSnapshot(),
        });
        return;
      }

      if (msg.type === MSG_TYPES.JOIN_ROOM) {
        const newRoom = msg.roomId || ROOMS.MARKET;
        world.joinRoom(playerId, newRoom);

        // If it's a garden room, send that garden's state
        if (ROOMS.isGarden(newRoom)) {
          const ownerId = ROOMS.gardenOwner(newRoom);
          const garden = gardens.getOrCreateGarden(ownerId);
          session.send({
            type: MSG_TYPES.GARDEN_STATE,
            roomId: newRoom,
            beds: garden.beds,
          });
        }
        return;
      }

      if (msg.type === MSG_TYPES.MOVEMENT) {
        world.updateMovement(playerId, msg);
        return;
      }

      if (msg.type === MSG_TYPES.GARDEN_ACTION) {
        const { actionId, action, bedIndex, seedCropId } = msg;
        const currentRoom = session.currentRoom;
        const gardenOwner = ROOMS.gardenOwner(currentRoom);

        // For now, only owner can cultivate their garden
        if (gardenOwner && gardenOwner !== playerId) {
          session.send({
            type: MSG_TYPES.ACTION_RESULT,
            actionId,
            success: false,
            message: 'You can only cultivate your own garden.',
          });
          return;
        }

        // Planting validation: verify seed inventory
        if (action === 'plant') {
          const seeds = player.inventory.seeds;
          if (!seeds[seedCropId] || seeds[seedCropId] <= 0) {
            session.send({
              type: MSG_TYPES.ACTION_RESULT,
              actionId,
              success: false,
              message: 'No seeds of that type in inventory.',
            });
            return;
          }
        }

        const res = gardens.handleAction(playerId, { action, bedIndex, seedCropId });
        if (res.success) {
          if (action === 'plant') {
            player.inventory.seeds[seedCropId]--;
            if (player.inventory.seeds[seedCropId] === 0) {
              delete player.inventory.seeds[seedCropId];
            }
            player.xp += 3;
            storage.savePlayer(player);
          } else if (action === 'harvest') {
            const harvestKey = `${res.cropId}_${res.quality}`;
            player.inventory.produce[harvestKey] = (player.inventory.produce[harvestKey] || 0) + res.yield;
            player.xp += res.xp;
            player.level = Math.floor(player.xp / 100) + 1;
            storage.savePlayer(player);
          }

          // Broadcast updated garden state to anyone in this garden room
          world.broadcastToRoom(currentRoom, {
            type: MSG_TYPES.GARDEN_STATE,
            roomId: currentRoom,
            beds: res.beds,
          });

          session.send({
            type: MSG_TYPES.INVENTORY_STATE,
            player,
          });

          session.send({
            type: MSG_TYPES.ACTION_RESULT,
            actionId,
            success: true,
            message: action === 'harvest' ? `Harvested ${res.yield}x Grade ${res.quality} ${res.crop?.name}!` : 'Action complete',
            harvest: action === 'harvest' ? res : null,
          });
        } else {
          session.send({
            type: MSG_TYPES.ACTION_RESULT,
            actionId,
            success: false,
            message: res.reason || 'Action failed',
          });
        }
        return;
      }

      if (msg.type === MSG_TYPES.MARKET_BUY) {
        const { cropId, quantity } = msg;
        const res = economy.npcBuySeed(player, cropId, quantity);
        if (res.success) {
          storage.savePlayer(player);
          session.send({ type: MSG_TYPES.INVENTORY_STATE, player });
          world.broadcastToAll({
            type: MSG_TYPES.MARKET_UPDATE,
            prices: economy.getPricesSnapshot(),
            orderBook: orderbook.getBookSnapshot(),
          });
        } else {
          session.send({ type: MSG_TYPES.ERROR, message: res.reason });
        }
        return;
      }

      if (msg.type === MSG_TYPES.MARKET_SELL) {
        const { cropId, quality, quantity } = msg;
        const res = economy.npcSell(player, cropId, quality, quantity);
        if (res.success) {
          storage.savePlayer(player);
          session.send({ type: MSG_TYPES.INVENTORY_STATE, player });
          world.broadcastToAll({
            type: MSG_TYPES.MARKET_UPDATE,
            prices: economy.getPricesSnapshot(),
            orderBook: orderbook.getBookSnapshot(),
          });
        } else {
          session.send({ type: MSG_TYPES.ERROR, message: res.reason });
        }
        return;
      }

      if (msg.type === MSG_TYPES.ORDER_PLACE) {
        const { orderId, side, cropId, price, quantity, quality = 'B' } = msg;
        if (side === 'buy') {
          const totalCost = Math.round(price * quantity);
          if (player.coins < totalCost) {
            session.send({ type: MSG_TYPES.ERROR, message: 'insufficient_coins' });
            return;
          }
          player.coins -= totalCost;
          player.reservedCoins = (player.reservedCoins || 0) + totalCost;
        } else if (side === 'sell') {
          const key = `${cropId}_${quality}`;
          const available = player.inventory.produce[key] || 0;
          if (available < quantity) {
            session.send({ type: MSG_TYPES.ERROR, message: 'insufficient_produce' });
            return;
          }
          player.inventory.produce[key] -= quantity;
          if (player.inventory.produce[key] === 0) delete player.inventory.produce[key];
          player.inventory.reservedProduce[key] = (player.inventory.reservedProduce[key] || 0) + quantity;
        }

        const res = orderbook.placeOrder({
          id: orderId,
          playerId,
          side,
          cropId,
          price,
          quantity,
          quality,
        });

        if (res.success) {
          // Process executed trades
          for (const trade of res.trades) {
            // Buyer credit
            const buyer = storage.getPlayer(trade.buyerId);
            if (buyer) {
              const bKey = `${trade.cropId}_${trade.quality}`;
              buyer.inventory.produce[bKey] = (buyer.inventory.produce[bKey] || 0) + trade.quantity;
              const originalCost = trade.price * trade.quantity;
              buyer.reservedCoins = Math.max(0, (buyer.reservedCoins || 0) - originalCost);
              storage.savePlayer(buyer);
              const bSession = world.clients.get(trade.buyerId);
              if (bSession) {
                bSession.send({ type: MSG_TYPES.TRADE_FILLED, trade });
                bSession.send({ type: MSG_TYPES.INVENTORY_STATE, player: buyer });
              }
            }

            // Seller credit
            const seller = storage.getPlayer(trade.sellerId);
            if (seller) {
              const sKey = `${trade.cropId}_${trade.quality}`;
              seller.inventory.reservedProduce[sKey] = Math.max(0, (seller.inventory.reservedProduce[sKey] || 0) - trade.quantity);
              if (seller.inventory.reservedProduce[sKey] === 0) delete seller.inventory.reservedProduce[sKey];
              const netEarnings = trade.value - trade.fee;
              seller.coins += netEarnings;
              storage.savePlayer(seller);
              const sSession = world.clients.get(trade.sellerId);
              if (sSession) {
                sSession.send({ type: MSG_TYPES.TRADE_FILLED, trade });
                sSession.send({ type: MSG_TYPES.INVENTORY_STATE, player: seller });
              }
            }
          }

          storage.savePlayer(player);
          session.send({ type: MSG_TYPES.INVENTORY_STATE, player });
          world.broadcastToAll({
            type: MSG_TYPES.MARKET_UPDATE,
            prices: economy.getPricesSnapshot(),
            orderBook: orderbook.getBookSnapshot(),
          });
        }
        return;
      }

      if (msg.type === MSG_TYPES.ORDER_CANCEL) {
        const { orderId } = msg;
        const res = orderbook.cancelOrder(orderId, playerId);
        if (res.success) {
          const order = res.order;
          const remaining = order.quantity - order.filled;
          if (order.side === 'buy') {
            const refund = remaining * order.price;
            player.reservedCoins = Math.max(0, (player.reservedCoins || 0) - refund);
            player.coins += refund;
          } else if (order.side === 'sell') {
            const key = `${order.cropId}_${order.quality}`;
            player.inventory.reservedProduce[key] = Math.max(0, (player.inventory.reservedProduce[key] || 0) - remaining);
            if (player.inventory.reservedProduce[key] === 0) delete player.inventory.reservedProduce[key];
            player.inventory.produce[key] = (player.inventory.produce[key] || 0) + remaining;
          }

          storage.savePlayer(player);
          session.send({ type: MSG_TYPES.INVENTORY_STATE, player });
          world.broadcastToAll({
            type: MSG_TYPES.MARKET_UPDATE,
            prices: economy.getPricesSnapshot(),
            orderBook: orderbook.getBookSnapshot(),
          });
        }
        return;
      }

      if (msg.type === MSG_TYPES.CONTRACT_COMPLETE) {
        const { contractId } = msg;
        const res = economy.fulfillContract(player, contractId);
        if (res.success) {
          storage.savePlayer(player);
          session.send({ type: MSG_TYPES.INVENTORY_STATE, player });
          world.broadcastToAll({
            type: MSG_TYPES.CONTRACT_UPDATE,
            contracts: economy.contracts,
          });
        } else {
          session.send({ type: MSG_TYPES.ERROR, message: res.reason });
        }
        return;
      }

      if (msg.type === MSG_TYPES.EMOTE) {
        world.broadcastToRoom(session.currentRoom, {
          type: MSG_TYPES.EMOTE_BROADCAST,
          playerId,
          nickname: player.nickname,
          emote: msg.emote || 'wave',
        });
        return;
      }
    });

    ws.on('close', () => {
      if (playerId) {
        world.removeClient(playerId);
      }
    });
  });

  // Tickers
  const movementInterval = setInterval(() => {
    world.tickMovementBroadcast();
  }, 100); // 10 Hz

  const gardenInterval = setInterval(() => {
    const isRaining = currentWeather === WEATHER.RAIN;
    gardens.tick(1.0, isRaining);

    // Weather rotation every 3 minutes
    const now = Date.now();
    if (now - weatherTimer > 180000) {
      weatherTimer = now;
      const states = [WEATHER.CLEAR, WEATHER.DRIZZLE, WEATHER.RAIN];
      currentWeather = states[(states.indexOf(currentWeather) + 1) % states.length];
      world.broadcastToAll({
        type: MSG_TYPES.WEATHER_UPDATE,
        weather: currentWeather,
      });
    }

    if (economy.tickContracts()) {
      world.broadcastToAll({
        type: MSG_TYPES.CONTRACT_UPDATE,
        contracts: economy.contracts,
      });
    }
  }, 1000); // 1 Hz

  movementInterval.unref();
  gardenInterval.unref();

  function close() {
    clearInterval(movementInterval);
    clearInterval(gardenInterval);
    for (const client of wss.clients) {
      try { client.terminate(); } catch {}
    }
    wss.close();
    server.close();
  }

  return { server, wss, world, gardens, economy, orderbook, storage, close };
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('server/index.js')) {
  const { server } = createServer();
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Afterlight Multiplayer Server listening on port ${PORT}`);
  });
}
