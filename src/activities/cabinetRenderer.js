/**
 * Shared arcade cabinet presentation and runtime controls.
 *
 * Provides reusable 3D cabinet geometry, CRT screen texturing, visibility
 * throttling, focused reframing cameras, and spatial audio for all arcade
 * activities (Pong, Rain Runner, Signal Lost, Sporefall).
 *
 * Conforms to:
 *   - openspec/changes/add-place-activities-program/specs/orpheum-arcade/spec.md
 *   - openspec/changes/add-place-activities-program/specs/place-activities/spec.md
 */

import * as THREE from 'three';

export const THROTTLE_BUDGETS = Object.freeze({
  DEFAULT_TEXTURE_SIZE: 512,
  FOCUSED_TEXTURE_SIZE: 1024,
  FOCUSED_INTERVAL_MS: 0,       // Presentation rate (~60 Hz / RAF)
  SPECTATOR_INTERVAL_MS: 50,    // Max 20 Hz
  ATTRACT_INTERVAL_MS: 100,     // Max 10 Hz
  MAX_AUDIBLE_DISTANCE: 12,     // Positional falloff cutoff
  MAX_RENDER_DISTANCE: 24,      // Screen culling cutoff (covers the east-wall
                                // arcade row from the Orpheum spawn, ~21 units)
  MAX_CONCURRENT_VOICES: 4,     // Voice cap for synth
});

/**
 * Creates a visibility and frame rate throttler for cabinet rendering.
 */
export function createVisibilityThrottler({
  getPosition,
  getPlayer = null,
  maxDistance = THROTTLE_BUDGETS.MAX_RENDER_DISTANCE,
} = {}) {
  let lastRenderTime = 0;

  return {
    getDistance() {
      const player = getPlayer?.();
      const pos = getPosition?.() || [0, 0, 0];
      if (!player?.position) return 0;
      const px = player.position.x;
      const pz = player.position.z;
      const cx = Array.isArray(pos) ? pos[0] : (pos.x || 0);
      const cz = Array.isArray(pos) ? (pos.length === 3 ? pos[2] : pos[1]) : (pos.z || 0);
      const dx = px - cx;
      const dz = pz - cz;
      return Math.sqrt(dx * dx + dz * dz);
    },

    getTier(isFocused, placeVisible = true) {
      if (!placeVisible) return 'culled';
      if (isFocused) return 'focused';
      const dist = this.getDistance();
      if (dist > maxDistance) return 'culled';
      if (dist <= 6.0) return 'spectator';
      return 'attract';
    },

    shouldRender(isFocused, placeVisible = true, now = performance.now()) {
      const tier = this.getTier(isFocused, placeVisible);
      if (tier === 'culled') return false;
      if (tier === 'focused') {
        lastRenderTime = now;
        return true;
      }
      const interval = tier === 'spectator'
        ? THROTTLE_BUDGETS.SPECTATOR_INTERVAL_MS
        : THROTTLE_BUDGETS.ATTRACT_INTERVAL_MS;
      if (now - lastRenderTime >= interval) {
        lastRenderTime = now;
        return true;
      }
      return false;
    },

    reset() {
      lastRenderTime = 0;
    },
  };
}

/**
 * Creates a shared physical arcade cabinet 3D mesh hierarchy.
 */
