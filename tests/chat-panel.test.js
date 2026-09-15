import test from 'node:test';
import assert from 'node:assert/strict';
import { ChatPanel } from '../src/ui/chatPanel.js';
import { MSG_TYPES } from '../shared/protocol.js';

function makeMockDOM() {
  const elements = new Map();

  function makeElement(id, tagName = 'div') {
    const children = [];
    const styleProps = new Map();
    const listeners = new Map();
    const attributes = new Map();
    const dataset = {};
    const classes = new Set();

    const el = {
      id,
      tagName: tagName.toUpperCase(),
      dataset,
      style: {
        setProperty(k, v) { styleProps.set(k, String(v)); el.style[k] = v; },
        getPropertyValue(k) { return styleProps.get(k) || el.style[k] || ''; },
        removeProperty(k) { styleProps.delete(k); delete el.style[k]; },
      },
      value: '',
      placeholder: '',
      disabled: false,
      hidden: false,
      textContent: '',
      children,
      parentElement: null,
      get className() {
        return Array.from(classes).join(' ');
      },
      set className(val) {
        classes.clear();
        for (const cls of (val || '').split(/\s+/).filter(Boolean)) {
          classes.add(cls);
        }
      },
      get childElementCount() {
        return children.length;
      },
      get firstChild() {
        return children[0] || null;
      },
      classList: {
        classes,
        add(cls) {
          for (const c of (cls || '').split(/\s+/).filter(Boolean)) {
            classes.add(c);
          }
        },
        remove(...tokens) {
          for (const c of tokens) {
            classes.delete(c);
          }
        },
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
      },
      addEventListener(type, fn) {
        if (!listeners.has(type)) listeners.set(type, []);
        listeners.get(type).push(fn);
      },
      removeEventListener(type, fn) {
        if (listeners.has(type)) {
          listeners.set(type, listeners.get(type).filter(f => f !== fn));
        }
      },
      dispatchEvent(event) {
        for (const fn of listeners.get(event?.type || '') || []) fn(event);
      },
      setAttribute(k, v) { attributes.set(k, String(v)); },
      getAttribute(k) { return attributes.get(k) ?? null; },
      hasAttribute(k) { return attributes.has(k); },
      removeAttribute(k) { attributes.delete(k); },
      appendChild(child) {
        children.push(child);
        child.parentElement = el;
        return child;
      },
      insertBefore(newNode, refNode) {
        const idx = children.indexOf(refNode);
        if (idx === -1) children.push(newNode);
        else children.splice(idx, 0, newNode);
        newNode.parentElement = el;
        return newNode;
      },
      remove() {
        if (el.parentElement) {
          const idx = el.parentElement.children.indexOf(el);
          if (idx !== -1) el.parentElement.children.splice(idx, 1);
          el.parentElement = null;
        }
      },
      blur() {},
      focus() {},
      scrollIntoView() {},
      getBoundingClientRect() {
        return { width: 320, height: 240, top: 0, left: 0, bottom: 240, right: 320 };
      },
      scrollHeight: 500,
      scrollTop: 500,
      clientHeight: 200,
      querySelector(sel) {
        return this.querySelectorAll(sel)[0] || null;
      },
      querySelectorAll(sel) {
        const results = [];
        function walk(node) {
          if (!node || !node.children) return;
          for (const c of node.children) {
            if (matches(c, sel)) results.push(c);
            walk(c);
          }
        }
        function matches(node, s) {
          if (!node || !node.classList) return false;
          if (s.startsWith('.')) return node.classList.contains(s.slice(1));
          if (s.startsWith('#')) return node.id === s.slice(1);
          return node.tagName?.toLowerCase() === s.toLowerCase();
        }
        walk(this);
        return results;
      },
    };
    return el;
  }

  const doc = {
    getElementById(id) {
      if (!elements.has(id)) {
        elements.set(id, makeElement(id));
      }
      return elements.get(id);
    },
    createElement(tag) {
      return makeElement(`el-${Math.random().toString(36).slice(2)}`, tag);
    },
    createTextNode(text) {
      return { textContent: String(text), children: [], classList: { contains: () => false } };
    },
    querySelector(sel) {
      if (sel.startsWith('#')) return this.getElementById(sel.slice(1));
      return null;
    },
    querySelectorAll() {
      return [];
    },
    activeElement: null,
  };

  return { doc, elements };
}

