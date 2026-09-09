/**
 * Darts throw controls: pointer/touch flick AND keyboard/controller aim-power (Task 9.6).
 * Both paths emit the same bounded (u, v) throw.
 */

import { aimPowerToPoint } from '../../../shared/dartsModel.js';

const HUD_STYLE = `
.darts-hud { position: fixed; left: 50%; bottom: 92px; transform: translateX(-50%);
  z-index: 40; font-family: 'DM Sans', sans-serif; color: #e8e7d9; }
.darts-card { min-width: 300px; padding: 12px 14px; background: #0e1a1ccc;
  border: 1px solid #c6b47a40; border-radius: 2px 14px 2px 10px; }
.darts-title { font: 8px 'Space Mono', monospace; letter-spacing: 1.4px; color: #afb9ac; }
.darts-status { margin: 8px 0; font-size: 14px; font-weight: 600; }
.darts-scores { display: flex; justify-content: space-between; font: 12px 'Space Mono', monospace; }
.darts-board { width: 180px; height: 180px; margin: 8px auto; border-radius: 50%;
  background: radial-gradient(circle, #7a2028 0 12%, #1a1f18 12% 100%);
  border: 3px solid #c6b47a; position: relative; touch-action: none; cursor: crosshair; }
.darts-bead { position: absolute; width: 10px; height: 10px; margin: -5px 0 0 -5px;
  background: #e8c76a; border-radius: 50%; pointer-events: none; }
.darts-power { height: 8px; background: #1a2a28; margin-top: 8px; }
.darts-power > span { display: block; height: 100%; background: #c9b889; width: 0; }
.darts-help { margin-top: 8px; font: 8px 'Space Mono', monospace; color: #8f9a8c; }
.darts-actions button { margin-top: 8px; width: 100%; border: 1px solid #b9bf9c40;
  background: #152420cc; color: #e8e7d9; font: 8px 'Space Mono', monospace; padding: 8px; cursor: pointer; }
`;

