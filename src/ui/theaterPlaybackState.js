/**
 * Theater playback supervision (fix-theater-second-player-playback, design D2).
 *
 * Pure decision logic for "the shared bill says playing — what should this
 * client's engine do?". One state machine replaces the per-engine watchdogs:
 * it treats a player that never started (unstarted/cued), a player that started
 * and then stopped (paused, stalled buffer), and a healthy-but-drifting player
 * uniformly.
 *
 * Engine adapters normalize their own state to one of:
 *   loading | ready | unstarted | cued | buffering | playing | paused | ended | error
 * and the caller feeds progress bookkeeping from `updateProgress()`.
 *
 * No DOM, no renderer, no network — unit-tested under Node.
 */

/** Actions the supervisor can return. */
export const PLAYBACK_ACTION = Object.freeze({
  NONE: 'none',
  SEEK: 'seek',
  PLAY: 'play',
  PAUSE: 'pause',
  NEEDS_GESTURE: 'needs-gesture',
});

export const DEFAULT_STALL_MS = 4000;
export const DEFAULT_SEEK_THRESHOLD_SEC = 1.5;
/** Twitch clips are at most 60 s long; the room advances by 60 + margin. */
export const TWITCH_CLIP_GUARD_SEC = 75;
const PROGRESS_EPSILON_SEC = 0.25;

/**
 * Whether a YouTube player that never became ready should be rebuilt.
 *
 * Reported production symptom: the widget API posts to the player iframe
 * before its cross-origin navigation commits (the initial `about:blank`
 * window carries the app's origin), the browser throws
 * `Failed to execute 'postMessage' … target origin 'https://www.youtube.com'
 * does not match the recipient window's origin …`, and the API handshake can
 * die before `onReady`. A fresh player usually completes the handshake, so
 * allow ONE rebuild per item; a second failure must stop retrying and stay
 * local (never a room-wide failure report).
 *
 * @param {{ ready?: boolean, waitedMs?: number, timeoutMs?: number, alreadyRetried?: boolean }} input
 * @returns {boolean}
 */
export function shouldRetryPlayerReady(input = {}) {
  const {
    ready = false,
    waitedMs = 0,
    timeoutMs = 9000,
    alreadyRetried = false,
  } = input;
  if (ready) return false;
  if (waitedMs < timeoutMs) return false;
  return alreadyRetried !== true;
}

/**
 * Failure taxonomy (design D3). A room-wide `failed` report is only honest when
 * the SOURCE is unplayable for everyone; a restriction local to this browser
 * (autoplay policy, blocked embed script, transient player hiccup) must never
 * advance the shared bill.
 *
 * Source-fatal evidence:
 *   - direct/HLS/torrent `<video>` error events, and fatal hls.js errors
 *   - YouTube error 100 (removed/private), 101/150 (embedding disallowed)
 *   - Vimeo NotFoundError / PrivacyError / PasswordError
 * Everything else — including any unknown code and a missing player API — is
 * client-local and handled with a local message, never a report.
 *
 * @param {{ engineKind?: string|null, code?: number|string|null, name?: string|null,
 *           fatal?: boolean, videoError?: boolean }} failure
 * @returns {boolean} true when the shared item should be reported failed
 */
export function isSourceFatalFailure(failure = {}) {
  const kind = failure.engineKind;

  if (kind === 'youtube') {
    const code = Number(failure.code);
    return code === 100 || code === 101 || code === 150;
  }

  if (kind === 'vimeo') {
    const name = String(failure.name || '');
    return name === 'NotFoundError' || name === 'PrivacyError' || name === 'PasswordError';
  }

  // Twitch's official player exposes no documented fatal-source event, so
  // every Twitch symptom (blocked autoplay, offline channel, network trouble)
  // stays local: never advance the shared bill on ambiguous evidence.
  if (kind === 'twitch') return false;

  if (kind === 'file' || kind === 'direct' || kind === 'hls' || kind === 'torrent' || kind === 'video') {
    return failure.videoError === true || failure.fatal === true;
  }

  return false;
}

/**
 * Normalized supervision state for the Twitch adapter from the coarse facts
 * its player API exposes (it has no buffering event). Precedence, highest
 * first: ended, blocked autoplay, offline, playing, paused, ready, loading.
 * An offline channel maps to `loading` so supervision leaves it alone while
 * Twitch shows its offline card.
 *
 * @param {{ ended?: boolean, blocked?: boolean, offline?: boolean,
 *           playing?: boolean, paused?: boolean, ready?: boolean }} facts
 * @returns {'ended'|'unstarted'|'loading'|'playing'|'paused'|'ready'}
 */
export function twitchEngineState(facts = {}) {
  if (facts.ended) return 'ended';
  if (facts.blocked) return 'unstarted';
  if (facts.offline) return 'loading';
  if (facts.playing) return 'playing';
  if (facts.paused) return 'paused';
  if (facts.ready) return 'ready';
  return 'loading';
}

