/**
 * Cast / reel / release HUD for shoreline fishing.
 */

const HUD_CSS = `
.fishing-hud-container { position: fixed; left: 16px; bottom: 92px; z-index: 40; pointer-events: auto; }
.fishing-card {
  min-width: 260px; max-width: 320px;
  background: rgba(18, 32, 36, 0.78); border: 1px solid rgba(196, 176, 132, 0.28);
  border-radius: 4px 14px 4px 10px; padding: 12px 14px; color: #f3ead8;
  font-family: "DM Sans", sans-serif; backdrop-filter: blur(8px);
}
.fishing-header { display: flex; justify-content: space-between; gap: 8px; font-family: "Space Mono", monospace; font-size: 10px; letter-spacing: 0.08em; color: #c4b084; }
.fishing-status { margin: 8px 0; font-size: 13px; }
.fishing-weather { font-family: "Space Mono", monospace; font-size: 11px; color: #d5c7a4; margin-bottom: 8px; }
.fishing-power-track { height: 8px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; }
.fishing-power-fill { height: 100%; width: 65%; background: #edb66c; }
.fishing-actions { display: flex; gap: 8px; margin-top: 10px; }
.fishing-actions button {
  flex: 1; border: 1px solid rgba(196,176,132,0.35); background: rgba(0,0,0,0.25);
  color: #f3ead8; padding: 6px 8px; font-family: "Space Mono", monospace; font-size: 10px; letter-spacing: 0.06em; cursor: pointer;
}
.fishing-help { margin-top: 8px; font-size: 11px; color: #b7c4b8; }
`;

export function createFishingController({
  title = 'Basin Fishing',
  onSendInput = null,
  onLeave = null,
} = {}) {
  let enabled = false;
  let mySlot = 0;
  let powerVal = 0.65;
  let charging = false;
  let chargeDir = 1;
  let hud = null;
  let statusEl = null;
  let weatherEl = null;
  let powerEl = null;
  let reelBtn = null;
  let releaseBtn = null;
  let styleEl = null;

  function ensureStyle() {
    if (typeof document === 'undefined' || document.getElementById('fishing-hud-style')) return;
    styleEl = document.createElement('style');
    styleEl.id = 'fishing-hud-style';
    styleEl.textContent = HUD_CSS;
    document.head.appendChild(styleEl);
  }

  function createHud() {
    if (typeof document === 'undefined') return;
    ensureStyle();
    hud = document.createElement('div');
    hud.className = 'fishing-hud-container';
    hud.style.display = 'none';
    hud.innerHTML = `
      <div class="fishing-card">
        <div class="fishing-header">
          <span>${title.toUpperCase()}</span>
          <span id="fishing-slot">LINE 1</span>
        </div>
        <div class="fishing-status" id="fishing-status">Cast into the live water</div>
        <div class="fishing-weather" id="fishing-weather">LIVE WEATHER</div>
        <div class="fishing-power-track"><div class="fishing-power-fill" id="fishing-power"></div></div>
        <div class="fishing-actions">
          <button type="button" id="fishing-cast">CAST</button>
          <button type="button" id="fishing-reel">REEL</button>
          <button type="button" id="fishing-release">RELEASE</button>
          <button type="button" id="fishing-leave">LEAVE</button>
        </div>
        <div class="fishing-help">Hold Space to charge · no catch is kept</div>
      </div>
    `;
    document.body.appendChild(hud);
    statusEl = hud.querySelector('#fishing-status');
    weatherEl = hud.querySelector('#fishing-weather');
    powerEl = hud.querySelector('#fishing-power');
    reelBtn = hud.querySelector('#fishing-reel');
    releaseBtn = hud.querySelector('#fishing-release');
    hud.querySelector('#fishing-cast')?.addEventListener('click', (e) => { e.stopPropagation(); sendCast(); });
    hud.querySelector('#fishing-reel')?.addEventListener('click', (e) => { e.stopPropagation(); onSendInput?.({ kind: 'reel' }); });
    hud.querySelector('#fishing-release')?.addEventListener('click', (e) => { e.stopPropagation(); onSendInput?.({ kind: 'release' }); });
    hud.querySelector('#fishing-leave')?.addEventListener('click', (e) => { e.stopPropagation(); onLeave?.(); });
  }

  function sendCast() {
    if (!enabled) return;
    onSendInput?.({ kind: 'cast', power: powerVal });
  }

  function onKeyDown(e) {
    if (!enabled) return;
    if (e.code === 'Space') { charging = true; e.preventDefault(); }
    if (e.code === 'KeyR') { onSendInput?.({ kind: 'reel' }); e.preventDefault(); }
    if (e.code === 'Escape') { onLeave?.(); e.preventDefault(); }
  }

  function onKeyUp(e) {
    if (!enabled) return;
    if (e.code === 'Space' && charging) {
      charging = false;
      sendCast();
      e.preventDefault();
    }
  }

  createHud();

  return {
    enable(slot = 0) {
      enabled = true;
      mySlot = slot;
      if (typeof window !== 'undefined') {
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
      }
      if (hud) {
        hud.style.display = 'block';
        const badge = hud.querySelector('#fishing-slot');
        if (badge) badge.textContent = `LINE ${slot + 1}`;
      }
    },
    disable() {
      enabled = false;
      charging = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
      }
      if (hud) hud.style.display = 'none';
    },
    update(simState) {
      if (!enabled) return;
      if (charging) {
        powerVal += chargeDir * 0.02;
        if (powerVal >= 1) { powerVal = 1; chargeDir = -1; }
        if (powerVal <= 0.15) { powerVal = 0.15; chargeDir = 1; }
      }
      if (powerEl) powerEl.style.width = `${Math.round(powerVal * 100)}%`;

      const env = simState?.environment;
      if (weatherEl && env) {
        const rain = Math.round((env.rain ?? 0) * 100);
        const phase = env.timePhase ?? 0;
        weatherEl.textContent = `LIVE · rain ${rain}% · time ${phase.toFixed(2)}`;
      }

      const me = simState?.anglers?.[mySlot] || simState?.anglers?.[String(mySlot)];
      if (statusEl && me) {
        if (me.phase === 'waiting') statusEl.textContent = 'Waiting on a live bite';
        else if (me.phase === 'bite') statusEl.textContent = 'Bite! Reel now';
        else if (me.phase === 'reeling') statusEl.textContent = 'Reeling in';
        else if (me.phase === 'catch') {
          const c = me.lastCatch;
          statusEl.textContent = c
            ? `${c.species.replace('-', ' ')} · ${c.lengthCm} cm — release it`
            : 'A catch — release it';
        } else if (me.phase === 'casting') statusEl.textContent = 'Line out';
        else statusEl.textContent = 'Cast into the live water';
      }
      if (reelBtn) reelBtn.disabled = me?.phase !== 'bite';
      if (releaseBtn) releaseBtn.disabled = me?.phase !== 'catch';
    },
    dispose() {
      this.disable();
      if (hud?.parentNode) hud.parentNode.removeChild(hud);
      hud = null;
    },
  };
}
