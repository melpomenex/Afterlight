/**
 * Chat bridge between the in-game WebSocket world and the embedded IRC
 * server.
 *
 * Each connected player gets a synthetic IRC session fed through the same
 * command parser as real TCP clients. The bridge listens to IRC events and
 * translates both directions:
 *
 *   game CHAT_SEND  -> synthetic PRIVMSG -> IRCd fan-out -> chat_message broadcast
 *   IRC PRIVMSG     -> event             -> chat_message / chat_dm to players
 *
 * When the IRC listener is disabled (IRC_DISABLED=1 or a failed bind) the
 * bridge degrades to an in-game-only relay: same packets, same history,
 * no external door.
 */

import { MSG_TYPES } from '../shared/protocol.js';

export const CHAT_HARD_LIMIT = 600; // raw submissions above this are rejected
export const CHAT_MAX_CHARS = 400; // sanitized messages are capped here
export const HISTORY_KEEP = 100; // ring buffer size
export const HISTORY_DELIVER = 50; // sent to each player on connect
export const DEFAULT_CHANNEL = '#afterlight';

export function cleanText(text) {
  return String(text ?? '')
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '') // control chars
    .replace(/[\r\n\t]+/g, ' ')
    .trim();
}

export function parseChat(rawText, { sender = '', players = [], ircNicks = [] } = {}) {
  const text = typeof rawText === 'string' ? rawText : '';
  if (!text.trim()) {
    return { error: 'Say something first.' };
  }
  if (text.length > CHAT_HARD_LIMIT) {
    return {
      error: `That message is too long (${CHAT_MAX_CHARS} characters max).`,
    };
  }

  const clean = cleanText(text).slice(0, CHAT_MAX_CHARS);
  if (!clean) {
    return { error: 'Say something first.' };
  }

  if (clean.startsWith('/')) {
    const spaceIdx = clean.indexOf(' ');
    const command = (spaceIdx === -1 ? clean : clean.slice(0, spaceIdx)).toLowerCase();
    const args = spaceIdx === -1 ? '' : clean.slice(spaceIdx + 1).trim();

    if (command === '/me') {
      if (!args) {
        return { error: 'Usage: /me <action>' };
      }
      return { kind: 'me', text: args };
    }

    if (command === '/msg' || command === '/query') {
      const targetSpaceIdx = args.indexOf(' ');
      const target = targetSpaceIdx === -1 ? args : args.slice(0, targetSpaceIdx);
      const body = targetSpaceIdx === -1 ? '' : args.slice(targetSpaceIdx + 1).trim();
      if (!target || !body) {
        return { error: 'Usage: /msg <name> <message>' };
      }

      const senderLower = (sender || '').toLowerCase();
      const targetLower = target.toLowerCase();

      // Another online player (case-insensitive, not self)?
      const matchedPlayer = players.find(
        (p) => p.toLowerCase() === targetLower && p.toLowerCase() !== senderLower
      );
      if (matchedPlayer) {
        return { kind: 'dm', target: matchedPlayer, targetKind: 'player', text: body };
      }

      // External IRC connection (not self)?
      const matchedIrc = ircNicks.find(
        (n) => n.toLowerCase() === targetLower && n.toLowerCase() !== senderLower
      );
      if (matchedIrc) {
        return { kind: 'dm', target: matchedIrc, targetKind: 'irc', text: body };
      }

      return { error: `No one called ${target} is around right now.` };
    }

    if (command === '/help') {
      return {
        kind: 'help',
        text: 'Commands: /msg <name> <text> whispers directly · /me <action> acts it out.',
      };
    }

    return {
      error: `Unknown command ${command}. Try /msg <name> <text> or /me <action>.`,
    };
  }

  return { kind: 'message', text: clean };
}

export class ChatBridge {
  constructor({ world, irc = null, enabled = true }) {
    this.world = world;
    this.irc = irc;
    this.enabled = Boolean(enabled);
    this.sessions = new Map(); // playerId -> { conn|null, player, ircNick }
    this.nickToPlayer = new Map(); // lower(ircNick) -> playerId
    this.history = []; // channel message ring buffer
    this.unlisten = (irc && this.enabled) ? irc.onEvent((evt) => this.#onIrcEvent(evt)) : null;
  }

  /** Tear down subscriptions (used by tests / clean shutdown). */
  destroy() {
    if (this.unlisten) this.unlisten();
    this.unlisten = null;
  }

  // --- player lifecycle -----------------------------------------------------

  playerConnected(playerId, player, session) {
    if (!this.enabled) return;
    this.playerDisconnected(playerId); // defensive: stale session from a racing reconnect

    let entry = { conn: null, player, session, ircNick: player.nickname };
    this.sessions.set(playerId, entry);

    if (this.irc) {
      const { nick, changed } = this.irc.allocateNick(player.nickname);
      const conn = this.irc.createBridgeSession({
        id: `player:${playerId}`,
        nick,
        username: 'gardener',
        realname: player.nickname,
      });
      conn.bridgeMeta = { playerId };
      entry.conn = conn;
      entry.ircNick = nick;
      this.nickToPlayer.set(nick.toLowerCase(), playerId);
      conn.handleLine(`JOIN ${DEFAULT_CHANNEL}`);
      if (changed) {
        this.#sendTo(session, {
          type: MSG_TYPES.CHAT_MESSAGE,
          channel: DEFAULT_CHANNEL,
          fromKind: 'system',
          from: 'afterlight',
          text: `Your chat handle on the town relay is ${nick}.`,
          ts: Date.now(),
        });
      }
    } else {
      this.#broadcastPresence('join', player.nickname, 'player');
    }

