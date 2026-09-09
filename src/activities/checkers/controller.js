/**
 * Draughts selection, turn HUD, resign / agreed-draw, and pointer picking.
 */

import * as THREE from 'three';
import { listLegalMoves, validateCheckersControls } from '../../../shared/checkersModel.js';

function sideName(slot) {
  return Number(slot) === 0 ? 'DARK' : 'LIGHT';
}

function turnCopy(state, mySlot) {
  if (!state) return 'WAITING';
  if (state.status === 'complete') {
    if (state.result === 'draw') return 'AGREED DRAW';
    if (state.winner === mySlot) return 'YOU WIN';
    if (state.winner === 0 || state.winner === 1) return `${sideName(state.winner)} WINS`;
    return 'FINISHED';
  }
  if (state.drawOfferedBy === mySlot) return 'DRAW OFFERED · WAITING';
  if (state.drawOfferedBy === 0 || state.drawOfferedBy === 1) return 'DRAW OFFERED · D TO AGREE';
  return Number(state.turn) === Number(mySlot) ? 'YOUR MOVE' : `${sideName(state.turn)} TO MOVE`;
}

export function createCheckersController({
  getActiveCamera = null,
  getCanvas = null,
  onSendInput = null,
  onLeave = null,
  tableScene = null,
} = {}) {
  let enabled = false;
  let mySlot = 0;
  let simState = null;
  let selected = null;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  let hud = null;
  let statusEl = null;
  let sideEl = null;
  let hintEl = null;

  function createHud() {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
    hud = document.createElement('div');
    hud.setAttribute('role', 'region');
    hud.setAttribute('aria-label', 'Draughts table');
    hud.style.cssText = [
      'display:none',
      'position:fixed',
      'right:28px',
      'bottom:92px',
      'z-index:8',
      'min-width:220px',
      'max-width:280px',
      'padding:12px 14px',
      'background:rgba(18,28,28,0.78)',
      'border:1px solid rgba(185,191,156,0.22)',
      'border-radius:2px 14px 2px 10px',
      'color:#e8e7d9',
      'font-family:DM Sans,sans-serif',
      'pointer-events:auto',
    ].join(';');
    hud.innerHTML = `
      <div style="font-family:Space Mono,monospace;font-size:10px;letter-spacing:0.14em;color:#c8a860;">RAIN COURT · DRAUGHTS</div>
      <div id="checkers-side" style="margin-top:6px;font-size:12px;letter-spacing:0.08em;">DARK</div>
      <div id="checkers-status" style="margin-top:4px;font-size:15px;">YOUR MOVE</div>
      <div id="checkers-hint" style="margin-top:8px;font-size:12px;color:#c6c3b2;">Click a dark man, then a square. Chains send the full path.</div>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
        <button type="button" id="checkers-draw" style="background:#243230;color:#e8e7d9;border:1px solid #b9bf9c44;padding:6px 10px;border-radius:4px;">Draw [D]</button>
        <button type="button" id="checkers-resign" style="background:#243230;color:#e8e7d9;border:1px solid #b9bf9c44;padding:6px 10px;border-radius:4px;">Resign [R]</button>
        <button type="button" id="checkers-leave" style="background:transparent;color:#c6c3b2;border:1px solid #b9bf9c33;padding:6px 10px;border-radius:4px;">Leave</button>
      </div>
    `;
    document.body.appendChild(hud);
    statusEl = hud.querySelector('#checkers-status');
    sideEl = hud.querySelector('#checkers-side');
    hintEl = hud.querySelector('#checkers-hint');
    hud.querySelector('#checkers-draw')?.addEventListener('click', (e) => {
      e.stopPropagation();
      send({ type: 'draw' });
    });
    hud.querySelector('#checkers-resign')?.addEventListener('click', (e) => {
      e.stopPropagation();
      send({ type: 'resign' });
    });
    hud.querySelector('#checkers-leave')?.addEventListener('click', (e) => {
      e.stopPropagation();
      onLeave?.();
    });
  }

  createHud();

  function send(controls) {
    const valid = validateCheckersControls(controls);
    if (!valid.valid) return;
    onSendInput?.(valid.sanitized);
  }

  function legalFrom(square) {
    if (!simState || Number(simState.turn) !== Number(mySlot)) return [];
    return listLegalMoves(simState, mySlot).filter((move) => move.from === square);
  }

  function syncHighlights() {
    const legal = selected ? legalFrom(selected).map((move) => move.to) : [];
    tableScene?.setHighlights({
      selected,
      legal,
      lastMove: simState?.lastMove,
    });
  }

  function chooseSquare(square) {
    if (!square || !simState || simState.status === 'complete') return;
    if (Number(simState.turn) !== Number(mySlot)) return;

    if (!selected) {
      if (legalFrom(square).length === 0) return;
      selected = square;
      if (hintEl) hintEl.textContent = `From ${square.toUpperCase()} · click a landing square`;
      syncHighlights();
      return;
    }

    if (square === selected) {
      selected = null;
      if (hintEl) hintEl.textContent = 'Click a dark man, then a square. Chains send the full path.';
      syncHighlights();
      return;
    }

    const matches = legalFrom(selected).filter((move) => move.to === square || move.path.includes(square));
    const exact = matches.find((move) => move.to === square) || matches[0];
    if (!exact) {
      if (legalFrom(square).length > 0) {
        selected = square;
        syncHighlights();
      }
      return;
    }

    send({
      type: 'move',
      from: exact.from,
      to: exact.to,
      path: exact.path,
    });
    selected = null;
    syncHighlights();
  }

  function typingTarget(target) {
    const tag = target?.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable;
  }

  function handleKeyDown(e) {
    if (!enabled || typingTarget(e.target)) return;
    if (e.code === 'KeyR') {
      e.preventDefault();
      send({ type: 'resign' });
    } else if (e.code === 'KeyD') {
      e.preventDefault();
      send({ type: 'draw' });
    } else if (e.code === 'Escape') {
      e.preventDefault();
      if (selected) {
        selected = null;
        syncHighlights();
        return;
      }
      onLeave?.();
    }
  }

  function eventPoint(e) {
    const canvas = getCanvas?.() || document.getElementById('world');
    if (!canvas || typeof canvas.getBoundingClientRect !== 'function') return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    return pointer;
  }

  function handlePointerDown(e) {
    if (!enabled || e.button !== 0) return;
    if (typingTarget(e.target)) return;
    const camera = getActiveCamera?.();
    if (!camera || !tableScene) return;
    if (!eventPoint(e)) return;
    raycaster.setFromCamera(pointer, camera);
    const square = tableScene.pickSquare(raycaster);
    if (square) {
      e.preventDefault();
      e.stopPropagation();
      chooseSquare(square);
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('pointerdown', handlePointerDown, true);
  }

  return {
    enable(slot) {
      enabled = true;
      mySlot = slot;
      selected = null;
      if (hud) hud.style.display = 'block';
      if (sideEl) sideEl.textContent = `YOU PLAY ${sideName(slot)}`;
    },
    disable() {
      enabled = false;
      selected = null;
      if (hud) hud.style.display = 'none';
    },
    setSimState(next) {
      simState = next;
      if (selected && legalFrom(selected).length === 0) selected = null;
      if (statusEl) statusEl.textContent = turnCopy(next, mySlot);
      if (hintEl && next?.status === 'complete') {
        hintEl.textContent = next.result === 'draw'
          ? 'The table is quiet. Leave when you like.'
          : 'Game over. R starts nothing; leave to stand.';
      }
      syncHighlights();
    },
    update() {},
    dispose() {
      enabled = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeyDown, true);
        window.removeEventListener('pointerdown', handlePointerDown, true);
      }
      hud?.remove();
      hud = null;
    },
  };
}
