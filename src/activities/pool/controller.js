/**
 * Multi-input controller and interactive HUD for 8-ball billiards (Task 5.2; Spec social-billiards).
 *
 * Supports complete input parity across:
 *   - Mouse & Keyboard (mouse aim/drag, F charge/shoot, I/J/K/L spin, Esc cancel)
 *   - Touch (touch drag aim, power slider, tap spin widget, tap table for ball-in-hand)
 *   - Controller / Gamepad (analog sticks for aim & spin, RT/A for power/shoot, B cancel)
 *
 * Features:
 *   - Real-time aiming raycast with ghost-ball impact and target deflection prediction
 *   - Ball-in-hand placement with collision overlap validation
 *   - 2D cue-ball impact point selector (follow/topspin, draw/backspin, english/sidespin)
 *   - Called pocket selector for the 8-ball
 *   - Compact house-rules modal sheet
 */

import * as THREE from 'three';

import {
  TABLE_LENGTH,
  TABLE_WIDTH,
  HALF_LENGTH,
  HALF_WIDTH,
  BALL_RADIUS,
  BALL_DIAMETER,
  POCKETS,
} from '../../../shared/pool/physics.js';
import { needsCalledPocket } from '../../../shared/pool/rules.js';
import { isMediaUiEvent, mediaUiHasFocus } from '../inputSeam.js';

