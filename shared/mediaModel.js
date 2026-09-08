/**
 * Pure media compatibility rules for The Orpheum (shared/theaterModel.js).
 *
 * Side-effect free: server, client, and tests run the same planning logic.
 * Actual ffprobe/ffmpeg execution lives server-side only.
 */

export const MEDIA_LIMITS = {
  PROBE_TIMEOUT_MS: 15_000,
  PREPARE_TIMEOUT_MS: 3_600_000,
  MAX_CONCURRENT: 2,
  MAX_REDIRECTS: 3,
  PROBE_MAX_BYTES: 8 * 1024 * 1024,
  CACHE_MAX_BYTES_DEFAULT: 8 * 1024 * 1024 * 1024,
  CACHE_TTL_MS: 7 * 24 * 60 * 60 * 1000,
  HLS_SEGMENT_SEC: 4,
};

/** Bill / wire prepare lifecycle. */
export const PREPARE_STATUS = {
  DIRECT: 'direct',
  PENDING: 'pending',
  PROBING: 'probing',
  PREPARING: 'preparing',
  READY: 'ready',
  FAILED: 'failed',
};

/** Containers browsers decode in <video> without remux. */
export const BROWSER_CONTAINERS = new Set(['mp4', 'm4v', 'webm', 'mov', 'ogv', 'ogg']);

/** Extensions that always need server preparation when reachable. */
export const NEEDS_PREPARE_EXT = new Set(['mkv', 'avi', 'wmv', 'flv', 'ts', 'm2ts']);

/** Video codecs HTML5 can decode in common browsers. */
export const BROWSER_VIDEO_CODECS = new Set(['h264', 'avc', 'avc1', 'vp8', 'vp9', 'av1', 'theora']);

/** Audio codecs HTML5 can decode in common browsers. */
export const BROWSER_AUDIO_CODECS = new Set(['aac', 'mp3', 'opus', 'vorbis', 'flac']);

