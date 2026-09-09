/**
 * Records & leaderboards dialog (task 3.10, design D8).
 *
 * A compact native dialog showing, per arcade cabinet:
 *   - local bests (labeled honestly: Local best / Pending / Unrecorded)
 *   - the server-verified board for the selected rules version, paginated
 * Verified entries only ever come from the server's fenced recording path.
 */

import {
  ARCADE_GAMES,
  LEADERBOARD_PAGE_SIZE,
  MATCH_GAMES,
  RECORDING_LABELS,
  clampPage,
  gameTitle,
  mergeLocalAndVerified,
  normalizeProfile,
  normalizeVerifiedBoard,
} from '../../shared/leaderboardModel.js';
import { getBest, listBests, reconcileWithVerified } from '../activities/localBests.js';

export function createLeaderboardDialog({
  dialog = null,
  net = null,
  getPlayerId = null,
  onClose = null,
  onOpen = null,
} = {}) {
  if (!dialog || typeof dialog.showModal !== 'function') {
    throw new Error('createLeaderboardDialog requires a dialog with showModal');
  }

  const els = {
    tabs: dialog.querySelector('#leaderboard-tabs'),
    version: dialog.querySelector('#leaderboard-version'),
    rows: dialog.querySelector('#leaderboard-rows'),
    status: dialog.querySelector('#leaderboard-status'),
    prev: dialog.querySelector('#leaderboard-prev'),
    next: dialog.querySelector('#leaderboard-next'),
    page: dialog.querySelector('#leaderboard-page'),
    close: dialog.querySelector('#close-leaderboard'),
    profile: dialog.querySelector('#leaderboard-profile'),
    identity: dialog.querySelector('#leaderboard-identity'),
  };

  let openState = false;
  let currentGame = ARCADE_GAMES[0];
  let currentView = 'board';
  const BOARD_GAMES = [...ARCADE_GAMES, ...MATCH_GAMES.filter(g => g !== 'billiards')];
  let currentVersion = 1;
  let currentPage = 0;
  let total = 0;
  let lastBoard = null;
  let latestRequestId = 0;
  let previousFocus = null;

  const $doc = typeof document !== 'undefined' ? document : null;

  // --- data ---

  async function fetchBoard(game, rulesVersion, page) {
    const requestId = ++latestRequestId;
    const base = typeof net?.apiBase === 'string' ? net.apiBase.replace(/\/+$/, '') : '';
    const qs = new URLSearchParams({
      rulesVersion: String(rulesVersion),
      page: String(page),
    });

    try {
      const res = await fetch(`${base}/api/activities/leaderboard/${encodeURIComponent(game)}?${qs}`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const body = await res.json();
      if (requestId !== latestRequestId) return null; // stale reply
      if (!body?.ok) throw new Error(body?.error || 'unavailable');
      return normalizeVerifiedBoard(body);
    } catch (err) {
      if (requestId !== latestRequestId) return null;
      setStatus(`Records unavailable right now.`, true);
      return null;
    }
  }

  function setStatus(text, isError = false) {
    if (!els.status) return;
    els.status.textContent = text;
    els.status.dataset.error = isError ? 'true' : 'false';
  }

  // --- rendering ---

  function renderTabs() {
    if (!els.tabs) return;
    els.tabs.textContent = '';
    const profileBtn = $doc.createElement('button');
    profileBtn.type = 'button';
    profileBtn.className = 'leaderboard-tab';
    profileBtn.textContent = 'Profile';
    profileBtn.setAttribute('aria-pressed', currentView === 'profile' ? 'true' : 'false');
    profileBtn.addEventListener('click', () => {
      currentView = 'profile';
      renderTabs();
      refresh();
    });
    els.tabs.append(profileBtn);

    for (const game of BOARD_GAMES) {
      const btn = $doc.createElement('button');
      btn.type = 'button';
      btn.className = 'leaderboard-tab';
      btn.textContent = gameTitle(game);
      btn.setAttribute('aria-pressed', currentView === 'board' && game === currentGame ? 'true' : 'false');
      btn.addEventListener('click', () => {
        currentView = 'board';
        if (game === currentGame) {
          renderTabs();
          refresh();
          return;
        }
        currentGame = game;
        currentVersion = getBest(game, 1)?.rulesVersion || 1;
        currentPage = 0;
        renderTabs();
        refresh();
      });
      els.tabs.append(btn);
    }
  }

  function renderVersionOptions(versions) {
    if (!els.version) return;
    els.version.textContent = '';
    const list = versions.length > 0 ? versions : [currentVersion];
    for (const v of list) {
      const opt = $doc.createElement('option');
      opt.value = String(v);
      opt.textContent = `Rules v${v}`;
      els.version.append(opt);
    }
    els.version.value = String(currentVersion);
  }

  function labelFor(game, version) {
    const best = getBest(game, version);
    if (!best) return null;
    if (best.state === 'verified') return RECORDING_LABELS.verified;
    if (best.state === 'unrecorded') return RECORDING_LABELS.unrecorded;
    return RECORDING_LABELS.pending;
  }

  function renderRows(board) {
    if (!els.rows) return;
    els.rows.textContent = '';

    const localBest = getBest(currentGame, currentVersion);
    const rows = board
      ? mergeLocalAndVerified(localBest, board, { playerId: getPlayerId?.() ?? null })
      : [];

    if (rows.length === 0) {
      const empty = $doc.createElement('li');
      empty.className = 'leaderboard-empty';
      empty.textContent = localBest
        ? `No verified records yet — your local best is ${localBest.score}.`
        : 'No records yet. Be the first to set a score.';
      els.rows.append(empty);
      return;
    }

    for (const row of rows) {
      const li = $doc.createElement('li');
      li.className = 'leaderboard-row' + (row.isLocal ? ' is-local' : '');

      const rank = $doc.createElement('span');
      rank.className = 'leaderboard-rank';
      rank.textContent = row.rank != null ? String(row.rank) : '·';

      const name = $doc.createElement('span');
      name.className = 'leaderboard-name';
      name.textContent = row.displayName;

      const score = $doc.createElement('span');
      score.className = 'leaderboard-score';
      score.textContent = MATCH_GAMES.includes(currentGame)
        ? `${row.wins ?? row.score ?? 0} wins`
        : String(row.score);

      const label = $doc.createElement('span');
      label.className = 'leaderboard-label';
      label.textContent = row.label;

      li.append(rank, name, score, label);
      els.rows.append(li);
    }

    // Local best rows always carry an explicit recording label; make the
    // version separation and label meaning obvious without hovering.
    const best = localBest;
    if (best && !rows.some(r => r.isLocal && r.kind === 'local')) {
      const label = labelFor(currentGame, currentVersion);
      if (label && label !== RECORDING_LABELS.verified) {
        const note = $doc.createElement('li');
        note.className = 'leaderboard-note';
        note.textContent = `Your local best: ${best.score} — ${label.toLowerCase()} on the verified board.`;
        els.rows.append(note);
      }
    }
  }

  function renderPager() {
    if (els.page) {
      const shown = Math.min(total, LEADERBOARD_PAGE_SIZE);
      els.page.textContent = total > 0 ? `${shown} of ${total}` : '0';
    }
    if (els.prev) els.prev.disabled = currentPage <= 0;
    if (els.next) els.next.disabled = currentPage >= Math.max(pageCountSafe(total) - 1, 0);
  }

  function pageCountSafe(totalEntries) {
    if (!Number.isFinite(totalEntries) || totalEntries <= 0) return 0;
    return Math.ceil(totalEntries / LEADERBOARD_PAGE_SIZE);
  }

  function renderLocalList() {
    // Any other local bests (older versions) surface as a compact list so
    // version separation stays visible even when browsing one version.
    const others = listBests().filter(
      b => b.game === currentGame && b.rulesVersion !== currentVersion,
    );
    if (others.length === 0 || !els.status) return;
    const parts = others.map(b => `v${b.rulesVersion}: ${b.score}`);
    setStatus(`Other recorded versions — ${parts.join(' · ')}`, false);
  }

  // --- refresh cycle ---

  async function fetchProfile() {
    const requestId = ++latestRequestId;
    const id = getPlayerId?.();
    if (!id) return null;
    const base = typeof net?.apiBase === 'string' ? net.apiBase.replace(/\/+$/, '') : '';
    try {
      const res = await fetch(`${base}/api/activities/profile/${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const body = await res.json();
      if (requestId !== latestRequestId) return null;
      if (!body?.ok) throw new Error(body?.error || 'unavailable');
      return normalizeProfile(body);
    } catch (err) {
      if (requestId !== latestRequestId) return null;
      setStatus('Profile unavailable right now.', true);
      return null;
    }
  }

  function renderProfile(profile) {
    if (els.rows) els.rows.textContent = '';
    if (els.profile) {
      els.profile.hidden = false;
      els.profile.textContent = '';
      if (!profile) {
        els.profile.textContent = 'Sign in to this room to load verified records.';
        return;
      }
      const head = $doc.createElement('p');
      head.className = 'leaderboard-identity';
      head.textContent = `${profile.displayName} · ${profile.identityLabel}`;
      const note = $doc.createElement('p');
      note.className = 'leaderboard-note';
      note.textContent = profile.continuityNote;
      els.profile.append(head, note);
      if (profile.games.length === 0) {
        const empty = $doc.createElement('p');
        empty.textContent = 'No verified games yet.';
        els.profile.append(empty);
        return;
      }
      const list = $doc.createElement('ul');
      list.className = 'leaderboard-profile-games';
      for (const g of profile.games) {
        const li = $doc.createElement('li');
        const best = g.bestScore != null ? ` · best ${g.bestScore}` : '';
        li.textContent = `${g.title} v${g.rulesVersion}: ${g.gamesPlayed} games, ${g.wins} wins, streak ${g.currentStreak} (best ${g.bestStreak})${best}`;
        list.append(li);
      }
      els.profile.append(list);
    }
    if (els.identity) {
      els.identity.textContent = profile
        ? `${profile.identityLabel}. ${profile.continuityNote}`
        : '';
    }
  }

  async function refresh() {
    if (currentView === 'profile') {
      if (els.profile) els.profile.hidden = false;
      setStatus('Loading profile…');
      const profile = await fetchProfile();
      if (profile) setStatus('');
      renderProfile(profile);
      renderPager();
      return;
    }
    if (els.profile) els.profile.hidden = true;
    setStatus('Loading records…');
    const board = await fetchBoard(currentGame, currentVersion, clampPage(currentPage, total));
    renderPager();

    if (board) {
      lastBoard = board;
      total = board.total;
      currentPage = board.page;
      // Version options may expand once the server tells us what exists.
      renderVersionOptions(board.versions);
      reconcileWithVerified(currentGame, currentVersion, board, getPlayerId?.() ?? null);
      setStatus('');
      renderLocalList();
    }
    renderRows(lastBoard && lastBoard.game === currentGame && lastBoard.rulesVersion === currentVersion ? lastBoard : null);
    renderPager();
  }

  // --- lifecycle ---

  function open({ game = null } = {}) {
    if (openState || dialog.open) return;
    onOpen?.();
    openState = true;
    previousFocus = $doc?.activeElement ?? null;

    if (game && BOARD_GAMES.includes(game)) currentGame = game;
    currentVersion = getBest(currentGame, 1)?.rulesVersion || 1;
    currentPage = 0;
    total = 0;
    lastBoard = null;

    renderTabs();
    renderVersionOptions([1]);
    renderRows(null);
    dialog.showModal();
    refresh();
  }

  function close() {
    if (!openState && !dialog.open) return;
    openState = false;
    latestRequestId++;
    if (dialog.open) dialog.close();
    onClose?.();
    if (previousFocus?.focus) previousFocus.focus();
    previousFocus = null;
  }

  dialog.addEventListener?.('cancel', (e) => {
    e?.preventDefault?.();
    close();
  });
  els.close?.addEventListener?.('click', close);
  els.prev?.addEventListener?.('click', () => {
    if (currentPage > 0) {
      currentPage -= 1;
      refresh();
    }
  });
  els.next?.addEventListener?.('click', () => {
    if (currentPage < pageCountSafe(total) - 1) {
      currentPage += 1;
      refresh();
    }
  });
  els.version?.addEventListener?.('change', () => {
    const v = Number.parseInt(els.version.value, 10);
    if (Number.isInteger(v) && v >= 1) {
      currentVersion = v;
      currentPage = 0;
      refresh();
    }
  });

  return {
    open,
    close,
    get isOpen() {
      return openState;
    },
    get currentGame() {
      return currentGame;
    },
  };
}
