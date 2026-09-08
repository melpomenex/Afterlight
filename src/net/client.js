import { MSG_TYPES, serialize, parse } from '../../shared/protocol.js';
import { generateDefaultNickname, sanitizeNickname } from '../../shared/identity.js';
import { createPhoenixTransport } from './phoenixClient.js';
import { jitteredRejoinDelay, shouldApplyRoomFrame } from './roomEpoch.js';

const GUEST_KEY = 'afterlight-gardener-guest-id';
const NICK_KEY = 'afterlight-gardener-nickname';

/**
 * Default transport: the original raw WebSocket to the Node server. The
 * facade drives it through lifecycle callbacks; `client.ws` stays the live
 * socket for callers that inspect it.
 */
function createNodeTransport(client, wsUrl) {
  return {
    isOpen: () => !!(client.ws && client.ws.readyState === WebSocket.OPEN),
    isConnecting: () => !!(client.ws && client.ws.readyState === WebSocket.CONNECTING),
    connect() {
      if (this.isOpen() || this.isConnecting()) return;
      let ws;
      try {
        ws = new WebSocket(wsUrl);
      } catch (e) {
        console.warn('WebSocket init failed, scheduling reconnect:', e.message);
        client.scheduleReconnect();
        return;
      }
      client.ws = ws;
      ws.binaryType = 'arraybuffer'; // binary fast path (realtime data plane); text frames unaffected
      ws.onopen = () => client.handleOpen();
      ws.onmessage = (event) => {
        // Binary frames belong to the negotiated realtime data plane
        // (docs/architecture/realtime/contract.md); they are never JSON.
        // Without a handleBinary hook this drops exactly as before.
        if (typeof event.data !== 'string') {
          if (client.handleBinary) client.handleBinary(event.data);
          return;
        }
        const msg = parse(event.data);
        if (!msg || !msg.type) return;
        client.handleFrame(msg);
      };
      ws.onclose = () => client.handleClose();
      ws.onerror = (err) => client.handleError(err);
    },
    send(frame) {
      client.ws.send(serialize(frame));
    },
    close() {
      if (client.ws) client.ws.close();
    },
  };
}

/**
 * NetworkClient — the public network facade.
 *
 * All gameplay semantics live here and hold for every transport: multiple
 * handlers per type in registration order, silent-drop sends while closed,
 * the ~12 Hz movement self-throttle, hello-then-desiredRoom replay on every
 * (re)connect, and the HTTP side channel derived from the WS URL.
 *
 * Transports (pluggable, chosen at build time via VITE_TRANSPORT):
 *   'node'    — raw WebSocket to the Node server (default; unchanged behavior)
 *   'phoenix' — Phoenix Channels via src/net/phoenixClient.js (P2 gateway)
 */
export class NetworkClient {
  constructor(wsUrl = null) {
    this.wsUrl = wsUrl || this.getDefaultUrl();
    this.guestId = this.getOrCreateGuestId();
    this.nickname = this.getOrCreateNickname();
    this.ws = null;
    this.connected = false;
    this.handlers = new Map();
    this.connectListeners = [];
    this.disconnectListeners = [];
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.lastMovementSend = 0;
    this.desiredRoom = null;
    // Terminal close (deliberate tightening #2, add-world-room-runtime D8):
    // an `error {message: "superseded"}` frame means a newer connection for
    // this guest identity won the duplicate-connect race and this transport
    // was closed. Reconnecting would make two live tabs evict each other
    // forever, so the facade stops retrying; a reload starts a fresh race.
    this.superseded = false;
    this.roomEpochs = new Map();
    /** infohash:fileIndex -> { grant, expiresAtMs } — P7 playback grants. */
    this.torrentGrants = new Map();
    this.transportMode = import.meta.env?.VITE_TRANSPORT === 'phoenix' ? 'phoenix' : 'node';
    this.transport = this.transportMode === 'phoenix'
      ? createPhoenixTransport(this, this.wsUrl)
      : createNodeTransport(this, this.wsUrl);
  }

  getDefaultUrl() {
    // Deployed builds get the multiplayer server URL at build time
    // (e.g. VITE_WS_URL=wss://example.invalid/ws); dev falls back to localhost.
    const configured = import.meta.env?.VITE_WS_URL;
    if (configured) return configured;
    const loc = window.location;
    const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    // By default, connect to port 3001 if on dev localhost, or same host
    const port = loc.port === '5173' || loc.port === '4173' ? '3001' : loc.port;
    return `${protocol}//${loc.hostname}:${port}/ws`;
  }

  getOrCreateGuestId() {
    try {
      let id = localStorage.getItem(GUEST_KEY);
      if (!id || typeof id !== 'string') {
        id = 'guest_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
        localStorage.setItem(GUEST_KEY, id);
      }
      return id;
    } catch {
      return 'guest_' + Math.random().toString(36).substring(2, 11);
    }
  }

  getOrCreateNickname() {
    try {
      let name = localStorage.getItem(NICK_KEY);
      if (!name) {
        name = generateDefaultNickname();
        localStorage.setItem(NICK_KEY, name);
      }
      return sanitizeNickname(name);
    } catch {
      return generateDefaultNickname();
    }
  }