function makeFakeNet({ nickname = 'MistyPepper94', guestId = 'guest_123' } = {}) {
  const handlers = new Map();
  return {
    nickname,
    guestId,
    connected: true,
    sendChatMessage(text) {},
    sendChat(text) { this.sendChatMessage(text); },
    sendDM() {},
    on(type, fn) {
      if (!handlers.has(type)) handlers.set(type, []);
      handlers.get(type).push(fn);
    },
    onDisconnect() {},
    onConnect() {},
    dispatch(type, msg) {
      for (const fn of handlers.get(type) || []) fn(msg);
    },
  };
}

function withDOM(fn) {
  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;
  const prevStorage = globalThis.localStorage;
  const { doc, elements } = makeMockDOM();
  globalThis.document = doc;

  const storage = new Map();
  globalThis.localStorage = {
    getItem: (k) => storage.get(k) ?? null,
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
    clear: () => storage.clear(),
  };

  globalThis.window = {
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener() {},
    removeEventListener() {},
    innerWidth: 1024,
    innerHeight: 768,
  };

  try {
    return fn({ doc, elements });
  } finally {
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
    globalThis.localStorage = prevStorage;
  }
}

test('ChatPanel presence: formats join with leading space', () => {
  withDOM(({ elements }) => {
    const net = makeFakeNet();
    const panel = new ChatPanel(net);
    const log = elements.get('chat-log');

    net.dispatch(MSG_TYPES.CHAT_PRESENCE, {
      event: 'join',
      who: 'AmberTurnip',
      fromKind: 'player',
      ts: Date.now(),
    });

    assert.equal(log.children.length, 1);
    const line = log.children[0];
    const systemSpan = line.children.find(c => c.classList.contains('chat-system'));
    assert.ok(systemSpan, 'system span rendered');
    assert.equal(systemSpan.textContent, 'AmberTurnip steps into the town channel.');
  });
});

test('ChatPanel presence: formats IRC relay join and part correctly', () => {
  withDOM(({ elements }) => {
    const net = makeFakeNet();
    const panel = new ChatPanel(net);
    const log = elements.get('chat-log');

    net.dispatch(MSG_TYPES.CHAT_PRESENCE, {
      event: 'join',
      who: 'IrcUser',
      fromKind: 'irc',
      ts: Date.now(),
    });

    const joinSpan = log.children[0].children.find(c => c.classList.contains('chat-system'));
    assert.equal(joinSpan.textContent, 'IrcUser (relay) steps into the town channel.');

    // Fast-forward cooldown by updating recorded ts
    panel.recentPresence.set('IrcUser', { event: 'join', ts: Date.now() - 5000 });

    net.dispatch(MSG_TYPES.CHAT_PRESENCE, {
      event: 'part',
      who: 'IrcUser',
      fromKind: 'irc',
      ts: Date.now(),
    });

    const partSpan = log.children[1].children.find(c => c.classList.contains('chat-system'));
    assert.equal(partSpan.textContent, 'IrcUser (relay) drifts away from it.');
  });
});

test('ChatPanel presence: suppresses self presence by nickname or guestId', () => {
  withDOM(({ elements }) => {
    const net = makeFakeNet({ nickname: 'MistyPepper94', guestId: 'guest_test_self' });
    new ChatPanel(net);
    const log = elements.get('chat-log');

    // Self join by nickname: must NOT appear in chat
    net.dispatch(MSG_TYPES.CHAT_PRESENCE, {
      event: 'join',
      who: 'MistyPepper94',
      fromKind: 'player',
      ts: Date.now(),
    });

    // Self join by guestId fallback: must NOT appear in chat
    net.dispatch(MSG_TYPES.CHAT_PRESENCE, {
      event: 'join',
      who: 'guest_test_self',
      fromKind: 'player',
      ts: Date.now(),
    });

    // Self part by nickname: must NOT appear in chat
    net.dispatch(MSG_TYPES.CHAT_PRESENCE, {
      event: 'part',
      who: 'MistyPepper94',
      fromKind: 'player',
      ts: Date.now(),
    });

    assert.equal(log.children.length, 0, 'self presence should never create chat lines');
  });
});

