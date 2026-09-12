/**
 * Pure model for the shared theater screen (The Orpheum).
 *
 * Everything here is side-effect free so both the server (validation,
 * state application) and the tests (node --test) can rely on it. The client
 * adds rendering on top; it never invents shared state.
 *
 * State shape:
 *   {
 *     now: null | {
 *       id, kind: 'youtube'|'vimeo'|'file'|'hls'|'torrent'|'twitch', url, title,
 *       playing: boolean,
 *       positionSec: number,   // position valid AT updatedAt
 *       updatedAt: number,     // server Date.now() of last timeline write
 *       by: string,            // who last controlled/queued it
 *       queuedBy: string,      // who put it in the queue (carried on advance)
 *       // torrent items only — the resolve→pick outcome (see torrentModel):
 *       fileIndex: number, filePath: string, fileBytes: number,
 *       // twitch items only — channel|video|clip + its identifier:
 *       twitchType: string, twitchId: string,
 *     },
 *     queue: [ { id, kind, url, title, queuedBy, (torrent/twitch fields) } ],
 *   }
 */

import {
  extensionNeedsPrepare,
  initialPrepareFields,
  copyPrepareFields,
  sanitizePrepareFields,
  PREPARE_STATUS,
} from './mediaModel.js';
import { isVideoFile, parseMagnet, sanitizeTorrentPick, torrentTitle } from './torrentModel.js';

export const THEATER_LIMITS = {
  URL_MAX: 2048,
  TITLE_MAX: 120,
  QUEUE_MAX: 50,
  RESOLVE_MAX: 100, // playlist import: most videos a single resolve may carry
};

export const KIND_LABELS = {
  youtube: 'YouTube',
  youtubePlaylist: 'YouTube playlist',
  vimeo: 'Vimeo',
  file: 'Video file',
  hls: 'Live stream (HLS)',
  torrent: 'Torrent stream',
  twitch: 'Twitch',
};

export function defaultTitle(kind) {
  switch (kind) {
    case 'youtube': return 'A YouTube video';
    case 'vimeo': return 'A Vimeo video';
    case 'hls': return 'Live channel';
    case 'file': return 'A video link';
    case 'torrent': return 'A torrent stream';
    case 'twitch': return 'A Twitch stream';
    default: return 'Something to watch';
  }
}

const YOUTUBE_HOSTS = new Set([
  'youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com',
  'youtube-nocookie.com', 'www.youtube-nocookie.com', 'youtu.be', 'www.youtu.be',
]);
const VIDEO_EXT = /\.(mp4|webm|m4v|mov|ogv|ogg|mkv|avi|wmv|flv|ts|m2ts)$/i;

const TWITCH_HOSTS = new Set(['twitch.tv', 'www.twitch.tv', 'm.twitch.tv']);
const TWITCH_CLIP_HOSTS = new Set(['clips.twitch.tv']);
const TWITCH_CHANNEL_RE = /^\/([A-Za-z0-9_]{4,25})\/?$/;
const TWITCH_CLIP_SLUG_RE = /^\/([A-Za-z0-9_-]{5,100})\/?$/;
const TWITCH_CHANNEL_CLIP_RE = /^\/([A-Za-z0-9_]{4,25})\/clip\/([A-Za-z0-9_-]{5,100})\/?$/;
const TWITCH_VOD_RE = /^\/videos\/(\d{6,})\/?$/;
// Channel-shaped routes that are pages, not live channels.
const TWITCH_RESERVED_PATHS = new Set([
  'videos', 'directory', 'downloads', 'settings', 'subscriptions', 'inventory',
  'wallet', 'drops', 'friends', 'search', 'following', 'communities', 'collections',
  'event', 'events', 'jobs', 'turbo', 'bits', 'store', 'prime', 'login', 'signup',
  'oauth2', 'embed', 'team', 'user', 'p',
]);

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

  // Magnet links are instructions to the server-side torrent engine, never
  // media a browser loads; they carry a chosen-file pick as extra fields.
  const magnet = parseMagnet(url);
  if (magnet) return { kind: 'torrent', url: magnet.url, infohash: magnet.infohash };

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
    // Playlist context: `list=` names a playlist. Watch links stay playable
    // videos and carry the list as extra context (the client offers to
    // import it); a playlist link with no video id is an import target.
    const listParam = parsed.searchParams.get('list');
    const listId = listParam && /^[\w-]{12,}$/.test(listParam) ? listParam : null;
    if (videoId) {
      return listId ? { kind: 'youtube', url, videoId, listId } : { kind: 'youtube', url, videoId };
    }
    if (listId) return { kind: 'youtubePlaylist', listId, url };
    return null; // YouTube page without a video id or playlist (channels…)
  }

  if (host === 'vimeo.com' || host === 'www.vimeo.com' || host === 'player.vimeo.com') {
    const m = path.match(/^\/(?:video\/)?(\d{6,})(?:[/?]|$)/);
    if (m) return { kind: 'vimeo', url, videoId: m[1] };
    return null;
  }

  if (TWITCH_HOSTS.has(host) || TWITCH_CLIP_HOSTS.has(host)) {
    return classifyTwitch(url, host, path);
  }

  if (path.toLowerCase().endsWith('.m3u8')) return { kind: 'hls', url };
  if (VIDEO_EXT.test(path)) {
    const needsPrepare = extensionNeedsPrepare(url);
    return { kind: 'file', url, needsPrepare };
  }
  return null;
}

