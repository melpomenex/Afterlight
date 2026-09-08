/**
 * Summit Run race audio (add-multiplayer-snowboard-arcade 8.2, design D9).
 *
 * Synthesized voices over the HOST audio context — injected mixer first,
 * one lazily-created shared context as fallback (never a context per tone).
 * Voice cap 16 across all race sounds; every source stops and disconnects
 * on dispose; the persisted mute/volume state is respected through the
 * caller (setMuted) — dispose restores the pre-race ambience because the
 * race only ever automated its OWN gain nodes.
 *
 * Graceful everywhere: without a usable context every call is a no-op, so
 * tests and muted environments cost nothing.
 *
 * Voices (D9): wind loop (speed), slide loop (grounded movement), carve
 * emphasis (lateral load), landing thump, countdown beeps, finish chime.
 */

const VOICE_CAP = 16;

export function createRaceAudio({ mixer = null, getContext = null } = {}) {
  let ctx = null;
  let master = null;
  let muted = false;
  let disposed = false;
  const activeVoices = new Set();
  const loops = {}; // wind / slide / carve → { source, gain } | undefined

  function ensureContext() {
    if (ctx) return ctx;
    if (mixer?.context) {
      ctx = mixer.context;
    } else if (typeof getContext === 'function') {
      try {
        ctx = getContext();
      } catch {}
    } else if (typeof AudioContext === 'function') {
      try {
        ctx = new AudioContext();
      } catch {}
    }
    if (!ctx) return null;
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(mixer?.buses?.effects ?? ctx.destination);
    return ctx;
  }

  function trackVoice(node) {
    activeVoices.add(node);
    node.onended = () => activeVoices.delete(node);
    if (activeVoices.size > VOICE_CAP) {
      const oldest = activeVoices.values().next().value;
      try {
        oldest.stop?.();
      } catch {}
      activeVoices.delete(oldest);
    }
  }

  function noiseBuffer(seconds = 1) {
    const rate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, rate * seconds, rate);
    const data = buffer.getChannelData(0);
    let value = 0;
    for (let i = 0; i < data.length; i++) {
      // Cheap pinkish noise via leaky integration of white samples.
      value = 0.97 * value + 0.03 * (Math.random() * 2 - 1);
      data[i] = value * 3;
    }
    return buffer;
  }

  function ensureLoop(name, { filterType, frequency, baseGain }) {
    if (disposed || muted) return null;
    if (!ensureContext()) return null;
    if (ctx.state === 'suspended') return null;
    if (loops[name]) return loops[name];

    if (activeVoices.size >= VOICE_CAP) return null;

    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer(1.2);
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = frequency;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(filter).connect(gain).connect(master);
    source.start();
    trackVoice(source);

    loops[name] = { source, filter, gain, baseGain };
    return loops[name];
  }

  function stopLoop(name) {
    const loop = loops[name];
    if (!loop) return;
    try {
      loop.source.stop();
    } catch {}
    delete loops[name];
  }

  function setLoopLevel(name, level, timeConstant = 0.1) {
    const loop = loops[name];
    if (!loop) return;
    const target = muted ? 0 : loop.baseGain * level;
    loop.gain.gain.setTargetAtTime(target, ctx.currentTime, timeConstant);
  }

  function oneShot({ type = 'sine', frequency = 440, duration = 0.12, volume = 0.2, sweepTo = null }) {
    if (disposed || muted) return;
    if (!ensureContext() || ctx.state === 'suspended') return;
    if (activeVoices.size >= VOICE_CAP) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(frequency, now);
    if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain).connect(master);
    trackVoice(osc);
    osc.start(now);
    osc.stop(now + duration);
  }

  return {
    /** Per-frame: drive wind/slide/carve levels from the predicted state. */
    update(state) {
      if (disposed || muted || !state) return;
      const speed01 = Math.min(1, (state.v ?? 0) / 45);
      const steer = Math.abs(state.steer ?? 0);

      if (speed01 > 0.05) {
        const wind = ensureLoop('wind', { filterType: 'bandpass', frequency: 620, baseGain: 0.14 });
        setLoopLevel('wind', speed01);
        void wind;
      } else {
        stopLoop('wind');
      }

      if (state.grounded && speed01 > 0.05) {
        ensureLoop('slide', { filterType: 'lowpass', frequency: 900, baseGain: 0.1 });
        setLoopLevel('slide', 0.6 + speed01 * 0.4);
      } else {
        stopLoop('slide');
      }

      if (state.grounded && steer > 0.35 && speed01 > 0.2) {
        ensureLoop('carve', { filterType: 'bandpass', frequency: 320, baseGain: 0.12 });
        setLoopLevel('carve', steer);
      } else {
        stopLoop('carve');
      }
    },

    /** One-shot race events: landing, countdown beeps, finish chime. */
    event(name) {
      switch (name) {
        case 'landing':
          oneShot({ type: 'triangle', frequency: 160, sweepTo: 70, duration: 0.16, volume: 0.3 });
          break;
        case 'countdown':
          oneShot({ type: 'square', frequency: 660, duration: 0.1, volume: 0.22 });
          break;
        case 'go':
          oneShot({ type: 'square', frequency: 880, duration: 0.25, volume: 0.26 });
          break;
        case 'finish':
          oneShot({ type: 'sine', frequency: 523, duration: 0.16, volume: 0.24 });
          setTimeout(() => !disposed && this.event('finish2'), 180);
          break;
        case 'finish2':
          oneShot({ type: 'sine', frequency: 784, duration: 0.22, volume: 0.24 });
          break;
        case 'checkpoint':
          oneShot({ type: 'sine', frequency: 700, duration: 0.08, volume: 0.16 });
          break;
        default:
          break;
      }
    },

    setMuted(mute) {
      muted = !!mute;
      if (muted) {
        for (const name of Object.keys(loops)) stopLoop(name);
      }
    },

    /** True when the race owns looping voices right now. */
    get loopCount() {
      return Object.keys(loops).length;
    },

    get voiceCount() {
      return activeVoices.size;
    },

    /** Stops every loop/voice and disconnects the race bus. */
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const name of Object.keys(loops)) stopLoop(name);
      for (const voice of [...activeVoices]) {
        try {
          voice.stop?.();
        } catch {}
      }
      activeVoices.clear();
      try {
        master?.disconnect();
      } catch {}
      master = null;
      // A fallback context we created ourselves is closed; an injected host
      // context is NEVER closed (it outlives the race).
      if (ctx && !mixer?.context && typeof ctx.close === 'function') {
        try {
          ctx.close();
        } catch {}
      }
      ctx = null;
    },
  };
}