export function createCabinetMesh({
  width = 1.3,
  height = 2.1,
  depth = 0.95,
  screenWidth = 0.96,
  screenHeight = 0.62,
  screenTilt = -0.15,
  bodyColor = '#22252a',
  trimColor = '#b89358',
  marqueeTitle = 'ARCADE',
  marqueeColor = '#ffb24d',
  controlStyle = 'joystick', // 'joystick', 'spinner', 'wheel'
  canvasTexture = null,
} = {}) {
  const group = new THREE.Group();
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

  // 1. Cabinet body
  const bodyGeo = trackGeo(new THREE.BoxGeometry(width, height, depth));
  const bodyMat = trackMat(new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: 0.65,
    metalness: 0.25,
  }));
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.position.set(0, height / 2, 0);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);

  // 2. Side bevel trims
  const trimGeo = trackGeo(new THREE.BoxGeometry(0.04, height, depth + 0.04));
  const trimMat = trackMat(new THREE.MeshStandardMaterial({
    color: trimColor,
    roughness: 0.35,
    metalness: 0.8,
  }));
  for (const s of [-1, 1]) {
    const trim = new THREE.Mesh(trimGeo, trimMat);
    trim.position.set(s * (width / 2 + 0.015), height / 2, 0);
    group.add(trim);
  }

  // 3. Marquee header
  const marqueeGeo = trackGeo(new THREE.BoxGeometry(width - 0.08, 0.28, 0.22));
  const marqueeMat = trackMat(new THREE.MeshStandardMaterial({
    color: '#342618',
    emissive: marqueeColor,
    emissiveIntensity: 0.85,
    roughness: 0.4,
  }));
  const marqueeMesh = new THREE.Mesh(marqueeGeo, marqueeMat);
  marqueeMesh.position.set(0, height - 0.2, depth / 2 - 0.1);
  group.add(marqueeMesh);

  const marqueeLight = new THREE.PointLight(marqueeColor, 1.2, 4);
  marqueeLight.position.set(0, height - 0.2, depth / 2 + 0.15);
  group.add(marqueeLight);

  // 4. Slanted control panel
  const panelGeo = trackGeo(new THREE.BoxGeometry(width - 0.08, 0.12, 0.45));
  const panelMat = trackMat(new THREE.MeshStandardMaterial({
    color: '#1a1d21',
    roughness: 0.5,
    metalness: 0.4,
  }));
  const panelMesh = new THREE.Mesh(panelGeo, panelMat);
  panelMesh.position.set(0, height * 0.47, depth / 2 - 0.12);
  panelMesh.rotation.x = 0.2;
  group.add(panelMesh);

  // Controls based on style
  if (controlStyle === 'joystick') {
    const baseGeo = trackGeo(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 12));
    const shaftGeo = trackGeo(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 8));
    const ballGeo = trackGeo(new THREE.SphereGeometry(0.025, 12, 12));
    const joyMat = trackMat(new THREE.MeshStandardMaterial({ color: '#ec4235', roughness: 0.3, metalness: 0.5 }));
    const metalMat = trackMat(new THREE.MeshStandardMaterial({ color: '#cfcfcf', metalness: 0.9 }));

    const joyBase = new THREE.Mesh(baseGeo, joyMat);
    joyBase.position.set(-0.25, height * 0.47 + 0.08, depth / 2 - 0.08);
    const shaft = new THREE.Mesh(shaftGeo, metalMat);
    shaft.position.set(0, 0.04, 0);
    const ball = new THREE.Mesh(ballGeo, joyMat);
    ball.position.set(0, 0.08, 0);
    joyBase.add(shaft);
    joyBase.add(ball);
    group.add(joyBase);

    // Buttons
    const btnGeo = trackGeo(new THREE.CylinderGeometry(0.025, 0.025, 0.015, 12));
    const btnColors = ['#4a90e2', '#50e3c2', '#f5a623'];
    btnColors.forEach((col, idx) => {
      const bMat = trackMat(new THREE.MeshStandardMaterial({ color: col, roughness: 0.3 }));
      const btn = new THREE.Mesh(btnGeo, bMat);
      btn.position.set(0.12 + idx * 0.08, height * 0.47 + 0.08, depth / 2 - 0.08);
      group.add(btn);
    });
  } else if (controlStyle === 'wheel') {
    const wheelGeo = trackGeo(new THREE.TorusGeometry(0.1, 0.02, 8, 20));
    const wheelMat = trackMat(new THREE.MeshStandardMaterial({ color: '#333333', roughness: 0.6 }));
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.position.set(0, height * 0.47 + 0.1, depth / 2 - 0.06);
    wheel.rotation.x = Math.PI / 4;
    group.add(wheel);
  } else if (controlStyle === 'spinner') {
    const knobGeo = trackGeo(new THREE.CylinderGeometry(0.04, 0.045, 0.05, 16));
    const k0Mat = trackMat(new THREE.MeshStandardMaterial({ color: '#52a8ec', roughness: 0.3, metalness: 0.6 }));
    const k1Mat = trackMat(new THREE.MeshStandardMaterial({ color: '#ec6252', roughness: 0.3, metalness: 0.6 }));
    const k0 = new THREE.Mesh(knobGeo, k0Mat);
    k0.position.set(-0.35, height * 0.47 + 0.07, depth / 2 - 0.08);
    const k1 = new THREE.Mesh(knobGeo, k1Mat);
    k1.position.set(0.35, height * 0.47 + 0.07, depth / 2 - 0.08);
    group.add(k0);
    group.add(k1);
  }

  // 5. Coin door
  const coinDoorGeo = trackGeo(new THREE.BoxGeometry(0.46, 0.6, 0.04));
  const coinDoorMat = trackMat(new THREE.MeshStandardMaterial({ color: '#16181b', roughness: 0.7, metalness: 0.5 }));
  const coinDoor = new THREE.Mesh(coinDoorGeo, coinDoorMat);
  coinDoor.position.set(0, 0.45, depth / 2 + 0.01);
  group.add(coinDoor);

  // 6. CRT screen mesh with bezel
  const bezelGeo = trackGeo(new THREE.BoxGeometry(screenWidth + 0.08, screenHeight + 0.08, 0.06));
  const bezelMat = trackMat(new THREE.MeshStandardMaterial({ color: '#0d0f12', roughness: 0.8 }));
  const bezel = new THREE.Mesh(bezelGeo, bezelMat);
  bezel.position.set(0, height * 0.68, depth / 2 - 0.15);
  bezel.rotation.x = screenTilt;
  group.add(bezel);

  const screenGeo = trackGeo(new THREE.PlaneGeometry(screenWidth, screenHeight));
  const screenMat = trackMat(new THREE.MeshBasicMaterial({
    map: canvasTexture || new THREE.Texture(),
  }));
  const screenMesh = new THREE.Mesh(screenGeo, screenMat);
  screenMesh.position.set(0, 0, 0.035); // relative to bezel
  bezel.add(screenMesh);

  // 7. Activity Camera for focused participants
  const activityCamera = new THREE.PerspectiveCamera(48, screenWidth / screenHeight, 0.1, 50);
  activityCamera.position.set(0, height * 0.70, depth / 2 + 1.25);
  activityCamera.lookAt(0, height * 0.68, depth / 2 - 0.15);
  group.add(activityCamera);

  function dispose() {
    for (const geo of ownedGeometries) {
      try { geo.dispose(); } catch {}
    }
    for (const mat of ownedMaterials) {
      try { mat.dispose(); } catch {}
    }
    ownedGeometries.length = 0;
    ownedMaterials.length = 0;
  }

  return {
    group,
    bodyMesh,
    screenMesh,
    marqueeLight,
    activityCamera,
    dispose,
  };
}

