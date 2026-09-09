/**
 * Bounded spatial forge-strike audio for Rustfall Foundry (Task 9.2).
 *
 * Hot-metal clang plus a short hiss. Immediate note-off on mute, leave,
 * blur, and dispose — no hanging voices after travel.
 */

import * as THREE from 'three';

const VOICE_CAP = 8;
const FALLOFF_M = 18;

export function createForgeChallengeAudio({
  audioMixer = null,
  getPlayer = null,
  stationPosition = [5.5, 0, 2.5],
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

  function track(osc) {
    active.add(osc);
    osc.onended = () => {
      active.delete(osc);
      try {
        osc.disconnect();
      } catch {}
    };
    if (active.size > VOICE_CAP) stopVoice(active.values().next().value);
  }

  return {
    setMuted(value) {
      muted = !!value;
      if (muted) this.noteOff();
    },

    noteOff() {
      for (const osc of [...active]) stopVoice(osc);
    },

    playStrike({ force = 0.6, score = 0.5 } = {}) {
      if (mixerMuted()) return;
      const ctx = getAudioContext();
      const gain = spatialGain();
      if (!ctx || gain <= 0.01) return;

      try {
        const t = ctx.currentTime;
        const clang = ctx.createOscillator();
        const g = ctx.createGain();
        clang.type = 'triangle';
        const freq = 140 + force * 90 + score * 40;
        clang.frequency.setValueAtTime(freq, t);
        clang.frequency.exponentialRampToValueAtTime(48, t + 0.16);
        g.gain.setValueAtTime((0.1 + force * 0.14) * gain, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
        clang.connect(g);
        connectOut(g);
        clang.start(t);
        clang.stop(t + 0.22);
        track(clang);

        const hiss = ctx.createOscillator();
        const hg = ctx.createGain();
        hiss.type = 'sawtooth';
        hiss.frequency.setValueAtTime(320 + force * 180, t);
        hiss.frequency.exponentialRampToValueAtTime(90, t + 0.28);
        hg.gain.setValueAtTime(0.04 * force * gain, t);
        hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
        hiss.connect(hg);
        connectOut(hg);
        hiss.start(t);
        hiss.stop(t + 0.32);
        track(hiss);
      } catch {}
    },

    dispose() {
      disposed = true;
      this.noteOff();
    },
  };
}
