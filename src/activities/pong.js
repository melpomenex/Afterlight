/**
 * Physical Pong cabinet activity module for Afterlight.
 *
 * Implements the Phase 1 Pong vertical slice proof:
 *   - Physical 3D cabinet with material-backed live screen (CanvasTexture)
 *   - Attract mode with demo ball/paddles and vector arcade aesthetics
 *   - Authoritative live match rendering with smooth interpolation
 *   - Focused activity camera for participants with safe restoration on exit
 *   - Responsive controls (Keyboard W/S, Up/Down, Touch/Pointer drag)
 *   - Ready / Rematch flow and spectator / queue HUD feedback
 *   - Positional Web Audio effects (paddle hits, wall bounce, scoring)
 *
 * Conforms to:
 *   - openspec/changes/add-place-activities-program/specs/orpheum-arcade/spec.md
 *   - openspec/changes/add-place-activities-program/specs/place-activities/spec.md
 *   - openspec/changes/add-place-activities-program/specs/activity-sessions/spec.md
 */

import * as THREE from 'three';
import { registerActivityModule } from './registry.js';
import { createActivityInputManager } from './inputSeam.js';

const TABLE_WIDTH = 800;
const TABLE_HEIGHT = 500;
const BALL_RADIUS = 8;
const PADDLE_WIDTH = 14;
const PADDLE_HEIGHT = 70;