/**
 * Creates a managed 2D canvas texture pipeline with resolution budgeting.
 */
export function createScreenPipeline({
  defaultWidth = 512,
  defaultHeight = 512,
  focusedWidth = 1024,
  focusedHeight = 1024,
} = {}) {
  const canvas = (typeof document !== 'undefined' && typeof document.createElement === 'function')
    ? document.createElement('canvas')
    : null;

  if (canvas) {
    canvas.width = defaultWidth;
    canvas.height = defaultHeight;
  }

  const ctx = canvas?.getContext ? canvas.getContext('2d') : null;
  const texture = canvas ? new THREE.CanvasTexture(canvas) : new THREE.Texture();
  if (texture) {
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
  }

  let currentFocused = false;

  return {
    canvas,
    ctx,
    texture,
    setFocused(focused) {
      if (focused === currentFocused || !canvas) return;
      currentFocused = !!focused;
      const targetW = currentFocused ? focusedWidth : defaultWidth;
      const targetH = currentFocused ? focusedHeight : defaultHeight;
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
        texture.needsUpdate = true;
      }
    },
    update() {
      if (texture) texture.needsUpdate = true;
    },
    dispose() {
      try { texture.dispose(); } catch {}
    },
  };
}

/**
 * Creates a spatial synthesized audio manager with voice limits and falloff.
 */
