/**
 * Chess table controls: select origin then destination.
 * Keyboard, pointer, and touch share the same legal-target feedback.
 * Escape clears a selection first; a second Escape leaves via onLeave
 * (existing participation seam also restores world control).
 */

import * as THREE from 'three';
import { isTypingTarget } from '../inputSeam.js';
import {
  indexToAlgebraic,
  legalMoves,
  slotToColor,
} from '../../../shared/chessModel.js';

const HUD_STYLE = [
  'position:absolute',
  'left:16px',
  'bottom:92px',
  'z-index:8',
  'min-width:240px',
  'max-width:320px',
  'padding:12px 14px',
  'border-radius:12px 4px 12px 4px',
  'background:rgba(18,28,32,0.78)',
  'border:1px solid rgba(196,184,150,0.28)',
  'color:#efe6d4',
  'font:12px/1.4 "DM Sans", system-ui, sans-serif',
  'letter-spacing:0.02em',
  'pointer-events:auto',
].join(';');

function squareFromLocal(localX, localZ, squareSize) {
  const file = Math.round(localX / squareSize + 3.5);
  const rank = Math.round(localZ / squareSize + 3.5);
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return indexToAlgebraic(rank * 8 + file);
}

export function createChessController({
  tablePosition = [6.4, 0, 1.2],
  rotationY = 0,
  getActiveCamera = null,
  tableScene = null,
  onSendInput = null,
  onLeave = null,
} = {}) {
  let enabled = false;
  let mySlot = 0;
  let simState = null;
  let selected = null;
  let cursor = 'e2';
  let lastTargets = [];

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const localHit = new THREE.Vector3();
  const inv = new THREE.Matrix4();

  let hud = null;
  let statusEl = null;
  let turnEl = null;
  let helpEl = null;

  function createHud() {
    if (typeof document === 'undefined' || hud) return;
    hud = document.createElement('div');
    hud.className = 'chess-hud';
    hud.setAttribute('role', 'region');
    hud.setAttribute('aria-label', 'Chess table');
    hud.style.cssText = HUD_STYLE + ';display:none';
    hud.innerHTML = `
      <div style="font:11px/1 'Space Mono', ui-monospace, monospace;letter-spacing:0.12em;color:#c4b896;margin-bottom:6px">QUIET BOARD · HOUSE CHESS</div>
      <div data-role="turn" style="font-weight:600;margin-bottom:4px">White to move</div>
      <div data-role="status" style="opacity:0.88;margin-bottom:10px">Select a piece, then a square.</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
        <button type="button" data-act="resign" style="${btnStyle()}">Resign</button>
        <button type="button" data-act="draw" style="${btnStyle()}">Offer draw</button>
        <button type="button" data-act="leave" style="${btnStyle()}">Leave</button>
      </div>
      <div data-role="help" style="opacity:0.7;font-size:11px">Arrows move the cursor · Enter selects · Esc clears, then leaves</div>
    `;
    document.body.appendChild(hud);
    statusEl = hud.querySelector('[data-role="status"]');
    turnEl = hud.querySelector('[data-role="turn"]');
    helpEl = hud.querySelector('[data-role="help"]');
    hud.addEventListener('click', (ev) => {
      const act = ev.target?.getAttribute?.('data-act');
      if (act === 'resign') onSendInput?.({ type: 'resign' });
      if (act === 'draw') {
        if (simState?.drawOffer != null && simState.drawOffer !== mySlot) {
          onSendInput?.({ type: 'draw_accept' });
        } else {
          onSendInput?.({ type: 'draw_offer' });
        }
      }
      if (act === 'leave') onLeave?.();
    });
  }

  function btnStyle() {
    return 'background:rgba(40,52,56,0.9);color:#efe6d4;border:1px solid rgba(196,184,150,0.3);border-radius:6px;padding:4px 8px;font:11px/1 "Space Mono", ui-monospace, monospace;cursor:pointer';
  }

  function myColor() {
    return slotToColor(mySlot);
  }

  function currentTargets() {
    if (!simState || !selected) return [];
    if (simState.turn !== myColor()) return [];
    return legalMoves(simState, selected).map((m) => m.to);
  }

  function paint() {
    lastTargets = currentTargets();
    tableScene?.setSelection({
      selected,
      cursor: enabled ? cursor : null,
      targets: enabled ? lastTargets : [],
      lastMove: simState?.lastMove || null,
    });
    refreshHud();
  }

  function refreshHud() {
    if (!hud) return;
    const turnName = simState?.turn === 'b' ? 'Black' : 'White';
    const mine = simState?.turn === myColor();
    if (simState?.status === 'complete') {
      const reason = simState.reason || 'complete';
      const winner = simState.winner;
      const winText = winner == null ? 'Draw' : winner === mySlot ? 'You won' : winner === 0 ? 'White won' : 'Black won';
      if (turnEl) turnEl.textContent = `${winText} · ${reason.replace('_', ' ')}`;
      if (statusEl) statusEl.textContent = 'The table is still; leave when you are ready.';
    } else {
      if (turnEl) turnEl.textContent = `${turnName} to move${simState?.inCheck ? ' · check' : ''}`;
      if (statusEl) {
        if (!mine) statusEl.textContent = 'Waiting for the other side.';
        else if (selected) statusEl.textContent = `Moving from ${selected}. Choose a highlighted square.`;
        else statusEl.textContent = 'Select one of your pieces, then a legal square.';
      }
    }
    if (helpEl && simState?.drawOffer != null) {
      helpEl.textContent = simState.drawOffer === mySlot
        ? 'Draw offered. Waiting for the other side.'
        : 'Draw offered. Press Offer draw to accept, or keep playing.';
    }
  }

  function sendMove(from, to) {
    const options = legalMoves(simState, from).filter((m) => m.to === to);
    if (!options.length) return false;
    const promo = options[0].promo || undefined;
    onSendInput?.({ type: 'move', from, to, ...(promo ? { promo } : {}) });
    selected = null;
    return true;
  }

  function chooseSquare(sq) {
    if (!sq || !simState || simState.status !== 'playing') return;
    if (simState.turn !== myColor()) return;
    if (!selected) {
      const own = legalMoves(simState, sq);
      if (!own.length) return;
      selected = sq;
      paint();
      return;
    }
    if (selected === sq) {
      selected = null;
      paint();
      return;
    }
    if (sendMove(selected, sq)) {
      paint();
      return;
    }
    const own = legalMoves(simState, sq);
    selected = own.length ? sq : null;
    paint();
  }

  function pickFromEvent(ev) {
    const camera = getActiveCamera?.();
    if (!camera || !tableScene?.pickPlane) return null;
    const src = ev.changedTouches?.[0] || ev.touches?.[0] || ev;
    pointer.x = (src.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(src.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(tableScene.pickPlane, false);
    if (!hits.length) return null;
    const world = hits[0].point;
    inv.copy(tableScene.group.matrixWorld).invert();
    localHit.copy(world).applyMatrix4(inv);
    return squareFromLocal(localHit.x, localHit.z, tableScene.squareSize || 0.075);
  }

  function shiftCursor(df, dr) {
    const file = 'abcdefgh'.indexOf(cursor[0]);
    const rank = Number(cursor[1]) - 1;
    const nf = Math.max(0, Math.min(7, file + df));
    const nr = Math.max(0, Math.min(7, rank + dr));
    cursor = indexToAlgebraic(nr * 8 + nf);
    paint();
  }

  function onPointerDown(ev) {
    if (!enabled) return;
    if (isTypingTarget(ev.target)) return;
    const sq = pickFromEvent(ev);
    if (!sq) return;
    ev.preventDefault?.();
    cursor = sq;
    chooseSquare(sq);
  }

  function onKeyDown(ev) {
    if (!enabled) return;
    if (isTypingTarget(ev.target)) return;
    const code = ev.code;
    if (code === 'Escape') {
      if (selected) {
        selected = null;
        paint();
        ev.preventDefault();
        ev.stopPropagation();
        return;
      }
      onLeave?.();
      ev.preventDefault();
      return;
    }
    if (code === 'ArrowLeft') {
      shiftCursor(-1, 0);
      ev.preventDefault();
    } else if (code === 'ArrowRight') {
      shiftCursor(1, 0);
      ev.preventDefault();
    } else if (code === 'ArrowUp') {
      shiftCursor(0, 1);
      ev.preventDefault();
    } else if (code === 'ArrowDown') {
      shiftCursor(0, -1);
      ev.preventDefault();
    } else if (code === 'Enter' || code === 'Space') {
      chooseSquare(cursor);
      ev.preventDefault();
    } else if (code === 'KeyR') {
      onSendInput?.({ type: 'resign' });
      ev.preventDefault();
    } else if (code === 'KeyD') {
      if (simState?.drawOffer != null && simState.drawOffer !== mySlot) {
        onSendInput?.({ type: 'draw_accept' });
      } else {
        onSendInput?.({ type: 'draw_offer' });
      }
      ev.preventDefault();
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown, true);
  }
  createHud();

  return {
    enable(slot = 0) {
      enabled = true;
      mySlot = slot;
      selected = null;
      cursor = slot === 1 ? 'e7' : 'e2';
      if (hud) hud.style.display = 'block';
      paint();
    },

    disable() {
      enabled = false;
      selected = null;
      if (hud) hud.style.display = 'none';
      tableScene?.setSelection({ lastMove: simState?.lastMove || null });
    },

    setSimState(next) {
      simState = next;
      if (selected && simState?.lastMove?.from === selected) selected = null;
      paint();
    },

    getSelection() {
      return { selected, cursor, targets: lastTargets, lastMove: simState?.lastMove || null };
    },

    update(nextSim) {
      if (nextSim) this.setSimState(nextSim);
    },

    neutralize() {
      selected = null;
      paint();
    },

    dispose() {
      if (typeof window !== 'undefined') {
        window.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('keydown', onKeyDown, true);
      }
      if (hud?.parentElement) hud.parentElement.removeChild(hud);
      hud = null;
    },
  };
}
