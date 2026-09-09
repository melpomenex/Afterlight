/**
 * Mycelial Choir pad HUD — keys 1–4 / click, plus reset (Task 9.5).
 */

const HUD_STYLE = `
.choir-hud { position: fixed; left: 50%; bottom: 92px; transform: translateX(-50%);
  z-index: 40; font-family: 'DM Sans', sans-serif; color: #e8e7d9; }
.choir-card { min-width: 280px; padding: 12px 14px; background: #0e1a1ccc;
  border: 1px solid #7ee8b035; border-radius: 2px 14px 2px 10px; }
.choir-title { font: 8px 'Space Mono', monospace; letter-spacing: 1.4px; color: #afb9ac; }
.choir-status { margin: 8px 0; font-size: 14px; font-weight: 600; }
.choir-pads { display: flex; gap: 8px; }
.choir-pads button { flex: 1; height: 36px; border: 1px solid #b9bf9c40; cursor: pointer;
  font: 8px 'Space Mono', monospace; letter-spacing: 1px; color: #101410; }
.choir-actions { display: flex; gap: 8px; margin-top: 8px; }
.choir-actions button { flex: 1; border: 1px solid #b9bf9c40; background: #152420cc;
  color: #e8e7d9; font: 8px 'Space Mono', monospace; letter-spacing: 1px; padding: 8px; cursor: pointer; }
`;

export function createLightMusicController({
  onPress = null,
  onReset = null,
  onLeave = null,
} = {}) {
  let enabled = false;
  let hud = null;
  let styleEl = null;
  let statusEl = null;
  let progressEl = null;

  function createHud() {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
    styleEl = document.createElement('style');
    styleEl.textContent = HUD_STYLE;
    document.head.appendChild(styleEl);
    hud = document.createElement('div');
    hud.className = 'choir-hud';
    hud.style.display = 'none';
    hud.innerHTML = `
      <div class="choir-card">
        <div class="choir-title">SPORE UNDERSTORY · MYCELIAL CHOIR</div>
        <div class="choir-status" data-role="status">SHARE THE SEQUENCE</div>
        <div class="choir-pads">
          <button type="button" data-pad="0" style="background:#7ee8b0">1 SPORE</button>
          <button type="button" data-pad="1" style="background:#edb66c">2 AMBER</button>
          <button type="button" data-pad="2" style="background:#38bdf8">3 TEAL</button>
          <button type="button" data-pad="3" style="background:#a78bfa">4 VIOLET</button>
        </div>
        <div class="choir-actions">
          <button type="button" data-role="reset">RESET</button>
          <button type="button" data-role="leave">LEAVE</button>
        </div>
        <div data-role="progress" class="choir-title" style="margin-top:8px">0 / 8</div>
      </div>`;
    document.body.appendChild(hud);
    statusEl = hud.querySelector('[data-role="status"]');
    progressEl = hud.querySelector('[data-role="progress"]');
    hud.querySelectorAll('[data-pad]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (enabled) onPress?.(Number(btn.dataset.pad));
      });
    });
    hud.querySelector('[data-role="reset"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (enabled) onReset?.();
    });
    hud.querySelector('[data-role="leave"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      onLeave?.();
    });
  }

  function onKeyDown(e) {
    if (!enabled) return;
    if (e.target?.closest?.('input,textarea,[contenteditable]')) return;
    const map = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 };
    if (map[e.code] != null) {
      e.preventDefault();
      onPress?.(map[e.code]);
    } else if (e.code === 'KeyR') {
      e.preventDefault();
      onReset?.();
    }
  }

  createHud();
  if (typeof window !== 'undefined') window.addEventListener('keydown', onKeyDown);

  return {
    enable() {
      enabled = true;
      if (hud) hud.style.display = 'block';
    },
    disable() {
      enabled = false;
      if (hud) hud.style.display = 'none';
    },
    update(simState) {
      if (!hud) return;
      const len = simState?.sequence?.length || 8;
      const progress = simState?.progress || 0;
      if (progressEl) progressEl.textContent = `${progress} / ${len}`;
      if (!statusEl) return;
      if (simState?.status === 'complete') statusEl.textContent = 'THE CHOIR HOLDS — TOGETHER';
      else if (simState?.lastResult === 'miss') statusEl.textContent = 'THE THREAD SLIPS — BEGIN AGAIN';
      else statusEl.textContent = 'SHARE THE SEQUENCE';
    },
    dispose() {
      enabled = false;
      if (typeof window !== 'undefined') window.removeEventListener('keydown', onKeyDown);
      hud?.remove();
      styleEl?.remove();
    },
  };
}
