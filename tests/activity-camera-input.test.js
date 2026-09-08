import test from 'node:test';
import assert from 'node:assert/strict';
import { createCameraSeam } from '../src/activities/cameraSeam.js';
import {
  resolveEscapeAction,
  isTypingTarget,
  createActivityInputManager,
  ESCAPE_TARGETS,
} from '../src/activities/inputSeam.js';
import { FP_MODE } from '../src/cameraControl.js';

test('createCameraSeam cycles world modes and yields to activity camera', () => {
  const modeChanges = [];
  const seam = createCameraSeam({
    initialMode: 0,
    onModeChanged: (m) => modeChanges.push(m),
  });

  assert.equal(seam.worldMode, 0);

  // Normal cycling: 0 -> 1 -> 2 -> 3 (FP) -> 0
  assert.equal(seam.cycleWorldMode(), 1);
  assert.equal(seam.cycleWorldMode(), 2);
  assert.equal(seam.cycleWorldMode(), 3);
  assert.equal(seam.cycleWorldMode(), 0);

  // Now acquire activity camera in mode 2
  seam.setWorldMode(2);
  const customCam = { isCustomCamera: true };
  seam.acquireActivityCamera(customCam);

  assert.equal(seam.isActivityCameraActive, true);
  assert.equal(seam.savedWorldMode, 2);

  // Cycling yields while activity camera is active
  assert.equal(seam.cycleWorldMode(), 2);
  assert.equal(seam.worldMode, 2);

  // Camera resolution returns custom camera
  const dummyCameras = { isoCamera: { name: 'iso' }, fpCamera: { name: 'fp' } };
  assert.equal(seam.resolveActiveCamera(dummyCameras), customCam);

  // Release restores world mode 2
  const { restoredMode } = seam.releaseActivityCamera();
  assert.equal(restoredMode, 2);
  assert.equal(seam.worldMode, 2);
  assert.equal(seam.isActivityCameraActive, false);
  assert.equal(seam.resolveActiveCamera(dummyCameras), dummyCameras.isoCamera);

  // Normal cycling resumes: 2 -> 3 -> 0
  assert.equal(seam.cycleWorldMode(), 3);
  assert.equal(seam.resolveActiveCamera(dummyCameras), dummyCameras.fpCamera);
});

test('createCameraSeam restores all four world views correctly', () => {
  const dummyCameras = { isoCamera: { name: 'iso' }, fpCamera: { name: 'fp' } };

  for (const mode of [0, 1, 2, FP_MODE]) {
    const seam = createCameraSeam({ initialMode: mode });
    assert.equal(seam.worldMode, mode);

    const customCam = { id: `act_cam_${mode}` };
    seam.acquireActivityCamera(customCam);
    assert.equal(seam.resolveActiveCamera(dummyCameras), customCam);

    const { restoredMode } = seam.releaseActivityCamera();
    assert.equal(restoredMode, mode);
    assert.equal(seam.worldMode, mode);
    const resolved = seam.resolveActiveCamera(dummyCameras);
    assert.equal(resolved, mode === FP_MODE ? dummyCameras.fpCamera : dummyCameras.isoCamera);
  }
});

