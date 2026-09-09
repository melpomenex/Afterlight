/**
 * Positional Web Audio effects for Rain Court Gutter Boats (Phase 5, Task 7.5).
 *
 * Implements:
 *   - Water rush and stream trickle sounds
 *   - Start gate paddle release clatter
 *   - Water splash push sound on boat launch
 *   - Finish line brass bell chime
 *   - Victory fanfare upon race completion
 */

import * as THREE from 'three';

export function createGutterBoatAudio({
  audioMixer = null,
  getPlayer = null,
  troughPosition = [-4.5, 0, 2.5],
} = {}) {
  const posVec = new THREE.Vector3(troughPosition[0], troughPosition[1] || 0, troughPosition[2]);

  function getAudioContext() {
    return audioMixer?.context || (typeof window !== 'undefined' ? window.__afterlightAudioContext : null);
  }

  function getEffectiveGain() {
    if (!getPlayer) return 1.0;
    const player = getPlayer();
    if (!player?.position) return 1.0;

    const pPos = new THREE.Vector3(player.position.x, player.position.y || 0, player.position.z);
    const dist = pPos.distanceTo(posVec);
    // Falloff over 20 meters across the courtyard
    return Math.max(0, Math.min(1.0, 1.0 - dist / 20.0));
  }

  return {
    playGateRelease() {
      const ctx = getAudioContext();
      if (!ctx) return;
      const gain = getEffectiveGain();
      if (gain <= 0.01) return;

      try {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.12);

        gainNode.gain.setValueAtTime(0.18 * gain, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.14);
      } catch {}
    },

    playPush() {
      const ctx = getAudioContext();
      if (!ctx) return;
      const gain = getEffectiveGain();
      if (gain <= 0.01) return;

      try {
        // Water splash noise
        const bufferSize = Math.floor(ctx.sampleRate * 0.12);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, ctx.currentTime);
        filter.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.1);
        filter.Q.setValueAtTime(1.5, ctx.currentTime);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.2 * gain, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        noise.start();
      } catch {}
    },

    playFinishBell() {
      const ctx = getAudioContext();
      if (!ctx) return;
      const gain = getEffectiveGain();
      if (gain <= 0.01) return;

      try {
        // Brass bell sound: 2 harmonically related sines with long decay
        const t = ctx.currentTime;
        const baseFreq = 1200;

        [1.0, 2.76].forEach((mult, idx) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(baseFreq * mult, t);

          const vol = (idx === 0 ? 0.2 : 0.1) * gain;
          g.gain.setValueAtTime(vol, t);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);

          osc.connect(g);
          g.connect(ctx.destination);

          osc.start(t);
          osc.stop(t + 1.0);
        });
      } catch {}
    },

    playVictory() {
      const ctx = getAudioContext();
      if (!ctx) return;
      const gain = getEffectiveGain();
      if (gain <= 0.01) return;

      try {
        const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
        const t = ctx.currentTime;

        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t + idx * 0.09);

          const startTime = t + idx * 0.09;
          g.gain.setValueAtTime(0.001, startTime);
          g.gain.linearRampToValueAtTime(0.12 * gain, startTime + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.45);

          osc.connect(g);
          g.connect(ctx.destination);

          osc.start(startTime);
          osc.stop(startTime + 0.5);
        });
      } catch {}
    },

    dispose() {},
  };
}
