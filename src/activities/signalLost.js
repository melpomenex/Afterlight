/**
 * Signal Lost cabinet activity module for Afterlight.
 *
 * Implements the arcade space survival shooter:
 *   - Physical 3D cabinet with joystick & buttons and neon vector aesthetic.
 *   - Material-backed CRT screen with retro phosphor vector space arena.
 *   - Authoritative asteroid splitting, lives, laser fire, and score accumulation.
 *   - Attract mode with autonomous demo flight and honest DEMO banners.
 *   - Positional laser, thrust, explosion, and game-over audio.
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

const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 384;
const ARENA_WIDTH = 800;
const ARENA_HEIGHT = 600;

export function createSignalLostInstance({
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
  const transform = activityDef.transform || { position: [9.8, 0, -5.8], rotationY: 0 };
  const pos = transform.position || [9.8, 0, -5.8];
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
  let runScore = 0;
  let runLives = 3;
  let runWave = 1;
  let lastResult = null;
  let lastError = null;

  // Attract demo state
  let attractTime = 0.0;
  let attractShipAngle = 0.0;
  let attractAsteroids = [
    { x: 150, y: 120, vx: 0.8, vy: 0.5, radius: 36, type: 'large' },
    { x: 450, y: 220, vx: -0.6, vy: 0.8, radius: 22, type: 'medium' },
    { x: 280, y: 380, vx: 0.9, vy: -0.4, radius: 12, type: 'small' },
  ];

  // Key listeners for gameplay
  const activeKeys = new Set();

  function onKeyDown(e) {
    if (!isFocusedInActivity) return;
    if (isTypingTarget(e.target)) return;
    const key = e.key.toLowerCase();
    activeKeys.add(key);

    if (key === ' ' || key === 'j') {
      // Fire sound preview on local trigger
      audio.playTone(880, 'square', 0.05, 0.2);
    }

    if (key === 'r' && (matchState === 'crashed' || matchState === 'completed')) {
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

    let rotate = 0.0;
    if (activeKeys.has('a') || activeKeys.has('arrowleft')) rotate -= 1.0;
    if (activeKeys.has('d') || activeKeys.has('arrowright')) rotate += 1.0;

    let thrust = 0.0;
    if (activeKeys.has('w') || activeKeys.has('arrowup')) thrust = 1.0;

    const fire = activeKeys.has(' ') || activeKeys.has('j');

    if (thrust > 0) {
      audio.playTone(110, 'sawtooth', 0.04, 0.12);
    }

    inputManager.sampleInput({
      rotate,
      thrust,
      fire,
      left: rotate < -0.1,
      right: rotate > 0.1,
      up: thrust > 0.1,
    });
  }

  // --- 7. Screen Drawing Routines ---
  function renderAttractDemo(dt) {
    if (!ctx) return;
    attractTime += dt;
    attractShipAngle += dt * 1.2;

    const w = canvas.width;
    const h = canvas.height;
    const sx = w / 2 + Math.cos(attractTime * 0.7) * 120;
    const sy = h / 2 + Math.sin(attractTime * 0.7) * 80;

    // Advance demo asteroids
    attractAsteroids.forEach(a => {
      a.x = (a.x + a.vx + w) % w;
      a.y = (a.y + a.vy + h) % h;
    });

    drawVectorField(
      { x: (sx / w) * ARENA_WIDTH, y: (sy / h) * ARENA_HEIGHT, angle: attractShipAngle, thrusting: true, invulnerable: 0 },
      attractAsteroids.map(a => ({ ...a, x: (a.x / w) * ARENA_WIDTH, y: (a.y / h) * ARENA_HEIGHT })),
      []
    );

    drawAttractBanner(ctx, w, h, {
      title: 'SIGNAL LOST',
      subtitle: 'ASTEROID SURVIVAL · VECTOR RADAR',
      tagline: 'PRESS E TO FLY',
      bannerText: 'DEMO',
      time: attractTime,
    });
  }

  function renderLiveGame(dt) {
    if (!ctx) return;

    const sim = latestSnapshot?.simState || {};
    const ship = sim.ship || { x: 400, y: 300, angle: 0, thrusting: false, invulnerable: 0 };
    const asteroids = sim.asteroids || [];
    const projectiles = sim.projectiles || [];

    drawVectorField(ship, asteroids, projectiles);
    drawHUD(runScore, runLives, runWave);

    if (matchState === 'crashed' || matchState === 'completed') {
      drawGameOverOverlay();
    }
  }

  function drawVectorField(ship, asteroids, projectiles) {
    const w = canvas.width;
    const h = canvas.height;
    const scaleX = w / ARENA_WIDTH;
    const scaleY = h / ARENA_HEIGHT;

    // Pitch black deep space background with stars
    ctx.fillStyle = '#07050d';
    ctx.fillRect(0, 0, w, h);

    // Static radar grid dots
    ctx.fillStyle = 'rgba(168, 85, 247, 0.15)';
    for (let x = 32; x < w; x += 48) {
      for (let y = 32; y < h; y += 48) {
        ctx.fillRect(x, y, 2, 2);
      }
    }

    // 1. Asteroids
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1.8;
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 8;

    asteroids.forEach(ast => {
      const ax = (ast.x || 0) * scaleX;
      const ay = (ast.y || 0) * scaleY;
      const r = (ast.radius || 20) * scaleX;

      ctx.beginPath();
      // Draw 8-sided polygon for vector asteroid look
      const points = 8;
      for (let i = 0; i <= points; i++) {
        const theta = (i / points) * Math.PI * 2;
        const jitter = (i % 2 === 0 ? 0.85 : 1.15);
        const px = ax + Math.cos(theta) * r * jitter;
        const py = ay + Math.sin(theta) * r * jitter;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    });

    // 2. Projectiles
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 10;
    projectiles.forEach(p => {
      const px = (p.x || 0) * scaleX;
      const py = (p.y || 0) * scaleY;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // 3. Ship
    const sx = (ship.x || 400) * scaleX;
    const sy = (ship.y || 300) * scaleY;
    const angle = ship.angle || 0;
    const isInvuln = (ship.invulnerable || 0) > 0;

    // Blinking during invulnerability
    if (!isInvuln || Math.floor(Date.now() / 120) % 2 === 0) {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(angle);

      // Ship triangle
      ctx.strokeStyle = '#f8fafc';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.0;

      ctx.beginPath();
      ctx.moveTo(15, 0);       // nose
      ctx.lineTo(-11, -9);     // left wing
      ctx.lineTo(-7, 0);       // rear indent
      ctx.lineTo(-11, 9);      // right wing
      ctx.closePath();
      ctx.stroke();

      // Thruster flame
      if (ship.thrusting) {
        ctx.strokeStyle = '#f97316';
        ctx.shadowColor = '#ea580c';
        ctx.beginPath();
        ctx.moveTo(-8, -4);
        ctx.lineTo(-18 - Math.random() * 6, 0);
        ctx.lineTo(-8, 4);
        ctx.stroke();
      }

      ctx.restore();
    }

    ctx.shadowBlur = 0;
  }

  function drawHUD(score, lives, wave) {
    const w = canvas.width;
    ctx.fillStyle = 'rgba(12, 10, 20, 0.75)';
    ctx.fillRect(0, 0, w, 28);

    // Lives (ship icons)
    for (let i = 0; i < lives; i++) {
      const lx = 18 + i * 16;
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(lx, 8);
      ctx.lineTo(lx - 5, 20);
      ctx.lineTo(lx + 5, 20);
      ctx.closePath();
      ctx.stroke();
    }

    // Score
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.fillText(`SCORE: ${String(score).padStart(6, '0')}`, w / 2, 18);

    // Wave
    ctx.textAlign = 'right';
    ctx.fillStyle = '#c084fc';
    ctx.fillText(`WAVE ${String(wave).padStart(2, '0')}`, w - 14, 18);
  }

  function drawGameOverOverlay() {
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = 'rgba(10, 8, 18, 0.85)';
    ctx.fillRect(0, h * 0.28, w, h * 0.44);

    ctx.textAlign = 'center';
    ctx.font = 'bold 26px monospace';
    ctx.fillStyle = matchState === 'crashed' ? '#ef4444' : '#a855f7';
    ctx.fillText(matchState === 'crashed' ? 'SIGNAL LOST' : 'MISSION COMPLETED', w / 2, h * 0.38);

    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(`FINAL SCORE: ${runScore}`, w / 2, h * 0.48);
    ctx.fillText(`SURVIVED TO WAVE ${runWave}`, w / 2, h * 0.54);

    ctx.font = '14px monospace';
    ctx.fillStyle = '#ffca7a';
    ctx.fillText('PRESS R TO RETRY · ESC TO EXIT', w / 2, h * 0.64);
  }

  return {
    id: activityDef.id,
    type: 'signal-lost',
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
        runLives = snapshot.simState.lives ?? 3;
        runWave = snapshot.simState.wave || 1;
      }
    },

    onEvent(event, payload) {
      if (event === 'match_started' || event === 'match_resumed') {
        matchState = 'running';
        runScore = 0;
        runLives = 3;
        runWave = 1;
        audio.playTone(440, 'sine', 0.2, 0.3);
      } else if (event === 'match_ended' || event === 'match_aborted') {
        matchState = payload?.reason === 'run_cap' ? 'completed' : 'crashed';
        outcome = payload;
        if (payload?.score) runScore = payload.score;
        if (payload?.wave) runWave = payload.wave;
        // Game over noise
        audio.playTone(65, 'sawtooth', 0.45, 0.4);
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
      this.lastResult = envelope?.result || envelope || null;
    },

    acceptError(envelope) {
      this.lastError = envelope?.error ? envelope : (envelope ? { error: envelope } : null);
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

export const SignalLostModule = Object.freeze({
  type: 'signal-lost',
  initialize(options) {
    return createSignalLostInstance(options);
  },
});

registerActivityModule('signal-lost', SignalLostModule);
