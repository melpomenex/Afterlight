/**
 * Environmental zone audio (add-atmosphere-weather-system task 4.1, design
 * D5/D7): ONE active zone mixer over the shared audio mixer's buses, with
 * retained looping sources that never restart when the listener crosses a
 * zone — only their gains and the weather lowpass crossfade, over 500ms.
 *
 * Authored zone rows (D5/D7) name four values:
 *   audio: { rain, roof, wind, lowpassHz }
 * with the authored reference profiles:
 *   exposed { rain 1,   roof 0,   wind 0.3,  lowpass 6000 }  (open sky)
 *   roof    { rain 0.35, roof 0.7, wind 0.15, lowpass 2400 }  (arcade)
 *   alcove  { rain 0.15, roof 0.25, wind 0.05, lowpass 900 }  (deep cover)
 *
 * Layers are synthesized from ONE shared bounded noise buffer (D7: reusable
 * bounded buffers, no external assets). The ambience layer feeds the mixer's
 * ambience bus so the old courtyard drone survives as a gain on the same
 * graph — but unlike the old loop it is stopped and disconnected on place
 * exit, well inside the 200ms budget, and restarted (once) on the next
 * activation after a gesture.
 *
 * Thunder (task 4.2 consumes this): a scheduled synthesized rumble on the
 * weather bus returned as a cancellable handle — travel/mute/disconnect
 * cancel it before or shortly after it starts (ramp <= 200ms).
 */

export const ZONE_CROSSFADE_MS = 500;
export const WEATHER_RAMP_MS = 300;

/** Authored reference profiles (D7). Frozen: consumers may reuse them. */
export const ZONE_PROFILES = Object.freeze({
  exposed: Object.freeze({ rain: 1, roof: 0, wind: 0.3, lowpassHz: 6000 }),
  roof: Object.freeze({ rain: 0.35, roof: 0.7, wind: 0.15, lowpassHz: 2400 }),
  alcove: Object.freeze({ rain: 0.15, roof: 0.25, wind: 0.05, lowpassHz: 900 }),
});

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Normalize one authored `audio` row (or a profile name) to clamped values.
 * Returns null when nothing usable is authored. */
export function normalizeZoneProfile(profile) {
  const base = typeof profile === 'string' ? ZONE_PROFILES[profile] : profile;
  if (!base || typeof base !== 'object' || Array.isArray(base)) return null;
  const rain = Number(base.rain);
  const roof = Number(base.roof);
  const wind = Number(base.wind);
  const lowpassHz = Number(base.lowpassHz);
  if (![rain, roof, wind].every(Number.isFinite)) return null;
  const lp = Number.isFinite(lowpassHz) ? Math.min(20000, Math.max(80, lowpassHz)) : ZONE_PROFILES.exposed.lowpassHz;
  return { rain: clamp01(rain), roof: clamp01(roof), wind: clamp01(wind), lowpassHz: lp };
}

/**
 * Resolve the profile for a listener: an authored zone row wins; without one
 * the exposure scalar picks roof (sheltered) or exposed. `zone` may be null.
 */
export function zoneProfileFor(zone, exposure = 1) {
  const authored = normalizeZoneProfile(zone?.audio);
  if (authored) return authored;
  return exposure < 0.5 ? ZONE_PROFILES.roof : ZONE_PROFILES.exposed;
}

function profilesEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.rain === b.rain && a.roof === b.roof && a.wind === b.wind && a.lowpassHz === b.lowpassHz;
}

