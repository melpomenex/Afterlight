import { isEmote } from '../shared/emotes.js';
import http from 'node:http';
import zlib from 'node:zlib';
import { WebSocketServer, WebSocket } from 'ws';
import { MSG_TYPES, ROOMS, WEATHER, parse, serialize } from '../shared/protocol.js';
import { parseHelloRt, buildWelcomeRt } from '../shared/realtime/negotiation.js';
import { sanitizeNickname, resolveDuplicateNickname } from '../shared/identity.js';
import { ensureAvatar } from './avatars.js';
import { Storage } from './storage.js';
import { initBaselineProbe } from './baselineProbe.js';
import { WorldManager } from './world.js';
import { TheaterManager } from './theater.js';
import { resolvePlaylist } from './youtubePlaylist.js';
import { IptvManager } from './iptv.js';
import { TorrentManager, verifyTorrentGrant, redactGrantQuery } from './torrents.js';
import { torrentGrantSecrets } from '../shared/torrentGrant.js';
import { IPTV_LIMITS, iptvErrorText } from '../shared/iptvModel.js';
import { parseXmltv } from '../shared/xmltv.js';
import { theaterErrorText } from '../shared/theaterModel.js';
import { torrentErrorText } from '../shared/torrentModel.js';
import { IrcServer } from './irc.js';
import { ChatBridge } from './chat.js';
import { IrcPhoenixAdapter } from './ircAdapter.js';

// Retired gardening/economy commands. New clients never send these; an old
// client gets a bounded refusal instead of silence or a crash.
const RETIRED_COMMANDS = new Set([
  'garden_action', 'market_buy', 'market_sell', 'order_place', 'order_cancel',
  'contract_complete', 'node_harvest', 'machine_contribute', 'machine_mill', 'machine_craft',
]);

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const NODE_DURABLE_READ_ONLY = process.env.AFTERLIGHT_NODE_DURABLE_READ_ONLY === '1';
const PLAYLIST_FETCH_TIMEOUT_MS = 15000;

/**
 * Torrent playback grant enforcement (P7 specialty adapters).
 * grants_required defaults on; loopback-dev escape requires TORRENT_LOOPBACK_DEV=1
 * and binds the listener to loopback only. Production refuses grants-off boot.
 */
export function resolveTorrentGrantConfig(options = {}) {
  const loopbackDev = options.loopbackDev ?? (process.env.TORRENT_LOOPBACK_DEV === '1');
  const grantsRequired = options.grantsRequired ?? (process.env.TORRENT_GRANTS_REQUIRED !== '0');
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd && !grantsRequired) {
    throw new Error('Refusing to boot: torrent grant enforcement cannot be disabled in production');
  }
  if (!grantsRequired && !loopbackDev) {
    throw new Error('Refusing to boot: disabling torrent grants requires TORRENT_LOOPBACK_DEV=1');
  }

  return { grantsRequired, loopbackDev, secrets: options.grantSecrets ?? torrentGrantSecrets() };
}

/**
 * Stable diagnostic category for a refused torrent stream request.
 * `grant` is the presented query value (may be null) and `reason` the
 * verifier's reason. Never includes the token or any secret.
 */
export function torrentGrantRefusalCategory(grant, reason) {
  if (!grant) return 'grant_missing';
  if (reason === 'expired') return 'grant_expired';
  return 'grant_invalid';
}

