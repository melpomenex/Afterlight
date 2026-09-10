/**
 * Downhill Mayhem race audio (integrate-multiplayer-downhill-mayhem-arcade
 * 6.5). Synthesized voices over the HOST audio mixer when one is supplied —
 * the game never owns the shared AudioContext. A single fallback context is
 * lazily created on the entry gesture and closed only on dispose; an
 * injected host context is never closed. Voice cap 16; every loop/voice stops
 * on dispose. Every call is a silent no-op when no usable context exists, so
 * tests and muted environments cost nothing.
 */

const VOICE_CAP = 16;

export function createDownhillAudio({ mixer = null, getContext = null } = {}) {
  let ctx = null;
  let master = null;
  let muted = false;
  let disposed = false;
  const activeVoices = new Set();
  const loops = {};

  function ensureContext() {
    if (ctx) return ctx;
    if (mixer?.context) {
      ctx = mixer.context;
    } else if (typeof getContext === 'function') {
      try { ctx = getContext(); } catch {}
    } else if (typeof AudioContext === 'function') {
      try { ctx = new AudioContext(); } catch {}
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
      try { oldest.stop?.(); } catch {}
      activeVoices.delete(oldest);
    }
  }

  function noiseBuffer(seconds = 1) {
    const rate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, Math.max(1, rate * seconds), rate);
    const data = buffer.getChannelData(0);
    let value = 0;
    for (let i = 0; i < data.length; i++) {
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
    loops[name] = { source, gain, baseGain };
    return loops[name];
  }

  function stopLoop(name) {
    const loop = loops[name];
    if (!loop) return;
    try { loop.source.stop(); } catch {}
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
    /** Per-frame speed/ground levels from the predicted rider. */
    update(state) {
      if (disposed || muted || !state) return;
      const speed01 = Math.min(1, Math.abs(state.vs ?? 0) / 40);
      const grounded = state.grounded !== false && !state.crashed;
      if (speed01 > 0.05) {
        ensureLoop('wind', { filterType: 'bandpass', frequency: 600, baseGain: 0.12 });
        setLoopLevel('wind', speed01);
      } else {
        stopLoop('wind');
      }
      if (grounded && speed01 > 0.05) {
        ensureLoop('roll', { filterType: 'lowpass', frequency: 850, baseGain: 0.1 });
        setLoopLevel('roll', 0.6 + speed01 * 0.4);
      } else {
        stopLoop('roll');
      }
    },

    event(name) {
      switch (name) {
        case 'countdown': oneShot({ type: 'sine', frequency: 440, duration: 0.12, volume: 0.2 }); break;
        case 'go': oneShot({ type: 'sine', frequency: 880, duration: 0.3, volume: 0.24 }); break;
        case 'hop': oneShot({ type: 'sine', frequency: 330, duration: 0.1, volume: 0.18 }); break;
        case 'landing': oneShot({ type: 'sine', frequency: 220, duration: 0.16, volume: 0.2 }); break;
        case 'punch': oneShot({ type: 'square', frequency: 180, duration: 0.08, volume: 0.16 }); break;
        case 'kick': oneShot({ type: 'square', frequency: 140, duration: 0.1, volume: 0.16 }); break;
        case 'strike': oneShot({ type: 'sawtooth', frequency: 120, duration: 0.18, volume: 0.22 }); break;
        case 'crash': oneShot({ type: 'sawtooth', frequency: 90, duration: 0.35, volume: 0.26 }); break;
        case 'boost': oneShot({ type: 'triangle', frequency: 520, duration: 0.2, volume: 0.2 }); break;
        case 'trick': oneShot({ type: 'sine', frequency: 660, duration: 0.12, volume: 0.18 }); break;
        case 'finish': oneShot({ type: 'sine', frequency: 880, duration: 0.45, volume: 0.26 }); break;
        case 'dnf': oneShot({ type: 'sawtooth', frequency: 110, duration: 0.4, volume: 0.2 }); break;
        default: break;
      }
    },

    setMuted(mute) {
      muted = !!mute;
      if (muted) for (const name of Object.keys(loops)) stopLoop(name);
    },

    get loopCount() { return Object.keys(loops).length; },
    get voiceCount() { return activeVoices.size; },

    dispose() {
      if (disposed) return;
      disposed = true;
      for (const name of Object.keys(loops)) stopLoop(name);
      for (const voice of [...activeVoices]) {
        try { voice.stop?.(); } catch {}
      }
      activeVoices.clear();
      try { master?.disconnect(); } catch {}
      master = null;
      if (ctx && !mixer?.context && typeof ctx.close === 'function') {
        try { ctx.close(); } catch {}
      }
      ctx = null;
    },
  };
}
