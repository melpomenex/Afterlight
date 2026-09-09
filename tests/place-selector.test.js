/**
 * Places selector tests (add-social-place-framework task 4.1). Every test
 * drives the production module (src/ui/placeSelector.js) through injected
 * fake DOM, fake timers, a fake net facade and a fake focus target — the
 * same dependency seams main.js wires up in the browser.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { createPlaceSelector, PLACES_POLL_INTERVAL_MS, PLACES_OCCUPANCY_TTL_MS, PLACES_ACTIVITY_TTL_MS } from '../src/ui/placeSelector.js';
import { MSG_TYPES } from '../shared/protocol.js';

// --- fake DOM --------------------------------------------------------------

function el(tag, { text = '' } = {}) {
  const node = {
    tagName: tag.toUpperCase(),
    className: '',
    type: null,
    open: false,
    children: [],
    parentNode: null,
    handlers: new Map(),
    attributes: new Map(),
    focused: false,
    focus() { node.focused = true; },
    setAttribute(name, value) { node.attributes.set(name, String(value)); },
    getAttribute(name) { return node.attributes.get(name) ?? null; },
    addEventListener(type, fn) { node.handlers.set(type, fn); },
    append(...kids) {
      for (const kid of kids) {
        kid.parentNode = node;
        node.children.push(kid);
      }
    },
    appendChild(kid) { node.append(kid); return kid; },
    remove() { node.parentNode = null; },
    click() {
      // Real DOM semantics: a click runs the onclick property AND the
      // registered 'click' listeners.
      node.onclick?.();
      const listeners = node.handlers.get('click');
      for (const fn of Array.isArray(listeners) ? listeners : listeners ? [listeners] : []) {
        fn({ preventDefault() {} });
      }
    },
  };
  // Dynamic content must ride textContent (design D8): prove the module
  // never reaches for innerHTML.
  Object.defineProperty(node, 'innerHTML', {
    set() { throw new Error('placeSelector must not use innerHTML'); },
    get() { throw new Error('placeSelector must not read innerHTML'); },
  });
  let textValue = text;
  Object.defineProperty(node, 'textContent', {
    get: () => textValue,
    set(value) {
      textValue = value;
      if (value === '') node.children.length = 0;
    },
  });
  return node;
}

function walk(root, visit) {
  visit(root);
  for (const child of root.children) walk(child, visit);
}

function allCards(root) {
  const found = [];
  walk(root, (node) => {
    // Only actual destination buttons: 'place-cards'/'place-card-meta' also
    // contain the substring.
    if (node.tagName === 'BUTTON' && node.className.includes('place-card')) found.push(node);
  });
  return found;
}

function byClass(root, className) {
  const found = [];
  walk(root, (node) => { if (node.className === className) found.push(node); });
  return found;
}

function cardName(button) {
  const strong = button.children[0].children[1];
  return strong.textContent;
}

function countText(button) {
  return byClass(button, 'place-count')[0].textContent;
}

function activityText(button) {
  return byClass(button, 'place-activity')[0].textContent;
}

// --- fake clock / timers ----------------------------------------------------

function createClock() {
  const clock = {
    nowMs: 1_000_000,
    pending: new Map(),
    nextId: 1,
    schedule(fn, ms) {
      const id = clock.nextId++;
      clock.pending.set(id, { at: clock.nowMs + ms, fn });
      return id;
    },
    cancel(id) { clock.pending.delete(id); },
    advance(ms) {
      // Fire everything due, in time order; re-armed callbacks chain.
      const deadline = clock.nowMs + ms;
      for (;;) {
        const due = [...clock.pending.entries()]
          .filter(([, job]) => job.at <= deadline)
          .sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        clock.pending.delete(due[0]);
        clock.nowMs = due[1].at;
        due[1].fn();
      }
      clock.nowMs = deadline;
    },
  };
  return clock;
}

// --- fake net ---------------------------------------------------------------

function createNet() {
  const net = {
    handlers: new Map(),
    connectListeners: [],
    disconnectListeners: [],
    sent: [],
    on(type, fn) {
      if (!net.handlers.has(type)) net.handlers.set(type, []);
      net.handlers.get(type).push(fn);
    },
    send(type, payload) { net.sent.push({ type, payload }); },
    onConnect(fn) { net.connectListeners.push(fn); },
    onDisconnect(fn) { net.disconnectListeners.push(fn); },
    dispatch(type, msg) { for (const fn of net.handlers.get(type) ?? []) fn(msg); },
    connect() { for (const fn of net.connectListeners) fn(); },
    disconnect() { for (const fn of net.disconnectListeners) fn(); },
  };
  return net;
}

// --- harness ----------------------------------------------------------------

// Mirrors the production provider's shape: two featured places, all legacy
// districts, the market and the personal garden.
function sampleDestinations() {
  return [
    { roomId: 'theater', featured: true, micro: 'CINEMA DISTRICT / 20', name: 'The Orpheum', description: 'A grand old cinema.', badgeClass: 'current', badgeText: 'CURRENT', current: true },
    { roomId: 'court', featured: true, micro: 'LOWER DISTRICT / 04', name: 'The Rain Court', description: 'Wet stone, warm windows.', badgeClass: 'visited', badgeText: 'VISITED', current: false },
    { roomId: 'canal', featured: false, micro: 'WATER DISTRICT / 05', name: 'The Sluiceworks', description: 'Cross the canal.', badgeClass: 'unexplored', badgeText: 'UNEXPLORED', current: false },
    { roomId: 'garden', featured: false, micro: 'UPPER TERRACES / 06', name: 'The Glass Garden', description: 'Something still grows.', badgeClass: 'restored', badgeText: '✦ RESTORED', current: false },
    { roomId: 'market', featured: false, micro: 'MARKET SOCIAL DISTRICT / 01', name: 'The Market Court', description: 'Trade and contracts.', badgeClass: 'visited', badgeText: 'CIVIC HUB', current: false },
    { roomId: 'garden:guest-1', featured: false, micro: 'CULTIVATION PLOT', name: 'Your Market Garden', description: 'Till, sow, water, harvest.', badgeClass: 'visited', badgeText: 'PERSONAL PLOT', current: false },
  ];
}

function createHarness({ destinations = sampleDestinations } = {}) {
  const clock = createClock();
  const net = createNet();
  const dialog = el('dialog');
  dialog.showModal = function () { dialog.open = true; dialog.showModalCalls = (dialog.showModalCalls ?? 0) + 1; };
  dialog.close = function () { dialog.open = false; dialog.closeCalls = (dialog.closeCalls ?? 0) + 1; };
  const container = el('div');
  const closeButton = el('button');
  const previousFocus = el('canvas');
  const calls = [];

  const selector = createPlaceSelector({
    dialog,
    container,
    closeButton,
    net,
    getDestinations: destinations,
    onTravel: (roomId) => calls.push(['travel', roomId]),
    onOpen: () => calls.push(['onOpen']),
    onClose: () => calls.push(['onClose']),
    now: () => clock.nowMs,
    schedule: clock.schedule,
    cancel: clock.cancel,
    createEl: el,
    newRequestId: () => `req_${net.sent.length + 1}`,
    getActiveElement: () => previousFocus,
  });

  const requests = () => net.sent.filter(s => s.type === MSG_TYPES.PLACE_DIRECTORY_GET);
  const reply = (requestId, entries) => net.dispatch(MSG_TYPES.PLACE_DIRECTORY, { requestId, serverNow: clock.nowMs, entries });

  return { clock, net, dialog, container, closeButton, previousFocus, calls, selector, requests, reply };
}

// --- tests ------------------------------------------------------------------

test('opening renders featured first and a collapsed legacy group that retains every old destination', () => {
  const h = createHarness();

  h.selector.open();

  assert.equal(h.calls[0][0], 'onOpen', 'gameplay pauses before the modal takes focus');
  assert.equal(h.dialog.open, true);
  assert.equal(h.dialog.showModalCalls, 1);

  const [featured, legacy] = h.container.children;
  assert.equal(featured.className, 'place-group place-group-featured');
  assert.equal(featured.children[0].textContent, 'FEATURED');
  assert.deepEqual(allCards(featured).map(cardName), ['The Orpheum', 'The Rain Court']);

  assert.equal(legacy.tagName, 'DETAILS');
  assert.equal(legacy.open, false, 'legacy areas start collapsed to keep the modal compact');
  assert.equal(legacy.children[0].textContent, 'LEGACY AREAS');
  const legacyNames = allCards(legacy).map(cardName);
  assert.deepEqual(legacyNames, [
    'The Sluiceworks', 'The Glass Garden', 'The Market Court', 'Your Market Garden',
  ]);
  // Every non-featured destination is still reachable: nothing old is lost.
  const allProvided = sampleDestinations().filter(d => !d.featured).map(d => d.name);
  assert.deepEqual(legacyNames, allProvided);

  // Every card is a real button with a type, so keyboard focus reaches it.
  for (const card of allCards(h.container)) {
    assert.equal(card.tagName, 'BUTTON');
    assert.equal(card.type, 'button');
  }
});

test('opening requests the directory immediately and polls every 10s while open', () => {
  const h = createHarness();

  h.selector.open();
  assert.equal(h.requests().length, 1);
  assert.match(h.requests()[0].payload.requestId, /^req_/);
  assert.equal(h.requests()[0].payload.requestId.length <= 64, true);
  assert.equal(h.selector.snapshot().pollArmed, true);

  h.clock.advance(PLACES_POLL_INTERVAL_MS);
  assert.equal(h.requests().length, 2, 'one poll tick after 10s');

  h.clock.advance(PLACES_POLL_INTERVAL_MS * 3);
  assert.equal(h.requests().length, 5, 'polling continues at the 10s cadence');

  h.selector.close();
  assert.equal(h.selector.snapshot().pollArmed, false);
  h.clock.advance(PLACES_POLL_INTERVAL_MS * 5);
  assert.equal(h.requests().length, 5, 'closing cancels polling');
  assert.deepEqual(h.calls.filter(c => c[0] === 'onClose').length, 1);
});

test('occupancy renders as honest text: counts, empty, and unknown — never a fabricated number', () => {
  const h = createHarness();
  h.selector.open();

  h.reply(h.requests()[0].payload.requestId, [
    { roomId: 'theater', occupancy: 3, observedAt: h.clock.nowMs },
    { roomId: 'court', occupancy: 0, observedAt: h.clock.nowMs },
    { roomId: 'canal', occupancy: null, observedAt: null },
    // garden and the personal garden have no entry at all: unknown.
  ]);

  const cards = allCards(h.container);
  const byName = new Map(cards.map(c => [cardName(c), c]));
  assert.equal(countText(byName.get('The Orpheum')), '3 here');
  assert.equal(countText(byName.get('The Rain Court')), 'Empty right now');
  assert.equal(countText(byName.get('The Sluiceworks')), '—');
  assert.equal(countText(byName.get('Your Market Garden')), '—');

  // Junk occupancy values are unknown, never coerced into a count.
  h.reply(h.requests().at(-1).payload.requestId, [
    { roomId: 'theater', occupancy: '7' },
    { roomId: 'court', occupancy: -2 },
    { roomId: 'canal', occupancy: 2.5 },
  ]);
  assert.equal(countText(byName.get('The Orpheum')), '—');
  assert.equal(countText(byName.get('The Rain Court')), '—');
  assert.equal(countText(byName.get('The Sluiceworks')), '—');
  assert.ok(!countText(byName.get('The Orpheum')).includes('7'));
});

test('counts older than 30 seconds display as unknown while the travel action remains', () => {
  const h = createHarness();
  h.selector.open();
  h.reply(h.requests()[0].payload.requestId, [
    { roomId: 'theater', occupancy: 4, observedAt: h.clock.nowMs },
  ]);
  const theater = allCards(h.container).find(c => cardName(c) === 'The Orpheum');
  assert.equal(countText(theater), '4 here');

  h.clock.advance(PLACES_OCCUPANCY_TTL_MS + PLACES_POLL_INTERVAL_MS);

  assert.equal(countText(theater), '—', 'a count past its TTL reads as unknown');
  assert.equal(theater.getAttribute('disabled'), null, 'the destination stays selectable');
  theater.click();
  assert.deepEqual(h.calls.at(-1), ['travel', 'theater']);
});

test('a hostile activity title renders literally as text and executes nothing', () => {
  const h = createHarness();
  h.selector.open();
  const hostile = '<img src=x onerror="window.__pwned=1"><script>alert(1)</script>';
  h.reply(h.requests()[0].payload.requestId, [
    { roomId: 'theater', occupancy: 1, activity: hostile },
  ]);

  const theater = allCards(h.container).find(c => cardName(c) === 'The Orpheum');
  const activity = byClass(theater, 'place-activity')[0];
  assert.equal(activity.textContent, hostile, 'the raw string is displayed, not interpreted');
  assert.equal(activity.children.length, 0, 'no element children were created from the string');

  // A later reply without activity clears it.
  h.reply(h.requests().at(-1).payload.requestId, [{ roomId: 'theater', occupancy: 1 }]);
  assert.equal(activity.textContent, '');
});

test('a malformed response is ignored and every destination button stays usable', () => {
  const h = createHarness();
  h.selector.open();
  h.reply(h.requests()[0].payload.requestId, [{ roomId: 'theater', occupancy: 2 }]);

  const theater = allCards(h.container).find(c => cardName(c) === 'The Orpheum');

  // Missing entries, wrong types, junk rows: none may throw or wipe cards.
  h.reply(h.requests().at(-1).payload.requestId, undefined);
  h.reply(h.requests().at(-1).payload.requestId, 'all the rooms');
  h.reply(h.requests().at(-1).payload.requestId, [null, 42, { occupancy: 9 }, { roomId: 'theater', occupancy: 6 }]);
  h.net.dispatch(MSG_TYPES.PLACE_DIRECTORY, null);
  h.net.dispatch(MSG_TYPES.PLACE_DIRECTORY, { requestId: h.requests().at(-1).payload.requestId });

  // The one well-formed row in the junk reply still applies honestly; the
  // junk rows are skipped; nothing threw and no card was lost.
  assert.deepEqual(allCards(h.container).map(countText), ['6 here', '—', '—', '—', '—', '—']);
  theater.click();
  assert.deepEqual(h.calls.at(-1), ['travel', 'theater'], 'travel still works after malformed replies');
});

test('a request generation guard discards stale replies across close/reopen', () => {
  const h = createHarness();
  h.selector.open();
  const firstRequest = h.requests()[0].payload.requestId;
  h.clock.advance(PLACES_POLL_INTERVAL_MS);
  const secondRequest = h.requests()[1].payload.requestId;

  h.selector.close();
  h.selector.open();
  const thirdRequest = h.requests().at(-1).payload.requestId;
  assert.notEqual(firstRequest, thirdRequest);
  assert.notEqual(secondRequest, thirdRequest);

  // The older generations' replies must not touch the new dialog…
  h.reply(secondRequest, [{ roomId: 'theater', occupancy: 99 }]);
  h.reply(firstRequest, [{ roomId: 'court', occupancy: 99 }]);
  let theater = allCards(h.container).find(c => cardName(c) === 'The Orpheum');
  assert.equal(countText(theater), '—');
  // …and the current generation's reply does.
  h.reply(thirdRequest, [{ roomId: 'theater', occupancy: 5 }]);
  assert.equal(countText(theater), '5 here');

  // A reply arriving after close cannot reopen or mutate anything.
  h.selector.close();
  h.reply(thirdRequest, [{ roomId: 'theater', occupancy: 42 }]);
  assert.equal(h.selector.isOpen(), false);
  assert.equal(h.selector.snapshot().counts.size, 0);
});

test('selecting a legacy destination travels and closes through the same path', () => {
  const h = createHarness();
  h.selector.open();

  const [featured, legacy] = h.container.children;
  const glassGarden = allCards(legacy).find(c => cardName(c) === 'The Glass Garden');
  glassGarden.click();
  assert.deepEqual(h.calls, [
    ['onOpen'],
    ['onClose'],
    ['travel', 'garden'],
  ]);
  assert.equal(h.dialog.open, false);
  assert.equal(h.selector.isOpen(), false);

  // The featured group is untouched by legacy selection and still works.
  h.selector.open();
  const orpheum = allCards(featured)[0];
  orpheum.click();
  assert.deepEqual(h.calls.at(-1), ['travel', 'theater']);
});

test('keyboard close paths: cancel and close button return focus and clear held movement', () => {
  const h = createHarness();
  h.selector.open();
  h.previousFocus.focused = false;
  h.clock.advance(PLACES_POLL_INTERVAL_MS);

  // Native dialog cancellation (Escape) — the module registers the handler.
  const cancelHandler = h.dialog.handlers.get('cancel');
  assert.equal(typeof cancelHandler, 'function', 'the module owns native cancellation');
  cancelHandler({ preventDefault() {} });

  assert.equal(h.dialog.open, false, 'the dialog is closed through explicit cleanup');
  assert.deepEqual(h.calls, [['onOpen'], ['onClose']]);
  assert.equal(h.previousFocus.focused, true, 'focus returns to the element that had it');
  assert.equal(h.selector.snapshot().pollArmed, false);
  h.clock.advance(PLACES_POLL_INTERVAL_MS * 2);
  assert.equal(h.requests().length, 2, 'no polling after cancellation');

  // The close button uses the same path.
  h.selector.open();
  h.previousFocus.focused = false;
  h.closeButton.click();
  assert.deepEqual(h.calls.filter(c => c[0] === 'onClose').length, 2);
  assert.equal(h.previousFocus.focused, true);
});

test('a disconnect while open cancels polling and shows unknown; reconnecting asks again', () => {
  const h = createHarness();
  h.selector.open();
  h.reply(h.requests()[0].payload.requestId, [
    { roomId: 'theater', occupancy: 8, observedAt: h.clock.nowMs },
  ]);
  const theater = allCards(h.container).find(c => cardName(c) === 'The Orpheum');
  assert.equal(countText(theater), '8 here');

  h.net.disconnect();
  assert.equal(h.selector.snapshot().pollArmed, false, 'polling stops on disconnect');
  assert.equal(countText(theater), '—', 'counts become unknown instead of lingering');
  theater.click();
  assert.deepEqual(h.calls.at(-1), ['travel', 'theater'], 'travel stays available offline');

  h.selector.close();
  h.selector.open();
  h.net.connect();
  assert.equal(h.requests().length, 3, 'reconnecting while open requests a fresh directory');
  assert.equal(h.selector.snapshot().pollArmed, true, 'polling resumes');
});

test('opening twice is a no-op and never double-requests', () => {
  const h = createHarness();
  h.selector.open();
  h.selector.open();
  assert.equal(h.dialog.showModalCalls, 1);
  assert.equal(h.requests().length, 1);
  assert.equal(allCards(h.container).length, sampleDestinations().length);
});

test('closing when closed is a safe no-op', () => {
  const h = createHarness();
  h.selector.close();
  assert.deepEqual(h.calls, []);
  assert.equal(h.dialog.closeCalls ?? 0, 0);
});

test('Places discovery shows separate activity counts and never calls an occupied table empty', () => {
  const h = createHarness();
  h.selector.open();
  h.reply(h.requests()[0].payload.requestId, [
    {
      roomId: 'theater',
      occupancy: 0,
      activities: [{ id: 'pool-1', type: 'pool', playing: 2, watching: 3, queued: 1 }],
    },
  ]);
  const theater = allCards(h.container).find(c => cardName(c) === 'The Orpheum');
  assert.equal(countText(theater), 'Tables occupied');
  const line = activityText(theater);
  assert.match(line, /2 playing/);
  assert.match(line, /3 watching/);
  assert.match(line, /1 queued/);
  assert.equal(line.includes('6'), false);
  assert.equal(theater.getAttribute('data-occupied'), 'true');
});

test('stale activity summaries become unknown instead of an empty-table promise', () => {
  const h = createHarness();
  h.selector.open();
  h.reply(h.requests()[0].payload.requestId, [
    {
      roomId: 'theater',
      occupancy: 4,
      activities: [{ id: 'pool-1', type: 'pool', playing: 2, watching: 0, queued: 0 }],
    },
  ]);
  const theater = allCards(h.container).find(c => cardName(c) === 'The Orpheum');
  assert.match(activityText(theater), /2 playing/);

  h.clock.advance(PLACES_ACTIVITY_TTL_MS + 1);
  h.selector.snapshot();
  // Occupancy TTL is 30s; activity TTL is 10s — refreshCounts runs on the poll tick.
  h.clock.advance(PLACES_POLL_INTERVAL_MS);
  assert.equal(activityText(theater), 'Tables unknown');
  assert.notEqual(countText(theater), 'Empty right now');
});
