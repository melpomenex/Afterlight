/**
 * Billiards table sound engine (Spec convincing-billiards-audio).
 *
 * Presentation layer over the shared pool physics — it never touches rules,
 * input or authoritative state. Structure:
 *
 *   - ONE graph per table instance, built only inside the shared audioMixer
 *     context: [sources] → voice gain → stereo panner → table bus →
 *     compressor → audioMixer.buses.effects. No standalone AudioContext and
 *     no direct-destination fallback: if the mixer has no running context
 *     the table stays silent (and playable).
 *   - Cached sample playback from the palette under public/audio/pool/
 *     (see PROVENANCE.md there) with velocity layers, restrained variant
 *     selection and ±3% pitch variation; buffers are decoded once and shared
 *     per AudioContext, so returning to the table reuses them.
 *   - Bounded voices: 24 transient voices with priority stealing (cue/pocket
 *     outrank ball contacts, which outrank cushions; quietest expendable
 *     voice is stolen with a short fade) and one aggregate cloth movement
 *     voice driven by the visible ball speeds (well inside the 4-voice
 *     movement budget), silent within 200 ms of settling.
 *   - Shot-scoped reconciliation and cue ownership live in ./audioEvents.js;
 *     every ingestion path (prediction, snapshots, activity events, local
 *     cue animation) is normalized and deduplicated there before playback.
 *   - Lifecycle: activate/deactivate/dispose are generation-fenced; leaving
 *     the place stops all sound within 200 ms and cancels pending loads,
 *     never closing the shared context.
 */

import {
  normalizePoolAudioEvent,
  ballImpactLayer,
  cueLayer,
  impactGain,
  createShotEventReconciler,
  createCueStrikeTracker,
} from './audioEvents.js';

/** Decoded palette shared per AudioContext (keyed weakly by context). */
const BUFFER_CACHE = new WeakMap();

const PALETTE = Object.freeze({
  cue: ['cue-soft-1', 'cue-soft-2', 'cue-hard-1', 'cue-hard-2'],
  ball: ['ball-soft-1', 'ball-soft-2', 'ball-med-1', 'ball-med-2', 'ball-hard-1', 'ball-hard-2'],
  cushion: ['cushion-1', 'cushion-2', 'cushion-3'],
  pocket: ['pocket-1', 'pocket-2', 'pocket-3'],
  cloth: ['cloth-loop'],
});

const LAYER_PREFIX = Object.freeze({
  cue: { soft: 'cue-soft-', hard: 'cue-hard-' },
  ball: { soft: 'ball-soft-', med: 'ball-med-', hard: 'ball-hard-' },
});

/** Transient voice budget and stealing policy (design D3). */
const MAX_TRANSIENT_VOICES = 24;
const FAMILY_PRIORITY = Object.freeze({ cue: 3, pocket: 3, ball: 2, cushion: 1 });

/** Listener range in meters (matches the lounge audibility falloff). */
const AUDIBLE_RANGE_M = 14;
/** Aggregate ball speed (m/s) at which the cloth voice saturates. */
const CLOTH_SATURATION_SPEED = 10;
/** Voices whose aggregate speed is below this are treated as stationary. */
const CLOTH_MIN_SPEED = 0.05;