test('resolveEscapeAction enforces strict escape priority hierarchy', () => {
  // 1. Focused input / chat field gets blurred first
  assert.equal(
    resolveEscapeAction({
      hasInputFocused: true,
      hasOpenDialog: true,
      isActivityOccupied: true,
      isSeated: true,
      isCinemaWatching: true,
      isPaused: false,
    }),
    ESCAPE_TARGETS.FOCUSED_INPUT,
  );

  // 2. Open native dialog gets closed before activity
  assert.equal(
    resolveEscapeAction({
      hasInputFocused: false,
      hasOpenDialog: true,
      isActivityOccupied: true,
      isSeated: true,
      isCinemaWatching: true,
      isPaused: false,
    }),
    ESCAPE_TARGETS.OPEN_DIALOG,
  );

  // 3. Activity mode exits locally immediately with safe dismount before seat/cinema/settings
  assert.equal(
    resolveEscapeAction({
      hasInputFocused: false,
      hasOpenDialog: false,
      isActivityOccupied: true,
      isSeated: true,
      isCinemaWatching: true,
      isPaused: false,
    }),
    ESCAPE_TARGETS.ACTIVITY,
  );

  // 4. Seated player stands up before cinema/settings
  assert.equal(
    resolveEscapeAction({
      hasInputFocused: false,
      hasOpenDialog: false,
      isActivityOccupied: false,
      isSeated: true,
      isCinemaWatching: true,
      isPaused: false,
    }),
    ESCAPE_TARGETS.SEAT,
  );

  // 5. Cinema view exits before settings
  assert.equal(
    resolveEscapeAction({
      hasInputFocused: false,
      hasOpenDialog: false,
      isActivityOccupied: false,
      isSeated: false,
      isCinemaWatching: true,
      isPaused: false,
    }),
    ESCAPE_TARGETS.CINEMA,
  );

  // 6. Settings toggles when nothing else is active
  assert.equal(
    resolveEscapeAction({
      hasInputFocused: false,
      hasOpenDialog: false,
      isActivityOccupied: false,
      isSeated: false,
      isCinemaWatching: false,
      isPaused: false,
    }),
    ESCAPE_TARGETS.SETTINGS,
  );

  // When paused by another modal, nothing triggered
  assert.equal(
    resolveEscapeAction({
      hasInputFocused: false,
      hasOpenDialog: false,
      isActivityOccupied: false,
      isSeated: false,
      isCinemaWatching: false,
      isPaused: true,
    }),
    ESCAPE_TARGETS.NONE,
  );
});

test('isTypingTarget correctly identifies editable targets and rejects game canvas', () => {
  assert.equal(isTypingTarget(null), false);
  assert.equal(isTypingTarget({ tagName: 'CANVAS' }), false);
  assert.equal(isTypingTarget({ tagName: 'BUTTON' }), false);
  assert.equal(isTypingTarget({ tagName: 'DIV' }), false);

  assert.equal(isTypingTarget({ tagName: 'INPUT' }), true);
  assert.equal(isTypingTarget({ tagName: 'TEXTAREA' }), true);
  assert.equal(isTypingTarget({ tagName: 'SELECT' }), true);
  assert.equal(isTypingTarget({ isContentEditable: true }), true);

  // With closest() method
  assert.equal(isTypingTarget({ closest: (sel) => sel.includes('input') ? {} : null }), true);
  assert.equal(isTypingTarget({ closest: () => null }), false);
});

test('createActivityInputManager sequences inputs and neutralizes on watchdog or blur', () => {
  const sentInputs = [];
  const manager = createActivityInputManager({
    onInput: (controls, seq) => sentInputs.push({ controls, seq }),
    watchdogMs: 250,
  });

  assert.equal(manager.seq, 0);

  // Sample 1: move paddle up
  const s1 = manager.sampleInput({ moveY: -1 }, 1000);
  assert.equal(s1.seq, 1);
  assert.deepEqual(s1.controls, { moveY: -1 });

  // Sample 2: move paddle down
  const s2 = manager.sampleInput({ moveY: 1 }, 1050);
  assert.equal(s2.seq, 2);
  assert.deepEqual(s2.controls, { moveY: 1 });

  // Watchdog not expired at 1150 (100ms < 250ms)
  assert.equal(manager.checkWatchdog(1150), false);
  assert.equal(manager.isNeutralized, false);

  // Watchdog expires at 1350 (300ms > 250ms) -> neutralizes controls
  assert.equal(manager.checkWatchdog(1350), true);
  assert.equal(manager.isNeutralized, true);
  assert.deepEqual(manager.activeControls, {});
  assert.equal(manager.seq, 3); // incremented for neutral frame

  // Resume and explicit neutralize (e.g. on blur)
  manager.resume();
  manager.sampleInput({ fire: true }, 2000);
  assert.equal(manager.seq, 4);

  manager.neutralize();
  assert.equal(manager.isNeutralized, true);
  assert.deepEqual(manager.activeControls, {});
});
