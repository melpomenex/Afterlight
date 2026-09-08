/**
 * Theater adapter lifecycle tests (task 2.2): the adapter wraps the existing
 * TheaterScreenUI object without destroying it, only the active adapter may
 * open cinema view, repeated teardown is safe, and an absent (optional)
 * adapter leaves seating, travel and Theater untouched with no capture.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { createTheaterAdapter, registerTheaterAdapter, THEATER_PLACE_ID } from '../src/places/theaterAdapter.js';
import { getPlaceController, unregisterPlaceController } from '../src/places/registry.js';
import { createPlaceRuntime } from '../src/places/runtime.js';
import { resolveRoomRequest } from '../src/places/travelState.js';
import { normalizeSeat } from '../src/social/seating.js';
import { getPlaceDefinition } from '../shared/placeDefinitions.js';
import { buildDistrict } from '../src/districts.js';

// A recording stand-in for TheaterScreenUI's public lifecycle. The real
// object's behavior is covered by tests/theater-ui.test.js; here we assert
// exactly which lifecycle methods the adapter drives.
function stubTheaterUI() {
  const calls = [];
  const dialog = (name) => {
    const d = { name, open: false, close() { d.open = false; calls.push(['close', name]); } };
    return d;
  };
  const ui = {
    calls,
    dom: {
      controlsDialog: dialog('booth'),
      guideDialog: dialog('guide'),
      torrentDialog: dialog('picker'),
      playlistDialog: dialog('playlist'),
      playlistChoiceDialog: dialog('playlist-choice'),
    },
    destroyed: false,
    destroy() { this.destroyed = true; }, // must never be called by the wrapper
    setRoomActive(active) { calls.push(['setRoomActive', active]); },
    setWatchMode(on) { calls.push(['setWatchMode', on]); },
    setSeated(seated) { calls.push(['setSeated', seated]); },
    updateScreenQuad(quad) { calls.push(['updateScreenQuad', quad]); },
    openControls() { calls.push(['openControls']); },
    applyState() { calls.push(['applyState']); },
  };
  for (const key of Object.keys(ui.dom)) ui.dom[key].open = true; // everything is open
  return ui;
}

function anExternalBench() {
  return normalizeSeat({
    type: 'seat', id: 'court-bench', x: -4, z: 3,
    sit: { x: -4, y: 0, z: 3, rotY: Math.PI / 2 },
    dismount: [{ x: -4, z: 4 }, { x: -3, z: 3 }],
  });
}

test('activate turns the room on with cinema as the default presentation', () => {
  const ui = stubTheaterUI();
  const adapter = createTheaterAdapter({ ui });

  adapter.activate();

  assert.deepEqual(ui.calls, [
    ['setRoomActive', true],
    ['setWatchMode', true],
  ], 'entering the Orpheum starts the big screen, exactly as setRoom always did');
});

test('deactivate ends seat and cinema, detaches the quad and closes owned dialogs', () => {
  const ui = stubTheaterUI();
  const adapter = createTheaterAdapter({ ui });
  adapter.activate();
  ui.calls.length = 0;

  adapter.deactivate();

  const called = (name) => ui.calls.some(([method]) => method === name);
  assert.ok(called('setSeated') && ui.calls.find(c => c[0] === 'setSeated')[1] === false, 'seat pose ends');
  assert.ok(called('setWatchMode') && ui.calls.find(c => c[0] === 'setWatchMode')[1] === false, 'cinema view ends');
  assert.ok(called('setRoomActive') && ui.calls.find(c => c[0] === 'setRoomActive')[1] === false, 'overlay deactivates');
  assert.deepEqual(ui.calls.find(c => c[0] === 'updateScreenQuad'), ['updateScreenQuad', null], 'the projected quad detaches');
  for (const name of ['booth', 'guide', 'picker', 'playlist', 'playlist-choice']) {
    assert.equal(ui.dom[`${name === 'booth' ? 'controlsDialog' : name === 'guide' ? 'guideDialog' : name === 'picker' ? 'torrentDialog' : name === 'playlist' ? 'playlistDialog' : 'playlistChoiceDialog'}`].open, false, `the ${name} dialog was closed through its own close()`);
    assert.ok(ui.calls.some(c => c[0] === 'close' && c[1].startsWith(name.slice(0, 4))), `${name} close was driven, not torn down`);
  }
  assert.equal(ui.destroyed, false, 'the specialized UI object is never destroyed');
});

test('repeated teardown is safe and does not re-drive the UI', () => {
  const ui = stubTheaterUI();
  const adapter = createTheaterAdapter({ ui });

  adapter.activate();
  adapter.deactivate();
  ui.calls.length = 0;
  adapter.deactivate();
  adapter.deactivate();

  assert.deepEqual(ui.calls, [], 'an already inactive adapter drives nothing');
  assert.equal(adapter.active, false);

  // A second full round trip works from the same UI object.
  adapter.activate();
  assert.deepEqual(ui.calls, [['setRoomActive', true], ['setWatchMode', true]]);
  assert.equal(ui.destroyed, false, 'no destroy/reconstruct between visits');
});

test('an external bench never triggers cinema — the runtime routes only the active venue', () => {
  const ui = stubTheaterUI();
  const adapter = createTheaterAdapter({ ui });
  registerTheaterAdapter(adapter);
  try {
    const world = { id: 'court', group: { visible: false }, items: [], obstacles: [], environment: { zones: [] } };
    const runtime = createPlaceRuntime({
      resolve: (requested) => resolveRoomRequest(requested, {
        hasDefinition: (id) => (id === 'court' || id === 'theater' ? getPlaceDefinition(id) : null),
      }),
      build: () => world,
      controllerFor: (res) => (res.kind === 'place' ? getPlaceController(res.roomId) : null),
      resetInput: () => {},
      placeActors: () => {},
      bindNetwork: () => {},
      present: { destination: () => {} },
    });

    // The player sits on a Rain Court bench: the notification routes to the
    // ACTIVE place's controller — the court has none, the theater adapter
    // must never hear about it.
    runtime.travel('court');
    runtime.notifySeatChanged({ seated: true, seat: anExternalBench() });
    runtime.notifySeatChanged({ seated: false, seat: anExternalBench() });
    assert.deepEqual(ui.calls, [], 'a bench outside the theater cannot open cinema or touch the screen UI');

    // Entering the theater is what opens the big screen — the adapter itself,
    // never a seat notification from elsewhere.
    runtime.travel('theater');
    assert.deepEqual(ui.calls, [['setRoomActive', true], ['setWatchMode', true]]);

    // Even a stray direct notification while active cannot invent a sit from
    // a foreign seat id: the adapter applies the seated flag it is given, but
    // the routing above proved foreign seats never arrive.
    assert.equal(adapter.active, true);
  } finally {
    unregisterPlaceController(THEATER_PLACE_ID);
  }

  // An inactive adapter ignores any notification outright.
  const dormant = createTheaterAdapter({ ui: stubTheaterUI() });
  dormant.onSeatChanged({ seated: true, seat: anExternalBench() });
  assert.deepEqual(dormant.active, false);
  assert.deepEqual(dormant.active && ui.calls, false);

  // Registration is idempotent and findable by the place runtime.
  const ui2 = stubTheaterUI();
  const second = createTheaterAdapter({ ui: ui2 });
  const registered = registerTheaterAdapter(second);
  assert.equal(getPlaceController(THEATER_PLACE_ID), second);
  assert.equal(registered, second);
  registerTheaterAdapter(createTheaterAdapter({ ui: stubTheaterUI() }));
  assert.notEqual(getPlaceController(THEATER_PLACE_ID), second, 're-registration replaces the adapter');
  unregisterPlaceController(THEATER_PLACE_ID);
  assert.equal(getPlaceController(THEATER_PLACE_ID), undefined);
});

test('seat changes inside the theater drive seated flag and cinema symmetrically', () => {
  const ui = stubTheaterUI();
  const adapter = createTheaterAdapter({ ui });
  adapter.activate();
  ui.calls.length = 0;

  adapter.onSeatChanged({ seated: true });
  assert.deepEqual(ui.calls, [['setSeated', true], ['setWatchMode', true]], 'sitting opens the big stage');

  ui.calls.length = 0;
  adapter.onSeatChanged({ seated: false });
  assert.deepEqual(ui.calls, [['setSeated', false], ['setWatchMode', false]], 'standing leaves cinema view');
});

test('the projection booth only opens through the active adapter', () => {
  const ui = stubTheaterUI();
  const adapter = createTheaterAdapter({ ui });

  adapter.openScreen();
  assert.deepEqual(ui.calls, [], 'no booth outside the venue');

  adapter.activate();
  adapter.openScreen();
  assert.deepEqual(ui.calls.at(-1), ['openControls'], 'the theater_screen delegation reaches the booth');
});

test('without a call adapter, theater travel and seating work and nothing captures', () => {
  const ui = stubTheaterUI();
  const adapter = createTheaterAdapter({ ui });
  registerTheaterAdapter(adapter);
  try {
    const calls = [];
    const world = { id: 'theater', group: { visible: false }, items: [], obstacles: [], environment: { zones: [] } };
    const runtime = createPlaceRuntime({
      resolve: (requested) => resolveRoomRequest(requested, {
        hasDefinition: (id) => (id === 'theater' ? getPlaceDefinition('theater') : null),
      }),
      build: () => world,
      controllerFor: (res) => (res.kind === 'place' ? getPlaceController(res.roomId) : null),
      resetInput: () => calls.push('resetInput'),
      placeActors: () => calls.push('placeActors'),
      bindNetwork: (roomId) => calls.push(`join:${roomId}`),
      present: { destination: () => calls.push('present') },
      // callAdapter deliberately absent: absent is a no-op, travel never
      // captures, and no permission prompt surface is ever touched.
    });

    const outcome = runtime.travel('theater');
    assert.equal(outcome.status, 'ok');
    assert.deepEqual(calls, ['resetInput', 'placeActors', 'present', 'join:theater']);
    runtime.notifySeatChanged({ seated: true, seat: normalizeSeat(buildDistrict(getPlaceDefinition('theater')).items.find(i => i.type === 'seat')) });
    runtime.notifySeatChanged({ seated: false });

    assert.equal(adapter.active, true);
    assert.ok(ui.calls.some(c => c[0] === 'setSeated' && c[1] === true), 'seating presentation still reaches the venue UI');
    assert.ok(ui.calls.some(c => c[0] === 'setWatchMode' && c[1] === true), 'cinema still opens for the Orpheum itself');
    assert.ok(ui.calls.some(c => c[0] === 'setWatchMode' && c[1] === false), 'and closes again on standing');
    assert.equal(ui.destroyed, false);
  } finally {
    unregisterPlaceController(THEATER_PLACE_ID);
  }
});

test('the adapter keeps real Theater seat metadata untouched', () => {
  const world = buildDistrict(getPlaceDefinition('theater'));
  const raw = world.items.filter(i => i.type === 'seat');
  const ui = stubTheaterUI();
  const adapter = createTheaterAdapter({ ui });

  adapter.activate();
  adapter.onSeatChanged({ seated: true, seat: normalizeSeat(raw[0]) });
  adapter.deactivate();

  assert.equal(raw.length, 48);
  for (const item of raw) {
    assert.equal(item.sit, undefined, 'the builder items stay in their historical shape');
    assert.equal(item.rotY, undefined);
  }
});
