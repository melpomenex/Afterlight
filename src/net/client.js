import { MSG_TYPES, serialize, parse } from '../../shared/protocol.js';
import { generateDefaultNickname, sanitizeNickname } from '../../shared/identity.js';
import { createPhoenixTransport, binaryBufferFromEnvelope } from './phoenixClient.js';
import { jitteredRejoinDelay, shouldApplyRoomFrame } from './roomEpoch.js';
import {
  ACTIVITY_PROTOCOL_VERSION,
  ACTIVITY_ERRORS,
  generateActivityRequestId,
  validateActivityJoin,
  validateActivityLeave,
  validateActivityReady,
  validateActivityInput,
  validateSnowboardControls,
  validateDownhillControls,
  validateDownhillConfig,
  validateActivityResnapshot,
} from '../../shared/activityProtocol.js';

const GUEST_KEY = 'afterlight-guest-id';
const NICK_KEY = 'afterlight-nickname';
// Retired gardener-era keys: read once so an existing player keeps their
// identity, then persisted under the new keys. Never deleted, so a code
// rollback still finds the original value.
const LEGACY_GUEST_KEY = 'afterlight-gardener-guest-id';
const LEGACY_NICK_KEY = 'afterlight-gardener-nickname';

/** Treat a torrent grant as unusable this long before its stated expiry. */
const TORRENT_GRANT_SKEW_MS = 10_000;

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
        // The Node realtime flush arrives as a JSON `rt_binary` envelope
        // `{tick, data: base64}` (mirroring the Phoenix channel event). Decode
        // it to the same ArrayBuffer the Phoenix transport hands off; without
        // a handleBinary hook it drops exactly like an undecoded envelope.
        if (msg.type === 'rt_binary') {
          if (client.handleBinary) {
            const buffer = binaryBufferFromEnvelope(msg, client.desiredRoom);
            if (buffer) client.handleBinary(buffer);
          }
          return;
        }
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
        // One-time migration from the retired gardener-era key.
        id = localStorage.getItem(LEGACY_GUEST_KEY);
      }
      if (!id || typeof id !== 'string') {
        id = 'guest_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      }
      localStorage.setItem(GUEST_KEY, id);
      return id;
    } catch {
      return 'guest_' + Math.random().toString(36).substring(2, 11);
    }
  }

  getOrCreateNickname() {
    try {
      let name = localStorage.getItem(NICK_KEY);
      if (!name) name = localStorage.getItem(LEGACY_NICK_KEY);
      if (!name) {
        name = generateDefaultNickname();
      }
      name = sanitizeNickname(name);
      localStorage.setItem(NICK_KEY, name);
      return name;
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
      this.transport.close();
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
    return () => {
      const handlers = this.handlers.get(msgType);
      const index = handlers?.indexOf(handler) ?? -1;
      if (index >= 0) handlers.splice(index, 1);
    };
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
   * True when a stored grant authorizes playback of this exact item and is
   * still valid (with a safety skew before expiry). The theater player's
   * first-request gate uses this: a torrent media element is never created
   * without a usable, participant-scoped grant already stored.
   */
  hasUsableTorrentGrant(item, { nowMs = Date.now(), skewMs = TORRENT_GRANT_SKEW_MS } = {}) {
    const infohash = String(item?.infohash || '').toLowerCase();
    const fileIndex = Number(item?.fileIndex);
    if (!infohash || !Number.isInteger(fileIndex)) return false;
    const entry = this.torrentGrants.get(`${infohash}:${fileIndex}`);
    if (!entry?.grant) return false;
    const expiresAtMs = Number(entry.expiresAtMs);
    if (!Number.isFinite(expiresAtMs)) return false;
    return expiresAtMs - skewMs > nowMs;
  }

  /** Forget every stored torrent grant (leaving the theater, reconnect). */
  clearTorrentGrants() {
    this.torrentGrants.clear();
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

  /**
   * Fetch the canonical Daily course document from the gateway
   * (integrate-multiplayer-downhill-mayhem-arcade 4.3, design D5). The server
   * is the sole runtime Daily generator, so the client never bakes it locally:
   * it races exactly the server's bytes and hash. Throws a readable error on
   * any non-document response so the activity can fail closed.
   */
  async fetchDownhillDailyCourse({ date = null } = {}) {
    const qs = date ? `?date=${encodeURIComponent(date)}` : '';
    let res;
    try {
      res = await fetch(`${this.apiBase.replace(/\/+$/, '')}/api/downhill/course/daily${qs}`, {
        method: 'GET',
      });
    } catch {
      throw new Error('Could not reach the mountain service — is the game server running?');
    }
    let payload = null;
    try {
      payload = await res.json();
    } catch {
      payload = null;
    }
    if (!res.ok || !payload || typeof payload !== 'object' || typeof payload.hash !== 'string') {
      throw new Error(payload?.error || `The Daily course is unavailable (HTTP ${res.status}).`);
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

  // -- activities (Phase 1, place activities program) -----------------------

  /**
   * True when the active transport supports place activities (Phoenix gateway).
   * Unsupported Node transport retains world play and labels activities unavailable.
   */
  get supportsActivities() {
    return this.transportMode === 'phoenix';
  }

  /**
   * Dispatches an activity error frame locally without sending it over the wire.
   * Useful when an unsupported transport or local validation fails closed.
   */
  dispatchLocalActivityError(payload) {
    const frame = {
      type: MSG_TYPES.ACTIVITY_ERROR,
      version: ACTIVITY_PROTOCOL_VERSION,
      ...(this.desiredRoom ? { roomId: this.desiredRoom } : {}),
      ...payload,
    };
    const handlers = this.handlers.get(MSG_TYPES.ACTIVITY_ERROR);
    if (handlers) {
      handlers.forEach(fn => fn(frame));
    }
    return frame;
  }

  /**
   * Send an activity_join command.
   * On unsupported Node transport, fails closed locally and dispatches activity_error.
   */
  sendActivityJoin({ activityId, role = 'play', requestId = null } = {}) {
    const reqId = requestId || generateActivityRequestId('act_join');
    if (!this.supportsActivities) {
      this.dispatchLocalActivityError({
        requestId: reqId,
        activityId,
        error: ACTIVITY_ERRORS.ACTIVITIES_UNAVAILABLE,
        message: 'Activities are not supported on this transport',
      });
      return { ok: false, error: ACTIVITY_ERRORS.ACTIVITIES_UNAVAILABLE, requestId: reqId };
    }
    const validation = validateActivityJoin({ requestId: reqId, activityId, role });
    if (!validation.valid) {
      this.dispatchLocalActivityError({
        requestId: reqId,
        activityId,
        error: ACTIVITY_ERRORS.INVALID_REQUEST,
        message: validation.error,
      });
      return { ok: false, error: ACTIVITY_ERRORS.INVALID_REQUEST, details: validation.error, requestId: reqId };
    }
    this.send(MSG_TYPES.ACTIVITY_JOIN, validation.sanitized);
    return { ok: true, requestId: reqId };
  }

  /**
   * Send an activity_leave command.
   */
  sendActivityLeave({ activityId, reason = null, requestId = null, matchId = null } = {}) {
    const reqId = requestId || generateActivityRequestId('act_leave');
    if (!this.supportsActivities) {
      this.dispatchLocalActivityError({
        requestId: reqId,
        activityId,
        error: ACTIVITY_ERRORS.ACTIVITIES_UNAVAILABLE,
        message: 'Activities are not supported on this transport',
      });
      return { ok: false, error: ACTIVITY_ERRORS.ACTIVITIES_UNAVAILABLE, requestId: reqId };
    }
    const validation = validateActivityLeave({ requestId: reqId, activityId, ...(reason ? { reason } : {}), ...(matchId ? { matchId } : {}) });
    if (!validation.valid) {
      this.dispatchLocalActivityError({
        requestId: reqId,
        activityId,
        error: ACTIVITY_ERRORS.INVALID_REQUEST,
        message: validation.error,
      });
      return { ok: false, error: ACTIVITY_ERRORS.INVALID_REQUEST, details: validation.error, requestId: reqId };
    }
    this.send(MSG_TYPES.ACTIVITY_LEAVE, validation.sanitized);
    return { ok: true, requestId: reqId };
  }

  /**
   * Send an activity_ready command.
   */
  sendActivityReady({ activityId, ready, requestId = null, matchId = null } = {}) {
    const reqId = requestId || generateActivityRequestId('act_ready');
    if (!this.supportsActivities) {
      this.dispatchLocalActivityError({
        requestId: reqId,
        activityId,
        error: ACTIVITY_ERRORS.ACTIVITIES_UNAVAILABLE,
        message: 'Activities are not supported on this transport',
      });
      return { ok: false, error: ACTIVITY_ERRORS.ACTIVITIES_UNAVAILABLE, requestId: reqId };
    }
    const validation = validateActivityReady({ requestId: reqId, activityId, ready, ...(matchId ? { matchId } : {}) });
    if (!validation.valid) {
      this.dispatchLocalActivityError({
        requestId: reqId,
        activityId,
        error: ACTIVITY_ERRORS.INVALID_REQUEST,
        message: validation.error,
      });
      return { ok: false, error: ACTIVITY_ERRORS.INVALID_REQUEST, details: validation.error, requestId: reqId };
    }
    this.send(MSG_TYPES.ACTIVITY_READY, validation.sanitized);
    return { ok: true, requestId: reqId };
  }

  /**
   * Send an activity_config command (Downhill Mayhem captain settings).
   */
  sendActivityConfig({ activityId, requestId = null, matchId = null, config } = {}) {
    const reqId = requestId || generateActivityRequestId('act_cfg');
    if (!this.supportsActivities) {
      this.dispatchLocalActivityError({
        requestId: reqId, activityId,
        error: ACTIVITY_ERRORS.ACTIVITIES_UNAVAILABLE,
        message: 'Activities are not supported on this transport',
      });
      return { ok: false, error: ACTIVITY_ERRORS.ACTIVITIES_UNAVAILABLE, requestId: reqId };
    }
    const validation = validateDownhillConfig(config);
    if (!validation.valid) {
      this.dispatchLocalActivityError({
        requestId: reqId, activityId,
        error: ACTIVITY_ERRORS.INVALID_SETTING,
        message: validation.error,
      });
      return { ok: false, error: ACTIVITY_ERRORS.INVALID_SETTING, details: validation.error, requestId: reqId };
    }
    this.send('activity_config', {
      activityId,
      requestId: reqId,
      ...(matchId ? { matchId } : {}),
      config: validation.sanitized,
    });
    return { ok: true, requestId: reqId };
  }

  /**
   * Send an activity_input command.
   */
  sendActivityInput({ activityId, activityType = null, sessionId, lease, seq, matchId = null, controls } = {}) {
    if (!this.supportsActivities) {
      this.dispatchLocalActivityError({
        activityId,
        error: ACTIVITY_ERRORS.ACTIVITIES_UNAVAILABLE,
        message: 'Activities are not supported on this transport',
      });
      return { ok: false, error: ACTIVITY_ERRORS.ACTIVITIES_UNAVAILABLE };
    }
    // Type-scoped strict allowlists: kind-carrying controls are validated by
    // their game type before the generic input validation.
    let controlsError = null;
    let sanitizedControls = controls;
    if (controls && typeof controls === 'object' && 'kind' in controls) {
      const scoped = activityType === 'downhill-mayhem'
        ? validateDownhillControls(controls)
        : validateSnowboardControls(controls);
      if (!scoped.valid) {
        controlsError = scoped.error;
      } else {
        sanitizedControls = scoped.sanitized;
      }
    }

    const validation = validateActivityInput({
      activityId,
      sessionId,
      lease,
      seq,
      ...(matchId ? { matchId } : {}),
      controls: sanitizedControls,
    });
    if (!validation.valid || controlsError) {
      const message = controlsError || validation.error;
      this.dispatchLocalActivityError({
        activityId,
        error: ACTIVITY_ERRORS.INVALID_REQUEST,
        message,
      });
      return { ok: false, error: ACTIVITY_ERRORS.INVALID_REQUEST, details: message };
    }
    this.send(MSG_TYPES.ACTIVITY_INPUT, validation.sanitized);
    return { ok: true, seq: validation.sanitized.seq };
  }

  /**
   * Send an activity_resnapshot command.
   */
  sendActivityResnapshot({ activityId, sessionId = null, requestId = null } = {}) {
    const reqId = requestId || generateActivityRequestId('act_resnap');
    if (!this.supportsActivities) {
      this.dispatchLocalActivityError({
        requestId: reqId,
        activityId,
        error: ACTIVITY_ERRORS.ACTIVITIES_UNAVAILABLE,
        message: 'Activities are not supported on this transport',
      });
      return { ok: false, error: ACTIVITY_ERRORS.ACTIVITIES_UNAVAILABLE, requestId: reqId };
    }
    const validation = validateActivityResnapshot({ requestId: reqId, activityId, ...(sessionId ? { sessionId } : {}) });
    if (!validation.valid) {
      this.dispatchLocalActivityError({
        requestId: reqId,
        activityId,
        error: ACTIVITY_ERRORS.INVALID_REQUEST,
        message: validation.error,
      });
      return { ok: false, error: ACTIVITY_ERRORS.INVALID_REQUEST, details: validation.error, requestId: reqId };
    }
    this.send(MSG_TYPES.ACTIVITY_RESNAPSHOT, validation.sanitized);
    return { ok: true, requestId: reqId };
  }
}
