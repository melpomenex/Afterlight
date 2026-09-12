/**
 * Twitch engine adapter tests (src/ui/theaterScreen.js, add-twitch-streams).
 *
 * A minimal fake browser (window/document/Twitch SDK) drives the adapter
 * through its branches: interactive READY/VOD seek, live offline/online,
 * blocked autoplay gesture recovery, the ready watchdog, and the
 * non-interactive clip embed. No real DOM or network is used.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { TheaterScreenUI } from '../src/ui/theaterScreen.js';
import { TWITCH_CLIP_GUARD_SEC } from '../src/ui/theaterPlaybackState.js';

function fakeElement(tag) {
  return {
    tagName: tag,
    children: [],
    attrs: {},
    style: {},
    className: '',
    innerHTML: '',
    append(child) {
      this.children.push(child);
      child.parent = this;
    },
    remove() {
      this.removed = true;
    },
    setAttribute(key, value) {
      this.attrs[key] = value;
    },
    getAttribute(key) {
      return this.attrs[key];
    },
  };
}

class FakeTwitchPlayer {
  static READY = 'ready';
  static PLAYING = 'playing';
  static PLAY = 'play';
  static PAUSE = 'pause';
  static ENDED = 'ended';
  static OFFLINE = 'offline';
  static ONLINE = 'online';
  static PLAYBACK_BLOCKED = 'playbackblocked';
  static instances = [];

  constructor(mount, options) {
    this.mount = mount;
    this.options = options;
    this.listeners = new Map();
    this.plays = 0;
    this.pauses = 0;
    this.seeks = [];
    this.volumes = [];
    this.mutes = [];
    this.currentTime = null;
    FakeTwitchPlayer.instances.push(this);
  }

  addEventListener(name, handler) {
    if (!this.listeners.has(name)) this.listeners.set(name, []);
    this.listeners.get(name).push(handler);
  }

  emit(name) {
    for (const handler of this.listeners.get(name) || []) handler();
  }

  play() {
    this.plays++;
  }

  pause() {
    this.pauses++;
  }

  seek(sec) {
    this.seeks.push(sec);
  }

  setVolume(v) {
    this.volumes.push(v);
  }

  setMuted(m) {
    this.mutes.push(m);
  }

  getCurrentTime() {
    return this.currentTime;
  }
}

function installFakeBrowser() {
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
  };
  globalThis.window = {
    location: { hostname: 'localhost' },
    Twitch: { Player: FakeTwitchPlayer },
  };
  globalThis.document = {
    createElement: (tag) => fakeElement(tag),
    head: { append() {} },
  };
  FakeTwitchPlayer.instances = [];
  return () => {
    globalThis.window = previous.window;
    globalThis.document = previous.document;
  };
}

function makeUI(now) {
  const sent = [];
  const net = {
    handlers: new Map(),
    sent,
    on() {},
    send(type, payload) {
      sent.push({ type, payload });
    },
  };
  const ui = new TheaterScreenUI(net);
  ui.roomActive = true;
  ui.dom = { mediaHost: fakeElement('div') };
  ui.state = { now, queue: [] };
  ui.serverDelta = 0;
  return { ui, sent };
}

/** UI first (its constructor builds no DOM without globals), then the fakes. */
function makeUIWithBrowser(now) {
  const made = makeUI(now);
  const restore = installFakeBrowser();
  return { ...made, restore };
}

const channelItem = () => ({
  id: 'itm_twitch_channel',
  kind: 'twitch',
  twitchType: 'channel',
  twitchId: 'shroud',
  url: 'https://www.twitch.tv/shroud',
  title: 'shroud',
  playing: true,
  positionSec: 0,
  updatedAt: Date.now(),
  by: 'Tester',
  queuedBy: 'Tester',
});

const vodItem = () => ({
  id: 'itm_twitch_vod',
  kind: 'twitch',
  twitchType: 'video',
  twitchId: '40464143',
  url: 'https://www.twitch.tv/videos/40464143',
  title: 'A VOD',
  playing: true,
  positionSec: 30,
  updatedAt: Date.now() - 30_000,
  by: 'Tester',
  queuedBy: 'Tester',
});

const clipItem = () => ({
  id: 'itm_twitch_clip',
  kind: 'twitch',
  twitchType: 'clip',
  twitchId: 'JoyousGeniusRabbitHeyGirl-9owuUeWU12SCXVzf',
  url: 'https://clips.twitch.tv/JoyousGeniusRabbitHeyGirl-9owuUeWU12SCXVzf',
  title: 'A clip',
  playing: true,
  positionSec: 0,
  updatedAt: Date.now(),
  by: 'Tester',
  queuedBy: 'Tester',
});

