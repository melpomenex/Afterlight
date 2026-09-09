/**
 * Angle / power skip HUD shared by Basin and Marshes.
 */

const HUD_CSS = `
.skip-hud-container { position: fixed; left: 16px; bottom: 92px; z-index: 40; pointer-events: auto; }
.skip-card {
  min-width: 260px; max-width: 320px;
  background: rgba(18, 32, 36, 0.78); border: 1px solid rgba(196, 176, 132, 0.28);
  border-radius: 4px 14px 4px 10px; padding: 12px 14px; color: #f3ead8;
  font-family: "DM Sans", sans-serif; backdrop-filter: blur(8px);
}
.skip-header { display: flex; justify-content: space-between; font-family: "Space Mono", monospace; font-size: 10px; letter-spacing: 0.08em; color: #c4b084; }
.skip-status { margin: 8px 0; font-size: 13px; }
.skip-weather { font-family: "Space Mono", monospace; font-size: 11px; color: #d5c7a4; margin-bottom: 8px; }
.skip-row { display: flex; align-items: center; gap: 8px; font-size: 11px; margin: 6px 0; }
.skip-row input { flex: 1; }
.skip-power-track { height: 8px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; flex: 1; }
.skip-power-fill { height: 100%; width: 65%; background: #38bdf8; }
.skip-actions { display: flex; gap: 8px; margin-top: 10px; }
.skip-actions button {
  flex: 1; border: 1px solid rgba(196,176,132,0.35); background: rgba(0,0,0,0.25);
  color: #f3ead8; padding: 6px 8px; font-family: "Space Mono", monospace; font-size: 10px; cursor: pointer;
}
.skip-help { margin-top: 8px; font-size: 11px; color: #b7c4b8; }
`;

export function createSkippingController({
  title = 'Skipping Stones',
  onSendLaunch = null,
  onLeave = null,
} = {}) {
  let enabled = false;
  let mySlot = 0;
  let angle = 0.22;
  let power = 0.65;
  let charging = false;
  let chargeDir = 1;
  let hud = null;
  let statusEl = null;
  let weatherEl = null;
  let powerEl = null;
  let angleEl = null;

  function ensureStyle() {
    if (typeof document === 'undefined' || document.getElementById('skip-hud-style')) return;
    const style = document.createElement('style');
    style.id = 'skip-hud-style';
    style.textContent = HUD_CSS;
    document.head.appendChild(style);
  }

  function createHud() {
    if (typeof document === 'undefined') return;
    ensureStyle();
    hud = document.createElement('div');
    hud.className = 'skip-hud-container';
    hud.style.display = 'none';
    hud.innerHTML = `
      <div class="skip-card">
        <div class="skip-header">
          <span>${title.toUpperCase()}</span>
          <span id="skip-slot">STONE 1</span>
        </div>
        <div class="skip-status" id="skip-status">Aim across the frozen water</div>
        <div class="skip-weather" id="skip-weather">FROZEN START WIND</div>
        <div class="skip-row"><label>ANGLE</label><input type="range" id="skip-angle" min="0.06" max="0.55" step="0.01" value="0.22"></div>
        <div class="skip-row"><label>POWER</label><div class="skip-power-track"><div class="skip-power-fill" id="skip-power"></div></div></div>
        <div class="skip-actions">
          <button type="button" id="skip-throw">SKIP</button>
          <button type="button" id="skip-leave">LEAVE</button>
        </div>
        <div class="skip-help">Hold Space to charge · shared skips, then cleanup</div>
      </div>
    `;
    document.body.appendChild(hud);
    statusEl = hud.querySelector('#skip-status');
    weatherEl = hud.querySelector('#skip-weather');
    powerEl = hud.querySelector('#skip-power');
    angleEl = hud.querySelector('#skip-angle');
    angleEl?.addEventListener('input', (e) => { angle = parseFloat(e.target.value); });
    hud.querySelector('#skip-throw')?.addEventListener('click', (e) => { e.stopPropagation(); launch(); });
    hud.querySelector('#skip-leave')?.addEventListener('click', (e) => { e.stopPropagation(); onLeave?.(); });
  }

  function launch() {
    if (!enabled) return;
    onSendLaunch?.({ kind: 'launch', angle, power, yaw: 0 });
  }

  function onKeyDown(e) {
    if (!enabled) return;
    if (e.code === 'Space') { charging = true; e.preventDefault(); }
    if (e.code === 'Escape') { onLeave?.(); e.preventDefault(); }
  }

  function onKeyUp(e) {
    if (!enabled) return;
    if (e.code === 'Space' && charging) {
      charging = false;
      launch();
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
        const badge = hud.querySelector('#skip-slot');
        if (badge) badge.textContent = `STONE ${slot + 1}`;
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
        power += chargeDir * 0.02;
        if (power >= 1) { power = 1; chargeDir = -1; }
        if (power <= 0.15) { power = 0.15; chargeDir = 1; }
      }
      if (powerEl) powerEl.style.width = `${Math.round(power * 100)}%`;
      const env = simState?.environment;
      if (weatherEl && env) {
        const wind = env.wind || [0, 0];
        weatherEl.textContent = `FROZEN · wind ${Math.hypot(wind[0], wind[1]).toFixed(2)} · rain ${Math.round((env.rain ?? 0) * 100)}%`;
      }
      const me = simState?.throwers?.[mySlot] || simState?.throwers?.[String(mySlot)];
      if (statusEl && me) {
        if (me.phase === 'flying') statusEl.textContent = 'Stone in flight';
        else if (me.phase === 'sunk' && me.lastThrow) {
          statusEl.textContent = `${me.lastThrow.skips} skips · ${me.lastThrow.distance} m`;
        } else {
          statusEl.textContent = 'Aim across the frozen water';
        }
      }
    },
    dispose() {
      this.disable();
      if (hud?.parentNode) hud.parentNode.removeChild(hud);
      hud = null;
    },
  };
}
