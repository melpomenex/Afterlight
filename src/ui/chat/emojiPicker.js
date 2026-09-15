/**
 * Accessible, keyboard-navigable native Unicode Emoji Picker.
 *
 * Provides:
 * - Category tabs (Recent, Smileys, People, Nature, Food, Travel, Activities, Objects, Symbols)
 * - Real-time keyword & shortcode search
 * - Keyboard grid navigation with Arrow keys, Enter, and Escape
 * - Live preview bar showing shortcode and description
 * - LocalStorage persistence for recently used emoji
 */

import {
  EMOJI_CATEGORIES,
  EMOJI_LIST,
  EMOJI_BY_CATEGORY,
  searchEmoji,
} from './emojiData.js';

const RECENT_KEY = 'afterlight-chat-recent-emoji';
const MAX_RECENTS = 16;
const GRID_COLUMNS = 8;

export class EmojiPicker {
  constructor({ onSelect = null, onClose = null } = {}) {
    this.onSelect = onSelect;
    this.onClose = onClose;
    this.activeCategory = 'smileys';
    this.recents = this.#loadRecents();
    this.isOpen = false;
    this.focusedIndex = -1;
    this.currentList = [];

    this.root = document.createElement('div');
    this.root.className = 'chat-emoji-picker';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', 'Emoji Picker');
    this.root.hidden = true;

    this.#buildDOM();
    this.#bindEvents();
  }

  // --- Public API -----------------------------------------------------------

  open(anchorEl = null) {
    this.isOpen = true;
    this.root.hidden = false;
    this.recents = this.#loadRecents();
    this.searchInput.value = '';
    this.activeCategory = this.recents.length > 0 ? 'recent' : 'smileys';
    this.#renderContent();
    this.searchInput.focus();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.root.hidden = true;
    this.focusedIndex = -1;
    this.onClose?.();
  }

  toggle(anchorEl = null) {
    if (this.isOpen) this.close();
    else this.open(anchorEl);
  }

  recordRecent(emojiObj) {
    if (!emojiObj?.emoji) return;
    this.recents = [emojiObj, ...this.recents.filter(e => e.emoji !== emojiObj.emoji)].slice(0, MAX_RECENTS);
    this.#saveRecents(this.recents);
  }

  // --- DOM Construction -----------------------------------------------------

  #buildDOM() {
    // Header with search input
    const header = document.createElement('div');
    header.className = 'chat-emoji-header';

    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.className = 'chat-emoji-search';
    this.searchInput.placeholder = 'Search emoji…';
    this.searchInput.setAttribute('aria-label', 'Search emoji');
    header.appendChild(this.searchInput);

    // Categories tabs
    this.tabsBar = document.createElement('div');
    this.tabsBar.className = 'chat-emoji-tabs';
    this.tabsBar.setAttribute('role', 'tablist');
    this.tabsBar.setAttribute('aria-label', 'Emoji categories');

