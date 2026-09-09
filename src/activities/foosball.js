/**
 * Authoritative Foosball activity module for Afterlight (Phase 4, Tasks 6.3, 6.4, 6.5, 6.6).
 *
 * Implements:
 *   - 3D Foosball table in the Orpheum rear west promenade with 8 steel rods, 22 figures, corner ramps, and score display
 *   - Local rod prediction, casual active rod tracking, and advanced manual rod selection
 *   - Remote interpolation and spectator rendering parity
 *   - Multi-input controller (keyboard, pointer/touch, gamepad)
 *   - Selectable series (single game, BO3, BO5)
 *   - Positional audio effects and goal celebration
 */

import { registerActivityModule } from './registry.js';
import { createFoosballTableScene } from './foosball/tableScene.js';
import { createFoosballAudio } from './foosball/audio.js';
import { createFoosballController } from './foosball/controller.js';
import { initFoosballState } from '../../shared/foosballModel.js';
import { bindParticipation, extractActivitySim } from './sessionBind.js';

export function createFoosballInstance({
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
  const transform = activityDef.transform || { position: [-5.8, 0, 7.0], rotationY: 0 };
  const pos = transform.position;
  const rotY = transform.rotationY !== undefined ? transform.rotationY : 0;

  // 1. 3D Table Scene
  const tableScene = createFoosballTableScene({
    position: pos,
    rotationY: rotY,
  });

  if (world?.group && tableScene.group.parent !== world.group) {
    world.group.add(tableScene.group);
  }

  // 2. Audio Effects
  const audio = createFoosballAudio({
    audioMixer,
    getPlayer,
    tablePosition: pos,
  });

  // 3. Simulation & Networking state
  let simState = initFoosballState();
  let mySlot = null;
  let isParticipant = false;
  let seq = 1;
  let lastScore0 = 0;
  let lastScore1 = 0;

  // Initial table placement
  tableScene.update(simState, 0.016);

  // 4. Input Controller
  const controller = createFoosballController({
    slot: 0,
    sendInput: (controls) => {
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

    requestReady: ({ ready, seriesLength }) => {
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

    onSeriesChange: (seriesLength) => {
      simState.seriesLength = seriesLength;
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
        controller.setSlot(slot);
        controller.activate();
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

      // Detect goal events from score increments
      const newS0 = serverSim.score?.['0'] ?? 0;
      const newS1 = serverSim.score?.['1'] ?? 0;

      if (newS0 > lastScore0) {
        lastScore0 = newS0;
        audio.playGoal();
      }
      if (newS1 > lastScore1) {
        lastScore1 = newS1;
        audio.playGoal();
      }

      // Detect collisions from previous ball velocity
      if (simState.ball && serverSim.ball) {
        const dvx = Math.abs(serverSim.ball.vx - simState.ball.vx);
        const dvy = Math.abs(serverSim.ball.vy - simState.ball.vy);
        const speed = Math.hypot(serverSim.ball.vx, serverSim.ball.vy);

        if (dvx > 1.5 || dvy > 1.5) {
          if (serverSim.ball.y < 5.0 || serverSim.ball.y > 65.0) {
            audio.playRailBounce(speed);
          } else {
            audio.playKick(speed);
          }
        }
      }

      simState = serverSim;

      // Reconcile local controller prediction
      if (isParticipant && mySlot !== null) {
        controller.reconcileSnapshot(simState);
      }
    },

    onEvent(eventName, payload) {
      if (eventName === 'match_ended') {
        audio.playGoal();
      }
    },

    update(time, dt = 0.016) {
      bindParticipation({
        getParticipation,
        activityId: activityDef.id,
        isParticipant,
        onJoin: (info) => this.onJoin(info),
        onLeave: () => this.onLeave(),
      });

      // Step controller input and prediction
      if (isParticipant && mySlot !== null) {
        controller.update(dt, simState);
      }

      // Build state for visual rendering:
      // If we are participant, merge predicted rod into visual state
      let renderState = simState;
      if (isParticipant && mySlot !== null && simState.rods) {
        const slotKey = String(mySlot);
        const myRods = simState.rods[slotKey];
        if (Array.isArray(myRods)) {
          const predictedRods = myRods.map((rod, rIdx) => {
            const pred = controller.getLocalPredictedRod(rIdx);
            return {
              ...rod,
              y: pred.y,
              angle: pred.angle,
            };
          });

          renderState = {
            ...simState,
            rods: {
              ...simState.rods,
              [slotKey]: predictedRods,
            },
          };
        }
      }

      tableScene.update(renderState, dt);
    },

    acceptSnapshot(envelope) {
      this.onSnapshot(extractActivitySim(envelope));
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
      tableScene.dispose();
    },
  };
}

export const FoosballModule = {
  initialize: createFoosballInstance,
  createInstance: createFoosballInstance,
};

registerActivityModule('foosball', FoosballModule);
