/**
 * Photo booth opt-in HUD (Task 9.8).
 */

const HUD_STYLE = `
.booth-hud { position: fixed; left: 50%; bottom: 92px; transform: translateX(-50%);
  z-index: 40; font-family: 'DM Sans', sans-serif; color: #e8e7d9; }
.booth-card { min-width: 300px; padding: 12px 14px; background: #0e1a1ccc;
  border: 1px solid #c6b47a40; border-radius: 2px 14px 2px 10px; }
.booth-title { font: 8px 'Space Mono', monospace; letter-spacing: 1.4px; color: #afb9ac; }
.booth-status { margin: 8px 0; font-size: 14px; font-weight: 600; }
.booth-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.booth-actions button { flex: 1; min-width: 80px; border: 1px solid #b9bf9c40;
  background: #152420cc; color: #e8e7d9; font: 8px 'Space Mono', monospace; padding: 8px; cursor: pointer; }
.booth-help { margin-top: 8px; font: 8px 'Space Mono', monospace; color: #8f9a8c; }
`;

export function createPhotoBoothController({
  onAccept = null,
  onDecline = null,
  onStart = null,
  onLeave = null,
  onDownload = null,
} = {}) {
  let enabled = false;
  let hud = null;
  let styleEl = null;
  let statusEl = null;
  let rosterEl = null;

  function createHud() {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
    styleEl = document.createElement('style');
    styleEl.textContent = HUD_STYLE;
    document.head.appendChild(styleEl);
    hud = document.createElement('div');
    hud.className = 'booth-hud';
    hud.style.display = 'none';
    hud.innerHTML = `
      <div class="booth-card">
        <div class="booth-title">THE ORPHEUM · PHOTO BOOTH</div>
        <div class="booth-status" data-role="status">OPT IN TO APPEAR</div>
        <div data-role="roster" class="booth-help"></div>
        <div class="booth-actions">
          <button type="button" data-role="accept">I'M IN</button>
          <button type="button" data-role="decline">SIT THIS OUT</button>
          <button type="button" data-role="start">START COUNTDOWN</button>
          <button type="button" data-role="download">DOWNLOAD STRIP</button>
          <button type="button" data-role="leave">LEAVE</button>
        </div>
        <div class="booth-help">Only people who opt in appear. The strip stays on this machine.</div>
      </div>`;
    document.body.appendChild(hud);
    statusEl = hud.querySelector('[data-role="status"]');
    rosterEl = hud.querySelector('[data-role="roster"]');
    const bind = (role, fn) => {
      hud.querySelector(`[data-role="${role}"]`)?.addEventListener('click', (e) => {
        e.stopPropagation();
        fn?.();
      });
    };
    bind('accept', onAccept);
    bind('decline', onDecline);
    bind('start', onStart);
    bind('download', onDownload);
    bind('leave', onLeave);
  }

  createHud();

  return {
    enable() { enabled = true; if (hud) hud.style.display = 'block'; },
    disable() { enabled = false; if (hud) hud.style.display = 'none'; },
    update(simState) {
      if (!enabled || !hud) return;
      const roster = simState?.roster || {};
      const parts = Object.entries(roster).map(([s, st]) => `P${Number(s) + 1} ${st}`);
      if (rosterEl) rosterEl.textContent = parts.join(' · ') || 'NO ROSTER';
      if (!statusEl) return;
      if (simState?.status === 'countdown') statusEl.textContent = `COUNTDOWN ${Math.ceil((simState.countdownMs || 0) / 1000)}`;
      else if (simState?.status === 'posing') statusEl.textContent = `POSE ${(simState.poseIndex || 0) + 1} / 4 · ${simState.poses?.[simState.poseIndex] || ''}`;
      else if (simState?.stripReady) statusEl.textContent = 'STRIP READY — LOCAL DOWNLOAD';
      else statusEl.textContent = 'OPT IN TO APPEAR';
    },
    dispose() {
      enabled = false;
      hud?.remove();
      styleEl?.remove();
    },
  };
}
