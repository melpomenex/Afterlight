/**
 * Rain Runner cabinet activity module for Afterlight.
 *
 * Implements the arcade racer:
 *   - Physical 3D cabinet with steering wheel controls and neon rain aesthetic.
 *   - Material-backed CRT screen with pseudo-3D wet-city racing visuals.
 *   - Authoritative simulation rendering with local control prediction and spectator parity.
 *   - Attract mode with autonomous demo driving and honest DEMO banners.
 *   - Positional engine audio, tire screeches, and crash impacts.
 *   - Full start, play, end, restart, and exit lifecycle.
 *
 * Conforms to:
 *   - openspec/changes/add-place-activities-program/specs/orpheum-arcade/spec.md
 *   - openspec/changes/add-place-activities-program/specs/place-activities/spec.md
 */

import { registerActivityModule } from './registry.js';
import { createActivityInputManager, isTypingTarget } from './inputSeam.js';
import {
  createScreenPipeline,
  createVisibilityThrottler,
  createCabinetAudio,
  drawAttractBanner,
} from './cabinetRenderer.js';
import { createArcadeCabinet } from '../arcade/cabinet.js';

const ROAD_WIDTH = 360;
const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 384;

export function createRainRunnerInstance({
  activityDef,
  world,
  net,
  generation,
  roomId = 'theater',
  getActiveCamera = null,
  getPlayer = null,
  setActivityCamera = null,
  clearActivityCamera = null,
  getParticipation = null,
  audioMixer = null,
} = {}) {
  const transform = activityDef.transform || { position: [8.0, 0, -5.8], rotationY: 0 };
  const pos = transform.position || [8.0, 0, -5.8];
  const posX = pos[0];
  const posY = pos.length === 3 ? pos[1] : 0;
  const posZ = pos.length === 3 ? pos[2] : pos[1];
  const rotY = transform.rotationY || 0;

  // 1. Screen texture pipeline
  const screenPipeline = createScreenPipeline({
    defaultWidth: CANVAS_WIDTH,
    defaultHeight: CANVAS_HEIGHT,
    focusedWidth: 1024,
    focusedHeight: 768,
  });
  const { canvas, ctx } = screenPipeline;

  // 2. Canonical arcade cabinet (shared GLB, this game's skin; falls back to
  // the primitive cabinet until the model arrives, then hot-swaps).
  const cabinet = createArcadeCabinet({
    activityDef,
    world,
    screenSource: canvas,
  });

  const group = cabinet.group;
  group.name = `activity-${activityDef.id}`;
  group.position.set(posX, posY, posZ);
  group.rotation.y = rotY;

  if (world?.group && group.parent !== world.group) {
    world.group.add(group);
  }

  // 3. Visibility and frame-rate throttler
  const throttler = createVisibilityThrottler({
    getPosition: () => [posX, posY, posZ],
    getPlayer,
  });

  // 4. Spatial audio
  const audio = createCabinetAudio({
    getPosition: () => [posX, posY, posZ],
    getPlayer,
    audioMixer,
  });

  // 5. Input manager with 250ms watchdog
  let localSteer = 0.0;
  let localThrottle = 0.0;
  let isFocusedInActivity = false;
  let isParticipating = false;

  const inputManager = createActivityInputManager({
    watchdogMs: 250,
    onInput: (controls, seq) => {
      const p = getParticipation?.();
      const leaseId = typeof p?.lease === 'string' ? p.lease : p?.lease?.id;
      if (!leaseId || !p?.sessionId) return;
      try {
        net?.sendActivityInput?.({
          roomId,
          activityId: activityDef.id,
          sessionId: p.sessionId,
          lease: leaseId,
          seq,
          controls,
        });
      } catch {}
    },
  });

  // 6. Simulation & run state
  let latestSnapshot = null;
  let matchState = 'idle'; // 'idle', 'running', 'crashed', 'completed'
  let outcome = null;
  let runDistance = 0.0;
  let runScore = 0;
  let playerSpeed = 6.0;
  let lastResult = null;
  let lastError = null;

  // Attract demo state
  let attractTime = 0.0;
  let attractCarX = 0.0;
  let attractObstacles = [];
  let nextAttractSpawn = 100;

  // Key listeners for gameplay
  const activeKeys = new Set();

  function onKeyDown(e) {
    if (!isFocusedInActivity) return;
    if (isTypingTarget(e.target)) return;
    activeKeys.add(e.key.toLowerCase());

    if (e.key.toLowerCase() === 'r' && (matchState === 'crashed' || matchState === 'completed')) {
      // Rematch / restart: the server owns match starts.
      const p = getParticipation?.();
      const leaseId = typeof p?.lease === 'string' ? p.lease : p?.lease?.id;
      if (p && leaseId) {
        try {
          net?.sendActivityReady?.({
            activityId: activityDef.id,
            ready: true,
          });
        } catch {}
      }
    }
  }

  function onKeyUp(e) {
    activeKeys.delete(e.key.toLowerCase());
  }

  function attachControls() {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
  }

  function detachControls() {
    activeKeys.clear();
    if (typeof window === 'undefined') return;
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  }

  function pollControls() {
    if (!isFocusedInActivity || !isParticipating) return;

    let steer = 0.0;
    if (activeKeys.has('a') || activeKeys.has('arrowleft')) steer -= 1.0;
    if (activeKeys.has('d') || activeKeys.has('arrowright')) steer += 1.0;

    let throttle = 0.0;
    if (activeKeys.has('w') || activeKeys.has('arrowup') || activeKeys.has(' ')) throttle += 1.0;
    if (activeKeys.has('s') || activeKeys.has('arrowdown')) throttle -= 1.0;

    localSteer = steer;
    localThrottle = throttle;

    inputManager.sampleInput({
      steer,
      throttle,
      left: steer < -0.1,
      right: steer > 0.1,
      up: throttle > 0.1,
      down: throttle < -0.1,
    });
  }

  // --- 7. Screen Drawing Routines ---
  function renderAttractDemo(dt) {
    if (!ctx) return;
    attractTime += dt;

    // Autonomous car movement (sine wave steering)
    attractCarX = Math.sin(attractTime * 1.4) * 110;

    // Advance attract obstacles
    attractObstacles.forEach(o => { o.z -= 7.0; });
    attractObstacles = attractObstacles.filter(o => o.z > -50);

    if (attractTime * 60 > nextAttractSpawn) {
      nextAttractSpawn = attractTime * 60 + 50 + Math.random() * 40;
      attractObstacles.push({
        x: (Math.random() - 0.5) * 220,
        z: 600,
        w: 50,
        h: 24,
        type: Math.random() > 0.4 ? 'barrier' : 'puddle',
      });
    }

    drawTrack(attractCarX, 7.0, attractTime * 200, attractObstacles);
    drawAttractBanner(ctx, canvas.width, canvas.height, {
      title: 'RAIN RUNNER',
      subtitle: 'HIGH SCORE HIGHWAY · SOLO RUN',
      tagline: 'PRESS E TO DRIVE',
      bannerText: 'DEMO',
      time: attractTime,
    });
  }

  function renderLiveGame(dt) {
    if (!ctx) return;

    const sim = latestSnapshot?.simState || {};
    const player = sim.player || {};
    const carX = isFocusedInActivity ? (player.x || 0) + localSteer * 2.0 : (player.x || 0);
    const speed = player.speed || playerSpeed;
    const distance = sim.distance || runDistance;
    const score = sim.score || runScore;
    const obstacles = sim.obstacles || [];

    drawTrack(carX, speed, distance, obstacles);
    drawHUD(score, distance, speed);

    if (matchState === 'crashed' || matchState === 'completed') {
      drawGameOverOverlay();
    }
  }

  function drawTrack(carX, speed, distance, obstacles) {
    const w = canvas.width;
    const h = canvas.height;

    // 1. Sky & distant rainy cityscape
    ctx.fillStyle = '#0a0e17';
    ctx.fillRect(0, 0, w, h);

    // City silhouette on horizon (h * 0.45)
    const horizon = h * 0.46;
    ctx.fillStyle = '#141d2c';
    for (let i = 0; i < 16; i++) {
      const bx = i * (w / 14);
      const bh = 30 + ((i * 37) % 55);
      ctx.fillRect(bx, horizon - bh, w / 16, bh);
      // Amber/cyan window dots
      if (i % 2 === 0) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(bx + 4, horizon - bh + 10, 4, 6);
        ctx.fillStyle = '#141d2c';
      }
    }

    // 2. Road surface (trapezoid to horizon)
    const roadTopW = 60;
    const roadBottomW = w * 0.88;
    const roadTopX = w / 2 - roadTopW / 2;
    const roadBottomX = w / 2 - roadBottomW / 2;

    ctx.fillStyle = '#161a22';
    ctx.beginPath();
    ctx.moveTo(roadTopX, horizon);
    ctx.lineTo(roadTopX + roadTopW, horizon);
    ctx.lineTo(roadBottomX + roadBottomW, h);
    ctx.lineTo(roadBottomX, h);
    ctx.closePath();
    ctx.fill();

    // Road shoulders (neon blue barriers)
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(roadTopX, horizon);
    ctx.lineTo(roadBottomX, h);
    ctx.moveTo(roadTopX + roadTopW, horizon);
    ctx.lineTo(roadBottomX + roadBottomW, h);
    ctx.stroke();

    // Moving lane divider dashes
    const dashOffset = (distance * 0.8) % 40;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    for (let y = horizon; y < h; y += 24) {
      const py = y + dashOffset * ((y - horizon) / (h - horizon));
      if (py > h) continue;
      const progress = (py - horizon) / (h - horizon);
      const laneW = roadTopW + (roadBottomW - roadTopW) * progress;
      const centerX = w / 2;
      ctx.beginPath();
      ctx.moveTo(centerX, py);
      ctx.lineTo(centerX, py + 12 * progress);
      ctx.stroke();
    }

    // Rain streaks
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.28)';
    ctx.lineWidth = 1;
    for (let r = 0; r < 25; r++) {
      const rx = ((r * 67 + distance * 3) % w);
      const ry = ((r * 91 + distance * 7) % h);
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 3, ry + 12);
      ctx.stroke();
    }

    // 3. Obstacles rendered in 3D projection
    obstacles.forEach(obs => {
      const z = obs.z || 100;
      if (z <= 0 || z > 750) return;
      const progress = Math.max(0, Math.min(1, 1 - (z / 700)));
      const scale = 0.2 + progress * 0.9;
      const projY = horizon + (h - horizon) * progress;
      const laneScale = roadTopW + (roadBottomW - roadTopW) * progress;
      const projX = w / 2 + (obs.x / ROAD_WIDTH) * laneScale;

      const ow = (obs.w || 50) * scale;
      const oh = (obs.h || 24) * scale;

      if (obs.type === 'barrier') {
        // Striped construction barricade
        ctx.fillStyle = '#eab308';
        ctx.fillRect(projX - ow / 2, projY - oh, ow, oh);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(projX - ow / 4, projY - oh, ow / 4, oh);
        // Flashing amber light on top
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(projX, projY - oh - 4 * scale, 4 * scale, 0, Math.PI * 2);
        ctx.fill();
      } else if (obs.type === 'pylon') {
        // Fluorescent traffic pylon
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(projX, projY - oh);
        ctx.lineTo(projX - ow / 2, projY);
        ctx.lineTo(projX + ow / 2, projY);
        ctx.closePath();
        ctx.fill();
      } else {
        // Puddle reflection
        ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.beginPath();
        ctx.ellipse(projX, projY, ow / 2, oh / 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 4. Player Vehicle
    const carScreenY = h * 0.84;
    const carScreenX = w / 2 + (carX / ROAD_WIDTH) * roadBottomW;

    // Tail light glow
    ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.beginPath();
    ctx.ellipse(carScreenX, carScreenY + 6, 24, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Car body (sleek wedge)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(carScreenX - 18, carScreenY - 16, 36, 28);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(carScreenX - 14, carScreenY - 12, 28, 6); // windshield
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(carScreenX - 16, carScreenY + 10, 8, 4); // left tail light
    ctx.fillRect(carScreenX + 8, carScreenY + 10, 8, 4);  // right tail light

    // Tire spray
    if (speed > 4.0) {
      ctx.fillStyle = 'rgba(186, 230, 253, 0.4)';
      ctx.fillRect(carScreenX - 18, carScreenY + 14, 4, 8);
      ctx.fillRect(carScreenX + 14, carScreenY + 14, 4, 8);
    }
  }

  function drawHUD(score, distance, speed) {
    const w = canvas.width;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, 0, w, 28);

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'left';
    ctx.fillText(`DIST: ${Math.round(distance)}m`, 14, 18);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(`SCORE: ${String(score).padStart(6, '0')}`, w / 2, 18);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`${Math.round(speed * 18)} KM/H`, w - 14, 18);
  }

  function drawGameOverOverlay() {
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = 'rgba(10, 14, 23, 0.82)';
    ctx.fillRect(0, h * 0.28, w, h * 0.44);

    ctx.textAlign = 'center';
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = matchState === 'crashed' ? '#ef4444' : '#38bdf8';
    ctx.fillText(matchState === 'crashed' ? 'VEHICLE CRASHED' : 'RUN COMPLETED', w / 2, h * 0.38);

    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(`FINAL SCORE: ${runScore}`, w / 2, h * 0.48);
    ctx.fillText(`DISTANCE: ${Math.round(runDistance)} METERS`, w / 2, h * 0.54);

    ctx.font = '14px monospace';
    ctx.fillStyle = '#ffca7a';
    ctx.fillText('PRESS R TO RETRY · ESC TO EXIT', w / 2, h * 0.64);
  }

  return {
    id: activityDef.id,
    type: 'rain-runner',
    group,
    cabinetMesh: cabinet.bodyMesh,
    screenMesh: cabinet.screenMesh,
    activityCamera: cabinet.activityCamera,

    focusActivity() {
      isFocusedInActivity = true;
      screenPipeline.setFocused(true);
      attachControls();
      setActivityCamera?.(cabinet.activityCamera);
    },

    unfocusActivity() {
      isFocusedInActivity = false;
      screenPipeline.setFocused(false);
      detachControls();
      inputManager.neutralize();
      clearActivityCamera?.();
    },

    attachControls,
    detachControls,

    setParticipation(participating, slot = 0) {
      isParticipating = participating;
      if (participating) {
        this.focusActivity();
      } else {
        this.unfocusActivity();
      }
    },

    onSnapshot(snapshot) {
      latestSnapshot = snapshot;
      const status = snapshot.status;
      if (status === 'ended' || snapshot.simState?.state === 'completed') {
        matchState = 'completed';
      } else if (status === 'in_progress' || status === 'running') {
        matchState = 'running';
      } else if (status === 'lobby') {
        matchState = 'idle';
      }
      if (snapshot.simState) {
        runScore = snapshot.simState.score || 0;
        runDistance = snapshot.simState.distance || 0.0;
        playerSpeed = snapshot.simState.player?.speed || 6.0;
      }
    },

    onEvent(event, payload) {
      if (event === 'match_started' || event === 'match_resumed') {
        matchState = 'running';
        runScore = 0;
        runDistance = 0.0;
        audio.playTone(320, 'sawtooth', 0.15, 0.25);
      } else if (event === 'match_ended' || event === 'match_aborted') {
        matchState = payload?.reason === 'run_cap' ? 'completed' : 'crashed';
        outcome = payload;
        if (payload?.score) runScore = payload.score;
        if (payload?.distance) runDistance = payload.distance;
        // Crash noise
        audio.playTone(85, 'sawtooth', 0.35, 0.4);
      }
    },

    // Runtime contract: authoritative envelopes arrive via accept*, including
    // for spectators watching another player's run.
    acceptSnapshot(envelope) {
      const payload = envelope?.payload || envelope || {};
      const stateBlock = payload.state || {};
      this.onSnapshot({
        status: payload.status || stateBlock.status || 'running',
        simState: payload.sim || payload.simState || stateBlock.sim || null,
      });
    },

    acceptEvent(envelope) {
      const type = envelope?.eventType || envelope?.event || envelope?.type;
      const data = envelope?.data || envelope?.payload || {};
      if (type && typeof type === 'string') this.onEvent(type, data);
    },

    acceptResult(envelope) {
      lastResult = envelope?.result || envelope || null;
    },

    acceptError(envelope) {
      lastError = envelope?.error ? envelope : (envelope ? { error: envelope } : null);
    },

    neutralizeInput() {
      activeKeys.clear();
      inputManager.neutralize();
    },

    update(time = 0, delta = 0.016, placeVisible = true) {
      pollControls();
      inputManager.checkWatchdog(Date.now());

      const now = performance.now();
      if (!throttler.shouldRender(isFocusedInActivity, placeVisible, now)) {
        return;
      }

      if (matchState === 'running' || matchState === 'crashed' || matchState === 'completed') {
        renderLiveGame(delta);
      } else {
        renderAttractDemo(delta);
      }

      screenPipeline.update();
      cabinet.update(time);
    },

    dispose() {
      if (isFocusedInActivity) {
        this.unfocusActivity();
      } else {
        detachControls();
        inputManager.neutralize();
      }
      audio.dispose();
      throttler.reset();
      screenPipeline.dispose();
      cabinet.dispose();
      if (group.parent) {
        group.parent.remove(group);
      }
    },

    get lastResult() { return lastResult; },
    get lastError() { return lastError; },
  };
}

export const RainRunnerModule = Object.freeze({
  type: 'rain-runner',
  initialize(options) {
    return createRainRunnerInstance(options);
  },
  worldSupport: {
    mode: 'none',
    host: 'parent',
    slots: [],
    adapterKey: null,
  },
});

// Register with activity registry
registerActivityModule('rain-runner', RainRunnerModule);