/**
 * The bounded clip guard: a Twitch clip's non-interactive player emits no
 * end event, so the room advances it after the maximum clip length plus a
 * margin. Skipping first is the normal path; this only prevents a wedged
 * bill. Once a report has been sent for the item id, the guard stays quiet.
 *
 * @param {{ item?: object|null, elapsedSec?: number, reported?: boolean }} input
 * @returns {boolean} true when the caller should report the clip ended
 */
export function shouldAdvanceTwitchClip(input = {}) {
  const { item, elapsedSec, reported = false } = input;
  if (reported) return false;
  if (!item || item.kind !== 'twitch' || item.twitchType !== 'clip') return false;
  return Number.isFinite(elapsedSec) && elapsedSec >= TWITCH_CLIP_GUARD_SEC;
}

/**
 * Track the last moment the engine's position actually moved. A static
 * position (blocked autoplay, paused player, frozen buffer) leaves
 * `lastProgressAt` untouched, which is what arms the stall detector.
 *
 * @param {{ lastPositionSec?: number|null, lastProgressAt?: number|null }} prev
 * @param {number|null|undefined} positionSec engine position, seconds
 * @param {number} nowMs
 * @returns {{ lastPositionSec: number|null, lastProgressAt: number|null }}
 */
export function updateProgress(prev = {}, positionSec, nowMs = Date.now()) {
  const lastPositionSec = Number.isFinite(prev.lastPositionSec) ? prev.lastPositionSec : null;
  const lastProgressAt = Number.isFinite(prev.lastProgressAt) ? prev.lastProgressAt : null;

  if (!Number.isFinite(positionSec)) return { lastPositionSec, lastProgressAt };

  // First observation starts the stall clock; later movement re-arms it.
  if (lastPositionSec == null || Math.abs(positionSec - lastPositionSec) > PROGRESS_EPSILON_SEC) {
    return { lastPositionSec: positionSec, lastProgressAt: nowMs };
  }
  return { lastPositionSec, lastProgressAt: lastProgressAt ?? nowMs };
}

/**
 * The next supervision action for the current engine observation.
 *
 * @param {object} input
 * @param {boolean} input.wantPlaying shared bill says the item is playing
 * @param {string|null|undefined} input.engineState normalized engine state
 * @param {number|null|undefined} input.positionSec engine position (seconds)
 * @param {number|null|undefined} input.targetSec shared-timeline position
 * @param {number} [input.nowMs]
 * @param {number|null} [input.lastProgressAt] from `updateProgress()`
 * @param {boolean} [input.needsGesture] a previous play attempt was refused
 * @param {boolean} [input.seekAllowed] false for live HLS (no seek)
 * @param {number} [input.stallMs] how long without progress before asking for
 *   a gesture (never-started players and paused-after-start players)
 * @param {number} [input.seekThresholdSec]
 * @returns {'none'|'seek'|'play'|'pause'|'needs-gesture'}
 */
export function nextPlaybackAction(input = {}) {
  const {
    wantPlaying,
    engineState,
    positionSec,
    targetSec,
    nowMs = Date.now(),
    lastProgressAt = null,
    needsGesture = false,
    seekAllowed = true,
    stallMs = DEFAULT_STALL_MS,
    seekThresholdSec = DEFAULT_SEEK_THRESHOLD_SEC,
  } = input;

  if (engineState === 'error' || engineState === 'ended') return PLAYBACK_ACTION.NONE;

  // Without a real bill decision there is nothing to enforce.
  if (typeof wantPlaying !== 'boolean') return PLAYBACK_ACTION.NONE;

  if (!wantPlaying) {
    return engineState === 'paused' ? PLAYBACK_ACTION.NONE : PLAYBACK_ACTION.PAUSE;
  }

  // A refused play is sticky until the caller's gesture handler clears it:
  // issuing more gesture-less play() calls cannot succeed and hides the
  // affordance the player needs.
  if (needsGesture) return PLAYBACK_ACTION.NEEDS_GESTURE;

  if (engineState == null || engineState === 'loading' || engineState === 'ready') {
    return PLAYBACK_ACTION.NONE;
  }

  if (engineState === 'playing') {
    if (
      seekAllowed
      && Number.isFinite(positionSec)
      && Number.isFinite(targetSec)
      && Math.abs(positionSec - targetSec) > seekThresholdSec
    ) {
      return PLAYBACK_ACTION.SEEK;
    }
    return PLAYBACK_ACTION.NONE;
  }

  // A buffering engine that is still fetching cannot be helped by a gesture;
  // leave the loader alone and let the media element resume on its own.
  if (engineState === 'buffering') return PLAYBACK_ACTION.NONE;

  // unstarted | cued | paused (and unknown states while playing is wanted):
  // try once, then — if no progress ever follows — surface the start control.
  const stalled = Number.isFinite(lastProgressAt) && nowMs - lastProgressAt >= stallMs;
  if (stalled) return PLAYBACK_ACTION.NEEDS_GESTURE;
  return PLAYBACK_ACTION.PLAY;
}
