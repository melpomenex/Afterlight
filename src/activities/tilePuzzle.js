/**
 * Authoritative Paper Catacombs shared tile-arrangement puzzle (Phase 5, Task 8.4).
 *
 * Implements:
 *   - 4×4 manuscript table in the archives at [5.2, 0, 1.0]
 *   - Up to four concurrent arrangers with one (seq, slot) move order
 *   - Visible shared progress and identical solved/reset state
 *   - No XP or currency
 */

import { registerActivityModule } from './registry.js';
import { createTilePuzzleScene } from './tilePuzzle/scene.js';
import { createTilePuzzleAudio } from './tilePuzzle/audio.js';
import { createTilePuzzleController } from './tilePuzzle/controller.js';
import { initTileSimState } from '../../shared/tilePuzzleModel.js';

export function createTilePuzzleInstance({
  activityDef,
  world,
  net,
  generation,
  roomId = 'archives',
  getActiveCamera = null,
  getPlayer = null,
  getParticipation = null,
  audioMixer = null,
} = {}) {
  const transform = activityDef?.transform || { position: [5.2, 0, 1.0], rotationY: 0 };
  const pos = transform.position || [5.2, 0, 1.0];
  const rotY = transform.rotationY !== undefined ? transform.rotationY : 0;

  const puzzleScene = createTilePuzzleScene({
    position: pos,
    rotationY: rotY,
  });

  if (world?.group && puzzleScene.group.parent !== world.group) {
    world.group.add(puzzleScene.group);
  }

  const audio = createTilePuzzleAudio({
    audioMixer,
    getPlayer,
    tablePosition: pos,
  });

  let simState = initTileSimState();
  let mySlot = null;
  let isParticipant = false;
  let seq = 1;
  let lastStatus = simState.status;

  function sendMove(controls) {
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
      controls: { ...controls, seq: inputSeq },
    });
  }

  const controller = createTilePuzzleController({
    getActiveCamera,
    pickables: puzzleScene.pickables,
    onSendMove: sendMove,
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

  function joinPlay(slot, role) {
    if (role === 'player' && typeof slot === 'number') {
      mySlot = slot;
      isParticipant = true;
      controller.enable(slot);
    } else {
      mySlot = null;
      isParticipant = false;
      controller.disable();
    }
  }

  function leavePlay() {
    mySlot = null;
    isParticipant = false;
    controller.disable();
  }

  function syncFocusFromParticipation() {
    const p = getParticipation?.();
    const mine = p?.isParticipating && p.currentActivity?.id === activityDef.id;
    const slot = typeof p?.currentSlot === 'number' ? p.currentSlot : null;
    const role = p?.role || (mine ? 'player' : null);
    if (mine && !isParticipant && slot != null) {
      joinPlay(slot, role === 'watch' ? 'spectator' : 'player');
    } else if (!mine && isParticipant) {
      leavePlay();
    }
  }

  return {
    id: activityDef.id,
    type: activityDef.type,
    group: puzzleScene.group,
    puzzleScene,
    controller,
    audio,

    getSimState() {
      return simState;
    },

    onJoin({ slot, role }) {
      joinPlay(slot, role);
    },

    onLeave() {
      leavePlay();
    },

    onSnapshot(serverSim) {
      if (!serverSim) return;
      const nextStatus = serverSim.status;
      if (nextStatus === 'solved' && lastStatus !== 'solved') {
        audio.playSolved();
      }
      lastStatus = nextStatus;
      simState = serverSim;
    },

    acceptSnapshot(envelope) {
      const state = envelope?.sim || envelope?.state || envelope?.simState || envelope;
      this.onSnapshot(state);
    },

    acceptEvent(envelope) {
      const name = envelope?.event || envelope?.name || envelope?.type;
      if (name === 'tile_slid') audio.playSlide();
      else if (name === 'tile_swapped') audio.playSwap();
      else if (name === 'puzzle_reset') audio.playReset();
      else if (name === 'puzzle_solved') audio.playSolved();
    },

    acceptResult() {},

    acceptError() {},

    update(time) {
      syncFocusFromParticipation();
      puzzleScene.updateVisuals(simState, time);
      if (isParticipant) controller.update(simState);
    },

    dispose() {
      this.destroy();
    },

    destroy() {
      controller.dispose();
      audio.dispose();
      puzzleScene.dispose();
    },
  };
}

export const TilePuzzleModule = {
  initialize: createTilePuzzleInstance,
  createInstance: createTilePuzzleInstance,
};

registerActivityModule('tile-puzzle', TilePuzzleModule);
