/**
 * Modernized Town Chat Panel: The in-game social window onto #afterlight.
 *
 * Features:
 * - Native Unicode Emoji Picker with categories and real-time search
 * - Contextual Autocomplete for :emoji shortcodes and @player mentions
 * - Consecutive message grouping (3m window) with avatar badges
 * - Multiple layout modes (Comfortable, Compact, Bubble)
 * - Intelligent scroll anchoring with unread jump indicator (↓ N new messages)
 * - Threaded-lite inline replies with jump-to-quote navigation
 * - Appearance customization system with 6 presets and World theme integration
 * - Safe linkification, strict XSS protection, and game input isolation
 */

import { MSG_TYPES } from '../../shared/protocol.js';
import { EmojiPicker } from './chat/emojiPicker.js';
import { ChatAutocomplete } from './chat/autocomplete.js';
import { ChatPreferencesManager } from './chat/chatPreferences.js';
import { AppearanceModal } from './chat/appearanceModal.js';

const MAX_LINES = 200; // DOM cap; FIFO eviction
const GROUPING_WINDOW_MS = 180_000; // 3 minutes

// Resizable panel bounds
const SIZE_KEY = 'afterlight-chat-size';
const DRAFT_KEY = 'afterlight-chat-draft';
const SIZE_MIN_W = 280;
const SIZE_MIN_H = 120;
const SIZE_MAX_W = 640;
const SIZE_MAX_H = 560;

function clampSize(value, lo, hi) {
  return Math.max(lo, Math.min(hi, value));
}

const PRESENCE_COOLDOWN_MS = 15_000;
const PRESENCE_FLAP_WINDOW_MS = 3_000;
const PRESENCE_CLEANUP_INTERVAL_MS = 30_000;

function isSelfPresence(net, who) {
  return who === net?.nickname || who === net?.guestId;
}

function isPresenceFlapping(last, event, now) {
  if (!last) return false;
  const elapsed = now - last.ts;
  if (last.event === event) return elapsed < PRESENCE_COOLDOWN_MS;
  return elapsed < PRESENCE_FLAP_WINDOW_MS;
}

