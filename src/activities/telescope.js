/**
 * Desert Camp telescope activity module (Task 8.6).
 *
 * Shared seeded sky, live environment timestamps, eye-through-scope camera,
 * cooperative marks, and a noncompetitive exit.
 */

import { registerActivityModule } from './registry.js';
import { createTelescopeSkyScene } from './telescope/skyScene.js';
import { createTelescopeEyeCamera } from './telescope/eyeCamera.js';
import { createTelescopeController } from './telescope/controller.js';
import { initTelescopeSimState } from '../../shared/telescopeModel.js';

export function createTelescopeInstance({
  activityDef,
  world,
  net,
  generation = 0,
  roomId = 'desert-camp',
  getParticipation = null,
  setActivityCamera = null,
  clearActivityCamera = null,
  acquireView = null,
  releaseView = null,
} = {}) {
  const transform = activityDef.transform || { position: [-6.5, 0, -5.5], rotationY: 0 };
  const pos = transform.position;
  const skyScene = createTelescopeSkyScene({ position: pos });

  if (world?.group && skyScene.group.parent !== world.group) {
    world.group.add(skyScene.group);
  }

  const eye = createTelescopeEyeCamera({
    eyepiece: [pos[0], 1.15, pos[2] ?? pos[1]],
    setActivityCamera,
    clearActivityCamera,
    acquireView,
    releaseView,
    generation,
    owner: `telescope:${activityDef.id}`,
  });

  let simState = initTelescopeSimState({ now: Date.now() });
  let mySlot = null;
  let isObserver = false;
  let seq = 1;

  function send(controls) {
    if (!isObserver || mySlot === null || !net) return;
    const p = getParticipation?.();
    if (!p) return;
    const currentLease = typeof p.lease === 'string' ? p.lease : p.lease?.id || 'lease-1';
    const inputSeq = net.nextActivitySeq?.(activityDef.id) ?? (seq++);
    const liveNow = Date.now();
    net.sendActivityInput?.({
      roomId,
      activityId: activityDef.id,
      sessionId: p.sessionId,
      lease: currentLease,
      seq: inputSeq,
      controls: {
        ...controls,
        now: liveNow,
        timePhase: simState.environment?.timePhase,
      },
    });
    if (controls.kind === 'look') {
      eye.updateLook(controls.yaw, controls.pitch);
    }
  }

  const controller = createTelescopeController({
    onSend: send,
    onLeave: () => {
      send({ kind: 'leave' });
      const p = getParticipation?.();
      if (p && net) {
        net.sendActivityLeave?.({
          roomId,
          activityId: activityDef.id,
          sessionId: p.sessionId,
        });
      }
      eye.release();
      controller.disable();
    },
  });

  return {
    id: activityDef.id,
    type: activityDef.type,
    group: skyScene.group,
    skyScene,
    eye,
    controller,

    getSimState() {
      return simState;
    },

    onJoin({ slot, role }) {
      if (typeof slot === 'number' && (role === 'player' || role === 'spectator' || role === 'focused')) {
        mySlot = slot;
        isObserver = true;
        controller.enable();
        eye.acquire();
      } else {
        mySlot = null;
        isObserver = false;
        controller.disable();
        eye.release();
      }
    },

    onLeave() {
      mySlot = null;
      isObserver = false;
      controller.disable();
      eye.release();
    },

    onSnapshot(serverSim) {
      if (!serverSim) return;
      simState = serverSim;
    },

    acceptSnapshot(envelope) {
      const state = envelope?.sim || envelope?.state || envelope?.simState || envelope;
      this.onSnapshot(state);
    },

    acceptEvent() {},
    acceptResult() {},
    acceptError() {},

    update() {
      skyScene.updateVisuals(simState);
      if (isObserver) {
        controller.update(simState);
        const look = controller.look;
        eye.updateLook(look.yaw, look.pitch);
      }
    },

    dispose() {
      this.destroy();
    },

    destroy() {
      controller.dispose();
      eye.dispose();
      skyScene.dispose();
    },
  };
}

export const TelescopeModule = {
  initialize: createTelescopeInstance,
  createInstance: createTelescopeInstance,
};

registerActivityModule('telescope', TelescopeModule);
