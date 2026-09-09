/**
 * Desert Camp horseshoes activity module (Task 8.5).
 */

import { registerActivityModule } from './registry.js';
import { createHorseshoePitScene } from './horseshoes/pitScene.js';
import { createHorseshoeController } from './horseshoes/controller.js';
import { initHorseshoeSimState } from '../../shared/horseshoesModel.js';
import { bindParticipation, extractActivitySim } from './sessionBind.js';

export function createHorseshoeInstance({
  activityDef,
  world,
  net,
  roomId = 'desert-camp',
  getParticipation = null,
} = {}) {
  const transform = activityDef.transform || { position: [8, 0, 5.5], rotationY: 0 };
  const pos = transform.position;
  const pitScene = createHorseshoePitScene({
    position: pos,
    rotationY: transform.rotationY || 0,
  });

  if (world?.group && pitScene.group.parent !== world.group) {
    world.group.add(pitScene.group);
  }

  let simState = initHorseshoeSimState();
  let mySlot = null;
  let isParticipant = false;
  let seq = 1;

  const controller = createHorseshoeController({
    onSendThrow: (controls) => {
      if (!isParticipant || mySlot === null || !net) return;
      const p = getParticipation?.();
      if (!p) return;
      const currentLease = typeof p.lease === 'string' ? p.lease : p.lease?.id || 'lease-1';
      const inputSeq = net.nextActivitySeq?.(activityDef.id) ?? (seq++);
      net.sendActivityInput?.({
        roomId,
        activityId: activityDef.id,
        sessionId: p.sessionId,
        lease: currentLease,
        seq: inputSeq,
        controls,
      });
    },
    onLeave: () => {
      if (!net) return;
      const p = getParticipation?.();
      if (!p) return;
      net.sendActivityLeave?.({
        roomId,
        activityId: activityDef.id,
        sessionId: p.sessionId,
      });
    },
  });

  return {
    id: activityDef.id,
    type: activityDef.type,
    group: pitScene.group,
    pitScene,
    controller,

    getSimState() {
      return simState;
    },

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

    acceptEvent() {},
    acceptResult() {},
    acceptError() {},

    update() {
      bindParticipation({
        getParticipation,
        activityId: activityDef.id,
        isParticipant,
        onJoin: (info) => this.onJoin(info),
        onLeave: () => this.onLeave(),
      });
      pitScene.updateVisuals(simState);
      if (isParticipant) controller.update(simState);
    },

    dispose() {
      this.destroy();
    },

    destroy() {
      controller.dispose();
      pitScene.dispose();
    },
  };
}

export const HorseshoesModule = {
  initialize: createHorseshoeInstance,
  createInstance: createHorseshoeInstance,
};

registerActivityModule('horseshoes', HorseshoesModule);
