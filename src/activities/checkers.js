/**
 * Rain Court English draughts activity (Phase 5, Task 8.3).
 *
 * Server-owned rules live in `shared/checkersModel.js`. This module
 * mounts the physical table on the active world group, renders the
 * shared board, and sends move/resign/draw controls.
 */

import { registerActivityModule } from './registry.js';
import { createCheckersTableScene } from './checkers/tableScene.js';
import { createCheckersAudio } from './checkers/audio.js';
import { createCheckersController } from './checkers/controller.js';
import { CHECKERS_TABLE_POSITION, initCheckersSimState } from '../../shared/checkersModel.js';

export function createCheckersInstance({
  activityDef,
  world,
  net,
  generation,
  roomId = 'court',
  getActiveCamera = null,
  getPlayer = null,
  getParticipation = null,
  getCanvas = null,
  audioMixer = null,
} = {}) {
  const transform = activityDef?.transform || { position: CHECKERS_TABLE_POSITION, rotationY: 0 };
  const pos = transform.position || CHECKERS_TABLE_POSITION;
  const rotY = transform.rotationY !== undefined ? transform.rotationY : 0;

  const tableScene = createCheckersTableScene({
    position: pos,
    rotationY: rotY,
  });

  if (world?.group && tableScene.group.parent !== world.group) {
    world.group.add(tableScene.group);
  }

  const audio = createCheckersAudio({
    audioMixer,
    getPlayer,
    tablePosition: pos,
  });

  let simState = initCheckersSimState();
  let mySlot = null;
  let isParticipant = false;
  let seq = 1;
  let lastPly = 0;

  const controller = createCheckersController({
    getActiveCamera,
    getCanvas,
    tableScene,
    onSendInput: (controls) => {
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

  tableScene.updateVisuals(simState, 0);
  controller.setSimState(simState);

  function adopt(serverSim) {
    if (!serverSim) return;
    const prev = simState;
    simState = serverSim;
    const ply = serverSim.ply || 0;
    if (ply > lastPly) {
      const move = serverSim.lastMove;
      audio.playMove(move?.captures?.length || 0, Boolean(move?.promoted));
      lastPly = ply;
    }
    if (serverSim.status === 'complete' && prev?.status !== 'complete') {
      audio.playEnded(serverSim.result);
    }
    controller.setSimState(simState);
  }

  return {
    id: activityDef?.id,
    type: activityDef?.type || 'checkers',
    group: tableScene.group,
    tableScene,
    controller,
    audio,
    generation,

    getSimState() {
      return simState;
    },

    onJoin({ slot, role } = {}) {
      if (role === 'player' && typeof slot === 'number') {
        mySlot = slot;
        isParticipant = true;
        controller.enable(slot);
      } else {
        mySlot = null;
        isParticipant = false;
        controller.disable();
      }
      controller.setSimState(simState);
    },

    onLeave() {
      mySlot = null;
      isParticipant = false;
      controller.disable();
    },

    onSnapshot(serverSim) {
      adopt(serverSim);
    },

    acceptSnapshot(envelope) {
      const state = envelope?.sim || envelope?.state || envelope?.simState || envelope;
      this.onSnapshot(state);
    },

    acceptEvent(envelope) {
      const name = envelope?.event || envelope?.name || envelope?.type;
      const data = envelope?.data || envelope?.payload || envelope;
      if (name === 'illegal_move') {
        audio.playIllegal();
        return;
      }
      if (data?.board || data?.sim) {
        adopt(data.sim || data);
      }
      if (name === 'match_ended') {
        audio.playEnded(data?.result || envelope?.result);
      }
    },

    acceptResult(envelope) {
      audio.playEnded(envelope?.result);
      if (envelope?.sim) adopt(envelope.sim);
    },

    acceptError(envelope) {
      if (envelope?.reason === 'illegal_move' || envelope?.code === 'illegal_move') {
        audio.playIllegal();
      }
    },

    update(time) {
      tableScene.updateVisuals(simState, time);
      if (isParticipant) controller.update(simState);
    },

    dispose() {
      this.destroy();
    },

    destroy() {
      controller.dispose();
      audio.dispose();
      tableScene.dispose();
    },
  };
}

export const CheckersModule = {
  initialize: createCheckersInstance,
  createInstance: createCheckersInstance,
};

registerActivityModule('checkers', CheckersModule);
