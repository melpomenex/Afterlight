/**
 * Multi-input controller for Air Hockey (Phase 4, Task 6.2).
 *
 * Implements:
 *   - Keyboard (WASD / Arrows)
 *   - Mouse pointer raycast tracking on table surface
 *   - Touch drag on mobile / tablet
 *   - Gamepad analog stick support
 *   - Series length selection modal (Single game, BO3, BO5, BO7)
 *   - Ready / unready toggle and HUD overlay
 */

import * as THREE from 'three';
import { MAX_MALLET_SPEED } from '../../../shared/airHockeyModel.js';

export function createAirHockeyController({
  tablePosition = [5.8, 0, 7.0],
  tableRotationY = 0,
  getActiveCamera = null,
  onSendInput = null,
  onSelectSeries = null,
  onToggleReady = null,
  onLeave = null,
} = {}) {
  let enabled = false;
  let mySlot = 0;
  let isReady = false;
  let currentSeriesLength = 1;
  let matchStatus = 'lobby';

  const tablePosVec = new THREE.Vector3(tablePosition[0], tablePosition[1] || 0, tablePosition[2]);
  const tablePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(tablePosition[1] || 0) - 0.80);
  const raycaster = new THREE.Raycaster();
  const mouseVec = new THREE.Vector2();

  // Held keys
  const keys = {
    KeyW: false,
    KeyS: false,
    KeyA: false,
    KeyD: false,
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
  };

  // Local predicted mallet position in simulation coordinates
  let localSimX = 30.0;
  let localSimY = 50.0;
  let lastTargetX = 30.0;
  let lastTargetY = 50.0;

  // DOM HUD Overlay
  let hudContainer = null;
  let seriesSelectorEl = null;
  let readyBtn = null;
  let leaveBtn = null;
  let statusBanner = null;

  function createHud() {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
    hudContainer = document.createElement('div');
    hudContainer.className = 'air-hockey-hud';
    hudContainer.style.display = 'none';

    hudContainer.innerHTML = `
      <div class="air-hockey-card">
        <div class="air-hockey-header">
          <span class="air-hockey-title">AIR HOCKEY</span>
          <span class="air-hockey-slot-badge" id="ah-slot-badge">P1</span>
        </div>
        <div class="air-hockey-status" id="ah-status-banner">WAITING FOR OPPONENT</div>
        <div class="air-hockey-series-picker" id="ah-series-picker">
          <span class="series-label">SERIES:</span>
          <div class="series-buttons">
            <button class="series-btn active" data-len="1">1</button>
            <button class="series-btn" data-len="3">BO3</button>
            <button class="series-btn" data-len="5">BO5</button>
            <button class="series-btn" data-len="7">BO7</button>
          </div>
        </div>
        <div class="air-hockey-actions">
          <button class="ah-btn ah-ready-btn" id="ah-ready-btn">READY</button>
          <button class="ah-btn ah-leave-btn" id="ah-leave-btn">LEAVE</button>
        </div>
        <div class="air-hockey-help">
          WASD / Drag pointer to strike puck · Defend your goal!
        </div>
      </div>
    `;

    document.body.appendChild(hudContainer);

    // Bind UI actions
    const seriesBtns = hudContainer.querySelectorAll('.series-btn');
    seriesBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (matchStatus !== 'lobby' || isReady) return;
        const len = parseInt(btn.getAttribute('data-len'), 10);
        currentSeriesLength = len;
        seriesBtns.forEach(b => b.classList.toggle('active', b === btn));
        onSelectSeries?.(len);
      });
    });

    readyBtn = hudContainer.querySelector('#ah-ready-btn');
    readyBtn.addEventListener('click', () => {
      isReady = !isReady;
      readyBtn.classList.toggle('ready-active', isReady);
      readyBtn.textContent = isReady ? 'UNREADY' : 'READY';
      onToggleReady?.(isReady, currentSeriesLength);
    });

    leaveBtn = hudContainer.querySelector('#ah-leave-btn');
    leaveBtn.addEventListener('click', () => {
      onLeave?.();
    });

    statusBanner = hudContainer.querySelector('#ah-status-banner');
    seriesSelectorEl = hudContainer.querySelector('#ah-series-picker');
  }

  createHud();

  function onKeyDown(e) {
    if (!enabled) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.code in keys) {
      keys[e.code] = true;
      e.preventDefault();
    }
  }

  function onKeyUp(e) {
    if (!enabled) return;
    if (e.code in keys) {
      keys[e.code] = false;
      e.preventDefault();
    }
  }

  function onPointerMove(e) {
    if (!enabled || !getActiveCamera) return;

    const camera = getActiveCamera();
    if (!camera) return;

    mouseVec.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseVec.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouseVec, camera);
    const hitPoint = new THREE.Vector3();
    const hit = raycaster.ray.intersectPlane(tablePlane, hitPoint);

    if (hit) {
      // Transform world hit to table local space
      const localHit = hitPoint.clone().sub(tablePosVec);
      if (tableRotationY !== 0) {
        localHit.applyAxisAngle(new THREE.Vector3(0, 1, 0), -tableRotationY);
      }

      // Convert local space (X in [-1.0, 1.0], Z in [-0.5, 0.5])
      // to simulation coordinates (X in [0, 200], Y in [0, 100])
      const simX = localHit.x * 100.0 + 100.0;
      const simY = localHit.z * 100.0 + 50.0;

      // Clamp target to player's half
      const isSlot0 = mySlot === 0;
      const minX = isSlot0 ? 7.0 : 107.0;
      const maxX = isSlot0 ? 93.0 : 193.0;

      lastTargetX = Math.max(minX, Math.min(maxX, simX));
      lastTargetY = Math.max(7.0, Math.min(93.0, simY));
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('pointermove', onPointerMove);
  }

  return {
    activate({ slot = 0, status = 'lobby', seriesLength = 1 } = {}) {
      enabled = true;
      mySlot = slot;
      matchStatus = status;
      currentSeriesLength = seriesLength;
      isReady = false;

      localSimX = slot === 0 ? 30.0 : 170.0;
      localSimY = 50.0;
      lastTargetX = localSimX;
      lastTargetY = localSimY;

      if (hudContainer) {
        hudContainer.style.display = 'block';
        const badge = hudContainer.querySelector('#ah-slot-badge');
        if (badge) {
          badge.textContent = slot === 0 ? 'P1 (RED)' : 'P2 (BLUE)';
          badge.style.background = slot === 0 ? '#d32f2f' : '#1976d2';
        }
        if (readyBtn) {
          readyBtn.classList.remove('ready-active');
          readyBtn.textContent = 'READY';
        }
        if (seriesSelectorEl) {
          seriesSelectorEl.style.display = status === 'lobby' ? 'flex' : 'none';
        }
      }
    },

    deactivate() {
      enabled = false;
      isReady = false;
      Object.keys(keys).forEach(k => { keys[k] = false; });
      if (hudContainer) {
        hudContainer.style.display = 'none';
      }
    },

    setStatus(status, text) {
      matchStatus = status;
      if (statusBanner) {
        statusBanner.textContent = text || status.toUpperCase();
      }
      if (seriesSelectorEl) {
        seriesSelectorEl.style.display = status === 'lobby' ? 'flex' : 'none';
      }
    },

    getPredictedMallet() {
      return { x: localSimX, y: localSimY };
    },

    reconcile(authoritativeMallet) {
      if (!authoritativeMallet) return;
      // Smoothly blend authoritative position if drift occurs
      const driftX = authoritativeMallet.x - localSimX;
      const driftY = authoritativeMallet.y - localSimY;
      if (Math.hypot(driftX, driftY) > 0.05) {
        localSimX += driftX * 0.25;
        localSimY += driftY * 0.25;
      }
    },

    update(dt) {
      if (!enabled) return;

      // Check gamepad analog stick
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads[0] || gamepads[1];
      let padDx = 0;
      let padDy = 0;

      if (gp) {
        const ax0 = gp.axes[0] || 0;
        const ax1 = gp.axes[1] || 0;
        if (Math.abs(ax0) > 0.15) padDx = ax0 * MAX_MALLET_SPEED;
        if (Math.abs(ax1) > 0.15) padDy = ax1 * MAX_MALLET_SPEED;
      }

      // Digital keyboard movement
      let keyDx = 0;
      let keyDy = 0;
      if (keys.KeyW || keys.ArrowUp) keyDy -= MAX_MALLET_SPEED;
      if (keys.KeyS || keys.ArrowDown) keyDy += MAX_MALLET_SPEED;
      if (keys.KeyA || keys.ArrowLeft) keyDx -= MAX_MALLET_SPEED;
      if (keys.KeyD || keys.ArrowRight) keyDx += MAX_MALLET_SPEED;

      let targetX = lastTargetX;
      let targetY = lastTargetY;

      if (keyDx !== 0 || keyDy !== 0 || padDx !== 0 || padDy !== 0) {
        const dx = keyDx + padDx;
        const dy = keyDy + padDy;
        targetX = localSimX + dx;
        targetY = localSimY + dy;
      }

      // Clamp to player's half
      const isSlot0 = mySlot === 0;
      const minX = isSlot0 ? 7.0 : 107.0;
      const maxX = isSlot0 ? 93.0 : 193.0;

      const clampedX = Math.max(minX, Math.min(maxX, targetX));
      const clampedY = Math.max(7.0, Math.min(93.0, targetY));

      const moveDx = clampedX - localSimX;
      const moveDy = clampedY - localSimY;
      const dist = Math.hypot(moveDx, moveDy);

      if (dist > MAX_MALLET_SPEED && dist > 1e-6) {
        const scale = MAX_MALLET_SPEED / dist;
        localSimX += moveDx * scale;
        localSimY += moveDy * scale;
      } else {
        localSimX = clampedX;
        localSimY = clampedY;
      }

      // Broadcast client input
      onSendInput?.({
        x: localSimX,
        y: localSimY,
        targetX: clampedX,
        targetY: clampedY,
      });
    },

    destroy() {
      this.deactivate();
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('pointermove', onPointerMove);
      }
      if (hudContainer && hudContainer.parentNode) {
        hudContainer.parentNode.removeChild(hudContainer);
      }
    },
  };
}