const LOAD_RETRY_DELAYS_MS = [4000, 12000];

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function createPoolAudio({
  audioMixer = null,
  getPlayer = null,
  tablePosition = [-8.6, 0, -4.5],
  tableRotationY = Math.PI / 2,
  getActiveCamera = null,
  fetchImpl = null,
  sampleBase = 'audio/pool',
  now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
} = {}) {
  const tableX = tablePosition[0];
  const tableZ = tablePosition.length === 3 ? tablePosition[2] : tablePosition[1];
  const tableY = tablePosition.length === 3 ? tablePosition[1] : 0;
  const cosR = Math.cos(tableRotationY);
  const sinR = Math.sin(tableRotationY);

  const reconciler = createShotEventReconciler();
  const cueTracker = createCueStrikeTracker();

  let generation = 0;
  let active = false;
  let disposed = false;

  // Palette loading state (per instance; buffers themselves are cached per
  // context above so a returning table never re-decodes).
  let loadPhase = 'idle'; // 'idle' | 'loading' | 'ready' | 'failed'
  let loadAttempts = 0;
  let retryAt = 0;
  let missingFamilies = new Set();
  let loadingFamilies = new Set();

  // Retained table graph (rebuilt when the shared context appears).
  let tableBus = null;
  let compressor = null;
  let graphContext = null;
  let graphGeneration = -1;

  // Transient voice registry.
  const voices = [];
  let variantCursor = 0;

  // Aggregate cloth movement voice.
  let cloth = null;

  function contextRunning() {
    const ctx = audioMixer?.context;
    if (!ctx || ctx.state !== 'running') return null;
    if (!audioMixer?.buses?.effects) return null;
    return ctx;
  }

  /**
   * Local table coordinates → world position (the tableScene root group's
   * translate+rotate transform, mirrored here for audio).
   */
  function tableToWorld(x, z, y = 0.78) {
    return {
      x: tableX + cosR * x - sinR * z,
      y: tableY + y,
      z: tableZ + sinR * x + cosR * z,
    };
  }

  function distanceFactor(world) {
    const player = getPlayer?.();
    if (!player?.position) return 1.0;
    const dx = player.position.x - world.x;
    const dz = player.position.z - world.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    return Math.max(0, 1 - dist / AUDIBLE_RANGE_M);
  }

  /** Subtle stereo pan from the active camera's right vector; mono-safe. */
  function stereoPan(world) {
    const camera = getActiveCamera?.();
    if (!camera) return 0;
    try {
      const m = camera.matrixWorld?.elements;
      if (!m) return 0;
      // Camera basis X (right vector) in world space.
      const rx = m[0];
      const ry = m[1];
      const rz = m[2];
      let dx = world.x - camera.position.x;
      let dy = world.y - camera.position.y;
      let dz = world.z - camera.position.z;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (len < 1e-4) return 0;
      dx /= len;
      dy /= len;
      dz /= len;
      const pan = dx * rx + dy * ry + dz * rz;
      return Math.max(-1, Math.min(1, pan)) * 0.55;
    } catch {
      return 0;
    }
  }

  function ensureGraph() {
    const ctx = contextRunning();
    if (!ctx) return null;
    if (tableBus && graphContext === ctx) return ctx;
    teardownGraph();
    tableBus = ctx.createGain();
    // 0.5 keeps the worst case (24 simultaneous max-intensity voices through
    // the compressor, which applies its own makeup gain) below digital
    // clipping at maximum effects volume — verified by the offline render in
    // scripts/billiards-audio-gate-browser.mjs (peak ≈ 0.85).
    tableBus.gain.value = 0.5;
    compressor = ctx.createDynamicsCompressor?.();
    if (compressor) {
      try {
        compressor.threshold.value = -12;
        compressor.knee.value = 12;
        compressor.ratio.value = 4;
        compressor.attack.value = 0.002;
        compressor.release.value = 0.12;
      } catch { /* fake contexts in tests may skip parameters */ }
      tableBus.connect(compressor);
      compressor.connect(audioMixer.buses.effects);
    } else {
      tableBus.connect(audioMixer.buses.effects);
    }
    graphContext = ctx;
    graphGeneration = generation;
    startClothVoice();
    return ctx;
  }

  function teardownGraph() {
    for (const v of voices) {
      try { v.source.onended = null; } catch { /* already gone */ }
      try { v.source.stop(0); } catch { /* not started is fine */ }
      try { v.gain.disconnect(); } catch { /* already gone */ }
      try { v.panner?.disconnect(); } catch { /* already gone */ }
    }
    voices.length = 0;
    stopClothVoice();
    try { tableBus?.disconnect(); } catch { /* already gone */ }
    try { compressor?.disconnect(); } catch { /* already gone */ }
    tableBus = null;
    compressor = null;
    graphContext = null;
  }

  // ------------------------------------------------------------------
  // Palette loading (generation-fenced, bounded retry, per-family degrade)
  // ------------------------------------------------------------------

  function cacheFor(ctx) {
    let entry = BUFFER_CACHE.get(ctx);
    if (!entry) {
      entry = { buffers: new Map(), failures: new Set() };
      BUFFER_CACHE.set(ctx, entry);
    }
    return entry;
  }

  function paletteNames() {
    const names = [];
    for (const family of Object.keys(PALETTE)) {
      if (missingFamilies.has(family)) continue;
      for (const n of PALETTE[family]) names.push(n);
    }
    return names;
  }

  async function loadPalette() {
    const ctx = contextRunning();
    if (!ctx || loadPhase === 'loading' || loadPhase === 'ready') return;
    if (loadAttempts >= LOAD_RETRY_DELAYS_MS.length + 1) return; // bounded
    if (loadPhase === 'failed' && now() < retryAt) return;

    const myGeneration = generation;
    loadPhase = 'loading';
    loadingFamilies = new Set(missingFamilies);
    const cache = cacheFor(ctx);

    const wanted = paletteNames().filter((n) => !cache.buffers.has(n));

    if (!fetchImpl && typeof fetch !== 'function') {
      // Whole-attempt failure (no fetch available): bounded retry later.
      loadPhase = 'failed';
      retryAt = now() + (LOAD_RETRY_DELAYS_MS[Math.min(loadAttempts, LOAD_RETRY_DELAYS_MS.length - 1)] || 12000);
      loadAttempts += 1;
      return;
    }
    const fetchFn = fetchImpl || fetch;

    // Fetch and decode per clip; a failed clip drops only its own family
    // for this attempt (design D3), the rest of the palette still loads.
    const failedNames = new Set();
    await Promise.all(
      wanted.map(async (name) => {
        try {
          const res = await fetchFn(`${sampleBase}/${name}.wav`);
          if (!res.ok) throw new Error(`${name}: ${res.status}`);
          const buf = await res.arrayBuffer();
          const decoded = await ctx.decodeAudioData(buf);
          // Generation check after every asynchronous completion.
          if (generation !== myGeneration) return;
          cache.buffers.set(name, decoded);
        } catch {
          failedNames.add(name);
        }
      }),
    );
    if (generation !== myGeneration) return;

    for (const name of failedNames) {
      for (const family of Object.keys(PALETTE)) {
        if (PALETTE[family].includes(name)) missingFamilies.add(family);
      }
    }
    loadingFamilies = new Set();

    if (missingFamilies.size === 0) {
      loadPhase = 'ready';
      loadAttempts = 0;
    } else {
      // Bounded later retry for the missing families only (the working ones
      // are cached and will not be re-fetched).
      retryAt = now() + (LOAD_RETRY_DELAYS_MS[Math.min(loadAttempts, LOAD_RETRY_DELAYS_MS.length - 1)] || 12000);
      loadAttempts += 1;
      loadPhase = missingFamilies.size < Object.keys(PALETTE).length ? 'partial' : 'failed';
    }
  }

  function pickBuffer(family, layer = null) {
    const ctx = contextRunning();
    if (!ctx) return null;
    const cache = cacheFor(ctx);
    const prefix = layer ? LAYER_PREFIX[family]?.[layer] : null;
    const candidates = prefix
      ? PALETTE[family].filter((n) => n.startsWith(prefix))
      : PALETTE[family];
    if (!candidates.length) return null;
    // Restrained variant choice: cycle, avoid the immediate repeat.
    const pick = candidates[variantCursor++ % candidates.length];
    return cache.buffers.get(pick) || null;
  }

  // ------------------------------------------------------------------
  // Transient voices
  // ------------------------------------------------------------------

  function releaseVoice(v) {
    const i = voices.indexOf(v);
    if (i >= 0) voices.splice(i, 1);
    try { v.gain.disconnect(); } catch { /* already gone */ }
    try { v.panner?.disconnect(); } catch { /* already gone */ }
  }

  function stealVoice() {
    let victim = null;
    for (const v of voices) {
      if (!victim) {
        victim = v;
        continue;
      }
      if (v.priority < victim.priority || (v.priority === victim.priority && v.level < victim.level)) {
        victim = v;
      }
    }
    if (!victim) return;
    const t = graphContext.currentTime;
    try {
      victim.gain.gain.cancelScheduledValues(t);
      victim.gain.gain.setValueAtTime(victim.gain.gain.value, t);
      victim.gain.gain.linearRampToValueAtTime(0, t + 0.015);
    } catch { /* fake contexts may skip scheduling */ }
    try { victim.source.stop(t + 0.02); } catch { /* not started is fine */ }
    releaseVoice(victim);
  }

  /**
   * Plays one normalized contact (or the synthetic cue strike) through its
   * family sample.
   * @returns {boolean} whether a voice actually started
   */
  function playContact(event, whenOffsetSec = 0) {
    const ctx = ensureGraph();
    if (!ctx || loadPhase === 'idle' || loadPhase === 'loading') return false;

    const world = event.x !== null && event.z !== null
      ? tableToWorld(event.x, event.z)
      : tableToWorld(0, 0);
    const dist = distanceFactor(world);
    if (dist <= 0.02) return false;

    const isCue = event.kind === 'cue';
    const layer = isCue
      ? cueLayer(event.power ?? 0.5)
      : event.kind === 'ball'
        ? ballImpactLayer(event.speed)
        : null;
    const buffer = pickBuffer(event.kind, layer);
    if (!buffer) return false; // family unavailable this attempt: silence

    const level = (isCue
      ? 0.3 + 0.6 * clamp01(event.power ?? 0.5)
      : impactGain(event.kind, event.speed)) * dist;
    if (level <= 0.001) return false;

    while (voices.length >= MAX_TRANSIENT_VOICES) stealVoice();

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    // Restrained pitch variation: ±3% (design D1), deterministic per call.
    source.playbackRate.value = 1 + (((variantCursor * 37) % 7) - 3) * 0.01;

    const gain = ctx.createGain();
    const startAt = ctx.currentTime + Math.max(0, whenOffsetSec);
    const familyTrim = isCue ? 0.9 : event.kind === 'ball' ? 0.85 : event.kind === 'pocket' ? 0.8 : 0.7;
    const target = level * familyTrim;
    let voice = null;
    try {
      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(target, startAt + 0.002);
    } catch { gain.gain.value = target; }

    let panner = null;
    let tail = gain;
    const pan = stereoPan(world);
    if (pan !== 0 && typeof ctx.createStereoPanner === 'function') {
      panner = ctx.createStereoPanner();
      panner.pan.value = pan;
      gain.connect(panner);
      tail = panner;
    }
    tail.connect(tableBus);

    source.connect(gain);
    source.onended = () => releaseVoice(voice);
    voice = { source, gain, panner, priority: FAMILY_PRIORITY[event.kind] ?? 1, level: target };
    try {
      source.start(startAt);
    } catch {
      releaseVoice(voice);
      return false;
    }
    voices.push(voice);
    return true;
  }

  /**
   * Presents already-normalized contacts (from the reconciler) with small
   * substep offsets so a batch avoids a same-instant burst. The spread is
   * capped at one frame step: a batch's events all occurred inside a single
   * ≤16 ms simulation step.
   */
  function presentEvents(events, { offsetSpreadSec = 0.004, maxSpreadSec = 0.03 } = {}) {
    if (!Array.isArray(events)) return 0;
    let played = 0;
    let i = 0;
    for (const event of events) {
      if (!event || typeof event !== 'object') continue;
      const offset = Math.min(i * offsetSpreadSec, maxSpreadSec);
      if (playContact(event, offset)) played += 1;
      i += 1;
    }
    return played;
  }

  // ------------------------------------------------------------------
  // Cloth movement (aggregate, ≤4 voices by construction: exactly one)
  // ------------------------------------------------------------------

  function startClothVoice() {
    if (!cloth && graphContext && !missingFamilies.has('cloth')) {
      const cache = cacheFor(graphContext);
      const buffer = cache.buffers.get('cloth-loop');
      if (!buffer) return;
      const ctx = graphContext;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      const panner = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;
      if (panner) {
        gain.connect(panner);
        panner.connect(tableBus);
      } else {
        gain.connect(tableBus);
      }
      try { source.start(); } catch { return; }
      cloth = { source, gain, panner };
    }
  }

  function stopClothVoice() {
    if (!cloth) return;
    try { cloth.source.stop(0); } catch { /* not started is fine */ }
    try { cloth.gain.disconnect(); } catch { /* already gone */ }
    try { cloth.panner?.disconnect(); } catch { /* already gone */ }
    cloth = null;
  }

  /**
   * Per-frame movement update from the visible sim. The aggregate in-play
   * ball speed drives one looping cloth voice: stationary and pocketed balls
   * contribute nothing, the gain crossfades smoothly, and settling silences
   * the voice within 200 ms (release time constant ≈ 30 ms).
   */
  function updateMovement(simState) {
    if (disposed) return;
    const ctx = contextRunning();
    if (!ctx) return;
    if (loadPhase === 'ready' || loadPhase === 'partial') startClothVoice();
    if (!cloth) return;

    let totalSpeed = 0;
    const balls = simState?.physics?.balls || {};
    for (const b of Object.values(balls)) {
      if (b?.state !== 'in_play') continue; // pocketed balls are silent
      const v = Math.sqrt((b.vx || 0) ** 2 + (b.vz || 0) ** 2);
      if (v > 0.02) totalSpeed += v;
    }

    const world = tableToWorld(0, 0);
    const dist = distanceFactor(world);
    const moving = totalSpeed > CLOTH_MIN_SPEED && dist > 0.02;
    const target = moving
      ? (0.02 + 0.13 * Math.min(1, totalSpeed / CLOTH_SATURATION_SPEED)) * dist
      : 0;

    const t = ctx.currentTime;
    try {
      cloth.gain.gain.setTargetAtTime(target, t, target > 0 ? 0.06 : 0.03);
      cloth.source.playbackRate.setTargetAtTime(0.9 + 0.45 * Math.min(1, totalSpeed / CLOTH_SATURATION_SPEED), t, 0.08);
      if (cloth.panner) cloth.panner.pan.setTargetAtTime(stereoPan(world), t, 0.1);
    } catch { /* fake contexts may skip scheduling */ }
  }

  // ------------------------------------------------------------------
  // Cue strike and foul feedback
  // ------------------------------------------------------------------

  function playCue(power) {
    const p = clamp01(Number.isFinite(Number(power)) ? Number(power) : 0.5);
    return playContact({ kind: 'cue', power: p, speed: 1 + p * 9, x: null, z: null, t: null, key: 'cue' }, 0);
  }

  function playFoulTone() {
    const ctx = ensureGraph();
    if (!ctx) return;
    const player = getPlayer?.();
    let dist = 1;
    if (player?.position) {
      const dx = player.position.x - tableX;
      const dz = player.position.z - tableZ;
      dist = Math.max(0, 1 - Math.sqrt(dx * dx + dz * dz) / AUDIBLE_RANGE_M);
    }
    if (dist <= 0.02) return;
    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(330, t);
      osc.frequency.linearRampToValueAtTime(196, t + 0.22);
      gain.gain.setValueAtTime(0.12 * dist, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain);
      gain.connect(tableBus);
      osc.start(t);
      osc.stop(t + 0.26);
      osc.onended = () => {
        try { gain.disconnect(); } catch { /* already gone */ }
      };
    } catch { /* keep gameplay independent of audio trouble */ }
  }

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------

  return {
    /** Place entry: permits (re)loading and resets the retry budget. */
    activate() {
      if (disposed) return;
      generation += 1;
      active = true;
      loadAttempts = 0;
      retryAt = 0;
      missingFamilies = new Set();
      if (loadPhase !== 'ready') loadPhase = 'idle';
      cueTracker.reset();
      reconciler.clear();
    },

    /** Leaving the place: silence within 200 ms, cancel pending work. */
    deactivate() {
      active = false;
      generation += 1;
      teardownGraph();
    },

    /** Full teardown (activity disposal); shared buffers stay cached. */
    dispose() {
      disposed = true;
      active = false;
      generation += 1;
      teardownGraph();
    },

    /** Local prediction contacts: present immediately, record each. */
    presentPredicted(events) {
      if (!active || disposed) return 0;
      const presented = reconciler.admitPredicted(events);
      return presentEvents(presented);
    },

    /** Authoritative snapshot contacts: only those not already presented. */
    presentAuthoritative(events) {
      if (!active || disposed) return 0;
      const fresh = reconciler.admitAuthoritative(events);
      return presentEvents(fresh);
    },

    /** Join/reconnect watermark: record without playback. */
    baselineAuthoritative(events) {
      if (disposed) return;
      reconciler.baseline(events);
    },

    /** Keep the reconciler shot-scoped from every observed sim. */
    scopeShot({ shot = null, status = null } = {}) {
      if (disposed) return;
      reconciler.scope({ shot, status });
    },

    /** Shooter's animated cue impact: exactly one strike, echo-suppressed. */
    localCueStrike(power) {
      if (!active || disposed) return false;
      const strike = cueTracker.localStrike(power);
      return strike.play ? playCue(strike.power) : false;
    },

    /** Cancellation/refusal before impact: clear the pending strike claim. */
    cancelPendingCue() {
      cueTracker.cancelPending();
    },

    /**
     * Feed every observed sim update; plays the witness cue when a new shot
     * start is observed that the local animation did not already own.
     */
    observedSim({ status, shot = null, cueBallSpeed = null } = {}) {
      if (!active || disposed) return false;
      const decision = cueTracker.observedSim({ status, cueBallSpeed });
      return decision.play ? playCue(decision.power) : false;
    },

    /** Compatibility path for activity event frames (foul/collision types). */
    presentActivityEvent(frame) {
      if (!active || disposed) return;
      const ev = frame?.payload || frame?.event || frame;
      if (!ev || typeof ev !== 'object') return;
      if (ev.type === 'foul' || ev.type === 'match_ended') {
        if (ev.type === 'foul') playFoulTone();
        return;
      }
      const normalized = normalizePoolAudioEvent(ev);
      if (normalized) playContact(normalized, 0);
    },

    /** Restrained foul notification (kept separate from physical impacts). */
    playFoulTone,

    /** Frame-loop movement update (also opportunistically starts loads). */
    updateMovement(simState) {
      if (!active || disposed) return;
      if (
        loadPhase === 'idle' ||
        ((loadPhase === 'failed' || loadPhase === 'partial') && now() >= retryAt)
      ) {
        loadPalette();
      }
      ensureGraph();
      updateMovement(simState);
    },

    get loadState() {
      return { phase: loadPhase, attempts: loadAttempts, missingFamilies: [...missingFamilies] };
    },

    get activeVoiceCount() {
      return voices.length;
    },
  };
}
