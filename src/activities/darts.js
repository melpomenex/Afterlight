/**
 * Orpheum 301 double-out darts (Task 9.6).
 */

import { registerActivityModule } from './registry.js';
import { createDartsScene } from './darts/boardScene.js';
import { createDartsAudio } from './darts/audio.js';
import { createDartsController } from './darts/throwController.js';
import { applyDartsInput, initDartsState } from '../../shared/dartsModel.js';
import { bindParticipation, extractActivitySim } from './sessionBind.js';

export function createDartsInstance({
  activityDef,
  world,
  net,
  roomId = 'theater',
  getPlayer = null,
  getParticipation = null,
  audioMixer = null,
} = {}) {
  const transform = activityDef?.transform || { position: [-10.4, 0, -1.5], rotationY: Math.PI };
  const pos = transform.position;
  const scene = createDartsScene({ position: pos, rotationY: transform.rotationY || 0 });
  if (world?.group && scene.group.parent !== world.group) world.group.add(scene.group);

  const audio = createDartsAudio({ audioMixer, getPlayer, stationPosition: pos });
  let simState = initDartsState();
  let mySlot = null;
  let isParticipant = false;
  let seq = 1;
  let commitId = 1;

  function sendThrow(point) {
    if (!isParticipant || mySlot == null) return;
    const controls = { kind: 'throw', u: point.u, v: point.v, commitId: commitId++ };
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
      const applied = applyDartsInput(simState, mySlot, controls);
      simState = applied.simState;
      hear(applied.event);
    }
  }

  function hear(event) {
    if (!event) return;
    const hit = event.payload?.throw;
    if (hit) scene.showThrow(hit);
    if (event.type === 'bust') audio.playBust();
    else if (event.type === 'match_ended') audio.playCheckout();
    else audio.playThrow();
  }

  const instance = {
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
      mySlot = null;
      isParticipant = false;
      controller.disable();
    },
    onSnapshot(serverSim) {
      if (!serverSim) return;
      simState = serverSim;
      const p = simState.players?.[mySlot] || simState.players?.[String(mySlot)];
      if (p?.lastThrow) scene.showThrow(p.lastThrow);
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
    acceptResult() { audio.playCheckout(); },
    acceptError() {},
    neutralizeInput() { controller.neutralize(); },
    update(time) {
      bindParticipation({
        getParticipation,
        activityId: activityDef.id,
        isParticipant,
        onJoin: (info) => instance.onJoin(info),
        onLeave: () => instance.onLeave(),
      });
      const p = getParticipation?.();
      const mine = !!(p?.isParticipating && p.currentActivity?.id === activityDef.id);
      if (!mine && isParticipant) instance.onLeave();
      scene.updateVisuals(simState, time);
      if (isParticipant) controller.update(simState);
    },
    dispose() { instance.destroy(); },
    destroy() {
      controller.dispose();
      audio.dispose();
      scene.dispose();
    },
  };

  const controller = createDartsController({
    onThrow: sendThrow,
    onLeave: () => {
      const p = getParticipation?.();
      if (p?.isOccupied && p.currentActivity?.id === activityDef.id) {
        p.leave();
        return;
      }
      instance.onLeave();
    },
  });

  return instance;
}

export const DartsModule = {
  initialize: createDartsInstance,
  createInstance: createDartsInstance,
};

registerActivityModule('darts', DartsModule);
