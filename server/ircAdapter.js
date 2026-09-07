/**
 * Authenticated Phoenix ↔ IRC event adapter (P7 specialty boundary).
 *
 * When Phoenix owns game chat (`CHAT_RELAY_DISABLED=1`), this module
 * replaces the game-relay halves of `server/chat.js` while keeping the
 * embedded IRC server as the external door. Phoenix posts game→IRC
 * events to `/api/irc/adapter/event`; IRC traffic is pushed back to
 * Phoenix at `AFTERLIGHT_IRC_CALLBACK_URL`.
 *
 * Every relayed message carries `{origin: game|irc, id}` for echo
 * suppression on both sides.
 */

import { DEFAULT_CHANNEL } from './irc.js';

const SEEN_CAP = 1000;

function isLoopback(addr) {
  if (!addr) return false;
  return addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1';
}

/** Bounded FIFO seen-key ledger ({origin, id} tuples). */
class SeenLedger {
  constructor(cap = SEEN_CAP) {
    this.cap = cap;
    this.set = new Set();
    this.queue = [];
  }

  record(key) {
    const norm = normalizeKey(key);
    if (this.set.has(norm)) return { seen: true };
    this.set.add(norm);
    this.queue.push(norm);
    if (this.set.size > this.cap) {
      const oldest = this.queue.shift();
      this.set.delete(oldest);
    }
    return { seen: false };
  }
}

function normalizeKey({ origin, id }) {
  const o = origin === 'irc' ? 'irc' : 'game';
  return `${o}:${String(id)}`;
}