/**
 * Classify a Twitch share link as a channel, VOD, or clip. Pages that do not
 * name live content (directory, settings, player embeds) return null so they
 * surface the ordinary unsupported-link error instead of reaching the bill.
 */
function classifyTwitch(url, host, path) {
  if (TWITCH_CLIP_HOSTS.has(host)) {
    const m = path.match(TWITCH_CLIP_SLUG_RE);
    return m ? { kind: 'twitch', url, twitchType: 'clip', twitchId: m[1] } : null;
  }
  const vod = path.match(TWITCH_VOD_RE);
  if (vod) return { kind: 'twitch', url, twitchType: 'video', twitchId: vod[1] };
  const channelClip = path.match(TWITCH_CHANNEL_CLIP_RE);
  if (channelClip) return { kind: 'twitch', url, twitchType: 'clip', twitchId: channelClip[2] };
  const channel = path.match(TWITCH_CHANNEL_RE);
  if (channel && !TWITCH_RESERVED_PATHS.has(channel[1].toLowerCase())) {
    return { kind: 'twitch', url, twitchType: 'channel', twitchId: channel[1] };
  }
  return null;
}

/**
 * Whether the shared bill's seek op applies to an item. Live HLS channels,
 * Twitch live channels, and Twitch clips have no controllable timeline.
 */
export function isSeekSupported(item) {
  if (!item) return false;
  if (item.kind === 'hls' && !item.playbackUrl) return false;
  if (item.kind === 'twitch' && (item.twitchType === 'channel' || item.twitchType === 'clip')) return false;
  return true;
}

/** Strip anything but the host from a serving origin (Twitch's `parent`). */
function cleanParent(value) {
  if (typeof value !== 'string') return '';
  let host = value.trim();
  if (!host) return '';
  if (host.includes('://')) {
    try {
      host = new URL(host).hostname;
    } catch {
      return '';
    }
  }
  host = host.split('/')[0].split('?')[0].split('#')[0].split(':')[0].toLowerCase();
  return host;
}

/**
 * Official Twitch embed URL (iframe src) for a classified Twitch source.
 * VOD ids carry the `v` prefix in the iframe URL; `parent` must be the
 * hostname serving the game (never scheme, port, or path).
 */
