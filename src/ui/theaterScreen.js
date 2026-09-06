/**
 * Theater screen UI (The Orpheum).
 *
 * Owns everything about the shared media screen on the client:
 *   - a DOM overlay anchored to the in-world screen quad via a per-frame
 *     matrix3d homography (updateScreenQuad is the game-loop tick),
 *   - one playback engine at a time (direct <video>, hls.js, YouTube IFrame
 *     API, Vimeo player SDK — all lazily loaded),
 *   - the shared-clock sync driven by THEATER_STATE snapshots
 *     (serverNow-based; local drift corrections only, never messages),
 *   - the projection-booth controls dialog (queue, transport, volume),
 *   - IPTV: a room-SHARED, server-persisted channel library — playlists
 *     uploaded over HTTP (paste / file / URL) are parsed and broadcast by
 *     the server so everyone in the theater can browse the guide, tune,
 *     and flip without importing anything; personal localStorage lists
 *     remain as a private fallback and can be pushed to the library —
 *   - a program guide (EPG): uploaded XMLTV files (plain or .gz) persist
 *     on the server and power now/next display in the guide via bounded
 *     epg_lookup polling, matched by tvg-id or display name.
 *
 * Import-safe under Node: nothing touches `document`/`window` at module top
 * level; the constructor builds DOM only when a DOM exists, so the test
 * runner can import (and even instantiate) this module headlessly.
 */

import { MSG_TYPES } from '../../shared/protocol.js';
import {
  IPTV_LIMITS,
  iptvErrorText,
  sanitizeChannels,
  serializeM3U,
} from '../../shared/iptvModel.js';
import {
  KIND_LABELS,
  THEATER_LIMITS,
  buildEmbedUrl,
  classifySource,
  defaultTitle,
  effectivePositionSec,
  theaterErrorText,
} from '../../shared/theaterModel.js';
import {
  TORRENT_LIMITS,
  normalizeTorrentStatus,
  torrentErrorText,
  torrentTitle,
} from '../../shared/torrentModel.js';

const OVERLAY_BASE = 100; // CSS px side of the untransformed overlay square
const SYNC_SEEK_THRESHOLD_SEC = 1.5;
const DRIFT_CHECK_INTERVAL_MS = 2000;
const SDK_TIMEOUT_MS = 8000;
const YT_UNSTARTED_GRACE_MS = 3000;
const PLAYLIST_RESOLVE_TIMEOUT_MS = 20_000; // server fetch timeout + grace
const PLAYLIST_PREVIEW_ROWS = 5; // titles shown before "… and N more"
const IPTV_LISTS_KEY = 'afterlight-iptv-lists';
const IPTV_LISTS_MAX = 12;
const IPTV_CHANNELS_MAX = 5000;
const EPG_REFRESH_INTERVAL_MS = 60_000; // now/next refresh while the guide is open

// --- Pure exported helpers (unit-tested under Node) ---

/**
 * Compute the 3x3 homography (as 9 row-major numbers h11..h33, h33 = 1)
 * mapping srcQuad[i] -> dstQuad[i] for the four corner pairs. Solves the
 * standard 8-unknown DLT system with Gaussian elimination + partial
 * pivoting. Returns the identity for degenerate/invalid input.
 */
export function computeHomography(srcQuad, dstQuad) {
  const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  if (!Array.isArray(srcQuad) || !Array.isArray(dstQuad)) return identity;
  if (srcQuad.length < 4 || dstQuad.length < 4) return identity;

  const rows = [];
  for (let i = 0; i < 4; i++) {
    const s = srcQuad[i] || {};
    const d = dstQuad[i] || {};
    const x = Number(s.x);
    const y = Number(s.y);
    const u = Number(d.x);
    const v = Number(d.y);
    if (![x, y, u, v].every(Number.isFinite)) return identity;
    rows.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    rows.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }

  const n = 8; // unknowns (h33 is fixed at 1)
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < rows.length; r++) {
      if (Math.abs(rows[r][col]) > Math.abs(rows[pivot][col])) pivot = r;
    }
    if (Math.abs(rows[pivot][col]) < 1e-12) return identity; // degenerate quad
    if (pivot !== col) {
      const tmp = rows[pivot];
      rows[pivot] = rows[col];
      rows[col] = tmp;
    }
    const pv = rows[col][col];
    for (let c = col; c <= n; c++) rows[col][c] /= pv;
    for (let r = 0; r < rows.length; r++) {
      if (r === col) continue;
      const factor = rows[r][col];
      if (factor === 0) continue;
      for (let c = col; c <= n; c++) rows[r][c] -= factor * rows[col][c];
    }
  }

  const h = [];
  for (let i = 0; i < n; i++) h.push(rows[i][n]);
  h.push(1);
  return h;
}

/**
 * Render a 3x3 homography (9 row-major numbers) as a CSS matrix3d string.
 * matrix3d is column-major: m = [h11 h21 0 h31 | h12 h22 0 h32 | 0 0 1 0 | h13 h23 0 h33].
 */
export function homographyToMatrix3d(h) {
  const v = (i, fallback = 0) => {
    const num = Number(h?.[i]);
    return Number.isFinite(num) ? num : i === 8 ? 1 : fallback;
  };
  return `matrix3d(${v(0)}, ${v(3)}, 0, ${v(6)}, ${v(1)}, ${v(4)}, 0, ${v(7)}, 0, 0, 1, 0, ${v(2)}, ${v(5)}, 0, ${v(8)})`;
}

// Bucket name for channels whose group has no country part.
export const GUIDE_OTHER = 'Other';

/**
 * Split an IPTV group-title into { country, category }: the part before the
 * first "|" is the country of origin, the rest the category ("UK|News").
 * Groups without a separator count as countries; missing/empty groups give
 * { country: null, category: null } and land in the GUIDE_OTHER bucket.
 */
export function splitChannelGroup(group) {
  const g = typeof group === 'string' ? group.trim() : '';
  if (!g) return { country: null, category: null };
  const i = g.indexOf('|');
  if (i < 0) return { country: g, category: null };
  return {
    country: g.slice(0, i).trim() || null,
    category: g.slice(i + 1).trim() || null,
  };
}

/**
 * Facets for the guide's country -> category navigation: the sorted country
 * list (channels with no group land under GUIDE_OTHER) plus the sorted
 * categories available for a given country ('All' unions every country).
 */
export function guideFacets(channels) {
  const byCountry = new Map();
  let grouped = 0;
  let groupless = 0;
  for (const ch of Array.isArray(channels) ? channels : []) {
    const { country, category } = splitChannelGroup(ch?.group);
    if (!country && !category) {
      groupless += 1;
      continue;
    }
    grouped += 1;
    const c = country || GUIDE_OTHER;
    if (!byCountry.has(c)) byCountry.set(c, new Set());
    if (category) byCountry.get(c).add(category);
  }
  // Mixed lists give groupless channels an 'Other' bucket so they stay
  // reachable; a fully groupless list keeps the flat fallback instead.
  if (grouped > 0 && groupless > 0) byCountry.set(GUIDE_OTHER, byCountry.get(GUIDE_OTHER) || new Set());
  return {
    countries: [...byCountry.keys()].sort((a, b) => a.localeCompare(b)),
    categoriesFor(country) {
      const sets = country === 'All'
        ? [...byCountry.values()]
        : [byCountry.get(country)].filter(Boolean);
      const union = new Set();
      for (const s of sets) for (const v of s) union.add(v);
      return [...union].sort((a, b) => a.localeCompare(b));
    },
  };
}

/**
 * Whether a channel passes the chosen country/category guide filters.
 * 'All' disables the corresponding filter; channels without a category only
 * surface under the 'All' category filter.
 */
export function channelMatchesGuide(channel, country, category) {
  const { country: c, category: k } = splitChannelGroup(channel?.group);
  const cc = c || GUIDE_OTHER;
  if (country && country !== 'All' && cc !== country) return false;
  if (category && category !== 'All' && (k || '') !== category) return false;
  return true;
}

/**
 * Repair untrusted persisted saved-IPTV-list data into a safe shape:
 * `[{ id, name, savedAt, channels: [{ url, name, group, logo }] }]`.
 * Caps 12 lists / 5000 channels each, drops lists with no http(s) channel
 * URLs and every channel whose url is not http(s). Pure — never mutates.
 */
export function sanitizeSavedLists(raw, nowMs = 0) {
  const out = [];
  if (!Array.isArray(raw)) return out;
  const fallbackTs = Number.isFinite(Number(nowMs)) ? Number(nowMs) : 0;
  for (const entry of raw) {
    if (out.length >= IPTV_LISTS_MAX) break;
    if (!entry || typeof entry !== 'object') continue;
    const channels = [];
    if (Array.isArray(entry.channels)) {
      for (const ch of entry.channels) {
        if (channels.length >= IPTV_CHANNELS_MAX) break;
        if (!ch || typeof ch !== 'object') continue;
        const url = typeof ch.url === 'string' ? ch.url.trim() : '';
        if (!/^https?:\/\//i.test(url)) continue;
        const logo = typeof ch.logo === 'string' ? ch.logo.trim() : '';
        channels.push({
          url,
          name: typeof ch.name === 'string' && ch.name.trim()
            ? ch.name.trim().slice(0, 200)
            : `Channel ${channels.length + 1}`,
          group: typeof ch.group === 'string' && ch.group.trim() ? ch.group.trim().slice(0, 120) : null,
          logo: /^https?:\/\//i.test(logo) ? logo : null,
        });
      }
    }
    if (channels.length === 0) continue; // nothing playable -> drop the list
    out.push({
      id: typeof entry.id === 'string' && entry.id ? entry.id : `iptv_${out.length}_${fallbackTs}`,
      name: typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim().slice(0, 80) : 'Untitled list',
      savedAt: Number.isFinite(Number(entry.savedAt)) ? Number(entry.savedAt) : fallbackTs,
      channels,
    });
  }
  return out;
}

// --- Lazy SDK loading (browser only) ---

const scriptPromises = new Map();

function loadScript(src, timeoutMs = SDK_TIMEOUT_MS) {
  if (typeof document === 'undefined') return Promise.reject(new Error('no document'));
  if (scriptPromises.has(src)) return scriptPromises.get(src);
  const promise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timer = setTimeout(() => reject(new Error(`Timed out loading ${src}`)), timeoutMs);
    script.src = src;
    script.async = true;
    script.onload = () => {
      clearTimeout(timer);
      resolve();
    };
    script.onerror = () => {
      clearTimeout(timer);
      scriptPromises.delete(src); // allow a later retry
      reject(new Error(`Failed to load ${src}`));
    };
    document.head.append(script);
  });
  scriptPromises.set(src, promise);
  return promise;
}

let ytApiPromise = null;

function ensureYouTubeApi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (!ytApiPromise) {
    ytApiPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('YouTube IFrame API timed out')), SDK_TIMEOUT_MS);
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        clearTimeout(timer);
        if (typeof previous === 'function') {
          try {
            previous();
          } catch {}
        }
        if (window.YT && window.YT.Player) resolve(window.YT);
        else reject(new Error('YouTube IFrame API missing after load'));
      };
      loadScript('https://www.youtube.com/iframe_api').catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
    ytApiPromise.catch(() => {
      ytApiPromise = null; // allow retry on the next item
    });
  }
  return ytApiPromise;
}

async function ensureVimeoSdk() {
  if (typeof window === 'undefined') throw new Error('no window');
  if (window.Vimeo && window.Vimeo.Player) return window.Vimeo;
  await loadScript('https://player.vimeo.com/api/player.js');
  if (window.Vimeo && window.Vimeo.Player) return window.Vimeo;
  throw new Error('Vimeo player SDK missing after load');
}

// --- The UI ---

