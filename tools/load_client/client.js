import { Socket } from 'phoenix';
import { MSG_TYPES, serialize, parse } from '../../shared/protocol.js';
import { flatFrameFromChannelEvent } from '../../src/net/phoenixClient.js';
import { DurableCommandTracker } from './durable.js';
import { LatencyHistogram } from './metrics.js';

const CHANNEL_TOPIC = 'game:v1';
const PHOENIX_INTERNAL = (event) =>
  typeof event !== 'string' ||
  event.startsWith('phoenix') ||
  event.startsWith('phx_') ||
  event.startsWith('chan_reply');

function httpBaseFromWs(wsUrl) {
  try {
    const url = new URL(wsUrl);
    return `${url.protocol === 'wss:' ? 'https:' : 'http:'}//${url.host}`;
  } catch {
    return 'http://127.0.0.1:4000';
  }
}

/**
 * Headless Phoenix Channels load client. Consumes 10 Hz presence frames with
 * honest backpressure, tracks durable command ack latencies, and records
 * payload sizes for benchmark reports.
 */
export class LoadClient {
  constructor({
    guestId,
    nickname,
    wsUrl = 'ws://127.0.0.1:4000/socket/websocket',
    roomId = 'market',
    consumeHz = 10,
    maxUnread = 32,
    slowReceiver = false,
    metrics = null,
    label = guestId,
  }) {
    this.guestId = guestId;
    this.nickname = nickname;
    this.wsUrl = wsUrl;
    this.httpBase = httpBaseFromWs(wsUrl);
    this.roomId = roomId;
    this.consumeHz = consumeHz;
    this.maxUnread = maxUnread;
    this.slowReceiver = slowReceiver;
    this.metrics = metrics;
    this.label = label;

    this.durable = new DurableCommandTracker();
    this.joinLatency = new LatencyHistogram('join_latency_ms');
    this.frameInterval = new LatencyHistogram('frame_interval_ms');
    this.ackLatency = new LatencyHistogram('durable_ack_ms');
    this.tickLatency = new LatencyHistogram('tick_latency_ms');

    this._socket = null;
    this._channel = null;
    this._joined = false;
    this._desiredRoom = roomId;
    this._unread = [];
    this._consumeTimer = null;
    this._lastFrameAt = null;
    this._framesConsumed = 0;
    this._framesDropped = 0;
    this._openAt = null;
  }

  async connect() {
    const token = await this._acquireToken();
    const started = Date.now();

    return new Promise((resolve, reject) => {
      const socket = new Socket(this.wsUrl, { params: { token } });
      const timer = setTimeout(() => reject(new Error('join timeout')), 12_000);

      socket.onOpen(() => {
        const channel = socket.channel(CHANNEL_TOPIC, { guestId: this.guestId });

        channel.onMessage = (event, payload) => {
          if (PHOENIX_INTERNAL(event)) return payload;
          const frame = flatFrameFromChannelEvent(event, payload);
          if (frame) this._onFrame(frame);
          return payload;
        };

        channel
          .join()
          .receive('ok', () => {
            clearTimeout(timer);
            this._socket = socket;
            this._channel = channel;
            this._joined = true;
            this._openAt = Date.now();
            this.joinLatency.record(Date.now() - started);
            this.metrics?.hist('join_latency_ms').record(Date.now() - started);
            this._startConsumeLoop();
            resolve(this);
          })
          .receive('error', (resp) => {
            clearTimeout(timer);
            reject(new Error(`channel join refused: ${JSON.stringify(resp)}`));
          });
      });

      socket.onClose(() => {
        this._joined = false;
        this._stopConsumeLoop();
      });

      socket.onError((err) => {
        if (!this._joined) {
          clearTimeout(timer);
          reject(err);
        }
      });

      socket.connect();
    });
  }

  async handshake() {
    this.push(MSG_TYPES.HELLO, { guestId: this.guestId, nickname: this.nickname });
    await this.waitFor((f) => f.type === MSG_TYPES.WELCOME, { label: 'welcome' });
  }

  async joinRoom(roomId = this._desiredRoom) {
    this._desiredRoom = roomId;
    const t0 = Date.now();
    this.push(MSG_TYPES.JOIN_ROOM, { roomId });
    await this.waitFor((f) => f.type === MSG_TYPES.PRESENCE_UPDATE, { label: 'presence_update' });
    this.metrics?.hist('join_room_ms').record(Date.now() - t0);
  }

  push(type, payload = {}) {
    if (!this._joined || !this._channel) return;
    this._channel.push(type, payload);
  }

  sendDurable(type, fields = {}) {
    const envelope = this.durable.buildEnvelope(type, fields);
    this.push(envelope.type, { ...envelope });
    return envelope;
  }

