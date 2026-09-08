/**
 * Local arcade bests (task 3.10, design D8).
 *
 * localStorage-backed per {game, rulesVersion} bests with honest recording
 * states ('pending' -> 'verified' | 'unrecorded'). Storage can fail
 * (restricted, unavailable): every operation degrades to a session-only
 * no-op and never throws, and the store never fabricates a "saved" claim.
 */

import { normalizeLocalBest, recordingStatusToLocalState } from '../../shared/leaderboardModel.js';

const STORAGE_KEY = 'afterlight-bests-v1';

const memory = new Map();
let storageOk = null; // null = unknown until first try

function readAll() {
  if (memory.size > 0) return memory;
  if (storageOk === false) return memory;

  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    storageOk = true;
    if (typeof raw === 'string' && raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const [key, value] of Object.entries(parsed)) {
          const best = normalizeLocalBest(value);
          if (best) memory.set(key, best);
        }
      }
    }
  } catch {
    storageOk = storageOk === null ? false : storageOk;
  }
  return memory;
}

function persist() {
  try {
    if (typeof localStorage === 'undefined') return;
    const out = {};
    for (const [k, v] of memory.entries()) out[k] = v;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
    storageOk = true;
  } catch {
    storageOk = false; // session-only mode: keep memory, never fake success
  }
}

export function bestsKey(game, rulesVersion) {
  return `${game}:v${rulesVersion}`;
}

/**
 * Record a finished local run. Keeps the higher score; a fresh run with a
 * lower score does not overwrite the best. New records start 'pending'.
 * Returns the stored best and whether it was improved.
 */
export function recordRun(game, rulesVersion, score) {
  const s = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
  const key = bestsKey(game, rulesVersion);
  const all = readAll();
  const existing = all.get(key);

  if (existing && s <= existing.score) {
    return { best: existing, improved: false, persisted: storageOk !== false };
  }

  const best = { score: s, at: Date.now(), state: 'pending', rulesVersion };
  all.set(key, best);
  persist();
  return { best, improved: true, persisted: storageOk !== false };
}

export function getBest(game, rulesVersion) {
  return readAll().get(bestsKey(game, rulesVersion)) || null;
}

export function listBests() {
  const out = [];
  for (const [key, best] of readAll().entries()) {
    const [game, vRaw] = key.split(':v');
    out.push({ game, rulesVersion: Number(vRaw) || 1, ...best });
  }
  return out.sort((a, b) => a.game.localeCompare(b.game) || b.rulesVersion - a.rulesVersion);
}

/**
 * Apply a server recording-status event ({status, game, rulesVersion}) to
 * the matching local best. Returns true when a state changed.
 */
export function applyRecordingStatus({ game, rulesVersion, status }) {
  const state = recordingStatusToLocalState(status);
  if (!state) return false;
  const key = bestsKey(game, rulesVersion);
  const all = readAll();
  const best = all.get(key);
  if (!best || best.state === state) return false;
  all.set(key, { ...best, state });
  persist();
  return true;
}

/**
 * Reconcile against a verified board: if a verified entry for this local
 * player with at least the local best's score exists, the best is verified.
 * Returns true when the state changed.
 */
export function reconcileWithVerified(game, rulesVersion, verified, playerId) {
  const key = bestsKey(game, rulesVersion);
  const best = readAll().get(key);
  if (!best || best.state === 'verified' || !playerId) return false;

  const seen = Array.isArray(verified?.entries) &&
    verified.entries.some(e => e.playerId === playerId && e.score >= best.score);

  if (seen) {
    readAll().set(key, { ...best, state: 'verified' });
    persist();
    return true;
  }
  return false;
}

/** Test hook: clear memory and (best effort) storage. */
export function resetForTests() {
  memory.clear();
  storageOk = null;
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
