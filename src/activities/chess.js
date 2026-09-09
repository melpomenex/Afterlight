/**
 * Shared chess tables for Rain Court (`court-chess`) and Paper Catacombs
 * (`archives-chess`). Authoritative Afterlight house chess (rulesVersion 1).
 */

import { registerActivityModule } from './registry.js';
import { createChessTableScene } from './chess/tableScene.js';
import { createChessAudio } from './chess/audio.js';
import { createChessController } from './chess/controller.js';
import { initChessSimState } from '../../shared/chessModel.js';

function extractSim(envelope) {
  return (
    envelope?.sim ||
    envelope?.simState ||
    envelope?.state?.sim ||
    envelope?.state ||
    envelope
  );
}

export function createChessInstance({
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
  const transform = activityDef.transform || { position: [6.4, 0, 1.2], rotationY: 0 };
  const pos = transform.position;
  const rotY = transform.rotationY !== undefined ? transform.rotationY : 0;

  const tableScene = createChessTableScene({
    position: pos,
    rotationY: rotY,
  });

  if (world?.group && tableScene.group.parent !== world.group) {
    world.group.add(tableScene.group);
  }

  if (world?.obstacles && activityDef.footprint) {
    const ax = pos[0];
    const az = pos.length === 3 ? pos[2] : pos[1];
    const already = world.obstacles.some((o) => Math.abs(o.x - ax) < 0.01 && Math.abs(o.z - az) < 0.01);
    if (!already) {
      world.obstacles.push({
        x: ax,
        z: az,
        w: activityDef.footprint.width / 2 + 0.38,
        d: activityDef.footprint.depth / 2 + 0.38,
      });
    }
  }

  const audio = createChessAudio({
    audioMixer,
    getPlayer,
    tablePosition: pos,
  });

  let simState = initChessSimState();
  tableScene.syncBoard(simState);

  let mySlot = null;
  let isParticipant = false;
  let seq = 1;
  let lastBoard = simState.board;
  let lastStatus = simState.status;

  const controller = createChessController({
    tablePosition: pos,
    rotationY: rotY,
    getActiveCamera,
    tableScene,
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
      if (!net) return;
      const p = getParticipation?.();
      if (!p) return;
      net.sendActivityLeave?.({
        roomId,
        activityId: activityDef.id,
        sessionId: p.sessionId,
      });
    },
  });

  function applySim(next) {
    if (!next || typeof next !== 'object') return;
    simState = next;
    tableScene.syncBoard(simState);
    controller.setSimState(simState);

    if (next.board && next.board !== lastBoard) {
      audio.playMove(!!next.lastMove?.captured);
      if (next.inCheck && next.status === 'playing') audio.playCheck();
      lastBoard = next.board;
    }
    if (next.status === 'complete' && lastStatus !== 'complete') {
      if (next.reason === 'checkmate') audio.playMate();
      else if (next.reason === 'resignation') audio.playResign();
      else audio.playDraw();
    }
    lastStatus = next.status || lastStatus;
  }

  function syncFocusFromParticipation() {
    const p = getParticipation?.();
    const mine = p?.isParticipating && p.currentActivity?.id === activityDef.id;
    const slot = typeof p?.currentSlot === 'number' ? p.currentSlot : null;
    const role = p?.role || (mine ? 'player' : null);
    if (mine && !isParticipant && slot != null) {
      instance.onJoin({ slot, role: role === 'watch' ? 'spectator' : 'player' });
    } else if (!mine && isParticipant) {
      instance.onLeave();
    }
  }

  const instance = {
    id: activityDef.id,
    type: activityDef.type,
    group: tableScene.group,
    tableScene,
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
        controller.setSimState(simState);
      } else {
        mySlot = typeof slot === 'number' ? slot : null;
        isParticipant = false;
        controller.disable();
        tableScene.setSelection({ lastMove: simState?.lastMove || null });
      }
    },

    onLeave() {
      mySlot = null;
      isParticipant = false;
      controller.disable();
    },

    acceptSnapshot(envelope) {
      const state = extractSim(envelope);
      if (state?.board || state?.turn) applySim(state);
    },

    acceptEvent(envelope) {
      const name = envelope?.event || envelope?.name || envelope?.type;
      if (name === 'illegal' || name === 'activity_error') audio.playIllegal();
    },

    acceptResult(envelope) {
      const reason = envelope?.result?.reason || envelope?.reason;
      if (reason === 'checkmate') audio.playMate();
      else if (reason === 'resignation') audio.playResign();
      else audio.playDraw();
    },

    acceptError() {
      audio.playIllegal();
    },

    neutralizeInput() {
      controller.neutralize();
    },

    update() {
      syncFocusFromParticipation();
      tableScene.syncBoard(simState);
      if (isParticipant) {
        tableScene.setSelection(controller.getSelection());
      } else {
        tableScene.setSelection({ lastMove: simState?.lastMove || null });
      }
    },

    dispose() {
      this.destroy();
    },

    destroy() {
      controller.dispose();
      audio.dispose();
      tableScene.dispose();
    },
  };

  return instance;
}

export const ChessModule = {
  initialize: createChessInstance,
  createInstance: createChessInstance,
};

registerActivityModule('chess', ChessModule);
