/**
 * Embedded IRC server for Afterlight.
 *
 * A small, tolerant RFC 1459-style line server: mainstream IRC clients and
 * bots connect over plain TCP and share the town channel with in-game
 * players (bridged by server/chat.js as synthetic connections through the
 * same command path).
 *
 * Deliberately modest scope: NICK/USER/JOIN/PART/TOPIC/NAMES/PRIVMSG/
 * PING/QUIT/WHO/WHOIS/OPER/CAP. No services, channel modes, or bans.
 * All state is in-memory; nothing here persists across restarts.
 */

import net from 'node:net';

const SERVER_NAME = 'afterlight';
export const DEFAULT_CHANNEL = '#afterlight';
const MAX_LINE_CHARS = 510; // RFC 1459 allows 512 including CRLF
const BUFFER_ABORT_CHARS = 2048; // run-away line without CRLF: shed it
const NICK_MAX_CHARS = 30;

// RFC-style nick charset: first char a letter or special, rest may include digits and '-'
const NICK_FIRST_OK = /^[A-Za-z_\[\]\\^{}|`]/;
const NICK_REST_BAD = /[^A-Za-z0-9_\-\[\]\\^{}|`]/g;

function now() {
  return Date.now();
}

function sanitizeNick(base) {
  let nick = String(base ?? '').replace(NICK_REST_BAD, '_').slice(0, NICK_MAX_CHARS);
  if (!nick || !NICK_FIRST_OK.test(nick[0])) {
    nick = `A${nick.replace(/[^A-Za-z0-9_\-\[\]\\^{}|`]/g, '')}`.slice(0, NICK_MAX_CHARS);
  }
  if (!/[^_0-9]/.test(nick)) nick = 'Guest'; // nothing meaningful left
  return nick;
}

function stripLine(text) {
  return String(text ?? '').replace(/[\r\n\0]/g, '');
}

function isActionText(text) {
  return /^\u0001ACTION (.*?)\u0001?$/.exec(text) !== null;
}

class IrcConnection {
  constructor(server, options = {}) {
    this.server = server;
    this.id = options.id || `irc_${now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    this._sendLine = options.sendLine || (() => {});
    this._close = options.close || (() => {});
    this._end = options.end || null; // graceful flush-then-close, TCP only
    this.isBridge = !!options.isBridge;
    this.address = options.address || 'afterlight/local';
    this.bridgeMeta = null; // set by the chat bridge (e.g. { playerId })
    this.registered = false;
    this.nick = null;
    this.username = null;
    this.realname = null;
    this.oper = false;
    this.channels = new Set();
    this.lastSeen = now();
    this.pingSentAt = null;
    this.gone = false;
    this.floodStamps = [];
  }

  get hostmask() {
    return `${this.nick}!${this.username || 'u'}@${this.address}`;
  }

  sendLine(line) {
    if (this.gone) return;
    this._sendLine(line.slice(0, MAX_LINE_CHARS + 100));
  }

  sendNumeric(num, ...parts) {
    const trailing = parts.pop() ?? '';
    const params = parts.length ? ` ${parts.join(' ')}` : '';
    // RFC numerics are three digits, zero-padded; real clients parse them as such.
    this.sendLine(`:${SERVER_NAME} ${String(num).padStart(3, '0')} ${this.nick || '*'}${params} :${trailing}`);
  }

  noteActivity() {
    this.lastSeen = now();
    this.pingSentAt = null;
  }

  /** Feed one protocol line through the same parser used for TCP clients. */
  handleLine(rawLine) {
    if (this.gone) return;
    this.noteActivity();

    // Flood guard: a sliding window of recent lines.
    const stamps = this.floodStamps;
    const cutoff = now() - this.server.floodWindowMs;
    while (stamps.length && stamps[0] < cutoff) stamps.shift();
    stamps.push(now());
    if (stamps.length > this.server.floodMaxLines * 2 + 4) {
      this.server.disconnect(this, 'Excessive flooding');
      return;
    }
    if (stamps.length > this.server.floodMaxLines) return; // silently shed the burst

    const line = stripLine(rawLine).slice(0, MAX_LINE_CHARS).trim();
    if (!line) return;
    const { command, params, trailing } = parseLine(line);
    this.server.handleCommand(this, command, params, trailing);
  }

  close() {
    if (this.gone) return;
    this.gone = true;
    try { this._close(); } catch {}
  }

  /** Flush pending writes, then end the connection (used at server shutdown). */
  shutdown() {
    if (this.gone) return;
    this.gone = true;
    try {
      if (this._end) this._end();
      else this._close();
    } catch {}
  }
}

