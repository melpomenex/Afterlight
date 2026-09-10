/**
 * Downhill Mayhem race HUD (integrate-multiplayer-downhill-mayhem-arcade 6.5).
 *
 * Scoped DOM subtree (`dm-` classes inside `.dm.activity`) for the lobby
 * (human + AI roster, mountain, difficulty, captain, readiness), the
 * synchronized countdown, racing (position, race time, speed, boost and the
 * ranked field with a human/AI distinction) and results (all six riders with
 * place/time/DNF, Rematch and Exit). The controller drives it from server
 * snapshots and the local prediction; this module owns no input capture of its
 * own — touch buttons ride the controller's single action path via
 * `setTouchSink`. All styles live in ./hud.css.
 */

if (typeof document !== 'undefined') {
  import('./hud.css').catch(() => {});
}

function el(tag, className = null, text = null) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null) node.textContent = text;
  return node;
}

function formatTime(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '--:--.--';
  const total = ms / 1000;
  const minutes = Math.floor(total / 60);
  const seconds = total - minutes * 60;
  return `${String(minutes).padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}`;
}

function sanitizeName(name) {
  return (typeof name === 'string' && name.length > 0 ? name : 'RIDER').slice(0, 16);
}

/** Stable render key so result controls stay mounted across frames. */
export function resultRenderKey(snap, rows) {
  return JSON.stringify({
    rows,
    place: snap.place,
    timeMs: snap.timeMs,
    mountain: snap.mountain,
  });
}

/**
 * @param {object} options
 * @param {HTMLElement} options.host  mount point
 * @param {() => void} options.onReady Ready/Rematch
 * @param {() => void} options.onExit  safe exit
 * @param {(muted: boolean) => void} [options.onSoundToggle]
 * @param {(config: {mountain?: string, difficulty?: string}) => void} [options.onConfig]
 * @param {(role: 'watch'|'queue') => void} [options.onJoinRole]
 * @param {() => void} [options.onLeaveRole]
 * @param {(accept: boolean) => void} [options.onOffer]
 */
