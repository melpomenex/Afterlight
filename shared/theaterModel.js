/**
 * Pure model for the shared theater screen (The Orpheum).
 *
 * Everything here is side-effect free so both the server (validation,
 * state application) and the tests (node --test) can rely on it, mirroring
 * shared/gardenModel.js. The client adds rendering on top; it never
 * invents shared state.
 *
 * State shape:
 *   {
 *     now: null | {
 *       id, kind: 'youtube'|'vimeo'|'file'|'hls', url, title,
 *       playing: boolean,
 *       positionSec: number,   // position valid AT updatedAt
 *       updatedAt: number,     // server Date.now() of last timeline write
 *       by: string,            // who last controlled/queued it
 *       queuedBy: string,      // who put it in the queue (carried on advance)
 *     },
 *     queue: [ { id, kind, url, title, queuedBy } ],
 *   }
 */

export const THEATER_LIMITS = {
  URL_MAX: 2048,
  TITLE_MAX: 120,
  QUEUE_MAX: 50,
};

export const KIND_LABELS = {
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  file: 'Video file',
  hls: 'Live stream (HLS)',
};

export function defaultTitle(kind) {
  switch (kind) {
    case 'youtube': return 'A YouTube video';
    case 'vimeo': return 'A Vimeo video';
    case 'hls': return 'Live channel';
    case 'file': return 'A video link';
    default: return 'Something to watch';
  }
}

const YOUTUBE_HOSTS = new Set([
  'youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com',
  'youtube-nocookie.com', 'www.youtube-nocookie.com', 'youtu.be', 'www.youtu.be',
]);
const VIDEO_EXT = /\.(mp4|webm|m4v|mov|ogv|ogg)$/i;

/**
 * Classify a user-supplied URL. Returns null for anything the screen must
 * not play (wrong scheme, unknown site, non-media path) — the same rule the
 * server enforces before sharing state.
 */
export function classifySource(rawUrl) {
  if (typeof rawUrl !== 'string') return null;
  const url = rawUrl.trim();
  if (!url || url.length > THEATER_LIMITS.URL_MAX) return null;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname;

  if (YOUTUBE_HOSTS.has(host)) {
    let videoId = null;
    let m;
    if (host.endsWith('youtu.be')) {
      m = path.match(/^\/([\w-]{6,})/);
      videoId = m ? m[1] : null;
    } else if ((m = path.match(/^\/(?:watch\/)?(?:\?v=)?\/?$/)) && parsed.searchParams.has('v')) {
      // (unreachable branch kept simple below)
    }
    if (!videoId && parsed.searchParams.has('v')) {
      const v = parsed.searchParams.get('v');
      if (/^[\w-]{6,}$/.test(v)) videoId = v;
    }
    if (!videoId) {
      m = path.match(/^\/(?:shorts|embed|live|v)\/([\w-]{6,})/);
      if (m) videoId = m[1];
    }
    if (videoId) return { kind: 'youtube', url, videoId };
    return null; // YouTube page without a video id (channels, playlists)
  }

  if (host === 'vimeo.com' || host === 'www.vimeo.com' || host === 'player.vimeo.com') {
    const m = path.match(/^\/(?:video\/)?(\d{6,})(?:[/?]|$)/);
    if (m) return { kind: 'vimeo', url, videoId: m[1] };
    return null;
  }

  if (path.toLowerCase().endsWith('.m3u8')) return { kind: 'hls', url };
  if (VIDEO_EXT.test(path)) return { kind: 'file', url };
  return null;
}

/** Embeddable player URL for an item (iframe src), with sync APIs enabled. */
export function buildEmbedUrl(kind, videoId) {
  if (kind === 'youtube' && videoId) {
    return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&playsinline=1&rel=0&controls=0`;
  }
  if (kind === 'vimeo' && videoId) {
    return `https://player.vimeo.com/video/${videoId}?autoplay=1&controls=0&enablejsapi=1`;
  }
  return null;
}

export function createTheaterState() {
  return { now: null, queue: [] };
}

