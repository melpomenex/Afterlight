/**
 * Glacial Glasshouse curling activity (Phase 5, Tasks 8.7 & 8.8).
 *
 * Rink / stone / control / spectator presentation attached to the activity
 * scene. Server owns launch, curl, sweep, collisions and scoring.
 */

import { registerActivityModule } from './registry.js';
import { createCurlingRinkScene } from './curling/rinkScene.js';
import { createCurlingAudio } from './curling/audio.js';
import { createCurlingController } from './curling/controller.js';
import { initCurlingState } from '../../shared/curlingModel.js';
import { bindParticipation, extractActivitySim } from './sessionBind.js';

export function createCurlingInstance({
  activityDef,
  world,
  net,
  generation,
  roomId = 'frost-spire',
  getActiveCamera = null,
  getPlayer = null,
  getParticipation = null,
  audioMixer = null,
} = {}) {
  const transform = activityDef.transform || { position: [0, 0, 1.5], rotationY: 0 };
  const pos = transform.position;
  const rotY = transform.rotationY !== undefined ? transform.rotationY : 0;

  const rinkScene = createCurlingRinkScene({
    position: pos,
    rotationY: rotY,
  });

  if (world?.group && rinkScene.group.parent !== world.group) {
    world.group.add(rinkScene.group);
  }

  const audio = createCurlingAudio({
    audioMixer,
    getPlayer,
    rinkPosition: pos,
  });

  let simState = initCurlingState();
  let mySlot = null;
  let isParticipant = false;
  let seq = 1;
  let lastThrown = 0;
  let lastScore = '0:0';
  let lastStatus = simState.status;

  const controller = createCurlingController({
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
    group: rinkScene.group,
    rinkScene,
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
        controller.enable(0, { spectator: true });
      }
    },

    onLeave() {
      mySlot = null;
      isParticipant = false;
      controller.disable();
    },

    onSnapshot(serverSim) {
      if (!serverSim) return;
      const thrown = serverSim.stonesThrown ?? serverSim.stones?.length ?? 0;
      if (thrown > lastThrown) audio.playLaunch(serverSim.pending?.power || 0.6);
      lastThrown = thrown;

      const s0 = serverSim.score?.[0] ?? serverSim.score?.['0'] ?? 0;
      const s1 = serverSim.score?.[1] ?? serverSim.score?.['1'] ?? 0;
      const scoreKey = `${s0}:${s1}`;
      if (scoreKey !== lastScore && (s0 > 0 || s1 > 0)) audio.playScore();
      lastScore = scoreKey;

      if (serverSim.status !== lastStatus) {
        if (serverSim.outcome === 'forfeit' || serverSim.status === 'aborted') audio.playForfeit();
        lastStatus = serverSim.status;
      }

      simState = serverSim;
    },

    acceptSnapshot(envelope) {
      this.onSnapshot(extractActivitySim(envelope));
    },

    acceptEvent(envelope) {
      const name = envelope?.event || envelope?.name || envelope?.type;
      if (name === 'stone_launched') audio.playLaunch(envelope?.power || 0.6);
      if (name === 'stone_rested' && (envelope?.collision || envelope?.hit)) audio.playCollision();
      if (name === 'match_ended') {
        if (envelope?.reason === 'forfeit') audio.playForfeit();
        else audio.playScore();
      }
    },

    acceptResult(envelope) {
      this.acceptEvent({ type: 'match_ended', ...envelope });
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
      rinkScene.updateVisuals(simState, time);
      controller.update(simState);
    },

    dispose() {
      this.destroy();
    },

    destroy() {
      controller.dispose();
      audio.dispose();
      rinkScene.dispose();
    },
  };
}

export const CurlingModule = {
  initialize: createCurlingInstance,
  createInstance: createCurlingInstance,
};

registerActivityModule('curling', CurlingModule);
