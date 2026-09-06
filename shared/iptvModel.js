/**
 * Pure model for the shared IPTV library (playlists) and the uploaded
 * program guide — the Orpheum's room-shared channel catalog.
 *
 * Side-effect free like shared/theaterModel.js: the server applies these
 * helpers before persisting, the client reuses the sanitizers on received
 * payloads, and tests pin the rules. Nothing here reads files, fetches
 * URLs, or touches the network — the library starts empty and only grows
 * through explicit uploads.
 *
 * Library shape (persisted as data/iptv.json):
 *   { lists: [ { id, name, addedBy, addedAt, channels: [{url, name, group,
 *              logo, tvgId}] } ] }
 * Guide shape (persisted as data/epg.json — see shared/xmltv.js):
 *   { name, updatedAt, channels: {id: {names, icon}},
 *     programmes: {id: [[startMs, stopMs, title, desc?]]} }
 */

import { parseM3U } from './theaterModel.js';

export const IPTV_LIMITS = {
  LISTS_MAX: 24,
  LIST_TEXT_MAX: 8 * 1024 * 1024, // playlist text bytes
  CHANNELS_MAX: 20_000, // channels per list (full multi-thousand-entry playlists must fit whole)
  NAME_MAX: 80,
  CHANNEL_NAME_MAX: 200,
  GROUP_MAX: 120,
  EPG_NAME_MAX: 120,
  EPG_FILE_MAX: 64 * 1024 * 1024, // compressed or plain guide bytes
  EPG_CHANNELS_MAX: 50_000,
  EPG_PROGRAMMES_MAX: 250_000,
  EPG_LOOKUP_MAX: 300, // keys per now/next lookup
};

function cleanName(value, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const clean = value.replace(/\s+/g, ' ').trim().slice(0, IPTV_LIMITS.NAME_MAX);
  return clean || fallback;
}

function cleanAddedBy(value) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 40) : 'Someone';
}