test('ChatPanel presence: deduplicates identical presence within 15s window', () => {
  withDOM(({ elements }) => {
    const net = makeFakeNet();
    new ChatPanel(net);
    const log = elements.get('chat-log');

    // First join
    net.dispatch(MSG_TYPES.CHAT_PRESENCE, {
      event: 'join',
      who: 'QuietLeek',
      fromKind: 'player',
      ts: Date.now(),
    });
    assert.equal(log.children.length, 1);

    // Duplicate join immediately after (e.g. reconnection burst)
    net.dispatch(MSG_TYPES.CHAT_PRESENCE, {
      event: 'join',
      who: 'QuietLeek',
      fromKind: 'player',
      ts: Date.now(),
    });
    assert.equal(log.children.length, 1, 'duplicate join within window suppressed');
  });
});

test('ChatPanel presence: suppresses rapid flapping (join-then-part within 3s)', () => {
  withDOM(({ elements }) => {
    const net = makeFakeNet();
    new ChatPanel(net);
    const log = elements.get('chat-log');

    // Join
    net.dispatch(MSG_TYPES.CHAT_PRESENCE, {
      event: 'join',
      who: 'FlappingBot',
      fromKind: 'player',
      ts: Date.now(),
    });
    assert.equal(log.children.length, 1);

    // Immediate part within 3 seconds
    net.dispatch(MSG_TYPES.CHAT_PRESENCE, {
      event: 'part',
      who: 'FlappingBot',
      fromKind: 'player',
      ts: Date.now() + 500,
    });
    assert.equal(log.children.length, 1, 'rapid flap departure suppressed');
  });
});

test('ChatPanel grouping: groups consecutive messages from same sender within 3m', () => {
  withDOM(({ elements }) => {
    const net = makeFakeNet();
    new ChatPanel(net);
    const log = elements.get('chat-log');
    const t0 = Date.now();

    net.dispatch(MSG_TYPES.CHAT_MESSAGE, {
      from: 'RustyCourier',
      text: 'First message',
      ts: t0,
    });
    assert.equal(log.children.length, 1);
    const group1 = log.children[0];
    assert.ok(group1.classList.contains('chat-group'));
    const body1 = group1.querySelector('.chat-group-body');
    assert.equal(body1.children.length, 1);

    // Second message from same sender 30 seconds later
    net.dispatch(MSG_TYPES.CHAT_MESSAGE, {
      from: 'RustyCourier',
      text: 'Second message soon after',
      ts: t0 + 30000,
    });
    assert.equal(log.children.length, 1, 'should reuse same chat-group');
    assert.equal(body1.children.length, 2, 'second line appended to body');
  });
});

test('ChatPanel grouping: splits group when sender changes or > 3m elapses', () => {
  withDOM(({ elements }) => {
    const net = makeFakeNet();
    new ChatPanel(net);
    const log = elements.get('chat-log');
    const t0 = Date.now();

    net.dispatch(MSG_TYPES.CHAT_MESSAGE, {
      from: 'RustyCourier',
      text: 'First message',
      ts: t0,
    });
    assert.equal(log.children.length, 1);

    // Different sender
    net.dispatch(MSG_TYPES.CHAT_MESSAGE, {
      from: 'Kiln',
      text: 'Bweep boop',
      ts: t0 + 5000,
    });
    assert.equal(log.children.length, 2, 'different sender creates new group');

    // Same sender after > 3m (e.g. 4 minutes = 240,000 ms)
    net.dispatch(MSG_TYPES.CHAT_MESSAGE, {
      from: 'Kiln',
      text: 'Still here after a while',
      ts: t0 + 245000,
    });
    assert.equal(log.children.length, 3, 'elapsed time > 3m creates new group');
  });
});

test('ChatPanel layout modes: switching layout mode toggles classes on panel', () => {
  withDOM(({ elements }) => {
    const net = makeFakeNet();
    const panel = new ChatPanel(net);
    const panelEl = elements.get('chat-panel');

    assert.ok(panelEl.classList.contains('layout-comfortable'));

    panel.prefsManager.set('layout', 'compact');
    assert.ok(panelEl.classList.contains('layout-compact'));
    assert.ok(!panelEl.classList.contains('layout-comfortable'));

    panel.prefsManager.set('layout', 'bubble');
    assert.ok(panelEl.classList.contains('layout-bubble'));
    assert.ok(!panelEl.classList.contains('layout-compact'));
  });
});

