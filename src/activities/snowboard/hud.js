/**
 * Summit Run race HUD — the ALPINE RUSH port
 * (integrate-ssxtricky-snowboard 2.4).
 *
 * Scoped DOM/CSS port of the source presentation `SSXTricky/app/page.tsx` +
 * `globals.css` @ rev e87f6c7d: course label, position/run-time block, trick
 * score + personal best, the course map with progress dot, start panel ("GO
 * BIG. GET TRICKY."), countdown, toasts, air hint / trick callout, stance
 * status, jump charge, bottom speed + boost blocks, conditions, results modal
 * and touch controls. All styles live in ./hud.css under the `sbx-` scope —
 * no global styles leak into Afterlight and Afterlight HUD/panels stay
 * reachable (the bottom-right chat dock zone is deliberately kept clear).
 *
 * Multiplayer adaptations (documented): the source RACE/FREE RIDE mode switch
 * and DROP IN solo start become the shared-race READY action (R / button,
 * lobby + results phases); ANOTHER RUN becomes REMATCH; the source pause
 * modal is dropped (Escape exits the race and local pause never pauses the
 * shared clock); the rider-count meta shows the live lobby roster. Sound
 * stays opt-in behind the speaker toggle.
 */

import { formatTime } from '../../../shared/snowboard/rules.js';

// The scoped stylesheet loads in the browser (Vite bundles it with this
// module); Node tests skip it — there is no DOM to style.
if (typeof document !== 'undefined') {
  await import('./hud.css');
}

function el(tag, className, text = null) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null) node.textContent = text;
  return node;
}

export function resultRenderKey(snap, rows) {
  return JSON.stringify({ rows, score: snap.score, bestCombo: snap.bestCombo, landings: snap.landings });
}

/**
 * @param {object} options
 * @param {HTMLElement} [options.host]  mount point (defaults to body)
 * @param {() => void} options.onReady  Ready/Rematch action
 * @param {() => void} options.onExit   safe exit (Escape equivalent)
 * @param {(muted: boolean) => void} [options.onSoundToggle] opt-in audio
 */