export function createDownhillHud({
  host = null,
  onReady,
  onExit,
  onSoundToggle = null,
  onConfig = null,
  onJoinRole = null,
  onLeaveRole = null,
  onOffer = null,
} = {}) {
  const mount = host ?? (typeof document !== 'undefined' ? document.body : null);
  if (!mount) return null;

  const root = el('div', 'dm');
  root.setAttribute('role', 'region');
  root.setAttribute('aria-label', 'Downhill Mayhem race');

  // --- lobby ----------------------------------------------------------------
  const lobby = el('div', 'dm-panel dm-lobby');
  lobby.innerHTML = `
    <span class="dm-overline">THE ORPHEUM · MOUNTAIN CABINET</span>
    <h1>DOWNHILL <em>MAYHEM</em></h1>
    <div class="dm-lobby-meta" data-downhill-config>
      <span class="dm-setting">MOUNTAIN
        <button type="button" class="dm-cycle" data-role="mountain-prev" aria-label="Previous mountain">‹</button>
        <b data-role="mountain">CLASSIC</b>
        <button type="button" class="dm-cycle" data-role="mountain-next" aria-label="Next mountain">›</button>
      </span>
      <span class="dm-setting">DIFFICULTY
        <button type="button" class="dm-cycle" data-role="difficulty-prev" aria-label="Easier difficulty">‹</button>
        <b data-role="difficulty">MAYHEM</b>
        <button type="button" class="dm-cycle" data-role="difficulty-next" aria-label="Harder difficulty">›</button>
      </span>
      <span>CAPTAIN <b data-role="captain">—</b></span>
    </div>
    <span class="dm-overline">RIDERS <b data-role="ready-count">0</b> READY</span>
    <div class="dm-roster" data-role="roster"></div>
    <p>Six riders. One mountain. Ride, trick, fight.</p>`;
  root.appendChild(lobby);

  // --- queue / watching / slot offer ----------------------------------------
  const audience = el('div', 'dm-panel dm-audience');
  audience.innerHTML = `
    <span class="dm-overline" data-role="audience-title">RACE IN PROGRESS</span>
    <p data-role="audience-line">The mountain is busy.</p>
    <div class="dm-audience-actions">
      <button type="button" class="dm-action-button dm-action-primary" data-role="audience-primary"></button>
      <button type="button" class="dm-action-button" data-role="audience-secondary"></button>
    </div>`;
  root.appendChild(audience);

  // --- countdown ------------------------------------------------------------
  const countdown = el('div', 'dm-countdown');
  countdown.innerHTML = `<span>GATES OPEN</span><strong data-role="count">3</strong><span>GO BIG OR GO HOME</span>`;
  root.appendChild(countdown);

  // --- racing ---------------------------------------------------------------
  const racing = el('div', 'dm-racing-hud');
  const posTime = el('div', 'dm-panel dm-pos-time');
  posTime.innerHTML = `
    <div class="dm-stat"><span class="dm-overline">POSITION</span><strong><span data-role="place">–</span><small>/<span data-role="field">6</span></small></strong></div>
    <div class="dm-stat"><span class="dm-overline">RACE TIME</span><strong data-role="time">00:00.00</strong></div>`;
  const speedBoost = el('div', 'dm-panel dm-speed-boost');
  speedBoost.innerHTML = `
    <div class="dm-speed"><strong data-role="speed">0</strong><span>KM/H</span></div>
    <div class="dm-boost-track"><i data-role="boost"></i></div>`;
  const progress = el('div', 'dm-panel dm-progress');
  progress.innerHTML = `<span class="dm-overline">FIELD</span><div data-role="progress-rows"></div>`;
  racing.append(posTime, speedBoost, progress);
  root.appendChild(racing);

  // --- results --------------------------------------------------------------
  const scrim = el('div', 'dm-results-scrim');
  const results = el('div', 'dm-panel dm-results');
  results.setAttribute('role', 'dialog');
  results.setAttribute('aria-modal', 'true');
  results.setAttribute('aria-label', 'Downhill Mayhem results');
  scrim.appendChild(results);
  root.appendChild(scrim);

  const aborted = el('div', 'dm-panel dm-aborted');
  aborted.innerHTML = `<span class="dm-overline">RACE ABORTED</span><p data-role="aborted-reason">THE MOUNTAIN WILL WAIT</p>`;
  root.appendChild(aborted);

  // --- toast / connection ---------------------------------------------------
  const toast = el('div', 'dm-toast');
  toast.setAttribute('role', 'status');
  root.appendChild(toast);
  const connection = el('div', 'dm-connection', 'RECONNECTING…');
  root.appendChild(connection);

  // --- actions --------------------------------------------------------------
  const actions = el('div', 'dm-actions');
  const readyButton = el('button', 'dm-action-button dm-action-primary dm-action-ready', 'READY (R)');
  readyButton.type = 'button';
  const exitButton = el('button', 'dm-action-button dm-action-exit', 'EXIT (ESC)');
  exitButton.type = 'button';
  const soundButton = el('button', 'dm-action-button dm-action-sound', 'SOUND OFF');
  soundButton.type = 'button';
  actions.append(readyButton, exitButton, soundButton);
  root.appendChild(actions);

  // --- wiring ---------------------------------------------------------------
  readyButton.addEventListener('click', () => onReady?.());
  exitButton.addEventListener('click', () => onExit?.());
  let muted = true;
  soundButton.addEventListener('click', () => {
    muted = !muted;
    soundButton.textContent = muted ? 'SOUND OFF' : 'SOUND ON';
    onSoundToggle?.(muted);
  });

  const MOUNTAINS = ['classic', 'timber', 'rock', 'daily'];
  const DIFFICULTY_ORDER = ['chill', 'mayhem', 'brutal'];
  function cycleValue(list, current, dir) {
    const index = Math.max(0, list.indexOf(String(current ?? '').toLowerCase()));
    return list[(index + dir + list.length) % list.length];
  }

  let lastSnap = {};
  const audiencePrimary = audience.querySelector('[data-role="audience-primary"]');
  const audienceSecondary = audience.querySelector('[data-role="audience-secondary"]');
  const audienceTitle = audience.querySelector('[data-role="audience-title"]');
  const audienceLine = audience.querySelector('[data-role="audience-line"]');

  audiencePrimary?.addEventListener('click', () => {
    if (lastSnap.offer) onOffer?.(true);
    else onJoinRole?.('queue');
  });
  audienceSecondary?.addEventListener('click', () => {
    if (lastSnap.offer) onOffer?.(false);
    else onLeaveRole?.();
  });

  const mountainPrev = lobby.querySelector('[data-role="mountain-prev"]');
  const mountainNext = lobby.querySelector('[data-role="mountain-next"]');
  const difficultyPrev = lobby.querySelector('[data-role="difficulty-prev"]');
  const difficultyNext = lobby.querySelector('[data-role="difficulty-next"]');
  mountainPrev?.addEventListener('click', () => onConfig?.({
    mountain: cycleValue(MOUNTAINS, lastSnap.mountain, -1),
  }));
  mountainNext?.addEventListener('click', () => onConfig?.({
    mountain: cycleValue(MOUNTAINS, lastSnap.mountain, 1),
  }));
  difficultyPrev?.addEventListener('click', () => onConfig?.({
    difficulty: cycleValue(DIFFICULTY_ORDER, lastSnap.difficulty, -1),
  }));
  difficultyNext?.addEventListener('click', () => onConfig?.({
    difficulty: cycleValue(DIFFICULTY_ORDER, lastSnap.difficulty, 1),
  }));

  const touchHandlers = [];
  const touchButtons = new Map();
  let renderedResultsKey = null;
  const q = (role) => root.querySelector(`[data-role="${role}"]`);
  const refs = {
    mountain: q('mountain'), difficulty: q('difficulty'), captain: q('captain'),
    readyCount: q('ready-count'), roster: q('roster'), count: q('count'),
    place: q('place'), field: q('field'), time: q('time'),
    speed: q('speed'), boost: q('boost'), progressRows: q('progress-rows'),
    abortedReason: q('aborted-reason'), toast, results, readyButton,
  };

  function renderRoster(snap) {
    const riders = Array.isArray(snap.riders) ? snap.riders : [];
    const rows = [];
    const capacity = Math.max(1, Math.min(6, snap.capacity ?? 6));
    for (let slot = 0; slot < capacity; slot++) {
      const rider = riders.find((r) => r.slot === slot) ?? riders[slot] ?? null;
      const row = el('div', 'dm-roster-row');
      if (!rider) {
        row.classList.add('dm-empty');
        row.innerHTML = `<span class="dm-roster-slot">${slot + 1}</span><span class="dm-roster-name">OPEN SLOT</span><span class="dm-roster-tag">PRESS E</span>`;
      } else {
        if (rider.isAI) row.classList.add('dm-ai');
        if (rider.self) row.classList.add('dm-self');
        if (rider.ready) row.classList.add('dm-ready');
        const captain = snap.captainName && rider.nickname === snap.captainName;
        row.innerHTML = `
          <span class="dm-roster-slot">${slot + 1}</span>
          <span class="dm-roster-name">${sanitizeName(rider.nickname)}${captain ? ' <span class="dm-roster-captain">★</span>' : ''}</span>
          <span class="dm-roster-tag">${rider.isAI ? 'AI' : rider.ready ? 'READY' : 'WAITING'}</span>`;
      }
      rows.push(row);
    }
    refs.roster.replaceChildren(...rows);
  }

  function renderProgress(snap) {
    if (!refs.progressRows) return;
    const riders = Array.isArray(snap.riders) ? snap.riders : [];
    const ordered = [...riders].sort((a, b) => {
      if (a.finished !== b.finished) return a.finished ? -1 : 1;
      return (b.normalizedProgress ?? 0) - (a.normalizedProgress ?? 0);
    }).slice(0, 6);
    const rows = ordered.map((rider, index) => {
      const row = el('div', 'dm-progress-row');
      if (rider.isAI) row.classList.add('dm-ai');
      if (rider.self) row.classList.add('dm-self');
      const place = rider.status === 'dnf' ? 'DNF' : `${index + 1}`;
      row.innerHTML = `
        <span class="dm-roster-slot">${place}</span>
        <b>${sanitizeName(rider.nickname)}</b>
        <span class="dm-progress-bar"><i></i></span>`;
      const bar = row.querySelector('i');
      if (bar) bar.style.width = `${Math.round(Math.max(0, Math.min(1, rider.normalizedProgress ?? 0)) * 100)}%`;
      return row;
    });
    refs.progressRows.replaceChildren(...rows);
  }

  function renderResults(snap) {
    const key = resultRenderKey(snap, snap.results?.standings ?? []);
    if (key === renderedResultsKey) return;
    renderedResultsKey = key;
    const standings = Array.isArray(snap.results?.standings) ? snap.results.standings : [];
    const winner = standings.find((row) => row.place === 1 && row.status !== 'dnf');
    const heading = el('div');
    heading.innerHTML = `
      <span class="dm-overline">RUN COMPLETE · ${sanitizeName(snap.mountain ?? 'CLASSIC')}</span>
      <h2>${winner ? `<em>${sanitizeName(winner.nickname)}</em> TAKES THE MOUNTAIN` : 'NO FINISHERS'}</h2>
      <div class="dm-results-rows">${standings.map((row) => `
        <div class="dm-result-row${row.self ? ' dm-self' : ''}${row.isAI ? ' dm-ai' : ''}">
          <span class="dm-roster-slot">${row.status === 'dnf' ? 'DNF' : (row.place ?? '–')}</span>
          <b>${sanitizeName(row.nickname)}${row.isAI ? ' <span class="dm-roster-tag">AI</span>' : ''}</b>
          <i>${row.status === 'dnf' ? (row.dnfReason ?? 'DNF') : formatTime(row.timeMs)}</i>
          <i>${row.status === 'dnf' ? '' : 'FINISH'}</i>
        </div>`).join('')}</div>
      <button type="button" class="dm-action-button dm-action-primary" data-role="rematch">REMATCH (R)</button>
      <p class="dm-result-note">SESSION RECORDS ONLY — NOT SAVED</p>`;
    refs.results.replaceChildren(heading);
    refs.results.querySelector('[data-role="rematch"]')?.addEventListener('click', () => onReady?.(), { once: true });
  }

  function setTouchSink(sink) {
    for (const handler of touchHandlers.splice(0)) {
      handler.button.removeEventListener('pointerdown', handler.down);
      handler.button.removeEventListener('pointerup', handler.up);
      handler.button.removeEventListener('pointercancel', handler.up);
    }
    if (!sink) return;
    const specs = [
      ['KeyA', '◀'], ['KeyD', '▶'], ['KeyW', 'PEDAL'], ['KeyS', 'BRAKE'],
      ['Space', 'HOP'], ['KeyE', 'PUNCH'], ['KeyF', 'KICK'],
    ];
    const bar = el('div', 'dm-touch');
    for (const [code, label] of specs) {
      const button = el('button', 'dm-action-button dm-touch-key', label);
      button.type = 'button';
      button.setAttribute('aria-label', label);
      const down = (event) => { event.preventDefault(); sink(code, true); };
      const up = () => sink(code, false);
      button.addEventListener('pointerdown', down);
      button.addEventListener('pointerup', up);
      button.addEventListener('pointercancel', up);
      touchHandlers.push({ button, down, up });
      bar.appendChild(button);
    }
    root.appendChild(bar);
  }

  function update(snap) {
    if (!snap) return;
    lastSnap = snap;
    const phase = snap.phase ?? 'lobby';
    root.className = `dm dm-visible dm-phase-${phase}`
      + `${snap.reconnecting ? ' dm-reconnecting' : ''}`
      + `${snap.isCaptain && phase === 'lobby' ? ' dm-captain' : ''}`;

    if (refs.mountain) refs.mountain.textContent = String(snap.mountain ?? 'CLASSIC').toUpperCase();
    if (refs.difficulty) refs.difficulty.textContent = String(snap.difficulty ?? 'MAYHEM').toUpperCase();
    if (refs.captain) refs.captain.textContent = snap.captainName ? sanitizeName(snap.captainName) : '—';
    if (refs.readyCount) refs.readyCount.textContent = String(snap.readyCount ?? 0);
    renderRoster(snap);

    if (refs.count && snap.countdownLeft != null) {
      refs.count.textContent = String(Math.max(1, Math.ceil(snap.countdownLeft)));
    }
    if (refs.place) refs.place.textContent = snap.place != null ? String(snap.place) : '–';
    if (refs.field) refs.field.textContent = String(snap.field ?? 6);
    if (refs.time) refs.time.textContent = formatTime(snap.timeMs ?? 0);
    if (refs.speed) refs.speed.textContent = String(Math.round(Math.abs(snap.speed ?? 0) * 3.6));
    if (refs.boost) refs.boost.style.width = `${Math.max(0, Math.min(100, snap.boost ?? 0))}%`;
    renderProgress(snap);

    // Queue / watch / slot-offer panel (11.5).
    if (audienceTitle && audienceLine && audiencePrimary && audienceSecondary) {
      let title = null;
      let line = '';
      let primary = '';
      let secondary = '';
      if (snap.offer) {
        title = 'SLOT OPEN — YOUR CALL';
        line = `A seat opened for the next race. Accept within ${Math.max(0, Math.ceil((snap.offer.remainingMs ?? 0) / 1000))}s.`;
        primary = 'ACCEPT (R)';
        secondary = 'DECLINE';
      } else if (snap.queued) {
        title = 'IN QUEUE';
        line = snap.queuePosition
          ? `Position ${snap.queuePosition}. You will be offered a slot between races.`
          : 'You will be offered a slot between races.';
        primary = 'WATCH LIVE';
        secondary = 'LEAVE QUEUE';
      } else if (snap.watching) {
        title = 'WATCHING LIVE';
        line = 'The race is in progress. Queue for the next one or leave.';
        primary = 'QUEUE NEXT RACE';
        secondary = 'STOP WATCHING';
      }
      const show = title != null && phase !== 'racing';
      audiencePrimary.textContent = primary;
      audienceSecondary.textContent = secondary;
      audienceTitle.textContent = title ?? '';
      audienceLine.textContent = line;
      audiencePrimary.hidden = !show;
      audienceSecondary.hidden = !show;
      audienceTitle.hidden = !show;
      audienceLine.hidden = !show;
    }
    if (refs.abortedReason) refs.abortedReason.textContent = snap.abortedReason ?? 'THE MOUNTAIN WILL WAIT';

    const toastOn = (snap.toastTime ?? 0) > 0 && !!snap.toast;
    refs.toast.classList.toggle('dm-toast-visible', toastOn);
    if (toastOn) refs.toast.textContent = snap.toast;

    if (phase === 'results') renderResults(snap);
    else renderedResultsKey = null;
  }

  mount.appendChild(root);

  return {
    root,
    update,
    setTouchSink,
    show() { root.classList.add('dm-visible'); },
    hide() { root.classList.remove('dm-visible'); },
    dispose() {
      setTouchSink(null);
      root.remove();
    },
    get muted() { return muted; },
  };
}