  movement(pose) {
    this.push(MSG_TYPES.MOVEMENT, pose);
  }

  waitFor(predicate, { timeoutMs = 8000, label = 'frame' } = {}) {
    return new Promise((resolve, reject) => {
      const handler = (frame) => {
        if (predicate(frame)) {
          clearTimeout(timer);
          this.off('*', handler);
          resolve(frame);
        }
      };
      const timer = setTimeout(() => {
        this.off('*', handler);
        reject(new Error(`${this.label}: timeout waiting for ${label}`));
      }, timeoutMs);
      this.on('*', handler);
    });
  }

  on(type, fn) {
    if (!this._handlers) this._handlers = new Map();
    if (!this._handlers.has(type)) this._handlers.set(type, []);
    this._handlers.get(type).push(fn);
  }

  off(type, fn) {
    const list = this._handlers?.get(type);
    if (!list) return;
    const idx = list.indexOf(fn);
    if (idx !== -1) list.splice(idx, 1);
  }

  _emit(frame) {
    const wild = this._handlers?.get('*') ?? [];
    const typed = this._handlers?.get(frame.type) ?? [];
    for (const fn of [...typed, ...wild]) fn(frame);
  }

  _onFrame(frame) {
    const now = Date.now();
    const raw = serialize(frame);
    this.metrics?.recordPayload(Buffer.byteLength(raw, 'utf8'));

    if (frame.type === MSG_TYPES.ERROR) {
      const reason = this.durable.classifyErrorFrame(frame);
      this.metrics?.inc(`error_${reason}`);
      const pending = [...this.durable.pending.keys()];
      if (pending.length) this.durable.noteRejection(pending[0], reason);
    }

    if (frame.type === MSG_TYPES.ACTION_RESULT && frame.request_id) {
      const pending = this.durable.noteAck(frame.request_id, {
        revision: frame.revision ?? null,
        replay: frame.replay === true,
      });
      if (pending) {
        const ms = now - pending.sentAt;
        this.ackLatency.record(ms);
        this.metrics?.hist('durable_ack_ms').record(ms);
      }
    }

    if (frame.type === MSG_TYPES.PRESENCE_UPDATE) {
      if (this._lastFrameAt != null) {
        const interval = now - this._lastFrameAt;
        this.frameInterval.record(interval);
        this.metrics?.hist('frame_interval_ms').record(interval);
      }
      this._lastFrameAt = now;
      this._unread.push({ frame, receivedAt: now });
      if (this._unread.length > this.maxUnread) {
        this._framesDropped += 1;
        this.metrics?.inc('frames_dropped_backpressure');
        this._unread.shift();
      }
    }

    this._emit(frame);
  }

  _startConsumeLoop() {
    const intervalMs = this.slowReceiver
      ? Math.max(500, Math.floor(1000 / Math.max(1, this.consumeHz)))
      : Math.floor(1000 / Math.max(1, this.consumeHz));

    this._consumeTimer = setInterval(() => {
      if (this._unread.length === 0) return;
      const item = this._unread.shift();
      const lag = Date.now() - item.receivedAt;
      this.tickLatency.record(lag);
      this.metrics?.hist('tick_latency_ms').record(lag);
      this._framesConsumed += 1;
    }, intervalMs);
  }

  _stopConsumeLoop() {
    if (this._consumeTimer) clearInterval(this._consumeTimer);
    this._consumeTimer = null;
  }

  async reconnect() {
    this.close();
    await this.connect();
    await this.handshake();
    if (this._desiredRoom) await this.joinRoom(this._desiredRoom);
  }

  close() {
    this._stopConsumeLoop();
    try {
      this._channel?.leave();
    } catch {}
    try {
      this._socket?.disconnect();
    } catch {}
    this._channel = null;
    this._socket = null;
    this._joined = false;
  }

  stats() {
    return {
      label: this.label,
      framesConsumed: this._framesConsumed,
      framesDropped: this._framesDropped,
      unread: this._unread.length,
      join: this.joinLatency.summary(),
      frameInterval: this.frameInterval.summary(),
      tickLatency: this.tickLatency.summary(),
      ackLatency: this.ackLatency.summary(),
      durable: this.durable.snapshot(),
    };
  }

  async _acquireToken() {
    const res = await fetch(`${this.httpBase}/api/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestId: this.guestId, nickname: this.nickname }),
    });
    if (!res.ok) throw new Error(`guest token refused (HTTP ${res.status})`);
    const body = await res.json();
    if (!body?.token) throw new Error('guest token response missing token');
    return body.token;
  }
}
