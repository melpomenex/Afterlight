/**
 * Town chat panel: the in-game window onto #afterlight.
 *
 * Renders channel messages, direct messages, action lines, system lines and
 * presence notices. All user-supplied text is inserted via textContent —
 * nothing from the network is ever interpreted as markup.
 *
 * Input safety contract with main.js: the panel never adds to the game's
 * key set; focus changes are reported through onFocusChange so the game can
 * clear held movement keys, and Escape always returns control to the game.
 */

import { MSG_TYPES } from '../../shared/protocol.js';

const MAX_LINES = 200; // DOM cap; the server keeps the longer history

export class ChatPanel {
  constructor(net, { onFocusChange = null } = {}) {
    this.net = net;
    this.onFocusChange = onFocusChange;
    this.collapsed = false;
    this.unread = 0;

    this.panel = document.getElementById('chat-panel');
    this.log = document.getElementById('chat-log');
    this.toggle = document.getElementById('chat-toggle');
    this.unreadBadge = document.getElementById('chat-unread');
    this.form = document.getElementById('chat-form');
    this.input = document.getElementById('chat-input');
    this.sendBtn = document.getElementById('chat-send');
    this.connected = false;

    if (!this.panel || !this.log) return;

    this.toggle.addEventListener('click', () => this.setCollapsed(!this.collapsed));

    this.input.addEventListener('focus', () => this.onFocusChange?.(true));
    this.input.addEventListener('blur', () => this.onFocusChange?.(false));
    this.input.addEventListener('keydown', (e) => {
      // Keep these keys out of the game's global handlers entirely.
      e.stopPropagation();
      if (e.code === 'Escape') {
        e.preventDefault();
        this.input.blur();
        return;
      }
      if (e.code === 'Enter') {
        e.preventDefault();
        this.submit(e.shiftKey); // Shift+Enter keeps the input open
      }
    });

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submit(e.shiftKey || document.activeElement !== this.input);
    });

    this.net.on(MSG_TYPES.CHAT_HISTORY, (msg) => this.setHistory(msg.messages || []));
    this.net.on(MSG_TYPES.CHAT_MESSAGE, (msg) => this.addMessage(msg));
    this.net.on(MSG_TYPES.CHAT_DM, (msg) => this.addDM(msg));
    this.net.on(MSG_TYPES.CHAT_PRESENCE, (msg) => this.addPresence(msg));
    this.net.on(MSG_TYPES.CHAT_ERROR, (msg) => this.addError(msg));

    this.net.onDisconnect(() => this.setConnected(false));
    this.net.onConnect(() => this.setConnected(true));
    this.setConnected(this.net.connected);
  }

  // --- state ---------------------------------------------------------------

  setConnected(connected) {
    this.connected = connected;
    if (!this.input) return;
    this.input.disabled = !connected;
    this.sendBtn.disabled = !connected;
    this.input.placeholder = connected
      ? 'Say hello… (Enter to chat, Esc to release)'
      : 'The relay is quiet — reconnecting…';
    if (!connected) this.addSystemLine('The town relay is out of reach.');
  }

  setCollapsed(collapsed) {
    this.collapsed = collapsed;
    this.panel.classList.toggle('collapsed', collapsed);
    this.toggle.setAttribute('aria-expanded', String(!collapsed));
    if (!collapsed) this.#clearUnread();
  }

  focusInput(prefill = '') {
    if (!this.connected) {
      // Still open the panel so the offline note is visible.
      this.setCollapsed(false);
      this.input.focus();
      return;
    }
    this.setCollapsed(false);
    if (prefill) this.input.value = prefill;
    this.input.focus();
  }

  // --- submission ------------------------------------------------------------

  submit(keepFocus = false) {
    const text = this.input.value.trim();
    this.input.value = '';
    if (!text) return;
    if (!this.connected) return; // no fake delivery while offline
    this.net.sendChat(text);
    if (!keepFocus) this.input.blur();
  }

  // --- rendering -------------------------------------------------------------

  setHistory(messages) {
    this.log.textContent = '';
    for (const msg of messages) this.addMessage(msg, { fromHistory: true });
    this.#scrollToBottom(true);
  }

  addMessage(msg) {
    const kind = msg.fromKind || 'player';
    if (kind === 'system') {
      this.addSystemLine(msg.text);
      return;
    }
    const line = this.#makeLine(msg);
    if (msg.action) {
      line.appendChild(this.#span('chat-body chat-action', `${msg.from} ${stripAction(msg.text)}`));
    } else {
      line.appendChild(this.#span('chat-nick', msg.from));
      line.appendChild(this.#span('chat-body', msg.text));
    }
    this.#commit(line, msg.from === this.net.nickname);
  }

  addDM(msg) {
    const line = this.#makeLine(msg);
    const outgoing = msg.echo || msg.from === this.net.nickname;
    const partner = outgoing ? msg.to : msg.from;
    line.appendChild(this.#span('chat-nick', outgoing ? `to ${partner}` : `from ${partner}`));
    line.appendChild(this.#span('chat-body', msg.action ? `${msg.from} ${stripAction(msg.text)}` : msg.text));
    this.#commit(line, outgoing, 'dm');
  }

  addPresence(msg) {
    const verb = msg.event === 'join' ? 'steps into the town channel' : ' drifts away from it';
    const origin = msg.fromKind === 'irc' ? ' (relay)' : '';
    this.addSystemLine(`${msg.who}${origin}${verb}.`);
  }

  addError(msg) {
    const line = this.#makeLine({ ts: Date.now() });
    line.appendChild(this.#span('chat-body chat-error', msg.message));
    this.#commit(line, false, 'error');
  }

  addSystemLine(text) {
    const line = this.#makeLine({ ts: Date.now() });
    line.appendChild(this.#span('chat-body chat-system', text));
    this.#commit(line, false, 'system');
  }

  // --- internals -------------------------------------------------------------

  #makeLine(msg = {}) {
    const line = document.createElement('div');
    line.className = 'chat-line';
    const time = msg.ts ? new Date(msg.ts) : new Date();
    const hh = String(time.getHours()).padStart(2, '0');
    const mm = String(time.getMinutes()).padStart(2, '0');
    line.appendChild(this.#span('chat-time', `${hh}:${mm}`));
    return line;
  }

  #span(className, text) {
    const el = document.createElement('span');
    el.className = className;
    el.textContent = text;
    return el;
  }

  #commit(line, isSelf, extraClass = '') {
    if (extraClass) line.classList.add(extraClass);
    if (isSelf) line.classList.add('self');
    this.log.appendChild(line);
    while (this.log.childElementCount > MAX_LINES) this.log.firstChild.remove();
    this.#scrollToBottom();
    if (this.collapsed) this.#bumpUnread();
  }

  #scrollToBottom(force = false) {
    const nearBottom = this.log.scrollHeight - this.log.scrollTop - this.log.clientHeight < 48;
    if (force || nearBottom) this.log.scrollTop = this.log.scrollHeight;
  }

  #bumpUnread() {
    this.unread += 1;
    this.unreadBadge.hidden = false;
    this.unreadBadge.textContent = String(this.unread);
  }

  #clearUnread() {
    this.unread = 0;
    this.unreadBadge.hidden = true;
    this.unreadBadge.textContent = '';
  }
}

function stripAction(text) {
  return String(text ?? '').replace(/^\u0001ACTION /, '').replace(/\u0001$/, '');
}
