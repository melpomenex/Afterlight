/**
 * Physical tournament board + enrollment/check-in UI (tasks 10.6–10.7).
 *
 * The parent wires this via `initTournamentBoard()` so Places/main stay
 * free of this lane. Call `attachWorld(world)` after travel into a room
 * that hosts pool; the stand is local geometry, not a manifest activity.
 */

import * as THREE from 'three';
import { MSG_TYPES } from '../../shared/protocol.js';
import {
  TOURNAMENT_SIZES,
  TOURNAMENT_STATUS,
  apply,
  createIdle,
  matchCaption,
  publicSnapshot,
  roundTitle,
  statusCaption,
  walkoverLabel,
} from '../../shared/tournamentModel.js';

export const TOURNAMENT_BOARD_ITEM = Object.freeze({
  type: 'tournament-board',
  id: 'orpheum-tournament-board',
  x: -10.2,
  z: -6.35,
  title: 'Pool tournament board',
  sub: 'Enroll, check in, follow the bracket',
});

const BOARD_POSITION = [-10.2, 0, -6.35];

export function initTournamentBoard({
  dialog = null,
  button = null,
  net = null,
  getPlayerId = null,
  getDisplayName = null,
  getRoomId = null,
  onOpen = null,
  onClose = null,
  THREE: THREELib = THREE,
} = {}) {
  const $doc = typeof document !== 'undefined' ? document : null;
  const dlg = dialog || $doc?.querySelector('#tournament-dialog') || createDialog($doc);
  const btn = button || $doc?.querySelector('#btn-tournament');

  if (!dlg || typeof dlg.showModal !== 'function') {
    return {
      open() {},
      close() {},
      attachWorld() {},
      detachWorld() {},
      dispose() {},
      item: TOURNAMENT_BOARD_ITEM,
      get isOpen() { return false; },
      get snapshot() { return createIdle(); },
    };
  }

  const els = {
    status: dlg.querySelector('#tournament-status'),
    roster: dlg.querySelector('#tournament-roster'),
    bracket: dlg.querySelector('#tournament-bracket'),
    size4: dlg.querySelector('#tournament-size-4'),
    size8: dlg.querySelector('#tournament-size-8'),
    enroll: dlg.querySelector('#tournament-enroll'),
    withdraw: dlg.querySelector('#tournament-withdraw'),
    checkin: dlg.querySelector('#tournament-checkin'),
    close: dlg.querySelector('#close-tournament'),
    deadline: dlg.querySelector('#tournament-deadline'),
  };

  let openState = false;
  let snapshot = createIdle();
  let mesh = null;
  let worldGroup = null;
  let previousFocus = null;
  let deadlineTimer = null;

  function roomId() {
    return getRoomId?.() || snapshot.roomId || 'theater';
  }

  function playerId() {
    return getPlayerId?.() || null;
  }

  function send(type, payload = {}) {
    if (!net?.send) return;
    net.send(type, { ...payload, requestId: `tn_${Date.now()}` });
  }

  function refreshFromNet() {
    send(MSG_TYPES.TOURNAMENT_GET);
  }

  function applyLocal(action, now = Date.now()) {
    const result = apply(snapshot, action, now, {});
    if (result.ok) {
      snapshot = publicSnapshot(result.state);
      render();
    }
    return result;
  }

  function onState(frame) {
    if (!frame || typeof frame !== 'object') return;
    snapshot = publicSnapshot({
      ...createIdle(frame.roomId || roomId()),
      ...frame,
      players: frame.players || [],
      matches: frame.matches || [],
    });
    render();
    paintBoard();
  }

  function render() {
    if (els.status) els.status.textContent = statusCaption(snapshot);

    if (els.roster) {
      els.roster.textContent = '';
      if (snapshot.players.length === 0) {
        const empty = $doc.createElement('li');
        empty.className = 'tournament-empty';
        empty.textContent = 'No one has enrolled yet.';
        els.roster.append(empty);
      } else {
        for (const p of snapshot.players) {
          const li = $doc.createElement('li');
          li.className = 'tournament-player' + (p.playerId === playerId() ? ' is-local' : '');
          const mark = p.checkedIn ? 'checked in' : p.status === 'withdrawn' ? 'withdrawn' : 'enrolled';
          li.textContent = `${p.displayName} · ${mark}`;
          els.roster.append(li);
        }
      }
    }

    if (els.bracket) {
      els.bracket.textContent = '';
      const names = Object.fromEntries(snapshot.players.map(p => [p.playerId, p.displayName]));
      const rounds = [...new Set(snapshot.matches.map(m => m.round))].sort((a, b) => a - b);
      for (const round of rounds) {
        const heading = $doc.createElement('h3');
        heading.className = 'tournament-round';
        heading.textContent = roundTitle(snapshot.size, round);
        els.bracket.append(heading);
        const list = $doc.createElement('ol');
        list.className = 'tournament-matches';
        for (const match of snapshot.matches.filter(m => m.round === round)) {
          const li = $doc.createElement('li');
          li.className = 'tournament-match' + (match.id === snapshot.activeMatchId ? ' is-active' : '');
          if (match.credited === false && match.outcome === 'walkover') li.classList.add('is-walkover');
          li.textContent = matchCaption(match, names);
          const note = walkoverLabel(match);
          if (note) {
            const small = $doc.createElement('small');
            small.textContent = note;
            li.append($doc.createElement('br'), small);
          }
          list.append(li);
        }
        els.bracket.append(list);
      }
    }

    const mine = snapshot.players.some(p => p.playerId === playerId() && p.status !== 'withdrawn');
    const idle = snapshot.status === TOURNAMENT_STATUS.IDLE;
    const enrolling = snapshot.status === TOURNAMENT_STATUS.ENROLLING;
    if (els.enroll) els.enroll.disabled = !(idle || enrolling) || mine;
    if (els.withdraw) els.withdraw.disabled = !mine || snapshot.status === TOURNAMENT_STATUS.COMPLETE;
    if (els.checkin) {
      const active = snapshot.matches.find(m => m.id === snapshot.activeMatchId);
      const canCheck =
        snapshot.status === TOURNAMENT_STATUS.CHECK_IN &&
        active &&
        (active.playerA === playerId() || active.playerB === playerId());
      els.checkin.disabled = !canCheck;
    }
    if (els.size4) els.size4.disabled = !idle;
    if (els.size8) els.size8.disabled = !idle;

    if (els.deadline) {
      if (snapshot.status === TOURNAMENT_STATUS.CHECK_IN && snapshot.checkInDeadline) {
        const remain = Math.max(0, snapshot.checkInDeadline - Date.now());
        els.deadline.textContent = `Check-in ${Math.ceil(remain / 1000)}s`;
      } else {
        els.deadline.textContent = '';
      }
    }
  }

  function enroll() {
    const size = els.size8?.checked ? 8 : 4;
    send(MSG_TYPES.TOURNAMENT_ENROLL, {
      size: TOURNAMENT_SIZES.includes(size) ? size : 4,
      displayName: getDisplayName?.() || 'visitor',
    });
  }

  function open() {
    if (openState || dlg.open) return;
    onOpen?.();
    openState = true;
    previousFocus = $doc?.activeElement ?? null;
    dlg.showModal();
    refreshFromNet();
    render();
    deadlineTimer = setInterval(render, 1000);
  }

  function close() {
    if (!openState && !dlg.open) return;
    openState = false;
    if (deadlineTimer) {
      clearInterval(deadlineTimer);
      deadlineTimer = null;
    }
    if (dlg.open) dlg.close();
    onClose?.();
    previousFocus?.focus?.();
    previousFocus = null;
  }

  dlg.addEventListener?.('cancel', (e) => {
    e?.preventDefault?.();
    close();
  });
  els.close?.addEventListener?.('click', close);
  els.enroll?.addEventListener?.('click', enroll);
  els.withdraw?.addEventListener?.('click', () => send(MSG_TYPES.TOURNAMENT_WITHDRAW));
  els.checkin?.addEventListener?.('click', () => send(MSG_TYPES.TOURNAMENT_CHECKIN));
  btn?.addEventListener?.('click', open);

  net?.on?.(MSG_TYPES.TOURNAMENT_STATE, onState);
  net?.onConnect?.(() => refreshFromNet());

  function attachWorld(world) {
    detachWorld();
    if (!world?.group || !THREELib) return;
    mesh = buildStand(THREELib);
    world.group.add(mesh.group);
    worldGroup = world.group;
    if (typeof world.items?.push === 'function' && !world.items.some(i => i.id === TOURNAMENT_BOARD_ITEM.id)) {
      world.items.push({ ...TOURNAMENT_BOARD_ITEM });
    }
    paintBoard();
  }

  function detachWorld() {
    if (mesh?.group && worldGroup) worldGroup.remove(mesh.group);
    mesh?.dispose?.();
    mesh = null;
    worldGroup = null;
  }

  function paintBoard() {
    if (!mesh?.paint) return;
    mesh.paint(statusCaption(snapshot));
  }

  function dispose() {
    close();
    detachWorld();
  }

  render();

  return {
    open,
    close,
    attachWorld,
    detachWorld,
    dispose,
    applyLocal,
    item: TOURNAMENT_BOARD_ITEM,
    get isOpen() {
      return openState;
    },
    get snapshot() {
      return snapshot;
    },
  };
}

