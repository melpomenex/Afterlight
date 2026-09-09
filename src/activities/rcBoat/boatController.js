/**
 * Sluiceworks RC Speedboat Controller and Cockpit HUD (Phase 5, Task 7.6).
 *
 * Implements:
 *   - WASD / Arrow Key throttle & rudder steering
 *   - R recovery reset to last cleared buoy
 *   - Real-time speedometer and tachometer readout
 *   - Sequential lap & buoy checkpoint HUD
 *   - Standings table on race completion
 *   - Touch & on-screen control bindings
 */

import {
  RC_BOAT_SPAWN_DOCKS,
  RC_BOAT_CHECKPOINTS,
  RC_BOAT_TOTAL_LAPS,
} from '../../../shared/rcBoatModel.js';

export function createRcBoatController({
  getActiveCamera = null,
  onSendControls = null,
  onLeave = null,
} = {}) {
  let enabled = false;
  let mySlot = 0;

  // Control state
  const heldKeys = new Set();
  let recoverQueued = false;

  // DOM HUD Container
  let hudContainer = null;
  let statusEl = null;
  let speedEl = null;
  let lapEl = null;
  let checkpointEl = null;
  let standingsContainer = null;

  function createHud() {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;

    hudContainer = document.createElement('div');
    hudContainer.className = 'rc-boat-hud-container';
    hudContainer.style.display = 'none';

    hudContainer.innerHTML = `
      <div class="rc-boat-card">
        <div class="rc-boat-header">
          <span class="rc-boat-title">SLUICEWORKS · RC SPEEDBOATS</span>
          <span class="rc-boat-badge" id="rc-boat-badge">RUBY HYDRO</span>
        </div>

        <div class="rc-boat-telemetry-grid">
          <div class="rc-telemetry-item">
            <span class="rc-label">SPEED</span>
            <span class="rc-value" id="rc-boat-speed">0.0 m/s</span>
          </div>
          <div class="rc-telemetry-item">
            <span class="rc-label">LAP</span>
            <span class="rc-value" id="rc-boat-lap">1 / 2</span>
          </div>
          <div class="rc-telemetry-item">
            <span class="rc-label">NEXT BUOY</span>
            <span class="rc-value" id="rc-boat-buoy">START BUOY</span>
          </div>
        </div>

        <div class="rc-boat-status" id="rc-boat-status">RACE IN PROGRESS · W/A/S/D TO STEER</div>

        <div class="rc-boat-actions">
          <button class="rc-boat-btn rc-recover-btn" id="rc-recover-btn">RECOVER [R]</button>
          <button class="rc-boat-btn rc-leave-btn" id="rc-leave-btn">LEAVE RACE [ESC]</button>
        </div>

        <div class="rc-boat-touch-controls">
          <div class="touch-row">
            <button class="touch-btn" data-key="KeyW">▲ FWD</button>
          </div>
          <div class="touch-row">
            <button class="touch-btn" data-key="KeyA">◀ PORT</button>
            <button class="touch-btn" data-key="KeyS">▼ REV</button>
            <button class="touch-btn" data-key="KeyD">STARBD ▶</button>
          </div>
        </div>

        <div class="rc-boat-standings" id="rc-boat-standings" style="display: none;"></div>
      </div>
    `;

    document.body.appendChild(hudContainer);

    statusEl = hudContainer.querySelector('#rc-boat-status');
    speedEl = hudContainer.querySelector('#rc-boat-speed');
    lapEl = hudContainer.querySelector('#rc-boat-lap');
    checkpointEl = hudContainer.querySelector('#rc-boat-buoy');
    standingsContainer = hudContainer.querySelector('#rc-boat-standings');

    hudContainer.querySelector('#rc-recover-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      recoverQueued = true;
    });

    hudContainer.querySelector('#rc-leave-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      onLeave?.();
    });

    // Touch button listeners
    hudContainer.querySelectorAll('.touch-btn').forEach((btn) => {
      const key = btn.dataset.key;
      const press = (e) => { e.preventDefault(); e.stopPropagation(); heldKeys.add(key); };
      const release = (e) => { e.preventDefault(); e.stopPropagation(); heldKeys.delete(key); };
      btn.addEventListener('mousedown', press);
      btn.addEventListener('mouseup', release);
      btn.addEventListener('touchstart', press);
      btn.addEventListener('touchend', release);
    });
  }

  createHud();

  function handleKeyDown(e) {
    if (!enabled) return;
    if (['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      heldKeys.add(e.code);
    } else if (e.code === 'KeyR') {
      recoverQueued = true;
    } else if (e.code === 'Escape') {
      onLeave?.();
    }
  }

  function handleKeyUp(e) {
    if (!enabled) return;
    heldKeys.delete(e.code);
  }

  return {
    enable(slot) {
      enabled = true;
      mySlot = slot;
      heldKeys.clear();
      recoverQueued = false;

      if (typeof window !== 'undefined') {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
      }

      if (hudContainer) {
        hudContainer.style.display = 'block';
        const dock = RC_BOAT_SPAWN_DOCKS[slot] ?? RC_BOAT_SPAWN_DOCKS[0];
        const badge = hudContainer.querySelector('#rc-boat-badge');
        if (badge) {
          badge.textContent = dock.name.toUpperCase();
          badge.style.color = dock.color;
          badge.style.borderColor = dock.color;
        }
        if (standingsContainer) standingsContainer.style.display = 'none';
      }
    },

    disable() {
      enabled = false;
      heldKeys.clear();
      recoverQueued = false;

      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      }

      if (hudContainer) {
        hudContainer.style.display = 'none';
      }
    },

    pollControls() {
      if (!enabled) return { throttle: 0, steer: 0, recover: false };

      let throttle = 0.0;
      if (heldKeys.has('KeyW') || heldKeys.has('ArrowUp')) throttle += 1.0;
      if (heldKeys.has('KeyS') || heldKeys.has('ArrowDown')) throttle -= 0.5;

      let steer = 0.0;
      if (heldKeys.has('KeyA') || heldKeys.has('ArrowLeft')) steer -= 1.0;
      if (heldKeys.has('KeyD') || heldKeys.has('ArrowRight')) steer += 1.0;

      const recover = recoverQueued;
      recoverQueued = false;

      return { throttle, steer, recover };
    },

    update(simState) {
      if (!enabled || !simState) return;

      const myBoat = simState.boats?.[mySlot] || simState.boats?.[String(mySlot)];
      if (!myBoat) return;

      if (speedEl) {
        speedEl.textContent = `${Math.abs(myBoat.speed || 0).toFixed(1)} m/s`;
      }

      if (lapEl) {
        lapEl.textContent = `${myBoat.currentLap} / ${RC_BOAT_TOTAL_LAPS}`;
      }

      if (checkpointEl) {
        const cp = RC_BOAT_CHECKPOINTS[myBoat.nextCheckpoint];
        checkpointEl.textContent = cp ? cp.name.toUpperCase() : 'FINISH';
      }

      if (statusEl) {
        if (myBoat.dnf) {
          statusEl.textContent = 'DNF (DID NOT FINISH)';
          statusEl.style.color = '#ef4444';
        } else if (myBoat.finished) {
          const timeSec = (myBoat.finishTimeMs / 1000).toFixed(2);
          statusEl.textContent = `FINISHED! TIME: ${timeSec}s`;
          statusEl.style.color = '#10b981';
        } else if (myBoat.stunTicks > 0) {
          statusEl.textContent = 'WALL IMPACT! STUNNED...';
          statusEl.style.color = '#f59e0b';
        } else {
          statusEl.textContent = 'RACING · STEER AROUND BUOYS';
          statusEl.style.color = '#94a3b8';
        }
      }

      if (simState.status === 'complete' && simState.standings && standingsContainer) {
        standingsContainer.style.display = 'block';
        let html = '<div class="standings-header">RACE STANDINGS</div><div class="standings-rows">';
        for (const s of simState.standings) {
          const dock = RC_BOAT_SPAWN_DOCKS[s.slot] ?? RC_BOAT_SPAWN_DOCKS[0];
          const timeText = s.finished
            ? `${((s.finishTimeMs || 0) / 1000).toFixed(2)}s`
            : (s.dnf ? 'DNF' : '--');
          const isMe = s.slot === mySlot;
          html += `
            <div class="standings-row ${isMe ? 'highlight' : ''}">
              <span class="rank-badge">#${s.rank}</span>
              <span class="lane-name" style="color: ${dock.color}">${dock.name}</span>
              <span class="finish-time">${timeText}</span>
            </div>
          `;
        }
        html += '</div>';
        standingsContainer.innerHTML = html;
      }
    },

    dispose() {
      this.disable();
      if (hudContainer && hudContainer.parentNode) {
        hudContainer.parentNode.removeChild(hudContainer);
        hudContainer = null;
      }
    },
  };
}
