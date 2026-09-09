/**
 * Authoritative Sluiceworks RC Speedboats activity module for Afterlight (Phase 5, Task 7.6).
 *
 * Implements:
 *   - 3D floating buoy circuit and miniature racing hydroplanes in Sluiceworks canal basin
 *   - Rudder steering and electric motor throttle with water drag & wall bounce
 *   - Buoy checkpoint sequence tracking and lap timing
 *   - Positional electric motor whine, buoy chimes, and finish bells
 *   - Manual reset/recovery and DNF marking
 */

import { registerActivityModule } from './registry.js';
import { createRcBoatScene } from './rcBoat/boatScene.js';
import { createRcBoatAudio } from './rcBoat/audio.js';
import { createRcBoatController } from './rcBoat/boatController.js';
import { initRcBoatSimState } from '../../shared/rcBoatModel.js';

export function createRcBoatInstance({
  activityDef,
  world,
  net,
  generation,
  roomId = 'canal',
  getActiveCamera = null,
  getPlayer = null,
  getParticipation = null,
  audioMixer = null,
} = {}) {
  const transform = activityDef.transform || { position: [3.8, 0, 2.0], rotationY: -Math.PI / 2 };
  const pos = transform.position;
  const rotY = transform.rotationY !== undefined ? transform.rotationY : -Math.PI / 2;

  // 1. 3D Scene
  const boatScene = createRcBoatScene({
    position: pos,
    rotationY: rotY,
  });

  if (world?.group && boatScene.group.parent !== world.group) {
    world.group.add(boatScene.group);
  }

  // 2. Audio Effects
  const audio = createRcBoatAudio({
    audioMixer,
    getPlayer,
    consolePosition: pos,
  });

  // 3. Local Simulation State
  let simState = initRcBoatSimState();
  let mySlot = null;
  let isParticipant = false;
  let seq = 1;
  let lastSendTime = 0;

  // 4. Pilot Controller & Telemetry HUD
  const controller = createRcBoatController({
    getActiveCamera,

    onLeave: () => {
      if (!isParticipant || !net) return;
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
    group: boatScene.group,
    boatScene,
    controller,
    audio,

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
        audio.updateMotor(0, false);
      }
    },

    onLeave() {
      mySlot = null;
      isParticipant = false;
      controller.disable();
      audio.updateMotor(0, false);
    },

    onSnapshot(serverSim) {
      if (!serverSim) return;

      if (serverSim.status === 'complete' && simState.status !== 'complete') {
        audio.playVictory();
      }

      simState = serverSim;
    },

    acceptSnapshot(envelope) {
      const state = envelope?.sim || envelope?.state || envelope?.simState || envelope;
      this.onSnapshot(state);
    },

    acceptEvent(envelope) {
      const name = envelope?.event || envelope?.name || envelope?.type;
      const data = envelope?.data || envelope?.payload || envelope;

      if (name === 'checkpoint_cleared') {
        if (data.slot === mySlot) audio.playCheckpoint();
      } else if (name === 'lap_completed') {
        audio.playLapBell();
      } else if (name === 'boat_collision') {
        if (data.slot === mySlot) audio.playCollision();
      } else if (name === 'race_complete' || name === 'match_ended') {
        audio.playVictory();
      }
    },

    acceptResult(envelope) {
      audio.playVictory();
    },

    acceptError() {},

    update(time, delta) {
      // 1. Advance visual 3D scene (buoys bobbing, boat postures, water spray)
      boatScene.updateVisuals(simState, time);

      // 2. Sample and send controls if participant
      if (isParticipant && mySlot !== null) {
        controller.update(simState);

        const myBoat = simState.boats?.[mySlot] || simState.boats?.[String(mySlot)];
        if (myBoat && !myBoat.finished && !myBoat.dnf) {
          audio.updateMotor(myBoat.speed || 0, true);

          // Rate-limit inputs to ~60 Hz / 16ms
          if (time - lastSendTime >= 0.016) {
            lastSendTime = time;
            const controls = controller.pollControls();
            const p = getParticipation?.();

            if (p && net?.sendActivityInput) {
              const currentLease = typeof p.lease === 'string' ? p.lease : p.lease?.id || 'lease-1';
              const inputSeq = net.nextActivitySeq?.(activityDef.id) ?? (seq++);

              net.sendActivityInput({
                roomId,
                activityId: activityDef.id,
                sessionId: p.sessionId,
                lease: currentLease,
                seq: inputSeq,
                controls,
              });
            }
          }
        } else {
          audio.updateMotor(0, false);
        }
      } else {
        audio.updateMotor(0, false);
      }
    },

    dispose() {
      this.destroy();
    },

    destroy() {
      controller.dispose();
      audio.dispose();
      boatScene.dispose();
    },
  };
}

export const RcBoatsModule = {
  initialize: createRcBoatInstance,
  createInstance: createRcBoatInstance,
};

registerActivityModule('rc-boats', RcBoatsModule);
