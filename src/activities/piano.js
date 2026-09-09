/**
 * Orpheum spatial piano (Task 9.7). Note events only — never raw audio.
 */

import { registerActivityModule } from './registry.js';
import { createPianoScene } from './piano/pianoScene.js';
import { createPianoAudio } from './piano/audio.js';
import { createPianoController } from './piano/pianoController.js';
import { applyPianoInput, initPianoState } from '../../shared/pianoModel.js';
import { bindParticipation, extractActivitySim } from './sessionBind.js';

export function createPianoInstance({
  activityDef,
  world,
  net,
  roomId = 'theater',
  getPlayer = null,
  getParticipation = null,
  audioMixer = null,
  getMuted = null,
} = {}) {
  const transform = activityDef?.transform || { position: [-2.2, 0, 5.8], rotationY: 0 };
  const pos = transform.position;
  const scene = createPianoScene({ position: pos, rotationY: transform.rotationY || 0 });
  if (world?.group && scene.group.parent !== world.group) world.group.add(scene.group);

  const audio = createPianoAudio({ audioMixer, getPlayer, getMuted, stationPosition: pos });
  let simState = initPianoState();
  let mySlot = null;
  let isParticipant = false;
  let seq = 1;
  let commitId = 1;
  let sustainTimer = null;

  function send(controls) {
    const payload = { ...controls, commitId: commitId++ };
    if (net && isParticipant && mySlot != null) {
      const p = getParticipation?.();
      if (!p) return;
      const lease = typeof p.lease === 'string' ? p.lease : p.lease?.id || 'lease-1';
      net.sendActivityInput?.({
        roomId,
        activityId: activityDef.id,
        sessionId: p.sessionId,
        lease,
        seq: net.nextActivitySeq?.(activityDef.id) ?? seq++,
        controls: payload,
      });
    } else if (isParticipant && mySlot != null) {
      const applied = applyPianoInput(simState, mySlot, payload);
      simState = applied.simState;
      hear(applied.event);
    }
  }

  function hear(event) {
    if (!event) return;
    if (event.type === 'note_on') audio.noteOn(event.payload.midi);
    if (event.type === 'note_off' || event.type === 'notes_expired') {
      const midis = event.payload?.midis || (event.payload?.midi != null ? [event.payload.midi] : []);
      midis.forEach((m) => audio.noteOff(m));
    }
    if (event.type === 'all_off') audio.allOff();
    if (event.type === 'mute' && event.payload?.muted) audio.allOff();
  }

  function allOffLocal() {
    audio.allOff();
    send({ kind: 'all_off' });
  }

  const controller = createPianoController({
    onNoteOn: (midi) => {
      audio.noteOn(midi);
      send({ kind: 'note_on', midi });
    },
    onNoteOff: (midi) => {
      audio.noteOff(midi);
      send({ kind: 'note_off', midi });
    },
    onAllOff: allOffLocal,
    onMute: (muted) => {
      audio.setMuted(muted);
      send({ kind: 'mute', muted });
    },
    onLeave: () => {
      allOffLocal();
      if (!isParticipant || !net) return;
      const p = getParticipation?.();
      if (!p) return;
      net.sendActivityLeave?.({ roomId, activityId: activityDef.id, sessionId: p.sessionId });
    },
  });

  function startSustain() {
    stopSustain();
    if (typeof setInterval !== 'function') return;
    sustainTimer = setInterval(() => {
      if (!isParticipant) return;
      for (const note of simState.activeNotes || []) {
        if (note.slot === mySlot) send({ kind: 'sustain', midi: note.midi });
      }
    }, 400);
  }

  function stopSustain() {
    if (sustainTimer) {
      clearInterval(sustainTimer);
      sustainTimer = null;
    }
  }

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
        startSustain();
      } else {
        mySlot = null;
        isParticipant = false;
        controller.disable();
        stopSustain();
      }
    },
    onLeave() {
      allOffLocal();
      stopSustain();
      mySlot = null;
      isParticipant = false;
      controller.disable();
    },
    onSnapshot(serverSim) {
      if (!serverSim) return;
      const prev = new Set((simState.activeNotes || []).map((n) => n.midi));
      simState = serverSim;
      const next = new Set((simState.activeNotes || []).map((n) => n.midi));
      for (const midi of prev) {
        if (!next.has(midi)) audio.noteOff(midi);
      }
      if (simState.muted) audio.setMuted(true);
    },
    acceptSnapshot(envelope) {
      this.onSnapshot(extractActivitySim(envelope));
    },
    acceptEvent(envelope) {
      hear({
        type: envelope?.event || envelope?.name || envelope?.type,
        payload: envelope?.data || envelope?.payload || envelope,
      });
    },
    acceptResult() {},
    acceptError() {},
    neutralizeInput() {
      controller.neutralize();
      allOffLocal();
    },
    update(time) {
      bindParticipation({
        getParticipation,
        activityId: activityDef.id,
        isParticipant,
        onJoin: (info) => this.onJoin(info),
        onLeave: () => this.onLeave(),
      });
      scene.updateVisuals(simState, time);
      if (isParticipant) controller.update(simState);
    },
    dispose() { this.destroy(); },
    destroy() {
      stopSustain();
      allOffLocal();
      controller.dispose();
      audio.dispose();
      scene.dispose();
    },
  };
}

export const PianoModule = {
  initialize: createPianoInstance,
  createInstance: createPianoInstance,
};

registerActivityModule('piano', PianoModule);