function nextMsgId(origin) {
  return `msg_${origin}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function truthy(v) {
  return v !== null && v !== undefined && v !== false && v !== '' && v !== 0;
}

export class IrcPhoenixAdapter {
  /**
   * @param {object} opts
   * @param {import('./irc.js').IrcServer | null} opts.irc
   * @param {string} opts.callbackUrl Phoenix inbound adapter URL
   * @param {string | undefined} opts.boundarySecret AFTERLIGHT_BOUNDARY_SECRET
   * @param {number} [opts.seenCap]
   */
  constructor({ irc, callbackUrl, boundarySecret, seenCap = SEEN_CAP }) {
    this.irc = irc;
    this.callbackUrl = callbackUrl;
    this.boundarySecret = boundarySecret || null;
    this.ledger = new SeenLedger(seenCap);
    /** @type {Map<string, { conn: object, ircNick: string }>} */
    this.sessions = new Map();
    this.unlisten = irc ? irc.onEvent((evt) => this.#onIrcEvent(evt)) : null;
  }

  destroy() {
    if (this.unlisten) this.unlisten();
    this.unlisten = null;
    for (const entry of this.sessions.values()) {
      try { entry.conn.handleLine('QUIT :left the courtyard'); } catch {}
    }
    this.sessions.clear();
  }

  /** Returns true when the request must be rejected (403). */
  rejectsRequest(req) {
    const expected = this.boundarySecret;
    if (!expected) {
      return !isLoopback(req.socket?.remoteAddress);
    }
    const presented = req.headers['x-afterlight-boundary'];
    return presented !== expected;
  }

  boundaryHeaders() {
    if (!this.boundarySecret) return {};
    return { 'x-afterlight-boundary': this.boundarySecret };
  }

  /**
   * Handle a Phoenix→IRC adapter event (already auth-checked).
   * @returns {{ ok: boolean, dropped?: boolean, error?: string }}
   */
  handleInboundEvent(event) {
    if (!event || typeof event !== 'object') return { ok: false, error: 'invalid_event' };
    const origin = event.origin || 'game';
    const id = event.id || nextMsgId(origin);
    const key = { origin, id };
    if (this.ledger.record(key).seen) {
      return { ok: true, dropped: true };
    }
    this.#dispatchPhoenixEvent(event, id);
    return { ok: true };
  }

  #dispatchPhoenixEvent(event, id) {
    const type = event.type;
    if (type === 'chat_relay' || type === 'chat_message') {
      this.#relayChannelMessage(event);
      return;
    }
    if (type === 'chat_relay_dm' || type === 'chat_dm') {
      this.#relayDirectMessage(event);
      return;
    }
    if (type === 'presence_sync' || type === 'chat_presence' || type === 'presence') {
      this.#relayPresence(event);
      return;
    }
    if (type === 'nick_sync') {
      this.#relayNickChange(event);
    }
  }

  #relayChannelMessage(event) {
    const from = event.from || 'player';
    const text = event.text || '';
    const isAction = truthy(event.action || event.is_action);
    let conn = this.#connForNick(from);
    if (!conn) {
      this.#ensureSession(from, from);
      conn = this.#connForNick(from);
    }
    if (!conn) return;
    const payload = isAction ? `\u0001ACTION ${text}\u0001` : text;
    conn.handleLine(`PRIVMSG ${DEFAULT_CHANNEL} :${payload}`);
  }

  #relayDirectMessage(event) {
    const from = event.from || 'player';
    const to = event.to || '';
    const text = event.text || '';
    const conn = this.#connForNick(from);
    if (!conn || !to) return;
    const targetConn = this.irc?.connectionForNick(to);
    if (targetConn && targetConn !== conn) {
      conn.handleLine(`PRIVMSG ${targetConn.nick} :${text}`);
    }
  }

  #relayPresence(event) {
    const evt = event.event || 'join';
    const who = event.who || 'player';
    const playerId = event.playerId || who;
    if (evt === 'join') {
      this.#ensureSession(playerId, who);
      return;
    }
    if (evt === 'part') {
      const entry = this.sessions.get(playerId);
      if (entry) {
        try { entry.conn.handleLine('QUIT :left the courtyard'); } catch {}
        this.sessions.delete(playerId);
      }
    }
  }

  #relayNickChange(event) {
    const playerId = event.playerId;
    const newNick = event.newNick;
    const entry = playerId ? this.sessions.get(playerId) : null;
    if (!entry || !newNick) return;
    entry.conn.handleLine(`NICK ${newNick}`);
    entry.ircNick = newNick;
  }

  #ensureSession(playerId, nickname) {
    if (!this.irc || this.sessions.has(playerId)) return;
    const { nick } = this.irc.allocateNick(nickname);
    const conn = this.irc.createBridgeSession({
      id: `phoenix:${playerId}`,
      nick,
      username: 'gardener',
      realname: nickname,
    });
    conn.bridgeMeta = { playerId, phoenix: true };
    this.sessions.set(playerId, { conn, ircNick: nick });
    conn.handleLine(`JOIN ${DEFAULT_CHANNEL}`);
  }

  #connForNick(nickname) {
    const lower = String(nickname).toLowerCase();
    for (const entry of this.sessions.values()) {
      if (entry.ircNick.toLowerCase() === lower) return entry.conn;
    }
    // Fallback: match by game nickname stored on bridgeMeta
    for (const entry of this.sessions.values()) {
      if (entry.conn.bridgeMeta?.playerId === nickname) return entry.conn;
    }
    return null;
  }

  #onIrcEvent(evt) {
    if (!this.callbackUrl) return;
    if (evt.type === 'privmsg') {
      const fromPlayer = evt.conn.bridgeMeta?.playerId;
      const entry = fromPlayer ? this.sessions.get(fromPlayer) : null;
      const from = entry ? entry.ircNick : evt.conn.nick;
      const fromKind = entry ? 'player' : 'irc';
      if (fromKind === 'player') return; // game-originated; Phoenix already delivered

      const msgId = nextMsgId('irc');
      const key = { origin: 'irc', id: msgId };
      if (this.ledger.record(key).seen) return;

      if (evt.isChannel) {
        this.#notifyPhoenix({
          type: 'chat_relay',
          origin: 'irc',
          id: msgId,
          from,
          text: evt.text,
          action: evt.isAction || undefined,
          channel: DEFAULT_CHANNEL,
        });
        return;
      }

      const targetEntry = evt.targetConn?.bridgeMeta?.playerId
        ? this.sessions.get(evt.targetConn.bridgeMeta.playerId)
        : null;
      if (targetEntry) {
        this.#notifyPhoenix({
          type: 'chat_relay_dm',
          origin: 'irc',
          id: msgId,
          from,
          to: targetEntry.ircNick,
          text: evt.text,
          action: evt.isAction || undefined,
        });
      }
      return;
    }

    if (evt.type === 'join' || evt.type === 'part' || evt.type === 'quit') {
      const fromPlayer = evt.conn.bridgeMeta?.playerId;
      if (fromPlayer) return; // synthetic player session
      const who = evt.conn.nick;
      const msgId = nextMsgId('irc');
      const key = { origin: 'irc', id: msgId };
      if (this.ledger.record(key).seen) return;
      const presenceEvt = evt.type === 'join' ? 'join' : 'part';
      this.#notifyPhoenix({
        type: 'chat_presence',
        origin: 'irc',
        id: msgId,
        event: presenceEvt,
        who,
        fromKind: 'irc',
      });
    }
  }

  async #notifyPhoenix(payload) {
    try {
      const headers = {
        'content-type': 'application/json',
        ...this.boundaryHeaders(),
      };
      const res = await fetch(this.callbackUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ event: payload }),
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) {
        // Phoenix down — drop silently; health probe will mark bridge down
      }
    } catch {
      // Network failure — no retry storm
    }
  }
}