export function newItemId(nowMs = Date.now()) {
  return `itm_${nowMs.toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function cleanText(value, max = THEATER_LIMITS.TITLE_MAX) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

function makeItem(classified, title, queuedBy, nowMs) {
  return {
    id: newItemId(nowMs),
    kind: classified.kind,
    url: classified.url,
    videoId: classified.videoId || null,
    title: cleanText(title) || defaultTitle(classified.kind),
    queuedBy: cleanText(queuedBy, 40) || 'Someone',
  };
}

function startNow(item, actor, nowMs) {
  return {
    id: item.id,
    kind: item.kind,
    url: item.url,
    videoId: item.videoId || null,
    title: item.title,
    playing: true,
    positionSec: 0,
    updatedAt: nowMs,
    by: cleanText(actor, 40) || 'Someone',
    queuedBy: item.queuedBy || item.by || 'Someone',
  };
}

/**
 * Shared playback clock: the position the whole room should be showing at
 * `nowMs`. While playing, the recorded position advances with wall time
 * since the server's last write; pausing freezes it.
 */
export function effectivePositionSec(now, nowMs) {
  if (!now) return 0;
  if (!now.playing) return now.positionSec;
  return now.positionSec + Math.max(0, (nowMs - now.updatedAt) / 1000);
}

function advance(state, actor, nowMs) {
  const next = state.queue.shift();
  state.now = next ? startNow(next, next.queuedBy, nowMs) : null;
}

/**
 * Apply a validated-or-not action to the theater state. Returns
 * `{ state, error? }` where `error` is a stable reason string the caller
 * can translate. Never mutates the input state.
 */
export function applyTheaterAction(prevState, action, actor, nowMs = Date.now()) {
  const state = {
    now: prevState.now ? { ...prevState.now } : null,
    queue: prevState.queue.map(item => ({ ...item })),
  };
  const ack = (error) => (error ? { state: null, error } : { state, error: null });

  if (!action || typeof action.op !== 'string') return ack('invalid_action');
  const op = action.op;

  if (op === 'add') {
    const classified = classifySource(action.url);
    if (!classified) return ack('invalid_url');
    const item = makeItem(classified, action.title, actor, nowMs);
    if (!state.now) {
      state.now = startNow(item, actor, nowMs);
      return ack(null);
    }
    if (state.queue.length >= THEATER_LIMITS.QUEUE_MAX) return ack('queue_full');
    state.queue.push(item);
    return ack(null);
  }

  if (op === 'remove') {
    if (!action.itemId) return ack('item_not_found');
    if (state.now && state.now.id === action.itemId) {
      advance(state, actor, nowMs); // removing the live item skips it
      return ack(null);
    }
    const idx = state.queue.findIndex(item => item.id === action.itemId);
    if (idx === -1) return ack('item_not_found');
    state.queue.splice(idx, 1);
    return ack(null);
  }

  if (op === 'playNow') {
    const idx = state.queue.findIndex(item => item.id === action.itemId);
    if (idx === -1) return ack('item_not_found');
    const [item] = state.queue.splice(idx, 1);
    if (state.now) {
      const current = state.now;
      state.queue.unshift({
        id: current.id, kind: current.kind, url: current.url,
        videoId: current.videoId || null, title: current.title, queuedBy: current.queuedBy,
      });
    }
    state.now = startNow(item, actor, nowMs);
    return ack(null);
  }

  if (op === 'skip') {
    if (!state.now) return ack('nothing_playing');
    advance(state, actor, nowMs);
    return ack(null);
  }

  if (op === 'clear') {
    state.now = null;
    state.queue = [];
    return ack(null);
  }

  if (op === 'pause') {
    if (!state.now) return ack('nothing_playing');
    if (action.itemId && action.itemId !== state.now.id) return ack('item_mismatch');
    state.now.positionSec = effectivePositionSec(state.now, nowMs);
    state.now.playing = false;
    state.now.updatedAt = nowMs;
    state.now.by = cleanText(actor, 40) || state.now.by;
    return ack(null);
  }

  if (op === 'resume') {
    if (!state.now) return ack('nothing_playing');
    if (action.itemId && action.itemId !== state.now.id) return ack('item_mismatch');
    if (!state.now.playing) {
      state.now.playing = true;
      state.now.updatedAt = nowMs;
      state.now.by = cleanText(actor, 40) || state.now.by;
    }
    return ack(null);
  }

  if (op === 'seek') {
    if (!state.now) return ack('nothing_playing');
    if (action.itemId && action.itemId !== state.now.id) return ack('item_mismatch');
    if (state.now.kind === 'hls') return ack('seek_unsupported');
    const pos = Number(action.positionSec);
    if (!Number.isFinite(pos)) return ack('invalid_position');
    state.now.positionSec = Math.max(0, pos);
    state.now.updatedAt = nowMs;
    state.now.by = cleanText(actor, 40) || state.now.by;
    return ack(null);
  }

  if (op === 'ended' || op === 'failed') {
    // Auto-advance report from whichever client's player engine observed
    // the event. Guarded by item id so stale/duplicate reports are no-ops.
    if (!state.now) return ack('nothing_playing');
    if (action.itemId !== state.now.id) return ack('item_mismatch');
    advance(state, actor, nowMs);
    return ack(null);
  }

  if (op === 'channel') {
    // IPTV flip: the selection carries the resolved stream URL so viewers
    // who never imported the originating list play the same channel.
    const classified = classifySource(action.url);
    if (!classified) return ack('invalid_url');
    const item = makeItem(classified, cleanText(action.title) || 'Live channel', actor, nowMs);
    state.now = startNow(item, actor, nowMs);
    return ack(null);
  }

  return ack('invalid_action');
}

/** Readable message for a reducer error reason (client + server reuse). */
export function theaterErrorText(reason) {
  switch (reason) {
    case 'invalid_url': return 'That link is not something the projector can play. Try YouTube, Vimeo, a direct video file, or an .m3u8 stream.';
    case 'url_too_long': return 'That link is far too long to pin to the marquee.';
    case 'queue_full': return 'The queue reel is full. Remove something first.';
    case 'item_not_found': return 'That item is no longer on the bill.';
    case 'nothing_playing': return 'Nothing is on the screen right now.';
    case 'item_mismatch': return 'The screen has moved on to something else.';
    case 'invalid_position': return 'That timestamp does not make sense.';
    case 'seek_unsupported': return 'Live channels cannot be rewound.';
    case 'invalid_action': return 'The projector does not understand that request.';
    default: return 'The projector ignores that.';
  }
}

// --- M3U / M3U8 IPTV playlist parsing (import happens client-side; the
// parser is shared so tests can pin its tolerance rules) ---

function parseExtInf(line) {
  // #EXTINF:-1 tvg-name="Channel" group-title="News" tvg-logo="http..",Display Name
  const body = line.slice(line.indexOf(':') + 1);
  const commaIdx = body.lastIndexOf(',');
  const attrsPart = commaIdx === -1 ? body : body.slice(0, commaIdx);
  const name = commaIdx === -1 ? '' : body.slice(commaIdx + 1).trim();
  const attr = (key) => {
    const m = attrsPart.match(new RegExp(`${key}="([^"]*)"`), 'i');
    return m ? m[1].trim() : null;
  };
  const out = { name: name || null, group: null, logo: null };
  const groupName = attrsPart.match(/group-title="([^"]*)"/i);
  if (groupName) out.group = groupName[1].trim() || null;
  const logoUrl = attrsPart.match(/tvg-logo="([^"]*)"/i);
  if (logoUrl) out.logo = logoUrl[1].trim() || null;
  const tvgName = attrsPart.match(/tvg-name="([^"]*)"/i);
  if (!out.name && tvgName) out.name = tvgName[1].trim() || null;
  return out;
}

