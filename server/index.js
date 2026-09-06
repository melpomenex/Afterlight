import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { MSG_TYPES, ROOMS, WEATHER, parse, serialize } from '../shared/protocol.js';
import { sanitizeNickname, resolveDuplicateNickname } from '../shared/identity.js';
import { Storage } from './storage.js';
import { WorldManager } from './world.js';
import { GardensManager } from './gardens.js';
import { EconomyManager } from './economy.js';
import { OrderBook } from './orderbook.js';
import { NodesManager } from './nodes.js';
import { MachinesManager } from './machines.js';
import { IrcServer } from './irc.js';
import { ChatBridge } from './chat.js';
import { MATERIALS } from '../shared/materials.js';

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

export function createServer(customStorage = null) {
  const storage = customStorage || new Storage();
  const world = new WorldManager();
  const gardens = new GardensManager(storage);
  const nodes = new NodesManager(storage);
  const machines = new MachinesManager(storage);
  const economy = new EconomyManager(storage);
  const orderbook = new OrderBook(storage);

  // Town chat: an embedded IRC server (external clients & bots can connect
  // on the IRC port) with the game world bridged into it. IRC_DISABLED=1
  // skips the TCP listener; the bridge then relays in-game only.
  const irc = new IrcServer();
  const chat = new ChatBridge({ world, irc: irc.enabled ? irc : null });
  if (irc.enabled && irc.ready) {
    irc.ready.then(
      (port) => console.log(`Afterlight IRC relay listening on ${irc.host || '0.0.0.0'}:${port} (#afterlight)`),
      (err) => console.warn(`Afterlight IRC relay could not bind port ${irc.port}: ${err.message} (in-game chat continues without external IRC)`),
    );
  }

  let currentWeather = WEATHER.CLEAR;
  let weatherTimer = Date.now();

  const server = http.createServer((req, res) => {
    if (req.url === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        online: world.clients.size,
        ircPort: irc.enabled ? irc.boundPort : null,
      }));
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
          // Default room: every connected player belongs to at least the
          // Market Court; the client's JOIN_ROOM moves them elsewhere.
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

        // Bridge the player into town chat (IRC presence + history).
        chat.playerConnected(playerId, player, clientSession);

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
            fixtures: garden.fixtures,
          });
        } else {
          // District rooms carry their gather-node states; the Market Court
          // carries machine shop status so late joiners see the same world.
          const nodeStates = nodes.getStatesForDistrict(newRoom);
          if (nodeStates) {
            session.send({ type: MSG_TYPES.NODE_STATE, roomId: newRoom, nodes: nodeStates });
          }
          if (newRoom === ROOMS.MARKET) {
            session.send({ type: MSG_TYPES.MACHINE_UPDATE, machines: machines.getStatus() });
          }
        }
        return;
      }

      if (msg.type === MSG_TYPES.MOVEMENT) {
        // Roomless players have no room to relay to; ignore without errors.
        if (!session.currentRoom) return;
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

        // Sprinkler placement validation: a crafted kit must be in inventory
        if (action === 'place_sprinkler') {
          if (!(player.inventory.sprinklers > 0)) {
            session.send({
              type: MSG_TYPES.ACTION_RESULT,
              actionId,
              success: false,
              message: 'No sprinkler kit in your satchel. Craft one at the machine shop.',
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
          } else if (action === 'place_sprinkler') {
            player.inventory.sprinklers--;
            if (player.inventory.sprinklers <= 0) delete player.inventory.sprinklers;
            storage.savePlayer(player);
          }

          // Broadcast updated garden state to anyone in this garden room
          world.broadcastToRoom(currentRoom, {
            type: MSG_TYPES.GARDEN_STATE,
            roomId: currentRoom,
            beds: res.beds,
            fixtures: res.fixtures,
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

      // --- Chat: relay through the IRC bridge (parses /msg and /me) ---
      if (msg.type === MSG_TYPES.CHAT_SEND) {
        chat.handlePlayerChat(playerId, msg.text);
        return;
      }

      // --- Gathering: material node harvest (server-validated grant) ---
      if (msg.type === MSG_TYPES.NODE_HARVEST) {
        const { actionId, nodeId } = msg;
        // A client must stand in the district that owns the node. This keeps
        // a throttled or stale client (e.g. a background tab whose sim loop
        // froze on the previous district) from gathering remotely.
        if (!nodes.nodeDistrict(nodeId) || nodes.nodeDistrict(nodeId) !== session.currentRoom) {
          session.send({
            type: MSG_TYPES.ACTION_RESULT,
            actionId,
            success: false,
            title: 'Gathered',
            message: 'Nothing to gather here.',
          });
          return;
        }
        const res = nodes.harvest(nodeId);
        if (res.success) {
          const materialDef = MATERIALS[res.material];
          player.materials[res.material] = (player.materials[res.material] || 0) + 1;
          storage.savePlayer(player);
          session.send({
            type: MSG_TYPES.ACTION_RESULT,
            actionId,
            success: true,
            title: 'Gathered',
            message: `Pried loose 1x ${materialDef.name}.`,
          });
          session.send({ type: MSG_TYPES.INVENTORY_STATE, player });
          // Everyone present in the district sees the depletion.
          world.broadcastToRoom(res.district, {
            type: MSG_TYPES.NODE_STATE,
            roomId: res.district,
            nodes: nodes.getStatesForDistrict(res.district),
          });
        } else {
          session.send({
            type: MSG_TYPES.ACTION_RESULT,
            actionId,
            success: false,
            title: 'Gathered',
            message: res.reason === 'node_depleted'
              ? 'This cache is picked clean. It needs time to regrow.'
              : 'Nothing to gather here.',
          });
        }
        return;
      }

      // --- Crafting: machine shop (contribute / mill / craft) ---
      if (msg.type === MSG_TYPES.MACHINE_CONTRIBUTE) {
        const { actionId, material, quantity } = msg;
        const res = machines.contribute(player, material, quantity);
        if (res.success) {
          storage.savePlayer(player);
          session.send({
            type: MSG_TYPES.ACTION_RESULT,
            actionId,
            success: true,
            title: 'The Great Mill',
            message: res.restored
              ? `The Great Mill turns for the first time in years! ${MATERIALS[material].name} accepted: ${res.applied}.`
              : `${MATERIALS[material].name} accepted: ${res.applied}. The mill takes shape.`,
          });
          session.send({ type: MSG_TYPES.INVENTORY_STATE, player });
          world.broadcastToRoom(ROOMS.MARKET, {
            type: MSG_TYPES.MACHINE_UPDATE,
            machines: res.machine,
          });
          if (res.restored) {
            // Flour demand appears as soon as the mill is restored.
            economy.refreshContracts();
            world.broadcastToAll({
              type: MSG_TYPES.CONTRACT_UPDATE,
              contracts: economy.contracts,
            });
          }
        } else {
          session.send({
            type: MSG_TYPES.ACTION_RESULT,
            actionId,
            success: false,
            title: 'The Great Mill',
            message: res.reason === 'mill_already_restored' ? 'The mill is already restored.'
              : res.reason === 'material_not_needed' ? 'The mill has no use for that.'
              : res.reason === 'material_fulfilled' ? 'That material is fully contributed.'
              : res.reason === 'insufficient_materials' ? 'You are not carrying any of that.'
              : 'That contribution cannot be accepted.',
          });
        }
        return;
      }

      if (msg.type === MSG_TYPES.MACHINE_MILL) {
        const { actionId, quantity } = msg;
        const res = machines.millWheat(player, quantity || 1);
        if (res.success) {
          storage.savePlayer(player);
          session.send({
            type: MSG_TYPES.ACTION_RESULT,
            actionId,
            success: true,
            title: 'The Great Mill',
            message: `Ground ${res.milled}x wheat into ${res.milled}x ${res.good.name}.`,
          });
          session.send({ type: MSG_TYPES.INVENTORY_STATE, player });
        } else {
          session.send({
            type: MSG_TYPES.ACTION_RESULT,
            actionId,
            success: false,
            title: 'The Great Mill',
            message: res.reason === 'mill_broken' ? 'The mill is still broken. It needs materials first.'
              : 'You have no wheat to mill.',
          });
        }
        return;
      }

      if (msg.type === MSG_TYPES.MACHINE_CRAFT) {
        const { actionId, fixture } = msg;
        const res = machines.craft(player, fixture);
        if (res.success) {
          storage.savePlayer(player);
          session.send({
            type: MSG_TYPES.ACTION_RESULT,
            actionId,
            success: true,
            title: 'Machine Shop',
            message: `Assembled 1x ${res.name}. Place it on a garden bed from your satchel.`,
          });
          session.send({ type: MSG_TYPES.INVENTORY_STATE, player });
        } else {
          session.send({
            type: MSG_TYPES.ACTION_RESULT,
            actionId,
            success: false,
            title: 'Machine Shop',
            message: res.reason === 'insufficient_materials'
              ? `Not enough ${MATERIALS[res.material]?.name || 'materials'} for that.`
              : 'That cannot be crafted here.',
          });
        }
        return;
      }
    });

    ws.on('close', () => {
      if (playerId) {
        chat.playerDisconnected(playerId);
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

    // Gather-node respawn: notify districts where a node came back.
    for (const districtId of nodes.tick()) {
      world.broadcastToRoom(districtId, {
        type: MSG_TYPES.NODE_STATE,
        roomId: districtId,
        nodes: nodes.getStatesForDistrict(districtId),
      });
    }

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
    chat.destroy();
    irc.close();
    for (const client of wss.clients) {
      try { client.terminate(); } catch {}
    }
    wss.close();
    server.close();
  }

  return { server, wss, world, gardens, economy, orderbook, nodes, machines, storage, irc, chat, close };
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('server/index.js')) {
  const { server } = createServer();
  server.listen(PORT, HOST, () => {
    console.log(`Afterlight Multiplayer Server listening on ${HOST}:${PORT}`);
  });
}
