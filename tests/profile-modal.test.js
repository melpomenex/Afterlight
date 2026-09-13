import test from 'node:test';
import assert from 'node:assert/strict';
import { UIManager } from '../src/ui/profileModal.js';
import { AVATAR_DEFINITIONS, getAvatarDefinition } from '../shared/avatarDefinitions.js';

function setupFakeDOM() {
  const elementsById = new Map();

  function createMockElement(tag) {
    let _innerHTML = '';
    const classSet = new Set();
    const attributes = new Map();

    const el = {
      tagName: tag.toUpperCase(),
      id: '',
      style: {},
      value: '',
      textContent: '',
      dataset: {},
      children: [],
      onclick: null,
      oninput: null,
      onkeydown: null,
      showModal() { this.open = true; },
      close() { this.open = false; },
      setAttribute(k, v) { attributes.set(k, String(v)); },
      getAttribute(k) { return attributes.get(k) ?? null; },
      classList: {
        add(...cls) { cls.forEach(c => classSet.add(c)); },
        remove(...cls) { cls.forEach(c => classSet.delete(c)); },
        toggle(c, force) {
          if (force === undefined) {
            if (classSet.has(c)) classSet.delete(c); else classSet.add(c);
          } else if (force) classSet.add(c); else classSet.delete(c);
        },
        contains(c) { return classSet.has(c); }
      },
      closest(sel) {
        if (sel.startsWith('.')) {
          const className = sel.slice(1);
          if (classSet.has(className)) return el;
        }
        return null;
      },
      querySelectorAll(sel) {
        const res = [];
        function walk(node) {
          for (const ch of node.children) {
            if (sel.startsWith('.') && ch.classList.contains(sel.slice(1))) {
              res.push(ch);
            }
            walk(ch);
          }
        }
        walk(el);
        return res;
      },
      querySelector(sel) {
        return el.querySelectorAll(sel)[0] || null;
      }
    };

    Object.defineProperty(el, 'className', {
      get() { return [...classSet].join(' '); },
      set(v) {
        classSet.clear();
        if (v) v.trim().split(/\s+/).forEach(c => classSet.add(c));
      }
    });

    Object.defineProperty(el, 'innerHTML', {
      get() { return _innerHTML; },
      set(html) {
        _innerHTML = html;
        el.children = [];
        if (!html) return;
        // Parse elements with id
        const idMatches = [...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
        for (const id of idMatches) {
          if (!elementsById.has(id)) {
            const child = createMockElement('div');
            child.id = id;
            elementsById.set(id, child);
            el.children.push(child);
          }
        }
        // Parse avatar cards
        const cardMatches = [...html.matchAll(/class="([^"]*avatar-card[^"]*)"[^>]*data-avatar-id="([^"]+)"/g)];
        for (const m of cardMatches) {
          const cardEl = createMockElement('div');
          cardEl.className = m[1];
          cardEl.dataset.avatarId = m[2];
          cardEl.setAttribute('aria-checked', m[1].includes('selected') ? 'true' : 'false');
          el.children.push(cardEl);
        }
        // Parse filter chips
        const chipMatches = [...html.matchAll(/class="([^"]*avatar-filter-chip[^"]*)"[^>]*data-filter="([^"]+)"/g)];
        for (const m of chipMatches) {
          const chipEl = createMockElement('button');
          chipEl.className = m[1];
          chipEl.dataset.filter = m[2];
          el.children.push(chipEl);
        }
      }
    });

    return el;
  }

  global.document = {
    createElement(tag) {
      return createMockElement(tag);
    },
    body: {
      append(el) {
        if (el.id) elementsById.set(el.id, el);
      }
    },
    getElementById(id) {
      return elementsById.get(id) || null;
    }
  };

  return elementsById;
}

test('UIManager renders assigned avatar in Visitor Pass dialog', () => {
  const elements = setupFakeDOM();
  const mockClient = { nickname: 'GoldBot', setNickname() {} };

  const ui = new UIManager(mockClient);

  // Initial state / updatePlayerHUD with assigned avatar
  ui.updatePlayerHUD({
    id: 'p1',
    nickname: 'GoldBot',
    role: 'member',
    avatar: 'black-hole'
  });

  const avatarEl = elements.get('profile-avatar-name');
  assert.ok(avatarEl, 'profile-avatar-name element should exist');
  assert.equal(avatarEl.textContent, 'Black Hole');

  const summaryEl = elements.get('profile-player-summary');
  assert.equal(summaryEl.textContent, 'GoldBot');
});

test('UIManager falls back gracefully when avatar is unknown or absent', () => {
  const elements = setupFakeDOM();
  const mockClient = { nickname: 'RustBot', setNickname() {} };

  const ui = new UIManager(mockClient);

  // Update with no avatar
  ui.updatePlayerHUD({
    id: 'p2',
    nickname: 'RustBot',
    role: 'guest',
    avatar: null
  });

  const avatarEl = elements.get('profile-avatar-name');
  assert.equal(avatarEl.textContent, 'Visitor');

  // Update with unknown avatar id
  ui.updatePlayerHUD({
    id: 'p2',
    nickname: 'RustBot',
    role: 'guest',
    avatar: 'unregistered-avatar-xyz'
  });
  assert.equal(avatarEl.textContent, 'unregistered-avatar-xyz');
});

test('UIManager renders all 24 avatar cards in the picker grid', () => {
  const elements = setupFakeDOM();
  const mockClient = { nickname: 'Bot', setNickname() {}, setAvatar() {} };

  const ui = new UIManager(mockClient);
  const grid = elements.get('avatar-picker-grid');
  assert.ok(grid, 'grid element should exist');

  const cards = grid.querySelectorAll('.avatar-card');
  assert.equal(cards.length, 24, 'should render all 24 authored avatars');
  assert.equal(AVATAR_DEFINITIONS.length, 24);
});

test('UIManager filters avatar cards by rig category', () => {
  const elements = setupFakeDOM();
  const mockClient = { nickname: 'Bot', setNickname() {}, setAvatar() {} };

  const ui = new UIManager(mockClient);
  const grid = elements.get('avatar-picker-grid');

  // Filter to humanoid-heavy
  ui.currentFilter = 'humanoid-heavy';
  ui.renderGrid();
  let cards = grid.querySelectorAll('.avatar-card');
  const heavyCount = AVATAR_DEFINITIONS.filter(d => d.rig === 'humanoid-heavy').length;
  assert.equal(cards.length, heavyCount);
  assert.ok(cards.length > 0);

  // Filter to floating
  ui.currentFilter = 'floating';
  ui.renderGrid();
  cards = grid.querySelectorAll('.avatar-card');
  const floatingCount = AVATAR_DEFINITIONS.filter(d => d.rig === 'floating').length;
  assert.equal(cards.length, floatingCount);
  assert.ok(cards.length > 0);

  // Filter back to all
  ui.currentFilter = 'all';
  ui.renderGrid();
  cards = grid.querySelectorAll('.avatar-card');
  assert.equal(cards.length, 24);
});

test('UIManager filters avatar cards by search query', () => {
  const elements = setupFakeDOM();
  const mockClient = { nickname: 'Bot', setNickname() {}, setAvatar() {} };

  const ui = new UIManager(mockClient);
  const grid = elements.get('avatar-picker-grid');

  // Search by exact name snippet
  ui.searchQuery = 'skeleton';
  ui.renderGrid();
  let cards = grid.querySelectorAll('.avatar-card');
  assert.equal(cards.length, 1);
  assert.equal(cards[0].dataset.avatarId, 'skeleton-tourist');

  // Search by tag
  ui.searchQuery = 'celestial';
  ui.renderGrid();
  cards = grid.querySelectorAll('.avatar-card');
  assert.ok(cards.length >= 1);
  assert.ok(cards.some(c => c.dataset.avatarId === 'moon-head'));

  // Search matching nothing
  ui.searchQuery = 'nonexistent-query-xyz';
  ui.renderGrid();
  cards = grid.querySelectorAll('.avatar-card');
  assert.equal(cards.length, 0);
  assert.ok(grid.innerHTML.includes('No avatars match'));
});

test('UIManager selecting an avatar dispatches setAvatar and onAvatarChange', () => {
  const elements = setupFakeDOM();
  let networkSentAvatar = null;
  let callbackAvatar = null;

  const mockClient = {
    nickname: 'PickerBot',
    setNickname() {},
    setAvatar(id) { networkSentAvatar = id; }
  };

  const ui = new UIManager(mockClient, {
    onAvatarChange(id) { callbackAvatar = id; }
  });

  ui.selectAvatar('neon-jellyfish');

  assert.equal(ui.selectedAvatar, 'neon-jellyfish');
  assert.equal(networkSentAvatar, 'neon-jellyfish', 'client.setAvatar should have been called');
  assert.equal(callbackAvatar, 'neon-jellyfish', 'onAvatarChange callback should have been invoked');

  const avatarNameEl = elements.get('profile-avatar-name');
  assert.equal(avatarNameEl.textContent, 'Neon Jellyfish');

  const grid = elements.get('avatar-picker-grid');
  const selectedCards = grid.querySelectorAll('.avatar-card').filter(c => c.classList.contains('selected'));
  assert.equal(selectedCards.length, 1);
  assert.equal(selectedCards[0].dataset.avatarId, 'neon-jellyfish');
});