function parseLine(line) {
  let rest = line;
  let trailing = null;
  const colon = rest.indexOf(' :');
  if (colon >= 0) {
    trailing = rest.slice(colon + 2);
    rest = rest.slice(0, colon);
  }
  const parts = rest.split(' ').filter(Boolean);
  const command = (parts.shift() || '').toUpperCase();
  return { command, params: parts, trailing };
}

export class IrcServer {
  constructor(options = {}) {
    this.host = options.host ?? undefined;
    const envPort = Number(process.env.IRC_PORT);
    this.port = options.port ?? (Number.isFinite(envPort) && envPort >= 0 ? envPort : 6667);
    this.enabled = options.enabled ?? process.env.IRC_DISABLED !== '1';
    this.operName = options.operName ?? process.env.IRC_OPER_NAME ?? 'oper';
    this.operPass = options.operPass ?? process.env.IRC_OPER_PASS ?? null;
    this.defaultTopic = options.topic ?? process.env.IRC_TOPIC
      ?? 'The town still talks · be kind, and leave the light on';

    // Tunables (tests shrink these)
    this.pingIntervalMs = options.pingIntervalMs ?? 30000;
    this.idlePingAfterMs = options.idlePingAfterMs ?? 60000;
    this.pingTimeoutMs = options.pingTimeoutMs ?? 30000;
    this.floodWindowMs = options.floodWindowMs ?? 5000;
    this.floodMaxLines = options.floodMaxLines ?? 12;

    this.boundPort = null;
    this.tcpServer = null;
    this.ready = null;
    this.closed = false;

    this.connections = new Map(); // id -> IrcConnection
    this.nicks = new Map(); // lower(nick) -> IrcConnection
    this.channels = new Map(); // name -> { name, topic, topicBy, members: Set<id> }
    this.eventListeners = new Set();

    if (this.enabled) {
      this.#makeChannel(DEFAULT_CHANNEL, this.defaultTopic, SERVER_NAME);
      this.ready = this.#listen();
    }
  }

  // --- lifecycle -----------------------------------------------------------

  async #listen() {
    const tcpServer = net.createServer((socket) => this.#onSocket(socket));
    this.tcpServer = tcpServer;
    await new Promise((resolve, reject) => {
      tcpServer.once('error', reject);
      tcpServer.listen(this.port, this.host, () => {
        tcpServer.removeListener('error', reject);
        tcpServer.on('error', () => {}); // keep the process alive on late errors
        resolve();
      });
    });
    this.boundPort = tcpServer.address().port;
    this.pingTimer = setInterval(() => this.#reapIdle(), this.pingIntervalMs);
    if (typeof this.pingTimer.unref === 'function') this.pingTimer.unref();
    return this.boundPort;
  }

  #onSocket(socket) {
    socket.setEncoding('utf8');
    socket.setNoDelay(true);
    const conn = new IrcConnection(this, {
      address: cleanAddress(socket.remoteAddress),
      sendLine: (line) => {
        if (!socket.destroyed) socket.write(`${line}\r\n`);
      },
      close: () => socket.destroy(),
      end: () => socket.end(),
    });
    this.connections.set(conn.id, conn);

    let buffer = '';
    socket.on('data', (chunk) => {
      buffer += chunk;
      if (buffer.length > BUFFER_ABORT_CHARS) {
        // No CRLF in a very long stream: keep only the tail and carry on.
        buffer = buffer.slice(-MAX_LINE_CHARS);
      }
      let idx;
      while ((idx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, idx).replace(/\r$/, '');
        buffer = buffer.slice(idx + 1);
        conn.handleLine(line);
        if (conn.gone) return;
      }
    });
    socket.on('error', () => this.disconnect(conn, 'Connection error'));
    socket.on('close', () => this.disconnect(conn, conn.registered ? 'Connection closed' : null));
  }

