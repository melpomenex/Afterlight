/**
 * Rustfall Foundry Hammer Strike activity (Phase 5, Task 9.1).
 *
 * Timing sample → authoritative score → spatial bell. Mute and leave
 * cut every voice. No economy writes.
 */

import { registerActivityModule } from './registry.js';
import { createHammerStrikeScene } from './hammerStrike/scene.js';
import { createHammerStrikeAudio } from './hammerStrike/audio.js';
import { createHammerStrikeController } from './hammerStrike/controller.js';
import { applyHammerInput, initHammerSimState } from '../../shared/hammerStrikeModel.js';
import { bindParticipation, extractActivitySim } from './sessionBind.js';

export function createHammerStrikeInstance({
  activityDef,
  world,
  net,
  roomId = 'foundry',
  getPlayer = null,
  getParticipation = null,
  audioMixer = null,
} = {}) {
  const transform = activityDef?.transform || { position: [-5.5, 0, 2.5], rotationY: 0 };
  const pos = transform.position;
  const rotY = transform.rotationY !== undefined ? transform.rotationY : 0;

  const scene = createHammerStrikeScene({ position: pos, rotationY: rotY });
  if (world?.group && scene.group.parent !== world.group) {
    world.group.add(scene.group);
  }

  const audio = createHammerStrikeAudio({
    audioMixer,
    getPlayer,
    stationPosition: pos,
  });

  let simState = initHammerSimState();
  let mySlot = null;
  let isParticipant = false;
  let seq = 1;
  let commitId = 1;
  let lastBellIndex = 0;

  function sendLeave() {
    audio.noteOff();
    if (!isParticipant || !net) return;
    const p = getParticipation?.();
    if (!p) return;
    net.sendActivityLeave?.({
      roomId,
      activityId: activityDef.id,
      sessionId: p.sessionId,
    });
  }

  const controller = createHammerStrikeController({
    onSendStrike: ({ phase }) => {
      if (!isParticipant || mySlot === null) return;
      const controls = { kind: 'strike', phase, commitId: commitId++ };

      if (net) {
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
      } else {
        const applied = applyHammerInput(simState, mySlot, controls);
        if (applied.event) {
          simState = applied.simState;
          audio.playStrike(applied.event.payload.score);
          audio.playBell(applied.event.payload);
        }
      }
    },
    onLeave: sendLeave,
    onBlur: () => audio.noteOff(),
  });

  function hearStrike(payload) {
    if (!payload || payload.index === lastBellIndex) return;
    lastBellIndex = payload.index;
    audio.playStrike(payload.score);
    audio.playBell(payload);
  }

  return {
    id: activityDef.id,
    type: activityDef.type,
    group: scene.group,
    scene,
    controller,
    audio,

    getSimState() {
      return simState;
    },

    onJoin({ slot, role }) {
      if (role === 'player' && typeof slot === 'number') {
        mySlot = slot;
        isParticipant = true;
        controller.enable();
      } else {
        mySlot = null;
        isParticipant = false;
        controller.disable();
      }
    },

    onLeave() {
      audio.noteOff();
      mySlot = null;
      isParticipant = false;
      controller.disable();
    },

    onSnapshot(serverSim) {
      if (!serverSim) return;
      if (serverSim.lastStrike && serverSim.lastStrike.index !== simState.lastStrike?.index) {
        hearStrike(serverSim.lastStrike);
      }
      simState = serverSim;
    },

    acceptSnapshot(envelope) {
      this.onSnapshot(extractActivitySim(envelope));
    },

    acceptEvent(envelope) {
      const name = envelope?.event || envelope?.name || envelope?.type;
      const data = envelope?.data || envelope?.payload || envelope;
      if (name === 'hammer_struck') hearStrike(data);
    },

    acceptResult() {},
    acceptError() {},

    update(time, delta) {
      bindParticipation({
        getParticipation,
        activityId: activityDef.id,
        isParticipant,
        onJoin: (info) => this.onJoin(info),
        onLeave: () => this.onLeave(),
      });
      scene.updateVisuals(simState, time);
      if (isParticipant) controller.update(simState, delta);
    },

    dispose() {
      this.destroy();
    },

    destroy() {
      audio.noteOff();
      controller.dispose();
      audio.dispose();
      scene.dispose();
    },
  };
}

export const HammerStrikeModule = {
  initialize: createHammerStrikeInstance,
  createInstance: createHammerStrikeInstance,
};

registerActivityModule('hammer-strike', HammerStrikeModule);