  setStoredNickname(name) {
    this.nickname = sanitizeNickname(name);
    try {
      localStorage.setItem(NICK_KEY, this.nickname);
    } catch {}
  }

  connect() {
    // Terminal close (D8): a superseded transport stays dead — scheduleReconnect
    // already refuses to retry, and nothing else may reopen the race from this
    // session either. A reload constructs a fresh client and starts a new race.
    if (this.superseded) return;
    if (this.transport.isOpen() || this.transport.isConnecting()) return;
    this.transport.connect();
  }

  // -- transport lifecycle callbacks ---------------------------------------

  /** Transport is ready to carry frames (Node: socket open; Phoenix: joined). */
  handleOpen() {
    this.connected = true;
    this.reconnectAttempts = 0;
    this.send(MSG_TYPES.HELLO, {
      guestId: this.guestId,
      nickname: this.nickname,
      // additive realtime capability advertisement (contract §5); absent
      // unless the fast path is flag-enabled, so legacy servers see nothing
      ...(this.rtHello ? { rt: this.rtHello } : {}),
    });
    // Re-join the remembered room on every (re)connect. This also covers a
    // joinRoom() requested before the handshake finished: send() drops
    // packets until the transport is open, so the request is replayed here.
    if (this.desiredRoom) {
      this.send(MSG_TYPES.JOIN_ROOM, { roomId: this.desiredRoom });
    }
    this.connectListeners.forEach(fn => fn());
  }

  /** One flat frame `{type, ...fields}` from the transport. */
  handleFrame(msg) {
    if (msg.type === 'error' && msg.message === 'superseded') {
      this.superseded = true;
    }
    if (msg.type === 'error' && msg.message === 'lease_lost') {
      if (typeof msg.epoch === 'number' && this.desiredRoom) {
        const prev = this.roomEpochs.get(this.desiredRoom) ?? 0;
        if (msg.epoch > prev) this.roomEpochs.set(this.desiredRoom, msg.epoch);
      }
      this.scheduleReconnect(jitteredRejoinDelay());
      return;
    }
    if (!shouldApplyRoomFrame(this.roomEpochs, this.desiredRoom, msg)) {
      return;
    }
    if (msg.type === 'torrent_grant') {
      this.storeTorrentGrant(msg);
    }
    const handlers = this.handlers.get(msg.type);
    if (handlers) {
      handlers.forEach(fn => fn(msg));
    }
  }

  handleClose() {
    this.connected = false;
    this.disconnectListeners.forEach(fn => fn());
    this.scheduleReconnect();
  }

  handleError(err) {
    console.warn('NetworkClient transport error:', err);
  }