    for (const cat of EMOJI_CATEGORIES) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chat-emoji-tab';
      btn.dataset.category = cat.id;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-label', cat.label);
      btn.setAttribute('title', cat.label);
      btn.textContent = cat.icon;
      this.tabsBar.appendChild(btn);
    }
    header.appendChild(this.tabsBar);
    this.root.appendChild(header);

    // Scrollable content body
    this.body = document.createElement('div');
    this.body.className = 'chat-emoji-body';
    this.body.setAttribute('role', 'region');
    this.body.setAttribute('aria-label', 'Emoji list');
    this.root.appendChild(this.body);

    // Footer preview bar
    this.footer = document.createElement('div');
    this.footer.className = 'chat-emoji-footer';
    this.footerPreview = document.createElement('span');
    this.footerPreview.className = 'chat-emoji-preview-text';
    this.footerPreview.textContent = 'Select an emoji';
    this.footer.appendChild(this.footerPreview);
    this.root.appendChild(this.footer);
  }

  #bindEvents() {
    // Search filter
    this.searchInput.addEventListener('input', () => {
      this.focusedIndex = -1;
      this.#renderContent();
    });

    // Category tabs click
    this.tabsBar.addEventListener('click', (e) => {
      const tab = e.target.closest('.chat-emoji-tab');
      if (!tab) return;
      this.searchInput.value = '';
      this.activeCategory = tab.dataset.category;
      this.focusedIndex = -1;
      this.#renderContent();
    });

    // Keyboard handlers
    this.root.addEventListener('keydown', (e) => {
      e.stopPropagation(); // keep keys from bleeding into game controls
      if (e.code === 'Escape') {
        e.preventDefault();
        this.close();
        return;
      }

      if (e.target === this.searchInput) {
        if (e.code === 'ArrowDown') {
          e.preventDefault();
          this.#focusGridIndex(0);
        }
        return;
      }

      // Grid navigation
      if (this.currentList.length === 0) return;
      let nextIndex = this.focusedIndex;

      if (e.code === 'ArrowRight') nextIndex += 1;
      else if (e.code === 'ArrowLeft') nextIndex -= 1;
      else if (e.code === 'ArrowDown') nextIndex += GRID_COLUMNS;
      else if (e.code === 'ArrowUp') {
        if (nextIndex < GRID_COLUMNS) {
          e.preventDefault();
          this.searchInput.focus();
          return;
        }
        nextIndex -= GRID_COLUMNS;
      } else if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        if (this.focusedIndex >= 0 && this.focusedIndex < this.currentList.length) {
          this.#selectItem(this.currentList[this.focusedIndex]);
        }
        return;
      } else {
        return;
      }

      e.preventDefault();
      if (nextIndex >= 0 && nextIndex < this.currentList.length) {
        this.#focusGridIndex(nextIndex);
      }
    });

    // Delegate hover for preview
    this.body.addEventListener('pointerover', (e) => {
      const btn = e.target.closest('.chat-emoji-item');
      if (!btn) return;
      const idx = Number(btn.dataset.index);
      const item = this.currentList[idx];
      if (item) this.#updatePreview(item);
    });

    // Delegate click to select
    this.body.addEventListener('click', (e) => {
      const btn = e.target.closest('.chat-emoji-item');
      if (!btn) return;
      const idx = Number(btn.dataset.index);
      const item = this.currentList[idx];
      if (item) this.#selectItem(item);
    });
  }

  // --- Rendering ------------------------------------------------------------

  #renderContent() {
    this.body.textContent = '';
    const query = this.searchInput.value.trim();

    // Update active tab styling
    const tabs = this.tabsBar.querySelectorAll('.chat-emoji-tab');
    tabs.forEach(t => {
      const isActive = !query && t.dataset.category === this.activeCategory;
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-selected', String(isActive));
    });

    if (query) {
      this.currentList = searchEmoji(query, 64);
      const section = this.#createSection('Search Results', this.currentList);
      this.body.appendChild(section);
      if (this.currentList.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'chat-emoji-empty';
        empty.textContent = 'No emoji found';
        this.body.appendChild(empty);
      }
      return;
    }

    if (this.activeCategory === 'recent') {
      this.currentList = this.recents;
      if (this.currentList.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'chat-emoji-empty';
        empty.textContent = 'No recent emoji yet';
        this.body.appendChild(empty);
      } else {
        this.body.appendChild(this.#createSection('Recently Used', this.currentList));
      }
      return;
    }

    const items = EMOJI_BY_CATEGORY.get(this.activeCategory) || [];
    this.currentList = items;
    const catMeta = EMOJI_CATEGORIES.find(c => c.id === this.activeCategory);
    this.body.appendChild(this.#createSection(catMeta?.label || 'Emoji', this.currentList));
  }

  #createSection(title, items) {
    const wrap = document.createElement('div');
    wrap.className = 'chat-emoji-section';

    const header = document.createElement('div');
    header.className = 'chat-emoji-section-title';
    header.textContent = title;
    wrap.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'chat-emoji-grid';
    grid.setAttribute('role', 'grid');

    items.forEach((item, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chat-emoji-item';
      btn.dataset.index = String(idx);
      btn.setAttribute('role', 'gridcell');
      btn.setAttribute('aria-label', `${item.name} (:${item.shortcode}:)`);
      btn.setAttribute('title', `:${item.shortcode}:`);
      btn.textContent = item.emoji;
      grid.appendChild(btn);
    });

    wrap.appendChild(grid);
    return wrap;
  }

  #focusGridIndex(idx) {
    this.focusedIndex = idx;
    const items = this.body.querySelectorAll('.chat-emoji-item');
    items.forEach((el, i) => {
      if (i === idx) {
        el.classList.add('focused');
        el.focus();
        this.#updatePreview(this.currentList[idx]);
        el.scrollIntoView?.({ block: 'nearest' });
      } else {
        el.classList.remove('focused');
      }
    });
  }

  #updatePreview(item) {
    if (!item) return;
    this.footerPreview.textContent = `${item.emoji} :${item.shortcode}: · ${item.name}`;
  }

  #selectItem(item) {
    this.recordRecent(item);
    this.onSelect?.(item);
    this.close();
  }

  // --- Persistence ----------------------------------------------------------

  #loadRecents() {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.slice(0, MAX_RECENTS);
    } catch {
      return [];
    }
  }

  #saveRecents(recents) {
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(recents.slice(0, MAX_RECENTS)));
    } catch {}
  }
}