  /** Announce QUIT, drop from channels/nicks, close the transport. */
  disconnect(conn, reason = null) {
    if (!conn || conn.gone) return;
    if (conn.registered) {
      const quitLine = `:${conn.hostmask} QUIT :${stripLine(reason) || 'Remote closed'}`;
      for (const chanName of conn.channels) {
        const chan = this.channels.get(chanName);
        if (!chan) continue;
        for (const memberId of chan.members) {
          const member = this.connections.get(memberId);
          if (member && member !== conn) member.sendLine(quitLine);
        }
      }
    }
    if (conn.nick) this.nicks.delete(conn.nick.toLowerCase());
    for (const chanName of conn.channels) {
      this.channels.get(chanName)?.members.delete(conn.id);
    }
    conn.channels.clear();
    this.connections.delete(conn.id);
    conn.close();
    if (conn.registered) this.#emit({ type: 'quit', conn, reason });
  }

  close() {
    if (this.closed || !this.enabled) return;
    this.closed = true;
    if (this.pingTimer) clearInterval(this.pingTimer);
    for (const conn of [...this.connections.values()]) {
      conn.sendLine(`:${SERVER_NAME} QUIT :Server closing`);
      conn.shutdown(); // flush the QUIT, then end the transport
    }
    this.connections.clear();
    this.nicks.clear();
    try { this.tcpServer?.close(); } catch {}
  }

  // --- bridge API ----------------------------------------------------------

  /** Subscribe to server events; returns an unsubscribe function. */
  onEvent(fn) {
    this.eventListeners.add(fn);
    return () => this.eventListeners.delete(fn);
  }