export class TheaterScreenUI {
  /**
   * @param {object} net NetworkClient instance (send/on); optional for tests.
   */
  constructor(net = null) {
    this.net = net;
    this.state = null; // last { now, queue } snapshot from the server
    this.serverDelta = 0; // serverNow - Date.now() at the last snapshot
    this.roomActive = false;
    this.quad = null; // [{x,y}x4] in CSS px, order bl, br, tr, tl
    this.engine = null; // active playback engine adapter
    this.loadedItemId = null; // item id the engine was loaded for
    this.reportedForId = null; // ended/failed already sent for this item id
    this.overlayState = 'idle'; // idle | loading | playing | error
    this.errorTitle = null;
    this.awaitingGesture = false; // autoplay blocked, waiting for tap
    this.lastDriftCheckMs = 0;
    this.loadToken = 0; // guards async engine loads against races
    this.volume = 1; // 0..1, local only — never part of shared state
    this.watching = false; // cinema view: big stage + docked chat, HUD hidden
    // Set by the game: standing up from a seat is the game's business
    // (pose, movement flag); the watch bar only requests it.
    this.onStandUpRequest = null;
    this.seatedInWorld = false; // labels the watch bar's leave action

    // IPTV: shared (server) library + personal (localStorage) lists.
    this.savedLists = []; // personal lists, localStorage-backed
    this.sharedCatalog = { lists: [], epg: null }; // IPTV_STATE metadata
    this.sharedChannels = new Map(); // listId -> channels, pulled on demand
    this.pendingFlip = 0; // flip requested while a shared list was loading
    this.epgSchedule = new Map(); // guide key -> { now, next }
    this.epgTimer = null; // refresh interval while the guide dialog is open
    this.activeListId = null;
    this.activeChannelIndex = -1;
    this.guideCountry = 'All'; // Guide navigation: country first…
    this.guideCategory = 'All'; // …then categories within that country
    this.guideListId = null;

    // Torrent: magnet resolve in flight + latest swarm statuses
    // (infohash -> normalized status from TORRENT_STATE broadcasts).
    this.torrentPending = null; // { requestId, magnet, playNow, timer }
    this.torrentPick = null; // { magnet, name, playNow } while the picker is open
    this.torrentStatuses = new Map();

    // YouTube playlist import: resolve in flight, the open mixed-link
    // choice, and the confirmed-once preview (same lifecycle as torrents).
    this.playlistPending = null; // { requestId, playNow, timer }
    this.playlistChoice = null; // { classified, playNow } while the choice is open
    this.playlistPreview = null; // { title, videos, playNow } while the preview is open

    this.overlayW = OVERLAY_BASE; // Untransformed overlay rect (CSS px)
    this.overlayH = OVERLAY_BASE;

    this.dom = null;
    if (typeof document !== 'undefined') {
      this.dom = {};
      this.buildOverlay();
      this.buildControlsButton();
      this.buildDialogs();
      this.buildWatchBar();
      this.savedLists = this.loadSavedLists();
      this.syncOverlay();
    }

    // Self-registration so standalone use works (main.js may also wire this;
    // applyState is idempotent so redundant snapshots are harmless).
    if (net && typeof net.on === 'function') {
      net.on(MSG_TYPES.THEATER_STATE, (msg) => this.applyState(msg?.theater, msg?.serverNow || Date.now()));
      net.on(MSG_TYPES.IPTV_STATE, (msg) => this.applyIptvState(msg?.iptv));
      net.on(MSG_TYPES.IPTV_LIST, (msg) => this.applySharedList(msg));
      net.on(MSG_TYPES.EPG_SCHEDULE, (msg) => this.applyEpgSchedule(msg));
      net.on(MSG_TYPES.TORRENT_FILES, (msg) => this.applyTorrentFiles(msg));
      net.on(MSG_TYPES.TORRENT_STATE, (msg) => this.applyTorrentStatus(msg));
      net.on(MSG_TYPES.THEATER_PLAYLIST_RESOLVED, (msg) => this.applyPlaylistResolved(msg));
      net.on(MSG_TYPES.THEATER_IMPORT_RESULT, (msg) => this.applyImportResult(msg));
    }
  }

  // --- Public interface ---

  /** Entering/leaving the `theater` room: show/hide overlay + HUD button. */
  setRoomActive(active) {
    this.roomActive = !!active;
    if (!this.roomActive) {
      this.teardownEngine();
      this.loadedItemId = null; // force a reload path on reactivation
      this.awaitingGesture = false;
      this.cancelTorrentResolve();
      this.torrentPick = null;
      this.torrentStatuses.clear();
      this.cancelPlaylistResolve();
      this.playlistChoice = null;
      this.playlistPreview = null;
      if (this.dom?.playlistDialog?.open) this.dom.playlistDialog.close();
      if (this.dom?.playlistChoiceDialog?.open) this.dom.playlistChoiceDialog.close();
      this.setOverlayState('idle');
    } else if (this.state?.now) {
      // Rebuild playback from the retained snapshot.
      this.loadedItemId = null;
      this.loadCurrent();
    } else {
      this.setOverlayState('idle');
    }
    if (this.dom?.controlsBtn) this.dom.controlsBtn.hidden = !this.roomActive;
    this.syncOverlay();
  }

  /**
   * Apply a server snapshot { now, queue } + the server clock at send time.
   * Idempotent: redundant calls for the same state only re-assert sync.
   */
  applyState(theater, serverNow = null) {
    const safe = theater && typeof theater === 'object' ? theater : { now: null, queue: [] };
    this.state = {
      now: safe.now && typeof safe.now === 'object' ? safe.now : null,
      queue: Array.isArray(safe.queue) ? safe.queue : [],
    };
    const serverNowMs = Number(serverNow);
    if (Number.isFinite(serverNowMs) && serverNowMs > 0) {
      this.serverDelta = serverNowMs - Date.now();
    }

    if (this.dom?.controlsDialog?.open) this.renderControls();
    if (this.dom?.guideDialog?.open) this.renderGuide();
    if (this.watching) this.updateWatchBar();

    if (!this.roomActive) return; // keep the snapshot; rebuild on re-entry

    const now = this.state.now;
    if (!now) {
      if (this.engine || this.loadedItemId !== null) this.teardownEngine();
      this.loadedItemId = null;
      this.reportedForId = null;
      this.setOverlayState('idle');
      this.syncOverlay();
      return;
    }

    this.rememberChannelFor(now.url);
    if (now.id !== this.loadedItemId) {
      this.reportedForId = null; // fresh item -> fresh ended/failed guard
      this.loadCurrent();
    } else {
      this.enforceSync();
    }
    this.syncOverlay();
  }

  /**
   * Per-frame tick from the game loop. `quad` = the projected screen corners
   * in CSS px, order bottomLeft, bottomRight, topRight, topLeft; null hides
   * the overlay. Also runs the ~2s drift check.
   */
  updateScreenQuad(quad, worldAspect = 1) {
    this.quad = Array.isArray(quad) && quad.length >= 4 ? quad : null;
    if (this.dom?.overlay && this.quad && !this.watching) {
      // Size the untransformed overlay to roughly the projected quad's area
      // and keep its aspect equal to the in-world screen, so media rasterizes
      // near display resolution and keeps its shape on the screen plane. (A
      // fixed 100x100 square turned close-up views blurry and squashed the
      // picture vertically by the screen's aspect ratio.)
      const xs = this.quad.map((p) => p.x);
      const ys = this.quad.map((p) => p.y);
      const area = Math.max(0, Math.max(...xs) - Math.min(...xs)) *
        Math.max(0, Math.max(...ys) - Math.min(...ys));
      const aspect = Number.isFinite(worldAspect) && worldAspect > 0 ? worldAspect : 1;
      const side = Math.min(Math.max(Math.sqrt(Math.max(area, 1) * aspect), OVERLAY_BASE), 2400);
      const w = Math.round(side);
      const h = Math.max(1, Math.round(side / aspect));
      if (Math.abs(w - this.overlayW) > 2 || Math.abs(h - this.overlayH) > 2) {
        this.overlayW = w;
        this.overlayH = h;
        const style = this.dom.overlay.style;
        style.width = `${w}px`;
        style.height = `${h}px`;
        style.setProperty('--ts-scale', (h / OVERLAY_BASE).toFixed(3));
      }
      // quad is bl, br, tr, tl -> map element rect TL,TR,BR,BL onto tl, tr, br, bl
      const src = [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];
      const dst = [this.quad[3], this.quad[2], this.quad[1], this.quad[0]];
      this.dom.overlay.style.transform = homographyToMatrix3d(computeHomography(src, dst));
    }
    this.syncOverlay();
    this.tickDriftCheck();
  }

  /** Show the projection-booth controls modal. */
  openControls() {
    if (!this.dom?.controlsDialog) return;
    this.renderControls();
    if (!this.dom.controlsDialog.open) this.dom.controlsDialog.showModal();
  }

  // --- Cinema view (seated watching) ---

  /** Whether the big-stage cinema layout is active. */
  isWatching() {
    return !!this.watching;
  }

  /**
   * Enter/leave cinema view: the video leaves the projected in-world quad
   * and reflows into a large stage with the town chat docked beside it;
   * the game HUD hides under body.theater-watching. Playback, the shared
   * clock, and drift checks are untouched — only the homography write
   * pauses while watching.
   */
  setWatchMode(on) {
    if (typeof document === 'undefined') return;
    const next = !!on;
    if (next === this.watching) return;
    this.watching = next;
    document.body.classList.toggle('theater-watching', this.watching);
    // Mode changes hand the keyboard back to the game: a focused chat input
    // would otherwise swallow E/WASD and leave the player feeling stuck.
    if (document.activeElement?.id === 'chat-input') document.activeElement.blur();
    if (this.dom?.overlay) {
      if (this.watching) {
        this.dom.overlay.style.transform = '';
        // Hand sizing back to the cinema-stage CSS: inline width/height from
        // the projected-quad fitting would override it.
        this.dom.overlay.style.width = '';
        this.dom.overlay.style.height = '';
        this.dom.overlay.style.removeProperty('--ts-scale');
      } else {
        this.dom.overlay.style.aspectRatio = '';
      }
    }
    if (this.watching) this.dockChatForWatch();
    this.updateWatchBar();
    this.syncOverlay();
  }

  /**
   * Chat lives in #chat-panel (owned by the chat feature). Dock it full
   * height beside the stage purely with the body class; nudge it open if
   * the watcher has it collapsed, and size the stage's right gutter from
   * the panel's actual width so nothing overlaps at any chat size.
   */
  dockChatForWatch() {
    const panel = document.getElementById('chat-panel');
    if (!panel) {
      document.body.style.setProperty('--theater-chat-gutter', '0px');
      return;
    }
    if (panel.classList.contains('collapsed')) {
      document.getElementById('chat-toggle')?.click();
    }
    requestAnimationFrame(() => {
      if (!this.watching) return;
      const rect = panel.getBoundingClientRect();
      const gutter = rect.width > 0 ? Math.ceil(rect.width + Math.max(0, window.innerWidth - rect.right)) : 0;
      document.body.style.setProperty('--theater-chat-gutter', `${gutter}px`);
    });
  }

  buildWatchBar() {
    const bar = document.createElement('div');
    bar.id = 'theater-watchbar';
    bar.hidden = true;
    bar.innerHTML = `
      <span class="theater-watchbar-title" id="theater-watchbar-title">The Orpheum</span>
      <span class="theater-watchbar-state micro" id="theater-watchbar-state"></span>
      <button type="button" id="theater-watchbar-controls" title="Open the projection booth (G)">▣ Booth</button>
      <button type="button" id="theater-watchbar-leave" title="Stand up and return to the game (Esc)">⤺ Stand up</button>
    `;
    document.body.append(bar);
    bar.querySelector('#theater-watchbar-controls').addEventListener('click', () => this.openControls());
    // Standing up is one action: leave cinema view AND get out of the chair.
    bar.querySelector('#theater-watchbar-leave').addEventListener('click', () => {
      this.onStandUpRequest?.();
      this.setWatchMode(false);
    });
    this.watchbar = bar;
    this.watchbarTitle = bar.querySelector('#theater-watchbar-title');
    this.watchbarState = bar.querySelector('#theater-watchbar-state');
  }