test('twitch channel engine: ready starts the live edge, offline then online stays on the bill', async () => {
  const { ui, restore } = makeUIWithBrowser(channelItem());
  try {
    await ui.startTwitchEngine(ui.state.now, ui.loadToken);
    const player = FakeTwitchPlayer.instances[0];
    assert.ok(player, 'interactive player constructed');
    assert.equal(player.options.channel, 'shroud');
    assert.deepEqual(player.options.parent, ['localhost']);
    assert.equal(player.options.muted, true, 'sound off starts muted for autoplay');

    // No seek ever happens for a live channel, even after READY.
    player.emit(FakeTwitchPlayer.READY);
    assert.equal(ui.engine.ready, true);
    assert.deepEqual(player.seeks, []);
    assert.equal(player.plays, 1);

    player.emit(FakeTwitchPlayer.PLAYING);
    assert.equal(ui.overlayState, 'playing');

    player.emit(FakeTwitchPlayer.OFFLINE);
    assert.equal(ui.twitchOffline, true);
    assert.equal(ui.overlayState, 'loading');
    assert.equal(ui.engine.getState(), 'loading', 'offline is left alone by supervision');

    player.emit(FakeTwitchPlayer.ONLINE);
    assert.equal(ui.twitchOffline, false);
    assert.ok(player.plays >= 2, 'coming back online resumes the channel');
  } finally {
    restore();
  }
});

test('twitch VOD engine: READY seeks to the shared position and ended advances once', async () => {
  const { ui, sent, restore } = makeUIWithBrowser(vodItem());
  try {
    await ui.startTwitchEngine(ui.state.now, ui.loadToken);
    const player = FakeTwitchPlayer.instances[0];
    assert.equal(player.options.video, '40464143');

    player.emit(FakeTwitchPlayer.READY);
    assert.ok(player.seeks.length === 1 && player.seeks[0] > 29, 'VOD seeks near the shared position');
    assert.equal(ui.engine.getState(), 'ready');

    player.currentTime = 42;
    assert.equal(ui.engine.getTime(), 42);

    player.emit(FakeTwitchPlayer.ENDED);
    const ended = sent.filter((m) => m.payload?.op === 'ended');
    assert.equal(ended.length, 1, 'ended is reported for the item id');
    assert.equal(ended[0].payload.itemId, 'itm_twitch_vod');
  } finally {
    restore();
  }
});

test('twitch blocked autoplay shows the gesture and recovers from it', async () => {
  const { ui, restore } = makeUIWithBrowser(channelItem());
  try {
    await ui.startTwitchEngine(ui.state.now, ui.loadToken);
    const player = FakeTwitchPlayer.instances[0];
    player.emit(FakeTwitchPlayer.READY);

    player.emit(FakeTwitchPlayer.PLAYBACK_BLOCKED);
    assert.equal(ui.awaitingGesture, true, 'the start affordance is shown');
    assert.equal(ui.engine.getState(), 'unstarted');

    const before = player.plays;
    ui.resumeFromGesture();
    assert.equal(ui.awaitingGesture, false);
    assert.equal(player.plays, before + 1, 'the gesture calls play, not seek (live)');
    assert.deepEqual(player.seeks, []);
  } finally {
    restore();
  }
});

test('twitch ready watchdog rebuilds once, then falls back to the plain embed', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
  const { ui, restore } = makeUIWithBrowser(channelItem());
  try {
    await ui.startTwitchEngine(ui.state.now, ui.loadToken);
    assert.equal(FakeTwitchPlayer.instances.length, 1);

    // First timeout: one rebuild for the same item.
    t.mock.timers.tick(9000);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(ui.twitchRetryItemId, 'itm_twitch_channel');
    assert.equal(FakeTwitchPlayer.instances.length, 2, 'player rebuilt once');

    // Second timeout: no third player. The official non-interactive embed
    // takes over instead of a local error card; the bill is untouched.
    t.mock.timers.tick(9000);
    assert.equal(FakeTwitchPlayer.instances.length, 2);
    assert.equal(ui.twitchFallbackItemId, 'itm_twitch_channel');
    assert.equal(ui.overlayState, 'playing', 'fallback embed shows the item, not an error');
    const fallback = ui.dom.mediaHost.children.at(-1);
    assert.match(fallback.src, /player\.twitch\.tv\/\?channel=shroud/);
    assert.match(fallback.src, /[?&]parent=localhost/);
  } finally {
    restore();
  }
});

