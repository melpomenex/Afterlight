import test from 'node:test';
import assert from 'node:assert/strict';
import { ChatPanel } from '../src/ui/chatPanel.js';
import { MSG_TYPES } from '../shared/protocol.js';

function makeMockDOM() {
  const elements = new Map();

  function makeElement(id) {
    const children = [];
    return {
      id,
      style: {},
      value: '',
      placeholder: '',
      disabled: false,
      hidden: false,
      textContent: '',
      children,
      get className() {
        return Array.from(this.classList.classes).join(' ');
      },
      set className(val) {
        this.classList.classes.clear();
        for (const cls of (val || '').split(/\s+/).filter(Boolean)) {
          this.classList.classes.add(cls);
        }
      },
      get childElementCount() {
        return children.length;
      },
      get firstChild() {
        return children[0] || null;
      },
      classList: {
        classes: new Set(),
        add(cls) {
          for (const c of (cls || '').split(/\s+/).filter(Boolean)) {
            this.classes.add(c);
          }
        },
        remove(cls) { this.classes.delete(cls); },
        toggle(cls, val) {
          if (val === undefined) {
            if (this.classes.has(cls)) this.classes.delete(cls);
            else this.classes.add(cls);
          } else if (val) {
            this.classes.add(cls);
          } else {
            this.classes.delete(cls);
          }
        },
        contains(cls) { return this.classes.has(cls); },
      },
      addEventListener() {},
      removeEventListener() {},
      setAttribute() {},
      getAttribute() { return null; },
      appendChild(child) {
        children.push(child);
        return child;
      },
      remove() {},
      blur() {},
      focus() {},
      getBoundingClientRect() {
        return { width: 320, height: 240, top: 0, left: 0 };
      },
      scrollHeight: 500,
      scrollTop: 500,
      clientHeight: 200,
    };
  }

  const doc = {
    getElementById(id) {
      if (!elements.has(id)) {
        elements.set(id, makeElement(id));
      }
      return elements.get(id);
    },
    createElement(tag) {
      return makeElement(`el-${Math.random().toString(36).slice(2)}`);
    },
  };

  return { doc, elements };
}

function makeFakeNet({ nickname = 'MistyPepper94', guestId = 'guest_123' } = {}) {
  const handlers = new Map();
  return {
    nickname,
    guestId,
    connected: true,
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
  const { doc, elements } = makeMockDOM();
  globalThis.document = doc;
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