function createDialog(doc) {
  if (!doc) return null;
  const dlg = doc.createElement('dialog');
  dlg.id = 'tournament-dialog';
  dlg.innerHTML = tournamentDialogHtml();
  doc.body.append(dlg);
  return dlg;
}

export function tournamentDialogHtml() {
  return `
    <div class="micro">WEST LOUNGE · BILLIARDS</div>
    <h2>Pool tournament</h2>
    <p class="dialog-sub">
      Room-local four or eight players, single elimination. Walkovers are labeled
      and never counted as played matches. No prizes, coins or XP.
    </p>
    <p id="tournament-status" role="status"></p>
    <p id="tournament-deadline" class="tournament-deadline" aria-live="polite"></p>
    <fieldset class="tournament-enroll">
      <legend>Field size</legend>
      <label><input id="tournament-size-4" type="radio" name="tournament-size" value="4" checked> 4 players</label>
      <label><input id="tournament-size-8" type="radio" name="tournament-size" value="8"> 8 players</label>
    </fieldset>
    <div class="tournament-actions">
      <button type="button" id="tournament-enroll">Enroll</button>
      <button type="button" id="tournament-checkin">Check in</button>
      <button type="button" id="tournament-withdraw">Withdraw</button>
    </div>
    <h3>Field</h3>
    <ul id="tournament-roster"></ul>
    <div id="tournament-bracket"></div>
    <button type="button" id="close-tournament">Back to the lounge →</button>
  `;
}