const PATH_EXT_RE = /\.([a-z0-9]+)(?:\?|#|$)/i;

export function pathExtension(url) {
  if (typeof url !== 'string') return '';
  try {
    const m = PATH_EXT_RE.exec(new URL(url).pathname);
    return m ? m[1].toLowerCase() : '';
  } catch {
    const m = PATH_EXT_RE.exec(url);
    return m ? m[1].toLowerCase() : '';
  }
}

export function normalizeCodec(name) {
  if (typeof name !== 'string' || !name) return '';
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function videoCodecPlayable(codec) {
  const n = normalizeCodec(codec);
  if (!n) return false;
  if (BROWSER_VIDEO_CODECS.has(n)) return true;
  return n.startsWith('h264') || n.startsWith('avc');
}

export function audioCodecPlayable(codec) {
  const n = normalizeCodec(codec);
  if (!n) return false;
  return BROWSER_AUDIO_CODECS.has(n);
}

/**
 * Whether a classified direct file likely needs server preparation
 * before <video> can play it (extension hint only).
 */
export function extensionNeedsPrepare(url) {
  const ext = pathExtension(url);
  return NEEDS_PREPARE_EXT.has(ext);
}

/**
 * Whether probe results indicate direct browser playback in MP4/WebM container.
 */
export function probeDirectPlayable(probe) {
  if (!probe || typeof probe !== 'object') return false;
  const container = normalizeCodec(probe.container || pathExtension(probe.sourceUrl || ''));
  if (!BROWSER_CONTAINERS.has(container)) return false;
  const v = probe.videoCodec;
  const a = probe.audioCodec;
  if (v && !videoCodecPlayable(v)) return false;
  if (a && !audioCodecPlayable(a)) return false;
  return Boolean(v || a);
}

/**
 * Plan the cheapest compatible transformation.
 * Returns { strategy, outputKind, videoCopy, audioCopy, transcodeVideo, transcodeAudio }.
 * strategy: direct | remux | transcode_audio | transcode_full
 */
export function planCompatibility(probe) {
  if (!probe || typeof probe !== 'object') {
    return {
      strategy: 'transcode_full',
      outputKind: 'hls',
      videoCopy: false,
      audioCopy: false,
      transcodeVideo: true,
      transcodeAudio: true,
    };
  }

  if (probeDirectPlayable(probe)) {
    return {
      strategy: 'direct',
      outputKind: 'direct',
      videoCopy: true,
      audioCopy: true,
    };
  }

  const videoOk = !probe.videoCodec || videoCodecPlayable(probe.videoCodec);
  const audioOk = !probe.audioCodec || audioCodecPlayable(probe.audioCodec);

  if (videoOk && audioOk) {
    return {
      strategy: 'remux',
      outputKind: 'hls',
      videoCopy: true,
      audioCopy: true,
    };
  }

  if (videoOk && !audioOk) {
    return {
      strategy: 'transcode_audio',
      outputKind: 'hls',
      videoCopy: true,
      audioCopy: false,
      transcodeAudio: true,
    };
  }

  return {
    strategy: 'transcode_full',
    outputKind: 'hls',
    videoCopy: false,
    audioCopy: false,
    transcodeVideo: true,
    transcodeAudio: true,
  };
}

/** Stable cache key from normalized URL + probe + plan. */
export function prepareCacheKey(sourceUrl, probe, plan) {
  const base = String(sourceUrl || '').trim();
  const probeSig = [
    normalizeCodec(probe?.container),
    normalizeCodec(probe?.videoCodec),
    normalizeCodec(probe?.audioCodec),
    probe?.width || 0,
    probe?.height || 0,
  ].join('|');
  const planSig = plan?.strategy || 'unknown';
  return simpleHash(`${base}\n${probeSig}\n${planSig}`);
}

function simpleHash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `med_${(h >>> 0).toString(36)}`;
}

/** Initial prepare fields for a newly queued item. */
export function initialPrepareFields(classified) {
  if (!classified || classified.kind !== 'file' || !classified.needsPrepare) return {};
  return {
    sourceUrl: classified.url,
    prepareStatus: PREPARE_STATUS.PENDING,
    playbackUrl: null,
    prepareId: null,
    prepareError: null,
  };
}

/** Copy prepare fields between bill items. */
export function copyPrepareFields(item) {
  if (!item || typeof item !== 'object') return {};
  const out = {};
  if (item.sourceUrl) out.sourceUrl = item.sourceUrl;
  if (item.playbackUrl) out.playbackUrl = item.playbackUrl;
  if (item.prepareStatus) out.prepareStatus = item.prepareStatus;
  if (item.prepareId) out.prepareId = item.prepareId;
  if (item.prepareError) out.prepareError = item.prepareError;
  return out;
}

/** Resolved playback URL and engine kind for the client player. */
export function resolvedPlayback(item) {
  if (!item) return { url: null, engine: null, waiting: true };
  const status = item.prepareStatus;
  if (status === PREPARE_STATUS.FAILED) {
    return { url: null, engine: null, waiting: false, error: item.prepareError || 'prepare_failed' };
  }
  if (status && status !== PREPARE_STATUS.DIRECT && status !== PREPARE_STATUS.READY) {
    return { url: null, engine: null, waiting: true, status };
  }
  const url = item.playbackUrl || item.url;
  const kind = item.kind === 'hls' || (item.playbackUrl && item.kind === 'file' && status === PREPARE_STATUS.READY)
    ? 'hls'
    : item.kind;
  if (kind === 'hls') return { url, engine: 'hls', waiting: false };
  if (kind === 'file' || kind === 'torrent') return { url, engine: 'direct', waiting: false };
  return { url, engine: kind, waiting: false };
}

export function mediaErrorText(code) {
  switch (code) {
    case 'unreachable': return 'That video could not be reached.';
    case 'probe_failed': return 'The projector could not identify that media format.';
    case 'auth_required': return 'That source requires authentication the projector does not have.';
    case 'host_rejected': return 'The host refused to serve that video.';
    case 'blocked': return 'That video URL cannot be fetched safely.';
    case 'engine_unavailable': return 'This server cannot prepare that format right now.';
    case 'prepare_failed': return 'The projector could not prepare that video.';
    case 'prepare_timeout': return 'Preparing that video took too long.';
    case 'too_large': return 'That video is too large to prepare here.';
    default: return 'The projector could not play that video.';
  }
}

/** Sanitize prepare fields on normalize. */
export function sanitizePrepareFields(entry, classified) {
  const fields = copyPrepareFields(entry);
  if (classified?.kind !== 'file') {
    return {};
  }
  const status = fields.prepareStatus;
  if (!status) {
    if (classified.needsPrepare) {
      return {
        sourceUrl: classified.url,
        prepareStatus: PREPARE_STATUS.PENDING,
        playbackUrl: null,
        prepareId: null,
        prepareError: null,
      };
    }
    return {};
  }
  if (status === PREPARE_STATUS.READY && typeof fields.playbackUrl === 'string' && fields.playbackUrl) {
    return fields;
  }
  if (status === PREPARE_STATUS.FAILED) {
    return {
      sourceUrl: fields.sourceUrl || classified.url,
      prepareStatus: PREPARE_STATUS.FAILED,
      prepareError: cleanShort(fields.prepareError),
      playbackUrl: null,
      prepareId: fields.prepareId || null,
    };
  }
  return {
    sourceUrl: fields.sourceUrl || classified.url,
    prepareStatus: status,
    playbackUrl: null,
    prepareId: fields.prepareId || null,
    prepareError: null,
  };
}

function cleanShort(value) {
  if (typeof value !== 'string') return null;
  const t = value.replace(/\s+/g, ' ').trim().slice(0, 160);
  return t || null;
}
