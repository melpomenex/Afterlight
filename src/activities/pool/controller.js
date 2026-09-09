/**
 * Multi-input controller and interactive HUD for 8-ball billiards (Task 5.2; Spec social-billiards).
 *
 * Supports complete input parity across:
 *   - Mouse & Keyboard (mouse aim/drag, Space charge/shoot, I/J/K/L spin, Esc cancel)
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

import {
  TABLE_LENGTH,
  TABLE_WIDTH,
  HALF_LENGTH,
  HALF_WIDTH,
  BALL_RADIUS,
  BALL_DIAMETER,
  POCKETS,
} from '../../../shared/pool/physics.js';

export function createPoolController({
  tablePosition = [-8.6, 0, -4.5],
  tableRotationY = Math.PI / 2,
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
  let aimAngle = 0.0; // Radians in table local coordinates
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
  let rulesModalOpen = false;

  // Key tracking
  const heldKeys = new Set();
  let active = false;
  let hud = null;

  /**
   * Transforms world point (wx, wz) into table local coordinates (tx, tz).
   */
  function worldToTable(wx, wz) {
    const dx = wx - tableX;
    const dz = wz - tableZ;
    // Inverse of rotation Math.PI/2:
    // tableX_local = dz, tableZ_local = -dx
    return {
      x: dz,
      z: -dx,
    };
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
          <div class="pool-power-container" title="Hold Space or Drag slider to adjust shot power">
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
            <button type="button" class="pool-btn pool-btn-shoot" data-action="shoot">Shoot (Space)</button>
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
    if (fillEl) {
      fillEl.style.height = `${Math.round(shotPower * 100)}%`;
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
    if (rulesModalOpen) {
      if (e.code === 'Escape') {
        rulesModalOpen = false;
        if (hud) hud.root.querySelector('[data-role="rules-modal"]').style.display = 'none';
      }
      return;
    }

    if (e.code === 'Escape') {
      e.preventDefault();
      onExit?.();
      return;
    }

    if (e.code === 'KeyC') {
      e.preventDefault();
      onCameraCycle?.();
      return;
    }

    heldKeys.add(e.code);

    if (e.code === 'Space') {
      e.preventDefault();
      isCharging = true;
    }
  }

  function onKeyUp(e) {
    if (!active) return;
    heldKeys.delete(e.code);

    if (e.code === 'Space') {
      e.preventDefault();
      if (isCharging) {
        isCharging = false;
        executeShot();
      }
    }
  }

  function onBlur() {
    heldKeys.clear();
    isCharging = false;
  }

  return {
    get aimAngle() {
      return aimAngle;
    },

    set aimAngle(val) {
      aimAngle = val;
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
      buildHud();

      if (typeof window !== 'undefined') {
        window.addEventListener('keydown', onKeyDown, true);
        window.addEventListener('keyup', onKeyUp, true);
        window.addEventListener('blur', onBlur);
      }
    },

    deactivate() {
      if (!active) return;
      active = false;
      heldKeys.clear();
      isCharging = false;

      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', onKeyDown, true);
        window.removeEventListener('keyup', onKeyUp, true);
        window.removeEventListener('blur', onBlur);
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

      const local = worldToTable(worldX, worldZ);
      if (this.isBallInHand) {
        if (validateBallInHand(local.x, local.z, currentSim)) {
          previewCueX = local.x;
          previewCueZ = local.z;
          previewValid = true;
          onPlaceCueBall?.(local.x, local.z);
        }
      } else {
        const balls = currentSim?.physics?.balls || currentSim?.balls || {};
        const cueBall = balls['0'];
        if (cueBall) {
          aimAngle = Math.atan2(local.z - cueBall.z, local.x - cueBall.x);
        }
      }
    },

    /**
     * Handles table pointer move for aiming line or ball-in-hand ghost preview.
     */
    handleTablePointerMove(worldX, worldZ) {
      if (!active || !isMyTurn) return;

      const local = worldToTable(worldX, worldZ);
      if (this.isBallInHand) {
        previewCueX = local.x;
        previewCueZ = local.z;
        previewValid = validateBallInHand(local.x, local.z, currentSim);
      }
    },

    /**
     * Frame update for keyboard controls, power charging, and HUD synchronization.
     */
    update(delta = 1 / 60, simState = null) {
      if (simState) {
        currentSim = simState;
        isMyTurn = simState.turn === mySlot && simState.status !== 'game_over';
        isShooting = simState.status === 'shooting' || !simState.physics?.settled;
      }

      if (!active) return;

      // Keyboard aim adjustments
      const aimSpeed = 1.4 * delta;
      if (heldKeys.has('KeyA') || heldKeys.has('ArrowLeft')) {
        aimAngle -= aimSpeed;
      }
      if (heldKeys.has('KeyD') || heldKeys.has('ArrowRight')) {
        aimAngle += aimSpeed;
      }

      // Keyboard spin adjustments
      const spinSpeed = 1.2 * delta;
      if (heldKeys.has('KeyI')) spinY = Math.min(0.7, spinY + spinSpeed);
      if (heldKeys.has('KeyK')) spinY = Math.max(-0.7, spinY - spinSpeed);
      if (heldKeys.has('KeyJ')) spinX = Math.max(-0.7, spinX - spinSpeed);
      if (heldKeys.has('KeyL')) spinX = Math.min(0.7, spinX + spinSpeed);

      // Power charging via held Space
      if (isCharging) {
        shotPower += chargeDirection * delta * 0.9;
        if (shotPower >= 1.0) {
          shotPower = 1.0;
          chargeDirection = -1;
        } else if (shotPower <= 0.05) {
          shotPower = 0.05;
          chargeDirection = 1;
        }
        updatePowerDisplay();
      }

      // Gamepad polling
      if (typeof navigator !== 'undefined' && navigator.getGamepads) {
        const gamepads = navigator.getGamepads();
        const gp = gamepads ? gamepads[0] : null;
        if (gp) {
          // Left stick aim
          if (Math.abs(gp.axes[0]) > 0.15) {
            aimAngle += gp.axes[0] * delta * 2.0;
          }
          // Right stick spin
          if (Math.abs(gp.axes[2]) > 0.15) {
            spinX = Math.max(-0.7, Math.min(0.7, spinX + gp.axes[2] * delta * 1.5));
          }
          if (Math.abs(gp.axes[3]) > 0.15) {
            spinY = Math.max(-0.7, Math.min(0.7, spinY - gp.axes[3] * delta * 1.5));
          }
          // Right trigger (button 7) or A (button 0) for shot
          if (gp.buttons[7]?.pressed || gp.buttons[0]?.pressed) {
            isCharging = true;
          } else if (isCharging) {
            isCharging = false;
            executeShot();
          }
        }
      }

      // Update HUD text
      if (hud && currentSim) {
        const statusEl = hud.root.querySelector('[data-role="status"]');
        const foulEl = hud.root.querySelector('[data-role="foul"]');
        const pocketPanel = hud.root.querySelector('[data-role="pocket-panel"]');

        const turn = currentSim.turn;
        const group = currentSim.groups ? currentSim.groups[String(mySlot)] : null;
        const myGroupLabel = group ? ` (${group.toUpperCase()})` : ' (OPEN TABLE)';

        if (currentSim.status === 'game_over') {
          const won = currentSim.winner === mySlot;
          statusEl.textContent = won ? 'VICTORY!' : 'MATCH CONCLUDED';
          statusEl.style.color = won ? '#7ae69e' : '#e6a27a';
        } else if (isMyTurn) {
          if (this.isBallInHand) {
            statusEl.textContent = 'YOUR TURN · BALL IN HAND (CLICK TABLE)';
            statusEl.style.color = '#ffdd66';
          } else {
            statusEl.textContent = `YOUR TURN${myGroupLabel}`;
            statusEl.style.color = '#ffffff';
          }
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
        const onEight = group && isMyTurn; // Show pocket picker when group assigned
        pocketPanel.style.display = onEight ? 'flex' : 'none';
      }
    },
  };
}
