import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ChatPreferencesManager,
  DEFAULT_CHAT_PREFERENCES,
  PRESET_DEFINITIONS,
  WORLD_THEME_TOKENS,
} from '../src/ui/chat/chatPreferences.js';

function makeMockStorage() {
  const map = new Map();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

function makeMockElement() {
  const classes = new Set();
  const styles = new Map();
  return {
    style: {
      setProperty: (k, v) => styles.set(k, String(v)),
      getProperty: (k) => styles.get(k) ?? '',
    },
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      toggle: (c, v) => (v ? classes.add(c) : classes.delete(c)),
      contains: (c) => classes.has(c),
    },
    styles,
    classes,
  };
}

test('ChatPreferencesManager: initializes with default preferences', () => {
  const storage = makeMockStorage();
  const mgr = new ChatPreferencesManager(storage);
  const prefs = mgr.getPreferences();

  assert.equal(prefs.preset, 'afterlight');
  assert.equal(prefs.layout, 'comfortable');
  assert.equal(prefs.density, 'default');
  assert.equal(prefs.fontSize, 'normal');
  assert.equal(prefs.background, 'translucent');
});

test('ChatPreferencesManager: applies presets and notifies subscribers', () => {
  const storage = makeMockStorage();
  const mgr = new ChatPreferencesManager(storage);

  let notified = false;
  mgr.subscribe((p) => {
    notified = true;
  });

  mgr.applyPreset('terminal');
  const p = mgr.getPreferences();
  assert.equal(p.preset, 'terminal');
  assert.equal(p.layout, 'compact');
  assert.equal(p.density, 'compact');
  assert.equal(notified, true);

  // Check saved in storage
  const raw = storage.getItem('afterlight-chat-preferences');
  assert.ok(raw);
  assert.ok(raw.includes('terminal'));
});

test('ChatPreferencesManager: resets to defaults cleanly', () => {
  const storage = makeMockStorage();
  const mgr = new ChatPreferencesManager(storage);

  mgr.setPreferences({ layout: 'bubble', density: 'spacious', fontSize: 'large' });
  assert.equal(mgr.getPreferences().layout, 'bubble');

  mgr.resetToDefaults();
  const p = mgr.getPreferences();
  assert.equal(p.layout, DEFAULT_CHAT_PREFERENCES.layout);
  assert.equal(p.density, DEFAULT_CHAT_PREFERENCES.density);
});

test('ChatPreferencesManager: applies tokens and classes to mock element', () => {
  const storage = makeMockStorage();
  const mgr = new ChatPreferencesManager(storage);
  const el = makeMockElement();

  mgr.applyPreset('terminal');
  mgr.applyToElement(el);

  assert.equal(el.style.getProperty('--chat-accent'), PRESET_DEFINITIONS.terminal.tokens.accent);
  assert.equal(el.classList.contains('layout-compact'), true);
  assert.equal(el.classList.contains('density-compact'), true);

  // Match World theme
  mgr.setPreferences({ background: 'match-world' });
  mgr.setWorld('coastal');
  mgr.applyToElement(el);

  assert.equal(el.style.getProperty('--chat-accent'), WORLD_THEME_TOKENS.coastal.accent);
});

import { AppearanceModal } from '../src/ui/chat/appearanceModal.js';

test('AppearanceModal: opens, syncs preferences, and resets to defaults', () => {
  const storage = makeMockStorage();
  const mgr = new ChatPreferencesManager(storage);

  const prevDoc = globalThis.document;
  const elements = new Map();

  function makeDOMElement(tag) {
    const children = [];
    const classes = new Set();
    const eventListeners = new Map();
    const styles = new Map();
    let text = '';
    let val = '';
    let checked = false;

    const el = {
      tagName: tag.toUpperCase(),
      id: '',
      open: false,
      dataset: {},
      style: {
        setProperty: (k, v) => styles.set(k, String(v)),
        getProperty: (k) => styles.get(k) ?? '',
      },
      get value() { return val; },
      set value(v) { val = String(v); },
      get checked() { return checked; },
      set checked(b) { checked = Boolean(b); },
      classList: {
        add: (c) => classes.add(c),
        remove: (c) => classes.delete(c),
        toggle: (c, v) => (v ? classes.add(c) : classes.delete(c)),
        contains: (c) => classes.has(c),
      },
      get textContent() { return text; },
      set textContent(v) { text = String(v || ''); },
      get children() { return children; },
      appendChild(c) {
        children.push(c);
        c.parentElement = el;
        return c;
      },
      setAttribute(name, v) {
        if (name === 'open') el.open = true;
      },
      removeAttribute(name) {
        if (name === 'open') el.open = false;
      },
      showModal() { el.open = true; },
      close() { el.open = false; },
      addEventListener(evt, fn) {
        if (!eventListeners.has(evt)) eventListeners.set(evt, []);
        eventListeners.get(evt).push(fn);
      },
      dispatchEvent(evt) {
        for (const fn of eventListeners.get(evt.type) || []) fn(evt);
      },
      querySelector(sel) {
        return this.querySelectorAll(sel)[0] || null;
      },
      querySelectorAll(sel) {
        const res = [];
        function walk(node) {
          for (const c of node.children) {
            if (sel.startsWith('#') && c.id === sel.slice(1)) res.push(c);
            else if (sel.startsWith('.') && c.classList.contains(sel.slice(1))) res.push(c);
            else if (c.tagName.toLowerCase() === sel.toLowerCase()) res.push(c);
            walk(c);
          }
        }
        walk(el);
        return res;
      },
      closest(sel) {
        let cur = this;
        while (cur) {
          if (sel.startsWith('.') && cur.classList?.contains(sel.slice(1))) return cur;
          cur = cur.parentElement;
        }
        return null;
      },
    };
    return el;
  }

  const mockBody = makeDOMElement('body');
  globalThis.document = {
    body: mockBody,
    createElement: makeDOMElement,
  };

  try {
    let closed = false;
    const modal = new AppearanceModal(mgr, { onClose: () => { closed = true; } });
    assert.ok(modal.dialog);

    modal.open();
    assert.equal(modal.dialog.open, true);

    // Reset button
    const resetBtn = modal.dialog.querySelector('#chat-pref-reset');
    assert.ok(resetBtn);
    resetBtn.dispatchEvent({ type: 'click' });
    assert.equal(mgr.getPreferences().preset, 'afterlight');

    // Close button
    const doneBtn = modal.dialog.querySelector('#chat-pref-done');
    assert.ok(doneBtn);
    doneBtn.dispatchEvent({ type: 'click' });
    assert.equal(modal.dialog.open, false);
    assert.equal(closed, true);
  } finally {
    globalThis.document = prevDoc;
  }
});
