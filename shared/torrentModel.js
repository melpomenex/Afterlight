/**
 * Pure model for the Orpheum's torrent streaming (magnet links).
 *
 * Side-effect free like shared/theaterModel.js and shared/iptvModel.js so
 * the server, the client, and the tests run the same rules. Deliberately
 * imports nothing from theaterModel (no import cycles): the URL cap is
 * mirrored here as URL_MAX.
 *
 * A "torrent pick" is the outcome of the resolve→pick flow: the magnet
 * itself (classified by theaterModel as kind 'torrent') plus which file
 * inside the torrent will play:
 *   { fileIndex: number, filePath: string, fileBytes: number }
 */

/** Mirrors THEATER_LIMITS.URL_MAX (kept local to avoid an import cycle). */
export const URL_MAX = 2048;

export const TORRENT_LIMITS = {
  RESOLVE_TIMEOUT_MS: 45_000,
  // Waiting on metadata for a stream request after a restart: shorter than
  // a paster's resolve (the swarm was reachable recently if the bill says so).
  STREAM_METADATA_TIMEOUT_MS: 20_000,
  PICKER_FILES_MAX: 60,
  PATH_MAX: 512,
  STATUS_BROADCAST_MS: 2_000,
  // Older than this a status snapshot is considered stale (clients fall back
  // to the generic loading state).
  STATUS_FRESH_MS: 7_000,
  // Cache policy (server-side defaults; env-tunable at the manager).
  CACHE_MAX_BYTES_DEFAULT: 4 * 1024 * 1024 * 1024,
  IDLE_REAP_MS: 10 * 60 * 1000,
};

const HEX_RE = /^[0-9a-fA-F]{40}$/;
const BASE32_RE = /^[A-Z2-7]{32}$/;

/**
 * Video file extensions recognized inside torrents. `BROWSER_PLAYABLE`
 * marks the subset ordinary <video> elements can decode; the rest are
 * offered in the picker flagged "may not play" (no transcoding).
 */
export const VIDEO_FILE_EXTENSIONS = new Set([
  'mp4', 'm4v', 'webm', 'mov', 'ogv', 'ogg', 'mkv', 'avi',
]);
export const BROWSER_PLAYABLE = new Set(['mp4', 'm4v', 'webm', 'mov', 'ogv', 'ogg']);

function extOf(filePath) {
  const m = /\.([a-z0-9]+)$/i.exec(String(filePath || ''));
  return m ? m[1].toLowerCase() : '';
}

/** Whether a torrent entry path looks like a video file we can serve. */
export function isVideoFile(filePath) {
  return VIDEO_FILE_EXTENSIONS.has(extOf(filePath));
}

/**
 * Parse and validate a user-supplied magnet URI. Returns
 * `{ url, infohash }` (url trimmed as supplied, infohash lowercased hex
 * normalized from hex or base32 v1 btih) or null for anything else:
 * wrong scheme, no btih xt-param, malformed infohash, oversize.
 */
export function parseMagnet(rawUrl) {
  if (typeof rawUrl !== 'string') return null;
  const url = rawUrl.trim();
  if (!url || url.length > URL_MAX) return null;
  if (!url.toLowerCase().startsWith('magnet:?')) return null;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'magnet:') return null;
  for (const xt of parsed.searchParams.getAll('xt')) {
    const m = /^urn:btih:(.+)$/i.exec(xt.trim());
    if (!m) continue;
    const raw = m[1];
    if (HEX_RE.test(raw)) return { url, infohash: raw.toLowerCase() };
    if (BASE32_RE.test(raw)) {
      // Normalize base32 infohashes to hex so one torrent has one key.
      // (Byte math instead of Buffer: this module runs in browsers too.)
      const hex = '0123456789abcdef';
      let bits = 0;
      let value = 0;
      let out = '';
      for (const ch of raw.toUpperCase()) {
        value = (value << 5) | 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(ch);
        bits += 5;
        if (bits >= 8) {
          const byte = (value >> (bits - 8)) & 0xff;
          out += hex[(byte >> 4) & 0xf] + hex[byte & 0xf];
          bits -= 8;
        }
      }
      return { url, infohash: out };
    }
  }
  return null;
}

