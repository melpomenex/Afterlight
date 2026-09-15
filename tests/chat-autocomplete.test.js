import test from 'node:test';
import assert from 'node:assert/strict';
import { ChatAutocomplete } from '../src/ui/chat/autocomplete.js';

function makeMockInput(initial = '') {
  let val = initial;
  let start = initial.length;
  let end = initial.length;

  return {
    get value() { return val; },
    set value(v) { val = String(v); },
    get selectionStart() { return start; },
    set selectionStart(s) { start = s; },
    get selectionEnd() { return end; },
    set selectionEnd(e) { end = e; },
    setSelectionRange(s, e) { start = s; end = e; },
    focus() {},
  };
}

function makeMockDOM() {
  function makeElement(tag) {
    const children = [];
    const classes = new Set();
    const eventListeners = new Map();
    let text = '';

    const el = {
      tagName: tag.toUpperCase(),
      hidden: false,
      dataset: {},
      classList: {
        add(cls) { classes.add(cls); },
        remove(cls) { classes.delete(cls); },
        contains(cls) { return classes.has(cls); },
      },
      get textContent() { return text; },
      set textContent(v) { text = String(v || ''); if (!text) children.length = 0; },
      get children() { return children; },
      appendChild(child) {
        children.push(child);
        child.parentElement = el;
        return child;
      },
      setAttribute() {},
      getAttribute() { return null; },
      addEventListener(evt, fn) {
        if (!eventListeners.has(evt)) eventListeners.set(evt, []);
        eventListeners.get(evt).push(fn);
      },
      dispatchEvent(evt) {
        const list = eventListeners.get(evt.type) || [];
        for (const fn of list) fn(evt);
      },
      querySelectorAll(selector) {
        const out = [];
        for (const c of children) {
          if (selector.startsWith('.') && c.classList.contains(selector.slice(1))) out.push(c);
        }
        return out;
      },
    };
    return el;
  }
  return { doc: { createElement: makeElement } };
}

function withMockDOM(fn) {
  const prevDoc = globalThis.document;
  const { doc } = makeMockDOM();
  globalThis.document = doc;
  try {
    return fn();
  } finally {
    globalThis.document = prevDoc;
  }
}

test('ChatAutocomplete: detects :emoji shortcode and replaces with emoji on Enter', () => {
  withMockDOM(() => {
    const input = makeMockInput('hello :wa');
    let chosen = null;
    const ac = new ChatAutocomplete({
      input,
      onSelect: (item) => { chosen = item; },
    });

    ac.update();
    assert.equal(ac.isOpen, true);
    assert.ok(ac.items.length > 0);
    assert.equal(ac.items[0].value, '👋');

    // Press Enter to select
    const handled = ac.handleKeyDown({
      code: 'Enter',
      preventDefault() {},
    });
    assert.equal(handled, true);
    assert.equal(input.value, 'hello 👋');
    assert.equal(ac.isOpen, false);
    assert.ok(chosen);
    assert.equal(chosen.value, '👋');
  });
});

test('ChatAutocomplete: detects @mention and replaces with @Nickname on Tab', () => {
  withMockDOM(() => {
    const input = makeMockInput('hey @Ali');
    const ac = new ChatAutocomplete({
      input,
      getOnlinePlayers: () => ['Alice', 'Bob', 'Charlie'],
    });

    ac.update();
    assert.equal(ac.isOpen, true);
    assert.equal(ac.items.length, 1);
    assert.equal(ac.items[0].label, '@Alice');

    const handled = ac.handleKeyDown({
      code: 'Tab',
      preventDefault() {},
    });
    assert.equal(handled, true);
    assert.equal(input.value, 'hey @Alice ');
    assert.equal(ac.isOpen, false);
  });
});

test('ChatAutocomplete: navigates with ArrowDown and ArrowUp, dismisses with Escape', () => {
  withMockDOM(() => {
    const input = makeMockInput(':hea');
    const ac = new ChatAutocomplete({ input });

    ac.update();
    assert.equal(ac.isOpen, true);
    assert.ok(ac.items.length >= 2);
    assert.equal(ac.selectedIndex, 0);

    ac.handleKeyDown({ code: 'ArrowDown', preventDefault() {} });
    assert.equal(ac.selectedIndex, 1);

    ac.handleKeyDown({ code: 'ArrowUp', preventDefault() {} });
    assert.equal(ac.selectedIndex, 0);

    ac.handleKeyDown({ code: 'Escape', preventDefault() {} });
    assert.equal(ac.isOpen, false);
    // Value remains unchanged
    assert.equal(input.value, ':hea');
  });
});
