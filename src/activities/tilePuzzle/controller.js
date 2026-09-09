/**
 * Shared tile-puzzle HUD and input (Task 8.4).
 *
 * Click a tile beside the empty well to slide it. Click two tiles to swap.
 * Arrow keys slide the neighboring tile into the well. R resets, including
 * after the manuscript is solved.
 */

import * as THREE from 'three';
import { TILE_GRID, TILE_CELL_COUNT, EMPTY_TILE, emptyIndex, isAdjacent } from '../../../shared/tilePuzzleModel.js';

export function createTilePuzzleController({
  getActiveCamera = null,
  pickables = [],
  onSendMove = null,
  onLeave = null,
} = {}) {
  let enabled = false;
  let mySlot = 0;
  let selectedIndex = null;
  let lastBoard = null;
  let hud = null;
  let gridEl = null;
  let statusEl = null;
  let progressEl = null;
  let hintEl = null;

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function createHud() {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;

    hud = document.createElement('div');
    hud.className = 'tile-puzzle-hud';
    hud.style.cssText = [
      'display:none',
      'position:fixed',
      'right:18px',
      'bottom:92px',
      'z-index:40',
      'width:min(280px, calc(100vw - 36px))',
      'padding:12px 14px',
      'background:rgba(12, 28, 32, 0.82)',
      'border:1px solid rgba(210, 188, 140, 0.28)',
      'border-radius:14px 4px 12px 6px',
      'color:#f3ead8',
      'font-family:"DM Sans", sans-serif',
      'pointer-events:auto',
    ].join(';');

    hud.innerHTML = `
      <div style="font-family:'Space Mono',monospace;letter-spacing:0.12em;font-size:10px;opacity:0.8;">PAPER CATACOMBS · TILE PUZZLE · SEAT <span id="tile-puzzle-seat">1</span></div>
      <div id="tile-puzzle-status" style="margin:8px 0 6px;font-size:14px;">Arrange the manuscript</div>
      <div style="height:6px;background:rgba(255,255,255,0.08);border-radius:99px;overflow:hidden;">
        <div id="tile-puzzle-progress" style="height:100%;width:0%;background:#edb66c;"></div>
      </div>
      <div id="tile-puzzle-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin:10px 0;"></div>
      <div id="tile-puzzle-hint" style="font-size:12px;opacity:0.8;">Click a tile beside the well to slide. Click two tiles to swap.</div>
      <div style="display:flex;gap:8px;margin-top:10px;">
        <button type="button" id="tile-puzzle-reset" style="flex:1;background:transparent;color:#f3ead8;border:1px solid rgba(210,188,140,0.4);border-radius:8px;padding:6px 8px;font:inherit;cursor:pointer;">Reset [R]</button>
        <button type="button" id="tile-puzzle-leave" style="flex:1;background:transparent;color:#f3ead8;border:1px solid rgba(210,188,140,0.4);border-radius:8px;padding:6px 8px;font:inherit;cursor:pointer;">Leave</button>
      </div>
    `;

    document.body.appendChild(hud);
    statusEl = hud.querySelector('#tile-puzzle-status');
    progressEl = hud.querySelector('#tile-puzzle-progress');
    gridEl = hud.querySelector('#tile-puzzle-grid');
    hintEl = hud.querySelector('#tile-puzzle-hint');

    hud.querySelector('#tile-puzzle-reset')?.addEventListener('click', (e) => {
      e.stopPropagation();
      onSendMove?.({ type: 'reset' });
    });
    hud.querySelector('#tile-puzzle-leave')?.addEventListener('click', (e) => {
      e.stopPropagation();
      onLeave?.();
    });

    renderGrid(null);
  }

  function renderGrid(board) {
    if (!gridEl) return;
    const cells = Array.isArray(board) && board.length === TILE_CELL_COUNT ? board : Array(TILE_CELL_COUNT).fill(0);
    gridEl.innerHTML = '';
    for (let i = 0; i < TILE_CELL_COUNT; i += 1) {
      const id = cells[i];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.index = String(i);
      btn.textContent = id === EMPTY_TILE ? '' : String(id);
      const selected = selectedIndex === i;
      btn.style.cssText = [
        'height:36px',
        'border-radius:6px',
        'border:1px solid rgba(210,188,140,0.35)',
        'background:' + (id === EMPTY_TILE ? 'rgba(0,0,0,0.35)' : selected ? 'rgba(237,182,108,0.35)' : 'rgba(232,214,176,0.16)'),
        'color:#f3ead8',
        'font:600 13px "Space Mono",monospace',
        'cursor:pointer',
      ].join(';');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleCell(i);
      });
      gridEl.appendChild(btn);
    }
  }

  function handleCell(index) {
    if (!enabled || !lastBoard) return;
    const empty = emptyIndex(lastBoard);
    if (selectedIndex == null) {
      if (index !== empty && isAdjacent(index, empty)) {
        onSendMove?.({
          type: 'slide',
          tileId: lastBoard[index],
          from: index,
          to: empty,
        });
        return;
      }
      selectedIndex = index;
      renderGrid(lastBoard);
      return;
    }
    if (selectedIndex === index) {
      selectedIndex = null;
      renderGrid(lastBoard);
      return;
    }
    onSendMove?.({
      type: 'swap',
      tileId: lastBoard[selectedIndex],
      from: selectedIndex,
      to: index,
    });
    selectedIndex = null;
  }

  function slideFromKey(code) {
    if (!lastBoard) return;
    const empty = emptyIndex(lastBoard);
    const row = Math.floor(empty / TILE_GRID);
    const col = empty % TILE_GRID;
    let from = null;
    if (code === 'ArrowLeft' || code === 'KeyA') from = col < TILE_GRID - 1 ? empty + 1 : null;
    if (code === 'ArrowRight' || code === 'KeyD') from = col > 0 ? empty - 1 : null;
    if (code === 'ArrowUp' || code === 'KeyW') from = row < TILE_GRID - 1 ? empty + TILE_GRID : null;
    if (code === 'ArrowDown' || code === 'KeyS') from = row > 0 ? empty - TILE_GRID : null;
    if (from == null) return;
    onSendMove?.({
      type: 'slide',
      tileId: lastBoard[from],
      from,
      to: empty,
    });
  }

  function handleKeyDown(e) {
    if (!enabled) return;
    if (e.code === 'KeyR') {
      e.preventDefault();
      onSendMove?.({ type: 'reset' });
    } else if (e.code === 'Escape') {
      e.preventDefault();
      onLeave?.();
    } else if (/^Arrow|Key[WASD]$/.test(e.code)) {
      e.preventDefault();
      slideFromKey(e.code);
    }
  }

  function handlePointerDown(e) {
    if (!enabled || !pickables?.length) return;
    if (hud && e.target && hud.contains(e.target)) return;
    const camera = getActiveCamera?.();
    const canvas = document.getElementById('world');
    if (!camera || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickables, false);
    const tileId = hits[0]?.object?.userData?.tileId;
    if (!tileId || !lastBoard) return;
    const index = lastBoard.indexOf(tileId);
    if (index >= 0) handleCell(index);
  }

  createHud();

  return {
    enable(slot) {
      enabled = true;
      mySlot = slot;
      selectedIndex = null;
      if (typeof window !== 'undefined') {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('pointerdown', handlePointerDown);
      }
      if (hud) {
        hud.style.display = 'block';
        const seatEl = hud.querySelector('#tile-puzzle-seat');
        if (seatEl) seatEl.textContent = String((mySlot ?? 0) + 1);
      }
    },

    disable() {
      enabled = false;
      selectedIndex = null;
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('pointerdown', handlePointerDown);
      }
      if (hud) hud.style.display = 'none';
    },

    update(simState) {
      if (!enabled || !simState) return;
      lastBoard = Array.isArray(simState.board) ? simState.board : lastBoard;
      renderGrid(lastBoard);
      const correct = simState.correctCount ?? 0;
      const total = simState.totalCells ?? TILE_CELL_COUNT;
      if (progressEl) progressEl.style.width = `${Math.round((simState.progress || 0) * 100)}%`;
      if (statusEl) {
        statusEl.textContent = simState.solved
          ? 'Manuscript restored'
          : `${correct} / ${total} in place`;
      }
      if (hintEl) {
        hintEl.textContent = simState.solved
          ? 'Shared solved state. Reset [R] starts the same manuscript again.'
          : 'Click a tile beside the well to slide. Click two tiles to swap.';
      }
    },

    dispose() {
      this.disable();
      if (hud?.parentNode) hud.parentNode.removeChild(hud);
      hud = null;
    },
  };
}