/**
 * Structure-check an untrusted torrent pick (queue payload, persisted
 * item). Returns `{ fileIndex, filePath, fileBytes }` or null.
 */
export function sanitizeTorrentPick(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const fileIndex = Number(raw.fileIndex);
  const filePath = typeof raw.filePath === 'string' ? raw.filePath.trim() : '';
  const fileBytes = Number(raw.fileBytes);
  if (!Number.isInteger(fileIndex) || fileIndex < 0 || fileIndex > 1e6) return null;
  if (!filePath || filePath.length > TORRENT_LIMITS.PATH_MAX) return null;
  if (!Number.isFinite(fileBytes) || fileBytes < 0) return null;
  return { fileIndex, filePath, fileBytes };
}

/**
 * Build the bill title for a picked file: "<torrent> — <file>", with the
 * torrent name standing alone when the file path adds nothing.
 * `max` defaults to a theater-title-friendly length.
 */
export function torrentTitle(torrentName, filePath, max = 120) {
  const name = String(torrentName || '').replace(/\s+/g, ' ').trim();
  const file = String(filePath || '')
    .split('/')
    .pop()
    .replace(/\s+/g, ' ')
    .trim();
  const combined = name && file && file.toLowerCase() !== name.toLowerCase()
    ? `${name} — ${file}`
    : (name || file || 'A torrent stream');
  return combined.slice(0, max);
}

/**
 * Shape the torrent's file list for the picker: video files only, likely
 * browser-playable first, larger files first within each group, capped.
 * Input: [{ index, path, length }] (raw metadata order). Output entries:
 * { index, path, bytes, playable }.
 */
export function orderFilesForPicker(files, cap = TORRENT_LIMITS.PICKER_FILES_MAX) {
  const videos = (Array.isArray(files) ? files : [])
    .filter((f) => f && Number.isInteger(f.index) && f.index >= 0 && typeof f.path === 'string' && isVideoFile(f.path))
    .map((f) => ({
      index: f.index,
      path: f.path,
      bytes: Number.isFinite(Number(f.length)) && Number(f.length) >= 0 ? Number(f.length) : 0,
      playable: BROWSER_PLAYABLE.has(extOf(f.path)),
    }));
  videos.sort((a, b) => (a.playable === b.playable ? b.bytes - a.bytes : a.playable ? -1 : 1));
  return videos.slice(0, Math.max(0, cap));
}

/**
 * Repair an untrusted torrent status snapshot to
 * { infohash, progress, peers, downloaded, ready } or null.
 */
export function normalizeTorrentStatus(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const infohash = typeof raw.infohash === 'string' && /^[0-9a-f]{40}$/.test(raw.infohash)
    ? raw.infohash
    : null;
  if (!infohash) return null;
  const progress = Number(raw.progress);
  const peers = Number(raw.peers);
  const downloaded = Number(raw.downloaded);
  return {
    infohash,
    progress: Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0,
    peers: Number.isInteger(peers) && peers >= 0 ? peers : 0,
    downloaded: Number.isFinite(downloaded) && downloaded >= 0 ? downloaded : 0,
    ready: raw.ready === true,
  };
}

/** Readable message for a torrent error reason (client + server reuse). */
export function torrentErrorText(reason) {
  switch (reason) {
    case 'engine_unavailable': return 'The projector\u2019s torrent engine is unavailable right now.';
    case 'invalid_magnet': return 'That does not look like a magnet link (magnet:?xt=urn:btih:\u2026).';
    case 'resolve_timeout': return 'The swarm never answered in time. Check the torrent has seeders and try again.';
    case 'resolve_failed': return 'The torrent could not be resolved. It may have no seeders.';
    case 'metadata_timeout': return 'The torrent\u2019s file list is taking too long to arrive. Try again.';
    case 'file_not_streamable': return 'That file is not something the projector can stream from the torrent.';
    case 'resolve_in_flight': return 'Hold on \u2014 one torrent is still being looked up.';
    case 'no_file_chosen': return 'Pick a file from the torrent first.';
    default: return 'The torrent reel jams; try that magnet again.';
  }
}
