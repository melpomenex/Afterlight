/**
 * Hammer Strike timing HUD and commit controls (Task 9.1).
 *
 * Space / Strike commits the current phase sample. Blur and leave fire
 * note-off so a held tone cannot linger.
 */

const HUD_STYLE = `
.foundry-hammer-hud { position: fixed; left: 50%; bottom: 92px; transform: translateX(-50%);
  z-index: 40; pointer-events: auto; font-family: 'DM Sans', sans-serif; color: #e8e7d9; }
.foundry-hammer-card { min-width: 280px; max-width: 360px; padding: 12px 14px 10px;
  background: #0e1a1ccc; border: 1px solid #b9bf9c35; border-radius: 2px 14px 2px 10px; }
.foundry-hammer-title { font: 8px 'Space Mono', monospace; letter-spacing: 1.4px; color: #afb9ac; }
.foundry-hammer-status { margin: 8px 0 10px; font-size: 14px; font-weight: 600; }
.foundry-hammer-track { height: 10px; background: #1a2a28; border: 1px solid #b9bf9c28; position: relative; }
.foundry-hammer-window { position: absolute; top: 0; bottom: 0; background: #c9b88955; }
.foundry-hammer-bead { position: absolute; top: -2px; width: 6px; height: 14px; background: #e8c76a; }
.foundry-hammer-meta { display: flex; justify-content: space-between; margin: 8px 0;
  font: 8px 'Space Mono', monospace; color: #bfc3ad; letter-spacing: 0.8px; }
.foundry-hammer-actions { display: flex; gap: 8px; }
.foundry-hammer-actions button { flex: 1; border: 1px solid #b9bf9c40; background: #152420cc;
  color: #e8e7d9; font: 8px 'Space Mono', monospace; letter-spacing: 1px; padding: 8px 6px; cursor: pointer; }
.foundry-hammer-actions button.primary { background: #3d3420cc; border-color: #c9b88966; color: #f0e6c4; }
.foundry-hammer-help { margin-top: 8px; font: 8px 'Space Mono', monospace; color: #8f9a8c; }
`;

export function createHammerStrikeController({
  onSendStrike = null,
  onLeave = null,
  onBlur = null,
} = {}) {
  let enabled = false;
  let localPhase = 0;
  let lastStatus = '';

  let hud = null;
  let styleEl = null;
  let statusEl = null;
  let beadEl = null;
  let windowEl = null;
  let remainEl = null;
  let scoreEl = null;

  function createHud() {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;

    styleEl = document.createElement('style');
    styleEl.textContent = HUD_STYLE;
    document.head.appendChild(styleEl);

    hud = document.createElement('div');
    hud.className = 'foundry-hammer-hud';
    hud.style.display = 'none';
    hud.innerHTML = `
      <div class="foundry-hammer-card">
        <div class="foundry-hammer-title">RUSTFALL FOUNDRY · HAMMER STRIKE</div>
        <div class="foundry-hammer-status" data-role="status">TIME THE BELL</div>
        <div class="foundry-hammer-track">
          <div class="foundry-hammer-window" data-role="window"></div>
          <div class="foundry-hammer-bead" data-role="bead"></div>
        </div>
        <div class="foundry-hammer-meta">
          <span data-role="remain">STRIKES 5</span>
          <span data-role="score">BEST —</span>
        </div>
        <div class="foundry-hammer-actions">
          <button type="button" class="primary" data-role="strike">STRIKE</button>
          <button type="button" data-role="leave">LEAVE ANVIL</button>
        </div>
        <div class="foundry-hammer-help">Space at the gold window · Bell follows the score</div>
      </div>
    `;
    document.body.appendChild(hud);

    statusEl = hud.querySelector('[data-role="status"]');
    beadEl = hud.querySelector('[data-role="bead"]');
    windowEl = hud.querySelector('[data-role="window"]');
    remainEl = hud.querySelector('[data-role="remain"]');
    scoreEl = hud.querySelector('[data-role="score"]');

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
    onSendStrike?.({ phase: localPhase });
  }

  function onKeyDown(e) {
    if (!enabled) return;
    if (e.code === 'Space' && !e.repeat) {
      e.preventDefault();
      commit();
    }
  }

  function handleBlur() {
    onBlur?.();
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeyDown);
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
      if (hud) hud.style.display = 'none';
      onBlur?.();
    },

    update(simState, delta = 0) {
      if (simState && Number.isFinite(Number(simState.phase))) {
        localPhase = Number(simState.phase);
      } else if (enabled) {
        localPhase = (localPhase + (delta || 0) / 1.2) % 1;
      }

      if (!enabled || !hud) return;

      const target = Number(simState?.targetPhase) || 0.5;
      const window = Number(simState?.windowPhase) || 0.08;
      if (windowEl) {
        windowEl.style.left = `${Math.max(0, (target - window) * 100)}%`;
        windowEl.style.width = `${window * 200}%`;
      }
      if (beadEl) beadEl.style.left = `${localPhase * 100}%`;

      const remain = simState?.remaining ?? 5;
      const best = simState?.bestScore;
      if (remainEl) remainEl.textContent = `STRIKES ${remain}`;
      if (scoreEl) {
        scoreEl.textContent = Number.isFinite(best) ? `BEST ${Math.round(best * 100)}` : 'BEST —';
      }

      let status = 'TIME THE BELL';
      if (simState?.status === 'complete') status = 'SET COMPLETE';
      else if (simState?.lastStrike?.perfect) status = 'TRUE STRIKE';
      else if (simState?.lastStrike) status = `SCORE ${Math.round(simState.lastStrike.score * 100)}`;
      if (statusEl && status !== lastStatus) {
        lastStatus = status;
        statusEl.textContent = status;
      }
    },

    dispose() {
      enabled = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', onKeyDown);
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