export function buildTwitchEmbedUrl(twitchType, twitchId, parent) {
  const host = cleanParent(parent);
  if (!host || typeof twitchId !== 'string' || !twitchId) return null;
  if (twitchType === 'channel') {
    return `https://player.twitch.tv/?channel=${encodeURIComponent(twitchId)}&parent=${encodeURIComponent(host)}&autoplay=true`;
  }
  if (twitchType === 'video') {
    return `https://player.twitch.tv/?video=v${encodeURIComponent(twitchId)}&parent=${encodeURIComponent(host)}&autoplay=true`;
  }
  if (twitchType === 'clip') {
    return `https://clips.twitch.tv/embed?clip=${encodeURIComponent(twitchId)}&parent=${encodeURIComponent(host)}&autoplay=true`;
  }
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

function makeItem(classified, title, queuedBy, nowMs, pick = null) {
  return {
    id: newItemId(nowMs),
    kind: classified.kind,
    url: classified.url,
    videoId: classified.videoId || null,
    title: cleanText(title) || defaultTitle(classified.kind),
    queuedBy: cleanText(queuedBy, 40) || 'Someone',
    // Torrent items carry their chosen file; twitch items their type/id.
    ...(classified.kind === 'torrent'
      ? { infohash: classified.infohash, fileIndex: pick.fileIndex, filePath: pick.filePath, fileBytes: pick.fileBytes }
      : {}),
    ...(classified.kind === 'twitch'
      ? { twitchType: classified.twitchType, twitchId: classified.twitchId }
      : {}),
    ...initialPrepareFields(classified),
  };
}

function startNow(item, actor, nowMs) {
  return {
    id: item.id,
    kind: item.kind,
    url: item.url,
    videoId: item.videoId || null,
    title: item.title,
    ...(item.kind === 'torrent'
      ? { infohash: item.infohash, fileIndex: item.fileIndex, filePath: item.filePath, fileBytes: item.fileBytes }
      : {}),
    ...(item.kind === 'twitch'
      ? { twitchType: item.twitchType, twitchId: item.twitchId }
      : {}),
    ...copyPrepareFields(item),
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
 * can translate; batch imports (`addMany`) also carry a
 * `report: { queued, skipped, didNotFit }` on success. Never mutates the
 * input state.
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
    // Playlists are not playable items: they arrive only through the
    // resolve→preview→addMany import flow, never as a single bill entry.
    if (classified.kind === 'youtubePlaylist') return ack('use_import');
    // Torrents arrive only through the resolve→pick flow: the magnet names
    // the torrent, the pick names the file. No pick, no bill entry.
    let pick = null;
    if (classified.kind === 'torrent') {
      pick = sanitizeTorrentPick(action);
      if (!pick || !isVideoFile(pick.filePath)) return ack('no_file_chosen');
    }
    const item = makeItem(classified, action.title, actor, nowMs, pick);
    if (!state.now) {
      state.now = startNow(item, actor, nowMs);
      return ack(null);
    }
    if (state.queue.length >= THEATER_LIMITS.QUEUE_MAX) return ack('queue_full');
    state.queue.push(item);
    return ack(null);
  }

  if (op === 'addMany') {
    // Playlist import: one atomic batch. Every URL is re-classified here —
    // titles and kinds from the client are never trusted — unplayable
    // entries are skipped, and the queue cap truncates honestly. The whole
    // batch lands in one state write, so the room sees one snapshot.
    const items = Array.isArray(action.items) ? action.items : null;
    if (!items || !items.length || items.length > THEATER_LIMITS.RESOLVE_MAX) return ack('invalid_action');
    const report = { queued: 0, skipped: 0, didNotFit: 0 };
    for (const entry of items) {
      const classified = classifySource(entry?.url);
      if (!classified || classified.kind === 'youtubePlaylist') {
        report.skipped++;
        continue;
      }
      if (!state.now) {
        state.now = startNow(makeItem(classified, entry.title, actor, nowMs), actor, nowMs);
        report.queued++;
        continue;
      }
      if (state.queue.length >= THEATER_LIMITS.QUEUE_MAX) {
        report.didNotFit++;
        continue;
      }
      state.queue.push(makeItem(classified, entry.title, actor, nowMs));
      report.queued++;
    }
    if (!report.queued) {
      return ack(report.didNotFit ? 'queue_full' : 'invalid_action');
    }
    return { state, error: null, report };
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
        ...(current.kind === 'torrent'
          ? { infohash: current.infohash, fileIndex: current.fileIndex, filePath: current.filePath, fileBytes: current.fileBytes }
          : {}),
        ...(current.kind === 'twitch'
          ? { twitchType: current.twitchType, twitchId: current.twitchId }
          : {}),
        ...copyPrepareFields(current),
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
    // Live HLS channels and live/clip Twitch items have no controllable
    // timeline; prepared compatibility HLS and Twitch VODs can seek.
    if (!isSeekSupported(state.now)) return ack('seek_unsupported');
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
    // IPTV flip / torrent play-now: the payload carries the resolved details
    // (stream URL, or magnet + chosen file) so viewers who never did the
    // resolving play the same thing.
    const classified = classifySource(action.url);
    if (!classified) return ack('invalid_url');
    if (classified.kind === 'youtubePlaylist') return ack('use_import');
    let pick = null;
    if (classified.kind === 'torrent') {
      pick = sanitizeTorrentPick(action);
      if (!pick || !isVideoFile(pick.filePath)) return ack('no_file_chosen');
    }
    const item = makeItem(
      classified,
      cleanText(action.title) || (classified.kind === 'torrent' ? torrentTitle(action.torrentName, pick.filePath) : ''),
      actor, nowMs, pick,
    );
    state.now = startNow(item, actor, nowMs);
    return ack(null);
  }

  return ack('invalid_action');
}

/** Readable message for a reducer error reason (client + server reuse). */
export function theaterErrorText(reason) {
  switch (reason) {
    case 'invalid_url': return 'That link is not something the projector can play. Try YouTube, Vimeo, Twitch, a direct video file, or an .m3u8 stream.';
    case 'no_file_chosen': return 'Pick a file from that torrent first \u2014 paste the magnet and choose from its file list.';
    case 'url_too_long': return 'That link is far too long to pin to the marquee.';
    case 'queue_full': return 'The queue reel is full. Remove something first.';
    case 'item_not_found': return 'That item is no longer on the bill.';
    case 'nothing_playing': return 'Nothing is on the screen right now.';
    case 'item_mismatch': return 'The screen has moved on to something else.';
    case 'invalid_position': return 'That timestamp does not make sense.';
    case 'seek_unsupported': return 'Live channels cannot be rewound.';
    case 'invalid_action': return 'The projector does not understand that request.';
    case 'use_import': return 'That link is a whole playlist \u2014 import it and its videos come to the reel together.';
    case 'is_mix': return 'Radio mixes never end, so the projector cannot pin them down \u2014 add the video itself instead.';
    case 'playlist_not_public': return 'That playlist is private or no longer exists \u2014 the projector can only read public playlists.';
    case 'playlist_unreadable': return 'The projector could not read that playlist just now. Give it a moment and try again.';
    case 'resolve_in_flight': return 'Hold on \u2014 one playlist is still being read.';
    case 'resolve_cooldown': return 'Give the projector a breath \u2014 try that playlist again in a moment.';
    case 'prepare_unavailable': return 'This server cannot prepare that video format right now.';
    case 'prepare_failed': return 'The projector could not prepare that video.';
    default: return 'The projector ignores that.';
  }
}

// --- M3U / M3U8 IPTV playlist parsing (import happens client-side; the
// parser is shared so tests can pin its tolerance rules) ---

function parseExtInf(line) {
  // #EXTINF:-1 tvg-id="Channel.tv" tvg-name="Channel" group-title="News" tvg-logo="http..",Display Name
  const body = line.slice(line.indexOf(':') + 1);
  const commaIdx = body.lastIndexOf(',');
  const attrsPart = commaIdx === -1 ? body : body.slice(0, commaIdx);
  const name = commaIdx === -1 ? '' : body.slice(commaIdx + 1).trim();
  const out = { name: name || null, group: null, logo: null, tvgId: null };
  const groupName = attrsPart.match(/group-title="([^"]*)"/i);
  if (groupName) out.group = groupName[1].trim() || null;
  const logoUrl = attrsPart.match(/tvg-logo="([^"]*)"/i);
  if (logoUrl) out.logo = logoUrl[1].trim() || null;
  // tvg-id keys EPG matching (program guide); additive and optional.
  const tvgId = attrsPart.match(/tvg-id="([^"]*)"/i);
  if (tvgId) out.tvgId = tvgId[1].trim() || null;
  const tvgName = attrsPart.match(/tvg-name="([^"]*)"/i);
  if (!out.name && tvgName) out.name = tvgName[1].trim() || null;
  return out;
}

