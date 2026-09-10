/**
 * Failure-isolation tests (fix-theater-second-player-playback, design D3/D4):
 * a client-local playback block must never send a room-wide ended/failed
 * report, while genuine source failures still advance the bill exactly once.
 * Uses the headless TheaterScreenUI instance (no DOM) with a stub net.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { TheaterScreenUI } from '../src/ui/theaterScreen.js';
import { isSourceFatalFailure } from '../src/ui/theaterPlaybackState.js';
import { MSG_TYPES } from '../shared/protocol.js';

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
  ui.roomActive = true;
  ui.state = {
    now: {
      id: 'itm_isolated',
      kind: 'youtube',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      videoId: 'dQw4w9WgXcQ',
      title: 'Isolation Test',
      playing: true,
      positionSec: 0,
      updatedAt: Date.now(),
      by: 'Someone',
      queuedBy: 'Someone',
    },
    queue: [],
  };
  return { ui, sent };
}

const failedReports = (sent) => sent.filter((m) => m.type === MSG_TYPES.THEATER_CONTROL && m.payload?.op === 'failed');

test('isSourceFatalFailure: only source-level evidence is room-fatal', () => {
  assert.equal(isSourceFatalFailure({ engineKind: 'youtube', code: 100 }), true);
  assert.equal(isSourceFatalFailure({ engineKind: 'youtube', code: 101 }), true);
  assert.equal(isSourceFatalFailure({ engineKind: 'youtube', code: 150 }), true);
  assert.equal(isSourceFatalFailure({ engineKind: 'youtube', code: 2 }), false);
  assert.equal(isSourceFatalFailure({ engineKind: 'youtube', code: 5 }), false);
  assert.equal(isSourceFatalFailure({ engineKind: 'youtube' }), false);

  assert.equal(isSourceFatalFailure({ engineKind: 'vimeo', name: 'NotFoundError' }), true);
  assert.equal(isSourceFatalFailure({ engineKind: 'vimeo', name: 'PrivacyError' }), true);
  assert.equal(isSourceFatalFailure({ engineKind: 'vimeo', name: 'PasswordError' }), true);
  assert.equal(isSourceFatalFailure({ engineKind: 'vimeo', name: 'TypeError' }), false);

  assert.equal(isSourceFatalFailure({ engineKind: 'file', videoError: true }), true);
  assert.equal(isSourceFatalFailure({ engineKind: 'hls', fatal: true }), true);
  assert.equal(isSourceFatalFailure({ engineKind: 'torrent', videoError: true }), true);
  assert.equal(isSourceFatalFailure({ engineKind: 'hls', fatal: false }), false);
  assert.equal(isSourceFatalFailure({}), false);
  assert.equal(isSourceFatalFailure(), false);
});

test('an ambiguous YouTube error stays local: no report, bill untouched', () => {
  const { ui, sent } = makeUI();
  const before = ui.state.now;
  ui.reportEngineFailure({ engineKind: 'youtube', code: 2 });
  assert.equal(failedReports(sent).length, 0, 'ambiguous player errors must not report failed');
  assert.equal(ui.state.now, before, 'the shared item must remain the authoritative state');
  assert.equal(sent.length, 0, 'no network frame at all for a local problem');
});

test('a blocked autoplay state never reports (the badge path sends nothing)', () => {
  const { ui, sent } = makeUI();
  ui.showGestureBadge();
  assert.equal(ui.awaitingGesture, true);
  assert.equal(sent.length, 0);
});

test('a source-fatal YouTube error reports failed exactly once for the item', () => {
  const { ui, sent } = makeUI();
  ui.reportEngineFailure({ engineKind: 'youtube', code: 150 });
  const reports = failedReports(sent);
  assert.equal(reports.length, 1);
  assert.equal(reports[0].payload.itemId, 'itm_isolated');

  // Repeated failures (or a second engine event) must not duplicate the report.
  ui.reportEngineFailure({ engineKind: 'youtube', code: 150 });
  assert.equal(failedReports(sent).length, 1, 'reports are once per item id');
});

test('a <video> error event is source-fatal and reports once', () => {
  const { ui, sent } = makeUI();
  ui.reportEngineFailure({ engineKind: 'file', videoError: true });
  assert.equal(failedReports(sent).length, 1);
});

test('localPlaybackProblem never reports and keeps the shared item', () => {
  const { ui, sent } = makeUI();
  ui.localPlaybackProblem('The YouTube player could not load here.');
  assert.equal(failedReports(sent).length, 0);
  assert.equal(sent.length, 0);
  assert.equal(ui.state.now.id, 'itm_isolated');
});