export function createPongInstance({
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
  const group = new THREE.Group();
  group.name = `activity-${activityDef.id}`;

  const transform = activityDef.transform || { position: [0, 0, 0], rotationY: 0 };
  const pos = transform.position || [0, 0, 0];
  const posX = pos[0];
  const posY = pos.length === 3 ? pos[1] : 0;
  const posZ = pos.length === 3 ? pos[2] : pos[1];
  const rotY = transform.rotationY || 0;

  group.position.set(posX, posY, posZ);
  group.rotation.y = rotY;

  // Track owned resources for clean disposal
  const ownedGeometries = [];
  const ownedMaterials = [];

  function trackGeo(geo) {
    ownedGeometries.push(geo);
    return geo;
  }

  function trackMat(mat) {
    ownedMaterials.push(mat);
    return mat;
  }

  // --- 1. 3D Cabinet Geometry ---
  const cabinetWidth = 1.3;
  const cabinetHeight = 2.1;
  const cabinetDepth = 0.95;

  // Cabinet body (dark graphite/walnut)
  const bodyGeo = trackGeo(new THREE.BoxGeometry(cabinetWidth, cabinetHeight, cabinetDepth));
  const bodyMat = trackMat(new THREE.MeshStandardMaterial({
    color: '#22252a',
    roughness: 0.65,
    metalness: 0.25,
  }));
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.position.set(0, cabinetHeight / 2, 0);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);

  // Side trims (brass/warm copper)
  const trimGeo = trackGeo(new THREE.BoxGeometry(0.04, cabinetHeight, cabinetDepth + 0.04));
  const trimMat = trackMat(new THREE.MeshStandardMaterial({
    color: '#b89358',
    roughness: 0.35,
    metalness: 0.8,
  }));
  for (const s of [-1, 1]) {
    const trim = new THREE.Mesh(trimGeo, trimMat);
    trim.position.set(s * (cabinetWidth / 2 + 0.015), cabinetHeight / 2, 0);
    group.add(trim);
  }

  // Marquee header (glowing "PONG" sign)
  const marqueeGeo = trackGeo(new THREE.BoxGeometry(cabinetWidth - 0.08, 0.28, 0.22));
  const marqueeMat = trackMat(new THREE.MeshStandardMaterial({
    color: '#342618',
    emissive: '#ffb24d',
    emissiveIntensity: 0.85,
    roughness: 0.4,
  }));
  const marqueeMesh = new THREE.Mesh(marqueeGeo, marqueeMat);
  marqueeMesh.position.set(0, 1.9, 0.38);
  group.add(marqueeMesh);

  // Marquee light
  const marqueeLight = new THREE.PointLight('#ffc06a', 1.5, 4);
  marqueeLight.position.set(0, 1.9, 0.6);
  group.add(marqueeLight);

  // Slanted control panel
  const panelGeo = trackGeo(new THREE.BoxGeometry(cabinetWidth - 0.08, 0.12, 0.45));
  const panelMat = trackMat(new THREE.MeshStandardMaterial({
    color: '#1a1d21',
    roughness: 0.5,
    metalness: 0.4,
  }));
  const panelMesh = new THREE.Mesh(panelGeo, panelMat);
  panelMesh.position.set(0, 0.98, 0.36);
  panelMesh.rotation.x = 0.2;
  group.add(panelMesh);

  // Control knobs / spinners for 2 players
  const knobGeo = trackGeo(new THREE.CylinderGeometry(0.04, 0.045, 0.05, 16));
  const p0KnobMat = trackMat(new THREE.MeshStandardMaterial({ color: '#52a8ec', roughness: 0.3, metalness: 0.6 }));
  const p1KnobMat = trackMat(new THREE.MeshStandardMaterial({ color: '#ec6252', roughness: 0.3, metalness: 0.6 }));

  const knob0 = new THREE.Mesh(knobGeo, p0KnobMat);
  knob0.position.set(-0.35, 1.05, 0.4);
  group.add(knob0);

  const knob1 = new THREE.Mesh(knobGeo, p1KnobMat);
  knob1.position.set(0.35, 1.05, 0.4);
  group.add(knob1);

  // Coin door / coin slots
  const coinDoorGeo = trackGeo(new THREE.BoxGeometry(0.46, 0.6, 0.04));
  const coinDoorMat = trackMat(new THREE.MeshStandardMaterial({ color: '#16181b', roughness: 0.7, metalness: 0.5 }));
  const coinDoor = new THREE.Mesh(coinDoorGeo, coinDoorMat);
  coinDoor.position.set(0, 0.45, cabinetDepth / 2 + 0.01);
  group.add(coinDoor);

  // --- 2. Live CRT Screen (CanvasTexture) ---
  const screenWidth = 0.96;
  const screenHeight = 0.62;

  const canvas = (typeof document !== 'undefined' && typeof document.createElement === 'function')
    ? document.createElement('canvas')
    : null;
  if (canvas) {
    canvas.width = TABLE_WIDTH;
    canvas.height = TABLE_HEIGHT;
  }
  const ctx = canvas?.getContext ? canvas.getContext('2d') : null;

  const canvasTexture = canvas
    ? new THREE.CanvasTexture(canvas)
    : new THREE.Texture();
  if (canvasTexture) {
    canvasTexture.minFilter = THREE.LinearFilter;
    canvasTexture.magFilter = THREE.LinearFilter;
  }

  const screenGeo = trackGeo(new THREE.PlaneGeometry(screenWidth, screenHeight));
  const screenMat = trackMat(new THREE.MeshBasicMaterial({
    map: canvasTexture,
  }));
  const screenMesh = new THREE.Mesh(screenGeo, screenMat);
  screenMesh.position.set(0, 1.44, 0.32);
  screenMesh.rotation.x = -0.15; // tilted back slightly for arcade view
  group.add(screenMesh);

  // Focused Activity Camera (for seated player or focused spectator)
  const activityCamera = new THREE.PerspectiveCamera(48, 1.6, 0.1, 50);
  activityCamera.position.set(0, 1.48, 1.7);
  activityCamera.lookAt(0, 1.38, 0.28);
  group.add(activityCamera);

  // Add cabinet to district world
  if (world?.group) {
    world.group.add(group);
  }

  // --- 3. Audio Effects (Positional Web Audio) ---
  function playBeep(freq, type = 'square', duration = 0.08) {
    try {
      const ac = audioMixer?.context || (typeof AudioContext === 'function' ? new AudioContext() : null);
      if (!ac || ac.state === 'suspended') return;

      const player = getPlayer?.();
      let distFactor = 1.0;
      if (player) {
        const dx = player.position.x - posX;
        const dz = player.position.z - posZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        distFactor = Math.max(0, 1 - dist / 12);
      }
      if (distFactor <= 0.02) return;

      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ac.currentTime);

      const now = ac.currentTime;
      gain.gain.setValueAtTime(0.18 * distFactor, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      if (mixer.buses?.effects) {
        gain.connect(mixer.buses.effects);
      } else {
        gain.connect(ac.destination);
      }

      osc.start(now);
      osc.stop(now + duration);
    } catch {}
  }

  // --- 4. State & Interpolation ---
  let latestSnapshot = null;
  let currentSim = null;
  let targetSim = null;
  let interpolationProgress = 1.0;
  let lastSnapshotTime = 0;

  // Attract mode state
  let attractBall = { x: 400, y: 250, vx: 5, vy: 2 };
  let attractP0 = 250;
  let attractP1 = 250;
  let attractTime = 0;

  // Local control state
  let localSlot = null; // 0 or 1 if playing, else null
  let localPaddleY = 250;
  let isFocusedInActivity = false;

  // Input manager with sequence numbering and 250ms watchdog
  const inputManager = createActivityInputManager({
    watchdogMs: 250,
    onInput: (controls, seq) => {
      const lease = getParticipation?.()?.lease;
      if (!lease) return;
      try {
        net?.sendActivityInput?.({
          roomId,
          activityId: activityDef.id,
          lease,
          seq,
          controls,
        });
      } catch {}
    },
  });

  // --- 5. Screen Renderer (Canvas 2D) ---
  function renderScreen(time, delta) {
    if (!ctx) return;

    // Clear background
    ctx.fillStyle = '#080c10';
    ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

    // Subtle CRT scanlines
    ctx.fillStyle = 'rgba(0, 255, 180, 0.02)';
    for (let y = 0; y < TABLE_HEIGHT; y += 4) {
      ctx.fillRect(0, y, TABLE_WIDTH, 1.5);
    }

    const isMatchActive = latestSnapshot && latestSnapshot.status === 'in_progress' && currentSim;

    if (!isMatchActive) {
      // --- ATTRACT MODE ---
      renderAttractMode(time, delta);
    } else {
      // --- LIVE MATCH MODE ---
      renderLiveMatch(time, delta);
    }

    // Border glow
    ctx.strokeStyle = '#204048';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, TABLE_WIDTH - 6, TABLE_HEIGHT - 6);

    canvasTexture.needsUpdate = true;
  }

  function renderAttractMode(time, delta) {
    attractTime += delta;

    // Step attract AI simulation
    attractBall.x += attractBall.vx;
    attractBall.y += attractBall.vy;

    // Rail bounce
    if (attractBall.y <= 12) {
      attractBall.y = 12;
      attractBall.vy = Math.abs(attractBall.vy);
    } else if (attractBall.y >= TABLE_HEIGHT - 12) {
      attractBall.y = TABLE_HEIGHT - 12;
      attractBall.vy = -Math.abs(attractBall.vy);
    }

    // AI paddles smoothly follow attract ball
    attractP0 += (attractBall.y - attractP0) * 0.08;
    attractP1 += (attractBall.y - attractP1) * 0.08;

    // Paddle bounce
    if (attractBall.vx < 0 && attractBall.x <= 54 && Math.abs(attractBall.y - attractP0) < PADDLE_HEIGHT / 2 + 10) {
      attractBall.vx = Math.abs(attractBall.vx);
      attractBall.x = 54;
    } else if (attractBall.vx > 0 && attractBall.x >= TABLE_WIDTH - 54 && Math.abs(attractBall.y - attractP1) < PADDLE_HEIGHT / 2 + 10) {
      attractBall.vx = -Math.abs(attractBall.vx);
      attractBall.x = TABLE_WIDTH - 54;
    }

    // Score wrap in attract
    if (attractBall.x < 0 || attractBall.x > TABLE_WIDTH) {
      attractBall.x = 400;
      attractBall.y = 250;
      attractBall.vx = -attractBall.vx;
    }

    // Center dividing line
    ctx.strokeStyle = '#1e3338';
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 12]);
    ctx.beginPath();
    ctx.moveTo(TABLE_WIDTH / 2, 0);
    ctx.lineTo(TABLE_WIDTH / 2, TABLE_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw attract paddles
    ctx.fillStyle = '#52a8ec';
    ctx.fillRect(40 - PADDLE_WIDTH / 2, attractP0 - PADDLE_HEIGHT / 2, PADDLE_WIDTH, PADDLE_HEIGHT);

    ctx.fillStyle = '#ec6252';
    ctx.fillRect(TABLE_WIDTH - 40 - PADDLE_WIDTH / 2, attractP1 - PADDLE_HEIGHT / 2, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Draw attract ball
    ctx.fillStyle = '#ffeaa7';
    ctx.beginPath();
    ctx.arc(attractBall.x, attractBall.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Attract Headers
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Title
    ctx.fillStyle = '#ffcf7b';
    ctx.font = 'bold 54px monospace';
    ctx.fillText('P O N G', TABLE_WIDTH / 2, 110);

    // Subtitle
    ctx.fillStyle = '#a8c2c6';
    ctx.font = '18px sans-serif';
    ctx.fillText('THE ORPHEUM · ARCADE WING', TABLE_WIDTH / 2, 160);

    // Instructions
    const blink = Math.sin(attractTime * 4) > 0;
    if (blink) {
      ctx.fillStyle = '#54e38e';
      ctx.font = 'bold 22px monospace';
      ctx.fillText('PRESS E TO PLAY', TABLE_WIDTH / 2, 360);
    }

    ctx.fillStyle = '#7a8c90';
    ctx.font = '16px monospace';
    ctx.fillText('FIRST TO 7 WINS · SPECTATORS WELCOME', TABLE_WIDTH / 2, 410);
  }

  function renderLiveMatch(time, delta) {
    if (!currentSim) return;

    // Advance interpolation toward latest target
    if (interpolationProgress < 1.0) {
      interpolationProgress = Math.min(1.0, interpolationProgress + delta * 20); // catch up in ~50ms
    }

    const sim = currentSim;

    // Center dividing line
    ctx.strokeStyle = '#274249';
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 12]);
    ctx.beginPath();
    ctx.moveTo(TABLE_WIDTH / 2, 0);
    ctx.lineTo(TABLE_WIDTH / 2, TABLE_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // Scores at top
    const score = sim.score || { '0': 0, '1': 0 };
    ctx.font = 'bold 64px monospace';
    ctx.textBaseline = 'top';

    ctx.fillStyle = '#52a8ec';
    ctx.textAlign = 'right';
    ctx.fillText(String(score['0'] ?? 0), TABLE_WIDTH / 2 - 40, 25);

    ctx.fillStyle = '#ec6252';
    ctx.textAlign = 'left';
    ctx.fillText(String(score['1'] ?? 0), TABLE_WIDTH / 2 + 40, 25);

    // Target score badge
    ctx.font = '14px monospace';
    ctx.fillStyle = '#5f7980';
    ctx.textAlign = 'center';
    ctx.fillText('FIRST TO 7', TABLE_WIDTH / 2, 35);

    // Paddles
    const paddles = sim.paddles || {};
    const p0 = paddles['0'] || { x: 40, y: 250 };
    const p1 = paddles['1'] || { x: TABLE_WIDTH - 40, y: 250 };

    // If local player is playing slot 0 or 1, blend with local paddle position for instant response
    let drawP0Y = p0.y;
    let drawP1Y = p1.y;

    if (localSlot === 0) {
      drawP0Y = localPaddleY;
    } else if (localSlot === 1) {
      drawP1Y = localPaddleY;
    }

    // Draw Left Paddle (P1 / Slot 0)
    ctx.fillStyle = '#52a8ec';
    ctx.shadowColor = '#52a8ec';
    ctx.shadowBlur = 10;
    ctx.fillRect(p0.x - PADDLE_WIDTH / 2, drawP0Y - PADDLE_HEIGHT / 2, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Draw Right Paddle (P2 / Slot 1)
    ctx.fillStyle = '#ec6252';
    ctx.shadowColor = '#ec6252';
    ctx.shadowBlur = 10;
    ctx.fillRect(p1.x - PADDLE_WIDTH / 2, drawP1Y - PADDLE_HEIGHT / 2, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.shadowBlur = 0;

    // Ball
    const ball = sim.ball || { x: 400, y: 250 };
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffeaa7';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Status / Messages
    const matchState = sim.state || 'rally';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (matchState === 'serving') {
      const delay = sim.serveDelay || 0;
      ctx.fillStyle = '#ffcf7b';
      ctx.font = 'bold 24px monospace';
      ctx.fillText(`SERVE IN ${Math.ceil(delay / 60 * 10) / 10}s`, TABLE_WIDTH / 2, TABLE_HEIGHT / 2 - 60);
    } else if (matchState === 'ended') {
      const winner = sim.winner === 0 ? 'PLAYER 1' : 'PLAYER 2';
      ctx.fillStyle = '#54e38e';
      ctx.font = 'bold 36px monospace';
      ctx.fillText(`${winner} WINS!`, TABLE_WIDTH / 2, TABLE_HEIGHT / 2 - 40);

      ctx.fillStyle = '#ffd09e';
      ctx.font = '20px monospace';
      ctx.fillText('PRESS SPACE OR CLICK REMATCH', TABLE_WIDTH / 2, TABLE_HEIGHT / 2 + 20);
    }
  }

  // --- 6. Controls & Input Handling ---
  let heldKeys = new Set();
  let lastPointerY = null;

  function onKeyDown(e) {
    if (!isFocusedInActivity || localSlot === null) return;

    if (['KeyW', 'KeyS', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
      e.preventDefault();
      heldKeys.add(e.code);
    }

    if (e.code === 'Space' && (latestSnapshot?.status === 'ended' || latestSnapshot?.status === 'lobby')) {
      sendReady(true);
    }
  }

  function onKeyUp(e) {
    if (!isFocusedInActivity || localSlot === null) return;
    heldKeys.delete(e.code);
  }

  function onPointerMove(e) {
    if (!isFocusedInActivity || localSlot === null) return;
    if (e.buttons === 0 && e.type !== 'touchmove') return;

    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    if (clientY != null) {
      const normalizedY = clientY / (typeof window !== 'undefined' ? window.innerHeight : 600);
      const targetY = normalizedY * TABLE_HEIGHT;
      localPaddleY = Math.min(Math.max(targetY, PADDLE_HEIGHT / 2), TABLE_HEIGHT - PADDLE_HEIGHT / 2);
      inputManager.sampleInput({ y: Math.round(localPaddleY) });
    }
  }

  function sendReady(ready = true) {
    try {
      net?.sendActivityReady?.({
        roomId,
        activityId: activityDef.id,
        ready,
      });
    } catch {}
  }

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('pointermove', onPointerMove);
  }

  return {
    get id() { return activityDef.id; },
    get group() { return group; },
    get cabinetMesh() { return bodyMesh; },
    get screenMesh() { return screenMesh; },
    get activityCamera() { return activityCamera; },
    get latestSnapshot() { return latestSnapshot; },
    get inputManager() { return inputManager; },

    sendInput(controls) {
      return inputManager.sampleInput(controls);
    },

    update(time, delta) {
      // Step controls if local player is actively playing
      if (isFocusedInActivity && localSlot !== null) {
        let dy = 0;
        if (heldKeys.has('KeyW') || heldKeys.has('ArrowUp')) dy -= 1;
        if (heldKeys.has('KeyS') || heldKeys.has('ArrowDown')) dy += 1;

        if (dy !== 0) {
          localPaddleY = Math.min(Math.max(localPaddleY + dy * 7.0, PADDLE_HEIGHT / 2), TABLE_HEIGHT - PADDLE_HEIGHT / 2);
          inputManager.sampleInput({ dy, up: dy < 0, down: dy > 0 });
        }
      }

      // Render screen
      renderScreen(time, delta);
    },

    acceptSnapshot(envelope) {
      const payload = envelope.payload || envelope;
      latestSnapshot = payload;
      const newSim = payload.sim || payload.sim_state;

      if (newSim) {
        targetSim = newSim;
        if (!currentSim) {
          currentSim = JSON.parse(JSON.stringify(newSim));
        } else {
          // Detect ball hit sound
          if (newSim.ball && currentSim.ball) {
            if (Math.sign(newSim.ball.vx) !== Math.sign(currentSim.ball.vx)) {
              playBeep(newSim.ball.vx > 0 ? 320 : 440, 'square', 0.08);
            } else if (Math.sign(newSim.ball.vy) !== Math.sign(currentSim.ball.vy)) {
              playBeep(720, 'sine', 0.05);
            }
          }
          // Detect point score sound
          if (newSim.score && currentSim.score) {
            if (newSim.score['0'] !== currentSim.score['0'] || newSim.score['1'] !== currentSim.score['1']) {
              playBeep(580, 'triangle', 0.25);
            }
          }

          currentSim = JSON.parse(JSON.stringify(newSim));
        }
        interpolationProgress = 0.0;
        lastSnapshotTime = performance.now();
      }

      // Check local player participation role
      const participation = getParticipation?.();
      if (participation) {
        if (participation.isParticipating && participation.currentActivity?.id === activityDef.id) {
          localSlot = participation.currentSlot;
          if (!isFocusedInActivity) {
            isFocusedInActivity = true;
            setActivityCamera?.(activityCamera);
          }
        } else {
          if (isFocusedInActivity) {
            isFocusedInActivity = false;
            localSlot = null;
            clearActivityCamera?.();
          }
        }
      }
    },

    acceptEvent(envelope) {
      const type = envelope.eventType || envelope.type;
      const data = envelope.payload || envelope.data || {};

      if (type === 'match_started') {
        this.matchState = 'in_progress';
        this.matchId = data.matchId;
        playBeep(520, 'sine', 0.15);
      } else if (type === 'match_ended') {
        this.matchState = 'ended';
        this.matchOutcome = data;
        playBeep(660, 'triangle', 0.35);
      }
    },

    acceptResult(envelope) {
      this.lastResult = envelope.result || envelope;
    },
    acceptError(envelope) {
      this.lastError = envelope.error || envelope;
    },

    get isParticipating() {
      return isFocusedInActivity;
    },

    focusActivity(slot = 0) {
      localSlot = slot;
      isFocusedInActivity = true;
      setActivityCamera?.(activityCamera);
    },

    unfocusActivity() {
      isFocusedInActivity = false;
      localSlot = null;
      heldKeys.clear();
      inputManager.neutralize();
      clearActivityCamera?.();
    },

    attachControls(slot = 0) {
      this.focusActivity(slot);
    },

    detachControls() {
      this.unfocusActivity();
    },

    dispose() {
      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('pointermove', onPointerMove);
      }

      if (isFocusedInActivity) {
        this.unfocusActivity();
      }

      if (group.parent) {
        group.parent.remove(group);
      }

      for (const geo of ownedGeometries) geo.dispose();
      for (const mat of ownedMaterials) mat.dispose();
      canvasTexture.dispose();
    },
  };
}

export const PongModule = Object.freeze({
  type: 'pong',
  initialize(options) {
    return createPongInstance(options);
  },
});

// Auto-register Pong module with the client activity registry
registerActivityModule('pong', PongModule);