    this.#sendTo(session, {
      type: MSG_TYPES.CHAT_HISTORY,
      channel: DEFAULT_CHANNEL,
      messages: this.history.slice(-HISTORY_DELIVER),
    });
  }

  playerDisconnected(playerId) {
    if (!this.enabled) return;
    const entry = this.sessions.get(playerId);
    if (!entry) return;
    this.sessions.delete(playerId);
    this.nickToPlayer.delete(entry.ircNick.toLowerCase());

    if (entry.conn) {
      // Routes through the IRCd so external clients see the departure too;
      // its quit event fans the system line back to remaining players.
      entry.conn.handleLine('QUIT :left the courtyard');
    } else if (!this.irc) {
      this.#broadcastPresence('part', entry.player.nickname, 'player');
    }
  }

  // --- outbound (game -> relay) ----------------------------------------------

  handlePlayerChat(playerId, rawText) {
    if (!this.enabled) return;
    const entry = this.sessions.get(playerId);
    if (!entry) return;

    const text = typeof rawText === 'string' ? rawText : '';
    if (!text.trim()) {
      this.#sendTo(entry.session, { type: MSG_TYPES.CHAT_ERROR, message: 'Say something first.' });
      return;
    }
    if (text.length > CHAT_HARD_LIMIT) {
      this.#sendTo(entry.session, {
        type: MSG_TYPES.CHAT_ERROR,
        message: `That message is too long (${CHAT_MAX_CHARS} characters max).`,
      });
      return;
    }

    const clean = cleanText(text).slice(0, CHAT_MAX_CHARS);
    if (!clean) {
      this.#sendTo(entry.session, { type: MSG_TYPES.CHAT_ERROR, message: 'Say something first.' });
      return;
    }

    if (clean.startsWith('/')) {
      this.#handleCommand(entry, playerId, clean);
      return;
    }

    this.#sendChannelMessage(entry, clean);
  }

  #handleCommand(entry, playerId, clean) {
    const session = entry.session;
    const spaceIdx = clean.indexOf(' ');
    const command = (spaceIdx === -1 ? clean : clean.slice(0, spaceIdx)).toLowerCase();
    const args = spaceIdx === -1 ? '' : clean.slice(spaceIdx + 1).trim();

    if (command === '/me') {
      if (!args) {
        this.#sendTo(session, { type: MSG_TYPES.CHAT_ERROR, message: 'Usage: /me <action>' });
        return;
      }
      this.#sendChannelMessage(entry, `\u0001ACTION ${args}\u0001`);
      return;
    }

    if (command === '/msg' || command === '/query') {
      const targetSpaceIdx = args.indexOf(' ');
      const target = targetSpaceIdx === -1 ? args : args.slice(0, targetSpaceIdx);
      const body = targetSpaceIdx === -1 ? '' : args.slice(targetSpaceIdx + 1).trim();
      if (!target || !body) {
        this.#sendTo(session, { type: MSG_TYPES.CHAT_ERROR, message: 'Usage: /msg <name> <message>' });
        return;
      }
      this.#sendDirectMessage(entry, target, body);
      return;
    }

    if (command === '/help') {
      this.#sendTo(session, {
        type: MSG_TYPES.CHAT_MESSAGE,
        channel: DEFAULT_CHANNEL,
        fromKind: 'system',
        from: 'afterlight',
        text: 'Commands: /msg <name> <text> whispers directly · /me <action> acts it out.',
        ts: Date.now(),
      });
      return;
    }

    this.#sendTo(session, {
      type: MSG_TYPES.CHAT_ERROR,
      message: `Unknown command ${command}. Try /msg <name> <text> or /me <action>.`,
    });
  }

  #sendChannelMessage(entry, text) {
    if (entry.conn) {
      // The IRCd fans this out and the event loop relays it back in-game
      // (the sender is excluded from IRC fan-out, so one broadcast covers
      // everyone exactly once, echo included).
      entry.conn.handleLine(`PRIVMSG ${DEFAULT_CHANNEL} :${text}`);
      return;
    }
    // Degraded mode: no IRC server, relay in-game only.
    this.#deliverChannelMessage(entry.player.nickname, 'player', text, Date.now());
  }

  #sendDirectMessage(entry, targetName, body) {
    const senderNick = entry.player.nickname;

    // Another online player (game nickname, case-insensitive)?
    const targetLower = targetName.toLowerCase();
    for (const [otherId, other] of this.sessions.entries()) {
      if (other.player.nickname.toLowerCase() === targetLower && otherId !== entry.player.id) {
        this.#sendTo(entry.session, {
          type: MSG_TYPES.CHAT_DM,
          from: senderNick,
          fromKind: 'player',
          to: other.player.nickname,
          text: body,
          ts: Date.now(),
          echo: true,
        });
        this.#sendTo(other.session, {
          type: MSG_TYPES.CHAT_DM,
          from: senderNick,
          fromKind: 'player',
          to: other.player.nickname,
          text: body,
          ts: Date.now(),
        });
        return;
      }
    }

    // An external IRC connection (bot or human)?
    if (this.irc) {
      const targetConn = this.irc.connectionForNick(targetName);
      if (targetConn && targetConn !== entry.conn) {
        entry.conn.handleLine(`PRIVMSG ${targetConn.nick} :${body}`); // IRCd delivers privately
        return; // the privmsg event echoes the sender's copy
      }
    }

    this.#sendTo(entry.session, {
      type: MSG_TYPES.CHAT_ERROR,
      message: `No one called ${targetName} is around right now.`,
    });
  }

  // --- inbound (relay -> game) -----------------------------------------------

  #onIrcEvent(evt) {
    if (!this.enabled) return;
    if (evt.type === 'privmsg') {
      const fromPlayer = evt.conn.bridgeMeta?.playerId;
      const entry = fromPlayer ? this.sessions.get(fromPlayer) : null;
      const from = entry ? entry.player.nickname : evt.conn.nick;
      const fromKind = entry ? 'player' : 'irc';

      if (evt.isChannel) {
        this.#deliverChannelMessage(from, fromKind, evt.text, Date.now(), evt.isAction);
        return;
      }

      // Direct message. Deliver to the receiving player if it is one, and
      // echo to a sending player; external senders/receivers were already
      // (or are separately) handled by the IRCd itself.
      const targetEntry = evt.targetConn
        ? this.sessions.get(evt.targetConn.bridgeMeta?.playerId)
        : null;
      if (targetEntry) {
        this.#sendTo(targetEntry.session, {
          type: MSG_TYPES.CHAT_DM,
          from,
          fromKind,
          to: targetEntry.player.nickname,
          text: evt.text,
          action: evt.isAction,
          ts: Date.now(),
        });
      }
      if (entry) {
        this.#sendTo(entry.session, {
          type: MSG_TYPES.CHAT_DM,
          from,
          fromKind,
          to: evt.target, // as addressed by the sender
          text: evt.text,
          action: evt.isAction,
          ts: Date.now(),
          echo: true,
        });
      }
      return;
    }

    if (evt.type === 'join' || evt.type === 'part' || evt.type === 'quit') {
      const fromPlayer = evt.conn.bridgeMeta?.playerId;
      const entry = fromPlayer ? this.sessions.get(fromPlayer) : null;
      const who = entry ? entry.player.nickname : evt.conn.nick;
      const fromKind = entry ? 'player' : 'irc';
      this.#broadcastPresence(evt.type === 'join' ? 'join' : 'part', who, fromKind);
      return;
    }

    if (evt.type === 'nick') {
      const fromPlayer = evt.conn.bridgeMeta?.playerId;
      const entry = fromPlayer ? this.sessions.get(fromPlayer) : null;
      this.world.broadcastToAll({
        type: MSG_TYPES.CHAT_MESSAGE,
        channel: DEFAULT_CHANNEL,
        fromKind: 'system',
        from: 'afterlight',
        text: `${entry ? entry.player.nickname : evt.oldNick} is now known as ${evt.newNick}.`,
        ts: Date.now(),
      });
    }
  }

  #deliverChannelMessage(from, fromKind, text, ts, isAction = false) {
    const message = {
      type: MSG_TYPES.CHAT_MESSAGE,
      channel: DEFAULT_CHANNEL,
      from,
      fromKind,
      text,
      action: isAction || undefined,
      ts,
    };
    this.history.push({ ...message, type: undefined });
    if (this.history.length > HISTORY_KEEP) this.history.shift();
    this.world.broadcastToAll(message);
  }

  #broadcastPresence(event, who, fromKind) {
    this.world.broadcastToAll({
      type: MSG_TYPES.CHAT_PRESENCE,
      channel: DEFAULT_CHANNEL,
      event,
      who,
      fromKind,
      ts: Date.now(),
    });
  }

  #sendTo(session, msg) {
    if (session) session.send(msg);
  }
}
