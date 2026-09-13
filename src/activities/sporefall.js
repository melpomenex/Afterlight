/**
 * Sporefall cabinet activity module for Afterlight.
 *
 * Implements the arcade falling-block puzzle:
 *   - Physical 3D cabinet with joystick & buttons in overgrown emerald bio-mechanical theme.
 *   - Material-backed CRT screen with phosphor 10x20 grid, ghost piece, and next-piece preview.
 *   - Authoritative drops, rotations, line clears, combo chains, and top-out detection.
 *   - Attract mode with autonomous demo play and honest DEMO banners.
 *   - Positional drop, rotate, line clear, and game-over audio cues.
 *   - Full start, play, end, restart, and exit lifecycle.
 *
 * Conforms to:
 *   - openspec/changes/add-place-activities-program/specs/orpheum-arcade/spec.md
 *   - openspec/changes/add-place-activities-program/specs/place-activities/spec.md
 */

import { registerActivityModule } from './registry.js';
import { createActivityInputManager, isTypingTarget } from './inputSeam.js';
import {
  createScreenPipeline,
  createVisibilityThrottler,
  createCabinetAudio,
  drawAttractBanner,
} from './cabinetRenderer.js';
import { createArcadeCabinet } from '../arcade/cabinet.js';

const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 384;
const GRID_COLS = 10;
const GRID_ROWS = 20;
const CELL_SIZE = 16;
const BOARD_X = 176;
const BOARD_Y = 32;

