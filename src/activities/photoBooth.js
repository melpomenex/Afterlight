/**
 * Orpheum photo booth (Task 9.8). Opt-in roster, four poses, local strip only.
 */

import { registerActivityModule } from './registry.js';
import { createPhotoBoothScene } from './photoBooth/boothScene.js';
import { createPhotoBoothController } from './photoBooth/boothController.js';
import { captureBoothStrip, downloadLocalStrip } from './photoBooth/capture.js';
import {
  applyPhotoBoothInput,
  initPhotoBoothState,
  photoBoothCaptureSubjects,
} from '../../shared/photoBoothModel.js';

export { captureBoothStrip, downloadLocalStrip };

export function createPhotoBoothInstance({
  activityDef,
  world,
  net,
  roomId = 'theater',
  getParticipation = null,
} = {}) {
  const transform = activityDef?.transform || { position: [2.4, 0, 8.2], rotationY: 0 };
  const pos = transform.position;
  const scene = createPhotoBoothScene({ position: pos, rotationY: transform.rotationY || 0 });
  if (world?.group && scene.group.parent !== world.group) world.group.add(scene.group);

  let simState = initPhotoBoothState({ activeSlots: [0, 1, 2] });
  let mySlot = null;
  let isParticipant = false;
  let seq = 1;
  let commitId = 1;
  let localStrip = null;
  const capturedPoses = [];

  function send(controls) {
    const payload = { ...controls, commitId: commitId++ };
    if (net && isParticipant && mySlot != null) {
      const p = getParticipation?.();
      if (!p) return;
      const lease = typeof p.lease === 'string' ? p.lease : p.lease?.id || 'lease-1';
      net.sendActivityInput?.({
        roomId,
        activityId: activityDef.id,
        sessionId: p.sessionId,
        lease,
        seq: net.nextActivitySeq?.(activityDef.id) ?? seq++,
        controls: payload,
      });
    } else if (isParticipant && mySlot != null) {
      const applied = applyPhotoBoothInput(simState, mySlot, payload);
      simState = applied.simState;
    }
  }

  function grabPose() {
    const subjects = photoBoothCaptureSubjects(simState);
    capturedPoses.push({
      pose: simState.poses?.[simState.poseIndex] || 'wave',
      poseIndex: simState.poseIndex || 0,
      slots: [...subjects.slots],
    });
  }

  function finishStrip() {
    const subjects = photoBoothCaptureSubjects(simState);
    localStrip = captureBoothStrip({ subjects, poses: simState.poses });
  }

  const controller = createPhotoBoothController({
    onAccept: () => send({ kind: 'accept' }),
    onDecline: () => send({ kind: 'decline' }),
    onStart: () => send({ kind: 'start' }),
    onDownload: () => {
      if (localStrip) downloadLocalStrip(localStrip);
    },
    onLeave: () => {
      send({ kind: 'depart' });
      if (!isParticipant || !net) return;
      const p = getParticipation?.();
      if (!p) return;
      net.sendActivityLeave?.({ roomId, activityId: activityDef.id, sessionId: p.sessionId });
    },
  });

  return {
    id: activityDef.id,
    type: activityDef.type,
    group: scene.group,
    getSimState() { return simState; },
    getLocalStrip() { return localStrip; },
    onJoin({ slot, role }) {
      if (role === 'player' && typeof slot === 'number') {
        mySlot = slot;
        isParticipant = true;
        controller.enable();
      } else {
        mySlot = null;
        isParticipant = false;
        controller.disable();
      }
    },
    onLeave() {
      send({ kind: 'depart' });
      mySlot = null;
      isParticipant = false;
      controller.disable();
    },
    onSnapshot(serverSim) {
      if (!serverSim) return;
      const prev = simState.status;
      const prevPose = simState.poseIndex;
      simState = serverSim;
      if (simState.status === 'posing' && (prev !== 'posing' || prevPose !== simState.poseIndex)) {
        grabPose();
      }
      if (simState.stripReady && prev !== 'ready') finishStrip();
    },
    acceptSnapshot(envelope) {
      this.onSnapshot(envelope?.sim || envelope?.state || envelope?.simState || envelope);
    },
    acceptEvent(envelope) {
      const name = envelope?.event || envelope?.name || envelope?.type;
      const data = envelope?.data || envelope?.payload || envelope;
      if (name === 'pose') {
        simState = { ...simState, status: 'posing', poseIndex: data.poseIndex, poses: simState.poses };
        grabPose();
      }
      if (name === 'strip_ready') finishStrip();
    },
    acceptResult() { finishStrip(); },
    acceptError() {},
    neutralizeInput() {},
    update(time) {
      scene.updateVisuals(simState, time);
      if (isParticipant) controller.update(simState);
    },
    dispose() { this.destroy(); },
    destroy() {
      controller.dispose();
      scene.dispose();
      localStrip = null;
    },
  };
}

export const PhotoBoothModule = {
  initialize: createPhotoBoothInstance,
  createInstance: createPhotoBoothInstance,
};

registerActivityModule('photo-booth', PhotoBoothModule);
