/**
 * Contextual Autocomplete for Chat Composer.
 *
 * Supports:
 * - Emoji shortcode completions on `:shortcode` (e.g. `:wave`, `:heart`)
 * - Player mention completions on `@nickname`
 * - Keyboard navigation (ArrowUp/Down, Enter/Tab to select, Escape to dismiss)
 * - Safe cursor replacement that preserves pre- and post-text
 */

import { searchEmoji } from './emojiData.js';

export class ChatAutocomplete {
  constructor({ input, getOnlinePlayers = () => [], onSelect = null } = {}) {
    this.input = input;
    this.getOnlinePlayers = getOnlinePlayers;
    this.onSelect = onSelect;

    this.isOpen = false;
    this.activeTrigger = null; // { type: 'emoji' | 'mention', query, start, end }
    this.items = [];
    this.selectedIndex = 0;

    this.root = document.createElement('div');
    this.root.className = 'chat-autocomplete-popover';
    this.root.setAttribute('role', 'listbox');
    this.root.setAttribute('aria-label', 'Chat autocomplete suggestions');
    this.root.hidden = true;

    this.#bindEvents();
  }

  // --- Public API -----------------------------------------------------------

  update() {
    if (!this.input) return;
    const pos = this.input.selectionStart ?? this.input.value.length;
    const text = this.input.value.slice(0, pos);

    const trigger = this.#detectTrigger(text, pos);
    if (!trigger) {
      this.close();
      return;
    }

    this.activeTrigger = trigger;
    if (trigger.type === 'emoji') {
      const matches = searchEmoji(trigger.query, 6);
      this.items = matches.map(m => ({
        type: 'emoji',
        label: `:${m.shortcode}:`,
        value: m.emoji,
        preview: m.emoji,
        subtext: m.name,
      }));
    } else if (trigger.type === 'mention') {
      const players = this.getOnlinePlayers();
      const q = trigger.query.toLowerCase();
      const matches = players
        .filter(p => typeof p === 'string' && p.toLowerCase().startsWith(q) && p.toLowerCase() !== q)
        .slice(0, 6);
      this.items = matches.map(name => ({
        type: 'mention',
        label: `@${name}`,
        value: `@${name} `,
        preview: '👤',
        subtext: 'Player',
      }));
    }

    if (this.items.length === 0) {
      this.close();
      return;
    }

    this.selectedIndex = 0;
    this.isOpen = true;
    this.root.hidden = false;
    this.#render();
  }

  close() {
    if (!this.isOpen && this.root.hidden) return;
    this.isOpen = false;
    this.root.hidden = true;
    this.activeTrigger = null;
    this.items = [];
    this.selectedIndex = 0;
  }

  handleKeyDown(e) {
    if (!this.isOpen || this.items.length === 0) return false;

    if (e.code === 'ArrowDown') {
      e.preventDefault();
      this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
      this.#render();
      return true;
    }

    if (e.code === 'ArrowUp') {
      e.preventDefault();
      this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % this.items.length;
      this.#render();
      return true;
    }

    if (e.code === 'Enter' || e.code === 'Tab') {
      e.preventDefault();
      this.#applySelection(this.items[this.selectedIndex]);
      return true;
    }

    if (e.code === 'Escape') {
      e.preventDefault();
      this.close();
      return true;
    }

    return false;
  }

  // --- Internals -------------------------------------------------------------

  #detectTrigger(textBeforeCursor, cursorPos) {
    // Check for emoji trigger :shortcode (at least 2 chars after colon)
    const emojiMatch = textBeforeCursor.match(/(?:^|\s):([a-zA-Z0-9_-]{2,})$/);
    if (emojiMatch) {
      const query = emojiMatch[1];
      const matchIndex = textBeforeCursor.length - query.length - 1;
      return {
        type: 'emoji',
        query,
        start: matchIndex,
        end: cursorPos,
      };
    }

    // Check for mention trigger @nickname (at least 1 char after @)
    const mentionMatch = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_-]+)$/);
    if (mentionMatch) {
      const query = mentionMatch[1];
      const matchIndex = textBeforeCursor.length - query.length - 1;
      return {
        type: 'mention',
        query,
        start: matchIndex,
        end: cursorPos,
      };
    }

    return null;
  }

  #applySelection(item) {
    if (!item || !this.activeTrigger) return;
    const { start, end } = this.activeTrigger;
    const fullText = this.input.value;

    const before = fullText.slice(0, start);
    const after = fullText.slice(end);
    const replacement = item.value;

    this.input.value = before + replacement + after;
    const newCursor = start + replacement.length;
    this.input.setSelectionRange?.(newCursor, newCursor);

    this.onSelect?.(item);
    this.close();
  }

  #render() {
    this.root.textContent = '';
    this.items.forEach((item, idx) => {
      const el = document.createElement('div');
      el.className = 'chat-autocomplete-item';
      if (idx === this.selectedIndex) el.classList.add('selected');
      el.setAttribute('role', 'option');
      el.setAttribute('aria-selected', String(idx === this.selectedIndex));
      el.dataset.index = String(idx);

      const preview = document.createElement('span');
      preview.className = 'chat-autocomplete-preview';
      preview.textContent = item.preview;
      el.appendChild(preview);

      const label = document.createElement('span');
      label.className = 'chat-autocomplete-label';
      label.textContent = item.label;
      el.appendChild(label);

      if (item.subtext) {
        const sub = document.createElement('span');
        sub.className = 'chat-autocomplete-sub';
        sub.textContent = item.subtext;
        el.appendChild(sub);
      }

      this.root.appendChild(el);
    });
  }

  #bindEvents() {
    this.root.addEventListener('pointerover', (e) => {
      const itemEl = e.target.closest('.chat-autocomplete-item');
      if (!itemEl) return;
      const idx = Number(itemEl.dataset.index);
      if (Number.isFinite(idx) && idx >= 0 && idx < this.items.length) {
        this.selectedIndex = idx;
        this.#render();
      }
    });

    this.root.addEventListener('pointerdown', (e) => {
      e.preventDefault(); // keep input focus
      const itemEl = e.target.closest('.chat-autocomplete-item');
      if (!itemEl) return;
      const idx = Number(itemEl.dataset.index);
      if (Number.isFinite(idx) && idx >= 0 && idx < this.items.length) {
        this.#applySelection(this.items[idx]);
      }
    });
  }
}
