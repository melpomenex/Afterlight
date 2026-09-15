import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EMOJI_CATEGORIES,
  EMOJI_LIST,
  EMOJI_BY_CATEGORY,
  searchEmoji,
  findEmojiByShortcode,
} from '../src/ui/chat/emojiData.js';
import { EmojiPicker } from '../src/ui/chat/emojiPicker.js';

test('emojiData: categories are well-formed and non-empty', () => {
  assert.ok(EMOJI_CATEGORIES.length >= 8);
  for (const cat of EMOJI_CATEGORIES) {
    assert.ok(cat.id, 'category has id');
    assert.ok(cat.label, 'category has label');
    assert.ok(cat.icon, 'category has icon');
    if (cat.id !== 'recent') {
      const items = EMOJI_BY_CATEGORY.get(cat.id);
      assert.ok(items && items.length > 0, `category ${cat.id} has items`);
    }
  }
});

test('emojiData: searchEmoji finds matches by shortcode and keyword', () => {
  const waveResults = searchEmoji('wave');
  assert.ok(waveResults.length > 0);
  assert.equal(waveResults[0].emoji, '👋');
  assert.equal(waveResults[0].shortcode, 'wave');

  const heartResults = searchEmoji('heart');
  assert.ok(heartResults.length > 0);
  assert.ok(heartResults.some(e => e.emoji === '❤️'));

  const prefixResults = searchEmoji(':fir');
  assert.ok(prefixResults.some(e => e.shortcode === 'fire'));

  const emptyResults = searchEmoji('');
  assert.equal(emptyResults.length, 24);
});

test('emojiData: findEmojiByShortcode resolves with or without colons', () => {
  const direct = findEmojiByShortcode('robot');
  assert.ok(direct);
  assert.equal(direct.emoji, '🤖');

  const colonWrapped = findEmojiByShortcode(':robot:');
  assert.ok(colonWrapped);
  assert.equal(colonWrapped.emoji, '🤖');

  const unknown = findEmojiByShortcode('nonexistent_symbol_xyz');
  assert.equal(unknown, null);
});

