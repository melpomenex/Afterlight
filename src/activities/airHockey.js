/**
 * Authoritative Air Hockey activity module for Afterlight (Phase 4, Tasks 6.1, 6.2, 6.5, 6.6).
 *
 * Implements:
 *   - 3D Air Hockey table in the Orpheum rear east promenade with laminated bed, goal mouths, and digital scoreboard
 *   - Local control prediction and continuous reconciliation for seated players
 *   - Remote interpolation and spectator rendering parity
 *   - Multi-input controller (keyboard, pointer raycast, touch, gamepad)
 *   - Selectable series (single game, BO3, BO5, BO7)
 *   - Positional audio effects and goal celebration
 */

import { registerActivityModule } from './registry.js';
import { createAirHockeyTableScene } from './airHockey/tableScene.js';
import { createAirHockeyAudio } from './airHockey/audio.js';
import { createAirHockeyController } from './airHockey/controller.js';
import { initAirHockeyState } from '../../shared/airHockeyModel.js';

export function createAirHockeyInstance({
  activityDef,
  world,
  net,
  generation,
  roomId = 'theater',
  getActiveCamera = null,
  getPlayer = null,
  getParticipation = null,
  audioMixer = null,
} = {}) {
  const transform = activityDef.transform || { position: [5.8, 0, 7.0], rotationY: 0 };
  const pos = transform.position;
  const rotY = transform.rotationY !== undefined ? transform.rotationY : 0;

  // 1. 3D Table Scene
  const tableScene = createAirHockeyTableScene({
    position: pos,
    rotationY: rotY,
  });

  if (world?.group && tableScene.group.parent !== world.group) {
    world.group.add(tableScene.group);
  }

  // 2. Audio Effects
  const audio = createAirHockeyAudio({
    audioMixer,
    getPlayer,
    tablePosition: pos,
  });

  // 3. Simulation & Networking state
  let simState = initAirHockeyState();
  let mySlot = null;
  let isParticipant = false;
  let seq = 1;
  let lastPuckSpeed = 0;
  let lastScore0 = 0;
  let lastScore1 = 0;

  // Initial table placement
  tableScene.updateMallets(simState, 1.0);
  tableScene.updatePuck(simState, 1.0);
  tableScene.updateScoreboard(simState);

  // 4. Input Controller
  const controller = createAirHockeyController({
    tablePosition: pos,
    tableRotationY: rotY,
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

    onSelectSeries: (seriesLength) => {
      if (!isParticipant || !net) return;
      const p = getParticipation?.();
      if (!p) return;

      // Series length is passed with ready payload
      simState.seriesLength = seriesLength;
      tableScene.updateScoreboard(simState);
    },

    onToggleReady: (ready, seriesLength) => {
      if (!isParticipant || !net) return;
      const p = getParticipation?.();
      if (!p) return;

      net.sendActivityReady?.({
        roomId,
        activityId: activityDef.id,
        sessionId: p.sessionId,
        ready,
        seriesLength,
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
        controller.activate({
          slot,
          status: simState.state || 'lobby',
          seriesLength: simState.seriesLength || 1,
        });
      } else {
        mySlot = null;
        isParticipant = false;
        controller.deactivate();
      }
    },

    onLeave() {
      mySlot = null;
      isParticipant = false;
      controller.deactivate();
    },

    onSnapshot(serverSim) {
      if (!serverSim) return;

      const prevPuck = simState.puck;
      const newPuck = serverSim.puck || prevPuck;

      // Detect goal events from score increments
      const newS0 = serverSim.score?.['0'] ?? 0;
      const newS1 = serverSim.score?.['1'] ?? 0;

      if (newS0 > lastScore0) {
        lastScore0 = newS0;
        audio.playGoal();
        tableScene.flashGoal(0);
      }
      if (newS1 > lastScore1) {
        lastScore1 = newS1;
        audio.playGoal();
        tableScene.flashGoal(1);
      }

      // Detect puck strikes / rail bounces
      if (prevPuck && newPuck) {
        const speed = Math.hypot(newPuck.vx, newPuck.vy);
        const deltaVx = Math.abs(newPuck.vx - prevPuck.vx);
        const deltaVy = Math.abs(newPuck.vy - prevPuck.vy);

        if (deltaVx > 2.0 || deltaVy > 2.0) {
          if (newPuck.x < 15.0 || newPuck.x > 185.0 || newPuck.y < 10.0 || newPuck.y > 90.0) {
            audio.playRailBounce(speed);
          } else {
            audio.playPuckHit(speed);
          }
        }
        lastPuckSpeed = speed;
      }

      simState = serverSim;

      // Reconcile local mallet
      if (isParticipant && mySlot !== null) {
        const myAuthoritativeMallet = serverSim.mallets?.[String(mySlot)];
        controller.reconcile(myAuthoritativeMallet);
      }

      tableScene.updateScoreboard(simState);
      controller.setStatus(simState.state);
    },

    onEvent(eventName, payload) {
      if (eventName === 'match_ended') {
        audio.playGoal();
        controller.setStatus('ended', 'SERIES COMPLETE');
      } else if (eventName === 'match_started') {
        controller.setStatus('rally', 'MATCH STARTED');
      }
    },

    update(time, dt) {
      // Step controller prediction
      controller.update(dt);
      tableScene.update(dt);

      // Render mallets:
      // If we are participant in slot 0, local mallet 0 is predicted; mallet 1 is interpolated.
      // If spectator, both mallets are interpolated from authoritative snapshot.
      if (isParticipant && mySlot === 0) {
        const pred = controller.getPredictedMallet();
        const renderSim = {
          ...simState,
          mallets: {
            ...simState.mallets,
            '0': { ...simState.mallets?.['0'], x: pred.x, y: pred.y },
          },
        };
        tableScene.updateMallets(renderSim, 0.4);
      } else if (isParticipant && mySlot === 1) {
        const pred = controller.getPredictedMallet();
        const renderSim = {
          ...simState,
          mallets: {
            ...simState.mallets,
            '1': { ...simState.mallets?.['1'], x: pred.x, y: pred.y },
          },
        };
        tableScene.updateMallets(renderSim, 0.4);
      } else {
        tableScene.updateMallets(simState, 0.3);
      }

      // Smooth puck interpolation
      tableScene.updatePuck(simState, 0.35);
    },

    acceptSnapshot(envelope) {
      const state = envelope?.state || envelope?.simState || envelope;
      this.onSnapshot(state);
    },

    acceptEvent(envelope) {
      const name = envelope?.event || envelope?.name || envelope?.type;
      const data = envelope?.data || envelope?.payload || envelope;
      this.onEvent(name, data);
    },

    acceptResult(envelope) {
      this.onEvent('match_ended', envelope);
    },

    acceptError(envelope) {},

    dispose() {
      this.destroy();
    },

    destroy() {
      controller.destroy();
      tableScene.destroy();
    },
  };
}

export const AirHockeyModule = {
  initialize: createAirHockeyInstance,
  createInstance: createAirHockeyInstance,
};

registerActivityModule('air-hockey', AirHockeyModule);
