/**
 * Skipping stones activity — Basin (mangrove) and Marshes (delta).
 *
 * Frozen start wind/rain. Shared skip/distance outcomes. Per-throw cleanup.
 */

import { registerActivityModule } from './registry.js';
import { createSkippingScene } from './skippingStones/scene.js';
import { createSkippingAudio } from './skippingStones/audio.js';
import { createSkippingController } from './skippingStones/controller.js';
import { initSkippingState } from '../../shared/skippingStonesModel.js';
import { bindParticipation, extractActivitySim } from './sessionBind.js';

export function createSkippingStonesInstance({
  activityDef,
  world,
  net,
  roomId = 'mangrove',
  getPlayer = null,
  getParticipation = null,
  audioMixer = null,
} = {}) {
  const transform = activityDef.transform || { position: [-5.5, 0, 4], rotationY: 0 };
  const pos = transform.position;
  const rotY = transform.rotationY !== undefined ? transform.rotationY : 0;

  const scene = createSkippingScene({ position: pos, rotationY: rotY });
  if (world?.group && scene.group.parent !== world.group) {
    world.group.add(scene.group);
  }

  const audio = createSkippingAudio({ audioMixer, getPlayer, shorePosition: pos });
  let simState = initSkippingState();
  let mySlot = null;
  let isParticipant = false;
  let seq = 1;

  function sendControls(controls) {
    if (!isParticipant || mySlot === null || !net) return;
    const p = getParticipation?.();
    if (!p) return;
    const lease = typeof p.lease === 'string' ? p.lease : p.lease?.id || 'lease-1';
    const inputSeq = net.nextActivitySeq?.(activityDef.id) ?? (seq++);
    net.sendActivityInput?.({
      roomId,
      activityId: activityDef.id,
      sessionId: p.sessionId,
      lease,
      seq: inputSeq,
      controls,
    });
  }

  const controller = createSkippingController({
    title: activityDef.title || 'Skipping Stones',
    onSendLaunch: (controls) => {
      audio.playLaunch(controls.power || 0.65);
      sendControls(controls);
    },
    onLeave: () => {
      sendControls({ kind: 'leave' });
      const p = getParticipation?.();
      if (p) net?.sendActivityLeave?.({ roomId, activityId: activityDef.id, sessionId: p.sessionId });
    },
  });

  return {
    id: activityDef.id,
    type: activityDef.type,
    group: scene.group,
    getSimState() { return simState; },
    onJoin({ slot, role }) {
      if (role === 'player' && typeof slot === 'number') {
        mySlot = slot;
        isParticipant = true;
        controller.enable(slot);
      } else {
        mySlot = null;
        isParticipant = false;
        controller.disable();
      }
    },
    onLeave() {
      const slot = mySlot;
      mySlot = null;
      isParticipant = false;
      controller.disable();
      if (slot !== null) scene.clearSlot(slot);
    },
    onSnapshot(serverSim) {
      if (!serverSim) return;
      simState = serverSim;
    },
    acceptSnapshot(envelope) {
      this.onSnapshot(extractActivitySim(envelope));
    },
    acceptEvent(envelope) {
      const name = envelope?.event || envelope?.name || envelope?.type;
      const data = envelope?.data || envelope?.payload || envelope;
      if (name === 'stone_launched') {
        audio.playLaunch(data?.launch?.power || 0.65);
        scene.playThrow(data.slot, data);
      } else if (name === 'stone_sunk') {
        audio.playSink();
      } else if (name === 'stone_cleared') {
        scene.clearSlot(data.slot);
      }
    },
    acceptResult() {},
    acceptError() {},
    update(time) {
      bindParticipation({
        getParticipation,
        activityId: activityDef.id,
        isParticipant,
        onJoin: (info) => this.onJoin(info),
        onLeave: () => this.onLeave(),
      });
      scene.updateVisuals(simState, time);
      if (isParticipant) controller.update(simState);
    },
    dispose() { this.destroy(); },
    destroy() {
      controller.dispose();
      audio.dispose();
      scene.dispose();
    },
  };
}

export const SkippingStonesModule = {
  initialize: createSkippingStonesInstance,
  createInstance: createSkippingStonesInstance,
};

registerActivityModule('skipping-stones', SkippingStonesModule);