export function createEnvironmentAudio({ mixer } = {}) {
  if (!mixer || typeof mixer.ensure !== 'function') {
    throw new Error('createEnvironmentAudio requires the shared audio mixer');
  }

  let started = false;
  let disposed = false;
  let noiseBuffer = null;
  let zone = null; // normalized current zone target
  let weatherLevel = 0;
  const nodes = { ambience: [], weather: [] };
  const layerGains = { rain: null, roof: null, wind: null };
  let weatherFilter = null;
  let weatherGain = null;

  function context() {
    return mixer.ensure();
  }

  /** One bounded shared noise buffer (2s mono) reused by every layer. */
  function getNoiseBuffer(ctx) {
    if (noiseBuffer) return noiseBuffer;
    const length = Math.floor(ctx.sampleRate * 2);
    noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return noiseBuffer;
  }

  function ramp(param, ctx, value, seconds) {
    const now = ctx.currentTime;
    try {
      param.cancelScheduledValues(now);
    } catch { /* fake contexts may skip scheduling */ }
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now + seconds);
  }

  function loopSource(ctx, { type, frequency, gainValue, dest }) {
    const src = ctx.createBufferSource();
    src.buffer = getNoiseBuffer(ctx);
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    const gain = ctx.createGain();
    gain.gain.value = gainValue;
    src.connect(filter).connect(gain).connect(dest);
    src.start(0);
    return { src, filter, gain };
  }

  /**
   * Create and start the retained loops. One per layer; calling start again
   * while running is a no-op (never churns sources). Returns false only when
   * audio is unavailable (no gesture yet / no context) — visual travel is
   * unaffected and the next explicit Sound gesture retries.
   */
  function start() {
    if (disposed || started) return started;
    const ctx = context();
    if (!ctx) return false;

    const ambienceBus = mixer.buses.ambience;
    const weatherBus = mixer.buses.weather;
    if (!ambienceBus || !weatherBus) return false;

    // Ambience: the low campus drone (the old direct-to-destination loop,
    // now a bus gain so travel can stop it and P8 can duck it).
    nodes.ambience.push(loopSource(ctx, { type: 'lowpass', frequency: 320, gainValue: 0.5, dest: ambienceBus }));

    // Weather chain: three layers -> per-zone lowpass -> rain-level gain ->
    // weather bus. Summed layer gain is normalized per profile (D7).
    weatherFilter = ctx.createBiquadFilter();
    weatherFilter.type = 'lowpass';
    weatherFilter.frequency.value = ZONE_PROFILES.exposed.lowpassHz;
    weatherGain = ctx.createGain();
    weatherGain.gain.value = weatherLevel;
    weatherFilter.connect(weatherGain).connect(weatherBus);

    layerGains.rain = loopSource(ctx, { type: 'bandpass', frequency: 1900, gainValue: 0, dest: weatherFilter });
    layerGains.roof = loopSource(ctx, { type: 'highpass', frequency: 3600, gainValue: 0, dest: weatherFilter });
    layerGains.wind = loopSource(ctx, { type: 'lowpass', frequency: 340, gainValue: 0, dest: weatherFilter });
    nodes.weather.push(layerGains.rain, layerGains.roof, layerGains.wind);

    started = true;
    zone = null; // force the first setZone after (re)start to apply
    if (weatherLevel > 0) setWeather(weatherLevel);
    return true;
  }

  /**
   * Crossfade to a zone profile over 500ms WITHOUT restarting any loop.
   * Accepts a normalized row, an authored `audio` object or a profile name.
   * Same-target calls are no-ops, so per-frame callers cannot churn gains.
   */
  function setZone(profileOrName) {
    const next = normalizeZoneProfile(profileOrName) ?? ZONE_PROFILES.exposed;
    if (profilesEqual(next, zone)) return false;
    zone = next;
    if (!started) return false;
    const ctx = context();
    if (!ctx) return false;
    ramp(layerGains.rain.gain.gain, ctx, zone.rain, ZONE_CROSSFADE_MS / 1000);
    ramp(layerGains.roof.gain.gain, ctx, zone.roof, ZONE_CROSSFADE_MS / 1000);
    ramp(layerGains.wind.gain.gain, ctx, zone.wind, ZONE_CROSSFADE_MS / 1000);
    ramp(weatherFilter.frequency, ctx, zone.lowpassHz, ZONE_CROSSFADE_MS / 1000);
    return true;
  }

  /** Overall weather presence (sampled rain intensity 0..1). */
  function setWeather(rain) {
    const v = clamp01(Number(rain));
    if (Number.isFinite(v)) weatherLevel = v;
    if (!started) return false;
    const ctx = context();
    if (!ctx || !weatherGain) return false;
    ramp(weatherGain.gain, ctx, weatherLevel, WEATHER_RAMP_MS / 1000);
    return true;
  }

  /**
   * A distant thunder rumble scheduled `delayMs` from now (task 4.2 passes
   * the shared distance delay). Returns a cancellable handle, or null when
   * audio is unavailable. cancel() before the onset stops the source
   * outright; cancel() while rumbling fades it out within 200ms.
   */
  function thunder({ delayMs = 0, intensity = 0.6 } = {}) {
    const ctx = context();
    if (disposed || !ctx || !mixer.buses.weather) return null;
    const delay = Math.max(0, Number(delayMs) || 0) / 1000;
    const peak = 0.12 + clamp01(Number(intensity) || 0) * 0.5;
    const duration = 2.4;

    const src = ctx.createBufferSource();
    src.buffer = getNoiseBuffer(ctx);
    src.loop = false;
    src.playbackRate.value = 0.32;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 150;
    const gain = ctx.createGain();
    const t0 = ctx.currentTime + delay;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter).connect(gain).connect(mixer.buses.weather);
    src.start(t0, Math.random() * 1.2);
    src.stop(t0 + duration + 0.05);

    let canceled = false;
    return {
      get scheduledAt() { return t0; },
      cancel() {
        if (canceled) return;
        canceled = true;
        const now = ctx.currentTime;
        if (now < t0) {
          // Not audible yet: remove it entirely.
          try { src.stop(0); } catch { /* already stopped */ }
        } else {
          // Already rumbling: bounded 150ms fade, then stop.
          try {
            gain.gain.cancelScheduledValues(now);
            gain.gain.setValueAtTime(gain.gain.value, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.15);
          } catch { /* ignore */ }
          try { src.stop(now + 0.16); } catch { /* ignore */ }
        }
        for (const node of [src, filter, gain]) {
          try { node.disconnect(); } catch { /* ignore */ }
        }
      },
    };
  }

  /**
   * Place exit: stop and disconnect every source synchronously (well inside
   * the 200ms budget). Buffers are retained so the next activation does not
   * resynthesize them.
   */
  function stop() {
    if (!started) return false;
    const stopNode = (entry) => {
      try { entry.src.stop(0); } catch { /* ignore */ }
      for (const node of [entry.src, entry.filter, entry.gain]) {
        try { node.disconnect(); } catch { /* ignore */ }
      }
    };
    for (const entry of nodes.ambience) stopNode(entry);
    for (const entry of nodes.weather) stopNode(entry);
    if (weatherFilter) { try { weatherFilter.disconnect(); } catch {} }
    if (weatherGain) { try { weatherGain.disconnect(); } catch {} }
    nodes.ambience.length = 0;
    nodes.weather.length = 0;
    layerGains.rain = null;
    layerGains.roof = null;
    layerGains.wind = null;
    weatherFilter = null;
    weatherGain = null;
    started = false;
    return true;
  }

  /** Full teardown (page-level): stop and drop the retained buffers. */
  function dispose() {
    if (disposed) return;
    stop();
    noiseBuffer = null;
    disposed = true;
  }

  return {
    start,
    stop,
    dispose,
    setZone,
    setWeather,
    thunder,
    get started() { return started; },
    get zone() { return zone; },
    get weatherLevel() { return weatherLevel; },
  };
}