  scheduleReconnect(baseDelayMs = null) {
    if (this.superseded) return; // terminal close: never fight the winner
    if (this.reconnectTimer) return;
    const delay = baseDelayMs ?? Math.min(10000, 1000 * Math.pow(1.5, this.reconnectAttempts));
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  on(msgType, handler) {
    if (!this.handlers.has(msgType)) {
      this.handlers.set(msgType, []);
    }
    this.handlers.get(msgType).push(handler);
  }

  onConnect(fn) {
    this.connectListeners.push(fn);
  }

  onDisconnect(fn) {
    this.disconnectListeners.push(fn);
  }

  send(type, payload = {}) {
    if (this.transport.isOpen()) {
      this.transport.send({ type, ...payload });
    }
  }

  sendMovement(x, z, rotY, walking, sitting = false, airborne = false) {
    const now = performance.now();
    // Cap client movement packets at ~12 Hz (every 80ms)
    if (now - this.lastMovementSend < 80) return;
    this.lastMovementSend = now;
    // airborne is additive presence presentation (remote hop animation);
    // the server only relays it, and receivers without it stay grounded.
    this.send(MSG_TYPES.MOVEMENT, { x, z, rotY, walking, sitting: !!sitting, airborne: !!airborne });
  }

  sendTheaterQueue(payload) { this.send(MSG_TYPES.THEATER_QUEUE, payload); }

  sendTheaterControl(payload) { this.send(MSG_TYPES.THEATER_CONTROL, payload); }

  sendTheaterChannel(url, title) { this.send(MSG_TYPES.THEATER_CHANNEL, { url, title }); }

  /** Ask the server's torrent engine to resolve a magnet to its file list. */
  sendTorrentResolve(requestId, magnet) { this.send(MSG_TYPES.TORRENT_RESOLVE, { requestId, magnet }); }

  /** Ask the server to read a public YouTube playlist for the import flow. */
  sendPlaylistResolve(requestId, listId) { this.send(MSG_TYPES.THEATER_PLAYLIST_RESOLVE, { requestId, listId }); }

  sendIptvListGet(listId) { this.send(MSG_TYPES.IPTV_LIST_GET, { listId }); }

  sendIptvListRemove(listId) { this.send(MSG_TYPES.IPTV_LIST_REMOVE, { listId }); }

  sendEpgLookup(keys) { this.send(MSG_TYPES.EPG_LOOKUP, { keys }); }

  /**
   * Conferencing: join an authorized call channel (P8).
   * Returns a Phoenix Channel on phoenix transport, or null if transport is node/unsupported.
   */
  joinCallChannel(callId, params = {}) {
    if (this.transport?.joinChannel) {
      return this.transport.joinChannel(`call:${callId}`, params);
    }
    return null;
  }

  /**
   * Base URL of the game server's HTTP side, derived from the WS URL
   * (ws://host:3001/ws -> http://host:3001). Uploads (playlists, program
   * guide files) ride HTTP POST, not WS frames. Through the Phoenix gateway
   * the gateway reverse-proxies /api/theater/* to Node, so this origin
   * logic is unchanged on both transports.
   */
  get apiBase() {
    try {
      const url = new URL(this.wsUrl);
      return `${url.protocol === 'wss:' ? 'https:' : 'http:'}//${url.host}`;
    } catch {
      const loc = typeof window !== 'undefined' ? window.location : { protocol: 'http:', hostname: 'localhost' };
      return `${loc.protocol}//${loc.hostname}:3001`;
    }
  }

  /**
   * Remember a Phoenix-minted playback grant for one torrent file.
   * Grants arrive as targeted `torrent_grant` events on the game channel.
   */
  storeTorrentGrant({ infohash, fileIndex, grant, expiresAtMs } = {}) {
    if (!infohash || fileIndex === undefined || !grant) return;
    const key = `${String(infohash).toLowerCase()}:${Number(fileIndex)}`;
    this.torrentGrants.set(key, { grant, expiresAtMs });
  }

  /**
   * Range-capable stream URL for a torrent bill item, including the `grant`
   * query parameter when Phoenix has issued one for this file.
   */
  torrentStreamUrl(item) {
    const base = this.apiBase.replace(/\/+$/, '');
    const infohash = String(item?.infohash || '').toLowerCase();
    const fileIndex = Number(item?.fileIndex);
    const path = `${base}/api/theater/torrent/${infohash}/${fileIndex}`;
    const entry = this.torrentGrants.get(`${infohash}:${fileIndex}`);
    if (!entry?.grant) return path;
    const qs = new URLSearchParams({ grant: entry.grant });
    return `${path}?${qs}`;
  }

  /** POST to a /api/theater endpoint; resolves the JSON body or throws a readable error. */
  async postToTheater(path, params, body, contentType) {
    const qs = new URLSearchParams(
      Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();
    let res;
    try {
      res = await fetch(`${this.apiBase}${path}${qs ? `?${qs}` : ''}`, {
        method: 'POST',
        headers: contentType ? { 'Content-Type': contentType } : undefined,
        body,
      });
    } catch {
      throw new Error('Could not reach the theater service — is the game server running?');
    }
    let payload = null;
    try {
      payload = await res.json();
    } catch {}
    if (!res.ok || !payload?.ok) {
      throw new Error(payload?.error || `The theater refused that (HTTP ${res.status}).`);
    }
    return payload;
  }

  uploadPlaylistText(text, name, by) {
    return this.postToTheater('/api/theater/playlists', { name, by }, text, 'text/plain');
  }

  importPlaylistFromUrl(url, name, by) {
    return this.postToTheater('/api/theater/playlists', { name, by }, JSON.stringify({ url }), 'application/json');
  }

  uploadEpg(fileOrBlob, name) {
    return this.postToTheater('/api/theater/epg', { name }, fileOrBlob, 'application/octet-stream');
  }

  sendGardenAction(action, bedIndex, seedCropId = null) {
    const actionId = `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.send(MSG_TYPES.GARDEN_ACTION, {
      actionId,
      action,
      bedIndex,
      seedCropId,
    });
    return actionId;
  }

  sendMarketBuy(cropId, quantity) {
    this.send(MSG_TYPES.MARKET_BUY, { cropId, quantity });
  }

  sendMarketSell(cropId, quality, quantity) {
    this.send(MSG_TYPES.MARKET_SELL, { cropId, quality, quantity });
  }

  sendOrderPlace(side, cropId, price, quantity, quality = 'B') {
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.send(MSG_TYPES.ORDER_PLACE, {
      orderId,
      side,
      cropId,
      price,
      quantity,
      quality,
    });
    return orderId;
  }

  sendOrderCancel(orderId) {
    this.send(MSG_TYPES.ORDER_CANCEL, { orderId });
  }

  sendContractComplete(contractId) {
    this.send(MSG_TYPES.CONTRACT_COMPLETE, { contractId });
  }

  sendEmote(emote = 'wave') {
    this.send(MSG_TYPES.EMOTE, { emote });
  }

  sendChat(text) {
    // Raw line; the server parses /msg and /me authoritatively.
    this.send(MSG_TYPES.CHAT_SEND, { text });
  }

  setNickname(newNick) {
    this.setStoredNickname(newNick);
    this.send(MSG_TYPES.SET_NICKNAME, { nickname: this.nickname });
  }

  joinRoom(roomId) {
    // Remember the room so it is sent once the socket opens and re-sent
    // automatically after any reconnect.
    this.desiredRoom = roomId;
    this.send(MSG_TYPES.JOIN_ROOM, { roomId });
  }
}