  updateWatchBar() {
    if (!this.watchbar) return;
    this.watchbar.hidden = !this.watching;
    if (!this.watching) return;
    const now = this.state?.now;
    this.watchbarTitle.textContent = now ? `Now playing · ${now.title}` : 'The Orpheum · the screen sleeps';
    this.watchbarState.textContent = now ? (now.playing ? '▶' : '⏸') : '';
    const leaveBtn = this.watchbar.querySelector('#theater-watchbar-leave');
    if (leaveBtn) {
      leaveBtn.textContent = this.seatedInWorld ? '⤺ Stand up' : '⤺ Back to the world';
      leaveBtn.title = this.seatedInWorld
        ? 'Stand up and return to the game (Esc)'
        : 'Step out of the cinema view and walk the aisles (Esc)';
    }
  }

  /**
   * Whether the local player is sitting. Only affects the watch bar's leave
   * action label; exiting cinema view itself never moves the actor.
   */
  setSeated(seated) {
    this.seatedInWorld = !!seated;
    if (this.watching) this.updateWatchBar();
  }

  /** Show the IPTV channel guide modal. */
  openGuide() {
    if (!this.dom?.guideDialog) return;
    this.renderGuide();
    if (!this.dom.guideDialog.open) this.dom.guideDialog.showModal();
    // Keep "now" honest while the guide sits open: refresh schedules on
    // open and on an interval until the dialog closes.
    this.requestEpgSchedule();
    this.startEpgRefresh();
  }

  // --- Shared clock ---

  /** Position (seconds) the whole room should be showing at `nowMs`. */
  targetPosition(nowMs = Date.now()) {
    if (!this.state?.now) return 0;
    return effectivePositionSec(this.state.now, nowMs + this.serverDelta);
  }

  tickDriftCheck() {
    const now = this.state?.now;
    if (!this.roomActive || !now || !this.engine || this.engine.degraded || !this.engine.ready) return;
    const ts = Date.now();
    if (ts - this.lastDriftCheckMs < DRIFT_CHECK_INTERVAL_MS) return;
    this.lastDriftCheckMs = ts;
    this.enforceSync();
  }

  /**
   * Local-only correction: seek when |engineTime - target| > 1.5s and apply
   * play/pause to match the shared state. NEVER sends network messages —
   * corrections must not feed back into shared state.
   */
  enforceSync() {
    if (!this.engine || this.engine.degraded || !this.engine.ready) return;
    const now = this.state?.now;
    if (!now) return;
    const t = this.engine.getTime ? this.engine.getTime() : null;
    const target = this.targetPosition();
    if (
      Number.isFinite(t) && Number.isFinite(target)
      && Math.abs(t - target) > SYNC_SEEK_THRESHOLD_SEC
      && now.kind !== 'hls' // live streams chase their own edge; don't yank them
    ) {
      this.engine.seek(Math.max(0, target));
    }
    if (now.playing) {
      if (!this.awaitingGesture) this.engine.play();
    } else {
      this.engine.pause();
    }
  }

  // --- Engines ---

  teardownEngine() {
    const engine = this.engine;
    this.engine = null;
    this.awaitingGesture = false;
    this.hideGestureBadge();
    if (engine) {
      try {
        engine.destroy?.();
      } catch {}
    }
    if (this.dom?.mediaHost) this.dom.mediaHost.innerHTML = '';
  }

  /** Load this.state.now into a fresh engine, starting near the shared target. */
  loadCurrent() {
    const now = this.state?.now;
    if (!now || !this.dom) return;
    const token = ++this.loadToken;
    this.teardownEngine();
    this.loadedItemId = now.id;
    this.errorTitle = null;
    this.setOverlayState('loading');
    switch (now.kind) {
      case 'file':
        this.startFileEngine(now, token, false);
        break;
      case 'hls':
        this.startFileEngine(now, token, true);
        break;
      case 'torrent':
        // Same <video> engine, but the bytes come from the game server's
        // Range-capable torrent endpoint; the shared clock is unchanged.
        this.startFileEngine(now, token, false);
        break;
      case 'youtube':
        this.startYouTubeEngine(now, token);
        break;
      case 'vimeo':
        this.startVimeoEngine(now, token);
        break;
      default:
        this.failItem();
    }
  }

  /** Direct <video> for file items; the same element powers HLS. */
  startFileEngine(item, token, isHls) {
    const video = document.createElement('video');
    video.autoplay = true;
    video.setAttribute('playsinline', '');
    video.preload = 'auto';
    video.volume = this.volume;
    // Deliberately NO crossOrigin attribute: most stream/file hosts send no
    // CORS headers and setting it would make playback fail outright.
    this.dom.mediaHost.append(video);

    const engine = {
      kind: item.kind,
      video,
      hls: null,
      degraded: false,
      ready: false,
      getTime: () => (Number.isFinite(video.currentTime) ? video.currentTime : null),
      seek: (sec) => {
        try {
          video.currentTime = sec;
        } catch {}
      },
      play: () => {
        if (video.paused) this.playVideoElement(video);
      },
      pause: () => {
        if (!video.paused) video.pause();
      },
      setVolume: (v) => {
        video.volume = v;
      },
      destroy: () => {
        if (engine.hls) {
          try {
            engine.hls.destroy();
          } catch {}
          engine.hls = null;
        }
        try {
          video.pause();
        } catch {}
        try {
          video.removeAttribute('src');
          video.load();
        } catch {}
      },
    };
    this.engine = engine;

    video.addEventListener('playing', () => {
      if (this.engine !== engine) return;
      this.hideGestureBadge();
      this.setOverlayState('playing');
    });
    video.addEventListener('waiting', () => {
      if (this.engine === engine && this.overlayState === 'playing') this.setOverlayState('loading');
    });
    video.addEventListener('ended', () => this.reportEnded());
    video.addEventListener('error', () => {
      if (this.engine === engine) this.failItem();
    });

    const begin = () => {
      if (this.engine !== engine || token !== this.loadToken) return;
      engine.ready = true;
      const target = this.targetPosition();
      if (target > 0.5 && item.kind !== 'hls') engine.seek(target);
      if (this.state?.now?.playing !== false) this.playVideoElement(video);
      else engine.pause();
    };
    if (video.readyState >= 1) begin();
    else video.addEventListener('loadedmetadata', begin, { once: true });

    if (isHls) this.attachHls(video, item, engine, token);
    else video.src = item.kind === 'torrent' ? this.torrentStreamUrl(item) : item.url;
  }

