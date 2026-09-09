/**
 * Authoritative Rooftop Paper Airplanes activity module for Afterlight (Phase 5, Task 7.4).
 *
 * Implements:
 *   - 3D Launch desk and folded origami gliders on High Awnings overlook
 *   - Aerodynamic flight simulation with angle/pitch/power and frozen wind
 *   - Synchronized trajectory playback across spectators and racers
 *   - Interactive aiming HUD with power charging and fold style selection
 *   - Positional flight audio (paper rustle, throw whoosh, glide whistle, touchdown tap)
 */

import { registerActivityModule } from './registry.js';
import { createPaperAirplaneScene } from './paperAirplane/airplaneScene.js';
import { createPaperAirplaneAudio } from './paperAirplane/audio.js';
import { createPaperAirplaneController } from './paperAirplane/airplaneController.js';
import { initAirplaneSimState } from '../../shared/paperAirplaneModel.js';
import { bindParticipation, extractActivitySim } from './sessionBind.js';

export function createPaperAirplaneInstance({
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
  const transform = activityDef.transform || { position: [7.5, 0, -7.5], rotationY: 0 };
  const pos = transform.position;
  const rotY = transform.rotationY !== undefined ? transform.rotationY : 0;

  // 1. 3D Scene
  const airplaneScene = createPaperAirplaneScene({
    position: pos,
    rotationY: rotY,
  });

  if (world?.group && airplaneScene.group.parent !== world.group) {
    world.group.add(airplaneScene.group);
  }

  // 2. Audio Effects
  const audio = createPaperAirplaneAudio({
    audioMixer,
    getPlayer,
    tablePosition: pos,
  });

  // 3. Simulation & Local State
  let simState = initAirplaneSimState();
  let mySlot = null;
  let isParticipant = false;
  let seq = 1;

  // 4. Launch Controller & Aiming HUD
  const controller = createPaperAirplaneController({
    getActiveCamera,

    onSendLaunch: (controls) => {
      if (!isParticipant || mySlot === null || !net) return;
      const p = getParticipation?.();
      if (!p) return;

      audio.playLaunch(controls.power || 0.6);

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
    group: airplaneScene.group,
    airplaneScene,
    controller,
    audio,

    getSimState() {
      return simState;
    },

    onJoin({ slot, role }) {
      if (role === 'player' && typeof slot === 'number') {
        mySlot = slot;
        isParticipant = true;
        audio.playPaperFold();
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

      // Check for newly launched flights in snapshot
      if (serverSim.players) {
        for (const [slotStr, p] of Object.entries(serverSim.players)) {
          const slot = Number(slotStr);
          if (p.currentFlight && p.currentFlight !== simState.players?.[slotStr]?.currentFlight) {
            airplaneScene.playTrajectory(slot, p.currentFlight);
            if (slot === mySlot) {
              controller.trackFlightMesh(airplaneScene.getPlaneMesh(slot));
            }
          }
        }
      }

      if (serverSim.status === 'complete' && simState.status !== 'complete') {
        audio.playVictory();
      }

      simState = serverSim;
    },

    acceptSnapshot(envelope) {
      this.onSnapshot(extractActivitySim(envelope));
    },

    acceptEvent(envelope) {
      const name = envelope?.event || envelope?.name || envelope?.type;
      const data = envelope?.data || envelope?.payload || envelope;

      if (name === 'airplane_launched') {
        const slot = data.slot;
        audio.playLaunch(data.launch?.power || 0.6);
        airplaneScene.playTrajectory(slot, data);
        if (slot === mySlot) {
          controller.trackFlightMesh(airplaneScene.getPlaneMesh(slot));
        }
      } else if (name === 'match_ended') {
        audio.playVictory();
      }
    },

    acceptResult(envelope) {
      audio.playVictory();
    },

    acceptError() {},

    update(time, delta) {
      bindParticipation({
        getParticipation,
        activityId: activityDef.id,
        isParticipant,
        onJoin: (info) => this.onJoin(info),
        onLeave: () => this.onLeave(),
      });
      airplaneScene.updateVisuals(simState, time);

      if (isParticipant) {
        controller.update(simState);
      }
    },

    dispose() {
      this.destroy();
    },

    destroy() {
      controller.dispose();
      audio.dispose();
      airplaneScene.dispose();
    },
  };
}

export const PaperAirplanesModule = {
  initialize: createPaperAirplaneInstance,
  createInstance: createPaperAirplaneInstance,
};

registerActivityModule('paper-airplanes', PaperAirplanesModule);
