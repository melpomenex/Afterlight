/**
 * Booth rejection surfacing tests (fix-theater-second-player-playback D5):
 * a server rejection tagged with a theater action op is shown to the acting
 * player even when no resolve is pending; untagged legacy errors are ignored;
 * a new action clears a stale error.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { TheaterScreenUI } from '../src/ui/theaterScreen.js';

function fakeStatusEl() {
  const classes = new Set();
  return {
    hidden: true,
    textContent: '',
    classList: {
      toggle: (name, on) => {
        if (on) classes.add(name);
        else classes.delete(name);
      },
      contains: (name) => classes.has(name),
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
    },
  };
}

function makeUI() {
  const sent = [];
  const net = {
    handlers: new Map(),
    on(type, fn) {
      if (!this.handlers.has(type)) this.handlers.set(type, []);
      this.handlers.get(type).push(fn);
      return () => {};
    },
    send(type, payload) {
      sent.push({ type, payload });
    },
  };
  const ui = new TheaterScreenUI(net);
  const status = fakeStatusEl();
  ui.dom = { addStatus: status };
  ui.roomActive = true;
  return { ui, status, sent };
}

test('a tagged theater rejection surfaces in the booth', () => {
  const { ui, status } = makeUI();
  ui.applyServerErrorMessage({ message: 'The queue reel is full. Remove something first.', op: 'add' });
  assert.equal(status.hidden, false);
  assert.equal(status.textContent, 'The queue reel is full. Remove something first.');
  assert.equal(status.classList.contains('is-error'), true);
});

test('an untagged error is ignored (legacy unrelated messages stay hidden)', () => {
  const { ui, status } = makeUI();
  ui.applyServerErrorMessage({ message: 'rate_limited' });
  assert.equal(status.hidden, true);
  assert.equal(status.textContent, '');
});

test('a tagged rejection is ignored outside the theater room', () => {
  const { ui, status } = makeUI();
  ui.roomActive = false;
  ui.applyServerErrorMessage({ message: 'The queue reel is full.', op: 'add' });
  assert.equal(status.hidden, true);
});

test('a playlist rejection still resolves the pending wait and shows the message', () => {
  const { ui, status } = makeUI();
  let cancelled = false;
  ui.playlistPending = { requestId: 'req1', timer: setTimeout(() => {}, 0) };
  ui.cancelPlaylistResolve = () => { cancelled = true; };
  ui.applyServerErrorMessage({ message: 'That playlist is private.', op: 'playlist_resolve' });
  assert.equal(cancelled, true);
  assert.equal(status.textContent, 'That playlist is private.');
});

test('a new action clears a stale error before it is sent', () => {
  const { ui, status, sent } = makeUI();
  ui.applyServerErrorMessage({ message: 'The queue reel is full.', op: 'add' });
  assert.equal(status.hidden, false);

  ui.sendQueue({ op: 'add', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
  assert.equal(status.hidden, true, 'the stale error clears on the next attempt');
  assert.equal(status.classList.contains('is-error'), false);
  assert.equal(sent.length, 1);
});
