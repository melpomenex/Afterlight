/**
 * Downhill Mayhem effects (integrate-multiplayer-downhill-mayhem-arcade 5.4).
 * Speed streaks, floating popups and the hit flash, ported from the source
 * `popup`/`drawFx`/`#hitflash`. Owns a small DOM subtree under the provided
 * root and an optional 2D streak canvas supplied by the shell; no renderer or
 * RAF ownership.
 */

import { clamp } from './course.js';

export function createEffects({ root = null, doc = null } = {}) {
  const documentRef = doc || (typeof document !== 'undefined' ? document : null);
  let popupsEl = null, flashEl = null, streakCanvas = null, sctx = null;
  const timers = new Set();
  let disposed = false;

  const later = (fn, ms) => {
    const id = setTimeout(() => { timers.delete(id); if (!disposed) fn(); }, ms);
    timers.add(id);
    return id;
  };

  if (documentRef && root) {
    popupsEl = documentRef.createElement('div');
    popupsEl.className = 'dm-popups';
    root.appendChild(popupsEl);
    flashEl = documentRef.createElement('div');
    flashEl.className = 'dm-hitflash';
    root.appendChild(flashEl);
  }

  return {
    get popupsEl() { return popupsEl; },

    attachStreakCanvas(canvas) {
      streakCanvas = canvas || null;
      sctx = streakCanvas && streakCanvas.getContext ? streakCanvas.getContext('2d') : null;
    },

    resize(width, height) {
      if (!streakCanvas) return;
      streakCanvas.width = Math.max(1, Math.floor(width) || 1);
      streakCanvas.height = Math.max(1, Math.floor(height) || 1);
    },

    popup(text, cls) {
      if (disposed || !popupsEl || !documentRef) return;
      const d = documentRef.createElement('div');
      d.className = 'dm-pop ' + (cls || '');
      d.textContent = text;
      popupsEl.appendChild(d);
      while (popupsEl.children.length > 3) popupsEl.removeChild(popupsEl.firstChild);
      later(() => { if (d.parentNode) d.parentNode.removeChild(d); }, 1400);
    },

    hitFlash() {
      if (!flashEl) return;
      flashEl.classList.remove('dm-flash');
      void flashEl.offsetWidth;
      flashEl.classList.add('dm-flash');
    },

    /** Draw speed streaks for the current frame. `intensity` is 0..1. */
    drawStreaks(intensity) {
      if (!sctx || disposed) return;
      const w = streakCanvas.width, h = streakCanvas.height;
      sctx.clearRect(0, 0, w, h);
      const inten = clamp(intensity, 0, 1);
      if (inten <= 0) return;
      sctx.strokeStyle = 'rgba(255,255,255,' + (0.28 * inten) + ')';
      sctx.lineWidth = 2;
      const cxx = w / 2, cyy = h / 2;
      sctx.beginPath();
      for (let i = 0; i < 26; i++) {
        const a = Math.random() * Math.PI * 2;
        const r0 = (0.2 + Math.random() * 0.28) * Math.min(w, h);
        const r1 = r0 + (60 + Math.random() * 180) * inten;
        sctx.moveTo(cxx + Math.cos(a) * r0, cyy + Math.sin(a) * r0);
        sctx.lineTo(cxx + Math.cos(a) * r1, cyy + Math.sin(a) * r1);
      }
      sctx.stroke();
    },

    clearStreaks() {
      if (sctx && streakCanvas) sctx.clearRect(0, 0, streakCanvas.width, streakCanvas.height);
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      for (const id of timers) clearTimeout(id);
      timers.clear();
      if (popupsEl && popupsEl.parentNode) popupsEl.parentNode.removeChild(popupsEl);
      if (flashEl && flashEl.parentNode) flashEl.parentNode.removeChild(flashEl);
      popupsEl = flashEl = null;
      sctx = null;
    },
  };
}
