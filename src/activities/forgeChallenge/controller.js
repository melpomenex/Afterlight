/**
 * Forge Profile aim/force HUD and strike controls (Task 9.2).
 *
 * Arrows or the slider place the hammer; Space / Strike commits force.
 * Blur and leave request note-off.
 */

const HUD_STYLE = `
.foundry-forge-hud { position: fixed; left: 50%; bottom: 92px; transform: translateX(-50%);
  z-index: 40; pointer-events: auto; font-family: 'DM Sans', sans-serif; color: #e8e7d9; }
.foundry-forge-card { min-width: 300px; max-width: 380px; padding: 12px 14px 10px;
  background: #0e1a1ccc; border: 1px solid #b9bf9c35; border-radius: 2px 14px 2px 10px; }
.foundry-forge-title { font: 8px 'Space Mono', monospace; letter-spacing: 1.4px; color: #afb9ac; }
.foundry-forge-status { margin: 8px 0 10px; font-size: 14px; font-weight: 600; }
.foundry-forge-row { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px;
  font: 8px 'Space Mono', monospace; color: #bfc3ad; letter-spacing: 0.8px; }
.foundry-forge-row input[type="range"] { width: 100%; accent-color: #c9b889; }
.foundry-forge-meta { display: flex; justify-content: space-between; margin: 6px 0 10px;
  font: 8px 'Space Mono', monospace; color: #bfc3ad; }
.foundry-forge-actions { display: flex; gap: 8px; }
.foundry-forge-actions button { flex: 1; border: 1px solid #b9bf9c40; background: #152420cc;
  color: #e8e7d9; font: 8px 'Space Mono', monospace; letter-spacing: 1px; padding: 8px 6px; cursor: pointer; }
.foundry-forge-actions button.primary { background: #4a2a18cc; border-color: #ff803366; color: #ffd9b0; }
.foundry-forge-help { margin-top: 8px; font: 8px 'Space Mono', monospace; color: #8f9a8c; }
`;

export function createForgeChallengeController({
  onSendStrike = null,
  onLeave = null,
  onBlur = null,
} = {}) {
  let enabled = false;
  let position = 0.5;
  let force = 0.6;
  let charging = false;

  let hud = null;
  let styleEl = null;
  let statusEl = null;
  let remainEl = null;
  let scoreEl = null;
  let posInput = null;
  let forceInput = null;

  function createHud() {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;

    styleEl = document.createElement('style');
    styleEl.textContent = HUD_STYLE;
    document.head.appendChild(styleEl);

    hud = document.createElement('div');
    hud.className = 'foundry-forge-hud';
    hud.style.display = 'none';
    hud.innerHTML = `
      <div class="foundry-forge-card">
        <div class="foundry-forge-title">RUSTFALL FOUNDRY · FORGE PROFILE</div>
        <div class="foundry-forge-status" data-role="status">MATCH THE GHOST BAR</div>
        <label class="foundry-forge-row">ALONG THE BAR
          <input type="range" min="0" max="1" step="0.02" value="0.5" data-role="position">
        </label>
        <label class="foundry-forge-row">FORCE (HOLD SPACE)
          <input type="range" min="0.1" max="1" step="0.02" value="0.6" data-role="force">
        </label>
        <div class="foundry-forge-meta">
          <span data-role="remain">STRIKES 8</span>
          <span data-role="score">FIT —</span>
        </div>
        <div class="foundry-forge-actions">
          <button type="button" class="primary" data-role="strike">STRIKE</button>
          <button type="button" data-role="leave">LEAVE HEARTH</button>
        </div>
        <div class="foundry-forge-help">Arrows move · Space charges · Release to strike</div>
      </div>
    `;
    document.body.appendChild(hud);

    statusEl = hud.querySelector('[data-role="status"]');
    remainEl = hud.querySelector('[data-role="remain"]');
    scoreEl = hud.querySelector('[data-role="score"]');
    posInput = hud.querySelector('[data-role="position"]');
    forceInput = hud.querySelector('[data-role="force"]');

    posInput?.addEventListener('input', (e) => {
      position = Number(e.target.value) || 0;
    });
    forceInput?.addEventListener('input', (e) => {
      force = Number(e.target.value) || 0.6;
    });
    hud.querySelector('[data-role="strike"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      commit();
    });
    hud.querySelector('[data-role="leave"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      onLeave?.();
    });
  }

  function commit() {
    if (!enabled) return;
    onSendStrike?.({ position, force });
  }

  function onKeyDown(e) {
    if (!enabled) return;
    if (e.code === 'ArrowLeft') {
      position = Math.max(0, position - 0.05);
      if (posInput) posInput.value = String(position);
      e.preventDefault();
    } else if (e.code === 'ArrowRight') {
      position = Math.min(1, position + 0.05);
      if (posInput) posInput.value = String(position);
      e.preventDefault();
    } else if (e.code === 'Space' && !e.repeat) {
      charging = true;
      e.preventDefault();
    }
  }

  function onKeyUp(e) {
    if (!enabled) return;
    if (e.code === 'Space' && charging) {
      charging = false;
      commit();
      e.preventDefault();
    }
  }

  function handleBlur() {
    charging = false;
    onBlur?.();
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', handleBlur);
    document.addEventListener?.('visibilitychange', handleBlur);
  }

  createHud();

  return {
    enable() {
      enabled = true;
      if (hud) hud.style.display = 'block';
    },

    disable() {
      enabled = false;
      charging = false;
      if (hud) hud.style.display = 'none';
      onBlur?.();
    },

    update(simState) {
      if (!enabled || !hud) return;

      if (charging) {
        force = Math.min(1, force + 0.02);
        if (forceInput) forceInput.value = String(force);
      }

      if (remainEl) remainEl.textContent = `STRIKES ${simState?.remaining ?? 8}`;
      if (scoreEl && Number.isFinite(simState?.score)) {
        scoreEl.textContent = `FIT ${Math.round(simState.score * 100)}`;
      }
      if (statusEl) {
        if (simState?.status === 'complete') {
          statusEl.textContent = `SET · FIT ${Math.round((simState.score || 0) * 100)}`;
        } else {
          statusEl.textContent = 'MATCH THE GHOST BAR';
        }
      }
    },

    dispose() {
      enabled = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('blur', handleBlur);
        document.removeEventListener?.('visibilitychange', handleBlur);
      }
      hud?.parentElement?.removeChild(hud);
      styleEl?.parentElement?.removeChild(styleEl);
      hud = null;
      styleEl = null;
    },
  };
}
