/**
 * Regression: theater_state with HLS now must reach the loader path and
 * duplicate identical snapshots must not reload the engine.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvedPlayback } from '../shared/mediaModel.js';
import { shouldApplyRoomFrame } from '../src/net/roomEpoch.js';

const HLS_URL = 'https://example.test/live/channel.m3u8';

test('resolvedPlayback selects hls engine for committed theater now item', () => {
  const item = {
    id: 'itm_hls',
    kind: 'hls',
    url: HLS_URL,
    title: 'News',
    playing: true,
    positionSec: 0,
    updatedAt: Date.now(),
  };
  const resolved = resolvedPlayback(item);
  assert.equal(resolved.engine, 'hls');
  assert.equal(resolved.url, HLS_URL);
  assert.equal(resolved.waiting, false);
});

test('theater_state without epoch applies after a higher presence epoch', () => {
  const epochs = new Map([['theater', 5]]);
  assert.equal(
    shouldApplyRoomFrame(epochs, 'theater', {
      type: 'theater_state',
      roomId: 'theater',
      theater: { now: { kind: 'hls', url: HLS_URL }, queue: [] },
    }),
    true,
  );
  assert.equal(epochs.get('theater'), 5, 'bill snapshot must not regress the presence epoch');
});

test('duplicate identical hls theater_state does not call loadCurrent twice', async () => {
  const mod = await import('../src/ui/theaterScreen.js');
  const stubNet = {
    handlers: new Map(),
    on(type, fn) {
      if (!this.handlers.has(type)) this.handlers.set(type, []);
      this.handlers.get(type).push(fn);
    },
  };
  const ui = new mod.TheaterScreenUI(stubNet);
  ui.setRoomActive(true);

  let loadCount = 0;
  const origLoad = ui.loadCurrent.bind(ui);
  ui.loadCurrent = function patchedLoad() {
    loadCount += 1;
    return origLoad();
  };

  const theater = {
    now: {
      id: 'itm_dup',
      kind: 'hls',
      url: HLS_URL,
      title: 'Dup',
      playing: true,
      positionSec: 0,
      updatedAt: Date.now(),
      by: 'T',
      queuedBy: 'T',
    },
    queue: [],
  };
  const now = Date.now();
  const playKey = `${theater.now.id}:::hls`;

  ui.applyState(theater, now);
  const afterFirst = loadCount;
  assert.ok(afterFirst >= 1, 'first authoritative state should start the loader path');

  // Simulate the engine already loaded from the immediate command reply before
  // the room broadcast duplicate arrives.
  ui.loadedPlayKey = playKey;
  ui.loadedItemId = theater.now.id;

  ui.applyState(theater, now);
  assert.equal(loadCount, afterFirst, 'identical playKey must not reload');
});
