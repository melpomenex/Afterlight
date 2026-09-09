/**
 * Authoritative Rain Court Gutter Boats activity module for Afterlight (Phase 5, Task 7.5).
 *
 * Implements:
 *   - 3D quad-lane copper gutter race trough with water flow and miniature wooden boats
 *   - Current speed influenced by real-time rain intensity and wind vectors
 *   - Synchronized race state and sub-tick finish timing
 *   - Push boost control and race progress HUD
 *   - Water splash, start gate clatter, and finish bell audio effects
 */

import { registerActivityModule } from './registry.js';
import { createGutterBoatScene } from './gutterBoat/boatScene.js';
import { createGutterBoatAudio } from './gutterBoat/audio.js';
import { createGutterBoatController } from './gutterBoat/boatController.js';
import { initGutterBoatState } from '../../shared/gutterBoatModel.js';
import { bindParticipation, extractActivitySim } from './sessionBind.js';

export function createGutterBoatInstance({
  activityDef,
  world,
  net,
  generation,
  roomId = 'court',
  getActiveCamera = null,
  getPlayer = null,
  getParticipation = null,
  audioMixer = null,
} = {}) {
  const transform = activityDef.transform || { position: [-4.5, 0, 2.5], rotationY: 0 };
  const pos = transform.position;
  const rotY = transform.rotationY !== undefined ? transform.rotationY : 0;

  // 1. 3D Scene
  const boatScene = createGutterBoatScene({
    position: pos,
    rotationY: rotY,
  });

  if (world?.group && boatScene.group.parent !== world.group) {
    world.group.add(boatScene.group);
  }

  // 2. Audio Effects
  const audio = createGutterBoatAudio({
    audioMixer,
    getPlayer,
    troughPosition: pos,
  });

  // 3. Local Simulation State
  let simState = initGutterBoatState();
  let mySlot = null;
  let isParticipant = false;
  let seq = 1;

  // 4. Player Controller & Race HUD
  const controller = createGutterBoatController({
    getActiveCamera,

    onSendPush: () => {
      if (!isParticipant || mySlot === null || !net) return;
      const p = getParticipation?.();
      if (!p) return;

      audio.playPush();

      const currentLease = typeof p.lease === 'string' ? p.lease : p.lease?.id || 'lease-1';
      const inputSeq = net.nextActivitySeq?.(activityDef.id) ?? (seq++);

      net.sendActivityInput?.({
        roomId,
        activityId: activityDef.id,
        sessionId: p.sessionId,
        lease: currentLease,
        seq: inputSeq,
        controls: { kind: 'push' },
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
        audio.playGateRelease();
        controller.enable(slot);
        controller.trackBoatMesh(boatScene.getBoatMesh(slot));
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

      if (serverSim.status === 'complete' && simState.status !== 'complete') {
        audio.playFinishBell();
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

      if (name === 'boat_pushed') {
        audio.playPush();
      } else if (name === 'boat_finished') {
        audio.playFinishBell();
      } else if (name === 'race_complete' || name === 'match_ended') {
        audio.playFinishBell();
        audio.playVictory();
      }
    },

    acceptResult(envelope) {
      audio.playFinishBell();
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
      boatScene.updateVisuals(simState, time);

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
      boatScene.dispose();
    },
  };
}

export const GutterBoatsModule = {
  initialize: createGutterBoatInstance,
  createInstance: createGutterBoatInstance,
};

registerActivityModule('gutter-boats', GutterBoatsModule);
