/**
 * Paper Airplane Launch Controller and Aiming HUD (Phase 5, Task 7.4).
 *
 * Implements:
 *   - Fold style selection (Classic, Swift Dart, Float Glider)
 *   - Angle (Yaw) & Pitch elevation controls
 *   - Launch power charge meter (hold Space or drag slider)
 *   - Weather wind readout (speed & direction compass)
 *   - Dynamic flight tracking camera
 */

import * as THREE from 'three';

export function createPaperAirplaneController({
  getActiveCamera = null,
  onSendLaunch = null,
  onLeave = null,
} = {}) {
  let enabled = false;
  let mySlot = 0;
  let currentRound = 1;
  let selectedFold = 'classic';
  let yawVal = 0.0;
  let pitchVal = 0.25;
  let powerVal = 0.65;
  let isCharging = false;
  let chargeDirection = 1;
  let trackingMesh = null;

  // DOM HUD Container
  let hudContainer = null;
  let roundEl = null;
  let windEl = null;
  let powerBarEl = null;
  let yawInputEl = null;
  let pitchInputEl = null;
  let foldButtons = [];
  let launchBtn = null;
  let leaveBtn = null;
  let statusBanner = null;

  // Chase Camera tracking
  const camPos = new THREE.Vector3();
  const camTarget = new THREE.Vector3();

  function createHud() {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;

    hudContainer = document.createElement('div');
    hudContainer.className = 'airplane-hud-container';
    hudContainer.style.display = 'none';

    hudContainer.innerHTML = `
      <div class="airplane-card">
        <div class="airplane-header">
          <span class="airplane-title">HIGH AWNINGS · PAPER AIRPLANES</span>
          <span class="airplane-round-badge" id="airplane-round">ROUND 1 / 3</span>
        </div>
        <div class="airplane-status" id="airplane-status">AIM AND THROW INTO THE SKYLINE</div>
        
        <div class="airplane-wind-indicator">
          <span class="wind-label">OVERLOOK WIND:</span>
          <span class="wind-value" id="airplane-wind">0.0 m/s CALM</span>
        </div>

        <div class="airplane-fold-selector">
          <button class="fold-btn active" data-fold="classic">CLASSIC</button>
          <button class="fold-btn" data-fold="dart">DART</button>
          <button class="fold-btn" data-fold="glider">GLIDER</button>
        </div>

        <div class="airplane-controls-grid">
          <div class="control-row">
            <label>YAW (ANGLE):</label>
            <input type="range" id="airplane-yaw" min="-0.75" max="0.75" step="0.05" value="0.0">
          </div>
          <div class="control-row">
            <label>PITCH (ELEVATION):</label>
            <input type="range" id="airplane-pitch" min="-0.15" max="0.80" step="0.05" value="0.25">
          </div>
          <div class="control-row">
            <label>POWER (HOLD SPACE):</label>
            <div class="power-meter-track">
              <div class="power-meter-fill" id="airplane-power-bar" style="width: 65%;"></div>
            </div>
          </div>
        </div>

        <div class="airplane-actions">
          <button class="airplane-launch-btn" id="airplane-launch-btn">LAUNCH PLANE</button>
          <button class="airplane-leave-btn" id="airplane-leave-btn">LEAVE TABLE</button>
        </div>
        <div class="airplane-help">
          Hold Space to charge throw power · Release or click Launch
        </div>
      </div>
    `;

    document.body.appendChild(hudContainer);

    roundEl = hudContainer.querySelector('#airplane-round');
    statusBanner = hudContainer.querySelector('#airplane-status');
    windEl = hudContainer.querySelector('#airplane-wind');
    powerBarEl = hudContainer.querySelector('#airplane-power-bar');
    yawInputEl = hudContainer.querySelector('#airplane-yaw');
    pitchInputEl = hudContainer.querySelector('#airplane-pitch');
    launchBtn = hudContainer.querySelector('#airplane-launch-btn');
    leaveBtn = hudContainer.querySelector('#airplane-leave-btn');

    foldButtons = Array.from(hudContainer.querySelectorAll('.fold-btn'));
    foldButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        foldButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        selectedFold = btn.dataset.fold || 'classic';
      });
    });

    yawInputEl?.addEventListener('input', (e) => {
      yawVal = parseFloat(e.target.value);
    });

    pitchInputEl?.addEventListener('input', (e) => {
      pitchVal = parseFloat(e.target.value);
    });

    launchBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerLaunch();
    });

    leaveBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      onLeave?.();
    });
  }

  function triggerLaunch() {
    if (!enabled) return;
    onSendLaunch?.({
      kind: 'launch',
      foldStyle: selectedFold,
      yaw: yawVal,
      pitch: pitchVal,
      power: powerVal,
    });
  }

  function handleKeyDown(e) {
    if (!enabled) return;
    if (e.code === 'Space') {
      isCharging = true;
      e.preventDefault();
    }
  }

  function handleKeyUp(e) {
    if (!enabled) return;
    if (e.code === 'Space') {
      if (isCharging) {
        isCharging = false;
        triggerLaunch();
      }
      e.preventDefault();
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
  }

  createHud();

  function updateCameraTracking() {
    if (!trackingMesh || !getActiveCamera) return;
    const camera = getActiveCamera();
    if (!camera) return;

    const pos = trackingMesh.position;
    // Follow camera: slightly above and behind
    camPos.set(pos.x, pos.y + 1.8, pos.z + 4.2);
    camTarget.set(pos.x, pos.y + 0.3, pos.z - 2.0);

    camera.position.lerp(camPos, 0.1);
    camera.lookAt(camTarget);
  }

  return {
    enable(slot = 0) {
      enabled = true;
      mySlot = slot;
      trackingMesh = null;
      if (hudContainer) hudContainer.style.display = 'block';
    },

    disable() {
      enabled = false;
      trackingMesh = null;
      if (hudContainer) hudContainer.style.display = 'none';
    },

    trackFlightMesh(mesh) {
      trackingMesh = mesh;
    },

    update(simState) {
      if (!enabled) return;

      // Power charging animation when space is held
      if (isCharging) {
        powerVal += chargeDirection * 0.025;
        if (powerVal >= 1.0) {
          powerVal = 1.0;
          chargeDirection = -1;
        } else if (powerVal <= 0.1) {
          powerVal = 0.1;
          chargeDirection = 1;
        }
        if (powerBarEl) {
          powerBarEl.style.width = `${Math.round(powerVal * 100)}%`;
        }
      }

      if (simState) {
        if (roundEl) {
          roundEl.textContent = `ROUND ${simState.currentRound || 1} / ${simState.totalRounds || 3}`;
        }

        if (windEl && simState.environment) {
          const wind = simState.environment.wind || [0, 0];
          const speed = Math.hypot(wind[0], wind[1]);
          const dirStr = wind[0] > 0.1 ? 'EAST' : wind[0] < -0.1 ? 'WEST' : 'CALM';
          windEl.textContent = `${speed.toFixed(1)} m/s (${dirStr})`;
        }

        if (statusBanner) {
          if (simState.status === 'complete') {
            const winner = simState.winner;
            statusBanner.textContent = winner !== null ? `PLAYER ${winner + 1} WON CONTEST!` : 'CONTEST FINISHED';
          } else {
            statusBanner.textContent = 'AIM AND THROW INTO THE SKYLINE';
          }
        }
      }

      if (trackingMesh && trackingMesh.visible) {
        updateCameraTracking();
      }
    },

    dispose() {
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      }
      if (hudContainer?.parentElement) {
        hudContainer.parentElement.removeChild(hudContainer);
      }
      hudContainer = null;
    },
  };
}
