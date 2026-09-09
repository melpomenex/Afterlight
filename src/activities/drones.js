/**
 * Authoritative Rooftop Drone Racing activity module for Afterlight (Phase 5, Tasks 7.2 & 7.3).
 *
 * Implements:
 *   - 3D Drone Scene in High Awnings with 4 quadcopters, launch rack, and 6 aerial checkpoint rings
 *   - Authoritative 60 Hz simulation synchronization across 1 to 4 racers
 *   - Flight controller with WASD/Space/Shift and gamepad support
 *   - Dynamic chase camera for active pilots
 *   - Synthesized positional drone audio (motor whine, gate pings, collision thumps)
 *   - HUD instruments with speed, alt, lap, gate and time telemetry
 */

import { registerActivityModule } from './registry.js';
import { createDroneScene } from './drone/droneScene.js';
import { createDroneAudio } from './drone/audio.js';
import { createDroneController } from './drone/droneController.js';
import { initDroneSimState } from '../../shared/droneModel.js';

export function createDroneInstance({
  activityDef,
  world,
  net,
  generation,
  roomId = 'rooftops',
  getActiveCamera = null,
  getPlayer = null,
  getParticipation = null,
  audioMixer = null,
} = {}) {
  const transform = activityDef.transform || { position: [-3.0, 0, 3.5], rotationY: 0 };
  const pos = transform.position;
  const rotY = transform.rotationY !== undefined ? transform.rotationY : 0;

  // 1. 3D Drone Scene
  const droneScene = createDroneScene({
    position: pos,
    rotationY: rotY,
  });

  if (world?.group && droneScene.group.parent !== world.group) {
    world.group.add(droneScene.group);
  }

  // 2. Positional Audio
  const audio = createDroneAudio({
    audioMixer,
    getPlayer,
    activityPosition: pos,
  });

  // 3. Simulation & Local State
  let simState = initDroneSimState();
  let mySlot = null;
  let isParticipant = false;
  let seq = 1;
  let lastCheckpoints = {};
  let lastCollisions = {};
  let lastStatus = 'lobby';

  // 4. Input & Flight Controller
  const controller = createDroneController({
    getActiveCamera,

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

    onToggleReady: (ready) => {
      if (!isParticipant || !net) return;
      const p = getParticipation?.();
      if (!p) return;

      net.sendActivityReady?.({
        roomId,
        activityId: activityDef.id,
        sessionId: p.sessionId,
        ready,
      });
    },

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
    group: droneScene.group,
    droneScene,
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
        controller.setMatchStatus(simState.status || 'lobby');
      } else {
        mySlot = null;
        isParticipant = false;
        controller.disable();
        audio.stopMotor();
      }
    },

    onLeave() {
      mySlot = null;
      isParticipant = false;
      controller.disable();
      audio.stopMotor();
    },

    onSnapshot(serverSim) {
      if (!serverSim) return;

      // Audio event triggers from snapshot diffs
      if (serverSim.drones) {
        for (const [slotStr, drone] of Object.entries(serverSim.drones)) {
          const slot = Number(slotStr);
          const prevCp = lastCheckpoints[slot];
          const newCp = drone.nextCheckpoint;

          if (prevCp !== undefined && newCp !== prevCp) {
            const isLap = newCp === 1 && prevCp === 0;
            audio.playCheckpoint(isLap);
          }
          lastCheckpoints[slot] = newCp;

          const prevCol = lastCollisions[slot] || 0;
          const newCol = drone.collisionCount || 0;
          if (newCol > prevCol) {
            audio.playCollision(1.2);
          }
          lastCollisions[slot] = newCol;
        }
      }

      if (serverSim.status && serverSim.status !== lastStatus) {
        lastStatus = serverSim.status;
        controller.setMatchStatus(lastStatus, serverSim.winner);
        if (lastStatus === 'complete') {
          audio.playFinish();
        }
      }

      simState = serverSim;
    },

    acceptSnapshot(envelope) {
      const state = envelope?.sim || envelope?.state || envelope?.simState || envelope;
      this.onSnapshot(state);
    },

    acceptEvent(envelope) {
      const name = envelope?.event || envelope?.name || envelope?.type;
      if (name === 'match_started') {
        controller.setMatchStatus('racing');
      } else if (name === 'match_ended') {
        controller.setMatchStatus('complete', envelope?.winner);
        audio.playFinish();
      }
    },

    acceptResult(envelope) {
      controller.setMatchStatus('complete', envelope?.winner);
      audio.playFinish();
    },

    acceptError() {},

    update(time, delta) {
      // 1. Advance visual 3D scene (drones and checkpoint rings)
      droneScene.updateVisuals(simState, time);

      // 2. Advance controller telemetry & chase camera
      if (isParticipant) {
        controller.update(simState);

        // Update motor sound based on active player's drone
        if (mySlot !== null && simState.drones) {
          const myDrone = simState.drones[mySlot] ?? simState.drones[String(mySlot)];
          if (myDrone && !myDrone.finished && !myDrone.dnf) {
            const [vx, vy, vz] = myDrone.velocity || [0, 0, 0];
            const speed = Math.hypot(vx, vy, vz);
            audio.updateMotor(0.5, speed);
          } else {
            audio.stopMotor();
          }
        }
      } else {
        audio.stopMotor();
      }
    },

    dispose() {
      this.destroy();
    },

    destroy() {
      controller.dispose();
      audio.dispose();
      droneScene.dispose();
    },
  };
}

export const DroneModule = {
  initialize: createDroneInstance,
  createInstance: createDroneInstance,
};

registerActivityModule('drones', DroneModule);
