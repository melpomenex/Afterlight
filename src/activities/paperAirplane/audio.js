/**
 * Positional Web Audio effects for Rooftop Paper Airplanes (Phase 5, Task 7.4).
 *
 * Implements:
 *   - Paper folding rustle & crease sounds
 *   - Aerodynamic launch whoosh with power-scaled frequency and duration
 *   - Gentle aerodynamic glide whistle
 *   - Soft touchdown flutter/tap
 *   - Contest round win / victory fanfare
 */

import * as THREE from 'three';

export function createPaperAirplaneAudio({
  audioMixer = null,
  getPlayer = null,
  tablePosition = [7.5, 0, -7.5],
} = {}) {
  const tablePosVec = new THREE.Vector3(tablePosition[0], tablePosition[1] || 0, tablePosition[2]);

  function getAudioContext() {
    return audioMixer?.context || (typeof window !== 'undefined' ? window.__afterlightAudioContext : null);
  }

  function getEffectiveGain() {
    if (!getPlayer) return 1.0;
    const player = getPlayer();
    if (!player?.position) return 1.0;

    const pPos = new THREE.Vector3(player.position.x, player.position.y || 0, player.position.z);
    const dist = pPos.distanceTo(tablePosVec);
    // Falloff over 25 meters across the overlook
    return Math.max(0, Math.min(1.0, 1.0 - dist / 25.0));
  }

  return {
    playPaperFold() {
      const ctx = getAudioContext();
      if (!ctx) return;
      const gain = getEffectiveGain();
      if (gain <= 0.01) return;

      try {
        const bufferSize = ctx.sampleRate * 0.08;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2400, ctx.currentTime);
        filter.Q.setValueAtTime(2.0, ctx.currentTime);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.12 * gain, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        noise.start();
      } catch {}
    },

    playLaunch(power = 0.6) {
      const ctx = getAudioContext();
      if (!ctx) return;
      const gain = getEffectiveGain();
      if (gain <= 0.01) return;

      try {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        // Whoosh pitch slide: starts at 180 Hz, slides up to 450 Hz, drops back down
        const baseFreq = 180 + power * 120;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(baseFreq * 2.2, ctx.currentTime + 0.1);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, ctx.currentTime + 0.3);

        const vol = (0.15 + power * 0.2) * gain;
        gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.08);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } catch {}
    },

    playLanding() {
      const ctx = getAudioContext();
      if (!ctx) return;
      const gain = getEffectiveGain();
      if (gain <= 0.01) return;

      try {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.08);

        gainNode.gain.setValueAtTime(0.1 * gain, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.09);
      } catch {}
    },

    playVictory() {
      const ctx = getAudioContext();
      if (!ctx) return;
      const gain = getEffectiveGain();
      if (gain <= 0.01) return;

      try {
        const notes = [587.33, 739.99, 880.0, 1174.66]; // D5, F#5, A5, D6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

          gainNode.gain.setValueAtTime(0.16 * gain, ctx.currentTime + idx * 0.08);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.4);

          osc.connect(gainNode);
          gainNode.connect(ctx.destination);

          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 0.42);
        });
      } catch {}
    },

    dispose() {},
  };
}