/**
 * Parse M3U/M3U8 playlist text into channel entries. Tolerant by contract:
 * malformed #EXTINF blocks and non-http entries are skipped and counted,
 * never fatal. Returns { entries: [{url, name, group, logo, tvgId}], skipped,
 * recognized } — `recognized` is false when the text does not look like a
 * playlist at all. `tvgId` keys program-guide matching and may be null.
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
      tvgId: pending?.tvgId ? cleanText(pending.tvgId) : null,
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

  // Torrent items keep their chosen-file pick; a missing/corrupt pick means
  // the item can never play, so it is dropped rather than stranded.
  const pickFor = (entry, classified) => {
    if (classified.kind !== 'torrent') return {};
    const pick = sanitizeTorrentPick(entry);
    if (!pick || !isVideoFile(pick.filePath)) return null;
    return {
      infohash: classified.infohash,
      fileIndex: pick.fileIndex,
      filePath: pick.filePath,
      fileBytes: pick.fileBytes,
    };
  };
  // Twitch type/id are re-derived from the URL (never trusted from storage).
  const twitchFor = (classified) => (classified.kind === 'twitch'
    ? { twitchType: classified.twitchType, twitchId: classified.twitchId }
    : {});

  if (raw.now && typeof raw.now === 'object') {
    const classified = classifySource(raw.now.url);
    // Playlist links are import targets, not playable state: dropped.
    const pick = classified && classified.kind !== 'youtubePlaylist'
      ? pickFor(raw.now, classified)
      : null;
    if (classified && pick !== null) {
      state.now = {
        id: typeof raw.now.id === 'string' ? raw.now.id : newItemId(nowMs),
        kind: classified.kind,
        url: classified.url,
        videoId: classified.videoId || null,
        title: cleanText(raw.now.title) || defaultTitle(classified.kind),
        ...pick,
        ...twitchFor(classified),
        ...sanitizePrepareFields(raw.now, classified),
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
      if (!classified || classified.kind === 'youtubePlaylist') continue;
      const pick = pickFor(entry, classified);
      if (pick === null) continue;
      state.queue.push({
        id: typeof entry.id === 'string' ? entry.id : newItemId(nowMs),
        kind: classified.kind,
        url: classified.url,
        videoId: classified.videoId || null,
        title: cleanText(entry.title) || defaultTitle(classified.kind),
        ...pick,
        ...twitchFor(classified),
        ...sanitizePrepareFields(entry, classified),
        queuedBy: cleanText(entry.queuedBy, 40) || 'Someone',
      });
    }
  }

  return state;
}
