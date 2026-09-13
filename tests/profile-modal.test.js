import test from 'node:test';
import assert from 'node:assert/strict';
import { UIManager } from '../src/ui/profileModal.js';
import { getAvatarDefinition } from '../shared/avatarDefinitions.js';

function setupFakeDOM() {
  const elements = new Map();

  global.document = {
    createElement(tag) {
      const el = {
        tagName: tag.toUpperCase(),
        id: '',
        className: '',
        innerHTML: '',
        style: {},
        value: '',
        textContent: '',
        children: [],
        showModal() { this.open = true; },
        close() { this.open = false; },
        onclick: null,
      };
      return el;
    },
    body: {
      append(el) {
        if (el.id) elements.set(el.id, el);
        // Also parse innerHTML IDs for our simple test
        if (el.innerHTML) {
          const ids = [...el.innerHTML.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
          for (const id of ids) {
            if (!elements.has(id)) {
              elements.set(id, { id, textContent: '', value: '', style: {}, onclick: null });
            }
          }
        }
      }
    },
    getElementById(id) {
      return elements.get(id) || null;
    }
  };

  return elements;
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