  /** Lazy-import hls.js; fall back to native HLS (Safari) without it. */
  async attachHls(video, item, engine, token) {
    let Hls = null;
    try {
      const mod = await import('hls.js');
      Hls = mod?.default ?? mod;
    } catch (err) {
      console.warn('theater: hls.js unavailable, trying native HLS playback', err);
    }
    if (this.engine !== engine || token !== this.loadToken) return;

    if (Hls && typeof Hls.isSupported === 'function' && Hls.isSupported()) {
      const hls = new Hls();
      engine.hls = hls;
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data?.fatal || this.engine !== engine) return;
        try {
          hls.destroy();
        } catch {}
        if (engine.hls === hls) engine.hls = null;
        this.failItem();
      });
      hls.loadSource(item.url);
      hls.attachMedia(video);
    } else {
      video.src = item.url; // native HLS (Safari) — or the failure path
    }
  }

  async startYouTubeEngine(item, token) {
    let YT = null;
    try {
      YT = await ensureYouTubeApi();
    } catch (err) {
      console.warn('theater: YouTube API unavailable', err);
      if (token === this.loadToken) this.failItem();
      return;
    }
    if (token !== this.loadToken) return;

    const mount = document.createElement('div');
    this.dom.mediaHost.append(mount);
    const engine = {
      kind: 'youtube',
      player: null,
      mount,
      degraded: false,
      ready: false,
      unstartedTimer: null,
    };
    this.engine = engine;

    const getState = () => {
      try {
        return engine.player?.getPlayerState?.();
      } catch {
        return null;
      }
    };

    let player;
    try {
      player = new YT.Player(mount, {
        width: '100%',
        height: '100%',
        videoId: item.videoId,
        playerVars: { autoplay: 1, playsinline: 1, controls: 0, rel: 0, disablekb: 1 },
        events: {
          onReady: () => {
            if (this.engine !== engine || token !== this.loadToken) return;
            engine.ready = true;
            engine.player = player;
            try {
              player.setVolume(Math.round(this.volume * 100));
            } catch {}
            const target = this.targetPosition();
            if (target > 0.5) {
              try {
                player.seekTo(target, true);
              } catch {}
            }
            if (this.state?.now?.playing !== false) {
              try {
                player.playVideo();
              } catch {}
            }
            // Autoplay-block watchdog: if still unstarted ~3s after ready,
            // surface the tap-to-start badge.
            engine.unstartedTimer = setTimeout(() => {
              engine.unstartedTimer = null;
              if (this.engine !== engine) return;
              const st = getState();
              const wanted = this.state?.now?.playing !== false;
              if (wanted && (st === -1 || st === 5)) this.showGestureBadge();
            }, YT_UNSTARTED_GRACE_MS);
          },
          onStateChange: (e) => {
            if (this.engine !== engine) return;
            const st = e?.data;
            if (st === 1) {
              // PLAYING
              this.hideGestureBadge();
              this.setOverlayState('playing');
            } else if (st === 0) {
              // ENDED
              this.reportEnded();
            }
          },
          onError: () => {
            if (this.engine === engine) this.failItem();
          },
        },
      });
    } catch (err) {
      console.warn('theater: YouTube player creation failed', err);
      if (token === this.loadToken) this.failItem();
      return;
    }

    engine.player = player;
    engine.getTime = () => {
      try {
        const t = player.getCurrentTime?.();
        return Number.isFinite(t) ? t : null;
      } catch {
        return null;
      }
    };
    engine.seek = (sec) => {
      try {
        player.seekTo(sec, true);
      } catch {}
    };
    engine.play = () => {
      try {
        player.playVideo();
      } catch {}
    };
    engine.pause = () => {
      try {
        player.pauseVideo();
      } catch {}
    };
    engine.setVolume = (v) => {
      try {
        player.setVolume(Math.round(v * 100));
      } catch {}
    };
    engine.destroy = () => {
      if (engine.unstartedTimer) {
        clearTimeout(engine.unstartedTimer);
        engine.unstartedTimer = null;
      }
      try {
        player.destroy?.();
      } catch {}
    };
  }

  async startVimeoEngine(item, token) {
    const iframe = document.createElement('iframe');
    iframe.src = buildEmbedUrl('vimeo', item.videoId) || item.url;
    iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
    iframe.setAttribute('allowfullscreen', '');
    this.dom.mediaHost.append(iframe);

    // Degraded by default: even without the SDK the iframe autoplays; we
    // just cannot sync it (no seeks, no drift corrections, no clock).
    const engine = {
      kind: 'vimeo',
      iframe,
      player: null,
      degraded: true,
      ready: true,
      time: null,
      getTime: () => (engine.degraded ? null : engine.time),
      seek: (sec) => {
        try {
          engine.player?.setCurrentTime?.(sec);
        } catch {}
      },
      play: () => {
        try {
          engine.player?.play?.();
        } catch {}
      },
      pause: () => {
        try {
          engine.player?.pause?.();
        } catch {}
      },
      setVolume: (v) => {
        try {
          engine.player?.setVolume?.(v);
        } catch {}
      },
      destroy: () => {
        try {
          engine.player?.destroy?.();
        } catch {}
      },
    };
    this.engine = engine;
    this.setOverlayState('loading');

    try {
      const Vimeo = await ensureVimeoSdk();
      if (this.engine !== engine || token !== this.loadToken) return;
      const player = new Vimeo.Player(iframe);
      engine.player = player;
      engine.degraded = false;
      player.on('playing', () => {
        if (this.engine !== engine) return;
        this.hideGestureBadge();
        this.setOverlayState('playing');
      });
      player.on('timeupdate', (data) => {
        if (this.engine !== engine) return;
        engine.time = Number.isFinite(data?.seconds) ? data.seconds : engine.time;
      });
      player.on('ended', () => this.reportEnded());
      player.on('error', () => {
        if (this.engine === engine) this.failItem();
      });
      const target = this.targetPosition();
      if (target > 0.5) {
        try {
          await player.setCurrentTime(target);
        } catch {}
      }
      try {
        await player.setVolume(this.volume);
      } catch {}
      try {
        await player.play();
      } catch {
        this.showGestureBadge();
      }
    } catch (err) {
      // SDK failed to load: leave the iframe (it autoplays) with degraded
      // sync — do not crash, do not fail the item.
      console.warn('theater: Vimeo SDK unavailable, iframe runs unsynced', err);
      engine.degraded = true;
    }
  }

  playVideoElement(video) {
    try {
      const p = video.play();
      if (p && typeof p.catch === 'function') {
        p.catch((err) => {
          if (this.engine?.video !== video) return; // stale load, ignore
          console.warn('theater: autoplay blocked', err?.name || err);
          this.showGestureBadge();
        });
      }
    } catch {
      this.showGestureBadge();
    }
  }

  // --- Overlay state / captions / gesture badge ---

  setOverlayState(next) {
    this.overlayState = next;
    const overlay = this.dom?.overlay;
    if (!overlay) return;
    overlay.classList.remove('ts-state-idle', 'ts-state-loading', 'ts-state-playing', 'ts-state-error');
    overlay.classList.add(`ts-state-${next}`);
    this.renderCaption();
  }

  renderCaption() {
    const el = this.dom?.caption;
    if (!el) return;
    const now = this.state?.now;
    let text = '';
    if (this.overlayState === 'idle') {
      text = 'The screen sleeps — open the Screen controls to queue something';
    } else if (this.overlayState === 'loading') {
      const waiting = now?.kind === 'torrent' ? this.torrentStatusText(now.infohash) : '';
      text = waiting
        ? `${waiting} — ${now.title}`
        : now ? `Warming up the projector… ${now.title}` : 'Warming up the projector…';
    } else if (this.overlayState === 'error') {
      text = `Couldn't play: ${this.errorTitle || now?.title || 'unknown item'}`;
    } else {
      text = now ? now.title : '';
    }
    el.textContent = text;
  }

  syncOverlay() {
    const overlay = this.dom?.overlay;
    if (!overlay) return;
    overlay.classList.toggle('ts-hidden', !(this.roomActive && (!!this.quad || this.watching)));
  }

  showGestureBadge() {
    this.awaitingGesture = true;
    if (this.dom?.playBadge) this.dom.playBadge.hidden = false;
  }

  hideGestureBadge() {
    this.awaitingGesture = false;
    if (this.dom?.playBadge) this.dom.playBadge.hidden = true;
  }

  resumeFromGesture() {
    this.hideGestureBadge();
    const engine = this.engine;
    if (!engine) return;
    if (engine.video) this.playVideoElement(engine.video);
    else engine.play?.();
  }

  // --- ended / failed reporting (exactly once per item id) ---

  reportEnded() {
    this.sendItemReport('ended');
  }

  failItem() {
    const now = this.state?.now;
    this.errorTitle = now?.title || 'the current item';
    this.teardownEngine();
    this.setOverlayState('error');
    this.sendItemReport('failed');
  }

  sendItemReport(op) {
    const id = this.state?.now?.id;
    if (!id || this.reportedForId === id) return;
    this.reportedForId = id;
    this.sendControl({ op, itemId: id });
  }

  // --- Network wrappers (use the net client's helpers when present) ---

  sendControl(payload) {
    if (typeof this.net?.sendTheaterControl === 'function') this.net.sendTheaterControl(payload);
    else this.net?.send?.(MSG_TYPES.THEATER_CONTROL, payload);
  }

  sendQueue(payload) {
    if (typeof this.net?.sendTheaterQueue === 'function') this.net.sendTheaterQueue(payload);
    else this.net?.send?.(MSG_TYPES.THEATER_QUEUE, payload);
  }

  sendChannel(url, title) {
    if (typeof this.net?.sendTheaterChannel === 'function') this.net.sendTheaterChannel(url, title);
    else this.net?.send?.(MSG_TYPES.THEATER_CHANNEL, { url, title });
  }

  // --- DOM construction ---

  buildOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'theater-screen';
    overlay.className = 'ts-hidden ts-state-idle';
    overlay.innerHTML = `
      <div class="ts-media"></div>
      <div class="ts-state-layer"></div>
      <div class="ts-caption"><span class="ts-caption-text"></span></div>
      <button type="button" class="ts-play-badge" hidden>▶ Tap to start</button>
    `;
    this.dom.overlay = overlay;
    this.dom.mediaHost = overlay.querySelector('.ts-media');
    this.dom.caption = overlay.querySelector('.ts-caption-text');
    this.dom.playBadge = overlay.querySelector('.ts-play-badge');
    this.dom.playBadge.addEventListener('click', () => this.resumeFromGesture());
    document.body.append(overlay);
  }

  buildControlsButton() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'theater-controls-btn';
    btn.textContent = '▣ Screen';
    btn.title = 'Screen controls (G)';
    btn.hidden = true;
    btn.addEventListener('click', () => this.openControls());
    const host = document.querySelector('footer .actions') || document.body;
    host.append(btn);
    this.dom.controlsBtn = btn;
  }

  buildDialogs() {
    this.buildControlsDialog();
    this.buildGuideDialog();
    this.buildTorrentDialog();
    this.buildPlaylistDialogs();
  }

  buildControlsDialog() {
    const dialog = document.createElement('dialog');
    dialog.id = 'theater-dialog';
    dialog.className = 'game-modal';
    dialog.innerHTML = `
      <div class="micro modal-header-tag">THE ORPHEUM · PROJECTION BOOTH</div>
      <h2>Screen Controls</h2>
      <p class="modal-sub">Anyone in the auditorium may run the projector — everyone watching sees the same thing at the same time.</p>

      <div class="panel theater-now-panel" id="theater-now-panel"></div>

      <label class="micro" for="theater-url-input">ADD BY URL (YOUTUBE · PLAYLIST · VIMEO · .MP4 · .M3U8 · MAGNET)</label>
      <div class="theater-add-row">
        <input type="text" id="theater-url-input" maxlength="${THEATER_LIMITS.URL_MAX}"
          placeholder="Paste a video, stream, or magnet link…" autocomplete="off" spellcheck="false">
        <button type="button" id="theater-btn-add" class="btn-secondary">Add to queue</button>
        <button type="button" id="theater-btn-play-url" class="action-btn">Play now</button>
      </div>
      <p class="theater-status-line" id="theater-add-status" hidden></p>

      <div class="micro theater-section-label">UP NEXT</div>
      <div id="theater-queue-list" class="theater-queue-list"></div>

      <div class="theater-transport">
        <button type="button" id="theater-btn-toggle" class="btn-secondary">Pause</button>
        <button type="button" id="theater-btn-skip" class="btn-secondary">Skip ▸</button>
        <button type="button" id="theater-btn-back" class="btn-secondary">↺ −30s</button>
        <button type="button" id="theater-btn-fwd" class="btn-secondary">+30s ↻</button>
        <button type="button" id="theater-btn-clear" class="btn-secondary">Clear</button>
      </div>

      <div class="theater-volume-row">
        <label class="micro" for="theater-volume">VOLUME · LOCAL ONLY</label>
        <input type="range" id="theater-volume" min="0" max="100" value="100">
      </div>

      <div class="iptv-section">
        <div class="micro modal-header-tag">IPTV &amp; CHANNELS</div>
        <p class="theater-iptv-intro micro">Playlists added here are filed in the theater's shared library — everyone in the auditorium can browse the guide, tune, and flip, with no import of their own.</p>
        <div class="theater-iptv-saved">
          <select id="theater-iptv-select" aria-label="Channel lists"></select>
          <button type="button" id="theater-btn-open-guide" class="action-btn">Open guide</button>
          <button type="button" id="theater-btn-push-list" class="btn-secondary" hidden>Add to theater</button>
          <button type="button" id="theater-btn-delete-list" class="btn-secondary">Remove list</button>
        </div>
        <div class="theater-iptv-flip">
          <button type="button" id="theater-btn-prev" class="btn-secondary">◂ Prev</button>
          <span id="theater-iptv-current" class="theater-current-channel">No channel tuned</span>
          <button type="button" id="theater-btn-next" class="btn-secondary">Next ▸</button>
        </div>
        <div class="theater-iptv-imports">
          <div class="theater-iptv-import">
            <label class="micro" for="theater-iptv-paste">PASTE PLAYLIST TEXT</label>
            <textarea id="theater-iptv-paste" rows="4" placeholder="#EXTM3U&#10;#EXTINF:-1 tvg-name=&quot;…&quot; group-title=&quot;News&quot;,Channel&#10;https://…"></textarea>
            <button type="button" id="theater-btn-import-paste" class="btn-secondary">Import</button>
          </div>
          <div class="theater-iptv-import">
            <label class="micro" for="theater-iptv-file">UPLOAD .M3U / .M3U8 / .TXT</label>
            <input type="file" id="theater-iptv-file" accept=".m3u,.m3u8,.txt">
            <label class="micro" for="theater-iptv-url">…OR FETCH A PLAYLIST URL</label>
            <input type="text" id="theater-iptv-url" placeholder="http://example.com/playlist.m3u8" autocomplete="off" spellcheck="false">
            <button type="button" id="theater-btn-import-url" class="btn-secondary">Fetch</button>
          </div>
          <div class="theater-iptv-import">
            <label class="micro" for="theater-epg-file">PROGRAM GUIDE · .EPG / .XML (XMLTV, PLAIN OR .GZ)</label>
            <input type="file" id="theater-epg-file" accept=".epg,.xml,.xmltv,.gz">
            <p class="micro theater-epg-hint">A guide gives the whole room “now / next” in the channel guide. Uploading a new guide replaces the current one and never interrupts the screen.</p>
          </div>
        </div>
        <p class="theater-status-line" id="theater-iptv-status" hidden></p>
        <p class="theater-status-line" id="theater-epg-status" hidden></p>
      </div>

      <div class="modal-footer">
        <button type="button" id="close-theater-dialog" class="btn-secondary">Leave the booth →</button>
      </div>
    `;
    document.body.append(dialog);
    dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      dialog.close();
    });

    this.dom.controlsDialog = dialog;
    this.dom.nowPanel = dialog.querySelector('#theater-now-panel');
    this.dom.urlInput = dialog.querySelector('#theater-url-input');
    this.dom.addStatus = dialog.querySelector('#theater-add-status');
    this.dom.queueList = dialog.querySelector('#theater-queue-list');
    this.dom.btnToggle = dialog.querySelector('#theater-btn-toggle');
    this.dom.btnSkip = dialog.querySelector('#theater-btn-skip');
    this.dom.btnBack = dialog.querySelector('#theater-btn-back');
    this.dom.btnFwd = dialog.querySelector('#theater-btn-fwd');
    this.dom.btnClear = dialog.querySelector('#theater-btn-clear');
    this.dom.volumeInput = dialog.querySelector('#theater-volume');
    this.dom.iptvSelect = dialog.querySelector('#theater-iptv-select');
    this.dom.iptvCurrent = dialog.querySelector('#theater-iptv-current');
    this.dom.iptvStatus = dialog.querySelector('#theater-iptv-status');
    this.dom.iptvPush = dialog.querySelector('#theater-btn-push-list');
    this.dom.iptvPaste = dialog.querySelector('#theater-iptv-paste');
    this.dom.iptvFile = dialog.querySelector('#theater-iptv-file');
    this.dom.iptvUrl = dialog.querySelector('#theater-iptv-url');
    this.dom.epgFile = dialog.querySelector('#theater-epg-file');
    this.dom.epgStatus = dialog.querySelector('#theater-epg-status');

    dialog.querySelector('#close-theater-dialog').addEventListener('click', () => dialog.close());

    dialog.querySelector('#theater-btn-add').addEventListener('click', () => this.onAddClicked(false));
    dialog.querySelector('#theater-btn-play-url').addEventListener('click', () => this.onAddClicked(true));
    this.dom.urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.onAddClicked(false);
      }
    });
    // Live recognition: pasting a playlist link tells the player what Add
    // will do before they press it.
    this.dom.urlInput.addEventListener('input', () => this.recognizeAddInput());

    this.dom.btnToggle.addEventListener('click', () => {
      const now = this.state?.now;
      if (!now) return;
      this.sendControl(now.playing ? { op: 'pause', itemId: now.id } : { op: 'resume', itemId: now.id });
    });
    this.dom.btnSkip.addEventListener('click', () => this.sendQueue({ op: 'skip' }));
    this.dom.btnBack.addEventListener('click', () => this.nudgeSeek(-30));
    this.dom.btnFwd.addEventListener('click', () => this.nudgeSeek(30));
    this.dom.btnClear.addEventListener('click', () => this.sendQueue({ op: 'clear' }));

    this.dom.volumeInput.addEventListener('input', () => {
      const pct = Number(this.dom.volumeInput.value);
      this.volume = Number.isFinite(pct) ? Math.min(1, Math.max(0, pct / 100)) : 1;
      this.engine?.setVolume?.(this.volume); // LOCAL only — never sent
    });

    this.dom.iptvSelect.addEventListener('change', () => {
      this.activeListId = this.dom.iptvSelect.value || null;
      this.activeChannelIndex = -1;
      this.renderIptvSection();
    });
    dialog.querySelector('#theater-btn-open-guide').addEventListener('click', () => this.openGuide());
    dialog.querySelector('#theater-btn-delete-list').addEventListener('click', () => this.deleteActiveList());
    this.dom.iptvPush.addEventListener('click', () => this.pushActivePersonalList());
    dialog.querySelector('#theater-btn-prev').addEventListener('click', () => this.flipChannel(-1));
    dialog.querySelector('#theater-btn-next').addEventListener('click', () => this.flipChannel(1));
    dialog.querySelector('#theater-btn-import-paste').addEventListener('click', () => {
      this.uploadPlaylistText(this.dom.iptvPaste.value, null);
      this.dom.iptvPaste.value = '';
    });
    this.dom.iptvFile.addEventListener('change', () => {
      const file = this.dom.iptvFile.files?.[0];
      this.dom.iptvFile.value = '';
      this.importPlaylistFile(file);
    });
    dialog.querySelector('#theater-btn-import-url').addEventListener('click', () => this.importPlaylistUrl());
    this.dom.epgFile.addEventListener('change', () => {
      const file = this.dom.epgFile.files?.[0];
      this.dom.epgFile.value = '';
      this.uploadEpgFile(file);
    });
  }

  buildGuideDialog() {
    const dialog = document.createElement('dialog');
    dialog.id = 'theater-guide-dialog';
    dialog.className = 'game-modal game-modal--wide';
    dialog.innerHTML = `
      <div class="micro modal-header-tag">THE ORPHEUM · CHANNEL GUIDE</div>
      <h2 id="theater-guide-title">Channel Guide</h2>
      <div class="theater-guide-top">
        <button type="button" id="theater-guide-prev" class="btn-secondary">◂ Prev</button>
        <button type="button" id="theater-guide-next" class="btn-secondary">Next ▸</button>
        <span id="theater-guide-count" class="micro"></span>
      </div>
      <label class="theater-guide-country">
        <span class="micro">COUNTRY</span>
        <select id="theater-guide-country" aria-label="Filter channels by country"></select>
      </label>
      <div id="theater-guide-groups" class="theater-chip-row" hidden></div>
      <p class="micro theater-guide-epg" id="theater-guide-epg"></p>
      <div id="theater-guide-list" class="theater-guide-list"></div>
      <div class="modal-footer">
        <button type="button" id="close-theater-guide" class="btn-secondary">Close guide →</button>
      </div>
    `;
    document.body.append(dialog);
    dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      dialog.close();
    });
    dialog.addEventListener('close', () => this.stopEpgRefresh());
    this.dom.guideDialog = dialog;
    this.dom.guideTitle = dialog.querySelector('#theater-guide-title');
    this.dom.guideCount = dialog.querySelector('#theater-guide-count');
    this.dom.guideEpg = dialog.querySelector('#theater-guide-epg');
    this.dom.guideCountryRow = dialog.querySelector('.theater-guide-country');
    this.dom.guideCountrySelect = dialog.querySelector('#theater-guide-country');
    this.dom.guideGroups = dialog.querySelector('#theater-guide-groups');
    this.dom.guideList = dialog.querySelector('#theater-guide-list');
    this.dom.guideCountrySelect.addEventListener('change', () => {
      // A new country means a new set of categories: fall back to all of them.
      this.guideCountry = this.dom.guideCountrySelect.value || 'All';
      this.guideCategory = 'All';
      this.renderGuide();
    });
    dialog.querySelector('#theater-guide-prev').addEventListener('click', () => this.flipChannel(-1));
    dialog.querySelector('#theater-guide-next').addEventListener('click', () => this.flipChannel(1));
    dialog.querySelector('#close-theater-guide').addEventListener('click', () => dialog.close());
  }

  /**
   * Torrent file picker: shown after the server resolves a pasted magnet.
   * Picking starts/queues that one file for the room; cancelling leaves
   * the shared bill exactly as it was.
   */
  buildTorrentDialog() {
    const dialog = document.createElement('dialog');
    dialog.id = 'theater-torrent-dialog';
    dialog.className = 'game-modal';
    dialog.innerHTML = `
      <div class="micro modal-header-tag">THE ORPHEUM · TORRENT REEL</div>
      <h2 id="theater-torrent-name">Torrent</h2>
      <p class="modal-sub">The reel holds several films. Pick which one plays for the whole auditorium — only video files are listed.</p>
      <div id="theater-torrent-files" class="theater-torrent-files"></div>
      <div class="modal-footer">
        <button type="button" id="theater-torrent-cancel" class="btn-secondary">Never mind</button>
      </div>
    `;
    document.body.append(dialog);
    dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      this.torrentPick = null;
      dialog.close();
    });
    dialog.querySelector('#theater-torrent-cancel').addEventListener('click', () => {
      this.torrentPick = null;
      dialog.close();
    });
    this.dom.torrentDialog = dialog;
  }

  /**
   * Playlist import dialogs: the mixed-link choice ("import the playlist"
   * vs "add just this video") and the preview-and-confirm gate. Nothing is
   * shared until the confirm button; closing either dialog leaves the bill
   * exactly as it was.
   */
  buildPlaylistDialogs() {
    const choice = document.createElement('dialog');
    choice.id = 'theater-playlist-choice';
    choice.className = 'game-modal';
    choice.innerHTML = `
      <div class="micro modal-header-tag">THE ORPHEUM · PLAYLIST IMPORT</div>
      <h2>A video and a playlist</h2>
      <p class="modal-sub" id="theater-playlist-choice-sub">That link carries both a video and a playlist. Which should come to the reel?</p>
      <div class="modal-footer">
        <button type="button" id="theater-playlist-choice-import" class="btn-secondary">Import the playlist</button>
        <button type="button" id="theater-playlist-choice-video" class="btn-secondary">Add just this video</button>
      </div>
    `;
    document.body.append(choice);
    choice.addEventListener('cancel', (e) => {
      e.preventDefault();
      this.playlistChoice = null;
      choice.close();
    });
    choice.querySelector('#theater-playlist-choice-import').addEventListener('click', () => {
      const pending = this.playlistChoice;
      this.playlistChoice = null;
      choice.close();
      if (!pending) return;
      this.dom.urlInput.value = '';
      this.beginPlaylistResolve(pending.classified.listId, pending.playNow);
    });
    choice.querySelector('#theater-playlist-choice-video').addEventListener('click', () => {
      const pending = this.playlistChoice;
      this.playlistChoice = null;
      choice.close();
      if (!pending) return;
      this.dom.urlInput.value = '';
      this.addSingleVideo(pending.classified, pending.playNow);
    });
    this.dom.playlistChoiceDialog = choice;

    const dialog = document.createElement('dialog');
    dialog.id = 'theater-playlist-dialog';
    dialog.className = 'game-modal';
    dialog.innerHTML = `
      <div class="micro modal-header-tag">THE ORPHEUM · PLAYLIST IMPORT</div>
      <h2 id="theater-playlist-name">A playlist</h2>
      <p class="modal-sub" id="theater-playlist-sub"></p>
      <div id="theater-playlist-videos" class="theater-playlist-videos"></div>
      <div class="modal-footer">
        <button type="button" id="theater-playlist-confirm" class="btn-secondary">Add to the queue</button>
        <button type="button" id="theater-playlist-cancel" class="btn-secondary">Never mind</button>
      </div>
    `;
    document.body.append(dialog);
    dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      this.playlistPreview = null;
      dialog.close();
    });
    dialog.querySelector('#theater-playlist-cancel').addEventListener('click', () => {
      this.playlistPreview = null;
      dialog.close();
    });
    dialog.querySelector('#theater-playlist-confirm').addEventListener('click', () => this.confirmPlaylistImport());
    this.dom.playlistDialog = dialog;
  }

  // --- Controls dialog rendering ---

  nudgeSeek(deltaSec) {
    const now = this.state?.now;
    if (!now) return;
    const pos = Math.max(0, Math.round((this.targetPosition() + deltaSec) * 10) / 10);
    this.sendControl({ op: 'seek', positionSec: pos, itemId: now.id });
  }

  setAddStatus(text, isError = false) {
    const el = this.dom?.addStatus;
    if (!el) return;
    el.hidden = !text;
    el.textContent = text || '';
    el.classList.toggle('is-error', !!isError);
  }

  setIptvStatus(text, isError = false) {
    const el = this.dom?.iptvStatus;
    if (!el) return;
    el.hidden = !text;
    el.textContent = text || '';
    el.classList.toggle('is-error', !!isError);
  }

  setEpgStatus(text, isError = false) {
    const el = this.dom?.epgStatus;
    if (!el) return;
    el.hidden = !text;
    el.textContent = text || '';
    el.classList.toggle('is-error', !!isError);
  }

  /** Upload an XMLTV guide file (plain or .gz); a success replaces the active guide. */
  async uploadEpgFile(file) {
    if (!file) return;
    if (!this.net?.uploadEpg) {
      this.setEpgStatus('Multiplayer is offline — the theater cannot store guides right now.', true);
      return;
    }
    this.setEpgStatus('Uploading the program guide…');
    try {
      const res = await this.net.uploadEpg(file, file.name.replace(/\.(epg|xml|xmltv|gz)$/i, ''));
      const summary = res.epg || {};
      this.setEpgStatus(
        `Guide active: ${summary.name || 'Program guide'} — ${summary.channels || 0} channels with listings` +
        `${res.truncated ? ' (the file was larger than the guide shelf, so it was trimmed)' : ''}. ` +
        'Everyone in the auditorium now sees now/next in the guide.',
      );
    } catch (err) {
      this.setEpgStatus(err.message || 'Could not upload that guide.', true);
    }
  }

  // --- YouTube playlist import (resolve → preview → confirm → addMany) ---

  /** Live status-line recognition for playlist and mixed links. */
  recognizeAddInput() {
    const input = this.dom?.urlInput;
    const classified = classifySource((input?.value || '').trim());
    if (classified?.kind === 'youtubePlaylist') {
      this.setAddStatus('A YouTube playlist — Add reads it and queues its videos together.');
    } else if (classified?.kind === 'youtube' && classified.listId) {
      this.setAddStatus('A YouTube video that belongs to a playlist — Add will ask which one you want.');
    }
  }

  /**
   * Ask the server to read a public playlist. Mirrors the torrent resolve:
   * one request in flight, a grace timeout, and the answer opens the
   * preview instead of touching the shared bill.
   */
  beginPlaylistResolve(listId, playNow) {
    if (!this.net?.send) {
      this.setAddStatus('Multiplayer is offline — playlists cannot be imported right now.', true);
      return;
    }
    if (this.playlistPending) {
      this.setAddStatus(theaterErrorText('resolve_in_flight'), true);
      return;
    }
    const requestId = `plreq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const timer = setTimeout(() => {
      if (this.playlistPending?.requestId !== requestId) return;
      this.playlistPending = null;
      this.setAddStatus('That playlist took too long to read. Try again in a moment.', true);
    }, PLAYLIST_RESOLVE_TIMEOUT_MS);
    this.playlistPending = { requestId, playNow, timer };
    this.setAddStatus('Reading the playlist…');
    if (typeof this.net.sendPlaylistResolve === 'function') this.net.sendPlaylistResolve(requestId, listId);
    else this.net.send(MSG_TYPES.THEATER_PLAYLIST_RESOLVE, { requestId, listId });
  }

  /** A pending resolve is answered or abandoned; the shared bill is untouched. */
  cancelPlaylistResolve() {
    if (this.playlistPending?.timer) clearTimeout(this.playlistPending.timer);
    this.playlistPending = null;
  }

  /** The resolve reply opens the preview; stale replies are ignored. */
  applyPlaylistResolved(msg) {
    const pending = this.playlistPending;
    if (!pending || !msg || String(msg.requestId || '') !== pending.requestId) return;
    clearTimeout(pending.timer);
    this.playlistPending = null;
    if (!this.roomActive) return; // left the theater while resolving
    const videos = (Array.isArray(msg.videos) ? msg.videos : []).filter(
      (v) => v && typeof v.videoId === 'string' && /^[\w-]{6,}$/.test(v.videoId),
    );
    if (!videos.length) {
      this.setAddStatus('That playlist had no videos the projector could read.', true);
      return;
    }
    this.setAddStatus('');
    this.openPlaylistPreview(String(msg.title || 'A YouTube playlist'), videos, pending.playNow);
  }

  /** How many videos one addMany can still place (first may take the screen). */
  importCapacity() {
    if (!this.state) return THEATER_LIMITS.QUEUE_MAX;
    const free = Math.max(0, THEATER_LIMITS.QUEUE_MAX - (this.state.queue?.length || 0));
    return free + (this.state.now ? 0 : 1);
  }

  /** Preview the resolved videos; only the confirm button shares anything. */
  openPlaylistPreview(title, videos, playNow) {
    const dialog = this.dom?.playlistDialog;
    if (!dialog) return;
    this.playlistPreview = { title, videos, playNow };
    dialog.querySelector('#theater-playlist-name').textContent = title;
    const fitCount = Math.min(this.importCapacity(), videos.length);
    dialog.querySelector('#theater-playlist-sub').textContent =
      `${videos.length} video${videos.length === 1 ? '' : 's'} resolved — ` +
      (fitCount >= videos.length
        ? 'they all fit on the reel right now.'
        : `the reel can take ${fitCount} more right now; the rest would be left off.`);
    const host = dialog.querySelector('#theater-playlist-videos');
    host.innerHTML = '';
    for (const video of videos.slice(0, PLAYLIST_PREVIEW_ROWS)) {
      const row = document.createElement('div');
      row.className = 'theater-playlist-video';
      row.textContent = video.title || 'Untitled video';
      host.append(row);
    }
    if (videos.length > PLAYLIST_PREVIEW_ROWS) {
      const more = document.createElement('div');
      more.className = 'theater-playlist-video theater-playlist-more';
      more.textContent = `… and ${videos.length - PLAYLIST_PREVIEW_ROWS} more`;
      host.append(more);
    }
    const confirm = dialog.querySelector('#theater-playlist-confirm');
    confirm.textContent = fitCount > 0
      ? `Add ${fitCount} video${fitCount === 1 ? '' : 's'} to the reel`
      : 'The reel is full';
    confirm.disabled = fitCount === 0;
    if (!dialog.open) dialog.showModal();
  }

  /** Confirm the preview: one batch op, one broadcast, honest outcome. */
  confirmPlaylistImport() {
    const preview = this.playlistPreview;
    this.playlistPreview = null;
    const dialog = this.dom?.playlistDialog;
    if (dialog?.open) dialog.close();
    if (!preview?.videos?.length) return;
    const items = preview.videos.map((video) => ({
      url: `https://www.youtube.com/watch?v=${encodeURIComponent(video.videoId)}`,
      title: video.title || '',
    }));
    this.sendQueue({ op: 'addMany', items });
    this.setAddStatus(`Pinning ${items.length} videos from "${preview.title}" to the reel…`);
  }

  /** The directed import result: exactly what landed on the reel. */
  applyImportResult(msg) {
    const queued = Math.max(0, Number(msg?.queued) || 0);
    const skipped = Math.max(0, Number(msg?.skipped) || 0);
    const didNotFit = Math.max(0, Number(msg?.didNotFit) || 0);
    if (!queued && !skipped && !didNotFit) return;
    const parts = [`Queued ${queued} video${queued === 1 ? '' : 's'}`];
    if (didNotFit) parts.push(`${didNotFit} didn't fit — the reel is full`);
    if (skipped) parts.push(`${skipped} skipped`);
    this.setAddStatus(`${parts.join(' · ')}.`);
  }

  onAddClicked(playNow) {
    const input = this.dom?.urlInput;
    const url = (input?.value || '').trim();
    const classified = classifySource(url);
    if (!classified) {
      this.setAddStatus(theaterErrorText('invalid_url'), true);
      return;
    }
    if (classified.kind === 'torrent') {
      // Magnets never go straight to the bill: resolve first, then the
      // paster picks the file (torrents often carry several videos).
      input.value = '';
      this.beginTorrentResolve(classified.url, playNow);
      return;
    }
    if (classified.kind === 'youtubePlaylist') {
      // Playlists are imported, not queued: resolve, preview, confirm.
      input.value = '';
      this.beginPlaylistResolve(classified.listId, playNow);
      return;
    }
    if (classified.kind === 'youtube' && classified.listId) {
      // Video + playlist in one link: ask which one is wanted (input kept
      // until the choice so it survives a dismissed dialog).
      this.openPlaylistChoice(classified, playNow);
      return;
    }
    this.addSingleVideo(classified, playNow);
    input.value = '';
  }

  /** The mixed-link chooser: import the whole playlist or play just the video. */
  openPlaylistChoice(classified, playNow) {
    const dialog = this.dom?.playlistChoiceDialog;
    if (!dialog) return;
    this.playlistChoice = { classified, playNow };
    if (!dialog.open) dialog.showModal();
  }

  /** Plain single-video path shared by the input and the mixed-link choice. */
  addSingleVideo(classified, playNow) {
    this.setAddStatus('');
    if (playNow) {
      // Start this URL on the shared screen right now, replacing whatever
      // is playing (theater_channel is the immediate-start op).
      this.sendChannel(classified.url, defaultTitle(classified.kind));
    } else {
      this.sendQueue({ op: 'add', url: classified.url });
    }
  }

  // --- Torrent streaming (magnet → resolve → pick → shared bill) ---

  /** Game-server URL of a torrent item's stream endpoint (Range-capable). */
  torrentStreamUrl(item) {
    const base = typeof this.net?.apiBase === 'string' ? this.net.apiBase.replace(/\/+$/, '') : '';
    return `${base}/api/theater/torrent/${item.infohash}/${item.fileIndex}`;
  }

  beginTorrentResolve(magnet, playNow) {
    if (!this.net?.send) {
      this.setAddStatus('Multiplayer is offline — the torrent reel is unreachable.', true);
      return;
    }
    if (this.torrentPending) {
      this.setAddStatus('Hold on — one torrent is still being looked up.', true);
      return;
    }
    const requestId = `treq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const timer = setTimeout(() => {
      if (this.torrentPending?.requestId !== requestId) return;
      this.torrentPending = null;
      this.setAddStatus(torrentErrorText('resolve_timeout'), true);
    }, TORRENT_LIMITS.RESOLVE_TIMEOUT_MS + 5000); // grace over the server's own timeout
    this.torrentPending = { requestId, magnet, playNow, timer };
    this.setAddStatus('Reaching the swarm for that torrent…');
    if (typeof this.net.sendTorrentResolve === 'function') this.net.sendTorrentResolve(requestId, magnet);
    else this.net.send(MSG_TYPES.TORRENT_RESOLVE, { requestId, magnet });
  }

  /** A pending resolve is answered or abandoned; the shared bill is untouched. */
  cancelTorrentResolve() {
    if (this.torrentPending?.timer) clearTimeout(this.torrentPending.timer);
    this.torrentPending = null;
  }

  applyTorrentFiles(msg) {
    const pending = this.torrentPending;
    if (!pending || !msg || String(msg.requestId || '') !== pending.requestId) return;
    clearTimeout(pending.timer);
    this.torrentPending = null;
    if (!this.roomActive) return; // left the theater while resolving
    const files = Array.isArray(msg.files) ? msg.files : [];
    if (!files.length) {
      this.setAddStatus('That torrent has no video files the projector can play.', true);
      return;
    }
    this.setAddStatus('');
    this.openTorrentPicker(String(msg.name || 'Unnamed torrent'), files, pending.magnet, pending.playNow);
  }

  /** Show the resolved file list; nothing is shared until a file is picked. */
  openTorrentPicker(name, files, magnet, playNow) {
    const dialog = this.dom?.torrentDialog;
    if (!dialog) return;
    this.torrentPick = { magnet, name, playNow };
    dialog.querySelector('#theater-torrent-name').textContent = name;
    const host = dialog.querySelector('#theater-torrent-files');
    host.innerHTML = '';
    for (const file of files) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'theater-torrent-file';
      const label = document.createElement('span');
      label.className = 'theater-torrent-file-path';
      label.textContent = file.path;
      const meta = document.createElement('span');
      meta.className = 'theater-torrent-file-meta';
      meta.textContent = this.formatBytes(file.bytes);
      if (!file.playable) {
        const tag = document.createElement('span');
        tag.className = 'theater-kind-tag';
        tag.textContent = 'may not play';
        meta.append(' · ', tag);
      }
      row.append(label, meta);
      row.addEventListener('click', () => {
        dialog.close();
        this.sendTorrentPick(file);
      });
      host.append(row);
    }
    if (!dialog.open) dialog.showModal();
  }

  /** Push the picked file onto the shared bill (queue, or play immediately). */
  sendTorrentPick(file) {
    const pick = this.torrentPick;
    this.torrentPick = null;
    if (!pick) return;
    const payload = {
      url: pick.magnet,
      title: torrentTitle(pick.name, file.path),
      torrentName: pick.name,
      fileIndex: file.index,
      filePath: file.path,
      fileBytes: file.bytes,
    };
    if (pick.playNow) {
      // theater_channel is the immediate-start op; it carries pick fields.
      this.net?.send?.(MSG_TYPES.THEATER_CHANNEL, payload);
      this.setAddStatus(`Starting “${payload.title}” on the screen…`);
    } else {
      this.sendQueue({ op: 'add', ...payload });
      this.setAddStatus(`“${payload.title}” is on the reel — it starts for everyone.`);
    }
  }

  /** Swarm status text for a torrent item, or '' when nothing fresh is known. */
  torrentStatusText(infohash) {
    const status = this.torrentStatuses.get(infohash);
    if (!status) return '';
    if (status.ready && status.progress >= 1) return '';
    if (!status.ready) {
      return status.peers > 0 || status.progress > 0
        ? `Fetching reels… ${Math.round(status.progress * 100)}% · ${status.peers} peer${status.peers === 1 ? '' : 's'}`
        : 'Reaching the swarm…';
    }
    return `Downloading… ${Math.round(status.progress * 100)}% · ${status.peers} peer${status.peers === 1 ? '' : 's'}`;
  }

  applyTorrentStatus(msg) {
    const items = Array.isArray(msg?.items) ? msg.items : [];
    if (items.length) {
      // Rebuild from the latest broadcast so stale entries expire.
      const fresh = new Map();
      for (const raw of items) {
        const status = normalizeTorrentStatus(raw);
        if (status) fresh.set(status.infohash, status);
      }
      this.torrentStatuses = fresh;
    }
    // Keep the loading caption live while a torrent warms up.
    const now = this.state?.now;
    if (now?.kind === 'torrent' && this.overlayState === 'loading') this.renderCaption();
    if (this.dom?.controlsDialog?.open) this.renderControls();
  }

  formatBytes(bytes) {
    const n = Number(bytes);
    if (!Number.isFinite(n) || n <= 0) return 'unknown size';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = n;
    let unit = 0;
    while (value >= 1000 && unit < units.length - 1) {
      value /= 1000;
      unit += 1;
    }
    return `${value >= 100 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
  }

  renderControls() {
    if (!this.dom?.controlsDialog) return;
    const now = this.state?.now;
    const queue = this.state?.queue || [];

    // Now playing
    const panel = this.dom.nowPanel;
    panel.innerHTML = '';
    if (now) {
      const head = document.createElement('div');
      head.className = 'theater-now-head';
      const title = document.createElement('strong');
      title.className = 'theater-now-title';
      title.textContent = now.title || 'Untitled';
      const tag = document.createElement('span');
      tag.className = 'theater-kind-tag';
      tag.textContent = KIND_LABELS[now.kind] || now.kind || 'media';
      const badge = document.createElement('span');
      badge.className = `theater-badge ${now.playing ? 'is-playing' : 'is-paused'}`;
      badge.textContent = now.playing ? '▶ PLAYING' : '❚❚ PAUSED';
      head.append(title, tag, badge);
      const by = document.createElement('div');
      by.className = 'micro theater-now-by';
      by.textContent = `queued/changed by ${now.queuedBy || now.by || 'Someone'}`;
      panel.append(head, by);
      if (now.kind === 'torrent') {
        const status = this.torrentStatusText(now.infohash);
        if (status) {
          const line = document.createElement('div');
          line.className = 'micro theater-torrent-status';
          line.textContent = status;
          panel.append(line);
        }
      }
    } else {
      const empty = document.createElement('div');
      empty.className = 'theater-empty';
      empty.textContent = 'Nothing on the screen. Queue something below — it starts for everyone.';
      panel.append(empty);
    }

    // Queue
    const list = this.dom.queueList;
    list.innerHTML = '';
    if (!queue.length) {
      const empty = document.createElement('div');
      empty.className = 'theater-empty';
      empty.textContent = 'The queue is empty.';
      list.append(empty);
    }
    for (const item of queue) {
      const row = document.createElement('div');
      row.className = 'theater-queue-row';
      const title = document.createElement('span');
      title.className = 'theater-queue-title';
      title.textContent = item.title || 'Untitled';
      const tag = document.createElement('span');
      tag.className = 'theater-kind-tag';
      tag.textContent = KIND_LABELS[item.kind] || item.kind || 'media';
      const by = document.createElement('span');
      by.className = 'theater-queued-by';
      by.textContent = `· ${item.queuedBy || 'Someone'}`;
      const playBtn = document.createElement('button');
      playBtn.type = 'button';
      playBtn.textContent = 'Play now';
      playBtn.addEventListener('click', () => this.sendQueue({ op: 'playNow', itemId: item.id }));
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.textContent = 'Remove';
      removeBtn.addEventListener('click', () => this.sendQueue({ op: 'remove', itemId: item.id }));
      row.append(title, tag, by, playBtn, removeBtn);
      list.append(row);
    }

    // Transport
    const hasNow = !!now;
    this.dom.btnToggle.textContent = now?.playing ? 'Pause' : 'Resume';
    this.dom.btnToggle.disabled = !hasNow;
    this.dom.btnSkip.disabled = !hasNow;
    const seekable = hasNow && now.kind !== 'hls';
    this.dom.btnBack.disabled = !seekable;
    this.dom.btnFwd.disabled = !seekable;
    this.dom.btnClear.disabled = !hasNow && !queue.length;
    this.dom.volumeInput.value = String(Math.round(this.volume * 100));

    this.renderIptvSection();
  }

  // --- IPTV: shared library + personal lists ---

  /**
   * Metadata for the active list — a shared theater list (channels may not
   * be pulled yet) or a personal one (channels included).
   */
  getActiveListMeta() {
    const shared = (this.sharedCatalog?.lists || []).find((l) => l.id === this.activeListId);
    if (shared) return { ...shared, shared: true };
    const personal = this.savedLists.find((l) => l.id === this.activeListId);
    return personal ? { ...personal, shared: false } : null;
  }

  /** The active list with its channels; shared lists need a pulled cache. */
  getActiveList() {
    const meta = this.getActiveListMeta();
    if (!meta) return null;
    if (!meta.shared) return meta;
    return {
      id: meta.id,
      name: meta.name,
      addedBy: meta.addedBy,
      shared: true,
      channelCount: meta.channelCount,
      channels: this.sharedChannels.get(meta.id) || null,
    };
  }

  loadSavedLists() {
    try {
      const raw = JSON.parse(localStorage.getItem(IPTV_LISTS_KEY) || '[]');
      return sanitizeSavedLists(raw, Date.now());
    } catch {
      return [];
    }
  }

  saveSavedLists() {
    try {
      localStorage.setItem(IPTV_LISTS_KEY, JSON.stringify(sanitizeSavedLists(this.savedLists, Date.now())));
    } catch {}
  }

  // --- Shared library state from the server ---

  /** Apply an IPTV_STATE catalog snapshot (list metadata + guide summary). */
  applyIptvState(iptv) {
    const lists = (Array.isArray(iptv?.lists) ? iptv.lists : [])
      .filter((l) => l && typeof l.id === 'string')
      .map((l) => ({
        id: l.id,
        name: typeof l.name === 'string' && l.name ? l.name : 'Untitled list',
        addedBy: typeof l.addedBy === 'string' && l.addedBy ? l.addedBy : 'Someone',
        channelCount: Number(l.channelCount) || 0,
      }));
    const epgRaw = iptv?.epg && typeof iptv.epg === 'object' ? iptv.epg : null;
    this.sharedCatalog = {
      lists,
      epg: epgRaw
        ? {
            name: typeof epgRaw.name === 'string' && epgRaw.name ? epgRaw.name : 'Program guide',
            updatedAt: Number(epgRaw.updatedAt) || 0,
            // The catalog summary counts channels carrying schedule data.
            channelCount: Number(epgRaw.channels) || 0,
            programmes: Number(epgRaw.programmes) || 0,
          }
        : null,
    };
    // Forget channel caches for lists that no longer exist.
    for (const id of [...this.sharedChannels.keys()]) {
      if (!lists.some((l) => l.id === id)) this.sharedChannels.delete(id);
    }
    if (this.activeListId && !this.getActiveListMeta()) {
      this.activeListId = lists[0]?.id || this.savedLists[0]?.id || null;
      this.activeChannelIndex = -1;
    }
    if (this.dom?.iptvSelect) this.renderIptvSection();
    if (this.dom?.guideDialog?.open) this.renderGuide();
    if (this.dom?.controlsDialog?.open) this.renderControls();
  }

  /** Apply an on-demand IPTV_LIST reply (channels of one shared list). */
  applySharedList(msg) {
    const listId = String(msg?.listId || '');
    const channels = sanitizeChannels(msg?.channels, IPTV_LIMITS.CHANNELS_MAX);
    if (!listId || !channels.length) return;
    this.sharedChannels.set(listId, channels);
    // A flip that arrived while the list was loading resumes here.
    if (this.pendingFlip && listId === this.activeListId) {
      const delta = this.pendingFlip;
      this.pendingFlip = 0;
      this.flipChannel(delta);
      return;
    }
    if (this.dom?.guideDialog?.open && this.guideListId === listId) this.renderGuide();
    if (this.dom?.controlsDialog?.open) this.renderIptvSection();
  }

  requestSharedChannels(listId) {
    if (!listId || this.sharedChannels.has(listId)) return;
    if (typeof this.net?.sendIptvListGet === 'function') this.net.sendIptvListGet(listId);
    else this.net?.send?.(MSG_TYPES.IPTV_LIST_GET, { listId });
  }

  // --- Uploads (HTTP) ---

  /** Upload playlist text to the shared library; the server parses it. */
  async uploadPlaylistText(text, name) {
    if (!text || !text.trim()) {
      this.setIptvStatus('Nothing to add — paste playlist text or choose a file first.', true);
      return;
    }
    if (!this.net?.uploadPlaylistText) {
      this.setIptvStatus('Multiplayer is offline — the theater cannot store lists right now.', true);
      return;
    }
    if (text.length > IPTV_LIMITS.LIST_TEXT_MAX) {
      this.setIptvStatus(iptvErrorText('text_too_large'), true);
      return;
    }
    this.setIptvStatus('Adding to the theater library…');
    try {
      const res = await this.net.uploadPlaylistText(text, name, this.net.nickname);
      this.setIptvStatus(
        `"${res.list.name}" added to the theater library — ${res.list.channelCount} channels for everyone in the auditorium.`,
      );
    } catch (err) {
      this.setIptvStatus(err.message || 'The theater could not accept that playlist.', true);
    }
  }

  async importPlaylistFile(file) {
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const name = file.name.replace(/\.(m3u8?|txt)$/i, '');
        this.uploadPlaylistText(String(reader.result || ''), name);
      };
      reader.onerror = () => this.setIptvStatus('Could not read that file.', true);
      reader.readAsText(file);
    } catch {
      this.setIptvStatus('Could not read that file.', true);
    }
  }

  async importPlaylistUrl() {
    const url = (this.dom?.iptvUrl?.value || '').trim();
    if (!/^https?:\/\//i.test(url)) {
      this.setIptvStatus('Enter an http(s) URL pointing at an .m3u / .m3u8 playlist.', true);
      return;
    }
    if (!this.net?.importPlaylistFromUrl) {
      this.setIptvStatus('Multiplayer is offline — the theater cannot fetch lists right now.', true);
      return;
    }
    this.setIptvStatus('Fetching the playlist for the whole auditorium…');
    try {
      const res = await this.net.importPlaylistFromUrl(url, null, this.net.nickname);
      this.setIptvStatus(
        `"${res.list.name}" added to the theater library — ${res.list.channelCount} channels for everyone in the auditorium.`,
      );
    } catch (err) {
      this.setIptvStatus(err.message || 'Could not fetch that playlist.', true);
    }
  }

  /** Push the active personal list into the shared library (anyone can then browse it). */
  async pushActivePersonalList() {
    const meta = this.getActiveListMeta();
    if (!meta || meta.shared) {
      this.setIptvStatus('Select one of your own lists to add it to the theater library.', true);
      return;
    }
    const text = serializeM3U(meta.channels);
    await this.uploadPlaylistText(text, meta.name);
  }

  deleteActiveList() {
    const meta = this.getActiveListMeta();
    if (!meta) {
      this.setIptvStatus('Select a list to remove.', true);
      return;
    }
    if (meta.shared) {
      // Communal library: anyone present may remove a shared list. The
      // server announces the new catalog; playback is untouched.
      if (typeof this.net?.sendIptvListRemove === 'function') this.net.sendIptvListRemove(meta.id);
      else this.net?.send?.(MSG_TYPES.IPTV_LIST_REMOVE, { listId: meta.id });
      this.setIptvStatus(`Removing "${meta.name}" from the theater library…`);
      return;
    }
    this.savedLists = this.savedLists.filter((l) => l.id !== meta.id);
    this.saveSavedLists();
    if (this.activeListId === meta.id) {
      this.activeListId = this.getActiveListMeta() ? this.activeListId : ((this.sharedCatalog?.lists?.[0]?.id) || this.savedLists[0]?.id || null);
      this.activeChannelIndex = -1;
    }
    this.renderIptvSection();
    this.setIptvStatus(`Deleted "${meta.name}" from your saved lists.`);
  }

  renderIptvSection() {
    if (!this.dom?.iptvSelect) return;
    const select = this.dom.iptvSelect;
    const shared = this.sharedCatalog?.lists || [];
    const personal = this.savedLists;
    select.innerHTML = '';

    if (!shared.length && !personal.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No channel lists yet — add one below';
      select.append(opt);
      select.disabled = true;
      this.activeListId = null;
    } else {
      select.disabled = false;
      if (shared.length) {
        const group = document.createElement('optgroup');
        group.label = 'Theater library — everyone can browse';
        for (const list of shared) {
          const opt = document.createElement('option');
          opt.value = list.id;
          opt.textContent = `${list.name} (${list.channelCount})`;
          group.append(opt);
        }
        select.append(group);
      }
      if (personal.length) {
        const group = document.createElement('optgroup');
        group.label = 'Your lists — private until added';
        for (const list of personal) {
          const opt = document.createElement('option');
          opt.value = list.id;
          opt.textContent = `${list.name} (${list.channels.length})`;
          group.append(opt);
        }
        select.append(group);
      }
      if (!this.getActiveListMeta()) {
        this.activeListId = shared[0]?.id || personal[0].id;
        this.activeChannelIndex = -1;
      }
      select.value = this.activeListId;
      const meta = this.getActiveListMeta();
      if (meta?.shared) this.requestSharedChannels(meta.id);
    }

    const list = this.getActiveList();
    const channel = list?.channels?.[this.activeChannelIndex];
    this.dom.iptvCurrent.textContent = channel
      ? `Tuned: ${channel.name}`
      : this.state?.now
        ? `On screen: ${this.state.now.title}`
        : 'No channel tuned';
    // "Add to theater" only makes sense for a private list.
    if (this.dom.iptvPush) this.dom.iptvPush.hidden = !(list && !list.shared);
  }

  /** Remember where a now-playing URL sits in the active list so flipping continues from it. */
  rememberChannelFor(url) {
    if (!url) return;
    const list = this.getActiveList();
    if (!list?.channels) return;
    const idx = list.channels.findIndex((c) => c.url === url);
    if (idx !== -1) this.activeChannelIndex = idx;
  }

  /** Flip to the previous/next channel of the active list; prompts if none. */
  flipChannel(delta) {
    const list = this.getActiveList();
    if (!list || !list.channels || !list.channels.length) {
      if (list?.shared) {
        // Shared list whose channels have not arrived yet: pull them, then
        // resume the flip when IPTV_LIST lands.
        this.pendingFlip = delta;
        this.requestSharedChannels(list.id);
        this.setIptvStatus('Fetching the theater channel list…');
        return;
      }
      this.setIptvStatus('No channel list available — add a playlist to the theater library (paste text, file, or URL) to start flipping.', true);
      this.openControls(); // the prompt lives in the booth
      return;
    }
    const count = list.channels.length;
    let idx = this.activeChannelIndex;
    if (idx < 0 || idx >= count) idx = delta > 0 ? 0 : count - 1;
    else idx = (idx + delta + count) % count;
    this.tuneChannel(list, idx);
  }

  tuneChannel(list, index) {
    const channel = list?.channels?.[index];
    if (!channel) return;
    this.activeListId = list.id;
    this.activeChannelIndex = index;
    // Send the resolved URL (never an index into a private list) so viewers
    // who never imported this list watch the same channel.
    this.sendChannel(channel.url, channel.name);
    this.renderIptvSection();
    if (this.dom?.guideDialog?.open) this.renderGuide();
  }

  // --- Channel guide dialog ---

  /** Guide key for a channel: tvg-id when present, else the display name. */
  channelKey(channel) {
    return (channel?.tvgId || channel?.name || '').trim();
  }

  /** Local-time "HH:MM" for a guide timestamp. */
  formatGuideTime(ms) {
    if (!Number.isFinite(ms)) return '';
    try {
      return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  /** Now/next text for a channel from the schedule cache ('' when none). */
  scheduleTextFor(channel) {
    const entry = this.epgSchedule.get(this.channelKey(channel));
    if (!entry) return null;
    const parts = [];
    if (entry.now) {
      parts.push(`Now ${this.formatGuideTime(entry.now.start)}–${this.formatGuideTime(entry.now.stop)} · ${entry.now.title}`);
    }
    if (entry.next) {
      parts.push(`Next ${this.formatGuideTime(entry.next.start)} · ${entry.next.title}`);
    }
    return parts.join('   ·   ') || null;
  }

  /** Ask the server for now/next of the guide's visible channels (bounded). */
  requestEpgSchedule() {
    if (!this.dom?.guideDialog?.open || !this.sharedCatalog?.epg) return;
    const list = this.getActiveList();
    if (!list?.channels) return;
    const keys = [];
    const seen = new Set();
    for (const channel of list.channels) {
      if (!channelMatchesGuide(channel, this.guideCountry, this.guideCategory)) continue;
      const key = this.channelKey(channel);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      keys.push(key);
      if (keys.length >= IPTV_LIMITS.EPG_LOOKUP_MAX) break;
    }
    if (!keys.length) return;
    if (typeof this.net?.sendEpgLookup === 'function') this.net.sendEpgLookup(keys);
    else this.net?.send?.(MSG_TYPES.EPG_LOOKUP, { keys });
  }

  startEpgRefresh() {
    this.stopEpgRefresh();
    this.epgTimer = setInterval(() => {
      if (!this.dom?.guideDialog?.open) {
        this.stopEpgRefresh();
        return;
      }
      this.requestEpgSchedule();
    }, EPG_REFRESH_INTERVAL_MS);
  }

  stopEpgRefresh() {
    if (this.epgTimer) {
      clearInterval(this.epgTimer);
      this.epgTimer = null;
    }
  }

  /** Apply an EPG_SCHEDULE reply: cache and update open guide rows in place. */
  applyEpgSchedule(msg) {
    const entries = Array.isArray(msg?.entries) ? msg.entries : [];
    for (const entry of entries) {
      if (typeof entry?.key !== 'string') continue;
      this.epgSchedule.set(entry.key, { now: entry.now || null, next: entry.next || null });
    }
    // Update the open guide's rows in place (no re-render: keeps scroll).
    if (!this.dom?.guideDialog?.open || !entries.length) return;
    this.dom.guideList.querySelectorAll('[data-epg-key]').forEach((el) => {
      const channel = this.channelByKey?.get(el.dataset.epgKey);
      const text = channel ? this.scheduleTextFor(channel) : null;
      if (text !== null) el.textContent = text;
    });
  }

  renderGuide() {
    if (!this.dom?.guideDialog) return;
    const meta = this.getActiveListMeta();
    const list = this.getActiveList();

    if (this.guideListId !== (meta?.id || null)) {
      this.guideListId = meta?.id || null;
      this.guideCountry = 'All';
      this.guideCategory = 'All';
    }
    this.dom.guideTitle.textContent = meta ? `${meta.name}${meta.shared ? ' · theater library' : ' · your list'}` : 'Channel Guide';
    // Guide status: what schedule data, if any, is backing these rows.
    const epg = this.sharedCatalog?.epg;
    this.dom.guideEpg.textContent = epg
      ? `Program guide: ${epg.name} — ${epg.channelCount} channels with listings${meta?.shared ? '' : ' (matching may be limited on private lists)'}`
      : 'No program guide uploaded — rows show channels only.';

    // Shared lists pull their channels on first open.
    if (meta?.shared && !list?.channels) {
      this.requestSharedChannels(meta.id);
    }

    // Country -> category navigation: pick a country of origin first, then
    // narrow by the categories that country actually offers. Lists without
    // any groups fall back to the flat channel list.
    const channels = list?.channels || [];
    const facets = guideFacets(channels);
    const hasGroups = facets.countries.length > 0;
    this.dom.guideCountryRow.hidden = !hasGroups;
    this.dom.guideGroups.hidden = true;
    let filtering = false;
    if (list?.channels && hasGroups) {
      if (!facets.countries.includes(this.guideCountry)) this.guideCountry = 'All';
      const select = this.dom.guideCountrySelect;
      select.innerHTML = '';
      for (const c of ['All countries', ...facets.countries]) {
        const opt = document.createElement('option');
        opt.value = c === 'All countries' ? 'All' : c;
        opt.textContent = c;
        select.append(opt);
      }
      select.value = this.guideCountry;

      const cats = facets.categoriesFor(this.guideCountry);
      if (!cats.includes(this.guideCategory)) this.guideCategory = 'All';
      const chipRow = this.dom.guideGroups;
      chipRow.innerHTML = '';
      if (cats.length) {
        chipRow.hidden = false;
        for (const g of ['All categories', ...cats]) {
          const value = g === 'All categories' ? 'All' : g;
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = `theater-chip ${value === this.guideCategory ? 'active' : ''}`;
          chip.textContent = g;
          chip.addEventListener('click', () => {
            this.guideCategory = value;
            this.renderGuide();
            this.requestEpgSchedule();
          });
          chipRow.append(chip);
        }
      }
      filtering = this.guideCountry !== 'All' || this.guideCategory !== 'All';
    }

    const listEl = this.dom.guideList;
    listEl.innerHTML = '';
    this.channelByKey = new Map();
    if (!meta) {
      this.dom.guideCount.textContent = 'No list loaded';
      const empty = document.createElement('div');
      empty.className = 'theater-empty';
      empty.textContent = 'The theater has no channel lists yet — open the Screen controls and add a playlist (paste text, upload a file, or fetch a URL). Everyone here will be able to browse it.';
      listEl.append(empty);
      return;
    }
    if (!list?.channels) {
      this.dom.guideCount.textContent = 'Fetching the theater channel list…';
      const empty = document.createElement('div');
      empty.className = 'theater-empty';
      empty.textContent = 'Fetching the theater channel list…';
      listEl.append(empty);
      return;
    }

    let shown = 0;
    list.channels.forEach((channel, index) => {
      if (!channelMatchesGuide(channel, this.guideCountry, this.guideCategory)) return;
      shown += 1;
      const key = this.channelKey(channel);
      this.channelByKey.set(key, channel);
      const row = document.createElement('div');
      row.className = `theater-channel-row ${index === this.activeChannelIndex ? 'current' : ''}`;
      if (channel.logo && /^https?:\/\//i.test(channel.logo)) {
        const img = document.createElement('img');
        img.src = channel.logo;
        img.alt = '';
        img.loading = 'lazy';
        img.addEventListener('error', () => {
          img.hidden = true;
        });
        row.append(img);
      }
      const name = document.createElement('span');
      name.className = 'theater-channel-name';
      name.textContent = channel.name || 'Channel';
      row.append(name);
      if (channel.group) {
        const tag = document.createElement('span');
        tag.className = 'theater-group-tag';
        tag.textContent = channel.group;
        row.append(tag);
      }
      if (this.sharedCatalog?.epg) {
        const schedule = document.createElement('span');
        schedule.className = 'theater-channel-epg';
        schedule.dataset.epgKey = key;
        schedule.textContent = this.scheduleTextFor(channel) || '';
        row.append(schedule);
      }
      row.addEventListener('click', () => {
        this.tuneChannel(list, index);
        this.dom.guideDialog.close();
      });
      listEl.append(row);
    });
    if (!shown) {
      const empty = document.createElement('div');
      empty.className = 'theater-empty';
      empty.textContent = 'No channels match this country and category.';
      listEl.append(empty);
    }
    const source = meta.shared ? `theater library` : `your lists`;
    this.dom.guideCount.textContent = `${list.channels.length} channels · showing ${shown}${this.state?.now ? ` · on screen: ${this.state.now.title}` : ''} · ${source}`;
    this.requestEpgSchedule();
  }
}
