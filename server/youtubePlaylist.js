/**
 * Server-side YouTube playlist resolver for The Orpheum's import flow.
 *
 * Browsers cannot fetch youtube.com (CORS), so the server reads a public
 * playlist page and extracts its video list from the embedded ytInitialData
 * JSON. No API key, no new dependency: one bounded fetch plus a pure
 * extraction core that the node tests pin against synthetic fixtures.
 *
 * Rules (mirroring the IPTV fetch): http(s) by construction, one 15 s
 * timeout, a streaming size cap, and a hard cap on resolved videos. Mixes
 * and radios (infinite lists) are declined, not truncated silently.
 * Extraction robustness is a known risk (YouTube markup drift); every
 * failure maps to a stable reason string the shared model translates.
 */

import { THEATER_LIMITS } from '../shared/theaterModel.js';

const FETCH_TIMEOUT_MS = 15_000;
const FETCH_MAX_BYTES = 3 * 1024 * 1024; // a playlist page is big; cap tightly anyway
const PLAYLIST_ID_RE = /^[\w-]{12,}$/;

/**
 * Mix/radio ids never end: RD… (radio) and UL… (My Mix) are generated
 * queues, not fixed playlists, so there is no bounded list to import.
 */
export function isYouTubeMixId(listId) {
  return /^(RD|UL)/.test(String(listId || ''));
}

/** True when the string looks like a real playlist id (PL…, OLAK5uy_…, UU…). */
export function looksLikePlaylistId(listId) {
  return typeof listId === 'string' && PLAYLIST_ID_RE.test(listId);
}

/**
 * Pull the first ytInitialData assignment out of the page HTML and parse
 * it. Returns the data object or null (consent walls, unreadable pages).
 */
function parseYtInitialData(html) {
  const marker = html.indexOf('ytInitialData');
  if (marker === -1) return null;
  const start = html.indexOf('{', marker);
  if (start === -1) return null;
  // Walk the JSON text itself: brace matching respects strings and escapes,
  // so no regex gamble against a megabyte of markup.
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/** Playlist title from the metadata blocks, or null. */
function extractPlaylistTitle(data) {
  const title =
    data?.metadata?.playlistMetadataRenderer?.title ||
    data?.microformat?.microformatDataRenderer?.title ||
    data?.header?.playlistHeaderRenderer?.title;
  const text = typeof title === 'string'
    ? title
    : Array.isArray(title?.runs) ? title.runs.map((r) => r?.text).join('') : title?.simpleText;
  return typeof text === 'string' ? text.trim() : null;
}

/** {videoId, title} from a playlist-entry node, or null. YouTube ships two
 * layouts for the same thing: the classic playlistVideoRenderer and the
 * newer lockupViewModel (contentId + metadata title content). */
function videoFromNode(node) {
  if (node?.playlistVideoRenderer) {
    const r = node.playlistVideoRenderer;
    const videoId = typeof r?.videoId === 'string' ? r.videoId : null;
    if (!videoId || !/^[\w-]{6,}$/.test(videoId)) return null;
    const title = Array.isArray(r?.title?.runs)
      ? r.title.runs.map((t) => t?.text).join('')
      : r?.title?.simpleText;
    return { videoId, title: typeof title === 'string' ? title.trim() : '' };
  }
  if (node?.lockupViewModel) {
    const l = node.lockupViewModel;
    // Only plain video lockups are playlist entries; playlist lockups carry
    // a list id in contentId and would smuggle an unplayable entry in.
    if (typeof l?.contentType === 'string' && l.contentType !== 'LOCKUP_CONTENT_TYPE_VIDEO') return null;
    const videoId = typeof l?.contentId === 'string' ? l.contentId : null;
    if (!videoId || !/^[\w-]{6,}$/.test(videoId)) return null;
    const title = l?.metadata?.lockupMetadataViewModel?.title?.content;
    return { videoId, title: typeof title === 'string' ? title.trim() : '' };
  }
  return null;
}

/**
 * Depth-first sweep for playlist-entry nodes (playlistVideoRenderer on the
 * classic layout, lockupViewModel on the current one), in page order.
 * Sweeping beats hard-coding one container path.
 */
function collectVideos(data) {
  const videos = [];
  const seen = new Set();
  const visit = (node) => {
    if (!node || typeof node !== 'object' || videos.length >= THEATER_LIMITS.RESOLVE_MAX) return;
    if (Array.isArray(node)) {
      for (const child of node) visit(child);
      return;
    }
    const video = videoFromNode(node);
    if (video) {
      if (!seen.has(video.videoId)) {
        seen.add(video.videoId);
        videos.push(video);
      }
      return; // entry nodes are leaves for our purposes
    }
    for (const child of Object.values(node)) {
      if (child && typeof child === 'object') visit(child);
    }
  };
  visit(data);
  return videos;
}

/**
 * Pure extraction core: playlist HTML -> `{ title, videos:
 * [{videoId, title}] }` (ordered, deduped, capped at RESOLVE_MAX) or
 * `{ reason }` for a page that is not a readable public playlist. Synthetic
 * fixtures in the tests pin the shape.
 */
export function extractPlaylistVideos(html) {
  if (typeof html !== 'string' || !html.includes('ytInitialData')) {
    return { reason: 'playlist_unreadable' };
  }
  const data = parseYtInitialData(html);
  if (!data) return { reason: 'playlist_unreadable' };
  const videos = collectVideos(data);
  if (!videos.length) {
    // A real page that names no videos: private/deleted playlists look
    // exactly like this (alertsRenderer instead of a video list).
    return { reason: 'playlist_not_public' };
  }
  return {
    title: extractPlaylistTitle(data) || 'A YouTube playlist',
    videos,
  };
}

/**
 * Bounded resolve of one playlist id: fetch the page and extract. Returns
 * `{ title, videos }` or `{ reason }` — the same shapes as the pure core,
 * plus network-level failures mapped to stable reasons.
 */
export async function resolvePlaylist(listId) {
  if (!looksLikePlaylistId(listId)) return { reason: 'playlist_unreadable' };
  if (isYouTubeMixId(listId)) return { reason: 'is_mix' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    // hl=en pins the extraction language; the consent cookies skip the EU
    // interstitial that would otherwise serve a page with no ytInitialData.
    const res = await fetch(`https://www.youtube.com/playlist?list=${encodeURIComponent(listId)}&hl=en`, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'accept-language': 'en',
        cookie: 'CONSENT=YES+cb; SOCS=CAI',
      },
    });
    if (res.status === 403 || res.status === 404) return { reason: 'playlist_not_public' };
    if (!res.ok) return { reason: 'playlist_unreadable' };
    const declared = Number(res.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > FETCH_MAX_BYTES) return { reason: 'playlist_unreadable' };

    // Stream with a hard cap: the data we need sits well inside the first
    // megabytes, so an overgrown page is cut, not swallowed whole.
    const reader = res.body?.getReader?.();
    let html;
    if (reader) {
      const chunks = [];
      let size = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > FETCH_MAX_BYTES) {
          try {
            await reader.cancel();
          } catch {}
          return { reason: 'playlist_unreadable' };
        }
        chunks.push(value);
      }
      html = Buffer.concat(chunks).toString('utf8');
    } else {
      html = await res.text();
      if (html.length > FETCH_MAX_BYTES) return { reason: 'playlist_unreadable' };
    }
    return extractPlaylistVideos(html);
  } catch (err) {
    // Timeouts and network errors read the same to the player: try again.
    return { reason: 'playlist_unreadable' };
  } finally {
    clearTimeout(timer);
  }
}
