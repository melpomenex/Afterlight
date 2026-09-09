/**
 * Understory cooperative light/music puzzle (Task 9.5).
 */

import { registerActivityModule } from './registry.js';
import { createLightMusicScene } from './lightMusic/choirScene.js';
import { createLightMusicAudio } from './lightMusic/audio.js';
import { createLightMusicController } from './lightMusic/choirController.js';
import { applyLightMusicInput, initLightMusicState } from '../../shared/lightMusicModel.js';

export function createLightMusicInstance({
  activityDef,
  world,
  net,
  roomId = 'understory',
  getPlayer = null,
  getParticipation = null,
  audioMixer = null,
} = {}) {
  const transform = activityDef?.transform || { position: [0, 0, 2], rotationY: 0 };
  const pos = transform.position;
  const rotY = transform.rotationY || 0;

  const scene = createLightMusicScene({ position: pos, rotationY: rotY });
  if (world?.group && scene.group.parent !== world.group) world.group.add(scene.group);

  const audio = createLightMusicAudio({ audioMixer, getPlayer, stationPosition: pos });
  let simState = initLightMusicState({ activeSlots: [0, 1, 2, 3] });
  let mySlot = null;
  let isParticipant = false;
  let seq = 1;
  let commitId = 1;

  function send(controls) {
    controls = { ...controls, commitId: commitId++ };
    if (!isParticipant || mySlot == null) return;
    if (net) {
      const p = getParticipation?.();
      if (!p) return;
      const lease = typeof p.lease === 'string' ? p.lease : p.lease?.id || 'lease-1';
      net.sendActivityInput?.({
        roomId,
        activityId: activityDef.id,
        sessionId: p.sessionId,
        lease,
        seq: net.nextActivitySeq?.(activityDef.id) ?? seq++,
        controls,
      });
    } else {
      const applied = applyLightMusicInput(simState, mySlot, controls);
      simState = applied.simState;
      hear(applied.event);
    }
  }

  function hear(event) {
    if (!event) return;
    if (event.type === 'pad_hit' || event.type === 'sequence_reset') {
      const pad = event.payload?.pad ?? simState.lastPad;
      if (pad != null) {
        audio.playPad(pad);
        scene.flash(pad);
      }
    }
    if (event.type === 'puzzle_complete') audio.playComplete();
  }

  const controller = createLightMusicController({
    onPress: (pad) => send({ kind: 'press', pad }),
    onReset: () => send({ kind: 'reset' }),
    onLeave: () => {
      audio.noteOff();
      if (!isParticipant || !net) return;
      const p = getParticipation?.();
      if (!p) return;
      net.sendActivityLeave?.({ roomId, activityId: activityDef.id, sessionId: p.sessionId });
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
      simState = serverSim;
    },
    acceptSnapshot(envelope) {
      this.onSnapshot(envelope?.sim || envelope?.state || envelope?.simState || envelope);
    },
    acceptEvent(envelope) {
      hear({
        type: envelope?.event || envelope?.name || envelope?.type,
        payload: envelope?.data || envelope?.payload || envelope,
      });
    },
    acceptResult() { audio.playComplete(); },
    acceptError() {},
    neutralizeInput() { audio.noteOff(); },
    update(time) {
      scene.updateVisuals(simState, time);
      if (isParticipant) controller.update(simState);
    },
    dispose() { this.destroy(); },
    destroy() {
      audio.noteOff();
      controller.dispose();
      audio.dispose();
      scene.dispose();
    },
  };
}

export const LightMusicModule = {
  initialize: createLightMusicInstance,
  createInstance: createLightMusicInstance,
};

registerActivityModule('light-music-puzzle', LightMusicModule);