function makeMockDOM() {
  function makeElement(tag, id = '') {
    const children = [];
    const classes = new Set();
    const eventListeners = new Map();
    const dataset = {};
    const attributes = new Map();
    let text = '';

    const classList = {
      add(cls) {
        for (const c of (cls || '').split(/\s+/).filter(Boolean)) classes.add(c);
      },
      remove(cls) { classes.delete(cls); },
      toggle(cls, val) {
        if (val === undefined) {
          if (classes.has(cls)) classes.delete(cls);
          else classes.add(cls);
        } else if (val) {
          classes.add(cls);
        } else {
          classes.delete(cls);
        }
      },
      contains(cls) { return classes.has(cls); },
    };

    const el = {
      tagName: tag.toUpperCase(),
      id,
      style: {},
      value: '',
      placeholder: '',
      disabled: false,
      hidden: false,
      dataset,
      classList,
      get className() {
        return Array.from(classes).join(' ');
      },
      set className(val) {
        classes.clear();
        for (const c of (val || '').split(/\s+/).filter(Boolean)) classes.add(c);
      },
      get textContent() {
        return text;
      },
      set textContent(val) {
        text = String(val || '');
        if (!text) children.length = 0;
      },
      get children() {
        return children;
      },
      get childElementCount() {
        return children.length;
      },
      addEventListener(event, fn) {
        if (!eventListeners.has(event)) eventListeners.set(event, []);
        eventListeners.get(event).push(fn);
      },
      removeEventListener(event, fn) {
        const list = eventListeners.get(event) || [];
        const idx = list.indexOf(fn);
        if (idx >= 0) list.splice(idx, 1);
      },
      dispatchEvent(evt) {
        const list = eventListeners.get(evt.type) || [];
        for (const fn of list) fn(evt);
      },
      setAttribute(name, val) { attributes.set(name, String(val)); },
      getAttribute(name) { return attributes.get(name) ?? null; },
      appendChild(child) {
        children.push(child);
        child.parentElement = el;
        return child;
      },
      querySelectorAll(selector) {
        const results = [];
        function walk(node) {
          for (const c of node.children) {
            if (selector.startsWith('.') && c.classList.contains(selector.slice(1))) {
              results.push(c);
            } else if (selector.startsWith('#') && c.id === selector.slice(1)) {
              results.push(c);
            } else if (c.tagName.toLowerCase() === selector.toLowerCase()) {
              results.push(c);
            } else if (selector.startsWith("[") && selector.endsWith("]")) {
              const [attr, val] = selector.slice(1, -1).split("=");
              const cleanVal = val ? val.replace(/['"]/g, "") : "";
              if (attr.startsWith("data-")) {
                const key = attr.slice(5);
                if (val ? c.dataset[key] === cleanVal : key in c.dataset) results.push(c);
              }
            }
            walk(c);
          }
        }
        walk(el);
        return results;
      },
      querySelector(selector) {
        return this.querySelectorAll(selector)[0] || null;
      },
      closest(selector) {
        let cur = this;
        while (cur) {
          if (selector.startsWith('.') && cur.classList?.contains(selector.slice(1))) return cur;
          cur = cur.parentElement;
        }
        return null;
      },
      focus() {},
      blur() {},
    };
    return el;
  }

  const doc = {
    createElement(tag) {
      return makeElement(tag);
    },
  };

  return { doc };
}

function withMockDOM(fn) {
  const prevDoc = globalThis.document;
  const prevStorage = globalThis.localStorage;
  const storage = new Map();
  globalThis.localStorage = {
    getItem: (k) => storage.get(k) || null,
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
  };
  const { doc } = makeMockDOM();
  globalThis.document = doc;
  try {
    return fn();
  } finally {
    globalThis.document = prevDoc;
    globalThis.localStorage = prevStorage;
  }
}

test('EmojiPicker: opens, searches, and selects an emoji', () => {
  withMockDOM(() => {
    let selected = null;
    let closed = false;
    const picker = new EmojiPicker({
      onSelect: (e) => { selected = e; },
      onClose: () => { closed = true; },
    });

    assert.equal(picker.isOpen, false);
    assert.equal(picker.root.hidden, true);

    picker.open();
    assert.equal(picker.isOpen, true);
    assert.equal(picker.root.hidden, false);

    // Filter by query "wave"
    picker.searchInput.value = 'wave';
    picker.searchInput.dispatchEvent({ type: 'input' });

    assert.equal(picker.currentList.length, 1);
    assert.equal(picker.currentList[0].emoji, '👋');

    // Simulate clicking the first item
    const items = picker.body.querySelectorAll('.chat-emoji-item');
    assert.equal(items.length, 1);
    picker.body.dispatchEvent({
      type: 'click',
      target: items[0],
    });

    assert.ok(selected, 'selection callback called');
    assert.equal(selected.emoji, '👋');
    assert.equal(picker.isOpen, false, 'closes after selection');
    assert.equal(closed, true, 'onClose called');
  });
});

test('EmojiPicker: categories and keyboard navigation', () => {
  withMockDOM(() => {
    const picker = new EmojiPicker();
    picker.open();

    // Default active category
    assert.ok(picker.currentList.length > 0);

    // Switch tab to activity
    const activityTab = picker.tabsBar.querySelector('[data-category="activity"]');
    assert.ok(activityTab);
    picker.tabsBar.dispatchEvent({
      type: 'click',
      target: activityTab,
    });

    assert.equal(picker.activeCategory, 'activity');
    assert.ok(picker.currentList.some(e => e.shortcode === 'video_game'));

    // Escape closes
    picker.root.dispatchEvent({
      type: 'keydown',
      code: 'Escape',
      stopPropagation() {},
      preventDefault() {},
    });
    assert.equal(picker.isOpen, false);
  });
});