export function createRaceHud({ host = null, onReady, onExit, onSoundToggle = null } = {}) {
  const mount = host ?? (typeof document !== 'undefined' ? document.body : null);
  if (!mount) return null;

  const root = el('div', 'sbx');
  root.setAttribute('role', 'region');
  root.setAttribute('aria-label', 'Summit Run race');

  // --- static layout -----------------------------------------------------
  const label = el('div', 'sbx-course-label');
  label.innerHTML = `
    <span class="sbx-overline"><span class="sbx-lime-dot"></span> CANADA <span class="sbx-slash"> / </span> 2,840 M</span>
    <h1>ALPINE RUSH<span>01</span></h1>
    <p>Fresh powder. No limits.</p>`;
  root.appendChild(label);

  const topHud = el('div', 'sbx-top-hud');
  const positionStat = el('div', 'sbx-position-stat');
  positionStat.innerHTML = `<span class="sbx-overline">POSITION</span><strong><span data-role="place">–</span><small>/<span data-role="field">8</span></small></strong>`;
  const timeStat = el('div', 'sbx-time-stat');
  timeStat.innerHTML = `<span class="sbx-overline">RUN TIME</span><strong data-role="time">00:00.00</strong><span class="sbx-time-caption" data-role="caption">THE MOUNTAIN IS YOURS</span>`;
  topHud.append(positionStat, timeStat);
  root.appendChild(topHud);

  const scoreHud = el('div', 'sbx-score-hud');
  scoreHud.innerHTML = `
    <span class="sbx-overline">TRICK SCORE</span>
    <strong data-role="score">000000</strong>
    <div class="sbx-score-caption"><span>PERSONAL BEST</span><b data-role="best">0</b></div>`;
  root.appendChild(scoreHud);

  const courseMap = el('div', 'sbx-course-map');
  courseMap.innerHTML = `
    <span class="sbx-overline">COURSE</span>
    <svg viewBox="0 0 70 230" aria-label="Course progress">
      <path class="sbx-map-shadow" d="M35 12 C-10 45 85 62 38 103 S3 157 36 177 S60 207 35 219"/>
      <path class="sbx-map-line" d="M35 12 C-10 45 85 62 38 103 S3 157 36 177 S60 207 35 219"/>
      <circle cx="35" cy="12" r="4" fill="#d8ff77"/>
      <circle cx="35" cy="219" r="4" fill="white"/>
      <circle data-role="map-dot" cx="35" cy="12" r="6" fill="#f57a45" stroke="#fff" stroke-width="2"/>
    </svg>
    <span data-role="km">1.8 KM</span>`;
  root.appendChild(courseMap);

  const conditions = el('div', 'sbx-conditions');
  conditions.innerHTML = `<span>−8°</span><div>CLEAR SKIES<br/><b>POWDER / PACKED</b></div><span class="sbx-sun">☀</span>`;
  root.appendChild(conditions);

  const startPanel = el('div', 'sbx-start-panel');
  startPanel.innerHTML = `
    <span class="sbx-eyebrow"><span></span> THE NEXT RUN IS YOURS</span>
    <h2>GO BIG.<br/><em>GET TRICKY.</em></h2>
    <p>Find your line. Send it off the lip.<br/>Leave everything on the mountain.</p>
    <div class="sbx-start-meta"><span data-role="riders">2<i>RIDERS READY</i></span><span>1.8 KM <i>COURSE</i></span><span>13 <i>BIG AIR JUMPS</i></span></div>`;
  const readyButton = el('button', 'sbx-drop-button');
  readyButton.type = 'button';
  readyButton.innerHTML = `READY <span>R</span>`;
  startPanel.appendChild(readyButton);
  root.appendChild(startPanel);

  const riderCard = el('div', 'sbx-rider-card');
  riderCard.innerHTML = `
    <span class="sbx-overline">YOUR RIDER</span>
    <div><span class="sbx-rider-number">07</span><div><h3>THE MAVERICK</h3><p>FREESTYLE <span> / </span> ALL-MOUNTAIN</p></div></div>
    <span class="sbx-rider-dash"></span>`;
  root.appendChild(riderCard);

  const countdown = el('div', 'sbx-countdown');
  countdown.innerHTML = `<span>READY TO DROP?</span><strong data-role="count">3</strong><p>Hold SPACE, release to jump</p>`;
  root.appendChild(countdown);

  const toast = el('div', 'sbx-toast');
  toast.setAttribute('role', 'status');
  root.appendChild(toast);

  const airHint = el('div', 'sbx-air-hint');
  airHint.innerHTML = `<strong>MAKE IT TRICKY</strong><span>HOLD <kbd>Q</kbd> SPIN <kbd>E</kbd> GRAB <kbd>X</kbd> FLIP</span>`;
  root.appendChild(airHint);

  const trickCallout = el('div', 'sbx-trick-callout');
  trickCallout.innerHTML = `<span data-role="combo-mult">AIR COMBO ×1</span><strong data-role="trick-name"></strong><b><span data-role="combo-pts">0</span> <small>PTS</small></b>`;
  root.appendChild(trickCallout);

  const stance = el('div', 'sbx-stance-status');
  stance.innerHTML = `<strong data-role="stance-name"></strong><span data-role="stance-detail"></span>`;
  root.appendChild(stance);

  const jumpCharge = el('div', 'sbx-jump-charge');
  jumpCharge.innerHTML = `<span data-role="charge-label">JUMP POWER</span><div><i data-role="charge-bar"></i></div><b>RELEASE SPACE</b>`;
  root.appendChild(jumpCharge);

  const bottomHud = el('div', 'sbx-bottom-hud');
  bottomHud.innerHTML = `
    <div class="sbx-speed-stat"><strong data-role="speed">00</strong><div><span>KM/H</span><span class="sbx-speed-ticks">▰ ▰ ▰ ▰ ▰</span></div></div>
    <div class="sbx-boost-hud">
      <div class="sbx-boost-label"><span data-role="boost-label">TRICKY BOOST</span><kbd>B</kbd></div>
      <div class="sbx-boost-track"><div data-role="boost-bar"></div></div>
      <div class="sbx-boost-caption"><span>LAND TRICKS TO FILL</span><span data-role="boost-pct">45%</span></div>
    </div>`;
  root.appendChild(bottomHud);

  const speedLines = el('div', 'sbx-speed-lines');
  root.appendChild(speedLines);

  // --- action bar (Exit always; Rematch in results; sound opt-in) -----------
  const actions = el('div', 'sbx-actions');
  const exitButton = el('button', 'sbx-action-button');
  exitButton.type = 'button';
  exitButton.textContent = 'EXIT RACE (ESC)';
  const rematchButton = el('button', 'sbx-action-button sbx-action-primary');
  rematchButton.type = 'button';
  rematchButton.textContent = 'REMATCH (R)';
  const soundButton = el('button', 'sbx-action-button');
  soundButton.type = 'button';
  soundButton.textContent = 'SOUND OFF';
  actions.append(exitButton, rematchButton, soundButton);
  root.appendChild(actions);

  // --- results modal ---------------------------------------------------------
  const scrim = el('div', 'sbx-modal-scrim');
  const modal = el('div', 'sbx-game-modal');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Run results');
  scrim.appendChild(modal);
  root.appendChild(scrim);

  // --- touch controls (same action path as keys) -------------------------------
  const touch = el('div', 'sbx-touch');
  const touchLeft = el('div');
  const touchRight = el('div');
  touch.append(touchLeft, touchRight);
  root.appendChild(touch);

  const touchActions = [
    ['KeyA', '◀'], ['KeyD', '▶'], ['KeyQ', 'SPIN'], ['KeyE', 'GRAB'], ['KeyX', 'FLIP'],
    ['ShiftLeft', 'TUCK'], ['KeyW', 'LEAN'], ['KeyB', 'BOOST'], ['Space', 'JUMP'],
  ];
  const touchButtons = new Map();
  for (const [code, text] of touchActions) {
    const button = el('button', code === 'Space' ? 'sbx-touch-key sbx-touch-jump' : 'sbx-touch-key');
    button.type = 'button';
    button.textContent = text;
    button.setAttribute('aria-label', text);
    touchButtons.set(code, button);
    (code === 'KeyA' || code === 'KeyD' ? touchLeft : touchRight).appendChild(button);
  }

  // --- wiring -----------------------------------------------------------------
  readyButton.addEventListener('click', () => onReady?.());
  rematchButton.addEventListener('click', () => onReady?.());
  exitButton.addEventListener('click', () => onExit?.());
  let muted = true;
  soundButton.addEventListener('click', () => {
    muted = !muted;
    soundButton.textContent = muted ? 'SOUND OFF' : 'SOUND ON';
    onSoundToggle?.(muted);
  });
  // Touch buttons are wired by the controller through setTouchSink so this
  // module owns no input capture of its own — the SAME action path as keys.
  const touchHandlers = [];
  let renderedResultsKey = null;

  const q = (role) => root.querySelector(`[data-role="${role}"]`);

  const refs = {
    place: q('place'), field: q('field'), time: q('time'), caption: q('caption'),
    score: q('score'), best: q('best'), mapDot: q('map-dot'), km: q('km'),
    riders: q('riders'), count: q('count'), toast, airHint, trickCallout, stance,
    jumpCharge, chargeLabel: q('charge-label'), chargeBar: q('charge-bar'),
    speed: q('speed'), boostLabel: q('boost-label'), boostBar: q('boost-bar'),
    boostPct: q('boost-pct'), startPanel, riderCard, countdown, speedLines,
    scrim, modal, rematchButton, actions,
  };

  /**
   * Wire touch buttons to the controller's input path (the SAME action path
   * as keys — no parallel input manager).
   */
  function setTouchSink(sink) {
    for (const handler of touchHandlers.splice(0)) {
      handler.button.removeEventListener('pointerdown', handler.down);
      handler.button.removeEventListener('pointerup', handler.up);
      handler.button.removeEventListener('pointercancel', handler.up);
    }
    if (!sink) return;
    for (const [code, button] of touchButtons) {
      const down = (event) => {
        event.preventDefault();
        sink(code, true);
      };
      const up = () => sink(code, false);
      button.addEventListener('pointerdown', down);
      button.addEventListener('pointerup', up);
      button.addEventListener('pointercancel', up);
      touchHandlers.push({ button, down, up });
    }
  }

  /**
   * Render one HUD snapshot (the controller's hudUpdate drives this at
   * display rate; values are already sanitized numbers/strings).
   */
  function update(snap) {
    if (!snap) return;
    const active = snap.phase === 'racing' || snap.phase === 'countdown';
    const cls = (node, name, on) => node?.classList.toggle(name, !!on);

    cls(refs.startPanel, 'sbx-visible', snap.phase === 'lobby');
    cls(refs.riderCard, 'sbx-visible', snap.phase === 'lobby');
    cls(refs.countdown, 'sbx-visible', snap.phase === 'countdown');
    cls(refs.scrim, 'sbx-visible', snap.phase === 'results');
    cls(root, 'sbx-boosting', snap.boosting === true);

    if (refs.place && snap.place != null) refs.place.textContent = String(snap.place);
    if (refs.field) refs.field.textContent = String(snap.field ?? 8);
    if (refs.time) refs.time.textContent = formatTime((snap.timeMs ?? 0) / 1000);
    if (refs.caption) refs.caption.textContent = active ? 'MAKE EVERY SECOND COUNT' : 'THE MOUNTAIN IS YOURS';
    if (refs.score) refs.score.textContent = String(Math.max(0, snap.score ?? 0)).padStart(6, '0');
    if (refs.best) refs.best.textContent = String(Math.max(0, snap.bestCombo ?? 0));
    if (refs.km) refs.km.textContent = `${Math.max(0, 1.8 * (1 - (snap.progress ?? 0))).toFixed(1)} KM`;
    if (refs.mapDot) {
      const progress = Math.max(0, Math.min(1, snap.progress ?? 0));
      refs.mapDot.setAttribute('cx', String(35 + Math.sin(progress * 12) * 10));
      refs.mapDot.setAttribute('cy', String(12 + progress * 207));
    }
    if (refs.riders && snap.riderCount != null) {
      refs.riders.innerHTML = `${snap.riderCount} READY<i>OF ${snap.capacity ?? 8} RIDERS</i>`;
    }
    if (refs.count && snap.countdownLeft != null) {
      refs.count.textContent = String(Math.max(1, Math.ceil(snap.countdownLeft)));
    }

    // Toast (source cadence: visible while toastTime > 0).
    cls(refs.toast, 'sbx-visible', active && snap.toastTime > 0);
    cls(refs.toast, 'sbx-toast-bail', String(snap.toast ?? '').startsWith('BAIL'));
    if (snap.toastTime > 0 && snap.toast) refs.toast.textContent = snap.toast;

    cls(refs.airHint, 'sbx-visible', active && snap.airborne && !snap.trickName);
    cls(refs.trickCallout, 'sbx-visible', active && snap.airborne && !!snap.trickName);
    if (snap.trickName) {
      const multEl = refs.trickCallout.querySelector('[data-role="combo-mult"]');
      const nameEl = refs.trickCallout.querySelector('[data-role="trick-name"]');
      const ptsEl = refs.trickCallout.querySelector('[data-role="combo-pts"]');
      if (multEl) multEl.textContent = `AIR COMBO ×${snap.comboMultiplier ?? 1}`;
      if (nameEl) nameEl.textContent = snap.trickName;
      if (ptsEl) ptsEl.textContent = (snap.combo ?? 0).toLocaleString();
    }

    // Stance status.
    const stanceOn = active && !snap.airborne && (snap.tucking || snap.leaning || snap.carving);
    cls(refs.stance, 'sbx-visible', stanceOn);
    if (stanceOn) {
      const name = refs.stance.querySelector('[data-role="stance-name"]');
      const detail = refs.stance.querySelector('[data-role="stance-detail"]');
      if (name) name.textContent = snap.tucking && snap.leaning ? 'AERO TUCK' : snap.tucking ? 'LOW TUCK' : snap.leaning ? 'FORWARD LEAN' : 'FLOW CARVE';
      if (detail) detail.textContent = snap.carving ? `CARVE FLOW ${Math.round((snap.carveCharge ?? 0) * 100)}%` : snap.tucking ? 'LESS DRAG • WIDER TURNS' : 'BUILDING SPEED';
    }

    // Jump charge.
    const charge = snap.charge ?? 0;
    cls(refs.jumpCharge, 'sbx-visible', charge > 0);
    if (charge > 0) {
      if (refs.chargeBar) refs.chargeBar.style.width = `${Math.min(100, charge * 100)}%`;
      if (refs.chargeLabel) refs.chargeLabel.textContent = snap.tucking && charge >= 0.8 ? 'SUPER POP READY' : 'JUMP POWER';
    }

    if (refs.speed) refs.speed.textContent = String(Math.round((snap.speed ?? 0) * 3.6)).padStart(2, '0');
    const boost = Math.max(0, Math.min(100, snap.boost ?? 0));
    if (refs.boostBar) refs.boostBar.style.width = `${boost}%`;
    if (refs.boostPct) refs.boostPct.textContent = `${Math.round(boost)}%`;
    if (refs.boostLabel) refs.boostLabel.textContent = (snap.zoneBoost ?? 0) > 0 ? 'SPEED LANE' : boost >= 95 ? 'SUPER TRICKY' : 'TRICKY BOOST';

    // Results modal.
    cls(refs.rematchButton, 'sbx-visible', snap.phase === 'results');
    if (snap.phase === 'results') {
      renderResults(snap);
    } else {
      renderedResultsKey = null;
    }
  }

  function renderResults(snap) {
    const results = snap.results ?? { standings: [] };
    const rows = Array.isArray(results.standings) ? results.standings : [];
    const mine = rows.find((row) => row.self) ?? null;
    // update() runs every animation frame. Keep the result controls mounted
    // while their data is unchanged so a pointerdown/up pair reaches the
    // same Rematch button and produces a click.
    const resultsKey = resultRenderKey(snap, rows);
    if (resultsKey === renderedResultsKey) return;
    renderedResultsKey = resultsKey;
    const heading = document.createElement('div');
    const you = mine ?? { place: null, timeMs: null };
    heading.innerHTML = `
      <span class="sbx-eyebrow">RUN COMPLETE</span>
      <h2>${you.place === 1 ? 'TOP OF THE MOUNTAIN.' : 'WHAT A RUN.'}</h2>
      <div class="sbx-result-score">${(you.score ?? snap.score ?? 0).toLocaleString()}<small>POINTS</small></div>
      <div class="sbx-result-grid">
        <div><span>POSITION</span><b>${you.place != null ? `${you.place} / ${rows.length}` : 'DNF'}</b></div>
        <div><span>TIME</span><b>${you.timeMs != null ? formatTime(you.timeMs / 1000) : '—'}</b></div>
        <div><span>BEST COMBO</span><b>${(you.bestCombo ?? snap.bestCombo ?? 0).toLocaleString()}</b></div>
        <div><span>CLEAN LANDINGS</span><b>${you.landings ?? snap.landings ?? 0}</b></div>
      </div>
      <div class="sbx-result-rows">${rows.map((row) => `
        <div class="${row.self ? 'sbx-result-row sbx-result-self' : 'sbx-result-row'}">
          <span>${row.status === 'dnf' ? 'DNF' : row.place}</span>
          <b>${row.nickname ?? 'RIDER'}</b>
          <i>${row.status === 'dnf' ? (row.dnfReason ?? 'DNF') : row.timeMs != null ? formatTime(row.timeMs / 1000) : '—'}</i>
          <em>${(row.score ?? 0).toLocaleString()} PTS</em>
        </div>`).join('')}</div>
      <button type="button" class="sbx-drop-button" data-action="rematch">REMATCH <span>R</span></button>
      <p class="sbx-result-note">SESSION RECORDS ONLY — NOT SAVED</p>`;
    refs.modal.replaceChildren(heading);
    refs.modal.querySelector('[data-action="rematch"]')?.addEventListener('click', () => onReady?.(), { once: true });
  }

  mount.appendChild(root);

  return {
    root,
    update,
    setTouchSink,
    show() {
      root.classList.add('sbx-visible');
    },
    hide() {
      root.classList.remove('sbx-visible');
    },
    dispose() {
      setTouchSink(null);
      root.remove();
    },
    get muted() {
      return muted;
    },
  };
}