function getInitials(name) {
  const str = String(name || '').trim();
  if (!str) return '??';
  const parts = str.split(/[\s_.-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return str.slice(0, 2).toUpperCase();
}

function stripAction(text) {
  return String(text ?? '').replace(/^\u0001ACTION /, '').replace(/\u0001$/, '');
}

export class ChatPanel {
  constructor(net, { onFocusChange = null } = {}) {
    this.net = net;
    this.onFocusChange = onFocusChange;
    this.collapsed = false;
    this.unread = 0;
    this.scrolledUpUnread = 0;
    this.isScrolledUp = false;
    this.connected = false;
    this.recentPresence = new Map();
    this.lastGroup = null; // { sender, fromKind, ts, groupEl, bodyEl }

    // Preferences & Theming
    this.prefsManager = new ChatPreferencesManager();

    // DOM Elements
    this.panel = document.getElementById('chat-panel');
    this.log = document.getElementById('chat-log');
    this.toggle = document.getElementById('chat-toggle');
    this.unreadBadge = document.getElementById('chat-unread');
    this.collapseIndicator = document.getElementById('chat-collapse-indicator');
    this.form = document.getElementById('chat-form');
    this.input = document.getElementById('chat-input');
    this.sendBtn = document.getElementById('chat-send');
    this.handle = document.getElementById('chat-resize');
    this.settingsBtn = document.getElementById('chat-settings-btn');
    this.jumpPill = document.getElementById('chat-jump-pill');
    this.jumpCount = document.getElementById('chat-jump-count');
    this.emojiToggle = document.getElementById('chat-emoji-toggle');

    if (this.jumpPill) this.jumpPill.hidden = true;

    if (!this.panel || !this.log) return;

    // Apply saved preferences styling
    this.prefsManager.applyToElement(this.panel);
    this.prefsManager.subscribe(() => {
      this.prefsManager.applyToElement(this.panel);
    });

    // Subcomponents
    this.emojiPicker = new EmojiPicker({
      onSelect: (emoji) => this.#insertEmoji(emoji),
      onClose: () => {
        if (!this.collapsed) this.input?.focus();
      },
    });
    this.panel.appendChild(this.emojiPicker.root);

    this.autocomplete = new ChatAutocomplete({
      input: this.input,
      getOnlinePlayers: () => this.#getOnlineNicknames(),
      onSelect: () => this.#saveDraft(),
    });
    this.panel.appendChild(this.autocomplete.root);

    this.appearanceModal = new AppearanceModal(this.prefsManager, {
      onClose: () => {
        this.settingsBtn?.focus();
      },
    });

    this.#initEvents();
    this.#initNetwork();
    this.#initResize();
    this.#restoreDraft();
  }

  // --- Events & Input --------------------------------------------------------

  #initEvents() {
    this.toggle?.addEventListener('click', () => this.setCollapsed(!this.collapsed));

    this.settingsBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.appearanceModal.open();
    });

    this.emojiToggle?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.emojiPicker.toggle(this.emojiToggle);
    });

    this.jumpPill?.addEventListener('click', () => {
      this.#scrollToBottom(true);
      this.#clearScrolledUnread();
    });

    this.log.addEventListener('scroll', () => {
      const dist = this.log.scrollHeight - this.log.scrollTop - this.log.clientHeight;
      this.isScrolledUp = dist > 48;
      if (!this.isScrolledUp) {
        this.#clearScrolledUnread();
      }
    });

    this.input.addEventListener('focus', () => this.onFocusChange?.(true));
    this.input.addEventListener('blur', () => {
      this.onFocusChange?.(false);
      this.#saveDraft();
      // Delay closing autocomplete slightly so click selections register
      setTimeout(() => this.autocomplete.close(), 150);
    });

    this.input.addEventListener('input', () => {
      this.autocomplete.update();
      this.#saveDraft();
    });

    this.input.addEventListener('keydown', (e) => {
      e.stopPropagation(); // Keep keys out of game controls

      // Pass arrow keys, tab, enter to autocomplete if open
      if (this.autocomplete.handleKeyDown(e)) return;

      if (e.code === 'Escape') {
        e.preventDefault();
        if (this.autocomplete.isOpen) {
          this.autocomplete.close();
          return;
        }
        if (this.emojiPicker.isOpen) {
          this.emojiPicker.close();
          this.input.focus();
          return;
        }
        this.input.blur();
        return;
      }

      if (e.code === 'Enter') {
        e.preventDefault();
        this.submit(e.shiftKey);
      }
    });

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submit(e.shiftKey || document.activeElement !== this.input);
    });
  }

  #initNetwork() {
    this.net.on(MSG_TYPES.CHAT_HISTORY, (msg) => this.setHistory(msg.messages || []));
    this.net.on(MSG_TYPES.CHAT_MESSAGE, (msg) => this.addMessage(msg));
    this.net.on(MSG_TYPES.CHAT_DM, (msg) => this.addDM(msg));
    this.net.on(MSG_TYPES.CHAT_PRESENCE, (msg) => this.addPresence(msg));
    this.net.on(MSG_TYPES.CHAT_ERROR, (msg) => this.addError(msg));

    this.net.onDisconnect(() => this.setConnected(false));
    this.net.onConnect(() => this.setConnected(true));
    this.setConnected(this.net.connected);
  }

  // --- State & Lifecycle -----------------------------------------------------

  setConnected(connected) {
    const wasConnected = this.connected;
    this.connected = connected;
    if (!this.input) return;
    this.input.disabled = !connected;
    this.sendBtn.disabled = !connected;
    if (this.emojiToggle) this.emojiToggle.disabled = !connected;

    this.input.placeholder = connected
      ? 'Say hello… (: for emoji, @ for mention, Esc to release)'
      : 'The relay is quiet — reconnecting…';
    if (wasConnected && !connected) this.addSystemLine('The town relay is out of reach.');
  }

  setCollapsed(collapsed) {
    this.collapsed = collapsed;
    this.panel.classList.toggle('collapsed', collapsed);
    this.toggle?.setAttribute('aria-expanded', String(!collapsed));
    if (this.collapseIndicator) {
      this.collapseIndicator.style.transform = collapsed ? 'rotate(-90deg)' : '';
    }
    if (!collapsed) {
      this.#clearUnread();
      this.#scrollToBottom(true);
    }
  }

  setWorld(worldId) {
    this.prefsManager.setWorld(worldId);
  }

  focusInput(prefill = '') {
    if (!this.connected) {
      this.setCollapsed(false);
      this.input?.focus();
      return;
    }
    this.setCollapsed(false);
    if (prefill) {
      this.input.value = prefill;
      this.#saveDraft();
    }
    this.input?.focus();
  }

  // --- Submission & Drafts ---------------------------------------------------

  submit(keepFocus = false) {
    const text = this.input.value.trim();
    this.input.value = '';
    this.#clearDraft();
    this.autocomplete.close();
    if (!text) return;
    if (!this.connected) return;

    this.net.sendChat(text);
    if (!keepFocus) this.input.blur();
  }

  #insertEmoji(emojiObj) {
    if (!emojiObj?.emoji || !this.input) return;
    const pos = this.input.selectionStart ?? this.input.value.length;
    const text = this.input.value;
    const before = text.slice(0, pos);
    const after = text.slice(pos);

    this.input.value = before + emojiObj.emoji + after;
    const newPos = pos + emojiObj.emoji.length;
    this.input.setSelectionRange?.(newPos, newPos);
    this.input.focus();
    this.#saveDraft();
  }

  #saveDraft() {
    try {
      const val = this.input?.value || '';
      if (val) localStorage.setItem(DRAFT_KEY, val);
      else localStorage.removeItem(DRAFT_KEY);
    } catch {}
  }

  #restoreDraft() {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved && this.input && !this.input.value) {
        this.input.value = saved;
      }
    } catch {}
  }

  #clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  }

  // --- Rendering & Grouping --------------------------------------------------

  setHistory(messages) {
    this.log.textContent = '';
    this.lastGroup = null;
    for (const msg of messages) this.addMessage(msg, { fromHistory: true });
    this.#scrollToBottom(true);
  }

  addMessage(msg, { fromHistory = false } = {}) {
    const kind = msg.fromKind || 'player';
    if (kind === 'system') {
      this.addSystemLine(msg.text);
      return;
    }

    const isSelf = msg.from === this.net.nickname;
    const prefs = this.prefsManager.getPreferences();
    const canGroup = prefs.groupConsecutive && prefs.layout !== 'compact' && !msg.action;
    const now = msg.ts || Date.now();

    const isSameGroup = this.lastGroup &&
      this.lastGroup.sender === msg.from &&
      this.lastGroup.fromKind === kind &&
      (now - this.lastGroup.ts < GROUPING_WINDOW_MS);

    if (canGroup && isSameGroup) {
      // Append line into current group
      const lineEl = this.#buildMessageLine(msg, isSelf);
      this.lastGroup.bodyEl.appendChild(lineEl);
      this.lastGroup.ts = now;
      this.#commitNode(this.lastGroup.groupEl, isSelf, fromHistory);
    } else {
      // Create new group container
      const groupEl = document.createElement('div');
      groupEl.className = 'chat-group';
      groupEl.dataset.sender = msg.from;
      if (isSelf) groupEl.classList.add('self');
      if (kind === 'irc') groupEl.classList.add('from-irc');

      const headerEl = this.#buildGroupHeader(msg, isSelf);
      groupEl.appendChild(headerEl);

      const bodyEl = document.createElement('div');
      bodyEl.className = 'chat-group-body';

      const lineEl = this.#buildMessageLine(msg, isSelf);
      bodyEl.appendChild(lineEl);
      groupEl.appendChild(bodyEl);

      this.lastGroup = {
        sender: msg.from,
        fromKind: kind,
        ts: now,
        groupEl,
        bodyEl,
      };

      this.log.appendChild(groupEl);
      this.#commitNode(groupEl, isSelf, fromHistory);
    }
  }

  addDM(msg) {
    const isSelf = msg.echo || msg.from === this.net.nickname;
    const partner = isSelf ? msg.to : msg.from;

    const groupEl = document.createElement('div');
    groupEl.className = 'chat-group chat-dm';
    if (isSelf) groupEl.classList.add('self');

    const headerEl = document.createElement('div');
    headerEl.className = 'chat-group-header';

    const avatar = document.createElement('span');
    avatar.className = 'chat-avatar-badge';
    avatar.textContent = getInitials(partner);
    headerEl.appendChild(avatar);

    const nick = document.createElement('span');
    nick.className = 'chat-nick';
    nick.textContent = isSelf ? `whisper to ${partner}` : `whisper from ${partner}`;
    headerEl.appendChild(nick);

    const time = document.createElement('span');
    time.className = 'chat-time';
    time.textContent = this.#formatTime(msg.ts);
    headerEl.appendChild(time);
    groupEl.appendChild(headerEl);

    const bodyEl = document.createElement('div');
    bodyEl.className = 'chat-group-body';

    const line = this.#buildMessageLine({
      text: msg.action ? `${msg.from} ${stripAction(msg.text)}` : msg.text,
      action: msg.action,
      from: msg.from,
    }, isSelf);
    bodyEl.appendChild(line);
    groupEl.appendChild(bodyEl);

    this.lastGroup = null; // DMs break public channel grouping
    this.log.appendChild(groupEl);
    this.#commitNode(groupEl, isSelf);
  }

  addPresence(msg) {
    if (!msg?.who || isSelfPresence(this.net, msg.who)) return;

    const now = Date.now();
    const last = this.recentPresence.get(msg.who);
    if (isPresenceFlapping(last, msg.event, now)) return;

    this.recentPresence.set(msg.who, { event: msg.event, ts: now });
    this.#pruneOldPresence(now);

    const verb = msg.event === 'join' ? ' steps into the town channel' : ' drifts away from it';
    const origin = msg.fromKind === 'irc' ? ' (relay)' : '';
    this.addSystemLine(`${msg.who}${origin}${verb}.`);
  }

  addError(msg) {
    const line = this.#makeSystemLine(msg.message, 'chat-error');
    this.lastGroup = null;
    this.log.appendChild(line);
    this.#commitNode(line, false);
  }

  addSystemLine(text) {
    const line = this.#makeSystemLine(text, 'chat-system');
    this.lastGroup = null;
    this.log.appendChild(line);
    this.#commitNode(line, false);
  }

  // --- Element Builders ------------------------------------------------------

  #buildGroupHeader(msg, isSelf) {
    const header = document.createElement('div');
    header.className = 'chat-group-header';

    // Avatar initials badge
    const avatar = document.createElement('span');
    avatar.className = 'chat-avatar-badge';
    avatar.textContent = msg.fromKind === 'irc' ? 'IR' : getInitials(msg.from);
    avatar.setAttribute('aria-hidden', 'true');
    header.appendChild(avatar);

    // Sender nickname (clickable to mention)
    const nick = document.createElement('button');
    nick.type = 'button';
    nick.className = 'chat-nick-btn';
    nick.textContent = msg.from;
    nick.setAttribute('aria-label', `Mention ${msg.from}`);
    nick.title = `Click to mention ${msg.from}`;
    nick.addEventListener('click', (e) => {
      e.stopPropagation();
      this.focusInput(`@${msg.from} `);
    });
    header.appendChild(nick);

    // Timestamp
    const time = document.createElement('span');
    time.className = 'chat-time';
    time.textContent = this.#formatTime(msg.ts);
    header.appendChild(time);

    // Context actions (revealed on hover/focus)
    const actions = document.createElement('div');
    actions.className = 'chat-group-actions';

    const replyBtn = document.createElement('button');
    replyBtn.type = 'button';
    replyBtn.className = 'chat-action-icon-btn chat-reply-btn';
    replyBtn.textContent = '↳';
    replyBtn.title = 'Reply';
    replyBtn.setAttribute('aria-label', `Reply to ${msg.from}`);
    replyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.#startReply(msg);
    });
    actions.appendChild(replyBtn);

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'chat-action-icon-btn chat-copy-btn';
    copyBtn.textContent = '⎘';
    copyBtn.title = 'Copy';
    copyBtn.setAttribute('aria-label', 'Copy message');
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.#copyText(msg.text);
    });
    actions.appendChild(copyBtn);

    header.appendChild(actions);
    return header;
  }

  #buildMessageLine(msg, isSelf) {
    const line = document.createElement('div');
    line.className = 'chat-line';
    if (isSelf) line.classList.add('self');
    if (msg.action) line.classList.add('action');

    const cleanRaw = String(msg.text || '');

    // Check for local player mention highlight
    if (this.net?.nickname && cleanRaw.toLowerCase().includes(`@${this.net.nickname.toLowerCase()}`)) {
      line.classList.add('chat-mentioned-self');
      line.classList.add('mention-highlight');
    }

    // Check for quoted reply format: > @user: excerpt\nbody
    const quoteMatch = cleanRaw.match(/^>\s*@([a-zA-Z0-9_-]+):\s*([^\n]+)\n([\s\S]*)$/);
    if (quoteMatch) {
      const quotedNick = quoteMatch[1];
      const quotedSnippet = quoteMatch[2];
      const bodyText = quoteMatch[3];

      const quoteBox = document.createElement('div');
      quoteBox.className = 'chat-reply-quote chat-quote';
      quoteBox.setAttribute('role', 'button');
      quoteBox.setAttribute('tabindex', '0');
      quoteBox.setAttribute('aria-label', `Replying to ${quotedNick}: ${quotedSnippet}`);

      const arrowSpan = document.createElement('span');
      arrowSpan.className = 'chat-quote-icon';
      arrowSpan.textContent = '↳ ';
      quoteBox.appendChild(arrowSpan);

      const nickSpan = document.createElement('strong');
      nickSpan.className = 'chat-quote-nick chat-quote-sender';
      nickSpan.textContent = `@${quotedNick}:`;
      quoteBox.appendChild(nickSpan);

      const space = document.createTextNode(' ');
      quoteBox.appendChild(space);

      const snippetSpan = document.createElement('span');
      snippetSpan.className = 'chat-quote-body';
      snippetSpan.textContent = quotedSnippet;
      quoteBox.appendChild(snippetSpan);

      quoteBox.addEventListener('click', () => this.#jumpToQuotedMessage(quotedNick, quotedSnippet));
      quoteBox.addEventListener('keydown', (e) => {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          this.#jumpToQuotedMessage(quotedNick, quotedSnippet);
        }
      });
      line.appendChild(quoteBox);

      const body = document.createElement('span');
      body.className = 'chat-body';
      this.#appendSanitizedContent(body, bodyText);
      line.appendChild(body);
      return line;
    }

    const body = document.createElement('span');
    body.className = 'chat-body';
    if (msg.action) {
      body.classList.add('chat-action');
      body.textContent = `${msg.from} ${stripAction(cleanRaw)}`;
    } else {
      this.#appendSanitizedContent(body, cleanRaw);
    }
    line.appendChild(body);
    return line;
  }

  #makeSystemLine(text, extraClass) {
    const line = document.createElement('div');
    line.className = `chat-line ${extraClass}`;
    const time = document.createElement('span');
    time.className = 'chat-time';
    time.textContent = this.#formatTime(Date.now());
    line.appendChild(time);

    const body = document.createElement('span');
    body.className = `chat-body ${extraClass}`;
    body.textContent = text;
    line.appendChild(body);
    return line;
  }

  #appendSanitizedContent(targetEl, rawText) {
    // Safe linkification regex
    const urlRegex = /(https?:\/\/[^\s<>"]+)/g;
    const parts = rawText.split(urlRegex);

    for (const part of parts) {
      if (!part) continue;
      if (/^https?:\/\//i.test(part)) {
        const link = document.createElement('a');
        link.href = part;
        link.textContent = part;
        link.className = 'chat-link';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        targetEl.appendChild(link);
      } else {
        targetEl.appendChild(document.createTextNode(part));
      }
    }
  }

  // --- Actions ---------------------------------------------------------------

  #startReply(msg) {
    const snippet = (msg.text || '').replace(/^>[^\n]+\n/, '').slice(0, 60).replace(/\n/g, ' ');
    const quoteHeader = `> @${msg.from}: ${snippet}\n`;
    this.focusInput(quoteHeader);
  }

  #copyText(text) {
    try {
      navigator.clipboard?.writeText?.(text);
    } catch {}
  }

  #jumpToQuotedMessage(nick, snippet) {
    const groups = this.log.querySelectorAll('.chat-group');
    for (const g of Array.from(groups).reverse()) {
      if (g.dataset.sender?.toLowerCase() === nick.toLowerCase()) {
        const text = g.textContent || '';
        if (text.includes(snippet.slice(0, 20))) {
          g.scrollIntoView({ behavior: 'smooth', block: 'center' });
          g.classList.add('chat-highlight');
          setTimeout(() => g.classList.remove('chat-highlight'), 1800);
          return;
        }
      }
    }
  }

  // --- Scroll & Unread Management --------------------------------------------

  #commitNode(node, isSelf, fromHistory = false) {
    // Prune old DOM elements
    while (this.log.childElementCount > MAX_LINES) {
      this.log.firstChild.remove();
    }

    if (fromHistory) return;

    const dist = this.log.scrollHeight - this.log.scrollTop - this.log.clientHeight;
    this.isScrolledUp = dist > 48;

    if (this.isScrolledUp && !isSelf) {
      this.#bumpScrolledUnread();
    } else {
      this.#scrollToBottom(isSelf);
    }

    if (this.collapsed) {
      this.#bumpUnread();
    }
  }

  #scrollToBottom(force = false) {
    const nearBottom = this.log.scrollHeight - this.log.scrollTop - this.log.clientHeight < 48;
    if (force || nearBottom) {
      this.log.scrollTop = this.log.scrollHeight;
    }
  }

  #bumpScrolledUnread() {
    this.scrolledUpUnread += 1;
    if (this.jumpPill && this.jumpCount) {
      this.jumpCount.textContent = String(this.scrolledUpUnread);
      this.jumpPill.hidden = false;
    }
  }

  #clearScrolledUnread() {
    this.scrolledUpUnread = 0;
    if (this.jumpPill) this.jumpPill.hidden = true;
  }

  #bumpUnread() {
    this.unread += 1;
    if (this.unreadBadge) {
      this.unreadBadge.hidden = false;
      this.unreadBadge.textContent = String(this.unread);
    }
  }

  #clearUnread() {
    this.unread = 0;
    if (this.unreadBadge) {
      this.unreadBadge.hidden = true;
      this.unreadBadge.textContent = '';
    }
  }

  #formatTime(ts) {
    const d = ts ? new Date(ts) : new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  #getOnlineNicknames() {
    const nicks = new Set();
    if (this.net?.nickname) nicks.add(this.net.nickname);
    // Grab recent senders from DOM log
    const groups = this.log.querySelectorAll('.chat-group');
    groups.forEach(g => {
      const s = g.dataset.sender;
      if (s) nicks.add(s);
    });
    return Array.from(nicks);
  }

  #pruneOldPresence(now) {
    if (this.recentPresence.size <= 200) return;
    for (const [k, v] of this.recentPresence) {
      if (now - v.ts > PRESENCE_CLEANUP_INTERVAL_MS) this.recentPresence.delete(k);
    }
  }

  // --- Resizing --------------------------------------------------------------

  #initResize() {
    if (!this.handle) return;
    this.sizeMedia = window.matchMedia('(max-width: 900px)');
    this.#applySavedSize();
    this.sizeMedia.addEventListener('change', () => this.#applySavedSize());
    window.addEventListener('resize', () => this.#applySavedSize());

    let drag = null;
    const onDragMove = (e) => {
      if (!drag) return;
      e.preventDefault();
      const w = clampSize(drag.w - (e.clientX - drag.x), SIZE_MIN_W, this.#maxWidth());
      const h = clampSize(drag.h - (e.clientY - drag.y), SIZE_MIN_H, this.#maxHeight());
      this.#setSize(w, h);
    };
    const endDrag = () => {
      if (!drag) return;
      drag = null;
      window.removeEventListener('pointermove', onDragMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
      this.#saveSize(this.#currentSize());
    };
    this.handle.addEventListener('pointerdown', (e) => {
      if (this.sizeMedia.matches || this.collapsed) return;
      e.preventDefault();
      drag = {
        x: e.clientX,
        y: e.clientY,
        w: this.panel.getBoundingClientRect().width,
        h: this.log.getBoundingClientRect().height,
      };
      try { this.handle.setPointerCapture(e.pointerId); } catch {}
      window.addEventListener('pointermove', onDragMove);
      window.addEventListener('pointerup', endDrag);
      window.addEventListener('pointercancel', endDrag);
    });
    this.handle.addEventListener('dblclick', () => this.#clearSize());

    this.handle.addEventListener('keydown', (e) => {
      if (this.sizeMedia.matches || this.collapsed) return;
      const step = e.shiftKey ? 8 : 28;
      const size = this.#currentSize();
      let w = size.w;
      let h = size.h;
      if (e.code === 'ArrowLeft') w += step;
      else if (e.code === 'ArrowRight') w -= step;
      else if (e.code === 'ArrowUp') h += step;
      else if (e.code === 'ArrowDown') h -= step;
      else return;
      e.preventDefault();
      this.#setSize(clampSize(w, SIZE_MIN_W, this.#maxWidth()), clampSize(h, SIZE_MIN_H, this.#maxHeight()));
      this.#saveSize(this.#currentSize());
    });
  }

  #maxWidth() {
    return Math.min(SIZE_MAX_W, window.innerWidth - 380);
  }

  #maxHeight() {
    return Math.min(SIZE_MAX_H, window.innerHeight - 260);
  }

  #setSize(w, h) {
    this.panel.style.width = `${Math.round(w)}px`;
    this.log.style.height = `${Math.round(h)}px`;
  }

  #currentSize() {
    return {
      w: this.panel.getBoundingClientRect().width,
      h: this.log.getBoundingClientRect().height,
    };
  }

  #applySavedSize() {
    const saved = this.#loadSize();
    if (this.sizeMedia.matches || !saved) {
      this.panel.style.width = '';
      this.log.style.height = '';
      return;
    }
    this.#setSize(
      clampSize(saved.w, SIZE_MIN_W, this.#maxWidth()),
      clampSize(saved.h, SIZE_MIN_H, this.#maxHeight()),
    );
  }

  #loadSize() {
    try {
      const raw = localStorage.getItem(SIZE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Number.isFinite(parsed.w) || !Number.isFinite(parsed.h)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  #saveSize(size) {
    try {
      localStorage.setItem(SIZE_KEY, JSON.stringify({ w: Math.round(size.w), h: Math.round(size.h) }));
    } catch {}
  }

  #clearSize() {
    try { localStorage.removeItem(SIZE_KEY); } catch {}
    this.panel.style.width = '';
    this.log.style.height = '';
  }
}
