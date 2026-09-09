/**
 * Flight Controller and Chase Camera for Rooftop Drones (Phase 5, Task 7.3).
 *
 * Implements:
 *   - Multi-input flight controls: Keyboard (WASD, Arrows, Space, Shift) and Gamepad
 *   - Smooth flight instruments HUD (Speed, Alt, Lap, Next Gate, Time)
 *   - Chase camera tracking participant's drone with yaw-aligned offset
 *   - Ready/Leave actions and state management
 */

import * as THREE from 'three';

export function createDroneController({
  getActiveCamera = null,
  onSendInput = null,
  onToggleReady = null,
  onLeave = null,
} = {}) {
  let enabled = false;
  let mySlot = 0;
  let isReady = false;
  let raceStatus = 'lobby';

  // Input states
  const keys = {
    KeyW: false,
    KeyS: false,
    KeyA: false,
    KeyD: false,
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    Space: false,
    ShiftLeft: false,
    ShiftRight: false,
  };

  // Chase camera vectors
  const cameraDesiredPos = new THREE.Vector3();
  const cameraLookTarget = new THREE.Vector3();
  const currentCamPos = new THREE.Vector3();
  const currentCamTarget = new THREE.Vector3();
  let cameraInitialized = false;

  // HUD DOM elements
  let hudContainer = null;
  let slotBadge = null;
  let statusBanner = null;
  let readyBtn = null;
  let leaveBtn = null;
  let speedValEl = null;
  let altValEl = null;
  let lapValEl = null;
  let gateValEl = null;
  let timeValEl = null;

  function createHud() {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
    hudContainer = document.createElement('div');
    hudContainer.className = 'drone-flight-hud';
    hudContainer.style.display = 'none';

    hudContainer.innerHTML = `
      <div class="drone-hud-card">
        <div class="drone-hud-header">
          <span class="drone-hud-title">HIGH AWNINGS · DRONE CIRCUIT</span>
          <span class="drone-slot-badge" id="drone-slot-badge">PILOT 1</span>
        </div>
        <div class="drone-hud-status" id="drone-status-banner">WAITING FOR RACERS</div>
        <div class="drone-telemetry-row">
          <div class="telemetry-item">
            <span class="telemetry-label">SPEED</span>
            <span class="telemetry-value" id="drone-speed">0.0 m/s</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-label">ALT</span>
            <span class="telemetry-value" id="drone-alt">2.0 m</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-label">LAP</span>
            <span class="telemetry-value" id="drone-lap">1 / 2</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-label">NEXT GATE</span>
            <span class="telemetry-value" id="drone-gate">CP 0</span>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-label">TIME</span>
            <span class="telemetry-value" id="drone-time">00:00.0</span>
          </div>
        </div>
        <div class="drone-hud-actions">
          <button class="drone-btn drone-ready-btn" id="drone-ready-btn">READY FOR TAKEOFF</button>
          <button class="drone-btn drone-leave-btn" id="drone-leave-btn">LEAVE STATION</button>
        </div>
        <div class="drone-hud-help">
          W/S: Pitch/Forward · A/D: Yaw/Roll · Space: Climb · Shift: Descend
        </div>
      </div>
    `;

    document.body.appendChild(hudContainer);

    slotBadge = hudContainer.querySelector('#drone-slot-badge');
    statusBanner = hudContainer.querySelector('#drone-status-banner');
    readyBtn = hudContainer.querySelector('#drone-ready-btn');
    leaveBtn = hudContainer.querySelector('#drone-leave-btn');
    speedValEl = hudContainer.querySelector('#drone-speed');
    altValEl = hudContainer.querySelector('#drone-alt');
    lapValEl = hudContainer.querySelector('#drone-lap');
    gateValEl = hudContainer.querySelector('#drone-gate');
    timeValEl = hudContainer.querySelector('#drone-time');

    readyBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      isReady = !isReady;
      readyBtn.textContent = isReady ? 'CANCEL READY' : 'READY FOR TAKEOFF';
      readyBtn.classList.toggle('ready-active', isReady);
      onToggleReady?.(isReady);
    });

    leaveBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      onLeave?.();
    });
  }

  function handleKeyDown(e) {
    if (!enabled) return;
    if (keys.hasOwnProperty(e.code)) {
      keys[e.code] = true;
      e.preventDefault();
    }
  }

  function handleKeyUp(e) {
    if (!enabled) return;
    if (keys.hasOwnProperty(e.code)) {
      keys[e.code] = false;
      e.preventDefault();
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
  }

  createHud();

  function sampleInput() {
    let throttle = 0.45; // Hover baseline
    let pitch = 0;
    let yaw = 0;
    let roll = 0;

    // Pitch (forward/back)
    if (keys.KeyW || keys.ArrowUp) {
      pitch = -0.7;
      throttle = 0.75;
    } else if (keys.KeyS || keys.ArrowDown) {
      pitch = 0.6;
      throttle = 0.35;
    }

    // Yaw & Roll (turning)
    if (keys.KeyA || keys.ArrowLeft) {
      yaw = -1.0;
      roll = -0.6;
    } else if (keys.KeyD || keys.ArrowRight) {
      yaw = 1.0;
      roll = 0.6;
    }

    // Altitude (climb / descend)
    if (keys.Space) {
      throttle = Math.min(1.0, throttle + 0.35);
    } else if (keys.ShiftLeft || keys.ShiftRight) {
      throttle = Math.max(0.1, throttle - 0.3);
    }

    // Gamepad support
    if (typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function') {
      const gamepads = navigator.getGamepads();
      if (gamepads && gamepads[0]) {
        const gp = gamepads[0];
        // Left stick: pitch / roll
        if (Math.abs(gp.axes[1]) > 0.15) pitch = gp.axes[1];
        if (Math.abs(gp.axes[0]) > 0.15) roll = gp.axes[0];
        // Right stick: yaw
        if (Math.abs(gp.axes[2]) > 0.15) yaw = gp.axes[2];
        // Triggers: RT throttle up, LT throttle down
        if (gp.buttons[7] && gp.buttons[7].value > 0.1) {
          throttle = 0.45 + gp.buttons[7].value * 0.55;
        } else if (gp.buttons[6] && gp.buttons[6].value > 0.1) {
          throttle = 0.45 - gp.buttons[6].value * 0.35;
        }
      }
    }

    return {
      kind: 'flight',
      throttle,
      pitch,
      yaw,
      roll,
    };
  }

  function updateChaseCamera(droneData) {
    if (!droneData || !getActiveCamera) return;
    const camera = getActiveCamera();
    if (!camera) return;

    const [px, py, pz] = droneData.position;
    const yaw = droneData.rotation ? droneData.rotation[1] : 0;

    // Follow offset: 2.8m behind, 1.2m above
    const distBehind = 2.8;
    const heightAbove = 1.2;

    const camX = px - Math.sin(yaw) * distBehind;
    const camY = py + heightAbove;
    const camZ = pz - Math.cos(yaw) * distBehind;

    cameraDesiredPos.set(camX, camY, camZ);
    cameraLookTarget.set(px + Math.sin(yaw) * 1.5, py + 0.3, pz + Math.cos(yaw) * 1.5);

    if (!cameraInitialized) {
      currentCamPos.copy(cameraDesiredPos);
      currentCamTarget.copy(cameraLookTarget);
      cameraInitialized = true;
    } else {
      currentCamPos.lerp(cameraDesiredPos, 0.1);
      currentCamTarget.lerp(cameraLookTarget, 0.12);
    }

    camera.position.copy(currentCamPos);
    camera.lookAt(currentCamTarget);
  }

  function updateTelemetry(droneData, simState) {
    if (!hudContainer || !droneData) return;

    if (speedValEl) {
      const [vx, vy, vz] = droneData.velocity || [0, 0, 0];
      const speed = Math.hypot(vx, vy, vz);
      speedValEl.textContent = `${speed.toFixed(1)} m/s`;
    }

    if (altValEl) {
      const y = droneData.position ? droneData.position[1] : 2.0;
      altValEl.textContent = `${y.toFixed(1)} m`;
    }

    if (lapValEl) {
      lapValEl.textContent = `${droneData.currentLap || 1} / 2`;
    }

    if (gateValEl) {
      gateValEl.textContent = `CP ${droneData.nextCheckpoint ?? 0}`;
    }

    if (timeValEl && simState) {
      const ms = simState.elapsedMs || 0;
      const totalSec = Math.floor(ms / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      const tenth = Math.floor((ms % 1000) / 100);
      timeValEl.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${tenth}`;
    }
  }

  return {
    enable(slot = 0) {
      enabled = true;
      mySlot = slot;
      cameraInitialized = false;
      if (hudContainer) hudContainer.style.display = 'block';
      if (slotBadge) slotBadge.textContent = `PILOT ${slot + 1}`;
    },

    disable() {
      enabled = false;
      cameraInitialized = false;
      if (hudContainer) hudContainer.style.display = 'none';
      Object.keys(keys).forEach((k) => (keys[k] = false));
    },

    setMatchStatus(status, winner = null) {
      raceStatus = status;
      if (!statusBanner) return;

      if (status === 'racing') {
        statusBanner.textContent = 'RACE IN PROGRESS';
        statusBanner.className = 'drone-hud-status in-race';
        if (readyBtn) readyBtn.style.display = 'none';
      } else if (status === 'complete') {
        statusBanner.textContent = winner !== null ? `PILOT ${winner + 1} WON THE RACE!` : 'RACE COMPLETE';
        statusBanner.className = 'drone-hud-status finished';
        if (readyBtn) {
          readyBtn.style.display = 'block';
          readyBtn.textContent = 'READY FOR TAKEOFF';
          readyBtn.classList.remove('ready-active');
          isReady = false;
        }
      } else {
        statusBanner.textContent = isReady ? 'READY · WAITING FOR OTHERS' : 'READY FOR TAKEOFF';
        statusBanner.className = 'drone-hud-status waiting';
        if (readyBtn) readyBtn.style.display = 'block';
      }
    },

    update(simState) {
      if (!enabled) return;

      const input = sampleInput();
      onSendInput?.(input);

      if (simState && simState.drones) {
        const myDrone = simState.drones[mySlot] ?? simState.drones[String(mySlot)];
        if (myDrone) {
          updateChaseCamera(myDrone);
          updateTelemetry(myDrone, simState);
        }
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