test('ChatPanel scroll anchoring and unread jump pill behavior', () => {
  withDOM(({ elements }) => {
    const net = makeFakeNet();
    new ChatPanel(net);
    const log = elements.get('chat-log');
    const jumpPill = elements.get('chat-jump-pill');

    // Simulate scrolled to bottom (scrollTop = scrollHeight - clientHeight)
    log.scrollHeight = 1000;
    log.clientHeight = 300;
    log.scrollTop = 700; // distanceFromBottom = 0

    net.dispatch(MSG_TYPES.CHAT_MESSAGE, {
      from: 'Alice',
      text: 'Hello from Alice',
      ts: Date.now(),
    });
    assert.equal(jumpPill.hidden, true);

    // Now simulate user scrolled up (distanceFromBottom = 1000 - 400 - 300 = 300 > 48)
    log.scrollTop = 400;

    net.dispatch(MSG_TYPES.CHAT_MESSAGE, {
      from: 'Bob',
      text: 'Are you reading history?',
      ts: Date.now(),
    });

    const jumpCount = elements.get('chat-jump-count');
    assert.equal(jumpPill.hidden, false, 'jump pill should be visible when scrolled up');
    assert.equal(jumpCount.textContent, '1');
    assert.equal(log.scrollTop, 400, 'scroll position should not jump when reading backlog');

    // Another unread message
    net.dispatch(MSG_TYPES.CHAT_MESSAGE, {
      from: 'Carol',
      text: 'Another message',
      ts: Date.now(),
    });
    assert.equal(jumpCount.textContent, '2');

    // Clicking jump pill scrolls to bottom and hides pill
    jumpPill.dispatchEvent({ type: 'click' });
    assert.equal(jumpPill.hidden, true);
  });
});

test('ChatPanel reply: formats outgoing reply quote and renders incoming quote block', () => {
  withDOM(({ elements }) => {
    let lastSent = null;
    const net = makeFakeNet();
    net.sendChatMessage = (text) => { lastSent = text; };

    const panel = new ChatPanel(net);
    const log = elements.get('chat-log');
    const input = elements.get('chat-input');

    // Incoming message
    net.dispatch(MSG_TYPES.CHAT_MESSAGE, {
      from: 'Kiln',
      text: 'The beacon is restored!',
      ts: Date.now(),
    });

    // Start a reply by triggering the reply action
    const replyBtn = log.querySelector('.chat-reply-btn');
    assert.ok(replyBtn, 'reply button exists');
    replyBtn.dispatchEvent({ type: 'click', stopPropagation() {} });

    assert.ok(input.value.startsWith('> @Kiln: The beacon is restored!\n'), 'input prefilled with reply quote');

    // Append response and submit
    input.value += 'Great work Kiln';
    panel.submit(false);

    assert.ok(lastSent, 'message was sent');
    assert.equal(lastSent, '> @Kiln: The beacon is restored!\nGreat work Kiln');

    // Verify incoming quote renders with .chat-quote block
    net.dispatch(MSG_TYPES.CHAT_MESSAGE, {
      from: 'MistyPepper94',
      text: lastSent,
      ts: Date.now(),
    });

    const quoteBlock = log.querySelector('.chat-quote');
    assert.ok(quoteBlock, 'rendered quote block element');
    const quoteSender = quoteBlock.querySelector('.chat-quote-sender');
    assert.equal(quoteSender.textContent, '@Kiln:');
    const quoteBody = quoteBlock.querySelector('.chat-quote-body');
    assert.equal(quoteBody.textContent, 'The beacon is restored!');
  });
});

test('ChatPanel mention highlight: highlights current player nickname', () => {
  withDOM(({ elements }) => {
    const net = makeFakeNet({ nickname: 'RustScout' });
    new ChatPanel(net);
    const log = elements.get('chat-log');

    net.dispatch(MSG_TYPES.CHAT_MESSAGE, {
      from: 'Kiln',
      text: 'Hey @RustScout, come over here!',
      ts: Date.now(),
    });

    const line = log.querySelector('.chat-line');
    assert.ok(line.classList.contains('mention-highlight'), 'line marked with mention-highlight');
  });
});

test('ChatPanel draft preservation: preserves draft in localStorage and clears upon send', () => {
  withDOM(({ elements }) => {
    const net = makeFakeNet();
    net.sendChatMessage = () => {};
    const panel = new ChatPanel(net);
    const input = elements.get('chat-input');

    input.value = 'Unfinished thought...';
    input.dispatchEvent({ type: 'input' });

    assert.equal(globalThis.localStorage.getItem('afterlight-chat-draft'), 'Unfinished thought...');

    // Simulate send
    panel.submit(false);
    assert.equal(globalThis.localStorage.getItem('afterlight-chat-draft'), null);
  });
});
