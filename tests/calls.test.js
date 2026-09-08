import test from 'node:test';
import assert from 'node:assert/strict';
import { CallClient } from '../src/net/calls.js';
import { CallPanel } from '../src/ui/callPanel.js';

test('CallClient: initial state is idle with no active tracks', () => {
  const fakeNet = { guestId: 'player-test-1', joinCallChannel: () => null };
  const client = new CallClient(fakeNet);

  assert.equal(client.status, 'idle');
  assert.equal(client.audioMuted, false);
  assert.equal(client.videoMuted, false);
  assert.equal(client.sharingScreen, false);
  assert.equal(client.captureDeclined, false);
});

test('CallClient: requestCapture handles denied or absent media devices gracefully (subscribe-only)', async () => {
  const fakeNet = { guestId: 'player-test-2', joinCallChannel: () => null };
  const client = new CallClient(fakeNet);

  // In Node environment without mediaDevices, requestCapture sets captureDeclined and returns null
  const stream = await client.requestCapture({ audio: true, video: false });
  assert.equal(stream, null);
  assert.equal(client.captureDeclined, true);
});

test('CallClient: joinCall handles channel join, initial participants, and status updates', async () => {
  let joinedTopic = null;
  let signalSent = [];

  const fakeChannel = {
    handlers: {},
    on(event, handler) {
      this.handlers[event] = handler;
    },
    join() {
      return {
        receive(status, callback) {
          if (status === 'ok') {
            callback({
              grant: 'fake-grant-token',
              turn: { urls: ['turn:localhost:3478'], username: 'u', credential: 'c' },
              expires_at: '2026-12-01T00:00:00Z',
              participants: [{ player_id: 'other-user', joined_at: '2026-09-08T00:00:00Z' }],
            });
          }
          return this;
        },
      };
    },
    push(type, payload) {
      signalSent.push({ type, payload });
    },
    leave() {},
  };

  const fakeNet = {
    guestId: 'player-test-3',
    joinCallChannel: (callId) => {
      joinedTopic = callId;
      return fakeChannel;
    },
  };

  let stateReported = null;
  let participantsReported = null;

  const client = new CallClient(fakeNet, {
    onStateChange: (status) => { stateReported = status; },
    onParticipantsChange: (p) => { participantsReported = p; },
  });

  await client.joinCall('theater-room-1');

  assert.equal(joinedTopic, 'theater-room-1');
  assert.equal(client.status, 'connected');
  assert.equal(stateReported, 'connected');
  assert.equal(client.grant, 'fake-grant-token');
  assert.equal(participantsReported.length, 1);
  assert.equal(participantsReported[0].player_id, 'other-user');

  // Participant joined event
  fakeChannel.handlers['participant_joined']({ player_id: 'new-user' });
  assert.equal(client.participants.size, 2);

  // Mute audio
  client.setAudioMute(true);
  assert.equal(client.audioMuted, true);
  assert.deepEqual(signalSent[0], { type: 'mute', payload: { kind: 'audio', muted: true } });

  // Participant left event
  fakeChannel.handlers['participant_left']({ player_id: 'other-user' });
  assert.equal(client.participants.has('other-user'), false);

  // Grant revocation stops tracks and transitions to error
  fakeChannel.handlers['grant_revoked']({});
  assert.equal(client.status, 'error');

  // Clean leave
  client.leaveCall();
  assert.equal(client.status, 'idle');
  assert.equal(client.participants.size, 0);
});

test('CallClient: handleDisconnect triggers rejoining state and reconnect grace', () => {
  const fakeNet = { guestId: 'player-test-4', joinCallChannel: () => null };
  const client = new CallClient(fakeNet);
  client.status = 'connected';
  client.callId = 'test-reconnect';

  client.handleDisconnect();

  assert.equal(client.status, 'rejoining');
  clearTimeout(client.reconnectTimer);
});

test('CallPanel: ducking and focus contract', () => {
  let duckingReported = null;
  let focusReported = null;

  const fakeCallClient = {
    status: 'idle',
    audioMuted: false,
    videoMuted: false,
    sharingScreen: false,
  };

  // Mock DOM environment for node test
  const originalDoc = globalThis.document;
  const domElements = new Map();

  globalThis.document = {
    getElementById(id) {
      if (!domElements.has(id)) {
        domElements.set(id, {
          id,
          style: {},
          classList: {
            classes: new Set(),
            toggle(cls, val) { if (val) this.classes.add(cls); else this.classes.delete(cls); },
            add(cls) { this.classes.add(cls); },
            remove(cls) { this.classes.delete(cls); },
          },
          addEventListener() {},
          appendChild() {},
          blur() {},
          focus() {},
        });
      }
      return domElements.get(id);
    },
  };

  try {
    const panel = new CallPanel(fakeCallClient, {
      onFocusChange: (focus) => { focusReported = focus; },
      onDuckingChange: (ratio) => { duckingReported = ratio; },
    });

    assert.equal(panel.visible, false);
    assert.equal(panel.duckingRatio, 0.5);

    // Toggle visibility
    panel.toggle();
    assert.equal(panel.visible, true);

    panel.toggle();
    assert.equal(panel.visible, false);

    // Ducking updates
    panel.duckingSlider = { value: '0.75' };
    panel.duckingRatio = 0.75;
    panel.onDuckingChange(0.75);
    assert.equal(duckingReported, 0.75);

    // Focus notification
    panel.onFocusChange(true);
    assert.equal(focusReported, true);
  } finally {
    globalThis.document = originalDoc;
  }
});