const PIECE_COLORS = {
  0: null,
  1: { fill: '#06b6d4', glow: 'rgba(6, 182, 212, 0.4)', stroke: '#22d3ee' }, // I: cyan
  2: { fill: '#fbbf24', glow: 'rgba(251, 191, 36, 0.4)', stroke: '#fde68a' }, // O: amber
  3: { fill: '#a855f7', glow: 'rgba(168, 85, 247, 0.4)', stroke: '#c084fc' }, // T: purple
  4: { fill: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', stroke: '#34d399' }, // S: emerald
  5: { fill: '#f43f5e', glow: 'rgba(244, 63, 94, 0.4)', stroke: '#fb7185' },  // Z: rose
  6: { fill: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)', stroke: '#60a5fa' }, // J: blue
  7: { fill: '#f97316', glow: 'rgba(249, 115, 22, 0.4)', stroke: '#fb923c' }, // L: orange
};

const PIECE_TYPE_TO_ID = {
  I: 1,
  O: 2,
  T: 3,
  S: 4,
  Z: 5,
  J: 6,
  L: 7,
};

const PIECE_SHAPES = {
  I: [[-1, 0], [0, 0], [1, 0], [2, 0]],
  O: [[0, 0], [1, 0], [0, 1], [1, 1]],
  T: [[-1, 0], [0, 0], [1, 0], [0, -1]],
  S: [[0, 0], [1, 0], [-1, 1], [0, 1]],
  Z: [[-1, 0], [0, 0], [0, 1], [1, 1]],
  J: [[-1, -1], [-1, 0], [0, 0], [1, 0]],
  L: [[1, -1], [-1, 0], [0, 0], [1, 0]],
};

export function createSporefallInstance({
  activityDef,
  world,
  net,
  generation,
  roomId = 'theater',
  getActiveCamera = null,
  getPlayer = null,
  setActivityCamera = null,
  clearActivityCamera = null,
  getParticipation = null,
  audioMixer = null,
} = {}) {
  const transform = activityDef.transform || { position: [9.8, 0, -3.5], rotationY: 0 };
  const pos = transform.position || [9.8, 0, -3.5];
  const posX = pos[0];
  const posY = pos.length === 3 ? pos[1] : 0;
  const posZ = pos.length === 3 ? pos[2] : pos[1];
  const rotY = transform.rotationY || 0;

  // 1. Screen texture pipeline
  const screenPipeline = createScreenPipeline({
    defaultWidth: CANVAS_WIDTH,
    defaultHeight: CANVAS_HEIGHT,
    focusedWidth: 1024,
    focusedHeight: 768,
  });
  const { canvas, ctx } = screenPipeline;

  // 2. Canonical arcade cabinet (shared GLB, this game's skin; falls back to
  // the primitive cabinet until the model arrives, then hot-swaps).
  const cabinet = createArcadeCabinet({
    activityDef,
    world,
    screenSource: canvas,
  });

  const group = cabinet.group;
  group.name = `activity-${activityDef.id}`;
  group.position.set(posX, posY, posZ);
  group.rotation.y = rotY;

  if (world?.group && group.parent !== world.group) {
    world.group.add(group);
  }

  // 3. Visibility and frame-rate throttler
  const throttler = createVisibilityThrottler({
    getPosition: () => [posX, posY, posZ],
    getPlayer,
  });

  // 4. Spatial audio
  const audio = createCabinetAudio({
    getPosition: () => [posX, posY, posZ],
    getPlayer,
    audioMixer,
  });

  // 5. Input manager with 250ms watchdog
  let isFocusedInActivity = false;
  let isParticipating = false;

  const inputManager = createActivityInputManager({
    watchdogMs: 250,
    onInput: (controls, seq) => {
      const p = getParticipation?.();
      const leaseId = typeof p?.lease === 'string' ? p.lease : p?.lease?.id;
      if (!leaseId || !p?.sessionId) return;
      try {
        net?.sendActivityInput?.({
          roomId,
          activityId: activityDef.id,
          sessionId: p.sessionId,
          lease: leaseId,
          seq,
          controls,
        });
      } catch {}
    },
  });

  // 6. Simulation & run state
  let latestSnapshot = null;
  let matchState = 'idle'; // 'idle', 'running', 'completed'
  let outcome = null;
  let runScore = 0;
  let runLines = 0;
  let runLevel = 1;
  let lastLinesCount = 0;
  let lastResult = null;
  let lastError = null;
  let focusedSlot = null;

  // Attract demo state
  let attractTime = 0.0;
  let attractGrid = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(0));
  let attractActive = { type: 'T', x: 4, y: 3, rotation: 0 };
  let attractTimer = 0.0;

  // Key listeners for gameplay
  const activeKeys = new Set();
  let listenersAttached = false;
  let lastControlsJson = null;
  let lastKeepAlive = 0;

  function onKeyDown(e) {
    if (!isFocusedInActivity) return;
    if (isTypingTarget(e.target)) return;
    const key = e.key.toLowerCase();
    activeKeys.add(key);

    if (key === 'w' || key === 'arrowup' || key === 'e' || key === 'k') {
      audio.playTone(520, 'sine', 0.04, 0.15);
    } else if (key === ' ' || key === 'j') {
      audio.playTone(95, 'sawtooth', 0.08, 0.25);
    }

    if (key === 'r' && matchState === 'completed') {
      // Request a fresh match through the ready op; the server owns starts.
      const p = getParticipation?.();
      const leaseId = typeof p?.lease === 'string' ? p.lease : p?.lease?.id;
      if (p && leaseId) {
        try {
          net?.sendActivityReady?.({
            activityId: activityDef.id,
            ready: true,
          });
        } catch {}
      }
    }
  }

  function onKeyUp(e) {
    activeKeys.delete(e.key.toLowerCase());
  }

  function attachControls() {
    if (typeof window === 'undefined' || listenersAttached) return;
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    listenersAttached = true;
  }

  function detachControls() {
    activeKeys.clear();
    if (typeof window === 'undefined' || !listenersAttached) return;
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    listenersAttached = false;
  }

  function pollControls() {
    if (!isFocusedInActivity || !isParticipating) return;

    const left = activeKeys.has('a') || activeKeys.has('arrowleft');
    const right = activeKeys.has('d') || activeKeys.has('arrowright');
    const rotate = activeKeys.has('w') || activeKeys.has('arrowup') || activeKeys.has('e') || activeKeys.has('k');
    const down = activeKeys.has('s') || activeKeys.has('arrowdown');
    const drop = activeKeys.has(' ') || activeKeys.has('j');

    // Send on control-state change, plus a bounded keep-alive while any key is
    // held so the 250 ms server watchdog does not neutralize a held key.
    const controls = { left, right, rotate, down, drop };
    const json = JSON.stringify(controls);
    const now = Date.now();
    const anyHeld = left || right || rotate || down || drop;
    if (json === lastControlsJson && !(anyHeld && now - lastKeepAlive >= 150)) return;

    lastControlsJson = json;
    lastKeepAlive = now;
    inputManager.sampleInput(controls);
  }

  // --- 7. Screen Drawing Routines ---
  function renderAttractDemo(dt) {
    if (!ctx) return;
    attractTime += dt;
    attractTimer += dt;

    if (attractTimer > 0.4) {
      attractTimer = 0;
      attractActive.y += 1;
      if (attractActive.y >= 18) {
        attractActive.y = 1;
        attractActive.type = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'][Math.floor(Math.random() * 7)];
      }
    }

    drawBoardFrame();
    drawGrid(attractGrid);
    drawPiece(attractActive, true);
    drawSidebarHUD(1250, 4, 1, 'I');

    drawAttractBanner(ctx, canvas.width, canvas.height, {
      title: 'SPOREFALL',
      subtitle: 'BIO-ORGANIC MATRIX · LINE CLEARS',
      tagline: 'PRESS E TO DROP',
      bannerText: 'DEMO',
      time: attractTime,
    });
  }

  function renderLiveGame(dt) {
    if (!ctx) return;

    const sim = latestSnapshot?.simState || {};
    const grid = sim.grid || Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(0));
    const active = sim.active;
    const nextType = sim.next || 'I';

    runScore = sim.score !== undefined ? sim.score : runScore;
    const lines = sim.lines !== undefined ? sim.lines : runLines;
    if (lines > runLines) {
      audio.playTone(700, 'sine', 0.1, 0.2);
    }
    runLines = lines;
    runLevel = sim.level !== undefined ? sim.level : runLevel;

    drawBoardFrame();
    drawGrid(grid);

    if (active) {
      drawGhostPiece(grid, active);
      drawPiece(active, false);
    }

    drawSidebarHUD(runScore, runLines, runLevel, nextType);

    if (matchState === 'completed') {
      drawGameOverOverlay();
    }
  }

  function drawBoardFrame() {
    ctx.fillStyle = '#0a130f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Board background
    ctx.fillStyle = '#060d09';
    ctx.fillRect(BOARD_X, BOARD_Y, GRID_COLS * CELL_SIZE, GRID_ROWS * CELL_SIZE);

    // Board grid lines
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.08)';
    ctx.lineWidth = 1;

    for (let c = 0; c <= GRID_COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(BOARD_X + c * CELL_SIZE, BOARD_Y);
      ctx.lineTo(BOARD_X + c * CELL_SIZE, BOARD_Y + GRID_ROWS * CELL_SIZE);
      ctx.stroke();
    }

    for (let r = 0; r <= GRID_ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(BOARD_X, BOARD_Y + r * CELL_SIZE);
      ctx.lineTo(BOARD_X + GRID_COLS * CELL_SIZE, BOARD_Y + r * CELL_SIZE);
      ctx.stroke();
    }

    // Border glowing frame
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 2;
    ctx.strokeRect(BOARD_X - 1, BOARD_Y - 1, GRID_COLS * CELL_SIZE + 2, GRID_ROWS * CELL_SIZE + 2);
  }

  function drawGrid(grid) {
    for (let r = 0; r < GRID_ROWS; r++) {
      const row = grid[r];
      if (!row) continue;
      for (let c = 0; c < GRID_COLS; c++) {
        const val = row[c];
        if (val > 0) {
          drawCell(c, r, val);
        }
      }
    }
  }

  function drawCell(cx, cy, colorId, alpha = 1.0) {
    const palette = PIECE_COLORS[colorId] || PIECE_COLORS[1];
    const px = BOARD_X + cx * CELL_SIZE;
    const py = BOARD_Y + cy * CELL_SIZE;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = palette.fill;
    ctx.fillRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);

    ctx.strokeStyle = palette.stroke;
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 1.5, py + 1.5, CELL_SIZE - 3, CELL_SIZE - 3);

    // Bio-spore inner dot
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillRect(px + 6, py + 6, 4, 4);
    ctx.restore();
  }

  function drawPiece(piece, isAttract = false) {
    if (!piece) return;
    const coords = getPieceCoords(piece.type, piece.rotation);
    const colorId = PIECE_TYPE_TO_ID[piece.type] || 1;

    coords.forEach(([dx, dy]) => {
      const cx = piece.x + dx;
      const cy = piece.y + dy;
      if (cx >= 0 && cx < GRID_COLS && cy >= 0 && cy < GRID_ROWS) {
        drawCell(cx, cy, colorId);
      }
    });
  }

  function drawGhostPiece(grid, piece) {
    if (!piece) return;
    // Calculate lowest valid y
    let dropY = piece.y;
    while (isValidPos(grid, piece.type, piece.rotation, piece.x, dropY + 1)) {
      dropY++;
    }

    if (dropY <= piece.y) return;

    const coords = getPieceCoords(piece.type, piece.rotation);
    const palette = PIECE_COLORS[PIECE_TYPE_TO_ID[piece.type] || 1];

    ctx.save();
    ctx.strokeStyle = palette.stroke;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    coords.forEach(([dx, dy]) => {
      const cx = piece.x + dx;
      const cy = dropY + dy;
      if (cx >= 0 && cx < GRID_COLS && cy >= 0 && cy < GRID_ROWS) {
        const px = BOARD_X + cx * CELL_SIZE;
        const py = BOARD_Y + cy * CELL_SIZE;
        ctx.strokeRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      }
    });

    ctx.restore();
  }

  function isValidPos(grid, type, rot, px, py) {
    const coords = getPieceCoords(type, rot);
    return coords.every(([dx, dy]) => {
      const cx = px + dx;
      const cy = py + dy;
      if (cx < 0 || cx >= GRID_COLS) return false;
      if (cy >= GRID_ROWS) return false;
      if (cy < 0) return true;
      const row = grid[cy];
      return !row || row[cx] === 0;
    });
  }

  function getPieceCoords(type, rot = 0) {
    const rotIdx = ((rot % 4) + 4) % 4;
    switch (type) {
      case 'I':
        return [
          [[-1, 0], [0, 0], [1, 0], [2, 0]],
          [[1, -1], [1, 0], [1, 1], [1, 2]],
          [[-1, 1], [0, 1], [1, 1], [2, 1]],
          [[0, -1], [0, 0], [0, 1], [0, 2]],
        ][rotIdx];
      case 'O':
        return [[0, 0], [1, 0], [0, 1], [1, 1]];
      case 'T':
        return [
          [[-1, 0], [0, 0], [1, 0], [0, -1]],
          [[0, -1], [0, 0], [1, 0], [0, 1]],
          [[-1, 0], [0, 0], [1, 0], [0, 1]],
          [[0, -1], [0, 0], [-1, 0], [0, 1]],
        ][rotIdx];
      case 'S':
        return [
          [[0, 0], [1, 0], [-1, 1], [0, 1]],
          [[0, -1], [0, 0], [1, 0], [1, 1]],
          [[0, 0], [1, 0], [-1, 1], [0, 1]],
          [[0, -1], [0, 0], [1, 0], [1, 1]],
        ][rotIdx];
      case 'Z':
        return [
          [[-1, 0], [0, 0], [0, 1], [1, 1]],
          [[1, -1], [1, 0], [0, 0], [0, 1]],
          [[-1, 0], [0, 0], [0, 1], [1, 1]],
          [[1, -1], [1, 0], [0, 0], [0, 1]],
        ][rotIdx];
      case 'J':
        return [
          [[-1, -1], [-1, 0], [0, 0], [1, 0]],
          [[0, -1], [1, -1], [0, 0], [0, 1]],
          [[-1, 0], [0, 0], [1, 0], [1, 1]],
          [[0, -1], [0, 0], [0, 1], [-1, 1]],
        ][rotIdx];
      case 'L':
        return [
          [[1, -1], [-1, 0], [0, 0], [1, 0]],
          [[0, -1], [0, 0], [0, 1], [1, 1]],
          [[-1, 0], [0, 0], [1, 0], [-1, 1]],
          [[-1, -1], [0, -1], [0, 0], [0, 1]],
        ][rotIdx];
      default:
        return [[0, 0]];
    }
  }

  function drawSidebarHUD(score, lines, level, nextType) {
    ctx.save();
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textBaseline = 'top';

    // Left sidebar (Status)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#6ee7b7';
    ctx.fillText('SCORE', 24, 40);
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#f9fafb';
    ctx.fillText(String(score).padStart(6, '0'), 24, 56);

    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillStyle = '#6ee7b7';
    ctx.fillText('LINES', 24, 100);
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#f9fafb';
    ctx.fillText(String(lines).padStart(4, '0'), 24, 116);

    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillStyle = '#6ee7b7';
    ctx.fillText('LEVEL', 24, 160);
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#10b981';
    ctx.fillText(String(level), 24, 176);

    // Right sidebar (Next Spore preview)
    ctx.textAlign = 'left';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillStyle = '#6ee7b7';
    ctx.fillText('NEXT SPORE', 368, 40);

    // Preview box
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 1;
    ctx.strokeRect(368, 60, 80, 80);
    ctx.fillStyle = '#060d09';
    ctx.fillRect(369, 61, 78, 78);

    if (nextType && PIECE_SHAPES[nextType]) {
      const colorId = PIECE_TYPE_TO_ID[nextType] || 1;
      const shape = PIECE_SHAPES[nextType];
      const palette = PIECE_COLORS[colorId] || PIECE_COLORS[1];

      ctx.fillStyle = palette.fill;
      ctx.strokeStyle = palette.stroke;

      shape.forEach(([dx, dy]) => {
        const px = 408 + dx * 14;
        const py = 100 + dy * 14;
        ctx.fillRect(px, py, 12, 12);
        ctx.strokeRect(px, py, 12, 12);
      });
    }

    // Controls reminder
    ctx.font = '9px system-ui, sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('A / D · MOVE', 368, 160);
    ctx.fillText('W / E · ROTATE', 368, 178);
    ctx.fillText('S · SOFT DROP', 368, 196);
    ctx.fillText('SPACE · HARD DROP', 368, 214);

    ctx.restore();
  }

  function drawGameOverOverlay() {
    ctx.save();
    ctx.fillStyle = 'rgba(6, 13, 9, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const reason = outcome?.reason === 'run_cap' ? 'RUN CAP REACHED (10 MIN)' : 'MATRIX TOPPED OUT';

    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillStyle = '#f43f5e';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 36);

    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = '#a7f3d0';
    ctx.fillText(reason, canvas.width / 2, canvas.height / 2 - 10);

    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#ffca7a';
    ctx.fillText(`FINAL SCORE: ${runScore} · LINES: ${runLines}`, canvas.width / 2, canvas.height / 2 + 18);

    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('PRESS R TO RETRY · ESC TO STEP AWAY', canvas.width / 2, canvas.height / 2 + 48);

    ctx.restore();
  }

  // --- 8. Lifecycle & Network Hookups ---
  function normalizeSnapshotEnvelope(envelope) {
    const payload = envelope?.payload || envelope || {};
    const stateBlock = payload.state || {};
    const sim = payload.sim || payload.simState || stateBlock.sim || null;
    const status = payload.status || stateBlock.status || null;
    return {
      status,
      simState: sim,
      matchId: payload.matchId || null,
      players: Array.isArray(payload.players) ? payload.players : null,
    };
  }

  function setMatchState(next) {
    if (matchState === next) return;
    const wasCompleted = matchState === 'completed';
    matchState = next;
    if (next === 'completed' && !wasCompleted) {
      audio.playTone(220, 'sawtooth', 0.3, 0.3);
    }
  }

  // Focused participation derives from the authoritative session, like Pong:
  // only a seated player captures controls and the cabinet camera; spectators
  // and passersby keep world input and watch the shared screen.
  function syncFocusFromParticipation() {
    const p = getParticipation?.();
    const mine = p?.isParticipating && p.currentActivity?.id === activityDef.id;
    if (mine && !isFocusedInActivity) {
      focusActivity(p.currentSlot ?? 0);
    } else if (!mine && isFocusedInActivity) {
      unfocusActivity();
    }
  }

  function onSnapshot(snapshot) {
    latestSnapshot = snapshot;

    const sim = snapshot.simState || {};
    const status = snapshot.status;
    if (sim.state === 'completed' || status === 'ended') {
      setMatchState('completed');
    } else if (status === 'in_progress' || sim.state === 'running') {
      setMatchState('running');
    } else if (status === 'lobby') {
      setMatchState('idle');
    }

    syncFocusFromParticipation();
  }

  function handleEvent(type, data) {
    if (type === 'match_started' || type === 'match_resumed') {
      matchState = 'running';
      outcome = null;
      runScore = 0;
      runLines = 0;
      runLevel = 1;
      audio.playTone(440, 'sine', 0.2, 0.3);
    } else if (type === 'match_ended' || type === 'match_aborted') {
      matchState = 'completed';
      outcome = data || {};
      audio.playTone(220, 'sawtooth', 0.3, 0.3);
    }
  }

  function onEvent(event, payload) {
    handleEvent(event, payload);
  }

  function acceptSnapshot(envelope) {
    onSnapshot(normalizeSnapshotEnvelope(envelope));
  }

  function acceptEvent(envelope) {
    const type = envelope?.eventType || envelope?.event || envelope?.type;
    const data = envelope?.data || envelope?.payload || {};
    if (type && typeof type === 'string') handleEvent(type, data);
  }

  function acceptResult(envelope) {
    lastResult = envelope?.result || envelope || null;
  }

  function acceptError(envelope) {
    lastError = envelope?.error ? envelope : (envelope ? { error: envelope } : null);
  }

  function focusActivity(slot = 0) {
    isFocusedInActivity = true;
    isParticipating = true;
    focusedSlot = slot;
    screenPipeline.setFocused(true);
    inputManager.resume();
    attachControls();
    setActivityCamera?.(cabinet.activityCamera);
  }

  function unfocusActivity() {
    isFocusedInActivity = false;
    isParticipating = false;
    focusedSlot = null;
    screenPipeline.setFocused(false);
    detachControls();
    inputManager.neutralize();
    lastControlsJson = null;
    clearActivityCamera?.();
  }

  function setParticipation(participating, slot = 0) {
    if (participating) {
      focusActivity(slot);
    } else {
      unfocusActivity();
    }
  }

  function neutralizeInput() {
    activeKeys.clear();
    inputManager.neutralize();
  }

  const acquireFocus = (slot = 0) => focusActivity(slot);
  const releaseFocus = () => unfocusActivity();

  // Frame tick: the runtime calls update(time, delta) for the active place only.
  function update(time = 0, delta = 0.016) {
    pollControls();
    inputManager.checkWatchdog(Date.now());

    // Visibility tiers: focused renders at presentation rate, spectator
    // screens up to 20 Hz, attract up to 10 Hz, distant cabinets cull.
    if (!throttler.shouldRender(isFocusedInActivity, true, performance.now())) return;

    if (matchState === 'running' || matchState === 'completed') {
      renderLiveGame(delta);
    } else {
      renderAttractDemo(delta);
    }

    screenPipeline.update();
    cabinet.update(time);
  }

  function dispose() {
    if (isFocusedInActivity) {
      unfocusActivity();
    } else {
      detachControls();
      inputManager.neutralize();
    }

    audio.dispose();
    throttler.reset();
    screenPipeline.dispose();
    cabinet.dispose();

    if (group.parent) {
      group.parent.remove(group);
    }
  }

  return {
    id: activityDef.id,
    type: 'sporefall',
    group,
    cabinetMesh: cabinet.bodyMesh,
    screenMesh: cabinet.screenMesh,
    activityCamera: cabinet.activityCamera,

    update,
    onSnapshot,
    onEvent,
    acceptSnapshot,
    acceptEvent,
    acceptResult,
    acceptError,
    neutralizeInput,

    focusActivity,
    unfocusActivity,
    setParticipation,
    attachControls,
    detachControls,
    acquireFocus,
    releaseFocus,

    dispose,

    get isParticipating() {
      return isFocusedInActivity;
    },
    get focusedSlot() {
      return focusedSlot;
    },
    get matchState() {
      return matchState;
    },
    get latestSnapshot() {
      return latestSnapshot;
    },
    get lastResult() {
      return lastResult;
    },
    get lastError() {
      return lastError;
    },
    get inputManager() {
      return inputManager;
    },
  };
}

export const SporefallModule = {
  initialize(options) {
    return createSporefallInstance(options);
  },
  worldSupport: {
    mode: 'none',
    host: 'parent',
    slots: [],
    adapterKey: null,
  },
};

registerActivityModule('sporefall', SporefallModule);
