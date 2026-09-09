import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PHOTO_BOOTH_POSE_COUNT,
  PHOTO_BOOTH_POSES,
  PHOTO_BOOTH_COUNTDOWN_MS,
  PHOTO_BOOTH_POSE_MS,
  PHOTO_BOOTH_DT,
  validatePhotoBoothInput,
  initPhotoBoothState,
  applyPhotoBoothInput,
  stepPhotoBoothSimulation,
  photoBoothCaptureSubjects,
  photoBoothLocalDownload,
} from '../shared/photoBoothModel.js';
import { PhotoBoothModule, captureBoothStrip } from '../src/activities/photoBooth.js';
import { hasActivityModule, unregisterActivityModule } from '../src/activities/registry.js';

function stepsFor(ms) {
  return Math.ceil(ms / (PHOTO_BOOTH_DT * 1000));
}

test('photo booth: invite is 2-3 slots and unknowns are rejected', () => {
  assert.equal(validatePhotoBoothInput(null).valid, false);
  assert.equal(validatePhotoBoothInput({ kind: 'invite', slots: [0] }).valid, false);
  assert.equal(validatePhotoBoothInput({ kind: 'invite', slots: [0, 1, 2, 3] }).valid, false);
  assert.equal(validatePhotoBoothInput({ kind: 'invite', slots: [0, 1, 2] }).valid, true);
  assert.equal(validatePhotoBoothInput({ kind: 'upload' }).valid, false);
});

test('photo booth: a decline excludes that person; capture waits or proceeds without them', () => {
  let state = initPhotoBoothState({ activeSlots: [0, 1, 2] });
  ({ simState: state } = applyPhotoBoothInput(state, 0, { kind: 'invite', slots: [0, 1, 2] }));
  ({ simState: state } = applyPhotoBoothInput(state, 0, { kind: 'accept' }));
  ({ simState: state } = applyPhotoBoothInput(state, 1, { kind: 'accept' }));
  let event;
  ({ simState: state, event } = applyPhotoBoothInput(state, 2, { kind: 'decline' }));
  assert.equal(event.payload.excluded, true);
  assert.deepEqual(state.acceptedSlots, [0, 1]);
  assert.deepEqual(state.declinedSlots, [2]);

  const waiting = applyPhotoBoothInput(state, 0, { kind: 'start' });
  // No pending left and two accepted — proceed
  assert.equal(waiting.event.type, 'countdown');
  assert.deepEqual(waiting.event.payload.subjects.slots, [0, 1]);
  assert.equal(waiting.event.payload.subjects.includeTheaterMedia, false);
  assert.equal(waiting.event.payload.subjects.includeChat, false);
  assert.equal(waiting.event.payload.subjects.includeBystanders, false);

  // Pending participant: wait
  state = initPhotoBoothState({ activeSlots: [0, 1, 2] });
  ({ simState: state } = applyPhotoBoothInput(state, 0, { kind: 'invite', slots: [0, 1, 2] }));
  ({ simState: state } = applyPhotoBoothInput(state, 0, { kind: 'accept' }));
  ({ simState: state } = applyPhotoBoothInput(state, 1, { kind: 'accept' }));
  const held = applyPhotoBoothInput(state, 0, { kind: 'start' });
  assert.equal(held.event.type, 'capture_wait');
  assert.equal(held.event.payload.reason, 'pending');
});

test('photo booth: a departure during countdown excludes that person', () => {
  let state = initPhotoBoothState({ activeSlots: [0, 1, 2] });
  ({ simState: state } = applyPhotoBoothInput(state, 0, { kind: 'invite', slots: [0, 1, 2] }));
  ({ simState: state } = applyPhotoBoothInput(state, 0, { kind: 'accept' }));
  ({ simState: state } = applyPhotoBoothInput(state, 1, { kind: 'accept' }));
  ({ simState: state } = applyPhotoBoothInput(state, 2, { kind: 'accept' }));
  ({ simState: state } = applyPhotoBoothInput(state, 0, { kind: 'start' }));
  const left = applyPhotoBoothInput(state, 2, { kind: 'depart' });
  assert.equal(left.simState.roster[2], 'departed');
  assert.ok(!left.simState.acceptedSlots.includes(2));
  assert.deepEqual(photoBoothCaptureSubjects(left.simState).slots, [0, 1]);
});

test('photo booth: four poses then a local-only strip with no upload bytes', () => {
  let state = initPhotoBoothState({ activeSlots: [0, 1] });
  ({ simState: state } = applyPhotoBoothInput(state, 0, { kind: 'accept' }));
  ({ simState: state } = applyPhotoBoothInput(state, 1, { kind: 'accept' }));
  ({ simState: state } = applyPhotoBoothInput(state, 0, { kind: 'start' }));

  ({ simState: state } = stepPhotoBoothSimulation(state, {}, stepsFor(PHOTO_BOOTH_COUNTDOWN_MS)));
  assert.equal(state.status, 'posing');
  assert.equal(state.poseIndex, 0);
  assert.equal(PHOTO_BOOTH_POSES.length, PHOTO_BOOTH_POSE_COUNT);

  for (let i = 0; i < PHOTO_BOOTH_POSE_COUNT; i++) {
    ({ simState: state } = stepPhotoBoothSimulation(state, {}, stepsFor(PHOTO_BOOTH_POSE_MS)));
  }
  assert.equal(state.status, 'ready');
  assert.equal(state.stripReady, true);
  assert.equal(state.imageBytes, null);
  assert.equal(state.uploadRequested, false);
  const download = photoBoothLocalDownload(state);
  assert.equal(download.localOnly, true);
  assert.equal(download.upload, false);
  const subjects = photoBoothCaptureSubjects(state);
  assert.equal(subjects.includeTheaterMedia, false);
  assert.equal(subjects.includeChat, false);
  assert.equal(subjects.includeBystanders, false);
});

test('photo booth: offscreen capture only draws consented slots and never uploads', () => {
  const frames = [];
  const result = captureBoothStrip({
    subjects: { slots: [0, 1], includeTheaterMedia: false, includeChat: false, includeBystanders: false },
    poses: PHOTO_BOOTH_POSES,
    drawFrame: (ctx, { slot, pose, poseIndex }) => {
      frames.push({ slot, pose, poseIndex });
      ctx.fillStyle = '#123';
      ctx.fillRect(0, 0, 8, 8);
    },
    createCanvas: (w, h) => {
      const store = { width: w, height: h, fills: [] };
      return {
        width: w,
        height: h,
        getContext: () => ({
          fillStyle: '',
          fillRect: () => { store.fills.push(1); },
          drawImage: () => {},
        }),
        toDataURL: () => 'data:image/png;base64,AA==',
      };
    },
  });
  assert.equal(result.upload, false);
  assert.equal(result.localOnly, true);
  assert.ok(result.dataUrl.startsWith('data:image/'));
  assert.ok(frames.every((f) => f.slot === 0 || f.slot === 1));
  assert.equal(frames.length, PHOTO_BOOTH_POSE_COUNT * 2);
  assert.ok(!result.theaterMedia);
  assert.ok(!result.chat);
});

test('photo booth: module registers photo-booth', () => {
  assert.equal(typeof PhotoBoothModule.initialize, 'function');
  assert.equal(hasActivityModule('photo-booth'), true);
  unregisterActivityModule('photo-booth');
});