export function createCabinetAudio({
  getPosition,
  getPlayer = null,
  audioMixer = null,
  maxDistance = THROTTLE_BUDGETS.MAX_AUDIBLE_DISTANCE,
  maxVoices = THROTTLE_BUDGETS.MAX_CONCURRENT_VOICES,
} = {}) {
  const activeVoices = new Set();
  let isMuted = false;

  function getDistanceFactor() {
    const player = getPlayer?.();
    const pos = getPosition?.() || [0, 0, 0];
    if (!player?.position) return 1.0;
    const px = player.position.x;
    const pz = player.position.z;
    const cx = Array.isArray(pos) ? pos[0] : (pos.x || 0);
    const cz = Array.isArray(pos) ? (pos.length === 3 ? pos[2] : pos[1]) : (pos.z || 0);
    const dist = Math.sqrt((px - cx) ** 2 + (pz - cz) ** 2);
    return Math.max(0, 1 - dist / maxDistance);
  }

  function playTone(freq, type = 'square', duration = 0.08, baseVolume = 0.18) {
    if (isMuted) return;
    try {
      const ac = audioMixer?.context || (typeof AudioContext === 'function' ? new AudioContext() : null);
      if (!ac || ac.state === 'suspended') return;

      const distFactor = getDistanceFactor();
      if (distFactor <= 0.02) return;

      // Enforce voice cap: stop oldest if exceeding limit
      if (activeVoices.size >= maxVoices) {
        const oldest = activeVoices.values().next().value;
        if (oldest) {
          try { oldest.stop(); } catch {}
          activeVoices.delete(oldest);
        }
      }

      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ac.currentTime);

      const now = ac.currentTime;
      const vol = baseVolume * distFactor;
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      if (audioMixer?.buses?.effects) {
        gain.connect(audioMixer.buses.effects);
      } else {
        gain.connect(ac.destination);
      }

      activeVoices.add(osc);
      osc.onended = () => {
        activeVoices.delete(osc);
      };

      osc.start(now);
      osc.stop(now + duration);
    } catch {}
  }

  function stopAll() {
    for (const voice of activeVoices) {
      try { voice.stop(); } catch {}
    }
    activeVoices.clear();
  }

  function setMuted(muted) {
    isMuted = !!muted;
    if (isMuted) stopAll();
  }

  function dispose() {
    stopAll();
  }

  return {
    playTone,
    stopAll,
    setMuted,
    dispose,
  };
}

/**
 * Renders a standardized, honest arcade attract mode overlay.
 */
export function drawAttractBanner(ctx, width, height, {
  title = 'ARCADE',
  subtitle = 'FREE PLAY · DROP IN',
  tagline = 'Press E to Play',
  bannerText = 'DEMO',
  time = 0,
} = {}) {
  if (!ctx) return;

  // Scanlines effect
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  for (let y = 0; y < height; y += 4) {
    ctx.fillRect(0, y, width, 2);
  }

  // Top banner: explicit DEMO / ATTRACT MODE
  ctx.fillStyle = 'rgba(18, 22, 28, 0.85)';
  ctx.fillRect(0, 0, width, 40);
  ctx.fillStyle = '#ffaa33';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const pulse = Math.sin(time * 3) > 0 ? ' [ATTRACT DEMO] ' : ' [DEMO MODE] ';
  ctx.fillText(`${bannerText}${pulse}`, width / 2, 20);

  // Center title with phosphor glow
  const titleY = height * 0.35;
  ctx.shadowColor = '#4df';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#e8f4f8';
  ctx.font = 'bold 36px monospace';
  ctx.fillText(title, width / 2, titleY);

  // Subtitle
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#8ab4c8';
  ctx.font = '16px monospace';
  ctx.fillText(subtitle, width / 2, titleY + 36);

  // Bottom prompt (subtle pulsing "PRESS E TO PLAY")
  const promptY = height * 0.82;
  const promptAlpha = 0.6 + Math.sin(time * 4) * 0.35;
  ctx.fillStyle = `rgba(255, 202, 122, ${promptAlpha.toFixed(2)})`;
  ctx.font = 'bold 20px monospace';
  ctx.fillText(tagline, width / 2, promptY);

  ctx.restore();
}