/** Keep the http(s)-only channel fields the guide and player actually use. */
export function sanitizeChannels(raw, max = IPTV_LIMITS.CHANNELS_MAX) {
  const out = [];
  if (!Array.isArray(raw)) return out;
  const cap = Number.isFinite(max) && max > 0 ? max : IPTV_LIMITS.CHANNELS_MAX;
  for (const ch of raw) {
    if (out.length >= cap) break;
    if (!ch || typeof ch !== 'object') continue;
    const url = typeof ch.url === 'string' ? ch.url.trim() : '';
    if (!/^https?:\/\//i.test(url)) continue;
    const tvgId = typeof ch.tvgId === 'string' ? ch.tvgId.trim().slice(0, IPTV_LIMITS.GROUP_MAX) : '';
    out.push({
      url,
      name:
        typeof ch.name === 'string' && ch.name.trim()
          ? ch.name.trim().slice(0, IPTV_LIMITS.CHANNEL_NAME_MAX)
          : `Channel ${out.length + 1}`,
      group:
        typeof ch.group === 'string' && ch.group.trim()
          ? ch.group.trim().slice(0, IPTV_LIMITS.GROUP_MAX)
          : null,
      logo: typeof ch.logo === 'string' && /^https?:\/\//i.test(ch.logo.trim())
        ? ch.logo.trim()
        : null,
      tvgId: tvgId || null,
    });
  }
  return out;
}

function newId(nowMs) {
  return `iptv_${Number(nowMs).toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Add an uploaded playlist (already-fetched text) to the library. Returns
 * `{ library, error, list }` — `error` is a stable reason string (null on
 * success) and `library` is null on failure. Parsing reuses parseM3U so the
 * server and any client agree entry-for-entry on what a playlist contains.
 */
export function applyAddPlaylist(library, { name, text, addedBy } = {}, nowMs = Date.now()) {
  if (!text || typeof text !== 'string') return { library: null, error: 'not_a_playlist', list: null };
  if (text.length > IPTV_LIMITS.LIST_TEXT_MAX) return { library: null, error: 'text_too_large', list: null };
  const lists = Array.isArray(library?.lists) ? library.lists : [];
  if (lists.length >= IPTV_LIMITS.LISTS_MAX) return { library: null, error: 'too_many_lists', list: null };

  const parsed = parseM3U(text);
  if (!parsed.recognized) return { library: null, error: 'not_a_playlist', list: null };
  if (!parsed.entries.length) return { library: null, error: 'no_channels', list: null };
  if (parsed.entries.length > IPTV_LIMITS.CHANNELS_MAX) {
    return { library: null, error: 'too_many_channels', list: null };
  }

  const list = {
    id: newId(nowMs),
    name: cleanName(name, `Imported ${new Date(nowMs).toLocaleDateString()}`),
    addedBy: cleanAddedBy(addedBy),
    addedAt: Number(nowMs) || Date.now(),
    channels: sanitizeChannels(parsed.entries),
  };
  return { library: { lists: [...lists, list] }, error: null, list };
}

/** Remove a shared list by id. Anyone in the room may; returns `{ library, error }`. */
export function applyRemoveList(library, listId) {
  const lists = Array.isArray(library?.lists) ? library.lists : [];
  const idx = lists.findIndex((l) => l?.id === listId);
  if (idx === -1) return { library: null, error: 'list_not_found' };
  return { library: { lists: lists.filter((_, i) => i !== idx) }, error: null };
}

/** Repair untrusted persisted/received library data into a safe shape. */
export function normalizeIptvLibrary(raw) {
  const out = { lists: [] };
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.lists)) return out;
  for (const entry of raw.lists) {
    if (out.lists.length >= IPTV_LIMITS.LISTS_MAX) break;
    if (!entry || typeof entry !== 'object') continue;
    const channels = sanitizeChannels(entry.channels);
    if (!channels.length) continue; // nothing playable -> drop the list
    out.lists.push({
      id: typeof entry.id === 'string' && entry.id ? entry.id : newId(Date.now()),
      name: cleanName(entry.name, 'Untitled list'),
      addedBy: cleanAddedBy(entry.addedBy),
      addedAt: Number.isFinite(Number(entry.addedAt)) ? Number(entry.addedAt) : Date.now(),
      channels,
    });
  }
  return out;
}

function sanitizeGuideChannels(raw, max) {
  const channels = {};
  if (!raw || typeof raw !== 'object') return channels;
  let count = 0;
  for (const [id, ch] of Object.entries(raw)) {
    if (count >= max) break;
    if (typeof id !== 'string' || !id || !ch || typeof ch !== 'object') continue;
    const names = Array.isArray(ch.names)
      ? ch.names.filter((n) => typeof n === 'string' && n.trim()).map((n) => n.trim().slice(0, IPTV_LIMITS.CHANNEL_NAME_MAX)).slice(0, 6)
      : [];
    const icon = typeof ch.icon === 'string' && /^https?:\/\//i.test(ch.icon) ? ch.icon : null;
    channels[id] = { names, icon };
    count++;
  }
  return channels;
}

function sanitizeGuideProgrammes(raw, max) {
  const programmes = {};
  if (!raw || typeof raw !== 'object') return programmes;
  let count = 0;
  outer: for (const [id, arr] of Object.entries(raw)) {
    if (typeof id !== 'string' || !id || !Array.isArray(arr)) continue;
    const entries = [];
    for (const e of arr) {
      if (count >= max) break outer;
      if (!Array.isArray(e) || e.length < 3) continue;
      const [start, stop, title] = e;
      if (!Number.isFinite(start) || !Number.isFinite(stop) || stop <= start) continue;
      if (typeof title !== 'string' || !title.trim()) continue;
      const desc = typeof e[3] === 'string' && e[3].trim() ? e[3].trim().slice(0, 200) : null;
      entries.push(desc ? [start, stop, title.trim().slice(0, IPTV_LIMITS.CHANNEL_NAME_MAX), desc] : [start, stop, title.trim().slice(0, IPTV_LIMITS.CHANNEL_NAME_MAX)]);
      count++;
    }
    if (entries.length) {
      entries.sort((a, b) => a[0] - b[0]);
      programmes[id] = entries;
    }
  }
  return programmes;
}

/** Replace the active guide with a freshly parsed one. Returns `{ epg }`. */
export function applySetEpg({ name, channels, programmes } = {}, nowMs = Date.now()) {
  const epg = {
    name: cleanName(name, 'Program guide').slice(0, IPTV_LIMITS.EPG_NAME_MAX),
    updatedAt: Number(nowMs) || Date.now(),
    channels: sanitizeGuideChannels(channels, IPTV_LIMITS.EPG_CHANNELS_MAX),
    programmes: sanitizeGuideProgrammes(programmes, IPTV_LIMITS.EPG_PROGRAMMES_MAX),
  };
  return { epg };
}

/** Repair untrusted persisted guide data; null means "no active guide". */
export function normalizeEpg(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const { epg } = applySetEpg(raw, Number(raw.updatedAt) || Date.now());
  return epg;
}

/** Summary broadcast in snapshots: honest counts of what actually loaded. */
export function epgSummary(epg) {
  if (!epg) return null;
  let channelCount = 0;
  let programmeCount = 0;
  for (const arr of Object.values(epg.programmes || {})) {
    if (Array.isArray(arr) && arr.length) {
      channelCount++;
      programmeCount += arr.length;
    }
  }
  return {
    name: epg.name,
    updatedAt: epg.updatedAt,
    channels: channelCount,
    programmes: programmeCount,
  };
}

/**
 * The catalog every theater occupant receives: list metadata only (never
 * the channel arrays — those are pulled on demand per list).
 */
export function catalogSnapshot({ lists, epg } = {}) {
  return {
    lists: (Array.isArray(lists) ? lists : []).map((l) => ({
      id: l.id,
      name: l.name,
      addedBy: l.addedBy,
      channelCount: Array.isArray(l.channels) ? l.channels.length : 0,
    })),
    epg: epgSummary(epg),
  };
}

/** Readable message for a library error reason (client + server reuse). */
export function iptvErrorText(reason) {
  switch (reason) {
    case 'too_many_lists':
      return `The theater's channel shelf is full (${IPTV_LIMITS.LISTS_MAX} lists). Remove one to make room.`;
    case 'text_too_large':
      return 'That playlist text is too large to file — trim it or split it into a couple of lists.';
    case 'too_many_channels':
      return `That playlist carries more than ${IPTV_LIMITS.CHANNELS_MAX} channels — more than the guide can hold.`;
    case 'no_channels':
      return 'No playable channels were found in that playlist.';
    case 'not_a_playlist':
      return 'That does not look like an M3U/M3U8 playlist — it should start with #EXTM3U or contain channel URLs, one per line.';
    case 'list_not_found':
      return 'That list is no longer in the theater library.';
    default:
      return 'The theater could not accept that.';
  }
}

function escapeAttr(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/**
 * Serialize channel entries back to M3U text — how a player pushes their
 * locally saved list into the shared library (localStorage keeps entries,
 * not raw text). Round-trips through parseM3U including tvg-id.
 */
export function serializeM3U(channels) {
  let out = '#EXTM3U\n';
  for (const ch of Array.isArray(channels) ? channels : []) {
    if (!ch?.url || !/^https?:\/\//i.test(ch.url)) continue;
    const attrs = [];
    if (ch.tvgId) attrs.push(`tvg-id="${escapeAttr(ch.tvgId)}"`);
    if (ch.name) attrs.push(`tvg-name="${escapeAttr(ch.name)}"`);
    if (ch.group) attrs.push(`group-title="${escapeAttr(ch.group)}"`);
    if (ch.logo) attrs.push(`tvg-logo="${escapeAttr(ch.logo)}"`);
    out += `#EXTINF:-1 ${attrs.join(' ')},${ch.name || 'Channel'}\n${ch.url}\n`;
  }
  return out;
}
