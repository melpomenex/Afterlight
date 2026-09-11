/**
 * Authoritative 8-ball billiards activity module for Afterlight (Tasks 5.1–5.4; Spec social-billiards).
 *
 * Features:
 *   - Physical 3D table model in The Orpheum West Lounge with green cloth, mahogany rails, diamond sights, and brass pockets
 *   - 16 procedurally textured numbered balls with cloth contact shadows and authentic rolling rotation
 *   - Tapered maple cue stick, real-time aim guides, ghost-ball contact circle, and deflection indicators
 *   - Multi-input aiming, power charging, 2D spin selector (follow/draw/english), and ball-in-hand placement
 *   - Standing, cue, and overhead cameras with reduced-motion support
 *   - Positional Web Audio effects with collision event deduplication
 *   - Turn management, foul detection, called pocket selection, and winner-stays rotation
 */

import { registerActivityModule } from './registry.js';
import { initGame, step as rulesStep } from '../../shared/pool/rules.js';
import { createPoolTableScene } from './pool/tableScene.js';
import { createPoolAudio } from './pool/audio.js';
import { createPoolCamera } from './pool/camera.js';
import { createPoolController } from './pool/controller.js';
import { extractActivitySim } from './sessionBind.js';

export function createPoolInstance({
  activityDef,
  world,
  net,
  generation,
  roomId = 'theater',
  getActiveCamera = null,
  getCanvas = null,
  getPlayer = null,
  setActivityCamera = null,
  clearActivityCamera = null,
  getParticipation = null,
  acquireView = null,
  releaseView = null,
  audioMixer = null,
} = {}) {
  const transform = activityDef.transform || { position: [-8.6, 0, -4.5], rotationY: Math.PI / 2 };
  const pos = transform.position;
  const rotY = transform.rotationY !== undefined ? transform.rotationY : Math.PI / 2;

  // 1. 3D Table Scene
  const tableScene = createPoolTableScene({
    position: pos,
    rotationY: rotY,
  });

  if (world?.group && tableScene.group.parent !== world.group) {
    world.group.add(tableScene.group);
  }

  // 2. Positional Audio
  const audio = createPoolAudio({
    audioMixer,
    getPlayer,
    tablePosition: pos,
  });

  // 3. Camera Controller
  const camera = createPoolCamera({
    tablePosition: pos,
    tableRotationY: rotY,
    getActiveCamera,
    setActivityCamera,
    clearActivityCamera,
    acquireView,
    releaseView,
  });

  // 4. State & Simulation
  let simState = initGame();
  let sessionStatus = null;
  let playerCount = 0;
  let activeParticipant = false;
  let mySlot = 0;
  let seq = 1;

  // Initial balls placement
  tableScene.updateBalls(simState, 1.0);

  // 5. Input Controller
  const controller = createPoolController({
    tablePosition: pos,
    tableRotationY: rotY,
    getActiveCamera,
    getCanvas,
    onShoot: ({ angle, power, spinX, spinY, calledPocket }) => {
      const p = getParticipation?.();
      if (!p || !net) return;

      const currentLease = typeof p.lease === 'string' ? p.lease : p.lease?.id || 'lease-1';
      const inputSeq = net.nextActivitySeq?.(activityDef.id) ?? (seq++);

      net.sendActivityInput?.({
        roomId,
        activityId: activityDef.id,
        sessionId: p.sessionId,
        lease: currentLease,
        seq: inputSeq,
        controls: {
          action: 'shoot',
          angle,
          power,
          spinX,
          spinY,
          calledPocket,
        },
      });

      audio.playCueStrike(power);
    },

    onPlaceCueBall: (x, z) => {
      const p = getParticipation?.();
      if (!p || !net) return;

      const currentLease = typeof p.lease === 'string' ? p.lease : p.lease?.id || 'lease-1';
      const inputSeq = net.nextActivitySeq?.(activityDef.id) ?? (seq++);

      net.sendActivityInput?.({
        roomId,
        activityId: activityDef.id,
        sessionId: p.sessionId,
        lease: currentLease,
        seq: inputSeq,
        controls: {
          action: 'place_cue_ball',
          x,
          z,
        },
      });
    },

    onCallPocket: (pocketId) => {
      const p = getParticipation?.();
      if (!p || !net) return;

      const currentLease = typeof p.lease === 'string' ? p.lease : p.lease?.id || 'lease-1';
      const inputSeq = net.nextActivitySeq?.(activityDef.id) ?? (seq++);

      net.sendActivityInput?.({
        roomId,
        activityId: activityDef.id,
        sessionId: p.sessionId,
        lease: currentLease,
        seq: inputSeq,
        controls: {
          action: 'call_pocket',
          pocketId,
        },
      });
    },

    onResign: () => {
      const p = getParticipation?.();
      if (!p || !net) return;

      const currentLease = typeof p.lease === 'string' ? p.lease : p.lease?.id || 'lease-1';
      const inputSeq = net.nextActivitySeq?.(activityDef.id) ?? (seq++);

      net.sendActivityInput?.({
        roomId,
        activityId: activityDef.id,
        sessionId: p.sessionId,
        lease: currentLease,
        seq: inputSeq,
        controls: {
          action: 'resign',
        },
      });
    },

    onExit: () => {
      handleExit();
    },

    onCameraCycle: () => {
      camera.cycleMode();
    },
  });

  function handleExit() {
    activeParticipant = false;
    controller.deactivate();
    camera.deactivate();
    try {
      getParticipation?.()?.leave?.();
    } catch {}
  }

  return {
    get group() {
      return tableScene.group;
    },

    get simState() {
      return simState;
    },

    get tableScene() {
      return tableScene;
    },

    get camera() {
      return camera;
    },

    get controller() {
      return controller;
    },

    get audio() {
      return audio;
    },

    handlePrimaryAction(pressed) {
      return controller.setShotCharging(pressed);
    },

    /**
     * Active-only frame loop update.
     */
    update(time, delta) {
      const p = getParticipation?.();
      const isParticipating = p?.isParticipating && p?.currentActivity?.id === activityDef.id;

      // Handle activation transitions
      if (isParticipating && !activeParticipant) {
        activeParticipant = true;
        mySlot = typeof p.currentSlot === 'number' ? p.currentSlot : 0;
        controller.activate(mySlot);
        camera.activate();

        // Signal readiness
        try {
          net?.sendActivityReady?.({
            activityId: activityDef.id,
            ready: true,
          });
        } catch {}
      } else if (!isParticipating && activeParticipant) {
        activeParticipant = false;
        controller.deactivate();
        camera.deactivate();
      }

      // Step physics simulation when balls are active
      const ballsMoving = !simState.physics?.settled || simState.status === 'shooting';
      if (ballsMoving) {
        const { state: nextSim, events } = rulesStep(simState, Math.min(delta, 0.05));
        simState = nextSim;
        audio.playEvents(events);
        tableScene.updateBalls(simState, 0.85);
      } else {
        tableScene.updateBalls(simState, 1.0);
      }

      // Update aiming guides and cue position
      const balls = simState?.physics?.balls || {};
      const cueBall = balls['0'];
      const showAim = isParticipating && simState.physics?.settled && simState.turn === mySlot && simState.status !== 'awaiting_ball_in_hand';

      if (showAim && cueBall) {
        const impact = controller.calculateImpact(cueBall.x, cueBall.z, controller.aimAngle, simState);
        tableScene.updateAimGuides({
          cueX: cueBall.x,
          cueZ: cueBall.z,
          angle: controller.aimAngle,
          visible: true,
          impact,
        });

        tableScene.updateCue({
          cueX: cueBall.x,
          cueZ: cueBall.z,
          angle: controller.aimAngle,
          power: controller.shotPower,
          visible: true,
        });
      } else {
        tableScene.updateAimGuides({ visible: false });
        tableScene.updateCue({ visible: false });
      }

      // Update ball-in-hand placement preview
      if (isParticipating && controller.isBallInHand) {
        tableScene.updateBallInHandPreview({
          x: controller.previewCueX,
          z: controller.previewCueZ,
          valid: controller.previewValid,
          visible: true,
        });
      } else {
        tableScene.updateBallInHandPreview({ visible: false });
      }

      // Update controller and camera
      controller.update(delta, simState, { practice: sessionStatus === 'lobby' && playerCount === 1 });

      if (cueBall) {
        camera.update({
          cueX: cueBall.x,
          cueZ: cueBall.z,
          angle: controller.aimAngle,
          power: controller.shotPower,
          settled: simState.physics?.settled,
          isShooter: isParticipating && simState.turn === mySlot,
          status: simState.status,
        }, 0.12);
      }
    },

    /**
     * Accepts authoritative server snapshot.
     */
    acceptSnapshot(frame) {
      if (!frame) return;
      sessionStatus = frame.state?.status ?? frame.status ?? sessionStatus;
      playerCount = frame.state?.players?.length ?? frame.players?.length ?? playerCount;
      const sim = extractActivitySim(frame);
      if (sim && (sim.physics || sim.turn != null || Number.isInteger(sim.turn))) {
        // Shots start on the server. Accept moving snapshots too, then
        // advance their physics between updates in the frame loop.
        simState = sim;
        tableScene.updateBalls(simState, 0.9);

        // Play events from snapshot if present
        if (Array.isArray(sim.physics?.events)) {
          audio.playEvents(sim.physics.events);
        }
      }
    },

    /**
     * Accepts server activity event.
     */
    acceptEvent(frame) {
      if (!frame) return;
      const ev = frame.payload || frame.event;
      if (!ev) return;

      if (ev.type === 'foul') {
        audio.playFoulTone();
      } else if (ev.type === 'ball_collision') {
        audio.playBallHit(ev.ballA, ev.ballB, ev.relativeSpeed || 1.0);
      } else if (ev.type === 'rail_collision') {
        audio.playRailBounce(ev.speed || 1.0);
      } else if (ev.type === 'pocket') {
        audio.playPocketDrop();
      }
    },

    /**
     * Accepts match result.
     */
    acceptResult(frame) {
      // Command acknowledgements (ready/input_accepted) are not match results.
      if (!frame?.result || typeof frame.result !== 'object') return;
      const result = frame.result;
      if (simState) {
        simState.status = 'game_over';
        simState.winner = result.winner;
        simState.win_reason = result.reason;
      }
    },

    /**
     * Accepts server error response.
     */
    acceptError(frame) {
    },

    /**
     * Clean resource disposal.
     */
    dispose() {
      activeParticipant = false;
      controller.deactivate();
      camera.deactivate();
      tableScene.dispose();
      if (tableScene.group.parent) {
        tableScene.group.parent.remove(tableScene.group);
      }
    },
  };
}

const PoolModule = {
  initialize: createPoolInstance,
};

registerActivityModule('pool', PoolModule);