test('turning sound on rebuilds a muted twitch embed without the mute flag', () => {
  const { ui, restore } = makeUIWithBrowser(clipItem());
  try {
    ui.startTwitchIframeEngine(ui.state.now, ui.loadToken);
    assert.equal(ui.engine.degraded, true);
    assert.equal(ui.engine.muted, true);
    assert.match(ui.engine.iframe.src, /[?&]muted=true/);

    ui.setMasterSound(true);
    const rebuilt = ui.engine.iframe;
    assert.notEqual(rebuilt, undefined);
    assert.doesNotMatch(rebuilt.src, /[?&]muted=true/, 'rebuilt unmuted while the gate is on');
    assert.match(rebuilt.src, /clips\.twitch\.tv\/embed\?clip=/);

    ui.setMasterSound(false);
    assert.match(ui.engine.iframe.src, /[?&]muted=true/, 'turning the gate off re-mutes the embed');
  } finally {
    restore();
  }
});

test('twitch clips use the non-interactive embed with a host parent', () => {
  const { ui, restore } = makeUIWithBrowser(clipItem());
  try {
    ui.startTwitchIframeEngine(ui.state.now, ui.loadToken);
    const iframe = ui.dom.mediaHost.children[0];
    assert.ok(iframe, 'clip iframe appended');
    assert.match(iframe.src, /^https:\/\/clips\.twitch\.tv\/embed\?clip=JoyousGeniusRabbitHeyGirl-9owuUeWU12SCXVzf/);
    assert.match(iframe.src, /[?&]parent=localhost/);
    assert.match(iframe.src, /[?&]muted=true/);
    assert.equal(ui.engine.degraded, true);
    assert.equal(ui.engine.getState(), null);
  } finally {
    restore();
  }
});

test('twitch clip guard advances the bill once, respecting an earlier report', () => {
  const { ui, sent } = makeUI(clipItem());
  ui.state.now.updatedAt = Date.now() - (TWITCH_CLIP_GUARD_SEC + 5) * 1000;

  ui.tickClipGuard(ui.state.now);
  const ended = sent.filter((m) => m.payload?.op === 'ended');
  assert.equal(ended.length, 1);

  ui.tickClipGuard(ui.state.now); // reportedForId now guards a second send
  assert.equal(sent.filter((m) => m.payload?.op === 'ended').length, 1);
});

test('booth transport presents the twitch live/clip limits', () => {
  const { ui, restore } = makeUIWithBrowser(clipItem());
  try {
    ui.dom.controlsDialog = {};
    ui.dom.nowPanel = fakeElement('div');
    ui.dom.queueList = fakeElement('div');
    ui.dom.btnToggle = fakeElement('button');
    ui.dom.btnSkip = fakeElement('button');
    ui.dom.btnBack = fakeElement('button');
    ui.dom.btnFwd = fakeElement('button');
    ui.dom.btnClear = fakeElement('button');
    ui.dom.volumeInput = { value: '' };

    ui.renderControls();
    assert.equal(ui.dom.btnToggle.disabled, true, 'a clip cannot be paused');
    assert.equal(ui.dom.btnBack.disabled, true);
    assert.equal(ui.dom.btnFwd.disabled, true);
    assert.equal(ui.dom.btnSkip.disabled, false, 'skip remains available');
    const notes = ui.dom.nowPanel.children.map((child) => child.textContent).filter(Boolean);
    assert.ok(notes.some((text) => /not synchronized/i.test(text)), 'clip is marked as not synchronized');

    Object.assign(ui.state.now, { id: 'itm_twitch_channel', twitchType: 'channel', twitchId: 'shroud' });
    ui.renderControls();
    assert.equal(ui.dom.btnToggle.disabled, false, 'a live channel can pause/resume');
    assert.equal(ui.dom.btnBack.disabled, true);
    assert.equal(ui.dom.btnFwd.disabled, true);

    Object.assign(ui.state.now, { id: 'itm_twitch_vod', twitchType: 'video', twitchId: '40464143' });
    ui.renderControls();
    assert.equal(ui.dom.btnToggle.disabled, false);
    assert.equal(ui.dom.btnBack.disabled, false);
    assert.equal(ui.dom.btnFwd.disabled, false);
  } finally {
    restore();
  }
});