export function createDartsController({
  onThrow = null,
  onLeave = null,
} = {}) {
  let enabled = false;
  let aim = 0;
  let power = 0.65;
  let charging = false;
  let flick = null;
  let hud = null;
  let styleEl = null;
  let statusEl = null;
  let scoreEl = null;
  let turnEl = null;
  let bead = null;
  let powerFill = null;
  let boardEl = null;

  function createHud() {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
    styleEl = document.createElement('style');
    styleEl.textContent = HUD_STYLE;
    document.head.appendChild(styleEl);
    hud = document.createElement('div');
    hud.className = 'darts-hud';
    hud.style.display = 'none';
    hud.innerHTML = `
      <div class="darts-card">
        <div class="darts-title">THE ORPHEUM · 301 DOUBLE-OUT</div>
        <div class="darts-status" data-role="status">YOUR THROW</div>
        <div class="darts-scores">
          <span data-role="scores">301 — 301</span>
          <span data-role="turn">3 DARTS</span>
        </div>
        <div class="darts-board" data-role="board"><div class="darts-bead" data-role="bead"></div></div>
        <div class="darts-power"><span data-role="power"></span></div>
        <div class="darts-help">Flick the board · or arrows + hold Space for power · gamepad stick + A</div>
        <div class="darts-actions"><button type="button" data-role="leave">LEAVE OCHE</button></div>
      </div>`;
    document.body.appendChild(hud);
    statusEl = hud.querySelector('[data-role="status"]');
    scoreEl = hud.querySelector('[data-role="scores"]');
    turnEl = hud.querySelector('[data-role="turn"]');
    bead = hud.querySelector('[data-role="bead"]');
    powerFill = hud.querySelector('[data-role="power"]');
    boardEl = hud.querySelector('[data-role="board"]');
    hud.querySelector('[data-role="leave"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      onLeave?.();
    });
    bindFlick(boardEl);
  }

  function bindFlick(el) {
    if (!el) return;
    const down = (ev) => {
      if (!enabled) return;
      ev.preventDefault();
      const r = el.getBoundingClientRect();
      const id = ev.pointerId;
      flick = { id, x0: ev.clientX, y0: ev.clientY, t0: performance.now(), r };
      el.setPointerCapture?.(id);
    };
    const up = (ev) => {
      if (!flick || flick.id !== ev.pointerId) return;
      const r = flick.r;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dt = Math.max(16, performance.now() - flick.t0);
      const vx = (ev.clientX - flick.x0) / dt;
      const vy = (ev.clientY - flick.y0) / dt;
      const nx = (ev.clientX - cx) / (r.width / 2) + vx * 0.35;
      const ny = (cy - ev.clientY) / (r.height / 2) - vy * 0.35;
      flick = null;
      onThrow?.({ u: nx, v: ny });
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', () => { flick = null; });
  }

  function fireAimPower() {
    const pt = aimPowerToPoint(aim, power);
    onThrow?.({ u: pt.u, v: pt.v });
    charging = false;
  }

  function onKeyDown(e) {
    if (!enabled) return;
    if (e.target?.closest?.('input,textarea,[contenteditable]')) return;
    if (e.code === 'ArrowLeft') { e.preventDefault(); aim = (aim + 0.97) % 1; }
    if (e.code === 'ArrowRight') { e.preventDefault(); aim = (aim + 0.03) % 1; }
    if (e.code === 'ArrowUp') { e.preventDefault(); power = Math.min(1, power + 0.04); }
    if (e.code === 'ArrowDown') { e.preventDefault(); power = Math.max(0, power - 0.04); }
    if (e.code === 'Space' && !e.repeat) { e.preventDefault(); charging = true; }
    if (e.code === 'Enter' && !e.repeat) { e.preventDefault(); fireAimPower(); }
  }

  function onKeyUp(e) {
    if (!enabled) return;
    if (e.code === 'Space' && charging) {
      e.preventDefault();
      fireAimPower();
    }
  }

  function pollGamepad() {
    if (!enabled || typeof navigator === 'undefined' || !navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    const gp = pads && pads[0];
    if (!gp) return;
    const ax = gp.axes[0] || 0;
    const ay = gp.axes[1] || 0;
    if (Math.hypot(ax, ay) > 0.2) {
      aim = (Math.atan2(ax, -ay) / (Math.PI * 2) + 1) % 1;
    }
    const rt = gp.buttons[7]?.value || 0;
    const a = gp.buttons[0];
    if (rt > 0.1) power = rt;
    if (a?.pressed && !charging) {
      charging = true;
    } else if (charging && a && !a.pressed) {
      fireAimPower();
    }
  }

  createHud();
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
  }

  return {
    enable() { enabled = true; if (hud) hud.style.display = 'block'; },
    disable() { enabled = false; charging = false; if (hud) hud.style.display = 'none'; },
    update(simState) {
      pollGamepad();
      if (charging) {
        power = (Math.sin(performance.now() / 220) + 1) / 2;
      }
      const pt = aimPowerToPoint(aim, power);
      if (bead) {
        bead.style.left = `${50 + pt.u * 50}%`;
        bead.style.top = `${50 - pt.v * 50}%`;
      }
      if (powerFill) powerFill.style.width = `${Math.round(power * 100)}%`;
      if (!simState) return;
      const p0 = simState.players?.[0] || simState.players?.['0'];
      const p1 = simState.players?.[1] || simState.players?.['1'];
      if (scoreEl) scoreEl.textContent = `${p0?.score ?? 301} — ${p1?.score ?? 301}`;
      if (turnEl) turnEl.textContent = `${simState.dartsRemaining ?? 3} DARTS · TURN ${simState.turnTotal ?? 0}`;
      if (statusEl) {
        if (simState.status === 'complete') statusEl.textContent = `CHECKOUT · PLAYER ${(simState.winner ?? 0) + 1}`;
        else if (simState.lastEvent === 'bust') statusEl.textContent = 'BUST — SCORE RESTORED';
        else statusEl.textContent = 'YOUR THROW';
      }
    },
    dispose() {
      enabled = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
      }
      hud?.remove();
      styleEl?.remove();
    },
  };
}