export function createServer(customStorage = null, options = {}) {
  const storage = customStorage || new Storage();

  if (NODE_DURABLE_READ_ONLY) {
    console.log('[afterlight] AFTERLIGHT_NODE_DURABLE_READ_ONLY=1 — skipping game-state.json writes');
    storage.save = () => {};
  }

  initBaselineProbe({ storage });
  const { dataDir = null } = options;
  const torrentGrantConfig = resolveTorrentGrantConfig(options);
  const world = new WorldManager();
  const theater = new TheaterManager(storage);
  // Shared Orpheum channel library + program guide. Owns its data files
  // (data/iptv.json, data/epg.json) outside game-state.json — a multi-MB
  // guide must not ride along on every unrelated whole-state save.
  const iptv = new IptvManager(dataDir || undefined);
  // Torrent engine for magnet links on the shared screen (data/torrents/).
  // Owns its cache + magnet library; webtorrent imports lazily so a broken
  // install degrades to readable errors instead of blocking server boot.
  const torrents = options.torrents || new TorrentManager({ dataDir: dataDir || undefined });
  // The bill is the canonical magnet source: stream requests can revive a
  // torrent entry after a restart even when the manager's library cache is
  // missing (game-state.json carries the magnet on every torrent item).
  torrents.setMagnetResolver((infohash) => {
    const items = [theater.state?.now, ...(theater.state?.queue || [])];
    const item = items.find((it) => it?.kind === 'torrent' && it.infohash === infohash);
    return item?.url || null;
  });

  // Town chat: an embedded IRC server (external clients & bots can connect
  // on the IRC port) with the game world bridged into it. IRC_DISABLED=1
  // skips the TCP listener; the bridge then relays in-game only.
  const irc = new IrcServer();
  const chatRelayEnabled = options.chatRelayEnabled ?? (process.env.CHAT_RELAY_DISABLED !== '1' && process.env.NODE_CHAT_RELAY !== '0');
  const chat = new ChatBridge({ world, irc: irc.enabled ? irc : null, enabled: chatRelayEnabled });
  if (irc.enabled && irc.ready) {
    irc.ready.then(
      (port) => console.log(`Afterlight IRC relay listening on ${irc.host || '0.0.0.0'}:${port} (#afterlight)`),
      (err) => console.warn(`Afterlight IRC relay could not bind port ${irc.port}: ${err.message} (in-game chat continues without external IRC)`),
    );
  }

  // P7 IRC adapter: when the Phoenix gateway owns game chat (the legacy
  // relay disabled via CHAT_RELAY_DISABLED=1) and a callback door is
  // configured, this adapter replaces ChatBridge's game-relay halves —
  // Phoenix posts chat/presence events in, external IRC traffic (bots,
  // IRC clients) is pushed back to the gateway so it reaches the panel.
  const ircAdapter = (!chatRelayEnabled && irc.enabled && process.env.AFTERLIGHT_IRC_CALLBACK_URL)
    ? new IrcPhoenixAdapter({
        irc,
        callbackUrl: process.env.AFTERLIGHT_IRC_CALLBACK_URL,
        boundarySecret: process.env.AFTERLIGHT_BOUNDARY_SECRET,
      })
    : null;
  if (ircAdapter) {
    console.log('Afterlight IRC adapter active: Phoenix owns game chat (POST /api/irc/adapter/event)');
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

  /**
   * Private boundary check (P2 gateway transport). The Phoenix gateway
   * presents x-afterlight-boundary on its loopback shadow connections.
   * A request presenting an INVALID secret is rejected; a request with no
   * secret is still accepted during P2 so direct-to-Node clients (the
   * rollback path) keep working. With the env unset there is nothing to
   * check and everything is accepted.
   */
  function boundaryRejects(req) {
    const expected = process.env.AFTERLIGHT_BOUNDARY_SECRET;
    if (!expected) return false;
    const presented = req.headers['x-afterlight-boundary'];
    return presented !== undefined && presented !== expected;
  }

  /** P7 adapter routes require a valid boundary secret when one is configured. */
  function adapterRejects(req) {
    const expected = process.env.AFTERLIGHT_BOUNDARY_SECRET;
    if (!expected) return false;
    return req.headers['x-afterlight-boundary'] !== expected;
  }

  const server = http.createServer(async (req, res) => {
    if (boundaryRejects(req)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'boundary' }));
      return;
    }
    if (req.url === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        online: world.clients.size,
        ircPort: irc.enabled ? irc.boundPort : null,
      }));
      return;
    }

    // --- P7 IRC adapter (Phoenix-owned chat ↔ embedded IRC server).
    // Authenticated like the torrent routes; the gateway health-probes
    // /health and relays chat frames through /event. ---
    if (ircAdapter && req.url?.startsWith('/api/irc/adapter')) {
      if (adapterRejects(req)) {
        respondJson(res, 403, { error: 'boundary' });
        return;
      }
      let adapterUrl;
      try {
        adapterUrl = new URL(req.url, 'http://localhost');
      } catch {
        res.writeHead(400);
        res.end();
        return;
      }
      if (adapterUrl.pathname === '/api/irc/adapter/health' && req.method === 'GET') {
        respondJson(res, 200, { ok: true });
        return;
      }
      if (adapterUrl.pathname === '/api/irc/adapter/event' && req.method === 'POST') {
        let body;
        try {
          body = await readBody(req, 64 * 1024);
        } catch {
          respondJson(res, 400, { error: 'bad_request' });
          return;
        }
        let parsed;
        try {
          parsed = JSON.parse(body.toString('utf8'));
        } catch {
          respondJson(res, 400, { error: 'bad_request' });
          return;
        }
        if (!parsed || typeof parsed.event !== 'object' || parsed.event === null) {
          respondJson(res, 400, { error: 'bad_request' });
          return;
        }
        respondJson(res, 200, ircAdapter.handleInboundEvent(parsed.event));
        return;
      }
      respondJson(res, 404, { error: 'not_found' });
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
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, x-afterlight-boundary');
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
        await handleTorrentStream(req, res, reqUrl, torrentMatch[1], torrentMatch[2]);
        return;
      }
      // --- P7 specialty adapter (Phoenix → sidecar, authenticated) ---
      if (reqUrl.pathname === '/api/theater/torrent/resolve' && req.method === 'POST') {
        if (adapterRejects(req)) {
          respondJson(res, 403, { error: 'boundary' });
          return;
        }
        let body;
        try {
          body = await readBody(req, 4096);
        } catch {
          respondJson(res, 400, { error: 'bad_request' });
          return;
        }
        let parsed;
        try {
          parsed = JSON.parse(body.toString('utf8'));
        } catch {
          respondJson(res, 400, { error: 'bad_request' });
          return;
        }
        try {
          const snap = await torrents.resolve(String(parsed?.magnet || ''));
          respondJson(res, 200, {
            infohash: snap.infohash,
            name: snap.name,
            files: snap.files,
          });
        } catch (err) {
          const reason = err?.reason || 'resolve_failed';
          const status = reason === 'invalid_magnet' ? 400
            : reason === 'engine_unavailable' ? 503
            : reason === 'resolve_timeout' ? 504
            : 502;
          respondJson(res, status, { reason });
        }
        return;
      }
      if (reqUrl.pathname === '/api/theater/torrent/status' && req.method === 'GET') {
        if (adapterRejects(req)) {
          respondJson(res, 403, { error: 'boundary' });
          return;
        }
        respondJson(res, 200, { items: torrents.status() });
        return;
      }
      if (reqUrl.pathname === '/api/theater/torrent/exempt' && req.method === 'PUT') {
        if (adapterRejects(req)) {
          respondJson(res, 403, { error: 'boundary' });
          return;
        }
        let body;
        try {
          body = await readBody(req, 64 * 1024);
        } catch {
          respondJson(res, 400, { error: 'bad_request' });
          return;
        }
        let parsed;
        try {
          parsed = JSON.parse(body.toString('utf8'));
        } catch {
          respondJson(res, 400, { error: 'bad_request' });
          return;
        }
        const list = Array.isArray(parsed?.infohashes) ? parsed.infohashes : [];
        torrents.setExemptInfohashes(list);
        respondJson(res, 200, { ok: true, count: list.length });
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
   * Serve one file of one resolved torrent with Range support. When grant
   * enforcement is on (default), every request must carry a valid `grant`
   * query parameter minted by Phoenix for the same infohash/file.
   */
  async function handleTorrentStream(req, res, reqUrl, rawInfohash, rawFileIndex) {
    const infohash = String(rawInfohash).toLowerCase();
    const fileIndex = Number(rawFileIndex);
    const grant = reqUrl.searchParams.get('grant');

    if (torrentGrantConfig.grantsRequired) {
      const verdict = verifyTorrentGrant(grant, infohash, fileIndex, torrentGrantConfig.secrets);
      if (!verdict.ok) {
        const category = torrentGrantRefusalCategory(grant, verdict.reason);
        console.warn(
          `torrent stream refused category=${category} reason=${verdict.reason} ` +
            `hash=${infohash.slice(0, 8)} path=${redactGrantQuery(req.url)}`
        );
        res.writeHead(403);
        res.end();
        return;
      }
    }

    let result;
    try {
      result = await torrents.streamFile(infohash, fileIndex, req.headers.range);
    } catch (err) {
      console.warn('torrent stream failed:', err?.message || err);
      respondJson(res, 500, { error: 'The torrent stream broke just now.' });
      return;
    }
    if (!result.stream) {
      const statusCode = Number(result.statusCode) || 500;
      const category = result.reason || `stream_${statusCode}`;
      const line =
        `torrent stream refused category=${category} hash=${infohash.slice(0, 8)} ` +
        `index=${fileIndex} status=${statusCode}`;

      // 404s are routine (stale bills, probes); everything else is worth a
      // warn line. Neither ever contains the magnet or a grant token.
      if (statusCode === 404) console.debug(line);
      else console.warn(line);

      res.writeHead(statusCode);
      res.end();
      return;
    }
    if (process.env.DEBUG_TORRENT_STREAM === '1') {
      console.log(
        `torrent stream opened hash=${infohash.slice(0, 8)} index=${fileIndex} status=${result.statusCode}`
      );
    }
    res.writeHead(result.statusCode, result.headers);
    if (req.method === 'HEAD') {
      result.stream.destroy();
      res.end();
      return;
    }
    result.stream.on('error', (err) => {
      console.warn(
        `torrent stream stalled category=stream_stalled hash=${infohash.slice(0, 8)} ` +
          `index=${fileIndex} message=${err?.message || err}`
      );
      res.destroy();
    });
    res.on('close', () => {
      try {
        result.stream.destroy();
      } catch {}
    });
    if (process.env.DEBUG_TORRENT_STREAM === '1') {
      result.stream.once('data', () => {
        console.log(`torrent stream first_bytes hash=${infohash.slice(0, 8)} index=${fileIndex}`);
      });
    }
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

  const wss = new WebSocketServer({
    server,
    // Same boundary rule for socket upgrades: only an invalid secret is
    // refused; secret-less upgrades stay open for direct clients (P2).
    verifyClient: (info) => !boundaryRejects(info.req),
  });

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
            currentRoom: ROOMS.MARKET,
            lastSeen: Date.now(),
          };
        } else {
          player.nickname = validNick;
          player.lastSeen = Date.now();
        }

        ensureAvatar(player);
        storage.savePlayer(player);

        const clientSession = {
          ws,
          player,
          x: 0,
          z: 3,
          rotY: 0,
          walking: false,
          rt: parseHelloRt(msg),
          // Default room: every connected player belongs to at least the
          // Market Court; the client's JOIN_ROOM moves them elsewhere.
          currentRoom: ROOMS.MARKET,
          send(m) {
            if (ws.readyState === WebSocket.OPEN) ws.send(serialize(m));
          },
        };

        world.addClient(playerId, clientSession);

        // Send welcome
        const welcomeMsg = {
          type: MSG_TYPES.WELCOME,
          player,
          weather: currentWeather,
          theater: theater.snapshot(),
          iptv: iptv.snapshot(),
        };
        if (clientSession.rt) welcomeMsg.rt = buildWelcomeRt();
        clientSession.send(welcomeMsg);

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
          theater: theater.snapshot(),
          iptv: iptv.snapshot(),
        });
        return;
      }

      if (msg.type === MSG_TYPES.JOIN_ROOM) {
        const newRoom = msg.roomId || ROOMS.MARKET;
        world.joinRoom(playerId, newRoom);

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
        return;
      }

      if (msg.type === MSG_TYPES.MOVEMENT) {
        // Roomless players have no room to relay to; ignore without errors.
        if (!session.currentRoom) return;
        world.updateMovement(playerId, msg);
        return;
      }

      if (RETIRED_COMMANDS.has(msg.type)) {
        session.send({ type: MSG_TYPES.ERROR, message: 'This action was retired.' });
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

  const housekeepingInterval = setInterval(() => {
    // Weather rotation every 3 minutes (presentation only after the
    // gardening retirement; no simulation consumes it).
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
  housekeepingInterval.unref();

  function close() {
    clearInterval(movementInterval);
    clearInterval(housekeepingInterval);
    chat.destroy();
    ircAdapter?.destroy();
    irc.close();
    torrents.close();
    for (const client of wss.clients) {
      try { client.terminate(); } catch {}
    }
    wss.close();
    server.close();
  }

  return {
    server, wss, world, theater, iptv, torrents,
    storage, irc, chat, close, torrentGrantConfig,
  };
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('server/index.js')) {
  const grantConfig = resolveTorrentGrantConfig();
  const listenHost = (!grantConfig.grantsRequired && grantConfig.loopbackDev) ? '127.0.0.1' : HOST;
  const { server } = createServer();
  server.listen(PORT, listenHost, () => {
    console.log(`Afterlight Multiplayer Server listening on ${listenHost}:${PORT}`);
    if (!grantConfig.grantsRequired) {
      console.warn('TORRENT_LOOPBACK_DEV: torrent stream grants are DISABLED (loopback only)');
    }
  });
}
