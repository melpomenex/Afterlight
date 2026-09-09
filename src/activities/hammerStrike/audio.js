/**
 * Bounded spatial hammer/bell audio for Rustfall Foundry (Task 9.1).
 *
 * Synthesized strike clang + score-driven bell. Voices are capped, muted
 * immediately, and note-off on leave/blur/dispose so a hanging tone cannot
 * follow the player out of the foundry.
 */

import * as THREE from 'three';

const VOICE_CAP = 8;
const FALLOFF_M = 18;

export function createHammerStrikeAudio({
  audioMixer = null,
  getPlayer = null,
  stationPosition = [-5.5, 0, 2.5],
} = {}) {
  const station = new THREE.Vector3(
    stationPosition[0],
    stationPosition[1] || 0,
    stationPosition[2]
  );

  let muted = false;
  let disposed = false;
  const active = new Set();

  function getAudioContext() {
    return audioMixer?.context || (typeof window !== 'undefined' ? window.__afterlightAudioContext : null);
  }

  function mixerMuted() {
    if (muted || disposed) return true;
    const ctx = getAudioContext();
    if (!ctx || ctx.state === 'suspended') return true;
    if (typeof audioMixer?.status === 'function' && audioMixer.status() !== 'running') return true;
    return false;
  }

  function spatialGain() {
    if (!getPlayer) return 1;
    const player = getPlayer();
    if (!player?.position) return 1;
    const here = new THREE.Vector3(player.position.x, player.position.y || 0, player.position.z);
    return Math.max(0, Math.min(1, 1 - here.distanceTo(station) / FALLOFF_M));
  }

  function connectOut(node) {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (audioMixer?.buses?.effects) node.connect(audioMixer.buses.effects);
    else node.connect(ctx.destination);
  }

  function track(osc) {
    active.add(osc);
    osc.onended = () => {
      active.delete(osc);
      try {
        osc.disconnect();
      } catch {}
    };
    if (active.size > VOICE_CAP) {
      const oldest = active.values().next().value;
      stopVoice(oldest);
    }
  }

  function stopVoice(osc) {
    if (!osc) return;
    try {
      osc.stop();
    } catch {}
    try {
      osc.disconnect();
    } catch {}
    active.delete(osc);
  }

  function playTone({ type = 'sine', freq = 440, endFreq = null, duration = 0.4, volume = 0.16 }) {
    if (mixerMuted()) return;
    const ctx = getAudioContext();
    const gain = spatialGain();
    if (!ctx || gain <= 0.01) return;

    try {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), ctx.currentTime + duration * 0.85);
      const vol = Math.max(0.0001, volume * gain);
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(g);
      connectOut(g);
      osc.start();
      osc.stop(ctx.currentTime + duration + 0.02);
      track(osc);
    } catch {}
  }

  return {
    setMuted(value) {
      muted = !!value;
      if (muted) this.noteOff();
    },

    noteOff() {
      for (const osc of [...active]) stopVoice(osc);
    },

    playStrike(intensity = 0.6) {
      playTone({
        type: 'triangle',
        freq: 180 + intensity * 40,
        endFreq: 55,
        duration: 0.14,
        volume: 0.12 + intensity * 0.1,
      });
    },

    playBell({ bellHz = 440, bellAmp = 0.18, perfect = false } = {}) {
      if (mixerMuted()) return;
      const ctx = getAudioContext();
      const gain = spatialGain();
      if (!ctx || gain <= 0.01) return;

      try {
        const t = ctx.currentTime;
        const harmonics = perfect ? [1, 2.01, 2.76] : [1, 2.4];
        harmonics.forEach((mult, idx) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(Math.max(40, bellHz * mult), t);
          const vol = (idx === 0 ? bellAmp : bellAmp * 0.35) * gain;
          g.gain.setValueAtTime(Math.max(0.0001, vol), t);
          g.gain.exponentialRampToValueAtTime(0.0001, t + (perfect ? 1.1 : 0.7));
          osc.connect(g);
          connectOut(g);
          osc.start(t);
          osc.stop(t + (perfect ? 1.15 : 0.75));
          track(osc);
        });
      } catch {}
    },

    dispose() {
      disposed = true;
      this.noteOff();
    },
  };
}
