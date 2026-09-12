/**
 * Multi-input controller for Foosball (Phase 4, Task 6.4).
 *
 * Implements:
 * - Casual vs Advanced control modes:
 *   - Casual: Active rod auto-selected by ball position; W/S (or Up/Down) slides, Space (or Enter) kicks.
 *   - Advanced: A/D (or Left/Right) selects rod (Goalie, Defense, Midfield, Attack); W/S slides, Space kicks.
 * - Tab or C toggles between Casual and Advanced modes.
 * - Pointer / touch drag area for sliding + tap for kicking.
 * - Gamepad support (Left stick Y = slide, D-pad Left/Right = select rod, Button A = kick, Shoulder = toggle mode).
 * - Series length selector modal (1, Best-of-3, Best-of-5) and Ready button.
 * - Local prediction of rod translation and rotation.
 */

import {
  ROD_CONFIGS,
  TABLE_LENGTH,
  TABLE_WIDTH,
  clampRodState,
  getRecommendedRod,
} from '../../../shared/foosballModel.js';
import { isMediaUiEvent, mediaUiHasFocus } from '../inputSeam.js';

export function createFoosballController({
  slot = 0,
  sendInput = () => {},
  requestReady = () => {},
  onSeriesChange = () => {},
} = {}) {
  let active = false;
  let controlMode = 'casual'; // 'casual' | 'advanced'
  let selectedRod = 2;        // Default to Midfield
  let isReady = false;
  let selectedSeries = 1;

  // Local prediction state for player's 4 rods
  const localRods = [
    { y: 35.0, angle: 0.0, vy: 0.0, omega: 0.0 },
    { y: 35.0, angle: 0.0, vy: 0.0, omega: 0.0 },
    { y: 35.0, angle: 0.0, vy: 0.0, omega: 0.0 },
    { y: 35.0, angle: 0.0, vy: 0.0, omega: 0.0 },
  ];

  // Held keys
  const keys = {
    up: false,
    down: false,
    left: false,
    right: false,
    kick: false,
  };

  // Pointer dragging
  let pointerActive = false;
  let pointerStartY = 0;
  let pointerStartRodY = 35.0;

  // DOM elements
  let hudContainer = null;
  let modeBadge = null;
  let rodIndicator = null;
  let readyBtn = null;
  let seriesSelector = null;

  function buildDOM() {
    if (typeof document === 'undefined') return;

    hudContainer = document.createElement('div');
    hudContainer.className = 'foosball-hud';
    hudContainer.style.position = 'absolute';
    hudContainer.style.bottom = '24px';
    hudContainer.style.left = '50%';
    hudContainer.style.transform = 'translateX(-50%)';
    hudContainer.style.display = 'none';
    hudContainer.style.flexDirection = 'column';
    hudContainer.style.alignItems = 'center';
    hudContainer.style.gap = '8px';
    hudContainer.style.zIndex = '50';
    hudContainer.style.pointerEvents = 'auto';

    // Top status bar: Mode toggle badge + Active rod indicator
    const statusBar = document.createElement('div');
    statusBar.style.display = 'flex';
    statusBar.style.alignItems = 'center';
    statusBar.style.gap = '12px';
    statusBar.style.background = 'rgba(18, 26, 36, 0.85)';
    statusBar.style.padding = '6px 14px';
    statusBar.style.borderRadius = '20px';
    statusBar.style.border = '1px solid rgba(200, 168, 96, 0.4)';
    statusBar.style.color = '#f0f4f8';
    statusBar.style.fontSize = '13px';
    statusBar.style.fontFamily = 'monospace';

    modeBadge = document.createElement('button');
    modeBadge.className = 'foosball-mode-btn';
    modeBadge.textContent = 'MODE: CASUAL (Tab)';
    modeBadge.style.background = '#2c3e50';
    modeBadge.style.color = '#7acbd4';
    modeBadge.style.border = '1px solid #7acbd4';
    modeBadge.style.borderRadius = '12px';
    modeBadge.style.padding = '3px 10px';
    modeBadge.style.cursor = 'pointer';
    modeBadge.addEventListener('click', toggleMode);
    statusBar.appendChild(modeBadge);

    rodIndicator = document.createElement('span');
    rodIndicator.textContent = 'ROD: MIDFIELD';
    statusBar.appendChild(rodIndicator);

    hudContainer.appendChild(statusBar);

    // Bottom controls: Ready & Series selection
    const controlBar = document.createElement('div');
    controlBar.style.display = 'flex';
    controlBar.style.alignItems = 'center';
    controlBar.style.gap = '10px';

    seriesSelector = document.createElement('div');
    seriesSelector.className = 'foosball-series-selector';
    seriesSelector.style.display = 'flex';
    seriesSelector.style.gap = '6px';

    [1, 3, 5].forEach(len => {
      const btn = document.createElement('button');
      btn.className = `series-btn series-btn-${len}`;
      btn.textContent = len === 1 ? '1 Game' : `Best of ${len}`;
      btn.style.padding = '4px 10px';
      btn.style.fontSize = '12px';
      btn.style.borderRadius = '4px';
      btn.style.cursor = 'pointer';
      btn.style.background = len === selectedSeries ? '#c8a860' : 'rgba(20, 30, 42, 0.8)';
      btn.style.color = len === selectedSeries ? '#111822' : '#d0d8e0';
      btn.style.border = '1px solid #c8a860';
      btn.addEventListener('click', () => {
        if (isReady) return;
        selectedSeries = len;
        updateSeriesUI();
        onSeriesChange(len);
      });
      seriesSelector.appendChild(btn);
    });
    controlBar.appendChild(seriesSelector);

    readyBtn = document.createElement('button');
    readyBtn.className = 'fb-ready-btn';
    readyBtn.textContent = 'READY (R)';
    readyBtn.style.padding = '6px 18px';
    readyBtn.style.fontSize = '13px';
    readyBtn.style.fontWeight = 'bold';
    readyBtn.style.borderRadius = '6px';
    readyBtn.style.cursor = 'pointer';
    readyBtn.style.background = '#27ae60';
    readyBtn.style.color = '#ffffff';
    readyBtn.style.border = 'none';
    readyBtn.addEventListener('click', toggleReady);
    controlBar.appendChild(readyBtn);

    hudContainer.appendChild(controlBar);
    document.body.appendChild(hudContainer);
  }

  function toggleMode() {
    controlMode = controlMode === 'casual' ? 'advanced' : 'casual';
    updateHUD();
    sendInput({ controlMode });
  }

  function toggleReady() {
    isReady = !isReady;
    if (readyBtn) {
      readyBtn.textContent = isReady ? 'READY!' : 'READY (R)';
      readyBtn.style.background = isReady ? '#2ecc71' : '#27ae60';
    }
    requestReady({ ready: isReady, seriesLength: selectedSeries });
  }

  function updateSeriesUI() {
    if (!seriesSelector) return;
    const btns = seriesSelector.querySelectorAll('.series-btn');
    btns.forEach(b => {
      const len = Number(b.className.match(/series-btn-(\d+)/)?.[1]);
      if (len === selectedSeries) {
        b.style.background = '#c8a860';
        b.style.color = '#111822';
      } else {
        b.style.background = 'rgba(20, 30, 42, 0.8)';
        b.style.color = '#d0d8e0';
      }
    });
  }

  function updateHUD(ballX = 60.0) {
    if (!modeBadge || !rodIndicator) return;
    modeBadge.textContent = `MODE: ${controlMode.toUpperCase()} (Tab)`;

    const effectiveRod = controlMode === 'casual'
      ? getRecommendedRod(slot, ballX)
      : selectedRod;

    const rodName = ROD_CONFIGS[String(slot)]?.[effectiveRod]?.name || 'MIDFIELD';
    rodIndicator.textContent = `ROD: ${rodName.toUpperCase()} ${controlMode === 'advanced' ? '(A/D)' : ''}`;
  }

  // Keyboard handlers
  function onKeyDown(e) {
    if (!active) return;
    if (isMediaUiEvent(e)) return;
    if (e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA') return;

    if (e.code === 'KeyW' || e.code === 'ArrowUp') {
      keys.up = true;
      e.preventDefault();
    } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
      keys.down = true;
      e.preventDefault();
    } else if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
      if (controlMode === 'advanced') {
        selectedRod = Math.max(0, selectedRod - 1);
        updateHUD();
        sendInput({ selectRod: selectedRod });
      }
      e.preventDefault();
    } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
      if (controlMode === 'advanced') {
        selectedRod = Math.min(3, selectedRod + 1);
        updateHUD();
        sendInput({ selectRod: selectedRod });
      }
      e.preventDefault();
    } else if (e.code === 'Space' || e.code === 'Enter') {
      keys.kick = true;
      e.preventDefault();
    } else if (e.code === 'Tab' || e.code === 'KeyC') {
      toggleMode();
      e.preventDefault();
    } else if (e.code === 'KeyR') {
      toggleReady();
      e.preventDefault();
    }
  }

  function onKeyUp(e) {
    if (!active) return;
    if (isMediaUiEvent(e)) return;
    if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.up = false;
    else if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.down = false;
    else if (e.code === 'Space' || e.code === 'Enter') keys.kick = false;
  }

  // Pointer handlers for touch / mouse sliding
  function onPointerDown(e) {
    if (!active) return;
    if (e.target.closest && e.target.closest('.foosball-hud')) return;

    pointerActive = true;
    pointerStartY = e.clientY;
    const curActive = controlMode === 'casual' ? selectedRod : selectedRod;
    pointerStartRodY = localRods[curActive]?.y || 35.0;
  }

  function onPointerMove(e) {
    if (!active || !pointerActive) return;
    const deltaY = (e.clientY - pointerStartY) * 0.15;
    const curActive = controlMode === 'casual' ? selectedRod : selectedRod;
    const cfg = ROD_CONFIGS[String(slot)]?.[curActive];
    if (!cfg) return;

    const targetY = Math.max(cfg.minY, Math.min(cfg.maxY, pointerStartRodY + deltaY));
    localRods[curActive].y = targetY;
  }

  function onPointerUp(e) {
    if (!active) return;
    if (pointerActive) {
      // Tap (small movement) executes kick
      if (Math.abs(e.clientY - pointerStartY) < 10) {
        keys.kick = true;
        setTimeout(() => { keys.kick = false; }, 80);
      }
    }
    pointerActive = false;
  }

  function attachListeners() {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }

  function removeListeners() {
    if (typeof window === 'undefined') return;
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  }

  buildDOM();
  attachListeners();

  return {
    activate() {
      active = true;
      if (hudContainer) hudContainer.style.display = 'flex';
      updateHUD();
    },

    deactivate() {
      active = false;
      if (hudContainer) hudContainer.style.display = 'none';
      keys.up = false;
      keys.down = false;
      keys.left = false;
      keys.right = false;
      keys.kick = false;
      pointerActive = false;
    },

    /** Focus entering the media chrome must not leave a rod key held. */
    neutralizeInput() {
      keys.up = false;
      keys.down = false;
      keys.left = false;
      keys.right = false;
      keys.kick = false;
      pointerActive = false;
    },

    setSlot(newSlot) {
      slot = newSlot;
      updateHUD();
    },

    reconcileSnapshot(authoritativeState) {
      if (!authoritativeState?.rods?.[String(slot)]) return;

      const rods = authoritativeState.rods[String(slot)];
      for (let r = 0; r < 4; r++) {
        if (rods[r]) {
          // Smoothly reconcile with slight lerp
          localRods[r].y = localRods[r].y * 0.7 + rods[r].y * 0.3;
          localRods[r].angle = localRods[r].angle * 0.7 + rods[r].angle * 0.3;
        }
      }

      if (authoritativeState.ball) {
        updateHUD(authoritativeState.ball.x);
      }
    },

    update(dt = 0.016, authoritativeState = null) {
      if (!active) return;

      const ballX = authoritativeState?.ball?.x ?? 60.0;
      const curActive = controlMode === 'casual'
        ? getRecommendedRod(slot, ballX)
        : selectedRod;

      // Handle translation input (W/S or Up/Down)
      let dy = 0;
      if (keys.up) dy -= 1.0;
      if (keys.down) dy += 1.0;

      // Gamepad polling (neutral while media controls own focus)
      if (!mediaUiHasFocus() && typeof navigator !== 'undefined' && navigator.getGamepads) {
        const pads = navigator.getGamepads();
        const pad = pads[0];
        if (pad) {
          // Left stick Y
          if (Math.abs(pad.axes[1]) > 0.15) dy = pad.axes[1];
          // Button A / Trigger = kick
          if (pad.buttons[0]?.pressed || pad.buttons[7]?.pressed) keys.kick = true;
          // Dpad Left/Right in advanced mode
          if (pad.buttons[14]?.pressed && controlMode === 'advanced') {
            selectedRod = Math.max(0, selectedRod - 1);
            updateHUD(ballX);
          }
          if (pad.buttons[15]?.pressed && controlMode === 'advanced') {
            selectedRod = Math.min(3, selectedRod + 1);
            updateHUD(ballX);
          }
          // Shoulder = toggle mode
          if (pad.buttons[4]?.pressed) toggleMode();
        }
      }

      const inputPayload = {
        controlMode,
        selectRod: curActive,
        dy,
        kick: keys.kick,
      };

      // Step local prediction for active rod
      const cfg = ROD_CONFIGS[String(slot)]?.[curActive];
      if (cfg) {
        localRods[curActive] = clampRodState(slot, curActive, localRods[curActive], inputPayload);
      }

      // Transmit to authoritative server
      sendInput(inputPayload);
    },

    getLocalPredictedRod(rodIdx) {
      return localRods[rodIdx] || { y: 35.0, angle: 0.0, vy: 0.0, omega: 0.0 };
    },

    destroy() {
      removeListeners();
      if (hudContainer?.parentNode) {
        hudContainer.parentNode.removeChild(hudContainer);
      }
    },
  };
}