export function createPoolController({
  tablePosition = [-8.6, 0, -4.5],
  tableRotationY = Math.PI / 2,
  getActiveCamera = null,
  getCanvas = null,
  onShoot = null,
  onPlaceCueBall = null,
  onCallPocket = null,
  onResign = null,
  onExit = null,
  onCameraCycle = null,
  getHudHost = () => (typeof document !== 'undefined' ? document.body : null),
} = {}) {
  const tableX = tablePosition[0];
  const tableZ = tablePosition.length === 3 ? tablePosition[2] : tablePosition[1];

  // Aim and shot state
  let aimAngle = 0.0; // Radians in table local coordinates (rendered/smoothed)
  let aimTargetAngle = 0.0; // Mouse pointer target; rendered aimAngle follows it
  let hasAimTarget = false;
  // Mouse-aim presentation tuning (client-side only, not physics).
  const AIM_NEAR_BALL_DEAD_ZONE = BALL_DIAMETER * 3; // atan2 singularity guard
  const AIM_SMOOTHING_RATE = 14.0; // per-second exponential convergence
  const AIM_MAX_SLEW = 4.5; // rad/sec cap so fast sweeps follow smoothly
  let shotPower = 0.4; // 0.0 to 1.0
  let isCharging = false;
  let chargeDirection = 1;
  let spinX = 0.0; // -0.7 to 0.7
  let spinY = 0.0; // -0.7 to 0.7
  let calledPocket = 'corner_br';

  // Ball-in-hand placement preview state
  let previewCueX = -0.56;
  let previewCueZ = 0.0;
  let previewValid = true;

  // Active match simulation reference
  let currentSim = null;
  let mySlot = 0;
  let isMyTurn = false;
  let isShooting = false;
  let shootingSafetyTimeout = null;
  let rulesModalOpen = false;

  // Key tracking
  const heldKeys = new Set();
  let active = false;
  let hud = null;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const tablePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.78);
  const tableHit = new THREE.Vector3();
  let strokePointerId = null;
  let strokeStartX = 0;
  let strokeStartY = 0;
  let strokeDragged = false;

  /**
   * Transforms world point (wx, wz) into table local coordinates (tx, tz).
   */
  function worldToTable(wx, wz) {
    const dx = wx - tableX;
    const dz = wz - tableZ;
    const cosR = Math.cos(tableRotationY);
    const sinR = Math.sin(tableRotationY);
    return {
      x: cosR * dx - sinR * dz,
      z: sinR * dx + cosR * dz,
    };
  }

  function typingTarget(target) {
    const tag = target?.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable;
  }

  function tablePointFromEvent(e) {
    const canvas = getCanvas?.();
    const camera = getActiveCamera?.();
    if (!canvas || !camera || typeof canvas.getBoundingClientRect !== 'function') return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    return raycaster.ray.intersectPlane(tablePlane, tableHit) ? tableHit : null;
  }

  function stopWorldPointer(e) {
    e.preventDefault();
    e.stopImmediatePropagation?.();
    e.stopPropagation();
  }

  function wrapAimDelta(d) {
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  function stepAimTowardTarget(delta) {
    if (!hasAimTarget) return;
    const d = wrapAimDelta(aimTargetAngle - aimAngle);
    if (Math.abs(d) < 1e-4) {
      aimAngle = aimTargetAngle;
      return;
    }
    const maxStep = AIM_MAX_SLEW * Math.max(delta, 0);
    const smoothing = 1 - Math.exp(-AIM_SMOOTHING_RATE * Math.max(delta, 0));
    let step = d * smoothing;
    if (step > maxStep) step = maxStep;
    else if (step < -maxStep) step = -maxStep;
    if (Math.abs(step) > Math.abs(d)) step = d;
    aimAngle += step;
  }

  function syncAimTarget() {
    aimTargetAngle = aimAngle;
    hasAimTarget = true;
  }

  function aimAtWorldPoint(worldX, worldZ, placeBall = false) {
    const local = worldToTable(worldX, worldZ);
    const ballInHand = currentSim?.status === 'awaiting_ball_in_hand' || currentSim?.ball_in_hand;
    if (ballInHand) {
      previewCueX = local.x;
      previewCueZ = local.z;
      previewValid = validateBallInHand(local.x, local.z, currentSim);
      if (placeBall && previewValid) onPlaceCueBall?.(local.x, local.z);
      return;
    }
    const balls = currentSim?.physics?.balls || currentSim?.balls || {};
    const cueBall = balls['0'];
    if (!cueBall) return;
    const dx = local.x - cueBall.x;
    const dz = local.z - cueBall.z;
    // Near-ball dead zone: skip updates where atan2 gain is unbounded.
    if (Math.hypot(dx, dz) < AIM_NEAR_BALL_DEAD_ZONE) return;
    aimTargetAngle = Math.atan2(dz, dx);
    hasAimTarget = true;
  }

  function onTablePointerMove(e) {
    if (!active || !isMyTurn || typingTarget(e.target) || e.target !== getCanvas?.()) return;
    const point = tablePointFromEvent(e);
    if (!point) return;
    stopWorldPointer(e);
    if (strokePointerId === e.pointerId) {
      const drag = Math.hypot(e.clientX - strokeStartX, e.clientY - strokeStartY);
      if (drag >= 6) {
        strokeDragged = true;
        shotPower = Math.max(0.05, Math.min(1, drag / 220));
        updatePowerDisplay();
      }
      return;
    }
    aimAtWorldPoint(point.x, point.z);
  }

  function onTablePointerDown(e) {
    if (!active || !isMyTurn || typingTarget(e.target) || e.target !== getCanvas?.()) return;
    if (e.button === 2) {
      if (isCharging || strokePointerId !== null) {
        stopWorldPointer(e);
        cancelShotCharging();
      }
      return;
    }
    if (e.button !== 0) return;
    const point = tablePointFromEvent(e);
    if (!point) return;
    stopWorldPointer(e);
    const ballInHand = currentSim?.status === 'awaiting_ball_in_hand' || currentSim?.ball_in_hand;
    aimAtWorldPoint(point.x, point.z, ballInHand);
    if (ballInHand) return;
    strokePointerId = e.pointerId;
    strokeStartX = e.clientX;
    strokeStartY = e.clientY;
    strokeDragged = false;
    getCanvas?.()?.setPointerCapture?.(e.pointerId);
  }

  function onTablePointerUp(e) {
    if (!active || strokePointerId !== e.pointerId) return;
    stopWorldPointer(e);
    strokePointerId = null;
    getCanvas?.()?.releasePointerCapture?.(e.pointerId);
    if (strokeDragged) executeShot();
    strokeDragged = false;
  }

  /**
   * Raycasts forward from cue ball to find first object ball hit or rail impact.
   */
  function calculateImpact(cueX, cueZ, angle, simState) {
    const balls = simState?.physics?.balls || simState?.balls || {};
    const dirX = Math.cos(angle);
    const dirZ = Math.sin(angle);

    let closestDist = 2.4; // Max table diagonal
    let targetBall = null;

    // Check collision against all in-play object balls
    for (let i = 1; i <= 15; i++) {
      const b = balls[String(i)] || balls[i];
      if (!b || b.state === 'pocketed') continue;

      const ox = b.x - cueX;
      const oz = b.z - cueZ;
      const proj = ox * dirX + oz * dirZ;
      if (proj <= 0) continue; // Ball is behind cue ball

      const perpSq = ox * ox + oz * oz - proj * proj;
      const radiusSq = BALL_DIAMETER * BALL_DIAMETER;
      if (perpSq >= radiusSq) continue; // Misses ball

      const hitDist = proj - Math.sqrt(radiusSq - perpSq);
      if (hitDist > 0 && hitDist < closestDist) {
        closestDist = hitDist;
        targetBall = b;
      }
    }

    if (targetBall) {
      const ghostX = cueX + dirX * closestDist;
      const ghostZ = cueZ + dirZ * closestDist;

      // Normal from ghost ball to target ball
      let targetDirX = targetBall.x - ghostX;
      let targetDirZ = targetBall.z - ghostZ;
      const len = Math.sqrt(targetDirX * targetDirX + targetDirZ * targetDirZ);
      if (len > 0.001) {
        targetDirX /= len;
        targetDirZ /= len;
      }

      return {
        distance: closestDist,
        ghostX,
        ghostZ,
        targetX: targetBall.x,
        targetZ: targetBall.z,
        targetDirX,
        targetDirZ,
        targetBallId: targetBall.id,
      };
    }

    return null;
  }

  /**
   * Validates whether (x, z) is a legal ball-in-hand position.
   */
  function validateBallInHand(x, z, simState) {
    const margin = BALL_RADIUS * 1.5;
    if (
      x < -HALF_LENGTH + margin ||
      x > HALF_LENGTH - margin ||
      z < -HALF_WIDTH + margin ||
      z > HALF_WIDTH - margin
    ) {
      return false;
    }

    const balls = simState?.physics?.balls || simState?.balls || {};
    for (let i = 1; i <= 15; i++) {
      const b = balls[String(i)] || balls[i];
      if (!b || b.state === 'pocketed') continue;
      const dx = x - b.x;
      const dz = z - b.z;
      if (Math.sqrt(dx * dx + dz * dz) < BALL_DIAMETER + 0.002) {
        return false;
      }
    }
    return true;
  }

  /**
   * Builds the DOM HUD overlay.
   */
  function buildHud() {
    if (hud || typeof document === 'undefined') return hud;
    const host = getHudHost();
    if (!host) return null;

    const root = document.createElement('div');
    root.className = 'pool-hud';
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', 'Billiards table controls');

    root.innerHTML = `
      <div class="pool-hud-top">
        <div class="pool-title">The Orpheum · Billiards Lounge</div>
        <div class="pool-status" data-role="status">Awaiting players…</div>
        <div class="pool-help">Move pointer to aim · A/D fine aim · Hold F for power, release F to shoot</div>
        <div class="pool-foul" data-role="foul" style="display: none;"></div>
      </div>

      <div class="pool-hud-bottom">
        <div class="pool-panel pool-hud-left">
          <!-- 2D Spin Ball -->
          <div class="pool-spin-container" title="Click or drag to set cue strike point (English/Follow/Draw)">
            <div class="pool-spin-label">Spin / English</div>
            <div class="pool-spin-ball" data-role="spin-ball">
              <div class="pool-spin-chalk" data-role="spin-chalk"></div>
            </div>
          </div>

          <!-- Power Meter -->
          <div class="pool-power-container" title="Hold F or drag the slider to adjust shot power">
            <div class="pool-power-label">Power</div>
            <div class="pool-power-meter" data-role="power-meter">
              <div class="pool-power-fill" data-role="power-fill"></div>
            </div>
          </div>
        </div>

        <div class="pool-panel pool-hud-center" data-role="pocket-panel" style="display: none;">
          <div class="pool-spin-label">Call 8-Ball Pocket</div>
          <div class="pool-pocket-picker" data-role="pocket-picker"></div>
        </div>

        <div class="pool-panel pool-hud-right">
          <div class="pool-buttons">
            <button type="button" class="pool-btn pool-btn-shoot" data-action="shoot">Shoot (F)</button>
            <button type="button" class="pool-btn" data-action="camera">Camera (C)</button>
            <button type="button" class="pool-btn" data-action="rules">House Rules</button>
            <button type="button" class="pool-btn" data-action="exit">Exit Table</button>
          </div>
        </div>
      </div>

      <!-- House Rules Modal -->
      <div class="pool-rules-modal" data-role="rules-modal" style="display: none;">
        <div class="pool-rules-content">
          <h3>The Orpheum · Casual 8-Ball Rules</h3>
          <ul>
            <li><strong>Legal Break:</strong> At least 4 object balls must touch rails, or any ball must be pocketed.</li>
            <li><strong>Open Table:</strong> The table remains open after the break. Either solids or stripes may be struck first while open.</li>
            <li><strong>Group Assignment:</strong> The first legally pocketed ball assigns groups (Solids 1–7 or Stripes 9–15).</li>
            <li><strong>Legal Shots:</strong> Must strike your own group first, after which any ball must contact a cushion rail or pocket.</li>
            <li><strong>Fouls & Ball-in-Hand:</strong> Scratching or failing to hit your own group first is a foul. Opponent receives Ball-in-Hand anywhere on the table.</li>
            <li><strong>The 8-Ball:</strong> Once your group is cleared, call your pocket for the 8-ball. Potting the 8-ball in the called pocket wins the match. Early 8-ball, wrong-pocket 8-ball, or scratch on the 8-ball loses immediately.</li>
          </ul>
          <button type="button" class="pool-btn" data-action="close-rules" style="width: 100%;">Close Rules</button>
        </div>
      </div>
    `;

    host.appendChild(root);

    // Populate pocket picker buttons
    const pocketPickerEl = root.querySelector('[data-role="pocket-picker"]');
    for (const p of POCKETS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `pool-pocket-btn ${p.id === calledPocket ? 'active' : ''}`;
      btn.textContent = p.id.replace('_', ' ').toUpperCase();
      btn.addEventListener('click', () => {
        calledPocket = p.id;
        root.querySelectorAll('.pool-pocket-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        onCallPocket?.(p.id);
      });
      pocketPickerEl.appendChild(btn);
    }

    // Spin widget interaction
    const spinBallEl = root.querySelector('[data-role="spin-ball"]');
    const spinChalkEl = root.querySelector('[data-role="spin-chalk"]');

    function updateSpinFromPointer(e) {
      const rect = spinBallEl.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const normX = ((clientX - rect.left) / rect.width) * 2 - 1;
      const normY = ((clientY - rect.top) / rect.height) * 2 - 1;
      const dist = Math.sqrt(normX * normX + normY * normY);
      const maxR = 0.72; // Keep chalk within ball perimeter

      if (dist > maxR) {
        spinX = (normX / dist) * maxR;
        spinY = -(normY / dist) * maxR;
      } else {
        spinX = normX;
        spinY = -normY;
      }

      spinChalkEl.style.left = `${(spinX / 2 + 0.5) * 100}%`;
      spinChalkEl.style.top = `${(-spinY / 2 + 0.5) * 100}%`;
    }

    spinBallEl.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      updateSpinFromPointer(e);
      const onMove = (ev) => updateSpinFromPointer(ev);
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });

    // Power meter drag interaction
    const powerMeterEl = root.querySelector('[data-role="power-meter"]');
    function updatePowerFromPointer(e) {
      const rect = powerMeterEl.getBoundingClientRect();
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const frac = 1 - (clientY - rect.top) / rect.height;
      shotPower = Math.max(0.05, Math.min(1.0, frac));
      updatePowerDisplay();
    }

    powerMeterEl.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      updatePowerFromPointer(e);
      const onMove = (ev) => updatePowerFromPointer(ev);
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });

    // Button actions
    root.querySelector('[data-action="shoot"]').addEventListener('click', () => {
      executeShot();
    });

    root.querySelector('[data-action="camera"]').addEventListener('click', () => {
      onCameraCycle?.();
    });

    const rulesModal = root.querySelector('[data-role="rules-modal"]');
    root.querySelector('[data-action="rules"]').addEventListener('click', () => {
      rulesModalOpen = true;
      rulesModal.style.display = 'flex';
    });

    root.querySelector('[data-action="close-rules"]').addEventListener('click', () => {
      rulesModalOpen = false;
      rulesModal.style.display = 'none';
    });

    root.querySelector('[data-action="exit"]').addEventListener('click', () => {
      onExit?.();
    });

    hud = { root };
    updatePowerDisplay();
    return hud;
  }

  function updatePowerDisplay() {
    if (!hud) return;
    const fillEl = hud.root.querySelector('[data-role="power-fill"]');
    const meterEl = hud.root.querySelector('[data-role="power-meter"]');
    const isFull = shotPower >= 0.99;
    if (fillEl) {
      fillEl.style.height = `${Math.round(shotPower * 100)}%`;
      fillEl.classList.toggle('power-full', isFull);
    }
    if (meterEl) {
      meterEl.classList.toggle('pool-power-full', isFull);
    }
  }

  function executeShot() {
    if (!isMyTurn || isShooting) return;
    const currentStatus = currentSim?.status;
    if (currentStatus === 'awaiting_ball_in_hand') {
      // Place cue ball first
      if (previewValid) {
        onPlaceCueBall?.(previewCueX, previewCueZ);
      }
      return;
    }

    isShooting = true;
    clearTimeout(shootingSafetyTimeout);
    shootingSafetyTimeout = setTimeout(() => {
      if (isShooting && currentSim?.status !== 'shooting') {
        isShooting = false;
        shotPower = 0.35;
        updatePowerDisplay();
      }
    }, 1200);

    onShoot?.({
      angle: aimAngle,
      power: shotPower,
      spinX,
      spinY,
      calledPocket,
    });
  }

  // Global Keyboard Event Handlers
  function onKeyDown(e) {
    if (!active) return;
    if (isMediaUiEvent(e)) return;
    if (rulesModalOpen) {
      if (e.code === 'Escape') {
        rulesModalOpen = false;
        if (hud) hud.root.querySelector('[data-role="rules-modal"]').style.display = 'none';
      }
      return;
    }

    if (isCharging && e.code === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation?.();
      e.stopPropagation();
      cancelShotCharging();
      return;
    }

    if (e.code === 'Escape') {
      e.preventDefault();
      onExit?.();
      return;
    }

    if (e.code === 'KeyC') {
      e.preventDefault();
      if (isCharging) cancelShotCharging();
      onCameraCycle?.();
      return;
    }

    heldKeys.add(e.code);

    if (e.code === 'KeyF') {
      e.preventDefault();
      e.stopImmediatePropagation?.();
      e.stopPropagation();
      setShotCharging(true);
    }
  }

  function onKeyUp(e) {
    if (!active) return;
    if (isMediaUiEvent(e)) return; // media chrome controls never release a shot
    heldKeys.delete(e.code);

    if (e.code === 'KeyF') {
      e.preventDefault();
      e.stopImmediatePropagation?.();
      e.stopPropagation();
      setShotCharging(false);
    }
  }

  function setShotCharging(pressed) {
    if (pressed) {
      if (!active || !isMyTurn || isShooting) return false;
      if (!isCharging) {
        isCharging = true;
        shotPower = 0.05;
        updatePowerDisplay();
      }
      return true;
    }

    if (!isCharging) return false;
    isCharging = false;

    if (!active || !isMyTurn || isShooting) {
      cancelShotCharging();
      return false;
    }

    executeShot();
    return true;
  }

  function cancelShotCharging() {
    if (!isCharging && strokePointerId === null) return false;
    isCharging = false;
    if (strokePointerId !== null) {
      try {
        getCanvas?.()?.releasePointerCapture?.(strokePointerId);
      } catch {}
      strokePointerId = null;
      strokeDragged = false;
    }
    shotPower = 0.35;
    updatePowerDisplay();
    return true;
  }

  function onContextMenu(e) {
    if (active && (isCharging || strokePointerId !== null)) {
      e.preventDefault();
      cancelShotCharging();
    }
  }

  function onBlur() {
    neutralizeInput();
  }

  /**
   * Neutralize every held action without firing: focus moving into the
   * floating media chrome (or window blur) must not leave a charge charging
   * or an aim key held when its keyup is delivered elsewhere.
   */
  function neutralizeInput() {
    heldKeys.clear();
    hasAimTarget = false;
    cancelShotCharging();
  }

  return {
    get aimAngle() {
      return aimAngle;
    },

    set aimAngle(val) {
      aimAngle = val;
      syncAimTarget();
    },

    get aimTargetAngle() {
      return aimTargetAngle;
    },

    get shotPower() {
      return shotPower;
    },

    get spinX() {
      return spinX;
    },

    get spinY() {
      return spinY;
    },

    get calledPocket() {
      return calledPocket;
    },

    get isBallInHand() {
      return currentSim?.status === 'awaiting_ball_in_hand' || currentSim?.ball_in_hand;
    },

    get previewCueX() {
      return previewCueX;
    },

    get previewCueZ() {
      return previewCueZ;
    },

    get previewValid() {
      return previewValid;
    },

    get isCharging() {
      return isCharging;
    },

    setShotCharging,
    cancelShotCharging,
    neutralizeInput,

    calculateImpact(cueX, cueZ, angle, simState) {
      return calculateImpact(cueX, cueZ, angle, simState || currentSim);
    },

    validateBallInHand(x, z, simState) {
      return validateBallInHand(x, z, simState || currentSim);
    },

    activate(slot = 0) {
      if (active) return;
      active = true;
      mySlot = slot;
      aimTargetAngle = aimAngle;
      hasAimTarget = false;
      buildHud();

      if (typeof window !== 'undefined') {
        window.addEventListener('keydown', onKeyDown, true);
        window.addEventListener('keyup', onKeyUp, true);
        window.addEventListener('blur', onBlur);
        window.addEventListener('contextmenu', onContextMenu);
        window.addEventListener('pointerdown', onTablePointerDown, true);
        window.addEventListener('pointermove', onTablePointerMove, true);
        window.addEventListener('pointerup', onTablePointerUp, true);
        window.addEventListener('pointercancel', onTablePointerUp, true);
      }
    },

    deactivate() {
      if (!active) return;
      active = false;
      clearTimeout(shootingSafetyTimeout);
      heldKeys.clear();
      isCharging = false;
      strokePointerId = null;
      hasAimTarget = false;

      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', onKeyDown, true);
        window.removeEventListener('keyup', onKeyUp, true);
        window.removeEventListener('blur', onBlur);
        window.removeEventListener('contextmenu', onContextMenu);
        window.removeEventListener('pointerdown', onTablePointerDown, true);
        window.removeEventListener('pointermove', onTablePointerMove, true);
        window.removeEventListener('pointerup', onTablePointerUp, true);
        window.removeEventListener('pointercancel', onTablePointerUp, true);
      }

      if (hud?.root) {
        hud.root.remove();
        hud = null;
      }
    },

    /**
     * Handles table click for aiming or ball-in-hand placement.
     */
    handleTableClick(worldX, worldZ) {
      if (!active || !isMyTurn) return;
      aimAtWorldPoint(worldX, worldZ, true);
    },

    /**
     * Handles table pointer move for aiming line or ball-in-hand ghost preview.
     */
    handleTablePointerMove(worldX, worldZ) {
      if (!active || !isMyTurn) return;

      aimAtWorldPoint(worldX, worldZ);
    },

    /**
     * Frame update for keyboard controls, power charging, and HUD synchronization.
     */
    update(delta = 1 / 60, simState = null, { practice = false } = {}) {
      if (simState) {
        const wasShooting = isShooting;
        currentSim = simState;
        isMyTurn = Number.isInteger(simState.turn) && simState.turn === mySlot && simState.status !== 'game_over';
        isShooting = simState.status === 'shooting' || !simState.physics?.settled;

        if (wasShooting && !isShooting) {
          clearTimeout(shootingSafetyTimeout);
          shotPower = 0.35;
          updatePowerDisplay();
        }
      }

      if (!active) return;

      // Keyboard aim adjustments (direct; kept in sync with the mouse target)
      const aimSpeed = 1.4 * delta;
      if (heldKeys.has('KeyA') || heldKeys.has('ArrowLeft')) {
        aimAngle -= aimSpeed;
        syncAimTarget();
      }
      if (heldKeys.has('KeyD') || heldKeys.has('ArrowRight')) {
        aimAngle += aimSpeed;
        syncAimTarget();
      }

      // Mouse target follow: damped, slew-capped, shortest-arc convergence.
      stepAimTowardTarget(delta);

      // Keyboard spin adjustments
      const spinSpeed = 1.2 * delta;
      if (heldKeys.has('KeyI')) spinY = Math.min(0.7, spinY + spinSpeed);
      if (heldKeys.has('KeyK')) spinY = Math.max(-0.7, spinY - spinSpeed);
      if (heldKeys.has('KeyJ')) spinX = Math.max(-0.7, spinX - spinSpeed);
      if (heldKeys.has('KeyL')) spinX = Math.min(0.7, spinX + spinSpeed);

      // Power charging via held F or gamepad
      if (isCharging) {
        shotPower = Math.min(1.0, shotPower + delta * 0.85);
        updatePowerDisplay();
      }

      // Gamepad polling (neutral while media controls own focus)
      if (!mediaUiHasFocus() && typeof navigator !== 'undefined' && navigator.getGamepads) {
        const gamepads = navigator.getGamepads();
        const gp = gamepads ? gamepads[0] : null;
        if (gp) {
          // Left stick aim (direct; kept in sync with the mouse target)
          if (Math.abs(gp.axes[0]) > 0.15) {
            aimAngle += gp.axes[0] * delta * 2.0;
            syncAimTarget();
          }
          // Right stick spin
          if (Math.abs(gp.axes[2]) > 0.15) {
            spinX = Math.max(-0.7, Math.min(0.7, spinX + gp.axes[2] * delta * 1.5));
          }
          if (Math.abs(gp.axes[3]) > 0.15) {
            spinY = Math.max(-0.7, Math.min(0.7, spinY - gp.axes[3] * delta * 1.5));
          }
          // B (button 1) cancels charging
          if (isCharging && gp.buttons[1]?.pressed) {
            cancelShotCharging();
          } else if (gp.buttons[7]?.pressed || gp.buttons[0]?.pressed) {
            // Right trigger (button 7) or A (button 0) for shot
            if (!isCharging) {
              setShotCharging(true);
            }
          } else if (isCharging) {
            setShotCharging(false);
          }
        }
      }

      // Update HUD text
      if (hud && currentSim) {
        const statusEl = hud.root.querySelector('[data-role="status"]');
        const foulEl = hud.root.querySelector('[data-role="foul"]');
        const pocketPanel = hud.root.querySelector('[data-role="pocket-panel"]');

        const turn = Number.isInteger(currentSim.turn) ? currentSim.turn : null;
        const group = currentSim.groups ? currentSim.groups[String(mySlot)] : null;
        const myGroupLabel = group ? ` (${group.toUpperCase()})` : ' (OPEN TABLE)';

        if (currentSim.status === 'game_over') {
          const won = currentSim.winner === mySlot;
          statusEl.textContent = won ? 'VICTORY!' : 'MATCH CONCLUDED';
          statusEl.style.color = won ? '#7ae69e' : '#e6a27a';
        } else if (practice) {
          statusEl.textContent = this.isBallInHand ? 'SOLO PRACTICE · BALL IN HAND (CLICK TABLE)' : 'SOLO PRACTICE · HOLD F, RELEASE TO SHOOT';
          statusEl.style.color = '#ffffff';
        } else if (isMyTurn) {
          if (this.isBallInHand) {
            statusEl.textContent = 'YOUR TURN · BALL IN HAND (CLICK TABLE)';
            statusEl.style.color = '#ffdd66';
          } else {
            statusEl.textContent = `YOUR TURN${myGroupLabel}`;
            statusEl.style.color = '#ffffff';
          }
        } else if (turn == null) {
          statusEl.textContent = 'Waiting for the table…';
          statusEl.style.color = '#afb9ac';
        } else {
          statusEl.textContent = `OPPONENT'S TURN (PLAYER ${turn + 1})`;
          statusEl.style.color = '#afb9ac';
        }

        // Foul banner
        if (currentSim.foul) {
          foulEl.style.display = 'block';
          foulEl.textContent = `FOUL: ${currentSim.foul.replace('_', ' ').toUpperCase()}`;
        } else {
          foulEl.style.display = 'none';
        }

        // Show 8-ball pocket picker if on 8-ball
        const onEight = isMyTurn && currentSim && needsCalledPocket(currentSim, mySlot);
        pocketPanel.style.display = onEight ? 'flex' : 'none';
        if (onEight) {
          const pocketBtns = pocketPanel.querySelectorAll('.pool-pocket-btn');
          pocketBtns.forEach((btn) => {
            const pId = btn.textContent.toLowerCase().replace(/ /g, '_');
            btn.classList.toggle('active', pId === calledPocket);
          });
        }
      }
    },

    acceptError(frame) {
      clearTimeout(shootingSafetyTimeout);
      isShooting = false;
      isCharging = false;
      shotPower = 0.35;
      updatePowerDisplay();

      if (hud) {
        const foulEl = hud.root.querySelector('[data-role="foul"]');
        const errText = frame?.message || frame?.error || frame?.reason;
        if (foulEl && errText) {
          foulEl.style.display = 'block';
          foulEl.textContent = String(errText).replace(/_/g, ' ').toUpperCase();
          setTimeout(() => {
            if (foulEl && (!currentSim || !currentSim.foul)) {
              foulEl.style.display = 'none';
            }
          }, 2500);
        }
      }
    },
  };
}
