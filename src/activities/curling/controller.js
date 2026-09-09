/**
 * Curling controls and HUD: aim / power / curl, sweep while the stone is live.
 * Keyboard, pointer sliders, and a basic gamepad path share the same pending shot.
 */

const STYLE_ID = 'curling-hud-style';

function ensureStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .curling-hud { position:absolute; bottom:22px; right:22px; z-index:80; pointer-events:auto; }
    .curling-card { background:rgba(16,22,30,.88); backdrop-filter:blur(10px); border:1px solid rgba(90,117,130,.4);
      border-radius:12px; padding:14px 16px; min-width:260px; color:#e8eff5; display:flex; flex-direction:column; gap:8px;
      font-family:inherit; }
    .curling-title { font-size:12px; letter-spacing:1.6px; color:#cdd9e5; font-weight:700; }
    .curling-status { font-size:12px; color:#f0c040; font-weight:600; }
    .curling-score { font:700 13px 'Space Mono', monospace; color:#e8e7d9; }
    .curling-row { display:flex; align-items:center; gap:8px; font-size:11px; color:#8b9eb0; }
    .curling-row input { flex:1; }
    .curling-actions { display:flex; gap:8px; }
    .curling-btn { flex:1; padding:7px 10px; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer;
      background:#263238; border:1px solid #455a64; color:#cfd8dc; }
    .curling-btn.primary { background:#2e5d6e; border-color:#5aa0b5; color:#fff; }
    .curling-help { font-size:10px; color:#8b9eb0; line-height:1.4; }
  `;
  document.head.appendChild(style);
}

export function createCurlingController({
  onSendInput = null,
  onLeave = null,
} = {}) {
  let enabled = false;
  let spectator = false;
  let mySlot = 0;
  let aim = 0;
  let power = 0.62;
  let curl = 0;
  let charging = false;
  let chargeDir = 1;
  let sweepHeld = false;
  let lastSweepSent = 0;
  let lastAimSent = 0;
  let lastAimPayload = '';

  const keys = Object.create(null);

  let hud = null;
  let statusEl = null;
  let scoreEl = null;
  let endEl = null;
  let aimEl = null;
  let powerEl = null;
  let curlEl = null;

  function send(controls) {
    onSendInput?.(controls);
  }

  function createHud() {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
    ensureStyles();
    hud = document.createElement('div');
    hud.className = 'curling-hud';
    hud.style.display = 'none';
    hud.innerHTML = `
      <div class="curling-card">
        <div class="curling-title">GLACIAL GLASSHOUSE · SHEET CURLING</div>
        <div class="curling-score" data-score>GOLD 0  ·  ICE 0</div>
        <div class="curling-status" data-status>AIM AND DELIVER</div>
        <div class="curling-row" data-end>END 1 / 4</div>
        <div class="curling-row"><label>AIM</label><input type="range" min="-0.28" max="0.28" step="0.01" value="0" data-aim></div>
        <div class="curling-row"><label>POWER</label><input type="range" min="0.15" max="1" step="0.01" value="0.62" data-power></div>
        <div class="curling-row"><label>CURL</label><input type="range" min="-1" max="1" step="0.05" value="0" data-curl></div>
        <div class="curling-actions">
          <button type="button" class="curling-btn primary" data-launch>DELIVER</button>
          <button type="button" class="curling-btn" data-leave>LEAVE</button>
        </div>
        <div class="curling-help">A/D aim · W/S curl · hold Space for power · Shift/F sweep after release</div>
      </div>
    `;
    document.body.appendChild(hud);
    statusEl = hud.querySelector('[data-status]');
    scoreEl = hud.querySelector('[data-score]');
    endEl = hud.querySelector('[data-end]');
    aimEl = hud.querySelector('[data-aim]');
    powerEl = hud.querySelector('[data-power]');
    curlEl = hud.querySelector('[data-curl]');

    aimEl?.addEventListener('input', () => { aim = Number(aimEl.value); });
    powerEl?.addEventListener('input', () => { power = Number(powerEl.value); });
    curlEl?.addEventListener('input', () => { curl = Number(curlEl.value); });
    hud.querySelector('[data-launch]')?.addEventListener('click', () => {
      send({ kind: 'launch', aim, power, curl });
    });
    hud.querySelector('[data-leave]')?.addEventListener('click', () => onLeave?.());
  }

  function onKeyDown(ev) {
    if (!enabled || spectator) return;
    if (ev.target?.closest?.('input,textarea,select,[contenteditable]')) return;
    keys[ev.code] = true;
    if (ev.code === 'Space') {
      ev.preventDefault();
      charging = true;
    }
    if (ev.code === 'KeyF' || ev.code === 'ShiftLeft' || ev.code === 'ShiftRight') {
      sweepHeld = true;
    }
  }

  function onKeyUp(ev) {
    if (!enabled) return;
    keys[ev.code] = false;
    if (ev.code === 'Space') {
      ev.preventDefault();
      charging = false;
      send({ kind: 'launch', aim, power, curl });
    }
    if (ev.code === 'KeyF' || ev.code === 'ShiftLeft' || ev.code === 'ShiftRight') {
      sweepHeld = false;
    }
  }

  function pollGamepad() {
    const pads = typeof navigator !== 'undefined' ? navigator.getGamepads?.() : null;
    if (!pads) return;
    const pad = [...pads].find(Boolean);
    if (!pad) return;
    if (Math.abs(pad.axes[0] || 0) > 0.12) aim = Math.max(-0.28, Math.min(0.28, aim + pad.axes[0] * 0.01));
    if (Math.abs(pad.axes[1] || 0) > 0.12) curl = Math.max(-1, Math.min(1, curl - pad.axes[1] * 0.02));
    if (pad.buttons[7]?.pressed) power = Math.min(1, power + 0.01);
    if (pad.buttons[0]?.pressed && !keys._gpLaunch) {
      keys._gpLaunch = true;
      send({ kind: 'launch', aim, power, curl });
    }
    if (!pad.buttons[0]?.pressed) keys._gpLaunch = false;
    sweepHeld = !!(pad.buttons[1]?.pressed || pad.buttons[5]?.pressed);
  }

  return {
    enable(slot, opts = {}) {
      mySlot = slot;
      spectator = !!opts.spectator;
      enabled = true;
      if (!hud) createHud();
      if (hud) hud.style.display = 'block';
      window.addEventListener('keydown', onKeyDown, true);
      window.addEventListener('keyup', onKeyUp, true);
    },
    disable() {
      enabled = false;
      spectator = false;
      charging = false;
      sweepHeld = false;
      if (hud) hud.style.display = 'none';
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
    },
    update(simState) {
      if (!enabled || !simState) return;

      if (keys.KeyA || keys.ArrowLeft) aim = Math.max(-0.28, aim - 0.008);
      if (keys.KeyD || keys.ArrowRight) aim = Math.min(0.28, aim + 0.008);
      if (keys.KeyW || keys.ArrowUp) curl = Math.min(1, curl + 0.02);
      if (keys.KeyS || keys.ArrowDown) curl = Math.max(-1, curl - 0.02);

      if (charging) {
        power += 0.012 * chargeDir;
        if (power >= 1) { power = 1; chargeDir = -1; }
        if (power <= 0.15) { power = 0.15; chargeDir = 1; }
      }

      pollGamepad();

      if (aimEl) aimEl.value = String(aim);
      if (powerEl) powerEl.value = String(power);
      if (curlEl) curlEl.value = String(curl);

      if (simState.status === 'aiming' && simState.currentSlot === mySlot && !spectator) {
        const payload = `${aim.toFixed(3)}:${power.toFixed(3)}:${curl.toFixed(3)}`;
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        if (payload !== lastAimPayload && now - lastAimSent > 80) {
          lastAimPayload = payload;
          lastAimSent = now;
          send({ kind: 'aim', aim, power, curl });
        }
      }

      const sweepBit = sweepHeld && simState.status === 'in_flight' ? 1 : 0;
      if (sweepBit !== lastSweepSent && !spectator) {
        lastSweepSent = sweepBit;
        send({ kind: 'sweep', sweep: sweepBit });
      }

      const s0 = simState.score?.[0] ?? simState.score?.['0'] ?? 0;
      const s1 = simState.score?.[1] ?? simState.score?.['1'] ?? 0;
      if (scoreEl) scoreEl.textContent = `GOLD ${s0}  ·  ICE ${s1}`;
      const extra = simState.extraEnd ? 'EXTRA' : `${simState.currentEnd || 1} / ${simState.totalEnds || 4}`;
      if (endEl) endEl.textContent = `END ${extra}`;

      let line = 'WATCHING THE SHEET';
      if (simState.status === 'paused') line = 'WAITING — TEAMMATE RECONNECTING';
      else if (simState.status === 'aborted') line = 'SHEET ABANDONED';
      else if (simState.status === 'complete') {
        line = simState.outcome === 'forfeit'
          ? (simState.winner === mySlot || teamOf(mySlot, simState) === simState.winner ? 'THE OTHER SIDE FORFEITED' : 'FORFEIT')
          : (teamOf(mySlot, simState) === simState.winner ? 'YOUR SIDE TAKES THE SHEET' : 'THE OTHER SIDE WINS');
      } else if (spectator) line = 'SPECTATING';
      else if (simState.status === 'in_flight') line = sweepHeld ? 'SWEEPING' : 'STONE IN PLAY — HOLD SHIFT TO SWEEP';
      else if (simState.currentSlot === mySlot) line = 'YOUR THROW';
      else line = 'WAIT FOR YOUR TURN';
      if (statusEl) statusEl.textContent = line;
    },
    dispose() {
      this.disable();
      hud?.remove();
      hud = null;
    },
  };
}

function teamOf(slot, state) {
  if (state.teamSize === 2) return slot <= 1 ? 0 : 1;
  return slot === 0 ? 0 : 1;
}
