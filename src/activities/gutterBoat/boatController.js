/**
 * Rain Court Gutter Boat Controller and Race HUD (Phase 5, Task 7.5).
 *
 * Implements:
 *   - Race status & stream speed HUD
 *   - Lane assignment badge with matching lane color
 *   - "Push Boat" boost control (Space / click)
 *   - Live progress bar along the 8-meter gutter course
 *   - Final race results & standings display
 *   - Safe dismount / exit control
 */

import * as THREE from 'three';
import { GUTTER_LANES, GUTTER_BOAT_LENGTH } from '../../../shared/gutterBoatModel.js';

export function createGutterBoatController({
  getActiveCamera = null,
  onSendPush = null,
  onLeave = null,
} = {}) {
  let enabled = false;
  let mySlot = 0;
  let trackingMesh = null;

  // DOM HUD Container
  let hudContainer = null;
  let statusEl = null;
  let streamSpeedEl = null;
  let progressBarEl = null;
  let pushBtn = null;
  let leaveBtn = null;
  let standingsContainer = null;

  // Camera tracking
  const camPos = new THREE.Vector3();
  const camTarget = new THREE.Vector3();

  function createHud() {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;

    hudContainer = document.createElement('div');
    hudContainer.className = 'gutter-boat-hud-container';
    hudContainer.style.display = 'none';

    hudContainer.innerHTML = `
      <div class="gutter-boat-card">
        <div class="gutter-boat-header">
          <span class="gutter-boat-title">THE RAIN COURT · GUTTER BOATS</span>
          <span class="gutter-boat-lane-badge" id="gutter-boat-lane">LANE 1</span>
        </div>

        <div class="gutter-boat-status" id="gutter-boat-status">AWAITING START</div>

        <div class="gutter-boat-stream-info">
          <span class="stream-label">CURRENT SPEED:</span>
          <span class="stream-value" id="gutter-boat-current">1.15 m/s</span>
        </div>

        <div class="gutter-boat-progress-track">
          <div class="gutter-boat-progress-fill" id="gutter-boat-progress-bar" style="width: 0%;"></div>
        </div>

        <div class="gutter-boat-actions">
          <button class="gutter-boat-push-btn" id="gutter-boat-push-btn">PUSH BOAT [SPACE]</button>
          <button class="gutter-boat-leave-btn" id="gutter-boat-leave-btn">LEAVE RACE</button>
        </div>

        <div class="gutter-boat-standings" id="gutter-boat-standings" style="display: none;"></div>
      </div>
    `;

    document.body.appendChild(hudContainer);

    statusEl = hudContainer.querySelector('#gutter-boat-status');
    streamSpeedEl = hudContainer.querySelector('#gutter-boat-current');
    progressBarEl = hudContainer.querySelector('#gutter-boat-progress-bar');
    pushBtn = hudContainer.querySelector('#gutter-boat-push-btn');
    leaveBtn = hudContainer.querySelector('#gutter-boat-leave-btn');
    standingsContainer = hudContainer.querySelector('#gutter-boat-standings');

    pushBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      onSendPush?.();
    });

    leaveBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      onLeave?.();
    });
  }

  createHud();

  function handleKeyDown(e) {
    if (!enabled) return;
    if (e.code === 'Space') {
      e.preventDefault();
      onSendPush?.();
    } else if (e.code === 'Escape') {
      e.preventDefault();
      onLeave?.();
    }
  }

  return {
    enable(slot) {
      enabled = true;
      mySlot = slot;

      if (typeof window !== 'undefined') {
        window.addEventListener('keydown', handleKeyDown);
      }

      if (hudContainer) {
        hudContainer.style.display = 'block';
        const lane = GUTTER_LANES[slot] ?? GUTTER_LANES[0];
        const laneBadge = hudContainer.querySelector('#gutter-boat-lane');
        if (laneBadge) {
          laneBadge.textContent = `${lane.name.toUpperCase()}`;
          laneBadge.style.color = lane.color;
          laneBadge.style.borderColor = lane.color;
        }
        if (standingsContainer) standingsContainer.style.display = 'none';
      }
    },

    disable() {
      enabled = false;
      trackingMesh = null;

      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeyDown);
      }

      if (hudContainer) {
        hudContainer.style.display = 'none';
      }
    },

    trackBoatMesh(mesh) {
      trackingMesh = mesh;
    },

    update(simState) {
      if (!enabled || !simState) return;

      const rain = simState.environment?.rain ?? 0.5;
      const windZ = simState.environment?.wind?.[1] ?? 0.0;
      const currentSpeed = 0.85 + rain * 0.55 + windZ * 0.20;

      if (streamSpeedEl) {
        streamSpeedEl.textContent = `${currentSpeed.toFixed(2)} m/s (Rain: ${Math.round(rain * 100)}%)`;
      }

      const myBoat = simState.boats?.[mySlot] || simState.boats?.[String(mySlot)];
      if (myBoat) {
        const pct = Math.min(100, Math.max(0, (myBoat.progress / GUTTER_BOAT_LENGTH) * 100));
        if (progressBarEl) {
          progressBarEl.style.width = `${pct.toFixed(1)}%`;
        }

        if (statusEl) {
          if (simState.status === 'complete') {
            const timeSec = (myBoat.finishTimeMs / 1000).toFixed(2);
            statusEl.textContent = `FINISHED! Time: ${timeSec}s`;
          } else if (myBoat.finished) {
            const timeSec = (myBoat.finishTimeMs / 1000).toFixed(2);
            statusEl.textContent = `ACROSS FINISH! (${timeSec}s)`;
          } else if (myBoat.progress < 2.0) {
            statusEl.textContent = 'RACE IN PROGRESS · PUSH FOR BOOST!';
            if (pushBtn) pushBtn.disabled = myBoat.boost > 0.05;
          } else {
            statusEl.textContent = 'RACING DOWNSTREAM · WATCH THE WATERS';
            if (pushBtn) pushBtn.disabled = true;
          }
        }
      }

      if (simState.status === 'complete' && simState.standings && standingsContainer) {
        standingsContainer.style.display = 'block';
        let html = '<div class="standings-header">FINAL RESULTS</div><div class="standings-rows">';
        for (const s of simState.standings) {
          const lane = GUTTER_LANES[s.slot] ?? GUTTER_LANES[0];
          const timeSec = ((s.finishTimeMs || 0) / 1000).toFixed(2);
          const isMe = s.slot === mySlot;
          html += `
            <div class="standings-row ${isMe ? 'highlight' : ''}">
              <span class="rank-badge">#${s.rank}</span>
              <span class="lane-name" style="color: ${lane.color}">${lane.name}</span>
              <span class="finish-time">${timeSec}s</span>
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