/**
 * Parse M3U/M3U8 playlist text into channel entries. Tolerant by contract:
 * malformed #EXTINF blocks and non-http entries are skipped and counted,
 * never fatal. Returns { entries: [{url, name, group, logo}], skipped,
 * recognized } — `recognized` is false when the text does not look like a
 * playlist at all.
 */
export function parseM3U(text) {
  const entries = [];
  let skipped = 0;
  let recognized = false;
  if (typeof text !== 'string' || !text.trim()) {
    return { entries, skipped, recognized };
  }
  let pending = null;
  let channelIdx = 0;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.toUpperCase().startsWith('#EXTM3U')) {
      recognized = true;
      continue;
    }
    if (line.startsWith('#')) {
      if (line.toUpperCase().startsWith('#EXTINF')) {
        pending = parseExtInf(line);
      }
      continue; // #EXTVLCOPT, #EXTGRP, comments — all ignorable
    }
    if (!/^https?:\/\//i.test(line)) {
      skipped++;
      pending = null;
      continue;
    }
    recognized = true;
    channelIdx++;
    entries.push({
      url: line,
      name: cleanText(pending?.name) || `Channel ${channelIdx}`,
      group: pending?.group || null,
      logo: pending?.logo || null,
    });
    pending = null;
  }
  return { entries, skipped, recognized };
}

/**
 * Repair untrusted persisted/received theater data to a safe state:
 * unknown kinds and non-playable URLs are dropped, numbers coerced.
 * Used by storage on load and before trusting incoming payloads.
 */
export function normalizeTheaterState(raw, nowMs = Date.now()) {
  const state = createTheaterState();
  if (!raw || typeof raw !== 'object') return state;

  if (raw.now && typeof raw.now === 'object') {
    const classified = classifySource(raw.now.url);
    if (classified) {
      state.now = {
        id: typeof raw.now.id === 'string' ? raw.now.id : newItemId(nowMs),
        kind: classified.kind,
        url: classified.url,
        videoId: classified.videoId || null,
        title: cleanText(raw.now.title) || defaultTitle(classified.kind),
        playing: raw.now.playing !== false,
        positionSec: Number.isFinite(Number(raw.now.positionSec)) && Number(raw.now.positionSec) >= 0
          ? Number(raw.now.positionSec) : 0,
        updatedAt: Number.isFinite(Number(raw.now.updatedAt)) ? Number(raw.now.updatedAt) : nowMs,
        by: cleanText(raw.now.by, 40) || 'Someone',
        queuedBy: cleanText(raw.now.queuedBy, 40) || 'Someone',
      };
    }
  }

  if (Array.isArray(raw.queue)) {
    for (const entry of raw.queue) {
      if (state.queue.length >= THEATER_LIMITS.QUEUE_MAX) break;
      if (!entry || typeof entry !== 'object') continue;
      const classified = classifySource(entry.url);
      if (!classified) continue;
      state.queue.push({
        id: typeof entry.id === 'string' ? entry.id : newItemId(nowMs),
        kind: classified.kind,
        url: classified.url,
        videoId: classified.videoId || null,
        title: cleanText(entry.title) || defaultTitle(classified.kind),
        queuedBy: cleanText(entry.queuedBy, 40) || 'Someone',
      });
    }
  }

  return state;
}
