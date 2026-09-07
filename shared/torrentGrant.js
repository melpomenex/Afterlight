/**
 * Pure HMAC playback grants for torrent stream URLs (P7 specialty adapters).
 * Token: base64url(JSON claims) + "." + base64url(HMAC-SHA256(secret, payload)).
 * Claims: { v, infohash, fileIndex, participant, exp }.
 */
import crypto from 'node:crypto';

export const TORRENT_GRANT_VERSION = 1;
export const TORRENT_GRANT_TTL_SECS = 300;
export const TORRENT_GRANT_RE_MINT_RATIO = 0.65;

const INFOHASH_RE = /^[0-9a-f]{40}$/;

/** Dev default matches Afterlight.Specialty.Grants — never use in production. */
const DEFAULT_SECRET = 'afterlight-torrent-grant-dev-secret-change-in-prod-000';

export function torrentGrantSecrets() {
  const current = process.env.AFTERLIGHT_TORRENT_GRANT_SECRET || DEFAULT_SECRET;
  const previous = process.env.AFTERLIGHT_TORRENT_GRANT_SECRET_PREVIOUS || null;
  return [current, previous].filter(Boolean);
}

export function signTorrentGrant(claims, secret) {
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function mintTorrentGrant(participant, infohash, fileIndex, opts = {}) {
  const ttl = opts.ttlSecs ?? TORRENT_GRANT_TTL_SECS;
  const nowMs = opts.nowMs ?? Date.now();
  const exp = Math.floor(nowMs / 1000) + ttl;
  const claims = {
    v: TORRENT_GRANT_VERSION,
    infohash: String(infohash || '').toLowerCase(),
    fileIndex: Number(fileIndex),
    participant: String(participant || ''),
    exp,
  };
  const secret = opts.secret ?? torrentGrantSecrets()[0];
  const grant = signTorrentGrant(claims, secret);
  return { grant, expiresAtMs: exp * 1000, claims };
}

/**
 * Verify a grant against the requested stream resource. Stateless; the
 * participant is bound in the token (capability model) — HTTP Range requests
 * carry only the grant query parameter.
 */
export function verifyTorrentGrant(token, infohash, fileIndex, secrets = torrentGrantSecrets(), nowSec = Math.floor(Date.now() / 1000)) {
  if (typeof token !== 'string' || !token.includes('.')) return { ok: false, reason: 'malformed' };
  const [payloadB64, sigB64] = token.split('.', 2);
  if (!payloadB64 || !sigB64) return { ok: false, reason: 'malformed' };

  let claims;
  try {
    claims = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  const validSig = secrets.some((secret) => {
    const expected = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sigB64));
    } catch {
      return false;
    }
  });
  if (!validSig) return { ok: false, reason: 'invalid_signature' };

  if (claims.v !== TORRENT_GRANT_VERSION) return { ok: false, reason: 'unknown_version' };
  if (!claims.participant || typeof claims.participant !== 'string') return { ok: false, reason: 'missing_fields' };
  if (!INFOHASH_RE.test(String(claims.infohash || ''))) return { ok: false, reason: 'missing_fields' };
  if (!Number.isInteger(claims.fileIndex) || claims.fileIndex < 0) return { ok: false, reason: 'missing_fields' };
  if (!Number.isInteger(claims.exp)) return { ok: false, reason: 'missing_fields' };
  if (claims.exp < nowSec - 10) return { ok: false, reason: 'expired' };

  const wantHash = String(infohash || '').toLowerCase();
  if (claims.infohash !== wantHash) return { ok: false, reason: 'wrong_file' };
  if (claims.fileIndex !== Number(fileIndex)) return { ok: false, reason: 'wrong_file' };

  return { ok: true, claims };
}

/** Redact grant query values for info-level request logging. */
export function redactGrantQuery(url) {
  if (typeof url !== 'string' || !url.includes('grant=')) return url;
  return url.replace(/([?&]grant=)[^&]+/g, '$1[redacted]');
}

export function shouldReMintGrant(expiresAtMs, nowMs = Date.now()) {
  const remaining = expiresAtMs - nowMs;
  const total = TORRENT_GRANT_TTL_SECS * 1000;
  return remaining <= total * (1 - TORRENT_GRANT_RE_MINT_RATIO);
}