function buildStand(THREELib) {
  const group = new THREELib.Group();
  group.name = 'tournament-board';
  group.position.set(BOARD_POSITION[0], BOARD_POSITION[1], BOARD_POSITION[2]);
  group.rotation.y = Math.PI / 2;

  const owned = [];
  const wood = new THREELib.MeshStandardMaterial({ color: '#3a2418', roughness: 0.7, metalness: 0.08 });
  const slate = new THREELib.MeshStandardMaterial({
    color: '#1a2420',
    roughness: 0.85,
    metalness: 0.05,
    emissive: '#243830',
    emissiveIntensity: 0.18,
  });
  const brass = new THREELib.MeshStandardMaterial({ color: '#c4a46a', roughness: 0.4, metalness: 0.7 });
  owned.push(wood, slate, brass);

  const postGeo = new THREELib.BoxGeometry(0.08, 1.35, 0.08);
  const boardGeo = new THREELib.BoxGeometry(1.15, 0.82, 0.06);
  const capGeo = new THREELib.BoxGeometry(1.22, 0.05, 0.12);
  owned.push(postGeo, boardGeo, capGeo);

  const left = new THREELib.Mesh(postGeo, wood);
  left.position.set(-0.5, 0.68, 0);
  left.castShadow = true;
  const right = new THREELib.Mesh(postGeo, wood);
  right.position.set(0.5, 0.68, 0);
  right.castShadow = true;
  const board = new THREELib.Mesh(boardGeo, slate);
  board.position.set(0, 0.95, 0.02);
  board.castShadow = true;
  const cap = new THREELib.Mesh(capGeo, brass);
  cap.position.set(0, 1.38, 0);

  group.add(left, right, board, cap);

  let canvas = null;
  let texture = null;
  if (typeof document !== 'undefined') {
    canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 360;
    texture = new THREELib.CanvasTexture(canvas);
    const face = new THREELib.MeshStandardMaterial({
      map: texture,
      color: '#ffffff',
      roughness: 0.9,
      metalness: 0,
      emissive: '#1b2a24',
      emissiveIntensity: 0.22,
    });
    owned.push(face, texture);
    const faceMesh = new THREELib.Mesh(new THREELib.PlaneGeometry(1.08, 0.74), face);
    faceMesh.position.set(0, 0.95, 0.055);
    owned.push(faceMesh.geometry);
    group.add(faceMesh);
  }

  function paint(text) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#15221c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#d7c48a';
    ctx.font = '28px "Space Mono", monospace';
    ctx.fillText('POOL BRACKET', 24, 48);
    ctx.fillStyle = '#c5d5c8';
    ctx.font = '18px "DM Sans", sans-serif';
    wrapText(ctx, text || '', 24, 96, 464, 26);
    texture.needsUpdate = true;
  }

  paint('Enroll four or eight players.');

  return {
    group,
    paint,
    dispose() {
      for (const res of owned) res.dispose?.();
    },
  };
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}
