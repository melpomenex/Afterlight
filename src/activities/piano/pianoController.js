/**
 * Spatial piano — note events only. Mute, blur, and leave stop every voice (Task 9.7).
 */

const KEY_MAP = {
  KeyA: 48, KeyW: 49, KeyS: 50, KeyE: 51, KeyD: 52, KeyF: 53, KeyT: 54,
  KeyG: 55, KeyY: 56, KeyH: 57, KeyU: 58, KeyJ: 59, KeyK: 60,
  KeyO: 61, KeyL: 62, Semicolon: 64,
};

const HUD_STYLE = `
.piano-hud { position: fixed; left: 50%; bottom: 92px; transform: translateX(-50%);
  z-index: 40; font-family: 'DM Sans', sans-serif; color: #e8e7d9; }
.piano-card { min-width: 320px; padding: 12px 14px; background: #0e1a1ccc;
  border: 1px solid #c6b47a40; border-radius: 2px 14px 2px 10px; }
.piano-title { font: 8px 'Space Mono', monospace; letter-spacing: 1.4px; color: #afb9ac; }
.piano-status { margin: 8px 0; font-size: 14px; font-weight: 600; }
.piano-actions { display: flex; gap: 8px; }
.piano-actions button { flex: 1; border: 1px solid #b9bf9c40; background: #152420cc;
  color: #e8e7d9; font: 8px 'Space Mono', monospace; padding: 8px; cursor: pointer; }
.piano-help { margin-top: 8px; font: 8px 'Space Mono', monospace; color: #8f9a8c; }
`;

export function createPianoController({
  onNoteOn = null,
  onNoteOff = null,
  onAllOff = null,
  onLeave = null,
  onMute = null,
} = {}) {
  let enabled = false;
  const held = new Set();
  let hud = null;
  let styleEl = null;
  let statusEl = null;

  function createHud() {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
    styleEl = document.createElement('style');
    styleEl.textContent = HUD_STYLE;
    document.head.appendChild(styleEl);
    hud = document.createElement('div');
    hud.className = 'piano-hud';
    hud.style.display = 'none';
    hud.innerHTML = `
      <div class="piano-card">
        <div class="piano-title">THE ORPHEUM · LOBBY PIANO</div>
        <div class="piano-status" data-role="status">A–L PLAY · MUTE RESPECTED</div>
        <div class="piano-actions">
          <button type="button" data-role="mute">MUTE</button>
          <button type="button" data-role="leave">STAND UP</button>
        </div>
        <div class="piano-help">Notes travel as events — never as audio. Blur silences every key.</div>
      </div>`;
    document.body.appendChild(hud);
    statusEl = hud.querySelector('[data-role="status"]');
    hud.querySelector('[data-role="mute"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      onMute?.(true);
      allOff();
    });
    hud.querySelector('[data-role="leave"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      allOff();
      onLeave?.();
    });
  }

  function allOff() {
    for (const midi of held) onNoteOff?.(midi);
    held.clear();
    onAllOff?.();
  }

  function onKeyDown(e) {
    if (!enabled) return;
    if (e.target?.closest?.('input,textarea,[contenteditable]')) return;
    const midi = KEY_MAP[e.code];
    if (midi == null || e.repeat) return;
    e.preventDefault();
    held.add(midi);
    onNoteOn?.(midi);
  }

  function onKeyUp(e) {
    if (!enabled) return;
    const midi = KEY_MAP[e.code];
    if (midi == null) return;
    e.preventDefault();
    held.delete(midi);
    onNoteOff?.(midi);
  }

  function onBlur() { allOff(); }
  function onVis() {
    if (typeof document !== 'undefined' && document.hidden) allOff();
  }

  createHud();
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener?.('visibilitychange', onVis);
  }

  return {
    enable() { enabled = true; if (hud) hud.style.display = 'block'; },
    disable() { allOff(); enabled = false; if (hud) hud.style.display = 'none'; },
    neutralize: allOff,
    heldCount() { return held.size; },
    update(simState) {
      if (statusEl) {
        const n = simState?.activeNotes?.length || 0;
        statusEl.textContent = simState?.muted ? 'MUTED — NO TONE' : `${n} NOTES · EVENTS ONLY`;
      }
    },
    dispose() {
      enabled = false;
      allOff();
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('blur', onBlur);
        document.removeEventListener?.('visibilitychange', onVis);
      }
      hud?.remove();
      styleEl?.remove();
    },
  };
}