  #emit(event) {
    for (const fn of this.eventListeners) {
      try { fn(event); } catch {}
    }
  }

  /** Map a desired nickname onto a free, RFC-valid nickname. */
  allocateNick(desired) {
    const base = sanitizeNick(desired);
    if (!this.nicks.has(base.toLowerCase())) return { nick: base, changed: base !== desired };
    for (let i = 0; i < 50; i++) {
      const candidate = i === 0 ? `${base}_` : `${base}_${i + 1}`;
      if (!this.nicks.has(candidate.toLowerCase())) return { nick: candidate, changed: true };
    }
    const fallback = `${base}_${now().toString(36).slice(-4)}`;
    return { nick: fallback, changed: true };
  }

  isNickTaken(nick) {
    return this.nicks.has(String(nick).toLowerCase());
  }

  connectionForNick(nick) {
    return this.nicks.get(String(nick).toLowerCase()) || null;
  }

  /**
   * Create an in-process session (used by the chat bridge for players).
   * It feeds the exact same command parser as TCP clients, but its output
   * is a sink: the bridge relays game-facing traffic via events.
   */
  createBridgeSession({ id, nick, username = 'visitor', realname = 'Afterlight player' }) {
    const conn = new IrcConnection(this, {
      id: id || undefined,
      isBridge: true,
      address: 'afterlight',
      sendLine: () => {}, // bridge sessions consume via events instead
      close: () => this.disconnect(conn, 'Left the courtyard'),
    });
    conn.nick = sanitizeNick(nick);
    conn.username = sanitizeNick(username).toLowerCase() || 'visitor';
    conn.realname = realname;
    conn.registered = true;
    this.connections.set(conn.id, conn);
    this.nicks.set(conn.nick.toLowerCase(), conn);
    return conn;
  }

  memberCount(channelName = DEFAULT_CHANNEL) {
    return this.channels.get(channelName)?.members.size ?? 0;
  }

  // --- protocol handling ----------------------------------------------------

  handleCommand(conn, command, params, trailing) {
    switch (command) {
      case 'CAP': return this.#cap(conn, params);
      case 'NICK': return this.#nick(conn, params, trailing);
      case 'USER': return this.#user(conn, params, trailing);
      case 'PRIVMSG': return this.#privmsg(conn, params, trailing);
      case 'JOIN': return this.#join(conn, params);
      case 'PART': return this.#part(conn, params, trailing);
      case 'TOPIC': return this.#topic(conn, params, trailing);
      case 'NAMES': return this.#names(conn, params);
      case 'WHO': return this.#who(conn, params);
      case 'WHOIS': return this.#whois(conn, params);
      case 'OPER': return this.#oper(conn, params);
      case 'PING': return conn.sendLine(`:${SERVER_NAME} PONG ${SERVER_NAME} :${stripLine(params[0] || trailing || '')}`);
      case 'PONG': return; // keepalive response; noteActivity already ran
      case 'QUIT': return this.disconnect(conn, trailing || 'Quit');
      case '':
      case 'MODE': return; // MODE is accepted and ignored (no channel modes)
      default: return conn.sendNumeric(421, command, 'Unknown command');
    }
  }

  #cap(conn, params) {
    const sub = (params[0] || '').toUpperCase();
    if (sub === 'LS' || sub === 'LIST') {
      conn.sendLine(`CAP ${conn.nick || '*'} LS :`); // no capabilities to offer
    } else if (sub === 'REQ') {
      conn.sendLine(`CAP ${conn.nick || '*'} NAK :${params[1] || ''}`);
    } // END/DONE: nothing to do
  }

  #nick(conn, params, trailing) {
    const desired = params[0] ?? trailing;
    if (!desired) return conn.sendNumeric(431, 'No nickname given');
    const nick = sanitizeNick(desired);
    const lower = nick.toLowerCase();
    const holder = this.nicks.get(lower);
    if (holder && holder !== conn) return conn.sendNumeric(433, desired, 'Nickname is already in use');

    // Release our previous name (if any) before claiming the new one.
    if (conn.nick) this.nicks.delete(conn.nick.toLowerCase());
    const old = conn.nick;
    conn.nick = nick;
    this.nicks.set(lower, conn);

    if (old && old !== nick && conn.registered) {
      const line = `:${old}!${conn.username}@${conn.address} NICK :${nick}`;
      for (const chanName of conn.channels) {
        for (const memberId of this.channels.get(chanName)?.members ?? []) {
          this.connections.get(memberId)?.sendLine(line);
        }
      }
      this.#emit({ type: 'nick', conn, oldNick: old, newNick: nick });
    }
    this.#tryRegister(conn);
  }

  #user(conn, params, trailing) {
    if (conn.registered) return conn.sendNumeric(462, 'You may not reregister');
    if (params.length < 1) return conn.sendNumeric(461, 'USER', 'Not enough parameters');
    conn.username = sanitizeNick(params[0]).toLowerCase() || 'u';
    conn.realname = stripLine(trailing || params[3] || 'An Afterlight visitor');
    this.#tryRegister(conn);
  }

  #tryRegister(conn) {
    if (conn.registered || !conn.nick || !conn.username) return;
    conn.registered = true;
    conn.sendNumeric(1, `Welcome to the Afterlight network, ${conn.nick}`);
    conn.sendNumeric(2, `Your host is ${SERVER_NAME}, running an Afterlight chat relay`);
    conn.sendNumeric(3, `This server was created for the town's visitors and their bots`);
    conn.sendNumeric(4, `${SERVER_NAME} Afterlight-1.0 i m t`);
    // Close the welcome burst with a minimal MOTD: mainstream libraries
    // (e.g. the Rust `irc` crate) join their configured channels only at
    // end-of-MOTD, so a bare 001–004 burst leaves such bots registered
    // but never in the channel.
    conn.sendNumeric(375, `- ${SERVER_NAME} Message of the day -`);
    conn.sendNumeric(372, 'The town still talks — be kind, and leave the light on.');
    conn.sendNumeric(372, "This server was created for the town's visitors and their bots.");
    conn.sendNumeric(376, 'End of /MOTD command');
    this.#emit({ type: 'register', conn });
  }

  #resolveChannel(name) {
    return this.channels.get(String(name).toLowerCase()) || null;
  }

  #makeChannel(name, topic = '', topicBy = SERVER_NAME) {
    const chan = { name, topic, topicBy, members: new Set() };
    this.channels.set(name.toLowerCase(), chan);
    return chan;
  }

  #join(conn, params) {
    if (!conn.registered) return conn.sendNumeric(451, 'You have not registered');
    const name = params[0];
    if (!name) return conn.sendNumeric(461, 'JOIN', 'Not enough parameters');
    if (!name.startsWith('#')) return conn.sendNumeric(403, name, 'No such channel');

    const chan = this.#resolveChannel(name) || this.#makeChannel(name.startsWith('#') ? name : `#${name}`);
    if (chan.members.has(conn.id)) return; // already a member; be forgiving
    chan.members.add(conn.id);
    conn.channels.add(chan.name);

    const joinLine = `:${conn.hostmask} JOIN ${chan.name}`;
    for (const memberId of chan.members) this.connections.get(memberId)?.sendLine(joinLine);

    if (chan.topic) conn.sendNumeric(332, chan.name, chan.topic);
    else conn.sendNumeric(331, chan.name, 'No topic is set');
    this.#sendNames(conn, chan);
    this.#emit({ type: 'join', conn, channel: chan.name });
  }

  #sendNames(conn, chan) {
    const names = [...chan.members]
      .map((id) => this.connections.get(id))
      .filter(Boolean)
      .map((m) => (m.oper ? `@${m.nick}` : m.nick));
    for (let i = 0; i < names.length; i += 20) {
      conn.sendNumeric(353, '=', chan.name, names.slice(i, i + 20).join(' '));
    }
    conn.sendNumeric(366, chan.name, 'End of /NAMES list');
  }

  #part(conn, params, trailing) {
    const name = params[0];
    const chan = this.#resolveChannel(name || '');
    if (!name || !chan) return conn.sendNumeric(403, name || '', 'No such channel');
    if (!chan.members.has(conn.id)) return conn.sendNumeric(442, chan.name, "You're not on that channel");
    const partLine = `:${conn.hostmask} PART ${chan.name} :${stripLine(trailing || 'Leaving')}`;
    for (const memberId of chan.members) this.connections.get(memberId)?.sendLine(partLine);
    chan.members.delete(conn.id);
    conn.channels.delete(chan.name);
    this.#emit({ type: 'part', conn, channel: chan.name });
  }

  #topic(conn, params, trailing) {
    if (!conn.registered) return conn.sendNumeric(451, 'You have not registered');
    const name = params[0];
    const chan = this.#resolveChannel(name || '');
    if (!name || !chan) return conn.sendNumeric(403, name || '', 'No such channel');
    if (trailing !== null) {
      if (!chan.members.has(conn.id)) return conn.sendNumeric(442, chan.name, "You're not on that channel");
      chan.topic = stripLine(trailing).slice(0, 300);
      chan.topicBy = conn.nick;
      const line = `:${conn.hostmask} TOPIC ${chan.name} :${chan.topic}`;
      for (const memberId of chan.members) this.connections.get(memberId)?.sendLine(line);
      return;
    }
    if (chan.topic) return conn.sendNumeric(332, chan.name, chan.topic);
    return conn.sendNumeric(331, chan.name, 'No topic is set');
  }

  #names(conn, params) {
    const name = params[0];
    if (!name) return conn.sendNumeric(366, '*', 'End of /NAMES list');
    const chan = this.#resolveChannel(name);
    if (!chan) return conn.sendNumeric(366, name, 'End of /NAMES list');
    return this.#sendNames(conn, chan);
  }

  #privmsg(conn, params, trailing) {
    if (!conn.registered) return conn.sendNumeric(451, 'You have not registered');
    const target = params[0];
    const text = params[1] ?? trailing;
    if (!target) return conn.sendNumeric(411, 'No recipient given (PRIVMSG)');
    if (text === null || text === undefined || text === '') {
      return conn.sendNumeric(412, 'No text to send');
    }

    const clean = stripLine(text);
    if (target.startsWith('#') || target.startsWith('&')) {
      const chan = this.#resolveChannel(target);
      if (!chan) return conn.sendNumeric(401, target, 'No such nick/channel');
      if (!chan.members.has(conn.id)) return conn.sendNumeric(442, chan.name, "You're not on that channel");
      const line = `:${conn.hostmask} PRIVMSG ${chan.name} :${clean}`;
      for (const memberId of chan.members) {
        const member = this.connections.get(memberId);
        if (member && member !== conn) member.sendLine(line);
      }
      this.#emit({ type: 'privmsg', conn, target: chan.name, text: clean, isChannel: true, isAction: isActionText(clean) });
      return;
    }

    const recipient = this.nicks.get(target.toLowerCase());
    if (!recipient) return conn.sendNumeric(401, target, 'No such nick/channel');
    recipient.sendLine(`:${conn.hostmask} PRIVMSG ${recipient.nick} :${clean}`);
    this.#emit({
      type: 'privmsg',
      conn,
      target: recipient.nick,
      targetConn: recipient,
      text: clean,
      isChannel: false,
      isAction: isActionText(clean),
    });
  }

  #who(conn, params) {
    if (!conn.registered) return conn.sendNumeric(451, 'You have not registered');
    const name = params[0];
    if (!name) return conn.sendNumeric(315, name || '*', 'End of WHO list');
    const members = name.startsWith('#')
      ? [...(this.#resolveChannel(name)?.members ?? [])]
      : this.nicks.has(name.toLowerCase()) ? [this.nicks.get(name.toLowerCase()).id] : [];
    for (const memberId of members) {
      const member = this.connections.get(memberId);
      if (!member) continue;
      conn.sendNumeric(352, name.startsWith('#') ? name : '*',
        member.username, member.address, SERVER_NAME, member.nick,
        `H${member.oper ? '@' : ''}`, `0 ${member.realname || ''}`);
    }
    conn.sendNumeric(315, name, 'End of WHO list');
  }

  #whois(conn, params) {
    if (!conn.registered) return conn.sendNumeric(451, 'You have not registered');
    const target = params[params.length - 1] || params[0];
    const member = target ? this.nicks.get(target.toLowerCase()) : null;
    if (!member) {
      if (target) conn.sendNumeric(401, target, 'No such nick/channel');
      return conn.sendNumeric(318, target || '*', 'End of /WHOIS list');
    }
    conn.sendNumeric(311, member.nick, member.username, member.address, '*', member.realname || '');
    conn.sendNumeric(312, member.nick, SERVER_NAME, 'Afterlight town relay');
    conn.sendNumeric(318, member.nick, 'End of /WHOIS list');
  }

  #oper(conn, params) {
    const name = params[0] || '';
    const pass = params[1] ?? '';
    if (this.operPass && name === this.operName && pass === this.operPass) {
      conn.oper = true;
      conn.sendNumeric(381, 'You are now an IRC operator');
      const line = `:${SERVER_NAME} MODE ${conn.nick} +o`;
      for (const chanName of conn.channels) {
        for (const memberId of this.channels.get(chanName)?.members ?? []) {
          this.connections.get(memberId)?.sendLine(line);
        }
      }
      return;
    }
    return conn.sendNumeric(464, 'Password incorrect');
  }

  #reapIdle() {
    const deadline = now();
    for (const conn of [...this.connections.values()]) {
      if (conn.isBridge || conn.gone) continue;
      const idleFor = deadline - conn.lastSeen;
      if (conn.pingSentAt) {
        if (deadline - conn.pingSentAt > this.pingTimeoutMs) {
          this.disconnect(conn, 'Ping timeout');
        }
      } else if (idleFor > this.idlePingAfterMs) {
        conn.pingSentAt = deadline;
        conn.sendLine(`PING :${SERVER_NAME}`);
      }
    }
  }
}

function cleanAddress(raw) {
  if (!raw) return 'unknown';
  return String(raw).replace(/^::ffff:/, '').replace(/^::1$/, 'localhost');
}
