/**
 * Shoreline fishing activity — Basin (mangrove) and Marshes (delta).
 *
 * One module per type, reused via activityDef.transform. Live weather.
 * Catch/release is social display only.
 */

import { registerActivityModule } from './registry.js';
import { createFishingScene } from './fishing/scene.js';
import { createFishingAudio } from './fishing/audio.js';
import { createFishingController } from './fishing/controller.js';
import { initFishingState } from '../../shared/fishingModel.js';
import { bindParticipation, extractActivitySim } from './sessionBind.js';

export function createFishingInstance({
  activityDef,
  world,
  net,
  roomId = 'mangrove',
  getPlayer = null,
  getParticipation = null,
  audioMixer = null,
} = {}) {
  const transform = activityDef.transform || { position: [6, 0, 3], rotationY: 0 };
  const pos = transform.position;
  const rotY = transform.rotationY !== undefined ? transform.rotationY : 0;

  const scene = createFishingScene({ position: pos, rotationY: rotY });
  if (world?.group && scene.group.parent !== world.group) {
    world.group.add(scene.group);
  }

  const audio = createFishingAudio({ audioMixer, getPlayer, dockPosition: pos });
  let simState = initFishingState();
  let mySlot = null;
  let isParticipant = false;
  let seq = 1;

  function sendInput(controls) {
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

  const controller = createFishingController({
    title: activityDef.title || 'Shoreline Fishing',
    onSendInput: (controls) => {
      if (controls.kind === 'cast') audio.playCast();
      if (controls.kind === 'reel') audio.playReel();
      if (controls.kind === 'release') audio.playRelease();
      sendInput(controls);
    },
    onLeave: () => {
      sendInput({ kind: 'leave' });
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
      mySlot = null;
      isParticipant = false;
      controller.disable();
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
      if (name === 'line_cast' || name === 'bobber_landed') audio.playCast();
      if (name === 'bite') audio.playBite();
      if (name === 'fish_hooked' || name === 'catch') audio.playReel();
      if (name === 'fish_released') audio.playRelease();
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

export const FishingModule = {
  initialize: createFishingInstance,
  createInstance: createFishingInstance,
};

registerActivityModule('fishing', FishingModule);
