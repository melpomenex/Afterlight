import { isEmote } from '../shared/emotes.js';
import http from 'node:http';
import zlib from 'node:zlib';
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
import { TheaterManager } from './theater.js';
import { resolvePlaylist } from './youtubePlaylist.js';
import { IptvManager } from './iptv.js';
import { TorrentManager } from './torrents.js';
import { IPTV_LIMITS, iptvErrorText } from '../shared/iptvModel.js';
import { parseXmltv } from '../shared/xmltv.js';
import { theaterErrorText } from '../shared/theaterModel.js';
import { torrentErrorText } from '../shared/torrentModel.js';
import { IrcServer } from './irc.js';
import { ChatBridge } from './chat.js';
import { MATERIALS } from '../shared/materials.js';

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const PLAYLIST_FETCH_TIMEOUT_MS = 15000;

export function createServer(customStorage = null, options = {}) {
  const storage = customStorage || new Storage();
  const { dataDir = null } = options;
  const world = new WorldManager();
  const gardens = new GardensManager(storage);
  const nodes = new NodesManager(storage);
  const machines = new MachinesManager(storage);
  const economy = new EconomyManager(storage);
  const orderbook = new OrderBook(storage);
  const theater = new TheaterManager(storage);
  // Shared Orpheum channel library + program guide. Owns its data files
  // (data/iptv.json, data/epg.json) outside game-state.json — a multi-MB
  // guide must not ride along on every unrelated whole-state save.
  const iptv = new IptvManager(dataDir || undefined);
  // Torrent engine for magnet links on the shared screen (data/torrents/).
  // Owns its cache + magnet library; webtorrent imports lazily so a broken
  // install degrades to readable errors instead of blocking server boot.
  const torrents = options.torrents || new TorrentManager({ dataDir: dataDir || undefined });

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
  let serverTick = 0;
  // Player ids with a torrent resolve in flight (one per connection).
  const torrentResolves = new Set();
  // YouTube playlist resolves: one in flight per player plus a cooldown, so
  // nobody can lean on the server as a YouTube scraper farm.
  const playlistResolves = new Set();
  const playlistCooldowns = new Map();
  const PLAYLIST_RESOLVE_COOLDOWN_MS = 10_000;

  const server = http.createServer(async (req, res) => {
    if (req.url === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        online: world.clients.size,
        ircPort: irc.enabled ? irc.boundPort : null,
      }));
      return;
    }

    // --- Theater uploads: the shared playlist library and the program
    // guide. Files travel over HTTP (a 36 MB guide is no WS JSON frame)
    // with CORS open so the dev client on :5173 can post to :3001;
    // same-origin deployments are unaffected. ---
    if (req.url?.startsWith('/api/theater/')) {
      const origin = req.headers.origin;
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
      }
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }
      let reqUrl;
      try {
        reqUrl = new URL(req.url, 'http://localhost');
      } catch {
        res.writeHead(400);
        res.end();
        return;
      }
      // --- Torrent streaming: Range-capable GET/HEAD for the chosen file
      // of a resolved torrent. <video> elements send plain ranged GETs —
      // no preflight, same open CORS posture as the uploads above. ---
      const torrentMatch = /^\/api\/theater\/torrent\/([^/]+)\/(\d+)$/.exec(reqUrl.pathname);
      if (torrentMatch && (req.method === 'GET' || req.method === 'HEAD')) {
        await handleTorrentStream(req, res, torrentMatch[1], torrentMatch[2]);
        return;
      }
      if (req.method !== 'POST') {
        res.writeHead(405);
        res.end();
        return;
      }
      try {
        if (reqUrl.pathname === '/api/theater/playlists') {
          await handlePlaylistUpload(req, res, reqUrl);
          return;
        }
        if (reqUrl.pathname === '/api/theater/epg') {
          await handleEpgUpload(req, res, reqUrl);
          return;
        }
      } catch (err) {
        console.warn('theater upload failed:', err.message);
        respondJson(res, 500, { error: 'The theater could not accept that upload just now.' });
        return;
      }
      res.writeHead(404);
      res.end();
      return;
    }

    res.writeHead(404);
    res.end();
  });

  // --- Upload plumbing (closures over iptv/world so replies can broadcast) ---

  function respondJson(res, status, payload) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  }

  /**
   * Serve one file of one resolved torrent with Range support. The manager
   * answers { statusCode, headers?, stream? } — 206/200 with a byte stream,
   * or 404/416/503/504 with no body. Aborting the request tears the stream
   * down so a paused/seeking video does not keep the swarm busy.
   */
  async function handleTorrentStream(req, res, rawInfohash, rawFileIndex) {
    let result;
    try {
      result = await torrents.streamFile(String(rawInfohash).toLowerCase(), Number(rawFileIndex), req.headers.range);
    } catch (err) {
      console.warn('torrent stream failed:', err?.message || err);
      respondJson(res, 500, { error: 'The torrent stream broke just now.' });
      return;
    }
    if (!result.stream) {
      res.writeHead(result.statusCode);
      res.end();
      return;
    }
    res.writeHead(result.statusCode, result.headers);
    if (req.method === 'HEAD') {
      result.stream.destroy();
      res.end();
      return;
    }
    result.stream.on('error', (err) => {
      console.warn('torrent file stream error:', err?.message || err);
      res.destroy();
    });
    res.on('close', () => {
      try {
        result.stream.destroy();
      } catch {}
    });
    result.stream.pipe(res);
  }

  /**
   * Read the request body up to maxBytes. Oversized uploads are rejected
   * with an { code: 'too_large' } error (Content-Length is checked first so
   * huge uploads are refused before any bytes are read). The remainder of
   * an oversized body is drained rather than cut off mid-stream — otherwise
   * the client sees a connection reset instead of the clean 413 — with a
   * drain cap so absurd bodies still get the socket torn down.
   */
  function readBody(req, maxBytes) {
    const DRAIN_CAP = maxBytes + 16 * 1024 * 1024;
    return new Promise((resolve, reject) => {
      const declared = Number(req.headers['content-length']);
      if (Number.isFinite(declared) && declared > DRAIN_CAP) {
        const err = new Error('too large');
        err.code = 'too_large';
        req.destroy();
        reject(err);
        return;
      }
      const chunks = [];
      let size = 0;
      let settled = false;
      const tooLarge = () => {
        const err = new Error('too large');
        err.code = 'too_large';
        return err;
      };
      req.on('data', (chunk) => {
        if (settled) {
          size += chunk.length; // draining a rejected body
          if (size > DRAIN_CAP) req.destroy();
          return;
        }
        size += chunk.length;
        if (size > maxBytes) {
          settled = true;
          reject(tooLarge());
          return;
        }
        chunks.push(chunk);
      });
      req.on('end', () => {
        if (!settled) {
          settled = true;
          resolve(Buffer.concat(chunks));
        }
      });
      req.on('error', (err) => {
        if (!settled) {
          settled = true;
          reject(new Error(`read failed: ${err.message}`));
        }
      });
    });
  }

  /**
   * Server-side playlist URL fetch: http(s) only, 15 s timeout, size-capped
   * streaming read. Fixes CORS-hostile hosts — the whole room gets the same
   * result because the server does the fetching, not one player's browser.
   */
  async function fetchPlaylistText(parsedUrl) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PLAYLIST_FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(parsedUrl.href, { signal: controller.signal, redirect: 'follow' });
      if (!res.ok) return { error: `The host answered HTTP ${res.status} for that playlist.` };
      const declared = Number(res.headers.get('content-length'));
      if (Number.isFinite(declared) && declared > IPTV_LIMITS.LIST_TEXT_MAX) {
        return { error: iptvErrorText('text_too_large') };
      }
      const reader = res.body?.getReader?.();
      if (!reader) {
        const text = await res.text();
        if (text.length > IPTV_LIMITS.LIST_TEXT_MAX) return { error: iptvErrorText('text_too_large') };
        return { text };
      }
      const chunks = [];
      let size = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > IPTV_LIMITS.LIST_TEXT_MAX) {
          try {
            await reader.cancel();
          } catch {}
          return { error: iptvErrorText('text_too_large') };
        }
        chunks.push(value);
      }
      return { text: Buffer.concat(chunks).toString('utf8') };
    } catch (err) {
      return {
        error: err?.name === 'AbortError'
          ? 'That playlist took too long to fetch. Try again, or upload it as a file.'
          : 'Could not fetch that playlist URL.',
      };
    } finally {
      clearTimeout(timer);
    }
  }

  function announceIptvState() {
    world.broadcastToRoom(ROOMS.THEATER, { type: MSG_TYPES.IPTV_STATE, iptv: iptv.snapshot() });
  }

  function finishPlaylistUpload(res, name, by, text) {
    const result = iptv.addPlaylist({ name, text, addedBy: by });
    if (!result.success) {
      respondJson(res, 400, { error: iptvErrorText(result.reason) });
      return;
    }
    announceIptvState();
    respondJson(res, 200, {
      ok: true,
      list: {
        id: result.list.id,
        name: result.list.name,
        channelCount: result.list.channels.length,
      },
    });
  }

  async function handlePlaylistUpload(req, res, reqUrl) {
    let body;
    try {
      body = await readBody(req, IPTV_LIMITS.LIST_TEXT_MAX);
    } catch (err) {
      if (err.code === 'too_large') {
        respondJson(res, 413, { error: iptvErrorText('text_too_large') });
        return;
      }
      throw err;
    }
    const name = (reqUrl.searchParams.get('name') || '').trim() || null;
    const by = (reqUrl.searchParams.get('by') || '').trim() || 'Someone';

    // JSON body = import-by-URL variant: the server fetches the playlist.
    if (String(req.headers['content-type'] || '').includes('application/json')) {
      let parsedBody;
      try {
        parsedBody = JSON.parse(body.toString('utf8'));
      } catch {
        respondJson(res, 400, { error: 'Malformed playlist import request.' });
        return;
      }
      const target = typeof parsedBody?.url === 'string' ? parsedBody.url.trim() : '';
      let parsedUrl;
      try {
        parsedUrl = new URL(target);
      } catch {
        respondJson(res, 400, { error: 'Enter a full http(s) URL pointing at a playlist.' });
        return;
      }
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        respondJson(res, 400, { error: 'Only http(s) playlist URLs can be fetched.' });
        return;
      }
      const fetched = await fetchPlaylistText(parsedUrl);
      if (fetched.error) {
        respondJson(res, 502, { error: fetched.error });
        return;
      }
      finishPlaylistUpload(res, name || parsedUrl.hostname, by, fetched.text);
      return;
    }

    finishPlaylistUpload(res, name, by, body.toString('utf8'));
  }

  async function handleEpgUpload(req, res, reqUrl) {
    let body;
    try {
      body = await readBody(req, IPTV_LIMITS.EPG_FILE_MAX);
    } catch (err) {
      if (err.code === 'too_large') {
        respondJson(res, 413, { error: 'That guide file is too large for the theater archive.' });
        return;
      }
      throw err;
    }
    // gzip magic bytes (guides commonly ship .gz — e.g. a 36 MB XMLTV is
    // ~4.6 MB compressed); maxOutputLength defuses decompression bombs.
    let text;
    if (body.length >= 2 && body[0] === 0x1f && body[1] === 0x8b) {
      try {
        text = zlib.gunzipSync(body, { maxOutputLength: IPTV_LIMITS.EPG_FILE_MAX }).toString('utf8');
      } catch {
        respondJson(res, 400, { error: 'That gzip guide could not be unpacked.' });
        return;
      }
    } else {
      text = body.toString('utf8');
    }

    const name = (reqUrl.searchParams.get('name') || '').trim() || 'Program guide';
    const parsed = await parseXmltv(text, {
      maxChannels: IPTV_LIMITS.EPG_CHANNELS_MAX,
      maxProgrammes: IPTV_LIMITS.EPG_PROGRAMMES_MAX,
    });
    if (!parsed.recognized) {
      respondJson(res, 400, { error: 'That file does not look like an XMLTV program guide (.epg / .xml).' });
      return;
    }
    const result = iptv.setEpg({ name, channels: parsed.channels, programmes: parsed.programmes });
    if (!result.success) {
      respondJson(res, 500, { error: 'The guide could not be saved just now.' });
      return;
    }
    announceIptvState();
    respondJson(res, 200, {
      ok: true,
      epg: result.summary,
      skipped: parsed.skipped,
      truncated: parsed.truncated,
    });
  }

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
          theater: theater.snapshot(),
          iptv: iptv.snapshot(),
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
          theater: theater.snapshot(),
          iptv: iptv.snapshot(),
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
          if (newRoom === ROOMS.THEATER) {
            // Late joiners get the shared screen's current bill so their
            // player settles on the same item the room is watching.
            session.send({
              type: MSG_TYPES.THEATER_STATE,
              theater: theater.snapshot(),
              serverNow: Date.now(),
            });
            // ...and the shared channel library + guide catalog (metadata
            // only; channel arrays are pulled per list on demand).
            session.send({ type: MSG_TYPES.IPTV_STATE, iptv: iptv.snapshot() });
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
        if (!isEmote(msg.emote) || Date.now() - (session.lastEmoteAt || 0) < 500) return;
        session.lastEmoteAt = Date.now();
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

      // --- Theater: the shared Orpheum screen. All rules live in the
      // shared reducer; the server only guards the room and relays full
      // snapshots (sender included, so their UI syncs too). ---
      if (msg.type === MSG_TYPES.THEATER_QUEUE || msg.type === MSG_TYPES.THEATER_CONTROL || msg.type === MSG_TYPES.THEATER_CHANNEL) {
        if (session.currentRoom !== ROOMS.THEATER) {
          session.send({
            type: MSG_TYPES.ERROR,
            message: 'You need to be inside The Orpheum to reach the projector.',
          });
          return;
        }
        // theater_channel is a bare {url, title}; normalize it to the
        // reducer's channel op. Torrent play-now reuses the op and carries
        // the resolve→pick fields through (the reducer validates them);
        // other kinds ignore the extra fields.
        const payload = msg.type === MSG_TYPES.THEATER_CHANNEL
          ? {
              op: 'channel',
              url: msg.url,
              title: msg.title,
              torrentName: msg.torrentName,
              fileIndex: msg.fileIndex,
              filePath: msg.filePath,
              fileBytes: msg.fileBytes,
            }
          : msg;
        const res = theater.applyAction(player.nickname, payload);
        if (res.success) {
          // Batch imports tell the importer what actually happened before
          // the room-wide snapshot lands; single adds have nothing to add.
          if (res.report) {
            session.send({ type: MSG_TYPES.THEATER_IMPORT_RESULT, ...res.report });
          }
          world.broadcastToRoom(ROOMS.THEATER, {
            type: MSG_TYPES.THEATER_STATE,
            theater: theater.snapshot(),
            serverNow: Date.now(),
          });
        } else {
          session.send({ type: MSG_TYPES.ERROR, message: theaterErrorText(res.reason) });
        }
        return;
      }

      // --- YouTube playlist import: resolve a public playlist to its video
      // list. Nothing reaches the shared bill here — the importer previews
      // the reply and confirms, and only then does an addMany op queue the
      // batch through the shared reducer. Room-guarded like the torrent
      // resolve, one in flight per player plus a cooldown. ---
      if (msg.type === MSG_TYPES.THEATER_PLAYLIST_RESOLVE) {
        if (session.currentRoom !== ROOMS.THEATER) {
          session.send({
            type: MSG_TYPES.ERROR,
            message: 'You need to be inside The Orpheum to import playlists.',
          });
          return;
        }
        if (playlistResolves.has(playerId)) {
          session.send({ type: MSG_TYPES.ERROR, message: theaterErrorText('resolve_in_flight') });
          return;
        }
        const lastResolve = playlistCooldowns.get(playerId) || 0;
        if (Date.now() - lastResolve < PLAYLIST_RESOLVE_COOLDOWN_MS) {
          session.send({ type: MSG_TYPES.ERROR, message: theaterErrorText('resolve_cooldown') });
          return;
        }
        const requestId = String(msg.requestId || '');
        playlistResolves.add(playerId);
        playlistCooldowns.set(playerId, Date.now());
        resolvePlaylist(msg.listId)
          .then((result) => {
            if (result.reason) {
              session.send({ type: MSG_TYPES.ERROR, message: theaterErrorText(result.reason) });
              return;
            }
            session.send({
              type: MSG_TYPES.THEATER_PLAYLIST_RESOLVED,
              requestId,
              title: result.title,
              videos: result.videos,
            });
          })
          .finally(() => playlistResolves.delete(playerId));
        return;
      }

      // --- IPTV library + program guide: the room-shared channel catalog.
      // Uploads ride HTTP (above); these small control messages pull a
      // list's channels, remove lists, and look up guide schedules. All
      // theater-room-scoped like the projector controls. ---
      if (msg.type === MSG_TYPES.IPTV_LIST_GET || msg.type === MSG_TYPES.IPTV_LIST_REMOVE || msg.type === MSG_TYPES.EPG_LOOKUP) {
        if (session.currentRoom !== ROOMS.THEATER) {
          session.send({
            type: MSG_TYPES.ERROR,
            message: 'You need to be inside The Orpheum to browse the channel library.',
          });
          return;
        }
        if (msg.type === MSG_TYPES.IPTV_LIST_GET) {
          const listId = String(msg.listId || '');
          const channels = iptv.listChannels(listId);
          session.send({ type: MSG_TYPES.IPTV_LIST, listId, channels: channels || [] });
          return;
        }
        if (msg.type === MSG_TYPES.IPTV_LIST_REMOVE) {
          const res = iptv.removeList(String(msg.listId || ''));
          if (res.success) {
            announceIptvState();
          } else {
            session.send({ type: MSG_TYPES.ERROR, message: iptvErrorText(res.reason) });
          }
          return;
        }
        // EPG_LOOKUP: bounded now/next for the guide's visible channels.
        const keys = (Array.isArray(msg.keys) ? msg.keys : [])
          .filter((k) => typeof k === 'string' && k.trim())
          .map((k) => k.trim())
          .slice(0, IPTV_LIMITS.EPG_LOOKUP_MAX);
        session.send({ type: MSG_TYPES.EPG_SCHEDULE, entries: iptv.lookupEpg(keys, Date.now()) });
        return;
      }

      // --- Torrent streaming: resolve a magnet to its file list. Nothing
      // reaches the shared bill here — the paster picks a file from the
      // reply, and the pick travels as a normal queue/channel op with the
      // pick fields (validated by the shared reducer). ---
      if (msg.type === MSG_TYPES.TORRENT_RESOLVE) {
        if (session.currentRoom !== ROOMS.THEATER) {
          session.send({
            type: MSG_TYPES.ERROR,
            message: 'You need to be inside The Orpheum to reach the torrent reel.',
          });
          return;
        }
        if (torrentResolves.has(playerId)) {
          session.send({ type: MSG_TYPES.ERROR, message: torrentErrorText('resolve_in_flight') });
          return;
        }
        const requestId = String(msg.requestId || '');
        torrentResolves.add(playerId);
        torrents.resolve(String(msg.magnet || ''))
          .then((snap) => {
            session.send({
              type: MSG_TYPES.TORRENT_FILES,
              requestId,
              infohash: snap.infohash,
              name: snap.name,
              files: snap.files,
            });
          })
          .catch((err) => {
            session.send({ type: MSG_TYPES.ERROR, message: torrentErrorText(err?.reason || 'resolve_failed') });
          })
          .finally(() => torrentResolves.delete(playerId));
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

    // --- Torrent housekeeping (on the shared 1 Hz tick; no new timer) ---
    serverTick += 1;
    const billItems = [theater.state?.now, ...(theater.state?.queue || [])];
    const torrentInfohashes = billItems
      .filter((item) => item?.kind === 'torrent' && item.infohash)
      .map((item) => item.infohash);
    // Swarm progress every ~2 s while something torrent-ish is live or a
    // resolve is in flight; otherwise the room hears nothing.
    if ((torrentInfohashes.length > 0 || torrentResolves.size > 0) && serverTick % 2 === 0) {
      world.broadcastToRoom(ROOMS.THEATER, {
        type: MSG_TYPES.TORRENT_STATE,
        items: torrents.status(),
      });
    }
    // Reap idle torrents (bill references survive) and enforce the cache cap.
    torrents.tick(torrentInfohashes).catch((err) => {
      console.warn('torrent tick failed:', err?.message || err);
    });
  }, 1000); // 1 Hz

  movementInterval.unref();
  gardenInterval.unref();

  function close() {
    clearInterval(movementInterval);
    clearInterval(gardenInterval);
    chat.destroy();
    irc.close();
    torrents.close();
    for (const client of wss.clients) {
      try { client.terminate(); } catch {}
    }
    wss.close();
    server.close();
  }

  return { server, wss, world, gardens, economy, orderbook, nodes, machines, theater, iptv, torrents, storage, irc, chat, close };
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('server/index.js')) {
  const { server } = createServer();
  server.listen(PORT, HOST, () => {
    console.log(`Afterlight Multiplayer Server listening on ${HOST}:${PORT}`);
  });
}
