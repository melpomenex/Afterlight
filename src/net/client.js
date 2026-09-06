import { MSG_TYPES, serialize, parse } from '../../shared/protocol.js';
import { generateDefaultNickname, sanitizeNickname } from '../../shared/identity.js';

const GUEST_KEY = 'afterlight-gardener-guest-id';
const NICK_KEY = 'afterlight-gardener-nickname';

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
  }

  getDefaultUrl() {
    // Deployed builds get the multiplayer server URL at build time
    // (e.g. VITE_WS_URL=wss://...ts.net/ws); dev falls back to localhost.
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
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(this.wsUrl);
    } catch (e) {
      console.warn('WebSocket init failed, scheduling reconnect:', e.message);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.connected = true;
      this.reconnectAttempts = 0;
      this.send(MSG_TYPES.HELLO, {
        guestId: this.guestId,
        nickname: this.nickname,
      });
      // Re-join the remembered room on every (re)connect. This also covers a
      // joinRoom() requested before the handshake finished: send() drops
      // packets until the socket is OPEN, so the request is replayed here.
      if (this.desiredRoom) {
        this.send(MSG_TYPES.JOIN_ROOM, { roomId: this.desiredRoom });
      }
      this.connectListeners.forEach(fn => fn());
    };

    this.ws.onmessage = (event) => {
      const msg = parse(event.data);
      if (!msg || !msg.type) return;

      const handlers = this.handlers.get(msg.type);
      if (handlers) {
        handlers.forEach(fn => fn(msg));
      }
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.disconnectListeners.forEach(fn => fn());
      this.scheduleReconnect();
    };

    this.ws.onerror = (err) => {
      console.warn('NetworkClient socket error:', err);
    };
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(10000, 1000 * Math.pow(1.5, this.reconnectAttempts));
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
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(serialize({ type, ...payload }));
    }
  }

  sendMovement(x, z, rotY, walking, sitting = false) {
    const now = performance.now();
    // Cap client movement packets at ~12 Hz (every 80ms)
    if (now - this.lastMovementSend < 80) return;
    this.lastMovementSend = now;
    this.send(MSG_TYPES.MOVEMENT, { x, z, rotY, walking, sitting: !!sitting });
  }

  sendTheaterQueue(payload) { this.send(MSG_TYPES.THEATER_QUEUE, payload); }

  sendTheaterControl(payload) { this.send(MSG_TYPES.THEATER_CONTROL, payload); }

  sendTheaterChannel(url, title) { this.send(MSG_TYPES.THEATER_CHANNEL, { url, title }); }

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
