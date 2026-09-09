/**
 * Horseshoes throw HUD: angle / power / lateral, scores, leave.
 */

import { HORSESHOES_STAKE_POWER } from '../../../shared/horseshoesModel.js';

const HUD_STYLE = `
  position:fixed;right:18px;bottom:92px;z-index:24;width:280px;
  padding:12px 14px;background:rgba(12,24,28,.78);border:1px solid rgba(214,196,150,.28);
  border-radius:14px 4px 14px 4px;color:#f3ead6;font:12px/1.4 "DM Sans",sans-serif;
`;

export function createHorseshoeController({
  onSendThrow = null,
  onLeave = null,
} = {}) {
  let enabled = false;
  let mySlot = 0;
  let angleVal = 0;
  let powerVal = HORSESHOES_STAKE_POWER;
  let lateralVal = 0;
  let hud = null;
  let statusEl = null;
  let scoreEl = null;
  let turnEl = null;

  function createHud() {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
    hud = document.createElement('div');
    hud.setAttribute('role', 'region');
    hud.setAttribute('aria-label', 'Horseshoes');
    hud.style.cssText = HUD_STYLE;
    hud.style.display = 'none';
    hud.innerHTML = `
      <div style="letter-spacing:.12em;font:11px/1 'Space Mono',monospace;color:#d6c496;">DESERT CAMP · HORSESHOES</div>
      <div data-role="turn" style="margin:.35rem 0;color:#9fd0c6;">YOUR THROW</div>
      <div data-role="score" style="margin-bottom:.45rem;">0 — 0</div>
      <div data-role="status" style="margin-bottom:.6rem;color:#c9d6cf;">Alternate four shoes. First to 21.</div>
      <label style="display:block;margin:.3rem 0;">Angle
        <input data-role="angle" type="range" min="-0.45" max="0.45" step="0.01" value="0" style="width:100%">
      </label>
      <label style="display:block;margin:.3rem 0;">Power
        <input data-role="power" type="range" min="0" max="1" step="0.01" value="${HORSESHOES_STAKE_POWER}" style="width:100%">
      </label>
      <label style="display:block;margin:.3rem 0;">Lateral
        <input data-role="lateral" type="range" min="-1" max="1" step="0.01" value="0" style="width:100%">
      </label>
      <div style="display:flex;gap:8px;margin-top:8px;">
        <button type="button" data-role="throw" style="flex:1;padding:.45rem .6rem;background:#c47a3a;border:0;color:#1b120c;border-radius:6px;">Throw</button>
        <button type="button" data-role="leave" style="padding:.45rem .6rem;background:transparent;border:1px solid #8aa;color:#dfe;border-radius:6px;">Leave</button>
      </div>
    `;
    document.body.appendChild(hud);
    statusEl = hud.querySelector('[data-role="status"]');
    scoreEl = hud.querySelector('[data-role="score"]');
    turnEl = hud.querySelector('[data-role="turn"]');

    hud.querySelector('[data-role="angle"]').addEventListener('input', (e) => {
      angleVal = Number(e.target.value);
    });
    hud.querySelector('[data-role="power"]').addEventListener('input', (e) => {
      powerVal = Number(e.target.value);
    });
    hud.querySelector('[data-role="lateral"]').addEventListener('input', (e) => {
      lateralVal = Number(e.target.value);
    });
    hud.querySelector('[data-role="throw"]').addEventListener('click', (e) => {
      e.stopPropagation();
      if (!enabled) return;
      onSendThrow?.({ kind: 'throw', angle: angleVal, power: powerVal, lateral: lateralVal });
    });
    hud.querySelector('[data-role="leave"]').addEventListener('click', (e) => {
      e.stopPropagation();
      onLeave?.();
    });
  }

  function handleKeyDown(e) {
    if (!enabled) return;
    if (e.code === 'Space') {
      e.preventDefault();
      onSendThrow?.({ kind: 'throw', angle: angleVal, power: powerVal, lateral: lateralVal });
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown);
  }
  createHud();

  return {
    enable(slot = 0) {
      enabled = true;
      mySlot = slot;
      if (hud) hud.style.display = 'block';
    },

    disable() {
      enabled = false;
      if (hud) hud.style.display = 'none';
    },

    update(simState) {
      if (!enabled || !simState) return;
      const p0 = simState.players?.[0] ?? simState.players?.['0'];
      const p1 = simState.players?.[1] ?? simState.players?.['1'];
      if (scoreEl) scoreEl.textContent = `${p0?.score ?? 0} — ${p1?.score ?? 0}`;
      if (turnEl) {
        const mine = Number(simState.nextSlot) === Number(mySlot);
        turnEl.textContent = simState.status === 'complete'
          ? `PLAYER ${(simState.winner ?? 0) + 1} WINS`
          : (mine ? 'YOUR THROW' : 'WAITING');
      }
      if (statusEl) {
        if (simState.status === 'complete') {
          statusEl.textContent = 'First to 21. Walk away whenever you like.';
        } else if (simState.extraRound) {
          statusEl.textContent = 'Tied at 21. Extra round — must lead after the inning.';
        } else {
          statusEl.textContent = `Round ${simState.currentRound}. Ringer 3 · close 1 · cancel.`;
        }
      }
    },

    dispose() {
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeyDown);
      }
      hud?.parentElement?.removeChild(hud);
      hud = null;
    },
  };
}
